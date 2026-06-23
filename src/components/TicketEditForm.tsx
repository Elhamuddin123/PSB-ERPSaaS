import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TicketEditForm({
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
