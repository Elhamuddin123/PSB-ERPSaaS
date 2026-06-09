import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, DollarSign, HandCoins, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole } from "@/lib/roles";

const statusColors: Record<string, string> = {
  active: "bg-amber-100 text-amber-800",
  repaid: "bg-emerald-100 text-emerald-800",
  written_off: "bg-slate-100 text-slate-800",
};

export default function LoansPage() {
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const [createOpen, setCreateOpen] = useState(false);
  const [repayLoanId, setRepayLoanId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "repaid" | "written_off">("all");
  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    loanDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "",
    notes: "",
  });
  const [repayForm, setRepayForm] = useState({ amount: "", notes: "" });

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.loan.list.useQuery({ status: statusFilter, limit: 50 });
  const { data: stats } = trpc.loan.stats.useQuery();
  const { data: customersData } = trpc.crm.customers.useQuery({ limit: 1000 });
  const customers = customersData?.items ?? [];

  const createLoan = trpc.loan.create.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      setCreateOpen(false);
      setForm({ customerId: "", amount: "", loanDate: new Date().toISOString().slice(0, 10), dueDate: "", description: "", notes: "" });
      refetch();
    },
    onError: (err) => alert(err.message),
  });

  const recordRepayment = trpc.loan.recordRepayment.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      setRepayLoanId(null);
      setRepayForm({ amount: "", notes: "" });
      refetch();
    },
    onError: (err) => alert(err.message),
  });

  const deleteLoan = trpc.loan.delete.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      await utils.loan.stats.invalidate();
      refetch();
    },
    onError: (err) => alert(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cash Loans</h1>
          <p className="text-slate-500 text-sm">Track cash loans given to customers with accounts</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> New Loan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue Cash Loan</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Customer <span className="text-red-500">*</span></Label>
                <Select value={form.customerId} onValueChange={(v) => setForm((s) => ({ ...s, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
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
                <Label>Amount <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Loan Date</Label>
                  <Input type="date" value={form.loanDate} onChange={(e) => setForm((s) => ({ ...s, loanDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Purpose of loan" />
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
                {createLoan.isPending ? "Creating..." : "Issue Loan"}
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
              <p className="text-xs text-slate-500">Active Loans</p>
              <p className="text-2xl font-bold">{stats?.activeLoans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs text-slate-500">Outstanding Balance</p>
              <p className="text-2xl font-bold">${Number(stats?.outstandingBalance ?? 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Loans</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="repaid">Repaid</SelectItem>
          <SelectItem value="written_off">Written Off</SelectItem>
        </SelectContent>
      </Select>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Repaid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Loan Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No loans found.</TableCell></TableRow>
            )}
            {data?.items?.map((loan: {
              id: number;
              loanNumber: string;
              customer?: { firstName: string; lastName: string } | null;
              principalAmount: string;
              repaidAmount: string;
              balanceAmount: string;
              loanDate: string;
              status: string;
            }) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.loanNumber}</TableCell>
                <TableCell>{loan.customer ? `${loan.customer.firstName} ${loan.customer.lastName}` : "—"}</TableCell>
                <TableCell>${Number(loan.principalAmount).toLocaleString()}</TableCell>
                <TableCell>${Number(loan.repaidAmount).toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-amber-600">${Number(loan.balanceAmount).toLocaleString()}</TableCell>
                <TableCell>{new Date(loan.loanDate).toLocaleDateString()}</TableCell>
                <TableCell><Badge className={statusColors[loan.status] || ""}>{loan.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  {loan.status === "active" && Number(loan.balanceAmount) > 0 && (
                    <Button size="sm" variant="outline" onClick={() => { setRepayLoanId(loan.id); setRepayForm({ amount: String(loan.balanceAmount), notes: "" }); }}>
                      Record Repayment
                    </Button>
                  )}
                  {canManage && Number(loan.balanceAmount) === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 h-8 w-8 p-0"
                      title="Delete loan (reverses accounting)"
                      disabled={deleteLoan.isPending}
                      onClick={() => {
                        if (confirm(`Delete loan ${loan.loanNumber}?`)) {
                          deleteLoan.mutate({ id: loan.id });
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

      <Dialog open={!!repayLoanId} onOpenChange={() => setRepayLoanId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Loan Repayment</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={repayForm.amount} onChange={(e) => setRepayForm((s) => ({ ...s, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
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
              {recordRepayment.isPending ? "Processing..." : "Confirm Repayment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
