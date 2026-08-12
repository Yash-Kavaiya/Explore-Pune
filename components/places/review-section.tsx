"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { RatingStars } from "@/components/places/rating-stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import type { Review } from "@/lib/types";
import type { RatingSummary } from "@/lib/store/reviews.repo";

export function ReviewSection({
  placeSlug,
  placeName,
  initialReviews,
  summary,
}: {
  placeSlug: string;
  placeName: string;
  initialReviews: Review[];
  summary: RatingSummary;
}) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [authorName, setAuthorName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Pick a rating");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeSlug,
          rating,
          comment,
          authorName: authorName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; issues?: { fieldErrors?: Record<string, string[]> } }
        | null;
      if (!res.ok) {
        const fieldMsg = data?.issues?.fieldErrors
          ? Object.values(data.issues.fieldErrors).flat()[0]
          : undefined;
        throw new Error(fieldMsg || data?.error || "Could not save your review");
      }
      toast.success("Thanks — your review is live");
      setRating(0);
      setComment("");
      setAuthorName("");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="reviews-heading" className="font-heading text-2xl font-semibold">
            Reviews
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What visitors say about {placeName}
          </p>
        </div>
        {summary.count > 0 ? (
          <RatingStars rating={summary.average} size="md" count={summary.count} />
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet — be the first</p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
      >
        <p className="text-sm font-medium">Leave a review</p>

        <div>
          <Label className="mb-2">Your rating</Label>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="rounded-md p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star
                    className={
                      active
                        ? "size-6 fill-amber-500 text-amber-500"
                        : "size-6 text-muted-foreground/40"
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-comment">Comment</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What should other visitors know?"
            required
            minLength={8}
            maxLength={1000}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-name">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="review-name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Guest"
            maxLength={60}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Post review"}
        </Button>
      </form>

      {initialReviews.length > 0 && (
        <ul className="space-y-4">
          {initialReviews.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-border/60 bg-background/60 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{r.authorName}</p>
                <time
                  dateTime={r.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {formatDate(r.createdAt)}
                </time>
              </div>
              <RatingStars rating={r.rating} className="mt-1.5" />
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
