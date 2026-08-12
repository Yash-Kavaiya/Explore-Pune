import { describe, it, expect } from "vitest";
import { TEMPLE_FEATURES } from "@/lib/data/dagdusheth-temple";
import {
  FEATURE_ORDER,
  GATE,
  JAGATI,
  MANDAP,
  SANCTUM,
  DEEPMALAS,
  buildTempleLayout,
  getTempleAnchors,
  getTempleHomeView,
  getTemplePalette,
  type FeatureId,
  type TempleMode,
  type TimeOfDay,
} from "@/components/places/temple/temple-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getTempleHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getTempleAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: TempleMode) {
  const palette = getTemplePalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "utsav" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "mahadwar",
      "ganesh-idol",
      "sabha-mandap",
      "deepmalas",
      "courtyard",
      "ganeshotsav",
    ]);
  });

  it("aligns 1:1 with TEMPLE_FEATURES content ids (same set, same order)", () => {
    const contentIds = TEMPLE_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = TEMPLE_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("buildTempleLayout", () => {
  it("returns dense precinct props with mandap columns and twin deepmalas", () => {
    const layout = buildTempleLayout(1893);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.columnCount).toBe(16);
    expect(layout.deepmalaCount).toBe(2);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildTempleLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildTempleLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildTempleLayout(42);
    const b = buildTempleLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.columnCount).toBe(b.columnCount);
  });

  it("keeps deepmalas in the courtyard in front of the mandap", () => {
    for (const d of DEEPMALAS) {
      expect(d.z).toBeGreaterThan(MANDAP.z);
      expect(d.z).toBeLessThan(GATE.z);
    }
  });
});

describe("getTempleAnchors / getTempleHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getTempleAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(100);
    }
  });

  it("home view frames the street approach and shikhara", () => {
    const home = getTempleHomeView();
    expect(home.radius).toBeGreaterThan(40);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    // Looking from the street (+Z) side toward the temple.
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / day / evening", () => {
    const palettes = times.map((t) => getTemplePalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getTemplePalette("dusk").lantern).toBeGreaterThan(getTemplePalette("dawn").lantern);
    expect(getTemplePalette("golden").sunIntensity).toBeGreaterThan(
      getTemplePalette("dusk").sunIntensity,
    );
  });

  it("utsav mode sets festival flag over darshan day", () => {
    const darshan = resolveAtmosphere("golden", "darshan");
    const utsav = resolveAtmosphere("golden", "utsav");
    expect(utsav.fest).toBe(1);
    expect(darshan.fest).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getTempleHomeView();
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

  it("idol is deeper in the sanctum than the mahadwar at the street", () => {
    const idol = resolveView("ganesh-idol");
    const gate = resolveView("mahadwar");
    expect(idol.target[2]).toBeLessThan(gate.target[2]);
  });
});

describe("building constants", () => {
  it("describes a precinct with mandap, sanctum and street gate", () => {
    expect(JAGATI.w).toBeGreaterThan(20);
    expect(SANCTUM.h).toBeGreaterThan(5);
    expect(MANDAP.colH).toBeGreaterThan(3);
    expect(GATE.z).toBeGreaterThan(MANDAP.z);
  });
});
