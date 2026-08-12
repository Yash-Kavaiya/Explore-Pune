/**
 * A hand-built, procedural 3D model of the Pune-Okayama Friendship Garden.
 *
 * Everything here is plain three.js with zero external assets — geometry,
 * colours and shaders are generated at runtime, so the scene ships as code and
 * works offline. React never touches the render loop: `createGardenWorld`
 * returns an imperative handle, and the component in `garden-scene.tsx` only
 * pushes prop changes into it.
 */

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type FeatureId =
  | "waterfall"
  | "taiko-bridge"
  | "lantern-walk"
  | "tea-pavilion"
  | "koi-pond"
  | "bamboo-grove";

export type TimeOfDay = "dawn" | "golden" | "dusk";
export type Season = "dry" | "monsoon";

export type GardenWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type GardenWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

/** True when the browser can actually give us a WebGL context. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

/** Marker order — drives the numbered pins and the legend in the UI. */
export const FEATURE_ORDER: FeatureId[] = [
  "waterfall",
  "taiko-bridge",
  "lantern-walk",
  "tea-pavilion",
  "koi-pond",
  "bamboo-grove",
];

/* ------------------------------------------------------------------ */
/* Palettes — one per time of day                                      */
/* ------------------------------------------------------------------ */

type Palette = {
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  ambient: number;
  fog: string;
  waterDeep: string;
  waterShallow: string;
  /** 0 → lanterns unlit, 1 → fully glowing. */
  lantern: number;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
};

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#13254c",
    skyBottom: "#f3c6a2",
    sun: "#ffd8b0",
    sunIntensity: 2.0,
    hemiSky: "#9dc0ee",
    hemiGround: "#4c4130",
    ambient: 0.72,
    fog: "#e6cbb2",
    waterDeep: "#1d4a5c",
    waterShallow: "#6aa5b4",
    lantern: 0.12,
    sunAzimuth: 2.35,
    sunElevation: 0.32,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#3d2140",
    skyBottom: "#ffcf92",
    sun: "#ffc477",
    sunIntensity: 3.0,
    hemiSky: "#bcd9f7",
    hemiGround: "#5d4a2e",
    ambient: 0.78,
    fog: "#f0d3a8",
    waterDeep: "#17544f",
    waterShallow: "#8ec6a8",
    lantern: 0.22,
    sunAzimuth: -0.65,
    sunElevation: 0.38,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#090e2a",
    skyBottom: "#dd6f5f",
    sun: "#ff9b68",
    sunIntensity: 1.0,
    hemiSky: "#3a4f86",
    hemiGround: "#241c18",
    ambient: 0.46,
    fog: "#3f3450",
    waterDeep: "#0e1c31",
    waterShallow: "#2f5573",
    lantern: 1,
    sunAzimuth: -1.15,
    sunElevation: 0.09,
    exposure: 1.12,
  },
};

/* ------------------------------------------------------------------ */
/* Small maths helpers                                                 */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent easing towards a target. */
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG, so the garden looks identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Garden layout — the single source of truth for where things sit     */
/* ------------------------------------------------------------------ */

/** Outline of the pond, in world XZ. */
function buildPondOutline(): THREE.Vector2[] {
  const shape = new THREE.Shape();
  shape.moveTo(-16, -10);
  shape.bezierCurveTo(-23, -3, -21, 8, -12, 13);
  shape.bezierCurveTo(-4, 18, 8, 17.5, 14.5, 11);
  shape.bezierCurveTo(21, 4.5, 18, -6, 10, -11.5);
  shape.bezierCurveTo(2, -17, -10, -17, -16, -10);
  return shape.getPoints(24);
}

const POND = buildPondOutline();

/** Planted islets inside the pond: x, z, radius. */
const ISLANDS: [number, number, number][] = [
  [3, 5, 4.2],
  [-8.5, -2.5, 3],
];

/** Main circuit path, as XZ control points. */
const PATH_LOOP: [number, number][] = [
  [0, 38],
  [-14, 31],
  [-26, 19],
  [-29, 3],
  [-23, -12],
  [-9, -23],
  [9, -23],
  [23, -15],
  [31, 0],
  [28, 17],
  [15, 29],
];

const PATH_SPUR_WEST: [number, number][] = [
  [-29, 3],
  [-25, 5],
  [-20.5, 6.4],
];

const PATH_SPUR_EAST: [number, number][] = [
  [-2, 11.4],
  [4, 15],
  [9, 21],
  [15, 29],
];

/** Arched-bridge span: west bank → islet bank. */
const BRIDGE_A = new THREE.Vector2(-20.5, 6.4);
const BRIDGE_B = new THREE.Vector2(-2, 11.4);

/** Where each stone lantern stands. */
const LANTERNS: [number, number][] = [
  [0, 33],
  [-19, 25],
  [-28.5, 8],
  [-18, -18],
  [4, -22.5],
  [14, -20],
  [26.5, -8],
  [30, 6],
  [20, 22],
];

type Anchor = {
  target: THREE.Vector3;
  /** Direction the camera sits in, relative to the target. */
  dir: THREE.Vector3;
  distance: number;
};

/**
 * Camera framing per feature. Directions are deliberately high (dir.y ≈ 0.6,
 * about 37° above the horizon) and chosen to approach across open ground —
 * a low, tree-level approach ends up looking through the planting.
 */
const ANCHORS: Record<FeatureId, Anchor> = {
  waterfall: {
    target: new THREE.Vector3(-2, 3, -17),
    dir: new THREE.Vector3(0.3, 0.62, 0.72),
    distance: 42,
  },
  "taiko-bridge": {
    target: new THREE.Vector3(-11, 1.5, 9),
    dir: new THREE.Vector3(0.6, 0.6, 0.53),
    distance: 40,
  },
  "lantern-walk": {
    target: new THREE.Vector3(9, 1.6, -22),
    dir: new THREE.Vector3(0.32, 0.62, -0.72),
    distance: 34,
  },
  "tea-pavilion": {
    target: new THREE.Vector3(26, 3.2, 7),
    dir: new THREE.Vector3(0.8, 0.58, 0.15),
    distance: 40,
  },
  "koi-pond": {
    target: new THREE.Vector3(-1, 0.5, 1),
    dir: new THREE.Vector3(0.3, 0.78, 0.55),
    distance: 62,
  },
  "bamboo-grove": {
    target: new THREE.Vector3(-27, 3, 24),
    dir: new THREE.Vector3(0.42, 0.6, 0.68),
    distance: 40,
  },
};

const HOME = {
  target: new THREE.Vector3(0, -4, 0),
  radius: 100,
  phi: 1.02,
  theta: 0.62,
};

/* ------------------------------------------------------------------ */
/* Pond + terrain sampling                                             */
/* ------------------------------------------------------------------ */

function pointInPond(x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = POND.length - 1; i < POND.length; j = i++) {
    const xi = POND[i].x;
    const zi = POND[i].y;
    const xj = POND[j].x;
    const zj = POND[j].y;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToPondEdge(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0, j = POND.length - 1; i < POND.length; j = i++) {
    const ax = POND[j].x;
    const az = POND[j].y;
    const dx = POND[i].x - ax;
    const dz = POND[i].y - az;
    const len = dx * dx + dz * dz;
    const t = len === 0 ? 0 : clamp(((x - ax) * dx + (z - az) * dz) / len, 0, 1);
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return best;
}

/** Terrain height at a world XZ. y = 0 is the water line. */
function terrainHeight(x: number, z: number): number {
  let h =
    0.85 * Math.sin(x * 0.045) * Math.cos(z * 0.05) +
    0.55 * Math.sin((x + z) * 0.031) +
    0.3 * Math.cos(x * 0.09 - z * 0.07);

  // Rockery ridge in the north — the cascade's source.
  h += 6.4 * Math.exp(-((x + 2) ** 2 / 210 + (z + 23) ** 2 / 95));
  // Mound the pavilion sits on.
  h += 2.6 * Math.exp(-((x - 26) ** 2 / 80 + (z - 7) ** 2 / 80));
  // Gentle rise behind the bamboo.
  h += 2.0 * Math.exp(-((x + 28) ** 2 / 150 + (z - 25) ** 2 / 150));

  const edge = distanceToPondEdge(x, z);
  if (pointInPond(x, z)) {
    h = THREE.MathUtils.lerp(h, -2.9, smoothstep(0, 6, edge));
    for (const [ix, iz, r] of ISLANDS) {
      h += 4.6 * smoothstep(r, r * 0.25, Math.hypot(x - ix, z - iz));
    }
  } else {
    // Soften the bank so the shoreline is not a knife edge.
    h = THREE.MathUtils.lerp(h - 0.9, h, smoothstep(0, 4, edge));
  }

  // Plateau falloff — the diorama is an object with a cut edge.
  const corner = Math.hypot(Math.max(0, Math.abs(x) - 32), Math.max(0, Math.abs(z) - 32));
  const outside = Math.max(Math.max(Math.abs(x), Math.abs(z)) - 42, corner - 10);
  if (outside > -1) h -= 16 * smoothstep(-1, 2.5, outside);

  return h;
}

/** Height clamped to walkable ground — used to lay paths and props. */
const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), 0.05);

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const SKY_VERT = [
  "varying vec3 vPos;",
  "void main() {",
  "  vPos = position;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}",
].join("\n");

const SKY_FRAG = [
  "uniform vec3 topColor;",
  "uniform vec3 bottomColor;",
  "uniform vec3 sunDir;",
  "uniform vec3 sunColor;",
  "varying vec3 vPos;",
  "void main() {",
  "  vec3 dir = normalize(vPos);",
  "  float h = clamp(dir.y * 0.95 + 0.66, 0.0, 1.0);",
  "  vec3 col = mix(bottomColor, topColor, pow(h, 1.25));",
  "  float d = clamp(dot(dir, normalize(sunDir)), 0.0, 1.0);",
  // A tight disc plus a small halo — anything broader washes the whole sky.
  "  col += sunColor * (pow(d, 320.0) * 1.4 + pow(d, 22.0) * 0.16);",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");

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
  "",
  "  vec3 view = normalize(uCamera - vWorld);",
  "  float fres = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.2);",
  "  vec3 base = mix(uDeep, uShallow, clamp(h * 0.35 + 0.5, 0.0, 1.0));",
  "  vec3 col = mix(base, uSky, fres * 0.5);",
  "",
  "  vec3 halfDir = normalize(normalize(uSunDir) + view);",
  "  col += uSunColor * pow(clamp(dot(normal, halfDir), 0.0, 1.0), 220.0) * 1.7;",
  "",
  "  float sheen = smoothstep(0.55, 1.0, sin(dot(p, normalize(vec2(0.6, 1.0))) * 0.16 - uTime * 0.22));",
  "  col += uSunColor * sheen * 0.05;",
  "",
  "  gl_FragColor = vec4(col, 0.9);",
  "}",
].join("\n");

const FALL_VERT = [
  "varying vec2 vUv;",
  "void main() {",
  "  vUv = uv;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}",
].join("\n");

const FALL_FRAG = [
  "uniform float uTime;",
  "uniform vec3 uColor;",
  "uniform float uFlow;",
  "varying vec2 vUv;",
  "",
  "float hash(vec2 p) {",
  "  return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453);",
  "}",
  "",
  "void main() {",
  "  float streak = 0.0;",
  "  for (int i = 0; i < 3; i++) {",
  "    float fi = float(i);",
  "    float scale = 12.0 + fi * 9.0;",
  "    float col = floor(vUv.x * scale);",
  "    float off = hash(vec2(col, fi));",
  "    float v = fract(vUv.y * (1.2 + off * 0.6) - uTime * (1.4 + fi * 0.7) * uFlow + off);",
  "    streak += smoothstep(0.72, 1.0, v) * (0.4 - fi * 0.1);",
  "  }",
  "  float body = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));",
  "  float edges = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));",
  "  float a = clamp((0.4 + streak) * body * edges, 0.0, 1.0);",
  "  gl_FragColor = vec4(uColor + streak * 0.35, a * 0.95);",
  "}",
].join("\n");

/* ------------------------------------------------------------------ */
/* Generated textures (nothing is ever fetched)                        */
/* ------------------------------------------------------------------ */

function radialSprite(inner: string, mid: string, size = 128): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.42, mid);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function markerSprite(label: string, active: boolean): THREE.Texture {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 44, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#d0602f" : "rgba(255,251,242,0.95)";
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = active ? "rgba(255,238,214,0.95)" : "rgba(74,50,33,0.5)";
    ctx.stroke();
    ctx.fillStyle = active ? "#fff6ea" : "#4a3221";
    ctx.font = "700 46px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, size / 2, size / 2 + 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

/** Flat ribbon following a curve — used for the gravel paths. */
function ribbonGeometry(points: [number, number][], width: number, closed: boolean, lift: number) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    closed,
    "catmullrom",
    0.5,
  );
  const steps = Math.max(48, Math.round(curve.getLength() / 1.4));
  const position: number[] = [];
  const index: number[] = [];
  const half = width / 2;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const nx = -tangent.z;
    const nz = tangent.x;
    const len = Math.hypot(nx, nz) || 1;
    const ox = (nx / len) * half;
    const oz = (nz / len) * half;
    position.push(p.x + ox, groundHeight(p.x + ox, p.z + oz) + lift, p.z + oz);
    position.push(p.x - ox, groundHeight(p.x - ox, p.z - oz) + lift, p.z - oz);
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Distance from an XZ point to the nearest path centreline. */
function makePathDistance() {
  const samples: THREE.Vector2[] = [];
  const push = (points: [number, number][], closed: boolean, steps: number) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      closed,
      "catmullrom",
      0.5,
    );
    for (let i = 0; i <= steps; i++) {
      const p = curve.getPoint(i / steps);
      samples.push(new THREE.Vector2(p.x, p.z));
    }
  };
  push(PATH_LOOP, true, 150);
  push(PATH_SPUR_WEST, false, 20);
  push(PATH_SPUR_EAST, false, 40);

  return (x: number, z: number) => {
    let best = Infinity;
    for (const s of samples) best = Math.min(best, Math.hypot(s.x - x, s.y - z));
    return best;
  };
}

/** A stone lantern (tōrō): base, shaft, fire box, roof, finial. */
function buildLantern(materials: {
  stone: THREE.Material;
  fire: THREE.MeshStandardMaterial;
}): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(0.62, 0.78, 0.34, 8), materials.stone, 0.17);
  add(new THREE.CylinderGeometry(0.24, 0.3, 1.15, 8), materials.stone, 0.92);
  add(new THREE.CylinderGeometry(0.56, 0.44, 0.16, 8), materials.stone, 1.57);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 6), materials.fire, 1.95);
  const roof = add(new THREE.ConeGeometry(0.86, 0.46, 6), materials.stone, 2.47);
  roof.rotation.y = Math.PI / 6;
  add(new THREE.SphereGeometry(0.14, 8, 6), materials.stone, 2.76);
  return g;
}

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createGardenWorld(
  container: HTMLElement,
  options: GardenWorldOptions,
): GardenWorld {
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
    600,
  );

  const fog = new THREE.Fog("#e6cbb2", 95, 300);
  scene.fog = fog;

  /* --- live palette state (lerped every frame) --- */

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
    /** 0 = dry season, 1 = monsoon. */
    wet: 0,
  };

  const sunDir = new THREE.Vector3();
  const updateSunDir = () => {
    const ce = Math.cos(cur.elevation * Math.PI * 0.5);
    sunDir
      .set(Math.cos(cur.azimuth) * ce, Math.sin(cur.elevation * Math.PI * 0.5), Math.sin(cur.azimuth) * ce)
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
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(320, 32, 20)), skyMat);
  scene.add(sky);

  /* --- lights --- */

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 320;
  sun.shadow.camera.left = -62;
  sun.shadow.camera.right = 62;
  sun.shadow.camera.top = 62;
  sun.shadow.camera.bottom = -62;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.045;
  scene.add(sun);
  scene.add(sun.target);

  const bounce = new THREE.DirectionalLight("#ffd9b8", 0.35);
  bounce.position.set(-40, 26, -30);
  scene.add(bounce);

  /* --- terrain --- */

  const SIZE = 96;
  const SEG = 110;
  const groundGeo = track(new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG));
  groundGeo.rotateX(-Math.PI / 2);

  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  const pathDistance = makePathDistance();
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  groundGeo.computeVertexNormals();

  const normals = groundGeo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color("#6f9a4e");
  const grassDark = new THREE.Color("#4a7038");
  const bed = new THREE.Color("#3a4a34");
  const rock = new THREE.Color("#8e8676");
  const sand = new THREE.Color("#cbbc98");
  const tmp = new THREE.Color();
  const rndColor = mulberry32(7);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const slope = 1 - clamp(normals.getY(i), 0, 1);

    if (y < -0.1 && pointInPond(x, z)) {
      tmp.copy(bed).lerp(rock, clamp(slope * 1.4, 0, 0.5));
    } else {
      tmp.copy(grassDark).lerp(grass, smoothstep(-0.5, 3.5, y) * 0.85 + rndColor() * 0.15);
      // Sandy shoreline and gravel where the ground steepens.
      tmp.lerp(sand, smoothstep(1.6, 0.1, distanceToPondEdge(x, z)) * 0.55);
      tmp.lerp(rock, smoothstep(0.25, 0.62, slope));
      tmp.lerp(sand, smoothstep(2.6, 1.1, pathDistance(x, z)) * 0.35);
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

  // Earth block beneath the plateau, so the diorama reads as an object.
  const baseMat = track(new THREE.MeshStandardMaterial({ color: "#6d5741", roughness: 1 }));
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(84, 16, 84)), baseMat);
  base.position.y = -9.5;
  scene.add(base);

  /* --- water --- */

  const pondShape = new THREE.Shape(POND);
  const waterGeo = track(new THREE.ShapeGeometry(pondShape, 24));
  waterGeo.rotateX(-Math.PI / 2);
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
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.12;
  water.renderOrder = 2;
  scene.add(water);

  /* --- paths --- */

  const pathMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e6d8b4",
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  for (const [pts, closed, width] of [
    [PATH_LOOP, true, 3.1],
    [PATH_SPUR_WEST, false, 2.4],
    [PATH_SPUR_EAST, false, 2.4],
  ] as [[number, number][], boolean, number][]) {
    const mesh = new THREE.Mesh(track(ribbonGeometry(pts, width, closed, 0.06)), pathMat);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  /* --- shared prop materials --- */

  const stoneMat = track(new THREE.MeshStandardMaterial({ color: "#9c968a", roughness: 0.92 }));
  const darkStoneMat = track(new THREE.MeshStandardMaterial({ color: "#6d6a63", roughness: 0.95 }));
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#b0532c", roughness: 0.72 }));
  const woodDarkMat = track(new THREE.MeshStandardMaterial({ color: "#7d3a1e", roughness: 0.8 }));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#5b4230", roughness: 0.95 }));
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#3f4348", roughness: 0.85 }));
  const fireMat = track(
    new THREE.MeshStandardMaterial({
      color: "#f6e2bd",
      emissive: new THREE.Color("#ffb45c"),
      emissiveIntensity: 0.4,
      roughness: 0.6,
    }),
  );

  /* --- arched bridge (taiko-bashi) --- */

  const bridge = new THREE.Group();
  {
    const span = BRIDGE_A.distanceTo(BRIDGE_B);
    const mid = BRIDGE_A.clone().add(BRIDGE_B).multiplyScalar(0.5);
    const angle = Math.atan2(BRIDGE_B.y - BRIDGE_A.y, BRIDGE_B.x - BRIDGE_A.x);
    const rise = 3.4;
    const deckGeo = track(new THREE.BoxGeometry(span / 22, 0.26, 3));
    const railGeo = track(new THREE.BoxGeometry(span / 22, 0.24, 0.18));
    const postGeo = track(new THREE.CylinderGeometry(0.13, 0.13, 1.15, 6));

    for (let i = 0; i < 22; i++) {
      const t = (i + 0.5) / 22;
      const u = t * 2 - 1;
      const x = THREE.MathUtils.lerp(-span / 2, span / 2, t);
      const y = 0.9 + rise * (1 - u * u);
      const slope = Math.atan2(-2 * rise * u * (2 / span), 1);

      const plank = new THREE.Mesh(deckGeo, i % 2 === 0 ? woodMat : woodDarkMat);
      plank.position.set(x, y, 0);
      plank.rotation.z = slope;
      plank.castShadow = true;
      bridge.add(plank);

      for (const side of [-1.42, 1.42]) {
        const rail = new THREE.Mesh(railGeo, woodDarkMat);
        rail.position.set(x, y + 1.05, side);
        rail.rotation.z = slope;
        bridge.add(rail);
      }
      if (i % 5 === 2) {
        for (const side of [-1.42, 1.42]) {
          const post = new THREE.Mesh(postGeo, woodDarkMat);
          post.position.set(x, y + 0.5, side);
          post.castShadow = true;
          bridge.add(post);
        }
      }
    }
    // Stone footings on both banks (bridge-local space: x runs along the span).
    const footingGeo = track(new THREE.BoxGeometry(3, 3.2, 4.2));
    for (const side of [-1, 1]) {
      const footing = new THREE.Mesh(footingGeo, stoneMat);
      footing.position.set((side * span) / 2, 0.5, 0);
      footing.castShadow = true;
      footing.receiveShadow = true;
      bridge.add(footing);
    }
    bridge.position.set(mid.x, 0, mid.y);
    bridge.rotation.y = -angle;
    scene.add(bridge);
  }

  /* --- stepping stones across the eastern shallows --- */

  {
    const slab = track(new THREE.CylinderGeometry(0.95, 1.05, 0.34, 7));
    const rnd = mulberry32(19);
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = THREE.MathUtils.lerp(9, 17.5, t) + (rnd() - 0.5) * 0.8;
      const z = THREE.MathUtils.lerp(-2, 6, t) + (rnd() - 0.5) * 0.8;
      const m = new THREE.Mesh(slab, darkStoneMat);
      m.position.set(x, 0.26, z);
      m.rotation.y = rnd() * Math.PI;
      m.castShadow = true;
      scene.add(m);
    }
  }

  /* --- the cascade --- */

  const fallMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#cfe6ee") },
        uFlow: { value: 1 },
      },
      vertexShader: FALL_VERT,
      fragmentShader: FALL_FRAG,
    }),
  );
  const waterfall = new THREE.Group();
  {
    const sheet = new THREE.Mesh(track(new THREE.PlaneGeometry(5.4, 8.2, 1, 12)), fallMat);
    const sheetPos = sheet.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sheetPos.count; i++) {
      const v = sheetPos.getY(i) / 8.2 + 0.5;
      sheetPos.setZ(i, Math.pow(1 - v, 2.1) * 2.6);
    }
    sheet.geometry.computeVertexNormals();
    sheet.position.set(-2, 4.4, -17.4);
    sheet.renderOrder = 3;
    waterfall.add(sheet);

    // Splash pool ring where it lands.
    const ring = new THREE.Mesh(
      track(new THREE.RingGeometry(0.6, 3.4, 32)),
      track(
        new THREE.MeshBasicMaterial({
          color: "#dff0f5",
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-2, 0.2, -14.4);
    ring.renderOrder = 3;
    waterfall.add(ring);
    scene.add(waterfall);
  }

  // Spray particles at the foot of the fall.
  const sprayCount = 90;
  const sprayGeo = track(new THREE.BufferGeometry());
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayVel: number[] = [];
  const sprayRnd = mulberry32(33);
  for (let i = 0; i < sprayCount; i++) {
    sprayPos[i * 3] = -2 + (sprayRnd() - 0.5) * 5;
    sprayPos[i * 3 + 1] = sprayRnd() * 3;
    sprayPos[i * 3 + 2] = -14.6 + (sprayRnd() - 0.5) * 3;
    sprayVel.push(1 + sprayRnd() * 2.4);
  }
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = track(
    new THREE.PointsMaterial({
      size: 0.6,
      map: track(radialSprite("rgba(255,255,255,0.95)", "rgba(220,240,250,0.5)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
    }),
  );
  const spray = new THREE.Points(sprayGeo, sprayMat);
  scene.add(spray);

  /* --- rockeries --- */

  {
    const rockGeo = track(new THREE.IcosahedronGeometry(1, 0));
    const rnd = mulberry32(101);
    const clusters: [number, number, number, number][] = [
      [-2, -18, 9, 16],
      [-13, -12, 5, 8],
      [8, -13, 4, 7],
      [16, 8, 4, 6],
      [-20, 2, 4, 6],
      [3, 5, 3.4, 5],
      [-8.5, -2.5, 2.6, 4],
    ];
    let total = 0;
    for (const c of clusters) total += c[3];
    const rocks = new THREE.InstancedMesh(rockGeo, stoneMat, total);
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let index = 0;
    for (const [cx, cz, spread, count] of clusters) {
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * spread;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        const s = 0.6 + rnd() * 1.5;
        e.set(rnd() * 0.6, rnd() * Math.PI * 2, rnd() * 0.6);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(x, terrainHeight(x, z) + s * 0.35, z),
          q,
          new THREE.Vector3(s, s * (0.6 + rnd() * 0.5), s),
        );
        rocks.setMatrixAt(index++, m);
      }
    }
    rocks.instanceMatrix.needsUpdate = true;
    scene.add(rocks);
  }

  /* --- planting: pines, blossom, bamboo --- */

  const canopyGeoms = {
    pine: track(new THREE.IcosahedronGeometry(1, 1)),
    blossom: track(new THREE.IcosahedronGeometry(1, 1)),
  };
  const pineMat = track(new THREE.MeshStandardMaterial({ color: "#3d6b45", roughness: 0.95, flatShading: true }));
  const leafMat = track(new THREE.MeshStandardMaterial({ color: "#67923f", roughness: 0.95, flatShading: true }));
  const blossomMat = track(new THREE.MeshStandardMaterial({ color: "#e8a6bb", roughness: 0.9, flatShading: true }));

  type TreeSpot = { x: number; z: number; kind: "pine" | "leaf" | "blossom"; scale: number };
  const treeSpots: TreeSpot[] = [];
  {
    const rnd = mulberry32(2024);
    let guard = 0;
    while (treeSpots.length < 74 && guard < 4000) {
      guard++;
      const x = (rnd() - 0.5) * 84;
      const z = (rnd() - 0.5) * 84;
      if (Math.hypot(Math.max(0, Math.abs(x) - 30), Math.max(0, Math.abs(z) - 30)) > 12) continue;
      if (Math.max(Math.abs(x), Math.abs(z)) > 41) continue;
      const onIsland = ISLANDS.some(([ix, iz, r]) => Math.hypot(x - ix, z - iz) < r * 0.6);
      if (pointInPond(x, z) && !onIsland) continue;
      if (!onIsland && distanceToPondEdge(x, z) < 1.4) continue;
      if (pathDistance(x, z) < 2.6) continue;
      if (Math.hypot(x - 26, z - 7) < 6) continue; // pavilion clearing
      if (x < -18 && z > 14) continue; // reserved for bamboo
      if (treeSpots.some((t) => Math.hypot(t.x - x, t.z - z) < 3.4)) continue;
      const roll = rnd();
      treeSpots.push({
        x,
        z,
        kind: roll < 0.42 ? "pine" : roll < 0.78 ? "leaf" : "blossom",
        scale: 0.85 + rnd() * 0.75,
      });
    }

    const trunkGeo = track(new THREE.CylinderGeometry(0.16, 0.28, 2.4, 6));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
    trunks.castShadow = true;
    const byKind: Record<string, TreeSpot[]> = { pine: [], leaf: [], blossom: [] };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const rot = new THREE.Euler();

    treeSpots.forEach((t, i) => {
      const y = groundHeight(t.x, t.z);
      rot.set(0, rnd() * Math.PI, 0);
      q.setFromEuler(rot);
      m.compose(
        new THREE.Vector3(t.x, y + 1.2 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      byKind[t.kind].push(t);
    });
    trunks.instanceMatrix.needsUpdate = true;
    scene.add(trunks);

    // Canopies: pines get three flattened tiers, everything else a crown.
    const canopy = new THREE.InstancedMesh(canopyGeoms.pine, pineMat, byKind.pine.length * 3);
    canopy.castShadow = true;
    let ci = 0;
    for (const t of byKind.pine) {
      const y = groundHeight(t.x, t.z);
      for (let tier = 0; tier < 3; tier++) {
        const s = (1.9 - tier * 0.45) * t.scale;
        rot.set(0, rnd() * Math.PI, 0);
        q.setFromEuler(rot);
        m.compose(
          new THREE.Vector3(t.x, y + (2.1 + tier * 1.05) * t.scale, t.z),
          q,
          new THREE.Vector3(s, s * 0.42, s),
        );
        canopy.setMatrixAt(ci++, m);
      }
    }
    canopy.instanceMatrix.needsUpdate = true;
    scene.add(canopy);

    const leaves = new THREE.InstancedMesh(canopyGeoms.pine, leafMat, byKind.leaf.length);
    leaves.castShadow = true;
    byKind.leaf.forEach((t, i) => {
      const y = groundHeight(t.x, t.z);
      const s = 2.1 * t.scale;
      rot.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
      q.setFromEuler(rot);
      m.compose(new THREE.Vector3(t.x, y + 3.1 * t.scale, t.z), q, new THREE.Vector3(s, s * 0.85, s));
      leaves.setMatrixAt(i, m);
    });
    leaves.instanceMatrix.needsUpdate = true;
    scene.add(leaves);

    const blossoms = new THREE.InstancedMesh(canopyGeoms.blossom, blossomMat, byKind.blossom.length * 2);
    blossoms.castShadow = true;
    let bi = 0;
    for (const t of byKind.blossom) {
      const y = groundHeight(t.x, t.z);
      for (let k = 0; k < 2; k++) {
        const s = (1.7 - k * 0.4) * t.scale;
        rot.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(rot);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.2,
            y + (2.7 + k * 0.9) * t.scale,
            t.z + (rnd() - 0.5) * 1.2,
          ),
          q,
          new THREE.Vector3(s, s * 0.8, s),
        );
        blossoms.setMatrixAt(bi++, m);
      }
    }
    blossoms.instanceMatrix.needsUpdate = true;
    scene.add(blossoms);
  }

  /* --- bamboo grove --- */

  const bamboo = new THREE.Group();
  {
    const rnd = mulberry32(555);
    const caneGeo = track(new THREE.CylinderGeometry(0.11, 0.14, 9, 5, 1, true));
    const caneMat = track(
      new THREE.MeshStandardMaterial({ color: "#7ba24a", roughness: 0.85, side: THREE.DoubleSide }),
    );
    const canes = new THREE.InstancedMesh(caneGeo, caneMat, 120);
    canes.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 120; i++) {
      const x = -27 + (rnd() - 0.5) * 17;
      const z = 24 + (rnd() - 0.5) * 15;
      const s = 0.75 + rnd() * 0.6;
      e.set((rnd() - 0.5) * 0.14, rnd() * Math.PI, (rnd() - 0.5) * 0.14);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(x, groundHeight(x, z) + 4.5 * s, z),
        q,
        new THREE.Vector3(s, s, s),
      );
      canes.setMatrixAt(i, m);
    }
    canes.instanceMatrix.needsUpdate = true;
    bamboo.add(canes);

    const tuftGeo = track(new THREE.IcosahedronGeometry(1.5, 0));
    const tuftMat = track(
      new THREE.MeshStandardMaterial({ color: "#8fbc55", roughness: 0.95, flatShading: true }),
    );
    const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 34);
    for (let i = 0; i < 34; i++) {
      const x = -27 + (rnd() - 0.5) * 16;
      const z = 24 + (rnd() - 0.5) * 14;
      const s = 0.8 + rnd() * 0.8;
      e.set(rnd(), rnd() * Math.PI, rnd());
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(x, groundHeight(x, z) + 8 * s * 0.75, z),
        q,
        new THREE.Vector3(s, s * 0.7, s),
      );
      tufts.setMatrixAt(i, m);
    }
    tufts.instanceMatrix.needsUpdate = true;
    bamboo.add(tufts);
    scene.add(bamboo);
  }

  /* --- pavilion (azumaya) --- */

  {
    const pavilion = new THREE.Group();
    const py = groundHeight(26, 7);
    const deck = new THREE.Mesh(track(new THREE.CylinderGeometry(4.1, 4.3, 0.5, 8)), stoneMat);
    deck.position.y = 0.25;
    deck.receiveShadow = true;
    deck.castShadow = true;
    pavilion.add(deck);

    const postGeo = track(new THREE.CylinderGeometry(0.17, 0.19, 3.2, 8));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const post = new THREE.Mesh(postGeo, woodDarkMat);
      post.position.set(Math.cos(a) * 3.2, 2.1, Math.sin(a) * 3.2);
      post.castShadow = true;
      pavilion.add(post);
    }

    const railGeo = track(new THREE.TorusGeometry(3.2, 0.09, 6, 24));
    const rail = new THREE.Mesh(railGeo, woodDarkMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.35;
    pavilion.add(rail);

    const roof = new THREE.Mesh(track(new THREE.ConeGeometry(5.4, 2.4, 8)), roofMat);
    roof.position.y = 4.9;
    roof.castShadow = true;
    pavilion.add(roof);

    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(1.9, 1.2, 8)), roofMat);
    cap.position.y = 6.3;
    pavilion.add(cap);

    const finial = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 10, 8)), fireMat);
    finial.position.y = 7;
    pavilion.add(finial);

    pavilion.position.set(26, py, 7);
    scene.add(pavilion);
  }

  /* --- entrance gateway --- */

  {
    const gate = new THREE.Group();
    const pillar = track(new THREE.BoxGeometry(0.9, 5, 0.9));
    for (const side of [-2.6, 2.6]) {
      const p = new THREE.Mesh(pillar, stoneMat);
      p.position.set(side, 2.5, 0);
      p.castShadow = true;
      gate.add(p);
    }
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(7.6, 0.6, 1.1)), woodMat);
    lintel.position.y = 5.2;
    lintel.castShadow = true;
    gate.add(lintel);
    const cap = new THREE.Mesh(track(new THREE.BoxGeometry(8.6, 0.34, 1.6)), woodDarkMat);
    cap.position.y = 5.75;
    gate.add(cap);
    gate.position.set(0, groundHeight(0, 39), 39);
    gate.rotation.y = 0.08;
    scene.add(gate);
  }

  /* --- stone lanterns --- */

  const lanternGroups: THREE.Group[] = [];
  const lanternLights: THREE.PointLight[] = [];
  const lanternGlowMat = track(
    new THREE.SpriteMaterial({
      map: track(radialSprite("rgba(255,214,150,0.95)", "rgba(255,160,70,0.35)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  {
    const shared = { stone: stoneMat, fire: fireMat };
    LANTERNS.forEach(([x, z], i) => {
      const lantern = buildLantern(shared);
      lantern.position.set(x, groundHeight(x, z), z);
      lantern.rotation.y = (i * 1.7) % Math.PI;
      scene.add(lantern);
      lanternGroups.push(lantern);

      const glow = new THREE.Sprite(lanternGlowMat);
      glow.scale.setScalar(5.5);
      glow.position.set(x, groundHeight(x, z) + 2, z);
      scene.add(glow);

      // Only a few real lights — enough to read as lit, cheap to render.
      if (i % 3 === 0) {
        const light = new THREE.PointLight("#ffb45c", 0, 16, 2);
        light.position.set(x, groundHeight(x, z) + 2, z);
        scene.add(light);
        lanternLights.push(light);
      }
    });
  }

  /* --- koi --- */

  const koi: { mesh: THREE.Group; curve: THREE.CatmullRomCurve3; speed: number; offset: number }[] =
    [];
  {
    const rnd = mulberry32(88);
    const bodyGeo = track(new THREE.SphereGeometry(0.5, 10, 8));
    const tailGeo = track(new THREE.ConeGeometry(0.32, 0.8, 6));
    const koiMats = [
      track(new THREE.MeshStandardMaterial({ color: "#f2f0ea", roughness: 0.5 })),
      track(new THREE.MeshStandardMaterial({ color: "#e8722f", roughness: 0.5 })),
      track(new THREE.MeshStandardMaterial({ color: "#d9412f", roughness: 0.5 })),
    ];
    for (let i = 0; i < 7; i++) {
      const cx = -3 + (rnd() - 0.5) * 12;
      const cz = 1 + (rnd() - 0.5) * 12;
      const rx = 2.5 + rnd() * 4.5;
      const rz = 2 + rnd() * 4;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const px = cx + Math.cos(a) * rx * (0.8 + rnd() * 0.4);
        const pz = cz + Math.sin(a) * rz * (0.8 + rnd() * 0.4);
        pts.push(new THREE.Vector3(px, 0.02, pz));
      }
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, koiMats[i % koiMats.length]);
      body.scale.set(1.7, 0.55, 0.75);
      group.add(body);
      const tail = new THREE.Mesh(tailGeo, koiMats[i % koiMats.length]);
      tail.rotation.z = Math.PI / 2;
      tail.scale.set(0.9, 1, 0.4);
      tail.position.x = -1.05;
      group.add(tail);
      group.scale.setScalar(0.85 + rnd() * 0.5);
      scene.add(group);
      koi.push({
        mesh: group,
        curve: new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5),
        speed: 0.035 + rnd() * 0.03,
        offset: rnd(),
      });
    }
  }

  /* --- lily pads --- */

  {
    const rnd = mulberry32(404);
    const padGeo = track(new THREE.CircleGeometry(0.6, 9));
    const padMat = track(
      new THREE.MeshStandardMaterial({ color: "#3f7a4a", roughness: 0.9, side: THREE.DoubleSide }),
    );
    const pads = new THREE.InstancedMesh(padGeo, padMat, 46);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let placed = 0;
    let guard = 0;
    while (placed < 46 && guard < 900) {
      guard++;
      const x = (rnd() - 0.5) * 38;
      const z = (rnd() - 0.5) * 34 + 1;
      if (!pointInPond(x, z)) continue;
      if (distanceToPondEdge(x, z) < 1.4) continue;
      if (ISLANDS.some(([ix, iz, r]) => Math.hypot(x - ix, z - iz) < r + 1)) continue;
      const s = 0.7 + rnd() * 0.8;
      e.set(-Math.PI / 2, 0, rnd() * Math.PI);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, 0.16, z), q, new THREE.Vector3(s, s, s));
      pads.setMatrixAt(placed++, m);
    }
    pads.count = placed;
    pads.instanceMatrix.needsUpdate = true;
    scene.add(pads);
  }

  /* --- petals (dry season) --- */

  const PETALS = 130;
  const petalMesh = new THREE.InstancedMesh(
    track(new THREE.PlaneGeometry(0.42, 0.26)),
    track(
      new THREE.MeshBasicMaterial({
        color: "#f4bccb",
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
    PETALS,
  );
  const petalState: { x: number; y: number; z: number; spin: number; drift: number; fall: number }[] =
    [];
  {
    const rnd = mulberry32(1212);
    for (let i = 0; i < PETALS; i++) {
      petalState.push({
        x: (rnd() - 0.5) * 74,
        y: rnd() * 26,
        z: (rnd() - 0.5) * 74,
        spin: rnd() * Math.PI * 2,
        drift: 0.5 + rnd(),
        fall: 1.1 + rnd() * 1.6,
      });
    }
    scene.add(petalMesh);
  }

  /* --- rain + mist (monsoon) --- */

  const RAIN = 900;
  const rainGeo = track(new THREE.BufferGeometry());
  const rainPos = new Float32Array(RAIN * 6);
  {
    const rnd = mulberry32(777);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 96;
      const y = rnd() * 60;
      const z = (rnd() - 0.5) * 96;
      rainPos[i * 6] = x;
      rainPos[i * 6 + 1] = y;
      rainPos[i * 6 + 2] = z;
      rainPos[i * 6 + 3] = x + 0.1;
      rainPos[i * 6 + 4] = y + 1.5;
      rainPos[i * 6 + 5] = z;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  }
  const rainMat = track(
    new THREE.LineBasicMaterial({ color: "#cfe2f2", transparent: true, opacity: 0 }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

  const mistMat = track(
    new THREE.SpriteMaterial({
      map: track(radialSprite("rgba(255,255,255,0.5)", "rgba(230,240,245,0.2)", 256)),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }),
  );
  const mists: THREE.Sprite[] = [];
  {
    const rnd = mulberry32(313);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(mistMat);
      const x = (rnd() - 0.5) * 34;
      const z = (rnd() - 0.5) * 30;
      s.position.set(x, 1.2 + rnd() * 1.6, z);
      s.scale.set(18 + rnd() * 14, 6 + rnd() * 4, 1);
      mists.push(s);
      scene.add(s);
    }
  }

  /* --- fireflies (dusk) --- */

  const FIREFLIES = 90;
  const flyGeo = track(new THREE.BufferGeometry());
  const flyPos = new Float32Array(FIREFLIES * 3);
  const flySeed: number[] = [];
  {
    const rnd = mulberry32(626);
    for (let i = 0; i < FIREFLIES; i++) {
      flyPos[i * 3] = (rnd() - 0.5) * 70;
      flyPos[i * 3 + 1] = 1 + rnd() * 6;
      flyPos[i * 3 + 2] = (rnd() - 0.5) * 70;
      flySeed.push(rnd() * 100);
    }
    flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  }
  const flyMat = track(
    new THREE.PointsMaterial({
      size: 0.85,
      map: track(radialSprite("rgba(255,236,170,1)", "rgba(255,190,90,0.5)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  const fireflies = new THREE.Points(flyGeo, flyMat);
  scene.add(fireflies);

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
  const ringGeo = track(new THREE.RingGeometry(2.1, 2.6, 40));
  const hitGeo = track(new THREE.SphereGeometry(2.6, 10, 8));

  FEATURE_ORDER.forEach((id, i) => {
    const anchor = ANCHORS[id];
    const base = new THREE.Vector3(
      anchor.target.x,
      Math.max(groundHeight(anchor.target.x, anchor.target.z), anchor.target.y) + 0.1,
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 6.5, 0));
    sprite.renderOrder = 20;
    scene.add(sprite);

    const ring = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: "#f7e3c8",
          transparent: true,
          opacity: 0.55,
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

  const spherical = { radius: 190, phi: 0.42, theta: HOME.theta - 0.9 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 26, 165);
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

  /* --- resize --- */

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  /* --- context loss --- */

  const onContextLost = (event: Event) => {
    event.preventDefault();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  /* --- animation --- */

  const clock = new THREE.Clock();
  let paused = false;
  let ready = false;
  let seasonTarget = 0;
  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const tmpMatrix = new THREE.Matrix4();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpScale = new THREE.Vector3(1, 1, 1);
  const introFrom = new THREE.Vector3(0, 6, 0);
  const petalRnd = mulberry32(9090);

  const lerpColor = (current: THREE.Color, hex: string, t: number) => {
    tmpColor.set(hex);
    current.lerp(tmpColor, t);
  };

  const tick = () => {
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();
    const motion = options.reducedMotion ? 0 : 1;

    /* palette easing */
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
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.45);
    sun.position.copy(sunDir).multiplyScalar(150);
    fog.color.copy(cur.fog);
    fog.near = 140 - cur.wet * 55;
    fog.far = 420 - cur.wet * 180;
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    // Greener, cooler ground in the monsoon; warm and dry otherwise.
    groundMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.8, cur.wet),
      THREE.MathUtils.lerp(0.96, 1, cur.wet),
      THREE.MathUtils.lerp(0.88, 0.86, cur.wet),
    );

    /* water */
    waterMat.uniforms.uTime.value = elapsed * motion;
    waterMat.uniforms.uSky.value = cur.skyBottom;
    waterMat.uniforms.uChop.value = 1 + cur.wet * 1.5;
    (waterMat.uniforms.uCamera.value as THREE.Vector3).copy(camera.position);

    /* cascade */
    fallMat.uniforms.uTime.value = elapsed * motion;
    fallMat.uniforms.uFlow.value = 1 + cur.wet * 0.9;
    waterfall.scale.set(1 + cur.wet * 0.22, 1, 1);

    /* lantern glow */
    fireMat.emissiveIntensity = 0.25 + cur.lantern * 2.4;
    lanternGlowMat.opacity = cur.lantern * 0.75;
    for (const light of lanternLights) light.intensity = cur.lantern * 9;

    /* spray */
    const sprayAttr = sprayGeo.attributes.position as THREE.BufferAttribute;
    if (motion) {
      for (let i = 0; i < sprayCount; i++) {
        let y = sprayAttr.getY(i) + sprayVel[i] * dt * (1 + cur.wet * 0.5);
        if (y > 3.4) y = 0;
        sprayAttr.setY(i, y);
      }
      sprayAttr.needsUpdate = true;
    }
    sprayMat.opacity = 0.35 + cur.wet * 0.3;

    /* koi */
    for (const fish of koi) {
      const t = ((elapsed * motion * fish.speed + fish.offset) % 1 + 1) % 1;
      fish.curve.getPointAt(t, tmpVec);
      fish.mesh.position.set(tmpVec.x, 0.02 + Math.sin(elapsed * 2 + fish.offset * 9) * 0.03, tmpVec.z);
      fish.curve.getPointAt((t + 0.02) % 1, tmpVec2);
      fish.mesh.lookAt(tmpVec2.x, fish.mesh.position.y, tmpVec2.z);
      fish.mesh.rotation.y += Math.PI / 2;
      fish.mesh.children[1].rotation.x = Math.sin(elapsed * 9 + fish.offset * 12) * 0.5;
    }

    /* petals — dry season only */
    const petalOpacity = (1 - cur.wet) * 0.9;
    (petalMesh.material as THREE.MeshBasicMaterial).opacity = petalOpacity;
    petalMesh.visible = petalOpacity > 0.02;
    if (petalMesh.visible && motion) {
      for (let i = 0; i < PETALS; i++) {
        const p = petalState[i];
        p.y -= p.fall * dt;
        p.x += Math.sin(elapsed * 0.6 + i) * p.drift * dt;
        p.z += Math.cos(elapsed * 0.5 + i * 1.7) * p.drift * dt;
        p.spin += dt * 1.6;
        if (p.y < -1) {
          // Recycle to the top, somewhere new over the garden.
          p.y = 24 + petalRnd() * 6;
          p.x = (petalRnd() - 0.5) * 74;
          p.z = (petalRnd() - 0.5) * 74;
        }
        tmpEuler.set(p.spin, p.spin * 0.7, p.spin * 0.4);
        tmpQuat.setFromEuler(tmpEuler);
        tmpMatrix.compose(tmpVec.set(p.x, p.y, p.z), tmpQuat, tmpScale);
        petalMesh.setMatrixAt(i, tmpMatrix);
      }
      petalMesh.instanceMatrix.needsUpdate = true;
    }

    /* rain + mist — monsoon only */
    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.5;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - 42 * dt;
        if (y < 0) y = 58;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.5);
      }
      attr.needsUpdate = true;
    }
    mistMat.opacity = cur.wet * 0.32 + (paletteTarget === PALETTES.dawn ? 0.14 : 0);
    for (let i = 0; i < mists.length; i++) {
      mists[i].position.x += Math.sin(elapsed * 0.15 + i) * dt * motion * 0.7;
    }

    /* fireflies — dusk only */
    flyMat.opacity = clamp((cur.lantern - 0.6) * 2.2, 0, 0.9);
    fireflies.visible = flyMat.opacity > 0.02;
    if (fireflies.visible && motion) {
      const attr = flyGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < FIREFLIES; i++) {
        const s = flySeed[i];
        attr.setY(i, 3.6 + Math.sin(elapsed * 0.9 + s) * 1.4);
        let x = attr.getX(i) + Math.sin(elapsed * 0.4 + s) * dt * 1.4;
        if (x > 38) x -= 76;
        else if (x < -38) x += 76;
        attr.setX(i, x);
      }
      attr.needsUpdate = true;
    }

    /* bamboo sway */
    if (motion) bamboo.rotation.z = Math.sin(elapsed * 0.7) * 0.006 * (1 + cur.wet);

    /* markers */
    for (const marker of markers) {
      const isActive = marker.id === activeId;
      const isHover = marker.id === hovered;
      const pulse = 1 + Math.sin(elapsed * 2.2 + marker.base.x) * 0.08 * motion;
      marker.ring.scale.setScalar((isActive ? 1.5 : 1) * pulse);
      (marker.ring.material as THREE.MeshBasicMaterial).opacity = isActive ? 0.85 : 0.4;
      (marker.ring.material as THREE.MeshBasicMaterial).color.set(isActive ? "#e0703a" : "#f7e3c8");
      const spriteMat = marker.sprite.material as THREE.SpriteMaterial;
      const wantTex = isActive ? marker.activeTex : marker.idleTex;
      if (spriteMat.map !== wantTex) spriteMat.map = wantTex;
      const scale = isActive ? 0.075 : isHover ? 0.063 : 0.055;
      marker.sprite.scale.setScalar(damp(marker.sprite.scale.x, scale, 8, dt));
      marker.sprite.position.y =
        marker.base.y + 6.5 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.25 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    /* camera */
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.4);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(190, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.42, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.9, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.045;
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

  /* ------------------------------------------------------------------ */
  /* Imperative handle                                                   */
  /* ------------------------------------------------------------------ */

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
