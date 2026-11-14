import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Callout, Cursor, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { Morph } from "../components/Graphics";
import { Sfx } from "../components/Audio";
import { boxOf, useLines, useShot, wordFrame } from "../lib/data";
import { camAt, easeInOut, prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";
import { zoomFor } from "./S04Setup";

export const S05Room: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("room");
  const home = useShot("home");
  const bC = boxOf(home, "create");
  const c = bC ? { x: bC.x + bC.w / 2, y: bC.y + bC.h / 2 } : { x: 960, y: 540 };
  const clickAt = wordFrame(L[0], "criar") + 6;
  const revealAt = clickAt + 6;
  const zC = zoomFor(bC, 0.4);
  const cam = camAt(f, [
    { f: 0, x: c.x, y: c.y, z: zC * 0.9 },
    { f: clickAt, x: c.x, y: c.y, z: zC },
    { f: revealAt + 34, x: 960, y: 540, z: 1 },
    { f: L[1].end + 40, x: 960, y: 540, z: 1.05 },
  ]);
  // posição do botão "criar" na tela final, para a máscara circular partir dele
  const W = 1440, sc = W / 1920, fx = 240, fy = 104 + 62;
  const hx = 960 / cam.z, hy = 540 / cam.z;
  const cx = Math.min(Math.max(cam.x, hx), 1920 - hx), cy = Math.min(Math.max(cam.y, hy), 1080 - hy);
  const sx = (960 + (c.x - cx) * cam.z) * sc, sy = (540 + (c.y - cy) * cam.z) * sc;
  const rp = prog(f, revealAt, revealAt + 26, easeInOut);
  const enter = prog(f, 0, 16);
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <Backdrop intensity={0.5} grid={false} seed={13} />
      <StepHud active={4} />
      <div style={{ position: "absolute", left: fx, top: 104 }}>
        <BrowserFrame width={W}>
          <Viewport x={cam.x} y={cam.y} z={cam.z}>
            <Shot name="home" />
            <Highlight box={bC} at={6} until={clickAt + 4} z={cam.z} />
            <Cursor z={cam.z} show={[0, revealAt + 10]} path={[{ f: 0, x: c.x + 200, y: c.y + 160 }, { f: clickAt - 4, x: c.x, y: c.y }]} clicks={[clickAt]} />
          </Viewport>
          {rp > 0 && (
            <div style={{ position: "absolute", inset: 0, clipPath: rp >= 1 ? undefined : `circle(${rp * 2600}px at ${sx}px ${sy}px)` }}>
              <Viewport x={rp >= 1 ? cam.x : 960} y={rp >= 1 ? cam.y : 540} z={rp >= 1 ? cam.z : 1}>
                <Shot name="room" />
              </Viewport>
            </div>
          )}
        </BrowserFrame>
      </div>
      {/* selo "sala privada" com morphing de cadeado */}
      <div style={{
        position: "absolute", right: 240 + 40, top: fy + 30, display: "flex", alignItems: "center", gap: 14, padding: "14px 24px 14px 16px",
        borderRadius: 18, background: "rgba(10,13,30,0.88)", border: `1px solid ${alpha(C.secondary, 0.5)}`, boxShadow: `0 0 40px ${alpha(C.secondary, 0.35)}`,
        opacity: prog(f, revealAt + 20, revealAt + 34), transform: `translateY(${(1 - prog(f, revealAt + 20, revealAt + 34)) * -16}px)`,
        fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: "#fff",
      }}>
        <Morph size={46} seq={[{ shape: "lockOpen", at: 0 }, { shape: "lock", at: L[1].start }]} glow={false} />
        Sala privada
      </div>
      <Callout at={L[1].start + 4} step="ETAPA 04" title="Seu espaço reservado" text="Somente para as pessoas que você convidar." x={1240} y={700} width={560} />

      <Sfx name="click" at={clickAt} />
      <Sfx name="whoosh" at={revealAt} />
      <Sfx name="pop" at={L[1].start} />
      <Sfx name="chime" at={revealAt + 24} vol={0.7} />
    </AbsoluteFill>
  );
};
