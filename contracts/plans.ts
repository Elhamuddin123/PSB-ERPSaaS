export type TenantPlan = "free" | "starter" | "professional" | "enterprise";
export type PaidPlan = "starter" | "professional" | "enterprise";

/** Staff roles counted against subscription seat limits (admin is always separate). */
export const BILLABLE_STAFF_ROLES = ["manager", "accountant", "agent"] as const;
export type BillableStaffRole = (typeof BILLABLE_STAFF_ROLES)[number];

/** Seats allowed per billable role for each plan. `null` = use custom value from subscription. */
export const PLAN_SEATS_PER_ROLE: Record<TenantPlan, number | null> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: null,
};

export const PLAN_MONTHLY_PRICES: Record<PaidPlan, number> = {
  starter: 1000,
  professional: 1500,
  enterprise: 5000,
};

export const DURATION_OPTIONS = [
  { months: 1, label: "1 month", discount: 0 },
  { months: 3, label: "3 months", discount: 5 },
  { months: 6, label: "6 months", discount: 10 },
  { months: 12, label: "12 months", discount: 15 },
] as const;

export const PLATFORM_PAYMENT_CONTACT = {
  agencyName: "Pouyan Shahr Balkh Tour & Travel",
  address: "Mazar-e-Sharif, Opposite Court of Appeal",
  phone: "0711340970",
  whatsapp: "0711340970",
  email: "Pouyanshahrbalkh.travel@gmail.com",
} as const;

const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  starter: [
    "1 manager + 1 accountant + 1 agent (+ admin)",
    "Unlimited tickets",
    "Basic CRM",
    "Email support",
  ],
  professional: [
    "2 managers + 2 accountants + 2 agents (+ admin)",
    "Unlimited tickets",
    "Full CRM & leads",
    "Expense management",
    "Accounting module",
    "Priority support",
  ],
  enterprise: [
    "Custom seats per role (+ admin)",
    "Everything in Professional",
    "AI assistant",
    "Dedicated support",
    "SLA guarantee",
  ],
};

export const REGISTRATION_PLAN_OPTIONS = [
  {
    id: "starter" as const,
    label: "Starter",
    price: PLAN_MONTHLY_PRICES.starter,
    maxUsers: BILLABLE_STAFF_ROLES.length,
    seatsPerRole: PLAN_SEATS_PER_ROLE.starter!,
    features: PLAN_FEATURES.starter,
    desc: "Perfect for startups",
    highlighted: false,
    contactSales: false,
  },
  {
    id: "professional" as const,
    label: "Professional",
    price: PLAN_MONTHLY_PRICES.professional,
    maxUsers: BILLABLE_STAFF_ROLES.length * (PLAN_SEATS_PER_ROLE.professional ?? 0),
    seatsPerRole: PLAN_SEATS_PER_ROLE.professional!,
    features: PLAN_FEATURES.professional,
    desc: "For growing agencies",
    highlighted: true,
    contactSales: false,
  },
  {
    id: "enterprise" as const,
    label: "Enterprise",
    price: PLAN_MONTHLY_PRICES.enterprise,
    maxUsers: null,
    seatsPerRole: null,
    features: PLAN_FEATURES.enterprise,
    desc: "For large operations",
    highlighted: false,
    contactSales: true,
  },
] as const;

export function formatPlanPriceDisplay(plan: PaidPlan | string): string {
  const normalized = normalizePlan(plan);
  if (normalized === "enterprise" || normalized === "free") {
    return "Contact Sales";
  }
  return `${PLAN_MONTHLY_PRICES[normalized as PaidPlan].toLocaleString()} AFN / month`;
}

export const MARKETING_PLAN_OPTIONS = REGISTRATION_PLAN_OPTIONS.map((plan) => ({
  id: plan.id,
  name: plan.label,
  monthlyPrice: plan.contactSales ? null : plan.price,
  price: plan.contactSales
    ? "Contact Sales"
    : `${plan.price.toLocaleString()} AFN`,
  seatSummary:
    plan.seatsPerRole != null
      ? `${plan.seatsPerRole} seat${plan.seatsPerRole > 1 ? "s" : ""} per role · ${plan.maxUsers} staff (+ admin)`
      : "Custom seats per role (+ admin)",
  desc: plan.desc,
  maxUsers: plan.maxUsers,
  seatsPerRole: plan.seatsPerRole,
  features: plan.features,
  highlighted: plan.highlighted,
  contactSales: !!plan.contactSales,
}));

export function normalizePlan(plan: string | null | undefined): TenantPlan {
  const value = (plan ?? "free").toLowerCase().trim();
  if (value === "starter" || value === "professional" || value === "enterprise") {
    return value;
  }
  return "free";
}

export function isEnterprisePlan(plan: string): boolean {
  return normalizePlan(plan) === "enterprise";
}

export function isBillableStaffRole(role: string): role is BillableStaffRole {
  return (BILLABLE_STAFF_ROLES as readonly string[]).includes(role);
}

/** Resolved seats per role. Enterprise uses custom DB value or unlimited when unset. */
export function getPlanSeatsPerRole(
  plan: string,
  customSeatsPerRole?: number | null,
): number {
  const normalized = normalizePlan(plan);
  if (normalized === "enterprise") {
    return customSeatsPerRole && customSeatsPerRole > 0 ? customSeatsPerRole : 9999;
  }
  return PLAN_SEATS_PER_ROLE[normalized] ?? 0;
}

export function getPlanTotalStaffLimit(
  plan: string,
  customSeatsPerRole?: number | null,
): number {
  const perRole = getPlanSeatsPerRole(plan, customSeatsPerRole);
  if (perRole >= 9999) return 9999;
  return perRole * BILLABLE_STAFF_ROLES.length;
}

export function isUnlimitedPlan(plan: string, customSeatsPerRole?: number | null): boolean {
  return getPlanSeatsPerRole(plan, customSeatsPerRole) >= 9999;
}

export function getDurationDiscount(months: number): number {
  return DURATION_OPTIONS.find((d) => d.months === months)?.discount ?? 0;
}

export function calculateSubscriptionTotal(plan: PaidPlan, durationMonths: number) {
  if (plan === "enterprise") {
    return {
      monthlyPrice: null,
      durationMonths,
      discountPercent: 0,
      subtotal: null,
      discountAmount: null,
      totalAmount: null,
      currency: "AFN" as const,
      contactSales: true as const,
    };
  }

  const monthlyPrice = PLAN_MONTHLY_PRICES[plan];
  const discountPercent = getDurationDiscount(durationMonths);
  const subtotal = monthlyPrice * durationMonths;
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAmount = subtotal - discountAmount;

  return {
    monthlyPrice,
    durationMonths,
    discountPercent,
    subtotal,
    discountAmount,
    totalAmount,
    currency: "AFN" as const,
    contactSales: false as const,
  };
}

/** @deprecated Use getPlanTotalStaffLimit */
export function getPlanUserLimit(plan: string, customSeatsPerRole?: number | null): number {
  return getPlanTotalStaffLimit(plan, customSeatsPerRole);
}

export function formatPlanUserLimit(plan: string, customSeatsPerRole?: number | null): string {
  if (isUnlimitedPlan(plan, customSeatsPerRole)) return "Custom";
  const perRole = getPlanSeatsPerRole(plan, customSeatsPerRole);
  const total = getPlanTotalStaffLimit(plan, customSeatsPerRole);
  if (perRole === 0) return "Admin only";
  return `${total} (${perRole} per role)`;
}

export function formatPlanSeatSummary(plan: string, customSeatsPerRole?: number | null): string {
  if (isUnlimitedPlan(plan, customSeatsPerRole)) {
    return customSeatsPerRole
      ? `${customSeatsPerRole} per role (custom)`
      : "Custom seats per role";
  }
  const perRole = getPlanSeatsPerRole(plan, customSeatsPerRole);
  return BILLABLE_STAFF_ROLES.map((role) => `${perRole} ${role}`).join(", ");
}

export function formatPlanLabel(plan: string): string {
  const match = REGISTRATION_PLAN_OPTIONS.find((p) => p.id === normalizePlan(plan));
  return match?.label ?? plan;
}
