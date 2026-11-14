import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Callout, Cursor, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { Meter, VoiceRings } from "../components/Graphics";
import { Typed } from "../components/Type";
import { Sfx, TypingSfx } from "../components/Audio";
import { Box, CAP, boxOf, useLines, useShot } from "../lib/data";
import { camAt, prog } from "../lib/anim";
import { FONT } from "../lib/theme";

const NICK = "Demo TrixLive";
export const zoomFor = (b: Box | null, k = 0.5) => (b ? Math.min(2.2, Math.max(1.25, Math.min((1920 * k) / b.w, (1080 * 0.42) / b.h))) : 1);
const ctr = (b: Box | null) => (b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: 960, y: 540 });

export const S04Setup: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("setup");
  const home = useShot("home");
  const nickShot = useShot("nickname");
  const profShot = useShot("profile");
  const micShot = useShot("mic");
  const bN = boxOf(home, "nickname"), bP = boxOf(home, "profile"), bM = boxOf(home, "mic");
  const cN = ctr(bN), cP = ctr(bP), cM = ctr(bM);

  const k0 = L[0].start, k1 = L[1].start, k2 = L[2].start;
  const cam = camAt(f, [
    { f: 0, x: 960, y: 540, z: 1.05 },
    { f: k0 + 6, x: cN.x, y: cN.y, z: zoomFor(bN) },
    { f: k1 - 10, x: cN.x, y: cN.y, z: zoomFor(bN) },
    { f: k1 + 14, x: cP.x, y: cP.y, z: zoomFor(bP) },
    { f: k2 - 10, x: cP.x, y: cP.y, z: zoomFor(bP) },
    { f: k2 + 14, x: cM.x, y: cM.y, z: zoomFor(bM, 0.4) },
    { f: L[2].end + 4, x: cM.x, y: cM.y, z: zoomFor(bM, 0.4) },
    { f: L[2].end + 40, x: 960, y: 540, z: 1 },
  ]);

  const clickN = k0 + 22, typeA = clickN + 8, every = 4, typeB = typeA + NICK.length * every;
  const clickP = k1 + 22, clickM = k2 + 22;
  const typedP = prog(f, typeA, typeB);

  // camadas das capturas: home → apelido → perfil → microfone
  const oNick = nickShot.real ? prog(f, typeB, typeB + 8) : 0;
  const oProf = profShot.real ? prog(f, clickP + 6, clickP + 16) : 0;
  const oMic = micShot.real ? prog(f, clickM + 6, clickM + 16) : 0;

  return (
    <AbsoluteFill>
      <Backdrop intensity={0.45} grid={false} seed={11} />
      <StepHud active={f < k1 - 6 ? 1 : f < k2 - 6 ? 2 : 3} />
      <div style={{ position: "absolute", left: 90, top: 186 }}>
        <BrowserFrame width={1180}>
          <Viewport x={cam.x} y={cam.y} z={cam.z}>
            <Shot name="home" />
            {/* digitação do apelido: com captura real, revela a própria captura "apelido" dentro do campo */}
            {nickShot.real && bN && typedP > 0 && (
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(${bN.y}px ${1920 - (bN.x + bN.w * typedP)}px ${1080 - bN.y - bN.h}px ${bN.x}px)` }}>
                <Shot name="nickname" />
              </div>
            )}
            {!nickShot.real && bN && f >= typeA && (
              <div style={{ position: "absolute", left: bN.x + 22, top: bN.y, height: bN.h, display: "flex", alignItems: "center", fontFamily: FONT.body, fontSize: 30, color: "#fff" }}>
                <Typed text={NICK} at={typeA} every={every} caret={f < k1} />
              </div>
            )}
            <Shot name="nickname" opacity={oNick * (1 - oProf)} />
            <Shot name="profile" opacity={oProf * (1 - oMic)} />
            <Shot name="mic" opacity={oMic} />
            <Highlight box={bN} at={k0 + 4} until={k1 - 6} z={cam.z} />
            <Highlight box={bP} at={k1 + 10} until={k2 - 6} z={cam.z} />
            <Highlight box={bM} at={k2 + 10} until={L[2].end + 10} z={cam.z} />
            {bM && <VoiceRings x={cM.x} y={cM.y} at={clickM + 6} size={Math.max(bM.h, 40) * 0.8} />}
            <Cursor z={cam.z} show={[k0 - 4, L[2].end + 20]}
              path={[
                { f: k0 - 4, x: cN.x + 260, y: cN.y + 220 }, { f: clickN, x: cN.x - (bN?.w ?? 0) * 0.25, y: cN.y },
                { f: k1 - 4, x: cN.x - (bN?.w ?? 0) * 0.25, y: cN.y + 30 }, { f: clickP, x: cP.x + (bP?.w ?? 0) * 0.3, y: cP.y },
                { f: k2 - 4, x: cP.x + (bP?.w ?? 0) * 0.3, y: cP.y + 30 }, { f: clickM, x: cM.x, y: cM.y },
              ]}
              clicks={[clickN, clickP, clickM]} />
          </Viewport>
        </BrowserFrame>
      </div>

      <Callout at={k0 + 8} until={k1 - 8} step="ETAPA 01" title="Escolha um apelido" text="É com ele que você aparece para os outros participantes." x={1330} y={330} width={500} />
      <Callout at={k1 + 8} until={k2 - 8} step="ETAPA 02" title="Perfil de sessão" text="Selecione um dos perfis disponíveis, conforme o que você vai compartilhar." x={1330} y={330} width={500}
        chips={CAP.options?.profiles?.slice(0, 6)} />
      <Callout at={k2 + 8} step="ETAPA 03" title="Teste o microfone" text="Garanta que a sua voz chega com clareza antes de entrar." x={1330} y={330} width={500} />
      <div style={{ position: "absolute", left: 1360, top: 640, opacity: prog(f, clickM + 4, clickM + 16) }}>
        <Meter at={clickM + 4} bars={18} height={80} />
      </div>

      <Sfx name="whoosh-soft" at={k0} />
      <Sfx name="click" at={clickN} />
      <TypingSfx from={typeA} chars={NICK.length} every={every} />
      <Sfx name="whoosh-soft" at={k1 - 6} />
      <Sfx name="click" at={clickP} />
      <Sfx name="whoosh-soft" at={k2 - 6} />
      <Sfx name="click" at={clickM} />
      <Sfx name="success" at={clickM + 40} />
    </AbsoluteFill>
  );
};
