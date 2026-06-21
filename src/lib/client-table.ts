import { useMemo, useState, useCallback } from "react";

export type SortDirection = "asc" | "desc";

export function filterBySearch<T>(
  items: T[],
  search: string,
  getSearchText: (item: T) => string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
}

export function sortItems<T>(
  items: T[],
  sortKey: string | null,
  sortDir: SortDirection,
  getSortValue: (item: T, key: string) => string | number,
): T[] {
  if (!sortKey) return items;
  const sorted = [...items].sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    if (typeof av === "number" && typeof bv === "number") {
      return av - bv;
    }
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
  });
  return sortDir === "desc" ? sorted.reverse() : sorted;
}

export function useClientTable<T>({
  items,
  search,
  getSearchText,
  defaultSortKey,
  getSortValue,
}: {
  items: T[];
  search: string;
  getSearchText: (item: T) => string;
  defaultSortKey?: string;
  getSortValue: (item: T, key: string) => string | number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const filtered = useMemo(
    () => filterBySearch(items, search, getSearchText),
    [items, search, getSearchText],
  );

  const sorted = useMemo(
    () => sortItems(filtered, sortKey, sortDir, getSortValue),
    [filtered, sortKey, sortDir, getSortValue],
  );

  return { rows: sorted, sortKey, sortDir, toggleSort };
}
