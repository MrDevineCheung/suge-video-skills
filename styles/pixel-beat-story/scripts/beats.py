#!/usr/bin/env python3
"""测配乐节拍网格：一拍长度、拍点相位、乐句（默认 8 拍）线、每个乐句的响度表。
用法: python3 beats.py music.wav [--beats-per-phrase 8] [--bpm-min 60 --bpm-max 180]
输出: beat=0.532s  phrase=4.256s  PH(m)=T0+P*m  + 乐句响度表（找 drop / 安静段 / 尾声）
"""
import sys, argparse, subprocess, numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('wav'); ap.add_argument('--beats-per-phrase', type=int, default=8)
ap.add_argument('--bpm-min', type=float, default=60); ap.add_argument('--bpm-max', type=float, default=180)
ap.add_argument('--click', help='输出叠了节拍器的检查音频（乐句首拍高音）'); ap.add_argument('--t0', type=float, help='手动指定乐句线起点覆盖自动结果'); ap.add_argument('--beat', type=float, help='手动指定一拍长度')
a = ap.parse_args()
SR = 22050; HOP = 256
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', a.wav, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, dtype=np.float32)
dur = len(x) / SR
# 谱通量 onset 包络
N = 1024; frames = 1 + (len(x) - N) // HOP
win = np.hanning(N)
idx = np.arange(N)[None, :] + HOP * np.arange(frames)[:, None]
S = np.log1p(np.abs(np.fft.rfft(x[idx] * win, axis=1)))
on = np.maximum(0, np.diff(S, axis=0)).sum(1); on = on - np.convolve(on, np.ones(16) / 16, 'same'); on = np.maximum(on, 0)
fps = SR / HOP
# 自相关找周期
ac = np.correlate(on, on, 'full')[len(on) - 1:]
lo, hi = int(fps * 60 / a.bpm_max), int(fps * 60 / a.bpm_min)
lag = lo + np.argmax(ac[lo:hi])
# 亚帧精修：在 lag 附近用梳状滤波打分
best = None
for p in np.linspace(lag - 1.5, lag + 1.5, 61):
    k = np.arange(0, len(on) - 1, p)
    sc = max(on[(k + ph).astype(int).clip(0, len(on) - 1)].sum() for ph in np.linspace(0, p, 24, endpoint=False))
    if best is None or sc > best[0]: best = (sc, p)
P = best[1]; beat = P / fps
# 相位
phs = np.linspace(0, P, 64, endpoint=False)
scores = [on[(np.arange(0, len(on) - P, P) + ph).astype(int)].sum() for ph in phs]
b0 = phs[int(np.argmax(scores))] / fps
# 线性回归精修：每个预测拍点 ±45ms 内找 onset 峰，拟合 t = b0 + k*beat
ks, ts = [], []
w = int(0.045 * fps)
for k in range(int((dur - b0) / beat)):
    c = int((b0 + k * beat) * fps)
    if c - w < 0 or c + w >= len(on): continue
    seg = on[c - w:c + w + 1]
    if seg.max() > np.percentile(on, 90):
        ks.append(k); ts.append((c - w + int(np.argmax(seg))) / fps)
if len(ks) > 20:
    beat, b0 = np.polyfit(ks, ts, 1)
    b0 = b0 % beat
# 乐句相位：哪一拍作为乐句起点时，乐句起点处的“跳变”最大
bpp = a.beats_per_phrase; ph_len = beat * bpp
def rms(t0, t1):
    seg = x[int(max(0, t0) * SR):int(min(dur, t1) * SR)]
    return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9) if len(seg) else -120
cands = []
for k in range(bpp):
    t0 = b0 + k * beat
    jumps = [rms(t, t + beat) - rms(t - beat, t) for t in np.arange(t0 + ph_len, dur - beat, ph_len)]
    cands.append((np.mean(sorted(jumps)[-6:]), t0))
T0 = max(cands)[1]
if a.beat: beat = a.beat; ph_len = beat * bpp
if a.t0 is not None: T0 = a.t0
print(f'beat={beat:.4f}s  BPM={60 / beat:.2f}  phrase({bpp} beats)={ph_len:.4f}s  dur={dur:.2f}s')
print(f'PH(m) = {T0:.3f} + {ph_len:.4f}*m   bt(m,k) = PH(m) + k*{beat:.4f}')
print('乐句响度表 (m:start:dB)，跳升 ≥4dB = 强进候选，≤-20dB = 安静段:')
m = 0; prev = None; line = []
while T0 + m * ph_len < dur - 0.5:
    t = T0 + m * ph_len; d = rms(t, t + ph_len)
    flag = '' if prev is None else ('↑' if d - prev >= 4 else ('↓' if d - prev <= -4 else ''))
    line.append(f'{m}:{t:.2f}:{d:.0f}{flag}'); prev = d; m += 1
print('  '.join(line))

if a.click:
    y = x.copy() * 0.6
    tt = np.arange(int(0.04 * SR)) / SR
    k = 0
    t = T0 % beat
    while t < dur - 0.05:
        hi = abs(((t - T0) / ph_len) - round((t - T0) / ph_len)) < 1e-3
        c = 0.5 * np.sin(2 * np.pi * (1760 if hi else 880) * tt) * np.exp(-tt * 90)
        i = int(t * SR); y[i:i + len(c)] += c[:len(y) - i]
        t += beat
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', a.click], input=y.astype(np.float32).tobytes())
    print('click track ->', a.click, '（听：高音应落在乐句第一拍；不准就用 --t0/--beat 修正）')
