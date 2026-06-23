import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  chartOfAccounts,
  customerLoans,
  customerLoanRepayments,
  customerTransactions,
  customers,
  deposits,
  invoices,
  journalEntries,
  journalEntryLines,
  tickets,
  wallets,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { postLedgerLines } from "./ledger-posting";
import { computeTicketFinancials } from "./ticket-approval";
import { getCustomerDepositSummaries } from "./customer-deposit-liability";
import { ledgerPassDeposit } from "./customer-ledger-pass";
import { ensureRequiredCoaAccounts } from "./ensure-required-coa";
import { nextNumber } from "./numbering";

export type PaymentAllocation =
  | { type: "invoice"; invoiceId: number; amount: number }
  | { type: "loan"; loanId: number; amount: number }
  | { type: "deposit"; depositId: number; amount: number };

export interface ReceiveCustomerPaymentInput {
  tenantId: number;
  customerId: number;
  amount: number;
  userId: number;
  paymentMethod?: string;
  referenceNumber?: string;
  description?: string;
  allocations?: PaymentAllocation[];
  autoAllocate?: boolean;
}

export interface OpenObligationInvoice {
  id: number;
  invoiceNumber: string;
  ticketId: number | null;
  issueDate: Date;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
}

export interface OpenObligationLoan {
  id: number;
  loanNumber: string;
  loanDate: Date;
  balanceAmount: number;
}

export interface OpenObligationDeposit {
  id: number;
  depositCode: string;
  walletId: number;
  amount: number;
  remaining: number;
}

export async function getCustomerRunningBalance(db: DbOrTx, tenantId: number, customerId: number) {
  const balanceResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)`,
    })
    .from(customerTransactions)
    .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, customerId)));
  return Number(balanceResult[0]?.total ?? 0);
}

async function getOrCreateLoanReceivableAccount(db: DbOrTx, tenantId: number) {
  let account = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1250"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  if (!account) {
    const result = await db.insert(chartOfAccounts).values({
      tenantId,
      code: "1250",
      name: "Customer Loans Receivable",
      type: "asset",
      subtype: "current_asset",
      currentBalance: "0.00",
      status: "active",
      currency: "USD",
    });
    account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, Number(result[0].insertId)),
    });
  }
  return account;
}

export async function getCustomerOpenObligations(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
) {
  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.tenantId, tenantId),
      eq(invoices.customerId, customerId),
      inArray(invoices.status, ["sent", "partial", "overdue"]),
    ))
    .orderBy(asc(invoices.issueDate));

  const openInvoices: OpenObligationInvoice[] = invoiceRows
    .map((inv) => {
      const totalAmount = Number(inv.totalAmount);
      const paidAmount = Number(inv.paidAmount);
      const balanceDue = totalAmount - paidAmount;
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        ticketId: inv.ticketId ?? null,
        issueDate: inv.issueDate,
        totalAmount,
        paidAmount,
        balanceDue,
      };
    })
    .filter((inv) => inv.balanceDue > 0.01);

  const loanRows = await db
    .select()
    .from(customerLoans)
    .where(and(
      eq(customerLoans.tenantId, tenantId),
      eq(customerLoans.customerId, customerId),
      eq(customerLoans.status, "active"),
      isNull(customerLoans.deletedAt),
      sql`${customerLoans.balanceAmount} > 0`,
    ))
    .orderBy(asc(customerLoans.loanDate));

  const openLoans: OpenObligationLoan[] = loanRows.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanDate: loan.loanDate,
    balanceAmount: Number(loan.balanceAmount),
  }));

  const openDeposits = await getCustomerDepositSummaries(db, tenantId, customerId);

  const arBalance = await getCustomerRunningBalance(db, tenantId, customerId);

  return {
    openInvoices,
    openLoans,
    openDeposits,
    arBalance,
    depositLiability: openDeposits.reduce((s, d) => s + d.remaining, 0),
    totalOwed: openInvoices.reduce((s, i) => s + i.balanceDue, 0)
      + openLoans.reduce((s, l) => s + l.balanceAmount, 0),
  };
}

export function buildObligationSettlements(
  amount: number,
  obligations: Awaited<ReturnType<typeof getCustomerOpenObligations>>,
): PaymentAllocation[] {
  const allocations: PaymentAllocation[] = [];
  let remaining = amount;

  for (const inv of obligations.openInvoices) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, inv.balanceDue);
    if (slice > 0) {
      allocations.push({ type: "invoice", invoiceId: inv.id, amount: slice });
      remaining -= slice;
    }
  }

  for (const loan of obligations.openLoans) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, loan.balanceAmount);
    if (slice > 0) {
      allocations.push({ type: "loan", loanId: loan.id, amount: slice });
      remaining -= slice;
    }
  }

  return allocations;
}

export function buildAutoAllocations(
  amount: number,
  obligations: Awaited<ReturnType<typeof getCustomerOpenObligations>>,
): PaymentAllocation[] {
  const allocations = buildObligationSettlements(amount, obligations);
  let remaining = amount - allocations.reduce((s, a) => s + a.amount, 0);

  for (const dep of obligations.openDeposits) {
    if (remaining <= 0) break;
    allocations.push({ type: "deposit", depositId: dep.id, amount: remaining });
    remaining = 0;
  }

  return allocations;
}

/**
 * Customer cash always settles open invoices and loans first.
 * Remainder goes to deposit hold (manual deposit lines must match remainder, or first open deposit is used).
 */
export function mergeCustomerCashAllocations(
  amount: number,
  obligations: Awaited<ReturnType<typeof getCustomerOpenObligations>>,
  manualAllocations?: PaymentAllocation[],
): { allocations: PaymentAllocation[]; depositRemainder: number } {
  const obligationAllocs = buildObligationSettlements(amount, obligations);
  const obligationTotal = obligationAllocs.reduce((s, a) => s + a.amount, 0);
  const depositRemainder = Math.max(0, amount - obligationTotal);

  if (depositRemainder <= 0.01) {
    return { allocations: obligationAllocs, depositRemainder: 0 };
  }

  const manualDeposits = (manualAllocations ?? []).filter(
    (a): a is Extract<PaymentAllocation, { type: "deposit" }> => a.type === "deposit",
  );
  const manualDepositTotal = manualDeposits.reduce((s, a) => s + a.amount, 0);

  if (manualDeposits.length > 0 && Math.abs(manualDepositTotal - depositRemainder) <= 0.02) {
    return {
      allocations: [...obligationAllocs, ...manualDeposits],
      depositRemainder,
    };
  }

  if (obligations.openDeposits.length > 0) {
    return {
      allocations: [
        ...obligationAllocs,
        { type: "deposit", depositId: obligations.openDeposits[0].id, amount: depositRemainder },
      ],
      depositRemainder,
    };
  }

  return { allocations: obligationAllocs, depositRemainder };
}

export function validatePaymentAllocations(
  amount: number,
  allocations: PaymentAllocation[],
): { ok: true } | { ok: false; message: string } {
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be positive" };
  }

  const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);
  if (allocatedTotal <= 0) {
    return { ok: false, message: "No open invoices, loans, or deposits to allocate this payment to" };
  }
  if (Math.abs(allocatedTotal - amount) > 0.01) {
    return {
      ok: false,
      message: `Allocated total ($${allocatedTotal.toFixed(2)}) must equal payment amount ($${amount.toFixed(2)})`,
    };
  }

  return { ok: true };
}

/** Journal lines: Dr Cash = ar+loan; deposit top-ups post via wallet ledger pass. */
export function customerPaymentJournalTotals(amount: number, arTotal: number, loanTotal: number) {
  const cashAmount = arTotal + loanTotal;
  return { debit: cashAmount, credit: arTotal + loanTotal };
}

async function syncTicketFromInvoicePayment(
  db: DbOrTx,
  tenantId: number,
  invoice: typeof invoices.$inferSelect,
  paymentAmount: number,
) {
  if (!invoice.ticketId) return;
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, invoice.ticketId), eq(tickets.tenantId, tenantId)),
  });
  if (!ticket) return;

  const newPaid = Number(ticket.paidAmount ?? 0) + paymentAmount;
  const fin = computeTicketFinancials(ticket);
  await db.update(tickets).set({
    paidAmount: newPaid.toFixed(2),
    paymentStatus: newPaid >= fin.customerCharge ? "paid" : "partial",
  }).where(eq(tickets.id, ticket.id));
}

async function applyInvoiceAllocation(
  db: DbOrTx,
  params: {
    tenantId: number;
    customerId: number;
    userId: number;
    invoiceId: number;
    amount: number;
    paymentMethod?: string;
    referenceNumber?: string;
    description?: string;
  },
) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, params.invoiceId), eq(invoices.tenantId, params.tenantId)),
  });
  if (!invoice) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Invoice ${params.invoiceId} not found` });
  }
  if (invoice.customerId !== params.customerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice does not belong to this customer" });
  }
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invoice ${invoice.invoiceNumber} is not payable` });
  }

  const balanceDue = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  if (params.amount > balanceDue + 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Allocation $${params.amount.toFixed(2)} exceeds invoice ${invoice.invoiceNumber} balance ($${balanceDue.toFixed(2)})`,
    });
  }

  const newPaidAmount = Number(invoice.paidAmount) + params.amount;
  const invoiceStatus = newPaidAmount >= Number(invoice.totalAmount) ? "paid" : "partial";
  await db.update(invoices).set({
    paidAmount: newPaidAmount.toFixed(2),
    status: invoiceStatus as "sent" | "partial" | "paid" | "overdue",
  }).where(eq(invoices.id, invoice.id));

  const runningBalance = await getCustomerRunningBalance(db, params.tenantId, params.customerId);
  const newBalance = Math.max(0, runningBalance - params.amount);

  await db.insert(customerTransactions).values({
    tenantId: params.tenantId,
    customerId: params.customerId,
    invoiceId: invoice.id,
    ticketId: invoice.ticketId ?? null,
    type: "payment",
    amount: params.amount.toFixed(2),
    balance: newBalance.toFixed(2),
    description: params.description || `Invoice payment ${invoice.invoiceNumber} (${params.paymentMethod || "cash"})`,
    referenceNumber: params.referenceNumber?.trim() || null,
    createdBy: params.userId,
  });

  await syncTicketFromInvoicePayment(db, params.tenantId, invoice, params.amount);
}

async function applyLoanAllocation(
  db: DbOrTx,
  params: {
    tenantId: number;
    customerId: number;
    userId: number;
    loanId: number;
    amount: number;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
  },
) {
  const loan = await db.query.customerLoans.findFirst({
    where: and(eq(customerLoans.id, params.loanId), eq(customerLoans.tenantId, params.tenantId)),
  });
  if (!loan) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Loan ${params.loanId} not found` });
  }
  if (loan.customerId !== params.customerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Loan does not belong to this customer" });
  }
  if (loan.status !== "active") {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Loan ${loan.loanNumber} is not active` });
  }
  if (params.amount > Number(loan.balanceAmount) + 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Allocation exceeds loan ${loan.loanNumber} balance`,
    });
  }

  await db.insert(customerLoanRepayments).values({
    tenantId: params.tenantId,
    loanId: loan.id,
    amount: params.amount.toFixed(2),
    paymentMethod: params.paymentMethod || "cash",
    referenceNumber: params.referenceNumber,
    notes: params.notes,
    createdBy: params.userId,
  });

  const newRepaid = Number(loan.repaidAmount) + params.amount;
  const newBalance = Number(loan.balanceAmount) - params.amount;
  await db.update(customerLoans).set({
    repaidAmount: newRepaid.toFixed(2),
    balanceAmount: newBalance.toFixed(2),
    status: (newBalance <= 0 ? "repaid" : "active") as "active" | "repaid",
  }).where(eq(customerLoans.id, loan.id));
}

async function getOrCreateCustomerDepositHold(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
  walletId: number,
  userId: number,
) {
  const summaries = await getCustomerDepositSummaries(db, tenantId, customerId);
  if (summaries.length > 0) return summaries[0].id;

  const depositCode = await nextNumber(db, tenantId, "MZR");
  const result = await db.insert(deposits).values({
    tenantId,
    customerId,
    walletId,
    depositCode,
    amount: "0.00",
    paymentMethod: "cash",
    status: "approved",
    approvedBy: userId,
    approvedAt: new Date(),
    notes: "Auto-created for customer payment hold",
    createdBy: userId,
  });
  return Number(result[0].insertId);
}

export async function applyPaymentAllocations(
  db: DbOrTx,
  params: {
    tenantId: number;
    customerId: number;
    userId: number;
    allocations: PaymentAllocation[];
    paymentMethod?: string;
    referenceNumber?: string;
    description?: string;
  },
) {
  let arTotal = 0;
  let loanTotal = 0;
  let depositTotal = 0;

  for (const alloc of params.allocations) {
    if (alloc.type === "invoice") {
      arTotal += alloc.amount;
      await applyInvoiceAllocation(db, {
        tenantId: params.tenantId,
        customerId: params.customerId,
        userId: params.userId,
        invoiceId: alloc.invoiceId,
        amount: alloc.amount,
        paymentMethod: params.paymentMethod,
        referenceNumber: params.referenceNumber,
        description: params.description,
      });
    } else if (alloc.type === "loan") {
      loanTotal += alloc.amount;
      await applyLoanAllocation(db, {
        tenantId: params.tenantId,
        customerId: params.customerId,
        userId: params.userId,
        loanId: alloc.loanId,
        amount: alloc.amount,
        paymentMethod: params.paymentMethod,
        referenceNumber: params.referenceNumber,
        notes: params.description,
      });
    } else {
      depositTotal += alloc.amount;
      await ledgerPassDeposit(db, {
        tenantId: params.tenantId,
        userId: params.userId,
        depositId: alloc.depositId,
        direction: "receive",
        amount: alloc.amount,
        notes: params.description,
        referenceNumber: params.referenceNumber,
        skipObligationSettlement: true,
      });
    }
  }

  return { arTotal, loanTotal, depositTotal };
}

export async function receiveCustomerPayment(
  db: DbOrTx,
  input: ReceiveCustomerPaymentInput,
) {
  const { tenantId, customerId, amount, userId } = input;

  if (isNaN(amount) || amount <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment amount must be positive" });
  }

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
  });
  if (!customer) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
  }

  await ensureRequiredCoaAccounts(db, tenantId);

  if (input.referenceNumber?.trim()) {
    const duplicate = await db.select({ id: customerTransactions.id })
      .from(customerTransactions)
      .where(and(
        eq(customerTransactions.tenantId, tenantId),
        eq(customerTransactions.type, "payment"),
        eq(customerTransactions.referenceNumber, input.referenceNumber.trim()),
      ))
      .limit(1);
    if (duplicate[0]) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Payment reference "${input.referenceNumber}" already recorded`,
      });
    }
  }

  const obligations = await getCustomerOpenObligations(db, tenantId, customerId);
  const merged = mergeCustomerCashAllocations(
    amount,
    obligations,
    input.autoAllocate ? undefined : input.allocations,
  );
  let allocations = [...merged.allocations];

  if (merged.depositRemainder > 0.01 && !allocations.some((a) => a.type === "deposit")) {
    const wallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.tenantId, tenantId)),
    });
    if (!wallet) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet configured for deposit hold" });
    }
    const depositId = await getOrCreateCustomerDepositHold(db, tenantId, customerId, wallet.id, userId);
    allocations.push({ type: "deposit", depositId, amount: merged.depositRemainder });
  }

  const validation = validatePaymentAllocations(amount, allocations);
  if (!validation.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
  }

  const paymentDescription = input.description
    || `Payment received from ${customer.firstName} ${customer.lastName} (${input.paymentMethod || "cash"})`;

  const { arTotal, loanTotal } = await applyPaymentAllocations(db, {
    tenantId,
    customerId,
    userId,
    allocations,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber,
    description: paymentDescription,
  });

  const cashJournalAmount = arTotal + loanTotal;
  if (cashJournalAmount <= 0.01) {
    const newArBalance = await getCustomerRunningBalance(db, tenantId, customerId);
    const updatedObligations = await getCustomerOpenObligations(db, tenantId, customerId);
    return {
      success: true,
      allocations,
      arBalance: newArBalance,
      totalOwed: updatedObligations.totalOwed,
      depositLiability: updatedObligations.depositLiability,
      journalEntryId: null,
    };
  }

  const cashAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const arAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1200"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const loanReceivableAccount = loanTotal > 0
    ? await getOrCreateLoanReceivableAccount(db, tenantId)
    : null;

  if (!cashAccount || !arAccount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Required accounting accounts missing (Cash 1000 / AR 1200)" });
  }
  if (loanTotal > 0 && !loanReceivableAccount) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Loan receivable account missing" });
  }

  const journalLines: { accountId: number; description: string; debit: string; credit: string }[] = [
    {
      accountId: cashAccount.id,
      description: "Cash received",
      debit: cashJournalAmount.toFixed(2),
      credit: "0.00",
    },
  ];
  if (arTotal > 0) {
    journalLines.push({
      accountId: arAccount.id,
      description: "AR reduction — ticket invoices",
      debit: "0.00",
      credit: arTotal.toFixed(2),
    });
  }
  if (loanTotal > 0 && loanReceivableAccount) {
    journalLines.push({
      accountId: loanReceivableAccount.id,
      description: "Loan receivable reduction",
      debit: "0.00",
      credit: loanTotal.toFixed(2),
    });
  }

  const journalResult = await db.insert(journalEntries).values({
    tenantId,
    entryNumber: `JE-PAY-${Date.now()}`,
    date: new Date(),
    description: paymentDescription,
    referenceType: "customer_payment",
    referenceId: customerId,
    totalDebit: cashJournalAmount.toFixed(2),
    totalCredit: cashJournalAmount.toFixed(2),
    status: "posted",
  });
  const journalId = Number(journalResult[0].insertId ?? 0);
  if (journalId > 0) {
    await db.insert(journalEntryLines).values(
      journalLines.map((line) => ({ journalEntryId: journalId, ...line })),
    );
    await postLedgerLines(db, {
      tenantId,
      journalEntryId: journalId,
      date: new Date(),
      referenceType: "customer_payment",
      referenceId: customerId,
      lines: journalLines,
    });
  }

  const newArBalance = await getCustomerRunningBalance(db, tenantId, customerId);
  const updatedObligations = await getCustomerOpenObligations(db, tenantId, customerId);

  return {
    success: true,
    allocations,
    arBalance: newArBalance,
    totalOwed: updatedObligations.totalOwed,
    depositLiability: updatedObligations.depositLiability,
    journalEntryId: journalId || null,
  };
}
