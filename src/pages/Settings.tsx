import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { canManageAgencyStaff, canViewSecurityAudit, isSuperAdmin } from "@/lib/roles";
import { alertServerError } from "@/lib/i18n-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router";
import { formatPlanLabel, PLATFORM_PAYMENT_CONTACT } from "@contracts/plans";
import { getSubscriptionStatusLabel } from "@/lib/subscription";
import {
  canAddUserWithRole,
  formatRoleSeatBreakdown,
  formatTotalSeatLabel,
  seatLimitMessage,
} from "@/lib/plan-usage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Bell, Users, Activity, CheckCircle,
  AlertTriangle, Info, Server, UserCircle, Monitor,
  Plus, Pencil, AlertCircle, Lock, Mail,
  Phone, Building2, UserPlus, CreditCard, Trash2,
} from "lucide-react";

const STAFF_ROLE_KEYS = ["agent", "viewer"] as const;

type StaffRole = (typeof STAFF_ROLE_KEYS)[number];

function normalizeStaffRole(role: string | undefined): StaffRole {
  return role === "viewer" ? "viewer" : "agent";
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  admin: "bg-indigo-100 text-indigo-800",
  agent: "bg-amber-100 text-amber-800",
  viewer: "bg-slate-100 text-slate-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-800",
  suspended: "bg-red-100 text-red-800",
};

export default function SettingsPage() {
  const { t } = useTranslation("common");
  const staffRoles = STAFF_ROLE_KEYS.map((value) => ({
    value,
    label: t(`roles.${value}`),
  }));
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canManageStaff = canManageAgencyStaff(user?.role);
  const canViewSecurity = canViewSecurityAudit(user?.role);
  const isPlatformAdmin = isSuperAdmin(user?.role);
  const initialTab = searchParams.get("tab") ?? (canManageStaff ? "users" : "notifications");
  const highlightedNotificationId = searchParams.get("notificationId");
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab) setTab(nextTab);
  }, [searchParams]);

  const { data: notifications, refetch: refetchNotif } = trpc.notification.list.useQuery({ status: "all", limit: 50 });

  useEffect(() => {
    if (tab !== "notifications" || !highlightedNotificationId || !notifications?.items?.length) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`notification-${highlightedNotificationId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [tab, highlightedNotificationId, notifications?.items]);
  const { data: auditLogs } = trpc.audit.logs.useQuery({}, { enabled: canViewSecurity });
  const { data: auditUsers } = trpc.audit.users.useQuery(undefined, { enabled: canManageStaff || isPlatformAdmin });
  const { data: roles } = trpc.audit.roles.useQuery(undefined, { enabled: canManageStaff || isPlatformAdmin });
  const { data: auditStats } = trpc.audit.stats.useQuery(undefined, { enabled: canViewSecurity });
  const { data: sessionData } = trpc.audit.listSessions.useQuery(undefined, { enabled: canViewSecurity });
  const sessions = sessionData?.items ?? [];
  const { data: usersList, refetch: refetchUsers } = trpc.users.list.useQuery(undefined, { enabled: canManageStaff });
  const { data: planUsage, refetch: refetchPlanUsage } = trpc.users.planUsage.useQuery(undefined, { enabled: canManageStaff });

  const utils = trpc.useUtils();

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.unread.invalidate();
      refetchNotif();
    },
    onError: (err) => alertServerError(t, err),
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.unread.invalidate();
      refetchNotif();
    },
    onError: (err) => alertServerError(t, err),
  });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      alert(t("alerts.profileUpdated"));
      utils.auth.me.invalidate();
    },
    onError: (err) => alertServerError(t, err),
  });

  // User management mutations
  const createUser = trpc.users.create.useMutation({
    onSuccess: async () => {
      setUserDialogOpen(false);
      resetUserForm();
      await refetchUsers();
      await refetchPlanUsage();
    },
    onError: (err) => alertServerError(t, err),
  });

  const updateUser = trpc.users.update.useMutation({
    onSuccess: async () => {
      setUserDialogOpen(false);
      setEditingUser(null);
      resetUserForm();
      await refetchUsers();
      await refetchPlanUsage();
    },
    onError: (err) => alertServerError(t, err),
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: async () => {
      setDeleteUserTarget(null);
      await refetchUsers();
      await refetchPlanUsage();
    },
    onError: (err) => alertServerError(t, err),
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
  });

  // User dialog state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: number; name: string } | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as StaffRole,
    department: "",
    phone: "",
    status: "active" as "active" | "inactive" | "suspended",
  });

  const resetUserForm = () => {
    setUserForm({ name: "", email: "", password: "", role: "agent", department: "", phone: "", status: "active" });
  };

  const availableStaffRoles = staffRoles.filter((role) => {
    if (role.value === "viewer") return planUsage?.plan === "enterprise";
    return true;
  });

  const openCreateUser = () => {
    if (planUsage && !planUsage.canAdd) {
      alert(seatLimitMessage(planUsage, t));
      return;
    }
    setEditingUser(null);
    resetUserForm();
    setUserDialogOpen(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: normalizeStaffRole(u.role),
      department: u.department || "",
      phone: u.phone || "",
      status: u.status || "active",
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      const update: any = { id: editingUser.id };
      if (userForm.name) update.name = userForm.name;
      if (userForm.email) update.email = userForm.email;
      if (userForm.role) update.role = userForm.role;
      if (userForm.department !== undefined) update.department = userForm.department;
      if (userForm.phone !== undefined) update.phone = userForm.phone;
      if (userForm.status) update.status = userForm.status;
      updateUser.mutate(update);
    } else {
      if (planUsage && !canAddUserWithRole(planUsage, userForm.role)) {
        alert(seatLimitMessage(planUsage, t, userForm.role));
        return;
      }
      createUser.mutate({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        department: userForm.department || undefined,
        phone: userForm.phone || undefined,
      });
    }
  };

  const notifIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
    error: AlertTriangle,
    system: Server,
  };
  const notifColors: Record<string, string> = {
    success: "text-emerald-600 bg-emerald-100",
    warning: "text-amber-600 bg-amber-100",
    info: "text-blue-600 bg-blue-100",
    error: "text-red-600 bg-red-100",
    system: "text-slate-600 bg-slate-100",
  };

  const displayUsers = canManageStaff ? (usersList?.items ?? []) : (auditUsers ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("settings_security")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("manage_profile_notifications_audit_logs_users_and_roles")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* FIXED: scrollable tabs on mobile */}
        <TabsList className="bg-white border w-full sm:w-auto overflow-x-auto flex-nowrap h-auto p-1 gap-1">
          <TabsTrigger value="profile" className="text-xs sm:text-sm"><UserCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("profile_1")}</TabsTrigger>
          {!isPlatformAdmin && (
            <TabsTrigger value="subscription" className="text-xs sm:text-sm"><CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("subscription")}</TabsTrigger>
          )}
          {canViewSecurity && (
            <TabsTrigger value="sessions" className="text-xs sm:text-sm"><Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("sessions")}</TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="text-xs sm:text-sm"><Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("notifications_1")}</TabsTrigger>
          {canViewSecurity && (
            <TabsTrigger value="audit" className="text-xs sm:text-sm"><Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("audit_logs")}</TabsTrigger>
          )}
          {!isPlatformAdmin && (
            <TabsTrigger value="users" className="text-xs sm:text-sm"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("users")}</TabsTrigger>
          )}
          <TabsTrigger value="roles" className="text-xs sm:text-sm"><Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />{t("roles.title")}</TabsTrigger>
        </TabsList>

        {!isPlatformAdmin && (
          <TabsContent value="subscription" className="mt-6">
            <Card className="border-0 shadow-sm max-w-lg">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("agency_subscription")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{t("plan_1")}</span>
                  <span className="font-medium capitalize">{formatPlanLabel(user?.subscription?.plan ?? planUsage?.plan ?? "starter")}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{t("status_1_1_1_1_1_1_1_1_1_1_1")}</span>
                  <Badge variant="secondary">{getSubscriptionStatusLabel(user?.subscription?.status, t)}</Badge>
                </div>
                {user?.subscription?.expiresAt && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t("expires")}</span>
                    <span className="font-medium">{new Date(user.subscription.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                {user?.registrationToken && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t("registration_code")}</span>
                    <span className="font-mono font-semibold text-indigo-600">{user.registrationToken}</span>
                  </div>
                )}
                {planUsage && (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">{t("user_seats")}</span>
                      <span className="font-medium">{formatTotalSeatLabel(planUsage, t)}</span>
                    </div>
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300">
                      {formatRoleSeatBreakdown(planUsage)}
                      <p className="mt-1 text-slate-500">{t("admin_account_is_not_counted_toward_staff_seats")}</p>
                    </div>
                  </>
                )}
                {user?.subscription?.status !== "active" && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-slate-500 text-xs">
                      Complete payment at {PLATFORM_PAYMENT_CONTACT.agencyName} to activate your package.
                    </p>
                    <Link to="/payment-activation">
                      <Button variant="outline" size="sm">{t("view_payment_instructions")}</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="profile" className="mt-6">
          <Card className="border-0 shadow-sm max-w-lg">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("update_profile")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500">{t("name_1_1_1_1")}</Label>
                <Input value={profileForm.name} onChange={e => setProfileForm(s => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">{t("email_1_1")}</Label>
                <Input type="email" value={profileForm.email} onChange={e => setProfileForm(s => ({ ...s, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">{t("phone_1_1_1")}</Label>
                <Input value={profileForm.phone} onChange={e => setProfileForm(s => ({ ...s, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">{t("department")}</Label>
                <Input value={profileForm.department} onChange={e => setProfileForm(s => ({ ...s, department: e.target.value }))} />
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateProfile.isPending}
                onClick={() => updateProfile.mutate(profileForm)}
              >
                {updateProfile.isPending ? t("actions.saving") : t("actions.saveChanges")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewSecurity && (
        <TabsContent value="sessions" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {isPlatformAdmin ? t("settings.platformActiveSessions") : t("settings.agencyActiveSessions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("user")}</th>
                    {isPlatformAdmin && (
                      <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("agency_1")}</th>
                    )}
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("role_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("ip_address")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("user_agent")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("created")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("expires_1")}</th>
                  </tr></thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3">
                          <p className="text-xs sm:text-sm font-medium">{s.user?.name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-500">{s.user?.email || "—"}</p>
                        </td>
                        {isPlatformAdmin && (
                          <td className="px-4 py-3 text-xs sm:text-sm">{s.tenant?.name || "Platform"}</td>
                        )}
                        <td className="px-4 py-3 capitalize text-xs sm:text-sm">{s.user?.role || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.ipAddress || "-"}</td>
                        <td className="px-4 py-3 text-xs max-w-[200px] truncate">{s.userAgent || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.expiresAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={isPlatformAdmin ? 7 : 6} className="p-4 text-center text-sm text-slate-400">{t("no_active_sessions_found")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t("notifications_1_1")}</CardTitle>
              {(notifications?.items || []).some(n => !n.isRead) && (
                <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>{t("mark_all_read")}</Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(notifications?.items || []).map(notif => {
                  const Icon = notifIcons[notif.type] || Info;
                  const isHighlighted = highlightedNotificationId === String(notif.id);
                  return (
                    <div
                      key={notif.id}
                      id={`notification-${notif.id}`}
                      className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 transition-colors ${
                        isHighlighted
                          ? "bg-amber-50 ring-2 ring-amber-400 ring-inset"
                          : notif.isRead
                          ? "opacity-60"
                          : "bg-indigo-50/30"
                      }`}
                    >
                      <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 ${notifColors[notif.type] || ""}`}>
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{notif.category}</Badge>
                          <span className="text-[10px] text-slate-400">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}</span>
                        </div>
                      </div>
                      {!notif.isRead && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-shrink-0" onClick={() => markRead.mutate({ id: notif.id })} disabled={markRead.isPending}>{t("mark_read")}</Button>
                      )}
                    </div>
                  );
                })}
                {(!notifications?.items || notifications.items.length === 0) && (
                  <p className="text-center text-sm text-slate-400 py-8">{t("no_notifications")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewSecurity && (
        <TabsContent value="audit" className="mt-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-slate-500">{t("total_logs")}</p>
              <p className="text-lg sm:text-2xl font-bold">{auditLogs?.total ?? 0}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-slate-500">{t("action_types")}</p>
              <p className="text-lg sm:text-2xl font-bold">{auditStats?.actionCounts?.length ?? 0}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-slate-500">{t("entity_types")}</p>
              <p className="text-lg sm:text-2xl font-bold">{auditStats?.entityCounts?.length ?? 0}</p>
            </CardContent></Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("recent_audit_logs")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("action_1_1_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("entity")}</th>
                    {isPlatformAdmin && (
                      <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("agency_1_1")}</th>
                    )}
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("user_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("ip")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("time")}</th>
                  </tr></thead>
                  <tbody>
                    {(auditLogs?.items || []).map(log => (
                      <tr key={log.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] capitalize">{log.action}</Badge></td>
                        <td className="px-4 py-3 text-xs sm:text-sm">{log.entityType} {log.entityId && `#${log.entityId}`}</td>
                        {isPlatformAdmin && (
                          <td className="px-4 py-3 text-xs sm:text-sm">{log.tenant?.name || "Platform"}</td>
                        )}
                        <td className="px-4 py-3 text-xs sm:text-sm">{log.user?.name || "System"}</td>
                        <td className="px-4 py-3 font-mono text-[10px] sm:text-xs">{log.ipAddress || "—"}</td>
                        <td className="px-4 py-3 text-[10px] sm:text-xs text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                    {(auditLogs?.items || []).length === 0 && (
                      <tr>
                        <td colSpan={isPlatformAdmin ? 6 : 5} className="p-4 text-center text-sm text-slate-400">{t("no_audit_logs_found")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {!isPlatformAdmin && (
        <TabsContent value="users" className="mt-6 space-y-5">
          {!canManageStaff && (
            <Card className="border-0 shadow-sm border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-sm text-amber-800">{t("this_is_a_read_only_staff_directory_user_activation_deactivation_and_deletion_ar")}</CardContent>
            </Card>
          )}
          {/* Plan usage indicator (agency admin only) */}
          {canManageStaff && planUsage && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("plan_usage")}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {formatPlanLabel(planUsage.plan)} Plan — {formatTotalSeatLabel(planUsage, t)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatRoleSeatBreakdown(planUsage)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{planUsage.remaining}</p>
                    <p className="text-[10px] text-slate-500">{t("remaining")}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${planUsage.canAdd ? "bg-indigo-600" : "bg-red-500"}`}
                    style={{ width: `${planUsage.limit > 0 ? Math.min(100, (planUsage.used / planUsage.limit) * 100) : 0}%` }}
                  />
                </div>
                {planUsage.canAdd ? (
                  <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700" onClick={openCreateUser}>
                    <Plus className="h-4 w-4 mr-1.5" />{t("add_user")}</Button>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t("staff_user_limit_reached_upgrade_your_plan_to_add_more_users")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t("system_users")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("user_1_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("role_1_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("dept")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("status_1_1_1_1_1_1_1_1_1_1_1_1")}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">{t("last_sign_in")}</th>
                    {canManageStaff && <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs">{t("actions_1_1")}</th>}
                  </tr></thead>
                  <tbody>
                    {(displayUsers || []).map(u => (
                      <tr key={u.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                              {u.name?.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm">{u.name}</p>
                              <p className="text-[10px] text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_COLORS[u.role] || ""}`}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs sm:text-sm">{u.department || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] ${STATUS_COLORS[u.status] || ""}`}>{u.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "Never"}</td>
                        {canManageStaff && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={() => openEditUser(u)}
                                disabled={u.role === "admin" || u.role === "super_admin"}
                                title={t("edit_1")}
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={() => setDeleteUserTarget({ id: u.id, name: u.name || "this user" })}
                                disabled={
                                  u.id === user?.id
                                  || u.role === "admin"
                                  || u.role === "super_admin"
                                  || deleteUser.isPending
                                }
                                title={t("delete_user")}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!displayUsers || displayUsers.length === 0) && (
                      <tr><td colSpan={canManageStaff ? 6 : 5} className="p-4 text-center text-sm text-slate-400">{t("no_users_found_1")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="roles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {(roles || []).map(role => {
              let perms: string[] = [];
              if (role.permissions) {
                if (typeof role.permissions === "string") {
                  try { perms = JSON.parse(role.permissions); } catch { perms = []; }
                } else if (Array.isArray(role.permissions)) {
                  perms = role.permissions as string[];
                }
              }
              return (
                <Card key={role.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">{role.name}</h3>
                          <p className="text-[10px] sm:text-xs text-slate-500">{role.slug}</p>
                        </div>
                      </div>
                      {role.isSystem && <Badge variant="secondary" className="text-[10px]">{t("system")}</Badge>}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2">{role.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {perms.map((perm: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{perm}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUserTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              We will remove the data associated with this user, including their account, sessions, notifications,
              and personal records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>{t("cancel_1_1")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUser.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleteUserTarget) {
                  deleteUser.mutate({ id: deleteUserTarget.id });
                }
              }}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Create/Edit Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              {editingUser ? t("settings.editUser") : t("settings.addNewUser")}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details and permissions."
                : planUsage
                ? `${formatTotalSeatLabel(planUsage, t)} on your ${formatPlanLabel(planUsage.plan)} plan. ${formatRoleSeatBreakdown(planUsage)}`
                : "Create a new staff user for your agency."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">{t("full_name")}</Label>
              <Input
                placeholder={t("e_g_ahmad_khan")}
                value={userForm.name}
                onChange={e => setUserForm(s => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">{t("email_1_1_1")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder={t("user_agency_com")}
                  value={userForm.email}
                  onChange={e => setUserForm(s => ({ ...s, email: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            {!editingUser && (
              <div>
                <Label className="text-xs">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder={t("min_8_characters")}
                    value={userForm.password}
                    onChange={e => setUserForm(s => ({ ...s, password: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("role_1_1_1")}</Label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm(s => ({ ...s, role: e.target.value as any }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {availableStaffRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">{t("status_1_1_1_1_1_1_1_1_1_1_1_1_1")}</Label>
                <select
                  value={userForm.status}
                  onChange={e => setUserForm(s => ({ ...s, status: e.target.value as any }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="active">{t("active_1_1")}</option>
                  <option value="inactive">{t("inactive_1")}</option>
                  <option value="suspended">{t("suspended")}</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("department_1")}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("e_g_sales")}
                  value={userForm.department}
                  onChange={e => setUserForm(s => ({ ...s, department: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("phone_1_1_1_1")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("phone_number")}
                  value={userForm.phone}
                  onChange={e => setUserForm(s => ({ ...s, phone: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>{t("cancel_1_1_1")}</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSaveUser}
              disabled={
                createUser.isPending
                || updateUser.isPending
                || (!editingUser && planUsage != null && !canAddUserWithRole(planUsage, userForm.role))
              }
            >
              {editingUser
                ? (updateUser.isPending ? t("actions.saving") : t("actions.saveChanges"))
                : (createUser.isPending ? t("actions.creating") : t("actions.createUser"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
