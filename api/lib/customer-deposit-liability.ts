import { and, asc, eq, isNull } from "drizzle-orm";
import { deposits } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { getDepositSettlementInfo } from "./customer-ledger-pass";

export interface CustomerDepositSummary {
  id: number;
  depositCode: string;
  walletId: number;
  amount: number;
  remaining: number;
}

export async function getCustomerDepositSummaries(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
): Promise<CustomerDepositSummary[]> {
  const depositRows = await db
    .select()
    .from(deposits)
    .where(and(
      eq(deposits.tenantId, tenantId),
      eq(deposits.customerId, customerId),
      eq(deposits.status, "approved"),
      isNull(deposits.deletedAt),
    ))
    .orderBy(asc(deposits.createdAt));

  return Promise.all(depositRows.map(async (deposit) => {
    const info = await getDepositSettlementInfo(db, tenantId, deposit);
    return {
      id: deposit.id,
      depositCode: deposit.depositCode,
      walletId: deposit.walletId,
      amount: info.amount,
      remaining: info.remaining,
    };
  }));
}

export async function getCustomerDepositLiability(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
): Promise<number> {
  const summaries = await getCustomerDepositSummaries(db, tenantId, customerId);
  return summaries.reduce((sum, d) => sum + d.remaining, 0);
}
