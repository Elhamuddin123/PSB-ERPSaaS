import { useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isRTL } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { canAccessNavItem } from "@/lib/roles";
import { trpc } from "@/providers/trpc";
import {
  LayoutDashboard,
  Wallet,
  Plane,
  Users,
  Receipt,
  BookOpen,
  Brain,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Bell,
  Check,
  FileText,
  Landmark,
  PiggyBank,
  MapPin,
  Tractor,
  CreditCard,
  DollarSign,
  BarChart3,
  Shield,
  HandCoins,
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation(["sidebar", "common"]);

  const baseNavigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "agent", "viewer"] },
    { name: t("wallets"), href: "/wallets", icon: Wallet, roles: ["super_admin", "admin", "agent"] },
    { name: t("tickets"), href: "/tickets", icon: Plane, roles: ["super_admin", "admin", "agent", "viewer"] },
    { name: t("customers"), href: "/crm", icon: Users, roles: ["super_admin", "admin", "agent", "viewer"] },
    { name: t("invoices"), href: "/invoices", icon: FileText, roles: ["super_admin", "admin"] },
    { name: t("receivables"), href: "/receivables", icon: Landmark, roles: ["super_admin", "admin"] },
    { name: t("loans"), href: "/loans", icon: HandCoins, roles: ["super_admin", "admin"] },
    { name: t("deposits"), href: "/deposits", icon: PiggyBank, roles: ["super_admin", "admin", "agent"] },
    { name: t("locations"), href: "/payment-locations", icon: MapPin, roles: ["super_admin", "admin"] },
    { name: t("suppliers"), href: "/suppliers", icon: Tractor, roles: ["super_admin", "admin", "agent"] },
    { name: t("payables"), href: "/payables", icon: CreditCard, roles: ["super_admin", "admin"] },
    { name: t("exchangeRates"), href: "/exchange-rates", icon: DollarSign, roles: ["super_admin", "admin"] },
    { name: t("bankRecon"), href: "/bank-reconciliation", icon: Landmark, roles: ["super_admin", "admin"] },
    { name: t("reports"), href: "/reports", icon: BarChart3, roles: ["super_admin", "admin", "viewer"] },
    { name: t("documents"), href: "/documents", icon: FileText, roles: ["super_admin", "admin", "agent"] },
    { name: t("expenses"), href: "/expenses", icon: Receipt, roles: ["super_admin", "admin", "agent"] },
    { name: t("accounting"), href: "/accounting", icon: BookOpen, roles: ["super_admin", "admin"] },
    { name: t("ai"), href: "/ai", icon: Brain, roles: ["super_admin", "admin", "agent", "viewer"] },
    { name: t("settings"), href: "/settings", icon: Settings, roles: ["super_admin", "admin", "agent", "viewer"] },
  ];

  const navigation = user?.role === "super_admin"
    ? [...baseNavigation, { name: t("admin", "Admin"), href: "/admin", icon: Shield, roles: ["super_admin"] }]
    : baseNavigation;

  const { data: notifications, refetch: refetchNotif } = trpc.notification.unread.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.unread.invalidate();
      utils.notification.list.invalidate();
      refetchNotif();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unread.invalidate();
      utils.notification.list.invalidate();
      refetchNotif();
    },
  });

  const unreadCount = notifications?.length ?? 0;

  const handleMarkAllRead = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    markAllRead.mutate();
  };

  const openNotification = (notification: { id: number; isRead: boolean }) => {
    setNotifOpen(false);
    if (!notification.isRead) {
      markRead.mutate({ id: notification.id });
    }
    navigate(`/settings?tab=notifications&notificationId=${notification.id}`);
  };

  const rtl = isRTL();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden" dir={rtl ? "rtl" : "ltr"}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-56 xl:w-64",
          rtl ? "border-r-0 border-l" : ""
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 xl:h-16 px-3 xl:px-4 border-b border-slate-200 dark:border-slate-800">
          <Building2 className="h-5 w-5 xl:h-6 xl:w-6 text-indigo-600 flex-shrink-0" />
          {!collapsed && (
            <span className="ml-2 xl:ml-3 font-bold text-base xl:text-lg text-slate-900 dark:text-white truncate">{t("psb_erp")}</span>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 xl:py-4">
          <nav className="space-y-1 px-2">
            {navigation
              .filter((item) => canAccessNavItem(user?.role, item.roles))
              .map((item) => {
                const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name + item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center px-2.5 xl:px-3 py-2 xl:py-2.5 rounded-lg text-xs xl:text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 xl:h-5 xl:w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="ml-2 xl:ml-3 truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Collapse Button */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center h-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                {rtl ? <ChevronRight className="h-4 w-4 mr-1 xl:mr-2" /> : <ChevronLeft className="h-4 w-4 mr-1 xl:mr-2" />}
                <span className="text-xs">{t("collapse")}</span>
              </>
            )}
          </Button>
        </div>

        {/* User */}
        <div className="p-2.5 xl:p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <div className="h-7 w-7 xl:h-8 xl:w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] xl:text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="ml-2 xl:ml-3 min-w-0">
                <p className="text-xs xl:text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] xl:text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                  {user?.role || "Agent"}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
              onClick={logout}
            >
              <LogOut className="h-3 w-3 mr-1.5" />
              {t("logout")}
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between h-12 px-3">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={rtl ? "right" : "left"} className="w-64 p-0">
                <div className="flex items-center h-14 px-4 border-b">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                  <span className="ml-3 font-bold text-lg">{t("appName")}</span>
                </div>
                <ScrollArea className="h-[calc(100vh-4rem)] py-4">
                  <nav className="space-y-1 px-2">
                    {navigation
                      .filter((item) => canAccessNavItem(user?.role, item.roles))
                      .map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                        return (
                          <Link
                            key={item.name + item.href}
                            to={item.href}
                            className={cn(
                              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium",
                              isActive
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="ml-3">{item.name}</span>
                          </Link>
                        );
                      })}
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="ml-3">{t("logout")}</span>
                    </button>
                  </nav>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <span className="ml-2 font-bold text-base">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {/* Mobile notification bell */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-1.5 rounded-full hover:bg-slate-100">
                <Bell className="h-4 w-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-8 w-72 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 py-2">
                  <div className="flex items-center justify-between px-3 pb-2 border-b">
                    <span className="text-xs font-medium">{t("notifications")}</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-600 hover:underline flex items-center">
                        <Check className="h-3 w-3 mr-0.5" /> {t("markAllRead")}
                      </button>
                    )}
                  </div>
                  <ScrollArea className="max-h-64">
                    {(notifications || []).length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">{t("noNotifications")}</p>
                    )}
                    {(notifications || []).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openNotification(n)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0"
                      >
                        <p className="text-xs font-medium">{n.title}</p>
                        <p className="text-[10px] text-slate-500">{n.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</span>
                          {!n.isRead && <span className="text-[9px] text-indigo-600">{t("unread")}</span>}
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                  <div className="px-3 pt-2 border-t">
                    <Link to="/settings?tab=notifications" onClick={() => setNotifOpen(false)} className="text-[10px] text-indigo-600 hover:underline block text-center">
                      {t("viewAllNotifications")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-12 lg:pt-0">
        {/* Desktop header bar with notification */}
        <div className="hidden lg:flex items-center justify-end h-14 xl:h-16 px-6 xl:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 gap-3">
          <LanguageSwitcher variant="full" />

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-4.5 w-4.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 py-2">
                  <div className="flex items-center justify-between px-4 pb-2 border-b">
                    <span className="text-sm font-medium">{t("notifications")}</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:underline flex items-center">
                        <Check className="h-3 w-3 mr-1" /> {t("markAllRead")}
                      </button>
                    )}
                  </div>
                  <ScrollArea className="max-h-72">
                    {(notifications || []).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-6">{t("noNotifications")}</p>
                    )}
                    {(notifications || []).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openNotification(n)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0"
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</span>
                          {!n.isRead && <span className="text-[10px] text-indigo-600">{t("unread")}</span>}
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                  <div className="px-4 pt-2 border-t">
                    <Link to="/settings?tab=notifications" onClick={() => setNotifOpen(false)} className="text-xs text-indigo-600 hover:underline block text-center py-1">
                      {t("viewAllNotifications")}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-5 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
