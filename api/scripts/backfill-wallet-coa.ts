/**
 * Sync operational wallet balances to COA sub-accounts (one-time / idempotent).
 *
 *   npm run db:backfill-wallets
 *   npm run db:backfill-wallets -- --dry-run
 *   npm run db:backfill-wallets -- --tenant-id=1
 *   npm run db:backfill-wallets -- --force
 */
import "dotenv/config";
import { getDb } from "../queries/connection";
import { backfillWalletCoaBalances } from "../lib/wallet-coa-backfill";

function parseArgs(argv: string[]) {
  let tenantId: number | undefined;
  let dryRun = false;
  let force = false;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--tenant-id=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${arg}`);
      tenantId = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Options: --dry-run, --tenant-id=<id>, --force");
      process.exit(0);
    }
  }

  return { tenantId, dryRun, force };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const { tenantId, dryRun, force } = parseArgs(process.argv.slice(2));
  const db = getDb();

  console.log(`Wallet COA backfill${dryRun ? " (dry run)" : ""}${tenantId ? ` tenant=${tenantId}` : ""}...`);

  const result = await db.transaction(async (tx) => backfillWalletCoaBalances(tx, { tenantId, dryRun, force }));

  console.log(`\nProcessed: ${result.processed} wallets`);
  console.log(`Skipped:   ${result.skipped}`);
  console.log(`${dryRun ? "Would post" : "Posted"}: ${result.posted} adjustment(s)\n`);

  for (const item of result.items) {
    if (item.action === "skip" && Math.abs(item.gap) < 0.01) continue;
    const gapLabel = item.gap >= 0 ? `+$${item.gap.toFixed(2)}` : `-$${Math.abs(item.gap).toFixed(2)}`;
    console.log(
      `[${item.action}] tenant=${item.tenantId} wallet=${item.walletId} "${item.walletName}"`
        + ` balance=$${item.walletBalance.toFixed(2)} coa=$${item.coaBalance.toFixed(2)} gap=${gapLabel}`
        + (item.journalPosted ? " (posted)" : ""),
    );
  }

  console.log(dryRun
    ? "\nDry run complete — no journals posted. Re-run without --dry-run to apply."
    : "\nDone. Use Wallets → Reconcile to verify COA alignment.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
