/**
 * A hand-built, procedural 3D model of Saras Baug.
 *
 * What defines this place: Talyatla Ganpati on the former lake-island mound,
 * the drained tank now a ring of lawns and a walking path, a small Ganesh
 * museum, evening snack stalls at the gate, and Parvati Hill next door.
 *
 * This is not Okayama (Japanese garden), not Dagdusheth (gold temple), and
 * not the Parvati climb. Do not reuse those scenes.
 *
 * Mode: day = an ordinary afternoon; evening = family aarti and stall lights.
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
  | "talyatla-ganpati"
  | "drained-lawns"
  | "ganesh-museum"
  | "evening-stalls"
  | "parvati-hill";

export type BaugMode = "day" | "evening";

export type BaugWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type BaugWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: BaugMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "talyatla-ganpati",
  "drained-lawns",
  "ganesh-museum",
  "evening-stalls",
  "parvati-hill",
];

/* ------------------------------------------------------------------ */
/* Pure layout                                                         */
/* ------------------------------------------------------------------ */

/** Former island — the shrine mound in the middle of the old tank. */
export const ISLAND = { x: 0, z: 0, r: 7.4, y: 1.45 };

/** Drained tank bowl (now lawn). */
export const TANK = { r: 26, bedY: 0.08 };

/** Walking path on the old shoreline. */
export const PATH = { r: 20.6, width: 2.5 };

/** Small Ganesh museum block. */
export const MUSEUM = { x: 20, z: -9, w: 10.5, d: 7.2, h: 4.5 };

/** Evening stall strip at the gate (+Z). */
export const STALLS = { z: 24.5, halfW: 20, count: 9 };

/** Parvati Hill mass south of the baug. */
export const PARVATI = { x: -7, z: -40, h: 17.5, halfW: 15 };

export const SHRINE = { x: 0, z: 0, plinth: 1.9, shikhara: 6.4 };

export function inIsland(x: number, z: number): boolean {
  return Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r;
}

export function inTank(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  return r >= ISLAND.r && r < TANK.r;
}

export function inPath(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  return Math.abs(r - PATH.r) < PATH.width / 2;
}

export function inMuseumFootprint(x: number, z: number): boolean {
  return Math.abs(x - MUSEUM.x) < MUSEUM.w / 2 + 0.8 && Math.abs(z - MUSEUM.z) < MUSEUM.d / 2 + 0.8;
}

export function stallSpec(i: number): { x: number; y: number; z: number } {
  const start = -STALLS.halfW + 2.2;
  return { x: start + i * 4.6, y: 0.12, z: STALLS.z };
}

/**
 * Terrain: island mound in the middle, a shallow drained bowl of lawn,
 * Parvati rising to the south. No full lake — the tank is grass.
 */
export function terrainHeight(x: number, z: number): number {
  let h = 0.05 * Math.sin(x * 0.1) * Math.cos(z * 0.09);
  const r = Math.hypot(x, z);

  if (r < ISLAND.r) {
    const t = 1 - r / ISLAND.r;
    return ISLAND.y * t * t * (3 - 2 * t) + 0.06;
  }

  if (r < TANK.r) {
    const towardPath = 1 - Math.abs(r - PATH.r) / (TANK.r - ISLAND.r);
    h = TANK.bedY + 0.12 * towardPath;
  } else {
    h = 0.35 + 0.2 * smoothstep(TANK.r, TANK.r + 6, r);
  }

  if (inMuseumFootprint(x, z)) h = Math.max(h, 0.4);

  const hx = x - PARVATI.x;
  const hz = z - PARVATI.z;
  const hill = 1 - clamp(Math.hypot(hx / PARVATI.halfW, hz / 10), 0, 1);
  if (hill > 0) {
    h = Math.max(h, PARVATI.h * hill * hill + 0.8 * Math.sin(hx * 0.4) * Math.sin(hz * 0.35));
  }

  const outside = Math.max(Math.abs(x), Math.abs(z)) - 54;
  if (outside > -1) h -= 16 * smoothstep(-1, 6, outside);
  return h;
}

export type BaugPropKind = "lamp" | "stall" | "tree" | "bench" | "shrine-lamp";

export type BaugPropSpec = {
  kind: BaugPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export function buildBaugLayout(seed = 1750): {
  props: BaugPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  stallCount: number;
  pathLampCount: number;
} {
  const rnd = mulberry32(seed);
  const props: BaugPropSpec[] = [];
  const push = (p: BaugPropSpec) => props.push(p);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    push({
      kind: "shrine-lamp",
      x: Math.cos(a) * 3.2,
      y: ISLAND.y + 0.2,
      z: Math.sin(a) * 3.2,
      scale: 1,
      feature: "talyatla-ganpati",
    });
  }

  const pathLampCount = 16;
  for (let i = 0; i < pathLampCount; i++) {
    const a = (i / pathLampCount) * Math.PI * 2;
    push({
      kind: "lamp",
      x: Math.cos(a) * PATH.r,
      y: TANK.bedY,
      z: Math.sin(a) * PATH.r,
      scale: 1,
      feature: "drained-lawns",
    });
  }

  for (let i = 0; i < STALLS.count; i++) {
    const s = stallSpec(i);
    push({ kind: "stall", x: s.x, y: s.y, z: s.z, scale: 1, feature: "evening-stalls" });
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    push({
      kind: "bench",
      x: Math.cos(a) * (PATH.r - 3.2),
      y: TANK.bedY,
      z: Math.sin(a) * (PATH.r - 3.2),
      scale: 1,
      feature: "drained-lawns",
    });
  }

  // A pair of lamps at the museum door.
  for (const side of [-1, 1]) {
    push({
      kind: "lamp",
      x: MUSEUM.x + side * 3.4,
      y: 0.4,
      z: MUSEUM.z + MUSEUM.d / 2 + 1.2,
      scale: 1,
      feature: "ganesh-museum",
    });
  }

  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 26 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 96;
    const z = (rnd() - 0.5) * 96;
    const r = Math.hypot(x, z);
    if (inIsland(x, z)) continue;
    if (inMuseumFootprint(x, z)) continue;
    if (r < PATH.r + 1 && r > PATH.r - 3) continue;
    if (z > 20 && Math.abs(x) < STALLS.halfW + 4) continue;
    if (Math.hypot(x - PARVATI.x, z - PARVATI.z) < 12) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 48) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 6.5)) continue;
    treeSpots.push({ x, z, s: 0.8 + rnd() * 0.55 });
  }
  for (const s of treeSpots) {
    const onHill = Math.hypot(s.x - PARVATI.x, s.z - PARVATI.z) < 22;
    push({
      kind: "tree",
      x: s.x,
      y: Math.max(terrainHeight(s.x, s.z), 0),
      z: s.z,
      scale: s.s,
      feature: onHill ? "parvati-hill" : "drained-lawns",
    });
  }

  // Guaranteed skirt trees so the hill feature is never empty.
  for (const [tx, tz] of [
    [-14, -30],
    [2, -31],
    [-18, -36],
  ] as [number, number][]) {
    push({
      kind: "tree",
      x: tx,
      y: Math.max(terrainHeight(tx, tz), 0),
      z: tz,
      scale: 1.05,
      feature: "parvati-hill",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "talyatla-ganpati": { x: 0, y: ISLAND.y + SHRINE.shikhara + 0.6, z: 0 },
    "drained-lawns": { x: 0, y: 1.4, z: 14 },
    "ganesh-museum": { x: MUSEUM.x, y: MUSEUM.h + 1.1, z: MUSEUM.z },
    "evening-stalls": { x: 0, y: 2.6, z: STALLS.z },
    "parvati-hill": { x: PARVATI.x, y: PARVATI.h * 0.72, z: PARVATI.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    stallCount: STALLS.count,
    pathLampCount,
  };
}

export function getBaugAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "talyatla-ganpati": {
      target: [0, ISLAND.y + 2.2, 0],
      dir: [0.2, 0.38, 0.9],
      distance: 18,
    },
    "drained-lawns": {
      target: [0, 0.4, 12],
      dir: [0.15, 0.55, 0.82],
      distance: 28,
    },
    "ganesh-museum": {
      target: [MUSEUM.x, 2, MUSEUM.z + 1],
      dir: [0.55, 0.4, 0.73],
      distance: 18,
    },
    "evening-stalls": {
      target: [0, 1.2, STALLS.z],
      dir: [0.12, 0.36, 0.92],
      distance: 20,
    },
    "parvati-hill": {
      target: [PARVATI.x, PARVATI.h * 0.4, PARVATI.z],
      dir: [0.18, 0.34, 0.92],
      distance: 36,
    },
  };
}

export function getBaugHomeView() {
  return {
    // Gate side, looking across the drained tank at the island shrine,
    // Parvati rising behind. Low enough that the mound reads as an island.
    target: [0, 2.4, 4] as [number, number, number],
    radius: 38,
    phi: 1.18,
    theta: 0.28,
  };
}

export function getBaugPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1c3a5c",
    skyBottom: "#f0d0b0",
    sun: "#ffd4a4",
    sunIntensity: 2.1,
    hemiSky: "#b4c8dc",
    hemiGround: "#4a4534",
    ambient: 0.76,
    fog: "#e6d4b8",
    waterDeep: "#2a4a48",
    waterShallow: "#7aaa9a",
    lantern: 0.2,
    sunAzimuth: 2.15,
    sunElevation: 0.26,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3c284c",
    skyBottom: "#ffb878",
    sun: "#ff9e52",
    sunIntensity: 2.65,
    hemiSky: "#d0b8c4",
    hemiGround: "#5a4830",
    ambient: 0.78,
    fog: "#eec898",
    waterDeep: "#2a5248",
    waterShallow: "#88b898",
    lantern: 0.45,
    sunAzimuth: -0.78,
    sunElevation: 0.26,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060814",
    skyBottom: "#2a182c",
    sun: "#6a64b8",
    sunIntensity: 0.26,
    hemiSky: "#222848",
    hemiGround: "#121018",
    ambient: 0.3,
    fog: "#161224",
    waterDeep: "#0a1824",
    waterShallow: "#1e3858",
    lantern: 1,
    sunAzimuth: -1.32,
    sunElevation: 0.04,
    exposure: 1.16,
  },
};

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getBaugAnchors();
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
const homeRaw = getBaugHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

export function createBaugWorld(container: HTMLElement, options: BaugWorldOptions): BaugWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const layout = buildBaugLayout();

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
  const fog = new THREE.Fog("#eec898", 140, 480);
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
  sun.shadow.camera.left = -75;
  sun.shadow.camera.right = 75;
  sun.shadow.camera.top = 75;
  sun.shadow.camera.bottom = -75;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#c8b89a", roughness: 0.9 }),
  );
  const stoneDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#8a7a62", roughness: 0.92 }),
  );
  const saffronMat = track(
    new THREE.MeshStandardMaterial({ color: "#d07030", roughness: 0.7 }),
  );
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#8a4a28", roughness: 0.82 }));
  const canvasMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8b46a", roughness: 0.85, side: THREE.DoubleSide }),
  );
  const pathMat = track(new THREE.MeshStandardMaterial({ color: "#c4b49a", roughness: 0.95 }));
  const museumMat = track(new THREE.MeshStandardMaterial({ color: "#d4c8b4", roughness: 0.9 }));
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#8a4030", roughness: 0.86 }));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a7a36", roughness: 0.95, flatShading: true }),
  );
  const hillMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a6048", roughness: 0.96, flatShading: true }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(124, 124, 118, 118));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#5c8a40");
  const lawnB = new THREE.Color("#3e6a2c");
  const islandCol = new THREE.Color("#b8a888");
  const pathCol = new THREE.Color("#c2b296");
  const hillCol = new THREE.Color("#6e6654");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(61);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (inIsland(x, z)) tmp.copy(islandCol).lerp(pathCol, colorRnd() * 0.3);
    else if (inPath(x, z)) tmp.copy(pathCol);
    else if (inTank(x, z)) tmp.copy(lawnA).lerp(lawnB, colorRnd());
    else if (z < PARVATI.z + 16 && Math.abs(x - PARVATI.x) < 20) tmp.copy(hillCol).lerp(lawnB, colorRnd());
    else tmp.copy(lawnA).lerp(lawnB, 0.4 + colorRnd() * 0.4);
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
    track(new THREE.BoxGeometry(120, 16, 120)),
    track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 })),
  );
  base.position.y = -9.2;
  scene.add(base);

  /* --- path ring (old shoreline) --- */

  {
    const ring = new THREE.Mesh(track(new THREE.RingGeometry(PATH.r - PATH.width / 2, PATH.r + PATH.width / 2, 64)), pathMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = TANK.bedY + 0.06;
    ring.receiveShadow = true;
    scene.add(ring);
  }

  /* --- Talyatla shrine on the island --- */

  {
    const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(4.1, 4.4, 0.55, 16)), stoneMat);
    plinth.position.set(0, ISLAND.y + 0.28, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 2.6, 5.2)), stoneMat);
    hall.position.set(0, ISLAND.y + 1.85, 0);
    hall.castShadow = true;
    hall.receiveShadow = true;
    scene.add(hall);

    const shikhara = new THREE.Mesh(track(new THREE.ConeGeometry(2.15, SHRINE.shikhara - 2.2, 8)), saffronMat);
    shikhara.position.set(0, ISLAND.y + 2.6 + (SHRINE.shikhara - 2.2) / 2, 0);
    shikhara.castShadow = true;
    scene.add(shikhara);

    const kalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.32, 10, 8)), stoneDarkMat);
    kalash.position.set(0, ISLAND.y + SHRINE.shikhara + 0.35, 0);
    scene.add(kalash);

    const door = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.5, 2.1, 0.15)),
      track(new THREE.MeshStandardMaterial({ color: "#3a2414", roughness: 0.8 })),
    );
    door.position.set(0, ISLAND.y + 1.55, 2.65);
    scene.add(door);

    const steps = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.35, 2.2)), stoneDarkMat);
    steps.position.set(0, ISLAND.y + 0.15, 4.2);
    steps.receiveShadow = true;
    scene.add(steps);

    // Tiny ganesh mass in the doorway — a dark seated form.
    const murti = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.85, 0.5)), stoneDarkMat);
    murti.position.set(0, ISLAND.y + 1.35, 1.4);
    scene.add(murti);
  }

  /* --- museum --- */

  {
    const block = new THREE.Mesh(track(new THREE.BoxGeometry(MUSEUM.w, MUSEUM.h, MUSEUM.d)), museumMat);
    block.position.set(MUSEUM.x, 0.4 + MUSEUM.h / 2, MUSEUM.z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(MUSEUM.w + 0.6, 0.35, MUSEUM.d + 0.6)), roofMat);
    roof.position.set(MUSEUM.x, 0.4 + MUSEUM.h + 0.12, MUSEUM.z);
    roof.castShadow = true;
    scene.add(roof);
    const door = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.8, 2.3, 0.15)),
      track(new THREE.MeshStandardMaterial({ color: "#3a2414", roughness: 0.8 })),
    );
    door.position.set(MUSEUM.x, 1.55, MUSEUM.z + MUSEUM.d / 2 + 0.05);
    scene.add(door);
  }

  /* --- evening stalls --- */

  {
    const stallGeo = track(new THREE.BoxGeometry(2.1, 1.1, 1.45));
    const roofGeo = track(new THREE.BoxGeometry(2.4, 0.08, 1.7));
    for (const p of layout.props) {
      if (p.kind !== "stall") continue;
      const stall = new THREE.Mesh(stallGeo, woodMat);
      stall.position.set(p.x, p.y + 0.55, p.z);
      stall.castShadow = true;
      scene.add(stall);
      const roof = new THREE.Mesh(roofGeo, canvasMat);
      roof.position.set(p.x, p.y + 1.3, p.z);
      roof.castShadow = true;
      scene.add(roof);
    }
  }

  /* --- benches --- */

  {
    const seatGeo = track(new THREE.BoxGeometry(1.8, 0.14, 0.55));
    for (const p of layout.props) {
      if (p.kind !== "bench") continue;
      const seat = new THREE.Mesh(seatGeo, woodMat);
      seat.position.set(p.x, p.y + 0.45, p.z);
      const yaw = Math.atan2(-p.x, -p.z);
      seat.rotation.y = yaw;
      seat.castShadow = true;
      scene.add(seat);
    }
  }

  /* --- lamps --- */

  const lampFlames: THREE.Sprite[] = [];
  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,140,40,0.4)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.65,
    }),
  );
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.15, 0.1, 0.16, 8));
    for (const p of layout.props) {
      if (p.kind !== "lamp" && p.kind !== "shrine-lamp") continue;
      const h = p.kind === "shrine-lamp" ? 1.8 : 2.5;
      const pole = new THREE.Mesh(poleGeo, stoneDarkMat);
      pole.position.set(p.x, p.y + h / 2, p.z);
      pole.scale.y = h / 2.5;
      pole.castShadow = true;
      scene.add(pole);
      const cup = new THREE.Mesh(cupGeo, stoneDarkMat);
      cup.position.set(p.x, p.y + h + 0.08, p.z);
      scene.add(cup);
      const spr = new THREE.Sprite(flameMat);
      spr.scale.setScalar(p.kind === "shrine-lamp" ? 0.85 : 0.65);
      spr.position.set(p.x, p.y + h + 0.32, p.z);
      scene.add(spr);
      lampFlames.push(spr);
    }
  }

  /* --- Parvati hill mass + tiny temple crown --- */

  {
    const mass = new THREE.Mesh(track(new THREE.ConeGeometry(13.5, 15, 8)), hillMat);
    mass.position.set(PARVATI.x, 6.8, PARVATI.z);
    mass.castShadow = true;
    mass.receiveShadow = true;
    scene.add(mass);
    const crown = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 1.4, 2.4)), stoneDarkMat);
    crown.position.set(PARVATI.x, PARVATI.h + 0.2, PARVATI.z);
    crown.castShadow = true;
    scene.add(crown);
    const peak = new THREE.Mesh(track(new THREE.ConeGeometry(0.9, 2.2, 6)), saffronMat);
    peak.position.set(PARVATI.x, PARVATI.h + 1.8, PARVATI.z);
    scene.add(peak);
  }

  /* --- trees --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.24, 0.38, 3, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(811);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.5 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.5 - k * 0.6) * t.scale;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(t.x + (rnd() - 0.5), t.y + (3.5 + k * 1.15) * t.scale, t.z + (rnd() - 0.5)),
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 3.5, 0));
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
    ring.position.copy(base).add(new THREE.Vector3(0, 0.2, 0));
    scene.add(ring);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);
    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  const spherical = { radius: HOME.radius + 18, phi: HOME.phi - 0.12, theta: HOME.theta - 0.22 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 12, 140);
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
  const introFrom = new THREE.Vector3(0, 6, 16);
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
    cur.fest = damp(cur.fest, festTarget, 2.2, dt);
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
    flameMat.opacity = 0.22 + lampLevel * 0.75;
    for (let i = 0; i < lampFlames.length; i++) {
      lampFlames[i].scale.setScalar(0.7 * (0.85 + Math.sin(elapsed * 6 + i) * 0.16 * motion + 0.15));
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
        marker.base.y + 3.5 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.26 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.4);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(HOME.radius + 18, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(HOME.phi - 0.12, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.22, desired.theta, e);
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
      festTarget = m === "evening" ? 1 : 0;
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
