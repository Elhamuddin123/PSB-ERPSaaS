import { useState } from "react";
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
import { Users, Search, Plus, Phone, Mail, Building2, Star, DollarSign, UserPlus, ArrowRight } from "lucide-react";
import { Link } from "react-router";

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

  const [newCustomer, setNewCustomer] = useState<{ firstName: string; lastName: string; email: string; phone: string; company: string; customerType: "individual" | "corporate" | "agent"; notes: string }>({ firstName: "", lastName: "", email: "", phone: "", company: "", customerType: "individual", notes: "" });
  const [newLead, setNewLead] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "", priority: "medium" as const, estimatedValue: "", notes: "" });

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
          <div><p className="text-xs text-slate-500">{t("total_revenue_1")}</p><p className="text-xl sm:text-2xl font-bold">${(stats?.totalRevenue ?? 0).toLocaleString()}</p></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {(customersData?.items || []).map((customer) => (
              <Card key={customer.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <Link to={`/crm/customers/${customer.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs sm:text-sm flex-shrink-0">
                          {customer.firstName?.[0] ?? "?"}{customer.lastName?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{customer.firstName} {customer.lastName}</h3>
                          <p className="text-[10px] sm:text-xs text-slate-500">{customer.customerCode}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] sm:text-xs flex-shrink-0 ${statusColors[customer.status] || ""}`}>{customer.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs sm:text-sm text-slate-600">
                      {customer.company && <p className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3 flex-shrink-0" /> {customer.company}</p>}
                      {customer.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> {customer.email}</p>}
                      {customer.phone && <p className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 flex-shrink-0" /> {customer.phone}</p>}
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">{customer.totalBookings} bookings</span>
                      <span className="font-semibold">${Number(customer.totalRevenue).toLocaleString()}</span>
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
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("name_1_1")}</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("company_1")}</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("source_1")}</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-slate-500 text-xs">{t("status_1_1_1_1")}</th>
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
    </div>
  );
}