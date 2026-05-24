import { eq } from "drizzle-orm";
import {
  chartOfAccounts,
  wallets,
  airlines,
  expenseCategories,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { seedDefaultSettings } from "./settings";

/**
 * Idempotent tenant bootstrap.
 *
 * Creates default chart of accounts, wallets, airlines, and expense categories
 * only if they do not already exist for the tenant.
 * Also seeds default system settings.
 *
 * Safe to call multiple times — will skip already-initialized tables.
 */
export async function bootstrapTenant(
  db: DbOrTx,
  tenantId: number,
  userId: number,
): Promise<void> {
  // ── 1. Chart of Accounts ──
  const existingCoa = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId))
    .limit(1);

  if (existingCoa.length === 0) {
    await db.insert(chartOfAccounts).values([
      { tenantId, code: "1000", name: "Cash on Hand", type: "asset", subtype: "current_asset", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "1100", name: "Bank Account - Main", type: "asset", subtype: "current_asset", isBankAccount: true, currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "1200", name: "Accounts Receivable", type: "asset", subtype: "current_asset", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "1300", name: "Commission Receivable", type: "asset", subtype: "current_asset", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "2000", name: "Accounts Payable", type: "liability", subtype: "current_liability", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "2100", name: "Customer Deposits", type: "liability", subtype: "current_liability", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "3000", name: "Owner Equity", type: "equity", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "3100", name: "Retained Earnings", type: "equity", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "4000", name: "Ticket Revenue", type: "revenue", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "4100", name: "Commission Revenue", type: "revenue", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "4200", name: "Penalty Revenue", type: "revenue", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "5000", name: "Office Expenses", type: "expense", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "5100", name: "Travel Expenses", type: "expense", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "5200", name: "Software Expenses", type: "expense", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "5300", name: "Marketing Expenses", type: "expense", currentBalance: "0.00", status: "active", currency: "USD" },
      { tenantId, code: "5400", name: "Professional Services", type: "expense", currentBalance: "0.00", status: "active", currency: "USD" },
    ]);
  }

  // ── 2. Wallets ──
  const existingWallets = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.tenantId, tenantId))
    .limit(1);

  if (existingWallets.length === 0) {
    await db.insert(wallets).values([
      { tenantId, name: "Main Operating Account", currency: "USD", balance: "0.00", reservedBalance: "0.00", status: "active" },
      { tenantId, name: "Petty Cash", currency: "USD", balance: "0.00", reservedBalance: "0.00", status: "active" },
      { tenantId, name: "Client Deposits", currency: "USD", balance: "0.00", reservedBalance: "0.00", status: "active" },
    ]);
  }

  // ── 3. Airlines ──
  const existingAirlines = await db
    .select({ id: airlines.id })
    .from(airlines)
    .where(eq(airlines.tenantId, tenantId))
    .limit(1);

  if (existingAirlines.length === 0) {
    await db.insert(airlines).values([
      { tenantId, code: "AA", name: "American Airlines", iataCode: "AA", icaoCode: "AAL", status: "active" },
      { tenantId, code: "DL", name: "Delta Air Lines", iataCode: "DL", icaoCode: "DAL", status: "active" },
      { tenantId, code: "UA", name: "United Airlines", iataCode: "UA", icaoCode: "UAL", status: "active" },
      { tenantId, code: "BA", name: "British Airways", iataCode: "BA", icaoCode: "BAW", status: "active" },
      { tenantId, code: "EK", name: "Emirates", iataCode: "EK", icaoCode: "UAE", status: "active" },
      { tenantId, code: "LH", name: "Lufthansa", iataCode: "LH", icaoCode: "DLH", status: "active" },
      { tenantId, code: "AF", name: "Air France", iataCode: "AF", icaoCode: "AFR", status: "active" },
      { tenantId, code: "SQ", name: "Singapore Airlines", iataCode: "SQ", icaoCode: "SIA", status: "active" },
    ]);
  }

  // ── 4. Expense Categories ──
  const existingCategories = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(eq(expenseCategories.tenantId, tenantId))
    .limit(1);

  if (existingCategories.length === 0) {
    await db.insert(expenseCategories).values([
      { tenantId, name: "Office Supplies", description: "General office materials", color: "#3b82f6", icon: "package" },
      { tenantId, name: "Travel & Accommodation", description: "Staff travel and hotels", color: "#f59e0b", icon: "plane" },
      { tenantId, name: "Software & Subscriptions", description: "SaaS and software licenses", color: "#10b981", icon: "monitor" },
      { tenantId, name: "Marketing & Advertising", description: "Promotional activities", color: "#ef4444", icon: "megaphone" },
      { tenantId, name: "Utilities", description: "Electricity, internet, phone", color: "#8b5cf6", icon: "zap" },
      { tenantId, name: "Professional Services", description: "Legal, accounting, consulting", color: "#ec4899", icon: "briefcase" },
      { tenantId, name: "Equipment", description: "Hardware and equipment", color: "#06b6d4", icon: "cpu" },
      { tenantId, name: "Training & Development", description: "Staff education and courses", color: "#84cc16", icon: "graduation-cap" },
    ]);
  }

  // ── 5. Default Settings ──
  await seedDefaultSettings(db, tenantId, userId);
}
