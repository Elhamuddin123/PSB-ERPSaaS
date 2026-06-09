import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import {
  tickets,
  wallets,
  walletTransactions,
  customerTransactions,
  customers,
  invoices,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { reversePostedJournals } from "./journal-reverse";
import { computeTicketFinancials } from "./ticket-approval";
import { getAccountByCode, postWalletCredit, TICKET_COST_CODE } from "./wallet-coa";

function getTicketMetadata(ticket: typeof tickets.$inferSelect) {
  if (!ticket.metadata) return null;
  if (typeof ticket.metadata === "string") {
    try { return JSON.parse(ticket.metadata); } catch { return null; }
  }
  return ticket.metadata as { walletId?: number };
}

/**
 * Reverses all financial effects of a confirmed/completed ticket before soft-delete.
 */
export async function reverseApprovedTicket(
  db: DbOrTx,
  ticket: typeof tickets.$inferSelect,
  userId: number,
) {
  const tenantId = ticket.tenantId;
  const fin = computeTicketFinancials(ticket);

  const metadata = getTicketMetadata(ticket);
  const walletId = metadata?.walletId;
  if (!walletId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket wallet not recorded; cannot reverse" });
  }

  const userWallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!userWallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found" });
  }

  await db.update(wallets)
    .set({ balance: sql`${wallets.balance} + ${fin.walletDeduction.toFixed(2)}` })
    .where(eq(wallets.id, userWallet.id));

  const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, userWallet.id) });

  await db.insert(walletTransactions).values({
    walletId: userWallet.id,
    tenantId,
    type: "credit",
    amount: fin.walletDeduction.toFixed(2),
    balanceAfter: updatedWallet!.balance,
    description: `Ticket reversal: ${ticket.ticketNumber}`,
    referenceType: "ticket",
    referenceId: ticket.id,
    createdBy: userId,
  });

  const ticketCostAccount = await getAccountByCode(db, tenantId, TICKET_COST_CODE);
  if (ticketCostAccount && fin.walletDeduction > 0) {
    await postWalletCredit(
      db,
      userWallet,
      fin.walletDeduction,
      ticketCostAccount.id,
      `Ticket supplier cost reversal: ${ticket.ticketNumber}`,
      "ticket_wallet",
      ticket.id,
      `Wallet credit for ticket reversal ${ticket.ticketNumber}`,
    );
  }

  await reversePostedJournals(db, tenantId, "ticket", ticket.id, "Ticket reversal");
  await reversePostedJournals(db, tenantId, "ticket_wallet", ticket.id, "Ticket wallet reversal");

  if (ticket.customerId) {
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
          description: `Reversal of receivable: ${ticket.ticketNumber}`,
          createdBy: userId,
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
          description: `Reversal of payment: ${ticket.ticketNumber}`,
          createdBy: userId,
        });
      }
    }

    await db.update(customers).set({
      totalBookings: sql`GREATEST(0, ${customers.totalBookings} - 1)`,
      totalRevenue: sql`GREATEST(0, ${customers.totalRevenue} - ${fin.customerCharge.toFixed(2)})`,
    }).where(eq(customers.id, ticket.customerId));

    await db.update(invoices).set({ status: "cancelled" }).where(
      and(eq(invoices.ticketId, ticket.id), eq(invoices.tenantId, tenantId)),
    );
  }

  await db.update(tickets).set({
    status: "cancelled",
    paymentStatus: "cancelled",
  }).where(eq(tickets.id, ticket.id));
}
