import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Callout, Cursor, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { DemoGame, Morph, PermissionDialog, WipeReveal } from "../components/Graphics";
import { Sfx } from "../components/Audio";
import { boxOf, useLines, useShot, wordFrame } from "../lib/data";
import { camAt, prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";
import { zoomFor } from "./S04Setup";

export const S07Share: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("share");
  const room = useShot("room");
  const sharing = useShot("sharing");
  const bS = boxOf(room, "share");
  const cS = bS ? { x: bS.x + bS.w / 2, y: bS.y + bS.h / 2 } : { x: 960, y: 540 };
  const clickShare = L[0].end - 4;
  const dlgAt = L[1].start - 6;
  const tTela = wordFrame(L[1], "a tela inteira"), tJan = wordFrame(L[1], "uma janela"), tGuia = wordFrame(L[1], "uma guia");
  const tab = f < tJan ? 0 : f < tGuia ? 1 : 2;
  const pickAt = tGuia + 14;
  const pressAt = Math.min(L[1].end + 4, L[2].start - 10);
  const dlgOut = pressAt + 8;
  const liveAt = dlgOut + 4;
  const encerrarAt = wordFrame(L[2], "encerrar");

  const cam = camAt(f, [
    { f: 0, x: 960, y: 540, z: 1 },
    { f: L[0].start + 20, x: cS.x, y: cS.y, z: bS ? zoomFor(bS, 0.35) : 1 },
    { f: dlgAt, x: cS.x, y: cS.y, z: bS ? zoomFor(bS, 0.35) : 1 },
    { f: dlgAt + 30, x: 960, y: 540, z: 1 },
  ]);
  const bV = boxOf(sharing, "video"), bStop = boxOf(sharing, "stop");
  const dim = prog(f, dlgAt, dlgAt + 14) * (1 - prog(f, dlgOut, dlgOut + 10));
  // cursor no diálogo (coordenadas da tela final)
  const dX = 470, dY = 215;
  return (
    <AbsoluteFill>
      <Backdrop intensity={0.5} grid={false} seed={19} />
      <StepHud active={6} />
      <div style={{ position: "absolute", left: 240, top: 104 }}>
        <BrowserFrame width={1440}>
          <Viewport x={cam.x} y={cam.y} z={cam.z}>
            <Shot name="room" />
            <Highlight box={bS} at={L[0].start + 8} until={clickShare + 6} z={cam.z} />
            <Cursor z={cam.z} show={[L[0].start, clickShare + 14]} path={[{ f: L[0].start, x: cS.x + 240, y: cS.y + 200 }, { f: clickShare - 6, x: cS.x, y: cS.y }]} clicks={[clickShare]} />
          </Viewport>
          <WipeReveal at={liveAt} dur={22}>
            <Viewport x={960} y={540} z={1}>
              <Shot name="sharing">
                {/* o conteúdo compartilhado é o jogo de demonstração; aqui ele é animado no local do vídeo */}
                {bV && (
                  <div style={{ position: "absolute", left: bV.x, top: bV.y, width: bV.w, height: bV.h, overflow: "hidden", borderRadius: sharing.real ? 0 : 14 }}>
                    <DemoGame width={bV.w} height={bV.h} offset={40} />
                  </div>
                )}
              </Shot>
              <Highlight box={bStop} at={encerrarAt - 6} z={1} color={C.hot} />
            </Viewport>
          </WipeReveal>
        </BrowserFrame>
      </div>

      {/* escurecimento + seletor do navegador (ilustração genérica) */}
      <AbsoluteFill style={{ background: `rgba(3,4,12,${0.7 * dim})` }} />
      {f >= dlgAt && f < dlgOut + 12 && (
        <AbsoluteFill style={{ opacity: 1 - prog(f, dlgOut, dlgOut + 10) }}>
          <div style={{ position: "absolute", left: dX, top: dY }}>
            <PermissionDialog at={dlgAt} tab={tab} picked={f >= pickAt ? 0 : -1} pressAt={pressAt} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 160, textAlign: "center", fontFamily: FONT.mono, fontSize: 20, letterSpacing: 2, color: alpha("#fff", 0.6), opacity: prog(f, dlgAt + 10, dlgAt + 24) }}>
            ILUSTRAÇÃO · SELETOR DE COMPARTILHAMENTO DO PRÓPRIO NAVEGADOR
          </div>
          <Cursor show={[dlgAt + 14, dlgOut]} path={[
            { f: dlgAt + 14, x: 1300, y: 800 },
            { f: tTela, x: dX + 110, y: dY + 168 },
            { f: tJan, x: dX + 280, y: dY + 168 },
            { f: tGuia, x: dX + 420, y: dY + 168 },
            { f: pickAt - 2, x: dX + 190, y: dY + 340 },
            { f: pressAt - 4, x: dX + 880, y: dY + 590 },
          ]} clicks={[tJan + 2, tGuia + 2, pickAt, pressAt]} />
        </AbsoluteFill>
      )}

      {/* garantia de permissão */}
      <div style={{
        position: "absolute", left: 80, top: 760, display: "flex", alignItems: "center", gap: 16, opacity: prog(f, liveAt + 20, liveAt + 34),
        padding: "16px 24px 16px 16px", borderRadius: 20, background: "rgba(10,13,30,0.9)", border: `1px solid ${alpha(C.secondary, 0.4)}`,
        fontFamily: FONT.display, fontWeight: 700, fontSize: 28, color: "#fff", boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
      }}>
        <Morph size={52} seq={[{ shape: "monitor", at: 0 }, { shape: "shield", at: liveAt + 30 }]} glow={false} />
        <div>Só com a sua permissão<div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 21, color: C.muted, marginTop: 4 }}>Encerre quando quiser.</div></div>
      </div>
      <Callout at={liveAt + 10} step="ETAPA 06" title="Tela no ar" text="Você escolhe o que mostrar: tela inteira, janela ou guia." x={1340} y={150} width={500} until={encerrarAt - 10} />

      <Sfx name="click" at={clickShare} />
      <Sfx name="whoosh-soft" at={dlgAt} />
      <Sfx name="blip" at={tJan + 2} />
      <Sfx name="blip" at={tGuia + 2} />
      <Sfx name="click" at={pickAt} />
      <Sfx name="click" at={pressAt} />
      <Sfx name="whoosh" at={liveAt} />
      <Sfx name="success" at={liveAt + 26} />
      <Sfx name="blip" at={encerrarAt - 6} />
    </AbsoluteFill>
  );
};
