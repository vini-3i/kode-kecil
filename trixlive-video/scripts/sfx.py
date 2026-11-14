#!/usr/bin/env python3
"""
Efeitos sonoros ORIGINAIS, sintetizados proceduralmente (sem amostras de terceiros).
Saída: public/audio/sfx/*.wav (48 kHz, estéreo, 16 bits)
"""
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
OUT = Path(__file__).resolve().parent.parent / "public/audio/sfx"
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a, r, curve=4.0):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    tail = np.linspace(0, 1, n - na)
    e[na:] = np.exp(-curve * tail)
    return e


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def sweep_filter(noise, f0, f1, q=3.0, block=256):
    """Ruído com filtro passa-banda varrendo de f0 a f1 (whoosh)."""
    out = np.zeros_like(noise)
    n = len(noise)
    zi = None
    for i in range(0, n, block):
        fc = f0 * (f1 / f0) ** (i / n)
        bw = fc / q
        sos = butter(2, [max(30, fc - bw), min(SR / 2 - 100, fc + bw)], "bandpass", fs=SR, output="sos")
        seg, zi = sosfilt(sos, noise[i:i + block], zi=zi if zi is not None else np.zeros((sos.shape[0], 2)))
        out[i:i + block] = seg
    return out


def stereo(x, width=0.0, delay_ms=0.0):
    d = int(delay_ms * SR / 1000)
    l = x.copy()
    r = np.concatenate([np.zeros(d), x[: len(x) - d]]) if d else x.copy()
    if width:
        r = r * (1 - width) + x * width
    return np.stack([l, r], 1)


def norm(x, peak_db=-1.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)


def save(name, x):
    if x.ndim == 1:
        x = stereo(x)
    f = int(0.004 * SR)
    x[-f:] *= np.linspace(1, 0, f)[:, None]
    sf.write(OUT / f"{name}.wav", norm(x).astype(np.float32), SR, subtype="PCM_16")


def reverb_tail(x, decay=1.2, mix=0.3):
    n = int(SR * decay)
    ir = rng.standard_normal(n) * np.exp(-6 * np.arange(n) / n)
    ir = lp(ir, 6000)
    wet = np.convolve(x, ir)[: len(x) + n] * 0.02
    wet = np.pad(wet, (0, len(x) + n - len(wet)))
    dry = np.concatenate([x, np.zeros(n)])
    return dry * (1 - mix) + wet * mix / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(x))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # whoosh: ruído varrendo para cima e para baixo
    d = 0.9
    n = rng.standard_normal(int(SR * d))
    w = sweep_filter(n, 300, 4500) * np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    save("whoosh", np.stack([w * np.linspace(1.2, 0.6, len(w)), w * np.linspace(0.6, 1.2, len(w))], 1))
    d = 0.6
    n = rng.standard_normal(int(SR * d))
    w = sweep_filter(n, 500, 3000, q=2) * np.sin(np.pi * np.linspace(0, 1, len(n))) ** 3
    save("whoosh-soft", stereo(w * 0.7, delay_ms=6))
    # swipe: whoosh curto e brilhante
    n = rng.standard_normal(int(SR * 0.35))
    w = sweep_filter(n, 1200, 7000, q=4) * np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    save("swipe", stereo(w, delay_ms=4))
    # click: transiente curto de interface
    x = t(0.06)
    c = np.sin(2 * np.pi * 2200 * x) * np.exp(-x * 120) + 0.6 * bp(rng.standard_normal(len(x)), 3000, 9000) * np.exp(-x * 300)
    c += 0.5 * np.sin(2 * np.pi * 180 * x) * np.exp(-x * 60)
    save("click", c)
    # key: tecla suave
    x = t(0.05)
    k = bp(rng.standard_normal(len(x)), 1500, 6000) * np.exp(-x * 160) + 0.4 * np.sin(2 * np.pi * 420 * x) * np.exp(-x * 90)
    save("key", k)
    # pop: bolha
    x = t(0.18)
    f = 300 + 900 * np.exp(-x * 35)
    p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22)
    save("pop", stereo(p, delay_ms=3))
    # blip: realce de destaque
    x = t(0.22)
    b = (np.sin(2 * np.pi * 1320 * x) + 0.5 * np.sin(2 * np.pi * 1980 * x)) * env(len(x), 0.004, 1, 6)
    save("blip", reverb_tail(b * 0.8, 0.5, 0.25))
    # chime: notificação (duas notas)
    x = t(0.9)
    ch = np.zeros(len(x))
    for f0, st in [(1046.5, 0.0), (1568.0, 0.11)]:
        s = int(st * SR)
        xx = x[: len(x) - s]
        tone = (np.sin(2 * np.pi * f0 * xx) + 0.3 * np.sin(2 * np.pi * 2 * f0 * xx) + 0.12 * np.sin(2 * np.pi * 3 * f0 * xx)) * np.exp(-xx * 5)
        ch[s:] += tone
    save("chime", stereo(reverb_tail(ch, 0.8, 0.3)[: len(x) + int(0.6 * SR)], delay_ms=9))
    # success: arpejo ascendente
    x = t(1.0)
    su = np.zeros(len(x))
    for i, f0 in enumerate([659.25, 830.6, 987.8, 1318.5]):
        s = int(i * 0.07 * SR)
        xx = x[: len(x) - s]
        su[s:] += (np.sin(2 * np.pi * f0 * xx) + 0.25 * np.sin(4 * np.pi * f0 * xx)) * np.exp(-xx * 6) * 0.6
    save("success", stereo(reverb_tail(su, 0.9, 0.35)[: len(x) + int(0.5 * SR)], delay_ms=11))
    # riser: ruído + tom subindo (3 s)
    d = 3.0
    x = t(d)
    n = rng.standard_normal(len(x))
    rn = sweep_filter(n, 200, 9000, q=2.5) * (x / d) ** 2
    f = 110 * (2 ** (3 * x / d))
    tone = 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (x / d) ** 1.5
    r = rn + tone
    r[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    save("riser", np.stack([r, np.roll(r, 240)], 1))
    # impact: grave profundo + ruído
    x = t(2.2)
    f = 38 + 90 * np.exp(-x * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2)
    nz = lp(rng.standard_normal(len(x)), 2500) * np.exp(-x * 9) * 0.5
    im = np.tanh(1.6 * (sub + nz))
    save("impact", stereo(reverb_tail(im, 1.4, 0.3)[: len(x) + int(SR)], delay_ms=7))
    # shimmer: cintilação aguda (marca)
    x = t(1.8)
    sh = np.zeros(len(x))
    for i in range(14):
        f0 = 2000 + 300 * i * (1 + 0.1 * rng.random())
        s = int(rng.random() * 0.6 * SR)
        xx = x[: len(x) - s]
        sh[s:] += np.sin(2 * np.pi * f0 * xx) * np.exp(-xx * 4) * 0.15
    sh *= np.linspace(0.6, 1, len(x))
    save("shimmer", np.stack([sh, np.roll(sh, 400)], 1))
    # glitch
    x = t(0.25)
    g = np.sign(np.sin(2 * np.pi * 90 * x)) * bp(rng.standard_normal(len(x)), 800, 5000) * (rng.random(len(x)) > 0.5)
    save("glitch", g * np.exp(-x * 10))
    print("efeitos gerados:", ", ".join(sorted(p.stem for p in OUT.glob("*.wav"))))


if __name__ == "__main__":
    main()
