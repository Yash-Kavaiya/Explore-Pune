/**
 * A hand-built, procedural 3D model of the Dagdusheth Halwai Ganapati Temple.
 *
 * Same approach as the other dioramas (components/places/okayama,
 * components/places/shaniwar): plain three.js, zero external assets, geometry
 * generated at runtime. The model shows the temple precinct as a visitor reads
 * it from Budhwar Peth — the mahadwar gateway, the marble courtyard with its
 * twin deepmalas, the open sabha mandap, and the sanctum with its shikhara
 * and the gold-adorned idol visible down the central aisle.
 *
 * The "season" of the other dioramas becomes a "mode" here: an ordinary
 * darshan day, or the ten days of Ganeshotsav when the pandal canopy, string
 * lights and garlands transform the precinct.
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
  | "mahadwar"
  | "ganesh-idol"
  | "sabha-mandap"
  | "deepmalas"
  | "courtyard"
  | "ganeshotsav";

/** darshan = an ordinary day, utsav = the Ganeshotsav festival transformation. */
export type TempleMode = "darshan" | "utsav";

export type TempleWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type TempleWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: TempleMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "mahadwar",
  "ganesh-idol",
  "sabha-mandap",
  "deepmalas",
  "courtyard",
  "ganeshotsav",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Precinct half-extents: the raised marble platform everything stands on. */
export const PX = 26;
export const PZ_MIN = -10;
export const PZ_MAX = 38;

/** Jagati (building plinth) under mandap + sanctum. */
export const JAGATI = { x: 0, z: 4, w: 30, d: 24, h: 1.5 };

/** Sanctum (garbhagriha) — open-fronted, with the shikhara above. */
export const SANCTUM = { x: 0, z: -1.5, w: 14, d: 9, h: 6.5, wall: 1.2 };

/** Sabha mandap — the open pillared hall in front of the sanctum. */
export const MANDAP = { x: 0, z: 10, w: 26, d: 10, colH: 5 };

/** Mahadwar gateway on the street edge. */
export const GATE = { z: 34, h: 10, opening: 5.5 };

/** Twin deepmalas in the courtyard. */
export const DEEPMALAS = [
  { x: -8.5, z: 25 },
  { x: 8.5, z: 25 },
] as const;

export type TemplePropKind =
  | "column"
  | "deepam"
  | "deepmala"
  | "stall"
  | "tree"
  | "lamp"
  | "garland";

export type TemplePropSpec = {
  kind: TemplePropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

/**
 * Deterministic layout of precinct props and marker bases. Pure — no three.js
 * objects — so vitest can assert density and feature coverage without WebGL.
 */
export function buildTempleLayout(seed = 1893): {
  props: TemplePropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  columnCount: number;
  deepmalaCount: number;
} {
  const rnd = mulberry32(seed);
  const props: TemplePropSpec[] = [];
  const push = (p: TemplePropSpec) => props.push(p);

  // Mandap columns
  const colXs = [-10.5, -4.5, 4.5, 10.5];
  const colZs = [5.5, 8.5, 11.5, 14.5];
  for (const cx of colXs) {
    for (const cz of colZs) {
      push({
        kind: "column",
        x: cx,
        y: JAGATI.h,
        z: cz,
        scale: 1,
        feature: "sabha-mandap",
      });
    }
  }

  // Hanging deepams in the mandap
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      push({
        kind: "deepam",
        x: ix * 7,
        y: JAGATI.h + MANDAP.colH - 1.5,
        z: 6.5 + iz * 3.5,
        scale: 1,
        feature: "sabha-mandap",
      });
    }
  }

  // Twin deepmalas
  for (const d of DEEPMALAS) {
    push({
      kind: "deepmala",
      x: d.x,
      y: 0,
      z: d.z,
      scale: 1,
      feature: "deepmalas",
    });
  }

  // Flower stalls
  for (const [sx, sz] of [
    [-17, 20],
    [17, 20],
    [-17, 30],
    [17, 30],
  ] as [number, number][]) {
    push({
      kind: "stall",
      x: sx,
      y: 0,
      z: sz,
      scale: 1,
      feature: "courtyard",
    });
  }

  // Gate lamps / courtyard markers near mahadwar
  for (const side of [-1, 1]) {
    push({
      kind: "lamp",
      x: side * 6,
      y: 0,
      z: GATE.z - 2,
      scale: 1,
      feature: "mahadwar",
    });
  }

  // Garland points for utsav (layout density, rendered when mode is on)
  for (let i = 0; i < 12; i++) {
    push({
      kind: "garland",
      x: -10 + (i % 6) * 4,
      y: JAGATI.h + 4,
      z: 8 + Math.floor(i / 6) * 4,
      scale: 0.8 + rnd() * 0.3,
      feature: "ganeshotsav",
    });
  }

  // Trees outside the precinct
  let guard = 0;
  const treeSpots: { x: number; z: number }[] = [];
  while (treeSpots.length < 24 && guard < 2000) {
    guard++;
    const x = (rnd() - 0.5) * 100;
    const z = (rnd() - 0.5) * 100;
    if (Math.abs(x) < 32 && z > -16 && z < 44) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 48) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: 0,
      z: s.z,
      scale: 0.85 + rnd() * 0.6,
      feature: null,
    });
  }

  // Idol is a single conceptual prop for feature coverage
  push({
    kind: "deepam",
    x: SANCTUM.x,
    y: JAGATI.h + 2,
    z: SANCTUM.z,
    scale: 1.2,
    feature: "ganesh-idol",
  });

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    mahadwar: { x: 0, y: GATE.h + 1.5, z: GATE.z },
    "ganesh-idol": { x: 0, y: SANCTUM.h + 5.5, z: SANCTUM.z + 2.5 },
    "sabha-mandap": { x: 0, y: MANDAP.colH + 4.5, z: MANDAP.z },
    deepmalas: { x: DEEPMALAS[0].x, y: 9.5, z: DEEPMALAS[0].z },
    courtyard: { x: 0, y: 0.3, z: 24 },
    ganeshotsav: { x: 16, y: 0.3, z: 24 },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    columnCount: colXs.length * colZs.length,
    deepmalaCount: DEEPMALAS.length,
  };
}

export function getTempleAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    mahadwar: {
      target: [0, 6.5, GATE.z],
      dir: [0.1, 0.42, 0.9],
      distance: 30,
    },
    "ganesh-idol": {
      target: [0, 4.6, -1.5],
      dir: [0.02, 0.3, 0.95],
      distance: 22,
    },
    "sabha-mandap": {
      target: [0, 5.5, MANDAP.z],
      dir: [0.62, 0.5, 0.6],
      distance: 30,
    },
    deepmalas: {
      target: [DEEPMALAS[0].x, 5, DEEPMALAS[0].z],
      dir: [-0.5, 0.45, 0.74],
      distance: 24,
    },
    courtyard: {
      target: [0, 1, 24],
      dir: [0.3, 0.8, 0.52],
      distance: 46,
    },
    ganeshotsav: {
      target: [0, 3, 12],
      dir: [0.5, 0.62, 0.6],
      distance: 78,
    },
  };
}

export function getTempleHomeView() {
  return {
    // Street-side approach: mahadwar in the near ground, shikhara rising beyond.
    target: [0, 5, 16] as [number, number, number],
    radius: 68,
    phi: 1.08,
    theta: 0.22,
  };
}

export function getTemplePalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — mangal aarti at dawn, evening aarti, and utsav night     */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1c2c55",
    skyBottom: "#f4d9c8",
    sun: "#ffd7ae",
    sunIntensity: 2.2,
    hemiSky: "#b3c6e6",
    hemiGround: "#6a5a46",
    ambient: 0.85,
    fog: "#eed9c6",
    waterDeep: "#2b5a63",
    waterShallow: "#7fb2b4",
    lantern: 0.55,
    sunAzimuth: 2.3,
    sunElevation: 0.3,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#45203c",
    skyBottom: "#ffcf8e",
    sun: "#ffbe6e",
    sunIntensity: 3.0,
    hemiSky: "#cdbfe0",
    hemiGround: "#6b5138",
    ambient: 0.8,
    fog: "#f0cfa4",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.8,
    sunAzimuth: -0.7,
    sunElevation: 0.34,
    exposure: 1.02,
  },
  dusk: {
    skyTop: "#050822",
    skyBottom: "#3b2150",
    sun: "#8f7bd6",
    sunIntensity: 0.35,
    hemiSky: "#2c3468",
    hemiGround: "#191423",
    ambient: 0.36,
    fog: "#231a3a",
    waterDeep: "#0b1730",
    waterShallow: "#26456b",
    lantern: 1,
    sunAzimuth: -1.3,
    sunElevation: 0.04,
    exposure: 1.18,
  },
};

/* ------------------------------------------------------------------ */
/* Layout (runtime anchors from pure helpers)                          */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getTempleAnchors();
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

const homeRaw = getTempleHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

const insidePrecinct = (x: number, z: number) =>
  Math.abs(x) < PX - 1 && z > PZ_MIN + 1 && z < PZ_MAX - 1;

/** Terrain height at a world XZ. y = 0 is the street level. */
function terrainHeight(x: number, z: number): number {
  let h = 0.18 * Math.sin(x * 0.07) * Math.cos(z * 0.06);

  // The whole precinct sits on a raised marble platform.
  const inX = smoothstep(PX + 2, PX - 4, Math.abs(x));
  const inZ =
    smoothstep(PZ_MIN - 2, PZ_MIN + 4, z) * smoothstep(PZ_MAX + 2, PZ_MAX - 4, z);
  h += 1.0 * inX * inZ;

  // Plateau falloff — the diorama is an object with a cut edge.
  const corner = Math.hypot(Math.max(0, Math.abs(x) - 44), Math.max(0, Math.abs(z) - 44));
  const outside = Math.max(Math.max(Math.abs(x), Math.abs(z)) - 52, corner - 12);
  if (outside > -1) h -= 18 * smoothstep(-1, 2.5, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/** Rangoli design drawn on canvas — concentric rings and petals. */
function rangoliTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const c = size / 2;
    const rings: [number, string][] = [
      [120, "#e8862e"],
      [104, "#f5efe0"],
      [88, "#c43d5a"],
      [72, "#f7c948"],
    ];
    for (const [r, color] of rings) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    // Petal ring.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * 46, c + Math.sin(a) * 46, 18, 9, a, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#3f7a4f" : "#e8862e";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(c, c, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#c43d5a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#f7c948";
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createTempleWorld(
  container: HTMLElement,
  options: TempleWorldOptions,
): TempleWorld {
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
  const fog = new THREE.Fog("#eed9c6", 170, 520);
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
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  /* --- materials --- */

  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#d9d0bd", roughness: 0.55, metalness: 0.05 }),
  );
  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#9d8f7c", roughness: 0.95, metalness: 0 }),
  );
  const stoneDarkMat = track(new THREE.MeshStandardMaterial({ color: "#7d7062", roughness: 0.95 }));
  const shikharaMat = track(new THREE.MeshStandardMaterial({ color: "#a89478", roughness: 0.9 }));
  const teakMat = track(new THREE.MeshStandardMaterial({ color: "#5c3620", roughness: 0.8 }));
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#7c3f2c", roughness: 0.9 }));
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.35, metalness: 0.85 }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: "#f2b53a",
      roughness: 0.26,
      metalness: 0.92,
      emissive: "#8a5510",
      emissiveIntensity: 0.38,
    }),
  );
  const silverMat = track(
    new THREE.MeshStandardMaterial({ color: "#cfc8ba", roughness: 0.32, metalness: 0.85 }),
  );
  const blackStoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#2e2a29", roughness: 0.55, metalness: 0.1 }),
  );
  const fabricMat = track(
    new THREE.MeshStandardMaterial({
      color: "#d96a1e",
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const flagMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e2761f",
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4f7a3c", roughness: 0.95, flatShading: true }),
  );
  const marigoldMat = track(
    new THREE.MeshStandardMaterial({ color: "#e8862e", roughness: 0.9, transparent: true }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(120, 120, 108, 108));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const marbleLight = new THREE.Color("#ddd5c4");
  const marbleBand = new THREE.Color("#c8bda6");
  const dust = new THREE.Color("#c3ac86");
  const paving = new THREE.Color("#a99c88");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (insidePrecinct(x, z)) {
      tmp.copy(marbleLight).lerp(marbleBand, colorRnd() * 0.4);
      // The central aisle is polished darker by decades of feet.
      if (Math.abs(x) < 3.5 && z > 2) tmp.lerp(marbleBand, 0.55);
    } else {
      tmp.copy(dust).lerp(paving, colorRnd() * 0.5);
      if (z > PZ_MAX && z < PZ_MAX + 10 && Math.abs(x) < 30) tmp.copy(paving);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const groundMat = track(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#6d5741", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(102, 18, 102)), baseMat);
  base.position.y = -10.5;
  scene.add(base);

  /* --- jagati: the building plinth with steps --- */

  const jagatiTop = groundHeight(JAGATI.x, JAGATI.z) + JAGATI.h;
  {
    const slab = new THREE.Mesh(
      track(new THREE.BoxGeometry(JAGATI.w, JAGATI.h, JAGATI.d)),
      marbleMat,
    );
    slab.position.set(JAGATI.x, jagatiTop - JAGATI.h / 2, JAGATI.z);
    slab.castShadow = true;
    slab.receiveShadow = true;
    scene.add(slab);

    const stepCourse = new THREE.Mesh(
      track(new THREE.BoxGeometry(JAGATI.w + 1.6, JAGATI.h * 0.4, JAGATI.d + 1.6)),
      stoneDarkMat,
    );
    stepCourse.position.set(JAGATI.x, jagatiTop - JAGATI.h + JAGATI.h * 0.2, JAGATI.z);
    stepCourse.receiveShadow = true;
    scene.add(stepCourse);

    // Front steps down to the courtyard.
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(
        track(new THREE.BoxGeometry(8 - i * 0.0, 0.38, 1.1)),
        marbleMat,
      );
      step.position.set(
        0,
        jagatiTop - 0.19 - i * 0.38,
        JAGATI.z + JAGATI.d / 2 + 0.55 + i * 1.1,
      );
      step.receiveShadow = true;
      step.castShadow = true;
      scene.add(step);
    }
  }

  /* --- sabha mandap: open pillared hall --- */

  const mandapRoofBase = jagatiTop + MANDAP.colH;
  {
    const colGeo = track(new THREE.CylinderGeometry(0.35, 0.42, MANDAP.colH, 10));
    const capGeo = track(new THREE.BoxGeometry(1.1, 0.4, 1.1));
    const colXs = [-10.5, -4.5, 4.5, 10.5];
    const colZs = [5.5, 8.5, 11.5, 14.5];
    const columns = new THREE.InstancedMesh(colGeo, teakMat, colXs.length * colZs.length);
    const caps = new THREE.InstancedMesh(capGeo, brassMat, colXs.length * colZs.length);
    columns.castShadow = true;
    caps.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let ci = 0;
    for (const cx of colXs) {
      for (const cz of colZs) {
        m.compose(
          new THREE.Vector3(cx, jagatiTop + MANDAP.colH / 2, cz),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        columns.setMatrixAt(ci, m);
        m.compose(
          new THREE.Vector3(cx, mandapRoofBase - 0.2, cz),
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

    // Three shrinking roof tiers.
    const tiers: [number, number, number][] = [
      [MANDAP.w + 3, MANDAP.d + 3, 1.1],
      [MANDAP.w - 3, MANDAP.d - 1, 1.0],
      [MANDAP.w - 11, MANDAP.d - 4.5, 0.9],
    ];
    let ry = mandapRoofBase;
    for (const [w, d, h] of tiers) {
      const tier = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), roofMat);
      tier.position.set(MANDAP.x, ry + h / 2, MANDAP.z);
      tier.castShadow = true;
      tier.receiveShadow = true;
      scene.add(tier);
      ry += h;
    }

    // Brass kalash finials along the ridge.
    const finialGeo = track(new THREE.SphereGeometry(0.45, 10, 8));
    const finials = new THREE.InstancedMesh(finialGeo, goldMat, 5);
    for (let i = 0; i < 5; i++) {
      m.compose(
        new THREE.Vector3((i - 2) * 3.2, ry + 0.45, MANDAP.z),
        q,
        new THREE.Vector3(1, 1.25, 1),
      );
      finials.setMatrixAt(i, m);
    }
    finials.instanceMatrix.needsUpdate = true;
    finials.castShadow = true;
    scene.add(finials);
  }

  /* --- hanging brass deepams in the mandap --- */

  const mandapFlames: THREE.Sprite[] = [];
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
  {
    const rodGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6));
    const bowlGeo = track(new THREE.CylinderGeometry(0.3, 0.16, 0.3, 10));
    for (let ix = -1; ix <= 1; ix++) {
      for (let iz = 0; iz < 3; iz++) {
        const lx = ix * 7;
        const lz = 6.5 + iz * 3.5;
        const rod = new THREE.Mesh(rodGeo, brassMat);
        rod.position.set(lx, mandapRoofBase - 0.7, lz);
        scene.add(rod);
        const bowl = new THREE.Mesh(bowlGeo, brassMat);
        bowl.position.set(lx, mandapRoofBase - 1.5, lz);
        bowl.castShadow = true;
        scene.add(bowl);
        const flame = new THREE.Sprite(flameMat);
        flame.scale.setScalar(1.1);
        flame.position.set(lx, mandapRoofBase - 1.15, lz);
        scene.add(flame);
        mandapFlames.push(flame);
      }
    }
  }

  /* --- sanctum (garbhagriha) with open darshan front --- */

  const sanctumTop = jagatiTop + SANCTUM.h;
  {
    const { w, d, h, wall } = SANCTUM;
    const cx = SANCTUM.x;
    const cz = SANCTUM.z;
    const openW = 6; // the darshan opening, centred on the axis

    // Back and side walls.
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, wall)), stoneMat);
    back.position.set(cx, jagatiTop + h / 2, cz - d / 2 + wall / 2);
    back.castShadow = true;
    back.receiveShadow = true;
    scene.add(back);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(track(new THREE.BoxGeometry(wall, h, d)), stoneMat);
      sideWall.position.set(cx + side * (w / 2 - wall / 2), jagatiTop + h / 2, cz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      scene.add(sideWall);

      // Front stubs either side of the opening.
      const stubW = (w - openW) / 2;
      const stub = new THREE.Mesh(
        track(new THREE.BoxGeometry(stubW, h, wall)),
        stoneMat,
      );
      stub.position.set(
        cx + side * (openW / 2 + stubW / 2),
        jagatiTop + h / 2,
        cz + d / 2 - wall / 2,
      );
      stub.castShadow = true;
      stub.receiveShadow = true;
      scene.add(stub);
    }

    // Roof slab.
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.8, 0.7, d + 0.8)), stoneDarkMat);
    slab.position.set(cx, sanctumTop + 0.35, cz);
    slab.castShadow = true;
    slab.receiveShadow = true;
    scene.add(slab);

    // Gilded torana arch over the darshan opening.
    const voussoir = track(new THREE.BoxGeometry(0.9, 0.7, 0.8));
    const torana = new THREE.InstancedMesh(voussoir, goldMat, 11);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (i / 10);
      e.set(0, 0, -a + Math.PI / 2);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(
          Math.cos(a) * (openW / 2 + 0.4),
          jagatiTop + 3.6 + Math.sin(a) * 1.8,
          cz + d / 2 + 0.3,
        ),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      torana.setMatrixAt(i, m);
    }
    torana.instanceMatrix.needsUpdate = true;
    torana.castShadow = true;
    scene.add(torana);
  }

  /* --- shikhara: the curvilinear Nagara tower --- */

  {
    const profile: [number, number][] = [
      [6.8, 0],
      [6.6, 1],
      [6.0, 3],
      [5.6, 5],
      [5.0, 7],
      [4.3, 9],
      [3.5, 11],
      [2.6, 13],
      [1.7, 14.6],
      [1.0, 15.8],
      [0.6, 16.6],
    ];
    const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const latheGeo = track(new THREE.LatheGeometry(points, 22));
    const shikhara = new THREE.Mesh(latheGeo, shikharaMat);
    shikhara.position.set(SANCTUM.x, sanctumTop + 0.7, SANCTUM.z);
    shikhara.castShadow = true;
    shikhara.receiveShadow = true;
    scene.add(shikhara);

    // Horizontal ribbed bands climbing the tower.
    const ringGeo = track(new THREE.TorusGeometry(1, 0.16, 6, 22));
    const ringYs = [2, 4, 6, 8, 10, 12, 13.8];
    const rings = new THREE.InstancedMesh(ringGeo, stoneDarkMat, ringYs.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler(Math.PI / 2, 0, 0);
    q.setFromEuler(e);
    const radiusAt = (y: number) => {
      for (let i = 1; i < profile.length; i++) {
        if (y <= profile[i][1]) {
          const [r1, y1] = profile[i - 1];
          const [r2, y2] = profile[i];
          return r1 + ((y - y1) / (y2 - y1)) * (r2 - r1);
        }
      }
      return 0.6;
    };
    ringYs.forEach((y, i) => {
      const r = radiusAt(y) + 0.05;
      m.compose(
        new THREE.Vector3(SANCTUM.x, sanctumTop + 0.7 + y, SANCTUM.z),
        q,
        new THREE.Vector3(r, r, 1),
      );
      rings.setMatrixAt(i, m);
    });
    rings.instanceMatrix.needsUpdate = true;
    rings.castShadow = true;
    scene.add(rings);

    // Amalaka disk and the golden kalash with its flag.
    const amalaka = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.2, 2.4, 0.7, 18)),
      stoneDarkMat,
    );
    amalaka.position.set(SANCTUM.x, sanctumTop + 0.7 + 16.9, SANCTUM.z);
    amalaka.castShadow = true;
    scene.add(amalaka);

    const kalashBase = new THREE.Mesh(track(new THREE.SphereGeometry(0.85, 12, 10)), goldMat);
    kalashBase.position.set(SANCTUM.x, sanctumTop + 18.2, SANCTUM.z);
    kalashBase.castShadow = true;
    scene.add(kalashBase);

    const kalashTip = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 1.8, 10)), goldMat);
    kalashTip.position.set(SANCTUM.x, sanctumTop + 19.5, SANCTUM.z);
    kalashTip.castShadow = true;
    scene.add(kalashTip);

    // Corner mini-shikharas on the sanctum roof.
    const miniGeo = track(new THREE.ConeGeometry(1.1, 2.6, 8));
    for (const [mx, mz] of [
      [-SANCTUM.w / 2 + 1, -SANCTUM.d / 2 + 1],
      [SANCTUM.w / 2 - 1, -SANCTUM.d / 2 + 1],
      [-SANCTUM.w / 2 + 1, SANCTUM.d / 2 - 1],
      [SANCTUM.w / 2 - 1, SANCTUM.d / 2 - 1],
    ] as [number, number][]) {
      const mini = new THREE.Mesh(miniGeo, shikharaMat);
      mini.position.set(SANCTUM.x + mx, sanctumTop + 1.9, SANCTUM.z + mz);
      mini.castShadow = true;
      scene.add(mini);
    }
  }

  /* --- temple flag on the kalash --- */

  const flag = new THREE.Mesh(track(new THREE.PlaneGeometry(4.6, 2.8, 14, 6)), flagMat);
  {
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, 5, 8)), goldMat);
    pole.position.set(SANCTUM.x, sanctumTop + 21.8, SANCTUM.z);
    scene.add(pole);
    flag.position.set(SANCTUM.x + 2.4, sanctumTop + 23.6, SANCTUM.z);
    flag.castShadow = true;
    scene.add(flag);
  }

  /* --- the idol: stylised, gold-adorned Ganesha --- */

  const idol = new THREE.Group();
  const IDOL_Y = jagatiTop;
  {
    // Silver throne.
    const throne1 = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 0.5, 3.2)), silverMat);
    throne1.position.set(0, IDOL_Y + 0.25, 0);
    idol.add(throne1);
    const throne2 = new THREE.Mesh(track(new THREE.BoxGeometry(3.8, 0.5, 2.6)), silverMat);
    throne2.position.set(0, IDOL_Y + 0.75, 0);
    idol.add(throne2);

    const seatY = IDOL_Y + 1.0;

    // Seated body — belly and chest.
    const belly = new THREE.Mesh(track(new THREE.SphereGeometry(1.05, 16, 12)), blackStoneMat);
    belly.scale.set(1.05, 0.95, 0.9);
    belly.position.set(0, seatY + 0.85, 0);
    idol.add(belly);
    const chest = new THREE.Mesh(track(new THREE.SphereGeometry(0.7, 14, 10)), blackStoneMat);
    chest.position.set(0, seatY + 1.75, 0);
    idol.add(chest);

    // Folded legs.
    const legGeo = track(new THREE.CylinderGeometry(0.32, 0.38, 1.9, 10));
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, blackStoneMat);
      leg.rotation.z = Math.PI / 2;
      leg.position.set(side * 0.55, seatY + 0.28, 0.75);
      idol.add(leg);
    }

    // Arms, with gold bracelets.
    const armGeo = track(new THREE.CylinderGeometry(0.2, 0.24, 1.1, 8));
    const bandGeo = track(new THREE.TorusGeometry(0.24, 0.07, 6, 12));
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(armGeo, blackStoneMat);
      arm.rotation.z = side * 0.7;
      arm.position.set(side * 0.95, seatY + 1.5, 0.25);
      idol.add(arm);
      const band = new THREE.Mesh(bandGeo, goldMat);
      band.rotation.z = side * 0.7;
      band.position.set(side * 1.25, seatY + 1.15, 0.3);
      idol.add(band);
    }

    // Head and ears.
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.72, 16, 12)), blackStoneMat);
    head.position.set(0, seatY + 2.6, 0);
    idol.add(head);
    const earGeo = track(new THREE.SphereGeometry(0.5, 10, 8));
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, blackStoneMat);
      ear.scale.set(0.75, 1.0, 0.28);
      ear.position.set(side * 0.85, seatY + 2.7, -0.1);
      idol.add(ear);
    }

    // The trunk, curling to the golden modak.
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, seatY + 2.35, 0.55),
      new THREE.Vector3(0.1, seatY + 1.9, 0.95),
      new THREE.Vector3(-0.15, seatY + 1.45, 1.05),
      new THREE.Vector3(-0.55, seatY + 1.25, 0.9),
    ]);
    const trunk = new THREE.Mesh(
      track(new THREE.TubeGeometry(trunkCurve, 16, 0.2, 8)),
      blackStoneMat,
    );
    idol.add(trunk);
    const modak = new THREE.Mesh(track(new THREE.SphereGeometry(0.3, 10, 8)), goldMat);
    modak.position.set(-0.62, seatY + 1.2, 0.92);
    idol.add(modak);

    // The mukut — the great gold crown — and necklace.
    const crownBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.62, 0.72, 0.4, 12)), goldMat);
    crownBase.position.set(0, seatY + 3.25, 0);
    idol.add(crownBase);
    const crownTip = new THREE.Mesh(track(new THREE.ConeGeometry(0.5, 0.9, 10)), goldMat);
    crownTip.position.set(0, seatY + 3.85, 0);
    idol.add(crownTip);
    const haar = new THREE.Mesh(track(new THREE.TorusGeometry(0.62, 0.09, 6, 16)), goldMat);
    haar.rotation.x = Math.PI / 2.4;
    haar.position.set(0, seatY + 1.7, 0.3);
    idol.add(haar);

    idol.traverse((obj) => {
      obj.castShadow = true;
    });
    idol.position.set(SANCTUM.x, 0, SANCTUM.z - 1);
    scene.add(idol);

    // Silver canopy over the throne (bake rotate into geometry — mesh scale/rot order trap).
    {
      const canopyGeo = track(new THREE.ConeGeometry(1, 1.2, 4));
      canopyGeo.rotateY(Math.PI / 4);
      canopyGeo.scale(2.2 * Math.SQRT2, 1, 2.2 * Math.SQRT2);
      canopyGeo.computeVertexNormals();
      const canopyCap = new THREE.Mesh(canopyGeo, silverMat);
      canopyCap.position.set(SANCTUM.x, jagatiTop + 5.6, SANCTUM.z - 1);
      canopyCap.castShadow = true;
      scene.add(canopyCap);
    }
    const canopyPoleGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 5, 6));
    for (const [px, pz] of [
      [-1.7, -1.9],
      [1.7, -1.9],
      [-1.7, 0.1],
      [1.7, 0.1],
    ] as [number, number][]) {
      const pole = new THREE.Mesh(canopyPoleGeo, silverMat);
      pole.position.set(SANCTUM.x + px, jagatiTop + 2.5, SANCTUM.z + pz);
      scene.add(pole);
    }
  }

  /* --- sanctum aarti light and flame --- */

  const aartiLight = new THREE.PointLight("#ffb45e", 40, 34, 1.6);
  aartiLight.position.set(SANCTUM.x, jagatiTop + 4.4, SANCTUM.z + 0.5);
  scene.add(aartiLight);

  const aartiFlame = new THREE.Sprite(flameMat);
  aartiFlame.scale.setScalar(1.6);
  aartiFlame.position.set(SANCTUM.x, jagatiTop + 2.1, SANCTUM.z + 1.2);
  scene.add(aartiFlame);

  /* --- mahadwar: the street gateway --- */

  {
    const gy = groundHeight(0, GATE.z);
    const pierW = 2.6;
    const pierH = GATE.h;

    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(
        track(new THREE.BoxGeometry(pierW, pierH, 3.4)),
        stoneMat,
      );
      pier.position.set(side * (GATE.opening / 2 + pierW / 2), gy + pierH / 2, GATE.z);
      pier.castShadow = true;
      pier.receiveShadow = true;
      scene.add(pier);
    }

    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATE.opening + pierW * 2, 2.2, 3.4)),
      stoneMat,
    );
    lintel.position.set(0, gy + pierH - 1.1, GATE.z);
    lintel.castShadow = true;
    scene.add(lintel);

    // Silver repoussé panel of Ganesha over the opening.
    const panel = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.6, 1.6, 0.25)),
      silverMat,
    );
    panel.position.set(0, gy + pierH - 2.4, GATE.z + 1.75);
    scene.add(panel);

    // Stepped cap, kalash and flag.
    for (let i = 0; i < 3; i++) {
      const cap = new THREE.Mesh(
        track(new THREE.BoxGeometry(GATE.opening + pierW * 2 - i * 1.8, 0.7, 3.4 - i * 0.7)),
        roofMat,
      );
      cap.position.set(0, gy + pierH + 0.35 + i * 0.7, GATE.z);
      cap.castShadow = true;
      scene.add(cap);
    }
    const gateKalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.55, 10, 8)), goldMat);
    gateKalash.position.set(0, gy + pierH + 2.6, GATE.z);
    gateKalash.castShadow = true;
    scene.add(gateKalash);

    const gateFlag = new THREE.Mesh(track(new THREE.PlaneGeometry(2.6, 1.6)), flagMat);
    gateFlag.position.set(0.9, gy + pierH + 3.9, GATE.z);
    gateFlag.castShadow = true;
    scene.add(gateFlag);
  }

  /* --- deepmalas: the twin lamp towers --- */

  const deepmalaFlames: THREE.Sprite[] = [];
  {
    const tierCount = 5;
    for (const tower of DEEPMALAS) {
      const ty = groundHeight(tower.x, tower.z);
      const shaft = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.9, 1.3, 8.5, 12)),
        stoneMat,
      );
      shaft.position.set(tower.x, ty + 4.25, tower.z);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      scene.add(shaft);

      const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(1.9, 2.2, 0.8, 12)), stoneDarkMat);
      foot.position.set(tower.x, ty + 0.4, tower.z);
      foot.castShadow = true;
      foot.receiveShadow = true;
      scene.add(foot);

      for (let t = 0; t < tierCount; t++) {
        const r = 1.6 - t * 0.16;
        const tierY = ty + 1.6 + t * 1.45;
        const tray = new THREE.Mesh(
          track(new THREE.CylinderGeometry(r, r * 0.82, 0.28, 14)),
          stoneDarkMat,
        );
        tray.position.set(tower.x, tierY, tower.z);
        tray.castShadow = true;
        scene.add(tray);

        const flamesHere = 8;
        for (let f = 0; f < flamesHere; f++) {
          const a = (f / flamesHere) * Math.PI * 2;
          const flame = new THREE.Sprite(flameMat);
          flame.scale.setScalar(0.9);
          flame.position.set(
            tower.x + Math.cos(a) * (r - 0.25),
            tierY + 0.35,
            tower.z + Math.sin(a) * (r - 0.25),
          );
          scene.add(flame);
          deepmalaFlames.push(flame);
        }
      }
    }
  }

  /* --- rangoli in the courtyard --- */

  {
    const ry = groundHeight(0, 25);
    const rangoli = new THREE.Mesh(
      track(new THREE.CircleGeometry(2.6, 36)),
      track(
        new THREE.MeshStandardMaterial({
          map: rangoliTexture(),
          transparent: true,
          roughness: 1,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      ),
    );
    rangoli.rotation.x = -Math.PI / 2;
    rangoli.position.set(0, ry + 0.03, 25);
    rangoli.receiveShadow = true;
    scene.add(rangoli);
  }

  /* --- queue canopy from the gate to the mandap steps --- */

  {
    const canopyGeo = track(new THREE.PlaneGeometry(7, 17, 8, 12));
    canopyGeo.rotateX(-Math.PI / 2);
    const cPos = canopyGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cPos.count; i++) {
      cPos.setY(i, Math.sin(cPos.getZ(i) * 0.8) * 0.12 + Math.sin(cPos.getX(i) * 1.3) * 0.08);
    }
    canopyGeo.computeVertexNormals();
    const canopy = new THREE.Mesh(canopyGeo, fabricMat);
    canopy.position.set(0, 4.3, 24.5);
    canopy.castShadow = true;
    scene.add(canopy);

    const poleGeo = track(new THREE.CylinderGeometry(0.09, 0.11, 4.3, 6));
    for (const [px, pz] of [
      [-3.3, 16.5],
      [3.3, 16.5],
      [-3.3, 24.5],
      [3.3, 24.5],
      [-3.3, 32.5],
      [3.3, 32.5],
    ] as [number, number][]) {
      const pole = new THREE.Mesh(poleGeo, brassMat);
      pole.position.set(px, groundHeight(px, pz) + 2.15, pz);
      pole.castShadow = true;
      scene.add(pole);
    }
  }

  /* --- flower stalls along the courtyard edges --- */

  {
    const stallBaseGeo = track(new THREE.BoxGeometry(2.2, 1.0, 1.4));
    const pileGeo = track(new THREE.SphereGeometry(0.34, 8, 6));
    const stalls: [number, number][] = [
      [-17, 20],
      [17, 20],
      [-17, 30],
      [17, 30],
    ];
    const rnd = mulberry32(97);
    stalls.forEach(([sx, sz], i) => {
      const sy = groundHeight(sx, sz);
      const baseStall = new THREE.Mesh(stallBaseGeo, teakMat);
      baseStall.position.set(sx, sy + 0.5, sz);
      baseStall.castShadow = true;
      scene.add(baseStall);
      const shadeGeo = track(new THREE.ConeGeometry(1, 1.0, 4));
      shadeGeo.rotateY(Math.PI / 4);
      shadeGeo.scale(1.8 * Math.SQRT2, 1, 1.8 * Math.SQRT2);
      shadeGeo.computeVertexNormals();
      const shade = new THREE.Mesh(shadeGeo, fabricMat);
      shade.position.set(sx, sy + 2.2, sz);
      shade.castShadow = true;
      scene.add(shade);
      for (let p = 0; p < 3; p++) {
        const pile = new THREE.Mesh(pileGeo, p === 1 ? goldMat : marigoldMat);
        pile.position.set(sx - 0.6 + p * 0.6 + (rnd() - 0.5) * 0.2, sy + 1.15, sz + (rnd() - 0.5) * 0.5);
        pile.castShadow = true;
        scene.add(pile);
      }
      void i;
    });
  }

  /* --- Mushak shrine near the mandap steps --- */

  {
    const my = groundHeight(-5.5, 17.5);
    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.9, 1.6)), stoneDarkMat);
    plinth.position.set(-5.5, my + 0.45, 17.5);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);
    const dome = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
      stoneMat,
    );
    dome.position.set(-5.5, my + 0.9, 17.5);
    dome.castShadow = true;
    scene.add(dome);
  }

  /* --- utsav: the pandal canopy over the courtyard --- */

  const pandalMat = track(
    new THREE.MeshStandardMaterial({
      color: "#d2691e",
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    }),
  );
  {
    const pandalGeo = track(new THREE.PlaneGeometry(46, 24, 20, 12));
    pandalGeo.rotateX(-Math.PI / 2);
    const pPos = pandalGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pPos.count; i++) {
      const x = pPos.getX(i);
      const z = pPos.getZ(i);
      pPos.setY(i, Math.sin(x * 0.35) * 0.5 + Math.cos(z * 0.4) * 0.4);
    }
    pandalGeo.computeVertexNormals();
    const pandal = new THREE.Mesh(pandalGeo, pandalMat);
    pandal.position.set(0, 10.6, 23);
    pandal.castShadow = true;
    scene.add(pandal);

    const poleGeo = track(new THREE.CylinderGeometry(0.12, 0.15, 10.6, 6));
    for (const [px, pz] of [
      [-22, 12],
      [22, 12],
      [-22, 34],
      [22, 34],
      [0, 12],
      [0, 34],
    ] as [number, number][]) {
      const pole = new THREE.Mesh(poleGeo, teakMat);
      pole.position.set(px, groundHeight(px, pz) + 5.3, pz);
      pole.castShadow = true;
      scene.add(pole);
    }
  }

  /* --- utsav: string lights on catenaries --- */

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
    const poleTop = (x: number, z: number) =>
      new THREE.Vector3(x, groundHeight(x, z) + 10.4, z);
    const spans: [THREE.Vector3, THREE.Vector3, number][] = [
      [poleTop(-22, 12), poleTop(22, 12), 2.4],
      [poleTop(-22, 34), poleTop(22, 34), 2.4],
      [poleTop(-22, 12), poleTop(-22, 34), 2.0],
      [poleTop(22, 12), poleTop(22, 34), 2.0],
      [poleTop(-22, 12), poleTop(22, 34), 3.2],
      [poleTop(22, 12), poleTop(-22, 34), 3.2],
      [poleTop(-22, 34), new THREE.Vector3(0, groundHeight(0, GATE.z) + GATE.h + 2.4, GATE.z), 1.4],
      [poleTop(22, 34), new THREE.Vector3(0, groundHeight(0, GATE.z) + GATE.h + 2.4, GATE.z), 1.4],
    ];
    const bulbColors = ["#ffd27a", "#ff9d5c", "#7fd67f", "#ff7a7a", "#7ab8ff"];
    const bulbPositions: number[] = [];
    const bulbCols: number[] = [];
    const rnd = mulberry32(2024);
    const c = new THREE.Color();
    for (const [a, b, sag] of spans) {
      const n = Math.max(8, Math.round(a.distanceTo(b) / 1.5));
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
    const stringLights = new THREE.Points(geo, stringLightMat);
    scene.add(stringLights);
  }

  /* --- marigold garlands across the mandap front --- */

  {
    const swags: [THREE.Vector3, THREE.Vector3, number][] = [];
    const swagTop = (x: number) => new THREE.Vector3(x, mandapRoofBase - 0.3, 14.8);
    for (const [a, b] of [
      [-10.5, -4.5],
      [-4.5, 0],
      [0, 4.5],
      [4.5, 10.5],
    ] as [number, number][]) {
      swags.push([swagTop(a), swagTop(b), 0.9]);
    }
    swags.push([
      new THREE.Vector3(-GATE.opening / 2 - 1.3, groundHeight(0, GATE.z) + GATE.h - 1.6, GATE.z + 1.6),
      new THREE.Vector3(GATE.opening / 2 + 1.3, groundHeight(0, GATE.z) + GATE.h - 1.6, GATE.z + 1.6),
      1.1,
    ]);

    let total = 0;
    const counts: number[] = [];
    for (const [a, b] of swags) {
      const n = Math.max(6, Math.round(a.distanceTo(b) / 0.55));
      counts.push(n);
      total += n;
    }
    const garland = new THREE.InstancedMesh(
      track(new THREE.SphereGeometry(0.3, 8, 6)),
      marigoldMat,
      total,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let gi = 0;
    swags.forEach(([a, b, sag], si) => {
      const n = counts[si];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const p = a.clone().lerp(b, t);
        p.y -= sag * 4 * t * (1 - t);
        const s = 0.85 + Math.sin(t * Math.PI) * 0.35;
        m.compose(p, q, new THREE.Vector3(s, s, s));
        garland.setMatrixAt(gi++, m);
      }
    });
    garland.instanceMatrix.needsUpdate = true;
    garland.castShadow = true;
    scene.add(garland);
  }

  /* --- trees outside the precinct --- */

  {
    const rnd = mulberry32(777);
    const spots: { x: number; z: number; s: number }[] = [];
    let guard = 0;
    while (spots.length < 24 && guard < 2000) {
      guard++;
      const x = (rnd() - 0.5) * 100;
      const z = (rnd() - 0.5) * 100;
      if (Math.abs(x) < 32 && z > -16 && z < 44) continue;
      if (Math.max(Math.abs(x), Math.abs(z)) > 48) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
      spots.push({ x, z, s: 0.85 + rnd() * 0.6 });
    }
    const trunkGeo = track(new THREE.CylinderGeometry(0.28, 0.44, 3.4, 6));
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
      m.compose(new THREE.Vector3(s.x, y + 1.7 * s.s, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (3 - k * 0.7) * s.s;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            s.x + (rnd() - 0.5) * 1.4,
            y + (4 + k * 1.4) * s.s,
            s.z + (rnd() - 0.5) * 1.4,
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

  /* --- incense smoke --- */

  const SMOKE = 70;
  const smokeGeo = track(new THREE.BufferGeometry());
  const smokeSeed: number[] = [];
  {
    const arr = new Float32Array(SMOKE * 3);
    const rnd = mulberry32(51);
    for (let i = 0; i < SMOKE; i++) {
      const nearSanctum = i % 3 !== 0;
      arr[i * 3] = nearSanctum ? (rnd() - 0.5) * 4 : (rnd() - 0.5) * 30;
      arr[i * 3 + 1] = 2 + rnd() * 6;
      arr[i * 3 + 2] = nearSanctum ? 2 + rnd() * 4 : 18 + rnd() * 16;
      smokeSeed.push(rnd() * 100);
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const smokeMat = track(
    new THREE.PointsMaterial({
      size: 1.6,
      map: track(radialSprite("rgba(220,215,225,0.5)", "rgba(200,195,210,0.18)")),
      transparent: true,
      depthWrite: false,
      opacity: 0.16,
    }),
  );
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  scene.add(smoke);

  /* --- hotspot markers --- */

  const MARKER_BASES: Record<FeatureId, THREE.Vector3> = {
    mahadwar: new THREE.Vector3(0, groundHeight(0, GATE.z) + GATE.h + 1.5, GATE.z),
    "ganesh-idol": new THREE.Vector3(0, sanctumTop + 5.5, SANCTUM.z + 2.5),
    "sabha-mandap": new THREE.Vector3(0, mandapRoofBase + 4.5, MANDAP.z),
    deepmalas: new THREE.Vector3(DEEPMALAS[0].x, groundHeight(DEEPMALAS[0].x, DEEPMALAS[0].z) + 9.5, DEEPMALAS[0].z),
    courtyard: new THREE.Vector3(0, groundHeight(0, 24) + 0.3, 24),
    ganeshotsav: new THREE.Vector3(16, groundHeight(16, 24) + 0.3, 24),
  };

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
    const base = MARKER_BASES[id];
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 26, 200);
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
  const introFrom = new THREE.Vector3(0, 10, 0);
  const flagBaseX: number[] = [];
  {
    const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) flagBaseX.push(attr.getX(i));
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
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    /* lamps: mandap deepams, deepmala tiers, the aarti flame */
    const lampLevel = clamp(cur.lantern + cur.fest * 0.25, 0, 1.15);
    flameMat.opacity = lampLevel * 0.85;
    for (let i = 0; i < mandapFlames.length; i++) {
      const f = mandapFlames[i];
      f.scale.setScalar(1.1 * (0.85 + Math.sin(elapsed * 7 + i * 1.7) * 0.18 * motion + 0.18));
    }
    for (let i = 0; i < deepmalaFlames.length; i++) {
      const f = deepmalaFlames[i];
      f.scale.setScalar(0.9 * (0.8 + Math.sin(elapsed * 6.2 + i * 2.3) * 0.22 * motion + 0.2));
    }
    aartiLight.intensity = (26 + cur.fest * 14) * (0.4 + lampLevel * 0.8) *
      (1 + Math.sin(elapsed * 5.3) * 0.08 * motion);
    aartiFlame.scale.setScalar(1.6 * (0.85 + Math.sin(elapsed * 8.1) * 0.2 * motion + 0.15));

    /* gold answers the lamplight */
    goldMat.emissiveIntensity = 0.18 + lampLevel * 0.35;

    /* utsav layer */
    // Keep the pandal translucent so mandap + shikhara still read during utsav.
    pandalMat.opacity = cur.fest * 0.52;
    pandalMat.visible = cur.fest > 0.02;
    stringLightMat.opacity = cur.fest * (0.2 + lampLevel * 0.8);
    marigoldMat.opacity = 0.6 + cur.fest * 0.4;

    /* flag */
    if (motion) {
      const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const x = flagBaseX[i];
        const u = (x + 2.3) / 4.6;
        attr.setZ(i, Math.sin(u * 6 - elapsed * 5) * 0.4 * u);
      }
      attr.needsUpdate = true;
    }

    /* incense smoke */
    smokeMat.opacity = 0.1 + lampLevel * 0.08;
    if (motion) {
      const attr = smokeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SMOKE; i++) {
        const s = smokeSeed[i];
        const y = 2 + ((elapsed * 0.5 + s) % 9);
        attr.setY(i, y);
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.4 + s) * dt * 0.5);
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
    setMode(m) {
      festTarget = m === "utsav" ? 1 : 0;
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