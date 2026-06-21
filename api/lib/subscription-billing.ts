export type BillingStatus = "inactive" | "paid" | "due" | "overdue";

export interface SubscriptionBillingInfo {
  paidUntil: string | null;
  nextPaymentDue: string | null;
  billingStatus: BillingStatus;
  isOverdue: boolean;
  isDue: boolean;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Legacy rows may still have status expired; billing uses expiresAt only. */
function normalizeSubscriptionStatus(
  subscriptionStatus: string | null | undefined,
  expiresAt: Date | string | null | undefined,
): string | null | undefined {
  if (subscriptionStatus === "expired" && expiresAt) {
    return "active";
  }
  return subscriptionStatus ?? undefined;
}

/** Monthly billing: expiresAt is paid-through date (paidUntil). Dates compared in UTC. */
export function computeSubscriptionBilling(
  expiresAt: Date | string | null | undefined,
  tenantStatus: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): SubscriptionBillingInfo {
  const normalizedStatus = normalizeSubscriptionStatus(subscriptionStatus, expiresAt);

  if (
    !expiresAt ||
    tenantStatus === "pending" ||
    tenantStatus === "rejected" ||
    tenantStatus === "cancelled" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "cancelled"
  ) {
    return {
      paidUntil: expiresAt ? new Date(expiresAt).toISOString() : null,
      nextPaymentDue: null,
      billingStatus: "inactive",
      isOverdue: false,
      isDue: false,
    };
  }

  const paidUntilDate = new Date(expiresAt);
  const paidUntilDay = startOfUtcDay(paidUntilDate);
  const now = startOfUtcDay(new Date());

  const nextPaymentDueDate = new Date(paidUntilDay);
  nextPaymentDueDate.setDate(nextPaymentDueDate.getDate() + 1);

  const paidUntilMonth = paidUntilDay.getUTCFullYear() * 12 + paidUntilDay.getUTCMonth();
  const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();

  const isOverdue = nowMonth > paidUntilMonth;
  const isDue = !isOverdue && now > paidUntilDay;

  let billingStatus: BillingStatus = "paid";
  if (isOverdue) billingStatus = "overdue";
  else if (isDue) billingStatus = "due";

  return {
    paidUntil: paidUntilDate.toISOString(),
    nextPaymentDue: nextPaymentDueDate.toISOString(),
    billingStatus,
    isOverdue,
    isDue,
  };
}

export function addMonths(base: Date, months: number): Date {
  const result = new Date(base);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) {
    result.setDate(0);
  }
  return result;
}

/** Extend paid-through date by N months from current expiry or today. */
export function computeNewExpiresAt(
  currentExpiresAt: Date | string | null | undefined,
  months: number,
  fromDate: Date = new Date(),
): Date {
  const base =
    currentExpiresAt && new Date(currentExpiresAt) > fromDate
      ? new Date(currentExpiresAt)
      : fromDate;
  return addMonths(base, months);
}
