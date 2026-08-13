/**
 * Procedural three.js diorama of Vetal Tekdi — Pune's own basalt hill.
 *
 * Same contract as the other place worlds: zero external meshes, geometry
 * generated at runtime. Terrain height, trail/quarry/ridge layout, marker
 * bases, camera anchors and palettes stay pure so Vitest can drive them
 * without WebGL. The renderer, picking and rAF loop live in createHillWorld.
 *
 * Feature ids stay 1:1 with HILL_FEATURES in lib/data/vetal-tekdi.ts.
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
  | "summit-shrine"
  | "city-panorama"
  | "quarry-lake"
  | "the-trails"
  | "scrub-forest"
  | "ridge-walk";

export type HillWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type HillWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "summit-shrine",
  "city-panorama",
  "quarry-lake",
  "the-trails",
  "scrub-forest",
  "ridge-walk",
];

/* ------------------------------------------------------------------ */
/* Constants (pure, shared by layout + mesh builders)                  */
/* ------------------------------------------------------------------ */

/** Blunt dome: plateau at the shrine, flanks falling to the city plain. */
export const HILL = { plateauY: 20, plateauR: 11, baseR: 34 } as const;

/** Ridge axis — northeast toward ARAI hill (unit-ish). */
export const RIDGE_AXIS = { x: 0.65, z: -0.76 } as const;

/** Modest stone shrine at the summit. */
export const SHRINE = {
  x: 0,
  z: -3.4,
  plinthW: 5.4,
  plinthD: 5.4,
  plinthH: 0.72,
  cellaW: 3.5,
  cellaH: 2.7,
} as const;

/** Abandoned quarry amphitheatre on the eastern flank. */
export const QUARRY = {
  x: 16,
  z: 2.4,
  r: 6.4,
  depth: 8,
  waterYDry: 6.5,
  waterYWet: 11.4,
} as const;

/** South rim — the city balcony. */
export const PANORAMA = { x: 0, z: 10.6 } as const;

/** Saddle between summit and the eastern ridge — birding scrub. */
export const SCRUB_SADDLE = { x: 8.5, z: -7.2 } as const;

/** Exposed spine walking off toward ARAI. */
export const RIDGE_WALK = { x: 22, z: -18 } as const;

export type HillPropKind =
  | "shrine"
  | "bench"
  | "quarry-rock"
  | "reed"
  | "trail-stone"
  | "tree"
  | "cairn"
  | "ridge-rock";

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

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

/** Elongated dome along the ARAI ridge; plateau in the middle. Pure. */
export function hillDome(x: number, z: number): number {
  const along = x * RIDGE_AXIS.x + z * RIDGE_AXIS.z;
  const across = -x * RIDGE_AXIS.z + z * RIDGE_AXIS.x;
  const r = Math.hypot(across * 1.35, along * 0.72);
  return HILL.plateauY * smoothstep(HILL.baseR, HILL.plateauR, r);
}

/** How much the quarry bites out of the hill at XZ. Pure. */
export function quarryDepth(x: number, z: number): number {
  const d = Math.hypot(x - QUARRY.x, z - QUARRY.z);
  return QUARRY.depth * smoothstep(QUARRY.r + 1.6, QUARRY.r - 1.4, d);
}

/** World-space height of the massif. y = 0 is the city plain. */
export function terrainHeight(x: number, z: number): number {
  let h = 0.2 * Math.sin(x * 0.055) * Math.cos(z * 0.048);
  h += hillDome(x, z);
  h -= quarryDepth(x, z);

  // Soft switchback shoulder on the Kothrud (south, +Z) face.
  const trail =
    smoothstep(6.4, 3.4, Math.abs(x - Math.sin(((46 - z) / 30) * Math.PI * 3.5) * 4.2)) *
    smoothstep(14, 18, z) *
    smoothstep(48, 44, z);
  if (trail > 0) h = Math.max(h, hillDome(0, z) * 0.92 * trail + h * (1 - trail * 0.15));

  const outside = Math.max(Math.abs(x), Math.abs(z)) - 56;
  if (outside > -1) h -= 18 * smoothstep(-1, 4, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/** Numbered stones of the main Kothrud switchbacks. Pure. */
export function kothrudTrailPoints(): { x: number; z: number }[] {
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    pts.push({ x: Math.sin(t * Math.PI * 3.5) * 4.2, z: 46 - t * 30 });
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function buildHillLayout(seed = 1800): {
  props: HillPropSpec[];
  propCount: number;
  buildings: HillBuildingSpec[];
  buildingCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  trailStoneCount: number;
} {
  const rnd = mulberry32(seed);
  const props: HillPropSpec[] = [];
  const push = (p: HillPropSpec) => props.push(p);

  push({
    kind: "shrine",
    x: SHRINE.x,
    y: HILL.plateauY,
    z: SHRINE.z,
    scale: 1,
    feature: "summit-shrine",
  });

  for (const x of [-3.2, 3.2]) {
    push({
      kind: "bench",
      x,
      y: groundHeight(x, PANORAMA.z),
      z: PANORAMA.z,
      scale: 1,
      feature: "city-panorama",
    });
  }

  const quarryRocks: [number, number][] = [
    [QUARRY.x + 5.4, QUARRY.z],
    [QUARRY.x - 5.1, QUARRY.z + 1.4],
    [QUARRY.x + 1.2, QUARRY.z + 5.6],
    [QUARRY.x - 2.4, QUARRY.z - 5.2],
    [QUARRY.x + 4.2, QUARRY.z - 3.6],
    [QUARRY.x - 4.6, QUARRY.z + 4.1],
  ];
  for (const [x, z] of quarryRocks) {
    push({
      kind: "quarry-rock",
      x,
      y: groundHeight(x, z),
      z,
      scale: 0.8 + rnd() * 0.5,
      feature: "quarry-lake",
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = QUARRY.x + Math.cos(a) * (QUARRY.r - 0.8);
    const z = QUARRY.z + Math.sin(a) * (QUARRY.r - 0.8);
    push({
      kind: "reed",
      x,
      y: QUARRY.waterYWet - 0.4,
      z,
      scale: 0.7 + rnd() * 0.4,
      feature: "quarry-lake",
    });
  }

  let trailStoneCount = 0;
  for (const pt of kothrudTrailPoints()) {
    push({
      kind: "trail-stone",
      x: pt.x,
      y: groundHeight(pt.x, pt.z),
      z: pt.z,
      scale: 1,
      feature: "the-trails",
    });
    trailStoneCount++;
  }
  // Steeper Aundh / Pashan / ARAI approaches — a few stones each.
  const sideTrails: { x0: number; z0: number; x1: number; z1: number }[] = [
    { x0: 7, z0: -42, x1: 3, z1: -14 },
    { x0: -42, z0: 7, x1: -13, z1: 2 },
    { x0: 32, z0: -28, x1: 14, z1: -10 },
  ];
  for (const t of sideTrails) {
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      const x = t.x0 + (t.x1 - t.x0) * u + (rnd() - 0.5) * 1.2;
      const z = t.z0 + (t.z1 - t.z0) * u + (rnd() - 0.5) * 1.2;
      push({
        kind: "trail-stone",
        x,
        y: groundHeight(x, z),
        z,
        scale: 0.85,
        feature: "the-trails",
      });
      trailStoneCount++;
    }
  }

  // Scrub on the saddle and flanks.
  let guard = 0;
  const trees: { x: number; z: number; s: number }[] = [];
  while (trees.length < 48 && guard < 5000) {
    guard++;
    const x = (rnd() - 0.5) * 92;
    const z = (rnd() - 0.5) * 92;
    const r = Math.hypot(x, z);
    if (r < HILL.plateauR + 1.5 || r > HILL.baseR + 8) continue;
    if (Math.hypot(x - QUARRY.x, z - QUARRY.z) < QUARRY.r + 1) continue;
    if (Math.abs(x) < 6 && z > 14) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 50) continue;
    if (trees.some((s) => Math.hypot(s.x - x, s.z - z) < 4.6)) continue;
    trees.push({ x, z, s: 0.65 + rnd() * 0.7 });
  }
  for (const t of trees) {
    const nearSaddle = Math.hypot(t.x - SCRUB_SADDLE.x, t.z - SCRUB_SADDLE.z) < 14;
    push({
      kind: "tree",
      x: t.x,
      y: groundHeight(t.x, t.z),
      z: t.z,
      scale: t.s,
      feature: nearSaddle ? "scrub-forest" : null,
    });
  }
  // Guarantee the saddle itself is tagged even if the random pack misses it.
  push({
    kind: "tree",
    x: SCRUB_SADDLE.x,
    y: groundHeight(SCRUB_SADDLE.x, SCRUB_SADDLE.z),
    z: SCRUB_SADDLE.z,
    scale: 1.05,
    feature: "scrub-forest",
  });

  const ridgeRocks: [number, number][] = [
    [14, -11],
    [18, -15],
    [22, -18],
    [26, -22],
    [29, -26],
  ];
  for (const [x, z] of ridgeRocks) {
    push({
      kind: "ridge-rock",
      x,
      y: groundHeight(x, z),
      z,
      scale: 0.9 + rnd() * 0.4,
      feature: "ridge-walk",
    });
  }
  push({
    kind: "cairn",
    x: RIDGE_WALK.x,
    y: groundHeight(RIDGE_WALK.x, RIDGE_WALK.z) + 0.4,
    z: RIDGE_WALK.z,
    scale: 1,
    feature: "ridge-walk",
  });

  const buildings: HillBuildingSpec[] = [];
  guard = 0;
  while (buildings.length < 140 && guard < 6000) {
    guard++;
    const x = (rnd() - 0.5) * 108;
    const z = (rnd() - 0.5) * 108;
    if (Math.hypot(x, z) < HILL.baseR - 0.5) continue;
    if (Math.abs(x) < 10 && z > 12) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 52) continue;
    if (buildings.some((b) => Math.hypot(b.x - x, b.z - z) < 4.2)) continue;
    buildings.push({
      x,
      z,
      w: 2.4 + rnd() * 3.4,
      d: 2.4 + rnd() * 3.4,
      h: 2.4 + rnd() * 7.2,
    });
  }

  const shrineTop = HILL.plateauY + SHRINE.plinthH + SHRINE.cellaH + 4.2;
  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "summit-shrine": { x: SHRINE.x, y: shrineTop, z: SHRINE.z },
    "city-panorama": {
      x: PANORAMA.x,
      y: groundHeight(PANORAMA.x, PANORAMA.z) + 1.1,
      z: PANORAMA.z,
    },
    "quarry-lake": {
      x: QUARRY.x - 1.2,
      y: hillDome(QUARRY.x - QUARRY.r, QUARRY.z) + 0.6,
      z: QUARRY.z,
    },
    "the-trails": { x: 0, y: groundHeight(0, 32) + 0.8, z: 32 },
    "scrub-forest": {
      x: SCRUB_SADDLE.x,
      y: groundHeight(SCRUB_SADDLE.x, SCRUB_SADDLE.z) + 2.4,
      z: SCRUB_SADDLE.z,
    },
    "ridge-walk": {
      x: RIDGE_WALK.x,
      y: groundHeight(RIDGE_WALK.x, RIDGE_WALK.z) + 1.6,
      z: RIDGE_WALK.z,
    },
  };

  return {
    props,
    propCount: props.length,
    buildings,
    buildingCount: buildings.length,
    markerBases,
    trailStoneCount,
  };
}

export function getHillAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "summit-shrine": {
      target: [SHRINE.x, HILL.plateauY + 3.2, SHRINE.z],
      dir: [0.12, 0.38, 0.92],
      distance: 28,
    },
    "city-panorama": {
      target: [PANORAMA.x, HILL.plateauY + 1.4, PANORAMA.z],
      dir: [-0.06, 0.4, 0.91],
      distance: 52,
    },
    "quarry-lake": {
      target: [QUARRY.x, 10.5, QUARRY.z],
      dir: [0.78, 0.48, 0.4],
      distance: 26,
    },
    "the-trails": {
      target: [0, 9, 30],
      dir: [0.2, 0.52, 0.83],
      distance: 38,
    },
    "scrub-forest": {
      target: [SCRUB_SADDLE.x, groundHeight(SCRUB_SADDLE.x, SCRUB_SADDLE.z) + 1.6, SCRUB_SADDLE.z],
      dir: [0.55, 0.5, -0.67],
      distance: 24,
    },
    "ridge-walk": {
      target: [RIDGE_WALK.x, groundHeight(RIDGE_WALK.x, RIDGE_WALK.z) + 1.2, RIDGE_WALK.z],
      dir: [0.62, 0.42, -0.66],
      distance: 30,
    },
  };
}

export function getHillHomeView() {
  return {
    // South (Kothrud) approach: trails in the near ground, shrine on the dome,
    // city spilling away, ridge running off to the northeast.
    target: [2, 10, 14] as [number, number, number],
    radius: 96,
    phi: 1.07,
    theta: 0.32,
  };
}

export function getHillPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — sunrise over the city, golden hour, dusk skyline         */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1c355c",
    skyBottom: "#f3d2b0",
    sun: "#ffd4a4",
    sunIntensity: 2.15,
    hemiSky: "#b4c6e4",
    hemiGround: "#5c5640",
    ambient: 0.84,
    fog: "#edd6ba",
    waterDeep: "#2a5860",
    waterShallow: "#7eb0b2",
    lantern: 0.28,
    sunAzimuth: 2.05,
    sunElevation: 0.26,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3a2758",
    skyBottom: "#ffc184",
    sun: "#ffbb70",
    sunIntensity: 2.95,
    hemiSky: "#c4b6dc",
    hemiGround: "#5e5136",
    ambient: 0.8,
    fog: "#efcea0",
    waterDeep: "#2a5852",
    waterShallow: "#8abca6",
    lantern: 0.5,
    sunAzimuth: -0.78,
    sunElevation: 0.33,
    exposure: 1.01,
  },
  dusk: {
    skyTop: "#030816",
    skyBottom: "#2a1c46",
    sun: "#7a72d0",
    sunIntensity: 0.28,
    hemiSky: "#262e5a",
    hemiGround: "#12101c",
    ambient: 0.32,
    fog: "#1a1632",
    waterDeep: "#0a152c",
    waterShallow: "#244264",
    lantern: 1,
    sunAzimuth: -1.38,
    sunElevation: 0.04,
    exposure: 1.16,
  },
};

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createHillWorld(container: HTMLElement, options: HillWorldOptions): HillWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildHillLayout();
  const anchorsRaw = getHillAnchors();
  const homeRaw = getHillHomeView();

  const ANCHORS = Object.fromEntries(
    FEATURE_ORDER.map((id) => [
      id,
      {
        target: new THREE.Vector3(...anchorsRaw[id].target),
        dir: new THREE.Vector3(...anchorsRaw[id].dir),
        distance: anchorsRaw[id].distance,
      },
    ]),
  ) as Record<FeatureId, { target: THREE.Vector3; dir: THREE.Vector3; distance: number }>;

  const HOME = {
    target: new THREE.Vector3(...homeRaw.target),
    radius: homeRaw.radius,
    phi: homeRaw.phi,
    theta: homeRaw.theta,
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
    0.5,
    900,
  );
  const fog = new THREE.Fog("#efcea0", 160, 520);
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
    wet: 0,
  };
  let seasonTarget = 0;

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
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const basaltMat = track(
    new THREE.MeshStandardMaterial({ color: "#5a534c", roughness: 0.92, metalness: 0.02 }),
  );
  const basaltDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#403b36", roughness: 0.94 }),
  );
  const stoneMat = track(new THREE.MeshStandardMaterial({ color: "#8a8174", roughness: 0.95 }));
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: "#f0b038",
      roughness: 0.28,
      metalness: 0.9,
      emissive: "#8a5510",
      emissiveIntensity: 0.28,
    }),
  );
  const saffronMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e2761f",
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#5a3a24", roughness: 0.88 }));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#4e3c2c", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a6a38", roughness: 0.95, flatShading: true }),
  );
  const reedMat = track(
    new THREE.MeshStandardMaterial({
      color: "#6a7a3c",
      roughness: 0.92,
      side: THREE.DoubleSide,
    }),
  );
  const clayMat = track(new THREE.MeshStandardMaterial({ color: "#8a6a48", roughness: 0.98 }));
  const waterMat = track(
    new THREE.MeshStandardMaterial({
      color: "#3a7a78",
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.82,
    }),
  );
  const cityMat = track(
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0 }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(128, 128, 120, 120));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const scrubA = new THREE.Color("#7a7840");
  const scrubB = new THREE.Color("#9a8c54");
  const rock = new THREE.Color("#7a7264");
  const summit = new THREE.Color("#b4aa90");
  const urban = new THREE.Color("#a89f8c");
  const dust = new THREE.Color("#bda87f");
  const clay = new THREE.Color("#8a6848");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const q = Math.hypot(x - QUARRY.x, z - QUARRY.z);
    if (q < QUARRY.r - 0.4) {
      tmp.copy(clay).lerp(rock, colorRnd() * 0.35);
    } else if (r < HILL.plateauR + 0.6) {
      tmp.copy(summit).lerp(rock, colorRnd() * 0.25);
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
  const ground = new THREE.Mesh(
    groundGeo,
    track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const base = new THREE.Mesh(track(new THREE.BoxGeometry(124, 24, 124)), basaltDarkMat);
  base.position.y = -12.4;
  scene.add(base);

  /* --- quarry water (rises in the monsoon) --- */

  const water = new THREE.Mesh(track(new THREE.CircleGeometry(QUARRY.r - 1.1, 36)), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(QUARRY.x, QUARRY.waterYDry, QUARRY.z);
  scene.add(water);
  const clayFloor = new THREE.Mesh(track(new THREE.CircleGeometry(QUARRY.r - 1.4, 28)), clayMat);
  clayFloor.rotation.x = -Math.PI / 2;
  clayFloor.position.set(QUARRY.x, QUARRY.waterYDry - 0.35, QUARRY.z);
  scene.add(clayFloor);

  /* --- shrine --- */

  const flag = new THREE.Mesh(track(new THREE.PlaneGeometry(2.6, 1.6, 10, 5)), saffronMat);
  {
    const y = HILL.plateauY;
    const plinth = new THREE.Mesh(
      track(new THREE.BoxGeometry(SHRINE.plinthW, SHRINE.plinthH, SHRINE.plinthD)),
      stoneMat,
    );
    plinth.position.set(SHRINE.x, y + SHRINE.plinthH / 2, SHRINE.z);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const cella = new THREE.Mesh(
      track(new THREE.BoxGeometry(SHRINE.cellaW, SHRINE.cellaH, SHRINE.cellaW)),
      basaltMat,
    );
    cella.position.set(SHRINE.x, y + SHRINE.plinthH + SHRINE.cellaH / 2, SHRINE.z);
    cella.castShadow = true;
    cella.receiveShadow = true;
    scene.add(cella);

    const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 1.8, 0.12)), basaltDarkMat);
    door.position.set(SHRINE.x, y + SHRINE.plinthH + 0.9, SHRINE.z + SHRINE.cellaW / 2 + 0.02);
    scene.add(door);

    const shikhara = new THREE.Mesh(track(new THREE.ConeGeometry(2.1, 3.6, 8)), basaltDarkMat);
    shikhara.position.set(SHRINE.x, y + SHRINE.plinthH + SHRINE.cellaH + 1.8, SHRINE.z);
    shikhara.castShadow = true;
    scene.add(shikhara);

    const kalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 10, 8)), goldMat);
    kalash.position.set(SHRINE.x, y + SHRINE.plinthH + SHRINE.cellaH + 3.75, SHRINE.z);
    kalash.castShadow = true;
    scene.add(kalash);

    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.06, 3.2, 6)), goldMat);
    pole.position.set(SHRINE.x, y + SHRINE.plinthH + SHRINE.cellaH + 5.1, SHRINE.z);
    scene.add(pole);
    flag.position.set(SHRINE.x + 1.3, y + SHRINE.plinthH + SHRINE.cellaH + 5.6, SHRINE.z);
    flag.castShadow = true;
    scene.add(flag);

    const lamp = new THREE.PointLight("#ffb45e", 8, 16, 1.8);
    lamp.position.set(SHRINE.x, y + SHRINE.plinthH + 1.4, SHRINE.z + 1.6);
    scene.add(lamp);
    (scene.userData as { shrineLamp: THREE.PointLight }).shrineLamp = lamp;
  }

  /* --- south parapet (city panorama) --- */

  {
    const segGeo = track(new THREE.BoxGeometry(1.5, 0.7, 0.38));
    const count = 18;
    const parapet = new THREE.InstancedMesh(segGeo, basaltMat, count);
    parapet.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const a = -0.7 + t * 1.4;
      const x = Math.sin(a) * 14.2;
      const z = Math.cos(a) * 14.2;
      const y = Math.max(groundHeight(x, z), HILL.plateauY - 2);
      e.set(0, a, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y + 0.4, z), q, new THREE.Vector3(1, 1, 1));
      parapet.setMatrixAt(i, m);
    }
    parapet.instanceMatrix.needsUpdate = true;
    scene.add(parapet);
  }

  /* --- benches --- */

  for (const p of layout.props) {
    if (p.kind !== "bench") continue;
    const seat = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.16, 0.55)), woodMat);
    seat.position.set(p.x, p.y + 0.5, p.z);
    seat.castShadow = true;
    scene.add(seat);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.5, 0.46)), basaltDarkMat);
      leg.position.set(p.x + side * 0.85, p.y + 0.25, p.z);
      scene.add(leg);
    }
  }

  /* --- quarry rim rocks + reeds --- */

  {
    const rockGeo = track(new THREE.DodecahedronGeometry(1.1, 0));
    const rocks = layout.props.filter((p) => p.kind === "quarry-rock");
    const mesh = new THREE.InstancedMesh(rockGeo, basaltDarkMat, rocks.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    rocks.forEach((r, i) => {
      e.set(r.scale * 0.3, r.x, r.scale * 0.2);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(r.x, r.y + 0.5 * r.scale, r.z),
        q,
        new THREE.Vector3(r.scale, r.scale * 0.7, r.scale),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    const reeds = layout.props.filter((p) => p.kind === "reed");
    const blade = track(new THREE.PlaneGeometry(0.18, 1.6));
    const reedMesh = new THREE.InstancedMesh(blade, reedMat, reeds.length);
    reeds.forEach((r, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.x);
      m.compose(
        new THREE.Vector3(r.x, r.y + 0.7 * r.scale, r.z),
        q,
        new THREE.Vector3(r.scale, r.scale, r.scale),
      );
      reedMesh.setMatrixAt(i, m);
    });
    reedMesh.instanceMatrix.needsUpdate = true;
    scene.add(reedMesh);
  }

  /* --- trail stones --- */

  {
    const stones = layout.props.filter((p) => p.kind === "trail-stone");
    const geo = track(new THREE.BoxGeometry(1.5, 0.16, 0.85));
    const mesh = new THREE.InstancedMesh(geo, stoneMat, stones.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    stones.forEach((s, i) => {
      m.compose(new THREE.Vector3(s.x, s.y + 0.08, s.z), q, new THREE.Vector3(s.scale, 1, s.scale));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }

  /* --- ridge rocks + cairn --- */

  {
    const rocks = layout.props.filter((p) => p.kind === "ridge-rock");
    const geo = track(new THREE.DodecahedronGeometry(1.3, 0));
    const mesh = new THREE.InstancedMesh(geo, basaltMat, rocks.length);
    mesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    rocks.forEach((r, i) => {
      e.set(0.2, r.z, 0.15);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(r.x, r.y + 0.6 * r.scale, r.z),
        q,
        new THREE.Vector3(r.scale * 1.1, r.scale * 0.65, r.scale),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    for (const p of layout.props) {
      if (p.kind !== "cairn") continue;
      for (let k = 0; k < 3; k++) {
        const rock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.35 - k * 0.06, 0)), stoneMat);
        rock.position.set(p.x, p.y + k * 0.32, p.z);
        rock.castShadow = true;
        scene.add(rock);
      }
    }
  }

  /* --- scrub trees --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.16, 0.28, 2.4, 5));
    const canopyGeo = track(new THREE.IcosahedronGeometry(0.85, 0));
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
        new THREE.Vector3(t.x, t.y + 1.2 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (1.7 - k * 0.45) * t.scale;
        e.set(rnd() * 0.6, rnd() * Math.PI, rnd() * 0.6);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 0.9,
            t.y + (2.5 + k * 0.85) * t.scale,
            t.z + (rnd() - 0.5) * 0.9,
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

  /* --- city --- */

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
      m.compose(new THREE.Vector3(b.x, gy + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
      city.setMatrixAt(i, m);
      color.set(tones[Math.floor(rnd() * tones.length)]);
      city.setColorAt(i, color);
      if (b.h > 6) cityLightPositions.push(b.x, gy + b.h + 0.4, b.z);
    });
    city.instanceMatrix.needsUpdate = true;
    if (city.instanceColor) city.instanceColor.needsUpdate = true;
    scene.add(city);
  }

  const cityLightMat = track(
    new THREE.PointsMaterial({
      size: 1.4,
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

  /* --- birds --- */

  const BIRDS = 11;
  const birdGeo = track(new THREE.BufferGeometry());
  const birdSeed: number[] = [];
  {
    const arr = new Float32Array(BIRDS * 3);
    const rnd = mulberry32(21);
    for (let i = 0; i < BIRDS; i++) birdSeed.push(rnd() * 100);
    birdGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const birdMat = track(
    new THREE.PointsMaterial({ color: "#241d18", size: 1.35, sizeAttenuation: true }),
  );
  scene.add(new THREE.Points(birdGeo, birdMat));

  /* --- monsoon rain --- */

  const RAIN = 220;
  const rainGeo = track(new THREE.BufferGeometry());
  {
    const arr = new Float32Array(RAIN * 2 * 3);
    const rnd = mulberry32(99);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 90;
      const z = (rnd() - 0.5) * 90;
      const y = rnd() * 50;
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
    new THREE.LineBasicMaterial({ color: "#c8d8e8", transparent: true, opacity: 0 }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

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
  const ringGeo = track(new THREE.RingGeometry(2.2, 2.8, 36));
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 4.2, 0));
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

  /* --- camera --- */

  const spherical = { radius: 280, phi: 0.42, theta: HOME.theta - 0.85 };
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

  const clock = new THREE.Clock();
  let paused = false;
  let ready = false;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 28, 0);
  const monsoonSky = new THREE.Color("#1a3048");
  const monsoonFog = new THREE.Color("#8aa0a4");
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
    cur.wet = damp(cur.wet, seasonTarget, 2.2, dt);
    updateSunDir();

    if (cur.wet > 0.01) {
      cur.skyTop.lerp(monsoonSky, cur.wet * 0.35);
      cur.fog.lerp(monsoonFog, cur.wet * 0.4);
    }

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.8 + cur.wet * 0.2;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.38);
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    fog.near = 160 - cur.wet * 50;
    fog.far = 520 - cur.wet * 140;
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    leafMat.color.setRGB(
      THREE.MathUtils.lerp(0.42, 0.16, cur.wet),
      THREE.MathUtils.lerp(0.42, 0.56, cur.wet),
      THREE.MathUtils.lerp(0.22, 0.28, cur.wet),
    );
    reedMat.color.setRGB(
      THREE.MathUtils.lerp(0.42, 0.22, cur.wet),
      THREE.MathUtils.lerp(0.48, 0.55, cur.wet),
      THREE.MathUtils.lerp(0.24, 0.26, cur.wet),
    );
    water.position.y = THREE.MathUtils.lerp(QUARRY.waterYDry, QUARRY.waterYWet, cur.wet);
    waterMat.opacity = 0.35 + cur.wet * 0.5;
    waterMat.color.setRGB(
      THREE.MathUtils.lerp(0.42, 0.18, cur.wet),
      THREE.MathUtils.lerp(0.48, 0.5, cur.wet),
      THREE.MathUtils.lerp(0.38, 0.48, cur.wet),
    );

    goldMat.emissiveIntensity = 0.14 + cur.lantern * 0.32;
    const shrineLamp = (scene.userData as { shrineLamp?: THREE.PointLight }).shrineLamp;
    if (shrineLamp) shrineLamp.intensity = 4 + cur.lantern * 10;
    cityLightMat.opacity = cur.lantern * 0.55;

    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.5;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - 46 * dt;
        if (y < 0) y = 52;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.4);
      }
      attr.needsUpdate = true;
    }

    if (motion) {
      const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
      const wind = 0.38 + cur.wet * 0.28;
      for (let i = 0; i < attr.count; i++) {
        const x = flagBaseX[i];
        const u = (x + 1.3) / 2.6;
        attr.setZ(i, Math.sin(u * 6 - elapsed * 5) * wind * u);
      }
      attr.needsUpdate = true;
    }

    if (motion) {
      const attr = birdGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < BIRDS; i++) {
        const s = birdSeed[i];
        const r = 26 + (i % 4) * 5;
        const a = elapsed * (0.07 + (i % 3) * 0.016) + s;
        attr.setXYZ(
          i,
          Math.cos(a) * r,
          26 + Math.sin(elapsed * 0.5 + s) * 3 + (i % 3) * 2,
          Math.sin(a) * r,
        );
      }
      attr.needsUpdate = true;
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
        marker.base.y + 4.2 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.28 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(280, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.42, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.85, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.038;
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
