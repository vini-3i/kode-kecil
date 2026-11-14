import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, alpha } from "../lib/theme";
import { rnd } from "../lib/anim";

/** Fundo tecnológico: gradiente profundo, brilho de cor, grade 3D em perspectiva, partículas e linhas luminosas. */
export const Backdrop: React.FC<{ intensity?: number; hue?: string; grid?: boolean; particles?: number; lines?: boolean; seed?: number }> = ({
  intensity = 1, hue = C.primary, grid = true, particles = 70, lines = true, seed = 1,
}) => {
  const f = useCurrentFrame();
  const pts = useMemo(
    () => Array.from({ length: particles }, (_, i) => ({
      x: rnd(i * 3 + seed), y: rnd(i * 7 + seed * 13), r: 0.6 + rnd(i * 11 + seed) * 2.2,
      sp: 0.15 + rnd(i * 5 + seed) * 0.6, ph: rnd(i * 17 + seed) * Math.PI * 2,
      c: i % 4 === 0 ? C.secondary : i % 7 === 0 ? C.hot : "#ffffff",
    })),
    [particles, seed],
  );
  const t = f / 30;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${C.bg1} 0%, ${C.bg0} 70%)`, overflow: "hidden" }}>
      {/* brilhos de cor que respiram */}
      <div style={{
        position: "absolute", width: 1400, height: 1400, left: 260 + Math.sin(t * 0.25) * 160, top: -520 + Math.cos(t * 0.2) * 80,
        background: `radial-gradient(circle, ${alpha(hue, 0.28 * intensity)} 0%, transparent 62%)`, filter: "blur(10px)",
      }} />
      <div style={{
        position: "absolute", width: 1100, height: 1100, right: -300 + Math.cos(t * 0.3) * 120, bottom: -560,
        background: `radial-gradient(circle, ${alpha(C.secondary, 0.16 * intensity)} 0%, transparent 60%)`,
      }} />
      {grid && (
        <div style={{ position: "absolute", left: -960, right: -960, bottom: -120, height: 620, perspective: 700, perspectiveOrigin: "50% 0%" }}>
          <div style={{
            position: "absolute", inset: 0, transform: "rotateX(72deg)", transformOrigin: "50% 0%",
            backgroundImage: `linear-gradient(${alpha(hue, 0.35)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${alpha(hue, 0.35)} 1.5px, transparent 1.5px)`,
            backgroundSize: "90px 90px", backgroundPosition: `0px ${(f * 1.6) % 90}px`,
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
            opacity: 0.55 * intensity,
          }} />
        </div>
      )}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="beam" x1="0" x2="1">
            <stop offset="0" stopColor={hue} stopOpacity="0" />
            <stop offset="0.5" stopColor={hue} stopOpacity="0.9" />
            <stop offset="1" stopColor={C.secondary} stopOpacity="0" />
          </linearGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>
        {pts.map((p, i) => {
          const y = ((p.y * 1080 - f * p.sp * 1.2) % 1080 + 1080) % 1080;
          const x = p.x * 1920 + Math.sin(t * p.sp + p.ph) * 18;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2 * p.sp + p.ph));
          return <circle key={i} cx={x} cy={y} r={p.r} fill={p.c} opacity={0.55 * tw * intensity} />;
        })}
        {lines && [0, 1, 2, 3].map((i) => {
          const period = 210 + i * 47;
          const ph = ((f + i * 83) % period) / period;
          const y0 = 140 + i * 230 + Math.sin(i) * 40;
          const len = 520;
          const x = -len + ph * (1920 + len * 2);
          return (
            <g key={i} opacity={0.75 * intensity}>
              <path d={`M ${x} ${y0} L ${x + len} ${y0 - 120}`} stroke="url(#beam)" strokeWidth={2} filter="url(#soft)" />
              <path d={`M ${x} ${y0} L ${x + len} ${y0 - 120}`} stroke="url(#beam)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      {/* vinheta */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};
