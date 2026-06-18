import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, MapPin, Phone, Clock, Mail, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { alertServerError } from "@/lib/i18n-ui";

export default function PaymentLocationsPage() {
  const { t, t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<{
    id: number;
    name: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    openingHours: string;
    status: "active" | "inactive";
  } | null>(null);
  const [newLoc, setNewLoc] = useState({ name: "", city: "", address: "", phone: "", email: "", openingHours: "" });

  const { data, isLoading, error, refetch } = trpc.paymentLocation.list.useQuery({});
  const createLocation = trpc.paymentLocation.create.useMutation({
    onSuccess: () => { refetch(); setCreateOpen(false); setNewLoc({ name: "", city: "", address: "", phone: "", email: "", openingHours: "" }); },
    onError: (err) => alertServerError(t, err),
  });
  const deleteLocation = trpc.paymentLocation.delete.useMutation({
    onSuccess: (result) => {
      refetch();
      if (result.deactivated) alert(t("alerts.locationDeactivated"));
    },
    onError: (err) => alertServerError(t, err),
  });
  const updateLocation = trpc.paymentLocation.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditLoc(null);
      alert(t("alerts.locationUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const filtered = search
    ? data?.items?.filter((l: any) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase())
      )
    : data?.items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("payment_locations")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manage_offices_and_payment_collection_points")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />{t("add_location")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("add_payment_location")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-4">
              <div><label className="text-sm text-slate-500">{t("name_1_1_1")}</label><Input value={newLoc.name} onChange={e => setNewLoc(s => ({ ...s, name: e.target.value }))} placeholder={t("e_g_balkh_travel_mazar")} /></div>
              <div><label className="text-sm text-slate-500">{t("city")}</label><Input value={newLoc.city} onChange={e => setNewLoc(s => ({ ...s, city: e.target.value }))} placeholder={t("e_g_mazar_i_sharif")} /></div>
              <div><label className="text-sm text-slate-500">{t("address")}</label><Input value={newLoc.address} onChange={e => setNewLoc(s => ({ ...s, address: e.target.value }))} placeholder={t("full_address")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-slate-500">{t("phone_1_1")}</label><Input value={newLoc.phone} onChange={e => setNewLoc(s => ({ ...s, phone: e.target.value }))} placeholder={t("phone_1")} /></div>
                <div><label className="text-sm text-slate-500">{t("email_1")}</label><Input value={newLoc.email} onChange={e => setNewLoc(s => ({ ...s, email: e.target.value }))} placeholder={t("email")} /></div>
              </div>
              <div><label className="text-sm text-slate-500">{t("opening_hours")}</label><Input value={newLoc.openingHours} onChange={e => setNewLoc(s => ({ ...s, openingHours: e.target.value }))} placeholder={t("e_g_sat_thu_8_00_17_00")} /></div>
              <Button className="w-full bg-indigo-600" disabled={!newLoc.name || !newLoc.city || createLocation.isPending} onClick={() => createLocation.mutate(newLoc)}>
                {createLocation.isPending ? tc("actions.creating") : tc("actions.createLocation")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder={t("search_locations")} className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-red-500 mb-2">{t("failed_to_load_locations")}</p>
          <Button variant="outline" onClick={() => refetch()}>{t("retry_1_1_1_1")}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered?.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">{t("no_payment_locations_found")}</div>
          )}
          {filtered?.map((loc: any) => (
            <Card key={loc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{loc.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {loc.city}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={loc.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                      {loc.status}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-indigo-600"
                        onClick={() => setEditLoc({
                          id: loc.id,
                          name: loc.name,
                          city: loc.city,
                          address: loc.address || "",
                          phone: loc.phone || "",
                          email: loc.email || "",
                          openingHours: loc.openingHours || "",
                          status: loc.status as "active" | "inactive",
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500"
                        disabled={deleteLocation.isPending}
                        onClick={() => {
                          if (confirm(tc("confirm.deleteLocation", { name: loc.name }))) {
                            deleteLocation.mutate({ id: loc.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {loc.address && <p className="text-sm text-slate-600 mt-2">{loc.address}</p>}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  {loc.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {loc.phone}</span>}
                  {loc.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {loc.email}</span>}
                  {loc.openingHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {loc.openingHours}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editLoc} onOpenChange={() => setEditLoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("edit_location")}</DialogTitle></DialogHeader>
          {editLoc && (
            <div className="space-y-3 pt-4">
              <div><Label className="text-sm text-slate-500">{t("name_1_1_1")}</Label><Input value={editLoc.name} onChange={e => setEditLoc({ ...editLoc, name: e.target.value })} /></div>
              <div><Label className="text-sm text-slate-500">{t("city")}</Label><Input value={editLoc.city} onChange={e => setEditLoc({ ...editLoc, city: e.target.value })} /></div>
              <div><Label className="text-sm text-slate-500">{t("address")}</Label><Input value={editLoc.address} onChange={e => setEditLoc({ ...editLoc, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm text-slate-500">{t("phone_1_1")}</Label><Input value={editLoc.phone} onChange={e => setEditLoc({ ...editLoc, phone: e.target.value })} /></div>
                <div><Label className="text-sm text-slate-500">{t("email_1")}</Label><Input value={editLoc.email} onChange={e => setEditLoc({ ...editLoc, email: e.target.value })} /></div>
              </div>
              <div><Label className="text-sm text-slate-500">{t("opening_hours")}</Label><Input value={editLoc.openingHours} onChange={e => setEditLoc({ ...editLoc, openingHours: e.target.value })} /></div>
              <div>
                <Label className="text-sm text-slate-500">{t("status_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <Select value={editLoc.status} onValueChange={(v) => setEditLoc({ ...editLoc, status: v as "active" | "inactive" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="inactive">inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={!editLoc.name || !editLoc.city || updateLocation.isPending}
                onClick={() => updateLocation.mutate({
                  id: editLoc.id,
                  name: editLoc.name,
                  city: editLoc.city,
                  address: editLoc.address || undefined,
                  phone: editLoc.phone || undefined,
                  email: editLoc.email || undefined,
                  openingHours: editLoc.openingHours || undefined,
                  status: editLoc.status,
                })}
              >
                {updateLocation.isPending ? "Saving..." : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
