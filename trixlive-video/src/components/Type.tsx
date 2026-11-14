import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FONT } from "../lib/theme";
import { prog, ease } from "../lib/anim";

/** Tipografia cinética: palavras entram em sequência (deslocamento + desfoque + opacidade). */
export const Kinetic: React.FC<{
  text: string; at: number; until?: number; size?: number; weight?: number; color?: string; accent?: string[]; stagger?: number;
  align?: "left" | "center"; font?: string; style?: React.CSSProperties; gradientAccent?: boolean;
}> = ({ text, at, until = 1e9, size = 72, weight = 700, color = "#fff", accent = [], stagger = 3, align = "center", font = FONT.display, style, gradientAccent = true }) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  const out = prog(f, until, until + 14);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", gap: `0 ${size * 0.26}px`, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.12, color, ...style }}>
      {words.map((w, i) => {
        const p = prog(f, at + i * stagger, at + i * stagger + 16);
        const isAcc = accent.some((a) => w.replace(/[.,:!?]/g, "").toLowerCase() === a.toLowerCase());
        return (
          <span key={i} style={{
            display: "inline-block", opacity: p * (1 - out), transform: `translateY(${(1 - p) * size * 0.45 - out * size * 0.3}px)`,
            filter: `blur(${(1 - p) * 10 + out * 8}px)`,
            ...(isAcc && gradientAccent ? { background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}),
          }}>{w}</span>
        );
      })}
    </div>
  );
};

/** Marca nominativa "TrixLive" com entrada letra a letra, brilho e feixe de luz. */
export const Wordmark: React.FC<{ at: number; size?: number; shine?: boolean }> = ({ at, size = 220, shine = true }) => {
  const f = useCurrentFrame();
  const letters = "TrixLive".split("");
  const sweep = prog(f, at + 26, at + 70, ease);
  return (
    <div style={{ position: "relative", display: "inline-flex", fontFamily: FONT.display, fontWeight: 700, fontSize: size, letterSpacing: -size * 0.03, lineHeight: 1 }}>
      {letters.map((l, i) => {
        const p = prog(f, at + i * 3, at + i * 3 + 22);
        const live = i >= 4;
        return (
          <span key={i} style={{
            display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 60}px) rotateX(${(1 - p) * 70}deg) scale(${0.85 + 0.15 * p})`,
            filter: `blur(${(1 - p) * 14}px)`,
            ...(live
              ? { background: `linear-gradient(100deg, ${C.primary} 10%, ${C.secondary} 90%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
              : { color: "#fff" }),
            textShadow: live ? "none" : `0 0 40px rgba(255,255,255,0.25)`,
          }}>{l}</span>
        );
      })}
      {shine && sweep > 0 && sweep < 1 && (
        <div style={{
          position: "absolute", inset: 0, mixBlendMode: "overlay",
          background: `linear-gradient(105deg, transparent ${sweep * 140 - 30}%, rgba(255,255,255,0.95) ${sweep * 140 - 15}%, transparent ${sweep * 140}%)`,
        }} />
      )}
      <div style={{
        position: "absolute", left: "50%", bottom: -size * 0.16, height: 4, width: `${prog(f, at + 18, at + 48) * 100}%`, transform: "translateX(-50%)",
        background: `linear-gradient(90deg, transparent, ${C.secondary}, ${C.primary}, transparent)`, boxShadow: `0 0 24px ${C.secondary}`, borderRadius: 2,
      }} />
    </div>
  );
};

/** Texto digitado caractere a caractere. */
export const Typed: React.FC<{ text: string; at: number; every?: number; caret?: boolean; style?: React.CSSProperties }> = ({ text, at, every = 3, caret = true, style }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / every)));
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret && <span style={{ opacity: Math.floor(f / 14) % 2 ? 0 : 1, color: C.secondary }}>|</span>}
    </span>
  );
};
