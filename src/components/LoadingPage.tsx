import { useTranslation } from "react-i18next";

export default function LoadingPage() {
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 dark:bg-slate-950 dark:text-white px-4">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-8 w-28 h-28 perspective-[800px]">
          <div
            className="relative w-full h-full rounded-3xl border border-slate-200/80 bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 shadow-[0_30px_80px_-30px_rgba(59,130,246,0.8)] animate-spin"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 rounded-3xl bg-white/70 [transform:rotateX(45deg)_translateZ(28px)]" />
            <div className="absolute inset-0 rounded-3xl bg-white/40 [transform:rotateY(45deg)_translateZ(28px)]" />
            <div className="absolute inset-0 rounded-3xl bg-white/30 [transform:rotateZ(45deg)_translateZ(28px)]" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("loadingWorkspace")}</h1>
        <p className="mt-4 text-slate-500 dark:text-slate-300 sm:text-lg">{t("loadingMessage")}</p>
        <div className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-100/80 px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
          <span>{t("preparingDashboard")}</span>
        </div>
      </div>
    </div>
  );
}
