import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Shot } from "../components/Screen";
import { Network3D, QR, WipeReveal } from "../components/Graphics";
import { Kinetic, Wordmark } from "../components/Type";
import { Sfx } from "../components/Audio";
import { scene, useLines, wordFrame } from "../lib/data";
import { prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

export const S11Outro: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("outro");
  const dur = scene("outro").durationInFrames;
  const t = f / 30;
  const urlAt = wordFrame(L[1], "korabots");
  const ctaAt = wordFrame(L[1], "crie");
  const fadeOut = prog(f, dur - 36, dur - 2);
  return (
    <WipeReveal at={0} dur={22}>
      <AbsoluteFill style={{ opacity: 1 - fadeOut }}>
        <Backdrop intensity={1} seed={37} />
        <AbsoluteFill style={{ opacity: 0.35 }}><Network3D at={-200} radius={620} nodes={26} /></AbsoluteFill>
        {/* interface real novamente, em 3D */}
        <AbsoluteFill style={{ perspective: 1700 }}>
          <div style={{
            position: "absolute", left: 1010, top: 250, opacity: prog(f, 4, 26),
            transform: `rotateY(${-24 + Math.sin(t * 0.5) * 3}deg) rotateX(${6}deg) translateY(${Math.sin(t) * 10}px) scale(${0.95 + 0.05 * prog(f, 0, 90)})`,
          }}>
            <BrowserFrame width={860} glow={1.6}><Shot name="final" /></BrowserFrame>
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 120, top: 210, perspective: 900 }}>
          <Wordmark at={L[0].start - 14} size={170} />
        </div>
        <div style={{ position: "absolute", left: 124, top: 445, width: 860 }}>
          <Kinetic text="Sua tela, sua sala, sua conexão." at={wordFrame(L[0], "Sua tela")} size={56} align="left" weight={700} accent={["tela,", "sala,", "conexão."]} stagger={6} />
        </div>
        {/* endereço + chamada para ação */}
        <div style={{ position: "absolute", left: 124, top: 590, display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{
            opacity: prog(f, urlAt - 6, urlAt + 10), transform: `translateY(${(1 - prog(f, urlAt - 6, urlAt + 10)) * 20}px)`,
            padding: "18px 30px", borderRadius: 18, background: "rgba(10,13,30,0.9)", border: `2px solid ${alpha(C.secondary, 0.7)}`,
            boxShadow: `0 0 ${30 + 14 * Math.sin(t * 4)}px ${alpha(C.secondary, 0.55)}`, fontFamily: FONT.mono, fontSize: 52, color: "#fff",
          }}>korabots.com.br</div>
        </div>
        <div style={{ position: "absolute", left: 124, top: 730, display: "flex", alignItems: "center", gap: 30 }}>
          <div style={{
            opacity: prog(f, ctaAt - 6, ctaAt + 8), transform: `scale(${(0.9 + 0.1 * prog(f, ctaAt - 6, ctaAt + 8)) * (1 + 0.025 * Math.sin(t * 5))})`,
            padding: "22px 40px", borderRadius: 999, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`,
            fontFamily: FONT.display, fontWeight: 700, fontSize: 38, color: "#fff", boxShadow: `0 20px 60px ${alpha(C.primary, 0.6)}`,
          }}>Crie a sua sala agora →</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: prog(f, ctaAt + 10, ctaAt + 24) }}>
            <QR text="https://korabots.com.br" size={130} reveal={prog(f, ctaAt + 10, ctaAt + 34)} />
            <div style={{ fontFamily: FONT.body, fontSize: 22, color: C.muted, lineHeight: 1.35 }}>Aponte a câmera<br />e acesse</div>
          </div>
        </div>
      </AbsoluteFill>
      <Sfx name="whoosh" at={0} />
      <Sfx name="impact" at={L[0].start - 14} vol={0.7} />
      <Sfx name="shimmer" at={L[0].start + 14} />
      <Sfx name="pop" at={urlAt - 4} />
      <Sfx name="success" at={ctaAt - 4} />
    </WipeReveal>
  );
};
