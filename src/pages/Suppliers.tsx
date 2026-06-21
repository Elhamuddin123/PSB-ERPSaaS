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
import { Skeleton } from "@/components/ui/skeleton";
import { Tractor, Search, Plus, Phone, Mail, MapPin, Building2, ArrowRight, Globe, CreditCard, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SUPERVISORY_ROLES, hasAnyRole, isAgencyAdmin } from "@/lib/roles";
import { Link } from "react-router";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-800",
  blocked: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  airline: "Airline",
  hotel: "Hotel",
  tour_operator: "Tour Operator",
  car_rental: "Car Rental",
  insurance: "Insurance",
  visa_service: "Visa Service",
  other: "Other",
};

export default function SuppliersPage() {
  const { t, t: tc } = useTranslation("common");
  const { user } = useAuth();
  const canManage = hasAnyRole(user?.role, SUPERVISORY_ROLES);
  const canEdit = isAgencyAdmin(user?.role);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<{
    id: number;
    companyName: string;
    tradeName: string;
    supplierType: "airline" | "hotel" | "tour_operator" | "car_rental" | "insurance" | "visa_service" | "other";
    taxId: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    website: string;
    creditLimit: string;
    paymentTerms: string;
    currency: string;
    status: "active" | "inactive" | "blocked";
    notes: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.supplier.stats.useQuery();
  const { data: suppliersData, isLoading, error } = trpc.supplier.list.useQuery({
    search: search || undefined,
    type: typeFilter !== "__all__" ? typeFilter : undefined,
    status: statusFilter !== "__all__" ? statusFilter : undefined,
  });
  console.log("[Suppliers] suppliersData:", suppliersData, "isLoading:", isLoading, "error:", error);

  const deleteSupplier = trpc.supplier.delete.useMutation({
    onSuccess: async () => {
      await utils.supplier.list.invalidate();
      await utils.supplier.stats.invalidate();
    },
    onError: (err) => alertServerError(t, err),
  });

  const createSupplier = trpc.supplier.create.useMutation({
    onSuccess: async () => {
      await utils.supplier.list.invalidate();
      await utils.supplier.stats.invalidate();
      setCreateOpen(false);
      resetForm();
    },
    onError: (err) => alertServerError(t, err),
  });

  const updateSupplier = trpc.supplier.update.useMutation({
    onSuccess: async () => {
      await utils.supplier.list.invalidate();
      await utils.supplier.stats.invalidate();
      setEditSupplier(null);
      alert(t("alerts.supplierUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const [form, setForm] = useState({
    companyName: "",
    tradeName: "",
    supplierType: "other" as const,
    taxId: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    website: "",
    creditLimit: "",
    paymentTerms: "30",
    currency: "USD",
    notes: "",
  });

  const resetForm = () => setForm({
    companyName: "", tradeName: "", supplierType: "other", taxId: "", email: "", phone: "",
    address: "", city: "", country: "", website: "", creditLimit: "", paymentTerms: "30", currency: "USD", notes: "",
  });

  if (isLoading) return <div className="py-8 text-center text-slate-500">{t("loading_suppliers")}</div>;
  if (error) return <div className="py-8 text-center text-red-600">Error loading suppliers: {error.message}</div>;
  if (!suppliersData) return <div className="py-8 text-center text-slate-500">{t("no_supplier_data_available")}</div>;

  const openEdit = (supplier: NonNullable<typeof suppliersData>["items"][number]) => {
    setEditSupplier({
      id: supplier.id,
      companyName: supplier.companyName ?? "",
      tradeName: supplier.tradeName ?? "",
      supplierType: (supplier.supplierType ?? "other") as "airline" | "hotel" | "tour_operator" | "car_rental" | "insurance" | "visa_service" | "other",
      taxId: supplier.taxId ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      city: supplier.city ?? "",
      country: supplier.country ?? "",
      website: supplier.website ?? "",
      creditLimit: String(supplier.creditLimit ?? ""),
      paymentTerms: String(supplier.paymentTerms ?? "30"),
      currency: supplier.currency ?? "USD",
      status: supplier.status as "active" | "inactive" | "blocked",
      notes: supplier.notes ?? "",
    });
  };

  const handleCreate = () => {
    if (!form.companyName.trim()) return;
    createSupplier.mutate({
      companyName: form.companyName,
      tradeName: form.tradeName || undefined,
      supplierType: form.supplierType,
      taxId: form.taxId || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      website: form.website || undefined,
      creditLimit: Number(form.creditLimit) || 0,
      paymentTerms: Number(form.paymentTerms) || 30,
      currency: form.currency,
      notes: form.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editSupplier?.companyName.trim()) return;
    updateSupplier.mutate({
      id: editSupplier.id,
      companyName: editSupplier.companyName,
      tradeName: editSupplier.tradeName || undefined,
      supplierType: editSupplier.supplierType,
      taxId: editSupplier.taxId || undefined,
      email: editSupplier.email || undefined,
      phone: editSupplier.phone || undefined,
      address: editSupplier.address || undefined,
      city: editSupplier.city || undefined,
      country: editSupplier.country || undefined,
      website: editSupplier.website || undefined,
      creditLimit: Number(editSupplier.creditLimit) || 0,
      paymentTerms: Number(editSupplier.paymentTerms) || 30,
      currency: editSupplier.currency,
      status: editSupplier.status,
      notes: editSupplier.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("suppliers_vendors")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manage_airlines_hotels_tour_operators_and_other_suppliers")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="self-start sm:self-auto">
              <Plus className="h-4 w-4 mr-1" />{t("add_supplier")}</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("add_new_supplier")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("company_name")}</Label>
                <Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder={t("e_g_emirates_airlines")} />
              </div>
              <div>
                <Label>{t("trade_name")}</Label>
                <Input value={form.tradeName} onChange={e => setForm({ ...form, tradeName: e.target.value })} placeholder={t("optional_trading_name")} />
              </div>
              <div>
                <Label>{t("supplier_type")}</Label>
                <Select value={form.supplierType} onValueChange={v => setForm({ ...form, supplierType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airline">{t("airline")}</SelectItem>
                    <SelectItem value="hotel">{t("hotel")}</SelectItem>
                    <SelectItem value="tour_operator">{t("tour_operator")}</SelectItem>
                    <SelectItem value="car_rental">{t("car_rental")}</SelectItem>
                    <SelectItem value="insurance">{t("insurance")}</SelectItem>
                    <SelectItem value="visa_service">{t("visa_service")}</SelectItem>
                    <SelectItem value="other">{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("email")}</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>{t("phone")}</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{t("address")}</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("city")}</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>{t("country")}</Label>
                  <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tax_id")}</Label>
                  <Input value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
                </div>
                <div>
                  <Label>{t("website")}</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder={t("https")} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t("credit_limit")}</Label>
                  <Input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
                </div>
                <div>
                  <Label>{t("terms_days")}</Label>
                  <Input type="number" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} />
                </div>
                <div>
                  <Label>{t("currency")}</Label>
                  <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} maxLength={3} />
                </div>
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleCreate} disabled={createSupplier.isPending || !form.companyName.trim()} className="w-full">
                {createSupplier.isPending ? tc("actions.creating") : tc("actions.createSupplier")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50"><Tractor className="h-4 w-4 text-indigo-600" /></div>
              <span className="text-xs text-slate-500">{t("total_suppliers")}</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.totalSuppliers ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50"><Building2 className="h-4 w-4 text-emerald-600" /></div>
              <span className="text-xs text-slate-500">{t("active")}</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.activeSuppliers ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50"><CreditCard className="h-4 w-4 text-amber-600" /></div>
              <span className="text-xs text-slate-500">{t("total_payable")}</span>
            </div>
            <p className="text-xl font-bold mt-1">${(stats?.totalPayable ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50"><ArrowRight className="h-4 w-4 text-red-600" /></div>
              <span className="text-xs text-slate-500">{t("overdue_bills")}</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.overdueBills ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder={t("search_suppliers")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("all_types")}</SelectItem>
            <SelectItem value="airline">{t("airline")}</SelectItem>
            <SelectItem value="hotel">{t("hotel")}</SelectItem>
            <SelectItem value="tour_operator">{t("tour_operator")}</SelectItem>
            <SelectItem value="car_rental">{t("car_rental")}</SelectItem>
            <SelectItem value="insurance">{t("insurance")}</SelectItem>
            <SelectItem value="visa_service">{t("visa_service")}</SelectItem>
            <SelectItem value="other">{t("other")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t("statusColumn")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("all_status")}</SelectItem>
            <SelectItem value="active">{t("active")}</SelectItem>
            <SelectItem value="inactive">{t("inactive")}</SelectItem>
            <SelectItem value="blocked">{t("blocked")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Supplier Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {(suppliersData?.items || []).map((supplier) => (
            <Card key={supplier.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <Link to={`/suppliers/${supplier.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs sm:text-sm flex-shrink-0">
                        {supplier.companyName?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{supplier.companyName}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500">{supplier.supplierCode} · {typeLabels[supplier.supplierType] || supplier.supplierType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge className={`text-[10px] sm:text-xs ${statusColors[supplier.status] || ""}`}>{supplier.status}</Badge>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEdit(supplier);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canManage && Number(supplier.balanceDue) === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          disabled={deleteSupplier.isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(tc("confirm.deleteSupplier", { name: supplier.companyName }))) {
                              deleteSupplier.mutate({ id: supplier.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs sm:text-sm text-slate-600">
                    {supplier.tradeName && <p className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3 flex-shrink-0" /> {supplier.tradeName}</p>}
                    {supplier.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> {supplier.email}</p>}
                    {supplier.phone && <p className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 flex-shrink-0" /> {supplier.phone}</p>}
                    {supplier.city && <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" /> {supplier.city}{supplier.country ? `, ${supplier.country}` : ""}</p>}
                    {supplier.website && <p className="flex items-center gap-1 truncate"><Globe className="h-3 w-3 flex-shrink-0" /> {supplier.website}</p>}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Terms: {supplier.paymentTerms} days</span>
                    <span className="font-semibold">${Number(supplier.balanceDue).toLocaleString()} due</span>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-indigo-600 flex items-center justify-end gap-1">{t("view_details")}<ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suppliersData?.items?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <Tractor className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">{t("no_suppliers_found")}</p>
          <p className="text-sm mt-1">{t("add_your_first_supplier_to_get_started")}</p>
        </div>
      )}
      {!suppliersData && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">{t("failed_to_load_suppliers_check_console")}</p>
        </div>
      )}

      <Dialog open={!!editSupplier} onOpenChange={(open) => { if (!open) setEditSupplier(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit_supplier")}</DialogTitle>
          </DialogHeader>
          {editSupplier && (
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("company_name")}</Label>
                <Input value={editSupplier.companyName} onChange={e => setEditSupplier({ ...editSupplier, companyName: e.target.value })} />
              </div>
              <div>
                <Label>{t("trade_name")}</Label>
                <Input value={editSupplier.tradeName} onChange={e => setEditSupplier({ ...editSupplier, tradeName: e.target.value })} />
              </div>
              <div>
                <Label>{t("supplier_type")}</Label>
                <Select value={editSupplier.supplierType} onValueChange={v => setEditSupplier({ ...editSupplier, supplierType: v as typeof editSupplier.supplierType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airline">{t("airline")}</SelectItem>
                    <SelectItem value="hotel">{t("hotel")}</SelectItem>
                    <SelectItem value="tour_operator">{t("tour_operator")}</SelectItem>
                    <SelectItem value="car_rental">{t("car_rental")}</SelectItem>
                    <SelectItem value="insurance">{t("insurance")}</SelectItem>
                    <SelectItem value="visa_service">{t("visa_service")}</SelectItem>
                    <SelectItem value="other">{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("statusColumn")}</Label>
                <Select value={editSupplier.status} onValueChange={v => setEditSupplier({ ...editSupplier, status: v as typeof editSupplier.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("active")}</SelectItem>
                    <SelectItem value="inactive">{t("inactive")}</SelectItem>
                    <SelectItem value="blocked">{t("blocked")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("email")}</Label>
                  <Input type="email" value={editSupplier.email} onChange={e => setEditSupplier({ ...editSupplier, email: e.target.value })} />
                </div>
                <div>
                  <Label>{t("phone")}</Label>
                  <Input value={editSupplier.phone} onChange={e => setEditSupplier({ ...editSupplier, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{t("address")}</Label>
                <Input value={editSupplier.address} onChange={e => setEditSupplier({ ...editSupplier, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("city")}</Label>
                  <Input value={editSupplier.city} onChange={e => setEditSupplier({ ...editSupplier, city: e.target.value })} />
                </div>
                <div>
                  <Label>{t("country")}</Label>
                  <Input value={editSupplier.country} onChange={e => setEditSupplier({ ...editSupplier, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tax_id")}</Label>
                  <Input value={editSupplier.taxId} onChange={e => setEditSupplier({ ...editSupplier, taxId: e.target.value })} />
                </div>
                <div>
                  <Label>{t("website")}</Label>
                  <Input value={editSupplier.website} onChange={e => setEditSupplier({ ...editSupplier, website: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t("credit_limit")}</Label>
                  <Input type="number" value={editSupplier.creditLimit} onChange={e => setEditSupplier({ ...editSupplier, creditLimit: e.target.value })} />
                </div>
                <div>
                  <Label>{t("terms_days")}</Label>
                  <Input type="number" value={editSupplier.paymentTerms} onChange={e => setEditSupplier({ ...editSupplier, paymentTerms: e.target.value })} />
                </div>
                <div>
                  <Label>{t("currency")}</Label>
                  <Input value={editSupplier.currency} onChange={e => setEditSupplier({ ...editSupplier, currency: e.target.value })} maxLength={3} />
                </div>
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Input value={editSupplier.notes} onChange={e => setEditSupplier({ ...editSupplier, notes: e.target.value })} />
              </div>
              <Button onClick={handleUpdate} disabled={updateSupplier.isPending || !editSupplier.companyName.trim()} className="w-full">
                {updateSupplier.isPending ? tc("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
