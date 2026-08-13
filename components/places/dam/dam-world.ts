/**
 * A hand-built, procedural 3D model of Khadakwasla Dam.
 *
 * Same approach as the other dioramas: plain three.js, zero external assets.
 * What defines this place is a long masonry gravity wall across the Mutha,
 * Khadakwasla Lake on one side, eleven radial sluices in the face, a
 * chowpatty promenade of evening vendors, and Sinhagad on the ridge behind
 * the water.
 *
 * This is a dam and a lake, not a fort or a memorial. Do not reuse those scenes.
 *
 * Mode: dry = receded lake; monsoon = brim-full reservoir.
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
  | "dam-wall"
  | "reservoir"
  | "sluice-gates"
  | "promenade"
  | "sinhagad-hill";

/** dry = receded lake, monsoon = full reservoir. */
export type DamMode = "dry" | "monsoon";

export type DamWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type DamWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: DamMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "dam-wall",
  "reservoir",
  "sluice-gates",
  "promenade",
  "sinhagad-hill",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Long masonry wall spanning X. Crest is the walk. */
export const DAM = { z: 0, halfW: 40, crestY: 5.6, baseY: -1.4, thickness: 5.4 };

/** Reservoir (Khadakwasla Lake) on the −Z side of the wall. */
export const RESERVOIR = {
  zBack: -52,
  zFront: -DAM.thickness / 2,
  yDry: 1.55,
  yMonsoon: 4.85,
};

/** Downstream Mutha on the +Z side. */
export const DOWNSTREAM = { zFront: 26, yDry: -0.7, yMonsoon: 0.55 };

/** Eleven radial sluices set in the wall. */
export const SLUICE = { count: 11, spacing: 3.35, width: 2.15, height: 2.7, y: 2.15 };

/** Chowpatty promenade on the downstream crest. */
export const PROMENADE = { z: DAM.thickness / 2 + 1.35, y: DAM.crestY, halfW: 34 };

/** Sinhagad mass behind the lake. */
export const SINHAGAD = { x: -6, z: -44, h: 21, halfW: 16 };

export const VENDOR_ZS = PROMENADE.z;

export function getWaterLevel(mode: DamMode): number {
  return mode === "monsoon" ? RESERVOIR.yMonsoon : RESERVOIR.yDry;
}

export function getDownstreamLevel(mode: DamMode): number {
  return mode === "monsoon" ? DOWNSTREAM.yMonsoon : DOWNSTREAM.yDry;
}

export function inReservoir(x: number, z: number): boolean {
  return Math.abs(x) < DAM.halfW + 10 && z < RESERVOIR.zFront && z > RESERVOIR.zBack;
}

export function inDownstream(x: number, z: number): boolean {
  return Math.abs(x) < DAM.halfW - 1.5 && z > DAM.thickness / 2 && z < DOWNSTREAM.zFront;
}

export function onWall(x: number, z: number): boolean {
  return Math.abs(x) < DAM.halfW && Math.abs(z - DAM.z) < DAM.thickness / 2 + 0.2;
}

export function sluiceSpec(i: number): { x: number; y: number; z: number } {
  const start = -((SLUICE.count - 1) * SLUICE.spacing) / 2;
  return { x: start + i * SLUICE.spacing, y: SLUICE.y, z: DAM.z };
}

export function vendorSpec(i: number): { x: number; z: number; yaw: number } {
  const start = -PROMENADE.halfW + 4;
  return {
    x: start + i * 5.4,
    z: PROMENADE.z + 1.1,
    yaw: Math.PI,
  };
}

/**
 * Terrain height at a world XZ. The wall itself is a mesh; the lake bed
 * sits below the water plane; Sinhagad rises behind the reservoir.
 */
export function terrainHeight(x: number, z: number): number {
  let h = 0.08 * Math.sin(x * 0.08) * Math.cos(z * 0.07);

  if (onWall(x, z)) {
    return DAM.crestY - 0.15;
  }

  if (inReservoir(x, z)) {
    const shore = Math.min(DAM.halfW + 10 - Math.abs(x), z - RESERVOIR.zBack, RESERVOIR.zFront - z);
    const bed = -1.8 + 0.25 * Math.sin(x * 0.15) * Math.cos(z * 0.12);
    if (shore < 4) return THREE_LERP(bed, 1.2, 1 - shore / 4);
    return bed;
  }

  if (inDownstream(x, z)) {
    return -1.1 + 0.12 * Math.sin(x * 0.3);
  }

  // Sinhagad mass — a real hill, not a painted backdrop.
  const hx = x - SINHAGAD.x;
  const hz = z - SINHAGAD.z;
  const hill = 1 - clamp(Math.hypot(hx / SINHAGAD.halfW, hz / 11), 0, 1);
  if (hill > 0) {
    h = Math.max(h, SINHAGAD.h * hill * hill + 1.4 * Math.sin(hx * 0.35) * Math.sin(hz * 0.4));
  }

  // Valley shoulders.
  if (Math.abs(x) > DAM.halfW - 2) {
    const rise = smoothstep(DAM.halfW - 2, DAM.halfW + 14, Math.abs(x));
    h = Math.max(h, 2.2 * rise + 6 * rise * rise);
  }

  const outside = Math.max(Math.abs(x), Math.abs(z)) - 58;
  if (outside > -1) h -= 18 * smoothstep(-1, 6, outside);

  return h;
}

function THREE_LERP(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

export type DamPropKind = "sluice" | "vendor" | "lamp" | "tree" | "boat";

export type DamPropSpec = {
  kind: DamPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export function buildDamLayout(seed = 1879): {
  props: DamPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  sluiceCount: number;
  vendorCount: number;
} {
  const rnd = mulberry32(seed);
  const props: DamPropSpec[] = [];
  const push = (p: DamPropSpec) => props.push(p);

  for (let i = 0; i < SLUICE.count; i++) {
    const s = sluiceSpec(i);
    push({ kind: "sluice", x: s.x, y: s.y, z: s.z, scale: 1, feature: "sluice-gates" });
  }

  const vendorCount = 10;
  for (let i = 0; i < vendorCount; i++) {
    const v = vendorSpec(i);
    push({
      kind: "vendor",
      x: v.x,
      y: PROMENADE.y,
      z: v.z,
      scale: 0.9 + (i % 3) * 0.08,
      feature: "promenade",
    });
  }

  for (let i = 0; i < 12; i++) {
    const t = (i / 11) * 2 - 1;
    push({
      kind: "lamp",
      x: t * (DAM.halfW - 2),
      y: DAM.crestY,
      z: PROMENADE.z - 0.4,
      scale: 1,
      feature: "dam-wall",
    });
  }

  // A couple of small boats on the lake.
  for (const [bx, bz] of [
    [-10, -18],
    [8, -24],
    [-3, -14],
  ] as [number, number][]) {
    push({
      kind: "boat",
      x: bx,
      y: RESERVOIR.yDry,
      z: bz,
      scale: 1,
      feature: "reservoir",
    });
  }

  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 24 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 100;
    const z = (rnd() - 0.5) * 100;
    if (inReservoir(x, z) || inDownstream(x, z) || onWall(x, z)) continue;
    if (Math.abs(x) < DAM.halfW + 3 && Math.abs(z) < 8) continue;
    if (Math.hypot(x - SINHAGAD.x, z - SINHAGAD.z) < 12) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 50) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z, s: 0.85 + rnd() * 0.5 });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: Math.max(terrainHeight(s.x, s.z), 0),
      z: s.z,
      scale: s.s,
      feature: "sinhagad-hill",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "dam-wall": { x: 0, y: DAM.crestY + 2.2, z: DAM.z },
    reservoir: { x: 0, y: RESERVOIR.yMonsoon + 1.2, z: -20 },
    "sluice-gates": { x: 0, y: SLUICE.y + 3.2, z: DAM.z },
    promenade: { x: 0, y: PROMENADE.y + 2.4, z: PROMENADE.z },
    "sinhagad-hill": { x: SINHAGAD.x, y: SINHAGAD.h * 0.7, z: SINHAGAD.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    sluiceCount: SLUICE.count,
    vendorCount,
  };
}

export function getDamAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "dam-wall": {
      target: [0, DAM.crestY * 0.55, DAM.z],
      dir: [0.22, 0.38, 0.9],
      distance: 38,
    },
    reservoir: {
      target: [0, 2.4, -18],
      dir: [0.15, 0.42, 0.9],
      distance: 36,
    },
    "sluice-gates": {
      target: [0, SLUICE.y + 0.4, DAM.z + 1],
      dir: [0.08, 0.32, 0.94],
      distance: 18,
    },
    promenade: {
      target: [0, PROMENADE.y + 0.4, PROMENADE.z],
      dir: [0.35, 0.4, 0.85],
      distance: 22,
    },
    "sinhagad-hill": {
      target: [SINHAGAD.x, SINHAGAD.h * 0.45, SINHAGAD.z],
      dir: [0.2, 0.35, 0.92],
      distance: 40,
    },
  };
}

export function getDamHomeView() {
  return {
    // Promenade side, looking along the wall toward the lake and Sinhagad.
    // Low enough that the crest reads as a walk, not a board.
    target: [0, 4.2, 2] as [number, number, number],
    radius: 40,
    phi: 1.2,
    theta: 0.32,
  };
}

export function getDamPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — misty dawn, sunset gold over water, lamp-lit dusk        */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a3a5c",
    skyBottom: "#f0c8a4",
    sun: "#ffd0a0",
    sunIntensity: 2.05,
    hemiSky: "#b0c8dc",
    hemiGround: "#4a4536",
    ambient: 0.74,
    fog: "#e4d0b4",
    waterDeep: "#1e4a58",
    waterShallow: "#6aa8a8",
    lantern: 0.22,
    sunAzimuth: 2.2,
    sunElevation: 0.24,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3c2850",
    skyBottom: "#ffb46a",
    sun: "#ff9a48",
    sunIntensity: 2.7,
    hemiSky: "#d0b8c8",
    hemiGround: "#5a4830",
    ambient: 0.76,
    fog: "#f0c090",
    waterDeep: "#24524c",
    waterShallow: "#88c0a0",
    lantern: 0.48,
    sunAzimuth: -0.82,
    sunElevation: 0.22,
    exposure: 1.02,
  },
  dusk: {
    skyTop: "#060814",
    skyBottom: "#2a1830",
    sun: "#6a64b8",
    sunIntensity: 0.24,
    hemiSky: "#222848",
    hemiGround: "#121018",
    ambient: 0.28,
    fog: "#161224",
    waterDeep: "#0a1828",
    waterShallow: "#1e4060",
    lantern: 1,
    sunAzimuth: -1.35,
    sunElevation: 0.04,
    exposure: 1.16,
  },
};

const WATER_VERT = [
  "varying vec3 vWorld;",
  "void main() {",
  "  vec4 world = modelMatrix * vec4(position, 1.0);",
  "  vWorld = world.xyz;",
  "  gl_Position = projectionMatrix * viewMatrix * world;",
  "}",
].join("\n");

const WATER_FRAG = [
  "uniform float uTime;",
  "uniform vec3 uDeep;",
  "uniform vec3 uShallow;",
  "uniform vec3 uSky;",
  "uniform vec3 uSunDir;",
  "uniform vec3 uSunColor;",
  "uniform vec3 uCamera;",
  "uniform float uChop;",
  "varying vec3 vWorld;",
  "",
  "float waves(vec2 p) {",
  "  float h = 0.0;",
  "  h += sin(dot(p, normalize(vec2(1.0, 0.35))) * 0.55 + uTime * 1.1) * 0.50;",
  "  h += sin(dot(p, normalize(vec2(-0.4, 1.0))) * 0.83 + uTime * 1.5) * 0.32;",
  "  h += sin(dot(p, normalize(vec2(0.7, -0.7))) * 1.60 + uTime * 2.2) * 0.14;",
  "  return h;",
  "}",
  "",
  "void main() {",
  "  vec2 p = vWorld.xz;",
  "  float eps = 0.35;",
  "  float h = waves(p);",
  "  float hx = waves(p + vec2(eps, 0.0));",
  "  float hz = waves(p + vec2(0.0, eps));",
  "  float amp = 0.11 * uChop;",
  "  vec3 normal = normalize(vec3((h - hx) * amp / eps, 1.0, (h - hz) * amp / eps));",
  "  vec3 view = normalize(uCamera - vWorld);",
  "  float fres = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.2);",
  "  vec3 base = mix(uDeep, uShallow, clamp(h * 0.35 + 0.5, 0.0, 1.0));",
  "  vec3 col = mix(base, uSky, fres * 0.5);",
  "  vec3 halfDir = normalize(normalize(uSunDir) + view);",
  "  col += uSunColor * pow(clamp(dot(normal, halfDir), 0.0, 1.0), 220.0) * 1.7;",
  "  gl_FragColor = vec4(col, 0.88);",
  "}",
].join("\n");

/* ------------------------------------------------------------------ */
/* Runtime                                                             */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getDamAnchors();
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
const homeRaw = getDamHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

export function createDamWorld(container: HTMLElement, options: DamWorldOptions): DamWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildDamLayout();

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
  const fog = new THREE.Fog("#f0c090", 140, 480);
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
    fest: 0,
    waterY: RESERVOIR.yDry,
    downY: DOWNSTREAM.yDry,
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

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#b4a894", roughness: 0.9, metalness: 0.04 }),
  );
  const stoneDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#7a7060", roughness: 0.92 }),
  );
  const concreteMat = track(
    new THREE.MeshStandardMaterial({ color: "#c8c0b2", roughness: 0.86 }),
  );
  const steelMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a7278", roughness: 0.35, metalness: 0.7 }),
  );
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#8a4a28", roughness: 0.8 }));
  const canvasMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8b46a", roughness: 0.85, side: THREE.DoubleSide }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a7a36", roughness: 0.95, flatShading: true }),
  );
  const hillMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a6048", roughness: 0.96, flatShading: true }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(128, 128, 120, 120));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const bank = new THREE.Color("#8a7a58");
  const grass = new THREE.Color("#5a7a3c");
  const grassDark = new THREE.Color("#3e5c2c");
  const mud = new THREE.Color("#6a5a42");
  const rock = new THREE.Color("#6e6658");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(51);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (onWall(x, z)) tmp.copy(concreteMat.color);
    else if (inReservoir(x, z) || inDownstream(x, z)) tmp.copy(mud).lerp(bank, colorRnd() * 0.4);
    else if (z < SINHAGAD.z + 14 && Math.abs(x - SINHAGAD.x) < 20) tmp.copy(rock).lerp(grassDark, colorRnd());
    else tmp.copy(grass).lerp(grassDark, colorRnd());
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(
    groundGeo,
    track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const base = new THREE.Mesh(
    track(new THREE.BoxGeometry(124, 16, 124)),
    track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 })),
  );
  base.position.y = -9.4;
  scene.add(base);

  /* --- dam wall --- */

  {
    const wallH = DAM.crestY - DAM.baseY;
    const wall = new THREE.Mesh(
      track(new THREE.BoxGeometry(DAM.halfW * 2, wallH, DAM.thickness)),
      stoneMat,
    );
    wall.position.set(0, DAM.baseY + wallH / 2, DAM.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    const crest = new THREE.Mesh(
      track(new THREE.BoxGeometry(DAM.halfW * 2 + 0.4, 0.22, DAM.thickness + 1.1)),
      concreteMat,
    );
    crest.position.set(0, DAM.crestY + 0.08, DAM.z + 0.2);
    crest.receiveShadow = true;
    scene.add(crest);

    // Parapet on the lake side.
    const parapet = new THREE.Mesh(
      track(new THREE.BoxGeometry(DAM.halfW * 2, 0.85, 0.28)),
      stoneDarkMat,
    );
    parapet.position.set(0, DAM.crestY + 0.55, -DAM.thickness / 2 + 0.15);
    parapet.castShadow = true;
    scene.add(parapet);

    // Downstream batter so the wall reads as a gravity dam, not a fence.
    const batter = new THREE.Mesh(track(new THREE.BoxGeometry(DAM.halfW * 2 - 1, wallH * 0.7, 1.8)), stoneDarkMat);
    batter.position.set(0, DAM.baseY + wallH * 0.32, DAM.thickness / 2 + 0.5);
    batter.rotation.x = 0.18;
    batter.castShadow = true;
    batter.receiveShadow = true;
    scene.add(batter);
  }

  /* --- radial sluices --- */

  const sluiceGates: THREE.Mesh[] = [];
  {
    for (let i = 0; i < SLUICE.count; i++) {
      const s = sluiceSpec(i);
      const frame = new THREE.Mesh(
        track(new THREE.BoxGeometry(SLUICE.width + 0.35, SLUICE.height + 0.4, 0.35)),
        stoneDarkMat,
      );
      frame.position.set(s.x, s.y, DAM.z + DAM.thickness / 2 - 0.05);
      scene.add(frame);

      const opening = new THREE.Mesh(
        track(new THREE.BoxGeometry(SLUICE.width, SLUICE.height, DAM.thickness + 0.4)),
        track(new THREE.MeshStandardMaterial({ color: "#1a242c", roughness: 1 })),
      );
      opening.position.set(s.x, s.y, DAM.z);
      scene.add(opening);

      const gate = new THREE.Mesh(
        track(new THREE.BoxGeometry(SLUICE.width - 0.15, SLUICE.height - 0.2, 0.12)),
        steelMat,
      );
      gate.position.set(s.x, s.y - 0.15, DAM.z + DAM.thickness / 2 - 0.35);
      gate.castShadow = true;
      scene.add(gate);
      sluiceGates.push(gate);

      const hoist = new THREE.Mesh(track(new THREE.BoxGeometry(0.35, 0.9, 0.35)), steelMat);
      hoist.position.set(s.x, DAM.crestY + 0.55, DAM.z + 0.4);
      scene.add(hoist);
    }
  }

  /* --- water --- */

  const waterMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: cur.waterDeep },
        uShallow: { value: cur.waterShallow },
        uSky: { value: cur.skyBottom },
        uSunDir: { value: sunDir },
        uSunColor: { value: cur.sun },
        uCamera: { value: new THREE.Vector3() },
        uChop: { value: 1 },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    }),
  );
  const lake = new THREE.Mesh(
    track(new THREE.PlaneGeometry(DAM.halfW * 2 + 18, 46, 1, 1)),
    waterMat,
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, RESERVOIR.yDry, (RESERVOIR.zBack + RESERVOIR.zFront) / 2);
  lake.renderOrder = 2;
  scene.add(lake);

  const river = new THREE.Mesh(
    track(new THREE.PlaneGeometry(DAM.halfW * 1.4, 22, 1, 1)),
    waterMat,
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, DOWNSTREAM.yDry, 14);
  river.renderOrder = 2;
  scene.add(river);

  /* --- promenade vendors --- */

  {
    const stallGeo = track(new THREE.BoxGeometry(2.2, 1.15, 1.5));
    const roofGeo = track(new THREE.BoxGeometry(2.5, 0.08, 1.8));
    for (const p of layout.props) {
      if (p.kind !== "vendor") continue;
      const stall = new THREE.Mesh(stallGeo, woodMat);
      stall.position.set(p.x, p.y + 0.55, p.z);
      stall.castShadow = true;
      scene.add(stall);
      const roof = new THREE.Mesh(roofGeo, canvasMat);
      roof.position.set(p.x, p.y + 1.35, p.z);
      roof.rotation.z = 0.04;
      roof.castShadow = true;
      scene.add(roof);
    }
  }

  /* --- crest lamps --- */

  const lampFlames: THREE.Sprite[] = [];
  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,140,40,0.4)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
    }),
  );
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.09, 2.8, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.16, 0.1, 0.18, 8));
    for (const p of layout.props) {
      if (p.kind !== "lamp") continue;
      const pole = new THREE.Mesh(poleGeo, steelMat);
      pole.position.set(p.x, p.y + 1.4, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const cup = new THREE.Mesh(cupGeo, steelMat);
      cup.position.set(p.x, p.y + 2.85, p.z);
      scene.add(cup);
      const spr = new THREE.Sprite(flameMat);
      spr.scale.setScalar(0.7);
      spr.position.set(p.x, p.y + 3.1, p.z);
      scene.add(spr);
      lampFlames.push(spr);
    }
  }

  /* --- boats --- */

  {
    for (const p of layout.props) {
      if (p.kind !== "boat") continue;
      const hull = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.35, 3.2)), woodMat);
      hull.position.set(p.x, 0, p.z);
      hull.castShadow = true;
      scene.add(hull);
      const bow = new THREE.Mesh(track(new THREE.ConeGeometry(0.7, 1.1, 6)), woodMat);
      bow.rotation.x = -Math.PI / 2;
      bow.position.set(p.x, 0, p.z - 1.9);
      scene.add(bow);
      (hull.userData as { boat: true; x: number; z: number }).boat = true;
      hull.userData.x = p.x;
      hull.userData.z = p.z;
    }
  }
  const boats = scene.children.filter((o) => (o.userData as { boat?: boolean }).boat);

  /* --- Sinhagad hill crown (tiny fort block) --- */

  {
    const crown = new THREE.Mesh(track(new THREE.BoxGeometry(5.4, 1.6, 3.2)), stoneDarkMat);
    crown.position.set(SINHAGAD.x, SINHAGAD.h + 0.4, SINHAGAD.z);
    crown.castShadow = true;
    scene.add(crown);
    const keep = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 2.2, 1.6)), stoneMat);
    keep.position.set(SINHAGAD.x, SINHAGAD.h + 1.8, SINHAGAD.z);
    keep.castShadow = true;
    scene.add(keep);
    // Extra hill bulk so the silhouette reads from the promenade.
    const mass = new THREE.Mesh(track(new THREE.ConeGeometry(14, 16, 8)), hillMat);
    mass.position.set(SINHAGAD.x, 7.2, SINHAGAD.z);
    mass.castShadow = true;
    mass.receiveShadow = true;
    scene.add(mass);
  }

  /* --- trees --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.24, 0.4, 3.1, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(701);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.55 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.6 - k * 0.65) * t.scale;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(t.x + (rnd() - 0.5), t.y + (3.6 + k * 1.2) * t.scale, t.z + (rnd() - 0.5)),
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

  /* --- markers --- */

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

  const spherical = { radius: HOME.radius + 20, phi: HOME.phi - 0.14, theta: HOME.theta - 0.25 };
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
  let waterTarget = RESERVOIR.yDry;
  let downTarget = DOWNSTREAM.yDry;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 7, 18);

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
    lerpColor(cur.waterDeep, paletteTarget.waterDeep, k);
    lerpColor(cur.waterShallow, paletteTarget.waterShallow, k);
    cur.sunIntensity = damp(cur.sunIntensity, paletteTarget.sunIntensity, 3.2, dt);
    cur.ambient = damp(cur.ambient, paletteTarget.ambient, 3.2, dt);
    cur.lantern = damp(cur.lantern, paletteTarget.lantern, 3.2, dt);
    cur.azimuth = damp(cur.azimuth, paletteTarget.sunAzimuth, 3.2, dt);
    cur.elevation = damp(cur.elevation, paletteTarget.sunElevation, 3.2, dt);
    cur.exposure = damp(cur.exposure, paletteTarget.exposure, 3.2, dt);
    cur.fest = damp(cur.fest, festTarget, 2.2, dt);
    cur.waterY = damp(cur.waterY, waterTarget, 1.4, dt);
    cur.downY = damp(cur.downY, downTarget, 1.4, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.7 + cur.fest * 0.15;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    lake.position.y = cur.waterY;
    river.position.y = cur.downY;
    waterMat.uniforms.uTime.value = elapsed;
    waterMat.uniforms.uCamera.value.copy(camera.position);
    waterMat.uniforms.uChop.value = 0.7 + cur.fest * 0.5;

    const lampLevel = clamp(cur.lantern + cur.fest * 0.25, 0, 1.2);
    flameMat.opacity = 0.25 + lampLevel * 0.7;
    for (let i = 0; i < lampFlames.length; i++) {
      lampFlames[i].scale.setScalar(0.7 * (0.85 + Math.sin(elapsed * 6 + i) * 0.16 * motion + 0.15));
    }

    const gateLift = cur.fest * 1.35;
    for (const gate of sluiceGates) {
      gate.position.y = SLUICE.y - 0.15 + gateLift;
    }

    for (const boat of boats) {
      const bx = boat.userData.x as number;
      const bz = boat.userData.z as number;
      boat.position.y = cur.waterY + 0.12 + Math.sin(elapsed * 1.4 + bx) * 0.06 * motion;
      boat.position.x = bx + Math.sin(elapsed * 0.25 + bz) * 0.35 * motion;
      boat.rotation.z = Math.sin(elapsed * 1.1 + bx) * 0.04 * motion;
    }

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
      intro = Math.min(1, intro + dt / 2.4);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(HOME.radius + 20, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(HOME.phi - 0.14, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.25, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.03;
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
      festTarget = m === "monsoon" ? 1 : 0;
      waterTarget = getWaterLevel(m);
      downTarget = getDownstreamLevel(m);
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
