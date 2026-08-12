import { MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown in place of a Google Map when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not
 * set, so the rest of the app stays fully usable without a key.
 */
export function MapPlaceholder({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-heritage grid place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-center",
        className,
      )}
    >
      <div className="max-w-xs px-6 py-8">
        <MapPinned className="mx-auto size-8 text-primary" />
        <p className="mt-3 text-sm font-medium">Map preview unavailable</p>
        {!compact && (
          <p className="mt-1 text-xs text-muted-foreground">
            Add a Google Maps API key to <code className="rounded bg-muted px-1">.env.local</code> (
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>) to enable
            the interactive map.
          </p>
        )}
      </div>
    </div>
  );
}
