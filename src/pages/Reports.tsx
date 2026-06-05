import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  FileText, Download, TrendingUp, Users, Receipt,
  Landmark, Wallet, BookOpen, Scale, CheckCircle2, AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatMoney(value: number) {
  const abs = Math.abs(value);
  const formatted = `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return value < 0 ? `(${formatted})` : formatted;
}

function exportToPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(String)),
    startY: 24,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

function IncomeSection({ title, lines }: { title: string; lines: { code: string; name: string; amount: number }[] }) {
  if (lines.length === 0) return null;
  return (
    <>
      <TableRow className="bg-slate-50 dark:bg-slate-800">
        <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</TableCell>
        <TableCell />
      </TableRow>
      {lines.map((line) => (
        <TableRow key={`${title}-${line.code}`}>
          <TableCell className="text-xs font-mono pl-6">{line.code}</TableCell>
          <TableCell className="text-xs">{line.name}</TableCell>
          <TableCell className="text-xs text-right">{formatMoney(line.amount)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SummaryRow({
  label,
  amount,
  emphasis = false,
  highlight = false,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  highlight?: boolean;
}) {
  return (
    <TableRow className={highlight ? "bg-indigo-50 dark:bg-indigo-950" : emphasis ? "border-t" : undefined}>
      <TableCell colSpan={2} className={`text-xs ${emphasis || highlight ? "font-semibold" : ""} ${highlight ? "text-indigo-700 dark:text-indigo-300" : ""}`}>
        {label}
      </TableCell>
      <TableCell className={`text-xs text-right ${emphasis || highlight ? "font-semibold" : ""} ${highlight ? "text-indigo-700 dark:text-indigo-300" : ""}`}>
        {formatMoney(amount)}
      </TableCell>
    </TableRow>
  );
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [reportTab, setReportTab] = useState("revenue");

  const { data: revenueData, isLoading: revenueLoading } = trpc.report.revenueByCustomer.useQuery({ fromDate, toDate });
  const { data: revenueDetail, isLoading: revenueDetailLoading } = trpc.report.revenueDetail.useQuery({ fromDate, toDate });
  const { data: expenseData, isLoading: expenseLoading } = trpc.report.expenseBreakdown.useQuery({ fromDate, toDate });
  const { data: expenseDetail, isLoading: expenseDetailLoading } = trpc.report.expenseDetail.useQuery({ fromDate, toDate });
  const { data: payablesData } = trpc.report.supplierPayables.useQuery();
  const { data: cashFlowData } = trpc.report.cashFlow.useQuery({ fromDate, toDate, granularity });
  const { data: trialBalanceData } = trpc.report.trialBalance.useQuery({ asOfDate: toDate });
  const { data: incomeStatementData, isLoading: incomeLoading } = trpc.report.incomeStatement.useQuery({ fromDate, toDate });
  const { data: ledgerData } = trpc.report.generalLedger.useQuery({ fromDate, toDate, limit: 100 });

  const trialRows = trialBalanceData?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">Advanced reporting with export options</p>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="grid grid-cols-2 gap-3 flex-1 w-full">
              <div>
                <Label className="text-xs">From Date</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To Date</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>
            {reportTab === "cashflow" && (
              <Select value={granularity} onValueChange={v => setGranularity(v as any)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="revenue"><TrendingUp className="h-3 w-3 mr-1" /> Revenue</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="h-3 w-3 mr-1" /> Expenses</TabsTrigger>
          <TabsTrigger value="payables"><Users className="h-3 w-3 mr-1" /> Payables</TabsTrigger>
          <TabsTrigger value="cashflow"><Wallet className="h-3 w-3 mr-1" /> Cash Flow</TabsTrigger>
          <TabsTrigger value="income"><Scale className="h-3 w-3 mr-1" /> Income Statement</TabsTrigger>
          <TabsTrigger value="trial"><BookOpen className="h-3 w-3 mr-1" /> Trial Balance</TabsTrigger>
          <TabsTrigger value="ledger"><Landmark className="h-3 w-3 mr-1" /> Ledger</TabsTrigger>
        </TabsList>

        {/* Revenue by Customer */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          {revenueDetailLoading ? (
            <Skeleton className="h-20" />
          ) : revenueDetail && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total Revenue</p>
                  <p className="text-lg font-bold text-indigo-700">{formatMoney(revenueDetail.summary.totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Commission</p>
                  <p className="text-lg font-bold">{formatMoney(revenueDetail.summary.totalCommission)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Collected</p>
                  <p className="text-lg font-bold text-emerald-700">{formatMoney(revenueDetail.summary.totalPaid)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Confirmed Tickets</p>
                  <p className="text-lg font-bold">{revenueDetail.summary.totalTickets}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              if (!revenueDetail) return;
              downloadCSV(
                "revenue_detail.csv",
                ["Date", "Ticket #", "PNR", "Customer", "Route", "Airline", "Base Fare", "Tax", "Total", "Commission", "Paid", "Payment"],
                revenueDetail.items.map(r => [
                  String(r.bookingDate).slice(0, 10),
                  r.ticketNumber,
                  r.pnrCode || "",
                  r.customerName,
                  `${r.routeFrom}-${r.routeTo}`,
                  r.airlineName || "",
                  r.baseFare,
                  r.taxAmount,
                  r.totalAmount,
                  r.commissionAmount,
                  r.paidAmount,
                  r.paymentStatus,
                ]),
              );
            }}><Download className="h-3 w-3 mr-1" /> Detail CSV</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!revenueData) return;
              const headers = ["Customer", "Tickets", "Revenue", "Commission"];
              const rows = revenueData.map(r => [r.customerName || "Walk-in", r.totalTickets, r.totalRevenue, r.totalCommission]);
              downloadCSV("revenue_by_customer.csv", headers, rows);
            }}><Download className="h-3 w-3 mr-1" /> Summary CSV</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!revenueDetail) return;
              exportToPDF(
                `Revenue Detail (${fromDate} to ${toDate})`,
                ["Date", "Ticket", "Customer", "Route", "Total", "Commission", "Paid"],
                revenueDetail.items.map(r => [
                  String(r.bookingDate).slice(0, 10),
                  r.ticketNumber,
                  r.customerName,
                  `${r.routeFrom}-${r.routeTo}`,
                  formatMoney(r.totalAmount),
                  formatMoney(r.commissionAmount),
                  formatMoney(r.paidAmount),
                ]),
              );
            }}><FileText className="h-3 w-3 mr-1" /> PDF</Button>
          </div>

          {revenueLoading ? <Skeleton className="h-64" /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Customer</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData?.slice(0, 10) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerName" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => typeof v === "number" ? `$${v.toLocaleString()}` : String(v)} />
                      <Bar dataKey="totalRevenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tickets</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(revenueData || []).map(r => (
                      <TableRow key={r.customerId || 0}>
                        <TableCell className="text-xs font-medium">{r.customerName || "Walk-in"}</TableCell>
                        <TableCell className="text-xs">{r.totalTickets}</TableCell>
                        <TableCell className="text-xs">${Number(r.totalRevenue).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">${Number(r.totalCommission).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm">Revenue Detail — Confirmed Ticket Sales</CardTitle>
              <p className="text-xs text-slate-500">{fromDate} to {toDate}</p>
            </CardHeader>
            <CardContent className="p-0">
              {revenueDetailLoading ? (
                <Skeleton className="h-64 m-4" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Airline</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(revenueDetail?.items || []).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{String(r.bookingDate).slice(0, 10)}</TableCell>
                          <TableCell className="text-xs font-medium">{r.ticketNumber}</TableCell>
                          <TableCell className="text-xs">{r.customerName}</TableCell>
                          <TableCell className="text-xs">{r.routeFrom} → {r.routeTo}</TableCell>
                          <TableCell className="text-xs">{r.airlineName || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{formatMoney(r.baseFare)}</TableCell>
                          <TableCell className="text-xs text-right">{formatMoney(r.taxAmount)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatMoney(r.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-right">{formatMoney(r.commissionAmount)}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-700">{formatMoney(r.paidAmount)}</TableCell>
                          <TableCell className="text-xs capitalize">{r.paymentStatus}</TableCell>
                        </TableRow>
                      ))}
                      {(!revenueDetail?.items || revenueDetail.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-sm text-slate-400 py-8">
                            No confirmed ticket revenue in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          {expenseDetailLoading ? (
            <Skeleton className="h-20" />
          ) : expenseDetail && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Total Expenses</p>
                  <p className="text-lg font-bold text-rose-700">{formatMoney(expenseDetail.summary.totalAmount)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Approved Records</p>
                  <p className="text-lg font-bold">{expenseDetail.summary.count}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Categories</p>
                  <p className="text-lg font-bold">{expenseDetail.byCategory.length}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              if (!expenseDetail) return;
              downloadCSV(
                "expense_detail.csv",
                ["Date", "Title", "Category", "Vendor", "Amount", "Payment", "Receipt #", "Status"],
                expenseDetail.items.map(r => [
                  String(r.expenseDate),
                  r.title,
                  r.categoryName,
                  r.vendor || "",
                  r.amount,
                  r.paymentMethod,
                  r.receiptNumber || "",
                  r.status,
                ]),
              );
            }}><Download className="h-3 w-3 mr-1" /> Detail CSV</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!expenseData) return;
              downloadCSV("expense_breakdown.csv", ["Vendor", "Count", "Total"], expenseData.map(r => [r.vendor || "Uncategorized", r.count, r.total]));
            }}><Download className="h-3 w-3 mr-1" /> Summary CSV</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!expenseDetail) return;
              exportToPDF(
                `Expense Detail (${fromDate} to ${toDate})`,
                ["Date", "Title", "Category", "Vendor", "Amount", "Payment"],
                expenseDetail.items.map(r => [
                  String(r.expenseDate),
                  r.title,
                  r.categoryName,
                  r.vendor || "—",
                  formatMoney(r.amount),
                  r.paymentMethod,
                ]),
              );
            }}><FileText className="h-3 w-3 mr-1" /> PDF</Button>
          </div>

          {expenseLoading ? <Skeleton className="h-64" /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Expense by Vendor</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={expenseData || []} dataKey="total" nameKey="vendor" cx="50%" cy="50%" outerRadius={80}>
                        {(expenseData || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? `$${v.toLocaleString()}` : String(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Vendor</TableHead><TableHead>Count</TableHead><TableHead>Total</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expenseData || []).map(r => (
                      <TableRow key={r.vendor || "uncategorized"}>
                        <TableCell className="text-xs font-medium">{r.vendor || "Uncategorized"}</TableCell>
                        <TableCell className="text-xs">{r.count}</TableCell>
                        <TableCell className="text-xs">${Number(r.total).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {expenseDetail && expenseDetail.byCategory.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm">Expense by Category</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseDetail.byCategory.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="text-xs font-medium">{row.category}</TableCell>
                          <TableCell className="text-xs">{row.count}</TableCell>
                          <TableCell className="text-xs text-right">{formatMoney(row.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm">Expense Detail — Approved Records</CardTitle>
              <p className="text-xs text-slate-500">{fromDate} to {toDate}</p>
            </CardHeader>
            <CardContent className="p-0">
              {expenseDetailLoading ? (
                <Skeleton className="h-64 m-4" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(expenseDetail?.items || []).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{String(r.expenseDate)}</TableCell>
                          <TableCell className="text-xs font-medium">{r.title}</TableCell>
                          <TableCell className="text-xs">{r.categoryName}</TableCell>
                          <TableCell className="text-xs">{r.vendor || "—"}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatMoney(r.amount)}</TableCell>
                          <TableCell className="text-xs capitalize">{r.paymentMethod.replace("_", " ")}</TableCell>
                          <TableCell className="text-xs">{r.receiptNumber || "—"}</TableCell>
                          <TableCell className="text-xs capitalize">{r.status}</TableCell>
                        </TableRow>
                      ))}
                      {(!expenseDetail?.items || expenseDetail.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-slate-400 py-8">
                            No approved expenses in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Payables */}
        <TabsContent value="payables" className="mt-4">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={() => {
              if (!payablesData) return;
              downloadCSV("supplier_payables.csv", ["Supplier", "Bills", "Total", "Paid", "Balance"],
                payablesData.map(r => [r.supplierName || "—", r.totalBills, r.totalAmount, r.totalPaid, r.balanceDue]));
            }}><Download className="h-3 w-3 mr-1" /> CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Open Bills</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payablesData || []).map(r => (
                  <TableRow key={r.supplierId}>
                    <TableCell className="text-xs font-medium">{r.supplierName || "—"}</TableCell>
                    <TableCell className="text-xs">{r.totalBills}</TableCell>
                    <TableCell className="text-xs">${r.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">${r.totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-semibold text-amber-600">${r.balanceDue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow ({granularity})</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData?.items || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => typeof v === "number" ? `$${v.toLocaleString()}` : String(v)} />
                  <Bar dataKey="inflows" fill="#10b981" name="Inflows" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="outflows" fill="#ef4444" name="Outflows" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Period: {fromDate} to {toDate}
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={!incomeStatementData} onClick={() => {
                if (!incomeStatementData) return;
                const t = incomeStatementData.totals;
                const line = (label: string, amount: number) => [label, amount];
                const rows: (string | number)[][] = [
                  ...incomeStatementData.revenues.map((r) => [r.code, r.name, r.amount]),
                  line("Total Revenue", t.totalRevenue),
                  ...incomeStatementData.costOfRevenue.map((r) => [r.code, r.name, r.amount]),
                  line("Gross Profit", t.grossProfit),
                  ...incomeStatementData.operatingExpenses.map((r) => [r.code, r.name, r.amount]),
                  line("Operating Income", t.operatingIncome),
                  ...incomeStatementData.otherIncome.map((r) => [r.code, r.name, r.amount]),
                  ...incomeStatementData.otherExpenses.map((r) => [r.code, r.name, r.amount]),
                  line("Income Before Tax", t.incomeBeforeTax),
                  line("Income Tax Expense", t.totalTaxExpense),
                  line("Net Income", t.netIncome),
                ];
                downloadCSV("income_statement.csv", ["Code / Line", "Description", "Amount"], rows);
              }}><Download className="h-3 w-3 mr-1" /> CSV</Button>
              <Button size="sm" variant="outline" disabled={!incomeStatementData} onClick={() => {
                if (!incomeStatementData) return;
                const t = incomeStatementData.totals;
                const section = (title: string, items: { code: string; name: string; amount: number }[]) => [
                  [title, "", ""],
                  ...items.map((r) => [r.code, r.name, formatMoney(r.amount)]),
                ];
                exportToPDF(
                  `Income Statement (${fromDate} to ${toDate})`,
                  ["Code", "Account", "Amount"],
                  [
                    ...section("Revenue", incomeStatementData.revenues),
                    ["", "Total Revenue", formatMoney(t.totalRevenue)],
                    ...section("Cost of Revenue", incomeStatementData.costOfRevenue),
                    ["", "Gross Profit", formatMoney(t.grossProfit)],
                    ...section("Operating Expenses", incomeStatementData.operatingExpenses),
                    ["", "Operating Income", formatMoney(t.operatingIncome)],
                    ...section("Other Income", incomeStatementData.otherIncome),
                    ...section("Other Expenses", incomeStatementData.otherExpenses),
                    ["", "Income Before Tax", formatMoney(t.incomeBeforeTax)],
                    ["", "Income Tax Expense", formatMoney(t.totalTaxExpense)],
                    ["", "Net Income", formatMoney(t.netIncome)],
                  ],
                );
              }}><FileText className="h-3 w-3 mr-1" /> PDF</Button>
            </div>
          </div>

          {incomeLoading ? <Skeleton className="h-96" /> : incomeStatementData && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-base">Income Statement</CardTitle>
                <p className="text-xs text-slate-500">For the period {fromDate} through {toDate}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <IncomeSection title="Revenue" lines={incomeStatementData.revenues} />
                      <SummaryRow label="Total Revenue" amount={incomeStatementData.totals.totalRevenue} emphasis />
                      {incomeStatementData.costOfRevenue.length > 0 && (
                        <>
                          <IncomeSection title="Cost of Revenue" lines={incomeStatementData.costOfRevenue} />
                          <SummaryRow label="Total Cost of Revenue" amount={incomeStatementData.totals.totalCostOfRevenue} />
                        </>
                      )}
                      <SummaryRow label="Gross Profit" amount={incomeStatementData.totals.grossProfit} emphasis />
                      <IncomeSection title="Operating Expenses" lines={incomeStatementData.operatingExpenses} />
                      <SummaryRow label="Total Operating Expenses" amount={incomeStatementData.totals.totalOperatingExpenses} />
                      <SummaryRow label="Operating Income" amount={incomeStatementData.totals.operatingIncome} emphasis />
                      {incomeStatementData.otherIncome.length > 0 && (
                        <IncomeSection title="Other Income" lines={incomeStatementData.otherIncome} />
                      )}
                      {incomeStatementData.otherExpenses.length > 0 && (
                        <IncomeSection title="Other Expenses" lines={incomeStatementData.otherExpenses} />
                      )}
                      <SummaryRow label="Income Before Tax" amount={incomeStatementData.totals.incomeBeforeTax} emphasis />
                      {incomeStatementData.taxExpenses.length > 0 && (
                        <IncomeSection title="Income Tax" lines={incomeStatementData.taxExpenses} />
                      )}
                      {incomeStatementData.totals.estimatedTaxProvision > 0 && (
                        <SummaryRow
                          label={`Estimated Tax Provision (${incomeStatementData.totals.taxProvisionRate}%)`}
                          amount={incomeStatementData.totals.estimatedTaxProvision}
                        />
                      )}
                      <SummaryRow label="Total Income Tax Expense" amount={incomeStatementData.totals.totalTaxExpense} />
                      <SummaryRow label="Net Income" amount={incomeStatementData.totals.netIncome} emphasis highlight />
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trial Balance */}
        <TabsContent value="trial" className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            {trialBalanceData && (
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                trialBalanceData.isBalanced
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {trialBalanceData.isBalanced
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Books are balanced</>
                  : <><AlertCircle className="h-3.5 w-3.5" /> Out of balance by {formatMoney(trialBalanceData.difference)}</>}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                if (!trialBalanceData) return;
                downloadCSV("trial_balance.csv", ["Code", "Account", "Type", "Debit Balance", "Credit Balance"],
                  trialRows.map(r => [r.code, r.name, r.type, r.debitBalance, r.creditBalance]));
              }}><Download className="h-3 w-3 mr-1" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (!trialBalanceData) return;
                exportToPDF(`Trial Balance (as of ${toDate})`, ["Code", "Account", "Type", "Debit Balance", "Credit Balance"],
                  [
                    ...trialRows.map(r => [r.code, r.name, r.type, formatMoney(r.debitBalance), formatMoney(r.creditBalance)]),
                    ["", "Totals", "", formatMoney(trialBalanceData.totalDebit), formatMoney(trialBalanceData.totalCredit)],
                  ]);
              }}><FileText className="h-3 w-3 mr-1" /> PDF</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit Balance</TableHead>
                  <TableHead className="text-right">Credit Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.code}</TableCell>
                    <TableCell className="text-xs">{r.name}</TableCell>
                    <TableCell className="text-xs capitalize">{r.type}</TableCell>
                    <TableCell className="text-xs text-right">{r.debitBalance > 0 ? formatMoney(r.debitBalance) : "—"}</TableCell>
                    <TableCell className="text-xs text-right">{r.creditBalance > 0 ? formatMoney(r.creditBalance) : "—"}</TableCell>
                  </TableRow>
                ))}
                {trialBalanceData && (
                  <TableRow className="bg-slate-50 dark:bg-slate-800 font-semibold">
                    <TableCell colSpan={3} className="text-xs">Totals</TableCell>
                    <TableCell className="text-xs text-right">{formatMoney(trialBalanceData.totalDebit)}</TableCell>
                    <TableCell className="text-xs text-right">{formatMoney(trialBalanceData.totalCredit)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* General Ledger */}
        <TabsContent value="ledger" className="mt-4">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={() => {
              if (!ledgerData) return;
              downloadCSV("general_ledger.csv", ["Date", "Account", "Description", "Debit", "Credit", "Balance"],
                ledgerData.items.map(r => [String(r.date), (r as any).account?.name || "—", r.description || "", r.debit, r.credit, r.balance]));
            }}><Download className="h-3 w-3 mr-1" /> CSV</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ledgerData?.items || []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{String(r.date)}</TableCell>
                    <TableCell className="text-xs font-medium">{(r as any).account?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.description || "—"}</TableCell>
                    <TableCell className="text-xs">{Number(r.debit) > 0 ? `$${Number(r.debit).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-xs">{Number(r.credit) > 0 ? `$${Number(r.credit).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">${Number(r.balance).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
