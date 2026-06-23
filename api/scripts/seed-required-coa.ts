/**
 * Run Part B (required COA seed) against DATABASE_URL.
 *
 *   npx tsx api/scripts/seed-required-coa.ts
 */
import "dotenv/config";
import { getDb } from "../queries/connection";
import { ensureRequiredCoaAccountsAllTenants } from "../lib/ensure-required-coa";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const db = getDb();
  const results = await ensureRequiredCoaAccountsAllTenants(db);

  if (results.length === 0) {
    console.log("Part B complete: all tenants already have COA 1000, 1200, 1250, 2100.");
    return;
  }

  console.log("Part B complete: added missing accounts:");
  for (const row of results) {
    console.log(`  tenant ${row.tenantId}: ${row.added.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
