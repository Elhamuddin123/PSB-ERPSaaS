import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Send, FileText, ShieldAlert, ShieldCheck, Lock, Unlock, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { alertServerError } from "@/lib/i18n-ui";

export default function WalletsPage() {
  const { t, t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const { data: wallets, refetch, isLoading: walletsLoading, error: walletsError } = trpc.wallet.list.useQuery();
  const { data: allTransactions } = trpc.wallet.allTransactions.useQuery();
  const { data: usersData } = trpc.users.directory.useQuery();
  const users = usersData?.items ?? [];
  const utils = trpc.useUtils();

const createWallet = trpc.wallet.create.useMutation({
  onSuccess: async () => {
    await utils.wallet.list.invalidate();
    await utils.wallet.allTransactions.invalidate();
    await utils.dashboard.stats.invalidate();
    refetch();
    setDialogOpen(false);
    setNewWallet({ name: "", currency: "USD", initialBalance: "", userId: "" });
  },
  onError: (err) => alertServerError(t, err),
});

  const deleteWallet = trpc.wallet.delete.useMutation({
    onSuccess: async () => {
      await utils.wallet.list.invalidate();
      await utils.wallet.allTransactions.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(t, err),
  });

  const updateWallet = trpc.wallet.update.useMutation({
    onSuccess: async () => {
      await utils.wallet.list.invalidate();
      refetch();
      setEditWallet(null);
      alert(t("alerts.walletUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const transfer = trpc.wallet.transfer.useMutation({
  onSuccess: async () => {
    await utils.wallet.list.invalidate();
    await utils.wallet.allTransactions.invalidate();
    await utils.dashboard.stats.invalidate();
    refetch();
    setTransferData({ fromWalletId: 0, toWalletId: 0, amount: "", description: "" });
  },
  onError: (err) => alertServerError(t, err),
});

  const [newWallet, setNewWallet] = useState({
  name: "",
  currency: "USD",
  initialBalance: "",
  userId: "company",
});
  const [transferData, setTransferData] = useState({ fromWalletId: 0, toWalletId: 0, amount: "", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statementWalletId, setStatementWalletId] = useState<number | null>(null);
  const [editWallet, setEditWallet] = useState<{
    id: number;
    name: string;
    currency: string;
    userId: string;
    status: "active" | "frozen" | "closed";
  } | null>(null);

  if (walletsLoading) return <div className="py-8 text-center text-slate-500">{t("loading_wallets")}</div>;
  if (walletsError) return <div className="py-8 text-center text-red-600">Error loading wallets: {walletsError.message}</div>;

  const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("wallet_management")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manage_wallets_transactions_and_transfers")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />{t("new_wallet")}</Button>
          </DialogTrigger>
          {/* FIXED: max-w-[95vw] for mobile, sm:max-w-lg for tablet+ */}
          <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("create_new_wallet")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t("wallet_name")}</Label>
                <Input value={newWallet.name} onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })} placeholder={t("e_g_marketing_budget")} />
              </div>
              <div>
                <Label>{t("currency_1_1")}</Label>
                <Select value={newWallet.currency} onValueChange={(v) => setNewWallet({ ...newWallet, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">{t("usd")}</SelectItem>
                    <SelectItem value="EUR">{t("eur")}</SelectItem>
                    <SelectItem value="GBP">{t("gbp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
  <Label>{t("wallet_owner")}</Label>

  <Select
    value={newWallet.userId}
    onValueChange={(v) =>
      setNewWallet({
        ...newWallet,
        userId: v,
      })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder={t("company_wallet")} />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="company">{t("company_wallet_1")}</SelectItem>

      {users.map((u) => (
        <SelectItem
          key={u.id}
          value={u.id.toString()}
        >
          {u.name} ({u.role})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <p className="text-xs text-slate-500 mt-1">{t("assign_wallet_to_company_or_employee")}</p>
</div>
              <div>
                <Label>{t("initial_balance")}</Label>
                <Input
                  type="number"
                  value={newWallet.initialBalance}
                  onChange={(e) => setNewWallet({ ...newWallet, initialBalance: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-500 mt-1">{t("starting_amount_to_fund_this_wallet")}</p>
              </div>
              <Button
                className="w-full bg-indigo-600"
                onClick={() => {
                  createWallet.mutate({
  name: newWallet.name,
  currency: newWallet.currency,
  initialBalance: newWallet.initialBalance || "0",

  userId:
    newWallet.userId !== "company"
      ? Number(newWallet.userId)
      : undefined,
});
                }}
                disabled={!newWallet.name || createWallet.isPending}
              >
                {createWallet.isPending ? tc("actions.creating") : tc("actions.createWallet")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs sm:text-sm">{t("total_balance_across_all_wallets")}</p>
              <p className="text-2xl sm:text-4xl font-bold mt-1">${totalBalance.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex gap-4 sm:gap-6">
            <div>
              <p className="text-indigo-100 text-xs">{t("active_wallets")}</p>
              <p className="text-lg sm:text-xl font-semibold">{wallets?.filter(w => w.status === "active").length ?? 0}</p>
            </div>
            <div>
              <p className="text-indigo-100 text-xs">{t("total_reserved")}</p>
              <p className="text-lg sm:text-xl font-semibold">
                ${wallets?.reduce((sum, w) => sum + Number(w.reservedBalance), 0).toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="wallets" className="space-y-4">
        <TabsList className="bg-white border w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="wallets">{t("wallets")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("transactions_1_1")}</TabsTrigger>
          <TabsTrigger value="transfer">{t("transfer")}</TabsTrigger>
          <TabsTrigger value="statements">{t("statements_1")}</TabsTrigger>
        </TabsList>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(wallets || []).map((wallet) => (
              <Card key={wallet.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-indigo-600" />
                    </div>
                    <Badge variant={wallet.status === "active" ? "default" : "secondary"} className="text-xs">
                      {wallet.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mt-3 text-sm sm:text-base">{wallet.name}</h3>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    ${Number(wallet.balance).toLocaleString()}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-500">
                    <span>Reserved: ${Number(wallet.reservedBalance).toLocaleString()}</span>
                    <span className="text-right">{wallet.currency}</span>
                    <span>Credit Limit: ${Number(wallet.creditLimit).toLocaleString()}</span>
                    <span className="text-right">Due: ${Number(wallet.dueBalance).toLocaleString()}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                      onClick={() => setStatementWalletId(wallet.id)}
                    >
                      <FileText className="h-3 w-3 mr-1" />{t("statement_1")}</Button>
                    <ReconcileButton walletId={wallet.id} />
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8 px-2"
                        onClick={() => setEditWallet({
                          id: wallet.id,
                          name: wallet.name,
                          currency: wallet.currency,
                          userId: wallet.userId ? wallet.userId.toString() : "company",
                          status: wallet.status as "active" | "frozen" | "closed",
                        })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 h-8 px-2"
                        title={t("close_wallet_must_have_0_balance")}
                        disabled={deleteWallet.isPending || Number(wallet.balance) !== 0 || Number(wallet.reservedBalance) !== 0}
                        onClick={() => {
                          if (confirm(tc("confirm.closeWallet", { name: wallet.name }))) {
                            deleteWallet.mutate({ id: wallet.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("recent_transactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(allTransactions || []).slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === "credit" ? "bg-emerald-100" : tx.type === "debit" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      {tx.type === "credit" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> :
                       tx.type === "debit" ? <ArrowDownRight className="h-4 w-4 text-red-600" /> :
                       <RefreshCw className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-slate-500">
  Wallet #{tx.walletId} • {tx.type}
</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.type === "credit" ? "+" : "-"}${Number(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">${Number(tx.balanceAfter).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer">
          <Card className="border-0 shadow-sm max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("transfer_between_wallets")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("from_wallet")}</Label>
                <Select onValueChange={(v) => setTransferData({ ...transferData, fromWalletId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder={t("select_source_wallet")} /></SelectTrigger>
                  <SelectContent>
                    {(wallets || []).length === 0 ? (
                      <SelectItem value="__empty__" disabled>{t("no_records_found_1_1_1")}</SelectItem>
                    ) : (
                      (wallets || []).map(w => (
                        <SelectItem key={w.id} value={w.id.toString()}>{w.name} (${Number(w.balance).toLocaleString()})</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("to_wallet")}</Label>
                <Select onValueChange={(v) => setTransferData({ ...transferData, toWalletId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder={t("select_destination_wallet")} /></SelectTrigger>
                  <SelectContent>
                    {(wallets || []).length === 0 ? (
                      <SelectItem value="__empty__" disabled>{t("no_records_found_1_1_1_1")}</SelectItem>
                    ) : (
                      (wallets || []).map(w => (
                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("amount_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <Input type="number" placeholder="0.00" onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })} />
              </div>
              <div>
                <Label>{t("description_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <Input placeholder={t("transfer_description")} onChange={(e) => setTransferData({ ...transferData, description: e.target.value })} />
              </div>
              <Button
                className="w-full bg-indigo-600"
                onClick={() => transfer.mutate(transferData)}
                disabled={!transferData.fromWalletId || !transferData.toWalletId || !transferData.amount || transfer.isPending}
              >
                <Send className="h-4 w-4 mr-2" /> {transfer.isPending ? tc("actions.transferring") : tc("actions.transferFunds")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm font-medium">{t("wallet_statements")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(wallets || []).map((wallet) => (
                  <Card key={wallet.id} className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatementWalletId(wallet.id)}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm">{wallet.name}</h3>
                      <p className="text-lg font-bold mt-1">${Number(wallet.balance).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{t("click_to_view_statement")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Wallet Dialog */}
      <Dialog open={!!editWallet} onOpenChange={() => setEditWallet(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("edit_wallet")}</DialogTitle></DialogHeader>
          {editWallet && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t("wallet_name")}</Label>
                <Input value={editWallet.name} onChange={(e) => setEditWallet({ ...editWallet, name: e.target.value })} />
              </div>
              <div>
                <Label>{t("currency_1_1")}</Label>
                <Select value={editWallet.currency} onValueChange={(v) => setEditWallet({ ...editWallet, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">{t("usd")}</SelectItem>
                    <SelectItem value="EUR">{t("eur")}</SelectItem>
                    <SelectItem value="GBP">{t("gbp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("wallet_owner")}</Label>
                <Select value={editWallet.userId} onValueChange={(v) => setEditWallet({ ...editWallet, userId: v })}>
                  <SelectTrigger><SelectValue placeholder={t("company_wallet")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">{t("company_wallet_1")}</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("status_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <Select value={editWallet.status} onValueChange={(v) => setEditWallet({ ...editWallet, status: v as "active" | "frozen" | "closed" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="frozen">frozen</SelectItem>
                    <SelectItem value="closed">closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={!editWallet.name || updateWallet.isPending}
                onClick={() => updateWallet.mutate({
                  id: editWallet.id,
                  name: editWallet.name,
                  currency: editWallet.currency,
                  userId: editWallet.userId !== "company" ? Number(editWallet.userId) : null,
                  status: editWallet.status,
                })}
              >
                {updateWallet.isPending ? "Saving..." : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Statement Dialog */}
      <Dialog open={!!statementWalletId} onOpenChange={() => setStatementWalletId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("wallet_statement")}</DialogTitle></DialogHeader>
          {statementWalletId && <WalletStatement walletId={statementWalletId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReconcileButton({ walletId }: { walletId: number }) {
  const { t } = useTranslation("common");
  const { data, refetch } = trpc.wallet.reconcile.useQuery({ walletId });
  const [checked, setChecked] = useState(false);

  if (!checked) {
    return (
      <Button size="sm" variant="outline" className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs" onClick={() => { setChecked(true); refetch(); }}>
        <ShieldCheck className="h-3 w-3 mr-1" />{t("reconcile")}</Button>
    );
  }

  if (!data) return <span className="text-xs text-slate-400">{t("checking")}</span>;

  const coaOk = data.isCoaBalanced !== false;
  const allOk = data.isBalanced && coaOk;

  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-1 rounded ${allOk ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}
      title={data.coaBalance != null ? `Ledger COA balance: $${Number(data.coaBalance).toLocaleString()}` : undefined}
    >
      {allOk ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
      {allOk
        ? t("balanced", "Balanced")
        : !data.isBalanced
          ? `${t("tx_gap", "Tx gap:")} $${data.discrepancy.toLocaleString()}`
          : `${t("coa_gap", "COA gap:")} $${Number(data.coaDiscrepancy ?? 0).toLocaleString()}`}
    </span>
  );
}

function WalletStatement({ walletId }: { walletId: number }) {
  const { t } = useTranslation("common");
  const { data, isLoading } = trpc.wallet.statement.useQuery({ walletId, limit: 50 });

  if (isLoading) return <div className="py-8 text-center text-slate-500">{t("loading_statement")}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-semibold text-indigo-900">{data.wallet.name}</h3>
        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
          <div><p className="text-indigo-600">{t("balance_1_1_1_1_1_1_1")}</p><p className="font-bold">${Number(data.wallet.balance).toLocaleString()}</p></div>
          <div><p className="text-indigo-600">{t("reserved")}</p><p className="font-bold">${Number(data.wallet.reservedBalance).toLocaleString()}</p></div>
          <div><p className="text-indigo-600">{t("available")}</p><p className="font-bold">${(Number(data.wallet.balance) - Number(data.wallet.reservedBalance)).toLocaleString()}</p></div>
        </div>
      </div>

      <div className="space-y-2">
        {data.items.map((tx: any) => (
          <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border-b">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              tx.type === "credit" ? "bg-emerald-100" : tx.type === "debit" ? "bg-red-100" : tx.type === "lock" ? "bg-amber-100" : tx.type === "unlock" ? "bg-blue-100" : "bg-slate-100"
            }`}>
              {tx.type === "credit" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> :
               tx.type === "debit" ? <ArrowDownRight className="h-4 w-4 text-red-600" /> :
               tx.type === "lock" ? <Lock className="h-4 w-4 text-amber-600" /> :
               tx.type === "unlock" ? <Unlock className="h-4 w-4 text-blue-600" /> :
               <RefreshCw className="h-4 w-4 text-slate-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <p className="text-xs text-slate-500 capitalize">{tx.type} • {new Date(tx.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-semibold ${tx.type === "credit" || tx.type === "unlock" ? "text-emerald-600" : tx.type === "debit" || tx.type === "lock" ? "text-red-600" : ""}`}>
                {tx.type === "credit" || tx.type === "unlock" ? "+" : tx.type === "debit" || tx.type === "lock" ? "-" : ""}
                ${Number(tx.amount).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">${Number(tx.balanceAfter).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {data.items.length === 0 && <p className="text-center text-sm text-slate-400 py-8">{t("no_transactions_found_1")}</p>}
      </div>
    </div>
  );
}
