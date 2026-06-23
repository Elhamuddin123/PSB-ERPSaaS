import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, supervisoryQuery, agentQuery, agencyAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";

import {
  tickets,
  ticketPassengers,
  airlines,
  wallets,
  walletTransactions,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  notifications,
  customers,
  customerTransactions,
  invoices,
} from "@db/schema";

import {
  eq,
  desc,
  asc,
  sql,
  like,
  and,
  or,
  inArray,
  isNull,
} from "drizzle-orm";
import { auditLog } from "./lib/audit";
import { createPendingTicket, validateTicketCreatePrerequisites } from "./lib/ticket-create";
import { approveTicket, computeTicketFinancials, repairTicketCustomerBilling, validateTicketRefund, computeRefundWalletCredit } from "./lib/ticket-approval";
import { buildTicketRefundSnapshot, undoTicketRefund } from "./lib/ticket-refund-undo";
import { ensureTenantBootstrapped } from "./lib/ensure-tenant-bootstrap";
import { reverseApprovedTicket } from "./lib/ticket-reverse";
import { postLedgerLines } from "./lib/ledger-posting";
import { reversePostedJournals } from "./lib/journal-reverse";
import { getAccountByCode, postWalletCredit, TICKET_COST_CODE } from "./lib/wallet-coa";
import { recordCustomerPayment } from "./lib/customer-payment";

// =====================================================
// JSON metadata helper (MariaDB returns JSON as strings)
// =====================================================
function getTicketMetadata(ticket: typeof tickets.$inferSelect) {
  if (!ticket.metadata) return null;
  if (typeof ticket.metadata === "string") {
    try { return JSON.parse(ticket.metadata); } catch { return null; }
  }
  return ticket.metadata as any;
}

const optionalValidDateString = z
  .string()
  .optional()
  .refine((value) => !value || !isNaN(new Date(value).getTime()), { message: "Date must be valid" });

const optionalId = z.preprocess(
  (value) => (typeof value === "number" && value <= 0 ? undefined : value),
  z.number().optional(),
);

const ticketSharedInputSchema = {
  airlineId: optionalId,
  customerId: optionalId,
  walletId: z.number().min(1, "Wallet is required"),
  travelDate: optionalValidDateString,
  returnDate: optionalValidDateString,
  routeFrom: z.string().max(10).optional(),
  routeTo: z.string().max(10).optional(),
  tripType: z.enum(["one_way", "round_trip", "multi_city"]).default("one_way"),
  class: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  baseFare: z.string().default("0"),
  taxAmount: z.string().default("0"),
  totalAmount: z.string().refine((value) => Number(value) > 0, { message: "Ticket price is required" }),
  commissionAmount: z.string().default("0"),
  discountAmount: z.string().default("0"),
  paidAmount: z.string().optional(),
  supplierCost: z.string().optional(),
  expense: z.string().optional(),
  netPayable: z.string().default("0"),
  notes: z.string().optional(),
};

const ticketPassengerInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  passengerType: z.enum(["adult", "child", "infant"]).default("adult"),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  seatNumber: z.string().optional(),
});

function ensureTicketTenant(ctx: any, label = "") {
  const tid = ctx.user?.tenantId;
  console.log(`[Ticket router] ${label} tenantId:`, tid);
  if (tid == null) {
    console.log("[Ticket router] missing tenantId", ctx.user);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant context missing" });
  }
  return tid as number;
}

// =====================================================
// REFUND HELPER
// =====================================================

async function refundTicket(
  db: import("./queries/connection").DbOrTx,
  ticket: typeof tickets.$inferSelect,
  user: { id: number; tenantId: number | null },
  refundAmount: number,
  penaltyAmount: number,
  reason: string,
) {
  const tenantId = user.tenantId as number;
  const fin = computeTicketFinancials(ticket);
  const validation = validateTicketRefund(fin, refundAmount, penaltyAmount);
  if (!validation.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
  }
  const { isFullCustomerRefund, totalReversal } = validation;

  const metadata = getTicketMetadata(ticket) ?? {};
  const walletId = metadata.walletId ?? null;
  if (!walletId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket wallet not recorded" });
  }

  const userWallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!userWallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found" });
  }

  const walletCredit = computeRefundWalletCredit(fin, totalReversal, isFullCustomerRefund);

  await db.update(wallets)
    .set({ balance: sql`${wallets.balance} + ${walletCredit.toFixed(2)}` })
    .where(eq(wallets.id, userWallet.id));

  const updatedWallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, userWallet.id),
  });

  await db.insert(walletTransactions).values({
    walletId: userWallet.id,
    tenantId,
    type: "refund",
    amount: walletCredit.toFixed(2),
    balanceAfter: updatedWallet!.balance,
    description: `Ticket refund: ${ticket.ticketNumber}${reason ? ` - ${reason}` : ""}`,
    referenceType: "ticket",
    referenceId: ticket.id,
    createdBy: user.id,
  });

  if (isFullCustomerRefund) {
    await reversePostedJournals(db, tenantId, "ticket", ticket.id, "Ticket refund");
    await reversePostedJournals(db, tenantId, "ticket_wallet", ticket.id, "Ticket wallet refund");
  } else {
    const ratio = fin.customerCharge > 0 ? totalReversal / fin.customerCharge : 0;
    const cashAccount = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
    });
    const arAccount = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.code, "1200"), eq(chartOfAccounts.tenantId, tenantId)),
    });
    const revenueAccount = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.code, "4000"), eq(chartOfAccounts.tenantId, tenantId)),
    });
    const commissionRevenueAccount = await db.query.chartOfAccounts.findFirst({
      where: and(eq(chartOfAccounts.code, "4100"), eq(chartOfAccounts.tenantId, tenantId)),
    });

    if (!cashAccount || !arAccount || !revenueAccount) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Required COA accounts missing for refund posting" });
    }

    let penaltyAccount = null;
    if (penaltyAmount > 0) {
      penaltyAccount = await db.query.chartOfAccounts.findFirst({
        where: and(eq(chartOfAccounts.code, "4200"), eq(chartOfAccounts.tenantId, tenantId)),
      });
      if (!penaltyAccount) {
        const result = await db.insert(chartOfAccounts).values({
          tenantId,
          code: "4200",
          name: "Penalty Revenue",
          type: "revenue",
          currentBalance: "0.00",
          status: "active",
          currency: "USD",
        });
        penaltyAccount = { id: Number(result[0].insertId) };
      }
    }

    const fareRev = fin.fareRevenue * ratio;
    const netComm = fin.netCommission * ratio;
    const creditAccount = ticket.customerId ? arAccount : cashAccount;

    const journalLines: { accountId: number; description: string; debit: string; credit: string }[] = [];
    if (fareRev > 0) {
      journalLines.push({
        accountId: revenueAccount.id,
        description: "Partial fare revenue reversal",
        debit: fareRev.toFixed(2),
        credit: "0.00",
      });
    }
    if (netComm > 0 && commissionRevenueAccount) {
      journalLines.push({
        accountId: commissionRevenueAccount.id,
        description: "Partial commission revenue reversal",
        debit: netComm.toFixed(2),
        credit: "0.00",
      });
    }
    journalLines.push({
      accountId: creditAccount.id,
      description: "Cash/AR refund to customer",
      debit: "0.00",
      credit: refundAmount.toFixed(2),
    });
    if (penaltyAmount > 0 && penaltyAccount) {
      journalLines.push({
        accountId: penaltyAccount.id,
        description: "Cancellation penalty",
        debit: "0.00",
        credit: penaltyAmount.toFixed(2),
      });
    }

    const journalDebit = journalLines.reduce((s, l) => s + Number(l.debit), 0);
    const journalCredit = journalLines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(journalDebit - journalCredit) > 0.01) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Refund journal entry is not balanced" });
    }

    const journalResult = await db.insert(journalEntries).values({
      tenantId,
      entryNumber: `JE-${Date.now()}`,
      date: new Date(),
      description: `Ticket Partial Refund ${ticket.ticketNumber}${reason ? ` - ${reason}` : ""}`,
      referenceType: "ticket_refund",
      referenceId: ticket.id,
      status: "posted",
      totalDebit: journalDebit.toFixed(2),
      totalCredit: journalCredit.toFixed(2),
    });
    const journalId = Number(journalResult[0].insertId ?? 0);

    if (journalId > 0) {
      await db.insert(journalEntryLines).values(
        journalLines.map((line) => ({ journalEntryId: journalId, ...line })),
      );
      await postLedgerLines(db, {
        tenantId,
        journalEntryId: journalId,
        date: new Date(),
        referenceType: "ticket_refund",
        referenceId: ticket.id,
        lines: journalLines,
      });
    }

    const ticketCostAccount = await getAccountByCode(db, tenantId, TICKET_COST_CODE);
    if (ticketCostAccount && walletCredit > 0) {
      await postWalletCredit(
        db,
        userWallet,
        walletCredit,
        ticketCostAccount.id,
        `Partial ticket supplier cost reversal: ${ticket.ticketNumber}`,
        "ticket_refund_wallet",
        ticket.id,
        `Partial wallet credit for ticket refund ${ticket.ticketNumber}`,
      );
    }
  }

  const lastRefund = buildTicketRefundSnapshot(ticket, fin, {
    refundAmount,
    penaltyAmount,
    totalReversal,
    isFullCustomerRefund,
    walletCredit,
  });

  await db.update(tickets).set({
    status: "refunded",
    paymentStatus: "refunded",
    metadata: { ...metadata, lastRefund },
  }).where(eq(tickets.id, ticket.id));

  if (ticket.customerId) {
    if (isFullCustomerRefund) {
      const existingTx = await db.select().from(customerTransactions).where(
        and(
          eq(customerTransactions.tenantId, tenantId),
          eq(customerTransactions.ticketId, ticket.id),
        ),
      );

      const balanceResult = await db
        .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
        .from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, ticket.customerId)));
      let runningBalance = Number(balanceResult[0]?.total ?? 0);

      for (const tx of existingTx) {
        if (tx.type === "receivable") {
          runningBalance = Math.max(0, runningBalance - Number(tx.amount));
          await db.insert(customerTransactions).values({
            tenantId,
            customerId: ticket.customerId,
            ticketId: ticket.id,
            type: "credit",
            amount: tx.amount,
            balance: runningBalance.toFixed(2),
            description: `Refund reversal of receivable: ${ticket.ticketNumber}`,
            createdBy: user.id,
          });
        } else if (tx.type === "payment") {
          runningBalance += Number(tx.amount);
          await db.insert(customerTransactions).values({
            tenantId,
            customerId: ticket.customerId,
            ticketId: ticket.id,
            type: "receivable",
            amount: tx.amount,
            balance: runningBalance.toFixed(2),
            description: `Refund reversal of payment: ${ticket.ticketNumber}`,
            createdBy: user.id,
          });
        }
      }

      if (refundAmount > 0) {
        runningBalance = Math.max(0, runningBalance - refundAmount);
        await db.insert(customerTransactions).values({
          tenantId,
          customerId: ticket.customerId,
          ticketId: ticket.id,
          type: "refund",
          amount: refundAmount.toFixed(2),
          balance: runningBalance.toFixed(2),
          description: `Ticket refund: ${ticket.ticketNumber}${reason ? ` - ${reason}` : ""}`,
          createdBy: user.id,
        });
      }
    } else {
      const balanceResult = await db
        .select({ total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)` })
        .from(customerTransactions)
        .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, ticket.customerId)));
      const runningBalance = Math.max(0, Number(balanceResult[0]?.total ?? 0) - refundAmount);

      await db.insert(customerTransactions).values({
        tenantId,
        customerId: ticket.customerId,
        ticketId: ticket.id,
        type: "refund",
        amount: refundAmount.toFixed(2),
        balance: runningBalance.toFixed(2),
        description: `Partial ticket refund: ${ticket.ticketNumber}${reason ? ` - ${reason}` : ""}`,
        createdBy: user.id,
      });
    }

    await db.update(customers).set({
      totalBookings: sql`GREATEST(0, ${customers.totalBookings} - 1)`,
      totalRevenue: sql`GREATEST(0, ${customers.totalRevenue} - ${totalReversal.toFixed(2)})`,
    }).where(eq(customers.id, ticket.customerId));

    try {
      await db.update(invoices).set({ status: "cancelled" }).where(
        and(eq(invoices.ticketId, ticket.id), eq(invoices.tenantId, tenantId)),
      );
    } catch { /* non-critical */ }
  }

  // Notification
  try {
    await db.insert(notifications).values({
      tenantId,
      userId: user.id,
      title: "Ticket Refunded",
      message: `Ticket ${ticket.ticketNumber} has been refunded.$${refundAmount.toLocaleString()} returned${penaltyAmount > 0 ? ` (penalty: $${penaltyAmount.toLocaleString()})` : ""}.`,
      type: "warning",
      category: "ticket",
      referenceType: "ticket",
      referenceId: ticket.id,
    });
  } catch { /* non-critical */ }

  return { success: true };
}

export const ticketRouter = createRouter({
  // =====================================================
  // LIST TICKETS
  // =====================================================

  list: authedQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
          customerId: z.number().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();

      const tenantId = ensureTicketTenant(ctx, "list");
      console.log("[Ticket query] list input:", input);

      const page =
        input?.page ?? 1;

      const limit =
        input?.limit ?? 20;

      const offset =
        (page - 1) * limit;

      const conditions = [
        eq(tickets.tenantId, tenantId),
        isNull(tickets.deletedAt),
      ];

      if (input?.status) {
        conditions.push(
          eq(
            tickets.status,
            input.status as
              | "confirmed"
              | "pending"
              | "cancelled"
              | "refunded"
              | "completed",
          ),
        );
      }

      if (input?.customerId) {
        conditions.push(eq(tickets.customerId, input.customerId));
      }

      if (input?.search) {
        conditions.push(
          or(
            like(tickets.ticketNumber, `%${input.search}%`),
            like(tickets.pnrCode, `%${input.search}%`),
            like(tickets.routeFrom, `%${input.search}%`),
            like(tickets.routeTo, `%${input.search}%`),
          )!,
        );
      }

      const where =
        conditions.length > 1
          ? and(...conditions)
          : conditions[0];

      const items = await db.select().from(tickets).where(where).limit(limit).offset(offset).orderBy(desc(tickets.createdAt));
      const ticketIds = items.map(t => t.id);
      const airlineIds = [...new Set(items.map(t => t.airlineId).filter(Boolean))] as number[];

      const airlineList = airlineIds.length > 0
        ? await db.select().from(airlines).where(and(eq(airlines.tenantId, tenantId), inArray(airlines.id, airlineIds)))
        : [];
      const airlineMap = new Map(airlineList.map(a => [a.id, a]));

      const passengerList = ticketIds.length > 0
        ? await db.select().from(ticketPassengers).where(inArray(ticketPassengers.ticketId, ticketIds))
        : [];
      const passengersByTicket = new Map<number, typeof passengerList>();
      for (const p of passengerList) {
        if (!passengersByTicket.has(p.ticketId)) passengersByTicket.set(p.ticketId, []);
        passengersByTicket.get(p.ticketId)!.push(p);
      }

      const invoiceList = ticketIds.length > 0
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
      const invoiceByTicket = new Map(invoiceList.map((i) => [i.ticketId, i]));

      const itemsWithRelations = items.map(t => {
        const inv = t.id ? invoiceByTicket.get(t.id) : undefined;
        return {
          ...t,
          airline: t.airlineId ? airlineMap.get(t.airlineId) || null : null,
          passengers: passengersByTicket.get(t.id) || [],
          invoiceId: inv?.id ?? null,
          invoiceNumber: inv?.invoiceNumber ?? null,
        };
      });

      const countResult = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(tickets)
        .where(where);

      return {
        items: itemsWithRelations,
        total: Number(countResult[0]?.count ?? 0),
        page,
        limit,
      };
    }),

  // =====================================================
  // GET SINGLE TICKET
  // =====================================================

  get: authedQuery
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ensureTicketTenant(ctx, "get");
      console.log("[Ticket query] get input:", input);

      const ticketResult = await db.select().from(tickets).where(
        and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId))
      ).limit(1);
      const ticket = ticketResult[0] || null;
      console.log("[Ticket query] ticket result:", ticket);

      if (!ticket) return null;

      const airlineResult = ticket.airlineId
        ? await db.select().from(airlines).where(
            and(eq(airlines.id, ticket.airlineId), eq(airlines.tenantId, tenantId))
          ).limit(1)
        : [];
      console.log("[Ticket query] airline result:", airlineResult[0] || null);

      const passengerResult = await db.select().from(ticketPassengers).where(
        eq(ticketPassengers.ticketId, ticket.id)
      );
      console.log("[Ticket query] passengers count:", passengerResult.length);

      return {
        ...ticket,
        airline: airlineResult[0] || null,
        passengers: passengerResult,
      };
    }),

  // =====================================================
  // CREATE TICKET
  // =====================================================

  create: agentQuery
    .input(
      z.object({
        ticketNumber: z.string().optional(),
        pnrCode: z.string().optional(),
        ...ticketSharedInputSchema,
        passengers: z.array(ticketPassengerInputSchema).min(1, "Passenger first and last name are required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      await ensureTenantBootstrapped(db, tenantId, ctx.user!.id);
      await validateTicketCreatePrerequisites(db, tenantId, input.walletId, input.airlineId);
      const result = await createPendingTicket(db, ctx, input);
      return { id: result.id, ticketNumber: result.ticketNumber };
    }),

  createBulk: agentQuery
    .input(
      z.object({
        ...ticketSharedInputSchema,
        entries: z
          .array(
            z.object({
              firstName: z.string().min(1),
              lastName: z.string().min(1),
              pnrCode: z.string().optional(),
              ticketNumber: z.string().optional(),
            }),
          )
          .min(1)
          .max(30),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const { entries, ...shared } = input;

      await ensureTenantBootstrapped(db, tenantId, ctx.user!.id);
      await validateTicketCreatePrerequisites(db, tenantId, shared.walletId, shared.airlineId);

      const created: { id: number; ticketNumber: string }[] = [];
      for (const entry of entries) {
        const result = await createPendingTicket(db, ctx, {
          ...shared,
          ticketNumber: entry.ticketNumber,
          pnrCode: entry.pnrCode,
          passengers: [
            {
              firstName: entry.firstName,
              lastName: entry.lastName,
              passengerType: "adult",
            },
          ],
        });
        created.push(result);
      }

      return {
        ids: created.map((t) => t.id),
        count: created.length,
        tickets: created,
      };
    }),

  // =====================================================
  // UPDATE TICKET (agency admin only — accounting-safe)
  // =====================================================

  update: agencyAdminQuery
    .input(
      z.object({
        id: z.number(),
        ticketNumber: z.string().optional(),
        pnrCode: z.string().optional(),
        airlineId: optionalId,
        customerId: optionalId,
        walletId: z.number().min(1).optional(),
        travelDate: optionalValidDateString,
        returnDate: optionalValidDateString,
        routeFrom: z.string().max(10).optional(),
        routeTo: z.string().max(10).optional(),
        tripType: z.enum(["one_way", "round_trip", "multi_city"]).optional(),
        class: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
        baseFare: z.string().optional(),
        taxAmount: z.string().optional(),
        totalAmount: z.string().optional(),
        commissionAmount: z.string().optional(),
        discountAmount: z.string().optional(),
        paidAmount: z.string().optional(),
        netPayable: z.string().optional(),
        notes: z.string().optional(),
        passengers: z
          .array(
            ticketPassengerInputSchema.extend({ id: z.number().optional() }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const { id, passengers, walletId, travelDate, returnDate, ...fields } = input;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, id), eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }
      if (["refunded", "cancelled"].includes(existing.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit refunded or cancelled tickets" });
      }

      const isPending = existing.status === "pending";
      const updateData: Record<string, unknown> = {};

      if (isPending) {
        if (walletId !== undefined) {
          await validateTicketCreatePrerequisites(db, tenantId, walletId, fields.airlineId ?? existing.airlineId ?? undefined);
        } else if (fields.airlineId !== undefined) {
          const metaWalletId = getTicketMetadata(existing)?.walletId;
          if (!metaWalletId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket wallet not recorded" });
          }
          await validateTicketCreatePrerequisites(db, tenantId, metaWalletId, fields.airlineId);
        }

        if (fields.ticketNumber !== undefined) updateData.ticketNumber = fields.ticketNumber.trim() || existing.ticketNumber;
        if (fields.pnrCode !== undefined) updateData.pnrCode = fields.pnrCode.trim() || null;
        if (fields.airlineId !== undefined) updateData.airlineId = fields.airlineId ?? null;
        if (fields.customerId !== undefined) updateData.customerId = fields.customerId ?? null;
        if (fields.routeFrom !== undefined) updateData.routeFrom = (fields.routeFrom.trim() || "TBD").slice(0, 10);
        if (fields.routeTo !== undefined) updateData.routeTo = (fields.routeTo.trim() || "TBD").slice(0, 10);
        if (fields.tripType !== undefined) updateData.tripType = fields.tripType;
        if (fields.class !== undefined) updateData.class = fields.class;
        if (fields.notes !== undefined) updateData.notes = fields.notes.trim() || null;
        if (travelDate !== undefined) updateData.travelDate = travelDate ? new Date(travelDate) : null;
        if (returnDate !== undefined) updateData.returnDate = returnDate ? new Date(returnDate) : null;

        if (fields.totalAmount !== undefined || fields.commissionAmount !== undefined || fields.discountAmount !== undefined) {
          const ticketPrice = Number(fields.totalAmount ?? existing.totalAmount);
          const commissionAmount = Number(fields.commissionAmount ?? existing.commissionAmount);
          const discountAmount = Number(fields.discountAmount ?? existing.discountAmount ?? 0);
          const paidAmount = Number(fields.paidAmount ?? existing.paidAmount ?? 0);

          if (discountAmount > commissionAmount) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Customer discount cannot exceed airline commission" });
          }

          const customerCharge = ticketPrice - discountAmount;
          let paymentStatus: "pending" | "partial" | "paid" = "pending";
          if (paidAmount >= customerCharge && customerCharge > 0) paymentStatus = "paid";
          else if (paidAmount > 0) paymentStatus = "partial";

          if (fields.baseFare !== undefined) updateData.baseFare = fields.baseFare;
          if (fields.taxAmount !== undefined) updateData.taxAmount = fields.taxAmount;
          if (fields.totalAmount !== undefined) updateData.totalAmount = fields.totalAmount;
          if (fields.commissionAmount !== undefined) updateData.commissionAmount = fields.commissionAmount;
          if (fields.discountAmount !== undefined) updateData.discountAmount = discountAmount.toFixed(2);
          if (fields.paidAmount !== undefined) updateData.paidAmount = paidAmount.toFixed(2);
          updateData.netPayable = (ticketPrice - commissionAmount).toFixed(2);
          updateData.paymentStatus = paymentStatus;
        } else {
          if (fields.baseFare !== undefined) updateData.baseFare = fields.baseFare;
          if (fields.taxAmount !== undefined) updateData.taxAmount = fields.taxAmount;
          if (fields.commissionAmount !== undefined) updateData.commissionAmount = fields.commissionAmount;
          if (fields.paidAmount !== undefined) updateData.paidAmount = fields.paidAmount;
          if (fields.netPayable !== undefined) updateData.netPayable = fields.netPayable;
        }

        if (walletId !== undefined) {
          const metadata = getTicketMetadata(existing) ?? {};
          updateData.metadata = { ...metadata, walletId };
        }
      } else {
        const financialKeys = [
          "walletId", "customerId", "baseFare", "taxAmount", "totalAmount",
          "commissionAmount", "discountAmount", "paidAmount", "netPayable",
        ] as const;
        for (const key of financialKeys) {
          if ((input as Record<string, unknown>)[key] !== undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Financial fields cannot be changed on approved tickets. Use refund/reversal flows.",
            });
          }
        }

        if (fields.ticketNumber !== undefined) updateData.ticketNumber = fields.ticketNumber.trim() || existing.ticketNumber;
        if (fields.pnrCode !== undefined) updateData.pnrCode = fields.pnrCode.trim() || null;
        if (fields.routeFrom !== undefined) updateData.routeFrom = (fields.routeFrom.trim() || existing.routeFrom).slice(0, 10);
        if (fields.routeTo !== undefined) updateData.routeTo = (fields.routeTo.trim() || existing.routeTo).slice(0, 10);
        if (fields.tripType !== undefined) updateData.tripType = fields.tripType;
        if (fields.class !== undefined) updateData.class = fields.class;
        if (fields.airlineId !== undefined) updateData.airlineId = fields.airlineId ?? null;
        if (fields.notes !== undefined) updateData.notes = fields.notes.trim() || null;
        if (travelDate !== undefined) updateData.travelDate = travelDate ? new Date(travelDate) : null;
        if (returnDate !== undefined) updateData.returnDate = returnDate ? new Date(returnDate) : null;
      }

      if (Object.keys(updateData).length === 0 && !passengers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx.update(tickets).set(updateData).where(eq(tickets.id, id));
        }

        if (passengers && passengers.length > 0) {
          if (isPending) {
            await tx.delete(ticketPassengers).where(eq(ticketPassengers.ticketId, id));
            await tx.insert(ticketPassengers).values(
              passengers.map((p) => ({
                ticketId: id,
                firstName: p.firstName,
                lastName: p.lastName,
                passengerType: p.passengerType ?? "adult",
                passportNumber: p.passportNumber,
                nationality: p.nationality,
                seatNumber: p.seatNumber,
              })),
            );
          } else {
            for (const p of passengers) {
              if (p.id) {
                await tx.update(ticketPassengers).set({
                  firstName: p.firstName,
                  lastName: p.lastName,
                  seatNumber: p.seatNumber,
                  passportNumber: p.passportNumber,
                  nationality: p.nationality,
                }).where(and(eq(ticketPassengers.id, p.id), eq(ticketPassengers.ticketId, id)));
              }
            }
          }
        }
      });

      await auditLog({
        ctx,
        action: "update",
        entityType: "ticket",
        entityId: id,
        oldValues: { status: existing.status, ticketNumber: existing.ticketNumber },
        newValues: { ...updateData, passengerCount: passengers?.length },
      });

      return { success: true };
    }),

  // =====================================================
  // APPROVE TICKET
  // =====================================================

  approve: supervisoryQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }
      if (existing.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket is not pending approval" });
      }

      const result = await db.transaction(async (tx) => {
        const fresh = await tx.query.tickets.findFirst({
          where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
        });
        if (!fresh || fresh.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Ticket is not pending approval" });
        }
        return approveTicket(tx, fresh, { ...ctx.user!, role: ctx.user!.role });
      });
      await auditLog({
        ctx,
        action: "approve",
        entityType: "ticket",
        entityId: input.id,
        oldValues: { status: existing.status },
        newValues: { status: "confirmed" },
      });
      return result;
    }),

  repairBilling: supervisoryQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const ticket = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const result = await db.transaction(async (tx) =>
        repairTicketCustomerBilling(tx, ticket, ctx.user!.id),
      );

      await auditLog({
        ctx,
        action: "repair_billing",
        entityType: "ticket",
        entityId: input.id,
        newValues: result,
      });

      return result;
    }),

  // =====================================================
  // REJECT TICKET
  // =====================================================

  reject: supervisoryQuery
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }
      if (existing.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket is not pending approval" });
      }

      await db.update(tickets).set({ status: "cancelled", paymentStatus: "cancelled" }).where(eq(tickets.id, input.id));

      try {
        await db.insert(notifications).values({
          tenantId,
          userId: ctx.user!.id,
          title: "Ticket Rejected",
          message: `Ticket ${existing.ticketNumber} has been rejected. ${input.reason || ""}`,
          type: "warning",
          category: "ticket",
          referenceType: "ticket",
          referenceId: existing.id,
        });

        // Notify creator
        if (existing.issuedBy && existing.issuedBy !== ctx.user!.id) {
          await db.insert(notifications).values({
            tenantId,
            userId: existing.issuedBy,
            title: "Ticket Rejected",
            message: `Your ticket ${existing.ticketNumber} has been rejected. ${input.reason || ""}`,
            type: "warning",
            category: "ticket",
            referenceType: "ticket",
            referenceId: existing.id,
          });
        }
      } catch {
        // Non-critical
      }

      await auditLog({
        ctx,
        action: "reject",
        entityType: "ticket",
        entityId: input.id,
        oldValues: { status: existing.status },
        newValues: { status: "cancelled", reason: input.reason },
      });

      return { success: true };
    }),

  // =====================================================
  // RECORD PAYMENT (against ticket invoice — unified AR path)
  // =====================================================

  recordPayment: supervisoryQuery
    .input(z.object({
      id: z.number(),
      amount: z.string().min(1),
      paymentMethod: z.string().default("cash"),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);

      const ticket = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      if (!ticket.customerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Walk-in tickets have no customer account to bill" });
      }
      if (!["confirmed", "completed"].includes(ticket.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved tickets accept payments" });
      }

      const result = await db.transaction(async (tx) => {
        const paymentResult = await recordCustomerPayment(tx, {
          tenantId,
          customerId: ticket.customerId!,
          amount,
          userId: ctx.user!.id,
          ticketId: ticket.id,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          description: input.description,
          source: "ticket",
        });

        const fin = computeTicketFinancials(ticket);
        const newPaid = Number(ticket.paidAmount ?? 0) + amount;
        const paymentStatus = newPaid >= fin.customerCharge ? "paid" : "partial";

        await tx.update(tickets).set({
          paidAmount: newPaid.toFixed(2),
          paymentStatus,
        }).where(eq(tickets.id, ticket.id));

        return paymentResult;
      });

      await auditLog({
        ctx,
        action: "payment",
        entityType: "ticket",
        entityId: input.id,
        newValues: { amount: input.amount, paymentMethod: input.paymentMethod, invoiceId: result.invoiceId },
      });

      return { success: true, ...result };
    }),

  // =====================================================
  // REFUND TICKET
  // =====================================================

  refund: supervisoryQuery
    .input(z.object({
      id: z.number(),
      refundAmount: z.string().min(1),
      penaltyAmount: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const refundAmount = Number(input.refundAmount);
      const penaltyAmount = Number(input.penaltyAmount || "0");

      if (isNaN(refundAmount) || refundAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Refund amount must be positive" });
      }
      if (isNaN(penaltyAmount) || penaltyAmount < 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Penalty amount cannot be negative" });
      }

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }
      if (!["confirmed", "completed"].includes(existing.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only confirmed or completed tickets can be refunded" });
      }

      const fin = computeTicketFinancials(existing);
      const validation = validateTicketRefund(fin, refundAmount, penaltyAmount);
      if (!validation.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
      }

      // Concurrency protection: prevent double-refund
      if (existing.status === "refunded") {
        throw new TRPCError({ code: "CONFLICT", message: "Ticket already refunded" });
      }

      const result = await db.transaction(async (tx) => {
        const fresh = await tx.query.tickets.findFirst({
          where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
        });
        if (!fresh || !["confirmed", "completed"].includes(fresh.status)) {
          throw new TRPCError({ code: "CONFLICT", message: "Ticket cannot be refunded" });
        }
        if (fresh.status === "refunded") {
          throw new TRPCError({ code: "CONFLICT", message: "Ticket already refunded" });
        }
        return refundTicket(tx, fresh, ctx.user!, refundAmount, penaltyAmount, input.reason || "");
      });

      await auditLog({
        ctx,
        action: "refund",
        entityType: "ticket",
        entityId: input.id,
        oldValues: { status: existing.status, totalAmount: existing.totalAmount },
        newValues: { status: "refunded", refundAmount: input.refundAmount, penaltyAmount: input.penaltyAmount, reason: input.reason },
      });

      return result;
    }),

  undoRefund: supervisoryQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      const result = await db.transaction(async (tx) => {
        const fresh = await tx.query.tickets.findFirst({
          where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
        });
        if (!fresh || fresh.status !== "refunded") {
          throw new TRPCError({ code: "CONFLICT", message: "Ticket is not in refunded status" });
        }
        return undoTicketRefund(tx, fresh, ctx.user!.id);
      });

      await auditLog({
        ctx,
        action: "undo_refund",
        entityType: "ticket",
        entityId: input.id,
        oldValues: { status: "refunded" },
        newValues: { status: result.restoredStatus, undoneRefundAmount: result.undoneRefundAmount },
      });

      return result;
    }),

  // =====================================================
  // UPDATE STATUS (simple transitions, approval goes through approve/reject)
  // =====================================================

  updateStatus: supervisoryQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["confirmed", "pending", "cancelled", "refunded", "completed"]),
        paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "cancelled"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      // Redirect pending→confirmed to approve workflow
      if (existing.status === "pending" && input.status === "confirmed") {
        return db.transaction(async (tx) => {
          const fresh = await tx.query.tickets.findFirst({
            where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId)),
          });
          if (!fresh || fresh.status !== "pending") {
            throw new TRPCError({ code: "CONFLICT", message: "Ticket is not pending approval" });
          }
          return approveTicket(tx, fresh, { ...ctx.user!, role: ctx.user!.role });
        });
      }

      const update: Record<string, string> = { status: input.status };
      if (input.paymentStatus) update.paymentStatus = input.paymentStatus;

      await db.update(tickets).set(update).where(eq(tickets.id, input.id));

      return { success: true };
    }),

  // =====================================================
  // AIRLINES
  // =====================================================

  airlines: authedQuery.query(
    async ({ ctx }) => {
      const db = getDb();

      return db.query.airlines.findMany(
        {
          where: and(
            eq(
              airlines.status,
              "active",
            ),

            eq(
              airlines.tenantId,
              ctx.user!
                .tenantId as number,
            ),
          ),

          orderBy: [
            asc(airlines.name),
          ],
        },
      );
    },
  ),

  // =====================================================
  // STATS
  // =====================================================

  stats: authedQuery.query(
    async ({ ctx }) => {
      const db = getDb();

      const tenantId =
        ctx.user!.tenantId as number;

      const statusCounts =
        await db
          .select({
            status:
              tickets.status,

            count:
              sql<number>`count(*)`,
          })
          .from(tickets)
          .where(
            eq(
              tickets.tenantId,
              tenantId,
            ),
          )
          .groupBy(
            tickets.status,
          );

      const revenue =
        await db
          .select({
            total:
              sql<number>`COALESCE(SUM(total_amount), 0)`,
          })
          .from(tickets)
          .where(
            eq(
              tickets.tenantId,
              tenantId,
            ),
          );

      return {
        statusCounts,

        totalRevenue: Number(
          revenue[0]?.total ?? 0,
        ),
      };
    },
  ),

  // =====================================================
  // DELETE
  // =====================================================

  delete: supervisoryQuery
    .input(
      z.object({
        id: z.number(),
      }),
    )

    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const existing = await db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }

      await db.transaction(async (tx) => {
        const fresh = await tx.query.tickets.findFirst({
          where: and(eq(tickets.id, input.id), eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)),
        });
        if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

        if (["confirmed", "completed"].includes(fresh.status)) {
          await reverseApprovedTicket(tx, fresh, ctx.user!.id);
        }

        await tx.update(tickets).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
        }).where(eq(tickets.id, input.id));
      });

      await auditLog({
        ctx,
        action: "delete",
        entityType: "ticket",
        entityId: input.id,
        oldValues: { status: existing.status, ticketNumber: existing.ticketNumber },
      });

      return { success: true };
    }),
});