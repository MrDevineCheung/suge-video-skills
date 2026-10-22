// Comic-style explainer helpers
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath(__dirname + '/fonts/wk.ttf', 'WK');
const W = 1080, H = 1920, FPS = 30;
const BG = '#FBF3DE', INK = '#2B2118', O = '#EF7226', RED = '#D9452B', BROWN = '#3B2412';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lin = (t, a, b) => b === a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a));
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const ei = x => x * x * x;
const back = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
// pop-in scale with overshoot
const popS = (t, t0, d = 0.36) => t < t0 ? 0 : back(lin(t, t0, t0 + d));
// bounce drop: returns 0..1 progress with small bounce
function bounce(x) { x = clamp(x); const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375; return n1 * (x -= 2.625 / d1) * x + .984375; }

const IMG = {}, HEADS = require('./heads.json');
async function loadAll() {
  const fs = require('fs');
  for (const f of fs.readdirSync(__dirname + '/assets')) if (f.endsWith('.png')) IMG[f.slice(0, -4)] = await loadImage(__dirname + '/assets/' + f);
  for (const f of fs.readdirSync(__dirname + '/map')) if (f.endsWith('.png')) IMG['map_' + f.slice(0, -4)] = await loadImage(__dirname + '/map/' + f);
}

// draw image by height; anchor (ax,ay) in [0,1] of image (default bottom-center)
function img(ctx, name, x, y, h, o = {}) {
  const im = IMG[name]; if (!im) throw new Error('no img ' + name);
  const s = o.s ?? 1; if (s <= 0.001 || (o.alpha ?? 1) <= 0.003) return;
  const w = im.width * h / im.height; const ax = o.ax ?? 0.5, ay = o.ay ?? 1;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * (o.flip ? -1 : 1) * (o.sx ?? 1), s * (o.sy ?? 1));
  if (o.grey) ctx.filter = 'grayscale(1) brightness(1.1)';
  if (o.clip) { ctx.beginPath(); ctx.rect(-w * ax + o.clip[0] * w, -h * ay, (o.clip[1] - o.clip[0]) * w, h); ctx.clip(); }
  ctx.drawImage(im, -w * ax, -h * ay, w, h);
  ctx.restore();
}
// circular head portrait
function head(ctx, name, x, y, r, o = {}) {
  const im = IMG[name]; const [cx, cy, s] = HEADS[name];
  const sc = o.s ?? 1; if (sc <= 0.001 || (o.alpha ?? 1) <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = o.bg || '#FFF8E6'; ctx.fill();
  ctx.save(); ctx.clip(); if (o.grey) ctx.filter = 'grayscale(1) brightness(1.05)';
  ctx.drawImage(im, cx - s / 2, cy - s / 2, s, s, -r * 1.08, -r * 1.08, r * 2.16, r * 2.16); ctx.restore();
  ctx.lineWidth = o.lw || 7; ctx.strokeStyle = o.ring || INK; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// text with white outline (comic style)
function text(ctx, str, x, y, size, color = BROWN, o = {}) {
  const s = o.s ?? 1; if (s <= 0.001 || (o.alpha ?? 1) <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
  ctx.font = `${size}px WK`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.outline !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = size * (o.ow ?? 0.2); ctx.strokeStyle = o.oc || '#FFFDF6'; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.restore();
}
function tw(ctx, str, size) { ctx.save(); ctx.font = `${size}px WK`; const w = ctx.measureText(str).width; ctx.restore(); return w; }
// multi-color text segments centered
function textSegs(ctx, segs, x, y, size, o = {}) {
  const total = segs.reduce((a, [s]) => a + tw(ctx, s, size), 0);
  const s = o.s ?? 1; if (s <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); let cx = -total / 2;
  for (const [str, c] of segs) { const w = tw(ctx, str, size); text(ctx, str, cx + w / 2, 0, size, c, { alpha: o.alpha }); cx += w; }
  ctx.restore();
}
// rounded rect path
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// label tag: rounded box with text
function tag(ctx, str, x, y, size, o = {}) {
  const s = o.s ?? 1; if (s <= 0.001 || (o.alpha ?? 1) <= 0.003) return;
  const w = tw(ctx, str, size) + size * 0.9, h = size * 1.45;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
  rr(ctx, -w / 2, -h / 2, w, h, h * 0.3); ctx.fillStyle = o.bg || O; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  text(ctx, str, 0, size * 0.04, size, o.fg || '#FFFDF6', { outline: false });
  ctx.restore();
}
// speech bubble
function bubble(ctx, str, x, y, size, o = {}) {
  const s = o.s ?? 1; if (s <= 0.001) return;
  const w = tw(ctx, str, size) + size * 1.2, h = size * 1.7; const tail = o.tail || [-w * 0.25, h * 0.9];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tail[0] * 0.35 - 22, h * 0.36); ctx.lineTo(tail[0], tail[1]); ctx.lineTo(tail[0] * 0.35 + 22, h * 0.4); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tail[0] * 0.35 - 22, h * 0.36 + 4); ctx.lineTo(tail[0], tail[1]); ctx.lineTo(tail[0] * 0.35 + 22, h * 0.4 + 2); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 3, h / 2 - 3, 0, 0, Math.PI * 2); ctx.fill();
  text(ctx, str, 0, 2, size, o.color || BROWN, { outline: false });
  ctx.restore();
}
// stamp (slams in)
function stamp(ctx, str, x, y, size, t, t0, o = {}) {
  if (t < t0) return; const k = lin(t, t0, t0 + 0.16); const s = lerp(2.6, 1, ei(k)) * (o.s ?? 1); const a = lerp(0, 1, k) * (o.alpha ?? 1);
  const w = tw(ctx, str, size) + size * 0.7, h = size * 1.35;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(o.rot ?? -0.18); ctx.scale(s, s);
  rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fillStyle = 'rgba(255,250,240,0.55)'; ctx.fill();
  ctx.lineWidth = size * 0.1; ctx.strokeStyle = o.color || RED; ctx.stroke();
  rr(ctx, -w / 2 + size * 0.12, -h / 2 + size * 0.12, w - size * 0.24, h - size * 0.24, 10); ctx.lineWidth = size * 0.035; ctx.stroke();
  ctx.font = `${size}px WK`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.color || RED; ctx.fillText(str, 0, size * 0.04);
  ctx.restore();
}
// rotating sunburst
function burst(ctx, x, y, R, t, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.003) return; const n = o.n || 18;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(t * (o.spin ?? 0.15));
  ctx.fillStyle = o.color || 'rgba(239,114,38,0.16)';
  for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * Math.cos(a0), R * Math.sin(a0)); ctx.lineTo(R * Math.cos(a1), R * Math.sin(a1)); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// ---------- hand-drawn strokes ----------
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function wob(s, seed) { return 0.6 * Math.sin(s / 41 + seed * 3.1) + 0.3 * Math.sin(s / 13 + seed * 7.7) + 0.15 * Math.sin(s / 5.7 + seed); }
function resample(pts, step = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(d / step)); for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); }
  return out;
}
function handPath(pts, amp = 2, seed = 1) {
  const r = resample(pts); let s = 0; const out = [];
  for (let i = 0; i < r.length; i++) {
    if (i) s += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    const a = r[Math.max(0, i - 1)], b = r[Math.min(r.length - 1, i + 1)]; let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1;
    const off = wob(s, seed) * amp; out.push([r[i][0] + nx / l * off, r[i][1] + ny / l * off, s]);
  }
  return out;
}
function bez(p0, c, p1, n = 50) { const p = []; for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; p.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); } return p; }
// curved arrow points between p0 and p1 with bend (fraction of length, + = left side)
function arrowPts(p0, p1, bend = 0.2, m0 = 0, m1 = 0) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy); const ux = dx / L, uy = dy / L;
  const a = [p0[0] + ux * m0, p0[1] + uy * m0], b = [p1[0] - ux * m1, p1[1] - uy * m1];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const c = [mx + uy * bend * L, my - ux * bend * L];
  return bez(a, c, b);
}
const PEN = { req: null };
// draw a path progressively. prog 0..1. Returns head point.
function stroke(ctx, path, prog, o = {}) {
  if (prog <= 0) return null;
  const hp = path._hp || (path._hp = handPath(path, o.amp ?? 2, o.seed ?? 1)); const total = hp[hp.length - 1][2];
  const L = total * clamp(prog);
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.color || INK; ctx.lineWidth = o.w || 9; if (o.dash) ctx.setLineDash(o.dash);
  if (o.outline) { // white under-stroke for readability
    ctx.save(); ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = (o.w || 9) + 8; ctx.beginPath(); let st = false;
    for (const p of hp) { if (p[2] > L) break; if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]); } ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); let last = hp[0], prev = hp[0]; ctx.moveTo(hp[0][0], hp[0][1]);
  for (const p of hp) { if (p[2] > L) break; ctx.lineTo(p[0], p[1]); prev = last; last = p; }
  ctx.stroke(); ctx.setLineDash([]);
  if (o.head && prog >= 0.999) { // arrow head aligned with the last ~30px tangent
    let k = hp.length - 1; const tip = hp[k]; while (k > 0 && tip[2] - hp[k][2] < 34) k--; const from = hp[k];
    const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]); const hs = o.hs || 34;
    const pts = [[tip[0] - hs * Math.cos(ang - 0.5), tip[1] - hs * Math.sin(ang - 0.5)], [tip[0], tip[1]], [tip[0] - hs * Math.cos(ang + 0.5), tip[1] - hs * Math.sin(ang + 0.5)]];
    if (o.outline) { ctx.strokeStyle = '#FFFDF6'; ctx.lineWidth = (o.w || 9) + 8; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.stroke(); }
    ctx.strokeStyle = o.color || INK; ctx.lineWidth = o.w || 9; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.stroke();
  }
  ctx.restore();
  if (prog < 1 && o.pen !== false) { const m = ctx.getTransform(); PEN.req = { x: m.a * last[0] + m.c * last[1] + m.e, y: m.b * last[0] + m.d * last[1] + m.f, color: o.color || INK }; }
  return last;
}
// stroke progress between t0..t1
const sp = (t, t0, d) => lin(t, t0, t0 + d);

function drawPen(ctx, x, y, cap, down, rot = -52) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
  ctx.translate(down ? 0 : 6, 0); ctx.fillStyle = '#141210';
  ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(26, -9); ctx.lineTo(26, 9); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 0, 4, 0, Math.PI * 2); ctx.fill();
  rr(ctx, 24, -14, 26, 28, 5); ctx.fill(); rr(ctx, 46, -19, 190, 38, 12); ctx.fill();
  ctx.fillStyle = cap; rr(ctx, 226, -21, 66, 42, 14); ctx.fill();
  ctx.save(); ctx.font = '21px WK'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(251,251,248,0.78)'; ctx.fillText('苏格拉没有底', 138, 1);
  ctx.fillStyle = 'rgba(251,251,248,0.35)'; ctx.fillRect(62, -13, 3, 26); ctx.fillRect(212, -13, 3, 26); ctx.restore();
  ctx.fillStyle = cap; rr(ctx, 236, 15, 46, 9, 4); ctx.fill();
  ctx.restore();
}

module.exports = { createCanvas, loadImage, W, H, FPS, BG, INK, O, RED, BROWN, clamp, lin, eio, eo, ei, back, lerp, popS, bounce, IMG, HEADS, loadAll, img, head, text, textSegs, tw, rr, tag, bubble, stamp, burst, stroke, arrowPts, bez, sp, PEN, drawPen, hash };
