/**
 * A hand-built, procedural 3D model of Parvati Hill and its temple complex.
 *
 * Same approach as the other dioramas (components/places/temple,
 * components/places/okayama): plain three.js, zero external assets, geometry
 * generated at runtime. The model reads the hill as a visitor does from
 * Parvati Paytha — the straight flight of 103 stone steps climbing the south
 * face, the old gateway midway, then the summit court: the Devdeveshwar
 * temple with its shikhara, the smaller shrines, the Peshwa museum, and the
 * parapet with the city of Pune spread out below.
 *
 * The "mode" of the scene is an ordinary darshan day, or Mahashivratri, when
 * the stairway is strung with lights from the paytha to the summit.
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
  | "steps"
  | "gateway"
  | "devdeveshwar"
  | "shrine-cluster"
  | "peshwa-museum"
  | "panorama";

/** darshan = an ordinary day, mahashivratri = the festival night illumination. */
export type HillMode = "darshan" | "mahashivratri";

export type HillWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type HillWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: HillMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "steps",
  "gateway",
  "devdeveshwar",
  "shrine-cluster",
  "peshwa-museum",
  "panorama",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** The hill itself: flat summit plateau, domed flanks. */
export const HILL = { plateauY: 24, plateauR: 18, baseR: 40 };

/** The signature stone stairway, climbing the south face (+Z) of the hill. */
export const STAIR = { count: 103, width: 7, z0: 20, z1: 62 };

/** The old gateway, partway up the steps. */
export const GATEWAY = { z: 34, opening: 6.4, pierW: 2.2, h: 4.6 };

/** Devdeveshwar — the main Shiva temple on the summit. */
export const MAIN_TEMPLE = {
  x: 0,
  z: -7,
  plinthW: 13,
  plinthD: 10,
  plinthH: 1.2,
  colH: 4,
  sanctumW: 8,
  sanctumD: 6,
  sanctumH: 5,
};

/** The Peshwa museum — a wada-roofed building on the east of the court. */
export const MUSEUM = { x: 10, z: -8, w: 10, d: 7, h: 4.2 };

/** The smaller shrines (Vishnu, Ganesha, Kartikeya) around the main temple. */
export const SHRINES = [
  { x: -10, z: -1, scale: 1 },
  { x: -9, z: -9, scale: 0.85 },
  { x: 9, z: 2, scale: 0.9 },
] as const;

/** Deepstambh lamp tower in the summit court. */
export const DEEPSTAMBH = { x: 5, z: 3 };

/** Low parapet wall ringing the summit rim. */
export const PARAPET_R = 16.5;

/** Top surface height of the stair ramp at a given z (pure). */
export function stairTopAt(z: number): number {
  return HILL.plateauY * clamp((STAIR.z1 - z) / (STAIR.z1 - STAIR.z0), 0, 1);
}

/** Centre z and top y of step i (0 = top step at the summit end). Pure. */
export function stepSpec(i: number): { z: number; topY: number; tread: number } {
  const tread = (STAIR.z1 - STAIR.z0) / STAIR.count;
  const z = STAIR.z0 + (i + 0.5) * tread;
  return { z, topY: stairTopAt(z), tread };
}

export type HillPropKind =
  | "tree"
  | "stair-lamp"
  | "gate-lamp"
  | "shrine"
  | "museum"
  | "bench"
  | "building";

export type HillPropSpec = {
  kind: HillPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export type HillBuildingSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
};

/** Dome height of the hill at XZ, before the stair shoulder is cut in. Pure. */
export function hillDome(x: number, z: number): number {
  const r = Math.hypot(x, z);
  return HILL.plateauY * smoothstep(HILL.baseR, HILL.plateauR, r);
}

/** Terrain height at a world XZ. y = 0 is the plain the city sits on. */
export function terrainHeight(x: number, z: number): number {
  let h = 0.22 * Math.sin(x * 0.05) * Math.cos(z * 0.045);
  h += hillDome(x, z);

  // The stair shoulder: a ramp cut along the corridor the steps climb.
  const corridor =
    smoothstep(7.5, 4.5, Math.abs(x)) *
    smoothstep(STAIR.z0 - 3, STAIR.z0 + 3, z) *
    smoothstep(STAIR.z1 + 3, STAIR.z1 - 3, z);
  h = Math.max(h, stairTopAt(z) * corridor);

  // Plateau falloff — the diorama is an object with a cut edge.
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 60;
  if (outside > -1) h -= 26 * smoothstep(-1, 4, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/**
 * Deterministic layout of hill props, city blocks and marker bases. Pure — no
 * three.js objects — so vitest can assert density and feature coverage
 * without WebGL.
 */
export function buildHillLayout(seed = 1749): {
  props: HillPropSpec[];
  propCount: number;
  buildings: HillBuildingSpec[];
  buildingCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  stepCount: number;
} {
  const rnd = mulberry32(seed);
  const props: HillPropSpec[] = [];
  const push = (p: HillPropSpec) => props.push(p);

  // Stair lamps — three pairs flanking the climb.
  for (const z of [26, 38, 50]) {
    for (const side of [-1, 1]) {
      push({
        kind: "stair-lamp",
        x: side * (STAIR.width / 2 + 0.9),
        y: stairTopAt(z),
        z,
        scale: 1,
        feature: "steps",
      });
    }
  }

  // Gate lamps either side of the archway.
  for (const side of [-1, 1]) {
    push({
      kind: "gate-lamp",
      x: side * (GATEWAY.opening / 2 + GATEWAY.pierW + 1.2),
      y: stairTopAt(GATEWAY.z),
      z: GATEWAY.z,
      scale: 1,
      feature: "gateway",
    });
  }

  // Main temple + the shrine cluster (conceptual props for feature coverage).
  push({
    kind: "shrine",
    x: MAIN_TEMPLE.x,
    y: HILL.plateauY,
    z: MAIN_TEMPLE.z,
    scale: 1.6,
    feature: "devdeveshwar",
  });
  for (const s of SHRINES) {
    push({ kind: "shrine", x: s.x, y: HILL.plateauY, z: s.z, scale: s.scale, feature: "shrine-cluster" });
  }

  // The museum.
  push({ kind: "museum", x: MUSEUM.x, y: HILL.plateauY, z: MUSEUM.z, scale: 1, feature: "peshwa-museum" });

  // Benches at the south parapet, facing the view.
  for (const x of [-3, 3]) {
    push({ kind: "bench", x, y: HILL.plateauY, z: 13.5, scale: 1, feature: "panorama" });
  }

  // Trees on the flanks — never on the plateau, never in the stair corridor.
  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 38 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 110;
    const z = (rnd() - 0.5) * 110;
    const r = Math.hypot(x, z);
    if (r < HILL.plateauR + 3 || r > HILL.baseR + 10) continue;
    if (Math.abs(x) < 8 && z > STAIR.z0 - 4) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 52) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 5)) continue;
    treeSpots.push({ x, z, s: 0.8 + rnd() * 0.7 });
  }
  for (const s of treeSpots) {
    push({ kind: "tree", x: s.x, y: groundHeight(s.x, s.z), z: s.z, scale: s.s, feature: null });
  }

  // The city below — muted blocks ringing the hill.
  const buildings: HillBuildingSpec[] = [];
  guard = 0;
  while (buildings.length < 150 && guard < 6000) {
    guard++;
    const x = (rnd() - 0.5) * 112;
    const z = (rnd() - 0.5) * 112;
    if (Math.hypot(x, z) < HILL.baseR - 1) continue;
    if (Math.abs(x) < 10 && z > 14) continue; // keep the stair axis + view clear
    if (Math.max(Math.abs(x), Math.abs(z)) > 54) continue;
    if (buildings.some((b) => Math.hypot(b.x - x, b.z - z) < 4)) continue;
    buildings.push({
      x,
      z,
      w: 2.5 + rnd() * 3.5,
      d: 2.5 + rnd() * 3.5,
      h: 2.5 + rnd() * 7.5,
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    steps: { x: 0, y: stairTopAt(48) + 1.5, z: 48 },
    gateway: { x: 0, y: stairTopAt(GATEWAY.z) + GATEWAY.h + 1.4, z: GATEWAY.z },
    devdeveshwar: {
      x: MAIN_TEMPLE.x,
      y: HILL.plateauY + MAIN_TEMPLE.plinthH + MAIN_TEMPLE.sanctumH + 9,
      z: MAIN_TEMPLE.z + 2,
    },
    "shrine-cluster": { x: SHRINES[0].x, y: HILL.plateauY + 4.5, z: SHRINES[0].z },
    "peshwa-museum": { x: MUSEUM.x, y: HILL.plateauY + MUSEUM.h + 2.5, z: MUSEUM.z },
    panorama: { x: 0, y: HILL.plateauY + 1.2, z: 14.5 },
  };

  return {
    props,
    propCount: props.length,
    buildings,
    buildingCount: buildings.length,
    markerBases,
    stepCount: STAIR.count,
  };
}

export function getHillAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    steps: {
      target: [0, 11, 46],
      dir: [0.18, 0.5, 0.84],
      distance: 42,
    },
    gateway: {
      target: [0, stairTopAt(GATEWAY.z) + 2.5, GATEWAY.z],
      dir: [0.34, 0.42, 0.84],
      distance: 26,
    },
    devdeveshwar: {
      target: [MAIN_TEMPLE.x, HILL.plateauY + 5.5, MAIN_TEMPLE.z],
      dir: [0.08, 0.36, 0.93],
      distance: 32,
    },
    "shrine-cluster": {
      target: [-9.5, HILL.plateauY + 2.5, -4],
      dir: [-0.5, 0.5, 0.7],
      distance: 28,
    },
    "peshwa-museum": {
      target: [MUSEUM.x, HILL.plateauY + 2.5, MUSEUM.z],
      dir: [0.62, 0.45, 0.64],
      distance: 28,
    },
    panorama: {
      target: [0, HILL.plateauY + 1.5, 12],
      dir: [-0.05, 0.42, 0.9],
      distance: 60,
    },
  };
}

export function getHillHomeView() {
  return {
    // South-side approach: the stairway in the near ground, the summit court
    // and shikhara above, the city spilling away to either side.
    target: [0, 12, 18] as [number, number, number],
    radius: 108,
    phi: 1.06,
    theta: 0.3,
  };
}

export function getHillPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — sunrise climb, golden hour, and city-lights dusk         */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#27406e",
    skyBottom: "#f8d9b8",
    sun: "#ffd9a8",
    sunIntensity: 2.2,
    hemiSky: "#b9c9e6",
    hemiGround: "#5f5a44",
    ambient: 0.85,
    fog: "#efd9bd",
    waterDeep: "#2b5a63",
    waterShallow: "#7fb2b4",
    lantern: 0.35,
    sunAzimuth: 2.0,
    sunElevation: 0.28,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#33356e",
    skyBottom: "#ffc187",
    sun: "#ffbf74",
    sunIntensity: 3.0,
    hemiSky: "#c3b8de",
    hemiGround: "#5c5138",
    ambient: 0.8,
    fog: "#eecfa2",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.55,
    sunAzimuth: -0.8,
    sunElevation: 0.32,
    exposure: 1.02,
  },
  dusk: {
    skyTop: "#040a24",
    skyBottom: "#2c1f4a",
    sun: "#7d74d6",
    sunIntensity: 0.3,
    hemiSky: "#28305f",
    hemiGround: "#131020",
    ambient: 0.34,
    fog: "#1d1836",
    waterDeep: "#0b1730",
    waterShallow: "#26456b",
    lantern: 1,
    sunAzimuth: -1.4,
    sunElevation: 0.03,
    exposure: 1.18,
  },
};

/* ------------------------------------------------------------------ */
/* Layout (runtime anchors from pure helpers)                          */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getHillAnchors();
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

const homeRaw = getHillHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createParvatiWorld(
  container: HTMLElement,
  options: HillWorldOptions,
): HillWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildHillLayout();

  /* Flame + light registries, filled while the main temple is built. */
  const templeFlames: THREE.Sprite[] = [];
  const templeLights: THREE.PointLight[] = [];

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
  const fog = new THREE.Fog("#eecfa2", 190, 580);
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

  const basaltMat = track(
    new THREE.MeshStandardMaterial({ color: "#57514a", roughness: 0.9, metalness: 0.02 }),
  );
  const basaltDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#423d38", roughness: 0.92 }),
  );
  const stepMat = track(
    new THREE.MeshStandardMaterial({ color: "#8d8272", roughness: 0.95 }),
  );
  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8d0be", roughness: 0.6, metalness: 0.04 }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.35, metalness: 0.85 }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: "#f2b53a",
      roughness: 0.26,
      metalness: 0.92,
      emissive: "#8a5510",
      emissiveIntensity: 0.3,
    }),
  );
  const saffronMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e2761f",
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#5a3a24", roughness: 0.85 }));
  const tileMat = track(new THREE.MeshStandardMaterial({ color: "#7c4630", roughness: 0.92 }));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#55793d", roughness: 0.95, flatShading: true }),
  );
  const cityMat = track(
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0 }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(136, 136, 124, 124));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const scrubA = new THREE.Color("#77823f");
  const scrubB = new THREE.Color("#9a8f5a");
  const rock = new THREE.Color("#7a7264");
  const summitStone = new THREE.Color("#b3a88e");
  const summitLight = new THREE.Color("#d8d0be");
  const urban = new THREE.Color("#a89f8c");
  const dust = new THREE.Color("#bda87f");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const inCorridor = Math.abs(x) < 4.5 && z > STAIR.z0 - 2 && z < STAIR.z1 + 2;
    if (r < HILL.plateauR + 0.5 || inCorridor) {
      tmp.copy(summitStone).lerp(summitLight, colorRnd() * 0.25);
    } else if (r < HILL.baseR + 4) {
      tmp.copy(scrubA).lerp(scrubB, colorRnd());
      if (colorRnd() > 0.82) tmp.lerp(rock, 0.5);
    } else {
      tmp.copy(urban).lerp(dust, colorRnd() * 0.6);
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

  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#5d4c3a", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(132, 26, 132)), baseMat);
  base.position.y = -13.3;
  scene.add(base);

  /* --- the 103 steps --- */

  {
    const stepGeo = track(new THREE.BoxGeometry(STAIR.width, 0.55, 1));
    const steps = new THREE.InstancedMesh(stepGeo, stepMat, STAIR.count);
    steps.castShadow = true;
    steps.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    for (let i = 0; i < STAIR.count; i++) {
      const spec = stepSpec(i);
      m.compose(
        new THREE.Vector3(0, spec.topY - 0.275, spec.z),
        q,
        new THREE.Vector3(1, 1, spec.tread + 0.14),
      );
      steps.setMatrixAt(i, m);
      // Slight per-step tone shift so the flight reads as weathered stone.
      color.set("#8d8272").offsetHSL(0, 0, (colorRnd() - 0.5) * 0.05);
      steps.setColorAt(i, color);
    }
    steps.instanceMatrix.needsUpdate = true;
    if (steps.instanceColor) steps.instanceColor.needsUpdate = true;
    scene.add(steps);

    // Cheek walls flanking the flight.
    for (const side of [-1, 1]) {
      const wallGeo = track(new THREE.BoxGeometry(0.7, 0.9, 1));
      const walls = new THREE.InstancedMesh(wallGeo, basaltDarkMat, STAIR.count);
      for (let i = 0; i < STAIR.count; i++) {
        const spec = stepSpec(i);
        m.compose(
          new THREE.Vector3(side * (STAIR.width / 2 + 0.45), spec.topY - 0.1, spec.z),
          q,
          new THREE.Vector3(1, 1, spec.tread + 0.1),
        );
        walls.setMatrixAt(i, m);
      }
      walls.instanceMatrix.needsUpdate = true;
      walls.castShadow = true;
      walls.receiveShadow = true;
      scene.add(walls);
    }
  }

  /* --- stair lamps --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,140,40,0.45)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.6,
    }),
  );
  const stairFlames: THREE.Sprite[] = [];
  const lampTops: THREE.Vector3[] = [];
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.1, 2.4, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.22, 0.12, 0.22, 8));
    for (const p of layout.props) {
      if (p.kind !== "stair-lamp" && p.kind !== "gate-lamp") continue;
      const pole = new THREE.Mesh(poleGeo, brassMat);
      pole.position.set(p.x, p.y + 1.2, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const cup = new THREE.Mesh(cupGeo, brassMat);
      cup.position.set(p.x, p.y + 2.45, p.z);
      scene.add(cup);
      const flame = new THREE.Sprite(flameMat);
      flame.scale.setScalar(0.85);
      flame.position.set(p.x, p.y + 2.75, p.z);
      scene.add(flame);
      stairFlames.push(flame);
      lampTops.push(new THREE.Vector3(p.x, p.y + 2.5, p.z));
    }
  }

  /* --- the hill gateway --- */

  const gateFlag = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 1.5, 10, 5)), saffronMat);
  {
    const gy = stairTopAt(GATEWAY.z);
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(
        track(new THREE.BoxGeometry(GATEWAY.pierW, GATEWAY.h, 2.6)),
        basaltMat,
      );
      pier.position.set(side * (GATEWAY.opening / 2 + GATEWAY.pierW / 2), gy + GATEWAY.h / 2, GATEWAY.z);
      pier.castShadow = true;
      pier.receiveShadow = true;
      scene.add(pier);
    }
    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATEWAY.opening + GATEWAY.pierW * 2, 1.4, 2.6)),
      basaltMat,
    );
    lintel.position.set(0, gy + GATEWAY.h - 0.7, GATEWAY.z);
    lintel.castShadow = true;
    scene.add(lintel);
    // Stepped cap and a small saffron flag.
    for (let i = 0; i < 2; i++) {
      const cap = new THREE.Mesh(
        track(new THREE.BoxGeometry(GATEWAY.opening + GATEWAY.pierW * 2 - i * 1.6, 0.5, 2.6 - i * 0.6)),
        basaltDarkMat,
      );
      cap.position.set(0, gy + GATEWAY.h + 0.25 + i * 0.5, GATEWAY.z);
      cap.castShadow = true;
      scene.add(cap);
    }
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 6)), brassMat);
    pole.position.set(0, gy + GATEWAY.h + 2.3, GATEWAY.z);
    scene.add(pole);
    gateFlag.position.set(1.2, gy + GATEWAY.h + 3.1, GATEWAY.z);
    gateFlag.castShadow = true;
    scene.add(gateFlag);
  }

  /* --- summit plaza --- */

  {
    const plaza = new THREE.Mesh(
      track(new THREE.CircleGeometry(HILL.plateauR - 0.6, 48)),
      track(
        new THREE.MeshStandardMaterial({
          color: "#c2b89e",
          roughness: 0.75,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      ),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, HILL.plateauY + 0.05, 0);
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Processional path from the stair head to the main temple.
    const path = new THREE.Mesh(
      track(new THREE.BoxGeometry(4.2, 0.12, 22)),
      marbleMat,
    );
    path.position.set(0, HILL.plateauY + 0.1, 8.5);
    path.receiveShadow = true;
    scene.add(path);
  }

  /* --- summit parapet --- */

  {
    const segGeo = track(new THREE.BoxGeometry(1.7, 0.95, 0.5));
    const count = 46;
    const parapet = new THREE.InstancedMesh(segGeo, basaltMat, count);
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      // Leave a gap where the stairway arrives (+Z).
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.24) continue;
      const x = Math.sin(a) * PARAPET_R;
      const z = Math.cos(a) * PARAPET_R;
      const y = Math.max(groundHeight(x, z), HILL.plateauY - 1.2);
      e.set(0, a, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y + 0.5, z), q, new THREE.Vector3(1, 1, 1));
      parapet.setMatrixAt(placed++, m);
    }
    parapet.count = placed;
    parapet.instanceMatrix.needsUpdate = true;
    scene.add(parapet);
  }

  /* --- Devdeveshwar: the main temple --- */

  const T = MAIN_TEMPLE;
  const plinthTop = HILL.plateauY + T.plinthH;
  {
    // Plinth and front steps.
    const plinth = new THREE.Mesh(
      track(new THREE.BoxGeometry(T.plinthW, T.plinthH, T.plinthD)),
      marbleMat,
    );
    plinth.position.set(T.x, HILL.plateauY + T.plinthH / 2, T.z);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(track(new THREE.BoxGeometry(5, 0.4, 0.9)), marbleMat);
      step.position.set(T.x, HILL.plateauY + 1.0 - i * 0.4, T.z + T.plinthD / 2 + 0.45 + i * 0.9);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    // Mandap columns (front half of the plinth).
    const colGeo = track(new THREE.CylinderGeometry(0.3, 0.36, T.colH, 10));
    const capGeo = track(new THREE.BoxGeometry(0.95, 0.35, 0.95));
    const colXs = [-4.5, -1.5, 1.5, 4.5];
    const colZs = [T.z + 2.2, T.z + 4.2];
    const columns = new THREE.InstancedMesh(colGeo, basaltMat, colXs.length * colZs.length);
    const caps = new THREE.InstancedMesh(capGeo, brassMat, colXs.length * colZs.length);
    columns.castShadow = true;
    caps.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let ci = 0;
    for (const cx of colXs) {
      for (const cz of colZs) {
        m.compose(new THREE.Vector3(T.x + cx, plinthTop + T.colH / 2, cz), q, new THREE.Vector3(1, 1, 1));
        columns.setMatrixAt(ci, m);
        m.compose(new THREE.Vector3(T.x + cx, plinthTop + T.colH - 0.18, cz), q, new THREE.Vector3(1, 1, 1));
        caps.setMatrixAt(ci, m);
        ci++;
      }
    }
    columns.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    scene.add(columns);
    scene.add(caps);

    // Mandap roof tiers.
    let ry = plinthTop + T.colH;
    for (const [w, d, h] of [
      [T.plinthW + 1.4, T.plinthD * 0.62, 0.9],
      [T.plinthW - 2.4, T.plinthD * 0.44, 0.8],
    ] as [number, number, number][]) {
      const tier = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), tileMat);
      tier.position.set(T.x, ry + h / 2, T.z + 3.2);
      tier.castShadow = true;
      tier.receiveShadow = true;
      scene.add(tier);
      ry += h;
    }

    // Sanctum walls (open darshan front, facing +Z).
    const sz = T.z - 2.2;
    const openW = 3.4;
    const wall = 0.9;
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(T.sanctumW, T.sanctumH, wall)), basaltMat);
    back.position.set(T.x, plinthTop + T.sanctumH / 2, sz - T.sanctumD / 2 + wall / 2);
    back.castShadow = true;
    back.receiveShadow = true;
    scene.add(back);
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(track(new THREE.BoxGeometry(wall, T.sanctumH, T.sanctumD)), basaltMat);
      sideWall.position.set(T.x + side * (T.sanctumW / 2 - wall / 2), plinthTop + T.sanctumH / 2, sz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      scene.add(sideWall);
      const stubW = (T.sanctumW - openW) / 2;
      const stub = new THREE.Mesh(track(new THREE.BoxGeometry(stubW, T.sanctumH, wall)), basaltMat);
      stub.position.set(
        T.x + side * (openW / 2 + stubW / 2),
        plinthTop + T.sanctumH / 2,
        sz + T.sanctumD / 2 - wall / 2,
      );
      stub.castShadow = true;
      stub.receiveShadow = true;
      scene.add(stub);
    }
    const sanctumSlab = new THREE.Mesh(
      track(new THREE.BoxGeometry(T.sanctumW + 0.7, 0.6, T.sanctumD + 0.7)),
      basaltDarkMat,
    );
    sanctumSlab.position.set(T.x, plinthTop + T.sanctumH + 0.3, sz);
    sanctumSlab.castShadow = true;
    scene.add(sanctumSlab);

    // Shikhara — a curvilinear lathe tower over the sanctum.
    const sanctumTop = plinthTop + T.sanctumH + 0.6;
    const profile: [number, number][] = [
      [4.4, 0],
      [4.2, 1.2],
      [3.7, 3],
      [3.2, 4.8],
      [2.6, 6.4],
      [1.9, 7.8],
      [1.2, 9],
      [0.6, 9.8],
    ];
    const latheGeo = track(
      new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20),
    );
    const shikhara = new THREE.Mesh(latheGeo, basaltMat);
    shikhara.position.set(T.x, sanctumTop, sz);
    shikhara.castShadow = true;
    shikhara.receiveShadow = true;
    scene.add(shikhara);

    const amalaka = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.55, 0.5, 16)), basaltDarkMat);
    amalaka.position.set(T.x, sanctumTop + 10, sz);
    amalaka.castShadow = true;
    scene.add(amalaka);
    const kalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.55, 12, 10)), goldMat);
    kalash.position.set(T.x, sanctumTop + 10.9, sz);
    kalash.castShadow = true;
    scene.add(kalash);
    const kalashTip = new THREE.Mesh(track(new THREE.ConeGeometry(0.36, 1.2, 10)), goldMat);
    kalashTip.position.set(T.x, sanctumTop + 11.8, sz);
    kalashTip.castShadow = true;
    scene.add(kalashTip);

    // The pindi glow inside the sanctum.
    const pindiLight = new THREE.PointLight("#ffb45e", 22, 22, 1.6);
    pindiLight.position.set(T.x, plinthTop + 2.6, sz);
    scene.add(pindiLight);
    const pindiFlame = new THREE.Sprite(flameMat);
    pindiFlame.scale.setScalar(1.2);
    pindiFlame.position.set(T.x, plinthTop + 1.6, sz + 1.2);
    scene.add(pindiFlame);
    templeFlames.push(pindiFlame);
    templeLights.push(pindiLight);

    // Nandi facing the sanctum.
    const nandiY = plinthTop;
    const nandiPlinth = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.5, 1.7)), marbleMat);
    nandiPlinth.position.set(T.x, nandiY + 0.25, T.z + 0.9);
    nandiPlinth.castShadow = true;
    scene.add(nandiPlinth);
    const nandiBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.75, 1.5)), basaltDarkMat);
    nandiBody.position.set(T.x, nandiY + 0.95, T.z + 0.9);
    nandiBody.castShadow = true;
    scene.add(nandiBody);
    const nandiHead = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.55, 0.6)), basaltDarkMat);
    nandiHead.position.set(T.x, nandiY + 1.25, T.z + 0.05);
    nandiHead.castShadow = true;
    scene.add(nandiHead);
  }

  /* --- the great saffron flag on the shikhara --- */

  const flag = new THREE.Mesh(track(new THREE.PlaneGeometry(4.2, 2.6, 14, 6)), saffronMat);
  {
    const topY = plinthTop + T.sanctumH + 0.6 + 12.4;
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 8)), goldMat);
    pole.position.set(T.x, topY + 1.2, T.z - 2.2);
    scene.add(pole);
    flag.position.set(T.x + 2.2, topY + 2.6, T.z - 2.2);
    flag.castShadow = true;
    scene.add(flag);
  }

  /* --- shrine cluster --- */

  {
    for (const s of SHRINES) {
      const sc = s.scale;
      const base = new THREE.Mesh(
        track(new THREE.BoxGeometry(4.2 * sc, 0.8 * sc, 4.2 * sc)),
        marbleMat,
      );
      base.position.set(s.x, HILL.plateauY + 0.4 * sc, s.z);
      base.castShadow = true;
      base.receiveShadow = true;
      scene.add(base);
      const cella = new THREE.Mesh(
        track(new THREE.BoxGeometry(3 * sc, 2.4 * sc, 3 * sc)),
        basaltMat,
      );
      cella.position.set(s.x, HILL.plateauY + 0.8 * sc + 1.2 * sc, s.z);
      cella.castShadow = true;
      cella.receiveShadow = true;
      scene.add(cella);
      const spireGeo = track(new THREE.ConeGeometry(2.1 * sc, 3.4 * sc, 8));
      const spire = new THREE.Mesh(spireGeo, basaltDarkMat);
      spire.position.set(s.x, HILL.plateauY + 0.8 * sc + 2.4 * sc + 1.7 * sc, s.z);
      spire.castShadow = true;
      scene.add(spire);
      const finial = new THREE.Mesh(track(new THREE.SphereGeometry(0.3 * sc, 10, 8)), goldMat);
      finial.position.set(s.x, HILL.plateauY + 0.8 * sc + 2.4 * sc + 3.5 * sc, s.z);
      finial.castShadow = true;
      scene.add(finial);
    }
  }

  /* --- the Peshwa museum (wada-roofed) --- */

  {
    const my = HILL.plateauY;
    const block = new THREE.Mesh(track(new THREE.BoxGeometry(MUSEUM.w, MUSEUM.h, MUSEUM.d)), basaltMat);
    block.position.set(MUSEUM.x, my + MUSEUM.h / 2, MUSEUM.z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);

    // Sloping tiled hip roof (4-sided cone, baked rotation/scale).
    const roofGeo = track(new THREE.ConeGeometry(1, 2.2, 4));
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale((MUSEUM.w / 2 + 1.2) * Math.SQRT2, 1, (MUSEUM.d / 2 + 1.2) * Math.SQRT2);
    roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(MUSEUM.x, my + MUSEUM.h + 1.1, MUSEUM.z);
    roof.castShadow = true;
    scene.add(roof);

    // Veranda columns along the west face, toward the court.
    const colGeo = track(new THREE.CylinderGeometry(0.14, 0.16, MUSEUM.h - 0.6, 8));
    const cols = new THREE.InstancedMesh(colGeo, woodMat, 5);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < 5; i++) {
      m.compose(
        new THREE.Vector3(MUSEUM.x - MUSEUM.w / 2 - 1, my + (MUSEUM.h - 0.6) / 2, MUSEUM.z - 2.4 + i * 1.2),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      cols.setMatrixAt(i, m);
    }
    cols.instanceMatrix.needsUpdate = true;
    cols.castShadow = true;
    scene.add(cols);

    // Dark window insets on the court-facing wall.
    const winGeo = track(new THREE.BoxGeometry(0.12, 1.1, 0.9));
    for (let i = 0; i < 3; i++) {
      const win = new THREE.Mesh(winGeo, basaltDarkMat);
      win.position.set(MUSEUM.x - MUSEUM.w / 2 - 0.05, my + 2.2, MUSEUM.z - 1.8 + i * 1.8);
      scene.add(win);
    }
  }

  /* --- deepstambh lamp tower --- */

  const deepFlames: THREE.Sprite[] = [];
  {
    const ty = HILL.plateauY;
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.7, 1.0, 6.5, 12)), basaltMat);
    shaft.position.set(DEEPSTAMBH.x, ty + 3.25, DEEPSTAMBH.z);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    scene.add(shaft);
    const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 1.8, 0.7, 12)), basaltDarkMat);
    foot.position.set(DEEPSTAMBH.x, ty + 0.35, DEEPSTAMBH.z);
    foot.castShadow = true;
    foot.receiveShadow = true;
    scene.add(foot);
    for (let t = 0; t < 4; t++) {
      const r = 1.35 - t * 0.16;
      const tierY = ty + 1.4 + t * 1.35;
      const tray = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r * 0.82, 0.24, 14)), basaltDarkMat);
      tray.position.set(DEEPSTAMBH.x, tierY, DEEPSTAMBH.z);
      tray.castShadow = true;
      scene.add(tray);
      for (let f = 0; f < 7; f++) {
        const a = (f / 7) * Math.PI * 2;
        const flame = new THREE.Sprite(flameMat);
        flame.scale.setScalar(0.8);
        flame.position.set(
          DEEPSTAMBH.x + Math.cos(a) * (r - 0.2),
          tierY + 0.3,
          DEEPSTAMBH.z + Math.sin(a) * (r - 0.2),
        );
        scene.add(flame);
        deepFlames.push(flame);
      }
    }
  }

  /* --- benches at the panorama parapet --- */

  {
    for (const p of layout.props) {
      if (p.kind !== "bench") continue;
      const seat = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.18, 0.6)), woodMat);
      seat.position.set(p.x, p.y + 0.55, p.z);
      seat.castShadow = true;
      scene.add(seat);
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.55, 0.5)), basaltDarkMat);
        leg.position.set(p.x + side * 0.9, p.y + 0.28, p.z);
        scene.add(leg);
      }
    }
  }

  /* --- trees on the flanks --- */

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
      m.compose(new THREE.Vector3(t.x, t.y + 1.6 * t.scale, t.z), q, new THREE.Vector3(t.scale, t.scale, t.scale));
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

  /* --- the city below --- */

  const cityLightPositions: number[] = [];
  {
    const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const city = new THREE.InstancedMesh(boxGeo, cityMat, layout.buildings.length);
    city.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    const tones = ["#b7ac95", "#a79f92", "#c0b49b", "#99938a", "#b0a184", "#8f8a80"];
    const rnd = mulberry32(64);
    layout.buildings.forEach((b, i) => {
      const gy = groundHeight(b.x, b.z);
      m.compose(
        new THREE.Vector3(b.x, gy + b.h / 2, b.z),
        q,
        new THREE.Vector3(b.w, b.h, b.d),
      );
      city.setMatrixAt(i, m);
      color.set(tones[Math.floor(rnd() * tones.length)]);
      city.setColorAt(i, color);
      // The taller blocks get a rooftop light point at dusk.
      if (b.h > 6) cityLightPositions.push(b.x, gy + b.h + 0.4, b.z);
    });
    city.instanceMatrix.needsUpdate = true;
    if (city.instanceColor) city.instanceColor.needsUpdate = true;
    scene.add(city);
  }

  const cityLightMat = track(
    new THREE.PointsMaterial({
      size: 1.5,
      map: track(radialSprite("rgba(255,235,180,0.9)", "rgba(255,180,90,0.4)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  {
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cityLightPositions), 3));
    scene.add(new THREE.Points(geo, cityLightMat));
  }

  /* --- mahashivratri: string lights climbing the stairway --- */

  const stringLightMat = track(
    new THREE.PointsMaterial({
      size: 0.6,
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
    const bulbColors = ["#ffd27a", "#ff9d5c", "#7fd67f", "#ff7a7a", "#7ab8ff"];
    const rnd = mulberry32(103);
    const c = new THREE.Color();

    // Catenary spans between the lamp posts on each side of the steps.
    const bySide = (side: number) =>
      lampTops.filter((v) => Math.sign(v.x) === side).sort((a, b) => a.z - b.z);
    const spans: [THREE.Vector3, THREE.Vector3, number][] = [];
    for (const side of [-1, 1]) {
      const posts = bySide(side);
      for (let i = 0; i < posts.length - 1; i++) spans.push([posts[i], posts[i + 1], 1.1]);
    }
    // A swag across the gateway arch.
    const gy = stairTopAt(GATEWAY.z);
    spans.push([
      new THREE.Vector3(-GATEWAY.opening / 2 - 1, gy + GATEWAY.h - 0.9, GATEWAY.z + 1.2),
      new THREE.Vector3(GATEWAY.opening / 2 + 1, gy + GATEWAY.h - 0.9, GATEWAY.z + 1.2),
      0.9,
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

  /* --- birds circling the hill --- */

  const BIRDS = 9;
  const birdGeo = track(new THREE.BufferGeometry());
  const birdSeed: number[] = [];
  {
    const arr = new Float32Array(BIRDS * 3);
    const rnd = mulberry32(21);
    for (let i = 0; i < BIRDS; i++) birdSeed.push(rnd() * 100);
    birdGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const birdMat = track(
    new THREE.PointsMaterial({ color: "#241d18", size: 1.4, sizeAttenuation: true }),
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
          color: "#f7e3c8",
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

  const spherical = { radius: 340, phi: 0.4, theta: HOME.theta - 0.9 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 30, 240);
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
  const introFrom = new THREE.Vector3(0, 30, 0);
  const flagBaseX: number[] = [];
  {
    const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) flagBaseX.push(attr.getX(i));
  }
  const gateFlagBaseX: number[] = [];
  {
    const attr = gateFlag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) gateFlagBaseX.push(attr.getX(i));
  }

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
    hemi.intensity = cur.ambient * 1.8 + cur.fest * 0.2;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(200);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    /* lamps: stair lamps, the deepstambh tiers, the sanctum flame */
    const lampLevel = clamp(cur.lantern + cur.fest * 0.3, 0, 1.15);
    flameMat.opacity = lampLevel * 0.85;
    for (let i = 0; i < stairFlames.length; i++) {
      const f = stairFlames[i];
      f.scale.setScalar(0.85 * (0.85 + Math.sin(elapsed * 7 + i * 1.7) * 0.18 * motion + 0.18));
    }
    for (let i = 0; i < deepFlames.length; i++) {
      const f = deepFlames[i];
      f.scale.setScalar(0.8 * (0.8 + Math.sin(elapsed * 6.2 + i * 2.3) * 0.22 * motion + 0.2));
    }
    for (let i = 0; i < templeFlames.length; i++) {
      const f = templeFlames[i];
      f.scale.setScalar(1.2 * (0.85 + Math.sin(elapsed * 8.1 + i) * 0.2 * motion + 0.15));
    }
    for (const light of templeLights) {
      light.intensity = (18 + cur.fest * 10) * (0.4 + lampLevel * 0.8) *
        (1 + Math.sin(elapsed * 5.3) * 0.08 * motion);
    }

    /* gold answers the lamplight */
    goldMat.emissiveIntensity = 0.16 + lampLevel * 0.3;

    /* mahashivratri + dusk city layers */
    stringLightMat.opacity = cur.fest * (0.2 + lampLevel * 0.8);
    cityLightMat.opacity = cur.lantern * 0.55 + cur.fest * 0.25;

    /* flags */
    if (motion) {
      const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const x = flagBaseX[i];
        const u = (x + 2.1) / 4.2;
        attr.setZ(i, Math.sin(u * 6 - elapsed * 5) * 0.38 * u);
      }
      attr.needsUpdate = true;
      const gAttr = gateFlag.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < gAttr.count; i++) {
        const x = gateFlagBaseX[i];
        const u = (x + 1.2) / 2.4;
        gAttr.setZ(i, Math.sin(u * 5 - elapsed * 4.4 + 1.3) * 0.28 * u);
      }
      gAttr.needsUpdate = true;
    }

    /* birds */
    if (motion) {
      const attr = birdGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < BIRDS; i++) {
        const s = birdSeed[i];
        const r = 30 + (i % 4) * 4;
        const a = elapsed * (0.06 + (i % 3) * 0.015) + s;
        attr.setXYZ(
          i,
          Math.cos(a) * r,
          30 + Math.sin(elapsed * 0.5 + s) * 3 + (i % 3) * 2,
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
      ringMat.color.set(isActive ? "#e0703a" : "#f7e3c8");
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
      spherical.radius = THREE.MathUtils.lerp(340, desired.radius, e);
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
      festTarget = m === "mahashivratri" ? 1 : 0;
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
