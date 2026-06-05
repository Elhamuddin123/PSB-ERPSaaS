import {
  BILLABLE_STAFF_ROLES,
  type BillableStaffRole,
  formatPlanLabel,
} from "@contracts/plans";

export type RoleSeatUsage = {
  used: number;
  limit: number;
  remaining: number;
  canAdd: boolean;
};

export type PlanUsageView = {
  plan: string;
  seatsPerRole: number | null;
  totalLimit: number | null;
  totalUsed: number;
  remaining: number;
  canAdd: boolean;
  unlimited: boolean;
  customSeatsPerRole: number | null;
  byRole: Record<BillableStaffRole, RoleSeatUsage>;
  limit: number;
  used: number;
};

export function formatTotalSeatLabel(usage: PlanUsageView): string {
  if (usage.unlimited) {
    return usage.customSeatsPerRole
      ? `${usage.totalUsed} / ${usage.customSeatsPerRole * BILLABLE_STAFF_ROLES.length} staff`
      : `${usage.totalUsed} staff (custom plan)`;
  }
  return `${usage.totalUsed} / ${usage.limit} staff`;
}

export function formatRoleSeatBreakdown(usage: PlanUsageView): string {
  return BILLABLE_STAFF_ROLES.map((role) => {
    const slot = usage.byRole[role];
    return `${formatPlanLabel(role)} ${slot.used}/${slot.limit}`;
  }).join(" · ");
}

export function canAddUserWithRole(usage: PlanUsageView | null | undefined, role: string): boolean {
  if (!usage) return true;
  if (role === "viewer") return usage.plan === "enterprise";
  if (role in usage.byRole) {
    return usage.byRole[role as BillableStaffRole].canAdd;
  }
  return usage.canAdd;
}

export function seatLimitMessage(usage: PlanUsageView, role?: string): string {
  if (role && role in usage.byRole) {
    const slot = usage.byRole[role as BillableStaffRole];
    return `${formatPlanLabel(role)} seat limit reached (${slot.used}/${slot.limit}) on your ${formatPlanLabel(usage.plan)} plan.`;
  }
  return `Staff user limit reached for your ${formatPlanLabel(usage.plan)} plan (${usage.used}/${usage.limit}). Upgrade your plan to add more users.`;
}
