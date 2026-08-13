/**
 * A hand-built, procedural 3D model of the Pataleshwar Cave Temple.
 *
 * Same approach as the other dioramas (components/places/parvati,
 * components/places/temple): plain three.js, zero external assets, geometry
 * generated at runtime. The model reads the shrine as a visitor does from
 * Jangli Maharaj Road — a sunken monolithic court below the street, a circular
 * Nandi mandapa in that yard, a rectangular cave mouth in the living rock,
 * a pillared hall behind it, and a still-lower linga sanctum.
 *
 * This is a rock-cut cave, not a built-up shikhara temple. Do not reuse the
 * Dagdusheth scene.
 *
 * The "mode" of the scene is an ordinary darshan day, or aarti, when oil
 * lamps fill the hall and sanctum.
 */

import * as THREE from "three";
import {
  SKY_FRAG,
  SKY_VERT,
  clamp,
  damp,
  markerSprite,
  mulberry32,
  radialSprite,
  smoothstep,
  type Palette,
  type TimeOfDay,
} from "@/components/places/three/diorama-core";

export { supportsWebGL } from "@/components/places/three/diorama-core";
export type { TimeOfDay } from "@/components/places/three/diorama-core";

export type FeatureId =
  | "sunken-court"
  | "nandi-mandapa"
  | "cave-mouth"
  | "pillared-hall"
  | "linga-sanctum"
  | "unfinished-work";

/** darshan = an ordinary day, aarti = lamps in the cave. */
export type CaveMode = "darshan" | "aarti";

export type CaveWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type CaveWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: CaveMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "sunken-court",
  "nandi-mandapa",
  "cave-mouth",
  "pillared-hall",
  "linga-sanctum",
  "unfinished-work",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Surrounding street — JM Road sits on this plane. */
export const STREET = { y: 0 };

/** Sunken monolithic court excavated below the street. */
export const COURT = { y: -5.5, halfW: 18, zFront: 28, zBack: 0 };

/** Circular Nandi mandapa standing in the open court, facing the cave. */
export const NANDI = { x: 0, z: 16, r: 6.2, pillars: 12 };

/** Rectangular mouth cut into the living rock at the back of the court. */
export const CAVE = { z: 0, openingW: 11, openingH: 6.8, wallT: 3 };

/** Rock-cut sabha mandap behind the mouth. */
export const HALL = { x: 0, z: -10, w: 22, d: 18, colH: 5.4, ceilH: 6.4 };

/** Still-lower garbhagriha holding the linga. */
export const SANCTUM = { x: 0, z: -23, w: 7.2, d: 7.2, y: -7.4, h: 5 };

/** Shivalinga — deeper (−Z) and lower (Y) than the Nandi. */
export const LINGA = { x: 0, z: -23, y: -6.5 };

/** Stone descent from the street rim into the court. */
export const DESCENT = { z: 26.4, width: 7.6, count: 9, tread: 0.72 };

/** Hall column grid (pure). */
export const HALL_COL_XS = [-7.5, -2.5, 2.5, 7.5] as const;
export const HALL_COL_ZS = [-4, -8, -12, -16] as const;

/** Unfinished stub pillars along the east side of the hall. */
export const UNFINISHED = [
  { x: 9.2, z: -6, h: 2.4 },
  { x: 9.2, z: -10, h: 3.6 },
  { x: 9.2, z: -14, h: 1.6 },
] as const;

export function nandiPillarSpec(i: number): { x: number; y: number; z: number; angle: number } {
  const angle = (i / NANDI.pillars) * Math.PI * 2 - Math.PI / 2;
  return {
    x: NANDI.x + Math.cos(angle) * NANDI.r,
    y: COURT.y,
    z: NANDI.z + Math.sin(angle) * NANDI.r,
    angle,
  };
}

export function hallColumnSpec(ix: number, iz: number): { x: number; y: number; z: number } {
  return {
    x: HALL_COL_XS[ix],
    y: COURT.y,
    z: HALL_COL_ZS[iz],
  };
}

/** Centre of descent step i (0 = top at the street, last = bottom at the court). */
export function descentStep(i: number): { z: number; y: number; tread: number; rise: number } {
  const rise = (STREET.y - COURT.y) / DESCENT.count;
  return {
    z: DESCENT.z - i * DESCENT.tread,
    y: STREET.y - (i + 0.5) * rise,
    tread: DESCENT.tread,
    rise,
  };
}

export function inSanctum(x: number, z: number): boolean {
  return (
    Math.abs(x - SANCTUM.x) < SANCTUM.w / 2 + 0.35 &&
    Math.abs(z - SANCTUM.z) < SANCTUM.d / 2 + 0.35
  );
}

export function inHall(x: number, z: number): boolean {
  return Math.abs(x) < HALL.w / 2 && z < CAVE.z + 0.5 && z > HALL.z - HALL.d / 2;
}

export function inCourt(x: number, z: number): boolean {
  return Math.abs(x) < COURT.halfW && z >= COURT.zBack && z <= COURT.zFront;
}

/**
 * Terrain height at a world XZ. y = 0 is the surrounding street.
 * The Nandi court is sunken; the linga floor is still lower; the massif
 * behind the cave mouth rises above the street.
 */
export function terrainHeight(x: number, z: number): number {
  if (inSanctum(x, z)) return SANCTUM.y;
  if (inHall(x, z)) return COURT.y;
  if (inCourt(x, z)) {
    const inStairs =
      Math.abs(x) < DESCENT.width / 2 &&
      z > DESCENT.z - DESCENT.count * DESCENT.tread - 0.4 &&
      z < DESCENT.z + 0.6;
    if (inStairs) {
      const span = DESCENT.count * DESCENT.tread;
      const t = clamp((z - (DESCENT.z - span)) / span, 0, 1);
      return COURT.y + (STREET.y - COURT.y) * t;
    }
    const edge = Math.min(COURT.halfW - Math.abs(x), COURT.zFront - z);
    if (edge < 1.5) {
      return COURT.y + (STREET.y - COURT.y) * (1 - smoothstep(0, 1.5, edge));
    }
    return COURT.y;
  }

  let h = STREET.y + 0.06 * Math.sin(x * 0.18) * Math.cos(z * 0.16);

  // Rock massif wrapping the cave — rises behind and beside the hall.
  if (z < CAVE.z + 6) {
    const beside = Math.max(0, Math.abs(x) - HALL.w / 2 + 0.4);
    const behind = Math.max(0, HALL.z - HALL.d / 2 - z);
    const towardFace = Math.max(0, CAVE.z + 2 - z);
    const rock = clamp(Math.hypot(beside, behind * 0.7) / 9 + towardFace * 0.04, 0, 1);
    if (beside > 0.2 || behind > 0.2 || z < CAVE.z) {
      h = Math.max(h, STREET.y + 8.5 * smoothstep(0, 1, rock));
    }
  }

  const outside = Math.max(Math.abs(x), Math.abs(z)) - 54;
  if (outside > -1) h -= 16 * smoothstep(-1, 5, outside);

  return h;
}

export type CavePropKind =
  | "nandi-pillar"
  | "hall-column"
  | "unfinished-stub"
  | "court-lamp"
  | "hall-lamp"
  | "sanctum-lamp"
  | "tree"
  | "building";

export type CavePropSpec = {
  kind: CavePropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export type CaveBuildingSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
};

/**
 * Deterministic layout of cave props, street buildings and marker bases.
 * Pure — no three.js objects — so vitest can assert density and feature
 * coverage without WebGL.
 */
export function buildCaveLayout(seed = 800): {
  props: CavePropSpec[];
  propCount: number;
  buildings: CaveBuildingSpec[];
  buildingCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  nandiPillarCount: number;
  hallColumnCount: number;
} {
  const rnd = mulberry32(seed);
  const props: CavePropSpec[] = [];
  const push = (p: CavePropSpec) => props.push(p);

  for (let i = 0; i < NANDI.pillars; i++) {
    const p = nandiPillarSpec(i);
    push({
      kind: "nandi-pillar",
      x: p.x,
      y: p.y,
      z: p.z,
      scale: 1,
      feature: "nandi-mandapa",
    });
  }

  for (let ix = 0; ix < HALL_COL_XS.length; ix++) {
    for (let iz = 0; iz < HALL_COL_ZS.length; iz++) {
      const c = hallColumnSpec(ix, iz);
      push({
        kind: "hall-column",
        x: c.x,
        y: c.y,
        z: c.z,
        scale: 1,
        feature: "pillared-hall",
      });
    }
  }

  for (const s of UNFINISHED) {
    push({
      kind: "unfinished-stub",
      x: s.x,
      y: COURT.y,
      z: s.z,
      scale: s.h / 5.4,
      feature: "unfinished-work",
    });
  }

  // Lamps on the court rim and flanking the cave mouth.
  for (const side of [-1, 1]) {
    push({
      kind: "court-lamp",
      x: side * (COURT.halfW - 1.4),
      y: STREET.y,
      z: 12,
      scale: 1,
      feature: "sunken-court",
    });
    push({
      kind: "court-lamp",
      x: side * (CAVE.openingW / 2 + 1.6),
      y: COURT.y,
      z: CAVE.z + 1.2,
      scale: 1,
      feature: "cave-mouth",
    });
  }

  // Oil lamps hanging in the hall.
  for (const z of [-6, -11, -16]) {
    for (const x of [-4, 4]) {
      push({
        kind: "hall-lamp",
        x,
        y: COURT.y + HALL.ceilH - 1.4,
        z,
        scale: 1,
        feature: "pillared-hall",
      });
    }
  }

  push({
    kind: "sanctum-lamp",
    x: LINGA.x,
    y: LINGA.y + 1.8,
    z: LINGA.z,
    scale: 1.2,
    feature: "linga-sanctum",
  });

  // Trees along the street rim — never in the pit or the cave.
  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 22 && guard < 3000) {
    guard++;
    const x = (rnd() - 0.5) * 96;
    const z = (rnd() - 0.5) * 96;
    if (inCourt(x, z) || inHall(x, z) || inSanctum(x, z)) continue;
    if (Math.abs(x) < COURT.halfW + 3 && z > -6 && z < COURT.zFront + 4) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 48) continue;
    if (z < CAVE.z - 4 && Math.abs(x) < HALL.w / 2 + 8) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z, s: 0.85 + rnd() * 0.55 });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: Math.max(terrainHeight(s.x, s.z), STREET.y),
      z: s.z,
      scale: s.s,
      feature: null,
    });
  }

  // Street blocks ringing the excavation — JM Road, not inside the monument.
  const buildings: CaveBuildingSpec[] = [];
  guard = 0;
  while (buildings.length < 28 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 92;
    const z = (rnd() - 0.5) * 92;
    if (inCourt(x, z) || inHall(x, z) || inSanctum(x, z)) continue;
    if (Math.abs(x) < COURT.halfW + 6 && z > -8 && z < COURT.zFront + 6) continue;
    if (z < CAVE.z && Math.abs(x) < HALL.w / 2 + 10) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 46) continue;
    if (buildings.some((b) => Math.hypot(b.x - x, b.z - z) < 8)) continue;
    buildings.push({
      x,
      z,
      w: 4 + rnd() * 5,
      d: 4 + rnd() * 4.5,
      h: 5 + rnd() * 8,
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "sunken-court": { x: 0, y: COURT.y + 1.2, z: 22 },
    "nandi-mandapa": { x: NANDI.x, y: COURT.y + 4.6, z: NANDI.z },
    "cave-mouth": { x: 0, y: COURT.y + CAVE.openingH + 1.2, z: CAVE.z },
    "pillared-hall": { x: 0, y: COURT.y + HALL.ceilH + 0.8, z: HALL.z },
    "linga-sanctum": { x: LINGA.x, y: LINGA.y + 3.4, z: LINGA.z },
    "unfinished-work": { x: UNFINISHED[1].x, y: COURT.y + 4.2, z: UNFINISHED[1].z },
  };

  return {
    props,
    propCount: props.length,
    buildings,
    buildingCount: buildings.length,
    markerBases,
    nandiPillarCount: NANDI.pillars,
    hallColumnCount: HALL_COL_XS.length * HALL_COL_ZS.length,
  };
}

export function getCaveAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "sunken-court": {
      target: [0, COURT.y + 0.4, 21],
      dir: [0.22, 0.72, 0.66],
      distance: 28,
    },
    "nandi-mandapa": {
      target: [NANDI.x, COURT.y + 1.6, NANDI.z],
      dir: [0.35, 0.48, 0.8],
      distance: 22,
    },
    "cave-mouth": {
      target: [0, COURT.y + 3.2, CAVE.z + 1],
      dir: [0.08, 0.36, 0.93],
      distance: 24,
    },
    "pillared-hall": {
      target: [0, COURT.y + 2.4, HALL.z],
      dir: [0.55, 0.42, 0.72],
      distance: 20,
    },
    "linga-sanctum": {
      target: [LINGA.x, LINGA.y + 1.4, LINGA.z + 1.2],
      dir: [0.04, 0.28, 0.96],
      distance: 14,
    },
    "unfinished-work": {
      target: [8.4, COURT.y + 2.2, -10],
      dir: [0.72, 0.4, 0.56],
      distance: 16,
    },
  };
}

export function getCaveHomeView() {
  return {
    // Street-side approach: the sunken court and Nandi in the near ground,
    // the cave mouth in the rock beyond. No shikhara — this is a hole in the street.
    target: [0, -1.4, 12] as [number, number, number],
    radius: 56,
    phi: 1.08,
    theta: 0.2,
  };
}

export function getCavePalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — cool cave dawn, dry-season gold, lamp-lit dusk           */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#243552",
    skyBottom: "#f0d4b8",
    sun: "#ffd4a4",
    sunIntensity: 2.0,
    hemiSky: "#b4c4dc",
    hemiGround: "#4a4538",
    ambient: 0.78,
    fog: "#e6d2ba",
    waterDeep: "#2b4a52",
    waterShallow: "#6e9aa0",
    lantern: 0.4,
    sunAzimuth: 2.1,
    sunElevation: 0.26,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3a2a52",
    skyBottom: "#ffc484",
    sun: "#ffb868",
    sunIntensity: 2.8,
    hemiSky: "#c8b8d8",
    hemiGround: "#564832",
    ambient: 0.74,
    fog: "#ebc898",
    waterDeep: "#2a4a48",
    waterShallow: "#7eae9a",
    lantern: 0.62,
    sunAzimuth: -0.75,
    sunElevation: 0.3,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060816",
    skyBottom: "#24182e",
    sun: "#6a64b8",
    sunIntensity: 0.28,
    hemiSky: "#222848",
    hemiGround: "#121018",
    ambient: 0.3,
    fog: "#161224",
    waterDeep: "#0a1224",
    waterShallow: "#1e3858",
    lantern: 1,
    sunAzimuth: -1.35,
    sunElevation: 0.04,
    exposure: 1.16,
  },
};

/* ------------------------------------------------------------------ */
/* Layout (runtime anchors from pure helpers)                          */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getCaveAnchors();
  const out = {} as Record<FeatureId, Anchor>;
  for (const id of FEATURE_ORDER) {
    out[id] = {
      target: new THREE.Vector3(...raw[id].target),
      dir: new THREE.Vector3(...raw[id].dir),
      distance: raw[id].distance,
    };
  }
  return out;
}

const ANCHORS: Record<FeatureId, Anchor> = buildAnchors();

const homeRaw = getCaveHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createCaveWorld(
  container: HTMLElement,
  options: CaveWorldOptions,
): CaveWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildCaveLayout();

  /* --- renderer / scene / camera --- */

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    (container.clientWidth || 1) / (container.clientHeight || 1),
    0.4,
    900,
  );
  const fog = new THREE.Fog("#ebc898", 140, 480);
  scene.fog = fog;

  /* --- live palette state --- */

  let paletteTarget = PALETTES.golden;
  const cur = {
    skyTop: new THREE.Color(paletteTarget.skyTop),
    skyBottom: new THREE.Color(paletteTarget.skyBottom),
    sun: new THREE.Color(paletteTarget.sun),
    hemiSky: new THREE.Color(paletteTarget.hemiSky),
    hemiGround: new THREE.Color(paletteTarget.hemiGround),
    fog: new THREE.Color(paletteTarget.fog),
    sunIntensity: paletteTarget.sunIntensity,
    ambient: paletteTarget.ambient,
    lantern: paletteTarget.lantern,
    azimuth: paletteTarget.sunAzimuth,
    elevation: paletteTarget.sunElevation,
    exposure: paletteTarget.exposure,
    fest: 0,
  };

  const sunDir = new THREE.Vector3();
  const updateSunDir = () => {
    const ce = Math.cos(cur.elevation * Math.PI * 0.5);
    sunDir
      .set(
        Math.cos(cur.azimuth) * ce,
        Math.sin(cur.elevation * Math.PI * 0.5),
        Math.sin(cur.azimuth) * ce,
      )
      .normalize();
  };
  updateSunDir();

  /* --- sky --- */

  const skyMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: cur.skyTop },
        bottomColor: { value: cur.skyBottom },
        sunDir: { value: sunDir },
        sunColor: { value: cur.sun },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    }),
  );
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(420, 32, 20)), skyMat));

  /* --- lights --- */

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const caveFill = new THREE.PointLight("#c9a06a", 10, 36, 1.6);
  caveFill.position.set(0, COURT.y + 3.2, -8);
  scene.add(caveFill);

  const sanctumLight = new THREE.PointLight("#ffb45e", 16, 14, 1.7);
  sanctumLight.position.set(LINGA.x, LINGA.y + 1.6, LINGA.z);
  scene.add(sanctumLight);

  /* --- materials --- */

  const basaltMat = track(
    new THREE.MeshStandardMaterial({ color: "#4e4942", roughness: 0.92, metalness: 0.02 }),
  );
  const basaltDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#35312c", roughness: 0.94 }),
  );
  const basaltLightMat = track(
    new THREE.MeshStandardMaterial({ color: "#6e675c", roughness: 0.88 }),
  );
  const courtFloorMat = track(
    new THREE.MeshStandardMaterial({ color: "#7a7266", roughness: 0.9 }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.35, metalness: 0.85 }),
  );
  const lingaMat = track(
    new THREE.MeshStandardMaterial({
      color: "#2a2622",
      roughness: 0.35,
      metalness: 0.18,
      emissive: "#4a3010",
      emissiveIntensity: 0.12,
    }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#55793d", roughness: 0.95, flatShading: true }),
  );
  const cityMat = track(
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0 }),
  );

  /* --- terrain: street, sunken court, rock massif --- */

  const groundGeo = track(new THREE.PlaneGeometry(124, 124, 116, 116));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const streetA = new THREE.Color("#9a9386");
  const streetB = new THREE.Color("#7e786c");
  const courtCol = new THREE.Color("#6d665b");
  const rockA = new THREE.Color("#4a453e");
  const rockB = new THREE.Color("#5c564c");
  const hallCol = new THREE.Color("#3e3a34");
  const sanctumCol = new THREE.Color("#2e2a26");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (inSanctum(x, z)) {
      tmp.copy(sanctumCol);
    } else if (inHall(x, z)) {
      tmp.copy(hallCol).lerp(rockA, colorRnd() * 0.25);
    } else if (inCourt(x, z)) {
      tmp.copy(courtCol).lerp(rockB, colorRnd() * 0.2);
    } else if (z < CAVE.z + 4 && (Math.abs(x) > HALL.w / 2 - 1 || z < CAVE.z)) {
      tmp.copy(rockA).lerp(rockB, colorRnd());
    } else {
      tmp.copy(streetA).lerp(streetB, colorRnd() * 0.6);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const groundMat = track(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(120, 18, 120)), baseMat);
  base.position.y = -15.2;
  scene.add(base);

  /* --- dressed court floor --- */

  {
    const floor = new THREE.Mesh(
      track(new THREE.BoxGeometry(COURT.halfW * 2 - 1.2, 0.18, COURT.zFront - 1.4)),
      courtFloorMat,
    );
    floor.position.set(0, COURT.y + 0.08, (COURT.zFront + 1.2) / 2);
    floor.receiveShadow = true;
    scene.add(floor);
  }

  /* --- descent steps from the street --- */

  {
    const stepGeo = track(new THREE.BoxGeometry(DESCENT.width, 0.42, 1));
    const steps = new THREE.InstancedMesh(stepGeo, basaltLightMat, DESCENT.count);
    steps.castShadow = true;
    steps.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < DESCENT.count; i++) {
      const spec = descentStep(i);
      m.compose(
        new THREE.Vector3(0, spec.y - 0.12, spec.z),
        q,
        new THREE.Vector3(1, 1, spec.tread + 0.12),
      );
      steps.setMatrixAt(i, m);
    }
    steps.instanceMatrix.needsUpdate = true;
    scene.add(steps);

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.55, STREET.y - COURT.y, DESCENT.count * DESCENT.tread + 0.6)),
        basaltDarkMat,
      );
      cheek.position.set(
        side * (DESCENT.width / 2 + 0.35),
        COURT.y + (STREET.y - COURT.y) / 2,
        DESCENT.z - (DESCENT.count * DESCENT.tread) / 2,
      );
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      scene.add(cheek);
    }
  }

  /* --- low stone rim around the pit --- */

  {
    const segGeo = track(new THREE.BoxGeometry(2.2, 0.7, 0.42));
    const count = 36;
    const rim = new THREE.InstancedMesh(segGeo, basaltMat, count);
    rim.castShadow = true;
    rim.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      // Three sides of the court; leave the cave face and the stair gap.
      const perimeter = COURT.halfW * 2 + COURT.zFront * 2;
      const d = t * perimeter;
      let x = 0;
      let z = 0;
      let yaw = 0;
      const left = COURT.zFront;
      const front = COURT.halfW * 2;
      const right = COURT.zFront;
      if (d < left) {
        x = -COURT.halfW;
        z = COURT.zFront - d;
        yaw = Math.PI / 2;
      } else if (d < left + front) {
        const u = d - left;
        x = -COURT.halfW + u;
        z = COURT.zFront;
        yaw = 0;
        if (Math.abs(x) < DESCENT.width / 2 + 1.2) continue;
      } else if (d < left + front + right) {
        const u = d - left - front;
        x = COURT.halfW;
        z = u;
        yaw = Math.PI / 2;
      } else {
        continue;
      }
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, STREET.y + 0.35, z), q, new THREE.Vector3(1, 1, 1));
      rim.setMatrixAt(placed++, m);
    }
    rim.count = placed;
    rim.instanceMatrix.needsUpdate = true;
    scene.add(rim);
  }

  /* --- circular Nandi mandapa --- */

  {
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(NANDI.r, 0.55, 10, 36)),
      basaltLightMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(NANDI.x, COURT.y + 0.22, NANDI.z);
    ring.castShadow = true;
    ring.receiveShadow = true;
    scene.add(ring);

    const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(2.1, 2.3, 0.55, 16)), courtFloorMat);
    plinth.position.set(NANDI.x, COURT.y + 0.32, NANDI.z);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const colGeo = track(new THREE.CylinderGeometry(0.42, 0.5, 3.6, 10));
    const capGeo = track(new THREE.BoxGeometry(1.15, 0.32, 1.15));
    const pillars = new THREE.InstancedMesh(colGeo, basaltMat, NANDI.pillars);
    const caps = new THREE.InstancedMesh(capGeo, basaltDarkMat, NANDI.pillars);
    pillars.castShadow = true;
    pillars.receiveShadow = true;
    caps.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < NANDI.pillars; i++) {
      const p = nandiPillarSpec(i);
      m.compose(new THREE.Vector3(p.x, COURT.y + 1.85, p.z), q, new THREE.Vector3(1, 1, 1));
      pillars.setMatrixAt(i, m);
      e.set(0, -p.angle, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(p.x, COURT.y + 3.7, p.z), q, new THREE.Vector3(1, 1, 1));
      caps.setMatrixAt(i, m);
      q.identity();
    }
    pillars.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    scene.add(pillars);
    scene.add(caps);

    // Nandi facing the cave mouth (−Z).
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 1.05, 2.15)), basaltDarkMat);
    body.position.set(NANDI.x, COURT.y + 1.25, NANDI.z + 0.15);
    body.castShadow = true;
    scene.add(body);
    const haunch = new THREE.Mesh(track(new THREE.BoxGeometry(1.25, 0.7, 0.85)), basaltDarkMat);
    haunch.position.set(NANDI.x, COURT.y + 1.05, NANDI.z + 0.85);
    haunch.castShadow = true;
    scene.add(haunch);
    const head = new THREE.Mesh(track(new THREE.BoxGeometry(0.72, 0.68, 0.78)), basaltDarkMat);
    head.position.set(NANDI.x, COURT.y + 1.55, NANDI.z - 1.05);
    head.castShadow = true;
    scene.add(head);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(track(new THREE.ConeGeometry(0.1, 0.55, 6)), basaltLightMat);
      horn.position.set(NANDI.x + side * 0.28, COURT.y + 2.05, NANDI.z - 1.15);
      horn.rotation.z = side * 0.35;
      horn.rotation.x = -0.4;
      horn.castShadow = true;
      scene.add(horn);
    }
    const hump = new THREE.Mesh(track(new THREE.SphereGeometry(0.42, 10, 8)), basaltDarkMat);
    hump.position.set(NANDI.x, COURT.y + 1.75, NANDI.z + 0.15);
    hump.scale.set(1, 0.7, 1.1);
    hump.castShadow = true;
    scene.add(hump);
  }

  /* --- cave mouth in the living rock --- */

  {
    const wallY = COURT.y + (STREET.y + 8.2 - COURT.y) / 2;
    const wallH = STREET.y + 8.2 - COURT.y;
    const openW = CAVE.openingW;
    const openH = CAVE.openingH;
    const faceZ = CAVE.z + 0.4;

    for (const side of [-1, 1]) {
      const pierW = (HALL.w / 2 + 4 - openW / 2);
      const pier = new THREE.Mesh(track(new THREE.BoxGeometry(pierW, wallH, CAVE.wallT)), basaltMat);
      pier.position.set(side * (openW / 2 + pierW / 2), wallY, faceZ);
      pier.castShadow = true;
      pier.receiveShadow = true;
      scene.add(pier);
    }

    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(openW + 1.2, wallH - openH, CAVE.wallT)),
      basaltMat,
    );
    lintel.position.set(0, COURT.y + openH + (wallH - openH) / 2, faceZ);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    scene.add(lintel);

    const sill = new THREE.Mesh(track(new THREE.BoxGeometry(openW + 0.6, 0.45, 1.8)), basaltLightMat);
    sill.position.set(0, COURT.y + 0.22, faceZ + 0.6);
    sill.castShadow = true;
    sill.receiveShadow = true;
    scene.add(sill);

    // Interior door jambs so the mouth reads as a cut, not a hole in a billboard.
    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, openH, 2.4)), basaltDarkMat);
      jamb.position.set(side * (openW / 2 - 0.15), COURT.y + openH / 2, faceZ - 1.1);
      jamb.castShadow = true;
      scene.add(jamb);
    }
  }

  /* --- pillared hall interior --- */

  {
    const ceil = new THREE.Mesh(
      track(new THREE.BoxGeometry(HALL.w + 1.4, 0.9, HALL.d + 1)),
      basaltDarkMat,
    );
    ceil.position.set(HALL.x, COURT.y + HALL.ceilH + 0.45, HALL.z);
    ceil.castShadow = true;
    ceil.receiveShadow = true;
    scene.add(ceil);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.9, HALL.ceilH, HALL.d + 1)),
        basaltMat,
      );
      wall.position.set(side * (HALL.w / 2 + 0.2), COURT.y + HALL.ceilH / 2, HALL.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    }

    // Back wall of the hall with a doorway down into the sanctum.
    const doorW = 3.6;
    const doorH = 3.8;
    const backZ = HALL.z - HALL.d / 2 - 0.2;
    for (const side of [-1, 1]) {
      const stubW = (HALL.w + 1.4 - doorW) / 2;
      const stub = new THREE.Mesh(track(new THREE.BoxGeometry(stubW, HALL.ceilH, 0.9)), basaltMat);
      stub.position.set(side * (doorW / 2 + stubW / 2), COURT.y + HALL.ceilH / 2, backZ);
      stub.castShadow = true;
      stub.receiveShadow = true;
      scene.add(stub);
    }
    const lintelBack = new THREE.Mesh(
      track(new THREE.BoxGeometry(doorW, HALL.ceilH - doorH, 0.9)),
      basaltMat,
    );
    lintelBack.position.set(0, COURT.y + doorH + (HALL.ceilH - doorH) / 2, backZ);
    lintelBack.castShadow = true;
    scene.add(lintelBack);

    const colGeo = track(new THREE.CylinderGeometry(0.62, 0.72, HALL.colH, 10));
    const capGeo = track(new THREE.BoxGeometry(1.55, 0.38, 1.55));
    const nCols = HALL_COL_XS.length * HALL_COL_ZS.length;
    const columns = new THREE.InstancedMesh(colGeo, basaltLightMat, nCols);
    const caps = new THREE.InstancedMesh(capGeo, basaltDarkMat, nCols);
    columns.castShadow = true;
    columns.receiveShadow = true;
    caps.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let ci = 0;
    for (let ix = 0; ix < HALL_COL_XS.length; ix++) {
      for (let iz = 0; iz < HALL_COL_ZS.length; iz++) {
        const c = hallColumnSpec(ix, iz);
        m.compose(
          new THREE.Vector3(c.x, COURT.y + HALL.colH / 2, c.z),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        columns.setMatrixAt(ci, m);
        m.compose(
          new THREE.Vector3(c.x, COURT.y + HALL.colH + 0.1, c.z),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        caps.setMatrixAt(ci, m);
        ci++;
      }
    }
    columns.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    scene.add(columns);
    scene.add(caps);

    const hallFloor = new THREE.Mesh(
      track(new THREE.BoxGeometry(HALL.w - 0.4, 0.16, HALL.d - 0.4)),
      courtFloorMat,
    );
    hallFloor.position.set(HALL.x, COURT.y + 0.06, HALL.z);
    hallFloor.receiveShadow = true;
    scene.add(hallFloor);
  }

  /* --- unfinished stubs and raw rock --- */

  {
    for (const s of UNFINISHED) {
      const stub = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.7, 0.82, s.h, 8)),
        basaltDarkMat,
      );
      stub.position.set(s.x, COURT.y + s.h / 2, s.z);
      stub.castShadow = true;
      stub.receiveShadow = true;
      scene.add(stub);
    }
    // Living rock mass along the east wall — blocked-out, never carved.
    const boulder = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 4.4, 8.5)), basaltMat);
    boulder.position.set(9.6, COURT.y + 2.2, -10);
    boulder.rotation.y = 0.08;
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    scene.add(boulder);
    const chunk = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 2.6, 3.4)), basaltDarkMat);
    chunk.position.set(8.6, COURT.y + 1.3, -6.2);
    chunk.rotation.y = -0.2;
    chunk.castShadow = true;
    scene.add(chunk);
  }

  /* --- lower linga sanctum --- */

  {
    const cella = new THREE.Mesh(
      track(new THREE.BoxGeometry(SANCTUM.w, SANCTUM.h, SANCTUM.d)),
      basaltDarkMat,
    );
    // Hollowed visually by an inner darker floor + walls, not a solid fill.
    cella.visible = false;
    scene.add(cella);

    const floor = new THREE.Mesh(
      track(new THREE.BoxGeometry(SANCTUM.w, 0.2, SANCTUM.d)),
      basaltMat,
    );
    floor.position.set(SANCTUM.x, SANCTUM.y + 0.1, SANCTUM.z);
    floor.receiveShadow = true;
    scene.add(floor);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.55, SANCTUM.h, SANCTUM.d)),
        basaltMat,
      );
      wall.position.set(side * (SANCTUM.w / 2 - 0.15), SANCTUM.y + SANCTUM.h / 2, SANCTUM.z);
      wall.castShadow = true;
      scene.add(wall);
    }
    const back = new THREE.Mesh(
      track(new THREE.BoxGeometry(SANCTUM.w, SANCTUM.h, 0.55)),
      basaltMat,
    );
    back.position.set(SANCTUM.x, SANCTUM.y + SANCTUM.h / 2, SANCTUM.z - SANCTUM.d / 2 + 0.2);
    back.castShadow = true;
    scene.add(back);
    const ceil = new THREE.Mesh(
      track(new THREE.BoxGeometry(SANCTUM.w, 0.5, SANCTUM.d)),
      basaltDarkMat,
    );
    ceil.position.set(SANCTUM.x, SANCTUM.y + SANCTUM.h, SANCTUM.z);
    scene.add(ceil);

    // Steps down from the hall into the sanctum.
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.32, 0.7)), basaltLightMat);
      step.position.set(
        0,
        COURT.y - (i + 1) * 0.55,
        HALL.z - HALL.d / 2 + 0.8 - i * 0.65,
      );
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    const peetha = new THREE.Mesh(track(new THREE.CylinderGeometry(1.15, 1.25, 0.45, 16)), basaltLightMat);
    peetha.position.set(LINGA.x, SANCTUM.y + 0.42, LINGA.z);
    peetha.castShadow = true;
    scene.add(peetha);
    const yoni = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.05, 0.22, 16)), basaltMat);
    yoni.position.set(LINGA.x, SANCTUM.y + 0.72, LINGA.z);
    scene.add(yoni);
    const pindi = new THREE.Mesh(track(new THREE.SphereGeometry(0.48, 16, 12)), lingaMat);
    pindi.scale.set(1, 1.25, 1);
    pindi.position.set(LINGA.x, LINGA.y, LINGA.z);
    pindi.castShadow = true;
    scene.add(pindi);
  }

  /* --- lamps --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,140,40,0.45)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
    }),
  );
  const caveFlames: THREE.Sprite[] = [];
  const hallLampLights: THREE.PointLight[] = [];
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.1, 2.2, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.2, 0.12, 0.2, 8));
    for (const p of layout.props) {
      if (p.kind === "court-lamp") {
        const pole = new THREE.Mesh(poleGeo, brassMat);
        pole.position.set(p.x, p.y + 1.1, p.z);
        pole.castShadow = true;
        scene.add(pole);
        const cup = new THREE.Mesh(cupGeo, brassMat);
        cup.position.set(p.x, p.y + 2.25, p.z);
        scene.add(cup);
        const flame = new THREE.Sprite(flameMat);
        flame.scale.setScalar(0.8);
        flame.position.set(p.x, p.y + 2.55, p.z);
        scene.add(flame);
        caveFlames.push(flame);
      }
      if (p.kind === "hall-lamp" || p.kind === "sanctum-lamp") {
        const cup = new THREE.Mesh(cupGeo, brassMat);
        cup.position.set(p.x, p.y, p.z);
        scene.add(cup);
        const flame = new THREE.Sprite(flameMat);
        flame.scale.setScalar(p.kind === "sanctum-lamp" ? 1.15 : 0.75);
        flame.position.set(p.x, p.y + 0.35, p.z);
        scene.add(flame);
        caveFlames.push(flame);
        if (p.kind === "hall-lamp") {
          const lamp = new THREE.PointLight("#ffb45e", 4, 10, 2);
          lamp.position.set(p.x, p.y, p.z);
          scene.add(lamp);
          hallLampLights.push(lamp);
        }
      }
    }
  }

  /* --- trees on the street rim --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.26, 0.42, 3.2, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(777);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.6 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.8 - k * 0.7) * t.scale;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.3,
            t.y + (3.8 + k * 1.3) * t.scale,
            t.z + (rnd() - 0.5) * 1.3,
          ),
          q,
          new THREE.Vector3(sc, sc * 0.78, sc),
        );
        canopies.setMatrixAt(ci++, m);
      }
      q.identity();
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    scene.add(trunks);
    scene.add(canopies);
  }

  /* --- street buildings around the rim --- */

  {
    const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const city = new THREE.InstancedMesh(boxGeo, cityMat, layout.buildings.length);
    city.castShadow = true;
    city.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    const tones = ["#b7ac95", "#a79f92", "#c0b49b", "#99938a", "#b0a184"];
    const rnd = mulberry32(64);
    layout.buildings.forEach((b, i) => {
      const gy = Math.max(terrainHeight(b.x, b.z), STREET.y);
      m.compose(new THREE.Vector3(b.x, gy + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
      city.setMatrixAt(i, m);
      color.set(tones[Math.floor(rnd() * tones.length)]);
      city.setColorAt(i, color);
    });
    city.instanceMatrix.needsUpdate = true;
    if (city.instanceColor) city.instanceColor.needsUpdate = true;
    scene.add(city);
  }

  /* --- aarti string of extra lamps across the cave mouth --- */

  const stringLightMat = track(
    new THREE.PointsMaterial({
      size: 0.55,
      map: track(radialSprite("rgba(255,255,255,0.95)", "rgba(255,190,90,0.5)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      opacity: 0,
    }),
  );
  {
    const bulbPositions: number[] = [];
    const bulbCols: number[] = [];
    const bulbColors = ["#ffd27a", "#ff9d5c", "#ff7a7a", "#ffc878"];
    const rnd = mulberry32(108);
    const c = new THREE.Color();
    const a = new THREE.Vector3(-CAVE.openingW / 2 + 0.4, COURT.y + CAVE.openingH - 0.6, CAVE.z + 0.8);
    const b = new THREE.Vector3(CAVE.openingW / 2 - 0.4, COURT.y + CAVE.openingH - 0.6, CAVE.z + 0.8);
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= 0.85 * 4 * t * (1 - t);
      bulbPositions.push(p.x, p.y, p.z);
      c.set(bulbColors[Math.floor(rnd() * bulbColors.length)]);
      bulbCols.push(c.r, c.g, c.b);
    }
    // A second swag inside the hall.
    const a2 = new THREE.Vector3(-6, COURT.y + HALL.ceilH - 0.8, -8);
    const b2 = new THREE.Vector3(6, COURT.y + HALL.ceilH - 0.8, -8);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const p = a2.clone().lerp(b2, t);
      p.y -= 0.55 * 4 * t * (1 - t);
      bulbPositions.push(p.x, p.y, p.z);
      c.set(bulbColors[Math.floor(rnd() * bulbColors.length)]);
      bulbCols.push(c.r, c.g, c.b);
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bulbPositions), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(bulbCols), 3));
    scene.add(new THREE.Points(geo, stringLightMat));
  }

  /* --- hotspot markers --- */

  type Marker = {
    id: FeatureId;
    sprite: THREE.Sprite;
    ring: THREE.Mesh;
    idleTex: THREE.Texture;
    activeTex: THREE.Texture;
    hit: THREE.Mesh;
    base: THREE.Vector3;
  };
  const markers: Marker[] = [];
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  const ringGeo = track(new THREE.RingGeometry(2.2, 2.8, 40));
  const hitGeo = track(new THREE.SphereGeometry(3.2, 10, 8));

  FEATURE_ORDER.forEach((id, i) => {
    const raw = layout.markerBases[id];
    const base = new THREE.Vector3(raw.x, raw.y, raw.z);
    const idleTex = track(markerSprite(String(i + 1), false));
    const activeTex = track(markerSprite(String(i + 1), true));
    const sprite = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: idleTex,
          depthTest: false,
          transparent: true,
          sizeAttenuation: false,
        }),
      ),
    );
    sprite.scale.setScalar(0.055);
    sprite.position.copy(base).add(new THREE.Vector3(0, 4, 0));
    sprite.renderOrder = 20;
    scene.add(sprite);

    const ring = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: "#f7e3c8",
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(base).add(new THREE.Vector3(0, 0.25, 0));
    ring.renderOrder = 19;
    scene.add(ring);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);

    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  /* --- camera rig --- */

  const spherical = { radius: 280, phi: 0.42, theta: HOME.theta - 0.85 };
  const desired = { radius: HOME.radius, phi: HOME.phi, theta: HOME.theta };
  const target = HOME.target.clone();
  const desiredTarget = HOME.target.clone();
  let intro = options.reducedMotion ? 1 : 0;
  let autoRotate = true;
  let idleTimer = 0;
  let activeId: FeatureId | null = null;

  const applyCamera = () => {
    const sinPhi = Math.sin(spherical.phi);
    camera.position.set(
      target.x + spherical.radius * sinPhi * Math.sin(spherical.theta),
      target.y + spherical.radius * Math.cos(spherical.phi),
      target.z + spherical.radius * sinPhi * Math.cos(spherical.theta),
    );
    camera.lookAt(target);
  };
  if (options.reducedMotion) {
    spherical.radius = HOME.radius;
    spherical.phi = HOME.phi;
    spherical.theta = HOME.theta;
  }
  applyCamera();

  /* --- pointer interaction --- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let dragMoved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered: FeatureId | null = null;
  const canvas = renderer.domElement;

  const setPointerFromEvent = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const pickFeature = (): FeatureId | null => {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      markers.map((m) => m.hit),
      false,
    );
    return hits.length ? (hits[0].object.userData.featureId as FeatureId) : null;
  };

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    dragMoved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    autoRotate = false;
    idleTimer = 0;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      desired.theta -= dx * 0.005;
      desired.phi = clamp(desired.phi - dy * 0.004, 0.22, 1.36);
      return;
    }
    setPointerFromEvent(event);
    const next = pickFeature();
    if (next !== hovered) {
      hovered = next;
      canvas.style.cursor = next ? "pointer" : "grab";
      options.onHover(next);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (dragging && dragMoved < 6) {
      setPointerFromEvent(event);
      const picked = pickFeature();
      if (picked) options.onSelect(picked === activeId ? null : picked);
    }
    dragging = false;
    idleTimer = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const onPointerLeave = () => {
    dragging = false;
    if (hovered) {
      hovered = null;
      options.onHover(null);
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 12, 160);
    autoRotate = false;
    idleTimer = 0;
  };

  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const onContextLost = (event: Event) => event.preventDefault();
  canvas.addEventListener("webglcontextlost", onContextLost);

  /* --- animation --- */

  const clock = new THREE.Clock();
  let paused = false;
  let ready = false;
  let festTarget = 0;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 8, 24);

  const lerpColor = (current: THREE.Color, hex: string, t: number) => {
    tmpColor.set(hex);
    current.lerp(tmpColor, t);
  };

  const tick = () => {
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();
    const motion = options.reducedMotion ? 0 : 1;

    const k = 1 - Math.exp(-3.2 * dt);
    lerpColor(cur.skyTop, paletteTarget.skyTop, k);
    lerpColor(cur.skyBottom, paletteTarget.skyBottom, k);
    lerpColor(cur.sun, paletteTarget.sun, k);
    lerpColor(cur.hemiSky, paletteTarget.hemiSky, k);
    lerpColor(cur.hemiGround, paletteTarget.hemiGround, k);
    lerpColor(cur.fog, paletteTarget.fog, k);
    cur.sunIntensity = damp(cur.sunIntensity, paletteTarget.sunIntensity, 3.2, dt);
    cur.ambient = damp(cur.ambient, paletteTarget.ambient, 3.2, dt);
    cur.lantern = damp(cur.lantern, paletteTarget.lantern, 3.2, dt);
    cur.azimuth = damp(cur.azimuth, paletteTarget.sunAzimuth, 3.2, dt);
    cur.elevation = damp(cur.elevation, paletteTarget.sunElevation, 3.2, dt);
    cur.exposure = damp(cur.exposure, paletteTarget.exposure, 3.2, dt);
    cur.fest = damp(cur.fest, festTarget, 2.4, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.7 + cur.fest * 0.18;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    const lampLevel = clamp(cur.lantern + cur.fest * 0.35, 0, 1.2);
    flameMat.opacity = lampLevel * 0.85;
    for (let i = 0; i < caveFlames.length; i++) {
      const f = caveFlames[i];
      f.scale.setScalar(0.85 * (0.85 + Math.sin(elapsed * 7 + i * 1.7) * 0.18 * motion + 0.18));
    }
    for (const light of hallLampLights) {
      light.intensity = (3.2 + cur.fest * 6) * (0.35 + lampLevel * 0.85) *
        (1 + Math.sin(elapsed * 5.1) * 0.08 * motion);
    }
    caveFill.intensity = 6 + lampLevel * 8 + cur.fest * 6;
    sanctumLight.intensity = (10 + cur.fest * 12) * (0.45 + lampLevel * 0.8) *
      (1 + Math.sin(elapsed * 4.6) * 0.07 * motion);
    lingaMat.emissiveIntensity = 0.1 + lampLevel * 0.28 + cur.fest * 0.18;
    stringLightMat.opacity = cur.fest * (0.25 + lampLevel * 0.75);

    for (const marker of markers) {
      const isActive = marker.id === activeId;
      const isHover = marker.id === hovered;
      const pulse = 1 + Math.sin(elapsed * 2.2 + marker.base.x) * 0.08 * motion;
      marker.ring.scale.setScalar((isActive ? 1.5 : 1) * pulse);
      const ringMat = marker.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = isActive ? 0.85 : 0.4;
      ringMat.color.set(isActive ? "#e0703a" : "#f7e3c8");
      const spriteMat = marker.sprite.material as THREE.SpriteMaterial;
      const wantTex = isActive ? marker.activeTex : marker.idleTex;
      if (spriteMat.map !== wantTex) spriteMat.map = wantTex;
      const scale = isActive ? 0.075 : isHover ? 0.063 : 0.055;
      marker.sprite.scale.setScalar(damp(marker.sprite.scale.x, scale, 8, dt));
      marker.sprite.position.y =
        marker.base.y + 4 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.28 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(280, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.42, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.85, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.035;
      spherical.radius = damp(spherical.radius, desired.radius, 3.4, dt);
      spherical.phi = damp(spherical.phi, desired.phi, 4.5, dt);
      spherical.theta = damp(spherical.theta, desired.theta, 4.5, dt);
      target.x = damp(target.x, desiredTarget.x, 3.4, dt);
      target.y = damp(target.y, desiredTarget.y, 3.4, dt);
      target.z = damp(target.z, desiredTarget.z, 3.4, dt);
    }
    applyCamera();
    sun.target.position.copy(target);
    sun.target.updateMatrixWorld();

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      options.onReady();
    }
  };

  renderer.setAnimationLoop(tick);

  return {
    setTimeOfDay(t) {
      paletteTarget = PALETTES[t];
    },
    setMode(m) {
      festTarget = m === "aarti" ? 1 : 0;
    },
    setActive(id) {
      activeId = id;
      autoRotate = false;
      idleTimer = 0;
      if (!id) {
        desired.radius = HOME.radius;
        desired.phi = HOME.phi;
        desiredTarget.copy(HOME.target);
        return;
      }
      const anchor = ANCHORS[id];
      desiredTarget.copy(anchor.target);
      desired.radius = anchor.distance;
      const dir = anchor.dir.clone().normalize();
      desired.phi = clamp(Math.acos(clamp(dir.y, -1, 1)), 0.24, 1.32);
      desired.theta = Math.atan2(dir.x, dir.z);
    },
    resetView() {
      activeId = null;
      desired.radius = HOME.radius;
      desired.phi = HOME.phi;
      desired.theta = HOME.theta;
      desiredTarget.copy(HOME.target);
      autoRotate = true;
      idleTimer = 0;
    },
    setPaused(next) {
      paused = next;
      if (!next) clock.getDelta();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    },
  };
}
