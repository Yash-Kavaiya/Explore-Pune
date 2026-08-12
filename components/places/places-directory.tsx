"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, SearchX, X } from "lucide-react";
import { PlaceCard } from "@/components/places/place-card";
import { PlaceListItem } from "@/components/places/place-list-item";
import { PlaceFilters } from "@/components/places/place-filters";
import { ViewToggle, type DirectoryView } from "@/components/places/view-toggle";
import { PlacesMap } from "@/components/map/places-map";
import { Button } from "@/components/ui/button";
import { COLLECTIONS } from "@/lib/data/collections";
import { queryPlaces, type PlaceFilters as Filters } from "@/lib/places";
import type { Place } from "@/lib/types";

export type DirectoryInitial = {
  filters: Filters;
  view: DirectoryView;
  collection: string | null;
};

const DEFAULTS: Filters = {
  q: "",
  category: "all",
  area: "all",
  audience: "all",
  fee: "all",
  season: "all",
  sort: "featured",
};

function countActive(f: Filters): number {
  let n = 0;
  if (f.q?.trim()) n++;
  if (f.category && f.category !== "all") n++;
  if (f.area && f.area !== "all") n++;
  if (f.audience && f.audience !== "all") n++;
  if (f.fee && f.fee !== "all") n++;
  if (f.season && f.season !== "all") n++;
  return n;
}

export function PlacesDirectory({
  allPlaces,
  areas,
  initial,
}: {
  allPlaces: Place[];
  areas: string[];
  initial: DirectoryInitial;
}) {
  const router = useRouter();
  const [filters, setFilters] = React.useState<Filters>(initial.filters);
  const [view, setView] = React.useState<DirectoryView>(initial.view);
  const [collection, setCollection] = React.useState<string | null>(initial.collection);

  const activeCollection = collection ? COLLECTIONS.find((c) => c.slug === collection) : undefined;

  const syncUrl = React.useCallback(
    (f: Filters, v: DirectoryView, col: string | null) => {
      const params = new URLSearchParams();
      if (f.q?.trim()) params.set("q", f.q.trim());
      if (f.category && f.category !== "all") params.set("category", f.category);
      if (f.area && f.area !== "all") params.set("area", f.area);
      if (f.audience && f.audience !== "all") params.set("audience", f.audience);
      if (f.fee && f.fee !== "all") params.set("fee", f.fee);
      if (f.season && f.season !== "all") params.set("season", f.season);
      if (f.sort && f.sort !== "featured") params.set("sort", f.sort);
      if (v !== "grid") params.set("view", v);
      if (col) params.set("collection", col);
      const qs = params.toString();
      router.replace(`/places${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  const patch = (p: Partial<Filters>) => {
    const next = { ...filters, ...p };
    setFilters(next);
    syncUrl(next, view, collection);
  };

  const changeView = (v: DirectoryView) => {
    setView(v);
    syncUrl(filters, v, collection);
  };

  const clearAll = () => {
    setFilters(DEFAULTS);
    setCollection(null);
    syncUrl(DEFAULTS, view, null);
  };

  const base = React.useMemo(() => {
    if (!activeCollection) return allPlaces;
    const set = new Set(activeCollection.placeSlugs);
    return allPlaces.filter((p) => set.has(p.slug));
  }, [allPlaces, activeCollection]);

  const results = React.useMemo(() => queryPlaces(base, filters), [base, filters]);
  const activeCount = countActive(filters);

  return (
    <div className="space-y-5">
      {activeCollection && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">{activeCollection.title}</p>
            <p className="text-xs text-muted-foreground">{activeCollection.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCollection(null);
              syncUrl(filters, view, null);
            }}
          >
            <X className="size-4" />
            Clear collection
          </Button>
        </div>
      )}

      <PlaceFilters
        filters={filters}
        areas={areas}
        onPatch={patch}
        onClear={clearAll}
        activeCount={activeCount + (activeCollection ? 1 : 0)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{results.length}</span>{" "}
          {results.length === 1 ? "place" : "places"}
          {activeCount > 0 ? " match your filters" : ""}
        </p>
        <ViewToggle value={view} onChange={changeView} />
      </div>

      {results.length === 0 ? (
        <EmptyState onClear={clearAll} />
      ) : view === "map" ? (
        <PlacesMap places={results} className="h-[70vh] min-h-[460px] w-full" />
      ) : view === "list" ? (
        <div className="space-y-3">
          {results.map((p) => (
            <PlaceListItem key={p.slug} place={p} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p, i) => (
            <PlaceCard key={p.slug} place={p} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
      <SearchX className="size-9 text-muted-foreground" />
      <p className="mt-3 font-medium">No places match your filters</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Try widening your search, or clear the filters to see everything.
      </p>
      <Button variant="outline" className="mt-4" onClick={onClear}>
        <MapPin className="size-4" />
        Show all places
      </Button>
    </div>
  );
}
