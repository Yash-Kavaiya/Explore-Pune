import { Landmark, Quote } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getIcon } from "@/lib/icons";
import {
  TEMPLE_ETIQUETTE,
  TEMPLE_FAQS,
  TEMPLE_FEATURES,
  TEMPLE_STATS,
  TEMPLE_STORY,
} from "@/lib/data/dagdusheth-temple";

/**
 * Editorial half of the Dagdusheth Halwai Ganapati page — the history and
 * features the 3D model can show but not explain. Feature cards match the
 * scene markers.
 */
export function TempleStory() {
  return (
    <>
      <section aria-label="Key facts" className="border-y border-border/60 bg-muted/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:px-6 lg:grid-cols-4 lg:py-10">
          {TEMPLE_STATS.map((stat) => (
            <div key={stat.label} className="px-2 py-3 lg:px-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1.5 font-heading text-2xl font-bold tracking-tight lg:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Landmark className="size-3.5" />
              The story
            </span>
            <h2 className="mt-4 text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              A vow made in grief, kept in gold
            </h2>
            <figure className="mt-6 border-l-2 border-primary/40 pl-4">
              <Quote className="size-4 text-primary/60" />
              <blockquote className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
                Every kilo of gold on the idol arrived the same way: someone prayed, someone was
                answered, someone came back to say thank you.
              </blockquote>
            </figure>
          </div>

          <div className="space-y-10">
            {TEMPLE_STORY.map((block) => (
              <div key={block.heading}>
                <h3 className="font-heading text-xl font-semibold tracking-tight">
                  {block.heading}
                </h3>
                <p className="mt-3 text-pretty leading-relaxed text-foreground/80">{block.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="what-to-see"
        className="scroll-mt-20 border-t border-border/60 bg-heritage"
        aria-label="What to look for"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <header className="max-w-2xl">
            <h2 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Six things worth stopping for
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each one is numbered on the 3D model above — tap a marker to fly the camera to it, or
              just read on.
            </p>
          </header>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLE_FEATURES.map((feature, i) => {
              const Icon = getIcon(feature.icon);
              return (
                <article
                  key={feature.id}
                  className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <Icon className="size-5 text-primary/70" strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold leading-snug">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {feature.marathi}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{feature.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export function TempleEtiquette() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <h3 className="font-heading text-lg font-semibold">Visitor etiquette</h3>
      <ul className="mt-4 space-y-3">
        {TEMPLE_ETIQUETTE.map((rule) => (
          <li key={rule} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TempleFaqs() {
  return (
    <section aria-labelledby="faq-heading" className="space-y-4">
      <h2 id="faq-heading" className="font-heading text-2xl font-semibold">
        Questions people actually ask
      </h2>
      <Accordion>
        {TEMPLE_FAQS.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q}>
            <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <p>{faq.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}