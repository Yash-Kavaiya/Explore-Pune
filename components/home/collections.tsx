import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COLLECTIONS } from "@/lib/data/collections";
import { getIcon } from "@/lib/icons";
import { SectionHeading } from "@/components/home/category-tiles";

export function Collections() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Curated collections"
        title="Themed ways to explore"
        description="Hand-picked groupings for the mood you're in or the season you're visiting."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {COLLECTIONS.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <Link
              key={c.slug}
              href={`/places?collection=${c.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <span>{c.placeSlugs.length} places</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
