#!/usr/bin/env python3
"""
Checagem de inteligibilidade da locução: transcreve cada fala com Whisper (offline, sherpa-onnx)
e compara com o texto da legenda (taxa de erro por palavra).

Uso: python3 scripts/asr_check.py            -> todas as falas
     python3 scripts/asr_check.py <arquivo>  -> transcreve um WAV/MP4 qualquer
"""
import json
import os
import re
import subprocess
import sys
import tarfile
import unicodedata
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODELS = Path(os.environ.get("TRIX_MODELS", ROOT / ".cache/models"))
W = MODELS / "sherpa-onnx-whisper-small"
URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2"

# equivalências de leitura (texto escrito -> forma falada)
SPOKEN = {
    "korabots.com.br": "korabots ponto com ponto br",
    "trixlive": "trix live",
    "qr": "qr",
}


def recognizer():
    import sherpa_onnx
    if not (W / "small-encoder.int8.onnx").exists():
        MODELS.mkdir(parents=True, exist_ok=True)
        tmp = MODELS / "whisper.tar.bz2"
        urllib.request.urlretrieve(URL, tmp)
        with tarfile.open(tmp) as t:
            t.extractall(MODELS)
        tmp.unlink()
    return sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(W / "small-encoder.int8.onnx"), decoder=str(W / "small-decoder.int8.onnx"),
        tokens=str(W / "small-tokens.txt"), language="pt", task="transcribe", num_threads=4)


def load16k(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def transcribe(rec, audio):
    s = rec.create_stream()
    s.accept_waveform(16000, audio)
    rec.decode_stream(s)
    return s.result.text.strip()


def norm(t):
    t = t.lower()
    for k, v in SPOKEN.items():
        t = t.replace(k, v)
    t = t.replace("bê erre", "br").replace("be erre", "br").replace("b r", "br").replace("ponto br", "ponto br")
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return t.split()


def wer(ref, hyp):
    d = np.zeros((len(ref) + 1, len(hyp) + 1), dtype=int)
    d[:, 0] = range(len(ref) + 1)
    d[0, :] = range(len(hyp) + 1)
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]))
    return d[-1, -1] / max(1, len(ref))


def main():
    rec = recognizer()
    if len(sys.argv) > 1:
        print(transcribe(rec, load16k(sys.argv[1])))
        return
    tl = json.loads((ROOT / "src/data/timeline.json").read_text(encoding="utf-8"))
    tot_err = tot_words = 0
    worst = []
    for sc in tl["scenes"]:
        for ln in sc["lines"]:
            hyp = transcribe(rec, load16k(ROOT / "public" / ln["audio"]))
            r, h = norm(ln["text"]), norm(hyp)
            e = wer(r, h)
            tot_err += e * len(r)
            tot_words += len(r)
            flag = "OK " if e <= 0.1 else "REV"
            print(f"{flag} {ln['id']:<12} WER {e*100:5.1f}%  | {hyp}")
            worst.append((e, ln["id"]))
    print(f"\nWER global: {tot_err/tot_words*100:.1f}% em {tot_words} palavras")


if __name__ == "__main__":
    main()
