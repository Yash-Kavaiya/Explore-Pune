/**
 * Procedural three.js diorama of Sinhagad Fort — a Sahyadri hill fort, not a
 * flat palace plan. Zero external assets; geometry is generated at runtime.
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
  type TimeOfDay as CoreTimeOfDay,
} from "@/components/places/three/diorama-core";

export { supportsWebGL } from "@/components/places/three/diorama-core";
export type { Season } from "@/components/places/three/diorama-core";

/** Sinhagad adds a crisp winter midday and a full winter-moon night to the shared set. */
export type TimeOfDay = CoreTimeOfDay | "noon" | "moonlight";

export type FeatureId =
  | "kalyan-darwaja"
  | "tanaji-memorial"
  | "trek-trail"
  | "lookout"
  | "hilltop-stalls"
  | "pune-darwaja"
  | "kadelot-point";

export type SinhagadWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type SinhagadWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "kalyan-darwaja",
  "tanaji-memorial",
  "trek-trail",
  "lookout",
  "hilltop-stalls",
  "pune-darwaja",
  "kadelot-point",
];

/* ------------------------------------------------------------------ */
/* Pure layout                                                         */
/* ------------------------------------------------------------------ */

/** Plateau half-extents of the fort top (world XZ). */
export const PLATEAU = { halfW: 22, halfD: 16, height: 18 } as const;

export type SinhagadPropKind =
  | "bastion"
  | "wall"
  | "stall"
  | "tree"
  | "trail-step"
  | "memorial"
  | "flag"
  | "crag"
  | "cairn";

export type SinhagadPropSpec = {
  kind: SinhagadPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export function buildSinhagadLayout(seed = 1670): {
  props: SinhagadPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  trailSteps: number;
  stallCount: number;
} {
  const rnd = mulberry32(seed);
  const props: SinhagadPropSpec[] = [];
  const push = (p: SinhagadPropSpec) => props.push(p);
  const H = PLATEAU.height;

  // Bastions at corners + mid walls
  const bastions: [number, number][] = [
    [-PLATEAU.halfW, -PLATEAU.halfD],
    [PLATEAU.halfW, -PLATEAU.halfD],
    [-PLATEAU.halfW, PLATEAU.halfD],
    [PLATEAU.halfW, PLATEAU.halfD],
    [0, -PLATEAU.halfD],
    [0, PLATEAU.halfD],
    [-PLATEAU.halfW, 0],
    [PLATEAU.halfW, 0],
  ];
  for (const [x, z] of bastions) {
    push({ kind: "bastion", x, y: H, z, scale: 1, feature: null });
  }

  // Trail steps climbing from SE base toward Pune Darwaja
  let trailSteps = 0;
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const x = 8 + (rnd() - 0.5) * 2.5;
    const z = 38 - t * 22;
    const y = t * H * 0.95;
    push({
      kind: "trail-step",
      x,
      y,
      z,
      scale: 1,
      feature: "trek-trail",
    });
    trailSteps++;
  }

  // Hilltop stalls near centre-east
  let stallCount = 0;
  for (let i = 0; i < 8; i++) {
    push({
      kind: "stall",
      x: 4 + (i % 4) * 3.2 + (rnd() - 0.5),
      y: H + 0.1,
      z: 2 + Math.floor(i / 4) * 4 + (rnd() - 0.5),
      scale: 0.9 + rnd() * 0.25,
      feature: "hilltop-stalls",
    });
    stallCount++;
  }

  // Memorial marker props on SW cliff
  push({
    kind: "memorial",
    x: -12,
    y: H + 0.2,
    z: -14,
    scale: 1,
    feature: "tanaji-memorial",
  });
  push({
    kind: "flag",
    x: -12,
    y: H + 4,
    z: -14,
    scale: 1,
    feature: "tanaji-memorial",
  });

  // Lookout props on NW rim
  for (let i = 0; i < 3; i++) {
    push({
      kind: "wall",
      x: -8 + i * 4,
      y: H + 1.2,
      z: -PLATEAU.halfD + 0.5,
      scale: 1,
      feature: "lookout",
    });
  }

  // Gate-associated props
  push({
    kind: "wall",
    x: -PLATEAU.halfW + 1,
    y: H + 2,
    z: 0,
    scale: 1.2,
    feature: "kalyan-darwaja",
  });
  push({
    kind: "wall",
    x: PLATEAU.halfW - 1,
    y: H + 2,
    z: 4,
    scale: 1.2,
    feature: "pune-darwaja",
  });

  // Kadelot Point — bare rock prow jutting south of the ramparts (x -20..-2 wall line)
  const crags: [number, number, number, number][] = [
    // x, z, y, scale — heights follow the rim terrain (~17.9 falling south)
    [-15.6, 17.2, 17.6, 1.15],
    [-13.9, 17.8, 17.3, 0.95],
    [-12.3, 16.9, 17.7, 0.8],
    [-14.7, 18.8, 16.9, 0.7],
  ];
  for (const [x, z, y, scale] of crags) {
    push({ kind: "crag", x, y, z, scale, feature: "kadelot-point" });
  }
  // Small stone cairn on the prow
  push({ kind: "cairn", x: -14, y: 17.9, z: 17.3, scale: 1, feature: "kadelot-point" });

  // Trees on lower slopes
  let guard = 0;
  while (props.filter((p) => p.kind === "tree").length < 36 && guard < 2000) {
    guard++;
    const x = (rnd() - 0.5) * 90;
    const z = (rnd() - 0.5) * 90;
    if (Math.abs(x) < PLATEAU.halfW + 6 && Math.abs(z) < PLATEAU.halfD + 6) continue;
    if (Math.hypot(x, z) > 48) continue;
    if (props.some((p) => p.kind === "tree" && Math.hypot(p.x - x, p.z - z) < 5)) continue;
    const r = Math.hypot(x, z);
    const y = Math.max(0, H * (1 - r / 55) * 0.7);
    push({ kind: "tree", x, y, z, scale: 0.7 + rnd() * 0.6, feature: null });
  }

  /**
   * Marker anchors. Each base is the exact walkable/feature surface point —
   * the ground ring rests at base + 0.2 and the numbered sprite hovers at
   * base + MARKER_LIFT, so nothing floats mid-air or clips a wall, step or
   * stall roof. XZ keeps clear of piers, rails and plinth edges.
   */
  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    // On the western approach slope, squarely facing the gate mouth (terrain ≈ 12.5)
    "kalyan-darwaja": { x: -25, y: 12.55, z: 0 },
    // Centred on the memorial plinth top (plinth surface H + 0.65)
    "tanaji-memorial": { x: -12, y: H + 0.65, z: -14 },
    // At the trailhead beside the first step, clear of the staircase (hollow ≈ -0.5)
    "trek-trail": { x: 8, y: 0.1, z: 40.5 },
    // On the lookout pad (pad surface H + 0.45), inside the rail line
    lookout: { x: -4, y: H + 0.45, z: -14.5 },
    // Open ground just south of the stall roofs (plateau surface H)
    "hilltop-stalls": { x: 8, y: H, z: 10.5 },
    // On the eastern approach, facing the Pune gate (terrain ≈ 12.7)
    "pune-darwaja": { x: 25, y: 12.65, z: 4 },
    // On open plateau behind the prow, just inside the south wall face
    "kadelot-point": { x: -14, y: H, z: 13 },
  };

  return { props, propCount: props.length, markerBases, trailSteps, stallCount };
}

/** Sprite hover height above each marker base (ring rests at +0.2). */
export const MARKER_LIFT = 3.2;

/** Rings that need a smaller radius to sit fully on their structure. */
export const MARKER_RING_SCALE: Partial<Record<FeatureId, number>> = {
  "tanaji-memorial": 0.75, // fits within the 4 × 3.2 plinth top
  lookout: 0.7, // fits between the rails on the 10 × 3.5 pad
};

export function getSinhagadAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  const H = PLATEAU.height;
  return {
    "kalyan-darwaja": {
      target: [-PLATEAU.halfW, H + 2, 0],
      dir: [-0.85, 0.35, 0.2],
      distance: 36,
    },
    "tanaji-memorial": {
      target: [-12, H + 1.5, -14],
      dir: [-0.5, 0.45, -0.75],
      distance: 28,
    },
    "trek-trail": {
      target: [8, H * 0.36, 30],
      dir: [0.35, 0.55, 0.75],
      distance: 40,
    },
    lookout: {
      target: [-4, H + 2, -PLATEAU.halfD],
      dir: [-0.2, 0.5, -0.85],
      distance: 34,
    },
    "hilltop-stalls": {
      target: [8, H + 1, 4],
      dir: [0.55, 0.5, 0.65],
      distance: 30,
    },
    "pune-darwaja": {
      target: [PLATEAU.halfW, H + 2, 4],
      dir: [0.85, 0.35, 0.35],
      distance: 36,
    },
    "kadelot-point": {
      target: [-14, H + 1.3, 15],
      dir: [-0.35, 0.5, 0.85],
      distance: 26,
    },
  };
}

export function getSinhagadHomeView() {
  return {
    target: [2, PLATEAU.height * 0.55, 8] as [number, number, number],
    radius: 78,
    phi: 1.05,
    theta: 0.55,
  };
}

export function getSinhagadPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a3558",
    skyBottom: "#f0d4b8",
    sun: "#ffd8b0",
    sunIntensity: 2.3,
    hemiSky: "#a8c4e8",
    hemiGround: "#5a4a36",
    ambient: 0.82,
    fog: "#e4d2bc",
    waterDeep: "#2b5a63",
    waterShallow: "#7fb2b4",
    lantern: 0.15,
    sunAzimuth: 2.2,
    sunElevation: 0.32,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#3e2438",
    skyBottom: "#ffc98a",
    sun: "#ffb86a",
    sunIntensity: 3.0,
    hemiSky: "#c8d4f0",
    hemiGround: "#6b5234",
    ambient: 0.8,
    fog: "#efcfa4",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.25,
    sunAzimuth: -0.65,
    sunElevation: 0.35,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060820",
    skyBottom: "#382050",
    sun: "#8a78d0",
    sunIntensity: 0.35,
    hemiSky: "#2a3464",
    hemiGround: "#1a1422",
    ambient: 0.34,
    fog: "#221a36",
    waterDeep: "#0b1730",
    waterShallow: "#26456b",
    lantern: 1,
    sunAzimuth: -1.25,
    sunElevation: 0.05,
    exposure: 1.16,
  },
  noon: {
    skyTop: "#2a6ab8",
    skyBottom: "#d8eaf8",
    sun: "#fff4e0",
    sunIntensity: 3.4,
    hemiSky: "#b8d4f4",
    hemiGround: "#7a6a48",
    ambient: 0.95,
    fog: "#d8e0e8",
    waterDeep: "#2a6878",
    waterShallow: "#88c0c4",
    lantern: 0,
    sunAzimuth: 0.1,
    sunElevation: 0.72,
    exposure: 1.02,
  },
  moonlight: {
    skyTop: "#040818",
    skyBottom: "#121a38",
    sun: "#a8b8e0",
    sunIntensity: 0.55,
    hemiSky: "#1a2848",
    hemiGround: "#101018",
    ambient: 0.28,
    fog: "#101828",
    waterDeep: "#081428",
    waterShallow: "#1a3858",
    lantern: 0.35,
    sunAzimuth: 1.8,
    sunElevation: 0.28,
    exposure: 1.08,
  },
};

/* ------------------------------------------------------------------ */
/* Terrain helpers                                                     */
/* ------------------------------------------------------------------ */

/** Height of the hill massif at XZ — plateau on top, steep flanks. */
export function massifHeight(x: number, z: number): number {
  const H = PLATEAU.height;
  const nx = Math.abs(x) / (PLATEAU.halfW + 8);
  const nz = Math.abs(z) / (PLATEAU.halfD + 10);
  const ridge = Math.max(nx, nz * 0.95);
  let h = H * (1 - smoothstep(0.55, 1.35, ridge));
  // Slight irregularity on slopes
  h += 1.2 * Math.sin(x * 0.12) * Math.cos(z * 0.1) * smoothstep(0.4, 1.1, ridge);
  // Cliff accent near Tanaji side (SW)
  if (x < -6 && z < -8) {
    const cliff = smoothstep(-6, -18, x) * smoothstep(-8, -20, z);
    h -= 2.5 * cliff;
  }
  // Plateau falloff for diorama edge
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 52;
  if (outside > -1) h -= 16 * smoothstep(-1, 3, outside);
  return Math.max(h, -0.5);
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export function createSinhagadWorld(
  container: HTMLElement,
  options: SinhagadWorldOptions,
): SinhagadWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildSinhagadLayout();
  const anchorsRaw = getSinhagadAnchors();
  const homeRaw = getSinhagadHomeView();

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
    600,
  );
  const fog = new THREE.Fog("#efcfa4", 80, 280);
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
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);

  const rockMat = track(
    new THREE.MeshStandardMaterial({ color: "#8a7a66", roughness: 0.95, flatShading: true }),
  );
  const rockDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a5a4a", roughness: 0.95, flatShading: true }),
  );
  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#9d8f7c", roughness: 0.92 }),
  );
  const grassMat = track(
    new THREE.MeshStandardMaterial({ color: "#5a7a42", roughness: 0.95, flatShading: true }),
  );
  const teakMat = track(new THREE.MeshStandardMaterial({ color: "#5a3420", roughness: 0.85 }));
  const clothMat = track(
    new THREE.MeshStandardMaterial({
      color: "#c45a28",
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  const flagMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e2761f",
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8d0c4", roughness: 0.7 }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#4a3828", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a7a3c", roughness: 0.95, flatShading: true }),
  );

  /* --- massif terrain --- */

  {
    const groundGeo = track(new THREE.PlaneGeometry(110, 110, 96, 96));
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const rock = new THREE.Color("#8a7a66");
    const rockD = new THREE.Color("#6a5a48");
    const grass = new THREE.Color("#5f8248");
    const grassD = new THREE.Color("#4a6a38");
    const tmp = new THREE.Color();
    const rnd = mulberry32(11);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = massifHeight(x, z);
      pos.setY(i, y);
      const onTop =
        Math.abs(x) < PLATEAU.halfW - 1 && Math.abs(z) < PLATEAU.halfD - 1 && y > PLATEAU.height - 2;
      if (onTop) {
        tmp.copy(grassD).lerp(grass, 0.4 + rnd() * 0.5);
      } else {
        tmp.copy(rockD).lerp(rock, rnd() * 0.6);
        if (y > PLATEAU.height * 0.55) tmp.lerp(grass, 0.25);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    groundGeo.computeVertexNormals();
    groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(
      groundGeo,
      track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })),
    );
    ground.receiveShadow = true;
    ground.castShadow = true;
    scene.add(ground);

    const base = new THREE.Mesh(
      track(new THREE.CylinderGeometry(58, 62, 12, 36)),
      rockDarkMat,
    );
    base.position.y = -8;
    scene.add(base);
  }

  const H = PLATEAU.height;

  /* --- fort walls on plateau --- */

  {
    const wallH = 3.4;
    const wallT = 1.4;
    const addWall = (cx: number, cz: number, len: number, horizontal: boolean) => {
      const geo = horizontal
        ? new THREE.BoxGeometry(len, wallH, wallT)
        : new THREE.BoxGeometry(wallT, wallH, len);
      const mesh = new THREE.Mesh(track(geo), stoneMat);
      mesh.position.set(cx, H + wallH / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };
    // North / south with gate gaps
    addWall(-11, -PLATEAU.halfD, 18, true);
    addWall(11, -PLATEAU.halfD, 18, true);
    addWall(-11, PLATEAU.halfD, 18, true);
    addWall(12, PLATEAU.halfD, 16, true);
    // West / east with gate gaps
    addWall(-PLATEAU.halfW, -6, 16, false);
    addWall(-PLATEAU.halfW, 8, 12, false);
    addWall(PLATEAU.halfW, -6, 14, false);
    addWall(PLATEAU.halfW, 10, 10, false);

    // Merlons
    const merlonGeo = track(new THREE.BoxGeometry(1.2, 1.1, wallT * 0.85));
    const merlonPos: { x: number; z: number }[] = [];
    for (let i = 0; i < 12; i++) {
      merlonPos.push({ x: -PLATEAU.halfW + 2 + i * 3.5, z: -PLATEAU.halfD });
      merlonPos.push({ x: -PLATEAU.halfW + 2 + i * 3.5, z: PLATEAU.halfD });
    }
    for (let i = 0; i < 8; i++) {
      merlonPos.push({ x: -PLATEAU.halfW, z: -PLATEAU.halfD + 2 + i * 3.8 });
      merlonPos.push({ x: PLATEAU.halfW, z: -PLATEAU.halfD + 2 + i * 3.8 });
    }
    const merlons = new THREE.InstancedMesh(merlonGeo, stoneMat, merlonPos.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    merlonPos.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, H + wallH + 0.5, p.z), q, new THREE.Vector3(1, 1, 1));
      merlons.setMatrixAt(i, m);
    });
    merlons.instanceMatrix.needsUpdate = true;
    merlons.castShadow = true;
    scene.add(merlons);
  }

  /* --- bastions --- */

  for (const p of layout.props.filter((x) => x.kind === "bastion")) {
    const tower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.6, 3.0, 4.5, 12)),
      stoneMat,
    );
    tower.position.set(p.x, H + 2.2, p.z);
    tower.castShadow = true;
    scene.add(tower);
    const cap = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.9, 2.7, 0.55, 12)),
      rockDarkMat,
    );
    cap.position.set(p.x, H + 4.5, p.z);
    cap.castShadow = true;
    scene.add(cap);
  }

  /* --- gates --- */

  const makeGate = (x: number, z: number, faceX: boolean) => {
    const g = new THREE.Group();
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 5.5, 2.8)), stoneMat);
      if (faceX) pier.position.set(x, H + 2.75, z + side * 3.2);
      else pier.position.set(x + side * 3.2, H + 2.75, z);
      pier.castShadow = true;
      g.add(pier);
    }
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(faceX ? 3 : 8, 1.4, faceX ? 8 : 3)), stoneMat);
    lintel.position.set(x, H + 5.6, z);
    lintel.castShadow = true;
    g.add(lintel);
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(faceX ? 0.4 : 4.2, 4, faceX ? 4.2 : 0.4)), teakMat);
    door.position.set(x + (faceX ? 0.2 : 0), H + 2.1, z + (faceX ? 0 : 0.2));
    g.add(door);
    scene.add(g);
  };
  makeGate(-PLATEAU.halfW, 0, true); // Kalyan
  makeGate(PLATEAU.halfW, 4, true); // Pune

  /* --- Tanaji memorial --- */

  {
    const mx = -12;
    const mz = -14;
    const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(4, 0.6, 3.2)), marbleMat);
    plinth.position.set(mx, H + 0.35, mz);
    plinth.castShadow = true;
    scene.add(plinth);
    const stone = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 2.4, 0.5)), marbleMat);
    stone.position.set(mx, H + 1.8, mz);
    stone.castShadow = true;
    scene.add(stone);
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.1, 5, 6)), rockDarkMat);
    pole.position.set(mx + 1.4, H + 2.8, mz);
    scene.add(pole);
    const flag = new THREE.Mesh(track(new THREE.PlaneGeometry(2.8, 1.6, 8, 4)), flagMat);
    flag.position.set(mx + 2.8, H + 4.6, mz);
    flag.castShadow = true;
    scene.add(flag);
    // Store for wind
    (flag.userData as { restX: Float32Array }).restX = (() => {
      const attr = flag.geometry.attributes.position as THREE.BufferAttribute;
      const a = new Float32Array(attr.count);
      for (let i = 0; i < attr.count; i++) a[i] = attr.getX(i);
      return a;
    })();
    scene.userData.tanajiFlag = flag;
  }

  /* --- trail steps --- */

  {
    const stepGeo = track(new THREE.BoxGeometry(2.4, 0.35, 1.1));
    const steps = layout.props.filter((p) => p.kind === "trail-step");
    const mesh = new THREE.InstancedMesh(stepGeo, rockMat, steps.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    steps.forEach((s, i) => {
      m.compose(new THREE.Vector3(s.x, s.y + 0.15, s.z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }

  /* --- stalls --- */

  for (const s of layout.props.filter((p) => p.kind === "stall")) {
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 1.1, 1.8)), teakMat);
    base.position.set(s.x, H + 0.55, s.z);
    base.scale.setScalar(s.scale);
    base.castShadow = true;
    scene.add(base);
    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.12, 2.2)), clothMat);
    roof.position.set(s.x, H + 1.7 * s.scale, s.z);
    roof.scale.setScalar(s.scale);
    scene.add(roof);
    // Smoke-ish stack of bhaji plates
    const pile = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.4, 0.35, 8)), rockMat);
    pile.position.set(s.x + 0.4, H + 1.25 * s.scale, s.z);
    scene.add(pile);
  }

  /* --- lookout platform --- */

  {
    const pad = new THREE.Mesh(track(new THREE.BoxGeometry(10, 0.4, 3.5)), stoneMat);
    pad.position.set(-4, H + 0.25, -PLATEAU.halfD + 1.5);
    pad.castShadow = true;
    scene.add(pad);
    for (const ox of [-3, 0, 3]) {
      const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6)), teakMat);
      post.position.set(-4 + ox, H + 1.0, -PLATEAU.halfD + 0.4);
      scene.add(post);
    }
    const rail = new THREE.Mesh(track(new THREE.BoxGeometry(9, 0.12, 0.12)), teakMat);
    rail.position.set(-4, H + 1.6, -PLATEAU.halfD + 0.4);
    scene.add(rail);
  }

  /* --- trees on slopes --- */

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.22, 0.32, 2.8, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1.4, 0));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    trees.forEach((t, i) => {
      const y = massifHeight(t.x, t.z);
      m.compose(
        new THREE.Vector3(t.x, y + 1.4 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(t.x, y + 3.2 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale * 1.4, t.scale * 1.1, t.scale * 1.4),
      );
      canopies.setMatrixAt(i, m);
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    scene.add(trunks);
    scene.add(canopies);
  }

  /* --- reservoirs (blue discs in the distance) --- */

  {
    const waterMat = track(
      new THREE.MeshStandardMaterial({
        color: "#3a7a8a",
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85,
      }),
    );
    const k = new THREE.Mesh(track(new THREE.CircleGeometry(14, 28)), waterMat);
    k.rotation.x = -Math.PI / 2;
    k.position.set(18, 1.2, 42);
    scene.add(k);
    const p = new THREE.Mesh(track(new THREE.CircleGeometry(10, 24)), waterMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(-22, 0.8, 40);
    scene.add(p);
  }

  /* --- rain + dust --- */

  const RAIN = 480;
  const rainGeo = track(new THREE.BufferGeometry());
  {
    const arr = new Float32Array(RAIN * 6);
    const rnd = mulberry32(77);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 100;
      const y = rnd() * 60;
      const z = (rnd() - 0.5) * 100;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y + 1.5;
      arr[i * 6 + 5] = z;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const rainMat = track(
    new THREE.LineBasicMaterial({ color: "#cfe2f2", transparent: true, opacity: 0 }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);

  const DUST = 70;
  const dustGeo = track(new THREE.BufferGeometry());
  const dustSeed: number[] = [];
  {
    const arr = new Float32Array(DUST * 3);
    const rnd = mulberry32(19);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (rnd() - 0.5) * 80;
      arr[i * 3 + 1] = 5 + rnd() * 25;
      arr[i * 3 + 2] = (rnd() - 0.5) * 80;
      dustSeed.push(rnd() * 100);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.4,
      map: track(radialSprite("rgba(255,240,214,0.9)", "rgba(255,214,150,0.35)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.3,
    }),
  );
  scene.add(new THREE.Points(dustGeo, dustMat));

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
  const ringGeo = track(new THREE.RingGeometry(1.6, 2.1, 36));
  const hitGeo = track(new THREE.SphereGeometry(2.6, 10, 8));

  FEATURE_ORDER.forEach((id, i) => {
    const b = layout.markerBases[id];
    const base = new THREE.Vector3(b.x, b.y, b.z);
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 3, 0));
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
    ring.renderOrder = 19;
    scene.add(ring);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);
    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  /* --- camera --- */

  const spherical = { radius: 180, phi: 0.45, theta: HOME.theta - 0.7 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 28, 140);
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
  const monsoonSky = new THREE.Color("#1a3048");
  const monsoonFog = new THREE.Color("#8a9a90");
  const introFrom = new THREE.Vector3(0, 12, 20);

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
      cur.fog.lerp(monsoonFog, cur.wet * 0.45);
      cur.sunIntensity *= 1 - cur.wet * 0.35;
    }

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.8 + cur.wet * 0.25;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.4);
    sun.position.copy(sunDir).multiplyScalar(140);
    fog.color.copy(cur.fog);
    fog.near = 80 - cur.wet * 25;
    fog.far = 280 - cur.wet * 80;
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    leafMat.color.setRGB(
      THREE.MathUtils.lerp(0.29, 0.18, cur.wet),
      THREE.MathUtils.lerp(0.48, 0.58, cur.wet),
      THREE.MathUtils.lerp(0.24, 0.3, cur.wet),
    );
    grassMat.color.setRGB(
      THREE.MathUtils.lerp(0.35, 0.22, cur.wet),
      THREE.MathUtils.lerp(0.48, 0.58, cur.wet),
      THREE.MathUtils.lerp(0.26, 0.32, cur.wet),
    );

    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.52;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - 44 * dt;
        if (y < 0) y = 55;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.5);
      }
      attr.needsUpdate = true;
    }
    dustMat.opacity = (1 - cur.wet) * 0.28;
    if (motion && cur.wet < 0.85) {
      const attr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        attr.setY(i, 5 + ((elapsed * 0.3 + s) % 22));
      }
      attr.needsUpdate = true;
    }

    const tanajiFlag = scene.userData.tanajiFlag as THREE.Mesh | undefined;
    if (tanajiFlag && motion) {
      const rest = (tanajiFlag.userData as { restX: Float32Array }).restX;
      const attr = tanajiFlag.geometry.attributes.position as THREE.BufferAttribute;
      const wind = 0.4 + cur.wet * 0.3;
      for (let i = 0; i < attr.count; i++) {
        const x = rest[i];
        const u = (x + 1.4) / 2.8;
        attr.setZ(i, Math.sin(u * 6 - elapsed * 5) * wind * u);
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
        marker.base.y + 3 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.25 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(180, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.45, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.7, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.035;
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
      desired.phi = clamp(Math.acos(clamp(dir.y, -1, 1)), 0.22, 1.35);
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
