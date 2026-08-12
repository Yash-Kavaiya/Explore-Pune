/**
 * Procedural three.js diorama of Lal Mahal — modest red-brick palace in
 * Kasba Peth. Zero external assets; geometry generated at runtime.
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
  type Season,
  type TimeOfDay,
} from "@/components/places/three/diorama-core";

export { supportsWebGL } from "@/components/places/three/diorama-core";
export type { Season, TimeOfDay } from "@/components/places/three/diorama-core";

export type FeatureId =
  | "red-palace"
  | "jijabai-wing"
  | "shaista-hall"
  | "gallery"
  | "garden"
  | "entrance";

export type MahalWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type MahalWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "red-palace",
  "jijabai-wing",
  "shaista-hall",
  "gallery",
  "garden",
  "entrance",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Half-width / half-depth of the main red palace block. */
export const HALF_W = 18;
export const HALF_D = 12;
export const STOREY = 4.8;
export const PLINTH = 0.9;
export const PARAPET = 0.9;

/** Garden court centre (front lawn, -Z). */
export const GARDEN_COURT = { x: 0, z: -32, radius: 10 } as const;

export type MahalPropKind =
  | "lamp"
  | "tree"
  | "hedge"
  | "flower"
  | "bench"
  | "banner"
  | "painting"
  | "diorama"
  | "column"
  | "planter";

export type MahalPropSpec = {
  kind: MahalPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

/**
 * Deterministic layout of grounds props and interior markers. Pure — no three.js
 * objects — so vitest can assert density and feature coverage without WebGL.
 */
export function buildMahalLayout(seed = 1630): {
  props: MahalPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  treeCount: number;
} {
  const rnd = mulberry32(seed);
  const props: MahalPropSpec[] = [];
  const push = (p: MahalPropSpec) => props.push(p);

  const roofY = PLINTH + STOREY * 2 + PARAPET;
  const frontZ = -HALF_D;

  // Entrance lamps & planters
  for (const [lx, lz] of [
    [-6, frontZ - 8],
    [6, frontZ - 8],
    [-4, frontZ - 14],
    [4, frontZ - 14],
  ] as [number, number][]) {
    push({ kind: "lamp", x: lx, y: 0, z: lz, scale: 1, feature: "entrance" });
  }
  for (const [px, pz] of [
    [-8, frontZ - 6],
    [8, frontZ - 6],
    [-10, frontZ - 12],
    [10, frontZ - 12],
  ] as [number, number][]) {
    push({ kind: "planter", x: px, y: 0, z: pz, scale: 1, feature: "entrance" });
  }

  // Facade columns & banners
  for (let i = 0; i < 6; i++) {
    const x = -HALF_W + 3 + (i / 5) * (HALF_W * 2 - 6);
    push({
      kind: "column",
      x,
      y: PLINTH,
      z: frontZ - 0.4,
      scale: 1,
      feature: "red-palace",
    });
  }
  for (const side of [-1, 1]) {
    push({
      kind: "banner",
      x: side * (HALF_W - 2),
      y: PLINTH + STOREY,
      z: frontZ - 0.2,
      scale: 1,
      feature: "red-palace",
    });
  }

  // Jijabai wing furniture markers (east)
  for (let i = 0; i < 4; i++) {
    push({
      kind: "bench",
      x: 10 + (i % 2) * 2.5,
      y: PLINTH + 0.1,
      z: -2 + Math.floor(i / 2) * 3,
      scale: 1,
      feature: "jijabai-wing",
    });
  }

  // Shaista hall central markers
  for (let i = 0; i < 3; i++) {
    push({
      kind: "column",
      x: -2 + i * 2,
      y: PLINTH,
      z: 2,
      scale: 0.85,
      feature: "shaista-hall",
    });
  }
  push({
    kind: "diorama",
    x: 0,
    y: PLINTH + 1,
    z: 4,
    scale: 1.2,
    feature: "shaista-hall",
  });

  // Gallery paintings & cases (west)
  for (let i = 0; i < 8; i++) {
    push({
      kind: "painting",
      x: -14 + (i % 4) * 2.4,
      y: PLINTH + STOREY * 0.6,
      z: -4 + Math.floor(i / 4) * 5,
      scale: 1,
      feature: "gallery",
    });
  }
  for (let i = 0; i < 4; i++) {
    push({
      kind: "diorama",
      x: -12 + i * 2.2,
      y: PLINTH + 0.2,
      z: 1,
      scale: 0.9,
      feature: "gallery",
    });
  }

  // Garden hedges, flowers, benches
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    push({
      kind: "hedge",
      x: GARDEN_COURT.x + Math.cos(a) * GARDEN_COURT.radius,
      y: 0,
      z: GARDEN_COURT.z + Math.sin(a) * (GARDEN_COURT.radius * 0.55),
      scale: 0.95,
      feature: "garden",
    });
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    push({
      kind: "flower",
      x: GARDEN_COURT.x + Math.cos(a) * (GARDEN_COURT.radius * 0.65),
      y: 0,
      z: GARDEN_COURT.z + Math.sin(a) * (GARDEN_COURT.radius * 0.4),
      scale: 1,
      feature: "garden",
    });
  }
  for (const bx of [-6, 0, 6]) {
    push({
      kind: "bench",
      x: bx,
      y: 0,
      z: GARDEN_COURT.z + 4,
      scale: 1,
      feature: "garden",
    });
  }

  // Trees around grounds
  let guard = 0;
  const treeSpots: { x: number; z: number }[] = [];
  while (treeSpots.length < 28 && guard < 2500) {
    guard++;
    const x = (rnd() - 0.5) * 90;
    const z = (rnd() - 0.5) * 78;
    if (Math.abs(x) > 42 || Math.abs(z) > 40) continue;
    if (Math.abs(x) < HALF_W + 6 && Math.abs(z) < HALF_D + 8) continue;
    if (Math.hypot(x - GARDEN_COURT.x, z - GARDEN_COURT.z) < GARDEN_COURT.radius + 2) continue;
    if (z < frontZ - 4 && z > frontZ - 18 && Math.abs(x) < 12) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 6)) continue;
    treeSpots.push({ x, z });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: 0,
      z: s.z,
      scale: 0.85 + rnd() * 0.7,
      feature: "garden",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "red-palace": { x: 0, y: roofY * 0.55, z: frontZ },
    "jijabai-wing": { x: 12, y: STOREY * 0.7, z: 0 },
    "shaista-hall": { x: 0, y: STOREY, z: 3 },
    gallery: { x: -12, y: STOREY * 0.8, z: -1 },
    garden: { x: GARDEN_COURT.x, y: 1, z: GARDEN_COURT.z },
    entrance: { x: 0, y: 1.5, z: frontZ - 12 },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    treeCount: treeSpots.length,
  };
}

export function getMahalAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  const roofY = PLINTH + STOREY * 2 + PARAPET;
  const frontZ = -HALF_D;
  return {
    "red-palace": {
      target: [0, roofY * 0.55, frontZ],
      dir: [0.12, 0.4, -0.9],
      distance: 48,
    },
    "jijabai-wing": {
      target: [12, STOREY * 0.7, 0],
      dir: [0.55, 0.45, -0.55],
      distance: 36,
    },
    "shaista-hall": {
      target: [0, STOREY, 3],
      dir: [0.1, 0.55, 0.75],
      distance: 34,
    },
    gallery: {
      target: [-12, STOREY * 0.8, -1],
      dir: [-0.55, 0.5, -0.5],
      distance: 36,
    },
    garden: {
      target: [GARDEN_COURT.x, 1, GARDEN_COURT.z],
      dir: [0.05, 0.62, -0.78],
      distance: 42,
    },
    entrance: {
      target: [0, 1.5, frontZ - 12],
      dir: [0.0, 0.48, -0.88],
      distance: 40,
    },
  };
}

export function getMahalHomeView() {
  return {
    target: [0, 3.5, -4] as [number, number, number],
    radius: 72,
    phi: 0.95,
    theta: 0.38,
  };
}

export function getMahalPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a3a62",
    skyBottom: "#f2d8b8",
    sun: "#ffe4c4",
    sunIntensity: 2.2,
    hemiSky: "#a8c8ec",
    hemiGround: "#6a4a38",
    ambient: 0.78,
    fog: "#e8d4b8",
    waterDeep: "#2a5560",
    waterShallow: "#82b0b0",
    lantern: 0.12,
    sunAzimuth: 2.35,
    sunElevation: 0.32,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#4a3048",
    skyBottom: "#ffc98a",
    sun: "#ffb86a",
    sunIntensity: 2.9,
    hemiSky: "#c8def4",
    hemiGround: "#7a5030",
    ambient: 0.82,
    fog: "#f0d0a0",
    waterDeep: "#2c5850",
    waterShallow: "#88bc9e",
    lantern: 0.22,
    sunAzimuth: -0.55,
    sunElevation: 0.34,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#080a20",
    skyBottom: "#3c2458",
    sun: "#9a84d0",
    sunIntensity: 0.38,
    hemiSky: "#283868",
    hemiGround: "#1c1428",
    ambient: 0.34,
    fog: "#241c38",
    waterDeep: "#0c1830",
    waterShallow: "#24486c",
    lantern: 1,
    sunAzimuth: -1.25,
    sunElevation: 0.05,
    exposure: 1.14,
  },
};

/* ------------------------------------------------------------------ */
/* Runtime world                                                       */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getMahalAnchors();
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

const ANCHORS = buildAnchors();
const homeRaw = getMahalHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

function terrainHeight(x: number, z: number): number {
  let h = 0.22 * Math.sin(x * 0.06) * Math.cos(z * 0.05);
  const inX = smoothstep(HALF_W + 10, HALF_W + 2, Math.abs(x));
  const inZ = smoothstep(HALF_D + 12, HALF_D + 3, Math.abs(z));
  h += PLINTH * 0.35 * inX * inZ;
  if (z < -HALF_D - 4 && z > -HALF_D - 20 && Math.abs(x) < 14) h -= 0.08;
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 48;
  if (outside > -1) h -= 16 * smoothstep(-1, 2.2, outside);
  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.35);
const onPlinth = (x: number, z: number) =>
  Math.abs(x) < HALF_W + 3 && Math.abs(z) < HALF_D + 5;

export function createMahalWorld(
  container: HTMLElement,
  options: MahalWorldOptions,
): MahalWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

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
    700,
  );
  const fog = new THREE.Fog("#e8d4b8", 140, 420);
  scene.fog = fog;

  let paletteTarget = PALETTES.golden;
  const cur = {
    skyTop: new THREE.Color(paletteTarget.skyTop),
    skyBottom: new THREE.Color(paletteTarget.skyBottom),
    sun: new THREE.Color(paletteTarget.sun),
    hemiSky: new THREE.Color(paletteTarget.hemiSky),
    hemiGround: new THREE.Color(paletteTarget.hemiGround),
    fog: new THREE.Color(paletteTarget.fog),
    waterDeep: new THREE.Color(paletteTarget.waterDeep),
    waterShallow: new THREE.Color(paletteTarget.waterShallow),
    sunIntensity: paletteTarget.sunIntensity,
    ambient: paletteTarget.ambient,
    lantern: paletteTarget.lantern,
    azimuth: paletteTarget.sunAzimuth,
    elevation: paletteTarget.sunElevation,
    exposure: paletteTarget.exposure,
    wet: 0,
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
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(320, 28, 18)), skyMat));

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 280;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  /* materials — red brick palace character */
  const brickMat = track(
    new THREE.MeshStandardMaterial({ color: "#a84838", roughness: 0.94, metalness: 0 }),
  );
  const brickDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#7a3228", roughness: 0.96 }),
  );
  const trimMat = track(
    new THREE.MeshStandardMaterial({ color: "#d4b896", roughness: 0.88 }),
  );
  const teakMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a2e1c", roughness: 0.82 }),
  );
  const shadowMat = track(
    new THREE.MeshStandardMaterial({ color: "#3a2418", roughness: 1 }),
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a3a28", roughness: 0.92 }),
  );
  const trunkMat = track(
    new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }),
  );
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a7438", roughness: 0.95, flatShading: true }),
  );
  const hedgeMat = track(
    new THREE.MeshStandardMaterial({ color: "#3a6230", roughness: 0.95, flatShading: true }),
  );
  const flowerMat = track(
    new THREE.MeshStandardMaterial({ color: "#c44a58", roughness: 0.9, flatShading: true }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.55, metalness: 0.35 }),
  );

  /* terrain */
  const groundGeo = track(new THREE.PlaneGeometry(100, 88, 80, 70));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawn = new THREE.Color("#6a943e");
  const lawnDark = new THREE.Color("#4e7234");
  const dust = new THREE.Color("#c8a878");
  const gravel = new THREE.Color("#b0a088");
  const path = new THREE.Color("#9a8870");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(63);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (onPlinth(x, z)) {
      tmp.copy(gravel).lerp(dust, colorRnd() * 0.45);
    } else if (z < -HALF_D - 4 && z > -HALF_D - 18 && Math.abs(x) < 10) {
      tmp.copy(path).lerp(gravel, colorRnd() * 0.35);
    } else if (Math.hypot(x - GARDEN_COURT.x, z - GARDEN_COURT.z) < GARDEN_COURT.radius + 2) {
      tmp.copy(lawn).lerp(lawnDark, colorRnd() * 0.4);
    } else {
      tmp.copy(lawnDark).lerp(lawn, 0.3 + colorRnd() * 0.7);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const groundMat = track(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const base = new THREE.Mesh(
    track(new THREE.BoxGeometry(96, 16, 84)),
    track(new THREE.MeshStandardMaterial({ color: "#5a4434", roughness: 1 })),
  );
  base.position.y = -9;
  scene.add(base);

  /* --- red palace body --- */
  const palace = new THREE.Group();
  const frontZ = -HALF_D;
  const plinthTop = PLINTH;
  const bodyTop = plinthTop + STOREY * 2;

  const body = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2, STOREY * 2, HALF_D * 2)),
    brickMat,
  );
  body.position.set(0, plinthTop + STOREY, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  palace.add(body);

  const plinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 1.6, PLINTH, HALF_D * 2 + 1.6)),
    brickDarkMat,
  );
  plinth.position.set(0, PLINTH / 2, 0);
  plinth.receiveShadow = true;
  palace.add(plinth);

  const stringCourse = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 0.3, 0.35, HALF_D * 2 + 0.3)),
    trimMat,
  );
  stringCourse.position.set(0, plinthTop + STOREY, 0);
  palace.add(stringCourse);

  const parapet = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 0.5, PARAPET, HALF_D * 2 + 0.5)),
    brickDarkMat,
  );
  parapet.position.set(0, bodyTop + PARAPET / 2, 0);
  parapet.castShadow = true;
  palace.add(parapet);

  // Hipped roof (bake rotate+scale into geometry)
  {
    const roofH = 2.8;
    const roofGeo = track(new THREE.ConeGeometry(1, roofH, 4));
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale((HALF_W + 0.5) * Math.SQRT2, 1, (HALF_D + 0.5) * Math.SQRT2);
    roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, bodyTop + PARAPET + roofH / 2 - 0.1, 0);
    roof.castShadow = true;
    palace.add(roof);
  }

  // Central entrance bay
  {
    const bay = new THREE.Mesh(
      track(new THREE.BoxGeometry(8, STOREY * 1.85, 4)),
      brickMat,
    );
    bay.position.set(0, plinthTop + STOREY * 0.92, frontZ - 1.5);
    bay.castShadow = true;
    palace.add(bay);

    const door = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 4.4, 0.35)), teakMat);
    door.position.set(0, plinthTop + 2.3, frontZ - 3.4);
    palace.add(door);

    // Decorative arch ring over door
    const arch = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.2, 0.28, 8, 18, Math.PI)),
      trimMat,
    );
    arch.position.set(0, plinthTop + 4.6, frontZ - 3.35);
    palace.add(arch);

    for (const sx of [-2.6, 2.6]) {
      const col = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.35, 0.4, STOREY * 1.5, 10)),
        trimMat,
      );
      col.position.set(sx, plinthTop + STOREY * 0.75, frontZ - 3.2);
      col.castShadow = true;
      palace.add(col);
    }
  }

  // Side wings (Jijabai east / gallery west)
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(
      track(new THREE.BoxGeometry(10, STOREY * 1.7, HALF_D * 1.5)),
      brickMat,
    );
    wing.position.set(side * (HALF_W - 2), plinthTop + STOREY * 0.85, 1);
    wing.castShadow = true;
    wing.receiveShadow = true;
    palace.add(wing);

    const wingRoofH = 2;
    const wGeo = track(new THREE.ConeGeometry(1, wingRoofH, 4));
    wGeo.rotateY(Math.PI / 4);
    wGeo.scale(5.5 * Math.SQRT2, 1, (HALF_D * 0.75 + 0.4) * Math.SQRT2);
    wGeo.computeVertexNormals();
    const wRoof = new THREE.Mesh(wGeo, roofMat);
    wRoof.position.set(side * (HALF_W - 2), plinthTop + STOREY * 1.7 + wingRoofH / 2, 1);
    wRoof.castShadow = true;
    palace.add(wRoof);
  }

  // Windows along front
  {
    const winGeo = track(new THREE.BoxGeometry(1.4, 2.2, 0.25));
    for (let i = 0; i < 7; i++) {
      const x = -HALF_W + 4 + (i / 6) * (HALF_W * 2 - 8);
      if (Math.abs(x) < 5) continue;
      const win = new THREE.Mesh(winGeo, teakMat);
      win.position.set(x, plinthTop + STOREY + 2.2, frontZ - 0.12);
      palace.add(win);
      const winLow = new THREE.Mesh(winGeo, teakMat);
      winLow.position.set(x, plinthTop + 2.4, frontZ - 0.12);
      palace.add(winLow);
    }
  }

  // Cutaway interiors: gallery (west) + jijabai wing (east) + shaista centre
  {
    // Gallery cut
    palace.add(
      (() => {
        const cut = new THREE.Mesh(track(new THREE.BoxGeometry(7.5, 3.6, 0.5)), shadowMat);
        cut.position.set(-12, plinthTop + 2.4, frontZ - 0.04);
        return cut;
      })(),
    );
    for (let i = 0; i < 4; i++) {
      const frame = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 1.8, 0.12)), teakMat);
      frame.position.set(-14.5 + i * 1.9, plinthTop + 2.6, frontZ + 1.5);
      palace.add(frame);
      const paint = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.3, 1.4, 0.08)),
        track(new THREE.MeshStandardMaterial({ color: i % 2 ? "#c47840" : "#6a4a88", roughness: 0.7 })),
      );
      paint.position.set(-14.5 + i * 1.9, plinthTop + 2.6, frontZ + 1.55);
      palace.add(paint);
    }
    for (let i = 0; i < 3; i++) {
      const ped = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.9, 0.9)), teakMat);
      ped.position.set(-14 + i * 2.4, plinthTop + 0.55, 0);
      ped.castShadow = true;
      palace.add(ped);
    }

    // Jijabai wing cut
    palace.add(
      (() => {
        const cut = new THREE.Mesh(track(new THREE.BoxGeometry(6.5, 3.4, 0.5)), shadowMat);
        cut.position.set(12, plinthTop + 2.3, frontZ - 0.04);
        return cut;
      })(),
    );
    const bed = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.35, 1.5)), teakMat);
    bed.position.set(13, plinthTop + 0.5, -1);
    bed.castShadow = true;
    palace.add(bed);
    const mat = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.6, 0.16, 1.3)),
      track(new THREE.MeshStandardMaterial({ color: "#d8c8a8", roughness: 0.95 })),
    );
    mat.position.set(13, plinthTop + 0.72, -1);
    palace.add(mat);
    const lamp = new THREE.PointLight("#ffd0a0", 12, 12, 2);
    lamp.position.set(12, plinthTop + 3.2, 0);
    palace.add(lamp);

    // Shaista hall centre recess + diorama block
    palace.add(
      (() => {
        const cut = new THREE.Mesh(track(new THREE.BoxGeometry(5, 3.2, 0.45)), shadowMat);
        cut.position.set(0, plinthTop + STOREY + 2, 0.2);
        return cut;
      })(),
    );
    const dais = new THREE.Mesh(track(new THREE.BoxGeometry(4, 0.4, 2.5)), trimMat);
    dais.position.set(0, plinthTop + 0.35, 3);
    palace.add(dais);
    const figure = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.4, 1.6, 8)), goldMat);
    figure.position.set(0, plinthTop + 1.3, 3);
    figure.castShadow = true;
    palace.add(figure);
    const hallLight = new THREE.PointLight("#ffc888", 16, 14, 2);
    hallLight.position.set(0, plinthTop + STOREY + 1.5, 3);
    palace.add(hallLight);
  }

  // Corner finials
  for (const [cx, cz] of [
    [-HALF_W + 1, -HALF_D + 1],
    [HALF_W - 1, -HALF_D + 1],
    [-HALF_W + 1, HALF_D - 1],
    [HALF_W - 1, HALF_D - 1],
  ] as [number, number][]) {
    const fin = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 1.4, 6)), goldMat);
    fin.position.set(cx, bodyTop + PARAPET + 0.7, cz);
    fin.castShadow = true;
    palace.add(fin);
  }

  scene.add(palace);

  /* garden ring + props from layout */
  const layout = buildMahalLayout();
  {
    const hedgeGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const hedges = layout.props.filter((p) => p.kind === "hedge");
    const hedgeMesh = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedges.length);
    hedgeMesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    hedges.forEach((h, i) => {
      const y = groundHeight(h.x, h.z);
      m.compose(
        new THREE.Vector3(h.x, y + 0.45, h.z),
        q,
        new THREE.Vector3(1.5 * h.scale, 0.85, 1.2 * h.scale),
      );
      hedgeMesh.setMatrixAt(i, m);
    });
    hedgeMesh.instanceMatrix.needsUpdate = true;
    scene.add(hedgeMesh);

    const flowers = layout.props.filter((p) => p.kind === "flower");
    const flowerMesh = new THREE.InstancedMesh(
      track(new THREE.IcosahedronGeometry(0.45, 0)),
      flowerMat,
      flowers.length,
    );
    flowers.forEach((f, i) => {
      const y = groundHeight(f.x, f.z);
      m.compose(
        new THREE.Vector3(f.x, y + 0.9, f.z),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      flowerMesh.setMatrixAt(i, m);
    });
    flowerMesh.instanceMatrix.needsUpdate = true;
    scene.add(flowerMesh);

    // Benches
    for (const b of layout.props.filter((p) => p.kind === "bench")) {
      const y = groundHeight(b.x, b.z);
      const seat = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.18, 0.7)), teakMat);
      seat.position.set(b.x, y + 0.45, b.z);
      seat.castShadow = true;
      scene.add(seat);
      const back = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.7, 0.12)), teakMat);
      back.position.set(b.x, y + 0.85, b.z + 0.3);
      scene.add(back);
    }
  }

  /* trees */
  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.22, 0.38, 3.2, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(515);
    let ci = 0;
    trees.forEach((t, i) => {
      const y = groundHeight(t.x, t.z);
      const s = t.scale;
      m.compose(
        new THREE.Vector3(t.x, y + 1.6 * s, t.z),
        q,
        new THREE.Vector3(s, s, s),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.8 - k * 0.7) * s;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.2,
            y + (3.6 + k * 1.3) * s,
            t.z + (rnd() - 0.5) * 1.2,
          ),
          q,
          new THREE.Vector3(sc, sc * 0.8, sc),
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

  /* entrance lamps */
  const lampGlowMat = track(
    new THREE.SpriteMaterial({
      map: track(radialSprite("rgba(255,214,150,0.95)", "rgba(255,140,50,0.3)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  {
    const lamps = layout.props.filter((p) => p.kind === "lamp");
    const postGeo = track(new THREE.CylinderGeometry(0.1, 0.14, 3.0, 6));
    for (const l of lamps) {
      const ly = groundHeight(l.x, l.z);
      const post = new THREE.Mesh(postGeo, teakMat);
      post.position.set(l.x, ly + 1.5, l.z);
      post.castShadow = true;
      scene.add(post);
      const glow = new THREE.Sprite(lampGlowMat);
      glow.scale.setScalar(4.2);
      glow.position.set(l.x, ly + 3.2, l.z);
      scene.add(glow);
    }
  }

  /* dust + rain */
  const DUST = 80;
  const dustGeo = track(new THREE.BufferGeometry());
  const dustSeed: number[] = [];
  {
    const arr = new Float32Array(DUST * 3);
    const rnd = mulberry32(19);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (rnd() - 0.5) * 80;
      arr[i * 3 + 1] = 1 + rnd() * 14;
      arr[i * 3 + 2] = (rnd() - 0.5) * 70;
      dustSeed.push(rnd() * 100);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.45,
      map: track(radialSprite("rgba(255,236,210,0.9)", "rgba(255,200,140,0.3)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.3,
    }),
  );
  scene.add(new THREE.Points(dustGeo, dustMat));

  const RAIN = 700;
  const rainGeo = track(new THREE.BufferGeometry());
  {
    const arr = new Float32Array(RAIN * 2 * 3);
    const rnd = mulberry32(77);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 90;
      const y = rnd() * 55;
      const z = (rnd() - 0.5) * 75;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y + 1.4;
      arr[i * 6 + 5] = z;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const rainMat = track(
    new THREE.LineBasicMaterial({ color: "#9ab8d0", transparent: true, opacity: 0 }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

  /* markers */
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
  const ringGeo = track(new THREE.RingGeometry(1.8, 2.3, 36));
  const hitGeo = track(new THREE.SphereGeometry(2.8, 10, 8));
  const bases = layout.markerBases;

  FEATURE_ORDER.forEach((id, i) => {
    const b = bases[id];
    const base = new THREE.Vector3(
      b.x,
      Math.max(groundHeight(b.x, b.z), b.y) + 0.15,
      b.z,
    );
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 5.5, 0));
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

  /* camera */
  const spherical = { radius: 180, phi: 0.4, theta: HOME.theta - 0.8 };
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
      markers.map((mk) => mk.hit),
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 22, 160);
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
  let seasonTarget = 0;
  const tmpColor = new THREE.Color();
  const monsoonSky = new THREE.Color("#4a6078");
  const monsoonFog = new THREE.Color("#6a7888");
  const monsoonHemiG = new THREE.Color("#2a4030");

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
    cur.wet = damp(cur.wet, seasonTarget, 2.4, dt);
    updateSunDir();

    if (cur.wet > 0.01) {
      cur.skyTop.lerp(monsoonSky, cur.wet * 0.4);
      cur.skyBottom.lerp(monsoonFog, cur.wet * 0.35);
      cur.fog.lerp(monsoonFog, cur.wet * 0.45);
      cur.hemiGround.lerp(monsoonHemiG, cur.wet * 0.5);
      cur.sunIntensity *= 1 - cur.wet * 0.35;
      cur.ambient += cur.wet * 0.12;
    }

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.8 + cur.wet * 0.3;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.4);
    sun.position.copy(sunDir).multiplyScalar(140);
    fog.color.copy(cur.fog);
    fog.near = 140 - cur.wet * 55;
    fog.far = 420 - cur.wet * 160;
    if (cur.wet < 0.05) {
      fog.far = 460;
    }
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    groundMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.8, cur.wet),
      THREE.MathUtils.lerp(0.96, 1.05, cur.wet),
      THREE.MathUtils.lerp(0.88, 0.86, cur.wet),
    );

    // Brick stays warm; monsoon slightly darkens
    brickMat.color.setRGB(
      THREE.MathUtils.lerp(0.66, 0.52, cur.wet),
      THREE.MathUtils.lerp(0.28, 0.24, cur.wet),
      THREE.MathUtils.lerp(0.22, 0.22, cur.wet),
    );

    lampGlowMat.opacity = cur.lantern * 0.85;

    dustMat.opacity = (1 - cur.wet) * (0.12 + cur.lantern * 0.2);
    if (motion && cur.wet < 0.85) {
      const attr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        attr.setY(i, 2 + ((elapsed * 0.3 + s) % 14));
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.28 + s) * dt * 1.0);
      }
      attr.needsUpdate = true;
    }

    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.52;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      const fall = 40 + cur.wet * 16;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - fall * dt;
        if (y < 0) y = 55;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.4);
      }
      attr.needsUpdate = true;
    }

    // Markers
    for (const mk of markers) {
      const on = mk.id === activeId;
      const mat = mk.sprite.material as THREE.SpriteMaterial;
      if (mat.map !== (on ? mk.activeTex : mk.idleTex)) {
        mat.map = on ? mk.activeTex : mk.idleTex;
        mat.needsUpdate = true;
      }
      const bob = motion ? Math.sin(elapsed * 2.2 + mk.base.x) * 0.12 : 0;
      mk.sprite.position.set(mk.base.x, mk.base.y + 5.5 + bob + (on ? 0.4 : 0), mk.base.z);
      mk.hit.position.copy(mk.sprite.position);
      const ringMat = mk.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = on ? 0.75 : 0.35;
      mk.ring.scale.setScalar(on ? 1.15 + Math.sin(elapsed * 3) * 0.06 : 1);
    }

    // Intro + camera
    if (intro < 1) {
      intro = Math.min(1, intro + dt * 0.55);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(180, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.35, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.8, desired.theta, e);
      if (intro >= 1 && !ready) {
        ready = true;
        options.onReady();
      }
    } else {
      if (!ready) {
        ready = true;
        options.onReady();
      }
      idleTimer += dt;
      if (autoRotate && !activeId && idleTimer > 2.5 && motion) {
        desired.theta += dt * 0.08;
      }
      spherical.radius = damp(spherical.radius, desired.radius, 3.5, dt);
      spherical.phi = damp(spherical.phi, desired.phi, 3.5, dt);
      spherical.theta = damp(spherical.theta, desired.theta, 3.5, dt);
      target.x = damp(target.x, desiredTarget.x, 3.2, dt);
      target.y = damp(target.y, desiredTarget.y, 3.2, dt);
      target.z = damp(target.z, desiredTarget.z, 3.2, dt);
    }
    applyCamera();
    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(tick);

  const focusFeature = (id: FeatureId | null) => {
    activeId = id;
    if (!id) {
      desiredTarget.copy(HOME.target);
      desired.radius = HOME.radius;
      desired.phi = HOME.phi;
      desired.theta = HOME.theta;
      return;
    }
    const a = ANCHORS[id];
    desiredTarget.copy(a.target);
    desired.radius = a.distance;
    const dir = a.dir.clone().normalize();
    desired.phi = Math.acos(clamp(dir.y, -1, 1));
    desired.theta = Math.atan2(dir.x, dir.z);
    autoRotate = false;
    idleTimer = 0;
  };

  return {
    setTimeOfDay(t) {
      paletteTarget = PALETTES[t];
    },
    setSeason(s) {
      seasonTarget = s === "monsoon" ? 1 : 0;
    },
    setActive(id) {
      focusFeature(id);
    },
    resetView() {
      focusFeature(null);
      autoRotate = true;
      idleTimer = 0;
    },
    setPaused(p) {
      paused = p;
      if (!p) clock.getDelta();
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
      if (canvas.parentElement === container) container.removeChild(canvas);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
