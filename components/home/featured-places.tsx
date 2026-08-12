import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlaceCard } from "@/components/places/place-card";
import { SectionHeading } from "@/components/home/category-tiles";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Place } from "@/lib/types";

export function FeaturedPlaces({ places }: { places: Place[] }) {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Editor's picks"
          title="Pune's must-see highlights"
          description="A handful of icons to anchor any trip — start here if it's your first time."
          action={
            <Link
              href="/places"
              className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
            >
              View all places <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place, i) => (
            <PlaceCard key={place.slug} place={place} priority={i < 3} />
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link href="/places" className={cn(buttonVariants({ variant: "outline" }))}>
            View all places <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
