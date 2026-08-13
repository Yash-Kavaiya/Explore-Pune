import { describe, it, expect } from "vitest";
import { BAUG_FEATURES } from "@/lib/data/saras-baug";
import {
  FEATURE_ORDER,
  ISLAND,
  MUSEUM,
  PARVATI,
  PATH,
  STALLS,
  TANK,
  buildBaugLayout,
  getBaugAnchors,
  getBaugHomeView,
  getBaugPalette,
  inIsland,
  inMuseumFootprint,
  inPath,
  inTank,
  stallSpec,
  terrainHeight,
  type BaugMode,
  type FeatureId,
  type TimeOfDay,
} from "@/components/places/saras/baug-world";

function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getBaugHomeView();
    return { target: home.target, distance: home.radius, phi: home.phi, theta: home.theta };
  }
  const anchor = getBaugAnchors()[active];
  return { target: anchor.target, distance: anchor.distance, dir: anchor.dir };
}

function resolveAtmosphere(timeOfDay: TimeOfDay, mode: BaugMode) {
  const palette = getBaugPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "evening" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly five stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(5);
    expect(FEATURE_ORDER).toEqual([
      "talyatla-ganpati",
      "drained-lawns",
      "ganesh-museum",
      "evening-stalls",
      "parvati-hill",
    ]);
  });

  it("aligns 1:1 with BAUG_FEATURES content ids (same set, same order)", () => {
    const contentIds = BAUG_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = BAUG_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("baug layout geometry", () => {
  it("sits the Ganpati shrine on a central island mound", () => {
    expect(ISLAND.x).toBe(0);
    expect(ISLAND.z).toBe(0);
    expect(ISLAND.y).toBeGreaterThan(TANK.bedY);
    expect(inIsland(0, 0)).toBe(true);
    expect(terrainHeight(0, 0)).toBeGreaterThan(terrainHeight(PATH.r, 0));
  });

  it("rings the former tank with lawns and a path, not a full lake", () => {
    expect(inTank(0, 14)).toBe(true);
    expect(inIsland(0, 14)).toBe(false);
    expect(inPath(PATH.r, 0)).toBe(true);
    expect(TANK.bedY).toBeLessThan(ISLAND.y);
    expect(terrainHeight(14, 0)).toBeLessThan(ISLAND.y);
  });

  it("keeps the museum as a separate building off the island", () => {
    expect(inIsland(MUSEUM.x, MUSEUM.z)).toBe(false);
    expect(inMuseumFootprint(MUSEUM.x, MUSEUM.z)).toBe(true);
    expect(Math.hypot(MUSEUM.x, MUSEUM.z)).toBeGreaterThan(ISLAND.r + 4);
  });

  it("places food stalls as a distinct gate strip", () => {
    expect(STALLS.z).toBeGreaterThan(TANK.r - 4);
    const s = stallSpec(0);
    expect(inIsland(s.x, s.z)).toBe(false);
    expect(s.z).toBeGreaterThan(PATH.r);
  });

  it("places Parvati as a separate hill mass", () => {
    expect(PARVATI.z).toBeLessThan(-TANK.r);
    expect(PARVATI.h).toBeGreaterThan(ISLAND.y + 6);
    expect(inIsland(PARVATI.x, PARVATI.z)).toBe(false);
  });
});

describe("buildBaugLayout", () => {
  it("returns stalls, path lamps and a full prop set", () => {
    const layout = buildBaugLayout(1750);
    expect(layout.stallCount).toBe(STALLS.count);
    expect(layout.pathLampCount).toBeGreaterThanOrEqual(12);
    expect(layout.propCount).toBeGreaterThanOrEqual(30);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildBaugLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildBaugLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildBaugLayout(42);
    const b = buildBaugLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.props.at(-1)).toEqual(b.props.at(-1));
  });
});

describe("getBaugAnchors / getBaugHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getBaugAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the island from the gate side", () => {
    const home = getBaugHomeView();
    expect(home.radius).toBeGreaterThan(20);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getBaugPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getBaugPalette("dusk").lantern).toBeGreaterThan(getBaugPalette("dawn").lantern);
    expect(getBaugPalette("golden").sunIntensity).toBeGreaterThan(getBaugPalette("dusk").sunIntensity);
  });

  it("evening mode sets the festive lamp flag over a quiet day", () => {
    const day = resolveAtmosphere("golden", "day");
    const eve = resolveAtmosphere("dusk", "evening");
    expect(eve.fest).toBe(1);
    expect(day.fest).toBe(0);
    expect(eve.lantern).toBeGreaterThan(day.lantern);
  });
});

describe("setActive / resetView", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getBaugHomeView();
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
});
