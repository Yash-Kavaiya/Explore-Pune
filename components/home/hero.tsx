import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { QuickSearch } from "@/components/home/quick-search";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POPULAR = [
  { label: "Shaniwar Wada", href: "/places/shaniwar-wada" },
  { label: "Sinhagad Fort", href: "/places/sinhagad-fort" },
  { label: "Dagdusheth Ganpati", href: "/places/dagdusheth-halwai-ganapati" },
  { label: "Okayama Garden", href: "/places/okayama-friendship-garden" },
];

export function Hero({ placeCount }: { placeCount: number }) {
  return (
    <section className="bg-heritage relative overflow-hidden border-b border-border/60">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Community-powered guide to Pune
        </span>

        <h1 className="mt-6 text-balance font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Discover the soul of <span className="text-primary">Pune</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          Forts and palaces, beloved temples, Japanese gardens and breezy hilltops — explore{" "}
          {placeCount} curated places on a map, read honest guides, and suggest your own favourite
          spots.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <QuickSearch />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> Popular:
          </span>
          {POPULAR.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 rounded-full bg-background/70 px-3 text-xs font-normal",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
