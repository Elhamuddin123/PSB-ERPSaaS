import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Filter,
  Mail,
  Phone,
  MapPin,
  RotateCcw,
  Ban,
  PlayCircle,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type StatusFilter =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "all";

type BillingStatus = "inactive" | "paid" | "due" | "overdue";

type Tenant = {
  id: number;
  name: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  city?: string;
  plan?: string;
  registrationToken?: string;
  status?: string;
  billing?: {
    paidUntil: string | null;
    nextPaymentDue: string | null;
    billingStatus: BillingStatus;
    isOverdue: boolean;
    isDue: boolean;
  };
};

function formatBillingDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");

  const [search, setSearch] = useState("");
  const [status] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] =
    useState<"approve" | "reject" | null>(null);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmName, setResetConfirmName] = useState("");

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelConfirmName, setCancelConfirmName] = useState("");

  const [selectedTenant, setSelectedTenant] =
    useState<Tenant | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [subscriptionMonths, setSubscriptionMonths] = useState("1");

  const utils = trpc.useUtils();

  const { data: stats } =
    trpc.admin.stats.useQuery();

  const {
    data: registrations,
    isLoading,
  } =
    trpc.admin.registrations.useQuery({
      status,
      search: search || undefined,
      page,
      limit: 20,
    });

  const invalidateAdmin = () => {
    utils.admin.registrations.invalidate();
    utils.admin.stats.invalidate();
  };

  const parseMonths = (): number => {
    const n = parseInt(subscriptionMonths, 10);
    return Number.isFinite(n) && n >= 1 && n <= 36 ? n : 1;
  };

  const approveMutation =
    trpc.admin.approveRegistration.useMutation({
      onSuccess: () => {
        toast.success(t("approvalSuccess"));
        invalidateAdmin();
        setDialogOpen(false);
        setSubscriptionMonths("1");
      },
      onError: (err) =>
        toast.error(err.message),
    });

  const rejectMutation =
    trpc.admin.rejectRegistration.useMutation({
      onSuccess: () => {
        toast.success(t("rejectionSuccess"));
        invalidateAdmin();
        setDialogOpen(false);
        setRejectReason("");
      },
      onError: (err) =>
        toast.error(err.message),
    });

  const resetMutation =
    trpc.admin.resetAgencyData.useMutation({
      onSuccess: () => {
        toast.success(t("resetDataSuccess"));
        invalidateAdmin();
        setResetDialogOpen(false);
        setResetConfirmName("");
        setSelectedTenant(null);
      },
      onError: (err) =>
        toast.error(err.message),
    });

  const suspendMutation = trpc.admin.suspendAgency.useMutation({
    onSuccess: () => {
      toast.success(t("suspensionSuccess"));
      invalidateAdmin();
    },
    onError: (err) => toast.error(err.message),
  });

  const reactivateMutation = trpc.admin.reactivateAgency.useMutation({
    onSuccess: () => {
      toast.success(t("reactivationSuccess"));
      invalidateAdmin();
      setReactivateDialogOpen(false);
      setSubscriptionMonths("1");
      setSelectedTenant(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const extendMutation = trpc.admin.extendSubscription.useMutation({
    onSuccess: () => {
      toast.success(t("extendSubscriptionSuccess"));
      invalidateAdmin();
      setExtendDialogOpen(false);
      setSubscriptionMonths("1");
      setSelectedTenant(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.admin.cancelAgency.useMutation({
    onSuccess: () => {
      toast.success(t("cancelAgencySuccess"));
      invalidateAdmin();
      setCancelDialogOpen(false);
      setCancelConfirmName("");
      setSelectedTenant(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const openDialog = (
    action: "approve" | "reject",
    tenant: Tenant
  ) => {
    setDialogAction(action);
    setSelectedTenant(tenant);
    setSubscriptionMonths("1");
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedTenant) return;

    if (dialogAction === "approve") {
      approveMutation.mutate({
        tenantId: selectedTenant.id,
        months: parseMonths(),
      });
    } else {
      rejectMutation.mutate({
        tenantId: selectedTenant.id,
        reason: rejectReason,
      });
    }
  };

  const openResetDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setResetConfirmName("");
    setResetDialogOpen(true);
  };

  const openExtendDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSubscriptionMonths("1");
    setExtendDialogOpen(true);
  };

  const openReactivateDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSubscriptionMonths("1");
    setReactivateDialogOpen(true);
  };

  const openCancelDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setCancelConfirmName("");
    setCancelDialogOpen(true);
  };

  const handleResetConfirm = () => {
    if (!selectedTenant) return;
    resetMutation.mutate({
      tenantId: selectedTenant.id,
      confirmName: resetConfirmName,
    });
  };

  const handleExtendConfirm = () => {
    if (!selectedTenant) return;
    extendMutation.mutate({
      tenantId: selectedTenant.id,
      months: parseMonths(),
    });
  };

  const handleReactivateConfirm = () => {
    if (!selectedTenant) return;
    reactivateMutation.mutate({
      tenantId: selectedTenant.id,
      months: parseMonths(),
    });
  };

  const handleCancelConfirm = () => {
    if (!selectedTenant) return;
    cancelMutation.mutate({
      tenantId: selectedTenant.id,
      confirmName: cancelConfirmName,
    });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending:
        "bg-amber-100 text-amber-700",
      active:
        "bg-emerald-100 text-emerald-700",
      suspended:
        "bg-red-100 text-red-700",
      rejected:
        "bg-slate-100 text-slate-700",
      cancelled:
        "bg-slate-100 text-slate-700",
      trial:
        "bg-blue-100 text-blue-700",
    };

    return (
      map[s] ||
      "bg-slate-100 text-slate-700"
    );
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: t("statusPending"),
      active: t("statusActive"),
      suspended: t("statusSuspended"),
      rejected: t("statusRejected"),
      cancelled: t("statusCancelled"),
      trial: t("statusActive"),
    };
    return map[s] || s || "—";
  };

  const billingBadge = (billing?: Tenant["billing"]) => {
    if (!billing || billing.billingStatus === "inactive") {
      return (
        <span className="text-xs text-slate-400">
          {t("billingInactive")}
        </span>
      );
    }

    const classMap: Record<BillingStatus, string> = {
      paid: "bg-emerald-100 text-emerald-700",
      due: "bg-amber-100 text-amber-700",
      overdue: "bg-red-100 text-red-700",
      inactive: "bg-slate-100 text-slate-700",
    };

    const labelMap: Record<BillingStatus, string> = {
      paid: t("billingPaidUntil", {
        date: formatBillingDate(billing.paidUntil),
      }),
      due: t("billingDue", {
        date: formatBillingDate(billing.nextPaymentDue),
      }),
      overdue: t("billingOverdue"),
      inactive: t("billingInactive"),
    };

    return (
      <Badge className={classMap[billing.billingStatus]}>
        {labelMap[billing.billingStatus]}
      </Badge>
    );
  };

  const monthsField = (
    <div className="space-y-2">
      <label className="text-sm text-slate-600">
        {t("subscriptionMonths")}
      </label>
      <Input
        type="number"
        min={1}
        max={36}
        value={subscriptionMonths}
        onChange={(e) => setSubscriptionMonths(e.target.value)}
      />
      <p className="text-xs text-slate-500">
        {t("subscriptionMonthsHint")}
      </p>
    </div>
  );

  const items = (registrations?.items ?? []) as Tenant[];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            {t("title")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("agencyRequests")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {stats?.total ?? 0}
            </p>

            <p className="text-xs">
              {tc("total")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">
              {stats?.pending ?? 0}
            </p>

            <p className="text-xs">
              {t("statusPending")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">
              {stats?.active ?? 0}
            </p>

            <p className="text-xs">
              {t("statusActive")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
          />
        </div>

        <Filter className="h-4 w-4 mt-3" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              {tc('loading')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1050px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('agencyName')}</TableHead>
                    <TableHead>{t('contact')}</TableHead>
                    <TableHead>{t('plan')}</TableHead>
                    <TableHead>{t('token')}</TableHead>
                    <TableHead>{t('billingColumn')}</TableHead>
                    <TableHead>{t('statusColumn')}</TableHead>
                    <TableHead className="text-right">
                      {t('actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {item.ownerName}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {item.ownerEmail}
                          </p>

                          <p className="text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {item.ownerPhone}
                          </p>

                          <p className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.city}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge>{item.plan}</Badge>
                      </TableCell>

                      <TableCell>
                        <code>
                          {item.registrationToken}
                        </code>
                      </TableCell>

                      <TableCell>
                        {billingBadge(item.billing)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={statusBadge(
                            item.status ?? ""
                          )}
                        >
                          {statusLabel(item.status ?? "")}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap items-center">
                          {item.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("approve")}
                                onClick={() => openDialog("approve", item)}
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("reject")}
                                onClick={() => openDialog("reject", item)}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {(item.status === "active" || item.status === "trial") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("extendSubscription")}
                                onClick={() => openExtendDialog(item)}
                              >
                                <CalendarPlus className="h-4 w-4 text-indigo-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("suspend")}
                                disabled={suspendMutation.isPending}
                                onClick={() => {
                                  if (confirm(t("confirmSuspend"))) {
                                    suspendMutation.mutate({ tenantId: item.id });
                                  }
                                }}
                              >
                                <Ban className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                title={t("resetData")}
                                onClick={() => openResetDialog(item)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                title={t("cancelAgency")}
                                onClick={() => openCancelDialog(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {item.status === "suspended" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("activate")}
                                disabled={reactivateMutation.isPending}
                                onClick={() => openReactivateDialog(item)}
                              >
                                <PlayCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title={t("extendSubscription")}
                                onClick={() => openExtendDialog(item)}
                              >
                                <CalendarPlus className="h-4 w-4 text-indigo-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                title={t("resetData")}
                                onClick={() => openResetDialog(item)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                title={t("cancelAgency")}
                                onClick={() => openCancelDialog(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(item.status === "rejected" || item.status === "cancelled") && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve"
                ? t("confirmApprove")
                : t("confirmReject")}
            </DialogTitle>

            <DialogDescription>
              {selectedTenant?.name} —{" "}
              {selectedTenant?.ownerEmail}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === "approve" && monthsField}

          {dialogAction === "reject" && (
            <Input
              value={rejectReason}
              onChange={(e) =>
                setRejectReason(
                  e.target.value
                )
              }
              placeholder={t("rejectReasonPlaceholder")}
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDialogOpen(false)
              }
            >{t("cancel_1")}</Button>

            <Button onClick={handleConfirm}>
              {dialogAction === "approve"
                ? t("approve")
                : t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("extendSubscriptionTitle")}</DialogTitle>
            <DialogDescription>
              {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>
          {monthsField}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleExtendConfirm} disabled={extendMutation.isPending}>
              {t("extendSubscription")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmReactivateTitle")}</DialogTitle>
            <DialogDescription>
              {selectedTenant?.name} — {t("confirmReactivate")}
            </DialogDescription>
          </DialogHeader>
          {monthsField}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleReactivateConfirm} disabled={reactivateMutation.isPending}>
              {t("activate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("resetDataTitle")}
            </DialogTitle>

            <DialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">
                {selectedTenant?.name}
              </span>
              <span className="block text-destructive">
                {t("resetDataWarning")}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">
              {t("resetDataConfirmLabel")}
            </label>
            <Input
              value={resetConfirmName}
              onChange={(e) =>
                setResetConfirmName(e.target.value)
              }
              placeholder={selectedTenant?.name ?? ""}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setResetConfirmName("");
              }}
            >
              {t("cancel")}
            </Button>

            <Button
              variant="destructive"
              disabled={
                resetMutation.isPending ||
                resetConfirmName.trim() !==
                  (selectedTenant?.name ?? "").trim()
              }
              onClick={handleResetConfirm}
            >
              {t("resetDataConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelAgencyTitle")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">
                {selectedTenant?.name}
              </span>
              <span className="block text-destructive">
                {t("cancelAgencyWarning")}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">
              {t("resetDataConfirmLabel")}
            </label>
            <Input
              value={cancelConfirmName}
              onChange={(e) => setCancelConfirmName(e.target.value)}
              placeholder={selectedTenant?.name ?? ""}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelConfirmName("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={
                cancelMutation.isPending ||
                cancelConfirmName.trim() !== (selectedTenant?.name ?? "").trim()
              }
              onClick={handleCancelConfirm}
            >
              {t("cancelAgencyConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
