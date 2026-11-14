import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame, Highlight, Shot, StepHud, Viewport } from "../components/Screen";
import { WipeReveal } from "../components/Graphics";
import { Sfx, TypingSfx } from "../components/Audio";
import { boxOf, useLines, useShot } from "../lib/data";
import { camAt, easeInOut, prog } from "../lib/anim";
import { C, FONT, alpha } from "../lib/theme";

const URL_TEXT = "korabots.com.br";

export const S03Home: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLines("home");
  const home = useShot("home");
  const typeA = 16, typeB = L[0].start + 44;
  const typed = interpolate(f, [typeA, typeB], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enterAt = Math.max(typeB + 8, L[0].end - 6);
  const loading = prog(f, enterAt, enterAt + 22, easeInOut);
  const revealAt = enterAt + 14;

  // destaques de pré-visualização durante a segunda fala
  const order = ["nickname", "profile", "mic", "create"];
  const hlStart = L[1].start + (home.real && home.fullPage ? Math.round(L[1].durationInFrames * 0.45) : 20);
  const gap = 22;

  // rolagem suave da página inteira (somente com captura real mais alta que a tela)
  const scrollMax = home.real && home.fullHeight ? Math.min(Math.max(0, home.fullHeight - 1080), 1600) : 0;
  const scroll = scrollMax
    ? scrollMax * (prog(f, L[1].start, L[1].start + 70, easeInOut) - prog(f, L[1].start + 80, hlStart - 8, easeInOut))
    : 0;

  const nick = boxOf(home, "nickname");
  const cam = camAt(f, [
    { f: revealAt, x: 960, y: 540, z: 1 },
    { f: L[1].end, x: 960, y: 540, z: 1.06 },
    { f: L[2].end + 20, x: nick ? nick.x + nick.w / 2 : 960, y: nick ? nick.y + nick.h / 2 : 540, z: nick ? 1.3 : 1.06 },
  ]);
  const enter = prog(f, 0, 26);
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <Backdrop intensity={0.5} grid={false} seed={7} />
      <StepHud active={0} at={8} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 36 }}>
        <div style={{ transform: `scale(${0.94 + 0.06 * enter})`, filter: `blur(${(1 - enter) * 8}px)` }}>
          <BrowserFrame width={1440} typed={typed} caret={f < enterAt} loading={loading}>
            <AbsoluteFill style={{ background: "#0b0e1d" }}>
              {f < revealAt && (
                <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT.mono, fontSize: 34, color: alpha("#fff", 0.25) }}>
                  {f > enterAt ? "carregando…" : ""}
                </AbsoluteFill>
              )}
            </AbsoluteFill>
            <WipeReveal at={revealAt} dur={22}>
              <Viewport x={cam.x} y={cam.y} z={cam.z}>
                {scroll > 0 && home.fullPage ? (
                  <div style={{ position: "absolute", left: 0, top: -scroll, width: 1920 }}>
                    <Img src={staticFile(home.fullPage)} style={{ width: 1920 }} />
                  </div>
                ) : (
                  <Shot name="home" />
                )}
                {order.map((k, i) => (
                  <Highlight key={k} box={boxOf(home, k)} at={hlStart + i * gap} until={hlStart + i * gap + 46} z={cam.z} />
                ))}
              </Viewport>
            </WipeReveal>
          </BrowserFrame>
        </div>
      </AbsoluteFill>
      {/* brilho na barra de endereço enquanto o endereço é digitado/anunciado */}
      <div style={{
        position: "absolute", left: 422, top: 132, width: 1238, height: 42, borderRadius: 21,
        border: `2px solid ${C.secondary}`, boxShadow: `0 0 26px ${alpha(C.secondary, 0.8)}, inset 0 0 12px ${alpha(C.secondary, 0.4)}`,
        opacity: prog(f, typeA, typeA + 10) * (1 - prog(f, revealAt + 20, revealAt + 36)),
      }} />

      <TypingSfx from={typeA} chars={URL_TEXT.length} every={(typeB - typeA) / URL_TEXT.length} />
      <Sfx name="click" at={enterAt} />
      <Sfx name="whoosh-soft" at={revealAt} />
      {order.map((k, i) => <Sfx key={k} name="blip" at={hlStart + i * gap} vol={0.8} />)}
    </AbsoluteFill>
  );
};
