import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import QRCode from "qrcode";
import { C, FONT, alpha } from "../lib/theme";
import { ease, easeInOut, prog, rnd } from "../lib/anim";
import { drawDemoGame } from "../shared/demoGame.js";

// ------------------------------------------------------------------ morphing SVG
export const SHAPES = {
  monitor: "M10 15 H90 V65 H58 V78 H70 V85 H30 V78 H42 V65 H10 Z",
  wave: "M8 50 L22 50 L28 30 L36 72 L44 18 L52 82 L60 34 L66 62 L72 50 L92 50 L92 54 L72 54 L66 70 L60 44 L52 92 L44 30 L36 82 L28 42 L22 54 L8 54 Z",
  browser: "M8 16 H92 V84 H8 Z",
  mic: "M36 14 A14 14 0 0 1 64 14 V46 A14 14 0 0 1 36 46 Z",
  bubble: "M12 18 H88 V66 H44 L28 82 V66 H12 Z",
  lockOpen: "M26 46 V30 A22 22 0 0 1 68 22 L58 26 A12 12 0 0 0 36 30 V46 H80 V90 H20 V46 Z",
  lock: "M28 46 V32 A22 22 0 0 1 72 32 V46 H80 V90 H20 V46 Z",
  shield: "M50 6 L88 20 V46 C88 70 72 84 50 94 C28 84 12 70 12 46 V20 Z",
  circle: "M50 8 A42 42 0 1 1 49.9 8 Z",
  download: "M40 8 H60 V44 H78 L50 74 L22 44 H40 Z",
  user: "M50 10 A18 18 0 1 1 49.9 10 Z",
};
type ShapeName = keyof typeof SHAPES;
const N = 96;
const cache = new Map<string, [number, number][]>();
const sample = (d: string): [number, number][] => {
  const hit = cache.get(d);
  if (hit) return hit;
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  const L = p.getTotalLength();
  let pts: [number, number][] = Array.from({ length: N }, (_, i) => {
    const q = p.getPointAtLength((L * i) / N);
    return [q.x, q.y];
  });
  // alinha o início no ponto mais alto/esquerdo para reduzir torções
  let best = 0;
  pts.forEach((q, i) => { if (q[1] + q[0] * 0.01 < pts[best][1] + pts[best][0] * 0.01) best = i; });
  pts = [...pts.slice(best), ...pts.slice(0, best)];
  cache.set(d, pts);
  return pts;
};

/** Ícone que se transforma (morphing) entre silhuetas em frames definidos. */
export const Morph: React.FC<{ seq: { shape: ShapeName; at: number }[]; size?: number; dur?: number; fill?: string; glow?: boolean; style?: React.CSSProperties }> = ({
  seq, size = 160, dur = 16, fill, glow = true, style,
}) => {
  const f = useCurrentFrame();
  let i = 0;
  while (i < seq.length - 1 && f >= seq[i + 1].at) i++;
  const cur = sample(SHAPES[seq[i].shape]);
  let pts = cur;
  if (i > 0) {
    const prev = sample(SHAPES[seq[i - 1].shape]);
    const t = easeInOut(Math.min(1, (f - seq[i].at) / dur));
    pts = cur.map((q, k) => [prev[k][0] + (q[0] - prev[k][0]) * t, prev[k][1] + (q[1] - prev[k][1]) * t]);
  }
  const id = useMemo(() => `mg${Math.floor(rnd(seq[0].at + size) * 1e6)}`, [seq, size]);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.primary} />
          <stop offset="1" stopColor={C.secondary} />
        </linearGradient>
      </defs>
      <polygon points={pts.map((q) => q.join(",")).join(" ")} fill={fill ?? `url(#${id})`} style={glow ? { filter: `drop-shadow(0 0 10px ${alpha(C.primary, 0.7)})` } : undefined} />
    </svg>
  );
};

// ------------------------------------------------------------------ rede 3D
/** Rede de nós em 3D que gira e se conecta; `converge` (0..1) puxa tudo para o centro. */
export const Network3D: React.FC<{ at: number; converge?: number; radius?: number; nodes?: number }> = ({ at, converge = 0, radius = 420, nodes = 34 }) => {
  const f = useCurrentFrame();
  const pts = useMemo(() => Array.from({ length: nodes }, (_, i) => {
    const u = rnd(i * 3.1 + 1), v = rnd(i * 5.7 + 2);
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    const r = 0.65 + 0.35 * rnd(i * 9.3);
    return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th)];
  }), [nodes]);
  const edges = useMemo(() => {
    const e: [number, number][] = [];
    pts.forEach((a, i) => {
      const d = pts.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])] as [number, number]).filter((x) => x[0] !== i).sort((x, y) => x[1] - y[1]);
      d.slice(0, 2).forEach(([j]) => { if (!e.some(([p, q]) => (p === j && q === i))) e.push([i, j]); });
    });
    return e;
  }, [pts]);
  const ry = (f - at) * 0.008, rx = 0.35 + Math.sin((f - at) / 140) * 0.12;
  const R = radius * (1 - 0.92 * ease(converge));
  const proj = pts.map((p) => {
    const x1 = p[0] * Math.cos(ry) - p[2] * Math.sin(ry);
    const z1 = p[0] * Math.sin(ry) + p[2] * Math.cos(ry);
    const y2 = p[1] * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = p[1] * Math.sin(rx) + z1 * Math.cos(rx);
    const s = 900 / (900 + z2 * R);
    return { x: 960 + x1 * R * s, y: 540 + y2 * R * s, s, z: z2 };
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="node"><stop offset="0" stopColor="#fff" /><stop offset="0.4" stopColor={C.secondary} /><stop offset="1" stopColor={C.secondary} stopOpacity="0" /></radialGradient>
      </defs>
      {edges.map(([i, j], k) => {
        const p = prog(f, at + 10 + k * 1.2, at + 34 + k * 1.2);
        if (p <= 0) return null;
        const a = proj[i], b = proj[j];
        return <line key={k} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * p} y2={a.y + (b.y - a.y) * p} stroke={k % 3 ? C.primary : C.secondary} strokeOpacity={0.18 + 0.32 * ((a.s + b.s) / 2 - 0.6)} strokeWidth={1.4} />;
      })}
      {proj.map((q, i) => {
        const p = prog(f, at + i * 1.5, at + i * 1.5 + 14);
        return <circle key={i} cx={q.x} cy={q.y} r={(5 + 9 * (q.s - 0.6)) * p} fill="url(#node)" opacity={0.5 + 0.5 * (q.s - 0.6)} />;
      })}
    </svg>
  );
};

// ------------------------------------------------------------------ QR code
export const QR: React.FC<{ text: string; size: number; reveal?: number; fg?: string; bg?: string }> = ({ text, size, reveal = 1, fg = "#0a0d1f", bg = "#fff" }) => {
  const m = useMemo(() => QRCode.create(text, { errorCorrectionLevel: "M" }).modules, [text]);
  const n = m.size, q = 2, cell = size / (n + q * 2);
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!m.data[y * n + x]) continue;
    const d = (x + y) / (2 * n);
    if (d > reveal) continue;
    rects.push(<rect key={`${x}-${y}`} x={(x + q) * cell} y={(y + q) * cell} width={cell + 0.4} height={cell + 0.4} fill={fg} />);
  }
  return <svg width={size} height={size}><rect width={size} height={size} rx={size * 0.06} fill={bg} />{rects}</svg>;
};

// ------------------------------------------------------------------ conteúdo de demonstração
/** Minijogo original usado como conteúdo compartilhado nas ilustrações. */
export const DemoGame: React.FC<{ width: number; height: number; offset?: number; style?: React.CSSProperties }> = ({ width, height, offset = 0, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) drawDemoGame(ctx, c.width, c.height, (f + offset) / 30);
  }, [f, offset]);
  return <canvas ref={ref} width={width} height={height} style={{ width, height, display: "block", ...style }} />;
};

// ------------------------------------------------------------------ dispositivos ilustrativos
export const Phone: React.FC<{ children: React.ReactNode; width?: number; style?: React.CSSProperties }> = ({ children, width = 300, style }) => {
  const h = width * 2.05;
  return (
    <div style={{ width, height: h, borderRadius: width * 0.16, background: "#05060c", padding: width * 0.04, boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px ${alpha("#fff", 0.14)}, 0 0 60px ${alpha(C.primary, 0.35)}`, position: "relative", ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.12, overflow: "hidden", position: "relative", background: "#0c1024" }}>{children}</div>
      <div style={{ position: "absolute", top: width * 0.07, left: "50%", transform: "translateX(-50%)", width: width * 0.28, height: width * 0.07, borderRadius: 99, background: "#000" }} />
    </div>
  );
};

/** Ilustração genérica do seletor de compartilhamento do navegador (não é a interface da TrixLive). */
export const PermissionDialog: React.FC<{ at: number; tab: number; picked: number; pressAt: number }> = ({ at, tab, picked, pressAt }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 18);
  const tabs = ["Tela inteira", "Janela", "Guia"];
  const press = f >= pressAt && f < pressAt + 8;
  return (
    <div style={{
      width: 980, borderRadius: 20, background: "#f5f6fb", color: "#151827", fontFamily: FONT.body, padding: "34px 40px 30px",
      boxShadow: "0 50px 140px rgba(0,0,0,0.65)", opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + 0.06 * p})`,
    }}>
      <div style={{ fontSize: 34, fontWeight: 600 }}>Escolha o que compartilhar</div>
      <div style={{ fontSize: 22, color: "#5a6078", marginTop: 8 }}>korabots.com.br quer compartilhar o conteúdo da sua tela.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 24, borderBottom: "2px solid #e3e5ef" }}>
        {tabs.map((t, i) => (
          <div key={t} style={{ padding: "12px 22px", fontSize: 22, fontWeight: 600, color: i === tab ? "#3b2fd9" : "#5a6078", borderBottom: i === tab ? "3px solid #3b2fd9" : "3px solid transparent", marginBottom: -2 }}>{t}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 24, height: 236 }}>
        {[0, 1, 2].map((i) => {
          const on = i === picked;
          return (
            <div key={i} style={{ flex: 1, borderRadius: 14, padding: 10, background: on ? "#e7e4ff" : "#fff", border: on ? "3px solid #3b2fd9" : "3px solid #e3e5ef" }}>
              <div style={{ height: 160, borderRadius: 8, overflow: "hidden", background: "#d9dcea" }}>
                {i === 0 ? <DemoGame width={268} height={160} /> : (
                  <div style={{ padding: 14 }}>{[70, 90, 55, 80].map((w, k) => <div key={k} style={{ height: 14, width: `${w}%`, background: "#c3c7da", borderRadius: 7, marginBottom: 12 }} />)}</div>
                )}
              </div>
              <div style={{ fontSize: 19, marginTop: 10, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {i === 0 ? "Órbita Neon (demonstração)" : i === 1 ? "Documento de exemplo" : "Nova guia"}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 26 }}>
        <div style={{ padding: "12px 26px", borderRadius: 999, border: "2px solid #c9cce0", fontSize: 22, fontWeight: 600, color: "#3b2fd9" }}>Cancelar</div>
        <div style={{ padding: "12px 30px", borderRadius: 999, background: picked >= 0 ? "#3b2fd9" : "#b9bdd6", fontSize: 22, fontWeight: 600, color: "#fff", transform: press ? "scale(0.95)" : "none" }}>Compartilhar</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ transições
/** Revela o conteúdo com máscara circular a partir de um ponto. */
export const CircleReveal: React.FC<{ at: number; dur?: number; x?: number; y?: number; children: React.ReactNode }> = ({ at, dur = 22, x = 960, y = 540, children }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + dur, easeInOut);
  if (p <= 0) return null;
  const r = p * 2300;
  return <AbsoluteFill style={{ clipPath: p >= 1 ? undefined : `circle(${r}px at ${x}px ${y}px)` }}>{children}</AbsoluteFill>;
};

/** Revela com máscara diagonal (wipe). */
export const WipeReveal: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 20, children }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + dur, easeInOut);
  if (p <= 0) return null;
  const x = -400 + p * 2800;
  return <AbsoluteFill style={{ clipPath: p >= 1 ? undefined : `polygon(0 0, ${x}px 0, ${x - 400}px 1080px, 0 1080px)` }}>{children}</AbsoluteFill>;
};

/** Ondas sonoras concêntricas (indicador de voz). */
export const VoiceRings: React.FC<{ x: number; y: number; at: number; active?: boolean; color?: string; size?: number }> = ({ x, y, at, active = true, color = C.secondary, size = 60 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = (((f - at) / 36 + k / 3) % 1);
        return <div key={k} style={{ position: "absolute", left: x - size * (1 + t), top: y - size * (1 + t), width: size * 2 * (1 + t), height: size * 2 * (1 + t), borderRadius: "50%", border: `3px solid ${color}`, opacity: active ? (1 - t) * 0.8 : 0 }} />;
      })}
    </>
  );
};

/** Barras de nível de áudio. */
export const Meter: React.FC<{ at: number; bars?: number; height?: number; color?: string }> = ({ at, bars = 14, height = 70, color = C.secondary }) => {
  const f = useCurrentFrame();
  const on = prog(f, at, at + 10);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, height }}>
      {Array.from({ length: bars }, (_, i) => {
        const v = 0.15 + 0.85 * Math.abs(Math.sin(f / 4.3 + i * 0.9) * Math.sin(f / 7.1 + i * 0.37));
        return <div key={i} style={{ width: 9, height: height * (0.12 + 0.88 * v * on), borderRadius: 5, background: `linear-gradient(${color}, ${C.primary})` }} />;
      })}
    </div>
  );
};
