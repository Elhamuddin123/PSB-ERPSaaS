import { useCallback, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { alertServerError } from "@/lib/i18n-ui";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Plus, DollarSign, HandCoins, Trash2, Pencil, ArrowLeftRight, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { useClientTable } from "@/lib/client-table";

const statusColors: Record<string, string> = {
  active: "bg-amber-100 text-amber-800",
  repaid: "bg-emerald-100 text-emerald-800",
  written_off: "bg-slate-100 text-slate-800",
};

export default function LoansPage() {
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const [createOpen, setCreateOpen] = useState(false);
  const [repayLoanId, setRepayLoanId] = useState<number | null>(null);
  const [editLoan, setEditLoan] = useState<{ id: number; description: string; notes: string; dueDate: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "repaid" | "written_off">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    loanDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "",
    notes: "",
  });
  const [repayForm, setRepayForm] = useState({ amount: "", notes: "" });
  const [ledgerPassLoan, setLedgerPassLoan] = useState<{ id: number; loanNumber: string; balance: string } | null>(null);
  const [ledgerPassForm, setLedgerPassForm] = useState({ direction: "receive" as "pay" | "receive", amount: "", notes: "" });
  const [searchParams] = useSearchParams();
  const customerIdFilter = Number(searchParams.get("customerId")) || undefined;

  const utils = trpc.useUtils();
  const { t, t: tc } = useTranslation("common");
  const { data, isLoading, refetch } = trpc.loan.list.useQuery({
    status: statusFilter,
    search: search || undefined,
    customerId: customerIdFilter,
    limit: 50,
  });
  const { data: stats } = trpc.loan.stats.useQuery();
  const { data: customersData } = trpc.crm.customers.useQuery({ limit: 1000 });
  const customers = customersData?.items ?? [];

  const getSortValue = useCallback((loan: NonNullable<typeof data>["items"][number], key: string) => {
    switch (key) {
      case "loanNumber": return loan.loanNumber;
      case "customer": return loan.customer ? `${loan.customer.firstName} ${loan.customer.lastName}` : "";
      case "principal": return Number(loan.principalAmount);
      case "repaid": return Number(loan.repaidAmount);
      case "balance": return Number(loan.balanceAmount);
      case "loanDate": return new Date(loan.loanDate).getTime();
      case "status": return loan.status;
      default: return "";
    }
  }, []);

  const { rows: loanRows, sortKey, sortDir, toggleSort } = useClientTable({
    items: data?.items ?? [],
    search: "",
    getSearchText: () => "",
    defaultSortKey: "loanDate",
    getSortValue,
  });

  const createLoan = trpc.loan.create.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      setCreateOpen(false);
      setForm({ customerId: "", amount: "", loanDate: new Date().toISOString().slice(0, 10), dueDate: "", description: "", notes: "" });
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });

  const recordRepayment = trpc.loan.recordRepayment.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      setRepayLoanId(null);
      setRepayForm({ amount: "", notes: "" });
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });

  const deleteLoan = trpc.loan.delete.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateLoan = trpc.loan.update.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      setEditLoan(null);
      refetch();
      alert(t("alerts.loanUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });
  const ledgerPass = trpc.loan.ledgerPass.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      await utils.receivable.customerSettlements.invalidate();
      setLedgerPassLoan(null);
      setLedgerPassForm({ direction: "receive", amount: "", notes: "" });
      refetch();
      alert(t("alerts.settlementRecorded"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const filterCustomer = customerIdFilter
    ? customers.find((c) => c.id === customerIdFilter)
    : undefined;

  return (
    <div className="space-y-6">
      {customerIdFilter && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            {t("filtering_by_customer")}:{" "}
            <strong>
              {filterCustomer
                ? `${filterCustomer.firstName} ${filterCustomer.lastName}`
                : `#${customerIdFilter}`}
            </strong>
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/loans">{t("clear_filter")}</Link>
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("cashLoans")}</h1>
          <p className="text-slate-500 text-sm">{t("trackCashLoans")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />{t("new_loan")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("issue_cash_loan")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("customer")}<span className="text-red-500">*</span></Label>
                <Select value={form.customerId} onValueChange={(v) => setForm((s) => ({ ...s, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("select_customer")} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("amount")}<span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("loan_date")}</Label>
                  <Input type="date" value={form.loanDate} onChange={(e) => setForm((s) => ({ ...s, loanDate: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("due_date")}</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>{t("description")}</Label>
                <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder={t("purpose_of_loan")} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={!form.customerId || !form.amount || createLoan.isPending}
                onClick={() => createLoan.mutate({
                  customerId: Number(form.customerId),
                  amount: form.amount,
                  loanDate: form.loanDate,
                  dueDate: form.dueDate || undefined,
                  description: form.description || undefined,
                  notes: form.notes || undefined,
                })}
              >
                {createLoan.isPending ? tc("actions.creating") : tc("actions.issueLoan")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs text-slate-500">{t("active_loans")}</p>
              <p className="text-2xl font-bold">{stats?.activeLoans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs text-slate-500">{t("outstanding_balance")}</p>
              <p className="text-2xl font-bold">${Number(stats?.outstandingBalance ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("all_loans")}</SelectItem>
          <SelectItem value="active">{t("active")}</SelectItem>
          <SelectItem value="repaid">{t("repaid")}</SelectItem>
          <SelectItem value="written_off">{t("written_off")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder={t("searchLoans")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <SortableTableHead label={t("loanNumber")} sortKey="loanNumber" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("customer")} sortKey="customer" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("principal")} sortKey="principal" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("repaid")} sortKey="repaid" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("balance")} sortKey="balance" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("loanDate")} sortKey="loanDate" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTableHead label={t("statusColumn")} sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead className="text-right">{t("actionsLabel")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">{t("loading")}</TableCell></TableRow>
            )}
            {!isLoading && loanRows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">{t("noData")}</TableCell></TableRow>
            )}
            {loanRows.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.loanNumber}</TableCell>
                <TableCell>{loan.customer ? `${loan.customer.firstName} ${loan.customer.lastName}` : "—"}</TableCell>
                <TableCell>${Number(loan.principalAmount).toLocaleString()}</TableCell>
                <TableCell>${Number(loan.repaidAmount).toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-amber-600">${Number(loan.balanceAmount).toLocaleString()}</TableCell>
                <TableCell>{new Date(loan.loanDate).toLocaleDateString()}</TableCell>
                <TableCell><Badge className={statusColors[loan.status] || ""}>{loan.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap items-center">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title={t("edit_loan")}
                      onClick={() => setEditLoan({
                        id: loan.id,
                        description: loan.description || "",
                        notes: loan.notes || "",
                        dueDate: loan.dueDate ? String(loan.dueDate).slice(0, 10) : "",
                      })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {loan.status === "active" && Number(loan.balanceAmount) > 0 && canManage && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setRepayLoanId(loan.id); setRepayForm({ amount: String(loan.balanceAmount), notes: "" }); }}>{t("record_repayment")}</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 h-7 text-xs px-2"
                        title={t("ledger_pass")}
                        onClick={() => {
                          setLedgerPassLoan({ id: loan.id, loanNumber: loan.loanNumber, balance: String(loan.balanceAmount) });
                          setLedgerPassForm({ direction: "receive", amount: String(loan.balanceAmount), notes: "" });
                        }}
                      >
                        <ArrowLeftRight className="h-3 w-3 mr-1" />{t("ledger_pass")}
                      </Button>
                    </>
                  )}
                  {canManage && Number(loan.balanceAmount) === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 h-8 w-8 p-0"
                      title={t("delete_loan_reverses_accounting")}
                      disabled={deleteLoan.isPending}
                      onClick={() => {
                        if (confirm(tc("confirm.deleteLoan", { name: loan.loanNumber }))) {
                          deleteLoan.mutate({ id: loan.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!repayLoanId} onOpenChange={() => setRepayLoanId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("record_loan_repayment")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>{t("amount")}</Label>
              <Input type="number" step="0.01" value={repayForm.amount} onChange={(e) => setRepayForm((s) => ({ ...s, amount: e.target.value }))} />
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Input value={repayForm.notes} onChange={(e) => setRepayForm((s) => ({ ...s, notes: e.target.value }))} />
            </div>
            <Button
              className="w-full bg-indigo-600"
              disabled={!repayForm.amount || recordRepayment.isPending}
              onClick={() => recordRepayment.mutate({
                loanId: repayLoanId!,
                amount: repayForm.amount,
                notes: repayForm.notes || undefined,
              })}
            >
              {recordRepayment.isPending ? tc("actions.processing") : tc("actions.confirmRepayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editLoan} onOpenChange={() => setEditLoan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("edit_loan")}</DialogTitle></DialogHeader>
          {editLoan && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{t("loan_fields_locked")}</p>
              <div>
                <Label>{t("description")}</Label>
                <Input value={editLoan.description} onChange={(e) => setEditLoan({ ...editLoan, description: e.target.value })} />
              </div>
              <div>
                <Label>{t("due_date")}</Label>
                <Input type="date" value={editLoan.dueDate} onChange={(e) => setEditLoan({ ...editLoan, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Input value={editLoan.notes} onChange={(e) => setEditLoan({ ...editLoan, notes: e.target.value })} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={updateLoan.isPending}
                onClick={() => updateLoan.mutate({
                  id: editLoan.id,
                  description: editLoan.description || undefined,
                  notes: editLoan.notes || undefined,
                  dueDate: editLoan.dueDate || undefined,
                })}
              >
                {updateLoan.isPending ? tc("actions.saving") : t("save_changes")}
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
              <p className="text-sm text-slate-500">{ledgerPassLoan.loanNumber} — ${Number(ledgerPassLoan.balance).toLocaleString()} {t("outstanding_balance").toLowerCase()}</p>
              <div>
                <Label>{t("settlement_direction")}</Label>
                <Select value={ledgerPassForm.direction} onValueChange={(v) => setLedgerPassForm((s) => ({ ...s, direction: v as "pay" | "receive" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receive">{t("settlement_loan_repayment")}</SelectItem>
                    <SelectItem value="pay">{t("settlement_loan_disbursement")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {ledgerPassForm.direction === "receive"
                    ? t("settlement_loan_repayment_hint")
                    : t("settlement_loan_disbursement_hint")}
                </p>
              </div>
              <div>
                <Label>{t("amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={ledgerPassForm.direction === "receive" ? Number(ledgerPassLoan.balance) : undefined}
                  value={ledgerPassForm.amount}
                  onChange={(e) => setLedgerPassForm((s) => ({ ...s, amount: e.target.value }))}
                />
                {ledgerPassForm.direction === "receive" && Number(ledgerPassForm.amount) > Number(ledgerPassLoan.balance) + 0.01 && (
                  <p className="text-xs text-red-600 mt-1">{t("loan_repayment_exceeds_balance")}</p>
                )}
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Input value={ledgerPassForm.notes} onChange={(e) => setLedgerPassForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={
                  !ledgerPassForm.amount
                  || ledgerPass.isPending
                  || (ledgerPassForm.direction === "receive"
                    && Number(ledgerPassForm.amount) > Number(ledgerPassLoan.balance) + 0.01)
                }
                onClick={() => ledgerPass.mutate({
                  loanId: ledgerPassLoan.id,
                  direction: ledgerPassForm.direction,
                  amount: ledgerPassForm.amount,
                  notes: ledgerPassForm.notes || undefined,
                })}
              >
                {ledgerPass.isPending ? tc("actions.processing") : t("record_settlement")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
