#!/usr/bin/env python3
"""配乐整形：按乐句接长、延后断点、磁带停、静默、淡入、压低/放开。所有拼接都在 numpy 里做（ffmpeg acrossfade
对同一输入拆出的多路会截断，别用）。

用法:
  python3 music_tools.py pick  in.wav --at 136.13 --phrase 4.256 --n 9            # 找最适合插在 at 处的 n 个乐句（和声匹配）
  python3 music_tools.py apply in.wav out.wav ops.json                             # 依次执行 ops（时间都是"当前这一步的输出时间"）

ops.json 例（ep54 实际用过的整套）:
[
 {"op":"insert", "at":136.13, "src":25.47, "len":38.304, "xf":0.532},   # 在 at 插入原曲 [src, src+len)，等功率交叉淡化 1 拍，乐句网格不变
 {"op":"hold",   "from":174.43, "to":177.56, "back":4.256},              # 把 [from,to) 换成往前 back 秒的内容：让乐队"撑到"断点
 {"op":"tapestop","at":176.56, "dur":0.9},                                # 断点：磁带停（速度 1→0）+ 衰减，配雷声/闪白
 {"op":"silence","from":177.46, "to":186.9},                              # 只留环境声
 {"op":"fadein", "from":186.9, "to":190.2},                               # 情绪段音乐慢慢回来
 {"op":"gain",   "points":[[194.98,1],[195.98,0.55],[199.97,0.55],[201.57,1]]}  # 提问时压低，在关键台词那一拍放开
]
"""
import sys, json, subprocess, numpy as np
SR = 44100
n = lambda t: int(round(t * SR))
def load(p):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2).copy()
def save(y, p):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', p], input=np.clip(y, -1, 1).astype(np.float32).tobytes(), check=True)
def xfade(A, B, L):
    t = np.linspace(0, np.pi / 2, L)[:, None]
    return np.concatenate([A[:-L], A[-L:] * np.cos(t) + B[:L] * np.sin(t), B[L:]])
def chroma(y, t0, t1):
    seg = y[n(t0):n(t1)].mean(1); S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); f = np.fft.rfftfreq(len(seg), 1 / SR)
    m = (f > 60) & (f < 4000); c = np.zeros(12); np.add.at(c, (np.round(12 * np.log2(f[m] / 440)) % 12).astype(int), S[m] ** 2)
    return c / (np.linalg.norm(c) + 1e-9)

def op_insert(y, o):
    at, src, L, h = o['at'], o['src'], o['len'], o.get('xf', 0.532) / 2
    a = y[:n(at + h)]; b = y[n(src - h):n(src + L + h)]; c = y[n(at - h):]
    return xfade(xfade(a, b, n(2 * h)), c, n(2 * h))
def op_hold(y, o):
    a, b, back = n(o['from']), n(o['to']), n(o['back'])
    y[a:b] = y[a - back:b - back].copy(); return y
def op_tapestop(y, o):
    s0, D = n(o['at']), o.get('dur', 0.9); N = n(D); tt = np.arange(N) / SR
    pos = s0 + (tt - tt ** 2 / (2 * D)) * SR; i0 = np.floor(pos).astype(int); fr = (pos - i0)[:, None]
    y[s0:s0 + N] = (y[i0] * (1 - fr) + y[i0 + 1] * fr) * ((1 - tt / D)[:, None] ** 1.5); return y
def op_silence(y, o):
    y[n(o['from']):n(o['to'])] = 0; return y
def op_fadein(y, o):
    a, b = n(o['from']), n(o['to']); y[a:b] *= (np.linspace(0, 1, b - a) ** 2)[:, None]; return y
def op_fadeout(y, o):
    a, b = n(o['from']), n(o['to']); y[a:b] *= (np.linspace(1, 0, b - a) ** 2)[:, None]; y[b:] = 0; return y
def op_gain(y, o):
    pts = o['points']; t = np.arange(len(y)) / SR
    g = np.interp(t, [p[0] for p in pts], [p[1] for p in pts]); return y * g[:, None]
OPS = dict(insert=op_insert, hold=op_hold, tapestop=op_tapestop, silence=op_silence, fadein=op_fadein, fadeout=op_fadeout, gain=op_gain)

if sys.argv[1] == 'pick':
    import argparse
    ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('wav'); ap.add_argument('--at', type=float, required=True)
    ap.add_argument('--phrase', type=float, required=True); ap.add_argument('--n', type=int, required=True); ap.add_argument('--first', type=float, help='网格起点 T0（默认 at 往前推整乐句）')
    a = ap.parse_args(); y = load(a.wav); P = a.phrase; w = P / 2; dur = len(y) / SR
    T0 = a.first if a.first is not None else a.at % P
    db = lambda t0, t1: 20 * np.log10(np.sqrt((y[n(t0):n(t1)] ** 2).mean()) + 1e-9)
    ref = db(a.at - P, a.at)
    after, before = chroma(y, a.at, a.at + w), chroma(y, a.at - w, a.at)
    res = []
    m = 0
    while T0 + (m + a.n) * P < dur:
        s0 = T0 + m * P; e0 = s0 + a.n * P
        if (e0 < a.at - 0.1 or s0 > a.at + 0.1) and all(abs(db(s0 + j * P, s0 + (j + 1) * P) - ref) < 5 for j in range(a.n)):  # 能量要和插入点前一乐句接近
            res.append((after @ chroma(y, s0, s0 + w) + before @ chroma(y, e0 - w, e0), s0))
        m += 1
    for sc, s0 in sorted(res, reverse=True)[:5]:
        print(f'src={s0:.3f} len={a.n * P:.3f}  score={sc:.3f}')
else:
    _, _, inp, out, ops = sys.argv
    y = load(inp)
    for o in json.load(open(ops)):
        y = OPS[o['op']](y, o); print('ok', o['op'], f'{len(y) / SR:.2f}s')
    save(y, out)
