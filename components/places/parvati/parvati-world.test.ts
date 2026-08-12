import { describe, it, expect } from "vitest";
import { PARVATI_FEATURES } from "@/lib/data/parvati-hill-temple";
import {
  FEATURE_ORDER,
  GATEWAY,
  HILL,
  MAIN_TEMPLE,
  SHRINES,
  STAIR,
  buildHillLayout,
  getHillAnchors,
  getHillHomeView,
  getHillPalette,
  hillDome,
  stairTopAt,
  stepSpec,
  type FeatureId,
  type HillMode,
  type TimeOfDay,
} from "@/components/places/parvati/parvati-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getHillHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getHillAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: HillMode) {
  const palette = getHillPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "mahashivratri" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "steps",
      "gateway",
      "devdeveshwar",
      "shrine-cluster",
      "peshwa-museum",
      "panorama",
    ]);
  });

  it("aligns 1:1 with PARVATI_FEATURES content ids (same set, same order)", () => {
    const contentIds = PARVATI_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = PARVATI_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("the 103 steps", () => {
  it("specifies exactly 103 steps", () => {
    expect(STAIR.count).toBe(103);
  });

  it("descends monotonically from the summit to the paytha", () => {
    let prev = Infinity;
    for (let i = 0; i < STAIR.count; i++) {
      const { z, topY } = stepSpec(i);
      expect(z).toBeGreaterThan(STAIR.z0);
      expect(z).toBeLessThan(STAIR.z1);
      expect(topY).toBeLessThan(prev);
      prev = topY;
    }
  });

  it("starts near the plateau and ends at the plain", () => {
    expect(stepSpec(0).topY).toBeGreaterThan(HILL.plateauY * 0.95);
    expect(stepSpec(STAIR.count - 1).topY).toBeLessThan(HILL.plateauY * 0.05);
  });

  it("ramp matches the plateau at the top and zero at the bottom", () => {
    expect(stairTopAt(STAIR.z0)).toBe(HILL.plateauY);
    expect(stairTopAt(STAIR.z1)).toBe(0);
  });
});

describe("hill geometry", () => {
  it("has a flat summit plateau and a base at ground level", () => {
    expect(hillDome(0, 0)).toBe(HILL.plateauY);
    expect(hillDome(HILL.baseR + 5, 0)).toBe(0);
  });

  it("places the gateway partway up the climb", () => {
    const y = stairTopAt(GATEWAY.z);
    expect(y).toBeGreaterThan(HILL.plateauY * 0.3);
    expect(y).toBeLessThan(HILL.plateauY * 0.9);
  });
});

describe("buildHillLayout", () => {
  it("returns dense props plus a city below the hill", () => {
    const layout = buildHillLayout(1749);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.buildingCount).toBeGreaterThanOrEqual(100);
    expect(layout.stepCount).toBe(103);
    expect(layout.props.length).toBe(layout.propCount);
    expect(layout.buildings.length).toBe(layout.buildingCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildHillLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildHillLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildHillLayout(42);
    const b = buildHillLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.buildingCount).toBe(b.buildingCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.buildings[0]).toEqual(b.buildings[0]);
  });

  it("keeps buildings off the hill and clear of the stair axis", () => {
    const layout = buildHillLayout();
    for (const b of layout.buildings) {
      expect(Math.hypot(b.x, b.z)).toBeGreaterThanOrEqual(HILL.baseR - 1);
      expect(Math.abs(b.x) < 10 && b.z > 14).toBe(false);
    }
  });

  it("keeps the shrine cluster on the summit plateau", () => {
    for (const s of SHRINES) {
      expect(Math.hypot(s.x, s.z)).toBeLessThan(HILL.plateauR);
    }
  });
});

describe("getHillAnchors / getHillHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getHillAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the stairway approach and the summit", () => {
    const home = getHillHomeView();
    expect(home.radius).toBeGreaterThan(60);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    // Looking from the paytha (+Z) side toward the summit.
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getHillPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getHillPalette("dusk").lantern).toBeGreaterThan(getHillPalette("dawn").lantern);
    expect(getHillPalette("golden").sunIntensity).toBeGreaterThan(
      getHillPalette("dusk").sunIntensity,
    );
  });

  it("mahashivratri mode sets the festival flag over a darshan day", () => {
    const darshan = resolveAtmosphere("golden", "darshan");
    const utsav = resolveAtmosphere("golden", "mahashivratri");
    expect(utsav.fest).toBe(1);
    expect(darshan.fest).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getHillHomeView();
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

  it("the summit temple sits above the gateway on the steps", () => {
    const temple = resolveView("devdeveshwar");
    const gate = resolveView("gateway");
    expect(temple.target[1]).toBeGreaterThan(gate.target[1]);
  });
});

describe("building constants", () => {
  it("describes a hill with a real climb and a summit temple", () => {
    expect(HILL.plateauY).toBeGreaterThan(10);
    expect(MAIN_TEMPLE.sanctumH).toBeGreaterThan(3);
    expect(MAIN_TEMPLE.colH).toBeGreaterThan(2);
    expect(STAIR.z1).toBeGreaterThan(STAIR.z0);
  });
});
