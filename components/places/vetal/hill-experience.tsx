"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  LoaderCircle,
  MapPin,
  Moon,
  RotateCcw,
  Sun,
  Sunrise,
  SunDim,
  Umbrella,
  X,
  type LucideIcon,
} from "lucide-react";
import { CategoryBadge } from "@/components/places/category-badge";
import { RatingStars } from "@/components/places/rating-stars";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { HILL_FEATURES, type HillFeature } from "@/lib/data/vetal-tekdi";
import type { FeatureId, Season, TimeOfDay } from "@/components/places/vetal/hill-world";

/** three.js is client-only and heavy — keep it out of the server render. */
const HillScene = dynamic(() => import("@/components/places/vetal/hill-scene"), {
  ssr: false,
});

const LIGHT_OPTIONS: { id: TimeOfDay; label: string; icon: typeof Sun }[] = [
  { id: "dawn", label: "Dawn", icon: Sunrise },
  { id: "golden", label: "Golden hour", icon: Sun },
  { id: "dusk", label: "Dusk", icon: Moon },
];

const SEASON_OPTIONS: { id: Season; label: string; icon: typeof Sun }[] = [
  { id: "dry", label: "Dry season", icon: SunDim },
  { id: "monsoon", label: "Monsoon", icon: Umbrella },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; icon: typeof Sun }[];
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-full border border-white/20 bg-black/35 p-0.5 backdrop-blur-md"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
              active ? "bg-white text-neutral-900" : "text-white/80 hover:bg-white/15 hover:text-white",
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sr-only sm:hidden">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HillExperience({
  name,
  area,
  rating,
  reviewCount,
  tagline,
}: {
  name: string;
  area: string;
  rating: number;
  reviewCount?: number;
  tagline: string;
}) {
  const [active, setActive] = React.useState<FeatureId | null>(null);
  const [timeOfDay, setTimeOfDay] = React.useState<TimeOfDay>("golden");
  const [season, setSeason] = React.useState<Season>("dry");
  const [ready, setReady] = React.useState(false);
  const [unsupported, setUnsupported] = React.useState(false);
  const [resetSignal, setResetSignal] = React.useState(0);
  const [touched, setTouched] = React.useState(false);

  const activeFeature: HillFeature | undefined = React.useMemo(
    () => HILL_FEATURES.find((f) => f.id === active),
    [active],
  );

  const handleSelect = React.useCallback((id: FeatureId | null) => {
    setTouched(true);
    setActive(id);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-neutral-900">
      <div className="relative h-[80svh] max-h-[880px] min-h-[560px] w-full">
        {unsupported ? (
          <HillFallback />
        ) : (
          <HillScene
            active={active}
            timeOfDay={timeOfDay}
            season={season}
            onSelect={handleSelect}
            onReady={() => setReady(true)}
            onUnsupported={() => setUnsupported(true)}
            resetSignal={resetSignal}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        <div
          className={cn(
            "pointer-events-none absolute inset-0 grid place-items-center bg-neutral-900 transition-opacity duration-700",
            ready || unsupported ? "opacity-0" : "opacity-100",
          )}
        >
          <div className="flex flex-col items-center gap-3 text-white/80">
            <LoaderCircle className="size-6 animate-spin" />
            <p className="font-heading text-sm tracking-wide">Climbing Vetal Tekdi…</p>
          </div>
        </div>

        <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
            <Compass className="size-3.5" />
            Interactive 3D model
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Segmented label="Light" value={timeOfDay} options={LIGHT_OPTIONS} onChange={setTimeOfDay} />
            <Segmented label="Season" value={season} options={SEASON_OPTIONS} onChange={setSeason} />
            <button
              type="button"
              onClick={() => {
                setActive(null);
                setResetSignal((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Reset view</span>
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge
                  category="lakes-hills"
                  className="border-white/25 bg-white/15 text-white backdrop-blur-md"
                />
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs text-white/85 backdrop-blur-md">
                  <MapPin className="size-3.5" />
                  {area}
                </span>
              </div>
              <h1 className="mt-3 text-balance font-heading text-4xl font-bold leading-[1.05] text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                {name}
              </h1>
              <p className="mt-3 max-w-lg text-pretty text-sm text-white/85 sm:text-base">{tagline}</p>
              <div className="mt-4 flex items-center gap-3">
                <RatingStars rating={rating} size="md" count={reviewCount} className="[&_span]:text-white/85" />
                <span
                  className={cn(
                    "text-xs text-white/60 transition-opacity duration-500",
                    touched ? "opacity-0" : "opacity-100",
                  )}
                >
                  Drag to orbit · scroll to zoom
                </span>
              </div>
            </div>

            <div className="lg:max-w-md lg:shrink-0">
              {activeFeature ? (
                <FeatureCard
                  feature={activeFeature}
                  icon={getIcon(activeFeature.icon)}
                  onClose={() => handleSelect(null)}
                />
              ) : (
                <p className="hidden text-right text-xs text-white/60 lg:block">
                  Six places on the hill — tap a marker
                </p>
              )}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:justify-end lg:overflow-visible">
                {HILL_FEATURES.map((feature, i) => {
                  const Icon = getIcon(feature.icon);
                  const isActive = feature.id === active;
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => handleSelect(isActive ? null : feature.id)}
                      aria-pressed={isActive}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
                        isActive
                          ? "border-primary/60 bg-primary text-primary-foreground"
                          : "border-white/20 bg-black/35 text-white/85 hover:bg-black/55 hover:text-white",
                      )}
                    >
                      <span className="grid size-4 place-items-center rounded-full bg-white/25 text-[10px] font-semibold">
                        {i + 1}
                      </span>
                      <Icon className="size-3.5" />
                      {feature.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only">
        An interactive three-dimensional model of Vetal Tekdi, showing the summit shrine, the city
        panorama, the quarry pond, the trails, the scrub forest and the ridge walk. Use the buttons
        above to change the light, the season and the viewpoint.
      </p>
    </section>
  );
}

function FeatureCard({
  feature,
  icon: Icon,
  onClose,
}: {
  feature: HillFeature;
  icon: LucideIcon;
  onClose: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-white/15 bg-black/50 p-4 text-white backdrop-blur-xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-full p-1 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <Icon className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">{feature.title}</h2>
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wider text-white/50">{feature.marathi}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{feature.blurb}</p>
    </div>
  );
}

function HillFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 55% at 50% 22%, #8a9a5b 0%, transparent 55%), linear-gradient(160deg, #4a5234, #2a2618 55%, #14120c)",
      }}
    >
      <div className="absolute inset-0 opacity-25 mix-blend-soft-light [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:16px_16px]" />
      <div className="absolute inset-0 flex items-end p-8">
        <p className="max-w-md text-sm text-white/70">
          Interactive 3D is unavailable in this browser. Scroll down for the full story of Vetal
          Tekdi — the shrine, the city panorama, the quarry pond, the trails, the scrub and the ridge.
        </p>
      </div>
    </div>
  );
}
