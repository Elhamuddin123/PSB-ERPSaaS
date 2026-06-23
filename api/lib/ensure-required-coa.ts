import { and, eq, inArray } from "drizzle-orm";
import { chartOfAccounts } from "@db/schema";
import type { DbOrTx } from "../queries/connection";

/** CRM / receivables flows require these COA codes per tenant. */
export const REQUIRED_COA_ACCOUNTS = [
  { code: "1000", name: "Cash on Hand", type: "asset" as const, subtype: "current_asset" as const },
  { code: "1200", name: "Accounts Receivable", type: "asset" as const, subtype: "current_asset" as const },
  { code: "1250", name: "Customer Loans Receivable", type: "asset" as const, subtype: "current_asset" as const },
  { code: "2100", name: "Customer Deposits", type: "liability" as const, subtype: "current_liability" as const },
];

/**
 * Inserts any missing required chart-of-account rows for a tenant.
 * Safe to call repeatedly (e.g. on ticket approve, receive payment).
 */
export async function ensureRequiredCoaAccounts(db: DbOrTx, tenantId: number): Promise<string[]> {
  const codes = REQUIRED_COA_ACCOUNTS.map((a) => a.code);
  const existing = await db
    .select({ code: chartOfAccounts.code })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.tenantId, tenantId), inArray(chartOfAccounts.code, codes)));

  const have = new Set(existing.map((r) => r.code));
  const missing = REQUIRED_COA_ACCOUNTS.filter((a) => !have.has(a.code));

  if (missing.length === 0) return [];

  await db.insert(chartOfAccounts).values(
    missing.map((a) => ({
      tenantId,
      code: a.code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      currentBalance: "0.00",
      status: "active" as const,
      currency: "USD",
    })),
  );

  return missing.map((a) => a.code);
}

/**
 * Seeds required COA for every tenant (live DB Part B equivalent).
 */
export async function ensureRequiredCoaAccountsAllTenants(db: DbOrTx): Promise<{ tenantId: number; added: string[] }[]> {
  const { tenants } = await import("@db/schema");
  const allTenants = await db.select({ id: tenants.id }).from(tenants);
  const results: { tenantId: number; added: string[] }[] = [];
  for (const t of allTenants) {
    const added = await ensureRequiredCoaAccounts(db, t.id);
    if (added.length > 0) results.push({ tenantId: t.id, added });
  }
  return results;
}
