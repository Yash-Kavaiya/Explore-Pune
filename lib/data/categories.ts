import type { Category, CategoryId } from "@/lib/types";

export const CATEGORIES: Category[] = [
  {
    id: "forts-palaces",
    label: "Forts & Palaces",
    icon: "castle",
    blurb: "Maratha-era grandeur, gateways and battle-worn ramparts.",
    accent: 1,
  },
  {
    id: "temples-spiritual",
    label: "Temples & Spiritual",
    icon: "landmark",
    blurb: "Beloved Ganesh shrines, rock-cut caves and calm retreats.",
    accent: 5,
  },
  {
    id: "nature-gardens",
    label: "Nature & Gardens",
    icon: "trees",
    blurb: "Japanese-style gardens, green parks and leafy escapes.",
    accent: 2,
  },
  {
    id: "museums-culture",
    label: "Museums & Culture",
    icon: "palette",
    blurb: "Artefacts, lamps, sculptures and moving memorials.",
    accent: 4,
  },
  {
    id: "lakes-hills",
    label: "Lakes & Hills",
    icon: "mountain-snow",
    blurb: "Sunrise treks, dam views and breezy hilltop sunsets.",
    accent: 3,
  },
];

const byId = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

export const AUDIENCE_LABELS: Record<string, string> = {
  family: "Family",
  couples: "Couples",
  solo: "Solo",
  history: "History buffs",
  nature: "Nature lovers",
  spirituality: "Spirituality",
  photography: "Photography",
  adventure: "Adventure",
};

export const SEASON_LABELS: Record<string, string> = {
  winter: "Winter (Oct–Feb)",
  monsoon: "Monsoon (Jun–Sep)",
  summer: "Summer (Mar–May)",
  all: "All year",
};
