import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./data";

export const ease = Easing.bezier(0.22, 1, 0.36, 1); // easeOutQuint-like
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 entre frames a e b, com easing. */
export const prog = (f: number, a: number, b: number, e = ease) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** Entrada (0→1) e saída (1→0): visível entre inA..outB. */
export const inOut = (f: number, inA: number, inB: number, outA: number, outB: number) =>
  Math.min(prog(f, inA, inB), 1 - prog(f, outA, outB, easeInOut));

export const spr = (f: number, delay = 0, damping = 18, stiffness = 120) =>
  spring({ frame: f - delay, fps: FPS, config: { damping, stiffness, mass: 0.9 } });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pseudo-aleatório determinístico. */
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type Key = { f: number; x: number; y: number; z: number };
/** Interpola uma sequência de keyframes de câmera (centro x,y em coordenadas da tela 1920x1080, zoom z). */
export const camAt = (f: number, keys: Key[]) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = easeInOut(Math.max(0, Math.min(1, (f - a.f) / Math.max(1, b.f - a.f))));
      // zoom interpolado em escala logarítmica soa mais natural
      return { f, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)) };
    }
  }
  return keys[keys.length - 1];
};
