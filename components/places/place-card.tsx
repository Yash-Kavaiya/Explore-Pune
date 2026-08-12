import Link from "next/link";
import { Clock, MapPin, Ticket } from "lucide-react";
import { getCategory } from "@/lib/data/categories";
import { CategoryBadge } from "@/components/places/category-badge";
import { PlaceCover } from "@/components/places/place-cover";
import { RatingStars } from "@/components/places/rating-stars";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Place } from "@/lib/types";

export function PlaceCard({
  place,
  className,
  priority,
}: {
  place: Place;
  className?: string;
  priority?: boolean;
}) {
  const cat = getCategory(place.category);
  return (
    <Link
      href={`/places/${place.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[4/3]">
        <PlaceCover
          src={place.heroImage || undefined}
          accent={cat.accent}
          iconKey={cat.icon}
          alt={place.name}
          priority={priority}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3">
          <CategoryBadge category={place.category} />
        </div>
        {place.featured && (
          <Badge className="absolute right-3 top-3 bg-primary/95 text-primary-foreground shadow">
            Featured
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold leading-snug">{place.name}</h3>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {place.area}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{place.shortDescription}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
          <RatingStars rating={place.rating} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {place.durationEstimate}
            </span>
            <span className="inline-flex items-center gap-1">
              <Ticket className="size-3.5" />
              {place.isFree ? "Free" : "Paid"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
