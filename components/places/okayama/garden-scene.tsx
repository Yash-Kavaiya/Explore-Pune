"use client";

import * as React from "react";
import {
  createGardenWorld,
  supportsWebGL,
  type FeatureId,
  type GardenWorld,
  type Season,
  type TimeOfDay,
} from "@/components/places/okayama/garden-world";

export type GardenSceneProps = {
  active: FeatureId | null;
  timeOfDay: TimeOfDay;
  season: Season;
  onSelect: (id: FeatureId | null) => void;
  onHover?: (id: FeatureId | null) => void;
  onReady?: () => void;
  onUnsupported?: () => void;
  /** Bump to re-frame the camera on the whole garden. */
  resetSignal?: number;
};

/**
 * React ↔ three.js bridge. The world is created once and then *driven* by
 * prop changes; nothing here re-renders on animation frames.
 */
export default function GardenScene({
  active,
  timeOfDay,
  season,
  onSelect,
  onHover,
  onReady,
  onUnsupported,
  resetSignal = 0,
}: GardenSceneProps) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const worldRef = React.useRef<GardenWorld | null>(null);

  // Callbacks live in a ref so the world is never torn down and rebuilt.
  const handlers = React.useRef({ onSelect, onHover, onReady, onUnsupported });
  React.useEffect(() => {
    handlers.current = { onSelect, onHover, onReady, onUnsupported };
  });

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!supportsWebGL()) {
      handlers.current.onUnsupported?.();
      return;
    }

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let world: GardenWorld;
    try {
      world = createGardenWorld(mount, {
        reducedMotion,
        onSelect: (id) => handlers.current.onSelect(id),
        onHover: (id) => handlers.current.onHover?.(id),
        onReady: () => handlers.current.onReady?.(),
      });
    } catch {
      handlers.current.onUnsupported?.();
      return;
    }
    worldRef.current = world;

    // Stop rendering whenever the garden is off-screen or the tab is hidden.
    let onScreen = true;
    const syncPaused = () => world.setPaused(!onScreen || document.hidden);
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        syncPaused();
      },
      { threshold: 0.01 },
    );
    io.observe(mount);
    document.addEventListener("visibilitychange", syncPaused);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
      worldRef.current = null;
      world.dispose();
    };
  }, []);

  React.useEffect(() => {
    worldRef.current?.setTimeOfDay(timeOfDay);
  }, [timeOfDay]);

  React.useEffect(() => {
    worldRef.current?.setSeason(season);
  }, [season]);

  React.useEffect(() => {
    worldRef.current?.setActive(active);
  }, [active]);

  React.useEffect(() => {
    if (resetSignal > 0) worldRef.current?.resetView();
  }, [resetSignal]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
