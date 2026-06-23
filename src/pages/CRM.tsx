import { useCallback, useState } from "react";
import { alertServerError } from "@/lib/i18n-ui";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Users, Search, Plus, Phone, Mail, Star, DollarSign, UserPlus, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useClientTable } from "@/lib/client-table";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  vip: "bg-amber-100 text-amber-800",
  inactive: "bg-slate-100 text-slate-800",
  blacklisted: "bg-red-100 text-red-800",
};

function optionalField(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  qualified: "bg-indigo-100 text-indigo-800",
  proposal: "bg-amber-100 text-amber-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
};

export default function CRMPage() {
  const { t } = useTranslation("customers");
  const { t: tc } = useTranslation("common");
  const [tab, setTab] = useState("customers");
  const [search, setSearch] = useState("");
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<{
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    customerType: "individual" | "corporate" | "agent";
    status: "active" | "inactive" | "blacklisted" | "vip";
    notes: string | null;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    customer: { id: number; firstName: string; lastName: string } | null;
    canDelete: boolean;
    blockReason: string | null;
    depositLiability: number;
  }>({ open: false, customer: null, canDelete: false, blockReason: null, depositLiability: 0 });

  const utils = trpc.useUtils();
  const { data: stats } = trpc.crm.stats.useQuery();
  const { data: customersData, refetch: refetchCustomers } = trpc.crm.customers.useQuery({ search });
  const { data: leadsData, refetch: refetchLeads } = trpc.crm.leads.useQuery({ search });
  const createCustomer = trpc.crm.createCustomer.useMutation({
    onSuccess: async () => {
      await utils.crm.customers.invalidate();
      await utils.crm.stats.invalidate();
      await utils.dashboard.stats.invalidate();
      await utils.dashboard.topCustomers.invalidate();
      refetchCustomers();
      setCreateCustomerOpen(false);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "", company: "", customerType: "individual" as const, notes: "" });
    },
    onError: (err) => alertServerError(tc, err),
  });
  const createLead = trpc.crm.createLead.useMutation({
    onSuccess: async () => {
      await utils.crm.leads.invalidate();
      await utils.crm.stats.invalidate();
      refetchLeads();
      setCreateLeadOpen(false);
      setNewLead({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "", priority: "medium" as const, estimatedValue: "", notes: "" });
    },
    onError: (err) => alertServerError(tc, err),
  });
  const updateLeadStatus = trpc.crm.updateLeadStatus.useMutation({
    onSuccess: async () => {
      await utils.crm.leads.invalidate();
      await utils.crm.stats.invalidate();
      refetchLeads();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const updateCustomer = trpc.crm.updateCustomer.useMutation({
    onSuccess: async () => {
      await utils.crm.customers.invalidate();
      await utils.crm.stats.invalidate();
      refetchCustomers();
      setEditCustomer(null);
    },
    onError: (err) => alertServerError(tc, err),
  });

  const deleteCustomer = trpc.crm.deleteCustomer.useMutation({
    onSuccess: async () => {
      await utils.crm.customers.invalidate();
      await utils.crm.stats.invalidate();
      refetchCustomers();
    },
    onError: (err) => alertServerError(tc, err),
  });

  const handleDeleteCustomer = async (customer: { id: number; firstName: string; lastName: string }) => {
    try {
      const check = await utils.crm.customerDeleteCheck.fetch({ id: customer.id });
      setDeleteDialog({
        open: true,
        customer,
        canDelete: check.canDelete,
        blockReason: check.blockReason,
        depositLiability: Number(check.depositLiability ?? 0),
      });
    } catch (err) {
      alertServerError(tc, err as { message: string });
    }
  };

  const confirmDeleteCustomer = () => {
    if (!deleteDialog.customer) return;
    deleteCustomer.mutate({ id: deleteDialog.customer.id });
    setDeleteDialog({ open: false, customer: null, canDelete: false, blockReason: null, depositLiability: 0 });
  };

  const [newCustomer, setNewCustomer] = useState<{ firstName: string; lastName: string; email: string; phone: string; company: string; customerType: "individual" | "corporate" | "agent"; notes: string }>({ firstName: "", lastName: "", email: "", phone: "", company: "", customerType: "individual", notes: "" });
  const [newLead, setNewLead] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "", priority: "medium" as const, estimatedValue: "", notes: "" });

  const getCustomerSortValue = useCallback((customer: NonNullable<typeof customersData>["items"][number], key: string) => {
    switch (key) {
      case "name": return `${customer.firstName} ${customer.lastName}`;
      case "company": return customer.company || "";
      case "code": return customer.customerCode;
      case "status": return customer.status;
      case "bookings": return Number(customer.totalBookings);
      case "revenue": return Number(customer.totalRevenue);
      default: return "";
    }
  }, []);

  const { rows: customerRows, sortKey, sortDir, toggleSort } = useClientTable({
    items: customersData?.items ?? [],
    search: "",
    getSearchText: () => "",
    defaultSortKey: "name",
    getSortValue: getCustomerSortValue,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("crm.title")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("crm.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-xs sm:text-sm"><UserPlus className="h-4 w-4 mr-1 sm:mr-2" /> {t("crm.addCustomer")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader><DialogTitle>{t("crm.addCustomer")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("crm.firstName")} *</Label><Input value={newCustomer.firstName} onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})} /></div>
                  <div><Label>{t("crm.lastName")} *</Label><Input value={newCustomer.lastName} onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})} /></div>
                </div>
                <div><Label>{t("crm.emailOptional")}</Label><Input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder={t("customer_example_com")} /></div>
                <div><Label>{t("crm.phone")}</Label><Input value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="+1 234 567 8900" /></div>
                <div><Label>{t("crm.company")}</Label><Input value={newCustomer.company} onChange={e => setNewCustomer({...newCustomer, company: e.target.value})} /></div>
                <div>
                  <Label>{t("crm.type")}</Label>
                  <Select value={newCustomer.customerType} onValueChange={v => setNewCustomer({...newCustomer, customerType: v as "individual" | "corporate" | "agent"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">{t("crm.individual")}</SelectItem>
                      <SelectItem value="corporate">{t("crm.corporate")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("crm.notes")}</Label><Input value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} /></div>
                <Button
                  className="w-full bg-indigo-600"
                  onClick={() => createCustomer.mutate({
                    ...newCustomer,
                    email: optionalField(newCustomer.email),
                    phone: optionalField(newCustomer.phone),
                    company: optionalField(newCustomer.company),
                    notes: optionalField(newCustomer.notes),
                  })}
                  disabled={!newCustomer.firstName.trim() || !newCustomer.lastName.trim() || createCustomer.isPending}
                >
                  {t("crm.createCustomer")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={createLeadOpen} onOpenChange={setCreateLeadOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm"><Plus className="h-4 w-4 mr-1 sm:mr-2" />{t("add_lead")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader><DialogTitle>{t("add_new_lead")}</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>{t("first_name")}</Label><Input value={newLead.firstName} onChange={e => setNewLead({...newLead, firstName: e.target.value})} /></div>
                  <div><Label>{t("last_name")}</Label><Input value={newLead.lastName} onChange={e => setNewLead({...newLead, lastName: e.target.value})} /></div>
                </div>
                <div><Label>{t("email_optional")}</Label><Input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} placeholder={t("lead_example_com")} /></div>
                <div><Label>{t("phone")}</Label><Input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="+1 234 567 8900" /></div>
                <div><Label>{t("company")}</Label><Input value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} /></div>
                <div><Label>{t("source")}</Label><Input value={newLead.source} onChange={e => setNewLead({...newLead, source: e.target.value})} placeholder={t("website_referral_etc")} /></div>
                <div><Label>{t("estimated_value")}</Label><Input value={newLead.estimatedValue} onChange={e => setNewLead({...newLead, estimatedValue: e.target.value})} placeholder="0.00" /></div>
                <Button
                  className="w-full bg-indigo-600"
                  onClick={() => createLead.mutate({
                    ...newLead,
                    email: optionalField(newLead.email),
                    phone: optionalField(newLead.phone),
                    company: optionalField(newLead.company),
                    source: optionalField(newLead.source),
                    estimatedValue: optionalField(newLead.estimatedValue),
                    notes: optionalField(newLead.notes),
                  })}
                  disabled={!newLead.firstName.trim() || !newLead.lastName.trim() || createLead.isPending}
                >{t("create_lead")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" /></div>
          <div><p className="text-xs text-slate-500">{t("total_customers")}</p><p className="text-xl sm:text-2xl font-bold">{stats?.customers ?? 0}</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500">{t("vip_customers")}</p><p className="text-xl sm:text-2xl font-bold">{stats?.vipCustomers ?? 0}</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" /></div>
          <div><p className="text-xs text-slate-500">{t("total_revenue")}</p><p className="text-xl sm:text-2xl font-bold">${(stats?.totalRevenue ?? 0).toLocaleString()}</p></div>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
          <div><p className="text-xs text-slate-500">{t("active_leads")}</p><p className="text-xl sm:text-2xl font-bold">{stats?.activeLeads ?? 0}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder={t("search_customers_or_leads")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="customers">Customers ({customersData?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leadsData?.total ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t("name")} sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTableHead label={t("company")} sortKey="company" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTableHead label={t("customer_code")} sortKey="code" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <TableHead>{tc("contact")}</TableHead>
                      <SortableTableHead label={t("statusColumn")} sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTableHead label={t("totalBookings")} sortKey="bookings" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                      <SortableTableHead label={t("total_revenue")} sortKey="revenue" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">{t("noCustomers")}</TableCell>
                      </TableRow>
                    )}
                    {customerRows.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <TableCell>
                          <p className="font-medium text-sm">{customer.firstName} {customer.lastName}</p>
                        </TableCell>
                        <TableCell className="text-sm">{customer.company || "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{customer.customerCode}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs text-slate-600">
                            {customer.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</p>}
                            {customer.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${statusColors[customer.status] || ""}`}>{customer.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{customer.totalBookings}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">${Number(customer.totalRevenue).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/crm/customers/${customer.id}`}>
                                {t("view_details")}<ArrowRight className="h-3 w-3 ml-1 inline" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditCustomer({
                                id: customer.id,
                                firstName: customer.firstName,
                                lastName: customer.lastName,
                                email: customer.email,
                                phone: customer.phone,
                                company: customer.company,
                                customerType: customer.customerType,
                                status: customer.status,
                                notes: customer.notes,
                              })}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500"
                              disabled={deleteCustomer.isPending}
                              onClick={() => handleDeleteCustomer(customer)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("name")}</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("company")}</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("source")}</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("statusColumn")}</th>
                      <th className="text-right p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("value")}</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leadsData?.items || []).map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="p-2 sm:p-3">
                          <p className="font-medium text-xs sm:text-sm">{lead.firstName} {lead.lastName}</p>
                          {lead.email && <p className="text-[10px] text-slate-500">{lead.email}</p>}
                        </td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">{lead.company || "-"}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm">{lead.source || "-"}</td>
                        <td className="p-2 sm:p-3 text-center"><Badge className={`text-[10px] ${leadStatusColors[lead.status] || ""}`}>{lead.status}</Badge></td>
                        <td className="p-2 sm:p-3 text-right font-medium text-xs sm:text-sm">${Number(lead.estimatedValue || 0).toLocaleString()}</td>
                        <td className="p-2 sm:p-3 text-center">
                          <Select value={lead.status} onValueChange={v => updateLeadStatus.mutate({ id: lead.id, status: v as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost" })}>
                            <SelectTrigger className="h-7 text-xs w-24 sm:w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">{t("new")}</SelectItem>
                              <SelectItem value="contacted">{t("contacted")}</SelectItem>
                              <SelectItem value="qualified">{t("qualified")}</SelectItem>
                              <SelectItem value="proposal">{t("proposal")}</SelectItem>
                              <SelectItem value="negotiation">{t("negotiation")}</SelectItem>
                              <SelectItem value="won">{t("won")}</SelectItem>
                              <SelectItem value="lost">{t("lost")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("editCustomer")}</DialogTitle></DialogHeader>
          {editCustomer && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("firstName")} *</Label><Input value={editCustomer.firstName} onChange={(e) => setEditCustomer({ ...editCustomer, firstName: e.target.value })} /></div>
                <div><Label>{t("lastName")} *</Label><Input value={editCustomer.lastName} onChange={(e) => setEditCustomer({ ...editCustomer, lastName: e.target.value })} /></div>
              </div>
              <div><Label>{t("emailOptional")}</Label><Input type="email" value={editCustomer.email ?? ""} onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })} /></div>
              <div><Label>{t("phone")}</Label><Input value={editCustomer.phone ?? ""} onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })} /></div>
              <div><Label>{t("company")}</Label><Input value={editCustomer.company ?? ""} onChange={(e) => setEditCustomer({ ...editCustomer, company: e.target.value })} /></div>
              <div>
                <Label>{t("type")}</Label>
                <Select value={editCustomer.customerType} onValueChange={(v) => setEditCustomer({ ...editCustomer, customerType: v as typeof editCustomer.customerType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t("individual")}</SelectItem>
                    <SelectItem value="corporate">{t("corporate")}</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("statusColumn")}</Label>
                <Select value={editCustomer.status} onValueChange={(v) => setEditCustomer({ ...editCustomer, status: v as typeof editCustomer.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="vip">{t("vip")}</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("notes")}</Label><Input value={editCustomer.notes ?? ""} onChange={(e) => setEditCustomer({ ...editCustomer, notes: e.target.value })} /></div>
              <Button
                className="w-full bg-indigo-600"
                disabled={!editCustomer.firstName.trim() || !editCustomer.lastName.trim() || updateCustomer.isPending}
                onClick={() => updateCustomer.mutate({
                  id: editCustomer.id,
                  firstName: editCustomer.firstName,
                  lastName: editCustomer.lastName,
                  email: optionalField(editCustomer.email ?? ""),
                  phone: optionalField(editCustomer.phone ?? ""),
                  company: optionalField(editCustomer.company ?? ""),
                  customerType: editCustomer.customerType,
                  status: editCustomer.status,
                  notes: optionalField(editCustomer.notes ?? ""),
                })}
              >
                {tc("save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, customer: null, canDelete: false, blockReason: null, depositLiability: 0 })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("delete_customer_title")}</DialogTitle></DialogHeader>
          {deleteDialog.customer && (
            <div className="space-y-3 pt-2">
              {deleteDialog.canDelete ? (
                <>
                  <p className="text-sm text-slate-600">{t("delete_customer_confirm")}</p>
                  <p className="text-sm text-slate-500">{t("delete_customer_warning", { name: `${deleteDialog.customer.firstName} ${deleteDialog.customer.lastName}` })}</p>
                  <Button className="w-full bg-red-600 hover:bg-red-700" disabled={deleteCustomer.isPending} onClick={confirmDeleteCustomer}>
                    {deleteCustomer.isPending ? tc("actions.processing") : t("deleteCustomer")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">{t("delete_customer_settle_first")}</p>
                  {deleteDialog.blockReason && (
                    <p className="text-sm text-slate-600">{deleteDialog.blockReason}</p>
                  )}
                  {deleteDialog.depositLiability > 0.01 && (
                    <p className="text-sm text-blue-800 bg-blue-50 rounded-lg p-3">
                      {t("delete_customer_deposit_hint", { amount: deleteDialog.depositLiability.toLocaleString() })}
                    </p>
                  )}
                  <Button className="w-full bg-indigo-600" asChild>
                    <Link to={`/crm/${deleteDialog.customer.id}`}>{t("view_details")}</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}