import {
  BILLABLE_STAFF_ROLES,
  type BillableStaffRole,
  getPlanSeatsPerRole,
  getPlanTotalStaffLimit,
  isBillableStaffRole,
  isUnlimitedPlan,
  normalizePlan,
} from "@contracts/plans";
import { subscriptions, tenants, users } from "@db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "../queries/connection";

export async function resolveTenantPlan(db: DbOrTx, tenantId: number) {
  const subRows = await db
    .select({
      plan: subscriptions.plan,
      customSeatsPerRole: subscriptions.customSeatsPerRole,
    })
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  const tenantRows = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const plan = normalizePlan(subRows[0]?.plan ?? tenantRows[0]?.plan ?? "free");
  const customSeatsPerRole = subRows[0]?.customSeatsPerRole ?? null;

  return { plan, customSeatsPerRole };
}

async function countActiveStaffByRole(db: DbOrTx, tenantId: number) {
  const rows = await db
    .select({
      role: users.role,
      count: sql<number>`count(*)`,
    })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.status, "active"),
        ne(users.role, "admin"),
        ne(users.role, "super_admin"),
      ),
    )
    .groupBy(users.role);

  const byRole = Object.fromEntries(
    BILLABLE_STAFF_ROLES.map((role) => [role, 0]),
  ) as Record<BillableStaffRole, number>;

  for (const row of rows) {
    if (isBillableStaffRole(row.role)) {
      byRole[row.role] = Number(row.count);
    }
  }

  const totalUsed = Object.values(byRole).reduce((sum, count) => sum + count, 0);
  return { byRole, totalUsed };
}

export async function getTenantPlanUsage(db: DbOrTx, tenantId: number) {
  const { plan, customSeatsPerRole } = await resolveTenantPlan(db, tenantId);
  const seatsPerRole = getPlanSeatsPerRole(plan, customSeatsPerRole);
  const unlimited = isUnlimitedPlan(plan, customSeatsPerRole);
  const totalLimit = getPlanTotalStaffLimit(plan, customSeatsPerRole);
  const { byRole, totalUsed } = await countActiveStaffByRole(db, tenantId);

  const roleUsage = Object.fromEntries(
    BILLABLE_STAFF_ROLES.map((role) => {
      const used = byRole[role];
      const limit = unlimited ? 9999 : seatsPerRole;
      const remaining = unlimited ? 9999 : Math.max(0, limit - used);
      return [
        role,
        {
          used,
          limit,
          remaining,
          canAdd: unlimited || used < limit,
        },
      ];
    }),
  ) as Record<
    BillableStaffRole,
    { used: number; limit: number; remaining: number; canAdd: boolean }
  >;

  const remaining = unlimited ? 9999 : Math.max(0, totalLimit - totalUsed);

  return {
    plan,
    seatsPerRole: unlimited ? null : seatsPerRole,
    totalLimit: unlimited ? null : totalLimit,
    totalUsed,
    remaining,
    canAdd: unlimited || totalUsed < totalLimit,
    unlimited,
    customSeatsPerRole,
    byRole: roleUsage,
    limit: unlimited ? 9999 : totalLimit,
    used: totalUsed,
    includesAdmin: false,
  };
}

export async function canAddStaffWithRole(
  db: DbOrTx,
  tenantId: number,
  role: string,
  options?: { excludeUserId?: number },
) {
  const usage = await getTenantPlanUsage(db, tenantId);

  if (role === "viewer") {
    if (usage.plan === "starter" || usage.plan === "professional") {
      return {
        ok: false as const,
        message: "Viewer accounts are only available on the Enterprise plan.",
        usage,
      };
    }
    return { ok: true as const, usage };
  }

  if (!isBillableStaffRole(role)) {
    return { ok: false as const, message: "Invalid staff role.", usage };
  }

  let used = usage.byRole[role].used;
  if (options?.excludeUserId) {
    const existing = await db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(and(eq(users.id, options.excludeUserId), eq(users.tenantId, tenantId)))
      .limit(1);
    if (
      existing[0]?.status === "active" &&
      existing[0].role === role
    ) {
      used = Math.max(0, used - 1);
    }
  }

  const limit = usage.byRole[role].limit;
  if (!usage.unlimited && used >= limit) {
    const perRoleLabel = usage.seatsPerRole ?? usage.customSeatsPerRole ?? "custom";
    return {
      ok: false as const,
      message: `${role} seat limit reached (${used}/${limit}). Your ${usage.plan} plan allows ${perRoleLabel} per role.`,
      usage,
    };
  }

  return { ok: true as const, usage };
}

export async function assertCanAddTenantUser(
  db: DbOrTx,
  tenantId: number,
  role: string,
  options?: { excludeUserId?: number },
): Promise<void> {
  const check = await canAddStaffWithRole(db, tenantId, role, options);
  if (!check.ok) {
    throw new Error(check.message);
  }
}
