import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  tickets,
  ticketPassengers,
  airlines,
  wallets,
  chartOfAccounts,
  notifications,
  users,
} from "@db/schema";
import type { TrpcContext } from "../context";
import type { DbOrTx } from "../queries/connection";
import { nextNumber } from "./numbering";
import { auditLog } from "./audit";

export type TicketPassengerInput = {
  firstName: string;
  lastName: string;
  passengerType?: "adult" | "child" | "infant";
  passportNumber?: string;
  nationality?: string;
  seatNumber?: string;
};

export type CreateTicketInput = {
  ticketNumber?: string;
  pnrCode?: string;
  airlineId?: number;
  customerId?: number;
  walletId: number;
  travelDate?: string;
  returnDate?: string;
  routeFrom?: string;
  routeTo?: string;
  tripType: "one_way" | "round_trip" | "multi_city";
  class: "economy" | "premium_economy" | "business" | "first";
  baseFare: string;
  taxAmount: string;
  totalAmount: string;
  commissionAmount: string;
  discountAmount?: string;
  paidAmount?: string;
  supplierCost?: string;
  expense?: string;
  netPayable: string;
  notes?: string;
  passengers?: TicketPassengerInput[];
};

export async function validateTicketCreatePrerequisites(
  db: DbOrTx,
  tenantId: number,
  walletId: number,
  airlineId?: number,
) {
  const userWallet = await db.query.wallets.findFirst({
    where: and(
      eq(wallets.id, walletId),
      eq(wallets.tenantId, tenantId),
      eq(wallets.status, "active"),
    ),
  });
  if (!userWallet) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet not found or inactive" });
  }

  const cashAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "1000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  const revenueAccount = await db.query.chartOfAccounts.findFirst({
    where: and(eq(chartOfAccounts.code, "4000"), eq(chartOfAccounts.tenantId, tenantId)),
  });
  if (!cashAccount || !revenueAccount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Accounting accounts missing" });
  }

  if (airlineId) {
    const airline = await db.query.airlines.findFirst({
      where: and(eq(airlines.id, airlineId), eq(airlines.tenantId, tenantId)),
    });
    if (!airline) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Airline not found" });
    }
  }
}

export async function createPendingTicket(
  db: DbOrTx,
  ctx: TrpcContext,
  input: CreateTicketInput,
): Promise<{ id: number; ticketNumber: string }> {
  const tenantId = ctx.user!.tenantId as number;
  const { passengers, walletId, travelDate, returnDate, ...ticketData } = input;

  let ticketNumber = input.ticketNumber?.trim();
  if (!ticketNumber) {
    ticketNumber = await nextNumber(db, tenantId, "TCK");
  }

  const ticketPrice = Number(ticketData.totalAmount || "0");
  const discountAmount = Number(ticketData.discountAmount || "0");
  const commissionAmount = Number(ticketData.commissionAmount || "0");
  const paidAmount = Number(ticketData.paidAmount || "0");
  const customerCharge = ticketPrice - discountAmount;
  const netPayable = ticketPrice - commissionAmount;

  if (discountAmount > commissionAmount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Customer discount cannot exceed airline commission" });
  }

  let paymentStatus: "pending" | "partial" | "paid" = "pending";
  if (paidAmount >= customerCharge && customerCharge > 0) paymentStatus = "paid";
  else if (paidAmount > 0) paymentStatus = "partial";

  const routeFrom = (ticketData.routeFrom?.trim() || "TBD").slice(0, 10);
  const routeTo = (ticketData.routeTo?.trim() || "TBD").slice(0, 10);

  const result = await db.insert(tickets).values({
    ...ticketData,
    airlineId: ticketData.airlineId ?? undefined,
    customerId: ticketData.customerId ?? undefined,
    discountAmount: discountAmount.toFixed(2),
    netPayable: netPayable.toFixed(2),
    routeFrom,
    routeTo,
    ticketNumber,
    tenantId,
    travelDate: travelDate ? new Date(travelDate) : undefined,
    returnDate: returnDate ? new Date(returnDate) : undefined,
    status: "pending",
    paymentStatus,
    issuedBy: ctx.user!.id,
    metadata: { walletId },
  });

  const ticketId = Number(result[0].insertId);

  if (passengers && passengers.length > 0) {
    await db.insert(ticketPassengers).values(
      passengers.map((p) => ({
        ...p,
        passengerType: p.passengerType ?? "adult",
        ticketId,
      })),
    );
  }

  try {
    await db.insert(notifications).values({
      tenantId,
      userId: ctx.user!.id,
      title: "New Ticket Pending Approval",
      message: `Ticket ${ticketNumber} has been created and is awaiting approval.`,
      type: "info",
      category: "ticket",
      referenceType: "ticket",
      referenceId: ticketId,
    });

    const admins = await db.select({ id: users.id }).from(users).where(
      and(eq(users.tenantId, tenantId), inArray(users.role, ["admin", "accountant", "super_admin"])),
    );
    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map((u) => ({
          tenantId,
          userId: u.id,
          title: "New Ticket Pending Approval",
          message: `Ticket ${ticketNumber} has been created and is awaiting approval.`,
          type: "info" as const,
          category: "ticket" as const,
          referenceType: "ticket" as const,
          referenceId: ticketId,
        })),
      );
    }
  } catch {
    // Non-critical
  }

  await auditLog({
    ctx,
    action: "create",
    entityType: "ticket",
    entityId: ticketId,
    newValues: { ticketNumber, status: "pending", amount: input.totalAmount },
  });

  return { id: ticketId, ticketNumber };
}
