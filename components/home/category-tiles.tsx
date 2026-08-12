import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/data/categories";
import { getIcon } from "@/lib/icons";
import type { CategoryId } from "@/lib/types";

export function CategoryTiles({ counts }: { counts: { id: CategoryId; count: number }[] }) {
  const countOf = (id: CategoryId) => counts.find((c) => c.id === id)?.count ?? 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Browse by category"
        title="What kind of Pune are you in the mood for?"
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <Link
              key={cat.id}
              href={`/places?category=${cat.id}`}
              className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                style={{
                  backgroundImage: `linear-gradient(140deg, var(--chart-${cat.accent}), color-mix(in oklab, var(--chart-${cat.accent}) 55%, black))`,
                }}
              >
                <Icon className="size-6" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold">{cat.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {countOf(cat.id)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{cat.blurb}</p>
              </div>
              <ArrowRight className="absolute right-4 top-5 size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
