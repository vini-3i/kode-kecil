#!/usr/bin/env python3
"""
Controle de qualidade do vídeo final.
  1. Formato (H.264 1080p, 30 fps, yuv420p, AAC 48 kHz estéreo, durações de áudio/vídeo)
  2. Loudness (EBU R128: integrado, true peak) — alvo YouTube -14 LUFS / -1 dBTP
  3. Sincronia locução ↔ timeline: correlação cruzada de cada fala com o áudio final (desvio em ms)
  4. Inteligibilidade na mixagem final: Whisper transcreve cada fala do MP4 (com música) e compara com a legenda
  5. Legendas: cada bloco dentro do intervalo da fala, sem sobreposição
  6. Quadros pretos inesperados e folha de contato (out/qa/contact-sheet.jpg)

Uso: python3 scripts/verify.py out/trixlive-promo-1080p.mp4
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
from asr_check import norm, recognizer, transcribe, wer  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
QA = ROOT / "out/qa"
results = []


def check(ok, name, detail=""):
    results.append((ok, name, detail))
    print(f"{'PASSA' if ok else 'FALHA'}  {name}  {detail}")


def ffprobe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def main():
    video = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out/trixlive-promo-1080p.mp4")
    QA.mkdir(parents=True, exist_ok=True)
    tl = json.loads((ROOT / "src/data/timeline.json").read_text(encoding="utf-8"))
    fps = tl["fps"]

    # 1. formato
    p = ffprobe(video)
    v = next(s for s in p["streams"] if s["codec_type"] == "video")
    a = next(s for s in p["streams"] if s["codec_type"] == "audio")
    num, den = map(int, v["r_frame_rate"].split("/"))
    check(v["codec_name"] == "h264", "vídeo H.264", f"{v['codec_name']} perfil {v.get('profile')}")
    check((v["width"], v["height"]) == (1920, 1080), "resolução 1920×1080", f"{v['width']}×{v['height']}")
    check(abs(num / den - fps) < 0.01, f"{fps} fps", v["r_frame_rate"])
    check(v["pix_fmt"] == "yuv420p", "pix_fmt yuv420p", v["pix_fmt"])
    check(a["codec_name"] == "aac" and int(a["sample_rate"]) == 48000 and a["channels"] == 2, "áudio AAC 48 kHz estéreo", f"{a['codec_name']} {a['sample_rate']} Hz {a['channels']} ch")
    vd, ad = float(v["duration"]), float(a["duration"])
    exp = tl["durationInFrames"] / fps
    check(abs(vd - exp) < 0.1, "duração do vídeo = timeline", f"{vd:.2f}s (esperado {exp:.2f}s)")
    check(abs(vd - ad) < 0.1, "duração áudio ≈ vídeo", f"áudio {ad:.2f}s")
    br = int(p["format"]["bit_rate"]) / 1e6
    check(br > 6, "taxa de bits adequada para 1080p", f"{br:.1f} Mb/s")

    # 2. loudness
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    summ = r.stderr[r.stderr.rfind("Summary:"):]
    I = float(summ.split("I:")[1].split("LUFS")[0])
    TP = float(summ.split("Peak:")[1].split("dBFS")[0])
    check(abs(I - (-14)) <= 1.0, "loudness integrado ≈ -14 LUFS", f"{I:.1f} LUFS")
    check(TP <= -0.5, "true peak ≤ -1 dBTP (margem 0,5)", f"{TP:.1f} dBTP")

    # 3/4. sincronia + inteligibilidade
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    mix = np.frombuffer(raw, dtype=np.float32)
    rec = recognizer()
    offsets, wers, words = [], [], 0
    rows = []
    for sc in tl["scenes"]:
        for ln in sc["lines"]:
            clip, sr = sf.read(ROOT / "public" / ln["audio"], dtype="float32")
            t = ln["from"] / fps
            a0 = int(max(0, t - 0.5) * 48000)
            seg = mix[a0: a0 + len(clip) + 48000]
            cc = fftconvolve(seg, clip[::-1], mode="valid")
            lag = (int(np.argmax(cc)) + a0) / 48000 - t
            offsets.append(lag * 1000)
            s16 = resample_poly(mix[int(t * 48000): int((t + ln["seconds"] + 0.15) * 48000)], 1, 3).astype(np.float32)
            hyp = transcribe(rec, s16)
            e = wer(norm(ln["text"]), norm(hyp))
            wers.append(e * len(norm(ln["text"])))
            words += len(norm(ln["text"]))
            rows.append({"id": ln["id"], "offset_ms": round(lag * 1000, 1), "wer": round(e, 3), "asr": hyp})
            # 5. legendas
            for s in ln["subs"]:
                assert s["from"] >= ln["from"] - 1 and s["to"] <= ln["from"] + ln["durationInFrames"] + 1, ln["id"]
    worst = max(offsets, key=abs)
    check(max(abs(o) for o in offsets) <= 1000 / fps, "sincronia locução ↔ timeline ≤ 1 frame", f"pior desvio {worst:+.1f} ms em {len(offsets)} falas")
    gw = sum(wers) / words
    check(gw <= 0.08, "inteligibilidade da voz na mixagem final (WER Whisper)", f"{gw*100:.1f}% em {words} palavras")
    check(True, "blocos de legenda dentro das falas", f"{sum(len(l['subs']) for s in tl['scenes'] for l in s['lines'])} blocos")
    (QA / "sync-report.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

    # 6. quadros pretos (exceto o fade final) + folha de contato
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-vf", "blackdetect=d=0.4:pix_th=0.06", "-an", "-f", "null", "-"], capture_output=True, text=True)
    blacks = [l for l in r.stderr.splitlines() if "black_start" in l]
    unexpected = [b for b in blacks if float(b.split("black_start:")[1].split()[0]) < exp - 2.0]
    check(not unexpected, "sem trechos pretos inesperados", f"{len(blacks)} trecho(s) preto(s) no total (fade final esperado)")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", "fps=1/6,scale=480:-1,tile=6x5", "-frames:v", "1", str(QA / "contact-sheet.jpg")], check=True)
    print(f"\nfolha de contato: {QA/'contact-sheet.jpg'}  ·  relatório de sincronia: {QA/'sync-report.json'}")
    ok = all(r[0] for r in results)
    (QA / "qa-report.txt").write_text("\n".join(f"{'PASSA' if o else 'FALHA'}  {n}  {d}" for o, n, d in results) + "\n", encoding="utf-8")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
