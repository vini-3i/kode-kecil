#!/usr/bin/env python3
"""
Síntese da locução (pt-BR, voz masculina) + geração da timeline sincronizada.

Fonte: src/data/narration.json
Saídas:
  public/audio/vo/<linha>.wav    (48 kHz, mono, pós-processado)
  src/data/timeline.json         (frames de cada cena, fala e bloco de legenda)
  out/legendas.srt               (legenda para upload no YouTube)

Motor: Kokoro v1.0 (via sherpa-onnx, offline), voz "pm_alex".
O modelo é baixado automaticamente dos releases públicos do sherpa-onnx no GitHub.

Uso: python3 scripts/tts.py [--force]
"""
import hashlib
import json
import os
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfiltfilt

ROOT = Path(__file__).resolve().parent.parent
NARRATION = ROOT / "src/data/narration.json"
TIMELINE = ROOT / "src/data/timeline.json"
VO_DIR = ROOT / "public/audio/vo"
OUT_DIR = ROOT / "out"
MODELS = Path(os.environ.get("TRIX_MODELS", ROOT / ".cache/models"))
KOKORO = MODELS / "kokoro-multi-lang-v1_0"
KOKORO_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2"
SR_OUT = 48000

MAX_ROW = 42          # caracteres por linha de legenda
MAX_CHUNK = 84        # 2 linhas por bloco


def ensure_model():
    if (KOKORO / "model.onnx").exists():
        return
    MODELS.mkdir(parents=True, exist_ok=True)
    tmp = MODELS / "kokoro.tar.bz2"
    print(f"baixando modelo Kokoro -> {tmp}")
    urllib.request.urlretrieve(KOKORO_URL, tmp)
    with tarfile.open(tmp) as t:
        t.extractall(MODELS)
    tmp.unlink()


def load_tts(threads=4):
    import sherpa_onnx
    k = sherpa_onnx.OfflineTtsKokoroModelConfig(
        model=str(KOKORO / "model.onnx"),
        voices=str(KOKORO / "voices.bin"),
        tokens=str(KOKORO / "tokens.txt"),
        data_dir=str(KOKORO / "espeak-ng-data"),
        dict_dir=str(KOKORO / "dict"),
        lang="pt-br",
    )
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=k, num_threads=threads))
    return sherpa_onnx.OfflineTts(cfg)


def trim(x, sr, thr_db=-45.0, pad=0.04):
    """Remove silêncio no início/fim mantendo uma pequena margem."""
    win = int(sr * 0.01)
    if len(x) < win * 4:
        return x
    frames = len(x) // win
    rms = np.sqrt(np.mean(x[: frames * win].reshape(frames, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms / (np.max(rms) + 1e-12))
    idx = np.where(db > thr_db)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] * win - int(pad * sr))
    b = min(len(x), (idx[-1] + 1) * win + int(pad * sr))
    return x[a:b]


def compress(x, sr, thr_db=-18.0, ratio=2.5, attack=0.005, release=0.08):
    """Compressor simples (envelope RMS) para uma voz mais presente e constante."""
    env = np.abs(x)
    a_att = np.exp(-1.0 / (attack * sr))
    a_rel = np.exp(-1.0 / (release * sr))
    out_env = np.zeros_like(env)
    e = 0.0
    for i, v in enumerate(env):  # amostras de fala são curtas; loop é aceitável
        coef = a_att if v > e else a_rel
        e = coef * e + (1 - coef) * v
        out_env[i] = e
    db = 20 * np.log10(out_env + 1e-9)
    over = np.maximum(0.0, db - thr_db)
    gain_db = -over * (1 - 1 / ratio)
    return x * (10 ** (gain_db / 20))


def process(samples, sr_in):
    x = np.asarray(samples, dtype=np.float64)
    x = trim(x, sr_in)
    x = resample_poly(x, SR_OUT, sr_in)
    x = sosfiltfilt(butter(2, 75, "highpass", fs=SR_OUT, output="sos"), x)
    # leve realce de presença (~3 kHz) por mistura paralela de banda
    pres = sosfiltfilt(butter(2, [2200, 5000], "bandpass", fs=SR_OUT, output="sos"), x)
    x = x + 0.18 * pres
    x = compress(x, SR_OUT)
    peak = np.max(np.abs(x)) + 1e-9
    x = x / peak * 10 ** (-3 / 20)  # pico -3 dBFS
    f = int(0.008 * SR_OUT)
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    return x.astype(np.float32)


# ---------------------------------------------------------------- legendas
def split_chunks(text):
    """Divide a fala em blocos de até 2 linhas, preferindo pontuação."""
    if len(text) <= MAX_CHUNK:
        return [text]
    best, best_score = None, 1e9
    mid = len(text) / 2
    for m in re.finditer(r"[,:;.?!]\s", text):
        p = m.end()
        if len(text[:p].strip()) <= MAX_CHUNK and len(text[p:].strip()) <= MAX_CHUNK * 1.6:
            score = abs(p - mid)
            if score < best_score:
                best, best_score = p, score
    if best is None:
        sp = [m.start() for m in re.finditer(r"\s", text)]
        best = min(sp, key=lambda p: abs(p - mid))
    a, b = text[:best].strip(), text[best:].strip()
    return split_chunks(a) + split_chunks(b)


def wrap_rows(chunk):
    if len(chunk) <= MAX_ROW:
        return [chunk]
    words = chunk.split()
    best, best_d = None, 1e9
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        d = max(len(a), len(b))
        if d < best_d:
            best, best_d = (a, b), d
    return list(best)


def chunk_times(chunks, audio, sr):
    """Tempo de início de cada bloco: estimativa proporcional ajustada ao vale de energia mais próximo."""
    dur = len(audio) / sr
    if len(chunks) == 1:
        return [0.0, dur]
    total = sum(len(c) for c in chunks)
    win = int(sr * 0.02)
    frames = len(audio) // win
    rms = np.sqrt(np.mean(audio[: frames * win].reshape(frames, win) ** 2, axis=1) + 1e-12)
    bounds = [0.0]
    acc = 0
    for c in chunks[:-1]:
        acc += len(c)
        est = dur * acc / total
        lo, hi = int(max(0, est - 0.45) / 0.02), int(min(dur, est + 0.45) / 0.02)
        seg = rms[lo:hi]
        t = (lo + int(np.argmin(seg))) * 0.02 + 0.01 if len(seg) else est
        bounds.append(t)
    bounds.append(dur)
    return bounds


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    force = "--force" in sys.argv
    data = json.loads(NARRATION.read_text(encoding="utf-8"))
    fps = data["fps"]
    voice = data["voice"]
    VO_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tts = None

    t = 0.0
    scenes_out = []
    srt = []
    for sc in data["scenes"]:
        start = t
        t += sc.get("leadIn", 0.5)
        lines_out = []
        for ln in sc["lines"]:
            say = ln.get("say", ln["text"])
            key = hashlib.sha1(json.dumps([say, voice], sort_keys=True).encode()).hexdigest()[:12]
            wav = VO_DIR / f"{ln['id']}.wav"
            meta = VO_DIR / f"{ln['id']}.json"
            cached = meta.exists() and json.loads(meta.read_text()).get("key") == key and wav.exists()
            if force or not cached:
                if tts is None:
                    ensure_model()
                    tts = load_tts()
                gen = tts.generate(say, sid=voice["sid"], speed=voice.get("speed", 1.0))
                audio = process(gen.samples, gen.sample_rate)
                sf.write(wav, audio, SR_OUT, subtype="PCM_16")
                meta.write_text(json.dumps({"key": key, "say": say}))
                print(f"  sintetizado {ln['id']:<12} {len(audio)/SR_OUT:5.2f}s  {say}")
            audio, _ = sf.read(wav, dtype="float32")
            dur = len(audio) / SR_OUT
            chunks = split_chunks(ln["text"])
            bounds = chunk_times(chunks, audio, SR_OUT)
            subs = []
            for i, c in enumerate(chunks):
                a, b = t + bounds[i], t + bounds[i + 1]
                subs.append({"rows": wrap_rows(c), "from": round(a * fps), "to": round(b * fps)})
                srt.append((a, b + 0.15, "\n".join(wrap_rows(c))))
            lines_out.append({
                "id": ln["id"], "text": ln["text"], "audio": f"audio/vo/{ln['id']}.wav",
                "from": round(t * fps), "durationInFrames": int(np.ceil(dur * fps)), "seconds": round(dur, 3),
                "subs": subs,
            })
            t += dur + ln.get("pauseAfter", 0.35)
        if sc["lines"]:
            t -= sc["lines"][-1].get("pauseAfter", 0.35)
        t += sc.get("tail", 1.0)
        f0, f1 = round(start * fps), round(t * fps)
        for lo in lines_out:
            lo["localFrom"] = lo["from"] - f0
            for s in lo["subs"]:
                s["localFrom"], s["localTo"] = s["from"] - f0, s["to"] - f0
        scenes_out.append({"id": sc["id"], "title": sc["title"], "from": f0, "durationInFrames": f1 - f0, "lines": lines_out})
        t = f1 / fps

    total = scenes_out[-1]["from"] + scenes_out[-1]["durationInFrames"]
    TIMELINE.write_text(json.dumps({"fps": fps, "durationInFrames": total, "seconds": round(total / fps, 2),
                                    "scenes": scenes_out}, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(OUT_DIR / "legendas.srt", "w", encoding="utf-8") as f:
        for i, (a, b, txt) in enumerate(srt, 1):
            f.write(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{txt}\n\n")
    # áudio do "microfone" do participante de demonstração (usado por scripts/capture.mjs como dispositivo falso)
    demo = ROOT / "public/audio/demo-mic.wav"
    if force or not demo.exists():
        if tts is None:
            ensure_model()
            tts = load_tts()
        gen = tts.generate("Oi, pessoal! Está todo mundo me ouvindo? Então bora começar a partida!", sid=43, speed=1.0)
        a = process(gen.samples, gen.sample_rate)
        a = np.concatenate([np.zeros(SR_OUT // 2, np.float32), a, np.zeros(SR_OUT, np.float32)])
        sf.write(demo, a, SR_OUT, subtype="PCM_16")
    print(f"timeline: {len(scenes_out)} cenas, {total} frames = {total/fps:.1f}s")
    for s in scenes_out:
        print(f"  {s['id']:<10} {s['from']/fps:6.1f}s  +{s['durationInFrames']/fps:5.1f}s")


if __name__ == "__main__":
    main()
