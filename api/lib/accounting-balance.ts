/**
 * Shared debit/credit balance rules for chart of accounts, ledger posting, and reports.
 */

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export function isDebitNormal(type: AccountType): boolean {
  return type === "asset" || type === "expense";
}

/** Signed balance in the account's natural (normal) direction. */
export function naturalBalance(
  type: AccountType,
  totalDebit: number,
  totalCredit: number,
): number {
  return isDebitNormal(type) ? totalDebit - totalCredit : totalCredit - totalDebit;
}

/** Apply a journal line to a prior natural balance. */
export function applyLedgerLine(
  type: AccountType,
  priorBalance: number,
  debit: number,
  credit: number,
): number {
  return isDebitNormal(type)
    ? priorBalance + debit - credit
    : priorBalance + credit - debit;
}

/** Classical trial balance columns — each account appears on one side only. */
export function toTrialBalanceColumns(
  type: AccountType,
  totalDebit: number,
  totalCredit: number,
): { debitBalance: number; creditBalance: number; signedBalance: number } {
  const signed = naturalBalance(type, totalDebit, totalCredit);
  if (isDebitNormal(type)) {
    if (signed >= 0) return { debitBalance: signed, creditBalance: 0, signedBalance: signed };
    return { debitBalance: 0, creditBalance: -signed, signedBalance: signed };
  }
  if (signed >= 0) return { debitBalance: 0, creditBalance: signed, signedBalance: signed };
  return { debitBalance: -signed, creditBalance: 0, signedBalance: signed };
}

export interface LedgerAggregate {
  accountId: number;
  totalDebit: number;
  totalCredit: number;
}

export interface TrialBalanceRow {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  totalDebit: number;
  totalCredit: number;
  debitBalance: number;
  creditBalance: number;
  signedBalance: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
}

export function buildTrialBalance(
  accounts: Array<{ id: number; code: string; name: string; type: AccountType }>,
  ledgerMap: Map<number, LedgerAggregate>,
  options?: { includeZeroBalances?: boolean },
): TrialBalanceResult {
  const includeZero = options?.includeZeroBalances ?? false;
  const rows: TrialBalanceRow[] = [];

  for (const account of accounts) {
    const ledger = ledgerMap.get(account.id);
    const totalDebit = Number(ledger?.totalDebit ?? 0);
    const totalCredit = Number(ledger?.totalCredit ?? 0);
    const columns = toTrialBalanceColumns(account.type, totalDebit, totalCredit);

    if (!includeZero && columns.debitBalance === 0 && columns.creditBalance === 0) {
      continue;
    }

    rows.push({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      totalDebit,
      totalCredit,
      ...columns,
    });
  }

  const totalDebit = rows.reduce((sum, r) => sum + r.debitBalance, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.creditBalance, 0);
  const difference = totalDebit - totalCredit;

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(difference) < 0.01,
    difference,
  };
}

function classifyExpense(
  account: { subtype?: string | null; name: string; code: string },
): "cost_of_revenue" | "operating" | "tax" | "other" {
  const subtype = (account.subtype || "").toLowerCase();
  const name = account.name.toLowerCase();
  if (subtype.includes("cost") || subtype === "cogs" || subtype === "cost_of_sales") {
    return "cost_of_revenue";
  }
  if (subtype === "tax" || name.includes("tax") || account.code.startsWith("59")) {
    return "tax";
  }
  if (subtype === "other" || subtype === "non_operating") {
    return "other";
  }
  return "operating";
}

function classifyRevenue(
  account: { subtype?: string | null; name: string },
): "operating" | "other" {
  const subtype = (account.subtype || "").toLowerCase();
  if (subtype === "other" || subtype === "non_operating") {
    return "other";
  }
  return "operating";
}

export interface IncomeStatementLine {
  id: number;
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementResult {
  period: { fromDate: string | null; toDate: string | null };
  revenues: IncomeStatementLine[];
  costOfRevenue: IncomeStatementLine[];
  operatingExpenses: IncomeStatementLine[];
  otherIncome: IncomeStatementLine[];
  otherExpenses: IncomeStatementLine[];
  taxExpenses: IncomeStatementLine[];
  totals: {
    totalRevenue: number;
    totalCostOfRevenue: number;
    grossProfit: number;
    totalOperatingExpenses: number;
    operatingIncome: number;
    totalOtherIncome: number;
    totalOtherExpenses: number;
    incomeBeforeTax: number;
    taxProvisionRate: number;
    estimatedTaxProvision: number;
    actualTaxExpense: number;
    totalTaxExpense: number;
    netIncome: number;
  };
}

export function buildIncomeStatement(
  accounts: Array<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    subtype?: string | null;
  }>,
  ledgerMap: Map<number, LedgerAggregate>,
  options?: {
    fromDate?: string | null;
    toDate?: string | null;
    taxProvisionRate?: number;
    includeZeroBalances?: boolean;
  },
): IncomeStatementResult {
  const includeZero = options?.includeZeroBalances ?? false;
  const taxRate = Math.max(0, Number(options?.taxProvisionRate ?? 0));

  const revenues: IncomeStatementLine[] = [];
  const costOfRevenue: IncomeStatementLine[] = [];
  const operatingExpenses: IncomeStatementLine[] = [];
  const otherIncome: IncomeStatementLine[] = [];
  const otherExpenses: IncomeStatementLine[] = [];
  const taxExpenses: IncomeStatementLine[] = [];

  for (const account of accounts) {
    const ledger = ledgerMap.get(account.id);
    const totalDebit = Number(ledger?.totalDebit ?? 0);
    const totalCredit = Number(ledger?.totalCredit ?? 0);
    const amount = naturalBalance(account.type, totalDebit, totalCredit);

    if (!includeZero && Math.abs(amount) < 0.005) continue;

    const line = { id: account.id, code: account.code, name: account.name, amount };

    if (account.type === "revenue") {
      if (classifyRevenue(account) === "other") otherIncome.push(line);
      else revenues.push(line);
    } else if (account.type === "expense") {
      const bucket = classifyExpense(account);
      if (bucket === "cost_of_revenue") costOfRevenue.push(line);
      else if (bucket === "tax") taxExpenses.push(line);
      else if (bucket === "other") otherExpenses.push(line);
      else operatingExpenses.push(line);
    }
  }

  const sum = (items: IncomeStatementLine[]) =>
    items.reduce((total, item) => total + item.amount, 0);

  const totalRevenue = sum(revenues);
  const totalCostOfRevenue = sum(costOfRevenue);
  const grossProfit = totalRevenue - totalCostOfRevenue;
  const totalOperatingExpenses = sum(operatingExpenses);
  const operatingIncome = grossProfit - totalOperatingExpenses;
  const totalOtherIncome = sum(otherIncome);
  const totalOtherExpenses = sum(otherExpenses);
  const incomeBeforeTax = operatingIncome + totalOtherIncome - totalOtherExpenses;
  const actualTaxExpense = sum(taxExpenses);
  const estimatedTaxProvision =
    actualTaxExpense > 0 || taxRate <= 0 || incomeBeforeTax <= 0
      ? 0
      : (incomeBeforeTax * taxRate) / 100;
  const totalTaxExpense = actualTaxExpense + estimatedTaxProvision;
  const netIncome = incomeBeforeTax - totalTaxExpense;

  return {
    period: {
      fromDate: options?.fromDate ?? null,
      toDate: options?.toDate ?? null,
    },
    revenues,
    costOfRevenue,
    operatingExpenses,
    otherIncome,
    otherExpenses,
    taxExpenses,
    totals: {
      totalRevenue,
      totalCostOfRevenue,
      grossProfit,
      totalOperatingExpenses,
      operatingIncome,
      totalOtherIncome,
      totalOtherExpenses,
      incomeBeforeTax,
      taxProvisionRate: taxRate,
      estimatedTaxProvision,
      actualTaxExpense,
      totalTaxExpense,
      netIncome,
    },
  };
}
