import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, agencyAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { hashPassword } from "./lib/password";
import { auditLog } from "./lib/audit";
import { canAddStaffWithRole, getTenantPlanUsage } from "./lib/plan-limits";
import { deleteUserAndAssociatedData } from "./lib/user-delete";
import { isBillableStaffRole } from "@contracts/plans";

/** Staff roles that an agency admin can create within their agency */
const STAFF_ROLES = ["agent", "viewer"] as const;

export const usersRouter = createRouter({
  // ─── READ-ONLY STAFF DIRECTORY (for dropdowns, no management) ──────────────
  directory: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId;
    if (!tenantId) {
      return { items: [] };
    }

    const items = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(desc(users.createdAt));

    return { items };
  }),

  // ─── LIST USERS FOR MANAGEMENT (agency admin only) ─────────────────────────
  list: agencyAdminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;

    const items = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      orderBy: [desc(users.createdAt)],
    });

    return { items };
  }),

  // ─── GET SINGLE USER (tenant-scoped) ───────────────────────────────────────
  get: agencyAdminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const item = await db.query.users.findFirst({
        where: and(eq(users.id, input.id), eq(users.tenantId, tenantId)),
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return item;
    }),

  // ─── CREATE USER (with plan limit enforcement) ─────────────────────────────
  create: agencyAdminQuery
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email().max(320),
        password: z.string().min(8).max(100),
        role: z.enum(STAFF_ROLES),
        department: z.string().max(100).optional(),
        phone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      if (!tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Platform users cannot create agency staff" });
      }

      const roleCheck = await canAddStaffWithRole(db, tenantId, input.role);
      if (!roleCheck.ok) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: roleCheck.message,
        });
      }
      const usage = roleCheck.usage;

      const existingEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingEmail.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const passwordHash = hashPassword(input.password);
      const result = await db.insert(users).values({
        unionId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        passwordHash,
        tenantId,
        name: input.name,
        email: input.email,
        role: input.role,
        status: "active",
        department: input.department || null,
        phone: input.phone || null,
      });

      const userId = Number(result[0].insertId);

      await auditLog({
        ctx,
        action: "create_user",
        entityType: "user",
        entityId: userId,
        newValues: { name: input.name, email: input.email, role: input.role },
      });

      return {
        success: true,
        userId,
        message: isBillableStaffRole(input.role)
          ? `User created successfully. ${usage.byRole[input.role].used + 1} of ${usage.byRole[input.role].limit} ${input.role} seats in use.`
          : "User created successfully.",
      };
    }),

  // ─── UPDATE USER ───────────────────────────────────────────────────────────
  update: agencyAdminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).max(255).optional(),
        email: z.string().email().max(320).optional(),
        role: z.enum(STAFF_ROLES).optional(),
        department: z.string().max(100).optional(),
        phone: z.string().max(50).optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const target = await db
        .select({ id: users.id, name: users.name, role: users.role, status: users.status, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!target[0] || target[0].tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target[0].role === "admin" || target[0].role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot modify admin users" });
      }

      const nextRole = input.role ?? target[0].role;
      const willBeActive =
        input.status === "active" || (input.status === undefined && target[0].status === "active");
      const activating = input.status === "active" && target[0].status !== "active";
      const roleChanging = input.role !== undefined && input.role !== target[0].role;

      if (willBeActive && (activating || roleChanging)) {
        const roleCheck = await canAddStaffWithRole(db, tenantId, nextRole);
        if (!roleCheck.ok) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: roleCheck.message,
          });
        }
      }

      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.email !== undefined) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, input.email), sql`${users.id} != ${input.id}`))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
        }
        update.email = input.email;
      }
      if (input.role !== undefined) update.role = input.role;
      if (input.department !== undefined) update.department = input.department;
      if (input.phone !== undefined) update.phone = input.phone;
      if (input.status !== undefined) update.status = input.status;

      if (Object.keys(update).length === 0) {
        return { success: true };
      }

      await db.update(users).set(update).where(eq(users.id, input.id));

      await auditLog({
        ctx,
        action: "update_user",
        entityType: "user",
        entityId: input.id,
        newValues: update,
      });

      return { success: true };
    }),

  // ─── DELETE USER (hard — removes user and associated personal data) ────────
  delete: agencyAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const editorId = ctx.user!.id;

      if (input.id === editorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete your own account" });
      }

      const target = await db
        .select({ id: users.id, name: users.name, role: users.role, status: users.status, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!target[0] || target[0].tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target[0].role === "admin" || target[0].role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete admin users" });
      }

      await db.transaction(async (tx) => {
        await deleteUserAndAssociatedData(tx, input.id);
      });

      await auditLog({
        ctx,
        action: "delete_user",
        entityType: "user",
        entityId: input.id,
        oldValues: { name: target[0].name, role: target[0].role, status: target[0].status },
      });

      return { success: true, message: "User deleted successfully." };
    }),

  activate: agencyAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const target = await db
        .select({ id: users.id, name: users.name, role: users.role, status: users.status, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!target[0] || target[0].tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target[0].role === "admin" || target[0].role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot change admin account status here" });
      }

      if (target[0].status === "active") {
        return { success: true, message: "User is already active." };
      }

      const roleCheck = await canAddStaffWithRole(db, tenantId, target[0].role);
      if (!roleCheck.ok) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: roleCheck.message,
        });
      }

      await db
        .update(users)
        .set({ status: "active" })
        .where(and(eq(users.id, input.id), eq(users.tenantId, tenantId)));

      await auditLog({
        ctx,
        action: "activate_user",
        entityType: "user",
        entityId: input.id,
        oldValues: { status: target[0].status },
        newValues: { status: "active" },
      });

      return { success: true, message: "User activated successfully." };
    }),

  deactivate: agencyAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const editorId = ctx.user!.id;

      if (input.id === editorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot deactivate your own account" });
      }

      const target = await db
        .select({ id: users.id, name: users.name, role: users.role, status: users.status, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!target[0] || target[0].tenantId !== tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (target[0].role === "admin" || target[0].role === "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot deactivate admin users" });
      }

      if (target[0].status === "inactive") {
        return { success: true, message: "User is already inactive." };
      }

      await db
        .update(users)
        .set({ status: "inactive" })
        .where(and(eq(users.id, input.id), eq(users.tenantId, tenantId)));

      await auditLog({
        ctx,
        action: "deactivate_user",
        entityType: "user",
        entityId: input.id,
        oldValues: { name: target[0].name, status: target[0].status },
        newValues: { status: "inactive" },
      });

      return { success: true, message: "User deactivated successfully." };
    }),

  // ─── PLAN USAGE ────────────────────────────────────────────────────────────
  planUsage: agencyAdminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;

    if (!tenantId) {
      const byRole = Object.fromEntries(
        (["agent"] as const).map((role) => [
          role,
          { used: 0, limit: 9999, remaining: 9999, canAdd: true },
        ]),
      );
      return {
        plan: "platform",
        seatsPerRole: null,
        totalLimit: null,
        totalUsed: 0,
        remaining: 9999,
        canAdd: true,
        unlimited: true,
        customSeatsPerRole: null,
        byRole,
        limit: 9999,
        used: 0,
        includesAdmin: false,
      };
    }

    return getTenantPlanUsage(db, tenantId);
  }),
});
