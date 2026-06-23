/** Customer-facing ticket amounts (matches server computeTicketFinancials). */
export function getTicketCustomerCharge(ticket: {
  totalAmount: string | number;
  discountAmount?: string | number | null;
}) {
  return Math.max(0, Number(ticket.totalAmount) - Number(ticket.discountAmount ?? 0));
}

export function getTicketRefundDefaults(ticket: {
  totalAmount: string | number;
  discountAmount?: string | number | null;
  paidAmount?: string | number | null;
}) {
  const customerCharge = getTicketCustomerCharge(ticket);
  const paidAmount = Number(ticket.paidAmount ?? 0);
  const defaultRefund = paidAmount > 0 ? paidAmount : customerCharge;
  return { customerCharge, paidAmount, defaultRefund };
}
