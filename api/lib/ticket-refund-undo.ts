import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, sql } from "drizzle-orm";
import {
  customerTransactions,
  customers,
  invoices,
  journalEntries,
  journalEntryLines,
  tickets,
  walletTransactions,
  wallets,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { reversePostedJournals } from "./journal-reverse";
import { postLedgerLines } from "./ledger-posting";
import { computeTicketFinancials } from "./ticket-approval";

export interface TicketRefundSnapshot {
  refundAmount: number;
  penaltyAmount: number;
  totalReversal: number;
  isFullCustomerRefund: boolean;
  walletCredit: number;
  priorStatus: "confirmed" | "completed";
  priorPaymentStatus: "pending" | "partial" | "paid" | "refunded" | "cancelled";
  refundedAt?: string;
  legacy?: boolean;
}

function getTicketMetadata(ticket: typeof tickets.$inferSelect) {
  if (!ticket.metadata) return null;
  if (typeof ticket.metadata === "string") {
    try { return JSON.parse(ticket.metadata) as Record<string, unknown>; } catch { return null; }
  }
  return ticket.metadata as Record<string, unknown>;
}

async function getCustomerRunningBalance(db: DbOrTx, tenantId: number, customerId: number) {
  const balanceResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount WHEN type IN ('payment','deposit','credit','refund') THEN -amount ELSE 0 END), 0)`,
    })
    .from(customerTransactions)
    .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, customerId)));
  return Number(balanceResult[0]?.total ?? 0);
}

/** Reverse a single posted journal by id (for legacy partial refunds under referenceType ticket). */
async function reverseSingleJournal(
  db: DbOrTx,
  tenantId: number,
  journalId: number,
  labelPrefix: string,
  referenceType: string,
  referenceId: number,
) {
  const original = await db.query.journalEntries.findFirst({
    where: and(eq(journalEntries.id, journalId), eq(journalEntries.tenantId, tenantId), eq(journalEntries.status, "posted")),
  });
  if (!original) return false;

  const originalLines = await db.select().from(journalEntryLines).where(
    eq(journalEntryLines.journalEntryId, original.id),
  );
  const reversalLines = originalLines.map((line) => ({
    accountId: line.accountId,
    description: `${labelPrefix}: ${line.description || ""}`,
    debit: line.credit,
    credit: line.debit,
  }));
  if (reversalLines.length === 0) return false;

  const totalDebit = reversalLines.reduce((s, l) => s + Number(l.debit), 0);
  const reversalResult = await db.insert(journalEntries).values({
    tenantId,
    entryNumber: `JE-UND-${Date.now()}`,
    date: new Date(),
    description: `${labelPrefix}: ${original.description}`,
    referenceType,
    referenceId,
    status: "posted",
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalDebit.toFixed(2),
  });
  const reversalId = Number(reversalResult[0].insertId ?? 0);
  if (reversalId > 0) {
    await db.insert(journalEntryLines).values(
      reversalLines.map((line) => ({ journalEntryId: reversalId, ...line })),
    );
    await postLedgerLines(db, {
      tenantId,
      journalEntryId: reversalId,
      date: new Date(),
      referenceType,
      referenceId,
      lines: reversalLines,
    });
  }
  await db.update(journalEntries).set({ status: "reversed" }).where(eq(journalEntries.id, original.id));
  return true;
}

/** Re-post ledger for original sale journals marked reversed (after undoing a full refund). */
async function repostOriginalSaleJournals(db: DbOrTx, tenantId: number, ticketId: number) {
  for (const refType of ["ticket", "ticket_wallet"] as const) {
    const reversed = await db.select().from(journalEntries).where(and(
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.referenceType, refType),
      eq(journalEntries.referenceId, ticketId),
      eq(journalEntries.status, "reversed"),
    ));
    for (const original of reversed) {
      const desc = original.description ?? "";
      if (desc.includes("Ticket refund") || desc.includes("Undo ticket refund")) continue;

      const lines = await db.select().from(journalEntryLines).where(
        eq(journalEntryLines.journalEntryId, original.id),
      );
      if (lines.length === 0) continue;

      const ledgerLines = lines.map((line) => ({
        accountId: line.accountId,
        description: line.description || "",
        debit: line.debit,
        credit: line.credit,
      }));

      await postLedgerLines(db, {
        tenantId,
        journalEntryId: original.id,
        date: new Date(),
        referenceType: refType,
        referenceId: ticketId,
        lines: ledgerLines,
      });
      await db.update(journalEntries).set({ status: "posted" }).where(eq(journalEntries.id, original.id));
    }
  }
}

async function reverseLegacyPartialRefundJournals(db: DbOrTx, tenantId: number, ticketId: number) {
  const partialEntries = await db.select().from(journalEntries).where(
    and(
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.referenceType, "ticket"),
      eq(journalEntries.referenceId, ticketId),
      eq(journalEntries.status, "posted"),
      like(journalEntries.description, "%Partial Refund%"),
    ),
  );
  for (const entry of partialEntries) {
    await reverseSingleJournal(db, tenantId, entry.id, "Undo ticket refund", "ticket_refund", ticketId);
  }
}

export async function resolveTicketRefundSnapshot(
  db: DbOrTx,
  ticket: typeof tickets.$inferSelect,
): Promise<TicketRefundSnapshot | null> {
  const metadata = getTicketMetadata(ticket);
  const stored = metadata?.lastRefund as TicketRefundSnapshot | undefined;
  if (stored?.refundAmount != null) return stored;

  if (ticket.status !== "refunded") return null;

  const refundTx = await db.query.customerTransactions.findFirst({
    where: and(
      eq(customerTransactions.tenantId, ticket.tenantId),
      eq(customerTransactions.ticketId, ticket.id),
      eq(customerTransactions.type, "refund"),
    ),
    orderBy: [desc(customerTransactions.createdAt)],
  });

  const walletTx = await db.query.walletTransactions.findFirst({
    where: and(
      eq(walletTransactions.tenantId, ticket.tenantId),
      eq(walletTransactions.referenceType, "ticket"),
      eq(walletTransactions.referenceId, ticket.id),
      eq(walletTransactions.type, "refund"),
    ),
    orderBy: [desc(walletTransactions.createdAt)],
  });

  if (!refundTx && !walletTx) return null;

  const fin = computeTicketFinancials(ticket);
  const refundAmount = Number(refundTx?.amount ?? walletTx?.amount ?? 0);
  const walletCredit = Number(walletTx?.amount ?? 0);
  const totalReversal = refundAmount;

  const reversedSaleCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(and(
      eq(journalEntries.tenantId, ticket.tenantId),
      eq(journalEntries.referenceType, "ticket"),
      eq(journalEntries.referenceId, ticket.id),
      eq(journalEntries.status, "reversed"),
    ));

  const partialRefundPosted = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.tenantId, ticket.tenantId),
      eq(journalEntries.referenceId, ticket.id),
      eq(journalEntries.status, "posted"),
      like(journalEntries.description, "%Partial Refund%"),
    ),
  });

  const hadFullSaleReversal = Number(reversedSaleCount[0]?.count ?? 0) > 0 && !partialRefundPosted;

  return {
    refundAmount,
    penaltyAmount: 0,
    totalReversal,
    isFullCustomerRefund:
      Math.abs(totalReversal - fin.customerCharge) < 0.01
      || hadFullSaleReversal,
    walletCredit,
    priorStatus: "confirmed",
    priorPaymentStatus: fin.paidAmount >= fin.customerCharge ? "paid" : fin.paidAmount > 0 ? "partial" : "pending",
    legacy: true,
  };
}

async function undoRefundCustomerLedger(
  db: DbOrTx,
  params: {
    tenantId: number;
    ticket: typeof tickets.$inferSelect;
    userId: number;
    snapshot: TicketRefundSnapshot;
  },
) {
  if (!params.ticket.customerId) return;

  const ticketTx = await db.select().from(customerTransactions).where(
    and(
      eq(customerTransactions.tenantId, params.tenantId),
      eq(customerTransactions.ticketId, params.ticket.id),
    ),
  );

  let runningBalance = await getCustomerRunningBalance(db, params.tenantId, params.ticket.customerId);

  if (params.snapshot.isFullCustomerRefund) {
    for (const tx of ticketTx) {
      if (tx.description?.includes("Refund reversal of receivable")) {
        runningBalance += Number(tx.amount);
        await db.insert(customerTransactions).values({
          tenantId: params.tenantId,
          customerId: params.ticket.customerId,
          ticketId: params.ticket.id,
          type: "receivable",
          amount: tx.amount,
          balance: runningBalance.toFixed(2),
          description: `Undo refund — restore receivable: ${params.ticket.ticketNumber}`,
          createdBy: params.userId,
        });
      } else if (tx.description?.includes("Refund reversal of payment")) {
        runningBalance = Math.max(0, runningBalance - Number(tx.amount));
        await db.insert(customerTransactions).values({
          tenantId: params.tenantId,
          customerId: params.ticket.customerId,
          ticketId: params.ticket.id,
          type: "payment",
          amount: tx.amount,
          balance: runningBalance.toFixed(2),
          description: `Undo refund — restore payment: ${params.ticket.ticketNumber}`,
          createdBy: params.userId,
        });
      }
    }
  }

  for (const tx of ticketTx.filter((row) => row.type === "refund")) {
    runningBalance += Number(tx.amount);
    await db.insert(customerTransactions).values({
      tenantId: params.tenantId,
      customerId: params.ticket.customerId,
      ticketId: params.ticket.id,
      type: "receivable",
      amount: tx.amount,
      balance: runningBalance.toFixed(2),
      description: `Undo mistaken ticket refund: ${params.ticket.ticketNumber}`,
      createdBy: params.userId,
    });
  }
}

/**
 * Reverses a ticket refund so the ticket can be corrected and re-refunded if needed.
 * Restores wallet, GL, customer ledger, invoice, and ticket status.
 */
export async function undoTicketRefund(
  db: DbOrTx,
  ticket: typeof tickets.$inferSelect,
  userId: number,
) {
  const tenantId = ticket.tenantId;

  if (ticket.status !== "refunded") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only refunded tickets can have their refund undone" });
  }

  const snapshot = await resolveTicketRefundSnapshot(db, ticket);
  if (!snapshot) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No refund record found for this ticket — cannot undo automatically",
    });
  }

  const metadata = getTicketMetadata(ticket) ?? {};
  const walletId = (metadata.walletId as number | undefined) ?? null;
  if (!walletId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket wallet not recorded" });
  }

  const wallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, walletId), eq(wallets.tenantId, tenantId)),
  });
  if (!wallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found" });
  }

  if (Number(wallet.balance) + Number(wallet.reservedBalance ?? 0) < snapshot.walletCredit - 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient wallet balance to undo refund (need $${snapshot.walletCredit.toFixed(2)} in wallet)`,
    });
  }

  await db.update(wallets)
    .set({ balance: sql`${wallets.balance} - ${snapshot.walletCredit.toFixed(2)}` })
    .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${snapshot.walletCredit.toFixed(2)}`));

  const updatedWallet = await db.query.wallets.findFirst({ where: eq(wallets.id, wallet.id) });
  await db.insert(walletTransactions).values({
    walletId: wallet.id,
    tenantId,
    type: "debit",
    amount: snapshot.walletCredit.toFixed(2),
    balanceAfter: updatedWallet!.balance,
    description: `Undo ticket refund: ${ticket.ticketNumber}`,
    referenceType: "ticket",
    referenceId: ticket.id,
    createdBy: userId,
  });

  if (snapshot.isFullCustomerRefund) {
    await reversePostedJournals(db, tenantId, "ticket", ticket.id, "Undo ticket refund");
    await reversePostedJournals(db, tenantId, "ticket_wallet", ticket.id, "Undo ticket refund wallet");
    await repostOriginalSaleJournals(db, tenantId, ticket.id);
  } else {
    let reversed = await reversePostedJournals(db, tenantId, "ticket_refund", ticket.id, "Undo ticket refund");
    reversed += await reversePostedJournals(db, tenantId, "ticket_refund_wallet", ticket.id, "Undo ticket refund wallet");
    if (reversed === 0 && snapshot.legacy) {
      await reverseLegacyPartialRefundJournals(db, tenantId, ticket.id);
    }
  }

  await undoRefundCustomerLedger(db, { tenantId, ticket, userId, snapshot });

  const fin = computeTicketFinancials(ticket);

  if (ticket.customerId) {
    await db.update(customers).set({
      totalBookings: sql`${customers.totalBookings} + 1`,
      totalRevenue: sql`${customers.totalRevenue} + ${snapshot.totalReversal.toFixed(2)}`,
    }).where(eq(customers.id, ticket.customerId));
  }

  try {
    const invoiceStatus = fin.paymentStatus === "paid"
      ? "paid"
      : fin.paymentStatus === "partial"
        ? "partial"
        : "sent";
    await db.update(invoices).set({ status: invoiceStatus as "sent" | "partial" | "paid" | "cancelled" }).where(
      and(eq(invoices.ticketId, ticket.id), eq(invoices.tenantId, tenantId)),
    );
  } catch { /* non-critical */ }

  const { lastRefund: _removed, ...restMetadata } = metadata;
  await db.update(tickets).set({
    status: snapshot.priorStatus,
    paymentStatus: snapshot.priorPaymentStatus,
    metadata: Object.keys(restMetadata).length > 0 ? restMetadata : null,
  }).where(eq(tickets.id, ticket.id));

  return {
    success: true,
    restoredStatus: snapshot.priorStatus,
    undoneRefundAmount: snapshot.refundAmount,
  };
}

export function buildTicketRefundSnapshot(
  ticket: typeof tickets.$inferSelect,
  fin: ReturnType<typeof computeTicketFinancials>,
  params: {
    refundAmount: number;
    penaltyAmount: number;
    totalReversal: number;
    isFullCustomerRefund: boolean;
    walletCredit: number;
  },
): TicketRefundSnapshot {
  return {
    refundAmount: params.refundAmount,
    penaltyAmount: params.penaltyAmount,
    totalReversal: params.totalReversal,
    isFullCustomerRefund: params.isFullCustomerRefund,
    walletCredit: params.walletCredit,
    priorStatus: ticket.status as "confirmed" | "completed",
    priorPaymentStatus: fin.paymentStatus,
    refundedAt: new Date().toISOString(),
  };
}
