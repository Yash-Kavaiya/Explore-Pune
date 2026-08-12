"use client";

import { LayoutGrid, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DirectoryView = "grid" | "list" | "map";

const OPTIONS: { value: DirectoryView; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "map", label: "Map", icon: MapIcon },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: DirectoryView;
  onChange: (v: DirectoryView) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/50 p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
