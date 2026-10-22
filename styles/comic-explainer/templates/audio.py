import json, wave, numpy as np
SR = 48000
ev = json.load(open('events.json'))
total, lead, gap, cuts = ev['total'], ev['lead'], ev['gap'], ev['cuts']
w = wave.open('narration.wav'); assert w.getframerate() == SR
sw = w.getsampwidth(); raw = w.readframes(w.getnframes())
v = np.frombuffer(raw, np.int16 if sw == 2 else np.int32).astype(np.float32)
v /= 32768.0 if sw == 2 else 2147483648.0
N = int(total * SR) + SR
voice = np.zeros(N, np.float32)
# place voice pieces
bounds = [0] + [int(c * SR) for c in cuts] + [len(v)]
for i in range(len(bounds) - 1):
    a, b = bounds[i], bounds[i + 1]
    off = int((lead + gap * i) * SR) + a
    voice[off:off + (b - a)] += v[a:b]

rng = np.random.default_rng(7)
# ---------- piano music ----------
def note(freq, dur, vel=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n, np.float32)
    for h, amp in [(1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06), (6, 0.03)]:
        f = freq * h * (1 + 0.0004 * h * h)
        s += amp * np.sin(2 * np.pi * f * t) * np.exp(-t * (1.6 + 0.9 * h))
    att = np.minimum(1, t / 0.006)
    return (s * att * vel).astype(np.float32)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
bpm = 92; beat = 60 / bpm
prog = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]]  # C Am F G
mel = [[76, 74, 72, 74], [72, 71, 69, 71], [69, 72, 74, 72], [71, 74, 79, 74]]
music = np.zeros(N, np.float32)
t = 0.0; bar = 0
while t < total:
    ch = prog[bar % 4]
    pos = int(t * SR)
    nb = note(mtof(ch[0] - 12), beat * 4.5, 0.22); music[pos:pos + len(nb)] += nb[:max(0, N - pos)]
    arp = [ch[1], ch[2], ch[3], ch[4], ch[3], ch[2], ch[3], ch[4]]
    for k, m in enumerate(arp):
        p = int((t + k * beat / 2) * SR); nn = note(mtof(m), beat * 2.5, 0.10 + 0.02 * (k % 2 == 0)); music[p:p + len(nn)] += nn[:max(0, N - p)]
    if (bar // 4) % 2 == 1:
        for k, m in enumerate(mel[bar % 4]):
            p = int((t + k * beat) * SR); nn = note(mtof(m), beat * 2.2, 0.12); music[p:p + len(nn)] += nn[:max(0, N - p)]
    t += beat * 4; bar += 1
# simple reverb
ir_len = int(1.6 * SR); irt = np.arange(ir_len) / SR
ir = (rng.standard_normal(ir_len) * np.exp(-irt * 3.2)).astype(np.float32) * 0.02; ir[0] = 1.0
from numpy.fft import rfft, irfft
L = 1 << int(np.ceil(np.log2(N + ir_len)))
music = irfft(rfft(music, L) * rfft(ir, L), L)[:N].astype(np.float32)

def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
# voice active level
fr = int(0.05 * SR)
env = np.sqrt(np.convolve(voice ** 2, np.ones(fr) / fr, 'same'))
active = env > 0.01
vlev = rms(voice[active])
music *= (vlev / rms(music)) * 10 ** (-9 / 20)
# ducking: smooth gain, -5dB extra when voice present
target = np.where(active, 10 ** (-5 / 20), 1.0).astype(np.float32)
g = np.empty_like(target); cur = 1.0
a_att, a_rel = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.45 * SR))
# vectorised-ish smoothing via loop on decimated grid
step = 240
tg = target[::step]; gs = np.empty_like(tg)
aa, ar = np.exp(-step / (0.08 * SR)), np.exp(-step / (0.45 * SR))
for i, x in enumerate(tg):
    a = aa if x < cur else ar
    cur = a * cur + (1 - a) * x; gs[i] = cur
g = np.interp(np.arange(N), np.arange(len(gs)) * step, gs).astype(np.float32)
music *= g
# ---------- sfx ----------
sfx = np.zeros(N, np.float32)
noise = rng.standard_normal(N).astype(np.float32)
# bandpass-ish: difference of smoothings
def smooth(x, n): return np.convolve(x, np.ones(n) / n, 'same')
hiss = noise - smooth(noise, 10); hiss = smooth(hiss, 4)
mask = np.zeros(N, np.float32)
for e in ev['ev']:
    if e['type'] == 'draw':
        a, b = int(e['t0'] * SR), int(e['t1'] * SR)
        if b <= a: continue
        n = b - a; tt = np.arange(n) / SR
        m = (0.8 + 0.2 * np.abs(np.sin(2 * np.pi * (7 if e['text'] else 4) * tt))) * np.minimum(1, np.minimum(tt, (n / SR - tt)) / 0.06)
        mask[a:b] = np.maximum(mask[a:b], (0.6 if e['text'] else 1.0) * m)
sfx += hiss * mask * vlev * 10 ** (-35 / 20) / rms(hiss)
for e in ev['ev']:
    if e['type'] == 'pop':
        p = int(e['t0'] * SR); n = int(0.09 * SR); tt = np.arange(n) / SR
        f = 1100 * np.exp(-tt * 18) + 380
        click = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 45)
        click += 0.3 * rng.standard_normal(n) * np.exp(-tt * 120)
        sfx[p:p + n] += (click * vlev * 10 ** (-10 / 20) * 1.4).astype(np.float32)[:max(0, N - p)]
for e in ev['ev']:
    p = int(e['t0'] * SR)
    if e['type'] == 'whoosh':
        n = int(0.35 * SR); tt = np.arange(n) / SR; envw = np.sin(np.pi * tt / (n / SR)) ** 2
        w_ = smooth(rng.standard_normal(n).astype(np.float32), 6) - smooth(rng.standard_normal(n).astype(np.float32), 40)
        sfx[p:p + n] += (w_ / (rms(w_) + 1e-9) * envw * vlev * 10 ** (-20 / 20)).astype(np.float32)[:max(0, N - p)]
    if e['type'] == 'stamp':
        n = int(0.22 * SR); tt = np.arange(n) / SR
        th = np.sin(2 * np.pi * (90 * tt + 60 * (1 - np.exp(-tt * 30)) / 30)) * np.exp(-tt * 22) + 0.5 * smooth(rng.standard_normal(n), 8) * np.exp(-tt * 40)
        sfx[p:p + n] += (th / (np.abs(th).max() + 1e-9) * vlev * 10 ** (-8 / 20) * 1.6).astype(np.float32)[:max(0, N - p)]
mix = voice + music + sfx
mix = mix[:int(total * SR)]
fs = int(ev['fadeStart'] * SR); fl = len(mix) - fs
mix[fs:] *= np.linspace(1, 0, fl) ** 1.5
mix = np.clip(mix / max(1.0, np.abs(mix).max() / 0.95), -1, 1)
out = wave.open('mix.wav', 'wb'); out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((mix * 32767).astype(np.int16).tobytes()); out.close()
print('ok', len(mix) / SR, 'music rel', 20 * np.log10(rms(music[~active[:N]] + 1e-9) / vlev))
