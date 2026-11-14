#!/usr/bin/env python3
"""
Trilha instrumental ORIGINAL (eletrônica/ambiente, 100 BPM, Lá menor), sintetizada do zero.

- A grade de compassos é ancorada para que o tempo forte caia na revelação da marca (fala "intro-4").
- As seções (intro, groove leve, groove cheio, respiro, retomada, final) seguem as cenas da timeline.
- Ducking automático: a música abaixa sob cada fala (envelope suave), preservando a inteligibilidade.

Saída: public/audio/music/soundtrack.wav (48 kHz, estéreo)  — duração = duração do vídeo.
"""
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(42)

TL = json.loads((ROOT / "src/data/timeline.json").read_text(encoding="utf-8"))
FPS = TL["fps"]
DUR = TL["durationInFrames"] / FPS
N = int(DUR * SR)
SC = {s["id"]: (s["from"] / FPS, (s["from"] + s["durationInFrames"]) / FPS) for s in TL["scenes"]}
LOGO = next(l for s in TL["scenes"] for l in s["lines"] if l["id"] == "intro-4")["from"] / FPS
OUTRO = SC["outro"][0]

# grade: um compasso começa exatamente em LOGO
T0 = LOGO - np.ceil(LOGO / BAR) * BAR  # primeiro compasso (pode ser negativo)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "lowpass", fs=SR, output="sos"), x, axis=0)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "highpass", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "bandpass", fs=SR, output="sos"), x, axis=0)


def adsr(n, a, d, s, r, sustain_len):
    e = np.zeros(n)
    A, D, S = int(a * SR), int(d * SR), int(sustain_len * SR)
    R = n - S
    i = np.arange(n)
    e = np.where(i < A, i / max(1, A), 1.0)
    dec = (i >= A) & (i < A + D)
    e = np.where(dec, 1 - (1 - s) * (i - A) / max(1, D), e)
    e = np.where((i >= A + D) & (i < S), s, e)
    rel = i >= S
    e = np.where(rel, s * np.exp(-(i - S) / max(1, r * SR) * 5), e)
    return e


def place(buf, x, t, gain=1.0):
    s = int(round(t * SR))
    if s >= len(buf):
        return
    if s < 0:
        x = x[-s:]
        s = 0
    e = min(len(buf), s + len(x))
    buf[s:e] += x[: e - s] * gain


# ------------------------------------------------------------------ instrumentos
def supersaw(f, dur, voices=7, detune=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2)
        fr = f * 2 ** (d * detune / 12)
        ph = rng.random()
        saw = 2 * ((fr * t + ph) % 1) - 1
        pan = 0.5 + 0.45 * d
        L += saw * (1 - pan)
        R += saw * pan
    return np.stack([L, R], 1) / voices


def pad_chord(notes, dur, cutoff=1600):
    x = sum(supersaw(mtof(m), dur + 1.6) for m in notes)
    x = lp(x, cutoff, 2)
    env = adsr(len(x), 0.9, 0.6, 0.85, 1.4, dur)
    return x * env[:, None] * 0.22


def pluck(f, dur=0.45, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for h in range(1, 9):
        y += np.sin(2 * np.pi * f * h * t + h) / h ** 1.1 * np.exp(-t * (6 + 5 * h / bright))
    y *= np.minimum(1, t / 0.002)
    return y * 0.35


def bell(f, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4.5) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return y * np.minimum(1, t / 0.003) * 0.3


def bass_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * (2 * ((f * t) % 1) - 1)
    y = lp(y, 420)
    e = np.minimum(1, t / 0.01) * np.exp(-t * 1.2)
    rel = int(0.05 * SR)
    e[-rel:] *= np.linspace(1, 0, rel)
    return y * e * 0.55


def kick():
    t = np.arange(int(0.5 * SR)) / SR
    f = 46 + 110 * np.exp(-t * 32)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    y += bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 200) * 0.25
    return np.tanh(1.4 * y) * 0.9


def hat(open_=False):
    d = 0.32 if open_ else 0.06
    t = np.arange(int(d * SR)) / SR
    y = hp(rng.standard_normal(len(t)), 7500, 2) * np.exp(-t * (12 if open_ else 70))
    return y * (0.16 if open_ else 0.12)


def clap():
    t = np.arange(int(0.35 * SR)) / SR
    y = np.zeros(len(t))
    for k, off in enumerate([0, 0.011, 0.022]):
        s = int(off * SR)
        y[s:] += bp(rng.standard_normal(len(t) - s), 900, 3500) * np.exp(-t[: len(t) - s] * (60 if k < 2 else 16))
    return y * 0.32


def stereo(x, pan=0.5):
    return np.stack([x * (1 - pan) * 1.4, x * pan * 1.4], 1) if x.ndim == 1 else x


def reverb(x, secs=2.8, mix=1.0):
    n = int(secs * SR)
    tt = np.arange(n) / SR
    irL = rng.standard_normal(n) * np.exp(-tt * 3.0 / secs * 2.3)
    irR = rng.standard_normal(n) * np.exp(-tt * 3.0 / secs * 2.3)
    irL, irR = lp(irL, 5500), lp(irR, 5500)
    pre = int(0.02 * SR)
    irL = np.concatenate([np.zeros(pre), irL])
    irR = np.concatenate([np.zeros(pre), irR])
    L = fftconvolve(x[:, 0], irL)[: len(x)]
    R = fftconvolve(x[:, 1], irR)[: len(x)]
    w = np.stack([L, R], 1)
    return w / (np.max(np.abs(w)) + 1e-9) * np.max(np.abs(x)) * mix


def pingpong(x, delay, fb=0.38, taps=5):
    out = np.zeros_like(x)
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = fb ** k
        side = k % 2
        sh = np.zeros(len(x))
        sh[d * k:] = x[: len(x) - d * k, 0] * g if d * k < len(x) else 0
        out[:, side] += sh
    return lp(out, 4000)


# ------------------------------------------------------------------ arranjo
# Am  F  C  G  (vi IV I V em Dó maior)
CHORDS = [
    {"root": 45, "pad": [57, 60, 64, 67], "arp": [69, 72, 76, 79, 81, 79, 76, 72]},
    {"root": 41, "pad": [57, 60, 64, 65], "arp": [65, 69, 72, 76, 77, 76, 72, 69]},
    {"root": 48, "pad": [55, 60, 64, 67], "arp": [67, 72, 76, 79, 84, 79, 76, 72]},
    {"root": 43, "pad": [55, 59, 62, 67], "arp": [67, 71, 74, 79, 83, 79, 74, 71]},
]


def section_at(t):
    """Intensidade do arranjo em cada momento (segue as cenas)."""
    if t < LOGO - 0.01:
        return "intro"
    if t < SC["home"][0]:
        return "light"
    if t < SC["share"][0]:
        return "full"
    if t < SC["voice"][0]:
        return "break"
    if t < SC["usecases"][0]:
        return "build"
    if t < OUTRO:
        return "full+"
    return "outro"


def main():
    pads = np.zeros((N, 2))
    arps = np.zeros((N, 2))
    bass = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    leads = np.zeros((N, 2))
    sc_env = np.ones(N)  # sidechain (bombeamento suave pelo bumbo)
    K, CL, HC, HO = kick(), clap(), hat(), hat(True)

    end_bar = OUTRO + 2 * BAR  # o groove segue até 2 compassos após o início do encerramento
    final_t = None
    b = 0
    while True:
        t0 = T0 + b * BAR
        if t0 > DUR:
            break
        ch = CHORDS[b % 4]
        sec = section_at(max(0.0, t0 + 0.01))
        if sec == "outro" and t0 >= end_bar:
            final_t = t0
            break
        # pad (sempre presente)
        cutoff = 900 + (1400 if sec in ("full", "full+", "outro") else 700 if sec in ("light", "build") else 300)
        if sec == "intro":
            cutoff = 600 + 1200 * max(0, (t0 + BAR) / max(LOGO, 1))
        place(pads, pad_chord(ch["pad"], BAR, cutoff), t0, 1.0)
        # baixo
        if sec != "intro":
            pattern = [0, 1.5, 2, 3.5] if sec in ("full", "full+", "build", "outro") else [0, 2]
            for i, bt in enumerate(pattern):
                nxt = pattern[i + 1] if i + 1 < len(pattern) else 4
                place(bass, stereo(bass_note(mtof(ch["root"] - 12 + (12 if bt == 3.5 else 0)), (nxt - bt) * BEAT * 0.95)), t0 + bt * BEAT, 1.0)
        # arpejo em semicolcheias
        if sec != "intro":
            step = BEAT / 4 if sec in ("full", "full+", "break", "build", "outro") else BEAT / 2
            nsteps = int(round(BAR / step))
            for i in range(nsteps):
                m = ch["arp"][i % 8] - (12 if sec == "break" else 0)
                vel = (0.8 if i % 4 == 0 else 0.55) * (0.7 if sec == "light" else 1.0)
                pan = 0.3 if i % 2 else 0.7
                place(arps, stereo(pluck(mtof(m), 0.5, 1.4 if sec == "full+" else 1.0), pan), t0 + i * step, vel)
        # bateria
        if sec in ("light", "full", "full+", "build", "outro"):
            beats = range(4)
            for bt in beats:
                kt = t0 + bt * BEAT
                if sec == "build" and bt % 2 == 1 and b % 2 == 0:
                    continue
                place(drums, stereo(K), kt, 1.0)
                s = int(kt * SR)
                if 0 <= s < N:
                    ln = min(int(0.32 * SR), N - s)
                    sc_env[s:s + ln] = np.minimum(sc_env[s:s + ln], 1 - 0.38 * np.exp(-np.arange(ln) / (0.11 * SR)))
            if sec != "light":
                for bt in (1, 3):
                    place(drums, stereo(CL, 0.5), t0 + bt * BEAT, 0.9)
            for i in range(8):
                ht = t0 + i * BEAT / 2
                place(drums, stereo(HO if i % 2 == 1 and sec in ("full", "full+") else HC, 0.62), ht, 0.9 if i % 2 else 0.6)
            if sec in ("full+",):
                for i in range(16):
                    if i % 2:
                        place(drums, stereo(HC, 0.35), t0 + i * BEAT / 4, 0.35)
        elif sec == "break":
            place(drums, stereo(K), t0, 0.8)
        # melodia de sinos na seção "full+" e no encerramento
        if sec in ("full+",) and b % 2 == 0:
            motif = [(0, 76), (0.75, 79), (1.5, 81), (2.5, 79), (3, 76)]
            for bt, m in motif:
                place(leads, stereo(bell(mtof(m + (0 if b % 4 == 0 else -3))), 0.45), t0 + bt * BEAT, 0.55)
        b += 1

    # acorde final sustentado + sino
    if final_t is None:
        final_t = OUTRO + 2 * BAR
    rest = DUR - final_t
    if rest > 0.5:
        fin = pad_chord([57, 60, 64, 67, 72], max(0.5, rest - 1.8), 1800)
        fade = np.ones(len(fin))
        fl = min(len(fin), int(3.5 * SR))
        fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
        place(pads, fin * fade[:, None], final_t, 1.15)
        place(bass, stereo(bass_note(mtof(33), min(4.0, rest))), final_t, 1.1)
        for k, m in enumerate([69, 76, 81]):
            place(leads, stereo(bell(mtof(m), 3.0), 0.4 + 0.1 * k), final_t + k * 0.12, 0.6)

    # impacto da revelação da marca: acorde + sub
    tt = np.arange(int(2.5 * SR)) / SR
    sub = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-tt * 20)) / SR) * np.exp(-tt * 1.6)
    place(bass, stereo(sub * 0.7), LOGO, 1.0)
    # entrada da cena final: impacto suave
    place(bass, stereo(sub * 0.45), OUTRO + 0.2, 1.0)

    # mixagem
    arps_fx = arps + pingpong(arps, BEAT * 0.75) * 0.5
    wet = reverb(pads * 0.6 + arps_fx * 0.5 + leads * 0.8, 3.2) * 0.45
    mix = (pads * 0.9 + arps_fx * 0.55 + leads * 0.7) * sc_env[:, None] + bass * 0.95 * sc_env[:, None] + drums * 0.62 + wet
    mix = hp(mix, 28)

    # fade-in inicial e saída limpa no último frame
    fi = int(2.0 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None] ** 2
    fo = int(0.25 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None]

    # ducking sob a locução
    duck = np.ones(N)
    for s in TL["scenes"]:
        for l in s["lines"]:
            a = l["from"] / FPS - 0.12
            e = a + l["seconds"] + 0.25
            ia, ie = max(0, int(a * SR)), min(N, int(e * SR))
            duck[ia:ie] = np.minimum(duck[ia:ie], 10 ** (-8.5 / 20))
    k = int(0.18 * SR)
    win = np.hanning(2 * k)
    win /= win.sum()
    duck = np.convolve(duck, win, mode="same")
    mix *= duck[:, None]

    # master: saturação suave e normalização
    mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.3) * 0.62
    out = ROOT / "public/audio/music/soundtrack.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix.astype(np.float32), SR, subtype="PCM_16")
    print(f"trilha: {DUR:.2f}s · compasso={BAR:.2f}s · tempo forte na marca em {LOGO:.2f}s · final em {final_t:.2f}s → {out}")


if __name__ == "__main__":
    main()
