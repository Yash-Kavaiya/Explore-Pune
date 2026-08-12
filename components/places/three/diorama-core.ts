/**
 * Shared primitives for the hand-built three.js dioramas
 * (components/places/okayama, components/places/shaniwar).
 *
 * Only stateless helpers live here — maths, generated textures, the sky shader
 * and the palette shape. Each diorama owns its own renderer, camera rig and
 * content, because those differ in kind between a garden and a fort.
 */

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type TimeOfDay = "dawn" | "golden" | "dusk";
export type Season = "dry" | "monsoon";

export type Palette = {
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
  /** 0 → lamps/lanterns unlit, 1 → fully glowing. */
  lantern: number;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
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

/* ------------------------------------------------------------------ */
/* Maths                                                               */
/* ------------------------------------------------------------------ */

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent easing towards a target. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG, so a scene looks identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Generated textures (nothing is ever fetched)                        */
/* ------------------------------------------------------------------ */

export function radialSprite(inner: string, mid: string, size = 128): THREE.Texture {
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

/** Numbered map-pin style marker. */
export function markerSprite(label: string, active: boolean): THREE.Texture {
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
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

export const SKY_VERT = [
  "varying vec3 vPos;",
  "void main() {",
  "  vPos = position;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}",
].join("\n");

/**
 * The camera always looks *down* at a diorama, so most of what is visible sits
 * below the horizon. The gradient is therefore mapped across the whole sphere
 * rather than only the upper hemisphere, and the sun is a tight disc — a broad
 * halo washes the entire backdrop to one flat colour.
 */
export const SKY_FRAG = [
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
  "  col += sunColor * (pow(d, 320.0) * 1.4 + pow(d, 22.0) * 0.16);",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");
