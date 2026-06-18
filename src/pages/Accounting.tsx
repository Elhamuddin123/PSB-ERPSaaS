import { useTranslation } from 'react-i18next';
import { alertServerError } from "@/lib/i18n-ui";
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, CheckCircle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export default function AccountingPage() {
  const { t } = useTranslation("common");
  const [accountType, setAccountType] = useState("");
  const [search, setSearch] = useState("");
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createJournalOpen, setCreateJournalOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = trpc.accounting.accounts.useQuery({ type: accountType });
  const {
    data: journalData,
    isLoading: journalLoading,
    isError: journalError,
    refetch: refetchJournal,
  } = trpc.accounting.journalEntries.useQuery(
    { page: 1, limit: 50, search },
  );
  const { data: financialSummary } = trpc.accounting.financialSummary.useQuery();
  const { data: ledgerData, isLoading: ledgerLoading, isError: ledgerError, refetch: refetchLedger } = trpc.accounting.ledger.useQuery({});

  const utils = trpc.useUtils();
  const createAccount = trpc.accounting.createAccount.useMutation({
    onSuccess: async () => {
      await utils.accounting.accounts.invalidate();
      await utils.accounting.financialSummary.invalidate();
      await utils.accounting.ledger.invalidate();
      await utils.accounting.trialBalance.invalidate();
      refetchAccounts();
      setCreateAccountOpen(false);
      setNewAccount({ code: "", name: "", type: "asset" as const, subtype: "", description: "", currency: "USD" });
    },
    onError: (err) => alertServerError(t, err),
  });
  const createJournal = trpc.accounting.createJournalEntry.useMutation({
    onSuccess: async () => {
      await utils.accounting.journalEntries.invalidate();
      await utils.accounting.ledger.invalidate();
      await utils.accounting.financialSummary.invalidate();
      await utils.accounting.trialBalance.invalidate();
      refetchJournal();
      setCreateJournalOpen(false);
      setNewJournal({ entryNumber: "", date: "", description: "", lines: [{ accountId: 0, description: "", debit: "0", credit: "0" }] });
    },
    onError: (err) => alertServerError(t, err),
  });
  const postJournal = trpc.accounting.postJournalEntry.useMutation({
    onSuccess: async () => {
      await utils.accounting.journalEntries.invalidate();
      await utils.accounting.accounts.invalidate();
      await utils.accounting.ledger.invalidate();
      await utils.accounting.financialSummary.invalidate();
      await utils.accounting.trialBalance.invalidate();
      refetchJournal();
    },
    onError: (err) => alertServerError(t, err),
  });

  const [newAccount, setNewAccount] = useState<{ code: string; name: string; type: "asset" | "liability" | "equity" | "revenue" | "expense"; subtype: string; description: string; currency: string }>({ code: "", name: "", type: "asset", subtype: "", description: "", currency: "USD" });
  const [newJournal, setNewJournal] = useState({ entryNumber: "", date: "", description: "", lines: [{ accountId: 0, description: "", debit: "0", credit: "0" }] });

  const addLine = () => setNewJournal({ ...newJournal, lines: [...newJournal.lines, { accountId: 0, description: "", debit: "0", credit: "0" }] });
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...newJournal.lines];
    updated[i] = { ...updated[i], [field]: field === "accountId" ? Number(value) : value };
    setNewJournal({ ...newJournal, lines: updated });
  };

  const totalDebit = newJournal.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = newJournal.lines.reduce((s, l) => s + Number(l.credit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit >= 0 && (totalDebit > 0 || totalCredit > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("accounting_ledger")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("double_entry_bookkeeping_and_financial_management")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
            <DialogTrigger asChild><Button variant="outline" className="text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1 sm:mr-2" />{t("new_account")}</Button></DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader><DialogTitle>{t("create_chart_of_accounts_entry")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("account_code")}</Label><Input value={newAccount.code} onChange={e => setNewAccount({...newAccount, code: e.target.value})} placeholder="1000" /></div>
                  <div><Label>{t("account_name_1")}</Label><Input value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} placeholder={t("account_name")} /></div>
                </div>
                <div>
                  <Label>{t("account_type")}</Label>
                  <Select value={newAccount.type} onValueChange={v => setNewAccount({...newAccount, type: v as "asset" | "liability" | "equity" | "revenue" | "expense"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">{t("asset")}</SelectItem>
                      <SelectItem value="liability">{t("liability")}</SelectItem>
                      <SelectItem value="equity">{t("equity")}</SelectItem>
                      <SelectItem value="revenue">{t("revenue")}</SelectItem>
                      <SelectItem value="expense">{t("expense")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("description_1_1")}</Label><Input value={newAccount.description} onChange={e => setNewAccount({...newAccount, description: e.target.value})} /></div>
                <Button className="w-full bg-indigo-600" onClick={() => createAccount.mutate(newAccount)} disabled={!newAccount.code || !newAccount.name || createAccount.isPending}>{t("create_account")}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createJournalOpen} onOpenChange={setCreateJournalOpen}>
            <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1 sm:mr-2" />{t("journal_entry")}</Button></DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl">
              <DialogHeader><DialogTitle>{t("create_journal_entry")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("entry_number")}</Label><Input value={newJournal.entryNumber} onChange={e => setNewJournal({...newJournal, entryNumber: e.target.value})} placeholder={t("je_2026_xxx")} /></div>
                  <div><Label>{t("date_1")}</Label><Input type="date" value={newJournal.date} onChange={e => setNewJournal({...newJournal, date: e.target.value})} /></div>
                </div>
                <div><Label>{t("description_1_1_1")}</Label><Input value={newJournal.description} onChange={e => setNewJournal({...newJournal, description: e.target.value})} /></div>
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between"><Label>{t("journal_lines")}</Label><Badge variant={balanced ? "default" : "destructive"}>{balanced ? "Balanced" : `Diff: $${(totalDebit - totalCredit).toFixed(2)}`}</Badge></div>
                  {newJournal.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-4">
                        <Select onValueChange={v => updateLine(i, "accountId", v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder={t("account")} /></SelectTrigger>
                          <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-3"><Input className="text-xs" placeholder={t("description_1")} value={line.description} onChange={e => updateLine(i, "description", e.target.value)} /></div>
                      <div className="sm:col-span-2"><Input className="text-xs" type="number" placeholder={t("debit")} value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} /></div>
                      <div className="sm:col-span-2"><Input className="text-xs" type="number" placeholder={t("credit")} value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} /></div>
                      <div className="sm:col-span-1"><Button size="sm" variant="ghost" className="text-red-600 h-8 w-full" onClick={() => setNewJournal({...newJournal, lines: newJournal.lines.filter((_, idx) => idx !== i)})}>×</Button></div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span>{t("total_debit")}<strong>${totalDebit.toFixed(2)}</strong></span>
                    <span>{t("total_credit")}<strong>${totalCredit.toFixed(2)}</strong></span>
                  </div>
                  <Button size="sm" variant="outline" onClick={addLine}>{t("add_line")}</Button>
                </div>
                <Button className="w-full bg-indigo-600" onClick={() => createJournal.mutate(newJournal)} disabled={!balanced || !newJournal.entryNumber || !newJournal.description || !newJournal.date || createJournal.isPending || newJournal.lines.some(l => l.accountId <= 0)}>{t("create_journal_entry_1")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-slate-500">{t("total_revenue")}</p>
          <p className="text-lg sm:text-xl font-bold text-indigo-600">${(financialSummary?.revenue ?? 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-slate-500">{t("total_expenses")}</p>
          <p className="text-lg sm:text-xl font-bold text-red-600">${(financialSummary?.expenses ?? 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-slate-500">{t("net_income")}</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">${((financialSummary?.revenue ?? 0) - (financialSummary?.expenses ?? 0)).toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-slate-500">{t("total_assets")}</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">${(financialSummary?.assets ?? 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm sm:col-span-2 lg:col-span-1"><CardContent className="p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-slate-500">{t("equity_1")}</p>
          <p className="text-lg sm:text-xl font-bold text-violet-600">${(financialSummary?.equity ?? 0).toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="journal">
        <TabsList className="bg-white border w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="accounts">{t("chart_of_accounts")}</TabsTrigger>
          <TabsTrigger value="journal">{t("journal_entries")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("general_ledger")}</TabsTrigger>
        </TabsList>

        {/* Chart of Accounts */}
        <TabsContent value="accounts" className="mt-4">
          <div className="flex gap-3 mb-4">
            <Select onValueChange={(v) => setAccountType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-36 sm:w-40"><SelectValue placeholder={t("filter_by_type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_types")}</SelectItem>
                <SelectItem value="asset">{t("assets")}</SelectItem>
                <SelectItem value="liability">{t("liabilities")}</SelectItem>
                <SelectItem value="equity">{t("equity_1_1")}</SelectItem>
                <SelectItem value="revenue">{t("revenue_1")}</SelectItem>
                <SelectItem value="expense">{t("expenses")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("code")}</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("name")}</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("type")}</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("balance")}</th>
                  </tr></thead>
                  <tbody>
                    {accountsLoading && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-12" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-24" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-5 w-14" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-16 ml-auto" /></td>
                      </tr>
                    ))}
                    {(accounts || []).map(acc => (
                      <tr key={acc.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 sm:p-3 font-mono text-[10px] sm:text-xs">{acc.code}</td>
                        <td className="p-2 sm:p-3">
                          <p className="font-medium text-xs sm:text-sm">{acc.name}</p>
                          {acc.bankName && <p className="text-[10px] text-slate-500">{acc.bankName} {acc.accountNumber}</p>}
                        </td>
                        <td className="p-2 sm:p-3"><Badge variant="outline" className="text-[10px] capitalize">{acc.type}</Badge></td>
                        <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">${Number(acc.currentBalance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!accountsLoading && (!accounts || accounts.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-sm">{t("no_accounts_found")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journal" className="mt-4">
          <div className="mb-4"><Input className="max-w-sm" placeholder={t("search_journal_entries")} value={search} onChange={e => setSearch(e.target.value)} /></div>
          {journalError && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-red-500 mb-2">{t("failed_to_load_journal_entries")}</p>
                <Button size="sm" variant="outline" onClick={() => refetchJournal()}><RotateCcw className="h-3 w-3 mr-1" />{t("retry")}</Button>
              </CardContent>
            </Card>
          )}
          {journalLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <Skeleton className="h-3 w-48 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </CardContent></Card>
              ))}
            </div>
          )}
          {!journalLoading && !journalError && (journalData?.items || []).length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-slate-500">{t("no_journal_entries_found")}</CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {(journalData?.items || []).map(entry => {
              const isExpanded = expandedEntry === entry.id;
              return (
                <Card key={entry.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.entryNumber}</p>
                          <p className="text-xs text-slate-500">{entry.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={entry.status === "posted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{entry.status}</Badge>
                        {entry.status === "draft" && (
                          <Button size="sm" className="bg-indigo-600 h-7 text-xs" onClick={() => postJournal.mutate({ id: entry.id })} disabled={postJournal.isPending}><CheckCircle className="h-3 w-3 mr-1" />{t("post")}</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded p-2 sm:p-3 overflow-x-auto mt-2">
                        <table className="w-full text-xs min-w-[300px]">
                          <tbody>
                            {(entry.lines || []).map((line, i) => {
                              const account = accounts?.find(a => a.id === line.accountId);
                              return (
                                <tr key={i}>
                                  <td className="py-1 pl-3 sm:pl-6 text-[10px] sm:text-xs">{account?.code} - {account?.name}</td>
                                  <td className="py-1 text-right text-[10px] sm:text-xs">{Number(line.debit) > 0 ? `$${Number(line.debit).toFixed(2)}` : ""}</td>
                                  <td className="py-1 text-right text-[10px] sm:text-xs">{Number(line.credit) > 0 ? `$${Number(line.credit).toFixed(2)}` : ""}</td>
                                </tr>
                              );
                            })}
                            <tr className="border-t font-bold"><td className="py-1 text-[10px] sm:text-xs">{t("total_1")}</td><td className="py-1 text-right text-[10px] sm:text-xs">${Number(entry.totalDebit).toFixed(2)}</td><td className="py-1 text-right text-[10px] sm:text-xs">${Number(entry.totalCredit).toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* General Ledger */}
        <TabsContent value="ledger" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("date_1_1")}</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("account_1")}</th>
                    <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("description_1_1_1_1")}</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("debit_1")}</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("credit_1")}</th>
                    <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("balance_1")}</th>
                  </tr></thead>
                  <tbody>
                    {ledgerLoading && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-16" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-20" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-24" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-12 ml-auto" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-12 ml-auto" /></td>
                        <td className="p-2 sm:p-3"><Skeleton className="h-3 w-14 ml-auto" /></td>
                      </tr>
                    ))}
                    {ledgerError && (
                      <tr><td colSpan={6} className="p-6 text-center">
                        <p className="text-sm text-red-500 mb-2">{t("failed_to_load_ledger")}</p>
                        <Button size="sm" variant="outline" onClick={() => refetchLedger()}><RotateCcw className="h-3 w-3 mr-1" />{t("retry_1")}</Button>
                      </td></tr>
                    )}
                    {!ledgerLoading && !ledgerError && (ledgerData || []).map(entry => (
                      <tr key={entry.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">{entry.date ? new Date(entry.date).toLocaleDateString() : "-"}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">{entry.account?.name || "-"}</td>
                        <td className="p-2 sm:p-3 text-slate-600 text-xs sm:text-sm">{entry.description}</td>
                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">{Number(entry.debit) > 0 ? `$${Number(entry.debit).toFixed(2)}` : "-"}</td>
                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">{Number(entry.credit) > 0 ? `$${Number(entry.credit).toFixed(2)}` : "-"}</td>
                        <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">${Number(entry.balance).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!ledgerLoading && !ledgerError && (!ledgerData || ledgerData.length === 0) && (
                <div className="p-6 text-center text-slate-500 text-sm">{t("no_ledger_entries_found")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
