import { useCallback, useState } from "react";

import { alertServerError } from "@/lib/i18n-ui";

import { useTranslation } from "react-i18next";

import { trpc } from "@/providers/trpc";

import { useAuth } from "@/hooks/useAuth";

import { SUPERVISORY_ROLES, hasAnyRole } from "@/lib/roles";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

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

import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";

import { Search, DollarSign, FileText, TrendingUp, ArrowLeftRight } from "lucide-react";

import { SortableTableHead } from "@/components/ui/sortable-table-head";

import { useClientTable } from "@/lib/client-table";



const typeColors: Record<string, string> = {

  receivable: "bg-orange-100 text-orange-700",

  payment: "bg-green-100 text-green-700",

  deposit: "bg-blue-100 text-blue-700",

  credit: "bg-purple-100 text-purple-700",

  refund: "bg-red-100 text-red-700",

  adjustment: "bg-gray-100 text-gray-700",

};



type SettleTarget =

  | { type: "deposit"; id: number; code: string; walletId: number; remaining: number }

  | { type: "loan"; id: number; code: string; balance: number };



export default function ReceivablesPage() {

  const [search, setSearch] = useState("");

  const { t, t: tc } = useTranslation("common");

  const { user } = useAuth();

  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [paymentForm, setPaymentForm] = useState({ amount: "", description: "" });

  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);

  const [settleForm, setSettleForm] = useState({ direction: "pay" as "pay" | "receive", amount: "", notes: "" });



  const { data, isLoading, error, refetch } = trpc.receivable.list.useQuery(

    { page: 1, limit: 50 }

  );

  const { data: balanceData } = trpc.receivable.customerBalance.useQuery(

    { customerId: selectedCustomerId! },

    { enabled: !!selectedCustomerId }

  );

  const { data: statementData } = trpc.receivable.statement.useQuery(

    { customerId: selectedCustomerId! },

    { enabled: !!selectedCustomerId }

  );

  const { data: settlementData } = trpc.receivable.customerSettlements.useQuery(

    { customerId: selectedCustomerId! },

    { enabled: !!selectedCustomerId && canManage }

  );

  const { data: agingData } = trpc.receivable.aging.useQuery();



  const utils = trpc.useUtils();

  const createPayment = trpc.receivable.createPayment.useMutation({

    onSuccess: async () => {

      await utils.receivable.list.invalidate();

      await utils.receivable.customerBalance.invalidate();

      await utils.receivable.statement.invalidate();

      await utils.receivable.aging.invalidate();

      await utils.invoice.list.invalidate();

      await utils.crm.customerDetail.invalidate();

      refetch();

      setPaymentForm({ amount: "", description: "" });

    },

    onError: (err) => alertServerError(t, err),

  });

  const depositLedgerPass = trpc.deposit.ledgerPass.useMutation({

    onSuccess: async () => {

      await utils.receivable.customerSettlements.invalidate();

      await utils.receivable.customerBalance.invalidate();

      await utils.receivable.statement.invalidate();

      await utils.deposit.list.invalidate();

      setSettleTarget(null);

      setSettleForm({ direction: "pay", amount: "", notes: "" });

      alert(t("alerts.settlementRecorded"));

    },

    onError: (err) => alertServerError(t, err),

  });

  const loanLedgerPass = trpc.loan.ledgerPass.useMutation({

    onSuccess: async () => {

      await utils.receivable.customerSettlements.invalidate();

      await utils.loan.list.invalidate();

      setSettleTarget(null);

      setSettleForm({ direction: "receive", amount: "", notes: "" });

      alert(t("alerts.settlementRecorded"));

    },

    onError: (err) => alertServerError(t, err),

  });



  const agingBuckets = agingData

    ? [

        { labelKey: "aging.current", amount: agingData.current },

        { labelKey: "aging.days1_30", amount: agingData.d30 },

        { labelKey: "aging.days31_60", amount: agingData.d60 },

        { labelKey: "aging.days60plus", amount: agingData.d90 },

      ]

    : [];



  const txTypeLabel = (type: string) => t(`txTypes.${type}`, { defaultValue: type });



  const totalReceivable = agingBuckets.reduce((sum, g) => sum + Number(g.amount), 0);

  const getSearchText = useCallback((tx: NonNullable<typeof data>["items"][number]) => {
    return [
      tx.customer?.firstName,
      tx.customer?.lastName,
      tx.description,
    ].filter(Boolean).join(" ");
  }, []);

  const getSortValue = useCallback((tx: NonNullable<typeof data>["items"][number], key: string) => {
    switch (key) {
      case "customer": return `${tx.customer?.firstName || ""} ${tx.customer?.lastName || ""}`.trim();
      case "type": return tx.type;
      case "amount": return Number(tx.amount);
      case "balance": return Number(tx.balance);
      case "date": return new Date(tx.createdAt).getTime();
      case "description": return tx.description || "";
      default: return "";
    }
  }, []);

  const { rows: receivableRows, sortKey, sortDir, toggleSort } = useClientTable({
    items: data?.items ?? [],
    search,
    getSearchText,
    defaultSortKey: "date",
    getSortValue,
  });

  const openDepositSettlement = (deposit: { id: number; depositCode: string; walletId: number; remaining: number }) => {

    setSettleTarget({ type: "deposit", id: deposit.id, code: deposit.depositCode, walletId: deposit.walletId, remaining: deposit.remaining });

    setSettleForm({ direction: "pay", amount: "", notes: "" });

  };



  const openLoanSettlement = (loan: { id: number; loanNumber: string; balanceAmount: number }) => {

    setSettleTarget({ type: "loan", id: loan.id, code: loan.loanNumber, balance: loan.balanceAmount });

    setSettleForm({ direction: "receive", amount: String(loan.balanceAmount), notes: "" });

  };



  const submitSettlement = () => {

    if (!settleTarget) return;

    if (settleTarget.type === "deposit") {

      depositLedgerPass.mutate({

        depositId: settleTarget.id,

        direction: settleForm.direction,

        amount: settleForm.amount,

        walletId: settleTarget.walletId,

        notes: settleForm.notes || undefined,

      });

    } else {

      loanLedgerPass.mutate({

        loanId: settleTarget.id,

        direction: settleForm.direction,

        amount: settleForm.amount,

        notes: settleForm.notes || undefined,

      });

    }

  };



  const settlementPending = depositLedgerPass.isPending || loanLedgerPass.isPending;

  const settlementDisabled = !settleForm.amount || settlementPending || (

    settleTarget?.type === "deposit"

    && settleForm.direction === "pay"

    && Number(settleForm.amount) > settleTarget.remaining + 0.01

  ) || (

    settleTarget?.type === "loan"

    && settleForm.direction === "receive"

    && Number(settleForm.amount) > settleTarget.balance + 0.01

  );



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <h1 className="text-2xl font-bold">{t("customerReceivables")}</h1>

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white border rounded-lg p-4 shadow-sm">

          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">

            <TrendingUp className="h-4 w-4" />{t("total_receivables")}</div>

          <p className="text-2xl font-bold">${totalReceivable.toLocaleString()}</p>

        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">

          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">

            <DollarSign className="h-4 w-4" />{t("total_customers")}</div>

          <p className="text-2xl font-bold">{new Set(data?.items?.map((t: any) => t.customerId)).size}</p>

        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">

          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">

            <FileText className="h-4 w-4" />{t("transactions")}</div>

          <p className="text-2xl font-bold">{data?.items?.length ?? 0}</p>

        </div>

      </div>



      {agingBuckets.length > 0 && (

        <div className="border rounded-lg p-4">

          <h3 className="text-sm font-semibold mb-3">{t("aging_summary")}</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {agingBuckets.map((bucket) => (

              <div key={bucket.labelKey} className="bg-gray-50 rounded p-3">

                <p className="text-xs text-gray-500">{t(bucket.labelKey)}</p>

                <p className="text-lg font-semibold">${Number(bucket.amount).toLocaleString()}</p>

              </div>

            ))}

          </div>

        </div>

      )}



      <div className="flex flex-col sm:flex-row gap-3">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

          <Input

            placeholder={t("searchByCustomerOrReference")}

            className="pl-9"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

        </div>

      </div>



      {isLoading ? (

        <div className="space-y-2">

          {[...Array(5)].map((_, i) => (

            <Skeleton key={i} className="h-12 w-full" />

          ))}

        </div>

      ) : error ? (

        <div className="text-center py-12 border rounded-lg">

          <p className="text-red-500 mb-2">{t("failed_to_load_receivables")}</p>

          <Button variant="outline" onClick={() => refetch()}>{t("retry")}</Button>

        </div>

      ) : (

        <div className="border rounded-lg overflow-x-auto">

          <Table className="min-w-[900px]">

            <TableHeader>

              <TableRow>

                <SortableTableHead label={t("customer")} sortKey="customer" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <SortableTableHead label={t("type")} sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <SortableTableHead label={t("amount")} sortKey="amount" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <SortableTableHead label={t("balance")} sortKey="balance" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <SortableTableHead label={t("date")} sortKey="date" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <SortableTableHead label={t("description")} sortKey="description" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />

                <TableHead className="text-right">{t("actionsLabel")}</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {receivableRows.length === 0 && (

                <TableRow>

                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">

                    {t("noReceivablesFound")}

                  </TableCell>

                </TableRow>

              )}

              {receivableRows.map((tx: any) => (

                <TableRow key={tx.id}>

                  <TableCell>

                    <span className="font-medium">{tx.customer?.firstName} {tx.customer?.lastName}</span>

                    <p className="text-xs text-gray-500">{tx.customer?.email}</p>

                  </TableCell>

                  <TableCell>

                    <Badge className={typeColors[tx.type] || "bg-gray-100"}>

                      {txTypeLabel(tx.type)}

                    </Badge>

                  </TableCell>

                  <TableCell className={tx.type === "payment" || tx.type === "credit" || tx.type === "refund" ? "text-green-600" : "text-orange-600"}>

                    {tx.type === "payment" || tx.type === "credit" || tx.type === "refund" ? "-" : "+"}

                    ${Number(tx.amount).toLocaleString()}

                  </TableCell>

                  <TableCell className="font-medium">${Number(tx.balance).toLocaleString()}</TableCell>

                  <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>

                  <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>

                  <TableCell className="text-right">

                    <Dialog>

                      <DialogTrigger asChild>

                        <Button size="sm" variant="ghost" onClick={() => setSelectedCustomerId(tx.customerId)}>

                          <FileText className="h-4 w-4" />

                        </Button>

                      </DialogTrigger>

                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">

                        <DialogHeader>

                          <DialogTitle>

                            {t("customerStatement", {

                              firstName: tx.customer?.firstName ?? "",

                              lastName: tx.customer?.lastName ?? "",

                            })}

                          </DialogTitle>

                        </DialogHeader>

                        {balanceData !== undefined && (

                          <div className="bg-gray-50 p-3 rounded mb-3">

                            <p className="text-sm text-gray-500">{t("current_balance")}</p>

                            <p className={`text-xl font-bold ${balanceData.balance > 0 ? "text-red-600" : "text-green-600"}`}>

                              ${Number(balanceData.balance).toLocaleString()}

                            </p>

                          </div>

                        )}



                        <Dialog>

                          <DialogTrigger asChild>

                            <Button size="sm" className="mb-2">

                              <DollarSign className="h-4 w-4 mr-1" />{t("record_payment")}</Button>

                          </DialogTrigger>

                          <DialogContent>

                            <DialogHeader>

                              <DialogTitle>{t("record_payment")}</DialogTitle>

                            </DialogHeader>

                            <div className="space-y-3">

                              <div>

                                <label className="text-sm text-gray-500">{t("customer")}</label>

                                <p className="font-medium">{tx.customer?.firstName} {tx.customer?.lastName}</p>

                              </div>

                              <div>

                                <label className="text-sm text-gray-500">{t("amount")}</label>

                                <Input

                                  type="number"

                                  step="0.01"

                                  value={paymentForm.amount}

                                  onChange={(e) => setPaymentForm((s) => ({ ...s, amount: e.target.value }))}

                                  placeholder="0.00"

                                />

                              </div>

                              <div>

                                <label className="text-sm text-gray-500">{t("description")}</label>

                                <Input

                                  value={paymentForm.description}

                                  onChange={(e) => setPaymentForm((s) => ({ ...s, description: e.target.value }))}

                                  placeholder={t("payment_description")}

                                />

                              </div>

                              <Button

                                className="w-full"

                                disabled={createPayment.isPending || !paymentForm.amount}

                                onClick={() =>

                                  createPayment.mutate({

                                    customerId: tx.customerId,

                                    invoiceId: tx.type === "receivable" && tx.invoiceId ? tx.invoiceId : undefined,

                                    amount: paymentForm.amount,

                                    description: paymentForm.description,

                                  })

                                }

                              >

                                {createPayment.isPending ? tc("actions.processing") : tc("actions.recordPayment")}

                              </Button>

                            </div>

                          </DialogContent>

                        </Dialog>



                        {canManage && settlementData && (settlementData.deposits.length > 0 || settlementData.loans.length > 0) && (

                          <div className="border rounded-lg p-3 mb-3 space-y-2">

                            <p className="text-sm font-medium flex items-center gap-1">

                              <ArrowLeftRight className="h-4 w-4" />{t("settlement_instruments")}

                            </p>

                            {settlementData.deposits.map((deposit) => (

                              <div key={`deposit-${deposit.id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-blue-50 rounded p-2">

                                <div>

                                  <span className="font-medium">{deposit.depositCode}</span>

                                  <span className="text-slate-500 ml-2">{t("deposit_remaining_settleable")}: ${deposit.remaining.toLocaleString()}</span>

                                </div>

                                <Button size="sm" variant="outline" onClick={() => openDepositSettlement(deposit)}>

                                  {t("ledger_pass")}

                                </Button>

                              </div>

                            ))}

                            {settlementData.loans.map((loan) => (

                              <div key={`loan-${loan.id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-amber-50 rounded p-2">

                                <div>

                                  <span className="font-medium">{loan.loanNumber}</span>

                                  <span className="text-slate-500 ml-2">{t("outstanding_balance")}: ${loan.balanceAmount.toLocaleString()}</span>

                                </div>

                                <Button size="sm" variant="outline" onClick={() => openLoanSettlement(loan)}>

                                  {t("ledger_pass")}

                                </Button>

                              </div>

                            ))}

                          </div>

                        )}

                        {canManage && settlementData && settlementData.deposits.length === 0 && settlementData.loans.length === 0 && (
                          <p className="text-xs text-slate-400 mb-3">{t("no_settlement_instruments")}</p>
                        )}



                        <div className="overflow-x-auto">

                        <Table className="min-w-[640px]">

                          <TableHeader>

                            <TableRow>

                              <TableHead>{t("date")}</TableHead>

                              <TableHead>{t("type")}</TableHead>

                              <TableHead>{t("amount")}</TableHead>

                              <TableHead>{t("balance")}</TableHead>

                              <TableHead>{t("description")}</TableHead>

                            </TableRow>

                          </TableHeader>

                          <TableBody>

                            {statementData?.transactions?.map((stmt: any) => (

                              <TableRow key={stmt.id}>

                                <TableCell>{new Date(stmt.createdAt).toLocaleDateString()}</TableCell>

                                <TableCell>

                                  <Badge className={typeColors[stmt.type] || "bg-gray-100"}>

                                    {txTypeLabel(stmt.type)}

                                  </Badge>

                                </TableCell>

                                <TableCell>${Number(stmt.amount).toLocaleString()}</TableCell>

                                <TableCell>${Number(stmt.balance).toLocaleString()}</TableCell>

                                <TableCell className="max-w-[150px] truncate">{stmt.description}</TableCell>

                              </TableRow>

                            ))}

                          </TableBody>

                        </Table>

                        </div>

                      </DialogContent>

                    </Dialog>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </div>

      )}



      <Dialog open={!!settleTarget} onOpenChange={() => setSettleTarget(null)}>

        <DialogContent className="max-w-lg">

          <DialogHeader><DialogTitle>{t("ledger_pass")}</DialogTitle></DialogHeader>

          {settleTarget && (

            <div className="space-y-3 pt-2">

              <p className="text-sm text-slate-500">{settleTarget.code}</p>

              {settleTarget.type === "deposit" && (

                <p className="text-xs text-indigo-700">{t("deposit_remaining_settleable")}: ${settleTarget.remaining.toLocaleString()}</p>

              )}

              {settleTarget.type === "loan" && (

                <p className="text-xs text-amber-700">{t("outstanding_balance")}: ${settleTarget.balance.toLocaleString()}</p>

              )}

              <div>

                <label className="text-sm text-slate-500">{t("settlement_direction")}</label>

                <select

                  className="w-full border rounded-md px-3 py-2 text-sm bg-white mt-1"

                  value={settleForm.direction}

                  onChange={(e) => setSettleForm((s) => ({ ...s, direction: e.target.value as "pay" | "receive" }))}

                >

                  {settleTarget.type === "deposit" ? (

                    <>

                      <option value="pay">{t("settlement_deposit_refund")}</option>

                      <option value="receive">{t("settlement_deposit_receive")}</option>

                    </>

                  ) : (

                    <>

                      <option value="receive">{t("settlement_loan_repayment")}</option>

                      <option value="pay">{t("settlement_loan_disbursement")}</option>

                    </>

                  )}

                </select>

              </div>

              <div>

                <label className="text-sm text-slate-500">{t("amount")}</label>

                <Input type="number" step="0.01" value={settleForm.amount} onChange={(e) => setSettleForm((s) => ({ ...s, amount: e.target.value }))} />

              </div>

              <div>

                <label className="text-sm text-slate-500">{t("notes")}</label>

                <Input value={settleForm.notes} onChange={(e) => setSettleForm((s) => ({ ...s, notes: e.target.value }))} />

              </div>

              <Button className="w-full bg-indigo-600" disabled={settlementDisabled} onClick={submitSettlement}>

                {settlementPending ? tc("actions.processing") : t("record_settlement")}

              </Button>

            </div>

          )}

        </DialogContent>

      </Dialog>

    </div>

  );

}


