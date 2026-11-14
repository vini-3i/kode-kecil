import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { DemoGame, Meter, WipeReveal } from "../components/Graphics";
import { Kinetic } from "../components/Type";
import { Sfx } from "../components/Audio";
import { useLines } from "../lib/data";
import { prog, rnd } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

const Illus: React.FC<{ kind: number }> = ({ kind }) => {
  const f = useCurrentFrame();
  if (kind === 0) return <DemoGame width={372} height={210} offset={600} />;
  if (kind === 1) {
    // "cinema" em casa: tela com barras e botão play + comentários flutuando
    return (
      <div style={{ width: 372, height: 210, position: "relative", background: "linear-gradient(135deg,#1a1240,#3b1150 60%,#ff4f8b)", overflow: "hidden" }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 30 + i * 110, top: 160 - ((f * 1.2 + i * 40) % 120), padding: "4px 10px", borderRadius: 10, background: "rgba(255,255,255,0.9)", color: "#222", fontFamily: FONT.body, fontSize: 15, fontWeight: 600, opacity: 1 - ((f * 1.2 + i * 40) % 120) / 120 }}>{["que cena!", "kkkk", "uau"][i]}</div>)}
        <div style={{ position: "absolute", left: 156, top: 75, width: 60, height: 60, borderRadius: 30, background: "rgba(255,255,255,0.92)" }}>
          <div style={{ position: "absolute", left: 24, top: 18, width: 0, height: 0, borderLeft: "20px solid #3b1150", borderTop: "12px solid transparent", borderBottom: "12px solid transparent" }} />
        </div>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)" }}>
          <div style={{ width: `${30 + (f % 300) / 6}%`, height: "100%", borderRadius: 3, background: "#fff" }} />
        </div>
      </div>
    );
  }
  if (kind === 2) {
    return (
      <div style={{ width: 372, height: 210, display: "flex", alignItems: "center", justifyContent: "center", gap: 22, background: "linear-gradient(135deg,#0d1b3a,#11284f)" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: [C.primary, C.secondary, C.hot][i], boxShadow: `0 0 ${10 + 20 * Math.abs(Math.sin(f / 6 + i * 2))}px ${[C.primary, C.secondary, C.hot][i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: "#fff" }}>{["A", "B", "C"][i]}</div>
            <div style={{ transform: "scale(0.6)" }}><Meter at={0} bars={5} height={34} /></div>
          </div>
        ))}
      </div>
    );
  }
  // trabalho: quadro com gráfico de barras
  return (
    <div style={{ width: 372, height: 210, background: "#f4f6ff", position: "relative", padding: 18 }}>
      <div style={{ height: 12, width: "50%", borderRadius: 6, background: "#c9cde6" }} />
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 20, height: 130, display: "flex", alignItems: "flex-end", gap: 14 }}>
        {[0.45, 0.7, 0.55, 0.9, 0.75, 1].map((v, i) => <div key={i} style={{ flex: 1, height: `${v * 100 * (0.6 + 0.4 * Math.abs(Math.sin(f / 30 + i)))}%`, borderRadius: 6, background: i % 2 ? C.primary : C.secondary }} />)}
      </div>
    </div>
  );
};

const CARDS = [
  { title: "Jogos com amigos", text: "Mostre a sua partida e jogue junto." },
  { title: "Assistir junto", text: "Comente cada cena em tempo real." },
  { title: "Bate-papo por voz", text: "Converse sem precisar de mais nada." },
  { title: "Trabalho em equipe", text: "Apresente, revise e colabore." },
];

export const S09UseCases: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("usecases");
  const t = f / 30;
  return (
    <WipeReveal at={0} dur={20}>
      <Backdrop intensity={0.85} seed={29} hue={C.primary} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120 }}>
        <Kinetic text="Do seu jeito, para cada momento." at={L[0].start} size={70} accent={["jeito,", "momento."]} />
      </div>
      <AbsoluteFill style={{ perspective: 1800 }}>
        {CARDS.map((c, i) => {
          const ln = L[i + 1];
          const appear = prog(f, ln.start - 12, ln.start + 10);
          const active = prog(f, ln.start - 6, ln.start + 8) * (1 - prog(f, ln.end + 6, ln.end + 18));
          const x = 120 + i * 430;
          const depth = Math.sin(t * 0.9 + i) * 8;
          return (
            <div key={i} style={{
              position: "absolute", left: x, top: 320, width: 400, borderRadius: 26, overflow: "hidden",
              background: "linear-gradient(170deg, rgba(26,31,66,0.95), rgba(10,13,30,0.95))",
              border: `1px solid ${alpha(active > 0.5 ? C.secondary : "#ffffff", 0.12 + 0.5 * active)}`,
              boxShadow: `0 ${30 + 30 * active}px ${80 + 40 * active}px rgba(0,0,0,0.55), 0 0 ${60 * active}px ${alpha(C.primary, 0.55)}`,
              opacity: appear * (0.55 + 0.45 * Math.max(active, f > ln.end + 18 ? 0.6 : 1)),
              transform: `translateY(${(1 - appear) * 120 - 26 * active + depth}px) rotateY(${(i - 1.5) * -6}deg) rotateX(${4 - 4 * active}deg) scale(${0.96 + 0.06 * active})`,
            }}>
              <div style={{ margin: 14, borderRadius: 16, overflow: "hidden" }}><Illus kind={i} /></div>
              <div style={{ padding: "8px 28px 30px" }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 17, letterSpacing: 3, color: C.secondary }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: "#fff", marginTop: 6 }}>{c.title}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 22, color: C.muted, marginTop: 8, lineHeight: 1.35 }}>{c.text}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      {/* partículas de primeiro plano (parallax) */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={((rnd(i) * 2200 - f * (2 + rnd(i + 3) * 3)) % 2200 + 2200) % 2200 - 140} cy={rnd(i + 9) * 1080} r={2 + rnd(i + 5) * 4} fill={i % 2 ? C.secondary : C.primary} opacity={0.35} />
        ))}
      </svg>
      <Sfx name="whoosh" at={0} />
      {L.slice(1).map((l, i) => <Sfx key={i} name="whoosh-soft" at={l.start - 12} />)}
      {L.slice(1).map((l, i) => <Sfx key={`p${i}`} name="pop" at={l.start} vol={0.7} />)}
    </WipeReveal>
  );
};
