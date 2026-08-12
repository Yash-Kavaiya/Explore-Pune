/**
 * A hand-built, procedural 3D model of Aga Khan Palace.
 *
 * Same approach as the Shaniwar fort and Okayama garden: plain three.js, zero
 * external assets, geometry generated at runtime. What defines the real palace
 * is its long Italianate front — a two-storey arcade of round arches, a
 * projecting central portico, corner pavilions — standing in wide lawns with
 * the samadhis of Kasturba Gandhi and Mahadev Desai in the grounds.
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
  | "facade"
  | "arcade"
  | "gandhi-room"
  | "samadhis"
  | "lawns"
  | "museum";

export type PalaceWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type PalaceWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "facade",
  "arcade",
  "gandhi-room",
  "samadhis",
  "lawns",
  "museum",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Half-length of the palace front (x) and half-depth (z). */
export const HALF_W = 40;
export const HALF_D = 14;
/** Wall height of one storey and of the parapet. */
export const STOREY = 6.4;
export const PARAPET = 1.2;
/** Height of the ground the palace stands on. */
export const PLINTH = 1.4;

/** Central portico projects forward (towards -Z). */
export const PORTICO = { halfW: 9, depth: 7, top: STOREY * 2 + 3 };

/** Corner pavilions — slightly taller blocks at each end of the front. */
export const PAVILION = { halfW: 7, extra: 2.6 };

/** Samadhi court centre in the grounds. */
export const SAMADHI_COURT = { x: 30, z: 26, radius: 9 };

export type PalacePropKind =
  | "lamp"
  | "tree"
  | "hedge"
  | "flower"
  | "samadhi"
  | "case"
  | "furniture"
  | "baluster";

export type PalacePropSpec = {
  kind: PalacePropKind;
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
export function buildPalaceLayout(seed = 1892): {
  props: PalacePropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  archCount: number;
} {
  const rnd = mulberry32(seed);
  const props: PalacePropSpec[] = [];
  const push = (p: PalacePropSpec) => props.push(p);

  const roofY = PLINTH + STOREY * 2 + PARAPET;
  const frontZ = -HALF_D;

  // Drive lamps
  for (const [lx, lz] of [
    [-PORTICO.halfW - 1.5, frontZ - PORTICO.depth],
    [PORTICO.halfW + 1.5, frontZ - PORTICO.depth],
    [-12, -HALF_D - 20],
    [12, -HALF_D - 20],
    [-12, -HALF_D - 30],
    [12, -HALF_D - 30],
  ] as [number, number][]) {
    push({ kind: "lamp", x: lx, y: 0, z: lz, scale: 1, feature: "facade" });
  }

  // Arcade arch centreline markers along the front (not rendered as balusters)
  const span = 5.4;
  const archCount = Math.floor((HALF_W * 2 - 6) / span);
  const usedSpan = (HALF_W * 2 - 6) / archCount;
  for (let i = 0; i < archCount; i++) {
    push({
      kind: "lamp",
      x: -HALF_W + 3 + (i + 0.5) * usedSpan,
      y: PLINTH + STOREY * 0.5,
      z: frontZ - 0.35,
      scale: 0.35,
      feature: "arcade",
    });
  }

  // Hedge lines + circular bed
  for (const sideX of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      push({
        kind: "hedge",
        x: sideX * (10 + i * 3),
        y: 0,
        z: -HALF_D - 12,
        scale: 1,
        feature: "lawns",
      });
    }
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    push({
      kind: "hedge",
      x: Math.cos(a) * 8,
      y: 0,
      z: -HALF_D - 24 + Math.sin(a) * 4,
      scale: 0.9,
      feature: "lawns",
    });
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    push({
      kind: "flower",
      x: Math.cos(a) * 8,
      y: 0,
      z: -HALF_D - 24 + Math.sin(a) * 4,
      scale: 1,
      feature: "lawns",
    });
  }

  // Trees around the grounds
  let guard = 0;
  const treeSpots: { x: number; z: number }[] = [];
  while (treeSpots.length < 42 && guard < 3000) {
    guard++;
    const x = (rnd() - 0.5) * 132;
    const z = (rnd() - 0.5) * 112;
    if (Math.abs(x) > 62 || Math.abs(z) > 50) continue;
    if (Math.abs(x) < HALF_W + 10 && Math.abs(z) < HALF_D + 12) continue;
    if (z < -HALF_D - 6 && z > -HALF_D - 34 && Math.abs(x) < 14) continue;
    if (Math.hypot(x - SAMADHI_COURT.x, z - SAMADHI_COURT.z) < 13) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: 0,
      z: s.z,
      scale: 0.9 + rnd() * 0.9,
      feature: "lawns",
    });
  }

  // Twin samadhis
  for (const ox of [-2.2, 2.2]) {
    push({
      kind: "samadhi",
      x: SAMADHI_COURT.x + ox,
      y: 0,
      z: SAMADHI_COURT.z,
      scale: 1,
      feature: "samadhis",
    });
  }

  // Interior: Gandhi room furniture + museum cases
  for (let i = 0; i < 4; i++) {
    push({
      kind: "furniture",
      x: 10 + (i % 2) * 3,
      y: PLINTH + STOREY + 0.1,
      z: -4 + Math.floor(i / 2) * 4,
      scale: 1,
      feature: "gandhi-room",
    });
  }
  for (let i = 0; i < 8; i++) {
    push({
      kind: "case",
      x: -14 + (i % 4) * 3.2,
      y: PLINTH + 0.1,
      z: 2 + Math.floor(i / 4) * 4,
      scale: 1,
      feature: "museum",
    });
  }

  // Parapet balusters along the front
  const balusterCount = 24;
  for (let i = 0; i < balusterCount; i++) {
    const t = i / (balusterCount - 1);
    push({
      kind: "baluster",
      x: -HALF_W + 2 + t * (HALF_W * 2 - 4),
      y: PLINTH + STOREY * 2,
      z: frontZ,
      scale: 1,
      feature: "facade",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    facade: { x: 0, y: roofY * 0.6, z: frontZ },
    arcade: { x: -18, y: STOREY, z: frontZ - 0.5 },
    "gandhi-room": { x: 12, y: STOREY + 2, z: -2 },
    samadhis: { x: SAMADHI_COURT.x, y: 1, z: SAMADHI_COURT.z },
    lawns: { x: 0, y: 0, z: -34 },
    museum: { x: -10, y: STOREY, z: 4 },
  };

  return { props, propCount: props.length, markerBases, archCount };
}

export function getPalaceAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  const roofY = PLINTH + STOREY * 2 + PARAPET;
  return {
    facade: {
      target: [0, roofY * 0.6, -HALF_D],
      dir: [0.16, 0.42, -0.89],
      distance: 62,
    },
    arcade: {
      target: [-18, STOREY, -HALF_D - 0.5],
      dir: [-0.5, 0.5, -0.7],
      distance: 40,
    },
    "gandhi-room": {
      target: [12, STOREY + 2, -2],
      dir: [0.4, 0.55, -0.72],
      distance: 44,
    },
    samadhis: {
      target: [SAMADHI_COURT.x, 1, SAMADHI_COURT.z],
      dir: [0.35, 0.6, 0.72],
      distance: 44,
    },
    lawns: {
      target: [0, 0, -34],
      dir: [0.0, 0.62, -0.78],
      distance: 74,
    },
    museum: {
      target: [-10, STOREY, 4],
      dir: [-0.3, 0.62, 0.72],
      distance: 56,
    },
  };
}

export function getPalaceHomeView() {
  return {
    target: [0, 4, -6] as [number, number, number],
    radius: 120,
    phi: 0.98,
    theta: 0.45,
  };
}

export function getPalacePalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — morning, golden hour, and dusk                           */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1c3a66",
    skyBottom: "#f0dcc0",
    sun: "#ffe8c8",
    sunIntensity: 2.4,
    hemiSky: "#aecbef",
    hemiGround: "#5c4f3a",
    ambient: 0.8,
    fog: "#e6d6bc",
    waterDeep: "#2b5a63",
    waterShallow: "#86b6b6",
    lantern: 0.1,
    sunAzimuth: 2.4,
    sunElevation: 0.34,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#46304a",
    skyBottom: "#ffd29a",
    sun: "#ffc27a",
    sunIntensity: 3.0,
    hemiSky: "#c9def6",
    hemiGround: "#6d5836",
    ambient: 0.84,
    fog: "#f3d3a6",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.25,
    sunAzimuth: -0.65,
    sunElevation: 0.36,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060a22",
    skyBottom: "#41285a",
    sun: "#9a86d8",
    sunIntensity: 0.4,
    hemiSky: "#2c3a6c",
    hemiGround: "#1d1728",
    ambient: 0.36,
    fog: "#261c3c",
    waterDeep: "#0c1832",
    waterShallow: "#27486e",
    lantern: 1,
    sunAzimuth: -1.3,
    sunElevation: 0.05,
    exposure: 1.15,
  },
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/**
 * The palace is a long, shallow rectangle. The front faces -Z (the lawns and
 * approach). The arcade is the defining element: a row of round arches on two
 * storeys wrapping the front. Dimensions live in the pure-layout exports above.
 */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

const ROOF_Y = PLINTH + STOREY * 2 + PARAPET;

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getPalaceAnchors();
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

const homeRaw = getPalaceHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

/**
 * Terrain height at a world XZ. y = 0 is the lawn level; the palace stands on
 * a low plinth plateau, and the diorama has a cut plateau edge.
 */
function terrainHeight(x: number, z: number): number {
  let h = 0.3 * Math.sin(x * 0.05) * Math.cos(z * 0.045);

  // The palace footprint and a margin around it sit on a raised plinth.
  const inX = smoothstep(HALF_W + 12, HALF_W + 3, Math.abs(x));
  const inZ = smoothstep(HALF_D + 14, HALF_D + 4, Math.abs(z));
  h += PLINTH * inX * inZ;

  // The approach drive in front is kept level.
  if (z < -HALF_D - 6 && z > -HALF_D - 34 && Math.abs(x) < 22) h -= 0.1;

  // Plateau falloff — the diorama is an object with a cut edge.
  const corner = Math.hypot(Math.max(0, Math.abs(x) - 66), Math.max(0, Math.abs(z) - 52));
  const outside = Math.max(Math.max(Math.abs(x), Math.abs(z)) - 78, corner - 10);
  if (outside > -1) h -= 20 * smoothstep(-1, 2.5, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/** True when a point sits on the palace's raised plinth. */
const onPlinth = (x: number, z: number) =>
  Math.abs(x) < HALF_W + 4 && Math.abs(z) < HALF_D + 6;

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createPalaceWorld(
  container: HTMLElement,
  options: PalaceWorldOptions,
): PalaceWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

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
    900,
  );
  const fog = new THREE.Fog("#e6d6bc", 200, 600);
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
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  /* --- materials --- */

  // The palace is a pale, creamy stone; the plinth a deeper rusticated tone.
  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#e8dcc4", roughness: 0.92, metalness: 0 }),
  );
  const plinthMat = track(
    new THREE.MeshStandardMaterial({ color: "#c7b294", roughness: 0.96 }),
  );
  const trimMat = track(new THREE.MeshStandardMaterial({ color: "#f4ecdc", roughness: 0.9 }));
  const shadowMat = track(
    new THREE.MeshStandardMaterial({ color: "#6b5a44", roughness: 1 }),
  );
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#a4552f", roughness: 0.9 }));
  const teakMat = track(new THREE.MeshStandardMaterial({ color: "#5a3520", roughness: 0.8 }));
  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#f6f2ea", roughness: 0.55, metalness: 0.05 }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4f7c3e", roughness: 0.95, flatShading: true }),
  );
  const hedgeMat = track(
    new THREE.MeshStandardMaterial({ color: "#3f6a33", roughness: 0.95, flatShading: true }),
  );
  const flowerMat = track(
    new THREE.MeshStandardMaterial({ color: "#c94f5e", roughness: 0.9, flatShading: true }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(150, 128, 120, 100));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawn = new THREE.Color("#6f9a4e");
  const lawnDark = new THREE.Color("#557a3e");
  const dust = new THREE.Color("#cbb28a");
  const gravel = new THREE.Color("#b3a68d");
  const drive = new THREE.Color("#9b8f7a");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(77);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (onPlinth(x, z)) {
      // Terrace around the palace — gravel and stone.
      tmp.copy(gravel).lerp(dust, colorRnd() * 0.5);
    } else if (z < -HALF_D - 6 && z > -HALF_D - 34 && Math.abs(x) < 20) {
      // The approach drive.
      tmp.copy(drive).lerp(gravel, colorRnd() * 0.3);
    } else {
      // Lawns, with a little mowing variation.
      tmp.copy(lawnDark).lerp(lawn, 0.35 + colorRnd() * 0.65);
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

  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#6d5741", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(140, 20, 118)), baseMat);
  base.position.y = -11;
  scene.add(base);

  /* --- the palace body --- */

  const palace = new THREE.Group();
  const plinthTop = PLINTH;
  const frontZ = -HALF_D; // face of the front wall
  const bodyTop = plinthTop + STOREY * 2;

  // Main block — two storeys.
  const body = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2, STOREY * 2, HALF_D * 2)),
    stoneMat,
  );
  body.position.set(0, plinthTop + STOREY, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  palace.add(body);

  // Plinth course around the base.
  const plinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 2, PLINTH, HALF_D * 2 + 2)),
    plinthMat,
  );
  plinth.position.set(0, PLINTH / 2, 0);
  plinth.receiveShadow = true;
  palace.add(plinth);

  // String course between the storeys.
  const stringCourse = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 0.4, 0.5, HALF_D * 2 + 0.4)),
    trimMat,
  );
  stringCourse.position.set(0, plinthTop + STOREY, 0);
  palace.add(stringCourse);

  // Parapet along the roofline.
  const parapet = new THREE.Mesh(
    track(new THREE.BoxGeometry(HALF_W * 2 + 0.6, PARAPET, HALF_D * 2 + 0.6)),
    trimMat,
  );
  parapet.position.set(0, bodyTop + PARAPET / 2, 0);
  parapet.castShadow = true;
  palace.add(parapet);

  // Low hipped roofs behind the parapet.
  // Bake rotate+scale into the geometry. Mesh.scale is applied *before* mesh.rotation
  // in three.js, so non-uniform scale + 45° rotation on the mesh itself stretches
  // the orange roof into a star — never do that here.
  {
    const roofH = 3.6;
    const over = 0.7;
    const roofGeo = track(new THREE.ConeGeometry(1, roofH, 4));
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale((HALF_W + over) * Math.SQRT2, 1, (HALF_D + over) * Math.SQRT2);
    roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, bodyTop + PARAPET + roofH / 2 - 0.12, 0);
    roof.castShadow = true;
    palace.add(roof);
  }

  /* --- the arcade: round arches on two storeys along the front --- */

  {
    // The arches are recessed a touch forward of the front wall.
    const archZ = frontZ - 0.35;
    const span = 5.4; // centre-to-centre spacing of the arches
    const archCount = Math.floor((HALF_W * 2 - 6) / span);
    const usedSpan = (HALF_W * 2 - 6) / archCount;

    // Piers between arches, on both storeys.
    const pierGeo = track(new THREE.BoxGeometry(1.1, STOREY, 1.0));
    const piers = new THREE.InstancedMesh(pierGeo, stoneMat, (archCount + 1) * 2);
    piers.castShadow = true;
    piers.receiveShadow = true;

    // The arch ring itself, built from a half-torus for a clean round head.
    const archGeo = track(new THREE.TorusGeometry(usedSpan / 2, 0.55, 8, 20, Math.PI));
    const arches = new THREE.InstancedMesh(archGeo, trimMat, archCount * 2);
    arches.castShadow = true;

    // The dark recess inside each arch gives the arcade its depth.
    const recessGeo = track(new THREE.PlaneGeometry(usedSpan - 1.2, STOREY - 1.4));
    const recesses = new THREE.InstancedMesh(recessGeo, shadowMat, archCount * 2);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let pi = 0;
    let ai = 0;
    let ri = 0;
    for (let storey = 0; storey < 2; storey++) {
      const baseY = plinthTop + storey * STOREY;
      const springY = baseY + STOREY * 0.62; // where the arch springs from
      for (let i = 0; i <= archCount; i++) {
        const x = -HALF_W + 3 + i * usedSpan;
        m.compose(new THREE.Vector3(x, baseY + STOREY / 2, archZ), q, new THREE.Vector3(1, 1, 1));
        piers.setMatrixAt(pi++, m);
      }
      for (let i = 0; i < archCount; i++) {
        const x = -HALF_W + 3 + (i + 0.5) * usedSpan;
        m.compose(new THREE.Vector3(x, springY, archZ - 0.1), q, new THREE.Vector3(1, 1, 1));
        arches.setMatrixAt(ai++, m);
        m.compose(
          new THREE.Vector3(x, baseY + STOREY / 2, archZ + 0.5),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        recesses.setMatrixAt(ri++, m);
      }
    }
    piers.instanceMatrix.needsUpdate = true;
    arches.instanceMatrix.needsUpdate = true;
    recesses.instanceMatrix.needsUpdate = true;
    palace.add(piers);
    palace.add(arches);
    palace.add(recesses);
  }

  /* --- side arcades (shorter runs along ±X elevations) --- */

  {
    const sideSpan = 5.2;
    const sideCount = Math.max(3, Math.floor((HALF_D * 2 - 4) / sideSpan));
    const usedSpan = (HALF_D * 2 - 4) / sideCount;
    const pierGeo = track(new THREE.BoxGeometry(1.0, STOREY, 1.1));
    const archGeo = track(new THREE.TorusGeometry(usedSpan / 2, 0.5, 8, 18, Math.PI));
    const recessGeo = track(new THREE.PlaneGeometry(usedSpan - 1.1, STOREY - 1.4));
    const total = (sideCount + 1) * 2 * 2; // both sides × both storeys
    const piers = new THREE.InstancedMesh(pierGeo, stoneMat, total);
    const arches = new THREE.InstancedMesh(archGeo, trimMat, sideCount * 2 * 2);
    const recesses = new THREE.InstancedMesh(recessGeo, shadowMat, sideCount * 2 * 2);
    piers.castShadow = true;
    arches.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let pi = 0;
    let ai = 0;
    let ri = 0;
    for (const side of [-1, 1] as const) {
      const archX = side * (HALF_W + 0.35);
      e.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      q.setFromEuler(e);
      for (let storey = 0; storey < 2; storey++) {
        const baseY = plinthTop + storey * STOREY;
        const springY = baseY + STOREY * 0.62;
        for (let i = 0; i <= sideCount; i++) {
          const z = -HALF_D + 2 + i * usedSpan;
          m.compose(
            new THREE.Vector3(archX, baseY + STOREY / 2, z),
            q,
            new THREE.Vector3(1, 1, 1),
          );
          piers.setMatrixAt(pi++, m);
        }
        for (let i = 0; i < sideCount; i++) {
          const z = -HALF_D + 2 + (i + 0.5) * usedSpan;
          // Arch rings face outward: rotate so torus stands on the side elevation.
          e.set(0, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2);
          q.setFromEuler(e);
          m.compose(
            new THREE.Vector3(archX - side * 0.1, springY, z),
            q,
            new THREE.Vector3(1, 1, 1),
          );
          arches.setMatrixAt(ai++, m);
          e.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
          q.setFromEuler(e);
          m.compose(
            new THREE.Vector3(archX - side * 0.45, baseY + STOREY / 2, z),
            q,
            new THREE.Vector3(1, 1, 1),
          );
          recesses.setMatrixAt(ri++, m);
        }
      }
    }
    piers.instanceMatrix.needsUpdate = true;
    arches.instanceMatrix.needsUpdate = true;
    recesses.instanceMatrix.needsUpdate = true;
    palace.add(piers);
    palace.add(arches);
    palace.add(recesses);
  }

  /* --- parapet balusters along the front roof edge --- */

  {
    const layout = buildPalaceLayout();
    const balusters = layout.props.filter(
      (p) => p.kind === "baluster" && p.feature === "facade",
    );
    const geo = track(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6));
    const mesh = new THREE.InstancedMesh(geo, trimMat, balusters.length);
    mesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    balusters.forEach((b, i) => {
      m.compose(
        new THREE.Vector3(b.x, b.y + 0.55, b.z - 0.15),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    palace.add(mesh);

    // Coping rail on top of balusters
    const rail = new THREE.Mesh(
      track(new THREE.BoxGeometry(HALF_W * 2 - 2, 0.16, 0.35)),
      trimMat,
    );
    rail.position.set(0, bodyTop + 1.05, frontZ - 0.15);
    palace.add(rail);
  }

  /* --- corner pavilions --- */

  for (const side of [-1, 1]) {
    const px = side * (HALF_W - PAVILION.halfW + 1);
    const pavH = STOREY * 2 + PAVILION.extra;
    const pav = new THREE.Mesh(
      track(new THREE.BoxGeometry(PAVILION.halfW * 2, pavH, HALF_D * 2 + 2)),
      stoneMat,
    );
    pav.position.set(px, plinthTop + pavH / 2, 0);
    pav.castShadow = true;
    pav.receiveShadow = true;
    palace.add(pav);

    // Pavilion parapet + a low pyramidal cap.
    const pavTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(PAVILION.halfW * 2 + 0.5, PARAPET, HALF_D * 2 + 2.5)),
      trimMat,
    );
    pavTrim.position.set(px, plinthTop + pavH + PARAPET / 2, 0);
    pavTrim.castShadow = true;
    palace.add(pavTrim);

    const capH = 2.5;
    const capGeo = track(new THREE.ConeGeometry(1, capH, 4));
    capGeo.rotateY(Math.PI / 4);
    // Pavilion footprint: width 2*halfW, depth 2*HALF_D+2 → half extents halfW and HALF_D+1
    capGeo.scale(
      (PAVILION.halfW + 0.35) * Math.SQRT2,
      1,
      (HALF_D + 1.1) * Math.SQRT2,
    );
    capGeo.computeVertexNormals();
    const cap = new THREE.Mesh(capGeo, roofMat);
    cap.position.set(px, plinthTop + pavH + PARAPET + capH / 2 - 0.1, 0);
    cap.castShadow = true;
    palace.add(cap);
  }

  /* --- central portico --- */

  {
    const portTop = PORTICO.top;
    // Projecting block in front of the centre.
    const port = new THREE.Mesh(
      track(new THREE.BoxGeometry(PORTICO.halfW * 2, portTop - plinthTop, PORTICO.depth)),
      stoneMat,
    );
    port.position.set(0, plinthTop + (portTop - plinthTop) / 2, frontZ - PORTICO.depth / 2 + 0.5);
    port.castShadow = true;
    port.receiveShadow = true;
    palace.add(port);

    // Four columns at the front of the portico.
    const colGeo = track(new THREE.CylinderGeometry(0.7, 0.8, STOREY * 1.7, 12));
    for (let i = 0; i < 4; i++) {
      const x = -PORTICO.halfW + 1.6 + i * ((PORTICO.halfW * 2 - 3.2) / 3);
      const col = new THREE.Mesh(colGeo, trimMat);
      col.position.set(x, plinthTop + STOREY * 0.85, frontZ - PORTICO.depth + 0.6);
      col.castShadow = true;
      palace.add(col);
    }

    // Pediment + small hipped roof crowning the portico (aligned to portico plan).
    {
      const pedH = 2.8;
      const pedGeo = track(new THREE.ConeGeometry(1, pedH, 4));
      pedGeo.rotateY(Math.PI / 4);
      pedGeo.scale(
        (PORTICO.halfW + 0.5) * Math.SQRT2,
        1,
        (PORTICO.depth / 2 + 0.4) * Math.SQRT2,
      );
      pedGeo.computeVertexNormals();
      const ped = new THREE.Mesh(pedGeo, roofMat);
      ped.position.set(0, portTop + pedH / 2 - 0.1, frontZ - PORTICO.depth / 2 + 0.5);
      ped.castShadow = true;
      palace.add(ped);

      // Cream cornice under the pediment so the gable reads against the stone.
      const cornice = new THREE.Mesh(
        track(new THREE.BoxGeometry(PORTICO.halfW * 2 + 0.8, 0.35, PORTICO.depth + 0.6)),
        trimMat,
      );
      cornice.position.set(0, portTop + 0.1, frontZ - PORTICO.depth / 2 + 0.5);
      cornice.castShadow = true;
      palace.add(cornice);
    }

    // Entrance door.
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 5, 0.4)), teakMat);
    door.position.set(0, plinthTop + 2.5, frontZ - PORTICO.depth + 0.4);
    palace.add(door);
  }

  /* --- windows along the upper storey --- */

  {
    const winGeo = track(new THREE.BoxGeometry(1.6, 3, 0.3));
    const winCount = 9;
    for (let i = 0; i < winCount; i++) {
      const x = -HALF_W + 6 + (i / (winCount - 1)) * (HALF_W * 2 - 12);
      if (Math.abs(x) < PORTICO.halfW + 2) continue; // the portico covers the centre
      const win = new THREE.Mesh(winGeo, teakMat);
      win.position.set(x, plinthTop + STOREY + 2.6, frontZ - 0.15);
      palace.add(win);
    }
  }

  /* --- cutaway interiors: Gandhi room (upper east) + museum (ground west) --- */

  {
    // Open a rectangular cut into the east upper wall so the Gandhi room reads.
    const cut = new THREE.Mesh(
      track(new THREE.BoxGeometry(8.5, 4.2, 0.6)),
      shadowMat,
    );
    cut.position.set(12, plinthTop + STOREY + 2.8, frontZ - 0.05);
    palace.add(cut);

    // Simple room floor slab just inside the cut.
    const roomFloor = new THREE.Mesh(
      track(new THREE.BoxGeometry(8, 0.2, 8)),
      marbleMat,
    );
    roomFloor.position.set(12, plinthTop + STOREY + 0.15, -1);
    palace.add(roomFloor);

    // Charpoy / low bed + desk — the memorial's plain room.
    const bed = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.35, 1.6)), teakMat);
    bed.position.set(13.5, plinthTop + STOREY + 0.45, -2);
    bed.castShadow = true;
    palace.add(bed);
    const mattress = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.0, 0.18, 1.4)),
      track(new THREE.MeshStandardMaterial({ color: "#e8e0d0", roughness: 0.95 })),
    );
    mattress.position.set(13.5, plinthTop + STOREY + 0.7, -2);
    palace.add(mattress);

    const desk = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.7, 0.7)), teakMat);
    desk.position.set(10, plinthTop + STOREY + 0.5, 0.5);
    desk.castShadow = true;
    palace.add(desk);
    const spinningWheel = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.45, 0.05, 6, 16)),
      teakMat,
    );
    spinningWheel.position.set(10.6, plinthTop + STOREY + 1.1, 0.5);
    spinningWheel.rotation.y = 0.4;
    palace.add(spinningWheel);

    // Warm memorial lamp in the room
    const roomLight = new THREE.PointLight("#ffd8a8", 18, 14, 2);
    roomLight.position.set(12, plinthTop + STOREY + 3.5, -1);
    palace.add(roomLight);

    // Museum wing: ground-floor west cutaway with display cases
    const mCut = new THREE.Mesh(
      track(new THREE.BoxGeometry(10, 4, 0.55)),
      shadowMat,
    );
    mCut.position.set(-12, plinthTop + 2.6, frontZ - 0.05);
    palace.add(mCut);

    const mFloor = new THREE.Mesh(
      track(new THREE.BoxGeometry(10, 0.18, 9)),
      plinthMat,
    );
    mFloor.position.set(-12, plinthTop + 0.12, 1);
    palace.add(mFloor);

    for (let i = 0; i < 6; i++) {
      const cx = -16 + (i % 3) * 3.5;
      const cz = -1 + Math.floor(i / 3) * 4;
      const caseBody = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.5, 1.4, 0.8)),
        teakMat,
      );
      caseBody.position.set(cx, plinthTop + 0.85, cz);
      caseBody.castShadow = true;
      palace.add(caseBody);
      const glass = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.35, 1.0, 0.65)),
        track(
          new THREE.MeshStandardMaterial({
            color: "#c8d8e8",
            roughness: 0.15,
            metalness: 0.1,
            transparent: true,
            opacity: 0.28,
          }),
        ),
      );
      glass.position.set(cx, plinthTop + 1.0, cz);
      palace.add(glass);
    }

    const museumLight = new THREE.PointLight("#ffe8c8", 14, 16, 2);
    museumLight.position.set(-12, plinthTop + 4.5, 1);
    palace.add(museumLight);
  }

  scene.add(palace);

  /* --- the samadhis: marble memorials in the grounds --- */

  {
    // A quiet paved corner to the south-east of the palace.
    const sx = SAMADHI_COURT.x;
    const sz = SAMADHI_COURT.z;
    const sy = groundHeight(sx, sz);

    // Paved enclosure.
    const court = new THREE.Mesh(track(new THREE.CylinderGeometry(9, 9.5, 0.5, 24)), marbleMat);
    court.position.set(sx, sy + 0.25, sz);
    court.receiveShadow = true;
    scene.add(court);

    // Two low memorial platforms with a small canopy over each.
    for (const [ox, oz] of [
      [-2.2, 0],
      [2.2, 0],
    ] as [number, number][]) {
      const platform = new THREE.Mesh(track(new THREE.BoxGeometry(3, 1.1, 2)), marbleMat);
      platform.position.set(sx + ox, sy + 0.8, sz + oz);
      platform.castShadow = true;
      platform.receiveShadow = true;
      scene.add(platform);

      // Slender corner posts + a small domed canopy.
      const postGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6));
      for (const [cx, cz] of [
        [-1.3, -0.8],
        [1.3, -0.8],
        [-1.3, 0.8],
        [1.3, 0.8],
      ] as [number, number][]) {
        const post = new THREE.Mesh(postGeo, marbleMat);
        post.position.set(sx + ox + cx, sy + 2.3, sz + oz + cz);
        scene.add(post);
      }
      const canopy = new THREE.Mesh(track(new THREE.SphereGeometry(1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), marbleMat);
      canopy.position.set(sx + ox, sy + 3.5, sz + oz);
      canopy.scale.y = 0.8;
      canopy.castShadow = true;
      scene.add(canopy);
    }
  }

  /* --- hedges and flower beds fronting the palace --- */

  {
    const rnd = mulberry32(913);
    // A low parterre of hedges across the front lawn.
    const hedgeGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, 40);
    hedges.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let hi = 0;
    // Two long hedge lines flanking the central drive.
    for (const sideX of [-1, 1]) {
      for (let i = 0; i < 10; i++) {
        const x = sideX * (10 + i * 3);
        const z = -HALF_D - 12;
        m.compose(
          new THREE.Vector3(x, groundHeight(x, z) + 0.5, z),
          q,
          new THREE.Vector3(2.4, 1 + rnd() * 0.2, 1.2),
        );
        hedges.setMatrixAt(hi++, m);
      }
    }
    // A curved bed in front of the drive.
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.cos(a) * 8;
      const z = -HALF_D - 24 + Math.sin(a) * 4;
      m.compose(
        new THREE.Vector3(x, groundHeight(x, z) + 0.4, z),
        q,
        new THREE.Vector3(1.4, 0.7 + rnd() * 0.2, 1.4),
      );
      hedges.setMatrixAt(hi++, m);
    }
    hedges.instanceMatrix.needsUpdate = true;
    scene.add(hedges);

    // Flower accents in the round bed.
    const flowerGeo = track(new THREE.IcosahedronGeometry(0.5, 0));
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 26);
    let fi = 0;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const x = Math.cos(a) * 8;
      const z = -HALF_D - 24 + Math.sin(a) * 4;
      m.compose(
        new THREE.Vector3(x + (rnd() - 0.5), groundHeight(x, z) + 1.1, z + (rnd() - 0.5)),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      flowers.setMatrixAt(fi++, m);
    }
    flowers.instanceMatrix.needsUpdate = true;
    scene.add(flowers);
  }

  /* --- trees --- */

  {
    const rnd = mulberry32(5150);
    const spots: { x: number; z: number; s: number }[] = [];
    let guard = 0;
    while (spots.length < 42 && guard < 3000) {
      guard++;
      const x = (rnd() - 0.5) * 132;
      const z = (rnd() - 0.5) * 112;
      if (Math.abs(x) > 62 || Math.abs(z) > 50) continue;
      // Keep the palace, plinth terrace, drive and samadhi court clear.
      if (Math.abs(x) < HALF_W + 10 && Math.abs(z) < HALF_D + 12) continue;
      if (z < -HALF_D - 6 && z > -HALF_D - 34 && Math.abs(x) < 14) continue;
      if (Math.hypot(x - 30, z - 26) < 13) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
      spots.push({ x, z, s: 0.9 + rnd() * 0.9 });
    }

    const trunkGeo = track(new THREE.CylinderGeometry(0.28, 0.46, 3.6, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, spots.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let ci = 0;
    spots.forEach((s, i) => {
      const y = groundHeight(s.x, s.z);
      m.compose(
        new THREE.Vector3(s.x, y + 1.8 * s.s, s.z),
        q,
        new THREE.Vector3(s.s, s.s, s.s),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (3.2 - k * 0.8) * s.s;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            s.x + (rnd() - 0.5) * 1.6,
            y + (4.2 + k * 1.5) * s.s,
            s.z + (rnd() - 0.5) * 1.6,
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

  /* --- lamps, lit at dusk --- */

  const lampGlowMat = track(
    new THREE.SpriteMaterial({
      map: track(radialSprite("rgba(255,214,150,0.95)", "rgba(255,150,60,0.3)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  {
    // A row of lamps along the drive and flanking the portico.
    const lampSpots: [number, number][] = [
      [-PORTICO.halfW - 1.5, frontZ - PORTICO.depth],
      [PORTICO.halfW + 1.5, frontZ - PORTICO.depth],
      [-12, -HALF_D - 20],
      [12, -HALF_D - 20],
      [-12, -HALF_D - 30],
      [12, -HALF_D - 30],
    ];
    const postGeo = track(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 6));
    for (const [lx, lz] of lampSpots) {
      const ly = groundHeight(lx, lz);
      const post = new THREE.Mesh(postGeo, trunkMat);
      post.position.set(lx, ly + 1.7, lz);
      post.castShadow = true;
      scene.add(post);
      const glow = new THREE.Sprite(lampGlowMat);
      glow.scale.setScalar(5);
      glow.position.set(lx, ly + 3.6, lz);
      scene.add(glow);
    }
  }

  /* --- dust motes (dry season) --- */

  const DUST = 110;
  const dustGeo = track(new THREE.BufferGeometry());
  const dustSeed: number[] = [];
  {
    const arr = new Float32Array(DUST * 3);
    const rnd = mulberry32(23);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (rnd() - 0.5) * 120;
      arr[i * 3 + 1] = 1 + rnd() * 18;
      arr[i * 3 + 2] = (rnd() - 0.5) * 100;
      dustSeed.push(rnd() * 100);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.5,
      map: track(radialSprite("rgba(255,240,214,0.9)", "rgba(255,214,150,0.35)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.35,
    }),
  );
  const dustMotes = new THREE.Points(dustGeo, dustMat);
  scene.add(dustMotes);

  /* --- monsoon rain --- */

  const RAIN = 900;
  const rainGeo = track(new THREE.BufferGeometry());
  {
    const arr = new Float32Array(RAIN * 2 * 3);
    const rnd = mulberry32(88);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 130;
      const y = rnd() * 70;
      const z = (rnd() - 0.5) * 110;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y + 1.6;
      arr[i * 6 + 5] = z;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const rainMat = track(
    new THREE.LineBasicMaterial({
      color: "#9ab8d0",
      transparent: true,
      opacity: 0,
    }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

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
    const anchor = ANCHORS[id];
    const base = new THREE.Vector3(
      anchor.target.x,
      Math.max(groundHeight(anchor.target.x, anchor.target.z), anchor.target.y) + 0.2,
      anchor.target.z,
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 7, 0));
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

  const spherical = { radius: 300, phi: 0.4, theta: HOME.theta - 0.9 };
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
  let seasonTarget = 0;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 12, 0);

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
    cur.wet = damp(cur.wet, seasonTarget, 2.4, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.8 + cur.wet * 0.25;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.4);
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    fog.near = 200 - cur.wet * 70;
    fog.far = 600 - cur.wet * 220;
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    // Greener lawns in the monsoon, bleached in the dry months.
    groundMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.84, cur.wet),
      THREE.MathUtils.lerp(0.97, 1, cur.wet),
      THREE.MathUtils.lerp(0.9, 0.88, cur.wet),
    );

    /* lamps */
    lampGlowMat.opacity = cur.lantern * 0.8;

    /* dust */
    dustMat.opacity = (1 - cur.wet) * (0.12 + cur.lantern * 0.22);
    if (motion) {
      const attr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        attr.setY(i, 2 + ((elapsed * 0.32 + s) % 16));
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.3 + s) * dt * 1.1);
      }
      attr.needsUpdate = true;
    }

    /* rain */
    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.48;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - 48 * dt;
        if (y < 0) y = 68;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.6);
      }
      attr.needsUpdate = true;
    }

    // Hedge / canopy greener in monsoon
    leafMat.color.setRGB(
      THREE.MathUtils.lerp(0.31, 0.22, cur.wet),
      THREE.MathUtils.lerp(0.49, 0.55, cur.wet),
      THREE.MathUtils.lerp(0.24, 0.28, cur.wet),
    );
    hedgeMat.color.setRGB(
      THREE.MathUtils.lerp(0.25, 0.18, cur.wet),
      THREE.MathUtils.lerp(0.42, 0.5, cur.wet),
      THREE.MathUtils.lerp(0.2, 0.24, cur.wet),
    );

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
        marker.base.y + 7 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.3 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    /* camera */
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(300, desired.radius, e);
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
    setSeason(s) {
      seasonTarget = s === "monsoon" ? 1 : 0;
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
