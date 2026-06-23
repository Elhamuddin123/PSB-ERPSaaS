export interface CustomerDeleteCheckInput {
  balanceDue: number;
  loanBalance: number;
  depositLiability: number;
  pendingTicketCount: number;
  openInvoiceCount?: number;
  openLoanCount?: number;
}

export interface CustomerDeleteCheckResult {
  canDelete: boolean;
  blockReason: string | null;
}

export function evaluateCustomerDeleteEligibility(
  input: CustomerDeleteCheckInput,
): CustomerDeleteCheckResult {
  const canDelete = input.balanceDue <= 0.01
    && input.loanBalance <= 0.01
    && input.depositLiability <= 0.01
    && input.pendingTicketCount === 0;

  const parts: string[] = [];
  if (input.balanceDue > 0.01) {
    parts.push(`outstanding ticket balance of $${input.balanceDue.toFixed(2)}`);
  }
  if (input.loanBalance > 0.01) {
    parts.push(`outstanding loan balance of $${input.loanBalance.toFixed(2)}`);
  }
  if (input.depositLiability > 0.01) {
    parts.push(`outstanding deposit liability of $${input.depositLiability.toFixed(2)} — settle or refund deposits first`);
  }
  if (input.pendingTicketCount > 0) {
    parts.push(`${input.pendingTicketCount} pending ticket(s) — approve, reject, or delete them first`);
  }

  return {
    canDelete,
    blockReason: parts.length > 0 ? `${parts.join(". ")}.` : null,
  };
}
