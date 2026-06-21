import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, superAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tenants, subscriptions } from "@db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { auditLog } from "./lib/audit";
import { bootstrapTenant } from "./lib/bootstrap";
import { resetTenantData } from "./lib/reset-tenant-data";
import {
  computeNewExpiresAt,
  computeSubscriptionBilling,
} from "./lib/subscription-billing";

const monthsInput = z.number().int().min(1).max(36).default(1);

function mapRegistrationRow(
  row: {
    tenant: typeof tenants.$inferSelect;
    subscription: {
      status: typeof subscriptions.$inferSelect.status | null;
      expiresAt: Date | null;
      startsAt: Date | null;
      durationMonths: number | null;
    } | null;
  },
) {
  const t = row.tenant;
  const sub = row.subscription;
  const billing = computeSubscriptionBilling(
    sub?.expiresAt,
    t.status,
    sub?.status ?? undefined,
  );

  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    plan: t.plan,
    ownerName: t.ownerName,
    ownerEmail: t.ownerEmail,
    ownerPhone: t.ownerPhone,
    address: t.address,
    city: t.city,
    registrationToken: t.registrationToken,
    createdAt: t.createdAt,
    subscriptionStatus: sub?.status ?? null,
    subscriptionStartsAt: sub?.startsAt ?? null,
    subscriptionExpiresAt: sub?.expiresAt ?? null,
    subscriptionDurationMonths: sub?.durationMonths ?? null,
    billing,
  };
}

export const adminRouter = createRouter({
  // ─── PENDING REGISTRATIONS ─────────────────────────────────────────────────
  pendingRegistrations: superAdminQuery.query(async () => {
    const db = getDb();
    const items = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        plan: tenants.plan,
        ownerName: tenants.ownerName,
        ownerEmail: tenants.ownerEmail,
        ownerPhone: tenants.ownerPhone,
        address: tenants.address,
        city: tenants.city,
        registrationToken: tenants.registrationToken,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.status, "pending"))
      .orderBy(desc(tenants.createdAt));

    return { items };
  }),

  // ─── ALL REGISTRATIONS (with filters) ──────────────────────────────────────
  registrations: superAdminQuery
    .input(
      z.object({
        status: z.enum(["pending", "active", "rejected", "suspended", "all"]).default("all"),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions: any[] = [];
      if (input?.status && input.status !== "all") {
        conditions.push(eq(tenants.status, input.status));
      }
      if (input?.search) {
        conditions.push(
          sql`(${tenants.name} LIKE ${`%${input.search}%`} OR ${tenants.ownerEmail} LIKE ${`%${input.search}%`} OR ${tenants.registrationToken} LIKE ${`%${input.search}%`})`
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          tenant: tenants,
          subscription: {
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
            startsAt: subscriptions.startsAt,
            durationMonths: subscriptions.durationMonths,
          },
        })
        .from(tenants)
        .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
        .where(where)
        .orderBy(desc(tenants.createdAt))
        .limit(input?.limit ?? 20)
        .offset(((input?.page ?? 1) - 1) * (input?.limit ?? 20));

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenants)
        .where(where);

      const items = rows.map((row) =>
        mapRegistrationRow({
          tenant: row.tenant,
          subscription: row.subscription?.status != null
            ? {
                status: row.subscription.status,
                expiresAt: row.subscription.expiresAt,
                startsAt: row.subscription.startsAt,
                durationMonths: row.subscription.durationMonths,
              }
            : null,
        }),
      );

      return { items, total: countResult[0]?.count ?? 0 };
    }),

  // ─── APPROVE REGISTRATION ──────────────────────────────────────────────────
  approveRegistration: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        notes: z.string().optional(),
        months: monthsInput.optional(),
        customSeatsPerRole: z.number().int().min(1).max(999).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db
        .select({ id: tenants.id, status: tenants.status, registrationToken: tenants.registrationToken })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }
      if (tenant[0].status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Tenant is already ${tenant[0].status}` });
      }

      const now = new Date();
      const sub = await db
        .select({
          durationMonths: subscriptions.durationMonths,
          plan: subscriptions.plan,
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      const durationMonths = input.months ?? sub[0]?.durationMonths ?? 1;
      const plan = sub[0]?.plan ?? "starter";
      const expiresAt = computeNewExpiresAt(null, durationMonths, now);

      const subscriptionUpdate: Record<string, unknown> = {
        status: "active",
        startsAt: now,
        expiresAt,
        durationMonths,
        approvedBy: ctx.user!.id,
        approvedAt: now,
      };
      if (plan === "enterprise" && input.customSeatsPerRole) {
        subscriptionUpdate.customSeatsPerRole = input.customSeatsPerRole;
      }

      await db.transaction(async (tx) => {
        await tx
          .update(tenants)
          .set({ status: "active", plan })
          .where(eq(tenants.id, input.tenantId));
        await tx
          .update(subscriptions)
          .set(subscriptionUpdate)
          .where(eq(subscriptions.tenantId, input.tenantId));
        await bootstrapTenant(tx, input.tenantId, ctx.user!.id);
      });

      await auditLog({
        ctx,
        action: "approve_registration",
        entityType: "tenant",
        entityId: input.tenantId,
        newValues: { status: "active", expiresAt: expiresAt.toISOString(), months: durationMonths },
      });

      return { success: true, expiresAt: expiresAt.toISOString() };
    }),

  // ─── REJECT REGISTRATION ───────────────────────────────────────────────────
  rejectRegistration: superAdminQuery
    .input(z.object({ tenantId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db
        .select({ id: tenants.id, status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      await db.transaction(async (tx) => {
        await tx.update(tenants).set({ status: "rejected" }).where(eq(tenants.id, input.tenantId));
        await tx
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(eq(subscriptions.tenantId, input.tenantId));
      });

      await auditLog({
        ctx,
        action: "reject_registration",
        entityType: "tenant",
        entityId: input.tenantId,
        newValues: { status: "rejected", reason: input.reason },
      });

      return { success: true };
    }),

  // ─── ACTIVATE SUBSCRIPTION (manual payment approval) ───────────────────────
  activateSubscription: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        months: monthsInput.optional(),
        customSeatsPerRole: z.number().int().min(1).max(999).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const sub = await db
        .select({
          id: subscriptions.id,
          durationMonths: subscriptions.durationMonths,
          status: subscriptions.status,
          plan: subscriptions.plan,
          expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!sub[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      const now = new Date();
      const durationMonths = input.months ?? sub[0].durationMonths ?? 1;
      const expiresAt = computeNewExpiresAt(sub[0].expiresAt, durationMonths, now);

      const subscriptionUpdate: Record<string, unknown> = {
        status: "active",
        startsAt: now,
        expiresAt,
        durationMonths,
        approvedBy: ctx.user!.id,
        approvedAt: now,
      };
      if (sub[0].plan === "enterprise" && input.customSeatsPerRole) {
        subscriptionUpdate.customSeatsPerRole = input.customSeatsPerRole;
      }

      await db.transaction(async (tx) => {
        await tx
          .update(tenants)
          .set({ status: "active", plan: sub[0].plan })
          .where(eq(tenants.id, input.tenantId));
        await tx
          .update(subscriptions)
          .set(subscriptionUpdate)
          .where(eq(subscriptions.tenantId, input.tenantId));
        await bootstrapTenant(tx, input.tenantId, ctx.user!.id);
      });

      await auditLog({
        ctx,
        action: "activate_subscription",
        entityType: "subscription",
        entityId: sub[0].id,
        newValues: {
          status: "active",
          expiresAt: expiresAt.toISOString(),
          months: durationMonths,
          customSeatsPerRole: input.customSeatsPerRole ?? null,
        },
      });

      return { success: true, expiresAt: expiresAt.toISOString() };
    }),

  extendSubscription: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        months: monthsInput,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, input.tenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      if (tenant.status === "pending" || tenant.status === "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot extend subscription for pending or rejected agencies",
        });
      }

      const sub = await db
        .select({
          id: subscriptions.id,
          expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!sub[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      const now = new Date();
      const expiresAt = computeNewExpiresAt(sub[0].expiresAt, input.months, now);

      await db
        .update(subscriptions)
        .set({
          status: "active",
          expiresAt,
          durationMonths: input.months,
          approvedBy: ctx.user!.id,
          approvedAt: now,
        })
        .where(eq(subscriptions.tenantId, input.tenantId));

      if (tenant.status === "suspended") {
        await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, input.tenantId));
      }

      await auditLog({
        ctx,
        action: "extend_subscription",
        entityType: "subscription",
        entityId: sub[0].id,
        newValues: {
          expiresAt: expiresAt.toISOString(),
          months: input.months,
        },
      });

      return { success: true, expiresAt: expiresAt.toISOString() };
    }),

  setSubscriptionSeats: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        customSeatsPerRole: z.number().int().min(1).max(999),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const sub = await db
        .select({ id: subscriptions.id, plan: subscriptions.plan })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!sub[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }
      if (sub[0].plan !== "enterprise") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom seat limits apply only to Enterprise subscriptions",
        });
      }

      await db
        .update(subscriptions)
        .set({ customSeatsPerRole: input.customSeatsPerRole })
        .where(eq(subscriptions.tenantId, input.tenantId));

      await auditLog({
        ctx,
        action: "set_subscription_seats",
        entityType: "subscription",
        entityId: sub[0].id,
        newValues: { customSeatsPerRole: input.customSeatsPerRole },
      });

      return { success: true, customSeatsPerRole: input.customSeatsPerRole };
    }),

  // ─── RESET AGENCY DATA (super admin only) ───────────────────────────────────
  resetAgencyData: superAdminQuery
    .input(z.object({
      tenantId: z.number(),
      confirmName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, input.tenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      if (tenant.name.trim() !== input.confirmName.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation name does not match the agency name",
        });
      }
      if (tenant.status === "pending" || tenant.status === "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reset data for agencies that are pending or rejected",
        });
      }

      const result = await db.transaction(async (tx) =>
        resetTenantData(tx, input.tenantId, ctx.user!.id),
      );

      await auditLog({
        ctx,
        action: "reset_agency_data",
        entityType: "tenant",
        entityId: input.tenantId,
        oldValues: { tenantName: tenant.name },
        newValues: { reset: true, bootstrapped: true },
      });

      return { success: true, ...result };
    }),

  cancelAgency: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        confirmName: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, input.tenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      if (tenant.name.trim() !== input.confirmName.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation name does not match the agency name",
        });
      }
      if (tenant.status === "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use reject for pending registrations",
        });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(tenants)
          .set({ status: "cancelled" })
          .where(eq(tenants.id, input.tenantId));
        await tx
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(eq(subscriptions.tenantId, input.tenantId));
      });

      await auditLog({
        ctx,
        action: "cancel_agency",
        entityType: "tenant",
        entityId: input.tenantId,
        oldValues: { status: tenant.status },
        newValues: { status: "cancelled" },
      });

      return { success: true };
    }),

  suspendAgency: superAdminQuery
    .input(z.object({ tenantId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, input.tenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      if (tenant.status === "pending" || tenant.status === "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot suspend agencies that are pending or rejected",
        });
      }

      await db.update(tenants).set({ status: "suspended" }).where(eq(tenants.id, input.tenantId));

      await auditLog({
        ctx,
        action: "suspend_agency",
        entityType: "tenant",
        entityId: input.tenantId,
        oldValues: { status: tenant.status },
        newValues: { status: "suspended", reason: input.reason },
      });

      return { success: true };
    }),

  reactivateAgency: superAdminQuery
    .input(
      z.object({
        tenantId: z.number(),
        months: monthsInput.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, input.tenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      if (tenant.status !== "suspended") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agency is not suspended" });
      }

      const sub = await db
        .select({
          id: subscriptions.id,
          expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      const months = input.months ?? 1;
      const now = new Date();
      const expiresAt = computeNewExpiresAt(sub[0]?.expiresAt, months, now);

      await db.transaction(async (tx) => {
        await tx.update(tenants).set({ status: "active" }).where(eq(tenants.id, input.tenantId));
        if (sub[0]) {
          await tx
            .update(subscriptions)
            .set({
              status: "active",
              expiresAt,
              durationMonths: months,
              approvedBy: ctx.user!.id,
              approvedAt: now,
            })
            .where(eq(subscriptions.tenantId, input.tenantId));
        }
      });

      await auditLog({
        ctx,
        action: "reactivate_agency",
        entityType: "tenant",
        entityId: input.tenantId,
        oldValues: { status: tenant.status },
        newValues: { status: "active", expiresAt: expiresAt.toISOString(), months },
      });

      return { success: true, expiresAt: expiresAt.toISOString() };
    }),

  // ─── DASHBOARD STATS ───────────────────────────────────────────────────────
  stats: superAdminQuery.query(async () => {
    const db = getDb();
    const pendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.status, "pending"));

    const activeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(eq(tenants.status, "active"));

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants);

    const stats = {
      pending: pendingCount[0]?.count ?? 0,
      active: activeCount[0]?.count ?? 0,
      total: totalCount[0]?.count ?? 0,
    };

    console.log("[admin stats]", stats);
    return stats;
  }),
});
