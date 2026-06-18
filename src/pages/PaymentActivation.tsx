import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_PAYMENT_CONTACT } from "@contracts/plans";
import { formatPlanLabel } from "@contracts/plans";
import { getSubscriptionStatusLabel } from "@/lib/subscription";
import { Building2, MapPin, Phone, Mail, MessageCircle, Clock, ArrowRight } from "lucide-react";

export default function PaymentActivation() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const subscription = user?.subscription;
  const status = subscription?.status ?? "pending";

  const statusBadgeClass =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "expired"
        ? "bg-red-100 text-red-800"
        : status === "cancelled"
          ? "bg-slate-100 text-slate-800"
          : "bg-amber-100 text-amber-800";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t("paymentActivation.title")}</h1>
        <p className="text-sm text-slate-500 mt-2">
          {t("paymentActivation.subtitle")}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("paymentActivation.subscriptionStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{t("paymentActivation.currentStatus")}</span>
            <Badge className={statusBadgeClass}>{getSubscriptionStatusLabel(status, t)}</Badge>
          </div>
          {subscription?.plan && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{t("paymentActivation.selectedPlan")}</span>
              <span className="font-medium capitalize">{formatPlanLabel(subscription.plan)}</span>
            </div>
          )}
          {subscription?.durationMonths && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{t("paymentActivation.duration")}</span>
              <span className="font-medium">{subscription.durationMonths} {t("months")}</span>
            </div>
          )}
          {user?.registrationToken && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{t("paymentActivation.registrationCode")}</span>
              <span className="font-mono font-semibold text-indigo-600">{user.registrationToken}</span>
            </div>
          )}
          {subscription?.expiresAt && status === "active" && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">{t("paymentActivation.expires")}</span>
              <span className="font-medium">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            {t("paymentActivation.officePaymentInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-900 dark:text-white">{PLATFORM_PAYMENT_CONTACT.agencyName}</p>
          <p className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
            {PLATFORM_PAYMENT_CONTACT.address}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            {PLATFORM_PAYMENT_CONTACT.phone}
          </p>
          <p className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
            WhatsApp: {PLATFORM_PAYMENT_CONTACT.whatsapp}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            {PLATFORM_PAYMENT_CONTACT.email}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            {t("paymentActivation.activationSteps")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>{t("paymentActivation.step1")}</li>
            <li>{t("paymentActivation.step2")}</li>
            <li>{t("paymentActivation.step3")}</li>
            <li>{t("paymentActivation.step4")}</li>
            <li>{t("paymentActivation.step5")}</li>
          </ol>
        </CardContent>
      </Card>

      {status === "active" ? (
        <Link to="/dashboard">
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
            {t("paymentActivation.goToDashboard")} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          {t("paymentActivation.needHelp", { email: PLATFORM_PAYMENT_CONTACT.email })}
        </p>
      )}
    </div>
  );
}
