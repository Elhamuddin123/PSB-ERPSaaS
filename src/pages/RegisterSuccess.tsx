import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Copy,
  Printer,
  FileText,
  MapPin,
  Phone,
  Mail,
  Building2,
  ArrowRight,
  Clock,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_PAYMENT_CONTACT } from "@contracts/plans";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import i18n, { isRTL } from "@/lib/i18n";

interface LocationState {
  token: string;
  agencyName: string;
  plan: string;
  durationMonths: number;
  pricing?: {
    totalAmount: number | null;
    discountPercent: number;
    currency: string;
    contactSales?: boolean;
  };
}

export default function RegisterSuccessPage() {
  const { t } = useTranslation("register");
  const { t: tc } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const state = location.state as LocationState | null;

  useEffect(() => {
    if (!state?.token) {
      navigate("/register");
    }
  }, [state, navigate]);

  if (!state?.token) return null;

  const { token, agencyName, plan, durationMonths, pricing } = state;

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    toast.success(tc("copied", "Copied to clipboard"));
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dir = isRTL(i18n.language) ? "rtl" : "ltr";
    const pt = (key: string) => i18n.t(key, { ns: "register" });

    printWindow.document.write(`
      <html dir="${dir}">
      <head>
        <title>${pt("psb_erp_registration_token")}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
          .token-box { background: #eef2ff; border: 2px dashed #4f46e5; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .token { font-size: 28px; font-weight: bold; color: #4f46e5; letter-spacing: 2px; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .label { color: #64748b; }
          .value { font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
          .status { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #4f46e5; margin: 0;">${pt("appName")}</h1>
          <p style="color: #64748b; margin: 8px 0 0;">${pt("registration_confirmation")}</p>
        </div>
        <div class="token-box">
          <p style="color: #64748b; margin-bottom: 12px;">${pt("your_registration_code")}</p>
          <div class="token">${token}</div>
        </div>
        <div>
          <div class="info-row"><span class="label">${pt("agency")}</span><span class="value">${agencyName}</span></div>
          <div class="info-row"><span class="label">${pt("plan")}</span><span class="value">${plan}</span></div>
          <div class="info-row"><span class="label">${pt("duration")}</span><span class="value">${durationMonths} months</span></div>
          ${pricing ? `<div class="info-row"><span class="label">${pt("amount_due")}</span><span class="value">${pricing.contactSales ? "Contact Sales" : `${pricing.totalAmount!.toFixed(0)} ${pricing.currency}`}</span></div>` : ""}
          <div class="info-row"><span class="label">${pt("status_1_1_1_1_1_1_1_1_1")}</span><span><span class="status">${pt("pending_payment_verification")}</span></span></div>
        </div>
        <div style="margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
          <p style="font-weight: 600; margin-bottom: 8px;">${pt("office_information")}</p>
          <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
            ${PLATFORM_PAYMENT_CONTACT.agencyName}<br>
            ${PLATFORM_PAYMENT_CONTACT.address}<br>
            Phone: ${PLATFORM_PAYMENT_CONTACT.phone}<br>
            Email: ${PLATFORM_PAYMENT_CONTACT.email}
          </p>
        </div>
        <div class="footer">
          <p>${pt("please_bring_this_document_to_our_office_to_complete_payment_verification_and_ac")}</p>
          <p style="margin-top: 8px;">© ${new Date().getFullYear()} PSB-ERP. All rights reserved.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const timeline = [
    { label: t("progressTimeline.0.label"), completed: true },
    { label: t("progressTimeline.1.label"), completed: false },
    { label: t("progressTimeline.2.label"), completed: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500 shadow-lg mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("successTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("successMessage")}</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-6">
            {/* Timeline */}
            <div className="flex items-center justify-between">
              {timeline.map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      item.completed ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {item.completed ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <span className="text-[10px] mt-1 text-slate-500 text-center">{item.label}</span>
                  {i < timeline.length - 1 && (
                    <div className={`absolute w-full h-0.5 top-4 left-1/2 -z-10 ${item.completed ? "bg-emerald-500" : "bg-slate-200"}`} style={{ width: "33%", marginLeft: "8.3%" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Token Box */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-xl p-6 text-center" ref={printRef}>
              <p className="text-sm text-slate-500 mb-2">{t("tokenLabel")}</p>
              <p className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">
                {token}
              </p>
              <Badge variant="secondary" className="mt-3 bg-amber-100 text-amber-700 hover:bg-amber-100">
                {t("statusPending")}
              </Badge>
            </div>

            {/* Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">{t("selectedPlan")}</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">{t("selectedDuration")}</span>
                <span className="font-medium">{durationMonths} {tc("months", "months")}</span>
              </div>
              {pricing && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">{t("totalPrice", "Total Price")}</span>
                  <span className="font-semibold text-indigo-600">
                    {pricing.contactSales ? "Contact Sales" : `${pricing.totalAmount!.toFixed(0)} ${pricing.currency}`}
                  </span>
                </div>
              )}
            </div>

            {/* Instruction */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t("tokenInstruction")}</p>
            </div>

            {/* Office Info */}
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                {t("officeInfo")}
              </h3>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {t("officeAddress")}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {t("officePhone")}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {t("officeEmail")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button variant="outline" className="h-10" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" /> {t("copyToken")}
              </Button>
              <Button variant="outline" className="h-10" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> {t("print")}
              </Button>
              <Button variant="outline" className="h-10 col-span-2 sm:col-span-1" onClick={handlePrint}>
                <FileText className="h-4 w-4 mr-2" /> {t("downloadToken")}
              </Button>
            </div>

            <Link to="/login">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 mt-2">
                {t("goToLogin")} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
