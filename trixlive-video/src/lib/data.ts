import { useCurrentFrame } from "remotion";
import timeline from "../data/timeline.json";
import captures from "../data/captures.json";

export type Box = { x: number; y: number; w: number; h: number };
export type Sub = { rows: string[]; from: number; to: number; localFrom: number; localTo: number };
export type Line = {
  id: string; text: string; audio: string; from: number; localFrom: number; durationInFrames: number; seconds: number; subs: Sub[];
};
export type SceneT = { id: string; title: string; from: number; durationInFrames: number; lines: Line[] };

export const TL = timeline as { fps: number; durationInFrames: number; seconds: number; scenes: SceneT[] };
export const FPS = TL.fps;

export const scene = (id: string): SceneT => {
  const s = TL.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`cena ${id} ausente na timeline`);
  return s;
};

/** Linhas da cena com início/fim locais (frames). */
export const useLines = (id: string) => {
  const s = scene(id);
  return s.lines.map((l) => ({ ...l, start: l.localFrom, end: l.localFrom + l.durationInFrames }));
};

/** Frame local aproximado em que uma palavra/trecho é falado (proporcional aos caracteres da fala). */
export const wordFrame = (l: { text: string; start: number; durationInFrames: number }, needle: string) => {
  const i = l.text.indexOf(needle);
  if (i < 0) return l.start;
  return Math.round(l.start + (l.durationInFrames * i) / l.text.length);
};

// ------------------------------------------------------------------ capturas reais
type Shot = { image?: string; fullPage?: string; fullHeight?: number; boxes?: Record<string, Box | null>; redacted?: (Box & { kind: string })[] };
type CapturesT = {
  source: string; viewport: { w: number; h: number };
  brand: Record<string, string | null | undefined>;
  shots: Record<string, Shot>;
  options: { profiles?: string[] };
};
export const CAP = captures as unknown as CapturesT;
export const HAS_REAL = CAP.source !== "placeholder" && Object.keys(CAP.shots).length > 0;

/** Layout de referência usado SOMENTE quando não há captura real (espaços reservados). */
export const DEFAULT_BOXES: Record<string, Record<string, Box>> = {
  home: {
    nickname: { x: 660, y: 420, w: 600, h: 64 },
    profile: { x: 660, y: 540, w: 600, h: 64 },
    mic: { x: 660, y: 660, w: 290, h: 60 },
    create: { x: 970, y: 660, w: 290, h: 60 },
  },
  room: { invite: { x: 1400, y: 300, w: 380, h: 64 }, share: { x: 1400, y: 390, w: 380, h: 64 } },
  invite: { link: { x: 1400, y: 470, w: 380, h: 56 }, qr: { x: 1490, y: 560, w: 200, h: 200 }, invite: { x: 1400, y: 300, w: 380, h: 64 } },
  sharing: { video: { x: 140, y: 190, w: 1160, h: 652 }, controls: { x: 520, y: 900, w: 880, h: 84 }, stop: { x: 1060, y: 912, w: 200, h: 60 } },
  viewer: { video: { x: 140, y: 190, w: 1160, h: 652 }, participants: { x: 1380, y: 190, w: 400, h: 300 }, mic: { x: 680, y: 912, w: 120, h: 60 }, settings: { x: 1110, y: 912, w: 120, h: 60 } },
};
const shotFallback: Record<string, string> = { nickname: "home", profile: "home", mic: "home", settings: "viewer", hostLive: "sharing", final: "home" };

export const useShot = (name: string) => {
  const s = CAP.shots[name];
  const base = DEFAULT_BOXES[name] || DEFAULT_BOXES[shotFallback[name]] || {};
  if (s && s.image) {
    const boxes: Record<string, Box | null> = {};
    // com captura real, usa somente caixas reais (sem inventar posições)
    for (const k of new Set([...Object.keys(base), ...Object.keys(s.boxes || {})])) boxes[k] = s.boxes?.[k] ?? null;
    return { name, image: s.image, real: true, boxes, redacted: s.redacted || [], fullPage: s.fullPage, fullHeight: s.fullHeight };
  }
  return { name, image: undefined, real: false, boxes: base as Record<string, Box | null>, redacted: [], fullPage: undefined, fullHeight: undefined };
};

/** Caixa de um elemento buscando na própria captura e, se faltar, na página inicial. */
export const boxOf = (shot: ReturnType<typeof useShot>, key: string): Box | null => {
  if (shot.boxes[key]) return shot.boxes[key];
  const home = CAP.shots.home?.boxes?.[key];
  if (shot.real && home && (shot.name === "nickname" || shot.name === "profile" || shot.name === "mic")) return home;
  return shot.real ? null : (DEFAULT_BOXES.home[key] ?? null);
};

export const useLocalFrame = () => useCurrentFrame();
