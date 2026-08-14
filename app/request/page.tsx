import type { Metadata } from "next";
import { SuggestPlaceForm } from "@/components/request/suggest-place-form";

export const metadata: Metadata = {
  title: "Suggest a place",
  description:
    "Know a Pune spot we missed? Suggest it — photos, a few lines on why it matters, and our team reviews every submission.",
};

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-primary">Community</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Suggest a place
        </h1>
        <p className="mt-3 text-muted-foreground">
          ExplorePune grows with local knowledge. Tell us the name, the area, and why it is
          worth a Sunday. We read every note before anything goes live.
        </p>
      </header>
      <SuggestPlaceForm />
    </div>
  );
}
