import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, supervisoryQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  customerLoans,
  customerLoanRepayments,
  customers,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@db/schema";
import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";
import type { DbOrTx } from "./queries/connection";
import { nextNumber } from "./lib/numbering";
import { postLedgerLines } from "./lib/ledger-posting";
import { auditLog } from "./lib/audit";
import { reversePostedJournals } from "./lib/journal-reverse";

async function getOrCreateLoanReceivableAccount(db: DbOrTx, tenantId: number) {
  let account = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1250"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  if (!account) {
    const result = await db.insert(chartOfAccounts).values({
      tenantId,
      code: "1250",
      name: "Customer Loans Receivable",
      type: "asset",
      subtype: "current_asset",
      currentBalance: "0.00",
      status: "active",
      currency: "USD",
    });
    account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, Number(result[0].insertId)),
    });
  }
  return account;
}

export const loanRouter = createRouter({
  list: authedQuery
    .input(z.object({
      customerId: z.number().optional(),
      status: z.enum(["active", "repaid", "written_off", "all"]).default("all"),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const conditions = [eq(customerLoans.tenantId, tenantId), isNull(customerLoans.deletedAt)];
      if (input?.customerId) conditions.push(eq(customerLoans.customerId, input.customerId));
      if (input?.status && input.status !== "all") conditions.push(eq(customerLoans.status, input.status));
      const where = and(...conditions);

      const items = await db.select().from(customerLoans).where(where)
        .limit(input?.limit ?? 20)
        .offset(((input?.page ?? 1) - 1) * (input?.limit ?? 20))
        .orderBy(desc(customerLoans.createdAt));

      const customerIds = [...new Set(items.map((l) => l.customerId))];
      const customerList = customerIds.length > 0
        ? await db.select().from(customers).where(and(eq(customers.tenantId, tenantId), inArray(customers.id, customerIds)))
        : [];
      const customerMap = new Map(customerList.map((c) => [c.id, c]));

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(customerLoans).where(where);

      return {
        items: items.map((l) => ({ ...l, customer: customerMap.get(l.customerId) || null })),
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const loan = await db.query.customerLoans.findFirst({
        where: and(eq(customerLoans.id, input.id), eq(customerLoans.tenantId, tenantId), isNull(customerLoans.deletedAt)),
      });
      if (!loan) return null;

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, loan.customerId), eq(customers.tenantId, tenantId)),
      });

      const repayments = await db.select().from(customerLoanRepayments)
        .where(eq(customerLoanRepayments.loanId, loan.id))
        .orderBy(desc(customerLoanRepayments.createdAt));

      return { loan, customer, repayments };
    }),

  create: supervisoryQuery
    .input(z.object({
      customerId: z.number(),
      amount: z.string().min(1),
      loanDate: z.string(),
      dueDate: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      paymentMethod: z.string().default("cash"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Loan amount must be positive" });
      }

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)),
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const loanNumber = await nextNumber(db, tenantId, "LOAN");

      await db.transaction(async (tx) => {
        const loanResult = await tx.insert(customerLoans).values({
          tenantId,
          customerId: input.customerId,
          loanNumber,
          principalAmount: amount.toFixed(2),
          repaidAmount: "0.00",
          balanceAmount: amount.toFixed(2),
          status: "active",
          loanDate: new Date(input.loanDate),
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          description: input.description,
          notes: input.notes,
          createdBy: ctx.user!.id,
        });
        const loanId = Number(loanResult[0].insertId);

        const cashAccount = await tx.query.chartOfAccounts.findFirst({
          where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
        });
        const loanReceivableAccount = await getOrCreateLoanReceivableAccount(tx, tenantId);

        if (cashAccount && loanReceivableAccount) {
          const journalResult = await tx.insert(journalEntries).values({
            tenantId,
            entryNumber: `JE-${Date.now()}`,
            date: new Date(),
            description: `Cash loan to ${customer.firstName} ${customer.lastName} (${loanNumber})`,
            referenceType: "loan",
            referenceId: loanId,
            status: "posted",
            totalDebit: amount.toFixed(2),
            totalCredit: amount.toFixed(2),
          });
          const journalId = Number(journalResult[0].insertId ?? 0);
          if (journalId > 0) {
            const lines = [
              { accountId: loanReceivableAccount.id, description: "Customer loan receivable", debit: amount.toFixed(2), credit: "0.00" },
              { accountId: cashAccount.id, description: "Cash disbursed", debit: "0.00", credit: amount.toFixed(2) },
            ];
            await tx.insert(journalEntryLines).values(lines.map((l) => ({ journalEntryId: journalId, ...l })));
            await postLedgerLines(tx, {
              tenantId,
              journalEntryId: journalId,
              date: new Date(),
              referenceType: "loan",
              referenceId: loanId,
              lines,
            });
          }
        }
      });

      await auditLog({
        ctx,
        action: "create",
        entityType: "loan",
        entityId: 0,
        newValues: { loanNumber, customerId: input.customerId, amount: input.amount },
      });

      return { success: true, loanNumber };
    }),

  recordRepayment: supervisoryQuery
    .input(z.object({
      loanId: z.number(),
      amount: z.string().min(1),
      paymentMethod: z.string().default("cash"),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;
      const amount = Number(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Repayment amount must be positive" });
      }

      const loan = await db.query.customerLoans.findFirst({
        where: and(eq(customerLoans.id, input.loanId), eq(customerLoans.tenantId, tenantId), isNull(customerLoans.deletedAt)),
      });
      if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
      if (loan.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Loan is not active" });
      }
      if (amount > Number(loan.balanceAmount)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Repayment exceeds loan balance" });
      }

      const customer = await db.query.customers.findFirst({
        where: and(eq(customers.id, loan.customerId), eq(customers.tenantId, tenantId)),
      });

      await db.transaction(async (tx) => {
        await tx.insert(customerLoanRepayments).values({
          tenantId,
          loanId: loan.id,
          amount: amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          createdBy: ctx.user!.id,
        });

        const newRepaid = Number(loan.repaidAmount) + amount;
        const newBalance = Number(loan.balanceAmount) - amount;
        const newStatus = newBalance <= 0 ? "repaid" : "active";

        await tx.update(customerLoans).set({
          repaidAmount: newRepaid.toFixed(2),
          balanceAmount: newBalance.toFixed(2),
          status: newStatus as "active" | "repaid",
        }).where(eq(customerLoans.id, loan.id));

        const cashAccount = await tx.query.chartOfAccounts.findFirst({
          where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
        });
        const loanReceivableAccount = await getOrCreateLoanReceivableAccount(tx, tenantId);

        if (cashAccount && loanReceivableAccount) {
          const journalResult = await tx.insert(journalEntries).values({
            tenantId,
            entryNumber: `JE-${Date.now()}`,
            date: new Date(),
            description: `Loan repayment from ${customer?.firstName} ${customer?.lastName} (${loan.loanNumber})`,
            referenceType: "loan",
            referenceId: loan.id,
            status: "posted",
            totalDebit: amount.toFixed(2),
            totalCredit: amount.toFixed(2),
          });
          const journalId = Number(journalResult[0].insertId ?? 0);
          if (journalId > 0) {
            const lines = [
              { accountId: cashAccount.id, description: "Cash received", debit: amount.toFixed(2), credit: "0.00" },
              { accountId: loanReceivableAccount.id, description: "Loan receivable reduction", debit: "0.00", credit: amount.toFixed(2) },
            ];
            await tx.insert(journalEntryLines).values(lines.map((l) => ({ journalEntryId: journalId, ...l })));
            await postLedgerLines(tx, {
              tenantId,
              journalEntryId: journalId,
              date: new Date(),
              referenceType: "loan",
              referenceId: loan.id,
              lines,
            });
          }
        }
      });

      return { success: true };
    }),

  delete: supervisoryQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tenantId = ctx.user!.tenantId as number;

      const loan = await db.query.customerLoans.findFirst({
        where: and(eq(customerLoans.id, input.id), eq(customerLoans.tenantId, tenantId)),
      });
      if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
      if (loan.status === "active" && Number(loan.balanceAmount) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete loan with outstanding balance. Collect repayment first." });
      }

      await db.transaction(async (tx) => {
        await reversePostedJournals(tx, tenantId, "loan", loan.id, "Loan reversal");
        await tx.update(customerLoans).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
        }).where(eq(customerLoans.id, input.id));
      });

      await auditLog({
        ctx,
        action: "delete",
        entityType: "loan",
        entityId: input.id,
        oldValues: { loanNumber: loan.loanNumber, principalAmount: loan.principalAmount },
      });

      return { success: true };
    }),

  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.user!.tenantId as number;
    const active = await db.select({
      count: sql<number>`count(*)`,
      total: sql<number>`COALESCE(SUM(balance_amount), 0)`,
    }).from(customerLoans).where(and(
      eq(customerLoans.tenantId, tenantId),
      eq(customerLoans.status, "active"),
      isNull(customerLoans.deletedAt),
    ));
    return {
      activeLoans: Number(active[0]?.count ?? 0),
      outstandingBalance: Number(active[0]?.total ?? 0),
    };
  }),
});
