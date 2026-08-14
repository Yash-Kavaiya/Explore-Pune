"use client";

import { Copy, Heart, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { SITE } from "@/lib/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const upiPayHref = `upi://pay?pa=${encodeURIComponent(SITE.upiId)}&pn=${encodeURIComponent(SITE.upiName)}&cu=INR`;

export function UpiSupport() {
  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(SITE.upiId);
      toast.success("UPI ID copied — thank you for keeping this city guide alive.");
    } catch {
      toast.message(SITE.upiId);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Heart className="size-4" />
        </span>
        <div className="min-w-0 space-y-3">
          <h3 className="font-heading text-base font-semibold tracking-tight sm:text-lg">
            If a walk through this city meant something
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every 3D place you just opened — the cave under the street, the flame at Ghorpadi, the
            lake at sunset — is built with AI hours that cost a real subscription. ExplorePune is a
            one-person love letter. There is no company behind it. If a page helped you plan a Sunday
            with someone you care about, consider sponsoring next month&apos;s AI credit. Even a small
            UPI keeps a model lit, and a stranger&apos;s trip a little kinder.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 font-mono text-sm">
              <IndianRupee className="size-3.5 text-primary" />
              {SITE.upiId}
            </span>
            <button
              type="button"
              onClick={copyUpi}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <Copy className="size-3.5" />
              Copy UPI ID
            </button>
            <a
              href={upiPayHref}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <Heart className="size-3.5" />
              Sponsor on UPI
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Any amount. Any time. It goes straight to keeping the 3D walks — and the AI that draws
            them — alive.
          </p>
        </div>
      </div>
    </div>
  );
}
