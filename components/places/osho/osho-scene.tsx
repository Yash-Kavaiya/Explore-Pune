"use client";

import * as React from "react";
import {
  createOshoWorld,
  supportsWebGL,
  type FeatureId,
  type ResortMode,
  type ResortWorld,
  type TimeOfDay,
} from "@/components/places/osho/osho-world";

export type OshoSceneProps = {
  active: FeatureId | null;
  timeOfDay: TimeOfDay;
  mode: ResortMode;
  onSelect: (id: FeatureId | null) => void;
  onHover?: (id: FeatureId | null) => void;
  onReady?: () => void;
  onUnsupported?: () => void;
  /** Bump to re-frame the camera on the whole campus. */
  resetSignal?: number;
};

/** React ↔ three.js bridge; the world is created once and driven by props. */
export default function OshoScene({
  active,
  timeOfDay,
  mode,
  onSelect,
  onHover,
  onReady,
  onUnsupported,
  resetSignal = 0,
}: OshoSceneProps) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const worldRef = React.useRef<ResortWorld | null>(null);

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

    let world: ResortWorld;
    try {
      world = createOshoWorld(mount, {
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
    worldRef.current?.setMode(mode);
  }, [mode]);

  React.useEffect(() => {
    worldRef.current?.setActive(active);
  }, [active]);

  React.useEffect(() => {
    if (resetSignal > 0) worldRef.current?.resetView();
  }, [resetSignal]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
