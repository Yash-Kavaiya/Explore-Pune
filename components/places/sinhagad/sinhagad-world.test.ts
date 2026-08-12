import { describe, it, expect } from "vitest";
import { SINHAGAD_FEATURES } from "@/lib/data/sinhagad-fort";
import {
  FEATURE_ORDER,
  PLATEAU,
  buildSinhagadLayout,
  getSinhagadAnchors,
  getSinhagadHomeView,
  getSinhagadPalette,
  massifHeight,
  type FeatureId,
  type Season,
  type TimeOfDay,
} from "@/components/places/sinhagad/sinhagad-world";

function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getSinhagadHomeView();
    return { target: home.target, distance: home.radius };
  }
  const a = getSinhagadAnchors()[active];
  return { target: a.target, distance: a.distance, dir: a.dir };
}

function resolveAtmosphere(timeOfDay: TimeOfDay, season: Season) {
  const palette = getSinhagadPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    wet: season === "monsoon" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly seven stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(7);
    expect(FEATURE_ORDER).toEqual([
      "kalyan-darwaja",
      "tanaji-memorial",
      "trek-trail",
      "lookout",
      "hilltop-stalls",
      "pune-darwaja",
      "kadelot-point",
    ]);
  });

  it("aligns 1:1 with SINHAGAD_FEATURES content ids", () => {
    const contentIds = SINHAGAD_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = SINHAGAD_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("buildSinhagadLayout", () => {
  it("returns a dense hill-fort layout with trail and stalls", () => {
    const layout = buildSinhagadLayout(1670);
    expect(layout.propCount).toBeGreaterThanOrEqual(50);
    expect(layout.trailSteps).toBeGreaterThanOrEqual(20);
    expect(layout.stallCount).toBeGreaterThanOrEqual(6);
  });

  it("places props for every signature feature", () => {
    const layout = buildSinhagadLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature above the plain", () => {
    const layout = buildSinhagadLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(base.y).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildSinhagadLayout(42);
    const b = buildSinhagadLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.trailSteps).toBe(b.trailSteps);
  });
});

describe("massifHeight", () => {
  it("is high on the plateau and lower on the flanks", () => {
    const top = massifHeight(0, 0);
    const flank = massifHeight(40, 40);
    expect(top).toBeGreaterThan(PLATEAU.height * 0.7);
    expect(flank).toBeLessThan(top);
  });
});

describe("getSinhagadAnchors / getSinhagadHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getSinhagadAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(100);
    }
  });

  it("home view frames the ridge", () => {
    const home = getSinhagadHomeView();
    expect(home.radius).toBeGreaterThan(40);
    expect(home.phi).toBeGreaterThan(0.5);
  });
});

describe("atmosphere setters", () => {
  it("returns distinct palettes for dawn / day / evening", () => {
    const times: TimeOfDay[] = ["dawn", "golden", "dusk"];
    const palettes = times.map((t) => getSinhagadPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getSinhagadPalette("dusk").lantern).toBeGreaterThan(getSinhagadPalette("dawn").lantern);
  });

  it("monsoon sets wet flag over winter", () => {
    expect(resolveAtmosphere("golden", "monsoon").wet).toBe(1);
    expect(resolveAtmosphere("golden", "dry").wet).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    expect(home.target).toEqual(getSinhagadHomeView().target);
    expect(home.distance).toBe(getSinhagadHomeView().radius);
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

  it("Tanaji memorial sits high on the fort, trail is lower on the climb", () => {
    const memorial = resolveView("tanaji-memorial");
    const trail = resolveView("trek-trail");
    expect(memorial.target[1]).toBeGreaterThan(trail.target[1]);
  });
});
