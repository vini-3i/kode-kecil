import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Callout, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { CircleReveal, DemoGame, Morph, VoiceRings } from "../components/Graphics";
import { Sfx } from "../components/Audio";
import { boxOf, useLines, useShot, wordFrame } from "../lib/data";
import { camAt, ease, easeInOut, prog, rnd } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

const Tag: React.FC<{ text: string; color: string; o: number }> = ({ text, color, o }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: "rgba(10,13,30,0.9)", border: `1px solid ${alpha(color, 0.6)}`, fontFamily: FONT.body, fontWeight: 600, fontSize: 22, color: "#fff", opacity: o }}>
    <span style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 10px ${color}` }} />{text}
  </div>
);

export const S08Voice: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("voice");
  const viewer = useShot("viewer");
  const sharing = useShot("sharing");
  const vozAt = wordFrame(L[0], "voz");
  const micAt = wordFrame(L[1], "microfone"), cfgAt = wordFrame(L[1], "configurações");
  const focusT = prog(f, L[1].start - 16, L[1].start + 20, easeInOut);
  const bVid = boxOf(viewer, "video"), bSV = boxOf(sharing, "video");
  const bMic = boxOf(viewer, "mic"), bCfg = boxOf(viewer, "settings"), bPart = boxOf(viewer, "participants");
  const ctrlFocus = bMic && bCfg
    ? { x: (bMic.x + bMic.w / 2 + bCfg.x + bCfg.w / 2) / 2, y: (bMic.y + bCfg.y) / 2 + 20, z: Math.min(1.9, Math.max(1.2, 1300 / (Math.abs(bCfg.x - bMic.x) + 400))) }
    : { x: 960, y: 540, z: 1 };
  const cam = camAt(f, [
    { f: 0, x: 960, y: 540, z: 1 },
    { f: L[1].start + 20, x: 960, y: 540, z: 1 },
    { f: L[1].start + 54, ...ctrlFocus },
  ]);
  const t = f / 30;
  // layout: anfitrião (atrás, à esquerda) e convidado (à frente, à direita), convergindo para o centro na 2ª fala
  const guestX = 760 - 520 * focusT, guestY = 230 - 110 * focusT, guestW = 1060 + 380 * focusT;
  return (
    <CircleReveal at={0} dur={22} x={1300} y={540}>
      <Backdrop intensity={0.6} seed={23} />
      <StepHud active={7} />
      <AbsoluteFill style={{ perspective: 1800 }}>
        {/* anfitrião */}
        <div style={{
          position: "absolute", left: 90, top: 300, opacity: (1 - focusT) * prog(f, 4, 24),
          transform: `rotateY(${16}deg) translateZ(-200px) translateY(${Math.sin(t) * 8}px)`,
        }}>
          <Tag text="Anfitrião (Demo TrixLive)" color={C.primary} o={prog(f, 14, 28)} />
          <div style={{ height: 14 }} />
          <BrowserFrame width={760} glow={0.6}>
            <Shot name="sharing">
              {bSV && <div style={{ position: "absolute", left: bSV.x, top: bSV.y, width: bSV.w, height: bSV.h, overflow: "hidden", borderRadius: 14 }}><DemoGame width={bSV.w} height={bSV.h} offset={300} /></div>}
            </Shot>
          </BrowserFrame>
        </div>
        {/* fluxo de transmissão entre as janelas */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: (1 - focusT) * prog(f, 20, 40) }}>
          <path d="M 760 560 C 820 420, 900 420, 980 470" stroke={alpha(C.secondary, 0.35)} strokeWidth={3} fill="none" strokeDasharray="6 10" />
          {Array.from({ length: 10 }, (_, i) => {
            const p = ((f / 40 + i / 10) % 1);
            const x = (1 - p) ** 3 * 760 + 3 * (1 - p) ** 2 * p * 820 + 3 * (1 - p) * p * p * 900 + p ** 3 * 980;
            const y = (1 - p) ** 3 * 560 + 3 * (1 - p) ** 2 * p * 420 + 3 * (1 - p) * p * p * 420 + p ** 3 * 470;
            return <circle key={i} cx={x} cy={y + Math.sin(i + f / 8) * 2} r={3 + 3 * rnd(i)} fill={i % 2 ? C.secondary : C.primary} opacity={Math.sin(p * Math.PI)} />;
          })}
        </svg>
        {/* participante */}
        <div style={{
          position: "absolute", left: guestX, top: guestY, opacity: prog(f, 10, 30),
          transform: `rotateY(${-10 * (1 - focusT)}deg) translateY(${Math.sin(t * 1.2 + 1) * 8 * (1 - focusT)}px)`,
        }}>
          <Tag text="Participante (Convidado Demo)" color={C.secondary} o={prog(f, 24, 38) * (1 - focusT)} />
          <div style={{ height: 14 * (1 - focusT) }} />
          <BrowserFrame width={guestW} glow={1.2}>
            <Viewport x={cam.x} y={cam.y} z={cam.z}>
              <Shot name="viewer">
                {bVid && <div style={{ position: "absolute", left: bVid.x, top: bVid.y, width: bVid.w, height: bVid.h, overflow: "hidden", borderRadius: 14 }}><DemoGame width={bVid.w} height={bVid.h} offset={300} /></div>}
              </Shot>
              {bPart && <VoiceRings x={bPart.x + 40} y={bPart.y + Math.min(40, bPart.h / 2)} at={vozAt} size={26} />}
              <Highlight box={bPart} at={vozAt - 4} until={L[1].start} z={cam.z} />
              <Highlight box={bMic} at={micAt - 6} z={cam.z} />
              <Highlight box={bCfg} at={cfgAt - 6} z={cam.z} color={C.primary} />
            </Viewport>
          </BrowserFrame>
        </div>
      </AbsoluteFill>

      {/* indicador de voz em tempo real */}
      <div style={{
        position: "absolute", left: 300, top: 860, display: "flex", alignItems: "center", gap: 18, opacity: prog(f, vozAt - 10, vozAt + 6) * (1 - focusT),
        fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: "#fff",
      }}>
        <div style={{ position: "relative", width: 64, height: 64 }}>
          <VoiceRings x={32} y={32} at={vozAt} size={26} />
          <div style={{ position: "absolute", inset: 8 }}><Morph size={48} seq={[{ shape: "mic", at: 0 }]} glow /></div>
        </div>
        Conversa por voz em tempo real
      </div>

      <Callout at={L[1].start + 30} step="CONTROLES" title="Tudo à mão" x={1330} y={150} width={500}
        text="Ative ou silencie o microfone e acesse as configurações da sessão." />

      <Sfx name="whoosh" at={0} />
      <Sfx name="pop" at={vozAt} />
      <Sfx name="swipe" at={L[1].start - 14} />
      <Sfx name="blip" at={micAt - 6} />
      <Sfx name="blip" at={cfgAt - 6} />
    </CircleReveal>
  );
};
