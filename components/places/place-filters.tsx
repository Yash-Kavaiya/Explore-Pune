"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CATEGORIES, AUDIENCE_LABELS, SEASON_LABELS } from "@/lib/data/categories";
import { AUDIENCES, SEASONS } from "@/lib/types";
import type { PlaceFilters, SortKey } from "@/lib/places";

export function PlaceFilters({
  filters,
  areas,
  onPatch,
  onClear,
  activeCount,
}: {
  filters: PlaceFilters;
  areas: string[];
  onPatch: (patch: Partial<PlaceFilters>) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q ?? ""}
          onChange={(e) => onPatch({ q: e.target.value })}
          placeholder="Search by name, area or keyword…"
          aria-label="Search places"
          className="h-10 pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          Filters
        </span>

        <NativeSelect
          aria-label="Category"
          className="w-auto min-w-[9rem]"
          value={filters.category ?? "all"}
          onChange={(e) => onPatch({ category: e.target.value as PlaceFilters["category"] })}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Area"
          className="w-auto min-w-[8rem]"
          value={filters.area ?? "all"}
          onChange={(e) => onPatch({ area: e.target.value })}
        >
          <option value="all">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Best for"
          className="w-auto min-w-[8rem]"
          value={filters.audience ?? "all"}
          onChange={(e) => onPatch({ audience: e.target.value as PlaceFilters["audience"] })}
        >
          <option value="all">Best for: anyone</option>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {AUDIENCE_LABELS[a]}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Entry fee"
          className="w-auto min-w-[7rem]"
          value={filters.fee ?? "all"}
          onChange={(e) => onPatch({ fee: e.target.value as PlaceFilters["fee"] })}
        >
          <option value="all">Any fee</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </NativeSelect>

        <NativeSelect
          aria-label="Best season"
          className="w-auto min-w-[8rem]"
          value={filters.season ?? "all"}
          onChange={(e) => onPatch({ season: e.target.value as PlaceFilters["season"] })}
        >
          <option value="all">Any season</option>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {SEASON_LABELS[s]}
            </option>
          ))}
        </NativeSelect>

        <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />

        <NativeSelect
          aria-label="Sort by"
          className="w-auto min-w-[8rem]"
          value={filters.sort ?? "featured"}
          onChange={(e) => onPatch({ sort: e.target.value as SortKey })}
        >
          <option value="featured">Sort: Featured</option>
          <option value="rating">Sort: Top rated</option>
          <option value="name">Sort: A–Z</option>
        </NativeSelect>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <X className="size-4" />
            Clear ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
