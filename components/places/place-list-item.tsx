import Link from "next/link";
import { Clock, MapPin, Ticket } from "lucide-react";
import { getCategory } from "@/lib/data/categories";
import { CategoryBadge } from "@/components/places/category-badge";
import { PlaceCover } from "@/components/places/place-cover";
import { RatingStars } from "@/components/places/rating-stars";
import type { Place } from "@/lib/types";

export function PlaceListItem({ place }: { place: Place }) {
  const cat = getCategory(place.category);
  return (
    <Link
      href={`/places/${place.slug}`}
      className="group flex gap-4 rounded-2xl border border-border/70 bg-card p-3 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PlaceCover
        src={place.heroImage || undefined}
        accent={cat.accent}
        iconKey={cat.icon}
        alt={place.name}
        sizes="160px"
        className="size-28 shrink-0 rounded-xl sm:size-32"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-semibold leading-tight">{place.name}</h3>
          <CategoryBadge category={place.category} />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {place.area}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{place.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <RatingStars rating={place.rating} />
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {place.durationEstimate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Ticket className="size-3.5" />
            {place.isFree ? "Free entry" : place.entryFee}
          </span>
        </div>
      </div>
    </Link>
  );
}
