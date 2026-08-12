import { describe, it, expect } from "vitest";
import { LAL_MAHAL_FEATURES } from "@/lib/data/lal-mahal";
import {
  FEATURE_ORDER,
  HALF_W,
  HALF_D,
  STOREY,
  PLINTH,
  GARDEN_COURT,
  buildMahalLayout,
  getMahalAnchors,
  getMahalHomeView,
  getMahalPalette,
  type FeatureId,
  type Season,
  type TimeOfDay,
} from "@/components/places/lalmahal/mahal-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getMahalHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getMahalAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setSeason. */
function resolveAtmosphere(timeOfDay: TimeOfDay, season: Season) {
  const palette = getMahalPalette(timeOfDay);
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
      "red-palace",
      "jijabai-wing",
      "shaista-hall",
      "gallery",
      "garden",
      "entrance",
    ]);
  });

  it("aligns 1:1 with LAL_MAHAL_FEATURES content ids (same set, same order)", () => {
    const contentIds = LAL_MAHAL_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = LAL_MAHAL_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(20);
    }
  });
});

describe("buildMahalLayout", () => {
  it("returns dense grounds + interior props", () => {
    const layout = buildMahalLayout(1630);
    expect(layout.propCount).toBeGreaterThanOrEqual(60);
    expect(layout.props.length).toBe(layout.propCount);
    expect(layout.treeCount).toBeGreaterThanOrEqual(12);
  });

  it("places props for every signature feature", () => {
    const layout = buildMahalLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildMahalLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildMahalLayout(42);
    const b = buildMahalLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.treeCount).toBe(b.treeCount);
  });

  it("keeps garden hedges near the garden court", () => {
    const layout = buildMahalLayout();
    const hedges = layout.props.filter((p) => p.kind === "hedge" && p.feature === "garden");
    expect(hedges.length).toBeGreaterThanOrEqual(8);
    for (const h of hedges) {
      expect(Math.hypot(h.x - GARDEN_COURT.x, h.z - GARDEN_COURT.z)).toBeLessThan(
        GARDEN_COURT.radius + 4,
      );
    }
  });
});

describe("getMahalAnchors / getMahalHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getMahalAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(100);
    }
  });

  it("home view frames the red palace front", () => {
    const home = getMahalHomeView();
    expect(home.radius).toBeGreaterThan(30);
    expect(home.phi).toBeGreaterThan(0.2);
    expect(home.phi).toBeLessThan(Math.PI / 2);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setSeason)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / day / evening", () => {
    const palettes = times.map((t) => getMahalPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getMahalPalette("dusk").lantern).toBeGreaterThan(getMahalPalette("dawn").lantern);
    expect(getMahalPalette("golden").sunIntensity).toBeGreaterThan(
      getMahalPalette("dusk").sunIntensity,
    );
  });

  it("monsoon sets wet flag over dry winter", () => {
    const dry = resolveAtmosphere("golden", "dry");
    const wet = resolveAtmosphere("golden", "monsoon");
    expect(wet.wet).toBe(1);
    expect(dry.wet).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getMahalHomeView();
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

  it("shaista hall sits higher than garden ground; entrance is forward of palace", () => {
    const hall = resolveView("shaista-hall");
    const garden = resolveView("garden");
    const entrance = resolveView("entrance");
    expect(hall.target[1]).toBeGreaterThan(garden.target[1]);
    expect(entrance.target[2]).toBeLessThan(0);
  });
});

describe("building constants", () => {
  it("describes a modest two-storey red palace shell", () => {
    expect(HALF_W).toBeGreaterThan(HALF_D * 0.5);
    expect(STOREY).toBeGreaterThan(3);
    expect(PLINTH).toBeGreaterThan(0.4);
  });
});
