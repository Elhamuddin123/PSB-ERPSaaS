import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, agencyAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { exchangeRates } from "@db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { fetchExchangeRates, isExchangeApiConfigured } from "./services/exchange-service";
import { auditLog } from "./lib/audit";

export const exchangeRateRouter = createRouter({
  list: authedQuery
    .input(z.object({
      fromCurrency: z.string().optional(),
      toCurrency: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [eq(exchangeRates.tenantId, tenantId)];

      if (input?.fromCurrency) conditions.push(eq(exchangeRates.fromCurrency, input.fromCurrency));
      if (input?.toCurrency) conditions.push(eq(exchangeRates.toCurrency, input.toCurrency));

      const where = and(...conditions);

      const items = await db.select().from(exchangeRates)
        .where(where)
        .limit(input?.limit ?? 50)
        .offset(((input?.page ?? 1) - 1) * (input?.limit ?? 50))
        .orderBy(desc(exchangeRates.effectiveDate));

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(exchangeRates).where(where);
      return { items, total: totalResult[0]?.count ?? 0 };

      
    }),

  currentRate: authedQuery
    .input(z.object({ from: z.string().length(3), to: z.string().length(3) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const rate = await db.select().from(exchangeRates)
        .where(and(
          eq(exchangeRates.tenantId, tenantId),
          eq(exchangeRates.fromCurrency, input.from),
          eq(exchangeRates.toCurrency, input.to),
        ))
        .orderBy(desc(exchangeRates.effectiveDate))
        .limit(1);
      return rate[0] || null;
    }),

  create: authedQuery
    .input(z.object({
      fromCurrency: z.string().length(3),
      toCurrency: z.string().length(3),
      rate: z.number().positive(),
      effectiveDate: z.string(),
      source: z.enum(["manual", "api", "system"]).default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const result = await db.insert(exchangeRates).values({
        tenantId,
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        rate: input.rate.toFixed(6),
        effectiveDate: new Date(input.effectiveDate),
        source: input.source,
      });

      return { id: Number(result[0].insertId) };
    }),

  // Agency-admin edit: rates are not posted to GL; rate value and date may be corrected.
  update: agencyAdminQuery
    .input(z.object({
      id: z.number(),
      rate: z.number().positive().optional(),
      effectiveDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const { id, rate, effectiveDate } = input;

      const existing = await db.query.exchangeRates.findFirst({
        where: and(eq(exchangeRates.id, id), eq(exchangeRates.tenantId, tenantId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Exchange rate not found" });

      const updateData: Record<string, unknown> = {};
      if (rate !== undefined) updateData.rate = rate.toFixed(6);
      if (effectiveDate !== undefined) {
        const parsed = new Date(effectiveDate);
        if (isNaN(parsed.getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Valid effective date is required" });
        }
        updateData.effectiveDate = parsed;
      }

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(exchangeRates).set(updateData).where(and(eq(exchangeRates.id, id), eq(exchangeRates.tenantId, tenantId)));

      await auditLog({
        ctx,
        action: "update",
        entityType: "exchange_rate",
        entityId: id,
        oldValues: {
          fromCurrency: existing.fromCurrency,
          toCurrency: existing.toCurrency,
          rate: existing.rate,
          effectiveDate: existing.effectiveDate,
          source: existing.source,
        },
        newValues: updateData,
      });

      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      await db.delete(exchangeRates)
        .where(and(eq(exchangeRates.id, input.id), eq(exchangeRates.tenantId, tenantId)));
      return { success: true };
    }),
liveRates: authedQuery.query(async () => {
  if (!isExchangeApiConfigured()) {
    console.warn("Exchange API is not configured; returning empty liveRates list.");
    return [];
  }
  return await fetchExchangeRates();
}),

syncRates: authedQuery.mutation(async ({ ctx }) => {
  const db = getDb();

  const tenantId = ctx.user!.tenantId as number;

  const rates = await fetchExchangeRates();

  for (const item of rates) {

    await db.insert(exchangeRates).values({
      tenantId,
      fromCurrency: "USD",
      toCurrency: item.code,
      rate: item.rate.toString(),
      effectiveDate: new Date(),
      source: "api",
    });

  }

  return { success: true };
}),
  // Convert amount from one currency to another using latest rate
  convert: authedQuery
    .input(z.object({
      amount: z.number(),
      from: z.string().length(3),
      to: z.string().length(3),
      asOfDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      if (input.from === input.to) {
        return { amount: input.amount, rate: 1, from: input.from, to: input.to };
      }

      const conditions = [
        eq(exchangeRates.tenantId, tenantId),
        eq(exchangeRates.fromCurrency, input.from),
        eq(exchangeRates.toCurrency, input.to),
      ];
      if (input.asOfDate) {
        conditions.push(sql`${exchangeRates.effectiveDate} <= ${input.asOfDate}`);
      }

      const rate = await db.select().from(exchangeRates)
        .where(and(...conditions))
        .orderBy(desc(exchangeRates.effectiveDate))
        .limit(1);

      if (!rate[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: `No exchange rate found for ${input.from} to ${input.to}` });
      }

      const converted = input.amount * Number(rate[0].rate);
      return { amount: converted, rate: Number(rate[0].rate), from: input.from, to: input.to };
    }),

  currencies: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;
    const fromCurrencies = await db.select({ currency: exchangeRates.fromCurrency })
      .from(exchangeRates).where(eq(exchangeRates.tenantId, tenantId)).groupBy(exchangeRates.fromCurrency);
    const toCurrencies = await db.select({ currency: exchangeRates.toCurrency })
      .from(exchangeRates).where(eq(exchangeRates.tenantId, tenantId)).groupBy(exchangeRates.toCurrency);
    const all = new Set([...fromCurrencies.map(c => c.currency), ...toCurrencies.map(c => c.currency), "USD"]);
    return Array.from(all).sort();
  }),
});
