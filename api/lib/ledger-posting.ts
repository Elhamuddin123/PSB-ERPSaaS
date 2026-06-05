import { eq, and, inArray } from "drizzle-orm";
import { chartOfAccounts, ledgerEntries } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { applyLedgerLine, type AccountType } from "./accounting-balance";

export interface LedgerPostingLine {
  accountId: number;
  description: string;
  debit: string;
  credit: string;
}

export interface LedgerPostingInput {
  tenantId: number;
  journalEntryId: number;
  date: Date;
  referenceType?: string;
  referenceId?: number;
  lines: LedgerPostingLine[];
}

/**
 * Inserts ledger rows and updates COA balances using account-type-aware rules.
 */
export async function postLedgerLines(
  db: DbOrTx,
  input: LedgerPostingInput,
): Promise<void> {
  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accountRows = accountIds.length > 0
    ? await db
        .select({
          id: chartOfAccounts.id,
          type: chartOfAccounts.type,
          currentBalance: chartOfAccounts.currentBalance,
        })
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.tenantId, input.tenantId),
            inArray(chartOfAccounts.id, accountIds),
          ),
        )
    : [];

  const accountMap = new Map(accountRows.map((a) => [a.id, a]));

  for (const line of input.lines) {
    const account = accountMap.get(line.accountId);
    const accountType = (account?.type ?? "asset") as AccountType;
    const priorBalance = Number(account?.currentBalance ?? 0);
    const debit = Number(line.debit);
    const credit = Number(line.credit);
    const newBalance = applyLedgerLine(accountType, priorBalance, debit, credit);

    await db.insert(ledgerEntries).values({
      tenantId: input.tenantId,
      journalEntryId: input.journalEntryId,
      accountId: line.accountId,
      date: input.date,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      balance: newBalance.toFixed(2),
      entryType: "transaction",
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });

    await db
      .update(chartOfAccounts)
      .set({ currentBalance: newBalance.toFixed(2) })
      .where(
        and(
          eq(chartOfAccounts.id, line.accountId),
          eq(chartOfAccounts.tenantId, input.tenantId),
        ),
      );

    if (account) {
      account.currentBalance = newBalance.toFixed(2);
    }
  }
}
