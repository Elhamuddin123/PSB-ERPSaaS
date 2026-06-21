import { useCallback, useState } from "react";
import { alertServerError } from "@/lib/i18n-ui";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, CheckCircle, XCircle, Clock, DollarSign, Download, Trash2, Pencil, ArrowLeftRight } from "lucide-react";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { generateDepositReceiptPDF } from "@/lib/pdf-generator";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useClientTable } from "@/lib/client-table";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" },
  under_review: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Under Review" },
  approved: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Rejected" },
  expired: { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Expired" },
};

export default function DepositsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    walletId: "",
    customerId: "",
    amount: "",
    paymentMethod: "cash" as "cash" | "bank_transfer" | "cheque",
    referenceNumber: "",
    locationId: "",
    notes: "",
  });

  const { t, t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canApprove = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const [editDeposit, setEditDeposit] = useState<{
    id: number;
    status: string;
    walletId: string;
    customerId: string;
    amount: string;
    paymentMethod: "cash" | "bank_transfer" | "cheque";
    referenceNumber: string;
    locationId: string;
    notes: string;
  } | null>(null);
  const [settleDeposit, setSettleDeposit] = useState<{ id: number; depositCode: string; amount: string; walletId: number } | null>(null);
  const [settleForm, setSettleForm] = useState({ direction: "pay" as "pay" | "receive", amount: "", notes: "" });

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.deposit.list.useQuery(
    { status: statusFilter || undefined, limit: 50 }
  );
  const { data: wallets } = trpc.wallet.list.useQuery();
  const { data: locations } = trpc.paymentLocation.list.useQuery({ status: "active" });
  const { data: customersData } = trpc.crm.customers.useQuery({ limit: 1000 });
  const customers = customersData?.items ?? [];
  const { data: stats } = trpc.deposit.stats.useQuery();
  const createDeposit = trpc.deposit.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreateOpen(false);
      setNewDeposit({ walletId: "", customerId: "", amount: "", paymentMethod: "cash", referenceNumber: "", locationId: "", notes: "" });
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateStatus = trpc.deposit.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => alertServerError(t, err),
  });
  const deleteDeposit = trpc.deposit.delete.useMutation({
    onSuccess: async () => {
      await utils.deposit.list.invalidate();
      await utils.deposit.stats.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateDeposit = trpc.deposit.update.useMutation({
    onSuccess: async () => {
      await utils.deposit.list.invalidate();
      setEditDeposit(null);
      refetch();
      alert(t("alerts.depositUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });
  const ledgerPass = trpc.deposit.ledgerPass.useMutation({
    onSuccess: async () => {
      await utils.deposit.list.invalidate();
      await utils.deposit.stats.invalidate();
      await utils.deposit.settlementInfo.invalidate();
      await utils.receivable.customerSettlements.invalidate();
      setSettleDeposit(null);
      setSettleForm({ direction: "pay", amount: "", notes: "" });
      refetch();
      alert(t("alerts.settlementRecorded"));
    },
    onError: (err) => alertServerError(t, err),
  });
  const { data: settlementInfo } = trpc.deposit.settlementInfo.useQuery(
    { id: settleDeposit?.id ?? 0 },
    { enabled: !!settleDeposit },
  );

  const statusCounts: Record<string, { count: number; total: number }> = {};
  (stats?.statusCounts || []).forEach((s: any) => statusCounts[s.status] = { count: s.count, total: s.total });

  const getSearchText = useCallback((d: NonNullable<typeof data>["items"][number]) => {
    return [
      d.depositCode,
      d.customer?.firstName,
      d.customer?.lastName,
    ].filter(Boolean).join(" ");
  }, []);

  const getSortValue = useCallback((d: NonNullable<typeof data>["items"][number], key: string) => {
    switch (key) {
      case "depositCode": return d.depositCode;
      case "amount": return Number(d.amount);
      case "method": return d.paymentMethod;
      case "wallet": return d.wallet?.name || "";
      case "status": return d.status;
      default: return "";
    }
  }, []);

  const { rows: depositRows, sortKey, sortDir, toggleSort } = useClientTable({
    items: data?.items ?? [],
    search,
    getSearchText,
    defaultSortKey: "depositCode",
    getSortValue,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("depositManagement")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("trackAndApproveDeposits")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />{t("create_deposit")}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("create_deposit_request")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-4">
              <div>
                <label className="text-sm text-slate-500">{t("wallet")}</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={newDeposit.walletId} onChange={e => setNewDeposit(s => ({ ...s, walletId: e.target.value }))}>
                  <option value="">{t("select_wallet")}</option>
                  {(wallets || []).map((w: any) => <option key={w.id} value={w.id}>{w.name} (${Number(w.balance).toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("customer")}</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={newDeposit.customerId} onChange={e => setNewDeposit(s => ({ ...s, customerId: e.target.value }))}>
                  <option value="">{t("select_customer_optional")}</option>
                  {(customers || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("payment_method")}</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={newDeposit.paymentMethod} onChange={e => setNewDeposit(s => ({ ...s, paymentMethod: e.target.value as any }))}>
                  <option value="cash">{t("cash")}</option>
                  <option value="bank_transfer">{t("bank_transfer")}</option>
                  <option value="cheque">{t("cheque")}</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("amount_1_1_1")}</label>
                <Input type="number" step="0.01" value={newDeposit.amount} onChange={e => setNewDeposit(s => ({ ...s, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("reference_number")}</label>
                <Input value={newDeposit.referenceNumber} onChange={e => setNewDeposit(s => ({ ...s, referenceNumber: e.target.value }))} placeholder={t("receipt_cheque_number")} />
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("payment_location")}</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={newDeposit.locationId} onChange={e => setNewDeposit(s => ({ ...s, locationId: e.target.value }))}>
                  <option value="">{t("select_location")}</option>
                  {(locations?.items || []).map((l: any) => <option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("notes_1")}</label>
                <Input value={newDeposit.notes} onChange={e => setNewDeposit(s => ({ ...s, notes: e.target.value }))} placeholder={t("optional_notes")} />
              </div>
              <Button className="w-full bg-indigo-600" disabled={!newDeposit.walletId || !newDeposit.amount || createDeposit.isPending} onClick={() => createDeposit.mutate({
                walletId: Number(newDeposit.walletId),
                customerId: newDeposit.customerId ? Number(newDeposit.customerId) : undefined,
                amount: newDeposit.amount,
                paymentMethod: newDeposit.paymentMethod,
                referenceNumber: newDeposit.referenceNumber || undefined,
                locationId: newDeposit.locationId ? Number(newDeposit.locationId) : undefined,
                notes: newDeposit.notes || undefined,
              })}>
                {createDeposit.isPending ? tc("actions.creating") : tc("actions.createDeposit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        {["pending", "under_review", "approved", "rejected", "expired"].map(status => {
          const s = statusCounts[status];
          const cfg = statusConfig[status];
          const Icon = cfg?.icon || DollarSign;
          return (
            <Card key={status} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === status ? "" : status)}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${cfg?.color?.split(" ")[0]}`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500">{cfg?.label}</p>
                    <p className="text-lg sm:text-xl font-bold">${(s?.total || 0).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{s?.count || 0} deposits</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder={t("searchByCodeOrCustomer")} className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-red-500 mb-2">{t("failed_to_load_deposits")}</p>
          <Button variant="outline" onClick={() => refetch()}>{t("retry_1_1")}</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <SortableTableHead label={t("depositCode")} sortKey="depositCode" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("amount")} sortKey="amount" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("depositMethod")} sortKey="method" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("wallet")} sortKey="wallet" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("statusColumn")} sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead className="text-right">{t("actionsLabel")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depositRows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">{t("noData")}</TableCell>
                </TableRow>
              )}
              {depositRows?.map((d: any) => {
                const cfg = statusConfig[d.status] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{d.depositCode}</div>
                      <div className="text-xs text-slate-500">{d.customer ? `${d.customer.firstName} ${d.customer.lastName}` : "Walk-in"}</div>
                    </TableCell>
                    <TableCell className="font-medium">${Number(d.amount).toLocaleString()}</TableCell>
                    <TableCell className="capitalize text-sm">{d.paymentMethod.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{d.wallet?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={cfg.color}>
                        <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap items-center">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={t("edit_deposit")}
                          onClick={() => setEditDeposit({
                            id: d.id,
                            status: d.status,
                            walletId: String(d.walletId),
                            customerId: d.customerId ? String(d.customerId) : "",
                            amount: String(d.amount),
                            paymentMethod: d.paymentMethod,
                            referenceNumber: d.referenceNumber || "",
                            locationId: d.locationId ? String(d.locationId) : "",
                            notes: d.notes || "",
                          })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {d.status === "pending" && canApprove && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-600 h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: d.id, status: "approved" })} disabled={updateStatus.isPending}>
                            <CheckCircle className="h-3 w-3 mr-1" />{t("approve")}</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: d.id, status: "rejected" })} disabled={updateStatus.isPending}>
                            <XCircle className="h-3 w-3 mr-1" />{t("reject")}</Button>
                        </div>
                      )}
                      {d.status === "pending" && !canApprove && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">{t("pending_1")}</span>
                      )}
                      {d.status === "approved" && d.customerId && canApprove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-indigo-600 h-7 text-xs px-2"
                          title={t("ledger_pass")}
                          onClick={() => {
                            setSettleDeposit({ id: d.id, depositCode: d.depositCode, amount: String(d.amount), walletId: d.walletId });
                            setSettleForm({ direction: "pay", amount: "", notes: "" });
                          }}
                        >
                          <ArrowLeftRight className="h-3 w-3 mr-1" />{t("ledger_pass")}
                        </Button>
                      )}
                      {d.status === "approved" && (
                        <Button size="sm" variant="ghost" className="text-indigo-600 h-7 text-xs px-2" onClick={async () => {
                          const data = await utils.document.depositReceiptData.fetch({ id: d.id });
                          if (data) {
                            const doc = generateDepositReceiptPDF(data);
                            doc.save(`receipt-${data.deposit.depositCode}.pdf`);
                          }
                        }}>
                          <Download className="h-3 w-3 mr-1" />{t("receipt")}</Button>
                      )}
                      {canApprove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 h-7 w-7 p-0"
                          title={t("delete_reverses_accounting_if_approved")}
                          disabled={deleteDeposit.isPending}
                          onClick={() => {
                            if (confirm(tc("confirm.deleteDeposit", { name: d.depositCode, suffix: d.status === "approved" ? tc("confirm.accountingReversal") : "" }))) {
                              deleteDeposit.mutate({ id: d.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={!!editDeposit} onOpenChange={() => setEditDeposit(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("edit_deposit")}</DialogTitle></DialogHeader>
          {editDeposit && (
            <div className="space-y-3 pt-4">
              {!["pending", "under_review"].includes(editDeposit.status) && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{t("deposit_fields_locked")}</p>
              )}
              {["pending", "under_review"].includes(editDeposit.status) && (
                <>
                  <div>
                    <label className="text-sm text-slate-500">{t("wallet")}</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={editDeposit.walletId} onChange={e => setEditDeposit(s => ({ ...s!, walletId: e.target.value }))}>
                      <option value="">{t("select_wallet")}</option>
                      {(wallets || []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">{t("customer")}</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={editDeposit.customerId} onChange={e => setEditDeposit(s => ({ ...s!, customerId: e.target.value }))}>
                      <option value="">{t("select_customer_optional")}</option>
                      {(customers || []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">{t("payment_method")}</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={editDeposit.paymentMethod} onChange={e => setEditDeposit(s => ({ ...s!, paymentMethod: e.target.value as any }))}>
                      <option value="cash">{t("cash")}</option>
                      <option value="bank_transfer">{t("bank_transfer")}</option>
                      <option value="cheque">{t("cheque")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">{t("amount_1_1_1")}</label>
                    <Input type="number" step="0.01" value={editDeposit.amount} onChange={e => setEditDeposit(s => ({ ...s!, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">{t("payment_location")}</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={editDeposit.locationId} onChange={e => setEditDeposit(s => ({ ...s!, locationId: e.target.value }))}>
                      <option value="">{t("select_location")}</option>
                      {(locations?.items || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-slate-500">{t("reference_number")}</label>
                <Input value={editDeposit.referenceNumber} onChange={e => setEditDeposit(s => ({ ...s!, referenceNumber: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("notes_1")}</label>
                <Input value={editDeposit.notes} onChange={e => setEditDeposit(s => ({ ...s!, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={updateDeposit.isPending}
                onClick={() => {
                  const isPending = ["pending", "under_review"].includes(editDeposit.status);
                  updateDeposit.mutate({
                    id: editDeposit.id,
                    ...(isPending ? {
                      walletId: Number(editDeposit.walletId),
                      customerId: editDeposit.customerId ? Number(editDeposit.customerId) : undefined,
                      amount: editDeposit.amount,
                      paymentMethod: editDeposit.paymentMethod,
                      locationId: editDeposit.locationId ? Number(editDeposit.locationId) : undefined,
                    } : {}),
                    referenceNumber: editDeposit.referenceNumber || undefined,
                    notes: editDeposit.notes || undefined,
                  });
                }}
              >
                {updateDeposit.isPending ? tc("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!settleDeposit} onOpenChange={() => setSettleDeposit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("ledger_pass")}</DialogTitle></DialogHeader>
          {settleDeposit && (
            <div className="space-y-3 pt-4">
              <p className="text-sm text-slate-500">{settleDeposit.depositCode} — ${Number(settleDeposit.amount).toLocaleString()}</p>
              {settlementInfo && (
                <div className="text-xs bg-slate-50 rounded p-2 space-y-1">
                  <p>{t("deposit_total")}: ${settlementInfo.amount.toLocaleString()}</p>
                  <p>{t("deposit_paid_out")}: ${settlementInfo.paidOut.toLocaleString()}</p>
                  <p className="font-medium text-indigo-700">{t("deposit_remaining_settleable")}: ${settlementInfo.remaining.toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-slate-500">{t("settlement_direction")}</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white mt-1"
                  value={settleForm.direction}
                  onChange={(e) => setSettleForm((s) => ({ ...s, direction: e.target.value as "pay" | "receive" }))}
                >
                  <option value="pay">{t("settlement_deposit_refund")}</option>
                  <option value="receive">{t("settlement_deposit_receive")}</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("amount_1_1_1")}</label>
                <Input
                  type="number"
                  step="0.01"
                  max={settleForm.direction === "pay" && settlementInfo ? settlementInfo.remaining : undefined}
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm((s) => ({ ...s, amount: e.target.value }))}
                />
                {settleForm.direction === "pay" && settlementInfo && Number(settleForm.amount) > settlementInfo.remaining + 0.01 && (
                  <p className="text-xs text-red-600 mt-1">{t("deposit_settlement_exceeds_remaining")}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-500">{t("notes_1")}</label>
                <Input value={settleForm.notes} onChange={(e) => setSettleForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={
                  !settleForm.amount
                  || ledgerPass.isPending
                  || (settleForm.direction === "pay"
                    && settlementInfo != null
                    && Number(settleForm.amount) > settlementInfo.remaining + 0.01)
                }
                onClick={() => ledgerPass.mutate({
                  depositId: settleDeposit.id,
                  direction: settleForm.direction,
                  amount: settleForm.amount,
                  walletId: settleDeposit.walletId,
                  notes: settleForm.notes || undefined,
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
