import type { Metadata } from "next";
import { PlacesDirectory, type DirectoryInitial } from "@/components/places/places-directory";
import type { DirectoryView } from "@/components/places/view-toggle";
import { getAllPlaces } from "@/lib/catalog";
import {
  AUDIENCES,
  CATEGORY_IDS,
  SEASONS,
  type Audience,
  type CategoryId,
  type Season,
} from "@/lib/types";
import { getAreas, type PlaceFilters, type SortKey } from "@/lib/places";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Places",
  description: `Browse ${SITE.name}'s curated directory of forts, temples, gardens, museums and hilltops across Pune.`,
};

const SORT_KEYS: SortKey[] = ["featured", "rating", "name"];
const VIEWS: DirectoryView[] = ["grid", "list", "map"];

function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseInitial(
  sp: Record<string, string | string[] | undefined>,
): DirectoryInitial {
  const categoryRaw = one(sp.category);
  const audienceRaw = one(sp.audience);
  const seasonRaw = one(sp.season);
  const sortRaw = one(sp.sort);
  const feeRaw = one(sp.fee);
  const viewRaw = one(sp.view);

  const filters: PlaceFilters = {
    q: one(sp.q)?.trim() ?? "",
    category:
      categoryRaw && (CATEGORY_IDS as readonly string[]).includes(categoryRaw)
        ? (categoryRaw as CategoryId)
        : "all",
    area: one(sp.area)?.trim() || "all",
    audience:
      audienceRaw && (AUDIENCES as readonly string[]).includes(audienceRaw)
        ? (audienceRaw as Audience)
        : "all",
    fee: feeRaw === "free" || feeRaw === "paid" ? feeRaw : "all",
    season:
      seasonRaw && (SEASONS as readonly string[]).includes(seasonRaw)
        ? (seasonRaw as Season)
        : "all",
    sort: sortRaw && (SORT_KEYS as readonly string[]).includes(sortRaw)
      ? (sortRaw as SortKey)
      : "featured",
  };

  return {
    filters,
    view: viewRaw && (VIEWS as readonly string[]).includes(viewRaw)
      ? (viewRaw as DirectoryView)
      : "grid",
    collection: one(sp.collection)?.trim() || null,
  };
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const places = await getAllPlaces();
  const areas = getAreas(places);
  const initial = parseInitial(sp);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-medium text-primary">Directory</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Places to visit in Pune
        </h1>
        <p className="mt-3 text-muted-foreground">
          Filter by category, area or vibe — switch between grid, list and map.
        </p>
      </header>
      <PlacesDirectory allPlaces={places} areas={areas} initial={initial} />
    </div>
  );
}
