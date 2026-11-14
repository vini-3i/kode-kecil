#!/usr/bin/env bash
# Finalização para YouTube: normaliza o áudio em -14 LUFS (true peak -1 dBTP, 2 passagens),
# mantém o vídeo H.264 sem recompressão e coloca o índice no início (faststart).
# Uso: bash scripts/finalize.sh out/render-raw.mp4 out/trixlive-promo-1080p.mp4
set -euo pipefail
IN="${1:-out/render-raw.mp4}"
OUT="${2:-out/trixlive-promo-1080p.mp4}"

stats=$(ffmpeg -hide_banner -nostats -i "$IN" -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
MI=$(get input_i); MTP=$(get input_tp); MLRA=$(get input_lra); MTH=$(get input_thresh); OFF=$(get target_offset)
echo "medido: I=$MI LUFS  TP=$MTP dBTP  LRA=$MLRA"

ffmpeg -hide_banner -y -i "$IN" -map 0:v:0 -map 0:a:0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true,aresample=48000" \
  -c:a aac -b:a 320k -ar 48000 -ac 2 -movflags +faststart \
  -metadata title="TrixLive — Sua tela, sua sala, sua conexão" -metadata language=por "$OUT"
echo "final: $OUT"
