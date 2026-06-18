import { useState } from "react";
import { alertServerError } from "@/lib/i18n-ui";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Receipt, Search, Plus, AlertCircle, DollarSign, CreditCard,
  TrendingUp, Download, Trash2,
} from "lucide-react";
import { generatePaymentVoucherPDF } from "@/lib/pdf-generator";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole } from "@/lib/roles";

const billStatusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  open: "bg-blue-100 text-blue-800",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  credit_card: "Credit Card",
  wallet: "Wallet",
};

export default function PayablesPage() {
  const { t, t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<{ id: number; billNumber: string; balanceDue: string; supplierId: number } | null>(null);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.payable.stats.useQuery();
  const { data: billsData, isLoading, error: billsError } = trpc.payable.bills.useQuery({
    search: search || undefined,
    status: statusFilter !== "__all__" ? statusFilter : undefined,
  });
  const { data: aging, error: agingError } = trpc.payable.agingReport.useQuery({});
  const { data: paymentsData, error: paymentsError } = trpc.payable.payments.useQuery({});
  console.log("[Payables] billsData:", billsData, "aging:", aging, "payments:", paymentsData, "errors:", { billsError, agingError, paymentsError });

  const createBill = trpc.payable.createBill.useMutation({
    onSuccess: async () => {
      await utils.payable.bills.invalidate();
      await utils.payable.stats.invalidate();
      await utils.payable.agingReport.invalidate();
      await utils.supplier.stats.invalidate();
      setCreateBillOpen(false);
      resetBillForm();
    },
    onError: (err) => alertServerError(t, err),
  });

  const createPayment = trpc.payable.createPayment.useMutation({
    onSuccess: async () => {
      await utils.payable.bills.invalidate();
      await utils.payable.stats.invalidate();
      await utils.payable.agingReport.invalidate();
      await utils.payable.payments.invalidate();
      await utils.supplier.stats.invalidate();
      setPaymentOpen(false);
      setSelectedBill(null);
      resetPaymentForm();
    },
    onError: (err) => alertServerError(t, err),
  });

  const deleteBill = trpc.payable.deleteBill.useMutation({
    onSuccess: async () => {
      await utils.payable.bills.invalidate();
      await utils.payable.stats.invalidate();
      await utils.payable.agingReport.invalidate();
      await utils.supplier.stats.invalidate();
    },
    onError: (err) => alertServerError(t, err),
  });

  const [billForm, setBillForm] = useState({
    supplierId: "",
    referenceNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    description: "",
    category: "",
    items: [{ description: "", quantity: "1", unitPrice: "" }],
    taxAmount: "0",
    discountAmount: "0",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer" as const,
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
  });

  const resetBillForm = () => setBillForm({
    supplierId: "", referenceNumber: "", issueDate: new Date().toISOString().split("T")[0],
    dueDate: "", description: "", category: "",
    items: [{ description: "", quantity: "1", unitPrice: "" }],
    taxAmount: "0", discountAmount: "0",
  });

  const resetPaymentForm = () => setPaymentForm({
    amount: "", paymentMethod: "bank_transfer", paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "", notes: "",
  });

  const { data: suppliersData } = trpc.supplier.list.useQuery({ limit: 100 });

  if (isLoading) return <div className="py-8 text-center text-slate-500">{t("loading")}</div>;
  if (billsError) return <div className="py-8 text-center text-red-600">Error loading bills: {billsError.message}</div>;
  if (!billsData) return <div className="py-8 text-center text-slate-500">{t("noPayableData")}</div>;

  const handleCreateBill = () => {
    if (!billForm.supplierId || !billForm.dueDate || billForm.items.some(i => !i.description || !i.unitPrice)) return;
    const subtotal = billForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    if (subtotal <= 0) return;
    createBill.mutate({
      supplierId: Number(billForm.supplierId),
      referenceNumber: billForm.referenceNumber || undefined,
      issueDate: billForm.issueDate,
      dueDate: billForm.dueDate,
      description: billForm.description || undefined,
      category: billForm.category || undefined,
      items: billForm.items.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
      taxAmount: Number(billForm.taxAmount) || 0,
      discountAmount: Number(billForm.discountAmount) || 0,
    });
  };

  const handleCreatePayment = () => {
    if (!selectedBill || !paymentForm.amount) return;
    createPayment.mutate({
      supplierId: selectedBill.supplierId,
      billId: selectedBill.id,
      amount: Number(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: paymentForm.paymentDate,
      referenceNumber: paymentForm.referenceNumber || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  const openPayment = (bill: { id: number; billNumber: string; balanceDue: string; supplierId: number }) => {
    setSelectedBill(bill);
    setPaymentForm(prev => ({ ...prev, amount: bill.balanceDue }));
    setPaymentOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("accountsPayable")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manageSupplierBills")}</p>
        </div>
        <Dialog open={createBillOpen} onOpenChange={setCreateBillOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="self-start sm:self-auto">
              <Plus className="h-4 w-4 mr-1" />{t("new_bill")}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("create_new_bill")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("supplier")}</Label>
                <Select value={billForm.supplierId} onValueChange={v => setBillForm({ ...billForm, supplierId: v })}>
                  <SelectTrigger><SelectValue placeholder={t("select_supplier")} /></SelectTrigger>
                  <SelectContent>
                    {(suppliersData?.items || []).length === 0 ? (
                      <SelectItem value="__empty__" disabled>{t("noRecordsFound")}</SelectItem>
                    ) : (
                      (suppliersData?.items || []).map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.companyName}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("issue_date_1_1")}</Label>
                  <Input type="date" value={billForm.issueDate} onChange={e => setBillForm({ ...billForm, issueDate: e.target.value })} />
                </div>
                <div>
                  <Label>{t("due_date_1_2")}</Label>
                  <Input type="date" value={billForm.dueDate} onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{t("reference_1")}</Label>
                <Input value={billForm.referenceNumber} onChange={e => setBillForm({ ...billForm, referenceNumber: e.target.value })} placeholder={t("supplier_invoice_reference")} />
              </div>
              <div>
                <Label>{t("category_1_1")}</Label>
                <Input value={billForm.category} onChange={e => setBillForm({ ...billForm, category: e.target.value })} placeholder={t("e_g_flight_hotel")} />
              </div>
              <div>
                <Label>{t("description_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <Input value={billForm.description} onChange={e => setBillForm({ ...billForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("line_items")}</Label>
                {billForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input value={item.description} onChange={e => {
                        const items = [...billForm.items];
                        items[idx].description = e.target.value;
                        setBillForm({ ...billForm, items });
                      }} placeholder={t("description_1_1_1_1_1_1_1_1_1_1")} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={item.quantity} onChange={e => {
                        const items = [...billForm.items];
                        items[idx].quantity = e.target.value;
                        setBillForm({ ...billForm, items });
                      }} placeholder={t("qty_1")} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" value={item.unitPrice} onChange={e => {
                        const items = [...billForm.items];
                        items[idx].unitPrice = e.target.value;
                        setBillForm({ ...billForm, items });
                      }} placeholder={t("price")} />
                    </div>
                    <div className="col-span-2">
                      {idx === billForm.items.length - 1 ? (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setBillForm({ ...billForm, items: [...billForm.items, { description: "", quantity: "1", unitPrice: "" }] })}>+</Button>
                      ) : (
                        <Button type="button" variant="ghost" size="sm" className="w-full text-red-500" onClick={() => {
                          const items = billForm.items.filter((_, i) => i !== idx);
                          setBillForm({ ...billForm, items });
                        }}>×</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tax_1")}</Label>
                  <Input type="number" value={billForm.taxAmount} onChange={e => setBillForm({ ...billForm, taxAmount: e.target.value })} />
                </div>
                <div>
                  <Label>{t("discount")}</Label>
                  <Input type="number" value={billForm.discountAmount} onChange={e => setBillForm({ ...billForm, discountAmount: e.target.value })} />
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-right">
                  Total: ${billForm.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0) + Number(billForm.taxAmount) - Number(billForm.discountAmount)}
                </p>
              </div>
              <Button onClick={handleCreateBill} disabled={createBill.isPending} className="w-full">
                {createBill.isPending ? tc("actions.creating") : tc("actions.createBill")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50"><Receipt className="h-4 w-4 text-blue-600" /></div>
              <span className="text-xs text-slate-500">{t("total_bills")}</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.totalBills ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50"><DollarSign className="h-4 w-4 text-amber-600" /></div>
              <span className="text-xs text-slate-500">{t("total_due")}</span>
            </div>
            <p className="text-xl font-bold mt-1">${(stats?.totalDue ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /></div>
              <span className="text-xs text-slate-500">{t("overdue_1")}</span>
            </div>
            <p className="text-xl font-bold mt-1">${(stats?.overdueAmount ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
              <span className="text-xs text-slate-500">{t("total_paid_1")}</span>
            </div>
            <p className="text-xl font-bold mt-1">${(stats?.totalPayments ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bills">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="bills">{t("bills")}</TabsTrigger>
          <TabsTrigger value="aging">{t("aging_report")}</TabsTrigger>
          <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder={t("status_1_1_1_1_1_1_1_1")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("all")}</SelectItem>
                <SelectItem value="open">{t("open")}</SelectItem>
                <SelectItem value="partial">{t("partial")}</SelectItem>
                <SelectItem value="paid">{t("paid_1_1_1")}</SelectItem>
                <SelectItem value="overdue">{t("overdue_1_1")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billNumber")}</TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("due")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead>{t("paid")}</TableHead>
                    <TableHead>{t("balance")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(billsData?.items || []).map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium text-xs">{bill.billNumber}</TableCell>
                      <TableCell className="text-xs">{(bill as any).supplier?.companyName || "—"}</TableCell>
                      <TableCell className="text-xs">{String(bill.issueDate)}</TableCell>
                      <TableCell className="text-xs">{String(bill.dueDate)}</TableCell>
                      <TableCell className="text-xs">${Number(bill.totalAmount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">${Number(bill.amountPaid).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-semibold">${Number(bill.balanceDue).toLocaleString()}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${billStatusColors[bill.status] || ""}`}>{bill.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {bill.status !== "paid" && bill.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" onClick={() => openPayment(bill as any)}>{t("pay")}</Button>
                        )}
                        {canManage && Number(bill.amountPaid) === 0 && bill.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 h-8 w-8 p-0"
                            title={t("delete_bill_reverses_accounting")}
                            disabled={deleteBill.isPending}
                            onClick={() => {
                              if (confirm(tc("confirm.deleteBill", { name: bill.billNumber }))) {
                                deleteBill.mutate({ id: bill.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {billsData?.items?.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-medium">{t("noData")}</p>
            </div>
          )}
          {!billsData && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">{t("failed_to_load_bills_check_console")}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="aging" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aging Summary {aging?.asOfDate ? `— as of ${aging.asOfDate}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="p-3 rounded-lg bg-emerald-50 text-center">
                  <p className="text-xs text-slate-500">{t("current")}</p>
                  <p className="text-lg font-bold text-emerald-700">${(aging?.summary.current ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-center">
                  <p className="text-xs text-slate-500">{t("1_30_days")}</p>
                  <p className="text-lg font-bold text-blue-700">${(aging?.summary.days1To30 ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 text-center">
                  <p className="text-xs text-slate-500">{t("31_60_days")}</p>
                  <p className="text-lg font-bold text-amber-700">${(aging?.summary.days31To60 ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 text-center">
                  <p className="text-xs text-slate-500">{t("61_90_days")}</p>
                  <p className="text-lg font-bold text-orange-700">${(aging?.summary.days61To90 ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 text-center">
                  <p className="text-xs text-slate-500">{t("over_90")}</p>
                  <p className="text-lg font-bold text-red-700">${(aging?.summary.over90 ?? 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-medium">{t("total_outstanding")}</span>
                <span className="text-lg font-bold">${(aging?.summary.total ?? 0).toLocaleString()}</span>
              </div>

              {aging && aging.details && aging.details.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("bill")}</TableHead>
                        <TableHead>{t("supplier_1")}</TableHead>
                        <TableHead>{t("due_date_1_1")}</TableHead>
                        <TableHead>{t("days_overdue")}</TableHead>
                        <TableHead>{t("balance_1_1_1")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aging.details.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium text-xs">{bill.billNumber}</TableCell>
                          <TableCell className="text-xs">{bill.supplier?.companyName || "—"}</TableCell>
                          <TableCell className="text-xs">{String(bill.dueDate)}</TableCell>
                          <TableCell className="text-xs font-semibold text-red-600">{bill.daysOverdue}</TableCell>
                          <TableCell className="text-xs font-semibold">${Number(bill.balanceDue).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("payment_1")}</TableHead>
                  <TableHead>{t("supplier_1_1")}</TableHead>
                  <TableHead>{t("date_1_1_1_1_1_1_1_1")}</TableHead>
                  <TableHead>{t("amount_1_1_1_1_1_1_1_1_1")}</TableHead>
                  <TableHead>{t("method")}</TableHead>
                  <TableHead>{t("reference_1_2")}</TableHead>
                  <TableHead className="text-right">{t("action_1_1")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsData?.items || []).map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-xs">{payment.paymentNumber}</TableCell>
                    <TableCell className="text-xs">{(payment as any).supplier?.companyName || "—"}</TableCell>
                    <TableCell className="text-xs">{String(payment.paymentDate)}</TableCell>
                    <TableCell className="text-xs font-semibold">${Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}</TableCell>
                    <TableCell className="text-xs">{payment.referenceNumber || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-indigo-600 h-7 text-xs px-2" onClick={async () => {
                        const data = await utils.document.paymentVoucherData.fetch({ id: payment.id });
                        if (data) {
                          const doc = generatePaymentVoucherPDF(data);
                          doc.save(`voucher-${data.payment.paymentNumber}.pdf`);
                        }
                      }}>
                        <Download className="h-3 w-3 mr-1" />{t("pdf")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {paymentsData?.items?.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-medium">{t("no_payments_yet")}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment {selectedBill ? `— ${selectedBill.billNumber}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>{t("amount_1_2")}</Label>
              <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>{t("payment_method_1_1")}</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm({ ...paymentForm, paymentMethod: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash_1_1")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bank_transfer_1_1")}</SelectItem>
                  <SelectItem value="cheque">{t("cheque_1_1")}</SelectItem>
                  <SelectItem value="credit_card">{t("credit_card")}</SelectItem>
                  <SelectItem value="wallet">{t("wallet_1_1")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("payment_date")}</Label>
              <Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
            </div>
            <div>
              <Label>{t("reference_1_1")}</Label>
              <Input value={paymentForm.referenceNumber} onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} placeholder={t("transaction_reference")} />
            </div>
            <div>
              <Label>{t("notes_1_1_1_1")}</Label>
              <Input value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleCreatePayment} disabled={createPayment.isPending} className="w-full">
              {createPayment.isPending ? tc("actions.processing") : tc("actions.recordPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
