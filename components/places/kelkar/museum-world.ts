/**
 * A hand-built, procedural 3D model of the Raja Dinkar Kelkar Museum.
 *
 * Same approach as the other dioramas (okayama, shaniwar, temple): plain
 * three.js, zero external assets, geometry generated at runtime. The building
 * is a cutaway multi-storey wada-style shell so visitors can read packed
 * gallery floors — display cases, carved doors, brass lamps, instruments,
 * betel cutters, armour and the Mastani Mahal chamber on the top floor.
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
  type Palette,
  type TimeOfDay,
} from "@/components/places/three/diorama-core";

export { supportsWebGL } from "@/components/places/three/diorama-core";
export type { TimeOfDay } from "@/components/places/three/diorama-core";

export type FeatureId =
  | "mastani-mahal"
  | "lamps-gallery"
  | "musical-instruments"
  | "betel-cutters"
  | "carved-doors"
  | "armoury";

/** open = daylight galleries, evening = warm interior lamps. */
export type MuseumMode = "open" | "evening";

export type MuseumWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type MuseumWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: MuseumMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "mastani-mahal",
  "lamps-gallery",
  "musical-instruments",
  "betel-cutters",
  "carved-doors",
  "armoury",
];

/* ------------------------------------------------------------------ */
/* Building constants (pure layout — tested without WebGL)             */
/* ------------------------------------------------------------------ */

/** Building half-width / half-depth on the ground plane. */
export const BUILDING = {
  halfW: 14,
  halfD: 11,
  floors: 3,
  floorH: 4.2,
  wallT: 0.45,
  plinthH: 0.9,
} as const;

export type ExhibitKind =
  | "case"
  | "lamp"
  | "instrument"
  | "cutter"
  | "door"
  | "armour"
  | "vessel"
  | "sculpture";

export type ExhibitSpec = {
  kind: ExhibitKind;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  feature: FeatureId | null;
};

export type FloorPlan = {
  floor: number;
  y: number;
  label: string;
  rooms: { id: string; x: number; z: number; w: number; d: number }[];
};

/**
 * Deterministic multi-floor layout: rooms, exhibit positions, and marker
 * bases. Pure — no three.js objects — so vitest can assert density and ids.
 */
export function buildMuseumLayout(seed = 2026): {
  floors: FloorPlan[];
  exhibits: ExhibitSpec[];
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  propCount: number;
} {
  const rnd = mulberry32(seed);
  const floors: FloorPlan[] = [
    {
      floor: 0,
      y: BUILDING.plinthH,
      label: "Ground — doors & metalwork",
      rooms: [
        { id: "door-hall", x: -6, z: 0, w: 10, d: 16 },
        { id: "armoury-hall", x: 6, z: 0, w: 10, d: 16 },
      ],
    },
    {
      floor: 1,
      y: BUILDING.plinthH + BUILDING.floorH,
      label: "First — lamps & instruments",
      rooms: [
        { id: "lamps", x: -5.5, z: 1, w: 11, d: 14 },
        { id: "instruments", x: 5.5, z: 1, w: 11, d: 14 },
      ],
    },
    {
      floor: 2,
      y: BUILDING.plinthH + BUILDING.floorH * 2,
      label: "Upper — Mastani Mahal & cutters",
      rooms: [
        { id: "mastani", x: 0, z: -1, w: 16, d: 12 },
        { id: "cutters", x: 0, z: 6.5, w: 18, d: 6 },
      ],
    },
  ];

  const exhibits: ExhibitSpec[] = [];
  const push = (spec: ExhibitSpec) => exhibits.push(spec);

  // Ground: carved doors along back and side walls.
  for (let i = 0; i < 8; i++) {
    push({
      kind: "door",
      x: -10.5 + (i % 2) * 1.2,
      y: floors[0].y + 0.05,
      z: -7 + Math.floor(i / 2) * 4.2 + (rnd() - 0.5) * 0.4,
      rotY: Math.PI / 2 + (rnd() - 0.5) * 0.08,
      scale: 0.9 + rnd() * 0.2,
      feature: "carved-doors",
    });
  }
  for (let i = 0; i < 4; i++) {
    push({
      kind: "door",
      x: -6 + i * 3.2,
      y: floors[0].y + 0.05,
      z: -9.2,
      rotY: 0,
      scale: 0.95 + rnd() * 0.15,
      feature: "carved-doors",
    });
  }

  // Ground: armoury & vessels on the east wing.
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    push({
      kind: i % 3 === 0 ? "armour" : i % 3 === 1 ? "vessel" : "sculpture",
      x: 3.5 + col * 2.4 + (rnd() - 0.5) * 0.3,
      y: floors[0].y + 0.05,
      z: -6 + row * 4.5 + (rnd() - 0.5) * 0.4,
      rotY: rnd() * Math.PI * 2,
      scale: 0.75 + rnd() * 0.4,
      feature: "armoury",
    });
  }
  for (let i = 0; i < 6; i++) {
    push({
      kind: "case",
      x: 4 + (i % 3) * 3,
      y: floors[0].y + 0.05,
      z: 5 + Math.floor(i / 3) * 3.2,
      rotY: 0,
      scale: 1,
      feature: "armoury",
    });
  }

  // First floor: lamps gallery (west) + instruments (east).
  for (let i = 0; i < 28; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    push({
      kind: "lamp",
      x: -10 + col * 1.5 + (rnd() - 0.5) * 0.2,
      y: floors[1].y + 0.05 + (row === 0 ? 0 : 0),
      z: -5 + row * 3.2 + (rnd() - 0.5) * 0.25,
      rotY: rnd() * 0.4,
      scale: 0.55 + rnd() * 0.7,
      feature: "lamps-gallery",
    });
  }
  for (let i = 0; i < 8; i++) {
    push({
      kind: "case",
      x: -9 + (i % 4) * 2.6,
      y: floors[1].y + 0.05,
      z: 5.5 + Math.floor(i / 4) * 2.8,
      rotY: 0,
      scale: 0.85,
      feature: "lamps-gallery",
    });
  }

  for (let i = 0; i < 18; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    push({
      kind: "instrument",
      x: 3 + col * 1.7 + (rnd() - 0.5) * 0.2,
      y: floors[1].y + 0.05,
      z: -5.5 + row * 3.5 + (rnd() - 0.5) * 0.3,
      rotY: (rnd() - 0.5) * 0.6,
      scale: 0.8 + rnd() * 0.35,
      feature: "musical-instruments",
    });
  }
  for (let i = 0; i < 5; i++) {
    push({
      kind: "case",
      x: 4 + i * 2.2,
      y: floors[1].y + 0.05,
      z: 6.5,
      rotY: 0,
      scale: 0.9,
      feature: "musical-instruments",
    });
  }

  // Upper: Mastani Mahal interior props + betel cutter cases at the front.
  for (let i = 0; i < 10; i++) {
    push({
      kind: "lamp",
      x: -5 + (i % 5) * 2.5,
      y: floors[2].y + 2.4,
      z: -4 + Math.floor(i / 5) * 4,
      rotY: 0,
      scale: 0.45 + rnd() * 0.2,
      feature: "mastani-mahal",
    });
  }
  for (let i = 0; i < 6; i++) {
    push({
      kind: "sculpture",
      x: -4 + (i % 3) * 4,
      y: floors[2].y + 0.05,
      z: -5 + Math.floor(i / 3) * 5,
      rotY: rnd() * Math.PI,
      scale: 0.7 + rnd() * 0.3,
      feature: "mastani-mahal",
    });
  }
  for (let i = 0; i < 14; i++) {
    push({
      kind: "cutter",
      x: -8 + (i % 7) * 2.4 + (rnd() - 0.5) * 0.15,
      y: floors[2].y + 0.95,
      z: 5.5 + Math.floor(i / 7) * 2.2 + (rnd() - 0.5) * 0.1,
      rotY: rnd() * Math.PI * 2,
      scale: 0.5 + rnd() * 0.4,
      feature: "betel-cutters",
    });
  }
  for (let i = 0; i < 4; i++) {
    push({
      kind: "case",
      x: -6 + i * 4,
      y: floors[2].y + 0.05,
      z: 6.2,
      rotY: 0,
      scale: 0.95,
      feature: "betel-cutters",
    });
  }

  // Extra density: freestanding vessels & cases on every floor corridor.
  for (let floor = 0; floor < 3; floor++) {
    const y = floors[floor].y + 0.05;
    for (let i = 0; i < 6; i++) {
      push({
        kind: i % 2 === 0 ? "vessel" : "case",
        x: (rnd() - 0.5) * 18,
        y,
        z: (rnd() - 0.5) * 14,
        rotY: rnd() * Math.PI,
        scale: 0.7 + rnd() * 0.4,
        feature: null,
      });
    }
  }

  const f0 = floors[0].y;
  const f1 = floors[1].y;
  const f2 = floors[2].y;

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "carved-doors": { x: -7, y: f0 + 3.2, z: -6 },
    armoury: { x: 7, y: f0 + 2.8, z: 1 },
    "lamps-gallery": { x: -6, y: f1 + 2.6, z: 0 },
    "musical-instruments": { x: 6.5, y: f1 + 2.6, z: 0 },
    "mastani-mahal": { x: 0, y: f2 + 3.4, z: -2 },
    "betel-cutters": { x: 0, y: f2 + 2.2, z: 6.5 },
  };

  return {
    floors,
    exhibits,
    markerBases,
    propCount: exhibits.length,
  };
}

export function getMuseumAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  const f0 = BUILDING.plinthH;
  const f1 = BUILDING.plinthH + BUILDING.floorH;
  const f2 = BUILDING.plinthH + BUILDING.floorH * 2;
  return {
    "mastani-mahal": {
      target: [0, f2 + 2.2, -2],
      dir: [0.35, 0.42, 0.84],
      distance: 22,
    },
    "lamps-gallery": {
      target: [-6, f1 + 1.8, 0],
      dir: [-0.7, 0.4, 0.6],
      distance: 20,
    },
    "musical-instruments": {
      target: [6.5, f1 + 1.8, 0],
      dir: [0.72, 0.4, 0.55],
      distance: 20,
    },
    "betel-cutters": {
      target: [0, f2 + 1.4, 6.5],
      dir: [0.15, 0.55, 0.82],
      distance: 16,
    },
    "carved-doors": {
      target: [-7, f0 + 2.2, -6],
      dir: [-0.65, 0.35, -0.67],
      distance: 18,
    },
    armoury: {
      target: [7, f0 + 1.6, 1],
      dir: [0.75, 0.38, 0.54],
      distance: 18,
    },
  };
}

export function getMuseumHomeView() {
  return {
    target: [0, BUILDING.plinthH + BUILDING.floorH * 1.1, 2] as [number, number, number],
    radius: 48,
    phi: 1.05,
    theta: 0.55,
  };
}

export function getMuseumPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1a2f55",
    skyBottom: "#f0d8c4",
    sun: "#ffd8b0",
    sunIntensity: 2.1,
    hemiSky: "#b0c4e4",
    hemiGround: "#6a5642",
    ambient: 0.82,
    fog: "#e8d4c0",
    waterDeep: "#2b5a63",
    waterShallow: "#7fb2b4",
    lantern: 0.35,
    sunAzimuth: 2.2,
    sunElevation: 0.32,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3e2438",
    skyBottom: "#ffc98a",
    sun: "#ffb86a",
    sunIntensity: 2.9,
    hemiSky: "#c8d4f0",
    hemiGround: "#6b5234",
    ambient: 0.78,
    fog: "#efcfa4",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.45,
    sunAzimuth: -0.65,
    sunElevation: 0.35,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060820",
    skyBottom: "#382050",
    sun: "#8a78d0",
    sunIntensity: 0.32,
    hemiSky: "#2a3464",
    hemiGround: "#1a1422",
    ambient: 0.32,
    fog: "#221a36",
    waterDeep: "#0b1730",
    waterShallow: "#26456b",
    lantern: 1,
    sunAzimuth: -1.25,
    sunElevation: 0.05,
    exposure: 1.16,
  },
};

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export function createMuseumWorld(
  container: HTMLElement,
  options: MuseumWorldOptions,
): MuseumWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildMuseumLayout();
  const anchorsRaw = getMuseumAnchors();
  const homeRaw = getMuseumHomeView();

  const ANCHORS: Record<FeatureId, { target: THREE.Vector3; dir: THREE.Vector3; distance: number }> =
    {
      "mastani-mahal": {
        target: new THREE.Vector3(...anchorsRaw["mastani-mahal"].target),
        dir: new THREE.Vector3(...anchorsRaw["mastani-mahal"].dir),
        distance: anchorsRaw["mastani-mahal"].distance,
      },
      "lamps-gallery": {
        target: new THREE.Vector3(...anchorsRaw["lamps-gallery"].target),
        dir: new THREE.Vector3(...anchorsRaw["lamps-gallery"].dir),
        distance: anchorsRaw["lamps-gallery"].distance,
      },
      "musical-instruments": {
        target: new THREE.Vector3(...anchorsRaw["musical-instruments"].target),
        dir: new THREE.Vector3(...anchorsRaw["musical-instruments"].dir),
        distance: anchorsRaw["musical-instruments"].distance,
      },
      "betel-cutters": {
        target: new THREE.Vector3(...anchorsRaw["betel-cutters"].target),
        dir: new THREE.Vector3(...anchorsRaw["betel-cutters"].dir),
        distance: anchorsRaw["betel-cutters"].distance,
      },
      "carved-doors": {
        target: new THREE.Vector3(...anchorsRaw["carved-doors"].target),
        dir: new THREE.Vector3(...anchorsRaw["carved-doors"].dir),
        distance: anchorsRaw["carved-doors"].distance,
      },
      armoury: {
        target: new THREE.Vector3(...anchorsRaw.armoury.target),
        dir: new THREE.Vector3(...anchorsRaw.armoury.dir),
        distance: anchorsRaw.armoury.distance,
      },
    };

  const HOME = {
    target: new THREE.Vector3(...homeRaw.target),
    radius: homeRaw.radius,
    phi: homeRaw.phi,
    theta: homeRaw.theta,
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
    0.4,
    500,
  );
  const fog = new THREE.Fog("#efcfa4", 70, 220);
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
    evening: 0,
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
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(280, 28, 18)), skyMat));

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  /* --- materials --- */

  const plasterMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8c9b0", roughness: 0.92, metalness: 0 }),
  );
  const plasterWarmMat = track(
    new THREE.MeshStandardMaterial({ color: "#cbb89a", roughness: 0.9 }),
  );
  const teakMat = track(
    new THREE.MeshStandardMaterial({ color: "#5a3420", roughness: 0.78, metalness: 0.05 }),
  );
  const teakDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#3e2416", roughness: 0.82 }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: "#b8923e",
      roughness: 0.35,
      metalness: 0.85,
      emissive: "#4a3010",
      emissiveIntensity: 0.05,
    }),
  );
  const brassBrightMat = track(
    new THREE.MeshStandardMaterial({
      color: "#d4a84a",
      roughness: 0.28,
      metalness: 0.9,
      emissive: "#6a4010",
      emissiveIntensity: 0.08,
    }),
  );
  const glassMat = track(
    new THREE.MeshStandardMaterial({
      color: "#c8d8e8",
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
    }),
  );
  const marbleMat = track(
    new THREE.MeshStandardMaterial({ color: "#e8e2d6", roughness: 0.55, metalness: 0.05 }),
  );
  const floorMat = track(
    new THREE.MeshStandardMaterial({ color: "#b9a486", roughness: 0.88 }),
  );
  const floorDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#8a7358", roughness: 0.9 }),
  );
  const ironMat = track(
    new THREE.MeshStandardMaterial({ color: "#2c2824", roughness: 0.45, metalness: 0.7 }),
  );
  const clothMat = track(
    new THREE.MeshStandardMaterial({ color: "#7a2e3a", roughness: 0.9, side: THREE.DoubleSide }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: "#c9a04a",
      roughness: 0.32,
      metalness: 0.88,
      emissive: "#5a3a10",
      emissiveIntensity: 0.12,
    }),
  );
  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#8e8374", roughness: 0.95 }),
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({ color: "#6a3a28", roughness: 0.88 }),
  );
  const groundMat = track(
    new THREE.MeshStandardMaterial({ color: "#9a8a72", roughness: 1 }),
  );
  const lampGlowMat = track(
    new THREE.MeshBasicMaterial({
      color: "#ffc878",
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );

  /* --- street / plinth --- */

  {
    const ground = new THREE.Mesh(track(new THREE.CylinderGeometry(55, 55, 1.2, 48)), groundMat);
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    scene.add(ground);

    const base = new THREE.Mesh(track(new THREE.BoxGeometry(90, 14, 90)), stoneMat);
    base.position.y = -8;
    scene.add(base);

    // Street paving strip in front (south / +z).
    const street = new THREE.Mesh(
      track(new THREE.BoxGeometry(40, 0.15, 18)),
      track(new THREE.MeshStandardMaterial({ color: "#8a8070", roughness: 0.95 })),
    );
    street.position.set(0, 0.05, 22);
    street.receiveShadow = true;
    scene.add(street);
  }

  const { halfW: HW, halfD: HD, floorH: FH, plinthH: PH, wallT: WT } = BUILDING;
  const totalH = PH + FH * 3;
  const roofY = totalH;

  /* --- building shell (cutaway on +z front so galleries are visible) --- */

  const shell = new THREE.Group();
  scene.add(shell);

  // Plinth
  {
    const plinth = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 2 + 2.2, PH, HD * 2 + 2.2)),
      plasterWarmMat,
    );
    plinth.position.y = PH / 2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    shell.add(plinth);

    const step = new THREE.Mesh(track(new THREE.BoxGeometry(10, 0.35, 2.4)), marbleMat);
    step.position.set(0, 0.2, HD + 1.8);
    step.castShadow = true;
    shell.add(step);
  }

  // Floors + ceilings (open front strip so cutaway works)
  for (let f = 0; f < 3; f++) {
    const y = PH + f * FH;
    const slab = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 2 - 0.3, 0.28, HD * 2 - 0.3)),
      f % 2 === 0 ? floorMat : floorDarkMat,
    );
    slab.position.y = y;
    slab.receiveShadow = true;
    shell.add(slab);

    // Back wall full height per storey
    const back = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 2, FH - 0.15, WT)),
      plasterMat,
    );
    back.position.set(0, y + FH / 2, -HD + WT / 2);
    back.castShadow = true;
    back.receiveShadow = true;
    shell.add(back);

    // Side walls (leave front open)
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        track(new THREE.BoxGeometry(WT, FH - 0.15, HD * 2 - 0.5)),
        plasterMat,
      );
      wall.position.set(side * (HW - WT / 2), y + FH / 2, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      shell.add(wall);
    }

    // Partial front wall with central opening (gallery mouth)
    for (const side of [-1, 1]) {
      const front = new THREE.Mesh(
        track(new THREE.BoxGeometry(HW * 0.55, FH - 0.15, WT * 0.8)),
        plasterWarmMat,
      );
      front.position.set(side * (HW * 0.7), y + FH / 2, HD - WT / 2);
      front.castShadow = true;
      shell.add(front);
    }
    // Lintel over opening
    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 0.9, 0.45, WT * 0.9)),
      teakMat,
    );
    lintel.position.set(0, y + FH - 0.35, HD - WT / 2);
    lintel.castShadow = true;
    shell.add(lintel);

    // Interior partition (left/right galleries) on floors 0–1
    if (f < 2) {
      const partition = new THREE.Mesh(
        track(new THREE.BoxGeometry(WT * 0.7, FH - 0.5, HD * 1.4)),
        plasterWarmMat,
      );
      partition.position.set(0, y + FH / 2, -1);
      partition.castShadow = true;
      shell.add(partition);

      // Doorway cut in partition via shorter wall segments would be complex;
      // use a framed arch opening mark instead.
      const arch = new THREE.Mesh(
        track(new THREE.BoxGeometry(WT * 0.9, 2.6, 1.8)),
        teakDarkMat,
      );
      arch.position.set(0, y + 1.4, HD * 0.15);
      shell.add(arch);
    }

    // Windows on side walls
    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const win = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.12, 1.4, 1.1)),
          glassMat,
        );
        win.position.set(side * (HW - 0.1), y + 2.1, -5 + w * 4.5);
        shell.add(win);

        const frame = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.18, 1.6, 1.3)),
          teakMat,
        );
        frame.position.copy(win.position);
        frame.position.x -= side * 0.05;
        shell.add(frame);
      }
    }

    // Gallery rail / balustrade on open front
    const rail = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 0.85, 0.12, 0.12)),
      teakMat,
    );
    rail.position.set(0, y + 1.05, HD - 0.55);
    shell.add(rail);
    for (let p = 0; p < 7; p++) {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6)),
        teakMat,
      );
      post.position.set(-HW * 0.35 + p * (HW * 0.7) / 6, y + 0.55, HD - 0.55);
      shell.add(post);
    }
  }

  // Roof with overhang and small central cupola
  {
    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 2 + 2.5, 0.4, HD * 2 + 2.5)),
      roofMat,
    );
    roof.position.y = roofY + 0.15;
    roof.castShadow = true;
    shell.add(roof);

    const eaves = new THREE.Mesh(
      track(new THREE.BoxGeometry(HW * 2 + 3.2, 0.18, HD * 2 + 3.2)),
      teakDarkMat,
    );
    eaves.position.y = roofY - 0.05;
    shell.add(eaves);

    const cupola = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.2, 2.6, 1.6, 10)),
      plasterMat,
    );
    cupola.position.y = roofY + 1.2;
    cupola.castShadow = true;
    shell.add(cupola);

    const cupolaRoof = new THREE.Mesh(
      track(new THREE.ConeGeometry(3.0, 1.8, 10)),
      roofMat,
    );
    cupolaRoof.position.y = roofY + 2.4;
    cupolaRoof.castShadow = true;
    shell.add(cupolaRoof);

    // Finial
    const finial = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.35, 10, 8)),
      brassBrightMat,
    );
    finial.position.y = roofY + 3.4;
    shell.add(finial);
  }

  // Entrance portico on ground floor front
  {
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.35, 0.4, 3.6, 10)),
        marbleMat,
      );
      col.position.set(side * 3.2, PH + 1.9, HD + 1.1);
      col.castShadow = true;
      shell.add(col);
      const cap = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.9, 0.25, 0.9)),
        teakMat,
      );
      cap.position.set(side * 3.2, PH + 3.75, HD + 1.1);
      shell.add(cap);
    }
    const portico = new THREE.Mesh(
      track(new THREE.BoxGeometry(8, 0.35, 2.8)),
      roofMat,
    );
    portico.position.set(0, PH + 3.95, HD + 1.0);
    portico.castShadow = true;
    shell.add(portico);

    // Main entrance doors
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.6, 3.0, 0.18)),
        teakDarkMat,
      );
      door.position.set(side * 0.85, PH + 1.55, HD - 0.15);
      door.castShadow = true;
      shell.add(door);
      // Panel detail
      const panel = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.1, 1.0, 0.06)),
        teakMat,
      );
      panel.position.set(side * 0.85, PH + 1.8, HD - 0.05);
      shell.add(panel);
    }
  }

  // Mastani Mahal chamber enclosure (top floor, rear)
  {
    const my = PH + FH * 2;
    const chamber = new THREE.Group();
    chamber.position.set(0, my, -2);

    // Raised platform
    const platform = new THREE.Mesh(
      track(new THREE.BoxGeometry(14, 0.35, 10)),
      track(new THREE.MeshStandardMaterial({ color: "#6b2c38", roughness: 0.85 })),
    );
    platform.position.y = 0.2;
    chamber.add(platform);

    // Ornate columns
    for (const [cx, cz] of [
      [-5, -3],
      [5, -3],
      [-5, 3],
      [5, 3],
      [-5, 0],
      [5, 0],
    ] as [number, number][]) {
      const col = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.28, 0.32, 3.4, 10)),
        teakMat,
      );
      col.position.set(cx, 1.9, cz);
      col.castShadow = true;
      chamber.add(col);
      const capital = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.7, 0.22, 0.7)),
        goldMat,
      );
      capital.position.set(cx, 3.55, cz);
      chamber.add(capital);
    }

    // Back screen / jali wall
    const screen = new THREE.Mesh(
      track(new THREE.BoxGeometry(13, 3.2, 0.2)),
      teakDarkMat,
    );
    screen.position.set(0, 1.9, -4.6);
    chamber.add(screen);

    // Jali lattice dots
    const jali = new THREE.InstancedMesh(
      track(new THREE.BoxGeometry(0.18, 0.18, 0.08)),
      goldMat,
      48,
    );
    const m = new THREE.Matrix4();
    let ji = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        if (ji >= 48) break;
        m.compose(
          new THREE.Vector3(-5.6 + col * 1.6, 0.7 + row * 0.45, -4.45),
          new THREE.Quaternion(),
          new THREE.Vector3(1, 1, 1),
        );
        jali.setMatrixAt(ji++, m);
      }
    }
    jali.instanceMatrix.needsUpdate = true;
    chamber.add(jali);

    // Central seat / takht
    const takht = new THREE.Mesh(
      track(new THREE.BoxGeometry(4.5, 0.5, 2.2)),
      clothMat,
    );
    takht.position.set(0, 0.55, 0.5);
    chamber.add(takht);
    const cushion = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.8, 0.35, 1.6)),
      track(new THREE.MeshStandardMaterial({ color: "#c45a3a", roughness: 0.9 })),
    );
    cushion.position.set(0, 0.95, 0.5);
    chamber.add(cushion);

    // Hanging chandelier
    const chain = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6)),
      ironMat,
    );
    chain.position.set(0, 3.3, 0);
    chamber.add(chain);
    const chand = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.55, 12, 10)),
      brassBrightMat,
    );
    chand.position.set(0, 2.6, 0);
    chamber.add(chand);
    const glow = new THREE.Mesh(track(new THREE.SphereGeometry(0.9, 12, 10)), lampGlowMat);
    glow.position.set(0, 2.6, 0);
    chamber.add(glow);

    // Point light for the chamber
    const mahalLight = new THREE.PointLight("#ffc090", 40, 18, 2);
    mahalLight.position.set(0, 2.8, 0);
    chamber.add(mahalLight);

    shell.add(chamber);
  }

  /* --- exhibit props from pure layout --- */

  const caseGeo = track(new THREE.BoxGeometry(1.6, 1.5, 0.9));
  const caseGlassGeo = track(new THREE.BoxGeometry(1.45, 1.1, 0.75));
  const lampStemGeo = track(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 8));
  const lampBowlGeo = track(new THREE.SphereGeometry(0.28, 10, 8));
  const lampBaseGeo = track(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10));
  const tablaGeo = track(new THREE.CylinderGeometry(0.32, 0.28, 0.55, 12));
  const sitarBodyGeo = track(new THREE.SphereGeometry(0.38, 10, 8));
  const sitarNeckGeo = track(new THREE.BoxGeometry(0.1, 0.12, 1.6));
  const cutterGeo = track(new THREE.BoxGeometry(0.35, 0.12, 0.55));
  const doorLeafGeo = track(new THREE.BoxGeometry(1.5, 3.4, 0.16));
  const shieldGeo = track(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16));
  const swordGeo = track(new THREE.BoxGeometry(0.08, 0.08, 1.5));
  const vesselGeo = track(new THREE.CylinderGeometry(0.35, 0.28, 0.7, 12));
  const sculpGeo = track(new THREE.BoxGeometry(0.5, 1.1, 0.4));

  const galleryLights: THREE.PointLight[] = [];

  for (const ex of layout.exhibits) {
    const g = new THREE.Group();
    g.position.set(ex.x, ex.y, ex.z);
    g.rotation.y = ex.rotY;
    g.scale.setScalar(ex.scale);

    switch (ex.kind) {
      case "case": {
        const body = new THREE.Mesh(caseGeo, teakMat);
        body.position.y = 0.75;
        body.castShadow = true;
        g.add(body);
        const glass = new THREE.Mesh(caseGlassGeo, glassMat);
        glass.position.y = 0.95;
        g.add(glass);
        // Shelf edge
        const shelf = new THREE.Mesh(
          track(new THREE.BoxGeometry(1.5, 0.06, 0.85)),
          teakDarkMat,
        );
        shelf.position.y = 0.4;
        g.add(shelf);
        break;
      }
      case "lamp": {
        const base = new THREE.Mesh(lampBaseGeo, brassMat);
        base.position.y = 0.06;
        g.add(base);
        const stem = new THREE.Mesh(lampStemGeo, brassMat);
        stem.position.y = 0.65;
        stem.castShadow = true;
        g.add(stem);
        const bowl = new THREE.Mesh(lampBowlGeo, brassBrightMat);
        bowl.position.y = 1.2;
        g.add(bowl);
        // Peacock / finial
        const fin = new THREE.Mesh(
          track(new THREE.ConeGeometry(0.1, 0.35, 6)),
          brassBrightMat,
        );
        fin.position.y = 1.55;
        g.add(fin);
        const glow = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.22, 8, 6)),
          lampGlowMat,
        );
        glow.position.y = 1.25;
        g.add(glow);
        break;
      }
      case "instrument": {
        // Tabla pair or sitar-like form alternating by position
        if (Math.abs(ex.x) * 10 + Math.abs(ex.z) * 3 > 40) {
          const body = new THREE.Mesh(sitarBodyGeo, teakMat);
          body.position.set(0, 0.4, 0.2);
          body.castShadow = true;
          g.add(body);
          const neck = new THREE.Mesh(sitarNeckGeo, teakDarkMat);
          neck.position.set(0, 0.45, -0.7);
          g.add(neck);
          const peg = new THREE.Mesh(
            track(new THREE.BoxGeometry(0.25, 0.2, 0.2)),
            brassMat,
          );
          peg.position.set(0, 0.5, -1.4);
          g.add(peg);
        } else {
          for (const ox of [-0.35, 0.35]) {
            const drum = new THREE.Mesh(tablaGeo, teakMat);
            drum.position.set(ox, 0.3, 0);
            drum.castShadow = true;
            g.add(drum);
            const skin = new THREE.Mesh(
              track(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12)),
              marbleMat,
            );
            skin.position.set(ox, 0.58, 0);
            g.add(skin);
          }
        }
        // Stand / pedestal
        const ped = new THREE.Mesh(
          track(new THREE.BoxGeometry(1.2, 0.12, 0.7)),
          teakDarkMat,
        );
        ped.position.y = 0.06;
        g.add(ped);
        break;
      }
      case "cutter": {
        const blade = new THREE.Mesh(cutterGeo, ironMat);
        blade.position.y = 0.08;
        blade.rotation.z = 0.3;
        g.add(blade);
        const handle = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.15, 0.12, 0.4)),
          brassBrightMat,
        );
        handle.position.set(0.15, 0.1, -0.1);
        g.add(handle);
        const bird = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.12, 8, 6)),
          brassMat,
        );
        bird.position.set(0.22, 0.18, -0.25);
        g.add(bird);
        break;
      }
      case "door": {
        const leaf = new THREE.Mesh(doorLeafGeo, teakMat);
        leaf.position.y = 1.7;
        leaf.castShadow = true;
        g.add(leaf);
        // Carved panels
        for (let p = 0; p < 3; p++) {
          const panel = new THREE.Mesh(
            track(new THREE.BoxGeometry(1.1, 0.7, 0.08)),
            teakDarkMat,
          );
          panel.position.set(0, 0.7 + p * 1.0, 0.1);
          g.add(panel);
          const rosette = new THREE.Mesh(
            track(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10)),
            brassMat,
          );
          rosette.rotation.x = Math.PI / 2;
          rosette.position.set(0, 0.7 + p * 1.0, 0.16);
          g.add(rosette);
        }
        // Frame posts
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(
            track(new THREE.BoxGeometry(0.2, 3.6, 0.22)),
            teakDarkMat,
          );
          post.position.set(side * 0.85, 1.8, 0);
          g.add(post);
        }
        const lintel = new THREE.Mesh(
          track(new THREE.BoxGeometry(2.0, 0.28, 0.28)),
          teakMat,
        );
        lintel.position.set(0, 3.55, 0);
        g.add(lintel);
        break;
      }
      case "armour": {
        const shield = new THREE.Mesh(shieldGeo, ironMat);
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, 1.1, 0);
        shield.castShadow = true;
        g.add(shield);
        const boss = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.12, 8, 6)),
          brassMat,
        );
        boss.position.set(0, 1.1, 0.08);
        g.add(boss);
        const sword = new THREE.Mesh(swordGeo, ironMat);
        sword.position.set(0.5, 0.9, 0);
        sword.rotation.z = -0.5;
        g.add(sword);
        const hilt = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8)),
          brassMat,
        );
        hilt.position.set(0.95, 1.25, 0);
        hilt.rotation.z = -0.5;
        g.add(hilt);
        const stand = new THREE.Mesh(
          track(new THREE.BoxGeometry(1.0, 0.15, 0.5)),
          teakMat,
        );
        stand.position.y = 0.08;
        g.add(stand);
        break;
      }
      case "vessel": {
        const pot = new THREE.Mesh(vesselGeo, brassMat);
        pot.position.y = 0.4;
        pot.castShadow = true;
        g.add(pot);
        const rim = new THREE.Mesh(
          track(new THREE.TorusGeometry(0.32, 0.04, 6, 14)),
          brassBrightMat,
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.72;
        g.add(rim);
        break;
      }
      case "sculpture": {
        const block = new THREE.Mesh(sculpGeo, stoneMat);
        block.position.y = 0.65;
        block.castShadow = true;
        g.add(block);
        const head = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.22, 10, 8)),
          stoneMat,
        );
        head.position.y = 1.35;
        g.add(head);
        const ped = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 8)),
          marbleMat,
        );
        ped.position.y = 0.1;
        g.add(ped);
        break;
      }
    }

    scene.add(g);
  }

  // Wall-mounted shelves with extra minor props for density
  {
    const rnd = mulberry32(99);
    const shelfGeo = track(new THREE.BoxGeometry(4.5, 0.1, 0.55));
    for (let f = 0; f < 3; f++) {
      const y = PH + f * FH + 1.8;
      for (const side of [-1, 1]) {
        for (let s = 0; s < 2; s++) {
          const shelf = new THREE.Mesh(shelfGeo, teakMat);
          shelf.position.set(side * (HW - 0.7), y + s * 1.1, -2 + (rnd() - 0.5));
          shelf.rotation.y = side > 0 ? -0.05 : 0.05;
          scene.add(shelf);
          for (let k = 0; k < 5; k++) {
            const pot = new THREE.Mesh(
              track(new THREE.CylinderGeometry(0.12 + rnd() * 0.08, 0.1, 0.25 + rnd() * 0.2, 8)),
              rnd() > 0.5 ? brassMat : brassBrightMat,
            );
            pot.position.set(
              side * (HW - 0.7) + (rnd() - 0.5) * 3.5,
              y + s * 1.1 + 0.2,
              -2 + (rnd() - 0.5) * 0.2,
            );
            scene.add(pot);
          }
        }
      }
    }
  }

  // Interior gallery point lights per floor
  for (let f = 0; f < 3; f++) {
    const y = PH + f * FH + 3.2;
    for (const [lx, lz] of [
      [-5, -3],
      [5, -3],
      [-5, 4],
      [5, 4],
      [0, 0],
    ] as [number, number][]) {
      const pl = new THREE.PointLight("#ffd2a0", 12, 16, 2);
      pl.position.set(lx, y, lz);
      scene.add(pl);
      galleryLights.push(pl);

      // Ceiling rose / lamp fixture
      const fixture = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.15, 0.25, 0.2, 8)),
        brassMat,
      );
      fixture.position.set(lx, y + 0.3, lz);
      scene.add(fixture);
    }
  }

  // Street trees
  {
    const rnd = mulberry32(44);
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#4a3828", roughness: 0.95 }));
    const leafMat = track(
      new THREE.MeshStandardMaterial({ color: "#4a7a3c", roughness: 0.95, flatShading: true }),
    );
    for (let i = 0; i < 10; i++) {
      const x = (i < 5 ? -1 : 1) * (18 + rnd() * 8);
      const z = -12 + (i % 5) * 7 + rnd() * 2;
      const s = 0.8 + rnd() * 0.5;
      const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.25, 0.35, 3.2 * s, 6)), trunkMat);
      trunk.position.set(x, 1.5 * s, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const canopy = new THREE.Mesh(track(new THREE.IcosahedronGeometry(1.8 * s, 0)), leafMat);
      canopy.position.set(x, 3.4 * s, z);
      canopy.castShadow = true;
      scene.add(canopy);
    }
  }

  // Dust motes inside
  const DUST = 80;
  const dustGeo = track(new THREE.BufferGeometry());
  const dustSeed: number[] = [];
  {
    const arr = new Float32Array(DUST * 3);
    const rnd = mulberry32(17);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (rnd() - 0.5) * HW * 1.8;
      arr[i * 3 + 1] = PH + rnd() * FH * 3;
      arr[i * 3 + 2] = (rnd() - 0.5) * HD * 1.8;
      dustSeed.push(rnd() * 100);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const dustMat = track(
    new THREE.PointsMaterial({
      size: 0.12,
      map: track(radialSprite("rgba(255,236,200,0.9)", "rgba(255,210,150,0.3)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.4,
    }),
  );
  const dustMotes = new THREE.Points(dustGeo, dustMat);
  scene.add(dustMotes);

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
  const ringGeo = track(new THREE.RingGeometry(1.4, 1.85, 36));
  const hitGeo = track(new THREE.SphereGeometry(2.4, 10, 8));

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
    sprite.position.copy(base).add(new THREE.Vector3(0, 2.5, 0));
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
    ring.position.copy(base).add(new THREE.Vector3(0, 0.15, 0));
    ring.renderOrder = 19;
    scene.add(ring);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);

    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  /* --- camera rig --- */

  const spherical = { radius: 160, phi: 0.45, theta: HOME.theta - 0.8 };
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
      desired.phi = clamp(desired.phi - dy * 0.004, 0.2, 1.38);
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 14, 90);
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
  let eveningTarget = 0;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 8, 0);

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
    cur.lantern = damp(cur.lantern, paletteTarget.lantern + eveningTarget * 0.35, 3.2, dt);
    cur.azimuth = damp(cur.azimuth, paletteTarget.sunAzimuth, 3.2, dt);
    cur.elevation = damp(cur.elevation, paletteTarget.sunElevation, 3.2, dt);
    cur.exposure = damp(cur.exposure, paletteTarget.exposure, 3.2, dt);
    cur.evening = damp(cur.evening, eveningTarget, 2.4, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.7 + cur.evening * 0.15;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.evening * 0.35);
    sun.position.copy(sunDir).multiplyScalar(120);
    fog.color.copy(cur.fog);
    fog.near = 70 - cur.evening * 15;
    fog.far = 220 - cur.evening * 40;
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    const lampLevel = clamp(cur.lantern, 0, 1.2);
    brassMat.emissiveIntensity = 0.04 + lampLevel * 0.25;
    brassBrightMat.emissiveIntensity = 0.06 + lampLevel * 0.35;
    goldMat.emissiveIntensity = 0.1 + lampLevel * 0.3;
    lampGlowMat.opacity = 0.15 + lampLevel * 0.55;

    for (let i = 0; i < galleryLights.length; i++) {
      const pulse = 0.85 + Math.sin(elapsed * 0.7 + i * 0.4) * 0.12 * motion;
      galleryLights[i].intensity = (8 + lampLevel * 28 + cur.evening * 18) * pulse;
    }

    dustMat.opacity = 0.2 + lampLevel * 0.35;
    if (motion) {
      const attr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        attr.setY(i, PH + ((elapsed * 0.25 + s) % (FH * 3)));
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.25 + s) * dt * 0.4);
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
        marker.base.y + 2.5 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.25 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(160, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(0.45, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.8, desired.theta, e);
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
    setMode(m) {
      eveningTarget = m === "evening" ? 1 : 0;
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
