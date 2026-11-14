import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { SceneT } from "../lib/data";

export type SfxName =
  | "whoosh" | "whoosh-soft" | "click" | "pop" | "riser" | "impact" | "shimmer" | "key" | "chime" | "swipe" | "blip" | "success" | "glitch";

const VOL: Record<SfxName, number> = {
  whoosh: 0.5, "whoosh-soft": 0.35, click: 0.55, pop: 0.4, riser: 0.45, impact: 0.6, shimmer: 0.4,
  key: 0.22, chime: 0.4, swipe: 0.35, blip: 0.3, success: 0.4, glitch: 0.3,
};

/** Efeito sonoro posicionado em um frame local da cena. */
export const Sfx: React.FC<{ name: SfxName; at: number; vol?: number }> = ({ name, at, vol = 1 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={150} layout="none">
    <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={VOL[name] * vol} />
  </Sequence>
);

/** Sequência de teclas para animações de digitação. */
export const TypingSfx: React.FC<{ from: number; chars: number; every: number }> = ({ from, chars, every }) => (
  <>
    {Array.from({ length: chars }, (_, i) => (
      <Sfx key={i} name="key" at={from + i * every} vol={0.7 + ((i * 37) % 10) / 30} />
    ))}
  </>
);

/** Falas da cena (frames locais). */
export const Voice: React.FC<{ scene: SceneT }> = ({ scene }) => (
  <>
    {scene.lines.map((l) => (
      <Sequence key={l.id} from={l.localFrom} durationInFrames={l.durationInFrames + 6} layout="none">
        <Audio src={staticFile(l.audio)} volume={1} />
      </Sequence>
    ))}
  </>
);
