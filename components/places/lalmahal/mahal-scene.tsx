"use client";

import * as React from "react";
import {
  createMahalWorld,
  supportsWebGL,
  type FeatureId,
  type MahalWorld,
  type Season,
  type TimeOfDay,
} from "@/components/places/lalmahal/mahal-world";

export type MahalSceneProps = {
  active: FeatureId | null;
  timeOfDay: TimeOfDay;
  season: Season;
  onSelect: (id: FeatureId | null) => void;
  onHover?: (id: FeatureId | null) => void;
  onReady?: () => void;
  onUnsupported?: () => void;
  /** Bump to re-frame the camera on the whole palace. */
  resetSignal?: number;
};

/** React ↔ three.js bridge; the world is created once and driven by props. */
export default function MahalScene({
  active,
  timeOfDay,
  season,
  onSelect,
  onHover,
  onReady,
  onUnsupported,
  resetSignal = 0,
}: MahalSceneProps) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const worldRef = React.useRef<MahalWorld | null>(null);

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

    let world: MahalWorld;
    try {
      world = createMahalWorld(mount, {
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
