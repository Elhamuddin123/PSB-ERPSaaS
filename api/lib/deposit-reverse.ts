import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import {
  deposits,
  wallets,
  walletTransactions,
  customerTransactions,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { reversePostedJournals } from "./journal-reverse";

/**
 * Reverses all financial effects of an approved deposit.
 */
export async function reverseApprovedDeposit(
  db: DbOrTx,
  deposit: typeof deposits.$inferSelect,
  userId: number,
) {
  const tenantId = deposit.tenantId;
  const amount = Number(deposit.amount);

  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, deposit.walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!wallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found for deposit reversal" });
  }
  if (Number(wallet.balance) < amount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Insufficient wallet balance to reverse this deposit. Transfer funds first.",
    });
  }

  await db.update(wallets)
    .set({ balance: sql`${wallets.balance} - ${amount.toFixed(2)}` })
    .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${amount.toFixed(2)}`));

  const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, wallet.id) });

  await db.insert(walletTransactions).values({
    walletId: wallet.id,
    tenantId,
    type: "debit",
    amount: amount.toFixed(2),
    balanceAfter: updatedWallet!.balance,
    description: `Deposit reversal: ${deposit.depositCode}`,
    referenceType: "deposit",
    referenceId: deposit.id,
    createdBy: userId,
  });

  await reversePostedJournals(db, tenantId, "deposit", deposit.id, "Deposit reversal");

  if (deposit.customerId) {
    const balanceResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
      .from(customerTransactions)
      .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, deposit.customerId)));
    const runningBalance = Number(balanceResult[0]?.total ?? 0) + amount;

    await db.insert(customerTransactions).values({
      tenantId,
      customerId: deposit.customerId,
      type: "credit",
      amount: amount.toFixed(2),
      balance: runningBalance.toFixed(2),
      description: `Reversal of deposit ${deposit.depositCode}`,
      referenceNumber: deposit.depositCode,
      createdBy: userId,
    });
  }
}
