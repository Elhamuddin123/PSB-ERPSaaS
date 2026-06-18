import type { TFunction } from "i18next";
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
  byRole: Record<string, RoleSeatUsage>;
  limit: number;
  used: number;
};

export function formatTotalSeatLabel(usage: PlanUsageView, t: TFunction): string {
  if (usage.unlimited) {
    return usage.customSeatsPerRole
      ? t("totalSeats", { count: usage.customSeatsPerRole * BILLABLE_STAFF_ROLES.length })
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

export function seatLimitMessage(usage: PlanUsageView, t: TFunction, role?: string): string {
  if (role && role in usage.byRole) {
    const slot = usage.byRole[role as BillableStaffRole];
    return t("seatLimit", {
      plan: `${formatPlanLabel(role)} (${slot.used}/${slot.limit})`,
      used: slot.used,
      limit: slot.limit,
    });
  }
  return t("seatLimit", {
    plan: formatPlanLabel(usage.plan),
    used: usage.used,
    limit: usage.limit,
  });
}
