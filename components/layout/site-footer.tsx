import Link from "next/link";
import { MountainSnow } from "lucide-react";
import { FOOTER_NAV, SITE } from "@/lib/site";
import { UpiSupport } from "@/components/layout/upi-support";

export function SiteFooter() {
  const year = 2026; // Static build; bump as needed.
  return (
    <footer className="mt-20 border-t border-border/70 bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-heading">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <MountainSnow className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Explore<span className="text-primary">Pune</span>
            </span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">{SITE.description}</p>
        </div>

        {FOOTER_NAV.map((col) => (
          <div key={col.heading}>
            <h3 className="mb-3 text-sm font-semibold">{col.heading}</h3>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <UpiSupport />
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            © {year} {SITE.name}. A community-powered guide to Pune.
          </p>
          <p>
            Support: {SITE.upiId} · always verify timings &amp; fees before you visit.
          </p>
        </div>
      </div>
    </footer>
  );
}
