import { eq, inArray, or } from "drizzle-orm";
import type { DbOrTx } from "../queries/connection";
import {
  users,
  sessions,
  notifications,
  aiConversations,
  aiMessages,
  wallets,
  walletTransactions,
  deposits,
  auditLogs,
  subscriptions,
  tickets,
  customers,
  leads,
  interactions,
  expenses,
  journalEntries,
  customerTransactions,
  invoices,
  accountingPeriods,
  suppliers,
  bills,
  supplierPayments,
  exchangeRates,
  bankStatements,
  systemSettings,
  documents,
} from "@db/schema";

async function nullifyUserReferences(db: DbOrTx, userId: number) {
  await db.update(subscriptions).set({ approvedBy: null }).where(eq(subscriptions.approvedBy, userId));
  await db.update(walletTransactions).set({ createdBy: null }).where(eq(walletTransactions.createdBy, userId));
  await db.update(tickets).set({ issuedBy: null }).where(eq(tickets.issuedBy, userId));
  await db.update(tickets).set({ deletedBy: null }).where(eq(tickets.deletedBy, userId));
  await db.update(customers).set({ assignedTo: null }).where(eq(customers.assignedTo, userId));
  await db.update(customers).set({ deletedBy: null }).where(eq(customers.deletedBy, userId));
  await db.update(leads).set({ assignedTo: null }).where(eq(leads.assignedTo, userId));
  await db.update(interactions).set({ createdBy: null }).where(eq(interactions.createdBy, userId));
  await db.update(expenses).set({ approvedBy: null }).where(eq(expenses.approvedBy, userId));
  await db.update(expenses).set({ submittedBy: null }).where(eq(expenses.submittedBy, userId));
  await db.update(expenses).set({ deletedBy: null }).where(eq(expenses.deletedBy, userId));
  await db.update(journalEntries).set({ postedBy: null }).where(eq(journalEntries.postedBy, userId));
  await db.update(customerTransactions).set({ createdBy: null }).where(eq(customerTransactions.createdBy, userId));
  await db.update(invoices).set({ createdBy: null }).where(eq(invoices.createdBy, userId));
  await db.update(invoices).set({ deletedBy: null }).where(eq(invoices.deletedBy, userId));
  await db.update(accountingPeriods).set({ closedBy: null }).where(eq(accountingPeriods.closedBy, userId));
  await db.update(auditLogs).set({ deletedBy: null }).where(eq(auditLogs.deletedBy, userId));
  await db.update(deposits).set({ approvedBy: null }).where(eq(deposits.approvedBy, userId));
  await db.update(deposits).set({ createdBy: null }).where(eq(deposits.createdBy, userId));
  await db.update(deposits).set({ deletedBy: null }).where(eq(deposits.deletedBy, userId));
  await db.update(suppliers).set({ createdBy: null }).where(eq(suppliers.createdBy, userId));
  await db.update(bills).set({ createdBy: null }).where(eq(bills.createdBy, userId));
  await db.update(bills).set({ deletedBy: null }).where(eq(bills.deletedBy, userId));
  await db.update(supplierPayments).set({ createdBy: null }).where(eq(supplierPayments.createdBy, userId));
  await db.update(supplierPayments).set({ deletedBy: null }).where(eq(supplierPayments.deletedBy, userId));
  await db.update(exchangeRates).set({ createdBy: null }).where(eq(exchangeRates.createdBy, userId));
  await db.update(bankStatements).set({ createdBy: null }).where(eq(bankStatements.createdBy, userId));
  await db.update(systemSettings).set({ updatedBy: null }).where(eq(systemSettings.updatedBy, userId));
  await db.update(documents).set({ generatedBy: null }).where(eq(documents.generatedBy, userId));
  await db.update(documents).set({ deletedBy: null }).where(eq(documents.deletedBy, userId));
}

async function deleteOwnedUserData(db: DbOrTx, userId: number) {
  const userWallets = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, userId));

  const walletIds = userWallets.map((w) => w.id);

  if (walletIds.length > 0) {
    await db.delete(walletTransactions).where(inArray(walletTransactions.walletId, walletIds));

    const linkedDeposits = await db
      .select({ walletId: deposits.walletId })
      .from(deposits)
      .where(inArray(deposits.walletId, walletIds));

    const walletIdsWithDeposits = new Set(linkedDeposits.map((d) => d.walletId));
    const deletableWalletIds = walletIds.filter((id) => !walletIdsWithDeposits.has(id));

    if (deletableWalletIds.length > 0) {
      await db.delete(wallets).where(inArray(wallets.id, deletableWalletIds));
    }

    const retainedWalletIds = walletIds.filter((id) => walletIdsWithDeposits.has(id));
    if (retainedWalletIds.length > 0) {
      await db.update(wallets).set({ userId: null }).where(inArray(wallets.id, retainedWalletIds));
    }
  }

  const conversations = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId));

  const conversationIds = conversations.map((c) => c.id);
  if (conversationIds.length > 0) {
    await db.delete(aiMessages).where(inArray(aiMessages.conversationId, conversationIds));
    await db.delete(aiConversations).where(inArray(aiConversations.id, conversationIds));
  }

  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(auditLogs).where(
    or(eq(auditLogs.userId, userId), eq(auditLogs.deletedBy, userId)),
  );
}

export async function deleteUserAndAssociatedData(db: DbOrTx, userId: number) {
  await deleteOwnedUserData(db, userId);
  await nullifyUserReferences(db, userId);
  await db.delete(users).where(eq(users.id, userId));
}
