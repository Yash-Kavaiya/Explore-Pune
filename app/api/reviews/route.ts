import { NextResponse } from "next/server";
import { jsonFromStoreError } from "@/lib/store/http";
import { createReview, getRatingSummary, listReviews } from "@/lib/store/reviews.repo";
import { reviewInputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reviews for a place (or all). Public. */
export async function GET(request: Request) {
  const placeSlug = new URL(request.url).searchParams.get("placeSlug") ?? undefined;
  const reviews = await listReviews(placeSlug);
  const summary = placeSlug ? await getRatingSummary(placeSlug) : undefined;
  return NextResponse.json({ reviews, summary });
}

/** Leave a review. Public. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your review", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const created = await createReview(parsed.data);
    return NextResponse.json({ review: created }, { status: 201 });
  } catch (err) {
    const res = jsonFromStoreError(err);
    if (res) return res;
    throw err;
  }
}
