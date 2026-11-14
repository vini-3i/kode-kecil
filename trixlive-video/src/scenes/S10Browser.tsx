import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CircleReveal, Morph } from "../components/Graphics";
import { Sfx } from "../components/Audio";
import { useLines, wordFrame } from "../lib/data";
import { prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

export const S10Browser: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("browser");
  const nav = wordFrame(L[0], "navegador"), inst = wordFrame(L[0], "instalar"), cad = wordFrame(L[0], "cadastro");
  const abrir = wordFrame(L[1], "abrir"), apel = wordFrame(L[1], "apelido"), pronto = wordFrame(L[1], "pronto");
  const items = [
    { at: nav, text: "Direto no navegador" },
    { at: inst, text: "Sem instalar programas" },
    { at: cad, text: "Sem criar cadastro" },
  ];
  const flow = [
    { at: abrir, text: "Abrir o endereço" },
    { at: apel, text: "Escolher o apelido" },
    { at: pronto, text: "Pronto!" },
  ];
  const slash = (a: number, b: number) => prog(f, a + 8, a + 18) * (1 - prog(f, b - 4, b + 4));
  return (
    <CircleReveal at={0} dur={20}>
      <Backdrop intensity={0.7} seed={31} />
      {/* ícone que se transforma: navegador → instalar (riscado) → cadastro (riscado) → escudo */}
      <div style={{ position: "absolute", left: 230, top: 250, width: 360, height: 360, borderRadius: 60, background: alpha("#ffffff", 0.04), border: `1px solid ${alpha("#fff", 0.1)}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: prog(f, 4, 20) }}>
        <Morph size={230} seq={[{ shape: "browser", at: 0 }, { shape: "download", at: inst - 6 }, { shape: "user", at: cad - 6 }, { shape: "shield", at: L[1].start - 4 }]} />
        <svg width={360} height={360} style={{ position: "absolute", inset: 0 }}>
          <line x1={80} y1={80} x2={80 + 200 * Math.max(slash(inst, cad), slash(cad, L[1].start))} y2={80 + 200 * Math.max(slash(inst, cad), slash(cad, L[1].start))} stroke={C.hot} strokeWidth={16} strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ position: "absolute", left: 720, top: 230 }}>
        {items.map((it, i) => {
          const p = prog(f, it.at - 8, it.at + 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30, opacity: p, transform: `translateX(${(1 - p) * 50}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
              <div style={{ width: 62, height: 62, borderRadius: 31, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#fff", fontWeight: 800, boxShadow: `0 0 30px ${alpha(C.secondary, 0.6)}` }}>✓</div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 70, color: "#fff" }}>{it.text}</div>
            </div>
          );
        })}
      </div>
      {/* fluxo em três passos */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        {flow.map((s, i) => {
          const p = prog(f, s.at - 8, s.at + 6);
          const last = i === flow.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width: 90 * p, height: 3, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, boxShadow: `0 0 12px ${C.secondary}` }} />}
              <div style={{
                opacity: p, transform: `scale(${0.85 + 0.15 * p})`, padding: "18px 34px", borderRadius: 999, fontFamily: FONT.body, fontWeight: 600, fontSize: 32, color: "#fff",
                background: last ? `linear-gradient(90deg, ${C.primary}, ${C.secondary})` : alpha("#fff", 0.07), border: `1px solid ${alpha("#fff", last ? 0.4 : 0.15)}`,
                boxShadow: last ? `0 0 40px ${alpha(C.primary, 0.7)}` : "none",
              }}>{s.text}</div>
            </React.Fragment>
          );
        })}
      </div>
      <Sfx name="whoosh-soft" at={0} />
      {items.map((it, i) => <Sfx key={i} name="pop" at={it.at - 4} />)}
      {flow.slice(0, 2).map((s, i) => <Sfx key={`f${i}`} name="blip" at={s.at - 4} />)}
      <Sfx name="success" at={pronto - 2} />
    </CircleReveal>
  );
};
