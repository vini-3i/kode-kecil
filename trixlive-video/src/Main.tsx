import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TL } from "./lib/data";
import { C } from "./lib/theme";
import { Voice } from "./components/Audio";
import { Subtitles } from "./components/Subtitles";
import { S01Intro } from "./scenes/S01Intro";
import { S02Platform } from "./scenes/S02Platform";
import { S03Home } from "./scenes/S03Home";
import { S04Setup } from "./scenes/S04Setup";
import { S05Room } from "./scenes/S05Room";
import { S06Invite } from "./scenes/S06Invite";
import { S07Share } from "./scenes/S07Share";
import { S08Voice } from "./scenes/S08Voice";
import { S09UseCases } from "./scenes/S09UseCases";
import { S10Browser } from "./scenes/S10Browser";
import { S11Outro } from "./scenes/S11Outro";

const SCENES: Record<string, React.FC> = {
  intro: S01Intro, platform: S02Platform, home: S03Home, setup: S04Setup, room: S05Room, invite: S06Invite,
  share: S07Share, voice: S08Voice, usecases: S09UseCases, browser: S10Browser, outro: S11Outro,
};
/** Sobreposição entre cenas: a cena seguinte entra com máscara por cima da anterior. */
export const OVERLAP = 22;

/** Marca d'água discreta enquanto o vídeo usa espaços reservados no lugar das capturas reais. */
const DraftMark: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", right: 28, top: 30, fontFamily: "JetBrainsMono, monospace", fontSize: 16, letterSpacing: 2, color: "rgba(255,255,255,0.45)", opacity: f < 10 ? 0 : 1 }}>
      PRÉVIA · AGUARDANDO CAPTURAS REAIS
    </div>
  );
};

// Mixagem: a trilha (já com ducking sob as falas) fica ~14 dB abaixo da voz; mais presente onde não há locução.
const firstVo = TL.scenes[0].lines[0].from;
const last = TL.scenes[TL.scenes.length - 1];
const lastVoEnd = last.lines[last.lines.length - 1].from + last.lines[last.lines.length - 1].durationInFrames;
const musicVolume = (f: number) =>
  interpolate(f, [0, firstVo - 20, firstVo, lastVoEnd, lastVoEnd + 30], [0.8, 0.8, 0.42, 0.42, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const Main: React.FC<{ draftMark: boolean }> = ({ draftMark }) => (
  <AbsoluteFill style={{ background: C.bg0 }}>
    {TL.scenes.map((s, i) => {
      const Comp = SCENES[s.id];
      const last = i === TL.scenes.length - 1;
      return (
        <Sequence key={s.id} name={s.title} from={s.from} durationInFrames={s.durationInFrames + (last ? 0 : OVERLAP)}>
          <Comp />
          <Voice scene={s} />
        </Sequence>
      );
    })}
    <Audio src={staticFile("audio/music/soundtrack.wav")} volume={musicVolume} />
    <Subtitles />
    {draftMark && <DraftMark />}
  </AbsoluteFill>
);
