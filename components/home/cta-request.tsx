import Link from "next/link";
import { Plus, MapPinPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaRequest() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="bg-heritage relative overflow-hidden rounded-3xl border border-primary/20 px-6 py-12 text-center sm:px-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
          <MapPinPlus className="size-7" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Know a spot we&apos;re missing?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          ExplorePune grows with local knowledge. Suggest a place, add a photo and a few lines on why
          it&apos;s special — our team reviews every submission before it goes live.
        </p>
        <Link
          href="/request"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 px-6 text-base")}
        >
          <Plus className="size-4" />
          Suggest a place
        </Link>
      </div>
    </section>
  );
}
