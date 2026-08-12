import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Domain enums                                                        */
/* ------------------------------------------------------------------ */

export const CATEGORY_IDS = [
  "forts-palaces",
  "temples-spiritual",
  "nature-gardens",
  "museums-culture",
  "lakes-hills",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const AUDIENCES = [
  "family",
  "couples",
  "solo",
  "history",
  "nature",
  "spirituality",
  "photography",
  "adventure",
] as const;
export type Audience = (typeof AUDIENCES)[number];

export const SEASONS = ["winter", "monsoon", "summer", "all"] as const;
export type Season = (typeof SEASONS)[number];

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

export type Coordinates = { lat: number; lng: number };

export type Category = {
  id: CategoryId;
  label: string;
  /** lucide-react icon key, resolved in the UI via the icon registry. */
  icon: string;
  blurb: string;
  /** chart token (1-5) used as the category accent colour. */
  accent: 1 | 2 | 3 | 4 | 5;
};

export type Place = {
  slug: string;
  name: string;
  category: CategoryId;
  area: string;
  shortDescription: string;
  description: string;
  coordinates: Coordinates;
  heroImage: string;
  images: string[];
  timings: string;
  entryFee: string;
  isFree: boolean;
  howToReach: string;
  tips: string[];
  bestSeasons: Season[];
  bestFor: Audience[];
  durationEstimate: string;
  rating: number;
  nearbyPlaceSlugs: string[];
  featured: boolean;
  lastVerified: string; // ISO date
  source: "seed" | "community";
};

export type Collection = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  /** Either an explicit list of place slugs, or a predicate-based filter. */
  placeSlugs: string[];
};

export type RequestStatus = "pending" | "approved" | "rejected";

export type PlaceRequest = {
  id: string;
  name: string;
  area: string;
  category: CategoryId;
  whySpecial: string;
  coordinates?: Coordinates;
  photoUrls: string[];
  submittedBy: string;
  status: RequestStatus;
  adminNote?: string;
  createdAt: string;
  decidedAt?: string;
};

export type Review = {
  id: string;
  placeSlug: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Zod schemas (shared by client forms + server route handlers)        */
/* ------------------------------------------------------------------ */

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const placeRequestInputSchema = z.object({
  name: z.string().trim().min(3, "Please enter the place name").max(120),
  area: z.string().trim().min(2, "Which area is it in?").max(80),
  category: z.enum(CATEGORY_IDS),
  whySpecial: z
    .string()
    .trim()
    .min(20, "Tell us a little more (at least 20 characters)")
    .max(1500),
  submittedBy: z.string().trim().max(60).optional(),
  // Coordinates are optional; if one is provided both must be.
  lat: z.union([z.coerce.number(), z.literal("")]).optional(),
  lng: z.union([z.coerce.number(), z.literal("")]).optional(),
  photoUrls: z.array(z.string()).max(6).default([]),
});
export type PlaceRequestInput = z.infer<typeof placeRequestInputSchema>;

export const reviewInputSchema = z.object({
  placeSlug: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z
    .string()
    .trim()
    .min(8, "A few more words, please")
    .max(1000),
  authorName: z.string().trim().max(60).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const adminDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(500).optional(),
  coordinates: coordinatesSchema.optional(),
});
export type AdminDecision = z.infer<typeof adminDecisionSchema>;

export const adminVerifySchema = z.object({
  passphrase: z.string().min(1, "Enter the admin passphrase"),
});
