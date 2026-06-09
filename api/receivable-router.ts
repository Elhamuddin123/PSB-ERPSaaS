import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, supervisoryQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customerTransactions, customers, invoices, tickets, notifications } from "@db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { recordCustomerPayment } from "./lib/customer-payment";

export const receivableRouter = createRouter({
  list: authedQuery
    .input(z.object({
      customerId: z.number().optional(),
      type: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [eq(customerTransactions.tenantId, tenantId)];
      if (input?.customerId) conditions.push(eq(customerTransactions.customerId, input.customerId));
      if (input?.type) conditions.push(eq(customerTransactions.type, input.type as "receivable" | "payment" | "deposit" | "credit" | "refund" | "adjustment"));
      const where = conditions.length > 1 ? and(...conditions) : conditions[0];

      const items = await db.select().from(customerTransactions).where(where).limit(input?.limit ?? 20).offset(((input?.page ?? 1) - 1) * (input?.limit ?? 20)).orderBy(desc(customerTransactions.createdAt));

      const customerIds = [...new Set(items.map(i => i.customerId).filter(Boolean))] as number[];
      const customerList = customerIds.length > 0
        ? await db.select().from(customers).where(and(eq(customers.tenantId, tenantId), inArray(customers.id, customerIds)))
        : [];
      const customerMap = new Map(customerList.map(c => [c.id, c]));

      const itemsWithCustomer = items.map(i => ({
        ...i,
        customer: customerMap.get(i.customerId) || null,
      }));

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(customerTransactions).where(where);
      return { items: itemsWithCustomer, total: Number(countResult[0]?.count ?? 0) };
    }),

  customerBalance: authedQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const result = await db
        .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
        .from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, input.customerId)));
      return { balance: Number(result[0]?.total ?? 0) };
    }),

  statement: authedQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const transactions = await db
        .select()
        .from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, input.customerId)))
        .orderBy(customerTransactions.createdAt);

      let runningBalance = 0;
      const withBalance = transactions.map((t) => {
        if (t.type === "receivable") runningBalance += Number(t.amount);
        else if (["payment", "deposit", "credit", "refund"].includes(t.type)) runningBalance -= Number(t.amount);
        return { ...t, runningBalance };
      });

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)),
      });

      return { customer, transactions: withBalance };
    }),

  aging: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;
    const now = new Date();
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
    const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

    const receivables = await db
      .select()
      .from(customerTransactions)
      .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.type, "receivable")));

    const payments = await db
      .select()
      .from(customerTransactions)
      .where(and(
        eq(customerTransactions.tenantId, tenantId),
        eq(customerTransactions.type, "payment"),
      ));

    const paymentMap = new Map<number, number>();
    for (const p of payments) {
      if (p.invoiceId) {
        paymentMap.set(p.invoiceId, (paymentMap.get(p.invoiceId) || 0) + Number(p.amount));
      }
    }

    const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
    for (const r of receivables) {
      const paid = paymentMap.get(r.invoiceId || 0) || 0;
      const outstanding = Number(r.amount) - paid;
      if (outstanding <= 0) continue;
      const date = new Date(r.createdAt);
      if (date >= d30) buckets.current += outstanding;
      else if (date >= d60) buckets.d30 += outstanding;
      else if (date >= d90) buckets.d60 += outstanding;
      else buckets.d90 += outstanding;
    }

    return buckets;
  }),

  createPayment: supervisoryQuery
    .input(z.object({
      customerId: z.number(),
      invoiceId: z.number().optional(),
      amount: z.string().min(1),
      paymentMethod: z.string().default("cash"),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const result = await db.transaction(async (tx) => {
        const paymentResult = await recordCustomerPayment(tx, {
          tenantId,
          customerId: input.customerId,
          amount,
          userId: ctx.user!.id,
          invoiceId: input.invoiceId,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          description: input.description,
          source: "receivable",
        });

        if (paymentResult.ticketId) {
          const ticket = await tx.query.tickets.findFirst({
            where: and(eq(tickets.id, paymentResult.ticketId!), eq(tickets.tenantId, tenantId)),
          });
          if (ticket) {
            const newPaid = Number(ticket.paidAmount ?? 0) + amount;
            const linkedInvoice = paymentResult.invoiceId
              ? await tx.query.invoices.findFirst({ where: eq(invoices.id, paymentResult.invoiceId) })
              : null;
            const customerCharge = linkedInvoice ? Number(linkedInvoice.totalAmount) : Number(ticket.totalAmount);
            await tx.update(tickets).set({
              paidAmount: newPaid.toFixed(2),
              paymentStatus: newPaid >= customerCharge ? "paid" : "partial",
            }).where(eq(tickets.id, ticket.id));
          }
        }

        return paymentResult;
      });

      try {
        await db.insert(notifications).values({
          tenantId,
          userId: ctx.user!.id,
          title: "Payment Received",
          message: `$${amount.toLocaleString()} received from ${customer.firstName} ${customer.lastName}.`,
          type: "success",
          category: "accounting",
        });
      } catch { /* non-critical */ }

      return { success: true, ...result };
    }),
});
