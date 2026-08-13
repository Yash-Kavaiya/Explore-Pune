/**
 * A hand-built, procedural 3D model of the National War Memorial
 * Southern Command in Ghorpadi.
 *
 * Same approach as the other dioramas: plain three.js, zero external
 * assets, geometry generated at runtime. What defines this place is a
 * tall central memorial column, an eternal flame at its foot, outdoor
 * tanks and artillery, a MiG-23BN on the lawn, an INS Trishul replica,
 * and the Southern Command Museum in the gardens.
 *
 * This is not a temple, fort or palace. Do not reuse those scenes.
 *
 * Mode: daylight = an ordinary visiting afternoon;
 * ceremony = the weekend sound-and-light show.
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
  | "memorial-column"
  | "eternal-flame"
  | "armor-park"
  | "mig-23bn"
  | "ins-trishul"
  | "command-museum";

/** daylight = open grounds, ceremony = sound-and-light evening. */
export type MemorialMode = "daylight" | "ceremony";

export type MemorialWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type MemorialWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: MemorialMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "memorial-column",
  "eternal-flame",
  "armor-park",
  "mig-23bn",
  "ins-trishul",
  "command-museum",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Lawn level. */
export const LAWN = { y: 0 };

/** Tallest central monument — ~25 m shaft on a stepped circular plinth. */
export const COLUMN = { x: 0, z: 0, h: 25, rBase: 2.4, rTop: 0.72, capitalH: 1.8 };

/** Circular visitor plaza around the column. */
export const PLAZA = { r: 12.5, y: 0.28 };

/** Eternal flame bowl, at the foot of the column (slightly toward the gate). */
export const FLAME = { x: 0, z: 3.8, y: 1.05, bowlR: 1.35 };

/** Armour park west of the plaza. */
export const ARMOR = { x: -24, z: 10 };

export const TANKS = [
  { x: -22, z: 11, yaw: 0.35 },
  { x: -28, z: 5.5, yaw: 0.12 },
] as const;

export const GUNS = [
  { x: -18.5, z: 16.5, yaw: -0.28 },
  { x: -31, z: 13, yaw: 0.48 },
] as const;

/** Hull + turret height of a Vijayanta-style tank. */
export const TANK_H = 2.85;

/** MiG-23BN on the eastern lawn. */
export const MIG = { x: 23, z: 8, yaw: -0.55, length: 14.2, wingspan: 9.6 };
export const MIG_H = 4.15;

/** INS Trishul replica, garden side of the plaza. */
export const TRISHUL = { x: -16, z: -24, yaw: 0.18, length: 18.4, beam: 4.4 };
export const SHIP_H = 5.7;

/** Southern Command Museum block at the back of the grounds. */
export const MUSEUM = { x: 10, z: -28, w: 20, d: 10, h: 6.6 };

/** Approach path from the gate (+Z). */
export const GATE = { x: 0, z: 32 };

export function inPlaza(x: number, z: number): boolean {
  return Math.hypot(x - COLUMN.x, z - COLUMN.z) < PLAZA.r;
}

export function inMuseumFootprint(x: number, z: number): boolean {
  return Math.abs(x - MUSEUM.x) < MUSEUM.w / 2 + 1.2 && Math.abs(z - MUSEUM.z) < MUSEUM.d / 2 + 1.2;
}

export function flameDistanceFromColumn(): number {
  return Math.hypot(FLAME.x - COLUMN.x, FLAME.z - COLUMN.z);
}

export function tankSpec(i: number): { x: number; y: number; z: number; yaw: number } {
  const t = TANKS[i];
  return { x: t.x, y: LAWN.y, z: t.z, yaw: t.yaw };
}

export function gunSpec(i: number): { x: number; y: number; z: number; yaw: number } {
  const g = GUNS[i];
  return { x: g.x, y: LAWN.y, z: g.z, yaw: g.yaw };
}

/**
 * Terrain height at a world XZ. y = 0 is the lawn.
 * The plaza is a low raised disc; the museum sits on a shallow plinth;
 * the diorama falls away at the cut edge.
 */
export function terrainHeight(x: number, z: number): number {
  let h = 0.05 * Math.sin(x * 0.11) * Math.cos(z * 0.09);

  const r = Math.hypot(x - COLUMN.x, z - COLUMN.z);
  if (r < PLAZA.r + 1.4) {
    h = Math.max(h, PLAZA.y * smoothstep(PLAZA.r + 1.2, PLAZA.r - 2.2, r));
  }

  if (inMuseumFootprint(x, z)) {
    h = Math.max(h, 0.42);
  }

  // Gravel pads under the hardware sit almost level.
  if (Math.hypot(x - ARMOR.x, z - ARMOR.z) < 12) h = Math.max(h, 0.06);
  if (Math.hypot(x - MIG.x, z - MIG.z) < 8) h = Math.max(h, 0.08);
  if (Math.hypot(x - TRISHUL.x, z - TRISHUL.z) < 10) h = Math.max(h, 0.1);

  const outside = Math.max(Math.abs(x), Math.abs(z)) - 54;
  if (outside > -1) h -= 16 * smoothstep(-1, 5, outside);

  return h;
}

export type MemorialPropKind =
  | "column-lamp"
  | "flame-bowl"
  | "tank"
  | "gun"
  | "aircraft"
  | "ship"
  | "museum-lamp"
  | "museum-case"
  | "flag"
  | "tree"
  | "hedge";

export type MemorialPropSpec = {
  kind: MemorialPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

/**
 * Deterministic layout of memorial props and marker bases.
 * Pure — no three.js objects — so vitest can assert density and feature
 * coverage without WebGL.
 */
export function buildMemorialLayout(seed = 1998): {
  props: MemorialPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  tankCount: number;
  gunCount: number;
} {
  const rnd = mulberry32(seed);
  const props: MemorialPropSpec[] = [];
  const push = (p: MemorialPropSpec) => props.push(p);

  // Lamps ringing the plaza — they belong to the column.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    push({
      kind: "column-lamp",
      x: Math.cos(a) * (PLAZA.r - 1.1),
      y: PLAZA.y,
      z: Math.sin(a) * (PLAZA.r - 1.1),
      scale: 1,
      feature: "memorial-column",
    });
  }

  push({
    kind: "flame-bowl",
    x: FLAME.x,
    y: FLAME.y,
    z: FLAME.z,
    scale: 1,
    feature: "eternal-flame",
  });

  for (let i = 0; i < TANKS.length; i++) {
    const t = tankSpec(i);
    push({ kind: "tank", x: t.x, y: t.y, z: t.z, scale: 1, feature: "armor-park" });
  }
  for (let i = 0; i < GUNS.length; i++) {
    const g = gunSpec(i);
    push({ kind: "gun", x: g.x, y: g.y, z: g.z, scale: 1, feature: "armor-park" });
  }

  push({
    kind: "aircraft",
    x: MIG.x,
    y: LAWN.y,
    z: MIG.z,
    scale: 1,
    feature: "mig-23bn",
  });

  push({
    kind: "ship",
    x: TRISHUL.x,
    y: LAWN.y,
    z: TRISHUL.z,
    scale: 1,
    feature: "ins-trishul",
  });

  for (const side of [-1, 1]) {
    push({
      kind: "museum-lamp",
      x: MUSEUM.x + side * (MUSEUM.w / 2 - 1.6),
      y: 0.42,
      z: MUSEUM.z + MUSEUM.d / 2 + 1.4,
      scale: 1,
      feature: "command-museum",
    });
  }
  for (let i = 0; i < 6; i++) {
    push({
      kind: "museum-case",
      x: MUSEUM.x - 6 + (i % 3) * 6,
      y: 0.6,
      z: MUSEUM.z - 2 + Math.floor(i / 3) * 3.4,
      scale: 1,
      feature: "command-museum",
    });
  }

  // Twin flagpoles flanking the approach.
  for (const side of [-1, 1]) {
    push({
      kind: "flag",
      x: side * 6.4,
      y: LAWN.y,
      z: 22,
      scale: 1,
      feature: "memorial-column",
    });
  }

  // Hedge along the approach.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      push({
        kind: "hedge",
        x: side * 7.2,
        y: LAWN.y,
        z: 18 + i * 2.1,
        scale: 1,
        feature: null,
      });
    }
  }

  // Trees around the perimeter — never on the plaza or hardware pads.
  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 28 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 96;
    const z = (rnd() - 0.5) * 96;
    if (inPlaza(x, z)) continue;
    if (inMuseumFootprint(x, z)) continue;
    if (Math.hypot(x - ARMOR.x, z - ARMOR.z) < 14) continue;
    if (Math.hypot(x - MIG.x, z - MIG.z) < 10) continue;
    if (Math.hypot(x - TRISHUL.x, z - TRISHUL.z) < 12) continue;
    if (Math.abs(x) < 9 && z > 14 && z < 36) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 46) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z, s: 0.85 + rnd() * 0.55 });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: Math.max(terrainHeight(s.x, s.z), LAWN.y),
      z: s.z,
      scale: s.s,
      feature: "command-museum",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "memorial-column": { x: COLUMN.x, y: COLUMN.h * 0.55, z: COLUMN.z },
    "eternal-flame": { x: FLAME.x, y: FLAME.y + 1.6, z: FLAME.z },
    "armor-park": { x: ARMOR.x, y: TANK_H + 1.2, z: ARMOR.z },
    "mig-23bn": { x: MIG.x, y: MIG_H + 1.1, z: MIG.z },
    "ins-trishul": { x: TRISHUL.x, y: SHIP_H + 0.8, z: TRISHUL.z },
    "command-museum": { x: MUSEUM.x, y: MUSEUM.h + 0.6, z: MUSEUM.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    tankCount: TANKS.length,
    gunCount: GUNS.length,
  };
}

export function getMemorialAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "memorial-column": {
      target: [COLUMN.x, COLUMN.h * 0.42, COLUMN.z],
      dir: [0.18, 0.42, 0.89],
      distance: 42,
    },
    "eternal-flame": {
      target: [FLAME.x, FLAME.y + 0.4, FLAME.z],
      dir: [0.12, 0.38, 0.92],
      distance: 16,
    },
    "armor-park": {
      target: [ARMOR.x, 1.4, ARMOR.z],
      dir: [-0.62, 0.4, 0.68],
      distance: 22,
    },
    "mig-23bn": {
      target: [MIG.x, 1.8, MIG.z],
      dir: [0.72, 0.38, 0.58],
      distance: 24,
    },
    "ins-trishul": {
      target: [TRISHUL.x, 2.2, TRISHUL.z],
      dir: [-0.55, 0.42, -0.72],
      distance: 26,
    },
    "command-museum": {
      target: [MUSEUM.x, 2.4, MUSEUM.z + 2],
      dir: [0.2, 0.48, -0.85],
      distance: 28,
    },
  };
}

export function getMemorialHomeView() {
  return {
    // Gate-side approach, low enough that the 25 m shaft fills the frame.
    // Do not start from overhead — that turns the memorial into a board game.
    target: [0, 8, 4] as [number, number, number],
    radius: 36,
    phi: 1.28,
    theta: 0.34,
  };
}

export function getMemorialPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — parade dawn, dry-season gold, show-lit dusk              */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a3358",
    skyBottom: "#f0d4b4",
    sun: "#ffd6a8",
    sunIntensity: 2.15,
    hemiSky: "#b0c4dc",
    hemiGround: "#4a4536",
    ambient: 0.76,
    fog: "#e4d2b8",
    waterDeep: "#2a4a52",
    waterShallow: "#6e9aa0",
    lantern: 0.28,
    sunAzimuth: 2.15,
    sunElevation: 0.28,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3a2a4e",
    skyBottom: "#ffc484",
    sun: "#ffb868",
    sunIntensity: 2.85,
    hemiSky: "#c8b8d4",
    hemiGround: "#564832",
    ambient: 0.78,
    fog: "#ebc898",
    waterDeep: "#2a4a48",
    waterShallow: "#7eae9a",
    lantern: 0.42,
    sunAzimuth: -0.72,
    sunElevation: 0.32,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060814",
    skyBottom: "#24182c",
    sun: "#6a64b8",
    sunIntensity: 0.26,
    hemiSky: "#222848",
    hemiGround: "#121018",
    ambient: 0.28,
    fog: "#161224",
    waterDeep: "#0a1224",
    waterShallow: "#1e3858",
    lantern: 1,
    sunAzimuth: -1.32,
    sunElevation: 0.04,
    exposure: 1.18,
  },
};

/* ------------------------------------------------------------------ */
/* Runtime anchors                                                     */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getMemorialAnchors();
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

const homeRaw = getMemorialHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createMemorialWorld(
  container: HTMLElement,
  options: MemorialWorldOptions,
): MemorialWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildMemorialLayout();

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
  const fog = new THREE.Fog("#ebc898", 150, 500);
  scene.fog = fog;

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

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const flameLight = new THREE.PointLight("#ff9a3a", 10, 18, 1.6);
  flameLight.position.set(FLAME.x, FLAME.y + 1.4, FLAME.z);
  scene.add(flameLight);

  const columnWash = new THREE.SpotLight("#ffe2b0", 0, 70, 0.28, 0.55, 1.2);
  columnWash.position.set(0, 6, 18);
  columnWash.target.position.set(COLUMN.x, COLUMN.h * 0.5, COLUMN.z);
  scene.add(columnWash);
  scene.add(columnWash.target);

  const showSaffron = new THREE.PointLight("#ff7a28", 0, 28, 1.8);
  showSaffron.position.set(-8, 5, 6);
  scene.add(showSaffron);
  const showGreen = new THREE.PointLight("#3cb878", 0, 28, 1.8);
  showGreen.position.set(8, 5, 6);
  scene.add(showGreen);

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8cbb4", roughness: 0.88, metalness: 0.04 }),
  );
  const stoneDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#8a7d6a", roughness: 0.92 }),
  );
  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#f2ece2", roughness: 0.42, metalness: 0.08 }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.35, metalness: 0.85 }),
  );
  const oliveMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a5336", roughness: 0.78, metalness: 0.18 }),
  );
  const oliveDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#323826", roughness: 0.82, metalness: 0.2 }),
  );
  const airMat = track(
    new THREE.MeshStandardMaterial({ color: "#6d7a55", roughness: 0.62, metalness: 0.28 }),
  );
  const navyMat = track(
    new THREE.MeshStandardMaterial({ color: "#3a4a58", roughness: 0.55, metalness: 0.35 }),
  );
  const navyDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#243038", roughness: 0.6, metalness: 0.3 }),
  );
  const museumMat = track(
    new THREE.MeshStandardMaterial({ color: "#cfc3ae", roughness: 0.9 }),
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({ color: "#5a4030", roughness: 0.88 }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4f7a3a", roughness: 0.95, flatShading: true }),
  );
  const hedgeMat = track(
    new THREE.MeshStandardMaterial({ color: "#3d6a32", roughness: 0.95, flatShading: true }),
  );
  const saffronMat = track(
    new THREE.MeshStandardMaterial({ color: "#ff7722", roughness: 0.7, side: THREE.DoubleSide }),
  );
  const whiteMat = track(
    new THREE.MeshStandardMaterial({ color: "#f4f0ea", roughness: 0.7, side: THREE.DoubleSide }),
  );
  const greenMat = track(
    new THREE.MeshStandardMaterial({ color: "#1f8a4c", roughness: 0.7, side: THREE.DoubleSide }),
  );
  const pathMat = track(new THREE.MeshStandardMaterial({ color: "#b5a88f", roughness: 0.95 }));

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(124, 124, 110, 110));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#5f8a42");
  const lawnB = new THREE.Color("#4a7034");
  const plazaCol = new THREE.Color("#cfc3ae");
  const pathCol = new THREE.Color("#b3a68d");
  const padCol = new THREE.Color("#9a9180");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(47);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x - COLUMN.x, z - COLUMN.z);
    if (r < PLAZA.r) {
      tmp.copy(plazaCol).lerp(pathCol, colorRnd() * 0.35);
    } else if (Math.abs(x) < 5.4 && z > 10 && z < 36) {
      tmp.copy(pathCol);
    } else if (Math.hypot(x - ARMOR.x, z - ARMOR.z) < 11 || Math.hypot(x - MIG.x, z - MIG.z) < 8) {
      tmp.copy(padCol);
    } else if (inMuseumFootprint(x, z)) {
      tmp.copy(pathCol);
    } else {
      tmp.copy(lawnA).lerp(lawnB, colorRnd());
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const groundMat = track(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const base = new THREE.Mesh(
    track(new THREE.BoxGeometry(120, 16, 120)),
    track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 })),
  );
  base.position.y = -9.2;
  scene.add(base);

  /* --- approach path --- */

  {
    const path = new THREE.Mesh(track(new THREE.BoxGeometry(8.4, 0.08, 22)), pathMat);
    path.position.set(0, 0.06, 22);
    path.receiveShadow = true;
    scene.add(path);
  }

  /* --- circular plaza disc + name wall --- */

  {
    const disc = new THREE.Mesh(track(new THREE.CylinderGeometry(PLAZA.r - 0.4, PLAZA.r - 0.2, 0.22, 48)), stoneMat);
    disc.position.set(COLUMN.x, PLAZA.y + 0.08, COLUMN.z);
    disc.receiveShadow = true;
    scene.add(disc);

    const wall = new THREE.Mesh(
      track(new THREE.CylinderGeometry(PLAZA.r - 0.15, PLAZA.r - 0.15, 1.15, 48, 1, true)),
      marbleMat,
    );
    wall.position.set(COLUMN.x, PLAZA.y + 0.72, COLUMN.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    const wallCap = new THREE.Mesh(
      track(new THREE.TorusGeometry(PLAZA.r - 0.15, 0.14, 8, 48)),
      stoneDarkMat,
    );
    wallCap.rotation.x = -Math.PI / 2;
    wallCap.position.set(COLUMN.x, PLAZA.y + 1.3, COLUMN.z);
    scene.add(wallCap);

    const gap = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 1.4, 1.4)), stoneMat);
    gap.position.set(0, PLAZA.y + 0.7, PLAZA.r - 0.4);
    scene.add(gap);

    // Marble name slabs around the circular wall — the roll of the fallen.
    const slabGeo = track(new THREE.BoxGeometry(2.15, 0.82, 0.1));
    const slabs = new THREE.InstancedMesh(slabGeo, marbleMat, 18);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let placed = 0;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Math.PI / 2;
      // Leave the gate opening empty.
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI / 2) < 0.28) continue;
      e.set(0, -a + Math.PI / 2, 0);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(Math.cos(a) * (PLAZA.r - 0.08), PLAZA.y + 0.78, Math.sin(a) * (PLAZA.r - 0.08)),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      slabs.setMatrixAt(placed++, m);
    }
    slabs.count = placed;
    slabs.instanceMatrix.needsUpdate = true;
    slabs.castShadow = true;
    scene.add(slabs);
  }

  /* --- memorial column --- */

  {
    for (let i = 0; i < 3; i++) {
      const r = 5.2 - i * 0.85;
      const step = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r + 0.25, 0.38, 32)), stoneDarkMat);
      step.position.set(COLUMN.x, PLAZA.y + 0.22 + i * 0.36, COLUMN.z);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    const drum = new THREE.Mesh(track(new THREE.CylinderGeometry(2.15, 2.35, 1.4, 24)), marbleMat);
    drum.position.set(COLUMN.x, PLAZA.y + 1.85, COLUMN.z);
    drum.castShadow = true;
    scene.add(drum);

    const shaft = new THREE.Mesh(
      track(new THREE.CylinderGeometry(COLUMN.rTop, COLUMN.rBase, COLUMN.h - 4.2, 24)),
      stoneMat,
    );
    shaft.position.set(COLUMN.x, PLAZA.y + 2.6 + (COLUMN.h - 4.2) / 2, COLUMN.z);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    scene.add(shaft);

    // Bands that make the 25 m shaft read as a built monument, not a pole.
    for (const t of [0.22, 0.45, 0.68, 0.88]) {
      const y = PLAZA.y + 2.6 + (COLUMN.h - 4.2) * t;
      const r = THREE.MathUtils.lerp(COLUMN.rBase, COLUMN.rTop, t) + 0.12;
      const band = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.09, 8, 24)), stoneDarkMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(COLUMN.x, y, COLUMN.z);
      band.castShadow = true;
      scene.add(band);
    }

    const capital = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.45, 0.82, COLUMN.capitalH, 16)),
      stoneDarkMat,
    );
    capital.position.set(COLUMN.x, PLAZA.y + COLUMN.h - 0.4, COLUMN.z);
    capital.castShadow = true;
    scene.add(capital);

    const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 1.15, 0.35, 16)), brassMat);
    collar.position.set(COLUMN.x, PLAZA.y + COLUMN.h + 0.55, COLUMN.z);
    scene.add(collar);

    const finial = new THREE.Mesh(track(new THREE.SphereGeometry(0.48, 14, 12)), brassMat);
    finial.position.set(COLUMN.x, PLAZA.y + COLUMN.h + 0.95, COLUMN.z);
    finial.castShadow = true;
    scene.add(finial);

    // Four-point star on the crown.
    const starMat = track(
      new THREE.MeshStandardMaterial({
        color: "#e8c868",
        roughness: 0.28,
        metalness: 0.7,
        emissive: "#7a5010",
        emissiveIntensity: 0.25,
      }),
    );
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(track(new THREE.ConeGeometry(0.16, 1.15, 6)), starMat);
      arm.position.set(COLUMN.x, PLAZA.y + COLUMN.h + 1.55, COLUMN.z);
      arm.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4;
      arm.rotation.x = Math.PI / 2;
      arm.castShadow = true;
      scene.add(arm);
    }

    const plaqueGeo = track(new THREE.BoxGeometry(0.95, 0.62, 0.08));
    const plaques = new THREE.InstancedMesh(plaqueGeo, marbleMat, 10);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      e.set(0, -a, 0);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(Math.cos(a) * 2.22, PLAZA.y + 1.9, Math.sin(a) * 2.22),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      plaques.setMatrixAt(i, m);
    }
    plaques.instanceMatrix.needsUpdate = true;
    scene.add(plaques);
  }

  /* --- eternal flame --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,120,30,0.45)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    }),
  );
  const memorialFlames: THREE.Sprite[] = [];
  {
    const pedestal = new THREE.Mesh(track(new THREE.CylinderGeometry(1.05, 1.25, 0.7, 16)), stoneDarkMat);
    pedestal.position.set(FLAME.x, FLAME.y - 0.55, FLAME.z);
    pedestal.castShadow = true;
    scene.add(pedestal);

    const bowl = new THREE.Mesh(track(new THREE.CylinderGeometry(FLAME.bowlR, FLAME.bowlR + 0.18, 0.5, 20)), stoneDarkMat);
    bowl.position.set(FLAME.x, FLAME.y - 0.05, FLAME.z);
    bowl.castShadow = true;
    scene.add(bowl);
    const inner = new THREE.Mesh(track(new THREE.CylinderGeometry(FLAME.bowlR - 0.28, FLAME.bowlR - 0.16, 0.2, 16)), brassMat);
    inner.position.set(FLAME.x, FLAME.y + 0.18, FLAME.z);
    scene.add(inner);

    const sprite = new THREE.Sprite(flameMat);
    sprite.scale.setScalar(3.1);
    sprite.position.set(FLAME.x, FLAME.y + 1.45, FLAME.z);
    scene.add(sprite);
    memorialFlames.push(sprite);

    const glow = new THREE.Sprite(flameMat);
    glow.scale.setScalar(1.6);
    glow.position.set(FLAME.x, FLAME.y + 0.7, FLAME.z);
    scene.add(glow);
    memorialFlames.push(glow);
  }

  /* --- plaza lamps --- */

  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.22, 0.14, 0.22, 8));
    for (const p of layout.props) {
      if (p.kind !== "column-lamp" && p.kind !== "museum-lamp") continue;
      const h = p.kind === "museum-lamp" ? 2.6 : 3.4;
      const pole = new THREE.Mesh(poleGeo, brassMat);
      pole.position.set(p.x, p.y + h / 2, p.z);
      pole.scale.y = h / 3.4;
      pole.castShadow = true;
      scene.add(pole);
      const cup = new THREE.Mesh(cupGeo, brassMat);
      cup.position.set(p.x, p.y + h + 0.1, p.z);
      scene.add(cup);
      const sprite = new THREE.Sprite(flameMat);
      sprite.scale.setScalar(0.9);
      sprite.position.set(p.x, p.y + h + 0.4, p.z);
      scene.add(sprite);
      memorialFlames.push(sprite);
    }
  }

  /* --- tanks --- */

  const addTank = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(x, TANK_H * 0.32, z);
    g.rotation.y = yaw;
    const hull = new THREE.Mesh(track(new THREE.BoxGeometry(3.5, 1.2, 6.4)), oliveMat);
    hull.castShadow = true;
    hull.receiveShadow = true;
    g.add(hull);
    const glacis = new THREE.Mesh(track(new THREE.BoxGeometry(3.3, 0.62, 1.8)), oliveDarkMat);
    glacis.position.set(0, 0.32, -2.7);
    glacis.rotation.x = -0.32;
    glacis.castShadow = true;
    g.add(glacis);
    const bustle = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.55, 1.4)), oliveMat);
    bustle.position.set(0, 0.55, 2.6);
    bustle.castShadow = true;
    g.add(bustle);
    const turret = new THREE.Mesh(track(new THREE.CylinderGeometry(1.18, 1.32, 0.9, 14)), oliveDarkMat);
    turret.position.set(0, 1.12, 0.1);
    turret.castShadow = true;
    g.add(turret);
    const mantlet = new THREE.Mesh(track(new THREE.BoxGeometry(0.85, 0.55, 0.55)), oliveDarkMat);
    mantlet.position.set(0, 1.12, -1.2);
    g.add(mantlet);
    const barrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.16, 4.8, 8)), oliveDarkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.18, -3.4);
    barrel.castShadow = true;
    g.add(barrel);
    const muzzle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.14, 0.45, 8)), oliveDarkMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 1.18, -5.7);
    g.add(muzzle);
    const hatch = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 10)), oliveMat);
    hatch.position.set(0.35, 1.62, 0.15);
    g.add(hatch);
    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.85, 6.5)), oliveDarkMat);
      skirt.position.set(side * 1.78, -0.35, 0);
      skirt.castShadow = true;
      g.add(skirt);
      for (let w = 0; w < 5; w++) {
        const wheel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10)), oliveDarkMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.72, -0.55, -2.2 + w * 1.1);
        g.add(wheel);
      }
    }
    scene.add(g);
  };
  for (let i = 0; i < TANKS.length; i++) {
    const t = tankSpec(i);
    addTank(t.x, t.z, t.yaw);
  }

  /* --- field guns --- */

  const addGun = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.85, z);
    g.rotation.y = yaw;
    const trail = new THREE.Mesh(track(new THREE.BoxGeometry(0.35, 0.28, 3.6)), oliveDarkMat);
    trail.position.set(0, -0.15, 1.2);
    trail.castShadow = true;
    g.add(trail);
    const shield = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 1.15, 0.1)), oliveMat);
    shield.position.set(0, 0.35, -0.35);
    shield.castShadow = true;
    g.add(shield);
    const barrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.14, 4.8, 8)), oliveDarkMat);
    barrel.rotation.x = Math.PI / 2 - 0.12;
    barrel.position.set(0, 0.35, -2.2);
    barrel.castShadow = true;
    g.add(barrel);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.7, 0.7, 0.22, 14)), oliveDarkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.95, -0.35, 0);
      wheel.castShadow = true;
      g.add(wheel);
    }
    scene.add(g);
  };
  for (let i = 0; i < GUNS.length; i++) {
    const g = gunSpec(i);
    addGun(g.x, g.z, g.yaw);
  }

  /* --- MiG-23BN --- */

  {
    const jet = new THREE.Group();
    jet.position.set(MIG.x, 1.85, MIG.z);
    jet.rotation.y = MIG.yaw;

    const fuse = new THREE.Mesh(track(new THREE.CylinderGeometry(0.52, 0.78, 9.6, 14)), airMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.castShadow = true;
    jet.add(fuse);

    const nose = new THREE.Mesh(track(new THREE.ConeGeometry(0.52, 2.8, 12)), airMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0, -6.05);
    nose.castShadow = true;
    jet.add(nose);

    const pitot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.05, 1.4, 6)), oliveDarkMat);
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, 0, -7.6);
    jet.add(pitot);

    const intake = new THREE.Mesh(track(new THREE.BoxGeometry(1.85, 0.9, 2.6)), oliveDarkMat);
    intake.position.set(0, -0.12, -1.3);
    intake.castShadow = true;
    jet.add(intake);

    // Variable-geometry wings swept back — the MiG-23BN's tell.
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(track(new THREE.BoxGeometry(MIG.wingspan * 0.52, 0.12, 2.6)), airMat);
      wing.position.set(side * 2.6, 0.06, 0.55);
      wing.rotation.y = side * 0.55;
      wing.castShadow = true;
      jet.add(wing);
    }

    const tail = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 2.6, 2.0)), airMat);
    tail.position.set(0, 1.5, 4.15);
    tail.castShadow = true;
    jet.add(tail);

    const ventral = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.7, 1.1)), airMat);
    ventral.position.set(0, -0.7, 3.6);
    jet.add(ventral);

    const stab = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 0.1, 1.15)), airMat);
    stab.position.set(0, 0.18, 4.35);
    stab.castShadow = true;
    jet.add(stab);

    const exhaust = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.62, 0.55, 0.7, 12)),
      track(new THREE.MeshStandardMaterial({ color: "#2a241c", roughness: 0.4, metalness: 0.5 })),
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0, 5.15);
    jet.add(exhaust);

    const canopy = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
      track(new THREE.MeshStandardMaterial({ color: "#7ec8e8", roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.55 })),
    );
    canopy.position.set(0, 0.48, -2.55);
    jet.add(canopy);

    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6)), oliveDarkMat);
      strut.position.set(side * 1.1, -1.1, 0.6);
      strut.castShadow = true;
      jet.add(strut);
    }
    const noseStrut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.08, 1.35, 6)), oliveDarkMat);
    noseStrut.position.set(0, -1.05, -3.4);
    jet.add(noseStrut);

    scene.add(jet);

    const pad = new THREE.Mesh(track(new THREE.BoxGeometry(12, 0.1, 16)), pathMat);
    pad.position.set(MIG.x, 0.06, MIG.z);
    pad.rotation.y = MIG.yaw;
    pad.receiveShadow = true;
    scene.add(pad);
  }

  /* --- INS Trishul replica --- */

  {
    const ship = new THREE.Group();
    ship.position.set(TRISHUL.x, 1.15, TRISHUL.z);
    ship.rotation.y = TRISHUL.yaw;

    const hull = new THREE.Mesh(track(new THREE.BoxGeometry(TRISHUL.beam, 1.7, TRISHUL.length * 0.78)), navyMat);
    hull.castShadow = true;
    hull.receiveShadow = true;
    ship.add(hull);

    const waterline = new THREE.Mesh(
      track(new THREE.BoxGeometry(TRISHUL.beam + 0.08, 0.18, TRISHUL.length * 0.78)),
      track(new THREE.MeshStandardMaterial({ color: "#c9b48a", roughness: 0.7 })),
    );
    waterline.position.set(0, -0.55, 0);
    ship.add(waterline);

    const bow = new THREE.Mesh(track(new THREE.ConeGeometry(TRISHUL.beam * 0.52, 4.4, 8)), navyMat);
    bow.rotation.x = -Math.PI / 2;
    bow.position.set(0, 0, -TRISHUL.length * 0.42);
    bow.castShadow = true;
    ship.add(bow);

    const deck = new THREE.Mesh(
      track(new THREE.BoxGeometry(TRISHUL.beam - 0.3, 0.12, TRISHUL.length * 0.7)),
      track(new THREE.MeshStandardMaterial({ color: "#8a8070", roughness: 0.9 })),
    );
    deck.position.set(0, 0.88, 0.2);
    ship.add(deck);

    const superstructure = new THREE.Mesh(track(new THREE.BoxGeometry(3.15, 2.25, 5.5)), navyDarkMat);
    superstructure.position.set(0, 1.95, 0.35);
    superstructure.castShadow = true;
    ship.add(superstructure);

    const bridge = new THREE.Mesh(track(new THREE.BoxGeometry(2.5, 1.25, 2.3)), navyMat);
    bridge.position.set(0, 3.55, -0.55);
    bridge.castShadow = true;
    ship.add(bridge);

    const glass = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.2, 0.35, 0.08)),
      track(new THREE.MeshStandardMaterial({ color: "#7ec8e8", roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.5 })),
    );
    glass.position.set(0, 3.7, -1.72);
    ship.add(glass);

    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 6)), oliveDarkMat);
    mast.position.set(0, 5.55, -0.35);
    mast.castShadow = true;
    ship.add(mast);

    const yard = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.06, 0.06)), oliveDarkMat);
    yard.position.set(0, 6.6, -0.35);
    ship.add(yard);

    const turret = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.52, 0.45, 10)), navyDarkMat);
    turret.position.set(0, 1.15, -5.4);
    ship.add(turret);
    const gunFwd = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.1, 2.6, 6)), oliveDarkMat);
    gunFwd.rotation.x = Math.PI / 2;
    gunFwd.position.set(0, 1.2, -6.7);
    ship.add(gunFwd);

    const funnel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.55, 1.7, 8)), navyDarkMat);
    funnel.position.set(0, 3.5, 1.85);
    ship.add(funnel);

    scene.add(ship);

    const berth = new THREE.Mesh(track(new THREE.BoxGeometry(8, 0.35, 20)), stoneDarkMat);
    berth.position.set(TRISHUL.x, 0.18, TRISHUL.z);
    berth.rotation.y = TRISHUL.yaw;
    berth.receiveShadow = true;
    scene.add(berth);
  }

  /* --- Southern Command Museum --- */

  {
    const block = new THREE.Mesh(
      track(new THREE.BoxGeometry(MUSEUM.w, MUSEUM.h, MUSEUM.d)),
      museumMat,
    );
    block.position.set(MUSEUM.x, 0.42 + MUSEUM.h / 2, MUSEUM.z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);

    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(MUSEUM.w + 0.8, 0.4, MUSEUM.d + 0.8)), roofMat);
    roof.position.set(MUSEUM.x, 0.42 + MUSEUM.h + 0.15, MUSEUM.z);
    roof.castShadow = true;
    scene.add(roof);

    const portico = new THREE.Mesh(track(new THREE.BoxGeometry(7.2, 3.6, 2.4)), stoneMat);
    portico.position.set(MUSEUM.x, 2.3, MUSEUM.z + MUSEUM.d / 2 + 0.6);
    portico.castShadow = true;
    scene.add(portico);

    const door = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.2, 2.6, 0.2)),
      track(new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.8 })),
    );
    door.position.set(MUSEUM.x, 1.7, MUSEUM.z + MUSEUM.d / 2 + 1.75);
    scene.add(door);

    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 8)), stoneDarkMat);
      col.position.set(MUSEUM.x + side * 2.6, 2.1, MUSEUM.z + MUSEUM.d / 2 + 1.5);
      col.castShadow = true;
      scene.add(col);
    }

    const winMat = track(
      new THREE.MeshStandardMaterial({ color: "#6a8aa0", roughness: 0.25, metalness: 0.2 }),
    );
    const winGeo = track(new THREE.BoxGeometry(1.4, 1.15, 0.08));
    for (const row of [0, 1]) {
      for (let i = -2; i <= 2; i++) {
        if (i === 0 && row === 0) continue;
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          MUSEUM.x + i * 3.2,
          2.1 + row * 2.2,
          MUSEUM.z + MUSEUM.d / 2 + 0.05,
        );
        scene.add(win);
      }
    }

    const steps = new THREE.Mesh(track(new THREE.BoxGeometry(6.4, 0.35, 2.2)), stoneDarkMat);
    steps.position.set(MUSEUM.x, 0.55, MUSEUM.z + MUSEUM.d / 2 + 2.2);
    steps.receiveShadow = true;
    scene.add(steps);

    // Display cases inside the volume (visible through the open front).
    const caseGeo = track(new THREE.BoxGeometry(1.6, 1.1, 0.7));
    const glassMat = track(
      new THREE.MeshStandardMaterial({ color: "#8ec4d4", roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.35 }),
    );
    const cases = layout.props.filter((p) => p.kind === "museum-case");
    cases.forEach((c) => {
      const box = new THREE.Mesh(caseGeo, glassMat);
      box.position.set(c.x, c.y + 0.7, c.z);
      scene.add(box);
    });
  }

  /* --- flags --- */

  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.09, 8.4, 6));
    for (const p of layout.props) {
      if (p.kind !== "flag") continue;
      const pole = new THREE.Mesh(poleGeo, stoneDarkMat);
      pole.position.set(p.x, 4.2, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const bands = [
        { mat: saffronMat, y: 7.85 },
        { mat: whiteMat, y: 7.4 },
        { mat: greenMat, y: 6.95 },
      ];
      for (const band of bands) {
        const cloth = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 0.46, 3, 1)), band.mat);
        cloth.position.set(p.x + 1.2, band.y, p.z);
        cloth.castShadow = true;
        scene.add(cloth);
      }
    }
  }

  /* --- hedges and trees --- */

  {
    const hedges = layout.props.filter((p) => p.kind === "hedge");
    const hedgeGeo = track(new THREE.BoxGeometry(1.4, 1.1, 1.8));
    const hedgeMesh = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedges.length);
    hedgeMesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    hedges.forEach((h, i) => {
      m.compose(new THREE.Vector3(h.x, 0.55, h.z), q, new THREE.Vector3(1, 1, 1));
      hedgeMesh.setMatrixAt(i, m);
    });
    hedgeMesh.instanceMatrix.needsUpdate = true;
    scene.add(hedgeMesh);
  }

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

  /* --- ceremonial string lights around the plaza --- */

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
    const bulbColors = ["#ffd27a", "#ff9d5c", "#ff7a7a", "#7ad07a", "#fff4d0"];
    const rnd = mulberry32(108);
    const c = new THREE.Color();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r = PLAZA.r + 0.6;
      bulbPositions.push(Math.cos(a) * r, 3.4 + Math.sin(i * 0.7) * 0.15, Math.sin(a) * r);
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

  const spherical = { radius: HOME.radius + 22, phi: HOME.phi - 0.16, theta: HOME.theta - 0.28 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 14, 160);
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

  const clock = new THREE.Clock();
  let paused = false;
  let ready = false;
  let festTarget = 0;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 8, 16);

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
    hemi.intensity = cur.ambient * 1.7 + cur.fest * 0.22;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    const lampLevel = clamp(cur.lantern + cur.fest * 0.4, 0, 1.25);
    flameMat.opacity = 0.45 + lampLevel * 0.55;
    for (let i = 0; i < memorialFlames.length; i++) {
      const f = memorialFlames[i];
      const baseScale = i === 0 ? 3.1 : i === 1 ? 1.6 : 0.9;
      f.scale.setScalar(baseScale * (0.85 + Math.sin(elapsed * 7 + i * 1.7) * 0.18 * motion + 0.18));
    }
    flameLight.intensity = (8 + cur.fest * 10) * (0.45 + lampLevel * 0.8) *
      (1 + Math.sin(elapsed * 5.2) * 0.08 * motion);
    columnWash.intensity = lampLevel * 18 + cur.fest * 28;
    showSaffron.intensity = cur.fest * 16;
    showGreen.intensity = cur.fest * 14;
    stringLightMat.opacity = cur.fest * (0.3 + lampLevel * 0.7);

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
      spherical.radius = THREE.MathUtils.lerp(HOME.radius + 22, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(HOME.phi - 0.16, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.28, desired.theta, e);
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
      festTarget = m === "ceremony" ? 1 : 0;
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
