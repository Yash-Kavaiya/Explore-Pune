/**
 * A hand-built, procedural 3D model of the Osho International Meditation
 * Resort and Osho Teerth park.
 *
 * Same approach as the other dioramas (components/places/temple,
 * components/places/parvati): plain three.js, zero external assets, geometry
 * generated at runtime. The model reads the campus as a visitor does from the
 * welcome gate — a bamboo-shaded path under dense tree cover, opening onto
 * the black pyramid auditorium, the Zen garden, the swimming pool, and the
 * stream-and-waterfall chain of Osho Teerth park to the east.
 *
 * The "mode" of the scene is a quiet day, or the evening celebration, when
 * the paths light up and the pyramid glows at its seams.
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
  | "welcome-gate"
  | "pyramid"
  | "zen-garden"
  | "swimming-pool"
  | "teerth-park"
  | "evening-celebration";

/** day = a quiet programme day, celebration = the evening event. */
export type ResortMode = "day" | "celebration";

export type ResortWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type ResortWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: ResortMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "welcome-gate",
  "pyramid",
  "zen-garden",
  "swimming-pool",
  "teerth-park",
  "evening-celebration",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** The campus: a walled, roughly square green plot. */
export const CAMPUS = { x: -8, z: 0, halfW: 40, halfD: 44 };

/** Welcome gate on the south edge, where the path enters. */
export const GATE = { z: 40, opening: 5.2, pierW: 1.8, h: 4.4 };

/** The black pyramid auditorium — the campus landmark. */
export const PYRAMID = { x: -6, z: -10, base: 26, h: 14 };

/** Zen garden: raked gravel field with standing stones, behind the pyramid. */
export const ZEN = { x: -18, z: -30, r: 11 };

/** Swimming pool with a deck, on the west lawn. */
export const POOL = { x: -34, z: 6, w: 18, d: 9 };

/** Osho Teerth park: a chain of ponds along a stream, east of the campus. */
export const TEERTH = { x: 26, z0: -26, z1: 30, pondCount: 4, pondR: 5.5 };

/** Main path: gate → pyramid → zen garden. */
export const PATH_Z0 = GATE.z - 1;

export type ResortPropKind =
  | "tree"
  | "bamboo"
  | "path-lamp"
  | "stone"
  | "lantern"
  | "bridge"
  | "deckchair"
  | "pond";

export type ResortPropSpec = {
  kind: ResortPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  feature: FeatureId | null;
};

/** Terrain height at a world XZ — a flat campus with a soft rim. Pure. */
export function terrainHeight(x: number, z: number): number {
  let h = 0.18 * Math.sin(x * 0.06) * Math.cos(z * 0.055);

  // The stream bed of Teerth park dips below the lawns.
  const inPark =
    smoothstep(12, 18, x) *
    smoothstep(TEERTH.z0 - 4, TEERTH.z0 + 6, z) *
    smoothstep(TEERTH.z1 + 4, TEERTH.z1 - 6, z);
  h -= 1.5 * inPark * (0.7 + 0.3 * Math.sin(z * 0.22));

  // Plateau falloff — the diorama is an object with a cut edge.
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 56;
  if (outside > -1) h -= 20 * smoothstep(-1, 4, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/** Centre + width of the meandering Teerth stream at a given z. Pure. */
export function streamAt(z: number): { x: number; w: number } {
  return {
    x: TEERTH.x + Math.sin(z * 0.16) * 4.2,
    w: 2.6 + 0.7 * Math.sin(z * 0.3 + 1.2),
  };
}

/** Pond centres down the Teerth chain. Pure. */
export function pondCentres(): { x: number; z: number; r: number }[] {
  const out: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < TEERTH.pondCount; i++) {
    const z = TEERTH.z0 + ((i + 0.5) / TEERTH.pondCount) * (TEERTH.z1 - TEERTH.z0);
    const s = streamAt(z);
    out.push({ x: s.x, z, r: TEERTH.pondR + (i % 2) * 1.2 });
  }
  return out;
}

/**
 * Deterministic layout of campus props and marker bases. Pure — no three.js
 * objects — so vitest can assert density and feature coverage without WebGL.
 */
export function buildResortLayout(seed = 1974): {
  props: ResortPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  treeCount: number;
  bambooCount: number;
} {
  const rnd = mulberry32(seed);
  const props: ResortPropSpec[] = [];
  const push = (p: ResortPropSpec) => props.push(p);

  // Path lamps from the gate to the pyramid, alternating sides.
  for (let i = 0; i < 6; i++) {
    const z = GATE.z - 5 - i * 7;
    push({
      kind: "path-lamp",
      x: -6 + (i % 2 ? 2.6 : -2.6),
      y: groundHeight(-6, z),
      z,
      scale: 1,
      rotY: 0,
      feature: i < 2 ? "welcome-gate" : "evening-celebration",
    });
  }

  // The pyramid auditorium (conceptual prop for feature coverage).
  push({
    kind: "stone",
    x: PYRAMID.x,
    y: groundHeight(PYRAMID.x, PYRAMID.z),
    z: PYRAMID.z,
    scale: 1,
    rotY: 0,
    feature: "pyramid",
  });

  // Standing stones in the Zen gravel field.
  const stoneSpots: [number, number, number][] = [
    [-3.5, -1, 1.5],
    [2.8, 1.6, 1.1],
    [0.4, -3.6, 0.8],
    [4.4, -2.4, 0.6],
  ];
  for (const [dx, dz, s] of stoneSpots) {
    push({
      kind: "stone",
      x: ZEN.x + dx,
      y: groundHeight(ZEN.x + dx, ZEN.z + dz),
      z: ZEN.z + dz,
      scale: s,
      rotY: rnd() * Math.PI,
      feature: "zen-garden",
    });
  }
  // A stone lantern at the Zen edge.
  push({
    kind: "lantern",
    x: ZEN.x + 6,
    y: groundHeight(ZEN.x + 6, ZEN.z + 5),
    z: ZEN.z + 5,
    scale: 1,
    rotY: 0,
    feature: "zen-garden",
  });

  // Deck chairs around the pool.
  for (let i = 0; i < 4; i++) {
    push({
      kind: "deckchair",
      x: POOL.x - 2 + i * 4.2,
      y: groundHeight(POOL.x, POOL.z + POOL.d / 2 + 1.6),
      z: POOL.z + POOL.d / 2 + 1.6,
      scale: 1,
      rotY: Math.PI,
      feature: "swimming-pool",
    });
  }

  // Bridges over the Teerth stream.
  for (const z of [-8, 12]) {
    const s = streamAt(z);
    push({
      kind: "bridge",
      x: s.x,
      y: groundHeight(s.x, z) + 1.6,
      z,
      scale: 1,
      rotY: Math.PI / 2,
      feature: "teerth-park",
    });
  }
  // Ponds (conceptual props for feature coverage; the water is rendered separately).
  for (const p of pondCentres()) {
    push({ kind: "pond", x: p.x, y: 0, z: p.z, scale: p.r / TEERTH.pondR, rotY: 0, feature: "teerth-park" });
  }

  // Bamboo clumps shading the gate path and the park edges.
  let guard = 0;
  const bambooSpots: { x: number; z: number }[] = [];
  while (bambooSpots.length < 22 && guard < 3000) {
    guard++;
    const x = (rnd() - 0.5) * 100;
    const z = (rnd() - 0.5) * 100;
    // Cluster along the entrance corridor and the park's west edge.
    const nearPath = Math.abs(x - -6) < 8 && z > 8 && z < 42;
    const nearPark = x > 14 && x < 22;
    if (!nearPath && !nearPark) continue;
    if (Math.abs(x) > 52 || Math.abs(z) > 52) continue;
    if (bambooSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.4)) continue;
    bambooSpots.push({ x, z });
  }
  for (const s of bambooSpots) {
    push({
      kind: "bamboo",
      x: s.x,
      y: groundHeight(s.x, s.z),
      z: s.z,
      scale: 0.8 + rnd() * 0.5,
      rotY: rnd() * Math.PI,
      feature: null,
    });
  }

  // Broad canopy trees across the campus — never on buildings, paths, water.
  const clearings: { x: number; z: number; r: number }[] = [
    { x: PYRAMID.x, z: PYRAMID.z, r: PYRAMID.base / 2 + 3 },
    { x: ZEN.x, z: ZEN.z, r: ZEN.r + 2 },
    { x: POOL.x, z: POOL.z, r: Math.max(POOL.w, POOL.d) / 2 + 3 },
    { x: GATE.z, z: GATE.z, r: 1 }, // placeholder, path handled below
  ];
  guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 70 && guard < 6000) {
    guard++;
    const x = (rnd() - 0.5) * 108;
    const z = (rnd() - 0.5) * 108;
    if (Math.abs(x) > 50 || Math.abs(z) > 50) continue;
    if (Math.abs(x - -6) < 3.4 && z > -34 && z < 42) continue; // main path
    if (x > 14 && x < 38 && z > TEERTH.z0 - 2 && z < TEERTH.z1 + 2 && Math.abs(x - streamAt(z).x) < 7) continue; // stream
    if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 4.6)) continue;
    treeSpots.push({ x, z, s: 0.85 + rnd() * 0.75 });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: groundHeight(s.x, s.z),
      z: s.z,
      scale: s.s,
      rotY: rnd() * Math.PI,
      feature: null,
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "welcome-gate": { x: -6, y: GATE.h + 1.2, z: GATE.z },
    pyramid: { x: PYRAMID.x, y: PYRAMID.h + 2, z: PYRAMID.z + 4 },
    "zen-garden": { x: ZEN.x, y: 3.2, z: ZEN.z },
    "swimming-pool": { x: POOL.x, y: 2.2, z: POOL.z },
    "teerth-park": { x: streamAt(0).x, y: 2.4, z: 0 },
    "evening-celebration": { x: -6, y: 0.3, z: 14 },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    treeCount: treeSpots.length,
    bambooCount: bambooSpots.length,
  };
}

export function getResortAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "welcome-gate": {
      target: [-6, 2.5, GATE.z],
      dir: [0.15, 0.4, 0.9],
      distance: 26,
    },
    pyramid: {
      target: [PYRAMID.x, PYRAMID.h * 0.45, PYRAMID.z],
      dir: [0.2, 0.42, 0.88],
      distance: 40,
    },
    "zen-garden": {
      target: [ZEN.x, 1, ZEN.z],
      dir: [-0.3, 0.55, 0.77],
      distance: 24,
    },
    "swimming-pool": {
      target: [POOL.x, 0.5, POOL.z],
      dir: [-0.4, 0.62, 0.66],
      distance: 28,
    },
    "teerth-park": {
      target: [streamAt(2).x, 0.5, 2],
      dir: [0.42, 0.5, 0.75],
      distance: 36,
    },
    "evening-celebration": {
      target: [-6, 2, 10],
      dir: [0.12, 0.5, 0.85],
      distance: 58,
    },
  };
}

export function getResortHomeView() {
  return {
    // Elevated southerly approach: gate path in the near ground, the pyramid
    // rising over the canopy, the Teerth ponds glinting to the east.
    target: [-4, 3, 2] as [number, number, number],
    radius: 92,
    phi: 1.02,
    theta: 0.24,
  };
}

export function getResortPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — misty dawn, golden afternoon, and celebration dusk       */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#2b3f63",
    skyBottom: "#e8e0c8",
    sun: "#ffe0b8",
    sunIntensity: 2.0,
    hemiSky: "#bccad9",
    hemiGround: "#46523c",
    ambient: 0.85,
    fog: "#e2dcc4",
    waterDeep: "#2c5d63",
    waterShallow: "#8ab6b6",
    lantern: 0.3,
    sunAzimuth: 2.1,
    sunElevation: 0.26,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#2f4070",
    skyBottom: "#ffd9a0",
    sun: "#ffc97e",
    sunIntensity: 2.9,
    hemiSky: "#c6c2dc",
    hemiGround: "#4a5438",
    ambient: 0.8,
    fog: "#eedcae",
    waterDeep: "#276058",
    waterShallow: "#8fc4ae",
    lantern: 0.45,
    sunAzimuth: -0.85,
    sunElevation: 0.34,
    exposure: 1.02,
  },
  dusk: {
    skyTop: "#050a22",
    skyBottom: "#2c2044",
    sun: "#8478d4",
    sunIntensity: 0.32,
    hemiSky: "#28305e",
    hemiGround: "#10131c",
    ambient: 0.34,
    fog: "#1d1a34",
    waterDeep: "#0b1a30",
    waterShallow: "#28486e",
    lantern: 1,
    sunAzimuth: -1.4,
    sunElevation: 0.04,
    exposure: 1.18,
  },
};

/* ------------------------------------------------------------------ */
/* Layout (runtime anchors from pure helpers)                          */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getResortAnchors();
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

const homeRaw = getResortHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createOshoWorld(
  container: HTMLElement,
  options: ResortWorldOptions,
): ResortWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildResortLayout();

  /* Light + glow registries, filled as the campus is built. */
  const lampFlames: THREE.Sprite[] = [];
  const lampTops: THREE.Vector3[] = [];
  const celebrationLights: THREE.PointLight[] = [];

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
    0.5,
    1000,
  );
  const fog = new THREE.Fog("#eedcae", 170, 540);
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
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(460, 32, 20)), skyMat));

  /* --- lights --- */

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 460;
  sun.shadow.camera.left = -85;
  sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 85;
  sun.shadow.camera.bottom = -85;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  /* --- materials --- */

  const barkMat = track(new THREE.MeshStandardMaterial({ color: "#4d3b2c", roughness: 0.95 }));
  const canopyMat = track(
    new THREE.MeshStandardMaterial({ color: "#3f6b34", roughness: 0.95, flatShading: true }),
  );
  const canopyDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#33592b", roughness: 0.95, flatShading: true }),
  );
  const bambooMat = track(
    new THREE.MeshStandardMaterial({ color: "#7fa24a", roughness: 0.85 }),
  );
  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#8e897c", roughness: 0.95 }),
  );
  const darkStoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#5d594f", roughness: 0.95 }),
  );
  const pyramidMat = track(
    new THREE.MeshStandardMaterial({
      color: "#1c1c22",
      roughness: 0.45,
      metalness: 0.35,
    }),
  );
  const pyramidGlowMat = track(
    new THREE.MeshBasicMaterial({
      color: "#ffb45e",
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  const deckMat = track(new THREE.MeshStandardMaterial({ color: "#9a7452", roughness: 0.85 }));
  const waterMat = track(
    new THREE.MeshStandardMaterial({
      color: "#3d8a94",
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const maroonMat = track(
    new THREE.MeshStandardMaterial({ color: "#6e1f2a", roughness: 0.9, side: THREE.DoubleSide }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.35, metalness: 0.85 }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(128, 128, 116, 116));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#5c7c3e");
  const lawnB = new THREE.Color("#72904a");
  const soil = new THREE.Color("#6d5a41");
  const gravel = new THREE.Color("#cfc8b4");
  const waterBed = new THREE.Color("#4a4636");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const onPath = Math.abs(x - -6) < 2.4 && z > -34 && z < 42;
    const inZen = Math.hypot(x - ZEN.x, z - ZEN.z) < ZEN.r;
    const inStream = x > 14 && z > TEERTH.z0 - 3 && z < TEERTH.z1 + 3 && Math.abs(x - streamAt(z).x) < 6;
    if (inZen) {
      tmp.copy(gravel).offsetHSL(0, 0, (colorRnd() - 0.5) * 0.04);
    } else if (onPath) {
      tmp.copy(soil).lerp(gravel, 0.35);
    } else if (inStream) {
      tmp.copy(waterBed);
    } else {
      tmp.copy(lawnA).lerp(lawnB, colorRnd());
      if (colorRnd() > 0.86) tmp.lerp(soil, 0.35);
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

  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#41352a", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(124, 22, 124)), baseMat);
  base.position.y = -11.3;
  scene.add(base);

  /* --- welcome gate --- */

  {
    const gy = groundHeight(-6, GATE.z);
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(
        track(new THREE.BoxGeometry(GATE.pierW, GATE.h, 2.2)),
        darkStoneMat,
      );
      pier.position.set(-6 + side * (GATE.opening / 2 + GATE.pierW / 2), gy + GATE.h / 2, GATE.z);
      pier.castShadow = true;
      pier.receiveShadow = true;
      scene.add(pier);
    }
    // Simple timber lintel with a maroon banner below it.
    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATE.opening + GATE.pierW * 2, 0.7, 2.2)),
      deckMat,
    );
    lintel.position.set(-6, gy + GATE.h - 0.35, GATE.z);
    lintel.castShadow = true;
    scene.add(lintel);
    const banner = new THREE.Mesh(
      track(new THREE.PlaneGeometry(GATE.opening - 1, 1.1, 8, 3)),
      maroonMat,
    );
    banner.position.set(-6, gy + GATE.h - 1.3, GATE.z + 0.1);
    scene.add(banner);

    // Low hedges running out from the gate along the wall line.
    const hedgeGeo = track(new THREE.BoxGeometry(8, 1.2, 1.2));
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const hedge = new THREE.Mesh(hedgeGeo, canopyDarkMat);
        hedge.position.set(
          -6 + side * (GATE.opening / 2 + GATE.pierW + 4 + i * 8.4),
          gy + 0.6,
          GATE.z,
        );
        hedge.castShadow = true;
        hedge.receiveShadow = true;
        scene.add(hedge);
      }
    }
  }

  /* --- the black pyramid auditorium --- */

  {
    const py = groundHeight(PYRAMID.x, PYRAMID.z);
    const podium = new THREE.Mesh(
      track(new THREE.CylinderGeometry(PYRAMID.base * 0.72, PYRAMID.base * 0.78, 1.1, 32)),
      stoneMat,
    );
    podium.position.set(PYRAMID.x, py + 0.55, PYRAMID.z);
    podium.castShadow = true;
    podium.receiveShadow = true;
    scene.add(podium);

    const pyramid = new THREE.Mesh(
      track(new THREE.ConeGeometry(PYRAMID.base / 2, PYRAMID.h, 4, 1)),
      pyramidMat,
    );
    pyramid.geometry.rotateY(Math.PI / 4);
    pyramid.position.set(PYRAMID.x, py + 1.1 + PYRAMID.h / 2, PYRAMID.z);
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;
    scene.add(pyramid);

    // Glowing seams along the four edges — the evening celebration's signature.
    const seamGeo = track(new THREE.CylinderGeometry(0.09, 0.09, Math.hypot(PYRAMID.base / 2 / Math.SQRT2, PYRAMID.h) + 0.4, 6));
    const apexY = py + 1.1 + PYRAMID.h;
    const baseY = py + 1.1;
    const halfDiag = PYRAMID.base / 2 / Math.SQRT2;
    for (const [cx, cz] of [
      [halfDiag, halfDiag],
      [-halfDiag, halfDiag],
      [halfDiag, -halfDiag],
      [-halfDiag, -halfDiag],
    ] as [number, number][]) {
      const seam = new THREE.Mesh(seamGeo, pyramidGlowMat);
      const from = new THREE.Vector3(PYRAMID.x + cx, baseY, PYRAMID.z + cz);
      const to = new THREE.Vector3(PYRAMID.x, apexY, PYRAMID.z);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      seam.position.copy(mid);
      const dir = to.clone().sub(from).normalize();
      seam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      scene.add(seam);
    }

    // A warm interior light and the entrance steps on the south face.
    const inner = new THREE.PointLight("#ffbf74", 0, 34, 1.8);
    inner.position.set(PYRAMID.x, py + 3, PYRAMID.z);
    scene.add(inner);
    celebrationLights.push(inner);

    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(track(new THREE.BoxGeometry(6 - i * 0.4, 0.3, 1.0)), stoneMat);
      step.position.set(
        PYRAMID.x,
        py + 0.15 + i * 0.3,
        PYRAMID.z + PYRAMID.base / 2 / Math.SQRT2 + 0.4 - i * 0.9,
      );
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }
  }

  /* --- shared flame material (lamps, lanterns) --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,150,60,0.45)"));
  const sharedFlameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.6,
    }),
  );

  /* --- Zen garden: raked gravel, standing stones, a lantern --- */

  {
    const zy = groundHeight(ZEN.x, ZEN.z);
    // Raked gravel disc with concentric rake rings baked into a canvas texture.
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#cfc8b4";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(120,112,96,0.55)";
      ctx.lineWidth = 2;
      for (let r = 12; r < size / 2; r += 9) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const rakeTex = track(new THREE.CanvasTexture(canvas));
    rakeTex.colorSpace = THREE.SRGBColorSpace;
    const zenDisc = new THREE.Mesh(
      track(new THREE.CircleGeometry(ZEN.r, 40)),
      track(
        new THREE.MeshStandardMaterial({
          map: rakeTex,
          roughness: 1,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      ),
    );
    zenDisc.rotation.x = -Math.PI / 2;
    zenDisc.position.set(ZEN.x, zy + 0.06, ZEN.z);
    zenDisc.receiveShadow = true;
    scene.add(zenDisc);

    for (const p of layout.props) {
      if (p.kind === "stone") {
        const stone = new THREE.Mesh(
          track(new THREE.DodecahedronGeometry(1.1, 0)),
          darkStoneMat,
        );
        stone.scale.set(p.scale, p.scale * 1.6, p.scale * 0.8);
        stone.rotation.y = p.rotY;
        stone.position.set(p.x, p.y + p.scale * 0.9, p.z);
        stone.castShadow = true;
        stone.receiveShadow = true;
        scene.add(stone);
      } else if (p.kind === "lantern") {
        const g = new THREE.Group();
        const baseL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8)), stoneMat);
        baseL.position.y = 0.15;
        g.add(baseL);
        const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8)), stoneMat);
        shaft.position.y = 0.85;
        g.add(shaft);
        const box = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.55, 0.7)), stoneMat);
        box.position.y = 1.65;
        g.add(box);
        const capGeo = track(new THREE.ConeGeometry(0.62, 0.45, 4));
        capGeo.rotateY(Math.PI / 4);
        const cap = new THREE.Mesh(capGeo, darkStoneMat);
        cap.position.y = 2.15;
        g.add(cap);
        const lampGlow = new THREE.Sprite(sharedFlameMat);
        lampGlow.scale.setScalar(0.7);
        lampGlow.position.y = 1.65;
        g.add(lampGlow);
        lampFlames.push(lampGlow);
        g.position.set(p.x, p.y, p.z);
        g.traverse((o) => {
          o.castShadow = true;
        });
        scene.add(g);
      }
    }
  }

  /* --- swimming pool --- */

  const poolWater: THREE.Mesh[] = [];
  {
    const py = groundHeight(POOL.x, POOL.z);
    // Deck apron.
    const deck = new THREE.Mesh(
      track(new THREE.BoxGeometry(POOL.w + 5, 0.3, POOL.d + 5)),
      deckMat,
    );
    deck.position.set(POOL.x, py + 0.15, POOL.z);
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);
    // Basin and water.
    const basin = new THREE.Mesh(
      track(new THREE.BoxGeometry(POOL.w, 0.5, POOL.d)),
      darkStoneMat,
    );
    basin.position.set(POOL.x, py + 0.55, POOL.z);
    basin.receiveShadow = true;
    scene.add(basin);
    const water = new THREE.Mesh(
      track(new THREE.PlaneGeometry(POOL.w - 1, POOL.d - 1, 12, 6)),
      waterMat,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(POOL.x, py + 0.84, POOL.z);
    scene.add(water);
    poolWater.push(water);
    for (const p of layout.props) {
      if (p.kind !== "deckchair") continue;
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 0.1, 1.8)), deckMat);
      seat.position.y = 0.45;
      seat.rotation.x = -0.28;
      chair.add(seat);
      const legs = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.42, 0.5)), darkStoneMat);
      legs.position.y = 0.21;
      chair.add(legs);
      chair.position.set(p.x, p.y, p.z);
      chair.rotation.y = p.rotY;
      chair.traverse((o) => {
        o.castShadow = true;
      });
      scene.add(chair);
    }
  }

  /* --- Osho Teerth: stream, ponds, bridges --- */

  {
    // Ponds: glassy discs sunk into the stream bed.
    for (const pond of pondCentres()) {
      const y = groundHeight(pond.x, pond.z);
      const water = new THREE.Mesh(
        track(new THREE.CircleGeometry(pond.r, 28)),
        waterMat,
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(pond.x, y + 0.7, pond.z);
      scene.add(water);
      poolWater.push(water);
      // Rock rim.
      const rim = new THREE.Mesh(
        track(new THREE.TorusGeometry(pond.r + 0.3, 0.5, 6, 22)),
        darkStoneMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(pond.x, y + 0.55, pond.z);
      rim.castShadow = true;
      rim.receiveShadow = true;
      scene.add(rim);
    }

    // The stream between ponds: a ribbon following streamAt().
    const pts: THREE.Vector3[] = [];
    for (let z = TEERTH.z0; z <= TEERTH.z1; z += 3) {
      const s = streamAt(z);
      pts.push(new THREE.Vector3(s.x, groundHeight(s.x, z) + 0.72, z));
    }
    const ribbonGeo = track(new THREE.PlaneGeometry(1, 1, 1, pts.length - 1));
    const rp = ribbonGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pts.length; i++) {
      const s = streamAt(TEERTH.z0 + i * 3);
      rp.setXYZ(i * 2, pts[i].x - s.w / 2, pts[i].y, pts[i].z);
      rp.setXYZ(i * 2 + 1, pts[i].x + s.w / 2, pts[i].y, pts[i].z);
    }
    // Re-index into a strip.
    const idx: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    ribbonGeo.setIndex(idx);
    ribbonGeo.computeVertexNormals();
    const stream = new THREE.Mesh(ribbonGeo, waterMat);
    scene.add(stream);
    poolWater.push(stream);

    // Wooden bridges.
    for (const p of layout.props) {
      if (p.kind !== "bridge") continue;
      const g = new THREE.Group();
      const deckB = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.18, 6.4)), deckMat);
      deckB.position.y = 0.2;
      g.add(deckB);
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.7, 6.4)), barkMat);
        rail.position.set(side * 0.74, 0.72, 0);
        g.add(rail);
      }
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = p.rotY;
      g.traverse((o) => {
        o.castShadow = true;
      });
      scene.add(g);
    }
  }

  /* --- path lamps (shared flame material) --- */

  {
    const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.09, 1.8, 6));
    const headGeo = track(new THREE.BoxGeometry(0.4, 0.3, 0.4));
    for (const p of layout.props) {
      if (p.kind !== "path-lamp") continue;
      const pole = new THREE.Mesh(poleGeo, darkStoneMat);
      pole.position.set(p.x, p.y + 0.9, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const head = new THREE.Mesh(headGeo, brassMat);
      head.position.set(p.x, p.y + 1.95, p.z);
      scene.add(head);
      const flame = new THREE.Sprite(sharedFlameMat);
      flame.scale.setScalar(0.8);
      flame.position.set(p.x, p.y + 2.2, p.z);
      scene.add(flame);
      lampFlames.push(flame);
      lampTops.push(new THREE.Vector3(p.x, p.y + 2.1, p.z));
    }
  }

  /* --- bamboo clumps --- */

  {
    const bamboos = layout.props.filter((p) => p.kind === "bamboo");
    const culmGeo = track(new THREE.CylinderGeometry(0.06, 0.08, 6, 5));
    const culms = new THREE.InstancedMesh(culmGeo, bambooMat, bamboos.length * 5);
    culms.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(55);
    let ci = 0;
    for (const b of bamboos) {
      for (let k = 0; k < 5; k++) {
        const a = rnd() * Math.PI * 2;
        const r = rnd() * 0.9;
        const tilt = (rnd() - 0.5) * 0.14;
        e.set(tilt, rnd() * Math.PI, tilt);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(b.x + Math.cos(a) * r, b.y + 3 * b.scale, b.z + Math.sin(a) * r),
          q,
          new THREE.Vector3(1, b.scale, 1),
        );
        culms.setMatrixAt(ci++, m);
      }
    }
    culms.instanceMatrix.needsUpdate = true;
    scene.add(culms);
  }

  /* --- canopy trees --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.3, 0.5, 3.6, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, trees.length * 3);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(777);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.8 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 3; k++) {
        const sc = (3.4 - k * 0.8) * t.scale;
        e.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.8,
            t.y + (4.2 + k * 1.5) * t.scale,
            t.z + (rnd() - 0.5) * 1.8,
          ),
          q,
          new THREE.Vector3(sc, sc * 0.72, sc),
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

  /* --- celebration: string lights along the gate path --- */

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
    const bulbColors = ["#ffd27a", "#ff9d5c", "#c98aff", "#7ab8ff", "#7fd67f"];
    const rnd = mulberry32(1974);
    const c = new THREE.Color();

    // Spans between successive path lamps, plus two runs up to the pyramid base.
    const spans: [THREE.Vector3, THREE.Vector3, number][] = [];
    const sorted = [...lampTops].sort((a, b) => b.z - a.z);
    for (let i = 0; i < sorted.length - 1; i++) spans.push([sorted[i], sorted[i + 1], 1.0]);
    const pyBase = PYRAMID.h * 0.5;
    spans.push([
      new THREE.Vector3(-6 + 2.6, groundHeight(-6 + 2.6, 2) + 2.1, 2),
      new THREE.Vector3(PYRAMID.x + 6, pyBase, PYRAMID.z + 6),
      2.0,
    ]);
    spans.push([
      new THREE.Vector3(-6 - 2.6, groundHeight(-6 - 2.6, 2) + 2.1, 2),
      new THREE.Vector3(PYRAMID.x - 6, pyBase, PYRAMID.z + 6),
      2.0,
    ]);

    for (const [a, b, sag] of spans) {
      const n = Math.max(8, Math.round(a.distanceTo(b) / 1.3));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = a.clone().lerp(b, t);
        p.y -= sag * 4 * t * (1 - t);
        bulbPositions.push(p.x, p.y, p.z);
        c.set(bulbColors[Math.floor(rnd() * bulbColors.length)]);
        bulbCols.push(c.r, c.g, c.b);
      }
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bulbPositions), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(bulbCols), 3));
    scene.add(new THREE.Points(geo, stringLightMat));
  }

  /* --- celebration: warm wash lights at the pyramid base --- */

  for (const [dx, dz] of [
    [10, 10],
    [-10, 10],
  ] as [number, number][]) {
    const wash = new THREE.PointLight("#ffb45e", 0, 40, 1.8);
    wash.position.set(PYRAMID.x + dx, groundHeight(PYRAMID.x + dx, PYRAMID.z + dz) + 3, PYRAMID.z + dz);
    scene.add(wash);
    celebrationLights.push(wash);
  }

  /* --- birds over the campus --- */

  const BIRDS = 7;
  const birdGeo = track(new THREE.BufferGeometry());
  const birdSeed: number[] = [];
  {
    const arr = new Float32Array(BIRDS * 3);
    const rnd = mulberry32(21);
    for (let i = 0; i < BIRDS; i++) birdSeed.push(rnd() * 100);
    birdGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const birdMat = track(
    new THREE.PointsMaterial({ color: "#241d18", size: 1.3, sizeAttenuation: true }),
  );
  scene.add(new THREE.Points(birdGeo, birdMat));

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
  const ringGeo = track(new THREE.RingGeometry(2.4, 3, 40));
  const hitGeo = track(new THREE.SphereGeometry(3.4, 10, 8));

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
    sprite.position.copy(base).add(new THREE.Vector3(0, 5, 0));
    sprite.renderOrder = 20;
    scene.add(sprite);

    const ring = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: "#e8f0dd",
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(base).add(new THREE.Vector3(0, 0.3, 0));
    ring.renderOrder = 19;
    scene.add(ring);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);

    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  /* --- camera rig --- */

  const spherical = { radius: 320, phi: 0.4, theta: HOME.theta - 0.9 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 26, 220);
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
  const introFrom = new THREE.Vector3(-4, 14, 0);
  const waterBaseY = poolWater.map((w) => w.position.y);

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
    hemi.intensity = cur.ambient * 1.8 + cur.fest * 0.15;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(200);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    /* lamps */
    const lampLevel = clamp(cur.lantern + cur.fest * 0.3, 0, 1.15);
    sharedFlameMat.opacity = lampLevel * 0.8;
    for (let i = 0; i < lampFlames.length; i++) {
      const f = lampFlames[i];
      f.scale.setScalar(0.8 * (0.85 + Math.sin(elapsed * 6.5 + i * 1.9) * 0.18 * motion + 0.18));
    }

    /* water: gentle bob + colour shift with the light */
    waterMat.color.set(paletteTarget === PALETTES.dusk ? "#2c5a70" : "#3d8a94");
    for (let i = 0; i < poolWater.length; i++) {
      poolWater[i].position.y = waterBaseY[i] + Math.sin(elapsed * 0.9 + i * 1.7) * 0.02 * motion;
    }

    /* celebration: seams, string lights, wash lights */
    pyramidGlowMat.opacity = cur.fest * (0.25 + lampLevel * 0.55);
    stringLightMat.opacity = cur.fest * (0.2 + lampLevel * 0.8);
    for (let i = 0; i < celebrationLights.length; i++) {
      celebrationLights[i].intensity =
        cur.fest * (14 + Math.sin(elapsed * 3 + i * 2.1) * 3 * motion);
    }

    /* birds */
    if (motion) {
      const attr = birdGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < BIRDS; i++) {
        const s = birdSeed[i];
        const r = 26 + (i % 3) * 5;
        const a = elapsed * (0.05 + (i % 3) * 0.014) + s;
        attr.setXYZ(
          i,
          -4 + Math.cos(a) * r,
          22 + Math.sin(elapsed * 0.4 + s) * 2.5 + (i % 3) * 2,
          Math.sin(a) * r,
        );
      }
      attr.needsUpdate = true;
    }

    /* markers */
    for (const marker of markers) {
      const isActive = marker.id === activeId;
      const isHover = marker.id === hovered;
      const pulse = 1 + Math.sin(elapsed * 2.2 + marker.base.x) * 0.08 * motion;
      marker.ring.scale.setScalar((isActive ? 1.5 : 1) * pulse);
      const ringMat = marker.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = isActive ? 0.85 : 0.4;
      ringMat.color.set(isActive ? "#e0703a" : "#e8f0dd");
      const spriteMat = marker.sprite.material as THREE.SpriteMaterial;
      const wantTex = isActive ? marker.activeTex : marker.idleTex;
      if (spriteMat.map !== wantTex) spriteMat.map = wantTex;
      const scale = isActive ? 0.075 : isHover ? 0.063 : 0.055;
      marker.sprite.scale.setScalar(damp(marker.sprite.scale.x, scale, 8, dt));
      marker.sprite.position.y =
        marker.base.y + 5 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.3 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    /* camera */
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(320, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.4, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.9, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.04;
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
      festTarget = m === "celebration" ? 1 : 0;
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
