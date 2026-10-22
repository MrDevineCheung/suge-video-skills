#!/usr/bin/env bash
# 两遍 loudnorm（单遍只能到 -17 左右）。用法: bash loudnorm.sh in.wav out.wav [I=-15]
set -e; A=$1; O=$2; I=${3:--15}
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=I=$I:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i "$A" -af "loudnorm=I=$I:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 "$O"
echo "$O"
