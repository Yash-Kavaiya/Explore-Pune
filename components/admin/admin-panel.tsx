"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCategory } from "@/lib/data/categories";
import { Button } from "@/components/ui/button";
import type { PlaceRequest } from "@/lib/types";
import type { AdminStats } from "@/lib/store/stats.repo";

export function AdminPanel({
  stats,
  requests,
}: {
  stats: AdminStats;
  requests: PlaceRequest[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(`${action}:${id}`);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Update failed");
      toast.success(action === "approve" ? "Approved — it is in the directory" : "Rejected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await fetch("/api/admin/verify", { method: "DELETE" });
    router.refresh();
  }

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Moderation</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">Admin</h1>
        </div>
        <Button variant="outline" type="button" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending" value={stats.requests.pending} />
        <Stat label="Approved" value={stats.requests.approved} />
        <Stat label="Reviews" value={stats.reviews} />
        <Stat label="Place views" value={stats.totalViews} />
      </section>

      {stats.topViewed.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold">Most viewed</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {stats.topViewed.map((row) => (
              <li key={row.slug} className="flex justify-between gap-4">
                <span className="font-mono">{row.slug}</span>
                <span>{row.views}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Pending suggestions</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting.</p>
        ) : (
          pending.map((req) => (
            <article key={req.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold">{req.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getCategory(req.category).label} · {req.area} · {req.submittedBy}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void decide(req.id, "approve")}
                  >
                    {busy === `approve:${req.id}` ? "Saving…" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void decide(req.id, "reject")}
                  >
                    {busy === `reject:${req.id}` ? "Saving…" : "Reject"}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{req.whySpecial}</p>
            </article>
          ))
        )}
      </section>

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Decided</h2>
          <ul className="space-y-2 text-sm">
            {decided.map((req) => (
              <li key={req.id} className="flex flex-wrap justify-between gap-2 border-b border-border/50 py-2">
                <span>
                  {req.name}{" "}
                  <span className="text-muted-foreground">
                    · {req.status} · {req.area}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
    </div>
  );
}
