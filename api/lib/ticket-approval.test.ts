import { describe, expect, it } from "vitest";
import {
  computeTicketFinancials,
  validateTicketRefund,
  computeRefundWalletCredit,
} from "./ticket-approval";

type TicketLike = Parameters<typeof computeTicketFinancials>[0];

function makeTicket(overrides: Partial<TicketLike>): TicketLike {
  return {
    totalAmount: "1000.00",
    discountAmount: "0.00",
    commissionAmount: "100.00",
    paidAmount: "0.00",
    ...overrides,
  } as TicketLike;
}

/** Mirrors approval journal lines for a customer ticket (see approveTicket). */
function journalTotals(
  fin: ReturnType<typeof computeTicketFinancials>,
  hasCommissionAccount: boolean,
) {
  let debit = fin.customerCharge + fin.paidAmount;
  let credit = fin.paidAmount + fin.fareRevenue;
  if (fin.netCommission > 0 && hasCommissionAccount) {
    credit += fin.netCommission;
  }
  return { debit, credit };
}

describe("computeTicketFinancials journal balance", () => {
  it("balances with no discount and no upfront payment", () => {
    const fin = computeTicketFinancials(makeTicket({ paidAmount: "0.00" }));
    const { debit, credit } = journalTotals(fin, true);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
  });

  it("balances with partial upfront payment and no discount", () => {
    const fin = computeTicketFinancials(makeTicket({ paidAmount: "300.00" }));
    const { debit, credit } = journalTotals(fin, true);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
    expect(fin.paymentStatus).toBe("partial");
    expect(fin.remainingDue).toBe(700);
  });

  it("balances when discount is taken from commission", () => {
    const fin = computeTicketFinancials(
      makeTicket({ discountAmount: "50.00", paidAmount: "300.00" }),
    );
    expect(fin.netCommission).toBe(50);
    expect(fin.fareRevenue).toBe(900);
    expect(fin.customerCharge).toBe(950);
    const { debit, credit } = journalTotals(fin, true);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
  });

  it("balances when discount equals full commission", () => {
    const fin = computeTicketFinancials(
      makeTicket({ discountAmount: "100.00", paidAmount: "400.00" }),
    );
    expect(fin.netCommission).toBe(0);
    const { debit, credit } = journalTotals(fin, true);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
  });

  it("balances when commission account is absent and net commission is zero", () => {
    const fin = computeTicketFinancials(makeTicket({ discountAmount: "100.00" }));
    expect(fin.netCommission).toBe(0);
    const { debit, credit } = journalTotals(fin, false);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
  });
});

describe("validateTicketRefund with discount", () => {
  it("treats full refund as customer charge ($90), not gross ticket ($100)", () => {
    const fin = computeTicketFinancials(
      makeTicket({ totalAmount: "100.00", discountAmount: "10.00", commissionAmount: "20.00", paidAmount: "90.00" }),
    );
    expect(fin.customerCharge).toBe(90);

    const full = validateTicketRefund(fin, 90, 0);
    expect(full.ok).toBe(true);
    if (full.ok) expect(full.isFullCustomerRefund).toBe(true);

    const grossAttempt = validateTicketRefund(fin, 100, 0);
    expect(grossAttempt.ok).toBe(false);
  });

  it("allows penalty so refund + penalty equals customer charge", () => {
    const fin = computeTicketFinancials(
      makeTicket({ totalAmount: "100.00", discountAmount: "10.00", commissionAmount: "20.00", paidAmount: "90.00" }),
    );
    const result = validateTicketRefund(fin, 80, 10);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.isFullCustomerRefund).toBe(true);
  });

  it("wallet credit is full on full customer refund despite discount", () => {
    const fin = computeTicketFinancials(
      makeTicket({ totalAmount: "100.00", discountAmount: "10.00", commissionAmount: "20.00", paidAmount: "90.00" }),
    );
    const credit = computeRefundWalletCredit(fin, 90, true);
    expect(credit).toBe(fin.walletDeduction);
  });
});
