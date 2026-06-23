import { describe, expect, it } from "vitest";
import { evaluateCustomerDeleteEligibility } from "./customer-delete-check";

describe("evaluateCustomerDeleteEligibility", () => {
  it("allows delete when all balances are settled and no pending tickets", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 0,
      loanBalance: 0,
      depositLiability: 0,
      pendingTicketCount: 0,
    });
    expect(result.canDelete).toBe(true);
    expect(result.blockReason).toBeNull();
  });

  it("blocks delete when ticket AR balance remains", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 150.5,
      loanBalance: 0,
      depositLiability: 0,
      pendingTicketCount: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.blockReason).toContain("outstanding ticket balance");
  });

  it("blocks delete when loan balance remains", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 0,
      loanBalance: 200,
      depositLiability: 0,
      pendingTicketCount: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.blockReason).toContain("outstanding loan balance");
  });

  it("blocks delete when deposit liability remains", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 0,
      loanBalance: 0,
      depositLiability: 300,
      pendingTicketCount: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.blockReason).toContain("deposit liability");
  });

  it("blocks delete when pending tickets exist", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 0,
      loanBalance: 0,
      depositLiability: 0,
      pendingTicketCount: 2,
    });
    expect(result.canDelete).toBe(false);
    expect(result.blockReason).toContain("2 pending ticket(s)");
  });

  it("combines multiple blockers in blockReason", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 50,
      loanBalance: 25,
      depositLiability: 10,
      pendingTicketCount: 1,
    });
    expect(result.canDelete).toBe(false);
    expect(result.blockReason).toContain("ticket balance");
    expect(result.blockReason).toContain("loan balance");
    expect(result.blockReason).toContain("deposit liability");
    expect(result.blockReason).toContain("pending ticket");
  });

  it("treats sub-cent balances as settled", () => {
    const result = evaluateCustomerDeleteEligibility({
      balanceDue: 0.005,
      loanBalance: 0.009,
      depositLiability: 0.004,
      pendingTicketCount: 0,
    });
    expect(result.canDelete).toBe(true);
  });
});
