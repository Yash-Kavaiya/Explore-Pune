import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        This path is not on the map
      </h1>
      <p className="mt-3 text-muted-foreground">
        That page is not in the guide. Try the directory, or suggest the place if we missed it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/places" className={cn(buttonVariants())}>
          Browse places
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back home
        </Link>
      </div>
    </div>
  );
}
