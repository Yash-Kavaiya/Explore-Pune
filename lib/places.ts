import { PLACES } from "@/lib/data/places";
import { CATEGORIES, getCategory } from "@/lib/data/categories";
import { slugify } from "@/lib/utils";
import type {
  Audience,
  CategoryId,
  Place,
  PlaceRequest,
  Season,
} from "@/lib/types";

/* --------------------------- seed accessors --------------------------- */

export function getSeedPlaces(): Place[] {
  return PLACES;
}

export function getSeedPlaceBySlug(slug: string): Place | undefined {
  return PLACES.find((p) => p.slug === slug);
}

export function getFeaturedPlaces(places: Place[] = PLACES): Place[] {
  return places.filter((p) => p.featured);
}

export function getPlacesByCategory(category: CategoryId, places: Place[] = PLACES): Place[] {
  return places.filter((p) => p.category === category);
}

export function getNearbyPlaces(place: Place, places: Place[] = PLACES): Place[] {
  return place.nearbyPlaceSlugs
    .map((slug) => places.find((p) => p.slug === slug))
    .filter((p): p is Place => Boolean(p));
}

/** Unique, sorted list of areas present in the dataset (for filter options). */
export function getAreas(places: Place[] = PLACES): string[] {
  return Array.from(new Set(places.map((p) => p.area))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Category id -> place count, in display order. */
export function getCategoryCounts(places: Place[] = PLACES): { id: CategoryId; count: number }[] {
  return CATEGORIES.map((c) => ({
    id: c.id,
    count: places.filter((p) => p.category === c.id).length,
  }));
}

/* ----------------------------- filtering ------------------------------ */

export type SortKey = "featured" | "rating" | "name";

export type PlaceFilters = {
  q?: string;
  category?: CategoryId | "all";
  area?: string | "all";
  audience?: Audience | "all";
  fee?: "all" | "free" | "paid";
  season?: Season | "all";
  sort?: SortKey;
};

function matchesQuery(place: Place, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    place.name,
    place.area,
    place.shortDescription,
    getCategory(place.category).label,
    place.bestFor.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterPlaces(places: Place[], filters: PlaceFilters): Place[] {
  const { q, category, area, audience, fee, season } = filters;
  return places.filter((p) => {
    if (q && !matchesQuery(p, q)) return false;
    if (category && category !== "all" && p.category !== category) return false;
    if (area && area !== "all" && p.area !== area) return false;
    if (audience && audience !== "all" && !p.bestFor.includes(audience)) return false;
    if (fee === "free" && !p.isFree) return false;
    if (fee === "paid" && p.isFree) return false;
    if (season && season !== "all" && !p.bestSeasons.includes(season)) return false;
    return true;
  });
}

export function sortPlaces(places: Place[], sort: SortKey = "featured"): Place[] {
  const copy = [...places];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      return copy.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          b.rating - a.rating ||
          a.name.localeCompare(b.name),
      );
  }
}

export function queryPlaces(places: Place[], filters: PlaceFilters): Place[] {
  return sortPlaces(filterPlaces(places, filters), filters.sort);
}

/* ------------------ community request -> live place ------------------- */

/**
 * Build a live Place from an approved community request. Missing practical
 * fields fall back to clearly-provisional defaults that the admin can edit.
 */
export function placeFromRequest(req: PlaceRequest): Place {
  const base = slugify(req.name) || "community-place";
  const slug = `${base}-${req.id.slice(0, 6)}`;
  const short =
    req.whySpecial.length > 160 ? `${req.whySpecial.slice(0, 157).trimEnd()}…` : req.whySpecial;

  return {
    slug,
    name: req.name,
    category: req.category,
    area: req.area,
    shortDescription: short,
    description: req.whySpecial,
    coordinates: req.coordinates ?? { lat: 18.5204, lng: 73.8567 },
    heroImage: req.photoUrls[0] ?? "",
    images: req.photoUrls,
    timings: "To be verified",
    entryFee: "To be verified",
    isFree: false,
    howToReach: `Located in ${req.area}, Pune.`,
    tips: [],
    bestSeasons: ["all"],
    bestFor: [],
    durationEstimate: "—",
    rating: 0,
    nearbyPlaceSlugs: [],
    featured: false,
    lastVerified: req.decidedAt ?? req.createdAt,
    source: "community",
  };
}
