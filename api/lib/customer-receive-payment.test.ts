import { describe, expect, it } from "vitest";
import {
  buildAutoAllocations,
  buildObligationSettlements,
  customerPaymentJournalTotals,
  mergeCustomerCashAllocations,
  validatePaymentAllocations,
  type OpenObligationInvoice,
  type OpenObligationLoan,
  type OpenObligationDeposit,
  type PaymentAllocation,
} from "./customer-receive-payment";

function obligations(
  invoices: OpenObligationInvoice[] = [],
  loans: OpenObligationLoan[] = [],
  deposits: OpenObligationDeposit[] = [],
) {
  const totalOwed = invoices.reduce((s, i) => s + i.balanceDue, 0)
    + loans.reduce((s, l) => s + l.balanceAmount, 0);
  return {
    openInvoices: invoices,
    openLoans: loans,
    openDeposits: deposits,
    arBalance: totalOwed,
    depositLiability: deposits.reduce((s, d) => s + d.remaining, 0),
    totalOwed,
  };
}

const invoice = (id: number, balanceDue: number): OpenObligationInvoice => ({
  id,
  invoiceNumber: `INV-${id}`,
  ticketId: id,
  issueDate: new Date("2025-01-01"),
  totalAmount: balanceDue,
  paidAmount: 0,
  balanceDue,
});

const loan = (id: number, balanceAmount: number): OpenObligationLoan => ({
  id,
  loanNumber: `LN-${id}`,
  loanDate: new Date("2025-01-01"),
  balanceAmount,
});

const deposit = (id: number, remaining = 0): OpenObligationDeposit => ({
  id,
  depositCode: `DEP-${id}`,
  walletId: 1,
  amount: remaining,
  remaining,
});

describe("buildAutoAllocations", () => {
  it("allocates FIFO to oldest invoices first", () => {
    const allocs = buildAutoAllocations(500, obligations([
      invoice(1, 300),
      invoice(2, 400),
    ]));
    expect(allocs).toEqual([
      { type: "invoice", invoiceId: 1, amount: 300 },
      { type: "invoice", invoiceId: 2, amount: 200 },
    ]);
  });

  it("allocates remainder to loans after invoices are covered", () => {
    const allocs = buildAutoAllocations(600, obligations(
      [invoice(1, 200)],
      [loan(10, 500)],
    ));
    expect(allocs).toEqual([
      { type: "invoice", invoiceId: 1, amount: 200 },
      { type: "loan", loanId: 10, amount: 400 },
    ]);
  });

  it("caps each slice at the obligation balance", () => {
    const allocs = buildAutoAllocations(1000, obligations([invoice(1, 150)]));
    expect(allocs).toEqual([{ type: "invoice", invoiceId: 1, amount: 150 }]);
  });

  it("allocates remainder to deposits after invoices and loans", () => {
    const allocs = buildAutoAllocations(500, obligations(
      [invoice(1, 200)],
      [loan(10, 100)],
      [deposit(20), deposit(21)],
    ));
    expect(allocs).toEqual([
      { type: "invoice", invoiceId: 1, amount: 200 },
      { type: "loan", loanId: 10, amount: 100 },
      { type: "deposit", depositId: 20, amount: 200 },
    ]);
  });

  it("allocates full payment to first deposit when no invoices or loans", () => {
    const allocs = buildAutoAllocations(250, obligations([], [], [deposit(5), deposit(6)]));
    expect(allocs).toEqual([{ type: "deposit", depositId: 5, amount: 250 }]);
  });
});

describe("buildObligationSettlements", () => {
  it("settles loans before any deposit hold", () => {
    const allocs = buildObligationSettlements(200, obligations(
      [],
      [loan(1, 50)],
      [deposit(9)],
    ));
    expect(allocs).toEqual([{ type: "loan", loanId: 1, amount: 50 }]);
  });

  it("does not allocate to deposits", () => {
    const allocs = buildObligationSettlements(200, obligations([], [], [deposit(9)]));
    expect(allocs).toEqual([]);
  });
});

describe("mergeCustomerCashAllocations", () => {
  it("settles loan first even when manual allocation is deposit-only", () => {
    const { allocations } = mergeCustomerCashAllocations(200, obligations(
      [],
      [loan(1, 50)],
      [deposit(9, 0)],
    ), [{ type: "deposit", depositId: 9, amount: 200 }]);
    expect(allocations).toEqual([
      { type: "loan", loanId: 1, amount: 50 },
      { type: "deposit", depositId: 9, amount: 150 },
    ]);
  });
});

describe("validatePaymentAllocations", () => {
  it("accepts allocations that sum to payment amount", () => {
    const allocs: PaymentAllocation[] = [
      { type: "invoice", invoiceId: 1, amount: 100 },
      { type: "loan", loanId: 2, amount: 50 },
      { type: "deposit", depositId: 3, amount: 25 },
    ];
    expect(validatePaymentAllocations(175, allocs)).toEqual({ ok: true });
  });

  it("rejects when allocated total differs from payment", () => {
    const allocs: PaymentAllocation[] = [{ type: "invoice", invoiceId: 1, amount: 90 }];
    const result = validatePaymentAllocations(100, allocs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("must equal payment amount");
    }
  });

  it("rejects empty allocations", () => {
    const result = validatePaymentAllocations(100, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("No open invoices, loans, or deposits");
    }
  });
});

describe("customerPaymentJournalTotals", () => {
  it("balances Dr cash against Cr AR and loan receivable", () => {
    const amount = 500;
    const arTotal = 300;
    const loanTotal = 200;
    const { debit, credit } = customerPaymentJournalTotals(amount, arTotal, loanTotal);
    expect(debit).toBe(500);
    expect(credit).toBe(500);
    expect(Math.abs(debit - credit)).toBeLessThanOrEqual(0.01);
  });
});
