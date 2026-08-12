import { getApprovedRequests } from "@/lib/store/requests.repo";
import { getSeedPlaces, getSeedPlaceBySlug, placeFromRequest } from "@/lib/places";
import type { Place } from "@/lib/types";

/**
 * Server-side catalog: the live set of places = curated seed data plus any
 * community submissions an admin has approved. Anything that needs the full,
 * current list (directory, detail pages, sitemap) should read it from here.
 */

export async function getApprovedCommunityPlaces(): Promise<Place[]> {
  const approved = await getApprovedRequests();
  return approved.map(placeFromRequest);
}

export async function getAllPlaces(): Promise<Place[]> {
  const community = await getApprovedCommunityPlaces();
  return [...getSeedPlaces(), ...community];
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  const seed = getSeedPlaceBySlug(slug);
  if (seed) return seed;
  const community = await getApprovedCommunityPlaces();
  return community.find((p) => p.slug === slug);
}
