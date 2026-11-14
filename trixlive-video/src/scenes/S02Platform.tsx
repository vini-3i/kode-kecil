import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Shot } from "../components/Screen";
import { CircleReveal, Morph } from "../components/Graphics";
import { Kinetic } from "../components/Type";
import { Sfx } from "../components/Audio";
import { useLines, wordFrame } from "../lib/data";
import { prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

const FEATURES = [
  { label: "Tela", shape: "monitor" as const },
  { label: "Voz", shape: "mic" as const },
  { label: "Navegador", shape: "browser" as const },
];
const JOURNEY = ["Acessar", "Apelido", "Perfil", "Microfone", "Sala", "Convite", "Tela", "Voz"];

export const S02Platform: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("platform");
  const navAt = wordFrame(L[1], "navegador");
  const t = f / 30;
  return (
    <CircleReveal at={0} dur={22}>
      <Backdrop intensity={0.8} seed={4} />
      {/* janela 3D flutuante com a página inicial */}
      <AbsoluteFill style={{ perspective: 1600 }}>
        <div style={{
          position: "absolute", left: 930, top: 210,
          transform: `rotateY(${-22 + 8 * prog(f, L[2].start, L[2].start + 60)}deg) rotateX(${7 + Math.sin(t * 0.8) * 1.5}deg) translateY(${Math.sin(t * 1.1) * 10}px) scale(${0.92 + 0.08 * prog(f, 0, 60)})`,
          transformStyle: "preserve-3d", opacity: prog(f, 6, 30),
        }}>
          <BrowserFrame width={880} glow={1.3}><Shot name="home" /></BrowserFrame>
        </div>
        {/* recursos orbitando a janela */}
        {FEATURES.map((ft, i) => {
          const ang = t * 0.55 + (i * Math.PI * 2) / 3;
          const x = 1420 + Math.cos(ang) * 400, y = 480 + Math.sin(ang) * 150;
          const depth = Math.sin(ang);
          const isNav = i === 2;
          const hl = isNav ? prog(f, navAt - 6, navAt + 10) * (1 - prog(f, L[2].start, L[2].start + 20)) : 0;
          const appear = prog(f, L[0].start + 10 + i * 14, L[0].start + 30 + i * 14);
          return (
            <div key={ft.label} style={{
              position: "absolute", left: x - 90, top: y - 40, width: 180, display: "flex", alignItems: "center", gap: 12,
              padding: "14px 18px", borderRadius: 18, background: "rgba(14,18,40,0.86)", border: `1px solid ${alpha(hl > 0 ? C.secondary : "#fff", 0.15 + 0.6 * hl)}`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 ${40 * hl}px ${alpha(C.secondary, 0.8)}`,
              opacity: appear * (0.55 + 0.45 * (depth + 1) / 2), transform: `scale(${(0.82 + 0.18 * (depth + 1) / 2) * (1 + 0.15 * hl)})`,
              zIndex: depth > 0 ? 10 : 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 28, color: "#fff",
            }}>
              <Morph size={44} seq={[{ shape: ft.shape, at: 0 }]} glow={false} />{ft.label}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* texto à esquerda */}
      <div style={{ position: "absolute", left: 120, top: 250, width: 760 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: 4, color: C.secondary, opacity: prog(f, L[0].start - 10, L[0].start + 10) }}>
          PLATAFORMA WEB
        </div>
        <Kinetic text="Sua tela e sua voz," at={L[0].start} size={74} align="left" accent={["tela", "voz"]} style={{ marginTop: 14 }} />
        <Kinetic text="em uma sala só sua." at={L[0].start + 30} size={74} align="left" accent={["sala"]} />
        <div style={{
          marginTop: 30, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.body, fontSize: 32, color: C.muted,
          opacity: prog(f, navAt - 20, navAt), transform: `translateY(${(1 - prog(f, navAt - 20, navAt)) * 16}px)`,
        }}>
          <span style={{ color: C.secondary, fontSize: 30 }}>●</span> Tudo dentro do navegador.
        </div>
        {/* jornada */}
        <div style={{ marginTop: 60, opacity: prog(f, L[2].start, L[2].start + 16) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: 3, color: alpha("#fff", 0.6), marginBottom: 16 }}>JORNADA DO PRIMEIRO ACESSO</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: 700 }}>
            {JOURNEY.map((s, i) => {
              const p = prog(f, L[2].start + 10 + i * 6, L[2].start + 24 + i * 6);
              return (
                <div key={s} style={{
                  opacity: p, transform: `translateY(${(1 - p) * 14}px)`, padding: "8px 16px", borderRadius: 999,
                  fontFamily: FONT.body, fontWeight: 600, fontSize: 21, color: "#fff", background: alpha("#fff", 0.06), border: `1px solid ${alpha("#fff", 0.14)}`,
                }}>
                  <span style={{ fontFamily: FONT.mono, color: C.secondary, marginRight: 8, fontSize: 17 }}>{String(i + 1).padStart(2, "0")}</span>{s}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Sfx name="whoosh" at={0} />
      <Sfx name="blip" at={navAt - 4} />
      <Sfx name="swipe" at={L[2].start + 8} />
    </CircleReveal>
  );
};
