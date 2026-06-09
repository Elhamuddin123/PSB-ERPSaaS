import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { chartOfAccounts, wallets, journalEntries, journalEntryLines } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { postLedgerLines } from "./ledger-posting";

export const WALLET_PARENT_CODE = "1050";
export const CASH_ACCOUNT_CODE = "1000";
export const TICKET_COST_CODE = "5100";
export const CUSTOMER_DEPOSITS_CODE = "2100";

type WalletRow = typeof wallets.$inferSelect;

export async function ensureWalletParentAccount(db: DbOrTx, tenantId: number) {
  let parent = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, WALLET_PARENT_CODE)),
  });
  if (!parent) {
    const result = await db.insert(chartOfAccounts).values({
      tenantId,
      code: WALLET_PARENT_CODE,
      name: "Operational Wallets",
      type: "asset",
      subtype: "current_asset",
      currentBalance: "0.00",
      status: "active",
      currency: "USD",
    });
    parent = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, Number(result[0].insertId)),
    });
  }
  if (!parent) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create wallet parent COA account" });
  }
  return parent;
}

export async function ensureWalletCoaAccount(db: DbOrTx, tenantId: number, wallet: WalletRow) {
  if (wallet.accountId) {
    const linked = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.id, wallet.accountId), eq(chartOfAccounts.tenantId, tenantId)),
    });
    if (linked) return linked;
  }

  const parent = await ensureWalletParentAccount(db, tenantId);
  const code = `10W${wallet.id}`;
  let account = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, code)),
  });

  if (!account) {
    const result = await db.insert(chartOfAccounts).values({
      tenantId,
      code,
      name: `Wallet: ${wallet.name}`,
      type: "asset",
      subtype: "current_asset",
      parentId: parent.id,
      currentBalance: "0.00",
      status: "active",
      currency: wallet.currency || "USD",
    });
    account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, Number(result[0].insertId)),
    });
  }

  if (!account) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create wallet COA account" });
  }

  if (!wallet.accountId) {
    await db.update(wallets).set({ accountId: account.id }).where(eq(wallets.id, wallet.id));
  }

  return account;
}

export async function getAccountByCode(db: DbOrTx, tenantId: number, code: string) {
  return db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, code), eq(chartOfAccounts.tenantId, tenantId)),
  });
}

async function postWalletJournal(
  db: DbOrTx,
  params: {
    tenantId: number;
    description: string;
    referenceType: string;
    referenceId: number;
    lines: { accountId: number; debit: string; credit: string; description: string }[];
  },
) {
  const totalDebit = params.lines.reduce((s, l) => s + Number(l.debit), 0);
  const journalResult = await db.insert(journalEntries).values({
    tenantId: params.tenantId,
    entryNumber: `JE-W-${Date.now()}`,
    date: new Date(),
    description: params.description,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    status: "posted",
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalDebit.toFixed(2),
  });
  const journalId = Number(journalResult[0].insertId ?? 0);
  if (journalId > 0) {
    await db.insert(journalEntryLines).values(
      params.lines.map((line) => ({ journalEntryId: journalId, ...line })),
    );
    await postLedgerLines(db, {
      tenantId: params.tenantId,
      journalEntryId: journalId,
      date: new Date(),
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      lines: params.lines,
    });
  }
}

/** Increases wallet COA balance (Dr wallet asset, Cr counter). */
export async function postWalletCredit(
  db: DbOrTx,
  wallet: WalletRow,
  amount: number,
  counterAccountId: number,
  counterDescription: string,
  referenceType: string,
  referenceId: number,
  label: string,
) {
  if (amount <= 0) return;
  const walletAccount = await ensureWalletCoaAccount(db, wallet.tenantId, wallet);
  await postWalletJournal(db, {
    tenantId: wallet.tenantId,
    description: label,
    referenceType,
    referenceId,
    lines: [
      { accountId: walletAccount.id, debit: amount.toFixed(2), credit: "0.00", description: `Wallet credit: ${wallet.name}` },
      { accountId: counterAccountId, debit: "0.00", credit: amount.toFixed(2), description: counterDescription },
    ],
  });
}

/** Decreases wallet COA balance (Dr counter, Cr wallet asset). */
export async function postWalletDebit(
  db: DbOrTx,
  wallet: WalletRow,
  amount: number,
  counterAccountId: number,
  counterDescription: string,
  referenceType: string,
  referenceId: number,
  label: string,
) {
  if (amount <= 0) return;
  const walletAccount = await ensureWalletCoaAccount(db, wallet.tenantId, wallet);
  await postWalletJournal(db, {
    tenantId: wallet.tenantId,
    description: label,
    referenceType,
    referenceId,
    lines: [
      { accountId: counterAccountId, debit: amount.toFixed(2), credit: "0.00", description: counterDescription },
      { accountId: walletAccount.id, debit: "0.00", credit: amount.toFixed(2), description: `Wallet debit: ${wallet.name}` },
    ],
  });
}

/** Internal transfer between two wallet COA sub-accounts. */
export async function postWalletTransfer(
  db: DbOrTx,
  fromWallet: WalletRow,
  toWallet: WalletRow,
  amount: number,
  description: string,
) {
  const fromAccount = await ensureWalletCoaAccount(db, fromWallet.tenantId, fromWallet);
  const toAccount = await ensureWalletCoaAccount(db, toWallet.tenantId, toWallet);
  await postWalletJournal(db, {
    tenantId: fromWallet.tenantId,
    description,
    referenceType: "wallet_transfer",
    referenceId: fromWallet.id,
    lines: [
      { accountId: toAccount.id, debit: amount.toFixed(2), credit: "0.00", description: `Transfer in: ${toWallet.name}` },
      { accountId: fromAccount.id, debit: "0.00", credit: amount.toFixed(2), description: `Transfer out: ${fromWallet.name}` },
    ],
  });
}
