import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  bankStatementLines,
  bankStatements,
  supplierPayments,
  billItems,
  bills,
  supplierContacts,
  suppliers,
  customerLoanRepayments,
  customerLoans,
  invoiceItems,
  invoices,
  customerTransactions,
  ledgerEntries,
  journalEntryLines,
  journalEntries,
  ticketPassengers,
  tickets,
  deposits,
  paymentLocations,
  walletTransactions,
  wallets,
  expenses,
  expenseCategories,
  interactions,
  leads,
  customers,
  aiMessages,
  aiConversations,
  documents,
  exchangeRates,
  notifications,
  accountingPeriods,
  documentSequences,
  systemSettings,
  auditLogs,
  airlines,
  chartOfAccounts,
  sessions,
  users,
  tenants,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { bootstrapTenant } from "./bootstrap";

export interface ResetTenantDataResult {
  tenantId: number;
  tenantName: string;
  bootstrapped: boolean;
}

/**
 * Deletes all operational data for a tenant. Preserves tenant, subscription, and users.
 * Re-seeds default COA, wallets, airlines, and expense categories via bootstrap.
 */
export async function resetTenantData(
  db: DbOrTx,
  tenantId: number,
  bootstrapUserId: number,
): Promise<ResetTenantDataResult> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
  }

  const ticketRows = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.tenantId, tenantId));
  const ticketIds = ticketRows.map((r) => r.id);

  const invoiceRows = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.tenantId, tenantId));
  const invoiceIds = invoiceRows.map((r) => r.id);

  const journalRows = await db.select({ id: journalEntries.id }).from(journalEntries).where(eq(journalEntries.tenantId, tenantId));
  const journalIds = journalRows.map((r) => r.id);

  const conversationRows = await db.select({ id: aiConversations.id }).from(aiConversations).where(eq(aiConversations.tenantId, tenantId));
  const conversationIds = conversationRows.map((r) => r.id);

  const tenantUserRows = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId));
  const tenantUserIds = tenantUserRows.map((r) => r.id);

  // Children and dependents first (FK-safe order)
  await db.delete(bankStatementLines).where(eq(bankStatementLines.tenantId, tenantId));
  await db.delete(bankStatements).where(eq(bankStatements.tenantId, tenantId));
  await db.delete(supplierPayments).where(eq(supplierPayments.tenantId, tenantId));
  await db.delete(billItems).where(eq(billItems.tenantId, tenantId));
  await db.delete(bills).where(eq(bills.tenantId, tenantId));
  await db.delete(supplierContacts).where(eq(supplierContacts.tenantId, tenantId));
  await db.delete(suppliers).where(eq(suppliers.tenantId, tenantId));
  await db.delete(customerLoanRepayments).where(eq(customerLoanRepayments.tenantId, tenantId));
  await db.delete(customerLoans).where(eq(customerLoans.tenantId, tenantId));

  if (invoiceIds.length > 0) {
    await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
  }
  await db.delete(invoices).where(eq(invoices.tenantId, tenantId));
  await db.delete(customerTransactions).where(eq(customerTransactions.tenantId, tenantId));

  await db.delete(ledgerEntries).where(eq(ledgerEntries.tenantId, tenantId));
  if (journalIds.length > 0) {
    await db.delete(journalEntryLines).where(inArray(journalEntryLines.journalEntryId, journalIds));
  }
  await db.delete(journalEntries).where(eq(journalEntries.tenantId, tenantId));

  if (ticketIds.length > 0) {
    await db.delete(ticketPassengers).where(inArray(ticketPassengers.ticketId, ticketIds));
  }
  await db.delete(tickets).where(eq(tickets.tenantId, tenantId));

  await db.delete(deposits).where(eq(deposits.tenantId, tenantId));
  await db.delete(paymentLocations).where(eq(paymentLocations.tenantId, tenantId));
  await db.delete(walletTransactions).where(eq(walletTransactions.tenantId, tenantId));
  await db.delete(wallets).where(eq(wallets.tenantId, tenantId));

  await db.delete(expenses).where(eq(expenses.tenantId, tenantId));
  await db.delete(expenseCategories).where(eq(expenseCategories.tenantId, tenantId));
  await db.delete(interactions).where(eq(interactions.tenantId, tenantId));
  await db.delete(leads).where(eq(leads.tenantId, tenantId));
  await db.delete(customers).where(eq(customers.tenantId, tenantId));

  if (conversationIds.length > 0) {
    await db.delete(aiMessages).where(inArray(aiMessages.conversationId, conversationIds));
  }
  await db.delete(aiConversations).where(eq(aiConversations.tenantId, tenantId));

  await db.delete(documents).where(eq(documents.tenantId, tenantId));
  await db.delete(exchangeRates).where(eq(exchangeRates.tenantId, tenantId));
  await db.delete(notifications).where(eq(notifications.tenantId, tenantId));
  await db.delete(accountingPeriods).where(eq(accountingPeriods.tenantId, tenantId));
  await db.delete(documentSequences).where(eq(documentSequences.tenantId, tenantId));
  await db.delete(systemSettings).where(eq(systemSettings.tenantId, tenantId));
  await db.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId));
  await db.delete(airlines).where(eq(airlines.tenantId, tenantId));

  // Wallet sub-accounts before parent COA rows
  await db.delete(chartOfAccounts).where(
    and(eq(chartOfAccounts.tenantId, tenantId), isNotNull(chartOfAccounts.parentId)),
  );
  await db.delete(chartOfAccounts).where(eq(chartOfAccounts.tenantId, tenantId));

  if (tenantUserIds.length > 0) {
    await db.delete(sessions).where(inArray(sessions.userId, tenantUserIds));
  }

  await bootstrapTenant(db, tenantId, bootstrapUserId);

  return {
    tenantId,
    tenantName: tenant.name,
    bootstrapped: true,
  };
}
