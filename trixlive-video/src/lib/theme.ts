import { CAP } from "./data";

/** Converte "rgb(r, g, b)" / "#hex" em hex; retorna null se não for cor sólida. */
const toHex = (c?: string | null): string | null => {
  if (!c) return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null;
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
};
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

// Paleta padrão da peça (usada até que as cores reais sejam extraídas por `npm run capture`).
const DEFAULTS = {
  bg0: "#04050d",
  bg1: "#0a0e22",
  primary: "#7c5cff",
  secondary: "#22d3ee",
  hot: "#ff4f8b",
  text: "#f4f6ff",
  muted: "#9aa3c7",
};

const brandPrimary = toHex(CAP.brand?.primary ?? null);
const brandBg = toHex(CAP.brand?.background ?? null);

export const C = {
  ...DEFAULTS,
  // Se a marca real tiver cor primária vibrante, ela passa a guiar os brilhos e destaques.
  primary: brandPrimary && lum(brandPrimary) > 0.12 && lum(brandPrimary) < 0.9 ? brandPrimary : DEFAULTS.primary,
  siteBg: brandBg ?? DEFAULTS.bg1,
};

export const FONT = {
  display: "SpaceGrotesk, Inter, sans-serif",
  body: "Inter, sans-serif",
  mono: "JetBrainsMono, monospace",
};

export const alpha = (hex: string, a: number) => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
