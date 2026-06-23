import { and, eq } from "drizzle-orm";
import {
  customerTransactions,
  deposits,
  walletTransactions,
  wallets,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { ensureRequiredCoaAccounts } from "./ensure-required-coa";
import {
  applyPaymentAllocations,
  buildObligationSettlements,
  getCustomerOpenObligations,
  getCustomerRunningBalance,
  type PaymentAllocation,
} from "./customer-receive-payment";
import { postWalletCustomerReceiptJournal } from "./customer-wallet-receipt";

export interface ApproveCustomerDepositResult {
  totalReceived: number;
  settledAllocations: PaymentAllocation[];
  depositHoldAmount: number;
  settledToInvoices: number;
  settledToLoans: number;
}

/**
 * When a customer deposit is approved, cash first settles open invoices and loans
 * (what they owe us). Only the remainder is held as deposit liability.
 */
export async function approveCustomerDepositWithSettlement(
  db: DbOrTx,
  params: {
    tenantId: number;
    userId: number;
    deposit: typeof deposits.$inferSelect;
    approvalNotes?: string;
  },
): Promise<ApproveCustomerDepositResult> {
  const { tenantId, userId, deposit } = params;
  const totalReceived = Number(deposit.amount);

  await ensureRequiredCoaAccounts(db, tenantId);

  await db.update(deposits).set({
    status: "approved",
    approvedBy: userId,
    approvedAt: new Date(),
    notes: params.approvalNotes
      ? `${deposit.notes || ""}\n${params.approvalNotes}`.trim()
      : deposit.notes,
  }).where(and(eq(deposits.id, deposit.id), eq(deposits.tenantId, tenantId)));

  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, deposit.walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  let settledAllocations: PaymentAllocation[] = [];
  let arTotal = 0;
  let loanTotal = 0;

  if (deposit.customerId) {
    const obligations = await getCustomerOpenObligations(db, tenantId, deposit.customerId);
    settledAllocations = buildObligationSettlements(totalReceived, obligations);
    if (settledAllocations.length > 0) {
      const totals = await applyPaymentAllocations(db, {
        tenantId,
        customerId: deposit.customerId,
        userId,
        allocations: settledAllocations,
        paymentMethod: deposit.paymentMethod,
        referenceNumber: deposit.depositCode,
        description: `From deposit ${deposit.depositCode} — applied to open balances`,
      });
      arTotal = totals.arTotal;
      loanTotal = totals.loanTotal;
    }
  }

  const settledTotal = arTotal + loanTotal;
  const depositHoldAmount = Math.max(0, totalReceived - settledTotal);

  const newWalletBalance = Number(wallet.balance) + totalReceived;
  await db.update(wallets).set({ balance: newWalletBalance.toFixed(2) }).where(eq(wallets.id, wallet.id));

  await db.insert(walletTransactions).values({
    walletId: wallet.id,
    tenantId,
    type: "credit",
    amount: totalReceived.toFixed(2),
    balanceAfter: newWalletBalance.toFixed(2),
    description: settledTotal > 0
      ? `Deposit approved: ${deposit.depositCode} ($${settledTotal.toFixed(2)} to balances, $${depositHoldAmount.toFixed(2)} on hold)`
      : `Deposit approved: ${deposit.depositCode}`,
    referenceType: "deposit",
    referenceId: deposit.id,
    createdBy: userId,
  });

  await postWalletCustomerReceiptJournal(db, {
    tenantId,
    wallet,
    totalAmount: totalReceived,
    arAmount: arTotal,
    loanAmount: loanTotal,
    depositLiabilityAmount: depositHoldAmount,
    description: `Deposit received: ${deposit.depositCode}`,
    referenceType: "deposit",
    referenceId: deposit.id,
  });

  const settlementNote = settledTotal > 0
    ? `\n[Auto] $${settledTotal.toFixed(2)} applied to open invoices/loans; $${depositHoldAmount.toFixed(2)} held on deposit.`
    : "";

  await db.update(deposits).set({
    amount: depositHoldAmount.toFixed(2),
    notes: `${deposit.notes || ""}${settlementNote}`.trim(),
  }).where(eq(deposits.id, deposit.id));

  if (deposit.customerId && depositHoldAmount > 0.01) {
    const priorBalance = await getCustomerRunningBalance(db, tenantId, deposit.customerId);

    await db.insert(customerTransactions).values({
      tenantId,
      customerId: deposit.customerId,
      type: "deposit",
      amount: depositHoldAmount.toFixed(2),
      balance: Math.max(0, priorBalance - depositHoldAmount).toFixed(2),
      description: `Deposit hold ${deposit.depositCode}`,
      referenceNumber: deposit.depositCode,
      createdBy: userId,
    });
  }

  return {
    totalReceived,
    settledAllocations,
    depositHoldAmount,
    settledToInvoices: arTotal,
    settledToLoans: loanTotal,
  };
}
