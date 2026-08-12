/**
 * A hand-built, procedural 3D model of Shaniwar Wada.
 *
 * Same approach as the Okayama garden (components/places/okayama): plain
 * three.js, zero external assets, geometry generated at runtime. What survives
 * of the real fort is stone — curtain wall, nine bastions, the Delhi Darwaza,
 * the palace plinths and the base of the Hazari Karanje — so that is what the
 * model shows, with the burnt timber palace deliberately absent.
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
  | "delhi-darwaza"
  | "ramparts"
  | "hazari-karanje"
  | "palace-plinth"
  | "nagarkhana"
  | "lawns";

export type FortWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type FortWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setSeason: (s: Season) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "delhi-darwaza",
  "ramparts",
  "hazari-karanje",
  "palace-plinth",
  "nagarkhana",
  "lawns",
];

/* ------------------------------------------------------------------ */
/* Palettes — morning, golden hour, and the evening light show         */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#16305c",
    skyBottom: "#e8d3b6",
    sun: "#ffe3c0",
    sunIntensity: 2.4,
    hemiSky: "#a8c6ea",
    hemiGround: "#5a4a36",
    ambient: 0.8,
    fog: "#dfcdb4",
    waterDeep: "#2b5a63",
    waterShallow: "#7fb2b4",
    lantern: 0.1,
    sunAzimuth: 2.3,
    sunElevation: 0.34,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#3f2036",
    skyBottom: "#ffcb8c",
    sun: "#ffbc6f",
    sunIntensity: 3.1,
    hemiSky: "#c6dbf5",
    hemiGround: "#6a5232",
    ambient: 0.82,
    fog: "#f0cfa2",
    waterDeep: "#2c5a55",
    waterShallow: "#8dc0aa",
    lantern: 0.2,
    sunAzimuth: -0.7,
    sunElevation: 0.36,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#05081f",
    skyBottom: "#3a2352",
    sun: "#8f7bd6",
    sunIntensity: 0.35,
    hemiSky: "#2a3566",
    hemiGround: "#1b1524",
    ambient: 0.34,
    fog: "#221a38",
    waterDeep: "#0b1730",
    waterShallow: "#26456b",
    lantern: 1,
    sunAzimuth: -1.3,
    sunElevation: 0.04,
    exposure: 1.15,
  },
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Half-extent of the curtain wall's centreline. */
const A = 34;
/** Wall height and thickness. */
const WALL_H = 7.5;
const WALL_T = 3;
/** Half-width of the Delhi Darwaza opening in the north wall. */
const GATE_HALF = 6.5;

/** Round bastions: x, z, radius, height. Nine of them, as built. */
const BASTIONS: [number, number, number, number][] = [
  [-A, -A, 5.2, 8.6],
  [A, -A, 5.2, 8.6],
  [-A, A, 5.2, 8.6],
  [A, A, 5.2, 8.6],
  [-A, 0, 4.6, 8.2],
  [A, 0, 4.6, 8.2],
  [0, A, 4.8, 8.2],
  [-17, A, 4.2, 8],
  [17, A, 4.2, 8],
];

/** Palace plinths — the footprint the 1828 fire left behind. */
const PLINTHS: { x: number; z: number; w: number; d: number; h: number; cols: [number, number] }[] =
  [
    { x: 0, z: 8, w: 34, d: 22, h: 1.7, cols: [7, 5] },
    { x: -21, z: -6, w: 15, d: 13, h: 1.3, cols: [4, 3] },
    { x: 20, z: -7, w: 14, d: 12, h: 1.3, cols: [4, 3] },
    { x: 0, z: 25, w: 20, d: 9, h: 1.1, cols: [5, 2] },
  ];

/** Hazari Karanje, the lotus fountain. */
const FOUNTAIN = { x: 0, z: -16, radius: 7.2 };

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

const ANCHORS: Record<FeatureId, Anchor> = {
  "delhi-darwaza": {
    target: new THREE.Vector3(0, 7, -38),
    dir: new THREE.Vector3(0.18, 0.5, -0.85),
    distance: 52,
  },
  ramparts: {
    target: new THREE.Vector3(-34, 6, 6),
    dir: new THREE.Vector3(-0.75, 0.55, 0.36),
    distance: 56,
  },
  "hazari-karanje": {
    target: new THREE.Vector3(FOUNTAIN.x, 1.5, FOUNTAIN.z),
    dir: new THREE.Vector3(0.3, 0.6, 0.74),
    distance: 40,
  },
  "palace-plinth": {
    target: new THREE.Vector3(0, 1.5, 8),
    dir: new THREE.Vector3(0.4, 0.62, 0.68),
    distance: 54,
  },
  nagarkhana: {
    target: new THREE.Vector3(0, 13, -36),
    dir: new THREE.Vector3(0.12, 0.42, -0.9),
    distance: 38,
  },
  lawns: {
    target: new THREE.Vector3(0, 0, 2),
    dir: new THREE.Vector3(0.32, 0.82, 0.48),
    distance: 96,
  },
};

const HOME = {
  target: new THREE.Vector3(0, -6, -2),
  radius: 132,
  phi: 1.0,
  theta: 0.5,
};

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

const insideFort = (x: number, z: number) =>
  Math.abs(x) < A - WALL_T / 2 && Math.abs(z) < A - WALL_T / 2;

/** Terrain height at a world XZ. y = 0 is the outside ground level. */
function terrainHeight(x: number, z: number): number {
  let h = 0.22 * Math.sin(x * 0.06) * Math.cos(z * 0.055);

  // The whole enclosure sits on a low platform.
  const inX = smoothstep(A + 2, A - 4, Math.abs(x));
  const inZ = smoothstep(A + 2, A - 4, Math.abs(z));
  h += 1.1 * inX * inZ;

  // Paved forecourt north of the Delhi Darwaza.
  if (z < -A && z > -A - 20 && Math.abs(x) < 26) h -= 0.15;

  // Plateau falloff — the diorama is an object with a cut edge.
  const corner = Math.hypot(Math.max(0, Math.abs(x) - 38), Math.max(0, Math.abs(z) - 38));
  const outside = Math.max(Math.max(Math.abs(x), Math.abs(z)) - 50, corner - 12);
  if (outside > -1) h -= 18 * smoothstep(-1, 2.5, outside);

  return h;
}

const groundHeight = (x: number, z: number) => Math.max(terrainHeight(x, z), -0.4);

/* ------------------------------------------------------------------ */
/* Water (the fountain basin)                                          */
/* ------------------------------------------------------------------ */

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
  "varying vec3 vWorld;",
  "",
  "float waves(vec2 p) {",
  "  float r = length(p);",
  "  float h = sin(r * 2.2 - uTime * 2.4) * 0.5;",
  "  h += sin(dot(p, normalize(vec2(1.0, 0.4))) * 2.9 + uTime * 1.6) * 0.3;",
  "  return h;",
  "}",
  "",
  "void main() {",
  "  vec2 p = vWorld.xz;",
  "  float eps = 0.25;",
  "  float h = waves(p);",
  "  vec3 normal = normalize(vec3((h - waves(p + vec2(eps, 0.0))) * 0.35 / eps, 1.0, (h - waves(p + vec2(0.0, eps))) * 0.35 / eps));",
  "  vec3 view = normalize(uCamera - vWorld);",
  "  float fres = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.0);",
  "  vec3 col = mix(mix(uDeep, uShallow, clamp(h * 0.4 + 0.5, 0.0, 1.0)), uSky, fres * 0.5);",
  "  vec3 halfDir = normalize(normalize(uSunDir) + view);",
  "  col += uSunColor * pow(clamp(dot(normal, halfDir), 0.0, 1.0), 180.0) * 1.5;",
  "  gl_FragColor = vec4(col, 0.92);",
  "}",
].join("\n");

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createFortWorld(container: HTMLElement, options: FortWorldOptions): FortWorld {
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
  const fog = new THREE.Fog("#dfcdb4", 190, 560);
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
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  /* --- materials --- */

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#9d8f7c", roughness: 0.95, metalness: 0 }),
  );
  const stoneDarkMat = track(new THREE.MeshStandardMaterial({ color: "#7d7062", roughness: 0.95 }));
  const plinthMat = track(new THREE.MeshStandardMaterial({ color: "#ab9c86", roughness: 0.95 }));
  const teakMat = track(new THREE.MeshStandardMaterial({ color: "#5c3620", roughness: 0.8 }));
  const ironMat = track(
    new THREE.MeshStandardMaterial({ color: "#2e2a27", roughness: 0.5, metalness: 0.6 }),
  );
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#7c3f2c", roughness: 0.9 }));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4f7a3c", roughness: 0.95, flatShading: true }),
  );
  const flagMat = track(
    new THREE.MeshStandardMaterial({
      color: "#e2761f",
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(120, 120, 108, 108));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawn = new THREE.Color("#6f9350");
  const lawnDark = new THREE.Color("#54763f");
  const dust = new THREE.Color("#c3ac86");
  const paving = new THREE.Color("#a99c88");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(31);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (insideFort(x, z)) {
      tmp.copy(lawnDark).lerp(lawn, 0.35 + colorRnd() * 0.65);
      // Worn tracks where people walk between the gate and the plinths.
      tmp.lerp(dust, smoothstep(6, 1.5, Math.abs(x)) * smoothstep(A, 0, Math.abs(z)) * 0.5);
    } else {
      tmp.copy(dust).lerp(paving, colorRnd() * 0.5);
      if (z < -A && z > -A - 20 && Math.abs(x) < 26) tmp.copy(paving);
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
  const base = new THREE.Mesh(track(new THREE.BoxGeometry(102, 18, 102)), baseMat);
  base.position.y = -10.5;
  scene.add(base);

  /* --- curtain wall + crenellations --- */

  const merlonGeo = track(new THREE.BoxGeometry(1.5, 1.4, WALL_T * 0.9));
  const merlonPositions: { x: number; z: number; ry: number }[] = [];

  const addWall = (
    cx: number,
    cz: number,
    length: number,
    horizontal: boolean,
    withMerlons = true,
  ) => {
    const geo = horizontal
      ? new THREE.BoxGeometry(length, WALL_H, WALL_T)
      : new THREE.BoxGeometry(WALL_T, WALL_H, length);
    const mesh = new THREE.Mesh(track(geo), stoneMat);
    mesh.position.set(cx, WALL_H / 2 + 0.9, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (!withMerlons) return;
    const count = Math.floor(length / 3.2);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5;
      merlonPositions.push(
        horizontal
          ? { x: cx + t * length, z: cz, ry: 0 }
          : { x: cx, z: cz + t * length, ry: Math.PI / 2 },
      );
    }
  };

  // North wall, split around the Delhi Darwaza opening.
  addWall(-(A + GATE_HALF) / 2, -A, A - GATE_HALF, true);
  addWall((A + GATE_HALF) / 2, -A, A - GATE_HALF, true);
  addWall(0, A, A * 2, true);
  addWall(-A, 0, A * 2, false);
  addWall(A, 0, A * 2, false);

  {
    const merlons = new THREE.InstancedMesh(merlonGeo, stoneMat, merlonPositions.length);
    merlons.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    merlonPositions.forEach((p, i) => {
      e.set(0, p.ry, 0);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(p.x, WALL_H + 1.6, p.z),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      merlons.setMatrixAt(i, m);
    });
    merlons.instanceMatrix.needsUpdate = true;
    scene.add(merlons);
  }

  /* --- bastions --- */

  for (const [bx, bz, r, h] of BASTIONS) {
    const tower = new THREE.Mesh(
      track(new THREE.CylinderGeometry(r * 0.92, r, h, 18)),
      stoneMat,
    );
    tower.position.set(bx, h / 2 + 0.8, bz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    scene.add(tower);

    const cap = new THREE.Mesh(
      track(new THREE.CylinderGeometry(r * 1.02, r * 0.96, 0.7, 18)),
      stoneDarkMat,
    );
    cap.position.set(bx, h + 1.15, bz);
    cap.castShadow = true;
    scene.add(cap);

    // Ring of merlons around the top.
    const ringCount = Math.max(8, Math.round(r * 2.6));
    const ring = new THREE.InstancedMesh(merlonGeo, stoneMat, ringCount);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      e.set(0, -a, 0);
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(bx + Math.cos(a) * r * 0.86, h + 2.1, bz + Math.sin(a) * r * 0.86),
        q,
        new THREE.Vector3(0.75, 0.8, 0.55),
      );
      ring.setMatrixAt(i, m);
    }
    ring.instanceMatrix.needsUpdate = true;
    ring.castShadow = true;
    scene.add(ring);
  }

  /* --- Delhi Darwaza + Nagarkhana --- */

  const gate = new THREE.Group();
  {
    const GH = 13.5;
    const pierW = 5.5;

    // Piers either side of the opening, projecting north out of the wall.
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(
        track(new THREE.BoxGeometry(pierW, GH, WALL_T + 5)),
        stoneMat,
      );
      pier.position.set(side * (GATE_HALF + pierW / 2), GH / 2 + 0.9, -A - 1);
      pier.castShadow = true;
      pier.receiveShadow = true;
      gate.add(pier);

      // Flanking half-round bastion.
      const drum = new THREE.Mesh(
        track(new THREE.CylinderGeometry(3.6, 3.9, GH + 0.6, 16)),
        stoneMat,
      );
      drum.position.set(side * (GATE_HALF + pierW + 1.6), (GH + 0.6) / 2 + 0.9, -A - 2.4);
      drum.castShadow = true;
      gate.add(drum);
    }

    // Lintel block over the opening.
    const lintel = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATE_HALF * 2 + pierW * 2, GH - 9.5, WALL_T + 5)),
      stoneMat,
    );
    lintel.position.set(0, 9.5 + (GH - 9.5) / 2 + 0.9, -A - 1);
    lintel.castShadow = true;
    gate.add(lintel);

    // The pointed arch, built from a ring of small blocks.
    const voussoir = track(new THREE.BoxGeometry(1.5, 1.1, WALL_T + 5.2));
    const arch = new THREE.InstancedMesh(voussoir, stoneDarkMat, 15);
    {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      for (let i = 0; i < 15; i++) {
        const a = Math.PI * (i / 14);
        e.set(0, 0, -a + Math.PI / 2);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            Math.cos(a) * GATE_HALF,
            6.6 + Math.sin(a) * 3.2 + 0.9,
            -A - 1,
          ),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        arch.setMatrixAt(i, m);
      }
      arch.instanceMatrix.needsUpdate = true;
    }
    gate.add(arch);

    // Teak doors with their rows of anti-elephant iron spikes.
    const spikeGeo = track(new THREE.ConeGeometry(0.22, 0.85, 6));
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(
        track(new THREE.BoxGeometry(GATE_HALF - 0.2, 8.6, 0.5)),
        teakMat,
      );
      leaf.position.set((side * (GATE_HALF - 0.1)) / 2, 4.3 + 0.9, -A - 3.4);
      leaf.castShadow = true;
      gate.add(leaf);

      const spikes = new THREE.InstancedMesh(spikeGeo, ironMat, 12);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler(Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      for (let i = 0; i < 12; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        m.compose(
          new THREE.Vector3(
            (side * (GATE_HALF - 0.1)) / 2 + (col - 1) * 1.7,
            3.4 + row * 1.5 + 0.9,
            -A - 3.9,
          ),
          q,
          new THREE.Vector3(1, 1, 1),
        );
        spikes.setMatrixAt(i, m);
      }
      spikes.instanceMatrix.needsUpdate = true;
      gate.add(spikes);
    }

    // Nagarkhana — the drum chamber above the gate.
    const chamber = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATE_HALF * 2 + 2, 4.4, WALL_T + 3)),
      stoneMat,
    );
    chamber.position.set(0, GH + 3.1, -A - 0.6);
    chamber.castShadow = true;
    gate.add(chamber);

    const windowGeo = track(new THREE.BoxGeometry(1.5, 2.2, 0.5));
    for (let i = -2; i <= 2; i++) {
      const win = new THREE.Mesh(windowGeo, stoneDarkMat);
      win.position.set(i * 2.7, GH + 3.1, -A - 2.2);
      gate.add(win);
    }

    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(GATE_HALF * 2 + 5, 0.6, WALL_T + 5)),
      roofMat,
    );
    roof.position.set(0, GH + 5.6, -A - 0.6);
    roof.castShadow = true;
    gate.add(roof);

    const cupola = new THREE.Mesh(track(new THREE.ConeGeometry(2.4, 3, 8)), roofMat);
    cupola.position.set(0, GH + 7.4, -A - 0.6);
    cupola.castShadow = true;
    gate.add(cupola);

    scene.add(gate);
  }

  /* --- palace plinths --- */

  {
    const stubGeo = track(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 8));
    let stubTotal = 0;
    for (const p of PLINTHS) stubTotal += p.cols[0] * p.cols[1];
    const stubs = new THREE.InstancedMesh(stubGeo, plinthMat, stubTotal);
    stubs.castShadow = true;
    stubs.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let si = 0;

    for (const p of PLINTHS) {
      const slab = new THREE.Mesh(track(new THREE.BoxGeometry(p.w, p.h, p.d)), plinthMat);
      slab.position.set(p.x, groundHeight(p.x, p.z) + p.h / 2, p.z);
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);

      // A shallow step course around the plinth.
      const step = new THREE.Mesh(
        track(new THREE.BoxGeometry(p.w + 2, p.h * 0.45, p.d + 2)),
        stoneDarkMat,
      );
      step.position.set(p.x, groundHeight(p.x, p.z) + p.h * 0.22, p.z);
      step.receiveShadow = true;
      scene.add(step);

      const top = groundHeight(p.x, p.z) + p.h;
      for (let ix = 0; ix < p.cols[0]; ix++) {
        for (let iz = 0; iz < p.cols[1]; iz++) {
          const x = p.x + (ix / (p.cols[0] - 1) - 0.5) * (p.w - 4);
          const z = p.z + (iz / (p.cols[1] - 1) - 0.5) * (p.d - 4);
          m.compose(new THREE.Vector3(x, top + 0.75, z), q, new THREE.Vector3(1, 1, 1));
          stubs.setMatrixAt(si++, m);
        }
      }
    }
    stubs.instanceMatrix.needsUpdate = true;
    scene.add(stubs);
  }

  /* --- Hazari Karanje: the sixteen-petal lotus fountain --- */

  const fountainJets: THREE.Points[] = [];
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
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    }),
  );
  {
    const fy = groundHeight(FOUNTAIN.x, FOUNTAIN.z);
    const basin = new THREE.Mesh(
      track(new THREE.CylinderGeometry(FOUNTAIN.radius, FOUNTAIN.radius + 0.6, 1.5, 32)),
      plinthMat,
    );
    basin.position.set(FOUNTAIN.x, fy + 0.75, FOUNTAIN.z);
    basin.castShadow = true;
    basin.receiveShadow = true;
    scene.add(basin);

    // Sixteen petals, laid out as a lotus.
    const petalGeo = track(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI));
    const petals = new THREE.InstancedMesh(petalGeo, plinthMat, 16);
    petals.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      e.set(-Math.PI / 2.6, -a, 0, "YXZ");
      q.setFromEuler(e);
      m.compose(
        new THREE.Vector3(
          FOUNTAIN.x + Math.cos(a) * (FOUNTAIN.radius - 0.6),
          fy + 1.45,
          FOUNTAIN.z + Math.sin(a) * (FOUNTAIN.radius - 0.6),
        ),
        q,
        new THREE.Vector3(2.1, 1.5, 1.1),
      );
      petals.setMatrixAt(i, m);
    }
    petals.instanceMatrix.needsUpdate = true;
    scene.add(petals);

    const water = new THREE.Mesh(
      track(new THREE.CircleGeometry(FOUNTAIN.radius - 0.9, 40)),
      waterMat,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(FOUNTAIN.x, fy + 1.35, FOUNTAIN.z);
    water.renderOrder = 2;
    scene.add(water);

    // Jets. The real fountain had ~197; a few rings read the same at this scale.
    const jetSprite = track(radialSprite("rgba(255,255,255,0.95)", "rgba(215,238,248,0.5)"));
    for (const [ring, count, radius, height] of [
      [0, 1, 0, 6.2],
      [1, 8, 2.6, 3.6],
      [2, 12, 4.6, 2.4],
    ] as [number, number, number, number][]) {
      const perJet = 26;
      const total = count * perJet;
      const geo = track(new THREE.BufferGeometry());
      const arr = new Float32Array(total * 3);
      const seeds: number[] = [];
      const rnd = mulberry32(500 + ring);
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 + ring;
        for (let k = 0; k < perJet; k++) {
          const idx = j * perJet + k;
          arr[idx * 3] = FOUNTAIN.x + Math.cos(a) * radius;
          arr[idx * 3 + 1] = fy + 1.4;
          arr[idx * 3 + 2] = FOUNTAIN.z + Math.sin(a) * radius;
          seeds.push(k / perJet + rnd() * 0.02);
        }
      }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const mat = track(
        new THREE.PointsMaterial({
          size: 0.42,
          map: jetSprite,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.75,
        }),
      );
      const points = new THREE.Points(geo, mat);
      points.userData = { seeds, height, baseY: fy + 1.4, radius };
      fountainJets.push(points);
      scene.add(points);
    }
  }

  /* --- steps up to the rampart walk --- */

  {
    const stepMat = stoneDarkMat;
    for (let i = 0; i < 9; i++) {
      const step = new THREE.Mesh(
        track(new THREE.BoxGeometry(4, 1, 1.4)),
        stepMat,
      );
      step.position.set(-A + WALL_T + 2.4, 1.2 + i * 0.78, -A + 8 + i * 1.4);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }
  }

  /* --- flagstaffs on all four corner bastions --- */

  /** Shared saffron flag material; each corner gets its own cloth mesh for wave. */
  type FlagRig = {
    mesh: THREE.Mesh;
    /** Rest-pose X of each vertex (local cloth axis). */
    restX: Float32Array;
    phase: number;
  };
  const flagRigs: FlagRig[] = [];
  {
    // Four corner bastions of the curtain wall.
    const corners: { x: number; z: number; h: number }[] = [
      { x: -A, z: -A, h: 8.6 },
      { x: A, z: -A, h: 8.6 },
      { x: -A, z: A, h: 8.6 },
      { x: A, z: A, h: 8.6 },
    ];
    const poleGeo = track(new THREE.CylinderGeometry(0.16, 0.2, 11, 8));
    const finialGeo = track(new THREE.SphereGeometry(0.28, 8, 6));
    const poleH = 11;
    corners.forEach((c, i) => {
      const bastionTop = c.h + 0.8;
      const pole = new THREE.Mesh(poleGeo, stoneDarkMat);
      pole.position.set(c.x, bastionTop + poleH / 2, c.z);
      pole.castShadow = true;
      scene.add(pole);

      // Ball finial
      const finial = new THREE.Mesh(finialGeo, ironMat);
      finial.position.set(c.x, bastionTop + poleH + 0.2, c.z);
      scene.add(finial);

      // Cloth hangs outward from the fort centre so each corner reads clearly.
      const outward = new THREE.Vector3(c.x, 0, c.z).normalize();
      const cloth = new THREE.Mesh(track(new THREE.PlaneGeometry(6.4, 3.8, 12, 5)), flagMat);
      cloth.position.set(
        c.x + outward.x * 3.2,
        bastionTop + poleH - 2.2,
        c.z + outward.z * 3.2,
      );
      // Face the cloth so its +Z normal points roughly along the wall diagonal.
      cloth.rotation.y = Math.atan2(outward.x, outward.z);
      cloth.castShadow = true;
      scene.add(cloth);

      const attr = cloth.geometry.attributes.position as THREE.BufferAttribute;
      const restX = new Float32Array(attr.count);
      for (let v = 0; v < attr.count; v++) restX[v] = attr.getX(v);
      flagRigs.push({ mesh: cloth, restX, phase: i * 0.9 });
    });
  }

  /* --- trees --- */

  {
    const rnd = mulberry32(4242);
    const spots: { x: number; z: number; s: number }[] = [];
    let guard = 0;
    while (spots.length < 46 && guard < 3000) {
      guard++;
      const x = (rnd() - 0.5) * 108;
      const z = (rnd() - 0.5) * 108;
      if (Math.max(Math.abs(x), Math.abs(z)) > 47) continue;
      // Keep the walls, gate approach, plinths and fountain clear.
      if (Math.abs(Math.abs(x) - A) < 6 || Math.abs(Math.abs(z) - A) < 6) continue;
      if (Math.hypot(x - FOUNTAIN.x, z - FOUNTAIN.z) < FOUNTAIN.radius + 6) continue;
      if (z < -A && Math.abs(x) < 22) continue;
      if (
        PLINTHS.some(
          (p) => Math.abs(x - p.x) < p.w / 2 + 4 && Math.abs(z - p.z) < p.d / 2 + 4,
        )
      )
        continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 6)) continue;
      spots.push({ x, z, s: 0.9 + rnd() * 0.7 });
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
      m.compose(
        new THREE.Vector3(s.x, y + 1.7 * s.s, s.z),
        q,
        new THREE.Vector3(s.s, s.s, s.s),
      );
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

  /* --- the evening sound-and-light show --- */

  const showLights: THREE.SpotLight[] = [];
  {
    const rigs: [number, number, number, string][] = [
      [0, -A - 22, 10, "#ff9d3c"],
      [-26, -A - 14, 9, "#7c5cff"],
      [26, -A - 14, 9, "#ff5a5a"],
      [0, 30, 12, "#ffd08a"],
    ];
    for (const [lx, lz, ly, color] of rigs) {
      const light = new THREE.SpotLight(color, 0, 160, Math.PI / 7, 0.55, 1.4);
      light.position.set(lx, ly, lz);
      light.target.position.set(lx * 0.3, 7, lz > 0 ? 10 : -A);
      scene.add(light);
      scene.add(light.target);
      showLights.push(light);
    }
  }

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
    // Lamps along the rampart walk, lit for the show.
    for (const [bx, bz, , h] of BASTIONS) {
      const glow = new THREE.Sprite(lampGlowMat);
      glow.scale.setScalar(7);
      glow.position.set(bx, h + 2.4, bz);
      scene.add(glow);
    }
  }

  /* --- rain (monsoon) — capped for fill-rate; looks dense enough over the fort --- */

  const RAIN = 520;
  const rainGeo = track(new THREE.BufferGeometry());
  {
    const arr = new Float32Array(RAIN * 6);
    const rnd = mulberry32(88);
    for (let i = 0; i < RAIN; i++) {
      const x = (rnd() - 0.5) * 110;
      const y = rnd() * 70;
      const z = (rnd() - 0.5) * 110;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + 0.1;
      arr[i * 6 + 4] = y + 1.7;
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

  /* --- dust motes (winter / dry season) --- */

  const DUST = 80;
  const dustGeo = track(new THREE.BufferGeometry());
  const dustSeed: number[] = [];
  {
    const arr = new Float32Array(DUST * 3);
    const rnd = mulberry32(17);
    for (let i = 0; i < DUST; i++) {
      arr[i * 3] = (rnd() - 0.5) * 100;
      arr[i * 3 + 1] = 1 + rnd() * 16;
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
    sprite.position.copy(base).add(new THREE.Vector3(0, 8, 0));
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 34, 230);
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
  const monsoonSky = new THREE.Color("#1a3048");
  const monsoonFog = new THREE.Color("#8a9a90");
  const monsoonHemiG = new THREE.Color("#3a5a3a");
  const winterSky = new THREE.Color("#4a6a9a");
  const winterFog = new THREE.Color("#d8d0c4");
  const introFrom = new THREE.Vector3(0, 10, 0);

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

    // Season lighting on top of time-of-day: monsoon cools/greys the air,
    // winter (dry) keeps a clearer, cooler blue sky and bleached ground.
    if (cur.wet > 0.01) {
      cur.skyTop.lerp(monsoonSky, cur.wet * 0.4);
      cur.skyBottom.lerp(monsoonFog, cur.wet * 0.35);
      cur.fog.lerp(monsoonFog, cur.wet * 0.45);
      cur.hemiGround.lerp(monsoonHemiG, cur.wet * 0.5);
      cur.sunIntensity *= 1 - cur.wet * 0.35;
      cur.ambient += cur.wet * 0.12;
    } else {
      // Dry winter: slight cool lift on sky, longer clear sightlines.
      cur.skyTop.lerp(winterSky, 0.12);
      cur.fog.lerp(winterFog, 0.1);
    }

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.8 + cur.wet * 0.3;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity * (1 - cur.wet * 0.4);
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    fog.near = 190 - cur.wet * 80;
    fog.far = 560 - cur.wet * 240;
    // Winter: clearer far fog; monsoon pulls fog closer (handled by wet above).
    if (cur.wet < 0.05) {
      fog.near = 210;
      fog.far = 620;
    }
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    // Greener lawns in monsoon; pale dry winter grass otherwise.
    groundMat.color.setRGB(
      THREE.MathUtils.lerp(1, 0.78, cur.wet),
      THREE.MathUtils.lerp(0.96, 1.05, cur.wet),
      THREE.MathUtils.lerp(0.88, 0.86, cur.wet),
    );
    leafMat.color.setRGB(
      THREE.MathUtils.lerp(0.31, 0.2, cur.wet),
      THREE.MathUtils.lerp(0.48, 0.58, cur.wet),
      THREE.MathUtils.lerp(0.24, 0.3, cur.wet),
    );

    waterMat.uniforms.uTime.value = elapsed * motion;
    waterMat.uniforms.uSky.value = cur.skyBottom;
    (waterMat.uniforms.uCamera.value as THREE.Vector3).copy(camera.position);

    /* fountain jets */
    for (const jet of fountainJets) {
      const { seeds, height, baseY, radius } = jet.userData as {
        seeds: number[];
        height: number;
        baseY: number;
        radius: number;
      };
      const attr = jet.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < seeds.length; i++) {
        const t = ((elapsed * motion * 0.55 + seeds[i]) % 1 + 1) % 1;
        // Simple ballistic arc: up fast, fall back into the basin.
        const y = baseY + height * (4 * t * (1 - t));
        const spread = 1 + t * 1.5;
        const a = Math.atan2(attr.getZ(i) - FOUNTAIN.z, attr.getX(i) - FOUNTAIN.x);
        attr.setY(i, y);
        attr.setX(i, FOUNTAIN.x + Math.cos(a) * (radius + spread * 0.35));
        attr.setZ(i, FOUNTAIN.z + Math.sin(a) * (radius + spread * 0.35));
      }
      attr.needsUpdate = true;
      (jet.material as THREE.PointsMaterial).opacity = 0.55 + cur.wet * 0.25;
    }

    /* the light show */
    for (let i = 0; i < showLights.length; i++) {
      const pulse = 0.75 + Math.sin(elapsed * (0.6 + i * 0.17) + i) * 0.25 * motion;
      showLights[i].intensity = Math.pow(cur.lantern, 2) * 900 * pulse;
    }
    lampGlowMat.opacity = cur.lantern * 0.7;

    /* four corner flags — wind stronger in monsoon */
    if (motion) {
      const wind = 0.45 + cur.wet * 0.35;
      for (const rig of flagRigs) {
        const attr = rig.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const x = rig.restX[i];
          const u = (x + 3.2) / 6.4;
          attr.setZ(
            i,
            Math.sin(u * 6 - elapsed * (4.5 + rig.phase) + rig.phase) * wind * u,
          );
        }
        attr.needsUpdate = true;
      }
    }

    /* rain + dust */
    rain.visible = cur.wet > 0.02;
    rainMat.opacity = cur.wet * 0.55;
    if (rain.visible && motion) {
      const attr = rainGeo.attributes.position as THREE.BufferAttribute;
      const fall = 42 + cur.wet * 18;
      for (let i = 0; i < RAIN; i++) {
        let y = attr.getY(i * 2) - fall * dt;
        if (y < 0) y = 66;
        attr.setY(i * 2, y);
        attr.setY(i * 2 + 1, y + 1.7);
      }
      attr.needsUpdate = true;
    }
    dustMat.opacity = (1 - cur.wet) * (0.14 + cur.lantern * 0.22);
    if (motion && cur.wet < 0.85) {
      const attr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        const s = dustSeed[i];
        attr.setY(i, 2 + ((elapsed * 0.35 + s) % 14));
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.3 + s) * dt * 1.2);
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
        marker.base.y + 8 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.3 * motion;
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
