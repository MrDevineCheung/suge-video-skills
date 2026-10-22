#!/usr/bin/env python3
"""角色精灵抠图：generate_image 时让背景是纯色（推荐 #00ff00 或纯白），这里按背景色抠成透明并裁边。
用法: python3 cutout.py raw.png out.png [--bg auto|#00ff00] [--tol 60] [--pixel 0]
--pixel N：可选，先缩到高 N 像素再最近邻放大回去，让 AI 图更"像素"。
"""
import argparse, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('--bg', default='auto'); ap.add_argument('--tol', type=float, default=60); ap.add_argument('--pixel', type=int, default=0)
a = ap.parse_args()
im = Image.open(a.inp).convert('RGBA')
if a.pixel:
    w, h = im.size; k = a.pixel / h
    im = im.resize((max(1, int(w * k)), a.pixel), Image.NEAREST).resize((w, h), Image.NEAREST)
x = np.array(im).astype(float)
if a.bg == 'auto':
    c = np.concatenate([x[0], x[-1], x[:, 0], x[:, -1]])[:, :3]; bg = np.median(c, 0)
else:
    bg = np.array([int(a.bg[i:i + 2], 16) for i in (1, 3, 5)], float)
d = np.sqrt(((x[..., :3] - bg) ** 2).sum(-1))
# 只抠和边缘连通的背景（洪泛），避免把角色身上同色的地方抠掉
from scipy import ndimage
mask = d < a.tol
lab, _ = ndimage.label(mask)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bgm = np.isin(lab, list(edge))
x[..., 3] = np.where(bgm, 0, 255)
ys, xs = np.where(~bgm)
out = Image.fromarray(x.astype(np.uint8))
out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).save(a.out)
print(a.out, out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).size)
