import { and, eq, ne } from "drizzle-orm";
import { chartOfAccounts, journalEntries, wallets } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import {
  ensureWalletCoaAccount,
  getAccountByCode,
  postWalletCredit,
  postWalletDebit,
  CASH_ACCOUNT_CODE,
  WALLET_PARENT_CODE,
} from "./wallet-coa";

const BACKFILL_REF_TYPE = "wallet_coa_backfill";
const OPENING_EQUITY_CODE = "3000";

export interface WalletCoaBackfillItem {
  walletId: number;
  walletName: string;
  tenantId: number;
  walletBalance: number;
  coaBalance: number;
  gap: number;
  action: "skip" | "credit" | "debit" | "already_backfilled";
  journalPosted: boolean;
}

export interface WalletCoaBackfillResult {
  dryRun: boolean;
  tenantId: number | null;
  processed: number;
  skipped: number;
  posted: number;
  items: WalletCoaBackfillItem[];
}

export interface WalletCoaBackfillOptions {
  tenantId?: number;
  dryRun?: boolean;
  force?: boolean;
}

async function readWalletCoaBalance(db: DbOrTx, wallet: typeof wallets.$inferSelect): Promise<number> {
  if (wallet.accountId) {
    const linked = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.id, wallet.accountId), eq(chartOfAccounts.tenantId, wallet.tenantId)),
    });
    if (linked) return Number(linked.currentBalance);
  }
  const byCode = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.tenantId, wallet.tenantId), eq(chartOfAccounts.code, `10W${wallet.id}`)),
  });
  return Number(byCode?.currentBalance ?? 0);
}

async function hasExistingBackfill(db: DbOrTx, tenantId: number, walletId: number) {
  const existing = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.referenceType, BACKFILL_REF_TYPE),
      eq(journalEntries.referenceId, walletId),
      eq(journalEntries.status, "posted"),
    ),
  });
  return !!existing;
}

export async function backfillWalletCoaBalances(
  db: DbOrTx,
  options: WalletCoaBackfillOptions = {},
): Promise<WalletCoaBackfillResult> {
  const { tenantId, dryRun = false, force = false } = options;
  const conditions = [ne(wallets.status, "closed")];
  if (tenantId != null) conditions.push(eq(wallets.tenantId, tenantId));

  const walletRows = await db.query.wallets.findMany({
    where: conditions.length === 1 ? conditions[0] : and(...conditions),
  });

  const items: WalletCoaBackfillItem[] = [];
  let skipped = 0;
  let posted = 0;

  for (const wallet of walletRows) {
    const walletBalance = Number(wallet.balance);
    const coaBalance = dryRun
      ? await readWalletCoaBalance(db, wallet)
      : Number((await ensureWalletCoaAccount(db, wallet.tenantId, wallet)).currentBalance);
    const gap = walletBalance - coaBalance;

    const item: WalletCoaBackfillItem = {
      walletId: wallet.id,
      walletName: wallet.name,
      tenantId: wallet.tenantId,
      walletBalance,
      coaBalance,
      gap,
      action: "skip",
      journalPosted: false,
    };

    if (Math.abs(gap) < 0.01) {
      skipped++;
      items.push(item);
      continue;
    }

    if (!force && await hasExistingBackfill(db, wallet.tenantId, wallet.id)) {
      item.action = "already_backfilled";
      skipped++;
      items.push(item);
      continue;
    }

    const equityAccount = await getAccountByCode(db, wallet.tenantId, OPENING_EQUITY_CODE);
    if (!equityAccount) {
      throw new Error(
        `Tenant ${wallet.tenantId}: missing COA ${OPENING_EQUITY_CODE}. Run tenant bootstrap first.`,
      );
    }

    await getAccountByCode(db, wallet.tenantId, WALLET_PARENT_CODE);
    await getAccountByCode(db, wallet.tenantId, CASH_ACCOUNT_CODE);

    item.action = gap > 0 ? "credit" : "debit";

    if (!dryRun) {
      const amount = Math.abs(gap);
      const label = `Wallet COA backfill: ${wallet.name}`;
      if (gap > 0) {
        await postWalletCredit(db, wallet, amount, equityAccount.id,
          "Opening balance adjustment (wallet COA sync)", BACKFILL_REF_TYPE, wallet.id, label);
      } else {
        await postWalletDebit(db, wallet, amount, equityAccount.id,
          "Opening balance adjustment (wallet COA sync)", BACKFILL_REF_TYPE, wallet.id, label);
      }
      item.journalPosted = true;
      posted++;
    } else {
      posted++;
    }

    items.push(item);
  }

  return {
    dryRun,
    tenantId: tenantId ?? null,
    processed: walletRows.length,
    skipped,
    posted: dryRun ? items.filter((i) => i.action === "credit" || i.action === "debit").length : posted,
    items,
  };
}
