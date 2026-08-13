import { describe, it, expect } from "vitest";
import { MEMORIAL_FEATURES } from "@/lib/data/national-war-memorial";
import {
  FEATURE_ORDER,
  ARMOR,
  COLUMN,
  FLAME,
  GUNS,
  LAWN,
  MIG,
  MIG_H,
  MUSEUM,
  PLAZA,
  SHIP_H,
  TANK_H,
  TANKS,
  TRISHUL,
  buildMemorialLayout,
  flameDistanceFromColumn,
  getMemorialAnchors,
  getMemorialHomeView,
  getMemorialPalette,
  gunSpec,
  inPlaza,
  tankSpec,
  terrainHeight,
  type FeatureId,
  type MemorialMode,
  type TimeOfDay,
} from "@/components/places/memorial/memorial-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getMemorialHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getMemorialAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: MemorialMode) {
  const palette = getMemorialPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "ceremony" ? 1 : 0,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "memorial-column",
      "eternal-flame",
      "armor-park",
      "mig-23bn",
      "ins-trishul",
      "command-museum",
    ]);
  });

  it("aligns 1:1 with MEMORIAL_FEATURES content ids (same set, same order)", () => {
    const contentIds = MEMORIAL_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = MEMORIAL_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("memorial layout geometry", () => {
  it("places the column as the tallest central monument", () => {
    expect(COLUMN.x).toBe(0);
    expect(COLUMN.z).toBe(0);
    expect(COLUMN.h).toBeGreaterThan(TANK_H);
    expect(COLUMN.h).toBeGreaterThan(MIG_H);
    expect(COLUMN.h).toBeGreaterThan(SHIP_H);
    expect(COLUMN.h).toBeGreaterThan(MUSEUM.h);
    expect(COLUMN.h).toBeGreaterThanOrEqual(24);
  });

  it("sits the eternal flame at the foot of the column", () => {
    expect(flameDistanceFromColumn()).toBeLessThan(6);
    expect(FLAME.y).toBeLessThan(COLUMN.h / 4);
    expect(inPlaza(FLAME.x, FLAME.z)).toBe(true);
  });

  it("keeps outdoor armour and the aircraft as distinct markers", () => {
    const armourToMig = Math.hypot(MIG.x - ARMOR.x, MIG.z - ARMOR.z);
    expect(armourToMig).toBeGreaterThan(20);
    expect(MIG.x).toBeGreaterThan(0);
    expect(ARMOR.x).toBeLessThan(0);
    expect(inPlaza(MIG.x, MIG.z)).toBe(false);
    expect(inPlaza(ARMOR.x, ARMOR.z)).toBe(false);
  });

  it("keeps the museum and ship off the plaza as separate grounds features", () => {
    expect(inPlaza(MUSEUM.x, MUSEUM.z)).toBe(false);
    expect(inPlaza(TRISHUL.x, TRISHUL.z)).toBe(false);
    expect(Math.hypot(MUSEUM.x - COLUMN.x, MUSEUM.z - COLUMN.z)).toBeGreaterThan(PLAZA.r + 4);
    expect(MUSEUM.z).toBeLessThan(COLUMN.z);
  });

  it("keeps tanks and guns in the west armour park", () => {
    expect(TANKS.length).toBeGreaterThanOrEqual(2);
    expect(GUNS.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < TANKS.length; i++) {
      const t = tankSpec(i);
      expect(t.x).toBeLessThan(0);
      expect(t.y).toBe(LAWN.y);
      expect(Math.hypot(t.x - ARMOR.x, t.z - ARMOR.z)).toBeLessThan(14);
    }
    for (let i = 0; i < GUNS.length; i++) {
      const g = gunSpec(i);
      expect(g.x).toBeLessThan(0);
    }
  });
});

describe("buildMemorialLayout", () => {
  it("returns tanks, guns and a full prop set", () => {
    const layout = buildMemorialLayout(1998);
    expect(layout.tankCount).toBe(TANKS.length);
    expect(layout.gunCount).toBe(GUNS.length);
    expect(layout.propCount).toBeGreaterThanOrEqual(40);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildMemorialLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildMemorialLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
    expect(layout.markerBases["memorial-column"].y).toBeGreaterThan(
      layout.markerBases["eternal-flame"].y,
    );
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildMemorialLayout(42);
    const b = buildMemorialLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.props.at(-1)).toEqual(b.props.at(-1));
  });

  it("keeps trees off the plaza and the hardware pads", () => {
    const layout = buildMemorialLayout();
    for (const p of layout.props.filter((item) => item.kind === "tree")) {
      expect(inPlaza(p.x, p.z)).toBe(false);
      expect(Math.hypot(p.x - MIG.x, p.z - MIG.z)).toBeGreaterThan(8);
      expect(Math.hypot(p.x - ARMOR.x, p.z - ARMOR.z)).toBeGreaterThan(10);
    }
  });
});

describe("getMemorialAnchors / getMemorialHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getMemorialAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the column from the gate side", () => {
    const home = getMemorialHomeView();
    expect(home.radius).toBeGreaterThan(30);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getMemorialPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getMemorialPalette("dusk").lantern).toBeGreaterThan(getMemorialPalette("dawn").lantern);
    expect(getMemorialPalette("golden").sunIntensity).toBeGreaterThan(
      getMemorialPalette("dusk").sunIntensity,
    );
  });

  it("ceremony mode sets the show flag over a daylight visit", () => {
    const day = resolveAtmosphere("golden", "daylight");
    const show = resolveAtmosphere("dusk", "ceremony");
    expect(show.fest).toBe(1);
    expect(day.fest).toBe(0);
    expect(show.lantern).toBeGreaterThan(day.lantern);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getMemorialHomeView();
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

  it("the flame target sits lower and closer to the column than the museum", () => {
    const flame = resolveView("eternal-flame");
    const museum = resolveView("command-museum");
    const column = resolveView("memorial-column");
    expect(flame.target[1]).toBeLessThan(column.target[1]);
    expect(Math.hypot(flame.target[0], flame.target[2])).toBeLessThan(
      Math.hypot(museum.target[0] - COLUMN.x, museum.target[2] - COLUMN.z),
    );
  });
});

describe("terrainHeight", () => {
  it("raises the plaza above the surrounding lawn", () => {
    expect(terrainHeight(0, 0)).toBeGreaterThan(terrainHeight(0, 40) - 0.05);
    expect(terrainHeight(COLUMN.x, COLUMN.z)).toBeGreaterThanOrEqual(PLAZA.y * 0.5);
  });
});
