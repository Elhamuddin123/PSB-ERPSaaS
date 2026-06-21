import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Plane, Search, Plus, Eye, CheckCircle, XCircle, RotateCcw, FileText, Download, Trash2, Users, DollarSign, Pencil } from "lucide-react";
import { generateTicketVoucherPDF } from "@/lib/pdf-generator";
import { alertServerError } from "@/lib/i18n-ui";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
  completed: "bg-blue-100 text-blue-800",
};

type BulkTicketEntry = {
  id: string;
  passengerFirstName: string;
  passengerLastName: string;
  pnrCode: string;
  ticketNumber: string;
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return <Label>{children} <span className="text-red-500">*</span></Label>;
}

function OptionalLabel({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  return <Label>{children} <span className="text-slate-400 font-normal text-xs">{t("optional")}</span></Label>;
}

function createBulkEntry(): BulkTicketEntry {
  return {
    id: crypto.randomUUID(),
    passengerFirstName: "",
    passengerLastName: "",
    pnrCode: "",
    ticketNumber: "",
  };
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "-";
  }
}

export default function TicketsPage() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"single" | "multiple">("single");
  const [bulkEntries, setBulkEntries] = useState<BulkTicketEntry[]>([createBulkEntry(), createBulkEntry()]);
  const [viewTicket, setViewTicket] = useState<number | null>(null);
  const [refundTicketId, setRefundTicketId] = useState<number | null>(null);
  const [refundForm, setRefundForm] = useState({ refundAmount: "", penaltyAmount: "", reason: "" });
  const [payTicketId, setPayTicketId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", description: "" });
  const [editTicketId, setEditTicketId] = useState<number | null>(null);

  const { user } = useAuth();
  const canApprove = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const { t } = useTranslation("tickets");
  const { t: tc } = useTranslation("common");
  const seatClassLabel = (c: string) => {
    const labels: Record<string, string> = {
      economy: t("economy"),
      premium_economy: t("premium_economy"),
      business: t("business"),
      first: t("first"),
    };
    return labels[c] || c;
  };

  const { data: wallets } = trpc.wallet.list.useQuery();
  const { data: customersData } = trpc.crm.customers.useQuery({ limit: 1000 });
  const customers = customersData?.items ?? [];

  const utils = trpc.useUtils();
  const {
    data: ticketsData,
    isLoading,
    isError,
    refetch,
  } = trpc.ticket.list.useQuery({ status, search, page, limit: 10 });
  const { data: airlines } = trpc.ticket.airlines.useQuery();
  const { data: stats } = trpc.ticket.stats.useQuery();

  const [newTicket, setNewTicket] = useState<{
    ticketNumber: string; pnrCode: string; airlineId: number; customerId: number | undefined;
    travelDate: string; returnDate: string; routeFrom: string; routeTo: string;
    tripType: "one_way" | "round_trip" | "multi_city"; class: "economy" | "premium_economy" | "business" | "first";
    ticketPrice: string; taxAmount: string; commissionAmount: string; discountAmount: string; notes: string;
    passengerFirstName: string; passengerLastName: string;
    walletId: number; paidAmount: string;
  }>({
    ticketNumber: "", pnrCode: "", airlineId: 0, customerId: undefined,
    travelDate: "", returnDate: "", routeFrom: "", routeTo: "",
    tripType: "one_way", class: "economy",
    ticketPrice: "", taxAmount: "", commissionAmount: "", discountAmount: "", notes: "",
    passengerFirstName: "", passengerLastName: "",
    walletId: 0, paidAmount: "",
  });

  const resetForm = () => {
    setNewTicket({
      ticketNumber: "", pnrCode: "", airlineId: 0, customerId: undefined,
      travelDate: "", returnDate: "", routeFrom: "", routeTo: "",
      tripType: "one_way" as const, class: "economy" as const,
      ticketPrice: "", taxAmount: "", commissionAmount: "", discountAmount: "", notes: "",
      passengerFirstName: "", passengerLastName: "",
      walletId: 0, paidAmount: "",
    });
    setBulkEntries([createBulkEntry(), createBulkEntry()]);
    setCreateMode("single");
  };

  const computed = useMemo(() => {
    const ticketPrice = Math.max(0, Number(newTicket.ticketPrice) || 0);
    const tax = Math.max(0, Number(newTicket.taxAmount) || 0);
    const commission = Math.max(0, Number(newTicket.commissionAmount) || 0);
    const discount = Math.max(0, Number(newTicket.discountAmount) || 0);
    const baseFare = Math.max(0, ticketPrice - tax);
    const totalAmount = ticketPrice;
    const netCommission = Math.max(0, commission - discount);
    const customerCharge = Math.max(0, ticketPrice - discount);
    const walletDeduction = Math.max(0, ticketPrice - commission);
    const paidAmount = Math.max(0, Number(newTicket.paidAmount) || 0);
    const remainingDue = Math.max(0, customerCharge - paidAmount);
    return { ticketPrice, tax, commission, discount, baseFare, totalAmount, netCommission, customerCharge, walletDeduction, paidAmount, remainingDue };
  }, [newTicket.ticketPrice, newTicket.taxAmount, newTicket.commissionAmount, newTicket.discountAmount, newTicket.paidAmount]);

  const invalidateTicketQueries = async () => {
    await utils.ticket.list.invalidate();
    await utils.ticket.stats.invalidate();
    await utils.dashboard.stats.invalidate();
    await utils.dashboard.ticketTrend.invalidate();
    await utils.dashboard.ticketStatusDistribution.invalidate();
    await utils.dashboard.recentTickets.invalidate();
    refetch();
  };

  const createTicket = trpc.ticket.create.useMutation({
    onSuccess: async () => {
      await invalidateTicketQueries();
      setCreateOpen(false);
      resetForm();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const createBulkTickets = trpc.ticket.createBulk.useMutation({
    onSuccess: async (result) => {
      await invalidateTicketQueries();
      setCreateOpen(false);
      resetForm();
      alert(tc("alerts.ticketsCreated", { count: result.count }));
    },
    onError: (err) => alertServerError(tc, err),
  });

  const approveTicket = trpc.ticket.approve.useMutation({
    onSuccess: async () => {
      await utils.ticket.list.invalidate();
      await utils.ticket.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.recentTickets.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const deleteTicket = trpc.ticket.delete.useMutation({
    onSuccess: async () => {
      await invalidateTicketQueries();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const rejectTicket = trpc.ticket.reject.useMutation({
    onSuccess: async () => {
      await utils.ticket.list.invalidate();
      await utils.ticket.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.recentTickets.invalidate();
      refetch();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const recordPayment = trpc.ticket.recordPayment.useMutation({
    onSuccess: async () => {
      await invalidateTicketQueries();
      await utils.invoice.list.invalidate();
      await utils.receivable.list.invalidate();
      setPayTicketId(null);
      setPaymentForm({ amount: "", description: "" });
    },
    onError: (err) => alertServerError(tc, err),
  });

  const refundTicket = trpc.ticket.refund.useMutation({
    onSuccess: async () => {
      await utils.ticket.list.invalidate();
      await utils.ticket.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.recentTickets.invalidate();
      refetch();
      setRefundTicketId(null);
      setRefundForm({ refundAmount: "", penaltyAmount: "", reason: "" });
    },
    onError: (err) => alertServerError(tc, err),
  });

  const updateTicket = trpc.ticket.update.useMutation({
    onSuccess: async () => {
      await invalidateTicketQueries();
      setEditTicketId(null);
      alert(tc("alerts.ticketUpdated"));
    },
    onError: (err) => alertServerError(tc, err),
  });

  if (isLoading) return <div className="py-8 text-center text-slate-500">{t("loading_tickets")}</div>;
  if (isError) return <div className="py-8 text-center text-red-600">{t("error_loading_tickets")}</div>;

  const ticketCounts: Record<string, number> = {};
  (stats?.statusCounts || []).forEach(s => ticketCounts[s.status] = s.count);

  const buildSharedPayload = () => ({
    airlineId: newTicket.airlineId > 0 ? newTicket.airlineId : undefined,
    customerId: newTicket.customerId,
    travelDate: newTicket.travelDate || undefined,
    returnDate: newTicket.returnDate || undefined,
    routeFrom: newTicket.routeFrom.trim() || undefined,
    routeTo: newTicket.routeTo.trim() || undefined,
    tripType: newTicket.tripType,
    class: newTicket.class,
    baseFare: computed.baseFare.toString(),
    taxAmount: newTicket.taxAmount || "0",
    totalAmount: computed.totalAmount.toString(),
    paidAmount: newTicket.paidAmount || "0",
    commissionAmount: newTicket.commissionAmount || "0",
    discountAmount: newTicket.discountAmount || "0",
    netPayable: computed.walletDeduction.toString(),
    notes: newTicket.notes.trim() || undefined,
    walletId: newTicket.walletId,
  });

  const priceAndWalletValid = Number(newTicket.ticketPrice) > 0 && !!newTicket.walletId;

  const singleFormValid =
    priceAndWalletValid &&
    !!newTicket.passengerFirstName.trim() &&
    !!newTicket.passengerLastName.trim();

  const handleCreate = () => {
    createTicket.mutate({
      ...buildSharedPayload(),
      ticketNumber: newTicket.ticketNumber.trim() || undefined,
      pnrCode: newTicket.pnrCode.trim() || undefined,
      passengers: [{
        firstName: newTicket.passengerFirstName.trim(),
        lastName: newTicket.passengerLastName.trim(),
        passengerType: "adult" as const,
      }],
    });
  };

  const handleBulkCreate = () => {
    const validEntries = bulkEntries.filter(
      (e) => e.passengerFirstName.trim() && e.passengerLastName.trim(),
    );
    if (validEntries.length === 0) {
      alert(tc("alerts.passengerRequired"));
      return;
    }

    createBulkTickets.mutate({
      ...buildSharedPayload(),
      entries: validEntries.map((e) => ({
        firstName: e.passengerFirstName.trim(),
        lastName: e.passengerLastName.trim(),
        pnrCode: e.pnrCode.trim() || undefined,
        ticketNumber: e.ticketNumber.trim() || undefined,
      })),
    });
  };

  const updateBulkEntry = (id: string, field: keyof Omit<BulkTicketEntry, "id">, value: string) => {
    setBulkEntries((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addBulkEntry = () => {
    setBulkEntries((rows) => [...rows, createBulkEntry()]);
  };

  const removeBulkEntry = (id: string) => {
    setBulkEntries((rows) => rows.length <= 1 ? rows : rows.filter((row) => row.id !== id));
  };

  const validBulkRows = bulkEntries.filter(
    (e) => e.passengerFirstName.trim() && e.passengerLastName.trim(),
  ).length;
  const isCreating = createTicket.isPending || createBulkTickets.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("ticket_management")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manage_airline_tickets_bookings_and_reservations")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />{t("new_ticket")}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{createMode === "single" ? t("create_new_ticket") : t("create_multiple_tickets")}</DialogTitle>
            </DialogHeader>

            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "single" | "multiple")} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">{t("single_ticket")}</TabsTrigger>
                <TabsTrigger value="multiple">{t("multiple_tickets")}</TabsTrigger>
              </TabsList>
            </Tabs>

            {createMode === "single" && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t("passenger_information")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div><RequiredLabel>{t("first_name")}</RequiredLabel><Input value={newTicket.passengerFirstName} onChange={e => setNewTicket({...newTicket, passengerFirstName: e.target.value})} placeholder={t("john")} /></div>
                  <div><RequiredLabel>{t("last_name")}</RequiredLabel><Input value={newTicket.passengerLastName} onChange={e => setNewTicket({...newTicket, passengerLastName: e.target.value})} placeholder={t("doe")} /></div>
                </div>
              </div>
            )}

            {/* Financial Information */}
            <div className="pt-4 border-t">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t("financial_information")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><RequiredLabel>{t("ticket_price")}</RequiredLabel><Input type="number" min="0" step="0.01" value={newTicket.ticketPrice} onChange={e => setNewTicket({...newTicket, ticketPrice: e.target.value})} placeholder="0.00" /></div>
                <div><OptionalLabel>{t("tax_amount")}</OptionalLabel><Input type="number" min="0" step="0.01" value={newTicket.taxAmount} onChange={e => setNewTicket({...newTicket, taxAmount: e.target.value})} placeholder="0.00" /></div>
                <div><OptionalLabel>{t("paid_amount")}</OptionalLabel><Input type="number" min="0" step="0.01" value={newTicket.paidAmount} onChange={e => setNewTicket({...newTicket, paidAmount: e.target.value})} placeholder="0.00" /></div>
                <div><OptionalLabel>{t("commission_amount")}</OptionalLabel><Input type="number" min="0" step="0.01" value={newTicket.commissionAmount} onChange={e => setNewTicket({...newTicket, commissionAmount: e.target.value})} placeholder="0.00" /></div>
                <div><OptionalLabel>{t("customer_discount")}</OptionalLabel><Input type="number" min="0" step="0.01" max={newTicket.commissionAmount || undefined} value={newTicket.discountAmount} onChange={e => setNewTicket({...newTicket, discountAmount: e.target.value})} placeholder="0.00" title={t("discount_is_deducted_from_commission")} /></div>
                <div><OptionalLabel>{t("customer_charge")}</OptionalLabel><Input type="number" value={computed.customerCharge || ""} disabled className="bg-slate-50 dark:bg-slate-800" /></div>
                <div><OptionalLabel>{t("wallet_deduction")}</OptionalLabel><Input type="number" value={computed.walletDeduction || ""} disabled className="bg-slate-50 dark:bg-slate-800" title={t("ticket_price_minus_airline_commission")} /></div>
                <div><OptionalLabel>{t("remaining_due")}</OptionalLabel><Input type="number" value={computed.remainingDue || ""} disabled className="bg-slate-50 dark:bg-slate-800" /></div>
              </div>

              {/* Amount Preview */}
              {(computed.ticketPrice > 0 || computed.tax > 0 || computed.commission > 0) && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                  <p className="text-xs font-medium text-slate-500 mb-2">{t("amount_preview")}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-600">{t("ticket_price")}</span><span className="text-right font-medium">${computed.ticketPrice.toLocaleString()}</span>
                    <span className="text-slate-600">{t("tax")}</span><span className="text-right font-medium">${computed.tax.toLocaleString()}</span>
                    <span className="text-slate-600">{t("base_fare")}</span><span className="text-right font-medium">${computed.baseFare.toLocaleString()}</span>
                    <span className="text-slate-600">{t("airline_commission")}</span><span className="text-right font-medium">${computed.commission.toLocaleString()}</span>
                    <span className="text-slate-600">{t("customer_discount")}</span><span className="text-right font-medium text-red-600">-${computed.discount.toLocaleString()}</span>
                    <span className="text-slate-600">{t("net_commission")}</span><span className="text-right font-medium">${computed.netCommission.toLocaleString()}</span>
                    <span className="text-slate-600">{t("paid")}</span><span className="text-right font-medium">${computed.paidAmount.toLocaleString()}</span>
                    <span className="text-slate-600 font-bold">{t("wallet_deduction")}</span><span className="text-right font-bold">${computed.walletDeduction.toLocaleString()}</span>
                    <span className="text-slate-600 font-bold text-amber-600">{t("remaining_due")}</span><span className="text-right font-bold text-amber-600">${computed.remainingDue.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Selection */}
            <div className="pt-4 border-t">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t("wallet_selection")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <RequiredLabel>{t("booking_wallet")}</RequiredLabel>
                  <Select onValueChange={(v) => setNewTicket({ ...newTicket, walletId: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder={t("select_wallet")} /></SelectTrigger>
                    <SelectContent>
                      {(wallets || []).length === 0 ? (
                        <SelectItem value="__empty__" disabled>{t("no_records_found")}</SelectItem>
                      ) : (
                        (wallets || []).map((w) => (
                          <SelectItem key={w.id} value={w.id.toString()}>
                            {w.name} (${Number(w.balance).toLocaleString()})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Flight Information */}
            <div className="pt-4 border-t">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {createMode === "single" ? t("flight_information") : t("shared_flight_information")}
                <span className="ml-2 normal-case font-normal text-slate-400">{t("optional")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <OptionalLabel>{t("customer")}</OptionalLabel>
                  <Select onValueChange={v => setNewTicket({...newTicket, customerId: Number(v) || undefined})}>
                    <SelectTrigger><SelectValue placeholder={t("select_customer")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">{t("walk_in_no_customer")}</SelectItem>
                      {(customers || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><OptionalLabel>{t("from")}</OptionalLabel><Input value={newTicket.routeFrom} onChange={e => setNewTicket({...newTicket, routeFrom: e.target.value.toUpperCase()})} placeholder={t("jfk")} maxLength={10} /></div>
                <div><OptionalLabel>{t("to")}</OptionalLabel><Input value={newTicket.routeTo} onChange={e => setNewTicket({...newTicket, routeTo: e.target.value.toUpperCase()})} placeholder={t("lhr")} maxLength={10} /></div>
                <div><OptionalLabel>{t("travel_date")}</OptionalLabel><Input type="date" value={newTicket.travelDate} onChange={e => setNewTicket({...newTicket, travelDate: e.target.value})} /></div>
                <div><OptionalLabel>{t("return_date")}</OptionalLabel><Input type="date" value={newTicket.returnDate} onChange={e => setNewTicket({...newTicket, returnDate: e.target.value})} /></div>
                <div>
                  <OptionalLabel>{t("trip_type")}</OptionalLabel>
                  <Select value={newTicket.tripType} onValueChange={v => setNewTicket({...newTicket, tripType: v as "one_way" | "round_trip" | "multi_city"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">{t("one_way")}</SelectItem>
                      <SelectItem value="round_trip">{t("round_trip")}</SelectItem>
                      <SelectItem value="multi_city">{t("multi_city")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <OptionalLabel>{t("class")}</OptionalLabel>
                  <Select value={newTicket.class} onValueChange={v => setNewTicket({...newTicket, class: v as "economy" | "premium_economy" | "business" | "first"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">{t("economy")}</SelectItem>
                      <SelectItem value="premium_economy">{t("premium_economy")}</SelectItem>
                      <SelectItem value="business">{t("business")}</SelectItem>
                      <SelectItem value="first">{t("first")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="pt-4 border-t">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {createMode === "single" ? t("booking_information") : t("shared_booking_details")}
                <span className="ml-2 normal-case font-normal text-slate-400">{t("optional")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {createMode === "single" && (
                  <>
                    <div><OptionalLabel>{t("ticket_number")}</OptionalLabel><Input value={newTicket.ticketNumber} onChange={e => setNewTicket({...newTicket, ticketNumber: e.target.value})} placeholder={t("auto_generated_if_empty")} /></div>
                    <div><OptionalLabel>{t("pnr_code")}</OptionalLabel><Input value={newTicket.pnrCode} onChange={e => setNewTicket({...newTicket, pnrCode: e.target.value})} placeholder={t("abc123")} /></div>
                  </>
                )}
                <div className={createMode === "multiple" ? "sm:col-span-2" : ""}>
                  <OptionalLabel>{t("airline")}</OptionalLabel>
                  <Select onValueChange={v => setNewTicket({...newTicket, airlineId: Number(v)})}>
                    <SelectTrigger><SelectValue placeholder={t("select_airline")} /></SelectTrigger>
                    <SelectContent>
                      {(airlines || []).length === 0 ? (
                        <SelectItem value="__empty__" disabled>{t("no_records_found")}</SelectItem>
                      ) : (
                        (airlines || []).map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><OptionalLabel>{t("notes")}</OptionalLabel><Input value={newTicket.notes} onChange={e => setNewTicket({...newTicket, notes: e.target.value})} placeholder={t("additional_notes")} /></div>
              </div>
            </div>

            {createMode === "multiple" && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" />{t("passengers_unique_per_ticket")}</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addBulkEntry}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t("add_passenger")}</Button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {t("bulk_passengers_help")}
                </p>
                <div className="space-y-2">
                  {bulkEntries.map((entry, index) => (
                    <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="sm:col-span-1 text-xs font-medium text-slate-500 pb-2">#{index + 1}</div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs">{t("first_name")}<span className="text-red-500">*</span></Label>
                        <Input
                          value={entry.passengerFirstName}
                          onChange={(e) => updateBulkEntry(entry.id, "passengerFirstName", e.target.value)}
                          placeholder={t("john")}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs">{t("last_name")}<span className="text-red-500">*</span></Label>
                        <Input
                          value={entry.passengerLastName}
                          onChange={(e) => updateBulkEntry(entry.id, "passengerLastName", e.target.value)}
                          placeholder={t("doe")}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">{t("pnr")}<span className="text-slate-400 font-normal">{t("optional")}</span></Label>
                        <Input
                          value={entry.pnrCode}
                          onChange={(e) => updateBulkEntry(entry.id, "pnrCode", e.target.value)}
                          placeholder={t("abc123")}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">{t("ticket")}<span className="text-slate-400 font-normal">{t("optional")}</span></Label>
                        <Input
                          value={entry.ticketNumber}
                          onChange={(e) => updateBulkEntry(entry.id, "ticketNumber", e.target.value)}
                          placeholder={t("auto")}
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-red-500"
                          onClick={() => removeBulkEntry(entry.id)}
                          disabled={bulkEntries.length <= 1}
                          title={t("remove_passenger")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {createMode === "single" ? (
              <Button
                className="w-full mt-4 bg-indigo-600"
                onClick={handleCreate}
                disabled={!singleFormValid || isCreating}
              >
                {createTicket.isPending ? tc("actions.creating") : tc("actions.createTicket")}
              </Button>
            ) : (
              <Button
                className="w-full mt-4 bg-indigo-600"
                onClick={handleBulkCreate}
                disabled={!priceAndWalletValid || validBulkRows === 0 || isCreating}
              >
                {createBulkTickets.isPending
                  ? tc("actions.creating")
                  : tc("actions.createTicket")}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {["confirmed", "pending", "cancelled", "refunded", "completed"].map(s => (
          <Card key={s} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatus(status === s ? "" : s)}>
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-slate-500 capitalize">{s}</p>
              <p className="text-lg sm:text-xl font-bold">{ticketCounts[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder={t("search_tickets")} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Tickets Info Under Search */}
      {ticketsData && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <span>{t("showing")}<strong>{ticketsData.items.length}</strong>{t("of")}<strong>{ticketsData.total}</strong> tickets
            {status && <span className="ml-1">{t("filtered_by")}<span className="capitalize">{status}</span>)</span>}
          </span>
          <span>Page {ticketsData.page} of {Math.max(1, Math.ceil(ticketsData.total / ticketsData.limit))}</span>
        </div>
      )}

      {/* Tickets Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                <tr>
                  <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("ticket")}</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("passenger")}</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("route")}</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("airline")}</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("class")}</th>
                  <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("amount")}</th>
                  <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("statusColumn")}</th>
                  <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-14" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-5 w-14 mx-auto" /></td>
                      <td className="p-2 sm:p-3"><Skeleton className="h-7 w-20 mx-auto" /></td>
                    </tr>
                  ))
                )}
                {!isLoading && !isError && (ticketsData?.items || []).map((ticket) => {
                  const firstPax = ticket.passengers?.[0];
                  const paxName = firstPax ? `${firstPax.firstName} ${firstPax.lastName}` : "-";
                  return (
                    <tr key={ticket.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-2 sm:p-3">
                        <div className="font-medium text-xs sm:text-sm">{ticket.ticketNumber || "-"}</div>
                        <div className="text-[10px] text-slate-500">PNR: {ticket.pnrCode || "-"}</div>
                      </td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm">{paxName}</td>
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center gap-1 text-xs sm:text-sm">
                          <span className="font-medium">{ticket.routeFrom || "?"}</span>
                          <Plane className="h-3 w-3 text-slate-400" />
                          <span className="font-medium">{ticket.routeTo || "?"}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{ticket.tripType?.replace("_", " ") || "-"} · {formatDate(ticket.travelDate)}</div>
                      </td>
                      <td className="p-2 sm:p-3 text-slate-600 text-xs sm:text-sm">{ticket.airline?.name || "-"}</td>
                      <td className="p-2 sm:p-3 text-xs sm:text-sm">{seatClassLabel(ticket.class)}</td>
                      <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">${Number(ticket.totalAmount).toLocaleString()}</td>
                      <td className="p-2 sm:p-3 text-center">
                        <Badge className={`text-[10px] sm:text-xs ${statusColors[ticket.status] || ""}`}>{ticket.status}</Badge>
                      </td>
                      <td className="p-2 sm:p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTicket(ticket.id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canEdit && !["refunded", "cancelled"].includes(ticket.status) && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-indigo-600" title={tc("edit_ticket")} onClick={() => setEditTicketId(ticket.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          {ticket.status === "pending" && canApprove && (
                            <>
                              <Button size="sm" variant="ghost" className="text-emerald-600 h-7 text-xs px-2" onClick={() => approveTicket.mutate({ id: ticket.id })} disabled={approveTicket.isPending}>
                                <CheckCircle className="h-3 w-3 mr-1" />{t("approve")}</Button>
                              <Button size="sm" variant="ghost" className="text-red-600 h-7 text-xs px-2" onClick={() => rejectTicket.mutate({ id: ticket.id })} disabled={rejectTicket.isPending}>
                                <XCircle className="h-3 w-3 mr-1" />{t("reject")}</Button>
                            </>
                          )}
                          {ticket.status === "pending" && !canApprove && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">{t("pending")}</span>
                          )}
                          {ticket.status === "confirmed" && (
                            <span className="inline-flex items-center text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded" title={t("invoice_auto_generated_on_approval")}>
                              <FileText className="h-3 w-3 mr-1" />{t("invoice")}</span>
                          )}
                          {(ticket.status === "confirmed" || ticket.status === "completed") && (
                            <Button size="sm" variant="ghost" className="text-indigo-600 h-7 text-xs px-2" onClick={async () => {
                              const data = await utils.document.ticketVoucherData.fetch({ id: ticket.id });
                              if (data) {
                                const doc = generateTicketVoucherPDF(data);
                                doc.save(`voucher-${data.ticket.ticketNumber || ticket.id}.pdf`);
                              }
                            }}>
                              <Download className="h-3 w-3 mr-1" />{t("voucher")}</Button>
                          )}
                          {(ticket.status === "confirmed" || ticket.status === "completed") && ticket.customerId && ticket.paymentStatus !== "paid" && canApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 h-7 text-xs px-2"
                              onClick={() => {
                                setPayTicketId(ticket.id);
                                const discount = Number((ticket as { discountAmount?: string }).discountAmount ?? 0);
                                const charge = Number(ticket.totalAmount) - discount;
                                const paid = Number((ticket as { paidAmount?: string }).paidAmount ?? 0);
                                setPaymentForm({ amount: String(Math.max(0, charge - paid)), description: "" });
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />{t("pay")}</Button>
                          )}
                          {ticket.status === "confirmed" && canApprove && (
                            <Button size="sm" variant="ghost" className="text-slate-600 h-7 text-xs px-2" onClick={() => { setRefundTicketId(ticket.id); setRefundForm({ refundAmount: String(ticket.totalAmount), penaltyAmount: "", reason: "" }); }}>
                              <RotateCcw className="h-3 w-3 mr-1" />{t("refund")}</Button>
                          )}
                          {canApprove && ticket.status !== "refunded" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 h-7 w-7 p-0"
                              title={t("delete_ticket_reverses_accounting_if_approved")}
                              disabled={deleteTicket.isPending}
                              onClick={() => {
                                if (confirm(tc("confirm.deleteTicket", { name: ticket.ticketNumber }) + (ticket.status === "confirmed" ? tc("confirm.ticketAccountingReversal") : ""))) {
                                  deleteTicket.mutate({ id: ticket.id });
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty / Error States */}
          {isError && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-500 mb-2">{t("failed_to_load_tickets")}</p>
              <Button size="sm" variant="outline" onClick={() => (refetch as () => Promise<unknown>)()}>{t("retry")}</Button>
            </div>
          )}
          {!isLoading && !isError && (ticketsData?.items || []).length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              {t("noTickets")}{search ? ` ${t("try_adjusting_search")}` : ""}
            </div>
          )}
          {ticketsData && ticketsData.total > 10 && (
            <div className="flex justify-center p-3 gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("previous")}</Button>
              <span className="text-sm text-slate-500 py-2">{t("page_of", { page, total: Math.ceil(ticketsData.total / ticketsData.limit) })}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(ticketsData.total / ticketsData.limit)} onClick={() => setPage(p => p + 1)}>{t("next")}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("ticket_details")}</DialogTitle></DialogHeader>
          {viewTicket && <TicketDetails id={viewTicket} />}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payTicketId} onOpenChange={() => setPayTicketId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("record_ticket_payment")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <p className="text-xs text-slate-500">{t("payment_is_applied_to_the_ticket_invoice_via_the_unified_ar_path_no_duplicate_jo")}</p>
            <div>
              <label className="text-sm text-slate-500">{t("amount")}</label>
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(s => ({ ...s, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm text-slate-500">{t("description")}</label>
              <Input value={paymentForm.description} onChange={e => setPaymentForm(s => ({ ...s, description: e.target.value }))} placeholder={t("optional_note")} />
            </div>
            <Button
              className="w-full bg-indigo-600"
              disabled={!paymentForm.amount || recordPayment.isPending}
              onClick={() => recordPayment.mutate({
                id: payTicketId!,
                amount: paymentForm.amount,
                description: paymentForm.description || undefined,
              })}
            >
              {recordPayment.isPending ? tc("actions.processing") : tc("actions.confirmPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={!!editTicketId} onOpenChange={() => setEditTicketId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tc("edit_ticket")}</DialogTitle></DialogHeader>
          {editTicketId && (
            <TicketEditForm
              ticketId={editTicketId}
              airlines={airlines ?? []}
              wallets={wallets ?? []}
              customers={customers}
              isPending={updateTicket.isPending}
              onSave={(payload) => updateTicket.mutate({ id: editTicketId, ...payload })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundTicketId} onOpenChange={() => setRefundTicketId(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("process_ticket_refund")}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div>
              <label className="text-sm text-slate-500">{t("refund_amount_to_customer")}</label>
              <Input type="number" step="0.01" value={refundForm.refundAmount} onChange={e => setRefundForm(s => ({ ...s, refundAmount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm text-slate-500">{t("penalty_amount_kept_by_agency")}</label>
              <Input type="number" step="0.01" value={refundForm.penaltyAmount} onChange={e => setRefundForm(s => ({ ...s, penaltyAmount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm text-slate-500">{t("reason")}</label>
              <Input value={refundForm.reason} onChange={e => setRefundForm(s => ({ ...s, reason: e.target.value }))} placeholder={t("refund_reason")} />
            </div>
            {refundForm.refundAmount && refundForm.penaltyAmount && Number(refundForm.refundAmount) + Number(refundForm.penaltyAmount) > 0 && (
              <div className="bg-slate-50 p-3 rounded text-sm">
                <p>{t("total_reversal")}<span className="font-bold">${(Number(refundForm.refundAmount) + Number(refundForm.penaltyAmount)).toLocaleString()}</span></p>
                <p className="text-xs text-slate-500">Customer receives ${Number(refundForm.refundAmount).toLocaleString()}</p>
              </div>
            )}
            <Button
              className="w-full bg-indigo-600"
              disabled={!refundForm.refundAmount || refundTicket.isPending}
              onClick={() => refundTicket.mutate({
                id: refundTicketId!,
                refundAmount: refundForm.refundAmount,
                penaltyAmount: refundForm.penaltyAmount || undefined,
                reason: refundForm.reason || undefined,
              })}
            >
              {refundTicket.isPending ? tc("actions.processing") : tc("actions.confirmRefund")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketEditForm({
  ticketId,
  airlines,
  wallets,
  customers,
  isPending: saving,
  onSave,
}: {
  ticketId: number;
  airlines: { id: number; name: string }[];
  wallets: { id: number; name: string }[];
  customers: { id: number; firstName: string; lastName: string }[];
  isPending: boolean;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation("tickets");
  const { t: tc } = useTranslation("common");
  const seatClassLabel = (c: string) => {
    const labels: Record<string, string> = {
      economy: t("economy"),
      premium_economy: t("premium_economy"),
      business: t("business"),
      first: t("first"),
    };
    return labels[c] || c;
  };
  const { data: ticket } = trpc.ticket.get.useQuery({ id: ticketId });
  const [form, setForm] = useState<{
    ticketNumber: string;
    pnrCode: string;
    airlineId: number;
    customerId: number | undefined;
    walletId: number;
    travelDate: string;
    returnDate: string;
    routeFrom: string;
    routeTo: string;
    tripType: "one_way" | "round_trip" | "multi_city";
    class: "economy" | "premium_economy" | "business" | "first";
    ticketPrice: string;
    taxAmount: string;
    commissionAmount: string;
    discountAmount: string;
    paidAmount: string;
    notes: string;
    passengerFirstName: string;
    passengerLastName: string;
  } | null>(null);

  useEffect(() => {
    if (!ticket) return;
    const meta = typeof ticket.metadata === "string"
      ? (() => { try { return JSON.parse(ticket.metadata); } catch { return null; } })()
      : (ticket.metadata as { walletId?: number } | null);
    const firstPax = ticket.passengers?.[0];
    setForm({
      ticketNumber: ticket.ticketNumber || "",
      pnrCode: ticket.pnrCode || "",
      airlineId: ticket.airlineId ?? 0,
      customerId: ticket.customerId ?? undefined,
      walletId: meta?.walletId ?? 0,
      travelDate: ticket.travelDate ? new Date(ticket.travelDate).toISOString().slice(0, 10) : "",
      returnDate: ticket.returnDate ? new Date(ticket.returnDate).toISOString().slice(0, 10) : "",
      routeFrom: ticket.routeFrom || "",
      routeTo: ticket.routeTo || "",
      tripType: ticket.tripType,
      class: ticket.class,
      ticketPrice: String(ticket.totalAmount ?? ""),
      taxAmount: String(ticket.taxAmount ?? "0"),
      commissionAmount: String(ticket.commissionAmount ?? "0"),
      discountAmount: String(ticket.discountAmount ?? "0"),
      paidAmount: String(ticket.paidAmount ?? "0"),
      notes: ticket.notes || "",
      passengerFirstName: firstPax?.firstName || "",
      passengerLastName: firstPax?.lastName || "",
    });
  }, [ticket]);

  if (!ticket || !form) return <div className="py-8 text-center text-slate-500">{t("loading_tickets")}</div>;

  const isPendingTicket = ticket.status === "pending";
  const ticketPrice = Math.max(0, Number(form.ticketPrice) || 0);
  const tax = Math.max(0, Number(form.taxAmount) || 0);
  const commission = Math.max(0, Number(form.commissionAmount) || 0);
  const baseFare = Math.max(0, ticketPrice - tax);
  const netPayable = Math.max(0, ticketPrice - commission);

  const handleSave = () => {
    const passengers = form.passengerFirstName.trim() && form.passengerLastName.trim()
      ? [{
          id: ticket.passengers?.[0]?.id,
          firstName: form.passengerFirstName.trim(),
          lastName: form.passengerLastName.trim(),
          passengerType: ticket.passengers?.[0]?.passengerType ?? "adult" as const,
        }]
      : undefined;

    if (isPendingTicket) {
      onSave({
        ticketNumber: form.ticketNumber || undefined,
        pnrCode: form.pnrCode || undefined,
        airlineId: form.airlineId > 0 ? form.airlineId : undefined,
        customerId: form.customerId,
        walletId: form.walletId > 0 ? form.walletId : undefined,
        travelDate: form.travelDate || undefined,
        returnDate: form.returnDate || undefined,
        routeFrom: form.routeFrom || undefined,
        routeTo: form.routeTo || undefined,
        tripType: form.tripType,
        class: form.class,
        baseFare: baseFare.toString(),
        taxAmount: form.taxAmount || "0",
        totalAmount: ticketPrice.toString(),
        commissionAmount: form.commissionAmount || "0",
        discountAmount: form.discountAmount || "0",
        paidAmount: form.paidAmount || "0",
        netPayable: netPayable.toString(),
        notes: form.notes || undefined,
        passengers,
      });
    } else {
      onSave({
        ticketNumber: form.ticketNumber || undefined,
        pnrCode: form.pnrCode || undefined,
        airlineId: form.airlineId > 0 ? form.airlineId : undefined,
        travelDate: form.travelDate || undefined,
        returnDate: form.returnDate || undefined,
        routeFrom: form.routeFrom || undefined,
        routeTo: form.routeTo || undefined,
        tripType: form.tripType,
        class: form.class,
        notes: form.notes || undefined,
        passengers,
      });
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {!isPendingTicket && (
        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">{tc("financial_fields_locked")}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label className="text-xs text-slate-500">{t("ticket_number")}</Label><Input value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-500">{t("pnr_code")}</Label><Input value={form.pnrCode} onChange={e => setForm({ ...form, pnrCode: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-500">{t("route")}</Label>
          <div className="flex gap-2">
            <Input value={form.routeFrom} onChange={e => setForm({ ...form, routeFrom: e.target.value })} placeholder={t("from")} />
            <Input value={form.routeTo} onChange={e => setForm({ ...form, routeTo: e.target.value })} placeholder={t("to")} />
          </div>
        </div>
        <div><Label className="text-xs text-slate-500">{t("travel_date")}</Label><Input type="date" value={form.travelDate} onChange={e => setForm({ ...form, travelDate: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-500">{t("airline")}</Label>
          <Select value={form.airlineId > 0 ? form.airlineId.toString() : ""} onValueChange={v => setForm({ ...form, airlineId: Number(v) })}>
            <SelectTrigger><SelectValue placeholder={t("select_airline")} /></SelectTrigger>
            <SelectContent>{airlines.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-slate-500">{t("class")}</Label>
          <Select value={form.class} onValueChange={v => setForm({ ...form, class: v as typeof form.class })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["economy", "premium_economy", "business", "first"] as const).map(c => (
                <SelectItem key={c} value={c}>{seatClassLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-slate-500">{t("passenger")}</Label>
          <div className="flex gap-2">
            <Input value={form.passengerFirstName} onChange={e => setForm({ ...form, passengerFirstName: e.target.value })} placeholder={t("first")} />
            <Input value={form.passengerLastName} onChange={e => setForm({ ...form, passengerLastName: e.target.value })} placeholder={t("last")} />
          </div>
        </div>
        <div className="sm:col-span-2"><Label className="text-xs text-slate-500">{tc("notes")}</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      {isPendingTicket && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
          <div><Label className="text-xs text-slate-500">{t("booking_wallet")}</Label>
            <Select value={form.walletId > 0 ? form.walletId.toString() : ""} onValueChange={v => setForm({ ...form, walletId: Number(v) })}>
              <SelectTrigger><SelectValue placeholder={t("select_wallet")} /></SelectTrigger>
              <SelectContent>{wallets.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-slate-500">{t("customer")}</Label>
            <Select value={form.customerId ? form.customerId.toString() : "walkin"} onValueChange={v => setForm({ ...form, customerId: v === "walkin" ? undefined : Number(v) })}>
              <SelectTrigger><SelectValue placeholder={t("walk_in_no_customer")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walkin">{t("walk_in_no_customer")}</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-slate-500">{t("ticket_price")}</Label><Input type="number" value={form.ticketPrice} onChange={e => setForm({ ...form, ticketPrice: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-500">{t("tax")}</Label><Input type="number" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-500">{t("commission")}</Label><Input type="number" value={form.commissionAmount} onChange={e => setForm({ ...form, commissionAmount: e.target.value })} /></div>
          <div><Label className="text-xs text-slate-500">{t("discount")}</Label><Input type="number" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: e.target.value })} /></div>
        </div>
      )}
      <Button className="w-full bg-indigo-600" disabled={saving || !form.passengerFirstName.trim() || !form.passengerLastName.trim()} onClick={handleSave}>
        {saving ? tc("actions.saving") : tc("save_changes")}
      </Button>
    </div>
  );
}

function TicketDetails({ id }: { id: number }) {
  const { t } = useTranslation("tickets");
  const { data: ticket } = trpc.ticket.get.useQuery({ id });
  if (!ticket) return null;

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label className="text-xs text-slate-500">{t("ticket_number")}</Label><p className="font-medium text-sm">{ticket.ticketNumber || "-"}</p></div>
        <div><Label className="text-xs text-slate-500">{t("pnr_code")}</Label><p className="font-medium text-sm">{ticket.pnrCode || "-"}</p></div>
        <div><Label className="text-xs text-slate-500">{t("route")}</Label><p className="font-medium text-sm">{ticket.routeFrom || "?"} → {ticket.routeTo || "?"}</p></div>
        <div><Label className="text-xs text-slate-500">{t("airline")}</Label><p className="font-medium text-sm">{ticket.airline?.name || "-"}</p></div>
        <div><Label className="text-xs text-slate-500">{t("travel_date")}</Label><p className="font-medium text-sm">{ticket.travelDate ? new Date(ticket.travelDate).toLocaleDateString() : "-"}</p></div>
        <div><Label className="text-xs text-slate-500">{t("class")}</Label><p className="font-medium text-sm capitalize">{ticket.class?.replace("_", " ") || "-"}</p></div>
      </div>
      <div className="border-t pt-4">
        <Label className="text-xs text-slate-500">{t("financial_breakdown")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <span className="text-slate-600">{t("due")}</span><span className="text-right font-medium">${Number(ticket.totalAmount).toLocaleString()}</span>
          <span className="text-slate-600">{t("tax")}</span><span className="text-right font-medium">${Number(ticket.taxAmount).toLocaleString()}</span>
          <span className="text-slate-600">{t("total")}</span><span className="text-right font-bold">${Number(ticket.totalAmount).toLocaleString()}</span>
          <span className="text-slate-600">{t("commission")}</span><span className="text-right font-medium">${Number(ticket.commissionAmount).toLocaleString()}</span>
          <span className="text-slate-600">{t("discount")}</span><span className="text-right font-medium">${Number(ticket.discountAmount ?? 0).toLocaleString()}</span>
          <span className="text-slate-600">{t("wallet_deduction")}</span><span className="text-right font-bold">${Number(ticket.netPayable).toLocaleString()}</span>
        </div>
      </div>
      {ticket.passengers && ticket.passengers.length > 0 && (
        <div className="border-t pt-4">
          <Label className="text-xs text-slate-500">{t("passengers")}</Label>
          <div className="space-y-1 mt-2">
            {ticket.passengers.map((p, i) => (
              <p key={i} className="text-sm">{p.firstName} {p.lastName} ({p.passengerType}) {p.seatNumber && `- Seat ${p.seatNumber}`}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}