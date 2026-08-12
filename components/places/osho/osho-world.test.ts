import { describe, it, expect } from "vitest";
import { OSHO_FEATURES } from "@/lib/data/osho-resort";
import {
  CAMPUS,
  FEATURE_ORDER,
  GATE,
  POOL,
  PYRAMID,
  TEERTH,
  ZEN,
  buildResortLayout,
  getResortAnchors,
  getResortHomeView,
  getResortPalette,
  pondCentres,
  streamAt,
  terrainHeight,
  type FeatureId,
  type ResortMode,
  type TimeOfDay,
} from "@/components/places/osho/osho-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getResortHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getResortAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: ResortMode) {
  const palette = getResortPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "celebration" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "welcome-gate",
      "pyramid",
      "zen-garden",
      "swimming-pool",
      "teerth-park",
      "evening-celebration",
    ]);
  });

  it("aligns 1:1 with OSHO_FEATURES content ids (same set, same order)", () => {
    const contentIds = OSHO_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = OSHO_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("campus geometry", () => {
  it("terrain is a mostly flat campus", () => {
    const h = terrainHeight(0, 0);
    expect(Math.abs(h)).toBeLessThan(1);
  });

  it("stream meanders but stays inside the park corridor", () => {
    for (let z = TEERTH.z0; z <= TEERTH.z1; z += 7) {
      const s = streamAt(z);
      expect(s.x).toBeGreaterThan(TEERTH.x - 6);
      expect(s.x).toBeLessThan(TEERTH.x + 6);
      expect(s.w).toBeGreaterThan(1);
    }
  });

  it("ponds follow the stream and fit the park", () => {
    const ponds = pondCentres();
    expect(ponds).toHaveLength(TEERTH.pondCount);
    for (const p of ponds) {
      expect(p.r).toBeGreaterThanOrEqual(TEERTH.pondR);
      const s = streamAt(p.z);
      expect(Math.abs(p.x - s.x)).toBeLessThan(1);
    }
  });

  it("pyramid is the tallest structure on campus", () => {
    expect(PYRAMID.h).toBeGreaterThan(GATE.h);
    expect(PYRAMID.base).toBeGreaterThan(20);
  });
});

describe("buildResortLayout", () => {
  it("returns dense props with trees and bamboo", () => {
    const layout = buildResortLayout(1974);
    expect(layout.propCount).toBeGreaterThanOrEqual(70);
    expect(layout.treeCount).toBeGreaterThanOrEqual(40);
    expect(layout.bambooCount).toBeGreaterThanOrEqual(8);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildResortLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildResortLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildResortLayout(42);
    const b = buildResortLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.treeCount).toBe(b.treeCount);
    expect(a.props[0]).toEqual(b.props[0]);
  });

  it("keeps trees clear of the pyramid, zen garden and pool", () => {
    const layout = buildResortLayout();
    const trees = layout.props.filter((p) => p.kind === "tree");
    for (const t of trees) {
      expect(Math.hypot(t.x - PYRAMID.x, t.z - PYRAMID.z)).toBeGreaterThan(PYRAMID.base / 2);
      expect(Math.hypot(t.x - ZEN.x, t.z - ZEN.z)).toBeGreaterThan(ZEN.r);
      expect(Math.hypot(t.x - POOL.x, t.z - POOL.z)).toBeGreaterThan(POOL.w / 2);
    }
  });

  it("campus fits inside the diorama edge", () => {
    expect(CAMPUS.halfW).toBeLessThan(56);
    expect(CAMPUS.halfD).toBeLessThan(56);
  });
});

describe("getResortAnchors / getResortHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getResortAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(220);
    }
  });

  it("home view frames the gate path and the pyramid", () => {
    const home = getResortHomeView();
    expect(home.radius).toBeGreaterThan(50);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden / dusk", () => {
    const palettes = times.map((t) => getResortPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getResortPalette("dusk").lantern).toBeGreaterThan(getResortPalette("dawn").lantern);
    expect(getResortPalette("golden").sunIntensity).toBeGreaterThan(
      getResortPalette("dusk").sunIntensity,
    );
  });

  it("celebration mode sets the festival flag over a quiet day", () => {
    const day = resolveAtmosphere("golden", "day");
    const celebration = resolveAtmosphere("golden", "celebration");
    expect(celebration.fest).toBe(1);
    expect(day.fest).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getResortHomeView();
    expect(home.target).toEqual(overview.target);
    expect(home.distance).toBe(overview.radius);
  });

  it("selecting each feature focuses a different target than home", () => {
    const home = resolveView(null);
    for (const id of FEATURE_ORDER) {
      const view = resolveView(id);
      const same =
        view.target[0] === home.target[0] &&
        view.target[1] === home.target[1] &&
        view.target[2] === home.target[2];
      expect(same, `${id} should not reuse home target`).toBe(false);
    }
  });

  it("the pyramid rises above the welcome gate", () => {
    const pyramid = resolveView("pyramid");
    const gate = resolveView("welcome-gate");
    expect(pyramid.target[1]).toBeGreaterThan(gate.target[1]);
  });
});
