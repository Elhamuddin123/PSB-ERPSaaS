import { eq } from "drizzle-orm";
import { chartOfAccounts } from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { bootstrapTenant } from "./bootstrap";
import { ensureRequiredCoaAccounts } from "./ensure-required-coa";

/**
 * Ensures a tenant has chart of accounts, wallets, and other bootstrap data.
 * Safe to call repeatedly — bootstrap is idempotent per table.
 */
export async function ensureTenantBootstrapped(
  db: DbOrTx,
  tenantId: number,
  userId: number,
): Promise<void> {
  const existingCoa = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId))
    .limit(1);

  if (existingCoa.length === 0) {
    await bootstrapTenant(db, tenantId, userId);
  } else {
    await ensureRequiredCoaAccounts(db, tenantId);
  }
}
