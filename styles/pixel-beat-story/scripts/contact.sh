#!/usr/bin/env bash
# 抽帧联系表：bash contact.sh <工程目录> <compId> "秒1 秒2 ..." [fps=30]  → /tmp/contact/sheet.jpg（用 read_file 看）
cd "$1"; export NODE_OPTIONS=--max-old-space-size=4096
F=${4:-30}; rm -rf /tmp/contact; mkdir -p /tmp/contact
fr=""; for t in $3; do fr="$fr $(python3 -c "print(int($t*$F))")"; done
node stills.mjs "$2" /tmp/contact 0.4 $fr >/dev/null
montage /tmp/contact/*.jpg -tile 4x -geometry 360x270+3+3 -background '#333' /tmp/contact/sheet.jpg && echo /tmp/contact/sheet.jpg
