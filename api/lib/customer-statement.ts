import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  customerLoans,
  customerTransactions,
  customers,
  invoices,
} from "@db/schema";
import type { DbOrTx } from "../queries/connection";
import { getCustomerDepositSummaries } from "./customer-deposit-liability";
import { getCustomerOpenObligations } from "./customer-receive-payment";

export async function buildCustomerStatement(
  db: DbOrTx,
  tenantId: number,
  customerId: number,
) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)),
  });
  if (!customer) {
    return null;
  }

  const transactions = await db
    .select()
    .from(customerTransactions)
    .where(and(eq(customerTransactions.tenantId, tenantId), eq(customerTransactions.customerId, customerId)))
    .orderBy(asc(customerTransactions.createdAt));

  let runningBalance = 0;
  const transactionsWithBalance = transactions.map((tx) => {
    if (tx.type === "receivable") runningBalance += Number(tx.amount);
    else if (["payment", "deposit", "credit", "refund"].includes(tx.type)) {
      runningBalance -= Number(tx.amount);
    }
    return { ...tx, runningBalance };
  });

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.tenantId, tenantId),
      eq(invoices.customerId, customerId),
      isNull(invoices.deletedAt),
    ))
    .orderBy(desc(invoices.issueDate));

  const loanRows = await db
    .select()
    .from(customerLoans)
    .where(and(
      eq(customerLoans.tenantId, tenantId),
      eq(customerLoans.customerId, customerId),
      isNull(customerLoans.deletedAt),
    ))
    .orderBy(desc(customerLoans.loanDate));

  const depositSummaries = await getCustomerDepositSummaries(db, tenantId, customerId);
  const obligations = await getCustomerOpenObligations(db, tenantId, customerId);

  return {
    customer,
    generatedAt: new Date(),
    summary: {
      arBalance: obligations.arBalance,
      totalOwed: obligations.totalOwed,
      depositLiability: obligations.depositLiability,
      loanBalance: obligations.openLoans.reduce((s, l) => s + l.balanceAmount, 0),
      totalRevenue: Number(customer.totalRevenue),
      totalBookings: customer.totalBookings,
    },
    transactions: transactionsWithBalance,
    invoices: invoiceRows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      status: inv.status,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.totalAmount) - Number(inv.paidAmount),
    })),
    loans: loanRows.map((loan) => ({
      id: loan.id,
      loanNumber: loan.loanNumber,
      loanDate: loan.loanDate,
      status: loan.status,
      principalAmount: Number(loan.principalAmount),
      repaidAmount: Number(loan.repaidAmount),
      balanceAmount: Number(loan.balanceAmount),
    })),
    deposits: depositSummaries,
  };
}
