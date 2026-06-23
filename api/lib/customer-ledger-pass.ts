import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import {
  customerLoans,
  customerLoanRepayments,
  customerTransactions,
  deposits,
  journalEntries,
  journalEntryLines,
  wallets,
  walletTransactions,
  chartOfAccounts,
  customers,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import {
  CUSTOMER_DEPOSITS_CODE,
  getAccountByCode,
  postWalletCredit,
  postWalletDebit,
} from "./wallet-coa";
import { postLedgerLines } from "./ledger-posting";
import {
  applyPaymentAllocations,
  buildObligationSettlements,
  getCustomerOpenObligations,
} from "./customer-receive-payment";
import { postWalletCustomerReceiptJournal } from "./customer-wallet-receipt";
import { ensureRequiredCoaAccounts } from "./ensure-required-coa";

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

async function getCustomerRunningBalance(db: DbOrTx, tenantId: number, customerId: number) {
  const balanceResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)`,
    })
    .from(customerTransactions)
    .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, customerId)));
  return Number(balanceResult[0]?.total ?? 0);
}

export async function getDepositPaidOutAmount(db: DbOrTx, tenantId: number, depositCode: string) {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(customerTransactions)
    .where(and(
      eq(customerTransactions.tenantId, tenantId),
      eq(customerTransactions.referenceNumber, depositCode),
      eq(customerTransactions.type, "refund"),
    ));
  return Number(rows[0]?.total ?? 0);
}

export async function getDepositSettlementInfo(
  db: DbOrTx,
  tenantId: number,
  deposit: typeof deposits.$inferSelect,
) {
  const amount = Number(deposit.amount);
  const paidOut = await getDepositPaidOutAmount(db, tenantId, deposit.depositCode);
  return {
    amount,
    paidOut,
    remaining: Math.max(0, amount - paidOut),
  };
}

export async function ledgerPassDeposit(
  db: DbOrTx,
  params: {
    tenantId: number;
    userId: number;
    depositId: number;
    direction: "pay" | "receive";
    amount: number;
    walletId?: number;
    notes?: string;
    referenceNumber?: string;
    skipObligationSettlement?: boolean;
  },
) {
  const { tenantId, userId, depositId, direction, amount } = params;

  const deposit = await db.query.deposits.findFirst({
    where: and(eq(deposits.id, depositId), eq(deposits.tenantId, tenantId)),
  });
  if (!deposit) throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
  if (deposit.status !== "approved") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved deposits can be settled" });
  }
  if (!deposit.customerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Deposit must be linked to a customer for settlement" });
  }

  const depositAmount = Number(deposit.amount);
  const paidOutAmount = await getDepositPaidOutAmount(db, tenantId, deposit.depositCode);
  const remaining = depositAmount - paidOutAmount;
  if (direction === "pay" && amount > remaining + 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Settlement amount exceeds remaining deposit balance ($${remaining.toLocaleString()})`,
    });
  }

  const walletId = params.walletId ?? deposit.walletId;
  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });

  const depositAccount = await getAccountByCode(db, tenantId, CUSTOMER_DEPOSITS_CODE);
  if (!depositAccount) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Customer deposits account missing" });
  }

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, deposit.customerId), eq(customers.tenantId, tenantId)),
  });

  let remainingAfter = remaining;

  if (direction === "pay") {
    const available = Number(wallet.balance) - Number(wallet.reservedBalance ?? 0);
    if (available < amount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Insufficient wallet balance. Available: $${available.toLocaleString()}`,
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
      description: params.notes || `Deposit settlement payout: ${deposit.depositCode}`,
      referenceType: "deposit_settlement",
      referenceId: deposit.id,
      createdBy: userId,
    });

    await postWalletDebit(
      db,
      wallet,
      amount,
      depositAccount.id,
      "Customer deposit settlement payout",
      "deposit_settlement",
      deposit.id,
      `Deposit settlement payout: ${deposit.depositCode}`,
    );

    const runningBalance = await getCustomerRunningBalance(db, tenantId, deposit.customerId);
    await db.insert(customerTransactions).values({
      tenantId,
      customerId: deposit.customerId,
      type: "refund",
      amount: amount.toFixed(2),
      balance: Math.max(0, runningBalance - amount).toFixed(2),
      description: params.notes || `Deposit settlement payout: ${deposit.depositCode}`,
      referenceNumber: params.referenceNumber || deposit.depositCode,
      createdBy: userId,
    });
    remainingAfter = Math.max(0, remaining - amount);
  } else {
    await ensureRequiredCoaAccounts(db, tenantId);

    const obligations = await getCustomerOpenObligations(db, tenantId, deposit.customerId);
    const settledAllocations = params.skipObligationSettlement
      ? []
      : buildObligationSettlements(amount, obligations);
    let arTotal = 0;
    let loanTotal = 0;

    if (settledAllocations.length > 0) {
      const totals = await applyPaymentAllocations(db, {
        tenantId,
        customerId: deposit.customerId,
        userId,
        allocations: settledAllocations,
        paymentMethod: deposit.paymentMethod,
        referenceNumber: params.referenceNumber || deposit.depositCode,
        description: params.notes || `From deposit top-up ${deposit.depositCode}`,
      });
      arTotal = totals.arTotal;
      loanTotal = totals.loanTotal;
    }

    const settledTotal = arTotal + loanTotal;
    const depositHoldAmount = Math.max(0, amount - settledTotal);

    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount.toFixed(2)}` })
      .where(eq(wallets.id, wallet.id));

    const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, wallet.id) });
    await db.insert(walletTransactions).values({
      walletId: wallet.id,
      tenantId,
      type: "credit",
      amount: amount.toFixed(2),
      balanceAfter: updatedWallet!.balance,
      description: settledTotal > 0
        ? params.notes || `Deposit top-up ${deposit.depositCode} ($${settledTotal.toFixed(2)} to balances, $${depositHoldAmount.toFixed(2)} on hold)`
        : params.notes || `Deposit settlement received: ${deposit.depositCode}`,
      referenceType: "deposit_settlement",
      referenceId: deposit.id,
      createdBy: userId,
    });

    await postWalletCustomerReceiptJournal(db, {
      tenantId,
      wallet: updatedWallet!,
      totalAmount: amount,
      arAmount: arTotal,
      loanAmount: loanTotal,
      depositLiabilityAmount: depositHoldAmount,
      description: `Deposit top-up: ${deposit.depositCode}`,
      referenceType: "deposit_settlement",
      referenceId: deposit.id,
    });

    const newDepositAmount = depositAmount + depositHoldAmount;
    await db.update(deposits)
      .set({ amount: newDepositAmount.toFixed(2) })
      .where(eq(deposits.id, deposit.id));

    if (depositHoldAmount > 0.01) {
      const runningBalance = await getCustomerRunningBalance(db, tenantId, deposit.customerId);
      await db.insert(customerTransactions).values({
        tenantId,
        customerId: deposit.customerId,
        type: "deposit",
        amount: depositHoldAmount.toFixed(2),
        balance: Math.max(0, runningBalance - depositHoldAmount).toFixed(2),
        description: params.notes || `Deposit top-up ${deposit.depositCode}`,
        referenceNumber: params.referenceNumber || deposit.depositCode,
        createdBy: userId,
      });
    }
    remainingAfter = Math.max(0, newDepositAmount - paidOutAmount);
  }

  return {
    success: true,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
    remainingBalance: remainingAfter,
  };
}

export async function ledgerPassLoan(
  db: DbOrTx,
  params: {
    tenantId: number;
    userId: number;
    loanId: number;
    direction: "pay" | "receive";
    amount: number;
    paymentMethod?: string;
    notes?: string;
    referenceNumber?: string;
  },
) {
  const { tenantId, userId, loanId, direction, amount } = params;

  const loan = await db.query.customerLoans.findFirst({
    where: and(eq(customerLoans.id, loanId), eq(customerLoans.tenantId, tenantId)),
  });
  if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, loan.customerId), eq(customers.tenantId, tenantId)),
  });

  const cashAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const loanReceivableAccount = await getOrCreateLoanReceivableAccount(db, tenantId);

  if (direction === "receive") {
    if (loan.status !== "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Loan is not active" });
    }
    if (amount > Number(loan.balanceAmount)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Repayment exceeds loan balance" });
    }

    await db.insert(customerLoanRepayments).values({
      tenantId,
      loanId: loan.id,
      amount: amount.toFixed(2),
      paymentMethod: params.paymentMethod || "cash",
      referenceNumber: params.referenceNumber,
      notes: params.notes,
      createdBy: userId,
    });

    const newRepaid = Number(loan.repaidAmount) + amount;
    const newBalance = Number(loan.balanceAmount) - amount;
    await db.update(customerLoans).set({
      repaidAmount: newRepaid.toFixed(2),
      balanceAmount: newBalance.toFixed(2),
      status: (newBalance <= 0 ? "repaid" : "active") as "active" | "repaid",
    }).where(eq(customerLoans.id, loan.id));

    if (cashAccount && loanReceivableAccount) {
      const journalResult = await db.insert(journalEntries).values({
        tenantId,
        entryNumber: `JE-${Date.now()}`,
        date: new Date(),
        description: `Loan settlement received: ${loan.loanNumber}`,
        referenceType: "loan_settlement",
        referenceId: loan.id,
        status: "posted",
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      });
      const journalId = Number(journalResult[0].insertId ?? 0);
      if (journalId > 0) {
        const lines = [
          { accountId: cashAccount.id, description: "Cash received", debit: amount.toFixed(2), credit: "0.00" },
          { accountId: loanReceivableAccount.id, description: "Loan receivable reduction", debit: "0.00", credit: amount.toFixed(2) },
        ];
        await db.insert(journalEntryLines).values(lines.map((l) => ({ journalEntryId: journalId, ...l })));
        await postLedgerLines(db, {
          tenantId,
          journalEntryId: journalId,
          date: new Date(),
          referenceType: "loan_settlement",
          referenceId: loan.id,
          lines,
        });
      }
    }
  } else {
    if (loan.status === "written_off") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot disburse on a written-off loan" });
    }

    const newBalance = Number(loan.balanceAmount) + amount;
    const newPrincipal = Number(loan.principalAmount) + amount;
    await db.update(customerLoans).set({
      principalAmount: newPrincipal.toFixed(2),
      balanceAmount: newBalance.toFixed(2),
      status: "active",
    }).where(eq(customerLoans.id, loan.id));

    if (cashAccount && loanReceivableAccount) {
      const journalResult = await db.insert(journalEntries).values({
        tenantId,
        entryNumber: `JE-${Date.now()}`,
        date: new Date(),
        description: `Loan settlement disbursement: ${loan.loanNumber}`,
        referenceType: "loan_settlement",
        referenceId: loan.id,
        status: "posted",
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      });
      const journalId = Number(journalResult[0].insertId ?? 0);
      if (journalId > 0) {
        const lines = [
          { accountId: loanReceivableAccount.id, description: "Additional loan disbursement", debit: amount.toFixed(2), credit: "0.00" },
          { accountId: cashAccount.id, description: "Cash disbursed", debit: "0.00", credit: amount.toFixed(2) },
        ];
        await db.insert(journalEntryLines).values(lines.map((l) => ({ journalEntryId: journalId, ...l })));
        await postLedgerLines(db, {
          tenantId,
          journalEntryId: journalId,
          date: new Date(),
          referenceType: "loan_settlement",
          referenceId: loan.id,
          lines,
        });
      }
    }
  }

  return {
    success: true,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
  };
}
