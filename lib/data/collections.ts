import type { Collection } from "@/lib/types";

/**
 * Editorial collections shown on the homepage and as directory shortcuts.
 * Each references seed place slugs by hand so curation stays intentional.
 */
export const COLLECTIONS: Collection[] = [
  {
    slug: "hidden-gems",
    title: "Hidden Gems",
    description: "Quieter corners the guidebooks rush past.",
    icon: "gem",
    placeSlugs: [
      "pataleshwar-cave-temple",
      "vetal-tekdi",
      "raja-dinkar-kelkar-museum",
      "lal-mahal",
    ],
  },
  {
    slug: "monsoon-special",
    title: "Monsoon Special",
    description: "At their greenest and most dramatic in the rains.",
    icon: "cloud-rain",
    placeSlugs: [
      "sinhagad-fort",
      "khadakwasla-dam",
      "vetal-tekdi",
      "okayama-friendship-garden",
    ],
  },
  {
    slug: "heritage-trail",
    title: "One-Day Heritage Trail",
    description: "Shivaji, the Peshwas and the freedom struggle in a single day.",
    icon: "landmark",
    placeSlugs: [
      "shaniwar-wada",
      "lal-mahal",
      "dagdusheth-halwai-ganapati",
      "aga-khan-palace",
    ],
  },
  {
    slug: "family-day-out",
    title: "Family Day Out",
    description: "Easy, green and fun for all ages.",
    icon: "trees",
    placeSlugs: [
      "saras-baug",
      "empress-garden",
      "national-war-memorial",
      "okayama-friendship-garden",
    ],
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
