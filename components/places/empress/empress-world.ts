/**
 * A hand-built, procedural 3D model of Empress Garden, Camp.
 *
 * What defines this place: a 39-acre canopy of old-growth trees, rolling
 * lawns, a formal rose garden, a working greenhouse, and the January
 * fruit-flower-vegetable show. Not Okayama, not Saras Baug.
 *
 * Mode: ordinary = daily park; show = exhibition tents and extra bloom.
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
  | "old-canopy"
  | "rolling-lawns"
  | "rose-garden"
  | "greenhouse"
  | "flower-show";

export type EmpressMode = "ordinary" | "show";

export type EmpressWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type EmpressWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: EmpressMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "old-canopy",
  "rolling-lawns",
  "rose-garden",
  "greenhouse",
  "flower-show",
];

/* ------------------------------------------------------------------ */
/* Pure layout                                                         */
/* ------------------------------------------------------------------ */

/** Open lawn — the garden’s public room. */
export const LAWN = { halfW: 18, halfD: 14, y: 0 };

/** Formal rose garden, distinct from the wilder canopy. */
export const ROSE = { x: -18, z: 6, r: 8.4, rings: 3 };

/** Working greenhouse. */
export const GREENHOUSE = { x: 18, z: -7, w: 12.5, d: 7.4, h: 4.9 };

/** Flower-show tents near the gate (+Z). */
export const SHOW = { z: 22, halfW: 16, tentCount: 6 };

/** Old-growth grove ring outside the lawn. */
export const GROVE = { rInner: 22, rOuter: 38 };

export function inLawn(x: number, z: number): boolean {
  return Math.abs(x) < LAWN.halfW && Math.abs(z) < LAWN.halfD;
}

export function inRose(x: number, z: number): boolean {
  return Math.hypot(x - ROSE.x, z - ROSE.z) < ROSE.r;
}

export function inGreenhouse(x: number, z: number): boolean {
  return (
    Math.abs(x - GREENHOUSE.x) < GREENHOUSE.w / 2 + 0.6 &&
    Math.abs(z - GREENHOUSE.z) < GREENHOUSE.d / 2 + 0.6
  );
}

export function inShowGround(x: number, z: number): boolean {
  return Math.abs(x) < SHOW.halfW + 2 && z > SHOW.z - 5 && z < SHOW.z + 6;
}

export function roseBushSpec(ring: number, i: number): { x: number; z: number } {
  const count = 8 + ring * 6;
  const a = (i / count) * Math.PI * 2;
  const r = 2.1 + ring * 2.15;
  return { x: ROSE.x + Math.cos(a) * r, z: ROSE.z + Math.sin(a) * r };
}

export function tentSpec(i: number): { x: number; z: number } {
  const start = -SHOW.halfW + 2.4;
  return { x: start + i * 5.2, z: SHOW.z };
}

export function terrainHeight(x: number, z: number): number {
  let h = 0.12 * Math.sin(x * 0.09) * Math.cos(z * 0.08);
  if (inLawn(x, z)) h = 0.04 * Math.sin(x * 0.2) * Math.cos(z * 0.18);
  if (inRose(x, z)) h = 0.08;
  if (inGreenhouse(x, z)) h = 0.22;
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 52;
  if (outside > -1) h -= 16 * smoothstep(-1, 6, outside);
  return h;
}

export type EmpressPropKind = "tree" | "rose" | "lamp" | "tent" | "bench" | "show-bloom";

export type EmpressPropSpec = {
  kind: EmpressPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export function buildEmpressLayout(seed = 1892): {
  props: EmpressPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  treeCount: number;
  roseCount: number;
  tentCount: number;
} {
  const rnd = mulberry32(seed);
  const props: EmpressPropSpec[] = [];
  const push = (p: EmpressPropSpec) => props.push(p);

  let guard = 0;
  const trees: { x: number; z: number; s: number }[] = [];
  while (trees.length < 36 && guard < 5000) {
    guard++;
    const x = (rnd() - 0.5) * 84;
    const z = (rnd() - 0.5) * 80;
    const r = Math.hypot(x, z);
    if (inLawn(x, z) && r < 12) continue;
    if (inRose(x, z)) continue;
    if (inGreenhouse(x, z)) continue;
    if (inShowGround(x, z)) continue;
    if (r < GROVE.rInner - 2) continue;
    if (r > GROVE.rOuter) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5.6)) continue;
    trees.push({ x, z, s: 1.05 + rnd() * 0.7 });
  }
  for (const t of trees) {
    push({
      kind: "tree",
      x: t.x,
      y: Math.max(terrainHeight(t.x, t.z), 0),
      z: t.z,
      scale: t.s,
      feature: "old-canopy",
    });
  }

  let roseCount = 0;
  for (let ring = 0; ring < ROSE.rings; ring++) {
    const n = 8 + ring * 6;
    for (let i = 0; i < n; i++) {
      const b = roseBushSpec(ring, i);
      push({
        kind: "rose",
        x: b.x,
        y: 0.08,
        z: b.z,
        scale: 0.85 + (i % 3) * 0.08,
        feature: "rose-garden",
      });
      roseCount++;
    }
  }

  for (const [lx, lz] of [
    [-6, 0],
    [6, 0],
    [0, -8],
    [0, 8],
  ] as [number, number][]) {
    push({ kind: "lamp", x: lx, y: 0, z: lz, scale: 1, feature: "rolling-lawns" });
    push({ kind: "bench", x: lx * 1.4, y: 0, z: lz * 1.15, scale: 1, feature: "rolling-lawns" });
  }

  for (const side of [-1, 1]) {
    push({
      kind: "lamp",
      x: GREENHOUSE.x + side * (GREENHOUSE.w / 2 - 0.8),
      y: 0.22,
      z: GREENHOUSE.z + GREENHOUSE.d / 2 + 1.1,
      scale: 1,
      feature: "greenhouse",
    });
  }

  for (let i = 0; i < SHOW.tentCount; i++) {
    const t = tentSpec(i);
    push({ kind: "tent", x: t.x, y: 0, z: t.z, scale: 1, feature: "flower-show" });
    push({
      kind: "show-bloom",
      x: t.x,
      y: 0.15,
      z: t.z + 2.1,
      scale: 1,
      feature: "flower-show",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "old-canopy": { x: 24, y: 6.5, z: -16 },
    "rolling-lawns": { x: 0, y: 1.2, z: 0 },
    "rose-garden": { x: ROSE.x, y: 1.8, z: ROSE.z },
    greenhouse: { x: GREENHOUSE.x, y: GREENHOUSE.h + 1.1, z: GREENHOUSE.z },
    "flower-show": { x: 0, y: 3.2, z: SHOW.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    treeCount: trees.length,
    roseCount,
    tentCount: SHOW.tentCount,
  };
}

export function getEmpressAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "old-canopy": { target: [22, 3, -14], dir: [0.55, 0.4, 0.73], distance: 26 },
    "rolling-lawns": { target: [0, 0.4, 0], dir: [0.12, 0.55, 0.83], distance: 32 },
    "rose-garden": { target: [ROSE.x, 0.6, ROSE.z], dir: [-0.5, 0.42, 0.76], distance: 18 },
    greenhouse: {
      target: [GREENHOUSE.x, 2.2, GREENHOUSE.z + 1],
      dir: [0.62, 0.38, 0.69],
      distance: 18,
    },
    "flower-show": { target: [0, 1.4, SHOW.z], dir: [0.1, 0.36, 0.93], distance: 22 },
  };
}

export function getEmpressHomeView() {
  return {
    // Gate side, looking across the lawn to roses and the greenhouse,
    // canopy wrapping the edges. Low enough that trees read as trunks.
    target: [0, 2.2, 2] as [number, number, number],
    radius: 40,
    phi: 1.16,
    theta: 0.3,
  };
}

export function getEmpressPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a3c58",
    skyBottom: "#f0d4b4",
    sun: "#ffd6a8",
    sunIntensity: 2.15,
    hemiSky: "#b4ccdc",
    hemiGround: "#4a4a34",
    ambient: 0.78,
    fog: "#e6d8b8",
    waterDeep: "#2a4a44",
    waterShallow: "#7aaa90",
    lantern: 0.18,
    sunAzimuth: 2.1,
    sunElevation: 0.28,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3a2848",
    skyBottom: "#ffc084",
    sun: "#ffb060",
    sunIntensity: 2.7,
    hemiSky: "#d0c0c8",
    hemiGround: "#5a5034",
    ambient: 0.8,
    fog: "#f0d0a0",
    waterDeep: "#2a5244",
    waterShallow: "#88b890",
    lantern: 0.4,
    sunAzimuth: -0.7,
    sunElevation: 0.3,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060814",
    skyBottom: "#28182c",
    sun: "#6a64b8",
    sunIntensity: 0.28,
    hemiSky: "#222848",
    hemiGround: "#141218",
    ambient: 0.32,
    fog: "#161224",
    waterDeep: "#0a1820",
    waterShallow: "#1e3850",
    lantern: 1,
    sunAzimuth: -1.3,
    sunElevation: 0.05,
    exposure: 1.14,
  },
};

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getEmpressAnchors();
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
const homeRaw = getEmpressHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

export function createEmpressWorld(
  container: HTMLElement,
  options: EmpressWorldOptions,
): EmpressWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const layout = buildEmpressLayout();

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
  const fog = new THREE.Fog("#f0d0a0", 150, 500);
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

  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#4a3828", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#3d6a30", roughness: 0.95, flatShading: true }),
  );
  const roseMat = track(
    new THREE.MeshStandardMaterial({ color: "#c94f6a", roughness: 0.7, flatShading: true }),
  );
  const roseLeafMat = track(
    new THREE.MeshStandardMaterial({ color: "#2f5a28", roughness: 0.9, flatShading: true }),
  );
  const glassMat = track(
    new THREE.MeshStandardMaterial({
      color: "#9ec8d4",
      roughness: 0.18,
      metalness: 0.15,
      transparent: true,
      opacity: 0.38,
    }),
  );
  const frameMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a7068", roughness: 0.45, metalness: 0.4 }),
  );
  const canvasMat = track(
    new THREE.MeshStandardMaterial({ color: "#f0e2c4", roughness: 0.85, side: THREE.DoubleSide }),
  );
  const stripeMat = track(
    new THREE.MeshStandardMaterial({ color: "#c45a3a", roughness: 0.8, side: THREE.DoubleSide }),
  );
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#7a4a28", roughness: 0.85 }));
  const pathMat = track(new THREE.MeshStandardMaterial({ color: "#c8b898", roughness: 0.95 }));

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(120, 116, 110, 106));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#5a8a3e");
  const lawnB = new THREE.Color("#3c682c");
  const roseBed = new THREE.Color("#6a4a38");
  const dust = new THREE.Color("#c2b090");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(77);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (inRose(x, z)) tmp.copy(roseBed).lerp(lawnB, colorRnd() * 0.3);
    else if (inLawn(x, z)) tmp.copy(lawnA).lerp(lawnB, colorRnd() * 0.45);
    else if (inShowGround(x, z)) tmp.copy(dust).lerp(lawnB, 0.3);
    else tmp.copy(lawnB).lerp(lawnA, colorRnd());
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
    track(new THREE.BoxGeometry(116, 16, 112)),
    track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 })),
  );
  base.position.y = -9;
  scene.add(base);

  /* --- lawn paths --- */

  {
    const p1 = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.06, 36)), pathMat);
    p1.position.set(0, 0.05, 4);
    p1.receiveShadow = true;
    scene.add(p1);
    const p2 = new THREE.Mesh(track(new THREE.BoxGeometry(40, 0.06, 3.4)), pathMat);
    p2.position.set(0, 0.05, 0);
    p2.receiveShadow = true;
    scene.add(p2);
  }

  /* --- rose garden rings --- */

  {
    const bushGeo = track(new THREE.SphereGeometry(0.45, 8, 6));
    const roses = layout.props.filter((p) => p.kind === "rose");
    const blooms = new THREE.InstancedMesh(bushGeo, roseMat, roses.length);
    const foliage = new THREE.InstancedMesh(bushGeo, roseLeafMat, roses.length);
    blooms.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    roses.forEach((r, i) => {
      m.compose(new THREE.Vector3(r.x, 0.55, r.z), q, new THREE.Vector3(r.scale, r.scale, r.scale));
      blooms.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(r.x, 0.28, r.z),
        q,
        new THREE.Vector3(r.scale * 1.15, r.scale * 0.7, r.scale * 1.15),
      );
      foliage.setMatrixAt(i, m);
    });
    blooms.instanceMatrix.needsUpdate = true;
    foliage.instanceMatrix.needsUpdate = true;
    scene.add(blooms);
    scene.add(foliage);

    const rim = new THREE.Mesh(track(new THREE.TorusGeometry(ROSE.r - 0.2, 0.16, 8, 36)), pathMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(ROSE.x, 0.12, ROSE.z);
    scene.add(rim);
  }

  /* --- greenhouse --- */

  {
    const frame = new THREE.Mesh(
      track(new THREE.BoxGeometry(GREENHOUSE.w, GREENHOUSE.h, GREENHOUSE.d)),
      glassMat,
    );
    frame.position.set(GREENHOUSE.x, GREENHOUSE.h / 2 + 0.22, GREENHOUSE.z);
    frame.castShadow = true;
    scene.add(frame);
    const ridge = new THREE.Mesh(
      track(new THREE.BoxGeometry(GREENHOUSE.w + 0.3, 0.2, GREENHOUSE.d + 0.3)),
      frameMat,
    );
    ridge.position.set(GREENHOUSE.x, GREENHOUSE.h + 0.35, GREENHOUSE.z);
    scene.add(ridge);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, GREENHOUSE.h, 0.16)), frameMat);
      post.position.set(GREENHOUSE.x + side * (GREENHOUSE.w / 2), GREENHOUSE.h / 2 + 0.22, GREENHOUSE.z + GREENHOUSE.d / 2);
      scene.add(post);
    }
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 2.2, 0.1)), frameMat);
    door.position.set(GREENHOUSE.x, 1.3, GREENHOUSE.z + GREENHOUSE.d / 2 + 0.05);
    scene.add(door);
  }

  /* --- show tents (always present; brighten in show mode via lights) --- */

  const tentGroup = new THREE.Group();
  scene.add(tentGroup);
  {
    for (const p of layout.props) {
      if (p.kind !== "tent") continue;
      const canvas = new THREE.Mesh(track(new THREE.ConeGeometry(2.1, 2.6, 4)), canvasMat);
      canvas.position.set(p.x, 1.5, p.z);
      canvas.rotation.y = Math.PI / 4;
      canvas.castShadow = true;
      tentGroup.add(canvas);
      const stripe = new THREE.Mesh(track(new THREE.ConeGeometry(2.12, 0.45, 4)), stripeMat);
      stripe.position.set(p.x, 2.55, p.z);
      stripe.rotation.y = Math.PI / 4;
      tentGroup.add(stripe);
    }
    for (const p of layout.props) {
      if (p.kind !== "show-bloom") continue;
      const bed = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.35, 1.1)), roseMat);
      bed.position.set(p.x, 0.22, p.z);
      tentGroup.add(bed);
    }
  }

  /* --- benches --- */

  {
    const seatGeo = track(new THREE.BoxGeometry(1.9, 0.14, 0.55));
    for (const p of layout.props) {
      if (p.kind !== "bench") continue;
      const seat = new THREE.Mesh(seatGeo, woodMat);
      seat.position.set(p.x, 0.42, p.z);
      seat.castShadow = true;
      scene.add(seat);
    }
  }

  /* --- lamps --- */

  const lampFlames: THREE.Sprite[] = [];
  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,150,50,0.4)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
    }),
  );
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6));
    for (const p of layout.props) {
      if (p.kind !== "lamp") continue;
      const pole = new THREE.Mesh(poleGeo, frameMat);
      pole.position.set(p.x, p.y + 1.3, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const spr = new THREE.Sprite(flameMat);
      spr.scale.setScalar(0.7);
      spr.position.set(p.x, p.y + 2.7, p.z);
      scene.add(spr);
      lampFlames.push(spr);
    }
  }

  /* --- old-growth trees --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.32, 0.52, 4.4, 7));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 3);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(901);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 2.2 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 3; k++) {
        const sc = (3.4 - k * 0.55) * t.scale;
        e.set(rnd() * 0.6, rnd() * Math.PI, rnd() * 0.6);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.6,
            t.y + (5.2 + k * 1.1) * t.scale,
            t.z + (rnd() - 0.5) * 1.6,
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 3.4, 0));
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
    ring.position.copy(base).add(new THREE.Vector3(0, 0.18, 0));
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 12, 150);
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
    hemi.intensity = cur.ambient * 1.7 + cur.fest * 0.16;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    tentGroup.visible = cur.fest > 0.08;
    tentGroup.scale.setScalar(0.55 + cur.fest * 0.45);

    const lampLevel = clamp(cur.lantern + cur.fest * 0.3, 0, 1.2);
    flameMat.opacity = 0.2 + lampLevel * 0.7;
    for (let i = 0; i < lampFlames.length; i++) {
      lampFlames[i].scale.setScalar(0.7 * (0.85 + Math.sin(elapsed * 6 + i) * 0.15 * motion + 0.14));
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
        marker.base.y + 3.4 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.26 * motion;
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
      if (autoRotate && motion) desired.theta += dt * 0.028;
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
      festTarget = m === "show" ? 1 : 0;
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
