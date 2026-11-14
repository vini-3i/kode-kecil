import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Box, useShot } from "../lib/data";
import { C, FONT, alpha } from "../lib/theme";
import { prog, ease } from "../lib/anim";

export const VW = 1920, VH = 1080;

/** Quadro de navegador genérico (sem marca), com barra de endereço animável. */
export const BrowserFrame: React.FC<{
  width?: number; url?: string; typed?: number; caret?: boolean; loading?: number; children: React.ReactNode; style?: React.CSSProperties; glow?: number;
}> = ({ width = 1440, url = "korabots.com.br", typed = 1, caret = false, loading = 0, children, style, glow = 1 }) => {
  const f = useCurrentFrame();
  const scale = width / VW;
  const barH = 62;
  const shown = url.slice(0, Math.round(url.length * typed));
  return (
    <div style={{
      width, height: VH * scale + barH, borderRadius: 18, overflow: "hidden", position: "relative",
      background: "#0e1224", border: `1px solid ${alpha("#ffffff", 0.12)}`,
      boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${80 * glow}px ${alpha(C.primary, 0.28 * glow)}`, ...style,
    }}>
      <div style={{ height: barH, display: "flex", alignItems: "center", gap: 18, padding: "0 22px", background: "linear-gradient(#161b33,#11152a)", borderBottom: `1px solid ${alpha("#fff", 0.07)}` }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />)}
        </div>
        <div style={{ display: "flex", gap: 14, color: alpha("#fff", 0.45), fontSize: 20, fontFamily: FONT.body }}>‹ › ⟳</div>
        <div style={{
          flex: 1, height: 38, borderRadius: 19, background: "#0a0d1c", border: `1px solid ${alpha("#fff", 0.08)}`,
          display: "flex", alignItems: "center", padding: "0 18px", gap: 10, fontFamily: FONT.mono, fontSize: 19, color: "#dfe4ff",
        }}>
          <svg width="14" height="16" viewBox="0 0 14 16"><rect x="1" y="7" width="12" height="8" rx="2" fill={alpha("#fff", 0.55)} /><path d="M4 7V5a3 3 0 0 1 6 0v2" stroke={alpha("#fff", 0.55)} strokeWidth="2" fill="none" /></svg>
          <span>{shown}</span>
          {caret && <span style={{ width: 2, height: 22, background: C.secondary, opacity: Math.floor(f / 15) % 2 ? 0 : 1 }} />}
        </div>
      </div>
      {loading > 0 && loading < 1 && (
        <div style={{ position: "absolute", top: barH - 2, left: 0, height: 3, width: `${loading * 100}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, zIndex: 5 }} />
      )}
      <div style={{ position: "relative", width: VW * scale, height: VH * scale, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: VW, height: VH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
      </div>
    </div>
  );
};

/** Câmera virtual dentro da tela (coordenadas da captura 1920x1080). */
export const Viewport: React.FC<{ x: number; y: number; z: number; children: React.ReactNode }> = ({ x, y, z, children }) => {
  const hx = VW / 2 / z, hy = VH / 2 / z;
  const cx = Math.min(Math.max(x, hx), VW - hx);
  const cy = Math.min(Math.max(y, hy), VH - hy);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: VW, height: VH, transformOrigin: "0 0", transform: `translate(${VW / 2 - cx * z}px, ${VH / 2 - cy * z}px) scale(${z})` }}>
      {children}
    </div>
  );
};

const LABELS: Record<string, string> = {
  nickname: "campo de apelido", profile: "perfis de sessão", mic: "microfone", create: "criar sala",
  invite: "convite", link: "link da sala", qr: "QR Code", share: "compartilhar tela", video: "tela compartilhada",
  controls: "controles", stop: "encerrar", participants: "participantes", settings: "configurações",
};
const TITLES: Record<string, string> = {
  home: "Página inicial", nickname: "Apelido", profile: "Perfil de sessão", mic: "Teste de microfone", room: "Sala criada",
  invite: "Convite e QR Code", sharing: "Compartilhando a tela", viewer: "Visão do participante", settings: "Configurações",
  hostLive: "Sala ao vivo", final: "Página inicial",
};

/** Espaço reservado honesto: aparece somente quando ainda não existe a captura real da etapa. */
const Placeholder: React.FC<{ name: string; boxes: Record<string, Box | null>; children?: React.ReactNode }> = ({ name, boxes, children }) => (
  <AbsoluteFill style={{
    backgroundColor: "#0b0f22",
    backgroundImage: `linear-gradient(${alpha("#fff", 0.035)} 1px, transparent 1px), linear-gradient(90deg, ${alpha("#fff", 0.035)} 1px, transparent 1px), linear-gradient(160deg, #0f1430, #0a0d1f)`,
    backgroundSize: "48px 48px, 48px 48px, 100% 100%",
  }}>
    <div style={{ position: "absolute", left: 80, top: 70, fontFamily: FONT.mono, fontSize: 24, color: alpha("#fff", 0.5), letterSpacing: 3 }}>
      ESPAÇO RESERVADO · CAPTURA REAL DA TRIXLIVE
    </div>
    <div style={{ position: "absolute", left: 80, top: 112, fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: alpha("#fff", 0.85) }}>
      {TITLES[name] ?? name}
    </div>
    <div style={{ position: "absolute", left: 80, top: 196, fontFamily: FONT.body, fontSize: 26, color: alpha("#fff", 0.42), maxWidth: 520, lineHeight: 1.4 }}>
      Esta área recebe a tela real de korabots.com.br ao executar <span style={{ fontFamily: FONT.mono, color: C.secondary }}>npm run capture</span>.
    </div>
    {children}
    {Object.entries(boxes).map(([k, b]) => b && (
      <div key={k} style={{
        position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 12,
        border: `2px dashed ${alpha("#fff", 0.28)}`, background: alpha("#fff", 0.04),
      }}>
        <div style={{ position: "absolute", left: 4, top: -28, fontFamily: FONT.mono, fontSize: 18, color: alpha("#fff", 0.5), whiteSpace: "nowrap" }}>{LABELS[k] ?? k}</div>
      </div>
    ))}
  </AbsoluteFill>
);

/** Imagem da etapa (captura real) ou espaço reservado. */
export const Shot: React.FC<{ name: string; opacity?: number; children?: React.ReactNode }> = ({ name, opacity = 1, children }) => {
  const s = useShot(name);
  return (
    <AbsoluteFill style={{ opacity }}>
      {s.image ? (
        <>
          <Img src={staticFile(s.image)} style={{ width: VW, height: VH }} />
          {children}
          {s.redacted.filter((r) => r.kind === "qr").map((r, i) => (
            <div key={i} style={{ position: "absolute", left: r.x, top: r.y + r.h + 8, width: Math.max(r.w, 220), fontFamily: FONT.body, fontSize: 16, color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "4px 8px" }}>
              QR Code desfocado por privacidade
            </div>
          ))}
        </>
      ) : (
        <Placeholder name={name} boxes={s.boxes}>{children}</Placeholder>
      )}
    </AbsoluteFill>
  );
};

/** Contorno luminoso discreto que se desenha ao redor de um elemento. */
export const Highlight: React.FC<{ box: Box | null; at: number; until?: number; z?: number; color?: string; pad?: number; radius?: number }> = ({
  box, at, until = 1e9, z = 1, color = C.secondary, pad = 10, radius = 14,
}) => {
  const f = useCurrentFrame();
  if (!box) return null;
  const p = prog(f, at, at + 18);
  const out = 1 - prog(f, until, until + 10);
  if (p <= 0 || out <= 0) return null;
  const x = box.x - pad, y = box.y - pad, w = box.w + pad * 2, h = box.h + pad * 2;
  const per = 2 * (w + h);
  const pulse = 0.5 + 0.5 * Math.sin((f - at) / 9);
  const sw = 3.2 / z;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: out }} width={VW} height={VH}>
      <defs>
        <filter id={`gl${at}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={8 / z} /></filter>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={radius} fill={alpha(color, 0.07 * p)} />
      <rect x={x} y={y} width={w} height={h} rx={radius} fill="none" stroke={color} strokeWidth={sw * 2.4} opacity={0.55 * p * (0.6 + 0.4 * pulse)} filter={`url(#gl${at})`} />
      <rect x={x} y={y} width={w} height={h} rx={radius} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={per} strokeDashoffset={per * (1 - p)} strokeLinecap="round" />
    </svg>
  );
};

/** Cursor animado com cliques (ondas). Coordenadas da captura. */
export const Cursor: React.FC<{ path: { f: number; x: number; y: number }[]; clicks?: number[]; z?: number; show?: [number, number] }> = ({ path, clicks = [], z = 1, show = [0, 1e9] }) => {
  const f = useCurrentFrame();
  if (f < show[0] || f > show[1] || path.length === 0) return null;
  let x = path[0].x, y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = ease(Math.min(1, (f - a.f) / Math.max(1, b.f - a.f)));
      x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t;
    } else if (f > b.f) { x = b.x; y = b.y; }
  }
  const op = prog(f, show[0], show[0] + 8) * (1 - prog(f, show[1] - 8, show[1]));
  const dip = clicks.reduce((m, c) => Math.max(m, f >= c && f < c + 8 ? Math.sin(((f - c) / 8) * Math.PI) : 0), 0);
  const s = (1 / z) * (1 - 0.18 * dip) * 1.25;
  return (
    <>
      {clicks.map((c) => {
        const t = (f - c) / 22;
        if (t < 0 || t > 1) return null;
        return (
          <div key={c} style={{
            position: "absolute", left: x - (60 * t) / z, top: y - (60 * t) / z, width: (120 * t) / z, height: (120 * t) / z, borderRadius: "50%",
            border: `${3 / z}px solid ${C.secondary}`, opacity: 1 - t, boxShadow: `0 0 ${20 / z}px ${C.secondary}`,
          }} />
        );
      })}
      <svg width={36} height={44} viewBox="0 0 36 44" style={{ position: "absolute", left: x - 3 * s, top: y - 2 * s, transform: `scale(${s})`, transformOrigin: "0 0", opacity: op, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>
        <path d="M3 2 L3 34 L11 26 L17 40 L23 37 L17 24 L29 24 Z" fill="#fff" stroke="#0a0d1f" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** Cartão explicativo com número da etapa. Coordenadas da tela final 1920x1080. */
export const Callout: React.FC<{ at: number; until?: number; step?: string; title: string; text?: string; x: number; y: number; width?: number; chips?: string[] }> = ({
  at, until = 1e9, step, title, text, x, y, width = 470, chips,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 20);
  const o = 1 - prog(f, until, until + 12);
  if (p <= 0 || o <= 0) return null;
  return (
    <div style={{
      position: "absolute", left: x, top: y, width, opacity: p * o, transform: `translateX(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 6}px)`,
      background: "linear-gradient(160deg, rgba(22,27,58,0.92), rgba(10,13,30,0.92))", borderRadius: 22, padding: "26px 30px",
      border: `1px solid ${alpha("#fff", 0.1)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 ${alpha("#fff", 0.08)}`,
    }}>
      <div style={{ position: "absolute", left: 0, top: 26, bottom: 26, width: 4, borderRadius: 2, background: `linear-gradient(${C.primary}, ${C.secondary})` }} />
      {step && <div style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: 3, color: C.secondary, marginBottom: 8 }}>{step}</div>}
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: "#fff", lineHeight: 1.1 }}>{title}</div>
      {text && <div style={{ fontFamily: FONT.body, fontSize: 24, color: C.muted, marginTop: 12, lineHeight: 1.4 }}>{text}</div>}
      {chips && chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {chips.map((c, i) => (
            <div key={c} style={{
              opacity: prog(f, at + 10 + i * 5, at + 22 + i * 5), fontFamily: FONT.body, fontSize: 20, fontWeight: 600, color: "#fff",
              padding: "6px 14px", borderRadius: 999, background: alpha(C.primary, 0.25), border: `1px solid ${alpha(C.primary, 0.6)}`,
            }}>{c}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const STEPS = ["Acessar", "Apelido", "Perfil", "Microfone", "Sala", "Convite", "Tela", "Voz"];
/** Indicador de progresso da jornada (canto superior). */
export const StepHud: React.FC<{ active: number; at?: number }> = ({ active, at = 0 }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 20);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 26, display: "flex", justifyContent: "center", gap: 8, opacity: p, transform: `translateY(${(1 - p) * -16}px)` }}>
      {STEPS.map((s, i) => {
        const on = i === active, done = i < active;
        return (
          <div key={s} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, fontFamily: FONT.body, fontSize: 18, fontWeight: 600,
            color: on ? "#fff" : done ? alpha("#fff", 0.75) : alpha("#fff", 0.35),
            background: on ? `linear-gradient(90deg, ${alpha(C.primary, 0.85)}, ${alpha(C.secondary, 0.7)})` : alpha("#fff", done ? 0.08 : 0.04),
            border: `1px solid ${alpha("#fff", on ? 0.3 : 0.08)}`, boxShadow: on ? `0 0 24px ${alpha(C.primary, 0.5)}` : "none",
          }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 15, opacity: 0.8 }}>{done ? "✓" : String(i + 1).padStart(2, "0")}</span>{s}
          </div>
        );
      })}
    </div>
  );
};
