#!/usr/bin/env bash
# 混音（配乐+环境声）→ 两遍 loudnorm 到 -15 LUFS → 封面压第 0 帧 → 成片。
# 用法: bash mux.sh video_muted.mp4 music.wav cover.jpg out.mp4 <总秒数> [sfx1.wav sfx2.wav ...]
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
V=$1; M=$2; C=$3; O=$4; T=$5; shift 5
IN=(-i "$M"); MIX="[m]"; k=1
for s in "$@"; do IN+=(-i "$s"); MIX="$MIX[$k:a]"; k=$((k+1)); done
FO=$(python3 -c "print(max(0,$T-1.2))")
ffmpeg -v error -y "${IN[@]}" -filter_complex "[0:a]afade=t=out:st=$FO:d=1.0[m];${MIX}amix=inputs=$k:normalize=0[a]" -map "[a]" -t "$T" /tmp/_mix.wav
bash "$HERE/../../../shared/loudnorm.sh" /tmp/_mix.wav /tmp/_mixn.wav -15 >/dev/null
ffmpeg -v error -y -i "$V" -i "$C" -i /tmp/_mixn.wav -filter_complex "[1:v]scale=iw:ih[c];[0:v][c]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 2:a -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k -t "$T" -movflags +faststart /tmp/_mux.mp4
cp /tmp/_mux.mp4 "$O"   # 先写 /tmp 再拷，直接写 /workspace 偶发 IO error
ffmpeg -v error -i "$O" -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "I:" | head -1
