import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plane,
  Receipt,
  DollarSign,
  MessageSquare,
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  HandCoins,
  ArrowLeftRight,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole } from "@/lib/roles";
import { alertServerError } from "@/lib/i18n-ui";

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
  completed: "bg-blue-100 text-blue-800",
};

const loanStatusColors: Record<string, string> = {
  active: "bg-amber-100 text-amber-800",
  repaid: "bg-emerald-100 text-emerald-800",
  written_off: "bg-slate-100 text-slate-800",
};

const txTypeColors: Record<string, string> = {
  receivable: "bg-orange-100 text-orange-700",
  payment: "bg-green-100 text-green-700",
  deposit: "bg-blue-100 text-blue-700",
  credit: "bg-purple-100 text-purple-700",
  refund: "bg-red-100 text-red-700",
  adjustment: "bg-gray-100 text-gray-700",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const { t } = useTranslation("customers");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);

  const [invoicePayment, setInvoicePayment] = useState<{ id: number; invoiceNumber: string; balance: number } | null>(null);
  const [invoicePaymentForm, setInvoicePaymentForm] = useState({ amount: "" });
  const [loanRepayment, setLoanRepayment] = useState<{ id: number; loanNumber: string; balance: number } | null>(null);
  const [loanRepaymentForm, setLoanRepaymentForm] = useState({ amount: "", notes: "" });
  const [ledgerPassLoan, setLedgerPassLoan] = useState<{ id: number; loanNumber: string; balance: number } | null>(null);
  const [ledgerPassForm, setLedgerPassForm] = useState({ direction: "receive" as "pay" | "receive", amount: "", notes: "" });

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.crm.customerDetail.useQuery(
    { id: customerId },
    { enabled: !!customerId },
  );

  const recordInvoicePayment = trpc.invoice.recordPayment.useMutation({
    onSuccess: async () => {
      await utils.crm.customerDetail.invalidate();
      await utils.invoice.list.invalidate();
      await utils.receivable.list.invalidate();
      setInvoicePayment(null);
      setInvoicePaymentForm({ amount: "" });
      refetch();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const recordLoanRepayment = trpc.loan.recordRepayment.useMutation({
    onSuccess: async () => {
      await utils.crm.customerDetail.invalidate();
      await utils.loan.list.invalidate();
      setLoanRepayment(null);
      setLoanRepaymentForm({ amount: "", notes: "" });
      refetch();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const loanLedgerPass = trpc.loan.ledgerPass.useMutation({
    onSuccess: async () => {
      await utils.crm.customerDetail.invalidate();
      await utils.loan.list.invalidate();
      await utils.receivable.customerSettlements.invalidate();
      setLedgerPassLoan(null);
      setLedgerPassForm({ direction: "receive", amount: "", notes: "" });
      refetch();
      alert(tc("alerts.settlementRecorded"));
    },
    onError: (err) => alertServerError(tc, err),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{t("failed_to_load_customer_details")}</p>
        <Button variant="outline" asChild>
          <Link to="/crm"><ArrowLeft className="h-4 w-4 mr-2" />{t("back_to_crm")}</Link>
        </Button>
      </div>
    );
  }

  const { customer, stats, recentTickets, recentInvoices, recentTransactions, recentInteractions, recentLoans } = data;

  const invoiceBalance = (inv: { totalAmount: string | number; paidAmount: string | number }) =>
    Number(inv.totalAmount) - Number(inv.paidAmount);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/crm"><ArrowLeft className="h-4 w-4 mr-1" />{t("back_1_1")}</Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-slate-500 text-sm">{customer.customerCode}</p>
        </div>
        <Badge className={customer.status === "active" ? "bg-emerald-100 text-emerald-700" : customer.status === "vip" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}>
          {customer.status}
        </Badge>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            {customer.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {customer.email}</span>}
            {customer.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {customer.phone}</span>}
            {customer.company && <span className="flex items-center gap-1"><User className="h-4 w-4" /> {customer.company}</span>}
            {(customer.city || customer.country) && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {[customer.city, customer.country].filter(Boolean).join(", ")}</span>}
            {customer.customerType && <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {customer.customerType}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Plane className="h-4 w-4" />{t("bookings")}</div>
            <p className="text-2xl font-bold">{stats.totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Receipt className="h-4 w-4" />{t("total_revenue_1_1")}</div>
            <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign className="h-4 w-4" />{t("total_paid")}</div>
            <p className="text-2xl font-bold">${stats.totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign className="h-4 w-4" />{t("balance_due")}</div>
            <p className={`text-2xl font-bold ${stats.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
              ${stats.balanceDue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <HandCoins className="h-4 w-4" />{t("active_loans_count")}</div>
            <p className="text-2xl font-bold">{stats.activeLoans ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <HandCoins className="h-4 w-4" />{t("outstanding_loan_balance")}</div>
            <p className="text-2xl font-bold text-amber-600">${Number(stats.loanBalance ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="bg-white border w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="bookings"><Plane className="h-4 w-4 mr-1" />{t("bookings_1")}</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" />{t("invoices")}</TabsTrigger>
          <TabsTrigger value="loans"><HandCoins className="h-4 w-4 mr-1" />{t("loans")}</TabsTrigger>
          <TabsTrigger value="transactions"><DollarSign className="h-4 w-4 mr-1" />{t("transactions")}</TabsTrigger>
          <TabsTrigger value="interactions"><MessageSquare className="h-4 w-4 mr-1" />{t("interactions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("recent_bookings")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ticket")}</TableHead>
                    <TableHead>{t("route")}</TableHead>
                    <TableHead>{t("travel_date")}</TableHead>
                    <TableHead>{t("amount_1")}</TableHead>
                    <TableHead>{t("status_1_1_1_1_1")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">{t("no_bookings_found")}</TableCell></TableRow>
                  )}
                  {recentTickets.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                      <TableCell>{ticket.routeFrom} → {ticket.routeTo}</TableCell>
                      <TableCell>{ticket.travelDate ? new Date(ticket.travelDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>${Number(ticket.totalAmount).toLocaleString()}</TableCell>
                      <TableCell><Badge className={statusColors[ticket.status] || "bg-gray-100"}>{ticket.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("recent_invoices")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoice")}</TableHead>
                    <TableHead>{t("issue_date")}</TableHead>
                    <TableHead>{t("total_1_1")}</TableHead>
                    <TableHead>{t("paid")}</TableHead>
                    <TableHead>{t("balance_due_label")}</TableHead>
                    <TableHead>{t("status_1_1_1_1_1_1")}</TableHead>
                    {canManage && <TableHead className="text-right">{tc("actionsLabel")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-slate-500">{t("no_invoices_found")}</TableCell></TableRow>
                  )}
                  {recentInvoices.map((inv: any) => {
                    const balance = invoiceBalance(inv);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>${Number(inv.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>${Number(inv.paidAmount).toLocaleString()}</TableCell>
                        <TableCell className={balance > 0 ? "text-red-600 font-medium" : "text-emerald-600"}>
                          ${balance.toLocaleString()}
                        </TableCell>
                        <TableCell><Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>{inv.status}</Badge></TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            {balance > 0 && inv.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setInvoicePayment({ id: inv.id, invoiceNumber: inv.invoiceNumber, balance });
                                  setInvoicePaymentForm({ amount: String(balance) });
                                }}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />{t("record_payment")}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("recent_loans")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("loan_number")}</TableHead>
                    <TableHead>{t("loan_date")}</TableHead>
                    <TableHead>{t("due_date")}</TableHead>
                    <TableHead>{tc("principal")}</TableHead>
                    <TableHead>{tc("repaid")}</TableHead>
                    <TableHead>{t("loan_balance")}</TableHead>
                    <TableHead>{tc("statusColumn")}</TableHead>
                    {canManage && <TableHead className="text-right">{tc("actionsLabel")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLoans.length === 0 && (
                    <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-slate-500">{t("no_loans_found")}</TableCell></TableRow>
                  )}
                  {recentLoans.map((loan: any) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.loanNumber}</TableCell>
                      <TableCell>{new Date(loan.loanDate).toLocaleDateString()}</TableCell>
                      <TableCell>{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>${Number(loan.principalAmount).toLocaleString()}</TableCell>
                      <TableCell>${Number(loan.repaidAmount).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-amber-600">${Number(loan.balanceAmount).toLocaleString()}</TableCell>
                      <TableCell><Badge className={loanStatusColors[loan.status] || "bg-gray-100"}>{loan.status}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {loan.status === "active" && Number(loan.balanceAmount) > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setLoanRepayment({ id: loan.id, loanNumber: loan.loanNumber, balance: Number(loan.balanceAmount) });
                                    setLoanRepaymentForm({ amount: String(loan.balanceAmount), notes: "" });
                                  }}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />{t("record_repayment")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-indigo-600 h-7 text-xs px-2"
                                  onClick={() => {
                                    setLedgerPassLoan({ id: loan.id, loanNumber: loan.loanNumber, balance: Number(loan.balanceAmount) });
                                    setLedgerPassForm({ direction: "receive", amount: String(loan.balanceAmount), notes: "" });
                                  }}
                                >
                                  <ArrowLeftRight className="h-3 w-3 mr-1" />{t("ledger_pass")}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("transaction_history")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date_1_1_1_1")}</TableHead>
                    <TableHead>{t("type_1")}</TableHead>
                    <TableHead>{t("amount_1_1")}</TableHead>
                    <TableHead>{t("description_1_1_1_1_1_1_1")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">{t("no_transactions_found")}</TableCell></TableRow>
                  )}
                  {recentTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge className={txTypeColors[tx.type] || "bg-gray-100"}>{tx.type}</Badge></TableCell>
                      <TableCell>${Number(tx.amount).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("recent_interactions")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentInteractions.length === 0 && (
                  <p className="text-center py-8 text-slate-500">{t("no_interactions_found")}</p>
                )}
                {recentInteractions.map((ia: any) => (
                  <div key={ia.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{ia.subject}</p>
                      <Badge variant="outline" className="text-[10px]">{ia.type}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{ia.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(ia.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!invoicePayment} onOpenChange={() => setInvoicePayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("record_payment")} — {invoicePayment?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {invoicePayment && (
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("balance_due_label")}</Label>
                <p className="text-lg font-semibold">${invoicePayment.balance.toLocaleString()}</p>
              </div>
              <div>
                <Label>{t("payment_amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={invoicePayment.balance}
                  value={invoicePaymentForm.amount}
                  onChange={(e) => setInvoicePaymentForm({ amount: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">{t("partial_payment_hint")}</p>
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={
                  !invoicePaymentForm.amount
                  || recordInvoicePayment.isPending
                  || Number(invoicePaymentForm.amount) <= 0
                  || Number(invoicePaymentForm.amount) > invoicePayment.balance + 0.01
                }
                onClick={() => recordInvoicePayment.mutate({
                  id: invoicePayment.id,
                  amount: invoicePaymentForm.amount,
                })}
              >
                {recordInvoicePayment.isPending ? tc("actions.processing") : tc("actions.confirmPayment")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!loanRepayment} onOpenChange={() => setLoanRepayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("record_repayment")} — {loanRepayment?.loanNumber}</DialogTitle>
          </DialogHeader>
          {loanRepayment && (
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("loan_balance")}</Label>
                <p className="text-lg font-semibold">${loanRepayment.balance.toLocaleString()}</p>
              </div>
              <div>
                <Label>{t("payment_amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={loanRepayment.balance}
                  value={loanRepaymentForm.amount}
                  onChange={(e) => setLoanRepaymentForm((s) => ({ ...s, amount: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1">{t("partial_payment_hint")}</p>
              </div>
              <div>
                <Label>{tc("notes_1_1_1")}</Label>
                <Input value={loanRepaymentForm.notes} onChange={(e) => setLoanRepaymentForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={
                  !loanRepaymentForm.amount
                  || recordLoanRepayment.isPending
                  || Number(loanRepaymentForm.amount) <= 0
                  || Number(loanRepaymentForm.amount) > loanRepayment.balance + 0.01
                }
                onClick={() => recordLoanRepayment.mutate({
                  loanId: loanRepayment.id,
                  amount: loanRepaymentForm.amount,
                  notes: loanRepaymentForm.notes || undefined,
                })}
              >
                {recordLoanRepayment.isPending ? tc("actions.processing") : tc("actions.confirmRepayment")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!ledgerPassLoan} onOpenChange={() => setLedgerPassLoan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("ledger_pass")}</DialogTitle></DialogHeader>
          {ledgerPassLoan && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-slate-500">{ledgerPassLoan.loanNumber} — ${ledgerPassLoan.balance.toLocaleString()}</p>
              <div>
                <Label>{tc("amount_1_1_1_1_1_1_1_1")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={ledgerPassForm.direction === "receive" ? ledgerPassLoan.balance : undefined}
                  value={ledgerPassForm.amount}
                  onChange={(e) => setLedgerPassForm((s) => ({ ...s, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>{tc("notes_1_1_1")}</Label>
                <Input value={ledgerPassForm.notes} onChange={(e) => setLedgerPassForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={
                  !ledgerPassForm.amount
                  || loanLedgerPass.isPending
                  || (ledgerPassForm.direction === "receive"
                    && Number(ledgerPassForm.amount) > ledgerPassLoan.balance + 0.01)
                }
                onClick={() => loanLedgerPass.mutate({
                  loanId: ledgerPassLoan.id,
                  direction: ledgerPassForm.direction,
                  amount: ledgerPassForm.amount,
                  notes: ledgerPassForm.notes || undefined,
                })}
              >
                {loanLedgerPass.isPending ? tc("actions.processing") : tc("record_settlement")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
