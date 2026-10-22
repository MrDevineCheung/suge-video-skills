import json, re, difflib
P = re.compile(r'[，。：？！；、“”‘’（）《》\s,.:?!;"\'—…·\-]')
lines = [l.strip() for l in open('script_paras.txt') if l.strip()]
paras = []
for l in lines:
    if l.startswith('#'):
        if l.startswith('#开头'): paras.append(('H', '我们缺的，真的是数据吗？'))
        else: paras.append(('C', l[1:]))
        continue
    paras.append(('P', l))
full = ''.join(p for k, p in paras if k != 'C')
# whisper chars with times
W = json.load(open('whisper.json'))
wc = []
for s in W:
    for w in s['words']:
        t = re.sub(P, '', w['w']); t = t.replace('100', '一百').replace('2022', '二零二二').replace('20', '二十').replace('10', '十').replace('6', '六')
        n = len(t)
        for i, c in enumerate(t): wc.append((c, w['s'] + (w['e'] - w['s']) * i / max(n, 1), w['s'] + (w['e'] - w['s']) * (i + 1) / max(n, 1)))
sc = [(i, c) for i, c in enumerate(full) if not P.match(c)]
norm = lambda c: {'1':'一','0':'零','2':'二'}.get(c, c)
sm = difflib.SequenceMatcher(None, [norm(c) for _, c in sc], [c for c, _, _ in wc], autojunk=False)
ts = [None] * len(sc); te = [None] * len(sc)
for a, b, n in sm.get_matching_blocks():
    for k in range(n): ts[a + k] = wc[b + k][1]; te[a + k] = wc[b + k][2]
# interpolate gaps
known = [k for k in range(len(sc)) if ts[k] is not None]
for k in range(len(sc)):
    if ts[k] is None:
        lo = max([j for j in known if j < k], default=None); hi = min([j for j in known if j > k], default=None)
        if lo is None: ts[k] = te[k] = ts[hi]
        elif hi is None: ts[k] = te[k] = te[lo]
        else:
            f = (k - lo) / (hi - lo); ts[k] = te[lo] + (ts[hi] - te[lo]) * f; te[k] = ts[k]
print('matched', len(known), '/', len(sc))
# per full-index time
T = [None] * len(full); E = [None] * len(full)
for k, (i, c) in enumerate(sc): T[i] = ts[k]; E[i] = te[k]
for i in range(len(full)):
    if T[i] is None: T[i] = T[i - 1] if i else 0; E[i] = E[i - 1] if i else 0
# also attach chapter markers by paragraph offsets
off = 0; chap = []
for k, p in paras:
    if k == 'C': chap.append({'title': p, 'at': off}); continue
    off += len(p)
json.dump({'text': full, 'T': T, 'E': E, 'chapters': chap}, open('chars.json', 'w'), ensure_ascii=False)
for c in chap: print(c['title'], round(T[c['at']], 2))
