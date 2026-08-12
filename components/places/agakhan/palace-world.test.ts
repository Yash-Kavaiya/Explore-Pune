import { describe, it, expect } from "vitest";
import { PALACE_FEATURES } from "@/lib/data/aga-khan-palace";
import {
  FEATURE_ORDER,
  HALF_W,
  HALF_D,
  STOREY,
  PLINTH,
  SAMADHI_COURT,
  buildPalaceLayout,
  getPalaceAnchors,
  getPalaceHomeView,
  getPalacePalette,
  type FeatureId,
  type Season,
  type TimeOfDay,
} from "@/components/places/agakhan/palace-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getPalaceHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getPalaceAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setSeason. */
function resolveAtmosphere(timeOfDay: TimeOfDay, season: Season) {
  const palette = getPalacePalette(timeOfDay);
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
      "facade",
      "arcade",
      "gandhi-room",
      "samadhis",
      "lawns",
      "museum",
    ]);
  });

  it("aligns 1:1 with PALACE_FEATURES content ids (same set, same order)", () => {
    const contentIds = PALACE_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = PALACE_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("buildPalaceLayout", () => {
  it("returns dense grounds + interior props", () => {
    const layout = buildPalaceLayout(1892);
    expect(layout.propCount).toBeGreaterThanOrEqual(80);
    expect(layout.props.length).toBe(layout.propCount);
    expect(layout.archCount).toBeGreaterThanOrEqual(8);
  });

  it("places props for every signature feature", () => {
    const layout = buildPalaceLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildPalaceLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildPalaceLayout(42);
    const b = buildPalaceLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.archCount).toBe(b.archCount);
  });

  it("keeps samadhis in the eastern grounds court", () => {
    const layout = buildPalaceLayout();
    const samadhis = layout.props.filter((p) => p.kind === "samadhi");
    expect(samadhis).toHaveLength(2);
    for (const s of samadhis) {
      expect(Math.hypot(s.x - SAMADHI_COURT.x, s.z - SAMADHI_COURT.z)).toBeLessThan(6);
    }
  });
});

describe("getPalaceAnchors / getPalaceHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getPalaceAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(10);
      expect(a.distance).toBeLessThan(100);
    }
  });

  it("home view frames the long palace front", () => {
    const home = getPalaceHomeView();
    expect(home.radius).toBeGreaterThan(40);
    expect(home.phi).toBeGreaterThan(0.2);
    expect(home.phi).toBeLessThan(Math.PI / 2);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setSeason)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / day / evening", () => {
    const palettes = times.map((t) => getPalacePalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getPalacePalette("dusk").lantern).toBeGreaterThan(getPalacePalette("dawn").lantern);
    expect(getPalacePalette("golden").sunIntensity).toBeGreaterThan(
      getPalacePalette("dusk").sunIntensity,
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
    const overview = getPalaceHomeView();
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

  it("Gandhi room is above ground; samadhis sit low in the grounds", () => {
    const room = resolveView("gandhi-room");
    const samadhis = resolveView("samadhis");
    expect(room.target[1]).toBeGreaterThan(samadhis.target[1]);
  });
});

describe("building constants", () => {
  it("describes a long two-storey Italianate shell", () => {
    expect(HALF_W).toBeGreaterThan(HALF_D);
    expect(STOREY).toBeGreaterThan(4);
    expect(PLINTH).toBeGreaterThan(0.5);
  });
});
