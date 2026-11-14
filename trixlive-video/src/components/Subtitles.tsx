import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TL } from "../lib/data";
import { FONT } from "../lib/theme";
import { prog } from "../lib/anim";

/** Falas cujo texto já aparece como tipografia na tela (evita duplicar a mesma frase). */
const ON_SCREEN = new Set(["intro-1", "intro-2", "intro-3", "intro-4", "outro-1"]);

/** Legendas queimadas, sincronizadas com os blocos calculados a partir do áudio real da locução. */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  for (const sc of TL.scenes) {
    for (const l of sc.lines) {
      if (ON_SCREEN.has(l.id)) continue;
      for (let i = 0; i < l.subs.length; i++) {
        const s = l.subs[i];
        const nextFrom = l.subs[i + 1]?.from;
        const end = nextFrom ?? s.to + 8;
        if (f >= s.from && f < end) {
          const a = prog(f, s.from, s.from + 5) * (1 - prog(f, end - 4, end));
          return (
            <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46, pointerEvents: "none" }}>
              <div style={{
                opacity: a, transform: `translateY(${(1 - prog(f, s.from, s.from + 6)) * 8}px)`,
                background: "rgba(5,7,18,0.72)", borderRadius: 14, padding: "10px 26px 12px",
                border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(6px)",
                fontFamily: FONT.body, fontWeight: 600, fontSize: 38, lineHeight: 1.28, color: "#fff",
                textAlign: "center", letterSpacing: 0.2, textShadow: "0 2px 6px rgba(0,0,0,0.6)", maxWidth: 1500,
              }}>
                {s.rows.map((r, k) => <div key={k}>{r}</div>)}
              </div>
            </AbsoluteFill>
          );
        }
      }
    }
  }
  return null;
};
