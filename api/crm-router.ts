import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, agentQuery, supervisoryQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customers, leads, interactions, tickets, invoices, customerTransactions, customerLoans } from "@db/schema";
import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";
import { getCustomerOpenObligations, receiveCustomerPayment } from "./lib/customer-receive-payment";
import { evaluateCustomerDeleteEligibility } from "./lib/customer-delete-check";
import { buildCustomerStatement } from "./lib/customer-statement";

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().email().max(320).optional(),
);

function emptyToUndefined(value?: string) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const crmRouter = createRouter({
  // ─── CUSTOMERS ───────────────────────────────────────────────────────────
  customers: authedQuery
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      type: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(customers.tenantId, ctx.user!.tenantId as number), isNull(customers.deletedAt)];
      if (input?.search) {
        conditions.push(sql`${customers.firstName} LIKE ${`%${input.search}%`} OR ${customers.lastName} LIKE ${`%${input.search}%`} OR ${customers.email} LIKE ${`%${input.search}%`}`);
      }
      if (input?.status) conditions.push(eq(customers.status, input.status as "active" | "inactive" | "blacklisted" | "vip"));
      if (input?.type) conditions.push(eq(customers.customerType, input.type as "individual" | "corporate" | "agent"));

      const where = and(...conditions);

      const items = await db.query.customers.findMany({
        where,
        limit: input?.limit ?? 20,
        offset: ((input?.page ?? 1) - 1) * (input?.limit ?? 20),
        orderBy: [desc(customers.createdAt)],
      });

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(where);
      return { items, total: countResult[0]?.count ?? 0 };
    }),

  customer: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      return db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.tenantId, ctx.user!.tenantId as number), isNull(customers.deletedAt)),
      });
    }),

  customerDetail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const recentTickets = await db.select().from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.customerId, input.id),
          isNull(tickets.deletedAt),
        ))
        .orderBy(desc(tickets.createdAt))
        .limit(20);

      const ticketIds = recentTickets.map((t) => t.id);
      const ticketInvoices = ticketIds.length > 0
        ? await db.select({
          id: invoices.id,
          ticketId: invoices.ticketId,
          invoiceNumber: invoices.invoiceNumber,
        }).from(invoices).where(and(
          eq(invoices.tenantId, tenantId),
          isNull(invoices.deletedAt),
          inArray(invoices.ticketId, ticketIds),
        ))
        : [];
      const invoiceByTicket = new Map(ticketInvoices.map((i) => [i.ticketId, i]));

      const recentTicketsWithInvoice = recentTickets.map((t) => {
        const inv = invoiceByTicket.get(t.id);
        return {
          ...t,
          invoiceId: inv?.id ?? null,
          invoiceNumber: inv?.invoiceNumber ?? null,
        };
      });

      // Recent invoices
      const recentInvoices = await db.select().from(invoices)
        .where(and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.customerId, input.id),
          isNull(invoices.deletedAt),
        ))
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      // Recent transactions
      const recentTransactions = await db.select().from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, input.id)))
        .orderBy(desc(customerTransactions.createdAt))
        .limit(20);

      // Recent interactions
      const recentInteractions = await db.select().from(interactions)
        .where(and(eq(interactions.tenantId, tenantId), eq(interactions.customerId, input.id)))
        .orderBy(desc(interactions.createdAt))
        .limit(10);

      // Recent loans
      const recentLoans = await db.select().from(customerLoans)
        .where(and(
          eq(customerLoans.tenantId, tenantId),
          eq(customerLoans.customerId, input.id),
          isNull(customerLoans.deletedAt),
        ))
        .orderBy(desc(customerLoans.createdAt))
        .limit(20);

      // Calculate balance due from transactions
      const txSum = await db.select({
        receivable: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount ELSE 0 END), 0)`,
        payments: sql<number>`COALESCE(SUM(CASE WHEN type IN ('payment','deposit','credit','refund') THEN amount ELSE 0 END), 0)`,
      })
        .from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, input.id)));

      const balanceDue = Number(txSum[0]?.receivable ?? 0) - Number(txSum[0]?.payments ?? 0);

      // Total paid
      const totalPaid = await db.select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
        .from(customerTransactions)
        .where(and(
          eq(customerTransactions.tenantId, tenantId),
          eq(customerTransactions.customerId, input.id),
          eq(customerTransactions.type, "payment"),
        ));

      const pendingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.customerId, input.id),
          eq(tickets.status, "pending"),
          isNull(tickets.deletedAt),
        ));
      const pendingTicketCount = Number(pendingResult[0]?.count ?? 0);

      const [invoiceCountRow, loanCountRow, transactionCountRow, interactionCountRow] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.customerId, input.id),
          isNull(invoices.deletedAt),
        )),
        db.select({ count: sql<number>`count(*)` }).from(customerLoans).where(and(
          eq(customerLoans.tenantId, tenantId),
          eq(customerLoans.customerId, input.id),
          isNull(customerLoans.deletedAt),
        )),
        db.select({ count: sql<number>`count(*)` }).from(customerTransactions).where(and(
          eq(customerTransactions.tenantId, tenantId),
          eq(customerTransactions.customerId, input.id),
        )),
        db.select({ count: sql<number>`count(*)` }).from(interactions).where(and(
          eq(interactions.tenantId, tenantId),
          eq(interactions.customerId, input.id),
        )),
      ]);

      return {
        customer,
        recentTickets: recentTicketsWithInvoice,
        recentInvoices,
        recentTransactions,
        recentInteractions,
        recentLoans,
        stats: {
          totalBookings: customer.totalBookings,
          totalRevenue: Number(customer.totalRevenue),
          totalPaid: Number(totalPaid[0]?.total ?? 0),
          balanceDue,
          activeLoans: recentLoans.filter((l) => l.status === "active").length,
          loanBalance: recentLoans
            .filter((l) => l.status === "active")
            .reduce((sum, l) => sum + Number(l.balanceAmount), 0),
          pendingTickets: pendingTicketCount,
          totalInvoices: Number(invoiceCountRow[0]?.count ?? 0),
          totalLoans: Number(loanCountRow[0]?.count ?? 0),
          totalTransactions: Number(transactionCountRow[0]?.count ?? 0),
          totalInteractions: Number(interactionCountRow[0]?.count ?? 0),
          profileTicketLimit: 20,
          profileInvoiceLimit: 10,
          profileLoanLimit: 20,
          profileTransactionLimit: 20,
          profileInteractionLimit: 10,
        },
      };
    }),

  customerObligations: authedQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      return getCustomerOpenObligations(db, tenantId, input.customerId);
    }),

  customerStatement: authedQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const statement = await buildCustomerStatement(db, tenantId, input.customerId);
      if (!statement) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }
      return statement;
    }),

  receivePayment: supervisoryQuery
    .input(z.object({
      customerId: z.number(),
      amount: z.string().min(1),
      paymentMethod: z.string().default("cash"),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
      autoAllocate: z.boolean().default(true),
      allocations: z.array(z.union([
        z.object({ type: z.literal("invoice"), invoiceId: z.number(), amount: z.string().min(1) }),
        z.object({ type: z.literal("loan"), loanId: z.number(), amount: z.string().min(1) }),
        z.object({ type: z.literal("deposit"), depositId: z.number(), amount: z.string().min(1) }),
      ])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);

      const allocations = input.allocations?.map((a) => {
        const slice = Number(a.amount);
        if (a.type === "invoice") {
          return { type: "invoice" as const, invoiceId: a.invoiceId, amount: slice };
        }
        if (a.type === "loan") {
          return { type: "loan" as const, loanId: a.loanId, amount: slice };
        }
        return { type: "deposit" as const, depositId: a.depositId, amount: slice };
      });

      const result = await db.transaction(async (tx) => receiveCustomerPayment(tx, {
        tenantId,
        customerId: input.customerId,
        amount,
        userId: ctx.user!.id,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        description: input.description,
        autoAllocate: input.autoAllocate,
        allocations,
      }));

      return result;
    }),

  createCustomer: agentQuery
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: optionalEmail,
      phone: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      customerType: z.enum(["individual", "corporate", "agent"]).default("individual"),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const code = `CUST-${Date.now().toString(36).toUpperCase()}`;
      const result = await db.insert(customers).values({
        ...input,
        email: input.email ?? undefined,
        phone: emptyToUndefined(input.phone),
        company: emptyToUndefined(input.company),
        jobTitle: emptyToUndefined(input.jobTitle),
        address: emptyToUndefined(input.address),
        city: emptyToUndefined(input.city),
        country: emptyToUndefined(input.country),
        notes: emptyToUndefined(input.notes),
        tenantId: ctx.user!.tenantId as number,
        customerCode: code,
        status: "active",
        totalBookings: 0,
        totalRevenue: "0.00",
      });
      return { id: Number(result[0].insertId) };
    }),

  updateCustomer: agentQuery
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: optionalEmail,
      phone: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      customerType: z.enum(["individual", "corporate", "agent"]).optional(),
      status: z.enum(["active", "inactive", "blacklisted", "vip"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const { id, ...update } = input;
      if (Object.keys(update).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }
      if ("email" in update) update.email = update.email ?? undefined;
      if ("phone" in update) update.phone = emptyToUndefined(update.phone);
      if ("company" in update) update.company = emptyToUndefined(update.company);
      if ("jobTitle" in update) update.jobTitle = emptyToUndefined(update.jobTitle);
      if ("address" in update) update.address = emptyToUndefined(update.address);
      if ("city" in update) update.city = emptyToUndefined(update.city);
      if ("country" in update) update.country = emptyToUndefined(update.country);
      if ("notes" in update) update.notes = emptyToUndefined(update.notes);
      await db.update(customers).set(update).where(and(
        eq(customers.id, id),
        eq(customers.tenantId, tenantId),
        isNull(customers.deletedAt),
      ));
      return { success: true };
    }),

  customerDeleteCheck: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const obligations = await getCustomerOpenObligations(db, tenantId, input.id);
      const loanBalance = obligations.openLoans.reduce((s, l) => s + l.balanceAmount, 0);
      const balanceDue = obligations.openInvoices.reduce((s, i) => s + i.balanceDue, 0);
      const depositLiability = obligations.depositLiability;

      const pendingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.customerId, input.id),
          eq(tickets.status, "pending"),
          isNull(tickets.deletedAt),
        ));
      const pendingTicketCount = Number(pendingResult[0]?.count ?? 0);

      const { canDelete, blockReason } = evaluateCustomerDeleteEligibility({
        balanceDue,
        loanBalance,
        depositLiability,
        pendingTicketCount,
        openInvoiceCount: obligations.openInvoices.length,
        openLoanCount: obligations.openLoans.length,
      });

      return {
        canDelete,
        balanceDue,
        loanBalance,
        depositLiability,
        pendingTicketCount,
        openInvoiceCount: obligations.openInvoices.length,
        openLoanCount: obligations.openLoans.length,
        openDepositCount: obligations.openDeposits.length,
        blockReason,
      };
    }),

  // ─── LEADS ───────────────────────────────────────────────────────────────
  leads: authedQuery
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(leads.tenantId, ctx.user!.tenantId as number)];
      if (input?.status) conditions.push(eq(leads.status, input.status as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"));
      if (input?.search) {
        conditions.push(sql`${leads.firstName} LIKE ${`%${input.search}%`} OR ${leads.lastName} LIKE ${`%${input.search}%`} OR ${leads.company} LIKE ${`%${input.search}%`}`);
      }
      const where = and(...conditions);

      const items = await db.query.leads.findMany({
        where,
        limit: input?.limit ?? 20,
        offset: ((input?.page ?? 1) - 1) * (input?.limit ?? 20),
        orderBy: [desc(leads.createdAt)],
      });

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(leads).where(where);
      return { items, total: countResult[0]?.count ?? 0 };
    }),

  createLead: agentQuery
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: optionalEmail,
      phone: z.string().optional(),
      company: z.string().optional(),
      source: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      estimatedValue: z.string().optional(),
      expectedCloseDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { expectedCloseDate, ...rest } = input;
      const result = await db.insert(leads).values({
        ...rest,
        email: rest.email ?? undefined,
        phone: emptyToUndefined(rest.phone),
        company: emptyToUndefined(rest.company),
        source: emptyToUndefined(rest.source),
        notes: emptyToUndefined(rest.notes),
        tenantId: ctx.user!.tenantId as number,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        status: "new",
      });
      return { id: Number(result[0].insertId) };
    }),

  updateLeadStatus: agentQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(leads).set({ status: input.status }).where(and(eq(leads.id, input.id), eq(leads.tenantId, ctx.user!.tenantId as number)));
      return { success: true };
    }),

  // ─── INTERACTIONS ────────────────────────────────────────────────────────
  interactions: authedQuery
    .input(z.object({ customerId: z.number().optional(), leadId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(interactions.tenantId, ctx.user!.tenantId as number)];
      if (input.customerId) conditions.push(eq(interactions.customerId, input.customerId));
      if (input.leadId) conditions.push(eq(interactions.leadId, input.leadId));
      const where = and(...conditions);

      return db.query.interactions.findMany({
        where,
        orderBy: [desc(interactions.createdAt)],
      });
    }),

  createInteraction: agentQuery
    .input(z.object({
      customerId: z.number().optional(),
      leadId: z.number().optional(),
      type: z.enum(["call", "email", "meeting", "note", "task", "sms", "whatsapp"]),
      subject: z.string().min(1),
      description: z.string().optional(),
      followUpDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { followUpDate, ...rest } = input;
      const result = await db.insert(interactions).values({
        ...rest,
        tenantId: ctx.user!.tenantId as number,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        status: "pending",
        createdBy: ctx.user!.id,
      });
      return { id: Number(result[0].insertId) };
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const customerCount = await db.select({ count: sql<number>`count(*)` }).from(customers).where(and(eq(customers.tenantId, ctx.user!.tenantId as number), isNull(customers.deletedAt)));
    const leadCount = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.tenantId, ctx.user!.tenantId as number));
    const activeLeads = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(eq(leads.tenantId, ctx.user!.tenantId as number), sql`${leads.status} NOT IN ('won','lost')`));
    const vipCount = await db.select({ count: sql<number>`count(*)` }).from(customers).where(and(eq(customers.tenantId, ctx.user!.tenantId as number), eq(customers.status, "vip"), isNull(customers.deletedAt)));
    const totalRevenue = await db.select({ total: sql<number>`COALESCE(SUM(total_revenue), 0)` }).from(customers).where(and(eq(customers.tenantId, ctx.user!.tenantId as number), isNull(customers.deletedAt)));

    return {
      customers: customerCount[0]?.count ?? 0,
      leads: leadCount[0]?.count ?? 0,
      activeLeads: activeLeads[0]?.count ?? 0,
      vipCustomers: vipCount[0]?.count ?? 0,
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
    };
  }),

  deleteCustomer: agentQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const obligations = await getCustomerOpenObligations(db, tenantId, input.id);
      const loanBalance = obligations.openLoans.reduce((s, l) => s + l.balanceAmount, 0);
      const depositLiability = obligations.depositLiability;
      const pendingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.customerId, input.id),
          eq(tickets.status, "pending"),
          isNull(tickets.deletedAt),
        ));
      const pendingTicketCount = Number(pendingResult[0]?.count ?? 0);

      const { canDelete, blockReason } = evaluateCustomerDeleteEligibility({
        balanceDue: obligations.arBalance,
        loanBalance,
        depositLiability,
        pendingTicketCount,
      });

      if (!canDelete) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: blockReason || "Cannot delete customer until all balances are settled.",
        });
      }

      await db.update(customers).set({
        deletedAt: new Date(),
        deletedBy: ctx.user!.id,
      }).where(and(eq(customers.id, input.id), eq(customers.tenantId, tenantId)));
      return { success: true };
    }),
});
