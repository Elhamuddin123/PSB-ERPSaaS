import { ErrorMessages } from "@contracts/constants";
import {
  OPERATIONAL_ROLES,
  ROLES,
  SUPERVISORY_ROLES,
  hasAnyRole,
} from "@contracts/roles";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import { tenants, subscriptions } from "@db/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    try {
      console.error("tRPC error:", {
        message: error.message,
        code: (error as any).code,
        path: (error as any).path,
        stack: error.stack,
        cause: (error as any).cause ?? null,
      });
    } catch (e) {
      console.error("Failed to log tRPC error:", e);
    }
    return shape;
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const ALLOWED_FOR_PENDING = new Set([
  "auth.me",
  "auth.logout",
  "auth.updateProfile",
  "settings.get",
  "settings.list",
  "registration.verifyToken",
  "registration.register",
]);

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  const path = (opts.path || "").toString();

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  if (ctx.user.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account is inactive or suspended. Contact your agency admin.",
    });
  }

  // Check tenant status (only block serious states) and subscription expiry/status
  if (ctx.user.tenantId) {
    const db = getDb();
    const tenant = await db
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, ctx.user.tenantId))
      .limit(1);

    if (tenant[0]) {
      const status = tenant[0].status;
      if (status === "rejected") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account registration was rejected. Please contact support." });
      }
      if (status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account suspended. Please contact support." });
      }
      if (status === "cancelled") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account cancelled. Please contact support." });
      }

      const sub = await db
        .select({ id: subscriptions.id, status: subscriptions.status, expiresAt: subscriptions.expiresAt })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.user.tenantId))
        .limit(1);

      if (!sub[0] && ctx.user.role !== ROLES.SUPER_ADMIN && !ALLOWED_FOR_PENDING.has(path)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No subscription found for this agency. Please contact support.",
        });
      }

      if (sub[0]) {
        if (sub[0].status === "cancelled") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Subscription cancelled. Please contact support to register again." });
        }

        const subscriptionAllowsAccess =
          sub[0].status === "active" || sub[0].status === "expired";

        if (!subscriptionAllowsAccess && ctx.user.role !== ROLES.SUPER_ADMIN && !ALLOWED_FOR_PENDING.has(path)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Subscription not active. Complete payment verification at the office or via the Payment Activation page." });
        }
      }
    }
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

function requireAnyRole(...roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!hasAnyRole(ctx.user?.role, roles)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);

/** Agency staff management — agency admin only (not super admin). */
const requireAgencyAdmin = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.role !== ROLES.AGENCY_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only agency admins can manage staff users.",
    });
  }

  if (!ctx.user.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform users cannot manage agency staff.",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const agencyAdminQuery = authedQuery.use(requireAgencyAdmin);

/** Audit logs and session monitoring — agency admin (tenant) or super admin (platform). */
const requireSecurityAuditAccess = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!hasAnyRole(ctx.user?.role, [ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN])) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only agency admins and super admins can view audit logs and sessions.",
    });
  }

  if (ctx.user?.role === ROLES.AGENCY_ADMIN && !ctx.user.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Agency context required.",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const securityAuditQuery = authedQuery.use(requireSecurityAuditAccess);
export const superAdminQuery = authedQuery.use(requireRole(ROLES.SUPER_ADMIN));
export const supervisoryQuery = authedQuery.use(requireAnyRole(...SUPERVISORY_ROLES));
export const agentQuery = authedQuery.use(requireAnyRole(...OPERATIONAL_ROLES));
