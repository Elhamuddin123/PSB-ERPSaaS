import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { changeLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "fa", label: "دری", flag: "🇦🇫" },
  { code: "ps", label: "پښتو", flag: "🇦🇫" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

type LanguageSwitcherProps = {
  variant?: "icon" | "full";
  className?: string;
  menuClassName?: string;
  /** Preferred open direction; Radix flips when viewport collisions occur. */
  side?: "top" | "bottom" | "left" | "right";
};

export function LanguageSwitcher({
  variant = "icon",
  className,
  menuClassName,
  side = "bottom",
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLng = i18n.language;

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full transition-colors",
            variant === "icon"
              ? "p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              : "p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-600 dark:text-slate-400",
            className
          )}
          aria-label="Change language"
        >
          <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          {variant === "full" && (
            <span className="text-xs font-medium uppercase">{currentLng}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align="end"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions
        className={cn(
          "w-36 bg-white dark:bg-slate-900 py-1",
          menuClassName
        )}
      >
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLanguageChange(l.code)}
            className={cn(
              "cursor-pointer",
              currentLng === l.code &&
                "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-950 dark:text-indigo-300"
            )}
          >
            {l.flag} {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
