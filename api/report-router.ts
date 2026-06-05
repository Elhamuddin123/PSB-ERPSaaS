import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  tickets, customers, suppliers, bills, expenses, expenseCategories, ledgerEntries,
  chartOfAccounts, journalEntries, journalEntryLines, wallets, walletTransactions, airlines,
} from "@db/schema";
import { eq, desc, sql, and, inArray, isNull } from "drizzle-orm";
import { buildTrialBalance, buildIncomeStatement, type AccountType } from "./lib/accounting-balance";
import { getSetting } from "./lib/settings";

export const reportRouter = createRouter({
  // ─── REVENUE BY CUSTOMER ───────────────────────────────────────────────────
  revenueByCustomer: authedQuery
    .input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "confirmed"),
        isNull(tickets.deletedAt),
      ];
      if (input?.fromDate) conditions.push(sql`${tickets.bookingDate} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${tickets.bookingDate} <= ${input.toDate + " 23:59:59"}`);

      const result = await db.select({
        customerId: tickets.customerId,
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        totalTickets: sql<number>`count(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${tickets.totalAmount}), 0)`,
        totalCommission: sql<number>`COALESCE(SUM(${tickets.commissionAmount}), 0)`,
      })
        .from(tickets)
        .leftJoin(customers, eq(tickets.customerId, customers.id))
        .where(and(...conditions))
        .groupBy(tickets.customerId, customers.firstName, customers.lastName)
        .orderBy(desc(sql`SUM(${tickets.totalAmount})`));

      return result;
    }),

  // ─── REVENUE DETAIL (individual ticket sales) ────────────────────────────
  revenueDetail: authedQuery
    .input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional(), limit: z.number().default(500) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "confirmed"),
        isNull(tickets.deletedAt),
      ];
      if (input?.fromDate) conditions.push(sql`${tickets.bookingDate} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${tickets.bookingDate} <= ${input.toDate + " 23:59:59"}`);

      const where = and(...conditions);

      const items = await db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          pnrCode: tickets.pnrCode,
          bookingDate: tickets.bookingDate,
          travelDate: tickets.travelDate,
          routeFrom: tickets.routeFrom,
          routeTo: tickets.routeTo,
          customerId: tickets.customerId,
          customerName: sql<string>`TRIM(CONCAT(COALESCE(${customers.firstName}, ''), ' ', COALESCE(${customers.lastName}, '')))`,
          airlineName: airlines.name,
          baseFare: tickets.baseFare,
          taxAmount: tickets.taxAmount,
          totalAmount: tickets.totalAmount,
          commissionAmount: tickets.commissionAmount,
          paidAmount: tickets.paidAmount,
          supplierCost: tickets.supplierCost,
          paymentStatus: tickets.paymentStatus,
          status: tickets.status,
        })
        .from(tickets)
        .leftJoin(customers, eq(tickets.customerId, customers.id))
        .leftJoin(airlines, eq(tickets.airlineId, airlines.id))
        .where(where)
        .orderBy(desc(tickets.bookingDate))
        .limit(input.limit);

      const summaryResult = await db
        .select({
          totalTickets: sql<number>`count(*)`,
          totalRevenue: sql<number>`COALESCE(SUM(${tickets.totalAmount}), 0)`,
          totalCommission: sql<number>`COALESCE(SUM(${tickets.commissionAmount}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${tickets.paidAmount}), 0)`,
          totalSupplierCost: sql<number>`COALESCE(SUM(${tickets.supplierCost}), 0)`,
        })
        .from(tickets)
        .where(where);

      const summary = summaryResult[0];

      return {
        items: items.map((row) => ({
          ...row,
          customerName: row.customerName?.trim() || "Walk-in",
          totalAmount: Number(row.totalAmount),
          commissionAmount: Number(row.commissionAmount),
          paidAmount: Number(row.paidAmount),
          baseFare: Number(row.baseFare),
          taxAmount: Number(row.taxAmount),
          supplierCost: Number(row.supplierCost),
        })),
        summary: {
          totalTickets: Number(summary?.totalTickets ?? 0),
          totalRevenue: Number(summary?.totalRevenue ?? 0),
          totalCommission: Number(summary?.totalCommission ?? 0),
          totalPaid: Number(summary?.totalPaid ?? 0),
          totalSupplierCost: Number(summary?.totalSupplierCost ?? 0),
        },
      };
    }),

  // ─── EXPENSE BREAKDOWN ─────────────────────────────────────────────────────
  expenseBreakdown: authedQuery
    .input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [
        eq(expenses.tenantId, tenantId),
        eq(expenses.status, "approved"),
        isNull(expenses.deletedAt),
      ];
      if (input?.fromDate) conditions.push(sql`${expenses.expenseDate} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${expenses.expenseDate} <= ${input.toDate}`);

      const result = await db.select({
        vendor: expenses.vendor,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
        .from(expenses)
        .where(and(...conditions))
        .groupBy(expenses.vendor)
        .orderBy(desc(sql`SUM(${expenses.amount})`));

      return result;
    }),

  // ─── EXPENSE DETAIL (individual expense records) ───────────────────────────
  expenseDetail: authedQuery
    .input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional(), limit: z.number().default(500) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [
        eq(expenses.tenantId, tenantId),
        eq(expenses.status, "approved"),
        isNull(expenses.deletedAt),
      ];
      if (input?.fromDate) conditions.push(sql`${expenses.expenseDate} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${expenses.expenseDate} <= ${input.toDate}`);

      const where = and(...conditions);

      const items = await db
        .select({
          id: expenses.id,
          title: expenses.title,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
          categoryName: expenseCategories.name,
          vendor: expenses.vendor,
          amount: expenses.amount,
          currency: expenses.currency,
          paymentMethod: expenses.paymentMethod,
          receiptNumber: expenses.receiptNumber,
          status: expenses.status,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(where)
        .orderBy(desc(expenses.expenseDate), desc(expenses.id))
        .limit(input.limit);

      const summaryResult = await db
        .select({
          count: sql<number>`count(*)`,
          totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(where);

      const byCategory = await db
        .select({
          category: expenseCategories.name,
          total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(where)
        .groupBy(expenseCategories.name)
        .orderBy(desc(sql`SUM(${expenses.amount})`));

      const summary = summaryResult[0];

      return {
        items: items.map((row) => ({
          ...row,
          categoryName: row.categoryName || "Uncategorized",
          amount: Number(row.amount),
        })),
        summary: {
          count: Number(summary?.count ?? 0),
          totalAmount: Number(summary?.totalAmount ?? 0),
        },
        byCategory: byCategory.map((row) => ({
          category: row.category || "Uncategorized",
          total: Number(row.total),
          count: Number(row.count),
        })),
      };
    }),

  // ─── SUPPLIER PAYABLES SUMMARY ─────────────────────────────────────────────
  supplierPayables: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;

    const result = await db.select({
      supplierId: bills.supplierId,
      supplierName: suppliers.companyName,
      totalBills: sql<number>`count(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${bills.totalAmount}), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(${bills.amountPaid}), 0)`,
      balanceDue: sql<number>`COALESCE(SUM(${bills.balanceDue}), 0)`,
    })
      .from(bills)
      .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
      .where(and(eq(bills.tenantId, tenantId), eq(bills.status, "open")))
      .groupBy(bills.supplierId, suppliers.companyName)
      .orderBy(desc(sql`SUM(${bills.balanceDue})`));

    return result;
  }),

  // ─── CASH FLOW ─────────────────────────────────────────────────────────────
  cashFlow: authedQuery
    .input(z.object({ fromDate: z.string(), toDate: z.string(), granularity: z.enum(["daily", "weekly", "monthly"]).default("monthly") }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const cashAccount = await db.query.chartOfAccounts.findFirst({
        where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
      });
      if (!cashAccount) return { items: [], granularity: input.granularity };

      const dateFormat = input.granularity === "daily" ? "%Y-%m-%d"
        : input.granularity === "weekly" ? "%Y-%u"
        : "%Y-%m";

      const result = await db.select({
        period: sql<string>`DATE_FORMAT(${ledgerEntries.date}, ${dateFormat})`,
        inflows: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.credit} > 0 THEN ${ledgerEntries.credit} ELSE 0 END), 0)`,
        outflows: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerEntries.debit} > 0 THEN ${ledgerEntries.debit} ELSE 0 END), 0)`,
        netFlow: sql<number>`COALESCE(SUM(${ledgerEntries.credit} - ${ledgerEntries.debit}), 0)`,
      })
        .from(ledgerEntries)
        .where(and(
          eq(ledgerEntries.tenantId, tenantId),
          eq(ledgerEntries.accountId, Number(cashAccount.id)),
          sql`${ledgerEntries.date} >= ${input.fromDate}`,
          sql`${ledgerEntries.date} <= ${input.toDate}`,
        ))
        .groupBy(sql`DATE_FORMAT(${ledgerEntries.date}, ${dateFormat})`)
        .orderBy(sql`DATE_FORMAT(${ledgerEntries.date}, ${dateFormat})`);

      return { items: result, granularity: input.granularity };
    }),

  // ─── GENERAL LEDGER DETAIL ─────────────────────────────────────────────────
  generalLedger: authedQuery
    .input(z.object({
      accountId: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [eq(ledgerEntries.tenantId, tenantId)];

      if (input?.accountId) conditions.push(eq(ledgerEntries.accountId, input.accountId));
      if (input?.fromDate) conditions.push(sql`${ledgerEntries.date} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${ledgerEntries.date} <= ${input.toDate}`);

      const where = and(...conditions);

      const items = await db.select().from(ledgerEntries)
        .where(where)
        .limit(input?.limit ?? 50)
        .offset(((input?.page ?? 1) - 1) * (input?.limit ?? 50))
        .orderBy(ledgerEntries.date, ledgerEntries.id);

      const accountIds = [...new Set(items.map(i => i.accountId).filter(Boolean))];
      const accounts = accountIds.length > 0
        ? await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.tenantId, tenantId), inArray(chartOfAccounts.id, accountIds)))
        : [];
      const accountMap = new Map(accounts.map(a => [a.id, a]));

      const journalIds = [...new Set(items.map(i => i.journalEntryId).filter((id): id is number => id !== null))];
      const journals = journalIds.length > 0
        ? await db.select({ id: journalEntries.id, entryNumber: journalEntries.entryNumber }).from(journalEntries).where(inArray(journalEntries.id, journalIds))
        : [];
      const journalMap = new Map(journals.map(j => [j.id, j]));

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(ledgerEntries).where(where);

      return {
        items: items.map(i => ({
          ...i,
          account: accountMap.get(i.accountId) || null,
          journalEntry: i.journalEntryId ? journalMap.get(i.journalEntryId) || null : null,
        })),
        total: totalResult[0]?.count ?? 0,
      };
    }),

  // ─── TRIAL BALANCE ─────────────────────────────────────────────────────────
  trialBalance: authedQuery
    .input(z.object({ asOfDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const accounts = await db.select().from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.status, "active")))
        .orderBy(chartOfAccounts.code);

      const ledgerConditions = [eq(ledgerEntries.tenantId, tenantId)];
      if (input?.asOfDate) {
        ledgerConditions.push(sql`${ledgerEntries.date} <= ${input.asOfDate}`);
      }

      const ledgerData = await db
        .select({
          accountId: ledgerEntries.accountId,
          totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
          totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
        })
        .from(ledgerEntries)
        .where(and(...ledgerConditions))
        .groupBy(ledgerEntries.accountId);

      const ledgerMap = new Map(
        ledgerData.map((row) => [
          row.accountId,
          {
            accountId: row.accountId,
            totalDebit: Number(row.totalDebit),
            totalCredit: Number(row.totalCredit),
          },
        ]),
      );

      return buildTrialBalance(
        accounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type as AccountType,
        })),
        ledgerMap,
      );
    }),

  // ─── INCOME STATEMENT ──────────────────────────────────────────────────────
  incomeStatement: authedQuery
    .input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const accounts = await db.select().from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.status, "active"),
          sql`${chartOfAccounts.type} IN ('revenue', 'expense')`,
        ))
        .orderBy(chartOfAccounts.code);

      const accountIds = accounts.map((a) => a.id);
      const ledgerConditions = [eq(ledgerEntries.tenantId, tenantId)];
      if (accountIds.length > 0) ledgerConditions.push(inArray(ledgerEntries.accountId, accountIds));
      if (input?.fromDate) ledgerConditions.push(sql`${ledgerEntries.date} >= ${input.fromDate}`);
      if (input?.toDate) ledgerConditions.push(sql`${ledgerEntries.date} <= ${input.toDate}`);

      const ledgerData = accountIds.length > 0
        ? await db
            .select({
              accountId: ledgerEntries.accountId,
              totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
              totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
            })
            .from(ledgerEntries)
            .where(and(...ledgerConditions))
            .groupBy(ledgerEntries.accountId)
        : [];

      const ledgerMap = new Map(
        ledgerData.map((row) => [
          row.accountId,
          {
            accountId: row.accountId,
            totalDebit: Number(row.totalDebit),
            totalCredit: Number(row.totalCredit),
          },
        ]),
      );

      const taxRateRaw = await getSetting(db, tenantId, "default_tax_rate");
      const taxProvisionRate = Number(taxRateRaw || 0);

      return buildIncomeStatement(
        accounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type as AccountType,
          subtype: a.subtype,
        })),
        ledgerMap,
        {
          fromDate: input?.fromDate ?? null,
          toDate: input?.toDate ?? null,
          taxProvisionRate,
        },
      );
    }),

  // ─── WALLET ACTIVITY ───────────────────────────────────────────────────────
  walletActivity: authedQuery
    .input(z.object({
      walletId: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [eq(walletTransactions.tenantId, tenantId)];

      if (input?.walletId) conditions.push(eq(walletTransactions.walletId, input.walletId));
      if (input?.fromDate) conditions.push(sql`${walletTransactions.createdAt} >= ${input.fromDate}`);
      if (input?.toDate) conditions.push(sql`${walletTransactions.createdAt} <= ${input.toDate + " 23:59:59"}`);

      const items = await db.select().from(walletTransactions)
        .where(and(...conditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(200);

      const walletIds = [...new Set(items.map(t => t.walletId).filter(Boolean))];
      const walletsData = walletIds.length > 0
        ? await db.select().from(wallets).where(and(eq(wallets.tenantId, tenantId), inArray(wallets.id, walletIds)))
        : [];
      const walletMap = new Map(walletsData.map(w => [w.id, w]));

      return items.map(t => ({ ...t, wallet: walletMap.get(t.walletId) || null }));
    }),

  // ─── JOURNAL ENTRY DETAIL ──────────────────────────────────────────────────
  journalDetail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const entry = await db.select().from(journalEntries)
        .where(and(eq(journalEntries.id, input.id), eq(journalEntries.tenantId, tenantId)))
        .limit(1);
      if (!entry[0]) return null;

      const lines = await db.select().from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, input.id));

      const accountIds = [...new Set(lines.map(l => l.accountId).filter(Boolean))];
      const accounts = accountIds.length > 0
        ? await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.tenantId, tenantId), inArray(chartOfAccounts.id, accountIds)))
        : [];
      const accountMap = new Map(accounts.map(a => [a.id, a]));

      return {
        entry: entry[0],
        lines: lines.map(l => ({ ...l, account: accountMap.get(l.accountId) || null })),
      };
    }),
});
