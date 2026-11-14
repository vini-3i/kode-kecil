import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Morph, Network3D } from "../components/Graphics";
import { Kinetic, Wordmark } from "../components/Type";
import { Sfx } from "../components/Audio";
import { useLines } from "../lib/data";
import { prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

export const S01Intro: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("intro");
  const logoAt = L[3].start;
  const converge = prog(f, logoAt - 16, logoAt + 4);
  const flash = prog(f, logoAt - 4, logoAt + 1) * (1 - prog(f, logoAt + 1, logoAt + 22));
  const phrasesOut = logoAt - 18;
  const phrases = [
    { text: "Compartilhe sua tela.", accent: ["tela"] },
    { text: "Converse em tempo real.", accent: ["real"] },
    { text: "Tudo pelo navegador.", accent: ["navegador"] },
  ];
  const fadeIn = prog(f, 0, 50);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Backdrop intensity={0.6 + 0.6 * converge} />
      <AbsoluteFill style={{ opacity: 1 - prog(f, logoAt + 10, logoAt + 40) * 0.65 }}>
        <Network3D at={6} converge={converge} />
      </AbsoluteFill>

      {/* frases da tagline, sincronizadas com a locução */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 70, opacity: 1 - prog(f, phrasesOut, phrasesOut + 12) }}>
          <div style={{ opacity: prog(f, L[0].start - 10, L[0].start + 6) }}>
            <Morph size={210} seq={[{ shape: "monitor", at: 0 }, { shape: "wave", at: L[1].start - 4 }, { shape: "browser", at: L[2].start - 4 }]} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {phrases.map((p, i) => (
              <Kinetic key={i} text={p.text} at={L[i].start - 4} size={86} align="left" accent={p.accent} stagger={4}
                color={alpha("#fff", 0.95)} style={{ opacity: i < 2 ? 1 - 0.45 * prog(f, L[i + 1].start - 4, L[i + 1].start + 10) : 1 }} />
            ))}
          </div>
        </div>
      </AbsoluteFill>

      {/* clarão de convergência */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${alpha("#ffffff", 0.9 * flash)} 0%, ${alpha(C.primary, 0.5 * flash)} 25%, transparent 60%)` }} />

      {/* marca */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", perspective: 900 }}>
        {f >= logoAt - 2 && (
          <>
            <div style={{ transform: `scale(${1 + 0.04 * prog(f, logoAt, logoAt + 200)})` }}>
              <Wordmark at={logoAt - 2} size={230} />
            </div>
            <div style={{
              marginTop: 70, fontFamily: FONT.body, fontWeight: 500, fontSize: 36, letterSpacing: 0.5, color: alpha("#fff", 0.82),
              opacity: prog(f, logoAt + 26, logoAt + 48), transform: `translateY(${(1 - prog(f, logoAt + 26, logoAt + 48)) * 20}px)`,
            }}>
              Compartilhe sua tela. Converse em tempo real. Tudo pelo navegador.
            </div>
          </>
        )}
      </AbsoluteFill>

      <Sfx name="riser" at={0} vol={0.8} />
      {L.slice(0, 3).map((l, i) => <Sfx key={i} name="whoosh-soft" at={l.start - 6} />)}
      <Sfx name="riser" at={logoAt - 60} vol={0.6} />
      <Sfx name="impact" at={logoAt - 2} />
      <Sfx name="shimmer" at={logoAt + 22} />
    </AbsoluteFill>
  );
};
