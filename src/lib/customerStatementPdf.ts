import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type StatementData = {
  customer: {
    firstName: string;
    lastName: string;
    customerCode: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  generatedAt: Date | string;
  summary: {
    arBalance: number;
    totalOwed: number;
    depositLiability: number;
    loanBalance: number;
    totalRevenue: number;
    totalBookings: number;
  };
  transactions: Array<{
    createdAt: Date | string;
    type: string;
    amount: string | number;
    description?: string | null;
    referenceNumber?: string | null;
    runningBalance: number;
  }>;
  invoices: Array<{
    invoiceNumber: string;
    issueDate: Date | string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
  }>;
  loans: Array<{
    loanNumber: string;
    loanDate: Date | string;
    status: string;
    principalAmount: number;
    balanceAmount: number;
  }>;
  deposits: Array<{
    depositCode: string;
    amount: number;
    remaining: number;
  }>;
};

function fmtDate(value: Date | string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function fmtMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateCustomerStatementPDF(data: StatementData) {
  const doc = new jsPDF();
  const customerName = `${data.customer.firstName} ${data.customer.lastName}`;

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("CUSTOMER STATEMENT", 14, 18);
  doc.setFontSize(10);
  doc.text(data.customer.customerCode, 14, 26);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.text(customerName, 14, 42);
  if (data.customer.company) doc.text(data.customer.company, 14, 48);
  if (data.customer.email) doc.text(data.customer.email, 14, 54);
  if (data.customer.phone) doc.text(String(data.customer.phone), 120, 42);
  doc.setFontSize(9);
  doc.text(`Generated: ${fmtDate(data.generatedAt)}`, 120, 48);

  let y = 62;
  autoTable(doc, {
    startY: y,
    head: [["Summary", "Amount"]],
    body: [
      ["Ticket balance due (AR)", fmtMoney(data.summary.arBalance)],
      ["Open invoice / loan owed", fmtMoney(data.summary.totalOwed)],
      ["Outstanding loan balance", fmtMoney(data.summary.loanBalance)],
      ["Deposit liability held", fmtMoney(data.summary.depositLiability)],
      ["Lifetime revenue", fmtMoney(data.summary.totalRevenue)],
      ["Total bookings", String(data.summary.totalBookings)],
    ],
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9 },
    theme: "grid",
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;

  if (data.invoices.length > 0) {
    doc.setFontSize(11);
    doc.text("Invoices", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Invoice #", "Date", "Status", "Total", "Paid", "Due"]],
      body: data.invoices.map((inv) => [
        inv.invoiceNumber,
        fmtDate(inv.issueDate),
        inv.status,
        fmtMoney(inv.totalAmount),
        fmtMoney(inv.paidAmount),
        fmtMoney(inv.balanceDue),
      ]),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  if (data.deposits.length > 0) {
    doc.setFontSize(11);
    doc.text("Deposits", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Code", "Original", "Remaining liability"]],
      body: data.deposits.map((dep) => [
        dep.depositCode,
        fmtMoney(dep.amount),
        fmtMoney(dep.remaining),
      ]),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  if (data.loans.length > 0) {
    doc.setFontSize(11);
    doc.text("Loans", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Loan #", "Date", "Status", "Principal", "Balance"]],
      body: data.loans.map((loan) => [
        loan.loanNumber,
        fmtDate(loan.loanDate),
        loan.status,
        fmtMoney(loan.principalAmount),
        fmtMoney(loan.balanceAmount),
      ]),
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  if (y > 240) doc.addPage();

  doc.setFontSize(11);
  doc.text("Transaction history", 14, y > 240 ? 20 : y);
  autoTable(doc, {
    startY: (y > 240 ? 20 : y) + 4,
    head: [["Date", "Type", "Amount", "Balance", "Description"]],
    body: data.transactions.map((tx) => [
      fmtDate(tx.createdAt),
      tx.type,
      fmtMoney(Number(tx.amount)),
      fmtMoney(tx.runningBalance),
      (tx.description || tx.referenceNumber || "").slice(0, 60),
    ]),
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 7 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    doc.text("Generated by PSB-ERP", 196, 290, { align: "right" });
  }

  return doc;
}
