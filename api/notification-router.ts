import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications } from "@db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import type { TrpcContext } from "./context";

function getUserNotificationScope(ctx: TrpcContext) {
  const userId = ctx.user!.id;
  const tenantId = ctx.user!.tenantId;

  if (tenantId != null) {
    return and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId));
  }

  return eq(notifications.userId, userId);
}

export const notificationRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          status: z.enum(["read", "unread", "all"]).default("all"),
          category: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const scope = getUserNotificationScope(ctx);
      const conditions = [scope];

      if (input?.status === "unread") conditions.push(eq(notifications.isRead, false));
      if (input?.status === "read") conditions.push(eq(notifications.isRead, true));
      if (input?.category) {
        conditions.push(
          eq(
            notifications.category,
            input.category as "ticket" | "wallet" | "expense" | "accounting" | "crm" | "system" | "security",
          ),
        );
      }

      const where = conditions.length === 1 ? conditions[0] : and(...conditions);
      const limit = input?.limit ?? 20;
      const page = input?.page ?? 1;

      const items = await db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(where);

      return { items, total: countResult[0]?.count ?? 0 };
    }),

  unread: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(notifications)
      .where(and(getUserNotificationScope(ctx), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(10);
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const target = await db.query.notifications.findFirst({
        where: and(eq(notifications.id, input.id), getUserNotificationScope(ctx)),
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      if (target.isRead) {
        return { success: true, alreadyRead: true };
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, input.id));

      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(getUserNotificationScope(ctx), eq(notifications.isRead, false)));

    return { success: true };
  }),
});
