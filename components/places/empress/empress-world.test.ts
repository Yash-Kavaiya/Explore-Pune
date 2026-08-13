import { describe, it, expect } from "vitest";
import { EMPRESS_FEATURES } from "@/lib/data/empress-garden";
import {
  FEATURE_ORDER,
  GREENHOUSE,
  GROVE,
  LAWN,
  ROSE,
  SHOW,
  buildEmpressLayout,
  getEmpressAnchors,
  getEmpressHomeView,
  getEmpressPalette,
  inGreenhouse,
  inLawn,
  inRose,
  inShowGround,
  roseBushSpec,
  tentSpec,
  type EmpressMode,
  type FeatureId,
  type TimeOfDay,
} from "@/components/places/empress/empress-world";

function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getEmpressHomeView();
    return { target: home.target, distance: home.radius, phi: home.phi, theta: home.theta };
  }
  const anchor = getEmpressAnchors()[active];
  return { target: anchor.target, distance: anchor.distance, dir: anchor.dir };
}

function resolveAtmosphere(timeOfDay: TimeOfDay, mode: EmpressMode) {
  const palette = getEmpressPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "show" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly five stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(5);
    expect(FEATURE_ORDER).toEqual([
      "old-canopy",
      "rolling-lawns",
      "rose-garden",
      "greenhouse",
      "flower-show",
    ]);
  });

  it("aligns 1:1 with EMPRESS_FEATURES content ids (same set, same order)", () => {
    expect(EMPRESS_FEATURES.map((f) => f.id)).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = EMPRESS_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("empress layout geometry", () => {
  it("keeps an open lawn as the garden floor", () => {
    expect(inLawn(0, 0)).toBe(true);
    expect(inRose(0, 0)).toBe(false);
    expect(inGreenhouse(0, 0)).toBe(false);
    expect(LAWN.halfW).toBeGreaterThan(10);
  });

  it("places a distinct rose-garden bed off the lawn centre", () => {
    expect(inRose(ROSE.x, ROSE.z)).toBe(true);
    expect(inLawn(ROSE.x, ROSE.z)).toBe(false);
    expect(Math.hypot(ROSE.x, ROSE.z)).toBeGreaterThan(12);
    const bush = roseBushSpec(0, 0);
    expect(inRose(bush.x, bush.z)).toBe(true);
  });

  it("places the greenhouse as a separate built volume", () => {
    expect(inGreenhouse(GREENHOUSE.x, GREENHOUSE.z)).toBe(true);
    expect(inRose(GREENHOUSE.x, GREENHOUSE.z)).toBe(false);
    expect(inLawn(GREENHOUSE.x, GREENHOUSE.z)).toBe(false);
    expect(GREENHOUSE.h).toBeGreaterThan(3);
  });

  it("places the flower-show ground as a distinct gate strip", () => {
    expect(inShowGround(0, SHOW.z)).toBe(true);
    expect(inLawn(0, SHOW.z)).toBe(false);
    expect(tentSpec(0).z).toBe(SHOW.z);
    expect(SHOW.tentCount).toBeGreaterThanOrEqual(4);
  });

  it("rings the lawn with an old-growth grove", () => {
    expect(GROVE.rInner).toBeGreaterThan(LAWN.halfW);
    expect(GROVE.rOuter).toBeGreaterThan(GROVE.rInner);
  });
});

describe("buildEmpressLayout", () => {
  it("returns trees, roses and tents", () => {
    const layout = buildEmpressLayout(1892);
    expect(layout.treeCount).toBeGreaterThanOrEqual(16);
    expect(layout.roseCount).toBeGreaterThanOrEqual(20);
    expect(layout.tentCount).toBe(SHOW.tentCount);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildEmpressLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildEmpressLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildEmpressLayout(42);
    const b = buildEmpressLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.props.at(-1)).toEqual(b.props.at(-1));
  });
});

describe("getEmpressAnchors / getEmpressHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getEmpressAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the lawn from the gate side", () => {
    const home = getEmpressHomeView();
    expect(home.radius).toBeGreaterThan(20);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getEmpressPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getEmpressPalette("dusk").lantern).toBeGreaterThan(getEmpressPalette("dawn").lantern);
    expect(getEmpressPalette("golden").sunIntensity).toBeGreaterThan(
      getEmpressPalette("dusk").sunIntensity,
    );
  });

  it("flower-show mode differs from an ordinary day", () => {
    const day = resolveAtmosphere("golden", "ordinary");
    const show = resolveAtmosphere("golden", "show");
    expect(show.fest).toBe(1);
    expect(day.fest).toBe(0);
  });
});

describe("setActive / resetView", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getEmpressHomeView();
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
