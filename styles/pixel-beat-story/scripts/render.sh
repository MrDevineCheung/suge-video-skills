#!/usr/bin/env bash
# 分两段并行渲染（2 核沙箱），静音出画，音频最后统一混。
# 用法: bash render.sh <remotion工程目录> <compositionId> <总帧数>   → /tmp/<id>_v.mp4
set -e
cd "$1"; ID=$2; N=$3; H=$((N/2))
export NODE_OPTIONS=--max-old-space-size=4096
R=./node_modules/.bin/remotion
$R render src/index.ts $ID /tmp/${ID}_a.mp4 --frames=0-$((H-1)) --muted --concurrency=1 --log=error &
$R render src/index.ts $ID /tmp/${ID}_b.mp4 --frames=$H-$((N-1)) --muted --concurrency=1 --log=error &
wait
printf "file /tmp/${ID}_a.mp4\nfile /tmp/${ID}_b.mp4\n" > /tmp/${ID}_l.txt
ffmpeg -v error -y -f concat -safe 0 -i /tmp/${ID}_l.txt -c copy /tmp/${ID}_v.mp4
ls -la /tmp/${ID}_v.mp4
