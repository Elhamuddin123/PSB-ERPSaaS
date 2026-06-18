import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { changeLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "fa", label: "دری", flag: "🇦🇫" },
  { code: "ps", label: "پښتو", flag: "🇦🇫" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

type LanguageSwitcherProps = {
  variant?: "icon" | "full";
  className?: string;
  menuClassName?: string;
};

export function LanguageSwitcher({
  variant = "icon",
  className,
  menuClassName,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentLng = i18n.language;

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-full transition-colors",
          variant === "icon"
            ? "p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            : "p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-600 dark:text-slate-400"
        )}
        aria-label="Change language"
      >
        <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        {variant === "full" && (
          <span className="text-xs font-medium uppercase">{currentLng}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute end-0 top-full mt-2 w-36 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-50 py-1",
              menuClassName
            )}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code)}
                className={cn(
                  "w-full text-start px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                  currentLng === l.code && "bg-indigo-50 text-indigo-700 font-medium"
                )}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
