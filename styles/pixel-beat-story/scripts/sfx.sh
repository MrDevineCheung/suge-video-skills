#!/usr/bin/env bash
# 程序化环境声（无版权问题）：雨声 + 雷声。
# 用法: bash sfx.sh <总秒数> <雨起> <雨止> "<雷1>,<雷2>,..."   → /tmp/rain.wav /tmp/thunder.wav
D=$1; A=$2; B=$3; IFS=, read -ra TH <<< "$4"
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=$D:c=pink:r=44100:a=0.5" -af "highpass=f=400,lowpass=f=6000,volume='if(lt(t,$A),0,if(lt(t,$A+1),(t-$A),if(lt(t,$B),1,if(lt(t,$B+2.5),($B+2.5-t)/2.5,0))))*0.22':eval=frame" /tmp/rain.wav
E="0"; for t in "${TH[@]}"; do E="$E+if(between(t,$t,$t+2),exp(-(t-$t)*1.6),0)"; done
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=$D:c=brown:r=44100:a=0.9" -af "lowpass=f=180,volume='($E)*1.4':eval=frame" /tmp/thunder.wav
echo /tmp/rain.wav /tmp/thunder.wav
