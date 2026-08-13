import { describe, it, expect } from "vitest";
import { CAVE_FEATURES } from "@/lib/data/pataleshwar-cave";
import {
  FEATURE_ORDER,
  CAVE,
  COURT,
  HALL,
  HALL_COL_XS,
  HALL_COL_ZS,
  LINGA,
  NANDI,
  SANCTUM,
  STREET,
  UNFINISHED,
  buildCaveLayout,
  descentStep,
  getCaveAnchors,
  getCaveHomeView,
  getCavePalette,
  nandiPillarSpec,
  terrainHeight,
  type CaveMode,
  type FeatureId,
  type TimeOfDay,
} from "@/components/places/pataleshwar/cave-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getCaveHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getCaveAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: CaveMode) {
  const palette = getCavePalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "aarti" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "sunken-court",
      "nandi-mandapa",
      "cave-mouth",
      "pillared-hall",
      "linga-sanctum",
      "unfinished-work",
    ]);
  });

  it("aligns 1:1 with CAVE_FEATURES content ids (same set, same order)", () => {
    const contentIds = CAVE_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = CAVE_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("cave layout geometry", () => {
  it("sinks the court below the surrounding street", () => {
    expect(COURT.y).toBeLessThan(STREET.y);
    expect(terrainHeight(0, NANDI.z)).toBe(COURT.y);
    expect(terrainHeight(0, 40)).toBeCloseTo(STREET.y, 1);
  });

  it("places the Nandi court in front of the cave mouth", () => {
    expect(NANDI.z).toBeGreaterThan(CAVE.z);
    expect(NANDI.z).toBeLessThan(COURT.zFront);
    expect(terrainHeight(NANDI.x, NANDI.z)).toBe(COURT.y);
  });

  it("places the linga deeper and lower than the Nandi", () => {
    expect(LINGA.z).toBeLessThan(NANDI.z);
    expect(LINGA.y).toBeLessThan(COURT.y);
    expect(SANCTUM.y).toBeLessThan(COURT.y);
    expect(terrainHeight(LINGA.x, LINGA.z)).toBe(SANCTUM.y);
    expect(terrainHeight(LINGA.x, LINGA.z)).toBeLessThan(terrainHeight(NANDI.x, NANDI.z));
  });

  it("rings the Nandi with a circular colonnade", () => {
    expect(NANDI.pillars).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < NANDI.pillars; i++) {
      const p = nandiPillarSpec(i);
      const r = Math.hypot(p.x - NANDI.x, p.z - NANDI.z);
      expect(r).toBeCloseTo(NANDI.r, 5);
      expect(p.y).toBe(COURT.y);
    }
  });

  it("keeps the pillared hall behind the cave mouth", () => {
    expect(HALL.z).toBeLessThan(CAVE.z);
    expect(HALL_COL_XS.length * HALL_COL_ZS.length).toBe(16);
    for (const z of HALL_COL_ZS) {
      expect(z).toBeLessThan(CAVE.z);
    }
  });

  it("descends from the street into the court", () => {
    const top = descentStep(0);
    const bottom = descentStep(8);
    expect(top.y).toBeGreaterThan(bottom.y);
    expect(top.z).toBeGreaterThan(bottom.z);
    expect(top.y).toBeGreaterThan(COURT.y);
    expect(bottom.y).toBeLessThan(STREET.y);
  });
});

describe("buildCaveLayout", () => {
  it("returns a circular Nandi, a hall grid, and street buildings", () => {
    const layout = buildCaveLayout(800);
    expect(layout.nandiPillarCount).toBe(12);
    expect(layout.hallColumnCount).toBe(16);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.buildingCount).toBeGreaterThanOrEqual(16);
    expect(layout.props.length).toBe(layout.propCount);
    expect(layout.buildings.length).toBe(layout.buildingCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildCaveLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildCaveLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildCaveLayout(42);
    const b = buildCaveLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.buildingCount).toBe(b.buildingCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.buildings[0]).toEqual(b.buildings[0]);
  });

  it("keeps street buildings out of the court and the cave", () => {
    const layout = buildCaveLayout();
    for (const b of layout.buildings) {
      const inPit = Math.abs(b.x) < COURT.halfW && b.z > COURT.zBack && b.z < COURT.zFront;
      expect(inPit).toBe(false);
      const inCave = Math.abs(b.x) < HALL.w / 2 && b.z < CAVE.z && b.z > HALL.z - HALL.d / 2;
      expect(inCave).toBe(false);
    }
  });

  it("keeps unfinished stubs inside the hall, east of the aisle", () => {
    for (const s of UNFINISHED) {
      expect(s.z).toBeLessThan(CAVE.z);
      expect(s.x).toBeGreaterThan(0);
    }
  });
});

describe("getCaveAnchors / getCaveHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getCaveAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the street rim and the sunken court", () => {
    const home = getCaveHomeView();
    expect(home.radius).toBeGreaterThan(30);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    // Looking from the street (+Z) side down into the court.
    expect(home.target[2]).toBeGreaterThan(0);
    expect(home.target[1]).toBeLessThan(STREET.y + 2);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getCavePalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getCavePalette("dusk").lantern).toBeGreaterThan(getCavePalette("dawn").lantern);
    expect(getCavePalette("golden").sunIntensity).toBeGreaterThan(
      getCavePalette("dusk").sunIntensity,
    );
  });

  it("aarti mode sets the lamp flag over a darshan day", () => {
    const darshan = resolveAtmosphere("golden", "darshan");
    const aarti = resolveAtmosphere("golden", "aarti");
    expect(aarti.fest).toBe(1);
    expect(darshan.fest).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getCaveHomeView();
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

  it("the linga target sits deeper and lower than the Nandi target", () => {
    const linga = resolveView("linga-sanctum");
    const nandi = resolveView("nandi-mandapa");
    expect(linga.target[2]).toBeLessThan(nandi.target[2]);
    expect(linga.target[1]).toBeLessThan(nandi.target[1]);
  });
});

describe("building constants", () => {
  it("describes a rock-cut cave, not a built-up shikhara temple", () => {
    expect(COURT.y).toBeLessThan(0);
    expect(NANDI.r).toBeGreaterThan(4);
    expect(HALL.colH).toBeGreaterThan(3);
    expect(SANCTUM.y).toBeLessThan(COURT.y);
    expect(CAVE.z).toBeLessThan(NANDI.z);
  });
});
