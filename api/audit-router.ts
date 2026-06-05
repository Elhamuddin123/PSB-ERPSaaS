import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, securityAuditQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs, users, roles, sessions, tenants } from "@db/schema";
import { desc, sql, and, eq, gt, isNull } from "drizzle-orm";
import { getSecurityTenantScope } from "./lib/security-scope";
import { ROLES } from "@contracts/roles";

function buildAuditConditions(
  tenantScope: number | null,
  filters?: { entityType?: string; action?: string; tenantId?: number },
) {
  const conditions = [isNull(auditLogs.deletedAt)];

  if (filters?.tenantId != null) {
    conditions.push(eq(auditLogs.tenantId, filters.tenantId));
  } else if (tenantScope != null) {
    conditions.push(eq(auditLogs.tenantId, tenantScope));
  }

  if (filters?.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export const auditRouter = createRouter({
  logs: securityAuditQuery
    .input(
      z
        .object({
          entityType: z.string().optional(),
          action: z.string().optional(),
          tenantId: z.number().optional(),
          page: z.number().default(1),
          limit: z.number().default(50),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantScope = getSecurityTenantScope(ctx);

      if (input?.tenantId != null && ctx.user!.role !== ROLES.SUPER_ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can filter audit logs by tenant.",
        });
      }

      const where = buildAuditConditions(tenantScope, input);
      const limit = input?.limit ?? 50;
      const page = input?.page ?? 1;

      const items = await db
        .select({
          id: auditLogs.id,
          tenantId: auditLogs.tenantId,
          userId: auditLogs.userId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValues: auditLogs.oldValues,
          newValues: auditLogs.newValues,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          userName: users.name,
          userEmail: users.email,
          tenantName: tenants.name,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(where);

      return {
        items: items.map((row) => ({
          id: row.id,
          tenantId: row.tenantId,
          userId: row.userId,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          oldValues: row.oldValues,
          newValues: row.newValues,
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          metadata: row.metadata,
          createdAt: row.createdAt,
          user: row.userName || row.userEmail
            ? { name: row.userName, email: row.userEmail }
            : null,
          tenant: row.tenantName ? { name: row.tenantName } : null,
        })),
        total: countResult[0]?.count ?? 0,
      };
    }),

  listSessions: securityAuditQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantScope = getSecurityTenantScope(ctx);
    const now = new Date();

    const conditions = [gt(sessions.expiresAt, now)];
    if (tenantScope != null) {
      conditions.push(eq(users.tenantId, tenantScope));
    }

    const rows = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        tenantId: users.tenantId,
        tenantName: tenants.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(and(...conditions))
      .orderBy(desc(sessions.createdAt));

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        user: {
          name: row.userName,
          email: row.userEmail,
          role: row.userRole,
        },
        tenant: row.tenantName ? { id: row.tenantId, name: row.tenantName } : null,
      })),
    };
  }),

  createLog: authedQuery
    .input(
      z.object({
        action: z.string().min(1),
        entityType: z.string().min(1),
        entityId: z.string().optional(),
        oldValues: z.record(z.string(), z.unknown()).optional(),
        newValues: z.record(z.string(), z.unknown()).optional(),
        ipAddress: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(auditLogs).values({
        tenantId: ctx.user!.tenantId ?? null,
        userId: ctx.user!.id,
        ...input,
      });
      return { success: true };
    }),

  users: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantScope = getSecurityTenantScope(ctx);

    if (tenantScope == null) {
      return db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        limit: 200,
      });
    }

    return db.query.users.findMany({
      where: eq(users.tenantId, tenantScope),
      orderBy: [desc(users.createdAt)],
    });
  }),

  roles: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantScope = getSecurityTenantScope(ctx);

    if (tenantScope == null) {
      return db.query.roles.findMany({
        orderBy: [roles.name],
        limit: 200,
      });
    }

    return db.query.roles.findMany({
      where: eq(roles.tenantId, tenantScope),
      orderBy: [roles.name],
    });
  }),

  stats: securityAuditQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantScope = getSecurityTenantScope(ctx);
    const where = buildAuditConditions(tenantScope);

    const actionCounts = await db
      .select({ action: auditLogs.action, count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(where)
      .groupBy(auditLogs.action);

    const entityCounts = await db
      .select({ entityType: auditLogs.entityType, count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(where)
      .groupBy(auditLogs.entityType);

    return { actionCounts, entityCounts };
  }),
});
