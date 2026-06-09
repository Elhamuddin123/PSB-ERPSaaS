import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import {
  customers,
  customerTransactions,
  invoices,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { postLedgerLines } from "./ledger-posting";

export type PaymentSource = "invoice" | "receivable" | "ticket";

export interface RecordCustomerPaymentInput {
  tenantId: number;
  customerId: number;
  amount: number;
  userId: number;
  invoiceId?: number;
  ticketId?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  description?: string;
  source: PaymentSource;
}

export interface RecordCustomerPaymentResult {
  invoiceId: number | null;
  ticketId: number | null;
  newPaidAmount: number | null;
  invoiceStatus: string | null;
  customerBalance: number;
}

async function resolveInvoice(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
  invoiceId?: number,
  ticketId?: number,
) {
  if (invoiceId) {
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    });
    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    }
    if (invoice.customerId !== customerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice does not belong to this customer" });
    }
    return invoice;
  }

  if (ticketId) {
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.ticketId, ticketId), eq(invoices.tenantId, tenantId)),
    });
    if (!invoice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No invoice found for this ticket. Approve the ticket first.",
      });
    }
    if (invoice.customerId !== customerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket invoice does not belong to this customer" });
    }
    return invoice;
  }

  return null;
}

function assertInvoicePayable(invoice: typeof invoices.$inferSelect, amount: number) {
  if (invoice.status === "paid") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice is already fully paid" });
  }
  if (invoice.status === "cancelled") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot pay a cancelled invoice" });
  }

  const balanceDue = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  if (amount > balanceDue + 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Payment exceeds invoice balance due ($${balanceDue.toFixed(2)})`,
    });
  }
}

/**
 * Single idempotent path for customer AR payments (invoice, receivable, ticket).
 * Posts one customer transaction and one Dr Cash / Cr AR journal per payment.
 */
export async function recordCustomerPayment(
  db: DbOrTx,
  input: RecordCustomerPaymentInput,
): Promise<RecordCustomerPaymentResult> {
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

  const invoice = await resolveInvoice(db, tenantId, customerId, input.invoiceId, input.ticketId);
  if (invoice) {
    assertInvoicePayable(invoice, amount);
  }

  const balanceResult = await db
    .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
    .from(customerTransactions)
    .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, customerId)));
  const currentBalance = Number(balanceResult[0]?.total ?? 0);
  if (!invoice && amount > currentBalance + 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Payment exceeds customer outstanding balance ($${currentBalance.toFixed(2)})`,
    });
  }
  const newCustomerBalance = Math.max(0, currentBalance - amount);

  const paymentDescription = input.description
    || (invoice
      ? `Invoice payment ${invoice.invoiceNumber} (${input.paymentMethod || "cash"})`
      : `Payment received (${input.paymentMethod || "cash"})`);

  let newPaidAmount: number | null = null;
  let invoiceStatus: string | null = null;

  if (invoice) {
    newPaidAmount = Number(invoice.paidAmount) + amount;
    invoiceStatus = newPaidAmount >= Number(invoice.totalAmount) ? "paid" : "partial";
    await db.update(invoices).set({
      paidAmount: newPaidAmount.toFixed(2),
      status: invoiceStatus as "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled",
    }).where(and(eq(invoices.id, invoice.id), eq(invoices.tenantId, tenantId)));
  }

  await db.insert(customerTransactions).values({
    tenantId,
    customerId,
    invoiceId: invoice?.id ?? null,
    ticketId: invoice?.ticketId ?? input.ticketId ?? null,
    type: "payment",
    amount: amount.toFixed(2),
    balance: newCustomerBalance.toFixed(2),
    description: paymentDescription,
    referenceNumber: input.referenceNumber?.trim() || null,
    createdBy: userId,
  });

  const cashAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const arAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1200"), eq(chartOfAccounts.tenantId, tenantId)),
  });

  if (cashAccount && arAccount) {
    const journalRefType = invoice ? "invoice_payment" : "customer_payment";
    const journalRefId = invoice?.id ?? customerId;
    const journalResult = await db.insert(journalEntries).values({
      tenantId,
      entryNumber: `JE-PAY-${Date.now()}`,
      date: new Date(),
      description: paymentDescription,
      referenceType: journalRefType,
      referenceId: journalRefId,
      totalDebit: amount.toFixed(2),
      totalCredit: amount.toFixed(2),
      status: "posted",
    });
    const journalId = Number(journalResult[0].insertId ?? 0);
    if (journalId > 0) {
      const lines = [
        { accountId: cashAccount.id, debit: amount.toFixed(2), credit: "0.00", description: "Cash received" },
        { accountId: arAccount.id, debit: "0.00", credit: amount.toFixed(2), description: "AR reduction" },
      ];
      await db.insert(journalEntryLines).values(
        lines.map((line) => ({ journalEntryId: journalId, ...line })),
      );
      await postLedgerLines(db, {
        tenantId,
        journalEntryId: journalId,
        date: new Date(),
        referenceType: journalRefType,
        referenceId: journalRefId,
        lines,
      });
    }
  }

  return {
    invoiceId: invoice?.id ?? null,
    ticketId: invoice?.ticketId ?? input.ticketId ?? null,
    newPaidAmount,
    invoiceStatus,
    customerBalance: newCustomerBalance,
  };
}
