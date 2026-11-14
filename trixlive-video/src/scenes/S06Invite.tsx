import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Callout, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { Phone, QR, WipeReveal } from "../components/Graphics";
import { Sfx } from "../components/Audio";
import { boxOf, useLines, useShot, wordFrame } from "../lib/data";
import { camAt, ease, prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

export const S06Invite: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("invite");
  const inv = useShot("invite");
  const bI = boxOf(inv, "invite"), bL = boxOf(inv, "link"), bQ = boxOf(inv, "qr");
  const linkAt = wordFrame(L[1], "link");
  const qrAt = wordFrame(L[1], "QR Code");
  const phoneAt = wordFrame(L[1], "câmera");
  const focus = bL ?? bI;
  const cam = camAt(f, [
    { f: 0, x: 960, y: 540, z: 1 },
    { f: L[0].start + 30, x: focus ? focus.x + focus.w / 2 : 960, y: focus ? focus.y + focus.h / 2 + 80 : 540, z: focus ? 1.35 : 1 },
    { f: L[1].end + 30, x: focus ? focus.x + focus.w / 2 : 960, y: focus ? focus.y + focus.h / 2 + 80 : 540, z: focus ? 1.4 : 1 },
  ]);
  // pílula do link voando até a conversa
  const fly = prog(f, linkAt, linkAt + 26, ease);
  const W = 1100;
  const t = f / 30;
  return (
    <WipeReveal at={0} dur={20}>
      <Backdrop intensity={0.55} grid={false} seed={17} />
      <StepHud active={5} />
      <div style={{ position: "absolute", left: 80, top: 200, transform: `perspective(1600px) rotateY(${6 * prog(f, 0, 40)}deg)` }}>
        <BrowserFrame width={W}>
          <Viewport x={cam.x} y={cam.y} z={cam.z}>
            <Shot name="invite" />
            <Highlight box={bI} at={L[0].start + 10} until={linkAt - 4} z={cam.z} />
            <Highlight box={bL} at={linkAt - 6} until={qrAt - 4} z={cam.z} color={C.primary} />
            <Highlight box={bQ} at={qrAt - 4} z={cam.z} />
          </Viewport>
        </BrowserFrame>
      </div>

      {/* conversa ilustrativa recebendo o link */}
      <div style={{ position: "absolute", left: 1270, top: 220, width: 560, opacity: prog(f, linkAt - 14, linkAt) * (1 - prog(f, qrAt - 10, qrAt + 4)), transform: `translateY(${-60 * prog(f, qrAt - 10, qrAt + 4)}px)` }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, letterSpacing: 3, color: alpha("#fff", 0.5), marginBottom: 14 }}>MENSAGEM · ILUSTRAÇÃO</div>
        <div style={{
          alignSelf: "flex-end", marginLeft: 70, padding: "18px 22px", borderRadius: "22px 22px 6px 22px",
          background: `linear-gradient(135deg, ${C.primary}, #5a3fe0)`, color: "#fff", fontFamily: FONT.body, fontSize: 25, lineHeight: 1.4,
          opacity: fly, transform: `translate(${(1 - fly) * -420}px, ${(1 - fly) * 180}px) scale(${0.6 + 0.4 * fly})`, boxShadow: `0 20px 60px ${alpha(C.primary, 0.5)}`,
        }}>
          Bora? Entra na minha sala:
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(0,0,0,0.25)", fontFamily: FONT.mono, fontSize: 21 }}>
            korabots.com.br/<span style={{ filter: "blur(5px)" }}>xxxxxx</span>
          </div>
        </div>
        <div style={{
          marginTop: 16, width: "fit-content", padding: "14px 20px", borderRadius: "22px 22px 22px 6px", background: "#1b2142", color: "#fff",
          fontFamily: FONT.body, fontSize: 25, opacity: prog(f, linkAt + 34, linkAt + 44), transform: `translateY(${(1 - prog(f, linkAt + 34, linkAt + 44)) * 14}px)`,
        }}>Entrando agora!</div>
      </div>

      {/* celular lendo o QR Code (ilustração; QR aponta para korabots.com.br) */}
      <div style={{
        position: "absolute", left: 1420, top: 250, opacity: prog(f, qrAt - 10, qrAt + 8),
        transform: `translateY(${(1 - prog(f, qrAt - 10, qrAt + 14, ease)) * 300 + Math.sin(t * 1.4) * 6}px) rotate(${-6 + 3 * prog(f, qrAt, qrAt + 30)}deg)`,
      }}>
        <Phone width={300}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#111633, #0a0d1f)" }} />
          <div style={{ position: "absolute", left: 40, top: 150, width: 196, height: 196, padding: 10, borderRadius: 12, background: "#fff" }}>
            <QR text="https://korabots.com.br" size={176} />
          </div>
          {/* cantos da mira */}
          {[[30, 140], [226, 140], [30, 336], [226, 336]].map(([x, y], i) => (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: 20, height: 20, borderColor: C.secondary, borderStyle: "solid", borderWidth: `${i < 2 ? 4 : 0}px ${i % 2 ? 4 : 0}px ${i >= 2 ? 4 : 0}px ${i % 2 ? 0 : 4}px` }} />
          ))}
          <div style={{ position: "absolute", left: 34, width: 208, top: 150 + 190 * ((((f - qrAt) / 40) % 1 + 1) % 1), height: 3, background: C.secondary, boxShadow: `0 0 18px ${C.secondary}`, opacity: f < phoneAt + 14 ? 1 : 0 }} />
          <div style={{
            position: "absolute", left: 22, right: 22, bottom: 60, padding: "14px 10px", borderRadius: 16, textAlign: "center",
            background: alpha(C.secondary, 0.18), border: `1px solid ${C.secondary}`, color: "#fff", fontFamily: FONT.body, fontWeight: 600, fontSize: 20,
            opacity: prog(f, phoneAt + 14, phoneAt + 24),
          }}>✓ Convite aberto</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", color: alpha("#fff", 0.7), fontFamily: FONT.body, fontSize: 18 }}>Aponte a câmera</div>
        </Phone>
      </div>

      <Callout at={L[0].start + 6} until={linkAt - 16} step="ETAPA 05" title="Convide a sua turma" text="Pelo link da sala ou pelo QR Code." x={1270} y={300} width={540} />

      <Sfx name="whoosh-soft" at={0} />
      <Sfx name="blip" at={L[0].start + 10} />
      <Sfx name="swipe" at={linkAt} />
      <Sfx name="chime" at={linkAt + 24} />
      <Sfx name="whoosh-soft" at={qrAt - 8} />
      <Sfx name="success" at={phoneAt + 14} />
    </WipeReveal>
  );
};
