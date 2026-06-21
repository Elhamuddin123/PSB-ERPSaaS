import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/client-table";

type SortableTableHeadProps = {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  sortDir: SortDirection;
  onSort: (key: string) => void;
  className?: string;
};

export function SortableTableHead({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = activeSortKey === sortKey;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={cn("select-none", className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-foreground" : "text-muted-foreground")} />
      </button>
    </TableHead>
  );
}
