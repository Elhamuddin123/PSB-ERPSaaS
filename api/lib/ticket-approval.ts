import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  tickets,
  ticketPassengers,
  wallets,
  walletTransactions,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  notifications,
  customers,
  customerTransactions,
  invoices,
  invoiceItems,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { nextNumber } from "./numbering";
import { postLedgerLines } from "./ledger-posting";
import { getAccountByCode, postWalletDebit, TICKET_COST_CODE } from "./wallet-coa";

function getTicketMetadata(ticket: typeof tickets.$inferSelect) {
  if (!ticket.metadata) return null;
  if (typeof ticket.metadata === "string") {
    try { return JSON.parse(ticket.metadata); } catch { return null; }
  }
  return ticket.metadata as { walletId?: number };
}

export function computeTicketFinancials(ticket: typeof tickets.$inferSelect) {
  const totalAmount = Number(ticket.totalAmount);
  const discountAmount = Number(ticket.discountAmount ?? 0);
  const commissionAmount = Number(ticket.commissionAmount ?? 0);
  const paidAmount = Number(ticket.paidAmount ?? 0);

  if (discountAmount > commissionAmount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Customer discount cannot exceed airline commission",
    });
  }
  if (discountAmount > totalAmount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Discount cannot exceed ticket price",
    });
  }

  const walletDeduction = totalAmount - commissionAmount;
  const netCommission = commissionAmount - discountAmount;
  const customerCharge = totalAmount - discountAmount;
  const fareRevenue = totalAmount - netCommission;
  const remainingDue = Math.max(0, customerCharge - paidAmount);

  let paymentStatus: "pending" | "partial" | "paid" = "pending";
  if (paidAmount >= customerCharge && customerCharge > 0) paymentStatus = "paid";
  else if (paidAmount > 0) paymentStatus = "partial";

  return {
    totalAmount,
    discountAmount,
    commissionAmount,
    paidAmount,
    walletDeduction,
    netCommission,
    customerCharge,
    fareRevenue,
    remainingDue,
    paymentStatus,
  };
}

export async function approveTicket(
  db: DbOrTx,
  ticket: typeof tickets.$inferSelect,
  user: { id: number; tenantId: number | null; role?: string },
) {
  const tenantId = user.tenantId as number;
  const fin = computeTicketFinancials(ticket);

  if (ticket.issuedBy === user.id && user.role === "agent") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot approve a ticket you created. Another supervisor must approve it.",
    });
  }

  const metadata = getTicketMetadata(ticket);
  let walletId = metadata?.walletId ?? null;

  if (!walletId) {
    const fallbackWallet = await db.query.wallets.findFirst({
      where: and(eq(wallets.tenantId, tenantId), eq(wallets.status, "active")),
      orderBy: [desc(wallets.createdAt)],
    });
    if (fallbackWallet) walletId = fallbackWallet.id;
  }

  if (!walletId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket wallet not recorded and no active wallet found" });
  }

  const userWallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.tenantId, tenantId), eq(wallets.status, "active")),
  });
  if (!userWallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found or inactive" });
  }
  if (Number(userWallet.balance) < fin.walletDeduction) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient wallet balance. Need $${fin.walletDeduction.toFixed(2)} (ticket $${fin.totalAmount} − commission $${fin.commissionAmount})`,
    });
  }

  const cashAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const arAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1200"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const revenueAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "4000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const commissionRevenueAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "4100"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  if (!cashAccount || !arAccount || !revenueAccount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Accounting accounts missing" });
  }

  const debitResult = await db.update(wallets)
    .set({ balance: sql`${wallets.balance} - ${fin.walletDeduction.toFixed(2)}` })
    .where(and(eq(wallets.id, userWallet.id), sql`${wallets.balance} >= ${fin.walletDeduction.toFixed(2)}`));
  if (debitResult[0].affectedRows === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient wallet balance" });
  }

  const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, userWallet.id) });

  await db.insert(walletTransactions).values({
    walletId: userWallet.id,
    tenantId,
    type: "debit",
    amount: fin.walletDeduction.toFixed(2),
    balanceAfter: updatedWallet!.balance,
    description: `Ticket booking: ${ticket.ticketNumber} ($${fin.totalAmount} − $${fin.commissionAmount} commission)`,
    referenceType: "ticket",
    referenceId: ticket.id,
    createdBy: user.id,
  });

  const ticketCostAccount = await getAccountByCode(db, tenantId, TICKET_COST_CODE);
  if (ticketCostAccount && fin.walletDeduction > 0) {
    await postWalletDebit(
      db,
      userWallet,
      fin.walletDeduction,
      ticketCostAccount.id,
      `Ticket supplier cost: ${ticket.ticketNumber}`,
      "ticket_wallet",
      ticket.id,
      `Wallet debit for ticket ${ticket.ticketNumber}`,
    );
  }

  const journalLines: { accountId: number; description: string; debit: string; credit: string }[] = [];

  if (ticket.customerId) {
    if (fin.customerCharge > 0) {
      journalLines.push({
        accountId: arAccount.id,
        description: "Accounts Receivable - Ticket Sale",
        debit: fin.customerCharge.toFixed(2),
        credit: "0.00",
      });
    }
    if (fin.paidAmount > 0) {
      journalLines.push({
        accountId: cashAccount.id,
        description: "Cash received at booking",
        debit: fin.paidAmount.toFixed(2),
        credit: "0.00",
      });
      journalLines.push({
        accountId: arAccount.id,
        description: "AR reduction - upfront payment",
        debit: "0.00",
        credit: fin.paidAmount.toFixed(2),
      });
    }
  } else {
    journalLines.push({
      accountId: cashAccount.id,
      description: "Walk-in ticket sale",
      debit: fin.customerCharge.toFixed(2),
      credit: "0.00",
    });
  }

  journalLines.push({
    accountId: revenueAccount.id,
    description: "Ticket sales revenue (fare)",
    debit: "0.00",
    credit: fin.fareRevenue.toFixed(2),
  });

  if (fin.netCommission > 0 && commissionRevenueAccount) {
    journalLines.push({
      accountId: commissionRevenueAccount.id,
      description: fin.discountAmount > 0
        ? `Commission revenue (after $${fin.discountAmount} customer discount)`
        : "Commission revenue",
      debit: "0.00",
      credit: fin.netCommission.toFixed(2),
    });
  }

  const journalDebit = journalLines.reduce((s, l) => s + Number(l.debit), 0);
  const journalCredit = journalLines.reduce((s, l) => s + Number(l.credit), 0);
  if (Math.abs(journalDebit - journalCredit) > 0.01) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Journal entry is not balanced" });
  }

  const journalResult = await db.insert(journalEntries).values({
    tenantId,
    entryNumber: `JE-${Date.now()}`,
    date: new Date(),
    description: `Ticket Sale ${ticket.ticketNumber}`,
    referenceType: "ticket",
    referenceId: ticket.id,
    status: "posted",
    totalDebit: journalDebit.toFixed(2),
    totalCredit: journalCredit.toFixed(2),
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
      referenceType: "ticket",
      referenceId: ticket.id,
      lines: journalLines,
    });
  }

  await db.update(tickets).set({
    status: "confirmed",
    paymentStatus: fin.paymentStatus,
    netPayable: fin.walletDeduction.toFixed(2),
  }).where(eq(tickets.id, ticket.id));

  if (ticket.customerId) {
    const balanceResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
      .from(customerTransactions)
      .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, ticket.customerId)));
    let runningBalance = Number(balanceResult[0]?.total ?? 0);

    if (fin.remainingDue > 0) {
      runningBalance += fin.remainingDue;
      await db.insert(customerTransactions).values({
        tenantId,
        customerId: ticket.customerId,
        ticketId: ticket.id,
        type: "receivable",
        amount: fin.remainingDue.toFixed(2),
        balance: runningBalance.toFixed(2),
        description: `Ticket sale: ${ticket.ticketNumber}${fin.discountAmount > 0 ? ` (incl. $${fin.discountAmount} discount)` : ""}`,
        createdBy: user.id,
      });
    }

    if (fin.paidAmount > 0) {
      runningBalance = Math.max(0, runningBalance - fin.paidAmount);
      await db.insert(customerTransactions).values({
        tenantId,
        customerId: ticket.customerId,
        ticketId: ticket.id,
        type: "payment",
        amount: fin.paidAmount.toFixed(2),
        balance: runningBalance.toFixed(2),
        description: `Upfront payment for ticket ${ticket.ticketNumber}`,
        createdBy: user.id,
      });
    }

    await db.update(customers).set({
      totalBookings: sql`${customers.totalBookings} + 1`,
      totalRevenue: sql`${customers.totalRevenue} + ${fin.customerCharge.toFixed(2)}`,
      lastBookingDate: new Date(),
    }).where(eq(customers.id, ticket.customerId));

    try {
      const invoiceNumber = await nextNumber(db, tenantId, "INV");
      const invoiceResult = await db.insert(invoices).values({
        tenantId,
        customerId: ticket.customerId,
        invoiceNumber,
        ticketId: ticket.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        subtotal: fin.customerCharge.toFixed(2),
        taxAmount: Number(ticket.taxAmount).toFixed(2),
        totalAmount: fin.customerCharge.toFixed(2),
        paidAmount: fin.paidAmount.toFixed(2),
        status: fin.paymentStatus === "paid" ? "paid" : fin.paymentStatus === "partial" ? "partial" : "sent",
        notes: `Generated from ticket ${ticket.ticketNumber}`,
        createdBy: user.id,
      });
      const invoiceId = Number(invoiceResult[0].insertId);

      const paxList = await db.select().from(ticketPassengers).where(eq(ticketPassengers.ticketId, ticket.id));
      const paxNames = paxList.map((p) => `${p.firstName} ${p.lastName}`).join(", ");

      await db.insert(invoiceItems).values({
        invoiceId,
        description: `Flight: ${ticket.routeFrom} → ${ticket.routeTo} | ${paxNames}`,
        quantity: 1,
        unitPrice: fin.customerCharge.toFixed(2),
        totalPrice: fin.customerCharge.toFixed(2),
      });

      if (fin.remainingDue > 0) {
        await db.update(customerTransactions)
          .set({ invoiceId })
          .where(and(
            eq(customerTransactions.tenantId, tenantId),
            eq(customerTransactions.ticketId, ticket.id),
            eq(customerTransactions.type, "receivable"),
          ));
      }
    } catch {
      // Non-critical
    }
  }

  try {
    await db.insert(notifications).values({
      tenantId,
      userId: user.id,
      title: "Ticket Approved",
      message: `Ticket ${ticket.ticketNumber} has been approved and processed.`,
      type: "success",
      category: "ticket",
      referenceType: "ticket",
      referenceId: ticket.id,
    });

    if (ticket.issuedBy && ticket.issuedBy !== user.id) {
      await db.insert(notifications).values({
        tenantId,
        userId: ticket.issuedBy,
        title: "Ticket Approved",
        message: `Your ticket ${ticket.ticketNumber} has been approved and processed.`,
        type: "success",
        category: "ticket",
        referenceType: "ticket",
        referenceId: ticket.id,
      });
    }
  } catch {
    // Non-critical
  }

  return { success: true };
}
