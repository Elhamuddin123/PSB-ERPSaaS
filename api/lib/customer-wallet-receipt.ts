import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  wallets,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { postLedgerLines } from "./ledger-posting";
import {
  CUSTOMER_DEPOSITS_CODE,
  ensureWalletCoaAccount,
  getAccountByCode,
} from "./wallet-coa";

async function getOrCreateLoanReceivableAccount(db: DbOrTx, tenantId: number) {
  let account = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1250"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  if (!account) {
    const result = await db.insert(chartOfAccounts).values({
      tenantId,
      code: "1250",
      name: "Customer Loans Receivable",
      type: "asset",
      subtype: "current_asset",
      currentBalance: "0.00",
      status: "active",
      currency: "USD",
    });
    account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, Number(result[0].insertId)),
    });
  }
  return account;
}

/** Dr wallet (cash in) = Cr AR + Cr loan receivable + Cr customer deposit liability */
export async function postWalletCustomerReceiptJournal(
  db: DbOrTx,
  params: {
    tenantId: number;
    wallet: typeof wallets.$inferSelect;
    totalAmount: number;
    arAmount: number;
    loanAmount: number;
    depositLiabilityAmount: number;
    description: string;
    referenceType: string;
    referenceId: number;
  },
) {
  const {
    tenantId,
    wallet,
    totalAmount,
    arAmount,
    loanAmount,
    depositLiabilityAmount,
    description,
    referenceType,
    referenceId,
  } = params;

  if (totalAmount <= 0.01) return { journalId: null };

  const creditSum = arAmount + loanAmount + depositLiabilityAmount;
  if (Math.abs(creditSum - totalAmount) > 0.02) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Wallet receipt journal does not balance",
    });
  }

  const walletAccount = await ensureWalletCoaAccount(db, tenantId, wallet);
  const arAccount = await getAccountByCode(db, tenantId, "1200");
  const depositAccount = await getAccountByCode(db, tenantId, CUSTOMER_DEPOSITS_CODE);
  const loanAccount = loanAmount > 0 ? await getOrCreateLoanReceivableAccount(db, tenantId) : null;

  if (!arAccount || !depositAccount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Required COA accounts missing (1200 / 2100)" });
  }
  if (loanAmount > 0 && !loanAccount) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Loan receivable account missing" });
  }

  const lines: { accountId: number; description: string; debit: string; credit: string }[] = [
    {
      accountId: walletAccount.id,
      description: `Wallet funded: ${wallet.name}`,
      debit: totalAmount.toFixed(2),
      credit: "0.00",
    },
  ];

  if (arAmount > 0) {
    lines.push({
      accountId: arAccount.id,
      description: "AR reduction — customer payment",
      debit: "0.00",
      credit: arAmount.toFixed(2),
    });
  }
  if (loanAmount > 0 && loanAccount) {
    lines.push({
      accountId: loanAccount.id,
      description: "Loan receivable reduction",
      debit: "0.00",
      credit: loanAmount.toFixed(2),
    });
  }
  if (depositLiabilityAmount > 0) {
    lines.push({
      accountId: depositAccount.id,
      description: "Customer deposit liability",
      debit: "0.00",
      credit: depositLiabilityAmount.toFixed(2),
    });
  }

  const journalResult = await db.insert(journalEntries).values({
    tenantId,
    entryNumber: `JE-${Date.now()}`,
    date: new Date(),
    description,
    referenceType,
    referenceId,
    totalDebit: totalAmount.toFixed(2),
    totalCredit: totalAmount.toFixed(2),
    status: "posted",
  });
  const journalId = Number(journalResult[0].insertId ?? 0);

  if (journalId > 0) {
    await db.insert(journalEntryLines).values(
      lines.map((line) => ({ journalEntryId: journalId, ...line })),
    );
    await postLedgerLines(db, {
      tenantId,
      journalEntryId: journalId,
      date: new Date(),
      referenceType,
      referenceId,
      lines,
    });
  }

  return { journalId: journalId || null };
}
