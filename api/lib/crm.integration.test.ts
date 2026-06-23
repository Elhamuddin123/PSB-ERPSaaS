/**
 * Integration tests for CRM payment and delete eligibility.
 * Skipped when DATABASE_URL is unset (e.g. CI without MySQL).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "../router";
import { getDb } from "../queries/connection";
import { hashPassword } from "./password";
import { receiveCustomerPayment } from "./customer-receive-payment";
import * as schema from "@db/schema";

const hasDb = Boolean(process.env.DATABASE_URL);
const db = hasDb ? getDb() : null;

describe("CRM payment & delete (integration)", () => {
  let tenantId: number;
  let userId: number;
  let walletId: number;
  let customerId: number;
  let user: schema.User;
  let suiteEnabled = Boolean(process.env.DATABASE_URL);

  beforeAll(async () => {
    if (!db || !suiteEnabled) return;
    try {
      await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);

      const slug = `crm-int-${Date.now()}`;
      tenantId = Number((await db.insert(schema.tenants).values({
        name: "CRM Integration Tenant",
        slug,
        status: "active",
        plan: "enterprise",
      }))[0].insertId);

      userId = Number((await db.insert(schema.users).values({
        unionId: `crm-int-user-${Date.now()}`,
        tenantId,
        email: `crm-int-${Date.now()}@test.com`,
        passwordHash: hashPassword("test123"),
        name: "CRM Integration Tester",
        role: "admin",
        status: "active",
      }))[0].insertId);

      walletId = Number((await db.insert(schema.wallets).values({
        tenantId,
        name: "Integration Wallet",
        balance: "5000.00",
        reservedBalance: "0.00",
        status: "active",
      }))[0].insertId);

      customerId = Number((await db.insert(schema.customers).values({
        tenantId,
        customerCode: `CRM-INT-${Date.now()}`,
        firstName: "Integration",
        lastName: "Customer",
        email: "int-customer@test.com",
        status: "active",
      }))[0].insertId);

      await db.insert(schema.chartOfAccounts).values([
        { tenantId, code: "1000", name: "Cash", type: "asset", currentBalance: "0.00", status: "active" },
        { tenantId, code: "1200", name: "AR", type: "asset", currentBalance: "0.00", status: "active" },
        { tenantId, code: "1250", name: "Customer Loans Receivable", type: "asset", currentBalance: "0.00", status: "active" },
        { tenantId, code: "2100", name: "Customer Deposits", type: "liability", currentBalance: "0.00", status: "active" },
      ]);

      user = (await db.query.users.findFirst({ where: eq(schema.users.id, userId) }))!;
    } catch {
      suiteEnabled = false;
    }
  });

  afterAll(async () => {
    if (!db || !suiteEnabled) return;
    await cleanupTenantData();
    await db.delete(schema.customers).where(eq(schema.customers.tenantId, tenantId));
    await db.delete(schema.wallets).where(eq(schema.wallets.tenantId, tenantId));
    await db.delete(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.tenantId, tenantId));
    await db.delete(schema.users).where(eq(schema.users.tenantId, tenantId));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  function createCaller() {
    return appRouter.createCaller({
      req: new Request("http://localhost/api/trpc"),
      resHeaders: new Headers(),
      user,
    });
  }

  async function cleanupTenantData() {
    const journals = await db!.select({ id: schema.journalEntries.id })
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.tenantId, tenantId));
    const journalIds = journals.map((j) => j.id);
    if (journalIds.length > 0) {
      await db!.delete(schema.ledgerEntries).where(inArray(schema.ledgerEntries.journalEntryId, journalIds));
      await db!.delete(schema.journalEntryLines).where(inArray(schema.journalEntryLines.journalEntryId, journalIds));
      await db!.delete(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
    }
    await db!.delete(schema.customerLoanRepayments).where(eq(schema.customerLoanRepayments.tenantId, tenantId));
    await db!.delete(schema.customerLoans).where(eq(schema.customerLoans.tenantId, tenantId));
    await db!.delete(schema.customerTransactions).where(eq(schema.customerTransactions.tenantId, tenantId));
    await db!.delete(schema.walletTransactions).where(eq(schema.walletTransactions.tenantId, tenantId));

    const invoices = await db!.select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.tenantId, tenantId));
    const invoiceIds = invoices.map((i) => i.id);
    if (invoiceIds.length > 0) {
      await db!.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invoiceIds));
    }
    await db!.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
    await db!.delete(schema.deposits).where(eq(schema.deposits.tenantId, tenantId));
    await db!.delete(schema.tickets).where(eq(schema.tickets.tenantId, tenantId));
  }

  afterEach(async () => {
    if (!suiteEnabled) return;
    await cleanupTenantData();
  });

  it("receiveCustomerPayment auto-allocates to open invoice and marks it paid", async ({ skip }) => {
    if (!suiteEnabled) return skip();
    const invoiceId = Number((await db!.insert(schema.invoices).values({
      tenantId,
      customerId,
      invoiceNumber: `INV-INT-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(),
      subtotal: "150.00",
      taxAmount: "0.00",
      totalAmount: "150.00",
      paidAmount: "0.00",
      status: "sent",
    }))[0].insertId);

    await db!.insert(schema.customerTransactions).values({
      tenantId,
      customerId,
      invoiceId,
      type: "receivable",
      amount: "150.00",
      balance: "150.00",
      description: "Test receivable",
      createdBy: userId,
    });

    const result = await receiveCustomerPayment(db!, {
      tenantId,
      customerId,
      amount: 150,
      userId,
      paymentMethod: "cash",
      autoAllocate: true,
    });

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([{ type: "invoice", invoiceId, amount: 150 }]);

    const invoice = await db!.query.invoices.findFirst({ where: eq(schema.invoices.id, invoiceId) });
    expect(invoice!.status).toBe("paid");
    expect(Number(invoice!.paidAmount)).toBe(150);
  });

  it("receiveCustomerPayment auto-allocates remainder to approved deposit top-up", async ({ skip }) => {
    if (!suiteEnabled) return skip();
    const depositId = Number((await db!.insert(schema.deposits).values({
      tenantId,
      customerId,
      walletId,
      depositCode: `DEP-INT-${Date.now()}`,
      amount: "100.00",
      paymentMethod: "cash",
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
      createdBy: userId,
    }))[0].insertId);

    const walletBefore = await db!.query.wallets.findFirst({ where: eq(schema.wallets.id, walletId) });

    const result = await receiveCustomerPayment(db!, {
      tenantId,
      customerId,
      amount: 75,
      userId,
      paymentMethod: "cash",
      autoAllocate: true,
    });

    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([{ type: "deposit", depositId, amount: 75 }]);

    const depositAfter = await db!.query.deposits.findFirst({ where: eq(schema.deposits.id, depositId) });
    expect(Number(depositAfter!.amount)).toBe(175);

    const walletAfter = await db!.query.wallets.findFirst({ where: eq(schema.wallets.id, walletId) });
    expect(Number(walletAfter!.balance)).toBe(Number(walletBefore!.balance) + 75);
  });

  it("customerDeleteCheck blocks when deposit liability or pending tickets exist", async ({ skip }) => {
    if (!suiteEnabled) return skip();
    const caller = createCaller();

    const clearCheck = await caller.crm.customerDeleteCheck({ id: customerId });
    expect(clearCheck.canDelete).toBe(true);

    const pendingTicketId = Number((await db!.insert(schema.tickets).values({
      tenantId,
      ticketNumber: `TKT-PEND-${Date.now()}`,
      routeFrom: "JFK",
      routeTo: "LHR",
      baseFare: "100.00",
      taxAmount: "0.00",
      totalAmount: "100.00",
      commissionAmount: "0.00",
      netPayable: "100.00",
      status: "pending",
      paymentStatus: "pending",
      customerId,
      issuedBy: userId,
    }))[0].insertId);

    const pendingCheck = await caller.crm.customerDeleteCheck({ id: customerId });
    expect(pendingCheck.canDelete).toBe(false);
    expect(pendingCheck.blockReason).toContain("pending ticket");

    await db!.delete(schema.tickets).where(eq(schema.tickets.id, pendingTicketId));

    await db!.insert(schema.deposits).values({
      tenantId,
      customerId,
      walletId,
      depositCode: `DEP-BLOCK-${Date.now()}`,
      amount: "200.00",
      paymentMethod: "cash",
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
      createdBy: userId,
    });

    const depositCheck = await caller.crm.customerDeleteCheck({ id: customerId });
    expect(depositCheck.canDelete).toBe(false);
    expect(depositCheck.depositLiability).toBeGreaterThan(0);
    expect(depositCheck.blockReason).toContain("deposit");
  });
});
