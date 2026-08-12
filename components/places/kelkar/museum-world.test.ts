import { describe, it, expect } from "vitest";
import { MUSEUM_FEATURES } from "@/lib/data/kelkar-museum";
import {
  BUILDING,
  FEATURE_ORDER,
  buildMuseumLayout,
  getMuseumAnchors,
  getMuseumHomeView,
  getMuseumPalette,
  type FeatureId,
  type MuseumMode,
  type TimeOfDay,
} from "@/components/places/kelkar/museum-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getMuseumHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getMuseumAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode lantern blending. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: MuseumMode) {
  const palette = getMuseumPalette(timeOfDay);
  const eveningBoost = mode === "evening" ? 0.35 : 0;
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern + eveningBoost,
    sunIntensity: palette.sunIntensity,
    exposure: palette.exposure,
    evening: mode === "evening" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids in display order", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "mastani-mahal",
      "lamps-gallery",
      "musical-instruments",
      "betel-cutters",
      "carved-doors",
      "armoury",
    ]);
  });

  it("aligns 1:1 with MUSEUM_FEATURES content ids (same set, same order)", () => {
    const contentIds = MUSEUM_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = MUSEUM_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe("buildMuseumLayout", () => {
  it("returns three floors with rooms and dense exhibit props", () => {
    const layout = buildMuseumLayout(2026);
    expect(layout.floors).toHaveLength(3);
    expect(layout.floors[0].y).toBe(BUILDING.plinthH);
    expect(layout.floors[1].y).toBe(BUILDING.plinthH + BUILDING.floorH);
    expect(layout.floors[2].y).toBe(BUILDING.plinthH + BUILDING.floorH * 2);
    // Packed museum, not a hollow box — require substantial prop density.
    expect(layout.propCount).toBeGreaterThanOrEqual(100);
    expect(layout.exhibits.length).toBe(layout.propCount);
  });

  it("places exhibits for every signature feature", () => {
    const layout = buildMuseumLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.exhibits.filter((e) => e.feature === id).length;
      expect(count, `no exhibits tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature above their floor", () => {
    const layout = buildMuseumLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
      expect(base.y).toBeGreaterThan(BUILDING.plinthH);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildMuseumLayout(42);
    const b = buildMuseumLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.exhibits[0]).toEqual(b.exhibits[0]);
    expect(a.exhibits[a.exhibits.length - 1]).toEqual(b.exhibits[b.exhibits.length - 1]);
  });
});

describe("getMuseumAnchors / getMuseumHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getMuseumAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(5);
      expect(a.distance).toBeLessThan(80);
    }
  });

  it("home view frames the multi-storey shell", () => {
    const home = getMuseumHomeView();
    expect(home.radius).toBeGreaterThan(20);
    expect(home.phi).toBeGreaterThan(0.2);
    expect(home.phi).toBeLessThan(Math.PI / 2);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / day / evening", () => {
    const palettes = times.map((t) => getMuseumPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getMuseumPalette("dusk").lantern).toBeGreaterThan(getMuseumPalette("dawn").lantern);
    expect(getMuseumPalette("golden").sunIntensity).toBeGreaterThan(
      getMuseumPalette("dusk").sunIntensity,
    );
  });

  it("evening mode boosts lantern level over open hours", () => {
    const open = resolveAtmosphere("golden", "open");
    const evening = resolveAtmosphere("golden", "evening");
    expect(evening.lantern).toBeGreaterThan(open.lantern);
    expect(evening.evening).toBe(1);
    expect(open.evening).toBe(0);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getMuseumHomeView();
    expect(home.target).toEqual(overview.target);
    expect(home.distance).toBe(overview.radius);
  });

  it("selecting each feature focuses a different target than home", () => {
    const home = resolveView(null);
    for (const id of FEATURE_ORDER) {
      const view = resolveView(id);
      expect(view.distance).not.toBe(home.distance);
      // At least one axis of the look-at should differ from the overview.
      const same =
        view.target[0] === home.target[0] &&
        view.target[1] === home.target[1] &&
        view.target[2] === home.target[2];
      expect(same, `${id} should not reuse home target`).toBe(false);
    }
  });

  it("Mastani Mahal looks at the upper floor", () => {
    const mastani = resolveView("mastani-mahal");
    const doors = resolveView("carved-doors");
    expect(mastani.target[1]).toBeGreaterThan(doors.target[1]);
  });
});

describe("building constants", () => {
  it("describes a multi-storey shell", () => {
    expect(BUILDING.floors).toBe(3);
    expect(BUILDING.floorH).toBeGreaterThan(3);
    expect(BUILDING.halfW).toBeGreaterThan(8);
    expect(BUILDING.halfD).toBeGreaterThan(6);
  });
});
