import { describe, it, expect } from "vitest";
import { DAM_FEATURES } from "@/lib/data/khadakwasla-dam";
import {
  FEATURE_ORDER,
  DAM,
  DOWNSTREAM,
  PROMENADE,
  RESERVOIR,
  SINHAGAD,
  SLUICE,
  buildDamLayout,
  getDamAnchors,
  getDamHomeView,
  getDamPalette,
  getDownstreamLevel,
  getWaterLevel,
  inDownstream,
  inReservoir,
  onWall,
  sluiceSpec,
  vendorSpec,
  type DamMode,
  type FeatureId,
  type TimeOfDay,
} from "@/components/places/dam/dam-world";

function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getDamHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getDamAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

function resolveAtmosphere(timeOfDay: TimeOfDay, mode: DamMode) {
  const palette = getDamPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    waterY: getWaterLevel(mode),
    fest: mode === "monsoon" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly five stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(5);
    expect(FEATURE_ORDER).toEqual([
      "dam-wall",
      "reservoir",
      "sluice-gates",
      "promenade",
      "sinhagad-hill",
    ]);
  });

  it("aligns 1:1 with DAM_FEATURES content ids (same set, same order)", () => {
    const contentIds = DAM_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = DAM_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("dam layout geometry", () => {
  it("spans a long dam wall across the valley", () => {
    expect(DAM.halfW).toBeGreaterThan(20);
    expect(DAM.crestY).toBeGreaterThan(DAM.baseY + 4);
    expect(onWall(0, DAM.z)).toBe(true);
    expect(onWall(DAM.halfW - 1, DAM.z)).toBe(true);
  });

  it("puts the reservoir on one side of the wall", () => {
    expect(RESERVOIR.zFront).toBeLessThan(DAM.z);
    expect(RESERVOIR.zBack).toBeLessThan(RESERVOIR.zFront);
    expect(inReservoir(0, -20)).toBe(true);
    expect(inReservoir(0, 10)).toBe(false);
    expect(inDownstream(0, 10)).toBe(true);
  });

  it("sets eleven sluice gates in the wall", () => {
    expect(SLUICE.count).toBe(11);
    for (let i = 0; i < SLUICE.count; i++) {
      const s = sluiceSpec(i);
      expect(onWall(s.x, s.z)).toBe(true);
      expect(Math.abs(s.z - DAM.z)).toBeLessThan(0.2);
    }
    expect(sluiceSpec(0).x).toBeLessThan(sluiceSpec(SLUICE.count - 1).x);
  });

  it("keeps the promenade as a distinct vendor strip", () => {
    expect(PROMENADE.z).toBeGreaterThan(DAM.z);
    expect(PROMENADE.y).toBe(DAM.crestY);
    const v = vendorSpec(0);
    expect(v.z).toBeGreaterThan(DAM.z);
    expect(inReservoir(v.x, v.z)).toBe(false);
  });

  it("places Sinhagad as a separate hill behind the lake", () => {
    expect(SINHAGAD.z).toBeLessThan(RESERVOIR.zFront);
    expect(SINHAGAD.h).toBeGreaterThan(DAM.crestY);
    expect(Math.hypot(SINHAGAD.x - DAM.z, SINHAGAD.z - DAM.z)).toBeGreaterThan(20);
  });
});

describe("buildDamLayout", () => {
  it("returns sluices, vendors and a full prop set", () => {
    const layout = buildDamLayout(1879);
    expect(layout.sluiceCount).toBe(11);
    expect(layout.vendorCount).toBeGreaterThanOrEqual(8);
    expect(layout.propCount).toBeGreaterThanOrEqual(30);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildDamLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildDamLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildDamLayout(42);
    const b = buildDamLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.props.at(-1)).toEqual(b.props.at(-1));
  });
});

describe("getDamAnchors / getDamHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getDamAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the wall from the promenade side", () => {
    const home = getDamHomeView();
    expect(home.radius).toBeGreaterThan(20);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getDamPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getDamPalette("dusk").lantern).toBeGreaterThan(getDamPalette("dawn").lantern);
    expect(getDamPalette("golden").sunIntensity).toBeGreaterThan(getDamPalette("dusk").sunIntensity);
  });

  it("monsoon mode fills the reservoir above the dry season", () => {
    const dry = resolveAtmosphere("golden", "dry");
    const wet = resolveAtmosphere("golden", "monsoon");
    expect(wet.fest).toBe(1);
    expect(dry.fest).toBe(0);
    expect(wet.waterY).toBeGreaterThan(dry.waterY);
    expect(getWaterLevel("monsoon")).toBeGreaterThan(getDownstreamLevel("monsoon"));
    expect(getWaterLevel("monsoon")).toBeLessThan(DAM.crestY);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getDamHomeView();
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

  it("the reservoir target sits on the lake side of the wall", () => {
    const lake = resolveView("reservoir");
    const wall = resolveView("dam-wall");
    expect(lake.target[2]).toBeLessThan(wall.target[2]);
  });
});
