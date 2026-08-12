import { randomUUID } from "node:crypto";
import { mutate, readDb } from "@/lib/store/db";
import type { Review, ReviewInput } from "@/lib/types";

export type RatingSummary = { average: number; count: number };

export async function listReviews(placeSlug?: string): Promise<Review[]> {
  const db = await readDb();
  const items = placeSlug ? db.reviews.filter((r) => r.placeSlug === placeSlug) : db.reviews;
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReview(input: ReviewInput): Promise<Review> {
  const review: Review = {
    id: randomUUID(),
    placeSlug: input.placeSlug,
    rating: input.rating,
    comment: input.comment,
    authorName: input.authorName?.trim() || "Guest",
    createdAt: new Date().toISOString(),
  };
  return mutate((db) => {
    db.reviews.push(review);
    return review;
  });
}

export async function deleteReview(id: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.reviews.length;
    db.reviews = db.reviews.filter((r) => r.id !== id);
    return db.reviews.length < before;
  });
}

/** Average rating + count for a single place. */
export async function getRatingSummary(placeSlug: string): Promise<RatingSummary> {
  const reviews = await listReviews(placeSlug);
  return summarize(reviews);
}

/** Rating summaries keyed by placeSlug, computed in one read. */
export async function getRatingSummaries(): Promise<Record<string, RatingSummary>> {
  const db = await readDb();
  const byPlace = new Map<string, Review[]>();
  for (const r of db.reviews) {
    const arr = byPlace.get(r.placeSlug) ?? [];
    arr.push(r);
    byPlace.set(r.placeSlug, arr);
  }
  const out: Record<string, RatingSummary> = {};
  for (const [slug, reviews] of byPlace) out[slug] = summarize(reviews);
  return out;
}

function summarize(reviews: Review[]): RatingSummary {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}
