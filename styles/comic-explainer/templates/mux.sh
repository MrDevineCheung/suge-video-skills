#!/bin/bash
# 用法: bash mux.sh 无声视频.mp4 mix.wav 封面.png 输出.mp4
set -e
V=$1; A=$2; C=$3; O=$4
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
F="loudnorm=I=-15:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true"
ffmpeg -v error -y -i "$A" -af "$F" -ar 48000 /tmp/mixn.wav
ffmpeg -v error -y -i "$V" -loop 1 -t 0.5 -i "$C" -i /tmp/mixn.wav \
 -filter_complex "[1:v]scale=1080:1920,format=yuv420p[c];[0:v][c]overlay=0:0:enable='lt(t,0.4)'[v]" \
 -map "[v]" -map 2:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart /tmp/final_mux.mp4
cp /tmp/final_mux.mp4 "$O"
