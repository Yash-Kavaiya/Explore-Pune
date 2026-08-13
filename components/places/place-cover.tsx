import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type PlaceCoverProps = {
  src?: string;
  /** category accent token (1-5) */
  accent: 1 | 2 | 3 | 4 | 5;
  iconKey: string;
  alt: string;
  className?: string;
  /** show the category icon watermark (default true) */
  watermark?: boolean;
  priority?: boolean;
  sizes?: string;
};

/**
 * Visual cover for a place. Uses a real photo when `src` is provided,
 * otherwise falls back to an on-brand gradient keyed to the category accent
 * with a faint icon watermark — so the whole site looks cohesive offline.
 */
export function PlaceCover({
  src,
  accent,
  iconKey,
  alt,
  className,
  watermark = true,
  priority,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: PlaceCoverProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative overflow-hidden", className)}
      style={{
        backgroundImage: `linear-gradient(140deg, var(--chart-${accent}), color-mix(in oklab, var(--chart-${accent}) 55%, black))`,
      }}
    >
      {/* dotted texture */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      {/* sheen */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
      {watermark && (
        <Icon
          name={iconKey}
          className="absolute -bottom-4 -right-3 size-28 text-white/15"
          strokeWidth={1.25}
        />
      )}
    </div>
  );
}
