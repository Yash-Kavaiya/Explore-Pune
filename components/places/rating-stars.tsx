import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  rating: number;
  size?: "sm" | "md";
  showValue?: boolean;
  count?: number;
  className?: string;
};

/** Five-star display with fractional fill via a clipped overlay. */
export function RatingStars({
  rating,
  size = "sm",
  showValue = true,
  count,
  className,
}: RatingStarsProps) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const star = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative inline-flex" aria-hidden>
        <div className="flex text-muted-foreground/35">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={star} />
          ))}
        </div>
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
          <div className="flex text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn(star, "fill-amber-500")} />
            ))}
          </div>
        </div>
      </div>
      {showValue && rating > 0 && (
        <span className="text-xs font-medium text-foreground/80">{rating.toFixed(1)}</span>
      )}
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">
          ({count})
        </span>
      )}
    </div>
  );
}
