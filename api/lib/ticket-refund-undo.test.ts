import { describe, expect, it } from "vitest";
import { computeTicketFinancials, validateTicketRefund } from "./ticket-approval";
import { buildTicketRefundSnapshot } from "./ticket-refund-undo";

function makeTicket(overrides: Record<string, string | number> = {}) {
  return {
    totalAmount: "100.00",
    discountAmount: "10.00",
    commissionAmount: "20.00",
    paidAmount: "90.00",
    status: "confirmed",
    paymentStatus: "paid",
    ...overrides,
  } as Parameters<typeof computeTicketFinancials>[0];
}

describe("buildTicketRefundSnapshot", () => {
  it("stores prior status and customer-side refund amounts", () => {
    const ticket = makeTicket();
    const fin = computeTicketFinancials(ticket);
    const snap = buildTicketRefundSnapshot(ticket, fin, {
      refundAmount: 90,
      penaltyAmount: 0,
      totalReversal: 90,
      isFullCustomerRefund: true,
      walletCredit: 80,
    });
    expect(snap.refundAmount).toBe(90);
    expect(snap.priorStatus).toBe("confirmed");
    expect(snap.priorPaymentStatus).toBe("paid");
    expect(snap.isFullCustomerRefund).toBe(true);
  });
});

describe("validateTicketRefund vs undo scenario", () => {
  it("rejects $100 refund when customer only paid $90 after discount", () => {
    const fin = computeTicketFinancials(makeTicket());
    expect(fin.customerCharge).toBe(90);
    const bad = validateTicketRefund(fin, 100, 0);
    expect(bad.ok).toBe(false);
    const good = validateTicketRefund(fin, 90, 0);
    expect(good.ok).toBe(true);
  });
});
