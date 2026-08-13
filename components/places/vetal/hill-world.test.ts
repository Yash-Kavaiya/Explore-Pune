import { describe, it, expect } from "vitest";
import { HILL_FEATURES } from "@/lib/data/vetal-tekdi";
import {
  FEATURE_ORDER,
  HILL,
  QUARRY,
  SHRINE,
  buildHillLayout,
  getHillAnchors,
  getHillHomeView,
  getHillPalette,
  hillDome,
  quarryDepth,
  terrainHeight,
  type FeatureId,
  type Season,
  type TimeOfDay,
} from "@/components/places/vetal/hill-world";

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

/** Pure atmosphere helper mirroring setTimeOfDay + setSeason. */
function resolveAtmosphere(timeOfDay: TimeOfDay, season: Season) {
  const palette = getHillPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    wet: season === "monsoon" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "summit-shrine",
      "city-panorama",
      "quarry-lake",
      "the-trails",
      "scrub-forest",
      "ridge-walk",
    ]);
  });

  it("aligns 1:1 with HILL_FEATURES content ids (same set, same order)", () => {
    const contentIds = HILL_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = HILL_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("hill geometry", () => {
  it("has a flat summit plateau and a base at ground level", () => {
    expect(hillDome(0, 0)).toBe(HILL.plateauY);
    expect(hillDome(HILL.baseR + 8, 0)).toBe(0);
  });

  it("cuts a quarry bowl into the eastern flank", () => {
    expect(quarryDepth(QUARRY.x, QUARRY.z)).toBeGreaterThan(QUARRY.depth * 0.8);
    expect(quarryDepth(0, 0)).toBe(0);
    const floor = terrainHeight(QUARRY.x, QUARRY.z);
    const rim = terrainHeight(QUARRY.x - QUARRY.r - 2, QUARRY.z);
    expect(rim).toBeGreaterThan(floor);
  });

  it("keeps the shrine on the plateau, above the quarry floor", () => {
    expect(terrainHeight(SHRINE.x, SHRINE.z)).toBeGreaterThan(HILL.plateauY * 0.85);
    expect(terrainHeight(SHRINE.x, SHRINE.z)).toBeGreaterThan(terrainHeight(QUARRY.x, QUARRY.z));
  });
});

describe("buildHillLayout", () => {
  it("returns dense props plus a city below the hill", () => {
    const layout = buildHillLayout(1800);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.buildingCount).toBeGreaterThanOrEqual(80);
    expect(layout.trailStoneCount).toBeGreaterThanOrEqual(20);
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

  it("exposes a finite marker base for every feature", () => {
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

  it("keeps buildings off the hill and clear of the south trail axis", () => {
    const layout = buildHillLayout();
    for (const b of layout.buildings) {
      expect(Math.hypot(b.x, b.z)).toBeGreaterThanOrEqual(HILL.baseR - 1);
      expect(Math.abs(b.x) < 10 && b.z > 12).toBe(false);
    }
  });
});

describe("getHillAnchors / getHillHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getHillAnchors();
    const home = getHillHomeView();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(240);
      const same =
        a.target[0] === home.target[0] &&
        a.target[1] === home.target[1] &&
        a.target[2] === home.target[2];
      expect(same, `${id} camera target must not be the home overview`).toBe(false);
    }
  });

  it("home view frames the south approach and the summit", () => {
    const home = getHillHomeView();
    expect(home.radius).toBeGreaterThan(60);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setSeason)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getHillPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getHillPalette("dusk").lantern).toBeGreaterThan(getHillPalette("dawn").lantern);
    expect(getHillPalette("golden").sunIntensity).toBeGreaterThan(
      getHillPalette("dusk").sunIntensity,
    );
  });

  it("monsoon sets the wet flag over a dry day", () => {
    const dry = resolveAtmosphere("golden", "dry");
    const wet = resolveAtmosphere("golden", "monsoon");
    expect(wet.wet).toBe(1);
    expect(dry.wet).toBe(0);
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

  it("the shrine sits above the trail camera target", () => {
    const shrine = resolveView("summit-shrine");
    const trails = resolveView("the-trails");
    expect(shrine.target[1]).toBeGreaterThan(trails.target[1]);
  });
});
