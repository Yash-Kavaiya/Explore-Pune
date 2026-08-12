"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function QuickSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/places${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 p-1.5 pl-4 shadow-lg shadow-black/5 backdrop-blur">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search forts, temples, gardens, areas…"
          aria-label="Search places"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Button type="submit" className="rounded-full px-5">
          Search
        </Button>
      </div>
    </form>
  );
}
