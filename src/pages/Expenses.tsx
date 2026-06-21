import { useTranslation } from 'react-i18next';
import { alertServerError } from "@/lib/i18n-ui";
import { useCallback, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Receipt, Search, Plus, CheckCircle, XCircle, Clock, DollarSign, BookOpen, Trash2, Pencil, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClientTable } from "@/lib/client-table";

const statusConfig: Record<string, { color: string; icon: any }> = {
  approved: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  pending: { color: "bg-amber-100 text-amber-800", icon: Clock },
  rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
  reimbursed: { color: "bg-blue-100 text-blue-800", icon: DollarSign },
};

export default function ExpensesPage() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<{
    id: number;
    status: string;
    categoryId: number;
    title: string;
    description: string;
    amount: string;
    expenseDate: string;
    paymentMethod: "cash" | "card" | "bank_transfer" | "cheque" | "wallet" | "other";
    vendor: string;
    receiptNumber: string;
    notes: string;
  } | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<{ id: number; name: string; description: string; color: string } | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "#6366f1" });

  const utils = trpc.useUtils();
  const { data: expensesData, refetch } = trpc.expense.list.useQuery({ search, status: statusFilter });
  const { data: categories } = trpc.expense.categories.useQuery();
  const { data: stats } = trpc.expense.stats.useQuery();
  const createExpense = trpc.expense.create.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.expense.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.expenseByCategory.invalidate();
      refetch();
      setCreateOpen(false);
      setNewExpense({ categoryId: 0, title: "", description: "", amount: "", expenseDate: "", paymentMethod: "card" as const, vendor: "", receiptNumber: "", notes: "" });
    },
    onError: (err) => alertServerError(t, err),
  });
  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.expense.stats.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });

  const updateStatus = trpc.expense.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.expense.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.expenseByCategory.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateExpense = trpc.expense.update.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.expense.stats.invalidate();
      setEditExpense(null);
      refetch();
      alert(t("alerts.expenseUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });
  const createCategory = trpc.expense.createCategory.useMutation({
    onSuccess: async () => {
      await utils.expense.categories.invalidate();
      setCategoryDialogOpen(false);
      setNewCategory({ name: "", description: "", color: "#6366f1" });
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateCategory = trpc.expense.updateCategory.useMutation({
    onSuccess: async () => {
      await utils.expense.categories.invalidate();
      setEditCategory(null);
    },
    onError: (err) => alertServerError(t, err),
  });
  const deleteCategory = trpc.expense.deleteCategory.useMutation({
    onSuccess: async () => {
      await utils.expense.categories.invalidate();
    },
    onError: (err) => alertServerError(t, err),
  });

  const [newExpense, setNewExpense] = useState<{
    categoryId: number; title: string; description: string; amount: string; expenseDate: string;
    paymentMethod: "cash" | "card" | "bank_transfer" | "cheque" | "wallet" | "other"; vendor: string; receiptNumber: string; notes: string;
  }>({
    categoryId: 0, title: "", description: "", amount: "", expenseDate: "",
    paymentMethod: "card", vendor: "", receiptNumber: "", notes: "",
  });

  const statusCounts: Record<string, { count: number; total: number }> = {};
  (stats?.statusCounts || []).forEach(s => statusCounts[s.status] = { count: s.count, total: s.total });
  const totalAll = Object.values(statusCounts).reduce((sum, s) => sum + s.total, 0);

  const getSortValue = useCallback((expense: NonNullable<typeof expensesData>["items"][number], key: string) => {
    switch (key) {
      case "title": return expense.title;
      case "category": return expense.category?.name || "";
      case "vendor": return expense.vendor || "";
      case "expenseDate": return expense.expenseDate ? new Date(expense.expenseDate).getTime() : 0;
      case "amount": return Number(expense.amount);
      case "status": return expense.status;
      default: return "";
    }
  }, []);

  const { rows: expenseRows, toggleSort: toggleExpenseSort, sortKey: activeSortKey, sortDir: activeSortDir } = useClientTable({
    items: expensesData?.items ?? [],
    search: "",
    getSearchText: () => "",
    defaultSortKey: "expenseDate",
    getSortValue,
  });

  const toggleSort = (key: string) => {
    toggleExpenseSort(key);
  };

  const sortIndicator = (key: string) => {
    if (activeSortKey !== key) return " ↕";
    return activeSortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("expense_management")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("track_approve_and_manage_business_expenses")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />{t("submit_expense")}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader><DialogTitle>{t("submit_new_expense")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-4">
              <div>
                <Label>{t("category")}</Label>
                <Select onValueChange={v => setNewExpense({...newExpense, categoryId: Number(v)})}>
                  <SelectTrigger><SelectValue placeholder={t("select_category")} /></SelectTrigger>
                  <SelectContent>
                    {(categories || []).length === 0 ? (
                      <SelectItem value="__empty__" disabled>{t("no_records_found")}</SelectItem>
                    ) : (
                      (categories || []).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("title")}</Label><Input value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} placeholder={t("expense_title")} /></div>
              <div><Label>{t("amount")}</Label><Input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} placeholder="0.00" /></div>
              <div><Label>{t("date")}</Label><Input type="date" onChange={e => setNewExpense({...newExpense, expenseDate: e.target.value})} /></div>
              <div>
                <Label>{t("payment_method")}</Label>
                <Select value={newExpense.paymentMethod} onValueChange={v => setNewExpense({...newExpense, paymentMethod: v as "cash" | "card" | "bank_transfer" | "cheque" | "wallet" | "other"})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                    <SelectItem value="cheque">{t("cheque")}</SelectItem>
                    <SelectItem value="wallet">{t("wallet")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("vendor")}</Label><Input value={newExpense.vendor} onChange={e => setNewExpense({...newExpense, vendor: e.target.value})} placeholder={t("vendor_name")} /></div>
              <Button className="w-full bg-indigo-600" onClick={() => createExpense.mutate(newExpense)} disabled={!newExpense.title || !newExpense.amount || !newExpense.categoryId || !newExpense.expenseDate || createExpense.isPending}>{t("submit_expense")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {canEdit && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />{t("expenseCategories")}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">{t("manageExpenseCategories")}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />{t("addCategory")}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(categories || []).map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                  <span>{cat.name}</span>
                  {cat.isSystem && <Badge variant="secondary" className="text-[10px]">{t("systemCategory")}</Badge>}
                  {!cat.isSystem && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditCategory({
                          id: cat.id,
                          name: cat.name,
                          description: cat.description || "",
                          color: cat.color || "#6366f1",
                        })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500"
                        disabled={deleteCategory.isPending}
                        onClick={() => {
                          if (confirm(t("confirmDeleteCategory", { name: cat.name }))) {
                            deleteCategory.mutate({ id: cat.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats - FIXED: 2 cols on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {["approved", "pending", "rejected", "reimbursed"].map(status => {
          const s = statusCounts[status];
          const pct = totalAll > 0 ? ((s?.total || 0) / totalAll) * 100 : 0;
          const cfg = statusConfig[status];
          const Icon = cfg?.icon || Receipt;
          return (
            <Card key={status} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === status ? "" : status)}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${cfg?.color?.split(" ")[0]}`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 capitalize">{status}</p>
                    <p className="text-lg sm:text-xl font-bold">${(s?.total || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-2"><Progress value={pct} className="h-1.5" /></div>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{s?.count || 0} expenses</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">{t("monthly_expense_trend")}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder={t("search_expenses")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("title")}>{t("expense")}{sortIndicator("title")}</button></th>
                <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("category")}>{t("category")}{sortIndicator("category")}</button></th>
                <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("vendor")}>{t("vendor")}{sortIndicator("vendor")}</button></th>
                <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("expenseDate")}>{t("date")}{sortIndicator("expenseDate")}</button></th>
                <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("amount")}>{t("amount")}{sortIndicator("amount")}</button></th>
                <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs"><button type="button" onClick={() => toggleSort("status")}>{t("statusColumn")}{sortIndicator("status")}</button></th>
                <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("actions")}</th>
              </tr></thead>
              <tbody>
                {expenseRows.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="p-2 sm:p-3">
                      <p className="font-medium text-xs sm:text-sm">{expense.title}</p>
                      <p className="text-[10px] text-slate-500">{expense.receiptNumber}</p>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: expense.category?.color || "#6366f1" }} />
                        <span className="text-xs sm:text-sm">{expense.category?.name}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">{expense.vendor}</td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">{expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : "-"}</td>
                    <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">${Number(expense.amount).toLocaleString()}</td>
                    <td className="p-2 sm:p-3 text-center">
                      <Badge className={`text-[10px] ${statusConfig[expense.status]?.color || ""}`}>{expense.status}</Badge>
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <div className="flex justify-center gap-1 flex-wrap items-center">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={t("edit_expense")}
                          onClick={() => setEditExpense({
                            id: expense.id,
                            status: expense.status,
                            categoryId: expense.categoryId ?? 0,
                            title: expense.title,
                            description: expense.description || "",
                            amount: String(expense.amount),
                            expenseDate: expense.expenseDate ? String(expense.expenseDate).slice(0, 10) : "",
                            paymentMethod: expense.paymentMethod,
                            vendor: expense.vendor || "",
                            receiptNumber: expense.receiptNumber || "",
                            notes: expense.notes || "",
                          })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {expense.status === "pending" && (
                        <div className="flex justify-center gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" className="text-emerald-600 h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: expense.id, status: "approved" })}>
                            <CheckCircle className="h-3 w-3 mr-1" />{t("approve")}</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: expense.id, status: "rejected" })}>
                            <XCircle className="h-3 w-3 mr-1" />{t("reject")}</Button>
                        </div>
                      )}
                      {expense.status === "approved" && (
                        <div className="flex justify-center gap-1 flex-wrap items-center">
                          <span className="inline-flex items-center text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded" title={t("journal_entry_auto_posted_on_approval")}>
                            <BookOpen className="h-3 w-3 mr-1" />{t("posted")}</span>
                          <Button size="sm" variant="ghost" className="text-blue-600 h-7 text-xs px-2" onClick={() => updateStatus.mutate({ id: expense.id, status: "reimbursed" })}>
                            <DollarSign className="h-3 w-3 mr-1" />{t("reimburse")}</Button>
                        </div>
                      )}
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 h-7 w-7 p-0 ml-1"
                          title={t("delete_reverses_accounting_if_posted")}
                          disabled={deleteExpense.isPending}
                          onClick={() => {
                            if (confirm(t("confirm.deleteExpense", { name: expense.title, suffix: expense.status === "approved" ? t("confirm.accountingReversal") : "" }))) {
                              deleteExpense.mutate({ id: expense.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!editExpense} onOpenChange={() => setEditExpense(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("edit_expense")}</DialogTitle></DialogHeader>
          {editExpense && (
            <div className="space-y-3 pt-4">
              {editExpense.status !== "pending" && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{t("expense_fields_locked")}</p>
              )}
              <div><Label>{t("title")}</Label><Input value={editExpense.title} onChange={e => setEditExpense({ ...editExpense, title: e.target.value })} /></div>
              <div><Label>{t("description")}</Label><Input value={editExpense.description} onChange={e => setEditExpense({ ...editExpense, description: e.target.value })} /></div>
              {editExpense.status === "pending" && (
                <>
                  <div>
                    <Label>{t("category")}</Label>
                    <Select value={editExpense.categoryId ? String(editExpense.categoryId) : ""} onValueChange={v => setEditExpense({ ...editExpense, categoryId: Number(v) })}>
                      <SelectTrigger><SelectValue placeholder={t("select_category")} /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t("amount")}</Label><Input type="number" value={editExpense.amount} onChange={e => setEditExpense({ ...editExpense, amount: e.target.value })} /></div>
                  <div><Label>{t("date")}</Label><Input type="date" value={editExpense.expenseDate} onChange={e => setEditExpense({ ...editExpense, expenseDate: e.target.value })} /></div>
                  <div>
                    <Label>{t("payment_method")}</Label>
                    <Select value={editExpense.paymentMethod} onValueChange={v => setEditExpense({ ...editExpense, paymentMethod: v as typeof editExpense.paymentMethod })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t("cash")}</SelectItem>
                        <SelectItem value="card">{t("card")}</SelectItem>
                        <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                        <SelectItem value="cheque">{t("cheque")}</SelectItem>
                        <SelectItem value="wallet">{t("wallet")}</SelectItem>
                        <SelectItem value="other">other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div><Label>{t("vendor")}</Label><Input value={editExpense.vendor} onChange={e => setEditExpense({ ...editExpense, vendor: e.target.value })} /></div>
              <div><Label>{t("receipt_cheque_number")}</Label><Input value={editExpense.receiptNumber} onChange={e => setEditExpense({ ...editExpense, receiptNumber: e.target.value })} /></div>
              <div><Label>{t("notes")}</Label><Input value={editExpense.notes} onChange={e => setEditExpense({ ...editExpense, notes: e.target.value })} /></div>
              <Button
                className="w-full bg-indigo-600"
                disabled={!editExpense.title || updateExpense.isPending}
                onClick={() => updateExpense.mutate({
                  id: editExpense.id,
                  title: editExpense.title,
                  description: editExpense.description || undefined,
                  vendor: editExpense.vendor || undefined,
                  receiptNumber: editExpense.receiptNumber || undefined,
                  notes: editExpense.notes || undefined,
                  ...(editExpense.status === "pending" ? {
                    categoryId: editExpense.categoryId,
                    amount: editExpense.amount,
                    expenseDate: editExpense.expenseDate,
                    paymentMethod: editExpense.paymentMethod,
                  } : {}),
                })}
              >
                {updateExpense.isPending ? t("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t("addCategory")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>{t("categoryName")}</Label><Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} /></div>
            <div><Label>{t("description")}</Label><Input value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} /></div>
            <div><Label>{t("categoryColor")}</Label><Input type="color" value={newCategory.color} onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })} /></div>
            <Button className="w-full bg-indigo-600" disabled={!newCategory.name || createCategory.isPending} onClick={() => createCategory.mutate(newCategory)}>
              {createCategory.isPending ? t("actions.creating") : t("addCategory")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editCategory} onOpenChange={() => setEditCategory(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t("editCategory")}</DialogTitle></DialogHeader>
          {editCategory && (
            <div className="space-y-3 pt-2">
              <div><Label>{t("categoryName")}</Label><Input value={editCategory.name} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} /></div>
              <div><Label>{t("description")}</Label><Input value={editCategory.description} onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })} /></div>
              <div><Label>{t("categoryColor")}</Label><Input type="color" value={editCategory.color} onChange={(e) => setEditCategory({ ...editCategory, color: e.target.value })} /></div>
              <Button className="w-full bg-indigo-600" disabled={!editCategory.name || updateCategory.isPending} onClick={() => updateCategory.mutate(editCategory)}>
                {updateCategory.isPending ? t("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
