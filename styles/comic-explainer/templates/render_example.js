// 国家数据集团 — 完整版（彩色漫画，用户原声，逐字对齐）
const fs = require('fs'); const { spawn } = require('child_process');
const L = require('./lib');
const { W, H, FPS, BG, INK, O, RED, BROWN, clamp, lin, eio, eo, ei, back, lerp, popS, bounce, img, text, textSegs, tag, bubble, stamp, burst, stroke, arrowPts, sp, PEN, drawPen, rr, tw } = L;

const LEAD = 0; // 用户录音原样，从 0 开始
const CJ = JSON.parse(fs.readFileSync(__dirname + '/full/chars.json'));
const FULL = CJ.text, CT = CJ.T, CE = CJ.E;
const PUNCT = /[，。：？；！、“”"\s]/;
const AUDIO_DUR = 616.68;
// ---- keyword anchors over the whole transcript ----
let CUR = 0;
function K(kw, d = 0) { const i = FULL.indexOf(kw, CUR); if (i < 0) throw new Error('anchor not found after ' + CUR + ': ' + kw); CUR = i; return CT[i] + LEAD + d; }
function KE(kw, d = 0) { const i = FULL.indexOf(kw, CUR); if (i < 0) throw new Error('anchorE ' + kw); return CE[i + kw.length - 1] + LEAD + d; }
// ---- opening sentences (render4 scene code) ----
const TXT = fs.readFileSync(__dirname + '/script.txt', 'utf8').trim().split('\n');
const SST = []; { let c = 0; for (const l of TXT) { const q = l.replace('一百', '100'); const i = FULL.indexOf(q, c); if (i < 0) throw new Error('sentence ' + l); SST.push([i, q]); c = i + q.length; } }
const lastCh = (i, q) => { let j = i + q.length - 1; while (j > i && PUNCT.test(FULL[j])) j--; return j; };
const s0 = i => CT[SST[i - 1][0]] + LEAD, s1 = i => CE[lastCh(...SST[i - 1])] + LEAD;
function A(i, kw, d = 0) { const [st, q] = SST[i - 1]; const k2 = kw.replace('一百', '100'); const j = q.indexOf(k2); if (j < 0) throw new Error('A ' + i + kw); return CT[st + j] + LEAD + d; }
function AI(i, idx, d = 0) { return CT[SST[i - 1][0] + idx] + LEAD + d; }
const NS = TXT.length;
const OPEN_END = CT[FULL.indexOf('经济学关于数据')] + LEAD - 0.15;
const NARR_END = AUDIO_DUR - 0.3;
const TOTAL = AUDIO_DUR + 2.2;
const EV = []; const ev = (type, t0, t1) => EV.push({ type, t0, t1: t1 ?? t0 + 0.3, text: false });
const SHAKES = [];
function shakeAt(t) { let x = 0, y = 0; for (const [t0, a] of SHAKES) { if (t < t0 || t > t0 + 0.45) continue; const k = t - t0; const d = a * Math.exp(-k * 9); x += d * Math.sin(k * 90); y += d * Math.cos(k * 77); } return [x, y]; }
const hsh = L.hash;

let paper;
function buildPaper() {
  paper = L.createCanvas(W, H); const x = paper.getContext('2d');
  x.fillStyle = BG; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H * 0.45, 1300); g.addColorStop(0, 'rgba(255,255,250,0.6)'); g.addColorStop(1, 'rgba(200,170,120,0.18)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(120,90,50,${0.03 + 0.04 * hsh(i + 0.25)})`; x.fillRect(hsh(i) * W, hsh(i + 0.5) * H, 2, 2); }
}

// ---------- subtitles from the transcript ----------
const SUBS = []; let CHIP = null;
{ const re = /[^，。：？；！]+[，。：？；！]?/g; let m; while ((m = re.exec(FULL))) { const str = m[0]; let a = m.index; while (a < m.index + str.length && PUNCT.test(FULL[a])) a++; if (a >= m.index + str.length) continue; let b = m.index + str.length - 1; while (b > a && PUNCT.test(FULL[b])) b--;
  SUBS.push({ st: CT[a] + LEAD, en: CE[b] + LEAD, str: str.replace(/[，。：；“”]/g, '').replace(/[“”]/g, '') }); } }
function subLines(str) { if (str.length <= 16) return [str]; const m = str.length / 2; let best = -1, bd = 99; for (let i = 3; i < str.length - 3; i++) if ('、，和与'.includes(str[i]) && Math.abs(i + 1 - m) < bd && Math.abs(i + 1 - m) <= 5) { bd = Math.abs(i + 1 - m); best = i + 1; } const k = best > 0 ? best : Math.ceil(m); return [str.slice(0, k), str.slice(k)]; }
function hud(ctx, t) {
  ctx.save(); rr(ctx, 60, 66, 960, 190, 36); ctx.fillStyle = 'rgba(255,253,246,0.92)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  textSegs(ctx, [['数据', O], ['已经这么多，', BROWN]], 540, 122, 60);
  textSegs(ctx, [['为什么还要成立一家', BROWN], ['央企', O], ['？', BROWN]], 540, 200, 60);
  if (CHIP) CHIP(ctx, t);
  let cur = null; for (let k = 0; k < SUBS.length; k++) { const s = SUBS[k]; if (t >= s.st - 0.08) { const nx = SUBS[k + 1]; const end = nx ? Math.min(nx.st - 0.08, s.en + 1.2) : s.en + 1.5; if (t < end) cur = s; } }
  if (cur) { const ls = subLines(cur.str); ls.forEach((l, i) => text(ctx, l, 540, 1580 + (i - (ls.length - 1) / 2) * 62, 50, BROWN, { ow: 0.22 })); }
  text(ctx, '@苏格拉没有底', 540, 1770, 38, '#9A8C7A', { outline: false });
}

// ---------- helpers ----------
function card(ctx, x, y, w, h, o = {}) { ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); const s = o.s ?? 1; ctx.scale(s, s); ctx.globalAlpha *= (o.alpha ?? 1);
  rr(ctx, -w / 2 + 10, -h / 2 + 12, w, h, 26); ctx.fillStyle = 'rgba(60,40,20,0.18)'; ctx.fill();
  rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = o.bg || '#FFFDF6'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); if (o.fn) o.fn(ctx); ctx.restore(); }
function check(ctx, x, y, s, col = '#3E9B5B', prog = 1) { stroke(ctx, [[x - 40 * s, y], [x - 10 * s, y + 32 * s], [x + 48 * s, y - 38 * s]], prog, { color: col, w: 16 * s, pen: false, amp: 0.5 }); }
function cross(ctx, x, y, s, prog = 1, col = RED) { stroke(ctx, [[x - 45 * s, y - 45 * s], [x + 45 * s, y + 45 * s]], clamp(prog * 2), { color: col, w: 18 * s, pen: false, amp: 1 }); stroke(ctx, [[x + 45 * s, y - 45 * s], [x - 45 * s, y + 45 * s]], clamp(prog * 2 - 1), { color: col, w: 18 * s, pen: false, amp: 1 }); }
function lockIcon(ctx, x, y, s, col = INK) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 12; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -30, 32, Math.PI, 0); ctx.lineTo(32, 0); ctx.moveTo(-32, 0); ctx.lineTo(-32, -30); ctx.stroke(); rr(ctx, -50, -5, 100, 78, 14); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = '#F4D27A'; ctx.beginPath(); ctx.arc(0, 26, 11, 0, 7); ctx.fill(); ctx.fillRect(-4, 28, 8, 22); ctx.restore(); }
function copyIcon(ctx, x, y, s, col = O) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 9; ctx.strokeStyle = INK; rr(ctx, -46, -46, 62, 72, 10); ctx.fillStyle = '#FFF3E6'; ctx.fill(); ctx.stroke(); rr(ctx, -16, -20, 62, 72, 10); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.restore(); }
function pin(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-34, -40, -34, -78, 0, -78); ctx.bezierCurveTo(34, -78, 34, -40, 0, 0); ctx.fillStyle = RED; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -52, 11, 0, 7); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.restore(); }

// HQ sign geometry (fractions of cropped image)
const HQ = { cx: 0.455, cy: 0.63, w: 0.62 };
const MACH = { cx: 0.66, cy: 0.725, w: 0.46 };
const WM = '苏格拉没有底';

// wooden signboard with watermark line
function sign(ctx, x, y, big, o = {}) {
  const s = o.s ?? 1; if (s <= 0.001) return; const size = o.size || 46;
  const w = Math.max(tw(ctx, big, size), tw(ctx, WM, 26)) + 70, h = size + 74;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  ctx.fillStyle = '#7A4E2A'; ctx.lineWidth = 5; ctx.strokeStyle = INK;
  if (o.posts !== false) for (const px of [-w * 0.3, w * 0.3]) { ctx.fillRect(px - 8, h / 2 - 4, 16, 60); ctx.strokeRect(px - 8, h / 2 - 4, 16, 60); }
  rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.fillStyle = o.bg || '#C98B4E'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  rr(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 10); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(60,30,10,0.5)'; ctx.stroke();
  text(ctx, WM, 0, -h / 2 + 30, 26, '#FFF3DC', { outline: false });
  text(ctx, big, 0, 16, size, '#FFFDF6', { oc: '#5A3418', ow: 0.18 });
  ctx.restore();
}
function phone(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(ctx, -80, -140, 160, 280, 26); ctx.fillStyle = '#2B2118'; ctx.fill(); rr(ctx, -68, -118, 136, 230, 12); ctx.fillStyle = '#E8F4F8'; ctx.fill();
  ctx.fillStyle = O; ctx.fillRect(-68, -118, 136, 40); text(ctx, WM, 0, -97, 17, '#FFF', { outline: false });
  const cols = ['#EF7226', '#4BA3C7', '#7BC47F', '#F4C542', '#D9594C', '#9B7BD4']; for (let k = 0; k < 6; k++) { rr(ctx, -52 + (k % 3) * 38, -60 + Math.floor(k / 3) * 44, 28, 28, 7); ctx.fillStyle = cols[k]; ctx.fill(); }
  ctx.restore(); }
function exchange(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 6; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(-130, -60); ctx.lineTo(0, -130); ctx.lineTo(130, -60); ctx.closePath(); ctx.fillStyle = '#E9DCC3'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F6EEDD'; ctx.fillRect(-120, -60, 240, 170); ctx.strokeRect(-120, -60, 240, 170);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = '#D8C8A8'; ctx.fillRect(-100 + k * 58, -20, 24, 130); ctx.strokeRect(-100 + k * 58, -20, 24, 130); }
  ctx.fillStyle = '#C98B4E'; rr(ctx, -110, -56, 220, 34, 6); ctx.fill(); ctx.stroke(); text(ctx, WM + '交易所', 0, -38, 22, '#FFF', { outline: false });
  ctx.fillStyle = '#B9A584'; ctx.fillRect(-140, 108, 280, 16); ctx.strokeRect(-140, 108, 280, 16); ctx.restore(); }
function miniPile(ctx, x, y, s) { const rows = [4, 3, 2, 1]; rows.forEach((n, r) => { for (let c = 0; c < n; c++) img(ctx, 'c_cube', x + (c - (n - 1) / 2) * 58 * s, y - r * 46 * s, 60 * s, { rot: (hsh(r * 7 + c) - 0.5) * 0.4 }); }); }
function docIcon(c, col) { rr(c, -36, -46, 72, 92, 10); c.fillStyle = '#FFF'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); for (let k = 0; k < 4; k++) { c.fillStyle = k ? '#CBBFA8' : col; c.fillRect(-24, -30 + k * 18, k ? 44 : 30, 8); } }
function chartIcon(c, col) { c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.moveTo(-40, -40); c.lineTo(-40, 40); c.lineTo(44, 40); c.stroke(); c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.moveTo(-32, 22); c.lineTo(-12, 0); c.lineTo(8, 12); c.lineTo(36, -30); c.stroke(); }
function wrenchIcon(c, col) { c.save(); c.rotate(-0.8); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 5; rr(c, -9, -10, 18, 62, 8); c.fill(); c.stroke(); c.beginPath(); c.arc(0, -26, 24, 0, 7); c.fill(); c.stroke(); c.fillStyle = BG; c.fillRect(-7, -52, 14, 22); c.restore(); }
function dataCard(ctx, x, y, label, kind, col, o = {}) { const s = o.s ?? 1; if (s <= 0.001) return;
  card(ctx, x, y, 250, 170, { s, rot: o.rot || 0, alpha: o.alpha, bg: '#FFFDF6', fn: c => { c.save(); c.translate(-72, 0); c.scale(0.9, 0.9); (kind === 'doc' ? docIcon : kind === 'chart' ? chartIcon : wrenchIcon)(c, col); c.restore(); text(c, label.slice(0, 2), 45, -26, 42, BROWN, { outline: false }); text(c, label.slice(2), 45, 28, 42, col, { outline: false }); if (o.lock) lockIcon(c, 100, -70, 0.5 * o.lock, RED); } }); }
function thought(ctx, str, x, y, size, o = {}) { const s = o.s ?? 1; if (s <= 0.001) return; bubble(ctx, str, x, y, size, { s, tail: o.tail || [0, 90] }); }


// ================= generic stage DSL =================
const SC = []; const scene = (from, to, fn, o = {}) => SC.push({ from, to, fn, ...o });
function U(kw) { const i = FULL.indexOf(kw); if (i < 0) throw new Error('U ' + kw); if (FULL.indexOf(kw, i + 1) >= 0) throw new Error('not unique ' + kw); return i; }
const UT = kw => CT[U(kw)] + LEAD;
const TR = 0.5;
const G = '#3E9B5B', BLUE = '#2E8BC0', GREY = '#9A8C7A';
// el(kind, tin, tout, props)
const el = (kind, tin, tout, p = {}) => ({ kind, tin, tout, ...p });
function elS(e, t) { if (t < e.tin - 0.001) return [0, 0]; const s = e.noPop ? 1 : popS(t, e.tin, e.dur || 0.38); const a = e.tout ? 1 - lin(t, e.tout - 0.3, e.tout) : 1; return [s, a]; }
function elXY(e, t) { let x = e.x, y = e.y, h = e.h, sc = 1; if (e.mv) { const k = eio(lin(t, e.mv.t, e.mv.t + (e.mv.d || 0.6))); x = lerp(e.x, e.mv.x ?? e.x, k); y = lerp(e.y, e.mv.y ?? e.y, k); if (h) h = lerp(e.h, e.mv.h ?? e.h, k); sc = lerp(1, e.mv.s ?? 1, k); } return { x, y, h, sc }; }
function drawEl(ctx, e, t) {
  const [s0_, a] = elS(e, t); if (s0_ <= 0.001 || a <= 0.003) return; const { x, y, h, sc } = elXY(e, t); const s = s0_ * sc;
  ctx.save(); ctx.globalAlpha *= a;
  switch (e.kind) {
    case 'img': { const wob = e.wob ? Math.sin(t * 3 + x) * 0.02 : 0; img(ctx, e.n, x, y, h, { s, rot: (e.rot || 0) + wob }); if (e.label) tag(ctx, e.label, x, e.ly ?? (y + 10), e.ls || 36, { s: popS(t, e.lt ?? e.tin + 0.15), bg: e.lbg || INK }); break; }
    case 'tag': tag(ctx, e.str, x, y, e.size || 44, { s, bg: e.bg || INK, rot: e.rot || 0 }); if (e.strike) stroke(ctx, [[x - e.sw / 2, y + 4], [x + e.sw / 2, y - 4]], lin(t, e.strike, e.strike + 0.3), { color: RED, w: 10, pen: false }); break;
    case 'text': text(ctx, e.str, x, y, e.size || 60, e.col || BROWN, { s, rot: e.rot || 0 }); if (e.strike) stroke(ctx, [[x - e.sw / 2, y + 4], [x + e.sw / 2, y - 4]], lin(t, e.strike, e.strike + 0.3), { color: RED, w: 10, pen: false }); break;
    case 'segs': ctx.translate(x, y); ctx.scale(s, s); textSegs(ctx, e.segs, 0, 0, e.size || 60); break;
    case 'stamp': stamp(ctx, e.str, x, y, e.size || 60, t, e.tin, { color: e.col || O, rot: e.rot ?? -0.06 }); break;
    case 'card': card(ctx, x, y, e.w, e.ht, { s, rot: e.rot || 0, bg: e.bg, fn: c => { if (e.icon) { c.save(); c.translate(e.ix ?? -e.w / 2 + 75, e.iy ?? 0); c.scale(e.is ?? 1, e.is ?? 1); e.icon(c, t); c.restore(); } (e.lines || []).forEach(([str, size, col, dx, dy]) => text(c, str, dx ?? 0, dy ?? 0, size, col || BROWN, { outline: false })); if (e.fn) e.fn(c, t); } }); break;
    case 'sign': sign(ctx, x, y, e.big, { s, size: e.size || 40, posts: e.posts ?? false }); break;
    case 'check': check(ctx, x, y, e.sc || 1, e.col || G, lin(t, e.tin, e.tin + 0.35)); break;
    case 'cross': cross(ctx, x, y, e.sc || 1, lin(t, e.tin, e.tin + 0.4)); break;
    case 'arrow': stroke(ctx, arrowPts(e.a, e.b, e.bend ?? 0.2), sp(t, e.tin, e.d || 0.5), { color: e.col || O, w: e.w || 10, head: true, pen: false, dash: e.dash }); break;
    case 'line': stroke(ctx, [e.a, e.b], sp(t, e.tin, e.d || 0.5), { color: e.col || O, w: e.w || 7, pen: false, dash: e.dash || [18, 12], amp: 1 }); break;
    case 'bubble': bubble(ctx, e.str, x, y, e.size || 40, { s, tail: e.tail || [0, 90] }); break;
    case 'fn': ctx.translate(x, y); ctx.scale(s, s); e.draw(ctx, t, s); break;
  }
  ctx.restore();
}
function evFor(e) { if (e.silent) return; if (e.kind === 'stamp') { ev('stamp', e.tin); if (e.shake) SHAKES.push([e.tin, e.shake]); } else if (e.kind === 'arrow' || e.kind === 'line' || e.kind === 'check' || e.kind === 'cross') ev('draw', e.tin, e.tin + 0.4); else ev('pop', e.tin); }
// beat: a stage between two times with a push transition in & out
function beat(t0, t1, els, o = {}) {
  els.forEach(evFor); ev('whoosh', t0 - 0.05);
  const tr = o.tr || 'push';
  scene(t0, t1 + TR, (ctx, t) => {
    const ki = o.noIn ? 1 : eio(lin(t, t0, t0 + TR)), ko = eio(lin(t, t1, t1 + TR));
    ctx.save();
    if (tr === 'push') ctx.translate((1 - ki) * W - ko * W, 0);
    else if (tr === 'up') ctx.translate(-ko * W, (1 - ki) * H);
    else if (tr === 'zoom') { const s = lerp(0.6, 1, ki); ctx.globalAlpha *= ki; ctx.translate(540, 900); ctx.scale(s, s); ctx.translate(-540, -900); ctx.translate(-ko * W, 0); }
    if (o.bg) o.bg(ctx, t);
    for (const e of els) drawEl(ctx, e, t);
    ctx.restore();
  });
}
// chapter banner + chip
const CHAPS = [];
function chapter(n, l1, l2, chip, tch) {
  CHAPS.push({ n, chip, t: tch + 1.5 }); ev('whoosh', tch - 0.2); ev('stamp', tch + 0.25);
  scene(tch - 0.2, tch + 1.9, (ctx, t) => {
    const a = lin(t, tch - 0.2, tch + 0.1), sh = eio(lin(t, tch + 1.2, tch + 1.8));
    ctx.save(); ctx.globalAlpha *= a * (1 - sh);
    ctx.fillStyle = 'rgba(251,248,240,0.88)'; ctx.fillRect(0, 270, W, 1260);
    burst(ctx, 540, 900, 1100, t, { color: 'rgba(239,114,38,0.16)', spin: 0.3 });
    ctx.translate(540, lerp(880, 316, sh)); ctx.scale(lerp(1, 0.35, sh), lerp(1, 0.35, sh));
    const s1 = popS(t, tch - 0.1); ctx.save(); ctx.scale(s1, s1); ctx.beginPath(); ctx.arc(0, -200, 95, 0, 7); ctx.fillStyle = O; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, n, 0, -194, 100, '#FFF', { outline: false }); ctx.restore();
    stamp(ctx, l1, 0, 0, 68, t, tch + 0.25, { color: INK, rot: 0 });
    text(ctx, l2, 0, 130, 70, O, { s: popS(t, tch + 0.5) });
    ctx.restore();
  }, { top: true });
}
function chipDraw(ctx, t) { let c = null; for (const k of CHAPS) if (t >= k.t) c = k; if (!c) return; const s = popS(t, c.t, 0.35); tag(ctx, c.n + ' · ' + c.chip, 540, 316, 34, { s, bg: O }); }

// ================= icons =================
function bookIcon(c) { c.lineWidth = 5; c.strokeStyle = INK; rr(c, -50, -38, 100, 76, 8); c.fillStyle = '#4BA3C7'; c.fill(); c.stroke(); c.fillStyle = '#FFF'; c.fillRect(-40, 22, 80, 10); c.beginPath(); c.moveTo(0, -38); c.lineTo(0, 22); c.stroke(); }
function keyIcon(c, col) { c.save(); c.lineWidth = 6; c.strokeStyle = INK; c.fillStyle = col; c.beginPath(); c.arc(-34, 0, 28, 0, 7); c.fill(); c.stroke(); c.fillStyle = BG; c.beginPath(); c.arc(-34, 0, 10, 0, 7); c.fill(); c.stroke(); c.fillStyle = col; rr(c, -8, -10, 80, 20, 6); c.fill(); c.stroke(); c.fillRect(48, 8, 10, 18); c.strokeRect(48, 8, 10, 18); c.fillRect(30, 8, 10, 14); c.strokeRect(30, 8, 10, 14); c.restore(); }
function magIcon(c) { c.lineWidth = 9; c.strokeStyle = INK; c.beginPath(); c.arc(-8, -8, 30, 0, 7); c.fillStyle = '#D6EEF7'; c.fill(); c.stroke(); c.lineWidth = 14; c.beginPath(); c.moveTo(14, 14); c.lineTo(42, 42); c.stroke(); }
function chkIcon(c) { c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fillStyle = G; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 10; c.strokeStyle = '#FFF'; c.beginPath(); c.moveTo(-18, 0); c.lineTo(-4, 15); c.lineTo(20, -14); c.stroke(); }
function netIcon(c) { const P = [[-40, -25], [35, -35], [0, 10], [-35, 35], [40, 30]]; c.lineWidth = 5; c.strokeStyle = INK; [[0, 2], [1, 2], [2, 3], [2, 4], [0, 1], [3, 4]].forEach(([a, b]) => { c.beginPath(); c.moveTo(...P[a]); c.lineTo(...P[b]); c.stroke(); }); P.forEach(p => { c.beginPath(); c.arc(p[0], p[1], 11, 0, 7); c.fillStyle = BLUE; c.fill(); c.stroke(); }); }
function chipIcon(c) { c.lineWidth = 5; c.strokeStyle = INK; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 14, -48); c.lineTo(k * 14, 48); c.moveTo(-48, k * 14); c.lineTo(48, k * 14); c.stroke(); } rr(c, -36, -36, 72, 72, 8); c.fillStyle = '#3A3A3A'; c.fill(); c.stroke(); rr(c, -18, -18, 36, 36, 4); c.fillStyle = O; c.fill(); }
function boltIcon(c) { c.beginPath(); c.moveTo(8, -50); c.lineTo(-28, 6); c.lineTo(-2, 6); c.lineTo(-10, 50); c.lineTo(28, -8); c.lineTo(2, -8); c.closePath(); c.fillStyle = '#F4C542'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }
function fanIcon(c, t) { c.save(); c.rotate((t || 0) * 6); c.lineWidth = 5; c.strokeStyle = INK; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.ellipse(0, -22, 12, 22, 0.3, 0, 7); c.fillStyle = '#9FD3E6'; c.fill(); c.stroke(); } c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fillStyle = INK; c.fill(); c.restore(); }
function hourIcon(c, t) { c.lineWidth = 6; c.strokeStyle = INK; c.fillStyle = '#C98B4E'; c.fillRect(-40, -56, 80, 12); c.fillRect(-40, 44, 80, 12); c.beginPath(); c.moveTo(-30, -44); c.lineTo(30, -44); c.lineTo(4, 0); c.lineTo(30, 44); c.lineTo(-30, 44); c.lineTo(-4, 0); c.closePath(); c.fillStyle = '#EAF6FA'; c.fill(); c.stroke(); c.fillStyle = '#F4C542'; c.beginPath(); c.moveTo(-20, 44); c.lineTo(20, 44); c.lineTo(0, 22); c.fill(); }
function calcIcon(c) { rr(c, -42, -56, 84, 112, 12); c.fillStyle = '#5A6B7A'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#CFE8C9'; c.fillRect(-30, -44, 60, 26); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { rr(c, -30 + j * 22, -8 + i * 20, 16, 14, 3); c.fillStyle = (i + j) % 3 ? '#FFF' : O; c.fill(); } }
function mouseIcon(c) { c.lineWidth = 6; c.strokeStyle = INK; rr(c, -36, -52, 72, 104, 36); c.fillStyle = '#F2F2F2'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-36, -10); c.lineTo(36, -10); c.moveTo(0, -52); c.lineTo(0, -10); c.stroke(); c.fillStyle = O; rr(c, -32, -48, 30, 36, 14); c.fill(); }
function cloudIcon(c) { c.lineWidth = 7; c.strokeStyle = INK; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-60, 10, 45, 0, 7); c.arc(0, -20, 60, 0, 7); c.arc(65, 10, 45, 0, 7); c.fill(); c.beginPath(); c.arc(-60, 10, 45, Math.PI * 0.5, Math.PI * 1.6); c.arc(0, -20, 60, Math.PI * 1.15, Math.PI * 1.9); c.arc(65, 10, 45, Math.PI * 1.45, Math.PI * 0.5); c.closePath(); c.stroke(); }
function shieldIcon(c, col) { c.beginPath(); c.moveTo(0, -60); c.lineTo(50, -40); c.quadraticCurveTo(50, 30, 0, 62); c.quadraticCurveTo(-50, 30, -50, -40); c.closePath(); c.fillStyle = col || G; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 9; c.strokeStyle = '#FFF'; c.beginPath(); c.moveTo(-18, 0); c.lineTo(-4, 16); c.lineTo(22, -14); c.stroke(); }
function folderIcon(c) { c.lineWidth = 5; c.strokeStyle = INK; c.fillStyle = '#F4C542'; c.beginPath(); c.moveTo(-50, -30); c.lineTo(-15, -30); c.lineTo(-5, -20); c.lineTo(50, -20); c.lineTo(50, 36); c.lineTo(-50, 36); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#FFF'; c.fillRect(-36, -12, 60, 8); }
function dbIcon(c) { c.lineWidth = 7; c.strokeStyle = INK; c.fillStyle = '#7FB8D9'; c.beginPath(); c.ellipse(0, 70, 110, 30, 0, 0, Math.PI); c.lineTo(-110, -70); c.ellipse(0, -70, 110, 30, 0, Math.PI, 0, true); c.lineTo(110, 70); c.fill(); c.stroke(); for (const y of [-20, 30]) { c.beginPath(); c.ellipse(0, y, 110, 30, 0, 0, Math.PI); c.stroke(); } c.beginPath(); c.ellipse(0, -70, 110, 30, 0, 0, 7); c.fillStyle = '#A9D2EA'; c.fill(); c.stroke(); }
function skyline(c) { const B = [[-150, 120], [-100, 200], [-45, 150], [10, 240], [70, 170], [125, 210]]; c.lineWidth = 5; c.strokeStyle = INK; B.forEach(([x, hh], i) => { c.fillStyle = ['#8FB7D3', '#6E9CC0', '#A9C9DF', '#5C89B0', '#9CC0D8', '#7AA6C8'][i]; c.fillRect(x, 110 - hh, 50, hh); c.strokeRect(x, 110 - hh, 50, hh); c.fillStyle = '#F6E7A8'; for (let y = 120 - hh; y < 100; y += 26) { c.fillRect(x + 10, y, 10, 12); c.fillRect(x + 30, y, 10, 12); } }); }
function receipt(c) { c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(-140, -190); c.lineTo(140, -190); c.lineTo(140, 170); for (let k = 0; k < 8; k++) { c.lineTo(140 - 35 * k - 17, 190); c.lineTo(140 - 35 * (k + 1), 170); } c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); c.stroke(); text(c, '订单', 0, -140, 54, BROWN, { outline: false }); text(c, WM + '商城', 0, -82, 24, GREY, { outline: false }); for (let k = 0; k < 4; k++) { c.fillStyle = '#E3D8C4'; c.fillRect(-110, -40 + k * 40, 150, 14); c.fillStyle = '#CDBFA6'; c.fillRect(70, -40 + k * 40, 40, 14); } c.fillStyle = O; c.fillRect(-110, 130, 220, 8); }
function payCard(c) { rr(c, -90, -56, 180, 112, 14); c.fillStyle = '#4B6CB7'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#F4C542'; rr(c, -66, -26, 40, 30, 5); c.fill(); c.fillStyle = '#FFF'; c.fillRect(-66, 22, 120, 10); }
function coinSym(c) { c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fillStyle = '#F4C542'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); text(c, '¥', 0, 2, 36, '#8A5A00', { outline: false }); }
function hqDraw(ctx, x, y, h, s = 1) { img(ctx, 'c_hq', x, y, h, { s }); if (s <= 0.01) return; const im = L.IMG.c_hq, w = im.width * h / im.height; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); text(ctx, '国家数据集团', x - w / 2 + HQ.cx * w, y - h + HQ.cy * h + 3, Math.floor(HQ.w * w / 6.2), RED, { outline: false }); ctx.restore(); }
const GOV = { cx: 0.497, cy: 0.53, w: 0.44 }, HOS = { cx: 0.47, cy: 0.615, w: 0.5 };
function plaqueDraw(ctx, n, G_, x, y, h, str, col, s = 1, sub) { img(ctx, n, x, y, h, { s }); if (s <= 0.01) return; const im = L.IMG[n], w = im.width * h / im.height; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); const px = x - w / 2 + G_.cx * w, py = y - h + G_.cy * h; if (sub) { text(ctx, sub, px, py - 13, Math.floor(G_.w * w / 9), GREY, { outline: false }); text(ctx, str, px, py + 12, Math.floor(G_.w * w / (str.length + 1.5)), col, { outline: false }); } else text(ctx, str, px, py + 2, Math.floor(G_.w * w / (str.length + 1)), col, { outline: false }); ctx.restore(); }
function brick(ctx, str, x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); rr(ctx, -200, -52, 400, 104, 12); ctx.fillStyle = '#C9835A'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.strokeStyle = 'rgba(80,40,20,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-200, 0); ctx.lineTo(200, 0); ctx.moveTo(-60, -52); ctx.lineTo(-60, 0); ctx.moveTo(80, 0); ctx.lineTo(80, 52); ctx.stroke(); text(ctx, str, 0, 2, 48, '#FFFDF6', { oc: '#5A3418', ow: 0.15 }); ctx.restore(); }
function dropY(t, t0, y) { const k = lin(t, t0, t0 + 0.45); return lerp(-300, y, eo(k)) - Math.sin(lin(t, t0 + 0.45, t0 + 0.7) * Math.PI) * 18; }
function defineOpening() {
  // ===== Scene 0: 开场问句 (S1) =====
  const T0 = s0(2) - 0.35, tQ = A(1, '真的'), tD = A(1, '数据');
  ev('pop', 0.3); ev('pop', tQ); ev('stamp', tD + 0.1); ev('whoosh', T0);
  scene(0, T0 + 0.45, (ctx, t) => {
    const out = eio(lin(t, T0, T0 + 0.45)); ctx.save(); ctx.beginPath(); ctx.rect(0, 262, W, 1300); ctx.clip(); ctx.translate(0, -out * 1300);
    burst(ctx, 540, 1000, 1000, t, { color: 'rgba(239,114,38,0.12)', spin: 0.2 });
    // falling cubes pile
    for (let k = 0; k < 16; k++) { const row = k < 6 ? 0 : k < 11 ? 1 : k < 14 ? 2 : 3; const n = [6, 5, 3, 2][row]; const idx = k - [0, 6, 11, 14][row];
      const x = 540 + (idx - (n - 1) / 2) * 120, y = 1440 - row * 95; const t0 = 0.15 + k * 0.05; const f = eo(lin(t, t0, t0 + 0.35));
      if (t > t0) img(ctx, 'c_cube', x, y - (1 - f) * 900, 125, { rot: (hsh(k * 3) - 0.5) * 0.5 * f }); }
    text(ctx, '我们缺的，', 540, 560, 96, BROWN, { s: popS(t, 0.25) });
    { const s2 = popS(t, tQ - 0.15); if (s2 > 0) { ctx.save(); ctx.translate(540, 700); ctx.scale(s2, s2); textSegs(ctx, [['真的是', BROWN], ['数据', O], ['吗？', BROWN]], 0, 0, 110); ctx.restore(); } }
    const qs = popS(t, tD + 0.1); if (qs > 0) { ctx.save(); ctx.translate(900, 1020 + Math.sin(t * 6) * 12); ctx.rotate(0.15); ctx.scale(qs, qs); text(ctx, '？', 0, 0, 260, O); ctx.restore(); }
    ctx.restore();
  });
  // ===== Scene A: 新闻 (S1–S2) =====
  const tB = s0(4);
  const tHQ = A(2, '国家'), tXA = A(2, '雄安'), tList = A(2, '中央企业'), t100 = A(2, '一百家'), tXH = s0(3), tCube = A(3, '主业');
  ev('pop', T0 + 0.15); ev('whoosh', tHQ - 0.25); ev('pop', tXA); ev('pop', tList); ev('stamp', t100 + 0.2); ev('pop', tXH); ev('pop', tCube); ev('pop', tCube + 0.7); ev('whoosh', tB);
  SHAKES.push([t100 + 0.2, 10]);
  const hqX = 330, hqY = 1400, hqH = 820;
  function drawA(ctx, t) {
    burst(ctx, 330, 1000, 900, t, { alpha: 0.7, color: 'rgba(239,114,38,0.10)' });
    ctx.save(); ctx.fillStyle = 'rgba(160,130,90,0.18)'; ctx.beginPath(); ctx.ellipse(540, hqY + 6, 520, 40, 0, 0, 7); ctx.fill(); ctx.restore();
    const r = back(lin(t, tHQ - 0.3, tHQ + 0.3)); if (t > tHQ - 0.3) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hqY + 8); ctx.clip();
      const y = hqY + (1 - r) * 900; img(ctx, 'c_hq', hqX, y, hqH);
      const im = L.IMG.c_hq, w = im.width * hqH / im.height; const sx = hqX - w / 2 + HQ.cx * w, sy = y - hqH + HQ.cy * hqH;
      text(ctx, '国家数据集团', sx, sy + 4, Math.floor(HQ.w * w / 6.2), RED, { outline: false });
      ctx.restore();
    }
    { const s = popS(t, T0); if (s > 0) card(ctx, 790, 500, 300, 320, { s, rot: 0.05, fn: c => {
      rr(c, -150, -160, 300, 86, 26); c.fillStyle = RED; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); text(c, '2026 · 10月', 0, -116, 42, '#FFF', { outline: false });
      const fl = lin(t, T0 + 0.5, T0 + 0.95); const num = fl < 0.5 ? '19' : '20'; c.save(); c.translate(0, 20); c.scale(1, Math.abs(Math.cos(fl * Math.PI))); text(c, num, 0, 0, 140, BROWN, { outline: false }); c.restore();
      text(c, WM + ' 日历', 0, 128, 22, '#A8977E', { outline: false }); } }); }
    { const s = popS(t, tXA); if (s > 0) { pin(ctx, 330, 1462, 0.9 * s); tag(ctx, '河北雄安新区', 330, 1477, 44, { s, bg: INK }); } }
    { const s = popS(t, tList, 0.4); if (s > 0) card(ctx, 805, 935, 370, 340, { s, rot: -0.03, fn: c => {
      text(c, '中央企业', 0, -115, 54, BROWN, { outline: false });
      for (let k = 0; k < 3; k++) { rr(c, -140, -65 + k * 34, 280 - (k % 2) * 70, 16, 8); c.fillStyle = '#E3D8C4'; c.fill(); }
      const k = eo(lin(t, tList + 0.5, t100 + 0.1)); const n = Math.round(lerp(97, 100, k));
      text(c, String(n), -20, 100, 110, n === 100 ? O : BROWN, { outline: false }); text(c, '家', 105, 115, 52, BROWN, { outline: false });
    } }); }
    stamp(ctx, '第100家', 905, 760, 46, t, t100 + 0.2, { color: RED, rot: 0.15 });
    if (t > tXH - 0.1) {
      tag(ctx, '据新华社', 800, 1180, 36, { s: popS(t, tXH), bg: INK });
      const k = lin(t, tCube - 0.1, tCube + 0.6); if (t > tCube - 0.1) {
        const x = lerp(hqX + 10, 800, eo(k)), y0 = lerp(hqY - 60, 1440, k) - Math.sin(k * Math.PI) * 330;
        const wav = Math.sin((t - tCube) * 9) * 0.06 * lin(t, tCube + 0.6, tCube + 0.8);
        img(ctx, 'c_cube', x, y0, lerp(90, 200, eo(k)), { rot: (1 - k) * -0.8 + wav }); }
      tag(ctx, '主业：数据资源开发利用', 680, 1255, 40, { s: popS(t, A(3, '数据资源')), bg: O });
    }
  }
  scene(T0, tB, (ctx, t) => drawA(ctx, t));

  // ===== Scene B: 追问 (S3–S5) =====
  const tPrice = A(4, '数据有多'), tStrike = A(4, '值钱', 0.4), t4 = s0(5), tP = A(5, '互联网'), tE = A(5, '数据交易所'), tM = A(5, '海量'), tWhy = A(5, '为什么'), t5 = s0(6), t6 = s0(7);
  ev('pop', tPrice); ev('draw', tStrike, tStrike + 0.3); ev('whoosh', t4 - 0.2); ev('pop', tP); ev('pop', tE); ev('pop', tM); ev('pop', tWhy); ev('pop', t5 + 0.2);
  const ICX = [190, 540, 890], ICY = 860;
  scene(tB, t6 + 0.4, (ctx, t) => {
    const k = eio(lin(t, tB, tB + 0.6)); const out = lin(t, t4 - 0.3, t4 + 0.2);
    if (out < 1) { ctx.save(); ctx.globalAlpha *= 1 - out; const sc = lerp(1, 0.3, k); ctx.translate(lerp(540, 225, k), lerp(960, 600, k)); ctx.rotate(lerp(0, -0.07, k));
      if (k > 0.05) { rr(ctx, -W * sc / 2 - 18, -H * sc / 2 - 18, W * sc + 36, H * sc + 70, 10); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); }
      ctx.scale(sc, sc); ctx.translate(-540, -960); ctx.save(); ctx.beginPath(); ctx.rect(0, 270, W, 1260); ctx.clip(); ctx.drawImage(paper, 0, 0); drawA(ctx, Math.min(t, tB)); ctx.restore(); ctx.restore();
      text(ctx, '最值得追问的', 730, 470, 64, O, { s: popS(t, A(4, '最值得')), alpha: 1 - out });
      if (k > 0.9) text(ctx, '新闻', 225, 862, 40, BROWN, { s: popS(t, tB + 0.5), alpha: 1 - out });
      // price tag cube
      const ps = popS(t, tPrice); if (ps > 0) { ctx.save(); ctx.globalAlpha *= 1 - out; img(ctx, 'c_cube', 740, 1010, 300, { s: ps });
        ctx.save(); ctx.translate(780, 640); ctx.scale(ps, ps); ctx.rotate(0.12); const g = lin(t, tStrike, tStrike + 0.3);
        rr(ctx, -150, -60, 300, 120, 20); ctx.fillStyle = g > 0 ? '#E6DFD2' : '#F4D27A'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, '多值钱？', 10, 4, 58, g > 0 ? '#9A8C7A' : BROWN, { outline: false });
        ctx.beginPath(); ctx.arc(-120, 0, 11, 0, 7); ctx.fillStyle = BG; ctx.fill(); ctx.stroke(); ctx.restore();
        stroke(ctx, [[640, 610], [930, 690]], g, { color: RED, w: 12, pen: false }); text(ctx, '可能不是重点', 760, 1100, 60, RED, { s: popS(t, tStrike + 0.2) }); ctx.restore(); } }
    // S4 three things
    const lineUp = eio(lin(t, t5 - 0.1, t5 + 0.5)); const fin = 1 - lin(t, t6 - 0.1, t6 + 0.3);
    if (t > t4 && fin > 0) { ctx.save(); ctx.globalAlpha *= fin;
      const X = (i) => lerp(ICX[i], [150, 390, 630][i], lineUp), Y = lerp(ICY, 800, lineUp), S = lerp(1.2, 0.72, lineUp);
      const s1_ = popS(t, tP), s2_ = popS(t, tE), s3_ = popS(t, tM);
      if (s1_ > 0) { phone(ctx, X(0), Y, S * s1_); text(ctx, '互联网平台', X(0), Y + 190 * S, 44 * S, BROWN, { s: s1_ }); }
      if (s2_ > 0) { exchange(ctx, X(1), Y + 10, S * s2_); text(ctx, '数据交易所', X(1), Y + 190 * S, 44 * S, BROWN, { s: s2_ }); }
      if (s3_ > 0) { miniPile(ctx, X(2), Y + 110 * S, S * s3_); text(ctx, '海量数据', X(2), Y + 190 * S, 44 * S, BROWN, { s: s3_ }); }
      // why new SOE
      tag(ctx, '还要一家新央企？', 540, 1230, 52, { s: popS(t, tWhy) * (1 - lineUp), bg: O });
      if (lineUp > 0) { ['+', '+', '+'].forEach((p, i) => text(ctx, p, [270, 510, 750][i], 800, 70, BROWN, { s: lineUp }));
        const ms = popS(t, t5 + 0.2); if (ms > 0) { ctx.save(); ctx.translate(890, 800); ctx.scale(ms * (1 + 0.04 * Math.sin(t * 8)), ms * (1 + 0.04 * Math.sin(t * 8))); ctx.setLineDash([18, 12]); ctx.lineWidth = 8; ctx.strokeStyle = O; rr(ctx, -95, -120, 190, 240, 24); ctx.fillStyle = 'rgba(239,114,38,0.12)'; ctx.fill(); ctx.stroke(); ctx.setLineDash([]); text(ctx, '？', 0, 0, 130, O, { outline: false }); ctx.restore(); }
        text(ctx, '缺的，到底是什么？', 540, 1200, 66, BROWN, { s: popS(t, t5 + 0.4) }); }
      ctx.restore(); }
  });

  // ===== Scene C: 判断 (S6–S7) =====
  const tJ = s0(7), t7 = s0(8), tCol = A(8, '收集'), tBut = A(8, '而是让'), tC1 = A(8, '能够合作'), tC2 = A(8, '愿意合作'), tC3 = A(8, '边界');
  const tCh = s1(8) + 0.3, t8 = s0(9);
  ev('whoosh', tJ - 0.2); ev('stamp', tJ + 0.3); ev('pop', tCol); ev('whoosh', tBut); ev('pop', tC1); ev('pop', tC2); ev('pop', tC3); ev('draw', tC3, tC3 + 0.8);
  SHAKES.push([tJ + 0.3, 8]);
  const TRIO = [['c_engineer', 210], ['c_manager', 540], ['c_repair', 870]];
  scene(tJ - 0.2, tCh + 0.3, (ctx, t) => {
    const slide = eio(lin(t, tJ - 0.2, tJ + 0.3)); ctx.save(); ctx.translate((1 - slide) * 1080, 0); ctx.globalAlpha *= 1 - lin(t, tCh, tCh + 0.3);
    stamp(ctx, '先说一个判断', 540, 400, 70, t, tJ + 0.3, { color: O, rot: -0.05 });
    const cs = popS(t, tCol); const dim = lin(t, tBut, tBut + 0.4);
    if (cs > 0) { card(ctx, 540, 640, 760, 210, { s: cs, alpha: 1 - dim * 0.55, fn: c => { miniPile(c, -250, 60, 0.9); text(c, '把数据收集起来', 90, -22, 56, BROWN, { outline: false }); text(c, '不只是这个', 90, 50, 44, '#9A8C7A', { outline: false }); } }); }
    // trio
    TRIO.forEach(([n, x], i) => { const s = popS(t, tBut + i * 0.15, 0.4); if (s > 0) img(ctx, n, x, 1450, 440, { s }); });
    const lab = [[tC1, '能够合作'], [tC2, '愿意合作'], [tC3, '知道边界在哪']];
    lab.forEach(([tt, str], i) => { const s = popS(t, tt); if (s > 0) { tag(ctx, str + ' ✓', 540, 840 + i * 86, 46, { s, bg: i === 2 ? O : INK }); } });
    // hand links
    stroke(ctx, arrowPts([290, 1150], [460, 1150], 0.25), sp(t, tC1, 0.4), { color: O, w: 10, pen: false });
    stroke(ctx, arrowPts([620, 1150], [790, 1150], 0.25), sp(t, tC1 + 0.2, 0.4), { color: O, w: 10, pen: false });
    if (t > tC3) { const pts = []; for (let k = 0; k <= 60; k++) { const a = Math.PI + k / 60 * Math.PI * 2; pts.push([540 + 500 * Math.cos(a), 1250 + 260 * Math.sin(a)]); } stroke(ctx, pts, sp(t, tC3, 0.9), { color: O, w: 9, dash: [24, 16], amp: 1.5 }); }
    ctx.restore();
  });

  // ===== Chapter card =====
  ev('whoosh', tCh); ev('stamp', tCh + 0.4);
  const chipIn = t8 + 0.3;
  scene(tCh, chipIn + 0.5, (ctx, t) => {
    const a = lin(t, tCh, tCh + 0.3), shrink = eio(lin(t, chipIn - 0.2, chipIn + 0.4));
    ctx.save(); ctx.globalAlpha *= a * (1 - shrink);
    burst(ctx, 540, 900, 1100, t, { color: 'rgba(239,114,38,0.14)', spin: 0.3 });
    ctx.save(); ctx.translate(540, lerp(900, 310, shrink)); ctx.scale(lerp(1, 0.4, shrink), lerp(1, 0.4, shrink));
    ctx.beginPath(); ctx.arc(0, -230, 95, 0, 7); ctx.fillStyle = O; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, '一', 0, -224, 110, '#FFF', { outline: false });
    stamp(ctx, '对整个行业有用，', 0, -30, 70, t, tCh + 0.4, { color: INK, rot: 0 });
    text(ctx, '不等于', 0, 90, 60, BROWN, { s: popS(t, tCh + 0.7) }); text(ctx, '对每家企业都划算', 0, 190, 76, O, { s: popS(t, tCh + 0.9) });
    ctx.restore(); ctx.restore();
  });
  CHIP = (ctx, t) => { const s = popS(t, chipIn, 0.4); if (s <= 0) return; tag(ctx, '一 · 有用 ≠ 划算', 540, 316, 34, { s, bg: O }); };

  // ===== Scene D: 设备制造商 (S8–S14) =====
  const tMod = A(9, '训练'), tPred = A(9, '提前预测'), tFault = A(9, '机器故障'), t9 = s0(10);
  const tD1 = A(10, '设备参数'), tF = A(10, '工厂'), tD2 = A(10, '运行记录'), tR = A(10, '维修公司'), tD3 = A(10, '故障原因');
  const t10 = s0(11), tMerge = A(11, '对应起来'), tUse = A(11, '更有用'), t11 = s0(12), t12 = s0(13), tW1 = A(13, '工厂'), tW2 = A(13, '维修公司'), tW3 = A(13, '制造商');
  const t13 = s0(14), tMao = A(14, '矛盾'), t14 = s0(15), tInd = A(15, '整个行业'), tOne = A(15, '某一家'), tNo = A(15, '未必');
  ev('pop', t8 + 0.2); ev('pop', tMod); ev('draw', tPred, tPred + 0.6); ev('pop', tFault + 0.2); ev('whoosh', t9 - 0.2);
  [tF, tR].forEach(x => ev('pop', x - 0.2)); [tD1, tD2, tD3].forEach(x => ev('pop', x)); ev('whoosh', tMerge); ev('pop', tUse);
  ev('pop', t11 + 0.3); [tW1, tW2, tW3].forEach(x => ev('pop', x)); ev('stamp', tMao); SHAKES.push([tMao, 12]); ev('pop', tInd); ev('pop', tNo);
  const XS = [190, 540, 890], BASE = 1460, CH = 430;
  const COLS = ['#2E8BC0', '#3E9B5B', O];
  scene(t8, OPEN_END + 0.45, (ctx, t) => {
    const ex = eio(lin(t, OPEN_END - 0.0, OPEN_END + 0.45)); ctx.save(); ctx.translate(-ex * W, 0);
    const re = eio(lin(t, t9 - 0.2, t9 + 0.4)); // rearrange to trio
    // S8: engineer + machine + model
    const eX = lerp(260, XS[0], re), eH = lerp(560, CH, re);
    img(ctx, 'c_engineer', eX, BASE, eH, { s: popS(t, t8 + 0.1, 0.45) });
    sign(ctx, lerp(260, XS[0], re), lerp(800, 960, re), '设备制造商', { s: popS(t, t8 + 0.4), size: lerp(52, 38, re), posts: false });
    if (re < 1) { ctx.save(); ctx.globalAlpha *= 1 - re;
      const ms = popS(t, tMod - 0.1); const shake = t > tFault ? Math.sin(t * 50) * 6 * (1 - lin(t, tFault + 0.2, tFault + 1.2)) : 0;
      if (t > t8 + 0.3) { img(ctx, 'c_machine', 790 + shake, BASE, 400, { s: popS(t, t8 + 0.3) }); const im = L.IMG.c_machine, w = im.width * 400 / im.height; const px = 790 - w / 2 + MACH.cx * w, py = BASE - 400 + MACH.cy * 400; text(ctx, WM, px + shake, py - 14, 30, '#4A4A4A', { outline: false, s: popS(t, t8 + 0.5) }); text(ctx, '数控机床', px + shake, py + 26, 24, '#6A6A6A', { outline: false, s: popS(t, t8 + 0.5) }); }
      if (ms > 0) card(ctx, 760, 640, 400, 260, { s: ms, rot: 0.03, fn: c => { text(c, '故障预测模型', 0, -80, 50, BROWN, { outline: false }); chartIcon(c, O); c.save(); c.translate(0, 10); c.restore(); text(c, WM + ' AI', 0, 100, 22, '#A8977E', { outline: false }); } });
      stroke(ctx, arrowPts([760, 780], [800, 1020], -0.3), sp(t, tPred, 0.5), { color: O, w: 10, head: true, pen: false });
      tag(ctx, '提前预测', 560, 920, 42, { s: popS(t, tPred + 0.3), bg: O });
      if (t > tFault + 0.2) { const s = popS(t, tFault + 0.2); ctx.save(); ctx.translate(930, 1000); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(55, 40); ctx.lineTo(-55, 40); ctx.closePath(); ctx.fillStyle = '#F4C542'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, '!', 0, 8, 70, RED, { outline: false }); ctx.restore(); }
      ctx.restore(); }
    // trio: manager & repair
    if (t > tF - 0.3) { img(ctx, 'c_manager', XS[1], BASE, CH * 0.95, { s: popS(t, tF - 0.3, 0.45) }); sign(ctx, XS[1], 960, '工厂', { s: popS(t, tF - 0.1), size: 38, posts: false }); }
    if (t > tR - 0.3) { img(ctx, 'c_repair', XS[2], BASE, CH * 1.05, { s: popS(t, tR - 0.3, 0.45) }); sign(ctx, XS[2], 960, '维修公司', { s: popS(t, tR - 0.1), size: 38, posts: false }); }
    // data cards
    const merge = eio(lin(t, tMerge - 0.2, tMerge + 0.5)), unmerge = eio(lin(t, t11 + 0.1, t11 + 0.6));
    const D = [[tD1, '设备参数', 'doc'], [tD2, '运行记录', 'chart'], [tD3, '故障原因', 'wrench']];
    const lockK = (i) => lin(t, [tW3, tW1, tW2][i] + 0.2, [tW3, tW1, tW2][i] + 0.5);
    D.forEach(([tt, lb, kind], i) => { const s = popS(t, tt); if (s <= 0) return; const m = merge * (1 - unmerge);
      const x = lerp(XS[i], 540 + (i - 1) * 60, m), y = lerp(720, 560 + (i - 1) * 14, m) - (t > t12 ? 120 : 0) * lin(t, t12, t12 + 0.4);
      const sc = lerp(1, 0.75, m) * lerp(1, 0.75, lin(t, t12, t12 + 0.4)); const g = lin(t, t13, t13 + 0.4);
      dataCard(ctx, x, y, lb, kind, COLS[i], { s: s * sc * (1 - g), rot: (i - 1) * 0.06 * (1 - m), lock: lockK(i) }); });
    if (merge > 0.6 && unmerge < 1) { ctx.save(); ctx.globalAlpha *= (1 - unmerge); burst(ctx, 540, 600, 260, t, { alpha: merge, color: 'rgba(239,114,38,0.25)' });
      check(ctx, 690, 520, 1.1, '#3E9B5B', lin(t, tMerge + 0.4, tMerge + 0.8)); tag(ctx, '比各自单独分析更有用', 540, 800, 42, { s: popS(t, tUse), bg: '#3E9B5B' }); ctx.restore(); }
    // S11 question
    { const s = popS(t, t11 + 0.3) * (1 - lin(t, t12 - 0.2, t12 + 0.2)); if (s > 0) text(ctx, '三方愿意合作吗？', 540, 540, 76, O, { s }); }
    // S12 worries
    const wo = 1 - lin(t, t14 - 0.1, t14 + 0.3);
    if (wo > 0) { ctx.save(); ctx.globalAlpha *= wo;
      thought(ctx, '怕暴露产量', XS[1], 830, 40, { s: popS(t, tW1) });
      thought(ctx, '整理要花钱', XS[2] - 20, 820, 40, { s: popS(t, tW2), tail: [40, 90] });
      thought(ctx, '成果给对手？', XS[0] + 30, 820, 40, { s: popS(t, tW3), tail: [-40, 90] });
      ctx.restore(); }
    stamp(ctx, '矛盾', 540, 470, 90, t, tMao, { color: RED, rot: -0.1, alpha: 1 - lin(t, t14 + 0.2, t14 + 0.5) });
    // S14 comparison
    { const s1x = popS(t, tInd), s2x = popS(t, tNo);
      if (s1x > 0) card(ctx, 540, 520, 860, 150, { s: s1x, fn: c => { text(c, '对整个行业', -200, 0, 54, BROWN, { outline: false }); text(c, '→', 30, 0, 54, BROWN, { outline: false }); text(c, '有价值', 200, 0, 60, '#3E9B5B', { outline: false }); check(c, 340, 0, 0.7, '#3E9B5B', lin(t, tInd + 0.5, tInd + 0.8)); } });
      if (s2x > 0) card(ctx, 540, 710, 860, 150, { s: s2x, rot: -0.01, fn: c => { text(c, '对某一家企业', -190, 0, 54, BROWN, { outline: false }); text(c, '→', 40, 0, 54, BROWN, { outline: false }); text(c, '未必划算', 210, 0, 60, RED, { outline: false }); } }); }
  ctx.restore();
  });
}

function defineScenes() {
  defineOpening();
  CHIP = chipDraw;
  CHAPS.push({ n: '一', chip: '有用 ≠ 划算', t: s0(9) + 0.3 });
  const B = ['经济学关于数据', '再加上格式', '这也是为什么，有了', '根据新华社报道', '也要分清', '从现有报道看', '为什么数据产权', '2022年发布', '通俗地说', '因此，一笔数据', '这套思路', '一吨', '数据要采集', '它也不意味着', '今年6月', '因为把一条', '当然，数据质量', '那有没有办法', '更重要的是，即使', '还有一层', '再往下看', '所以，“东数西算', '数据不会因为被分析', '回头看', '“数据二十条”提出的原则', '所以，评价这家', '数据成为生产要素', '这里是苏格拉'];
  const BT = B.map(k => UT(k));
  BT[0] = OPEN_END;
  const at = i => { CUR = U(B[i]); };
  const nx = i => BT[i + 1] - 0.15;
  const chT = n => CT[CJ.chapters[n].at] + LEAD;

  // ---------- B1 研究：留在自己手里 / 成本与收益 ----------
  { at(0); const tEco = K('经济学'), tShare = K('共享'), tVal = K('更多价值'), tComp = K('担心竞争'), tKeep = K('留在自己手里'), tSo = K('所以，数据不流通'), tUse = K('不知道它有用'), tCost = K('成本由我'), tGain = K('收益却不一定'), tData = K('数据由我交出'), tRisk = K('风险却可能');
    beat(BT[0], nx(0), [
      el('card', tEco, tSo, { x: 540, y: 430, w: 520, ht: 130, icon: bookIcon, ix: -180, lines: [['经济学研究', 56, BROWN, 50, 0]] }),
      el('img', tEco + 0.3, tSo, { n: 'c_manager', x: 300, y: 1400, h: 520 }),
      el('img', tShare, tSo, { n: 'c_cube', x: 470, y: 1400, h: 170, fn: null }),
      el('arrow', tShare + 0.3, tSo, { a: [520, 1150], b: [720, 900], bend: -0.2 }),
      el('tag', tShare + 0.4, tSo, { str: '共享', x: 640, y: 1080, size: 40, bg: G }),
      el('fn', tVal, tSo, { x: 790, y: 860, draw: c => miniPile(c, 0, 0, 1.3) }),
      el('tag', tVal + 0.3, tSo, { str: '更多价值', x: 790, y: 930, size: 44, bg: G }),
      el('bubble', tComp, tSo, { str: '怕被对手学去', x: 330, y: 760, size: 40 }),
      el('fn', tKeep, tSo, { x: 470, y: 1300, draw: c => lockIcon(c, 0, 0, 0.8, RED) }),
      el('tag', tKeep + 0.3, tSo, { str: '留在自己手里', x: 380, y: 1460, size: 42, bg: RED }),
      el('segs', tSo, null, { x: 540, y: 440, size: 62, segs: [['数据不流通', BROWN], ['≠', O], ['不知道有用', BROWN]] }),
      el('img', tSo + 0.4, null, { n: 'c_engineer', x: 540, y: 1470, h: 400, label: '我', ly: 1050, lbg: O }),
      el('card', tCost, null, { x: 290, y: 650, w: 400, ht: 170, lines: [['成本', 54, BROWN, 0, -32], ['我承担', 48, RED, 0, 34]] }),
      el('card', tGain, null, { x: 790, y: 650, w: 400, ht: 170, lines: [['收益', 54, BROWN, 0, -32], ['不一定归我', 46, GREY, 0, 34]] }),
      el('card', tData, null, { x: 290, y: 880, w: 400, ht: 170, lines: [['数据', 54, BROWN, 0, -32], ['我交出', 48, RED, 0, 34]] }),
      el('card', tRisk, null, { x: 790, y: 880, w: 400, ht: 170, lines: [['风险', 54, BROWN, 0, -32], ['可能留给我', 46, RED, 0, 34]] }),
    ]);
  }
  // ---------- B2 三块砖 ----------
  { at(1); const tFmt = K('格式不统一'), tQ = K('质量难判断'), tU = K('用途说不清'), tHard = K('合作就更难');
    const br = (str, t0, y) => el('fn', t0, null, { x: 540, y: 0, noPop: true, draw: (c, t) => brick(c, str, 0, dropY(t, t0, y)) });
    beat(BT[1], nx(1), [
      el('img', BT[1], null, { n: 'c_engineer', x: 170, y: 1460, h: 440 }),
      el('img', BT[1] + 0.15, null, { n: 'c_manager', x: 910, y: 1460, h: 420 }),
      br('格式不统一', tFmt, 1380), br('质量难判断', tQ, 1270), br('用途说不清', tU, 1160),
      el('stamp', tHard, null, { str: '合作更难了', x: 540, y: 620, size: 76, col: RED, shake: 10 }),
    ]);
  }
  // ---------- B3 交易所 ≠ 问题消失 → 整套条件 ----------
  { at(2); const tEx = K('有了交易所'), tNo = K('不等于问题'), tMeet = K('供需见面'), tLeg = K('是否合法'), tQual = K('质量如何'), tTask = K('能用于什么任务'), tVer = K('核验'), tAgr = K('具体约定'), tMkt = K('数据市场缺的'), tPlace = K('买卖的地方'), tCond = K('整套条件');
    beat(BT[2], nx(2), [
      el('fn', tEx, null, { x: 540, y: 760, draw: c => exchange(c, 0, 0, 1.6), mv: { t: tMkt, y: 700 } }),
      el('tag', tNo, tMeet, { str: '≠ 问题自动消失', x: 540, y: 1080, size: 50, bg: RED }),
      el('img', tMeet, tMkt, { n: 'c_engineer', x: 170, y: 1470, h: 400, label: '需方', ly: 1040 }),
      el('img', tMeet + 0.2, tMkt, { n: 'c_merchant', x: 910, y: 1470, h: 400, label: '供方', ly: 1040 }),
      el('tag', tLeg, tMkt, { str: '合法？', x: 330, y: 1130, size: 46, bg: O }),
      el('tag', tQual, tMkt, { str: '质量？', x: 540, y: 1130, size: 46, bg: O }),
      el('tag', tTask, tMkt, { str: '用途？', x: 750, y: 1130, size: 46, bg: O }),
      el('stamp', tVer, tMkt, { str: '核验', x: 440, y: 1260, size: 56, col: G }),
      el('stamp', tAgr, tMkt, { str: '约定', x: 650, y: 1260, size: 56, col: BLUE }),
      el('text', tPlace, null, { str: '不只是一个买卖的地方', x: 540, y: 430, size: 58 }),
      el('fn', tCond, null, { x: 540, y: 1080, draw: (c, t) => { const lab = ['合法', '质量', '用途', '约定']; lab.forEach((l, i) => { const s = popS(t, tCond + i * 0.15); if (s <= 0) return; c.save(); c.translate(-300 + i * 200, 30); c.scale(s, s); rr(c, -70, -60, 140, 170, 12); c.fillStyle = '#E9DCC3'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); text(c, l, 0, 25, 48, BROWN, { outline: false }); c.restore(); }); c.fillStyle = '#B9A584'; rr(c, -420, 130, 840, 40, 10); c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); } }),
      el('stamp', tCond + 0.5, null, { str: '整套条件', x: 540, y: 1360, size: 70, col: O }),
    ]);
  }
  // ================= 第二章 =================
  chapter('二', '新央企要做什么，', '又不意味着什么？', '新央企做什么', chT(1));
  { at(3); const tXH = K('根据新华社'), tDir = K('工作方向'), tSvc = K('数据服务'), tGov = K('行业数据治理'), tAI = K('人工智能产业'), tSet = K('高质量数据集'), tKey = K('关键词'), k1 = K('服务、治理'), k2 = K('治理和开发'), k3 = K('开发利用');
    beat(BT[3], nx(3), [
      el('fn', BT[3] + 0.3, null, { x: 540, y: 880, draw: (c, t) => hqDraw(c, 0, 0, 470) }),
      el('tag', tXH + 0.2, null, { str: '据新华社报道', x: 540, y: 420, size: 40, bg: INK }),
      el('arrow', tSvc - 0.1, null, { a: [430, 900], b: [220, 1040], bend: 0.2 }),
      el('arrow', tGov - 0.1, null, { a: [540, 900], b: [540, 1040], bend: 0 }),
      el('arrow', tAI - 0.1, null, { a: [650, 900], b: [860, 1040], bend: -0.2 }),
      el('card', tSvc, null, { x: 200, y: 1180, w: 320, ht: 230, icon: c => img(c, 'c_cube', 0, 40, 90), ix: 0, iy: -45, lines: [['数据服务', 46, BROWN, 0, 70]] }),
      el('card', tGov, null, { x: 540, y: 1180, w: 320, ht: 230, icon: c => docIcon(c, O), ix: 0, iy: -45, is: 0.9, lines: [['行业数据治理', 42, BROWN, 0, 70]] }),
      el('card', tAI, null, { x: 880, y: 1180, w: 320, ht: 230, icon: c => img(c, 'c_books', 0, 45, 105), ix: 0, iy: -45, lines: [['数据集·语料库', 40, BROWN, 0, 70]] }),
      el('tag', tAI + 0.3, null, { str: '为人工智能产业', x: 880, y: 1340, size: 32, bg: BLUE }),
      el('stamp', k1, null, { str: '服务', x: 280, y: 560, size: 60, col: O, rot: -0.12 }),
      el('stamp', k2, null, { str: '治理', x: 800, y: 560, size: 60, col: O, rot: 0.1 }),
      el('stamp', k3, null, { str: '开发利用', x: 540, y: 1430, size: 60, col: RED, rot: -0.04 }),
    ]);
  }
  { at(4); const tTwo = K('两个名字'), tBur = K('国家数据局'), tAdm = K('行政机关'), tDuty = K('基础制度'), tMk = K('市场建设'), tGrp = K('国家数据集团，是企业'), tEnt = K('是企业'), tNot = K('不能把企业'), tAll = K('统一归它所有'), tMore = K('更不能理解'), tInf = K('无限权限'), tGet = K('数据的获取'), tLaw = K('法律依据'), tAuth = K('授权'), tCon = K('合同安排');
    beat(BT[4], nx(4), [
      el('text', tTwo, tNot, { str: '分清两个名字', x: 540, y: 420, size: 64, col: O }),
      el('fn', tBur, tNot, { x: 280, y: 1000, draw: (c, t) => plaqueDraw(c, 'c_gov', GOV, 0, 0, 500, '国家数据局', INK) }),
      el('tag', tAdm, tNot, { str: '行政机关', x: 280, y: 1070, size: 46, bg: INK }),
      el('tag', tDuty, tNot, { str: '基础制度建设', x: 280, y: 1160, size: 38, bg: GREY }),
      el('tag', tMk, tNot, { str: '市场建设', x: 280, y: 1240, size: 38, bg: GREY }),
      el('fn', tGrp, null, { x: 800, y: 1000, draw: (c, t) => hqDraw(c, 0, 0, 480), mv: { t: tNot, x: 540, y: 1360 } }),
      el('tag', tEnt, tNot, { str: '企业', x: 800, y: 1070, size: 50, bg: O }),
      el('fn', tNot, tLaw, { x: 0, y: 0, noPop: true, draw: (c, t) => { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const f = eio(lin(t, tNot + 0.2 + k * 0.05, tAll + 0.3 + k * 0.05)); const x = lerp(540 + Math.cos(a) * 640, 540 + Math.cos(a) * 60, f), y = lerp(1130 + Math.sin(a) * 600, 1130 + Math.sin(a) * 40, f); img(c, 'c_cube', x, y, 80, { rot: a }); } } }),
      el('tag', tAll + 0.2, tGet, { str: '≠ 全国数据都归它', x: 540, y: 480, size: 52, bg: RED }),
      el('cross', tAll + 0.4, tGet, { x: 540, y: 1130, sc: 2.2 }),
      el('tag', tInf, tGet, { str: '≠ 无限使用权限', x: 540, y: 600, size: 52, bg: RED }),
      el('text', tGet, null, { str: '获取和使用数据，仍然要有', x: 540, y: 410, size: 52 }),
      el('card', tLaw, null, { x: 220, y: 600, w: 300, ht: 200, icon: c => docIcon(c, BLUE), ix: 0, iy: -30, is: 0.8, lines: [['法律依据', 44, BROWN, 0, 60]] }),
      el('card', tAuth, null, { x: 540, y: 600, w: 300, ht: 200, icon: c => keyIcon(c, '#F4C542'), ix: 0, iy: -30, is: 0.8, lines: [['授权', 44, BROWN, 0, 60]] }),
      el('card', tCon, null, { x: 860, y: 600, w: 300, ht: 200, icon: c => docIcon(c, O), ix: 0, iy: -30, is: 0.8, lines: [['合同安排', 44, BROWN, 0, 60]] }),
    ]);
  }
  { at(5); const tRep = K('从现有报道看'), tCross = K('跨行业协作'), tDev = K('数据开发利用的短板'), tCost = K('降低合作成本'), tMore = K('更多主体受益'), tPrac = K('后续实践'), tOrg = K('组织上的动作'), tSolve = K('解决一个行业'), tAbi = K('持续的能力'), tRes = K('具体的结果');
    const barrel = (c, t) => { const H0 = [460, 470, 300, 455, 470, 465, 330, 460, 450]; const lab = { 2: ['跨行业协作', tCross], 6: ['开发利用', tDev] }; const fix = lin(t, tDev + 1.0, tDev + 1.6);
      H0.forEach((hh, i) => { let h2 = hh; if (lab[i]) h2 = lerp(hh, 460, fix); const x = -315 + i * 70; c.fillStyle = lab[i] && t > lab[i][1] ? (fix > 0 ? '#F4B183' : O) : '#C98B4E'; c.fillRect(x, 220 - h2, 66, h2); c.lineWidth = 5; c.strokeStyle = INK; c.strokeRect(x, 220 - h2, 66, h2); });
      c.fillStyle = 'rgba(75,163,199,0.28)'; const lv = lerp(300, 450, fix); c.fillRect(-315, 220 - lv + 10, 628, lv - 10);
      c.lineWidth = 8; c.strokeStyle = '#555'; for (const y of [60, 180]) { c.beginPath(); c.moveTo(-325, y); c.lineTo(325, y); c.stroke(); }
      Object.entries(lab).forEach(([i, [str, tt]]) => { const s = popS(t, tt); if (s > 0) tag(c, str, -315 + i * 70 + 33, 220 - 300 - 60 - (i == 6 ? 70 : 0), 36, { s, bg: RED }); }); };
    beat(BT[5], nx(5), [
      el('fn', tRep, tCost, { x: 540, y: 1000, draw: barrel }),
      el('stamp', tDev + 0.8, tCost, { str: '补齐短板', x: 540, y: 470, size: 72, col: O }),
      el('tag', tCost, tOrg, { str: '能否降低合作成本？', x: 540, y: 600, size: 50, bg: INK }),
      el('tag', tMore, tOrg, { str: '能否让更多主体受益？', x: 540, y: 730, size: 50, bg: INK }),
      el('stamp', tPrac, tOrg, { str: '还要看后续实践', x: 540, y: 950, size: 66, col: O }),
      el('fn', tOrg, null, { x: 540, y: 1000, draw: (c, t) => { const steps = [['成立企业', tOrg, G], ['持续能力', tAbi, BLUE], ['具体结果', tRes, O]]; steps.forEach(([str, tt, col], i) => { const s = popS(t, tt); if (s <= 0) return; const x = -390 + i * 260, y = 300 - i * 170; c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.fillRect(0, 0, 260, 500 - y); c.lineWidth = 6; c.strokeStyle = INK; c.strokeRect(0, 0, 260, 500 - y); text(c, str, 130, 50, 44, '#FFF', { outline: false }); c.restore(); });
        const k = t < tAbi ? 0 : t < tRes ? lin(t, tAbi, tAbi + 0.6) : 1 + lin(t, tRes, tRes + 0.6); const st = Math.floor(k), fr = k - st; const x0 = -260 + st * 260, y0 = 300 - st * 170; const x = x0 + eio(fr) * 260, y = y0 - eio(fr) * 170 - Math.sin(fr * Math.PI) * 80; if (t > tOrg) img(c, 'c_cube', x, y, 110);
        if (t > tRes + 0.5) { c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.moveTo(330, -40); c.lineTo(330, -200); c.stroke(); c.fillStyle = RED; c.beginPath(); c.moveTo(330, -200); c.lineTo(410, -170); c.lineTo(330, -140); c.fill(); c.stroke(); } } }),
      el('tag', tOrg + 0.3, null, { str: '组织上的动作', x: 280, y: 1180, size: 38, bg: G }),
      el('text', tSolve, null, { str: '解决问题靠什么？', x: 640, y: 420, size: 52, col: BROWN }),
    ]);
  }
  // ================= 第三章 =================
  chapter('三', '比“数据归谁”更具体的', '是“谁能做什么”', '谁能做什么', chT(2));
  { at(6); const tWhy = K('为什么数据产权'), tOrd = K('一笔订单'), tC = K('消费者'), tM = K('商家'), tPay = K('支付机构'), tLog = K('物流公司'), tPlat = K('和平台'), tNot1 = K('不只靠一个人'), tWho = K('到底是谁的'), tSq = K('挤进');
    const C0 = [540, 960];
    beat(BT[6], nx(6), [
      el('text', tWhy, tOrd + 0.3, { str: '数据产权为什么难说清？', x: 540, y: 440, size: 60, col: O }),
      el('fn', tOrd, tWho, { x: 540, y: 960, draw: c => receipt(c) }),
      el('line', tC + 0.2, tWho, { a: [330, 740], b: [420, 860] }), el('img', tC, tWho, { n: 'c_girl', x: 200, y: 800, h: 360, label: '消费者', ly: 830 }),
      el('line', tM + 0.2, tWho, { a: [750, 740], b: [660, 860] }), el('img', tM, tWho, { n: 'c_merchant', x: 880, y: 800, h: 360, label: '商家', ly: 830 }),
      el('line', tPay + 0.2, tWho, { a: [540, 1250], b: [540, 1170] }), el('fn', tPay, tWho, { x: 540, y: 1330, draw: c => payCard(c) }), el('tag', tPay + 0.2, tWho, { str: '支付机构', x: 540, y: 1430, size: 36 }),
      el('line', tLog + 0.2, tWho, { a: [300, 1200], b: [410, 1100] }), el('img', tLog, tWho, { n: 'c_courier', x: 190, y: 1440, h: 360, label: '物流公司', ly: 1470 }),
      el('line', tPlat + 0.1, tWho, { a: [770, 1200], b: [670, 1100] }), el('fn', tPlat, tWho, { x: 880, y: 1270, draw: c => phone(c, 0, 0, 0.8) }), el('tag', tPlat + 0.2, tWho, { str: '平台', x: 880, y: 1420, size: 36 }),
      el('tag', tNot1, tWho, { str: '不只靠一个人', x: 540, y: 600, size: 46, bg: O }),
      el('text', tWho, null, { str: '它到底是谁的？', x: 540, y: 560, size: 80, col: O }),
      el('fn', tWho + 0.3, null, { x: 540, y: 1100, draw: (c, t) => { const lab = ['消费者', '商家', '支付', '物流', '平台']; const sq = eio(lin(t, tSq, tSq + 0.8)); lab.forEach((l, i) => { const x0 = -380 + i * 190, y0 = -260; const x = lerp(x0, -120 + i * 60, sq), y = lerp(y0, 30 + (i % 2) * 20, sq); tag(c, l, x, y, lerp(40, 26, sq), { bg: [BLUE, G, '#4B6CB7', '#7A4E2A', O][i], rot: sq * (i - 2) * 0.15 }); }); c.lineWidth = 8; c.strokeStyle = INK; c.fillStyle = 'rgba(201,139,78,0.35)'; rr(c, -170, -40, 340, 150, 10); c.fill(); c.stroke(); text(c, '一个简单答案', 0, 160, 40, GREY, { outline: false }); } }),
    ]);
  }
  { at(7); const t22 = K('2022年'), tPol = K('政策安排'), tHold = K('持有权'), tProc = K('加工使用权'), tOp = K('经营权'), tSep = K('分置的产权'), tSo = K('所谓分置'), tBun = K('捆成一包');
    const KC = ['#4BA3C7', G, O], KL = ['持有权', '加工使用权', '产品经营权'], KT = [tHold, tProc, tOp];
    beat(BT[7], nx(7), [
      el('card', t22, null, { x: 540, y: 470, w: 660, ht: 180, icon: c => docIcon(c, RED), ix: -250, lines: [['数据二十条', 60, BROWN, 40, -22], ['2022 · 政策安排', 36, GREY, 40, 44]] }),
      el('fn', tHold, null, { x: 540, y: 1000, noPop: true, draw: (c, t) => { const sp_ = eio(lin(t, tSo + 0.3, tSo + 1.1)); KL.forEach((l, i) => { const s = popS(t, KT[i]); if (s <= 0) return; const x = lerp(0, -330 + i * 330, sp_), y = lerp(-80 + i * 80, 0, sp_), r = lerp(-0.5 + i * 0.5, -Math.PI / 2, sp_); c.save(); c.translate(x, y); c.rotate(r); c.scale(2.2 * s, 2.2 * s); keyIcon(c, KC[i]); c.restore(); tag(c, l, lerp(230, -330 + i * 330, sp_), lerp(-80 + i * 80, 210, sp_), 40, { s, bg: KC[i] }); });
        if (sp_ < 1) { c.save(); c.globalAlpha *= 1 - sp_; c.lineWidth = 12; c.strokeStyle = '#B07A3A'; c.beginPath(); c.ellipse(0, 0, 70 + sp_ * 120, 170, 0, 0, 7); c.stroke(); c.restore(); } } }),
      el('stamp', tSep, null, { str: '分置', x: 540, y: 700, size: 76, col: O }),
      el('text', tBun, null, { str: '不把所有权利捆成一包', x: 540, y: 1330, size: 56, col: BROWN }),
    ]);
  }
  { at(8); const r1a = K('合法持有'), r1b = K('任何事'), r2a = K('约定范围内'), r2b = K('卖给别人'), r3a = K('受托提供'), r3b = K('原始数据'), tRule = K('在规则下');
    const row = (y, col, a, ta, b, tb, ok) => [el('card', ta, null, { x: 300, y, w: 470, ht: 200, icon: c => keyIcon(c, col), ix: -165, is: 0.9, lines: [[a[0], 44, BROWN, 55, -30], [a[1], 44, BROWN, 55, 30]] }), el('check', ta + 0.5, null, { x: 500, y: y - 70, sc: 0.8 }), el('tag', tb, null, { str: b, x: 810, y, size: 42, bg: ok ? BLUE : RED })];
    beat(BT[8], nx(8), [
      ...row(560, '#4BA3C7', ['合法持有', '一份数据'], r1a, '≠ 拿它做任何事', r1b),
      ...row(850, G, ['在约定范围内', '加工分析'], r2a, '≠ 再卖给别人', r2b),
      ...row(1140, O, ['受托提供', '流通服务'], r3a, '不必自留原始数据', r3b, true),
      el('stamp', tRule, null, { str: '在规则下分别安排', x: 540, y: 1380, size: 62, col: O }),
    ]);
  }
  { at(9); const tCoop = K('一笔数据合作'), tDB = K('一整个数据库'), tPerm = K('使用权限'), tQ = K('一次查询'), tV = K('一项核验'), tA = K('分析服务');
    beat(BT[9], nx(9), [
      el('text', tCoop, null, { str: '一笔数据合作，交付的是？', x: 540, y: 430, size: 56 }),
      el('fn', tDB, null, { x: 540, y: 820, draw: c => dbIcon(c), mv: { t: tPerm - 0.2, y: 640, s: 0.6 } }),
      el('tag', tDB + 0.3, null, { str: '未必是整个数据库', x: 540, y: 1040, size: 46, bg: GREY, mv: { t: tPerm - 0.2, y: 760, s: 0.8 } }),
      el('card', tPerm, null, { x: 300, y: 1000, w: 400, ht: 190, icon: c => keyIcon(c, '#F4C542'), ix: -130, is: 0.8, lines: [['使用权限', 46, BROWN, 50, 0]] }),
      el('card', tQ, null, { x: 780, y: 1000, w: 400, ht: 190, icon: magIcon, ix: -130, is: 0.9, lines: [['一次查询', 46, BROWN, 50, 0]] }),
      el('card', tV, null, { x: 300, y: 1240, w: 400, ht: 190, icon: chkIcon, ix: -130, is: 0.9, lines: [['一项核验', 46, BROWN, 50, 0]] }),
      el('card', tA, null, { x: 780, y: 1240, w: 400, ht: 190, icon: c => chartIcon(c, O), ix: -130, is: 0.9, lines: [['分析服务', 46, BROWN, 50, 0]] }),
    ]);
  }
  { at(10); const tIdea = K('这套思路'), tAll = K('就拥有一切'), tSplit = K('把问题拆细'), w1 = K('谁对什么数据'), w2 = K('有什么权利'), w3 = K('承担什么责任'), tPI = K('个人信息时'), tRights = K('依法享有的权益'), tErase = K('抹掉');
    const chips = [['谁', w1], ['对什么数据', w1 + 0.4], ['有什么权利', w2], ['担什么责任', w3]];
    beat(BT[10], nx(10), [
      el('tag', tIdea + 0.3, tPI, { str: '谁拿到数据，谁就拥有一切', x: 540, y: 480, size: 48, bg: INK, strike: tAll + 0.5, sw: 640 }),
      el('text', tSplit, tPI, { str: '把问题拆细', x: 540, y: 660, size: 70, col: O }),
      ...chips.map(([s, tt], i) => el('tag', tt, tPI, { str: s, x: 540, y: 820 + i * 120, size: 50, bg: [BLUE, G, O, RED][i] })),
      el('img', tPI, null, { n: 'c_girl', x: 300, y: 1450, h: 480 }),
      el('fn', tRights, null, { x: 300, y: 820, draw: c => shieldIcon(c, G) }),
      el('tag', tRights + 0.3, null, { str: '个人依法享有的权益', x: 300, y: 920, size: 38, bg: G }),
      el('card', tPI + 0.4, null, { x: 790, y: 1100, w: 380, ht: 260, icon: c => docIcon(c, INK), ix: 0, iy: -40, lines: [['企业之间的', 40, BROWN, 0, 50], ['交易合同', 40, BROWN, 0, 100]] }),
      el('tag', tErase + 0.1, null, { str: '抹不掉', x: 790, y: 880, size: 56, bg: RED }),
      el('cross', tErase + 0.2, null, { x: 790, y: 1060, sc: 1.2 }),
    ]);
  }
  // ================= 第四章 =================
  chapter('四', '数据不会越用越少，', '价值也不会自动越用越多', '越用越多？', chT(3));
  { at(11); const tCoal = K('一吨'), tNo = K('不能再烧'), tRec = K('同一份设备记录'), tFac = K('优化生产'), tMan = K('改进设计'), tNR = K('非竞争性'), tNC = K('不等于没有成本');
    beat(BT[11], nx(11), [
      el('img', tCoal, null, { n: 'c_coal', x: 270, y: 1000, h: 320 }),
      el('tag', tNo, null, { str: '烧掉就没了', x: 270, y: 1070, size: 44, bg: GREY }),
      el('fn', tRec, null, { x: 780, y: 620, draw: c => { card(c, 0, 0, 300, 170, { icon: null, fn: cc => { cc.save(); cc.translate(-90, 0); docIcon(cc, BLUE); cc.restore(); text(cc, '设备', 50, -28, 44, BROWN, { outline: false }); text(cc, '记录', 50, 28, 44, BLUE, { outline: false }); } }); } }),
      el('arrow', tFac - 0.2, null, { a: [720, 720], b: [650, 860], bend: 0.2 }),
      el('arrow', tMan - 0.2, null, { a: [840, 720], b: [910, 860], bend: -0.2 }),
      el('card', tFac, null, { x: 640, y: 990, w: 250, ht: 200, lines: [['工厂', 40, GREY, 0, -40], ['优化生产', 44, G, 0, 25]] }),
      el('card', tMan, null, { x: 920, y: 990, w: 250, ht: 200, lines: [['制造商', 40, GREY, 0, -40], ['改进设计', 44, G, 0, 25]] }),
      el('fn', tMan + 0.2, null, { x: 780, y: 620, draw: c => copyIcon(c, 130, -60, 0.6, O) }),
      el('stamp', tNR, null, { str: '非竞争性', x: 540, y: 1250, size: 76, col: O }),
      el('tag', tNC, null, { str: '≠ 没有成本', x: 540, y: 1400, size: 52, bg: RED }),
    ]);
  }
  { at(12); const tCol = K('采集'), tOrg = K('整理'), tMain = K('维护'), tFmt = K('格式要统一'), tErr = K('错误要核对'), tSens = K('敏感信息'), tProt = K('做好保护');
    const T = [['采集', tCol, 230, 560], ['整理', tOrg, 540, 500], ['维护', tMain, 850, 560], ['统一格式', tFmt, 220, 820], ['核对错误', tErr, 860, 820], ['保护敏感信息', tSens, 540, 1330]];
    beat(BT[12], nx(12), [
      el('img', BT[12], null, { n: 'c_cube', x: 540, y: 1180, h: 360, wob: true }),
      ...T.map(([s, tt, x, y]) => el('fn', tt, null, { x, y, draw: c => { tag(c, s, 20, 0, 44, { bg: '#7A4E2A' }); c.save(); c.translate(-tw(c, s, 44) / 2 - 30, -6); coinSym(c); c.restore(); } })),
      el('stamp', tProt + 0.4, null, { str: '处处都是成本', x: 540, y: 1450, size: 56, col: RED, silent: true }),
    ]);
  }
  { at(13); const tMore = K('数据越多'), tRare = K('罕见的设备故障'), tRep = K('大量重复'), tBig = K('文件越来越大'), tDeep = K('越来越深'), tKey = K('高质量数据的关键'), tNeat = K('看起来整齐'), tFit = K('适合任务');
    const pile = (c, t) => { const n = Math.floor(lerp(0, 16, lin(t, tRep, tBig + 1.2))); for (let k = 0; k < n; k++) { const x = -60 + (k % 2) * 30 + (hsh(k) - 0.5) * 30, y = -k * 34; rr(c, x - 110, y - 26, 220, 52, 8); c.fillStyle = '#E6E1D6'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); text(c, '正常运行', x, y, 30, GREY, { outline: false }); } if (n > 3) { rr(c, 70, -20, 120, 46, 8); c.fillStyle = O; c.fill(); c.lineWidth = 4; c.stroke(); text(c, '故障', 130, 3, 30, '#FFF', { outline: false }); } };
    beat(BT[13], nx(13), [
      el('segs', tMore, tKey, { x: 540, y: 430, size: 62, segs: [['数据越多', BROWN], [' ≠ ', O], ['效果越好', BROWN]] }),
      el('img', tRare - 0.3, tKey, { n: 'c_robot', x: 790, y: 1460, h: 460 }),
      el('bubble', tRare, tDeep, { str: '想学会认罕见故障', x: 760, y: 880, size: 38 }),
      el('fn', tRep, tKey, { x: 280, y: 1420, noPop: true, draw: pile }),
      el('tag', tBig, tKey, { str: '文件越来越大 ↑', x: 280, y: 760, size: 42, bg: GREY }),
      el('bubble', tDeep, tKey, { str: '还是不懂故障…', x: 760, y: 880, size: 40 }),
      el('text', tKey, null, { str: '高质量数据的关键', x: 540, y: 600, size: 66 }),
      el('tag', tNeat, null, { str: '看起来整齐', x: 540, y: 820, size: 50, bg: GREY, strike: tFit, sw: 330 }),
      el('stamp', tFit, null, { str: '适合任务', x: 540, y: 1060, size: 100, col: O }),
    ]);
  }
  { at(14); const tJun = K('今年6月'), tPlan = K('建设方案'), c1 = K('结构完整性'), c2 = K('内容多样性'), c3 = K('标注准确性'), c4 = K('模型适配性'), tExp = K('专家参与标注'), tFb = K('模型应用反馈');
    const ck = [['结构完整性', c1], ['内容多样性', c2], ['标注准确性', c3], ['模型适配性', c4]];
    beat(BT[14], nx(14), [
      el('card', tJun, null, { x: 540, y: 700, w: 820, ht: 560, lines: [['行业高质量数据集', 52, BROWN, 0, -210], ['建设方案 · 2026年6月', 36, GREY, 0, -150]], fn: (c, t) => ck.forEach(([s, tt], i) => { const y = -60 + i * 90; c.lineWidth = 5; c.strokeStyle = INK; rr(c, -260, y - 26, 52, 52, 8); c.fillStyle = '#FFF'; c.fill(); c.stroke(); if (t > tt) { check(c, -234, y, 0.6, G, lin(t, tt, tt + 0.3)); text(c, s, 40, y, 48, BROWN, { outline: false, s: popS(t, tt) }); } }) }),
      el('img', tExp, null, { n: 'c_engineer', x: 220, y: 1460, h: 400 }), el('tag', tExp + 0.2, null, { str: '专家参与标注', x: 240, y: 1030, size: 40, bg: BLUE }),
      el('img', tFb, null, { n: 'c_robot', x: 860, y: 1460, h: 400 }), el('tag', tFb + 0.2, null, { str: '应用反馈评价', x: 840, y: 1030, size: 40, bg: O }),
      el('arrow', tFb + 0.5, null, { a: [720, 1250], b: [420, 1250], bend: 0.35 }),
    ]);
  }
  { at(15); const tLab = K('标注正确'), tClick = K('点一下鼠标'), tEng = K('工程师的知识'), tMat = K('能够学习的材料'), tInd = K('数据产业不只是'), tKnow = K('组织知识');
    beat(BT[15], nx(15), [
      el('fn', tLab, tEng, { x: 540, y: 760, draw: c => { c.save(); c.scale(1.8, 1.8); mouseIcon(c); c.restore(); } }),
      el('tag', tClick, tEng, { str: '不是点一下鼠标', x: 540, y: 1000, size: 50, bg: GREY }),
      el('cross', tClick + 0.5, tEng, { x: 540, y: 760, sc: 1.5 }),
      el('img', tEng, null, { n: 'c_engineer', x: 200, y: 1460, h: 440 }), el('bubble', tEng + 0.2, null, { str: '知识和经验', x: 230, y: 940, size: 38 }),
      el('arrow', tEng + 0.7, null, { a: [330, 1250], b: [440, 1250], bend: 0 }),
      el('img', tEng + 0.8, null, { n: 'c_books', x: 540, y: 1360, h: 260 }),
      el('arrow', tMat - 0.2, null, { a: [640, 1250], b: [740, 1250], bend: 0 }),
      el('img', tMat, null, { n: 'c_robot', x: 880, y: 1460, h: 420 }),
      el('text', tInd, null, { str: '数据产业不只是收集信息', x: 540, y: 440, size: 56 }),
      el('stamp', tKnow, null, { str: '也是在组织知识', x: 540, y: 600, size: 72, col: O }),
    ]);
  }
  { at(16); const tQ = K('数据质量提高'), tRel = K('一定可靠'), p1 = K('算法'), p2 = K('训练方法'), p3 = K('评测'), p4 = K('实际部署'), tImp = K('同样重要');
    const tiles = [['数据质量', tQ, 220, 760, G], ['算法', p1, 860, 760, BLUE], ['训练方法', p2, 220, 1090, O], ['评测', p3, 860, 1090, '#9B7BD4'], ['实际部署', p4, 540, 1390, RED]];
    beat(BT[16], nx(16), [
      el('img', tQ, null, { n: 'c_robot', x: 540, y: 1260, h: 420 }),
      el('tag', tRel, null, { str: '可靠的模型？', x: 540, y: 760, size: 46, bg: INK }),
      ...tiles.map(([s, tt, x, y, col]) => el('tag', tt, null, { str: s, x, y, size: 48, bg: col })),
      el('stamp', tImp, null, { str: '同样重要', x: 540, y: 470, size: 76, col: O }),
    ]);
  }
  // ================= 第五章 =================
  chapter('五', '原始数据不交出去，', '也不等于风险消失了', '风险消失了吗', chT(4));
  { at(17); const tWay = K('有没有办法'), tFL = K('联邦学习'), tH = K('两家医院'), tLoc = K('留在本地'), tTrain = K('分别训练'), tSum = K('汇总模型更新'), tEx = K('交换的不是'), tUpd = K('更新信息'), tLeak = K('更新也可能泄露'), tProt = K('额外保护');
    const chipsUp = (c, t) => { [[-290, 700], [290, 700]].forEach(([x0, y0], j) => { for (let k = 0; k < 3; k++) { const tt = tSum + k * 0.5 + j * 0.25; const f = ((t - tt) / 1.4) % 1; if (t < tt) continue; const x = lerp(x0, 0, f), y = lerp(y0, 160, f); const bad = t > tLeak + 0.3; rr(c, x - 40, y - 22, 80, 44, 10); c.fillStyle = bad ? RED : '#7BC47F'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); text(c, bad ? '!' : '更新', x, y, 24, '#FFF', { outline: false }); } }); };
    beat(BT[17], nx(17), [
      el('text', tWay, tFL, { str: '不交出原始记录，也能合作？', x: 540, y: 440, size: 54 }),
      el('stamp', tFL, null, { str: '联邦学习', x: 540, y: 430, size: 70, col: O }),
      el('fn', tH, null, { x: 250, y: 1420, draw: c => plaqueDraw(c, 'c_hospital', HOS, 0, 0, 430, '第一医院', BLUE, 1, WM) }),
      el('fn', tH + 0.2, null, { x: 830, y: 1420, draw: c => plaqueDraw(c, 'c_hospital', HOS, 0, 0, 430, '第二医院', BLUE, 1, WM) }),
      el('fn', tLoc, null, { x: 250, y: 1480, draw: c => { folderIcon(c); lockIcon(c, 40, -20, 0.35, RED); } }),
      el('fn', tLoc + 0.1, null, { x: 830, y: 1480, draw: c => { folderIcon(c); lockIcon(c, 40, -20, 0.35, RED); } }),
      el('tag', tLoc + 0.3, tEx + 2, { str: '病历留在本地', x: 540, y: 1250, size: 40, bg: INK }),
      el('fn', tSum - 0.3, null, { x: 540, y: 720, draw: c => { cloudIcon(c); text(c, '汇总模型', 0, 10, 40, BROWN, { outline: false }); } }),
      el('fn', tSum, null, { x: 540, y: 560, noPop: true, draw: chipsUp }),
      el('tag', tEx, tLeak, { str: '交换的是训练产生的更新', x: 540, y: 900, size: 42, bg: G }),
      el('tag', tLeak, null, { str: '更新也可能泄露信息', x: 540, y: 900, size: 44, bg: RED }),
      el('fn', tProt, null, { x: 700, y: 640, draw: c => shieldIcon(c, BLUE) }),
      el('tag', tProt + 0.2, null, { str: '需要额外保护', x: 540, y: 1020, size: 42, bg: BLUE }),
    ]);
  }
  { at(18); const tMI = K('更重要的是'), tDec = K('自动决定'), tStudy = K('某项研究'), tCan = K('能不能算'), tTech = K('技术问题'), tLegal = K('合法依据'), tPur = K('用途是否适当'), tWhoU = K('结果由谁使用'), tRR = K('权利和责任问题');
    beat(BT[18], nx(18), [
      el('img', tMI, tCan, { n: 'c_doctor', x: 540, y: 1460, h: 520 }),
      el('tag', tMI + 0.4, tCan, { str: '技术降低了泄露风险', x: 540, y: 520, size: 44, bg: BLUE }),
      el('bubble', tDec, tCan, { str: '这些病历能用于研究吗？', x: 540, y: 740, size: 40 }),
      el('card', tCan, null, { x: 280, y: 820, w: 430, ht: 420, icon: chipIcon, ix: 0, iy: -100, lines: [['能不能算', 50, BROWN, 0, 30]], fn: (c, t) => { if (t > tTech) tag(c, '技术问题', 0, 130, 46, { bg: BLUE, s: popS(t, tTech) }); } }),
      el('text', tTech + 0.3, null, { str: '≠', x: 540, y: 820, size: 110, col: O }),
      el('card', tLegal, null, { x: 800, y: 820, w: 430, ht: 420, lines: [], fn: (c, t) => { [['合法依据？', tLegal], ['用途适当？', tPur], ['谁来使用？', tWhoU]].forEach(([s, tt], i) => { if (t > tt) text(c, s, 0, -130 + i * 80, 46, BROWN, { outline: false, s: popS(t, tt) }); }); if (t > tRR) tag(c, '权利和责任', 0, 130, 46, { bg: O, s: popS(t, tRR) }); } }),
      el('img', tRR, null, { n: 'c_doctor', x: 540, y: 1460, h: 380 }),
    ]);
  }
  { at(19); const tLay = K('还有一层'), tGive = K('交出它的人'), tPhoto = K('一张合照'), tOth = K('其他人的信息'), tExt = K('数据外部性'), tShare = K('分享决定'), tNon = K('没有参与'), tBoth = K('买卖双方都同意'), tAllAff = K('所有受影响者'), tRules = K('数据流通的规则'), tEasy = K('交易更容易'), tOut = K('交易之外的人'), tCostP = K('承担代价');
    const PH = { x: 540, y: 1320, h: 640 };
    const faces = (c, t) => { const im = L.IMG.c_photo, w = im.width * PH.h / im.height; const F = [[0.2, 0.33], [0.5, 0.31], [0.78, 0.33]]; F.forEach(([fx, fy], i) => { const x = -w / 2 + fx * w, y = -PH.h + fy * PH.h; if (i === 0) { const s = popS(t, tShare); if (s > 0) tag(c, '她分享了', x, y - 120, 36, { s, bg: G }); return; } const s = popS(t, tOth + i * 0.2); if (s <= 0) return; c.lineWidth = 8; c.strokeStyle = O; c.beginPath(); c.arc(x, y, 80 * s, 0, 7); c.stroke(); const s2 = popS(t, tNon + i * 0.2); if (s2 > 0) tag(c, '没参与', x + (i === 2 ? 20 : 0), y - 120, 36, { s: s2, bg: RED }); }); };
    beat(BT[19], nx(19), [
      el('text', tLay, tExt, { str: '一份数据，未必只涉及交出它的人', x: 540, y: 430, size: 50 }),
      el('img', tGive - 0.6, tPhoto, { n: 'c_girl', x: 540, y: 1440, h: 480 }),
      el('card', tGive, tPhoto, { x: 790, y: 1000, w: 230, ht: 150, icon: c => docIcon(c, O), ix: 0, iy: 0, is: 0.9 }),
      el('tag', tGive + 0.2, tPhoto, { str: '交出数据的人', x: 540, y: 880, size: 40, bg: INK }),
      el('img', tPhoto, tBoth, { n: 'c_photo', x: PH.x, y: PH.y, h: PH.h, rot: -0.03 }),
      el('fn', tOth, tBoth, { x: PH.x, y: PH.y, noPop: true, draw: faces }),
      el('stamp', tExt, tBoth, { str: '数据外部性', x: 540, y: 470, size: 72, col: O }),
      el('img', tBoth, tRules, { n: 'c_engineer', x: 220, y: 1440, h: 420, label: '卖方 ✓', ly: 1010, lbg: G }),
      el('img', tBoth + 0.2, tRules, { n: 'c_merchant', x: 860, y: 1440, h: 420, label: '买方 ✓', ly: 1010, lbg: G }),
      el('img', tAllAff, tRules, { n: 'c_girl', x: 540, y: 1460, h: 330, label: '受影响的人？', ly: 1100, lbg: RED }),
      el('tag', tBoth + 0.4, tRules, { str: '买卖双方都同意', x: 540, y: 700, size: 50, bg: G }),
      el('tag', tAllAff, tRules, { str: '≠ 考虑了所有人', x: 540, y: 830, size: 50, bg: RED }),
      el('text', tRules, null, { str: '数据流通的规则', x: 540, y: 560, size: 66 }),
      el('tag', tEasy, null, { str: '不只为了交易更容易', x: 540, y: 740, size: 50, bg: GREY }),
      el('stamp', tOut, null, { str: '防止局外人', x: 540, y: 950, size: 70, col: O }),
      el('stamp', tCostP, null, { str: '替别人承担代价', x: 540, y: 1130, size: 70, col: RED, shake: 8 }),
    ]);
  }
  // ================= 第六章 =================
  chapter('六', '数据可以复用，', '支撑它的资源真实有限', '资源有限', chT(5));
  { at(20); const tCP = K('还需要算力'), tSt = K('存储要设备'), tTr = K('传输要网络'), tCo = K('计算要芯片'), tPw = K('电力和散热'), tCloud = K('在云端'), tGround = K('在地上');
    const tile = (tt, x, y, a, b, icon) => el('card', tt, null, { x, y, w: 420, ht: 210, icon, ix: -130, lines: [[a, 44, GREY, 60, -32], [b, 50, BROWN, 60, 32]] });
    beat(BT[20], nx(20), [
      el('stamp', tCP, null, { str: '还需要算力', x: 540, y: 430, size: 70, col: O }),
      tile(tSt, 290, 650, '存储', '要设备', c => img(c, 'c_server', 0, 60, 120)),
      tile(tTr, 790, 650, '传输', '要网络', netIcon),
      tile(tCo, 290, 900, '计算', '要芯片', chipIcon),
      tile(tPw, 790, 900, '运行', '电力散热', (c, t) => { c.save(); c.translate(-25, 0); boltIcon(c); c.restore(); c.save(); c.translate(35, 0); c.scale(0.8, 0.8); fanIcon(c, t); c.restore(); }),
      el('fn', tCloud, null, { x: 300, y: 1170, draw: c => { c.save(); c.scale(0.8, 0.8); cloudIcon(c); c.restore(); text(c, '云端', 0, 5, 40, BLUE, { outline: false }); } }),
      el('line', tCloud + 0.4, null, { a: [380, 1210], b: [640, 1330], col: BLUE }),
      el('img', tGround - 0.4, null, { n: 'c_server', x: 760, y: 1470, h: 330 }),
      el('tag', tGround, null, { str: '机器实实在在在地上', x: 680, y: 1100, size: 40, bg: INK }),
    ]);
  }
  { at(21); const tDS = K('东数西算'), tNot = K('搬去西部'), tReq = K('根据任务'), f1 = K('时延'), f2 = K('带宽'), f3 = K('能源'), f4 = K('成本'), tOpt = K('优化资源布局'), tBk = K('存储备份'), tOff = K('离线计算'), tFlex = K('跨区域安排'), tFast = K('响应速度'), tNear = K('就近处理'), tPrice = K('一度电的价格'), tWhole = K('整项任务的成本');
    const zone = (x, lab, inner) => el('fn', tDS + 0.2, tPrice, { x, y: 790, draw: (c, t) => { c.lineWidth = 6; c.strokeStyle = INK; c.setLineDash([16, 10]); rr(c, -230, -230, 460, 440, 24); c.fillStyle = 'rgba(255,253,246,0.7)'; c.fill(); c.stroke(); c.setLineDash([]); tag(c, lab, 0, -230, 44, { bg: O }); inner(c, t); } });
    beat(BT[21], nx(21), [
      el('stamp', tDS, null, { str: '东数西算', x: 540, y: 430, size: 76, col: O }),
      zone(280, '西部', c => img(c, 'c_energy', 0, 170, 300)),
      zone(800, '东部', c => { c.save(); c.translate(0, 40); c.scale(1.2, 1.2); skyline(c); c.restore(); }),
      el('tag', tNot, tReq, { str: '≠ 把全国数据搬去西部', x: 540, y: 1100, size: 48, bg: RED }),
      ...[['时延', f1], ['带宽', f2], ['能源', f3], ['成本', f4]].map(([s, tt], i) => el('tag', tt, tBk, { str: s, x: 220 + i * 213, y: 1110, size: 48, bg: [BLUE, G, '#F4A62A', RED][i] })),
      el('tag', tOpt, tBk, { str: '按任务优化资源布局', x: 540, y: 1240, size: 46, bg: INK }),
      el('tag', tBk, tPrice, { str: '存储备份', x: 280, y: 1100, size: 42, bg: G }),
      el('tag', tOff, tPrice, { str: '离线计算', x: 280, y: 1190, size: 42, bg: G }),
      el('arrow', tFlex, tPrice, { a: [680, 640], b: [400, 640], bend: 0.25, col: BLUE }),
      el('tag', tFlex + 0.3, tPrice, { str: '可跨区域', x: 540, y: 560, size: 36, bg: BLUE }),
      el('tag', tFast, tPrice, { str: '高响应业务', x: 800, y: 1100, size: 42, bg: RED }),
      el('tag', tNear, tPrice, { str: '就近处理', x: 800, y: 1190, size: 42, bg: RED }),
      el('img', tPrice, null, { n: 'c_scale', x: 540, y: 1470, h: 420 }),
      el('tag', tPrice + 0.2, null, { str: '只看一度电价格', x: 300, y: 860, size: 44, bg: GREY, strike: tWhole, sw: 300 }),
      el('tag', tWhole, null, { str: '整项任务的成本和效果', x: 620, y: 1000, size: 46, bg: O }),
    ]);
  }
  { at(22); const tExh = K('就耗尽'), tE = K('所需的电'), tDev = K('设备和时间'), tAir = K('凭空出现');
    beat(BT[22], nx(22), [
      el('img', BT[22] + 0.2, null, { n: 'c_cube', x: 280, y: 1150, h: 360, wob: true }),
      el('tag', tExh, null, { str: '分析一次不会耗尽', x: 280, y: 700, size: 40, bg: G }),
      el('card', tE, null, { x: 790, y: 600, w: 340, ht: 190, icon: boltIcon, ix: -100, lines: [['电', 60, BROWN, 50, 0]] }),
      el('card', tDev, null, { x: 790, y: 840, w: 340, ht: 190, icon: c => img(c, 'c_server', 0, 55, 110), ix: -100, lines: [['设备', 56, BROWN, 50, 0]] }),
      el('card', tDev + 0.4, null, { x: 790, y: 1080, w: 340, ht: 190, icon: hourIcon, ix: -100, lines: [['时间', 56, BROWN, 50, 0]] }),
      el('stamp', tAir, null, { str: '不会凭空出现', x: 540, y: 1360, size: 72, col: RED }),
    ]);
  }
  // ================= 第七章 =================
  chapter('七', '最后，谁获得收益，', '谁承担风险？', '收益与风险', chT(6));
  { at(23); const tBack = K('回头看'), j1 = K('能用'), j2 = K('能流'), j3 = K('能算'), tMot = K('谁有动力'), tCol = K('采集整理的人'), tRet = K('合理回报'), tKn = K('提供知识'), tRet2 = K('也需要合理回报');
    const road = (c, t) => { c.lineWidth = 34; c.strokeStyle = '#E9DCC3'; c.beginPath(); c.moveTo(-430, 30); c.bezierCurveTo(-200, -60, 200, 120, 430, 0); c.stroke(); c.lineWidth = 4; c.setLineDash([14, 12]); c.strokeStyle = '#B9A584'; c.stroke(); c.setLineDash([]); [['能用', j1, -320, 0], ['能流', j2, 0, 30], ['能算', j3, 320, 30]].forEach(([s, tt, x, y]) => { const k = popS(t, tt); if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.beginPath(); c.arc(0, 0, 70, 0, 7); c.fillStyle = O; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); text(c, s, 0, 2, 40, '#FFF', { outline: false }); c.restore(); }); };
    const coins = (t0, x) => el('fn', t0, null, { x, y: 1000, noPop: true, draw: (c, t) => { for (let k = 0; k < 3; k++) { const tt = t0 + k * 0.15; if (t < tt) continue; const f = eo(lin(t, tt, tt + 0.5)); c.save(); c.translate((k - 1) * 70, lerp(-200, 0, f)); coinSym(c); c.restore(); } } });
    beat(BT[23], nx(23), [
      el('fn', tBack, null, { x: 540, y: 560, noPop: true, draw: road }),
      el('text', tBack, j1, { str: '回头看', x: 540, y: 420, size: 56 }),
      el('text', tMot, null, { str: '谁有动力让它持续？', x: 540, y: 790, size: 66, col: O }),
      el('img', tCol, null, { n: 'c_manager', x: 260, y: 1460, h: 420, label: '采集整理的人', ly: 1500 }),
      coins(tRet, 260),
      el('img', tKn, null, { n: 'c_engineer', x: 820, y: 1460, h: 420, label: '提供知识和加工', ly: 1500 }),
      coins(tRet2, 820),
      el('tag', tRet2 + 0.4, null, { str: '都需要合理回报', x: 540, y: 920, size: 46, bg: G }),
    ]);
  }
  { at(24); const tPr = K('提出的原则'), w1 = K('谁投入'), w2 = K('谁贡献'), w3 = K('谁受益'), tForm = K('分账公式'), tHow = K('谁贡献了多少'), tVal = K('产生了什么价值'), tNeg = K('具体评价和协商'), tMean = K('与此同时'), tGain = K('收益归了交易双方'), tRisk = K('风险却留给个人'), tOther = K('其他企业或社会');
    beat(BT[24], nx(24), [
      el('tag', tPr - 0.6, null, { str: '数据二十条 · 原则', x: 540, y: 410, size: 44, bg: INK }),
      el('stamp', w1, null, { str: '谁投入', x: 220, y: 560, size: 58, col: BLUE, rot: -0.08 }),
      el('stamp', w2, null, { str: '谁贡献', x: 540, y: 560, size: 58, col: G, rot: 0.05 }),
      el('stamp', w3, null, { str: '谁受益', x: 860, y: 560, size: 58, col: O, rot: -0.04 }),
      el('fn', tForm, tMean, { x: 260, y: 820, draw: c => { c.save(); c.scale(1.4, 1.4); calcIcon(c); c.restore(); } }),
      el('cross', tForm + 0.4, tMean, { x: 260, y: 820, sc: 1.0 }),
      el('tag', tForm + 0.2, tMean, { str: '不是现成的分账公式', x: 680, y: 820, size: 42, bg: GREY }),
      el('tag', tHow, tMean, { str: '谁贡献了多少？', x: 540, y: 1030, size: 46, bg: BLUE }),
      el('tag', tVal, tMean, { str: '产生了什么价值？', x: 540, y: 1140, size: 46, bg: BLUE }),
      el('stamp', tNeg, tMean, { str: '具体评价 + 协商', x: 540, y: 1300, size: 62, col: O }),
      el('img', tMean, null, { n: 'c_scale', x: 540, y: 1460, h: 560, rot: 0.0 }),
      el('tag', tGain, null, { str: '收益 → 交易双方', x: 300, y: 900, size: 44, bg: G }),
      el('tag', tRisk, null, { str: '风险 → 个人', x: 790, y: 1000, size: 44, bg: RED }),
      el('tag', tOther, null, { str: '其他企业 · 社会', x: 790, y: 1100, size: 40, bg: RED }),
      el('stamp', tOther + 0.9, null, { str: '不能这样', x: 540, y: 760, size: 72, col: RED, shake: 8 }),
    ]);
  }
  { at(25); const tEval = K('评价这家新央企'), tAgg = K('汇聚了多少数据'), tDeal = K('成交了多少钱'), tAlso = K('还要看'), q1 = K('改善了生产和服务'), q2 = K('跨机构合作的成本'), q3 = K('更多企业有机会'), q4 = K('说得更清楚');
    const items = [['改善生产和服务', q1], ['降低跨机构合作成本', q2], ['更多企业用上合适数据', q3], ['用途、责任、个人权益更清楚', q4]];
    beat(BT[25], nx(25), [
      el('text', tEval, null, { str: '怎么评价？', x: 540, y: 420, size: 66, col: O }),
      el('tag', tAgg - 0.5, tAlso + 0.3, { str: '不能只看', x: 540, y: 540, size: 42, bg: INK }),
      el('tag', tAgg, null, { str: '汇聚多少数据', x: 300, y: 650, size: 44, bg: GREY, strike: tAlso, sw: 280 }),
      el('tag', tDeal, null, { str: '成交多少钱', x: 790, y: 650, size: 44, bg: GREY, strike: tAlso + 0.2, sw: 240 }),
      el('card', tAlso, null, { x: 540, y: 1060, w: 900, ht: 560, lines: [['还要看', 52, O, 0, -220]], fn: (c, t) => items.forEach(([s, tt], i) => { const y = -120 + i * 100; c.lineWidth = 5; c.strokeStyle = INK; rr(c, -400, y - 26, 52, 52, 8); c.fillStyle = '#FFF'; c.fill(); c.stroke(); if (t > tt) { check(c, -374, y, 0.6, G, lin(t, tt, tt + 0.3)); text(c, s, -320, y, 44, BROWN, { outline: false, align: 'left', s: 1 }); } }) }),
    ]);
  }
  { at(26); const tFac = K('生产要素'), tGoods = K('变成商品'), tPeople = K('产生数据的人'), tMine = K('无限开采'), tExp = K('真正值得期待'), tWhere = K('集中到了哪里'), tCo = K('合理的合作'), tVal = K('更多价值'), tBound = K('边界'), tHold = K('守得住');
    beat(BT[26], nx(26), [
      el('tag', tFac, tExp, { str: '数据 = 生产要素', x: 540, y: 430, size: 52, bg: O }),
      el('tag', tGoods, tExp, { str: '≠ 所有数据都变成商品', x: 540, y: 560, size: 48, bg: RED }),
      el('img', tPeople, tExp, { n: 'c_girl', x: 300, y: 1460, h: 520 }),
      el('tag', tMine, tExp, { str: '人不是无限开采的资源', x: 640, y: 900, size: 44, bg: RED }),
      el('text', tExp, null, { str: '真正值得期待的', x: 540, y: 420, size: 64 }),
      el('tag', tWhere, null, { str: '不是数据集中到哪里', x: 540, y: 540, size: 46, bg: GREY, strike: tCo - 0.3, sw: 420 }),
      el('img', tCo, null, { n: 'c_engineer', x: 210, y: 1460, h: 430 }),
      el('img', tCo + 0.15, null, { n: 'c_manager', x: 540, y: 1460, h: 410 }),
      el('img', tCo + 0.3, null, { n: 'c_repair', x: 870, y: 1460, h: 440 }),
      el('tag', tCo + 0.2, null, { str: '更多合理合作发生', x: 540, y: 680, size: 48, bg: G }),
      el('tag', tVal, null, { str: '更多价值被创造', x: 540, y: 790, size: 48, bg: BLUE }),
      el('fn', tBound, null, { x: 540, y: 1260, noPop: true, draw: (c, t) => { const pts = []; for (let k = 0; k <= 60; k++) { const a = Math.PI + k / 60 * Math.PI * 2; pts.push([500 * Math.cos(a), 280 * Math.sin(a)]); } stroke(c, pts, sp(t, tBound, 1.0), { color: O, w: 10, dash: [24, 16], amp: 1.5, pen: false }); } }),
      el('stamp', tHold, null, { str: '边界守得住', x: 540, y: 920, size: 76, col: O }),
    ]);
  }
  // ---------- 结尾 ----------
  { at(27); const tOut = K('一无所知');
    beat(BT[27], TOTAL + 1, [
      el('fn', BT[27], null, { x: 540, y: 900, noPop: true, draw: (c, t) => burst(c, 0, 0, 1000, t, { color: 'rgba(239,114,38,0.14)', spin: 0.25 }) }),
      el('text', BT[27] + 0.1, null, { str: '这里是', x: 540, y: 480, size: 56 }),
      el('text', BT[27] + 0.3, null, { str: '苏格拉没有底', x: 540, y: 600, size: 110, col: O }),
      el('img', BT[27] + 0.5, null, { n: 'c_cube', x: 540, y: 1260, h: 420, wob: true }),
      el('text', tOut, null, { str: '一无所知，所以好奇', x: 540, y: 780, size: 66 }),
    ], { tr: 'zoom' });
  }
}
// ---------- frame ----------
let penPos = null;
function frame(ctx, t, seq) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper, 0, 0); PEN.req = null;
  const [sx, sy] = shakeAt(t); ctx.save(); ctx.translate(sx, sy);
  const iris = SC.find(s => s.iris && t >= s.from && t < s.to); let irisR = null, ik = 0;
  if (iris) { ik = (t - iris.from) / (iris.to - iris.from); const I = iris.iris; irisR = ik < 0.5 ? { x: I.x0, y: I.y0, r: lerp(1500, 0, eio(ik * 2)) } : { x: I.x1, y: I.y1, r: lerp(0, 1500, eio((ik - 0.5) * 2)) }; }
  const ORD = SC.filter(s => !s.top).concat(SC.filter(s => s.top));
  for (const s of ORD) {
    if (!s.fn || t < s.from || t >= s.to) continue;
    if (irisR) { const isIn = s.from >= iris.from; if (ik < 0.5 && isIn) continue; if (ik >= 0.5 && !isIn) continue;
      ctx.save(); ctx.beginPath(); ctx.arc(irisR.x, irisR.y, Math.max(irisR.r, 0.1), 0, 7); ctx.clip(); s.fn(ctx, t); ctx.restore(); }
    else s.fn(ctx, t);
  }
  if (irisR) { ctx.save(); ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(irisR.x, irisR.y, Math.max(irisR.r, 0.1), 0, 7); ctx.stroke(); ctx.restore(); }
  ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  hud(ctx, t);
  if (PEN.req) { if (!seq || !penPos) penPos = { x: PEN.req.x, y: PEN.req.y }; else { penPos.x += (PEN.req.x - penPos.x) * 0.55; penPos.y += (PEN.req.y - penPos.y) * 0.55; } drawPen(ctx, penPos.x, penPos.y, PEN.req.color, true, -52); } else penPos = null;
}

function drawCover(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper, 0, 0);
  burst(ctx, 540, 1060, 1100, 0, { color: 'rgba(239,114,38,0.13)' });
  textSegs(ctx, [['数据', O], ['已经这么多，', BROWN]], 540, 330, 100);
  textSegs(ctx, [['为什么还要', BROWN], ['成立', BROWN]], 540, 460, 100);
  textSegs(ctx, [['一家', BROWN], ['央企', O], ['？', BROWN]], 540, 590, 116);
  tag(ctx, '国家数据集团来了 · 看懂数据经济', 540, 720, 46, { bg: O });
  // scene: HQ + trio + cubes
  ctx.save(); ctx.fillStyle = 'rgba(160,130,90,0.18)'; ctx.beginPath(); ctx.ellipse(540, 1406, 500, 36, 0, 0, 7); ctx.fill(); ctx.restore();
  img(ctx, 'c_hq', 540, 1180, 400);
  { const im = L.IMG.c_hq, w = im.width * 400 / im.height; text(ctx, '国家数据集团', 540 - w / 2 + HQ.cx * w, 1180 - 400 + HQ.cy * 400 + 2, Math.floor(HQ.w * w / 6.2), RED, { outline: false }); }
  img(ctx, 'c_engineer', 210, 1410, 470); img(ctx, 'c_manager', 870, 1410, 450);
  img(ctx, 'c_repair', 560, 1420, 300);
  [[380, 1400, -0.2], [440, 1330, 0.1], [700, 1405, 0.15], [330, 1260, 0.3]].forEach(([x, y, r]) => img(ctx, 'c_cube', x, y, 95, { rot: r }));
  ctx.save(); ctx.translate(930, 860); ctx.rotate(0.15); text(ctx, '？', 0, 0, 200, O); ctx.restore();
  text(ctx, '缺的不只是数据', 540, 1520, 66, O);
  text(ctx, '能合作 · 愿合作 · 有边界', 540, 1610, 54, BROWN);
  text(ctx, '@苏格拉没有底', 540, 1800, 40, '#9A8C7A', { outline: false });
}
async function main() {
  await L.loadAll(); buildPaper(); defineScenes();
  const mode = process.argv[2]; const cv = L.createCanvas(W, H); const ctx = cv.getContext('2d');
  fs.writeFileSync(__dirname + '/events.json', JSON.stringify({ ev: EV, total: TOTAL, lead: LEAD, gap: 0, cuts: [], fadeStart: TOTAL - 1.5 }));
  if (mode === 'info') { console.log('total', TOTAL.toFixed(2)); for (let i = 1; i <= NS; i++) console.log(i, s0(i).toFixed(2), s1(i).toFixed(2)); return; }
  if (mode === 'sheet') { const step = parseFloat(process.argv[3] || '2'); const from = parseFloat(process.argv[4] || '0'), to = parseFloat(process.argv[5] || TOTAL);
    const ts = []; for (let t = from; t < to; t += step) ts.push(t);
    const cols = 6, tw_ = 270, th = 480; const sh = L.createCanvas(cols * tw_, Math.ceil(ts.length / cols) * (th + 30)); const sx = sh.getContext('2d'); sx.fillStyle = '#888'; sx.fillRect(0, 0, sh.width, sh.height);
    for (let i = 0; i < ts.length; i++) { frame(ctx, ts[i], false); sx.drawImage(cv, (i % cols) * tw_, Math.floor(i / cols) * (th + 30), tw_, th); sx.fillStyle = '#fff'; sx.font = '22px WK'; sx.fillText(ts[i].toFixed(1), (i % cols) * tw_ + 8, Math.floor(i / cols) * (th + 30) + th + 24); }
    fs.writeFileSync(process.argv[6] || __dirname + '/sheet.png', await sh.encode('png')); return; }
  if (mode === 'cover') { drawCover(ctx); fs.writeFileSync(__dirname + '/国家数据集团_封面.png', await cv.encode('png')); return; }
  if (mode === 'still') { fs.mkdirSync(__dirname + '/stills', { recursive: true }); for (const ts of process.argv.slice(3)) { const t = parseFloat(ts); frame(ctx, t, false); fs.writeFileSync(`${__dirname}/stills/t${t.toFixed(2)}.png`, await cv.encode('png')); } return; }
  const out = process.argv[3] || '/tmp/data_noaudio.mp4';
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(TOTAL * FPS); const t0 = Date.now(); const fa = Math.round(parseFloat(process.argv[4] || 0) * FPS), fb = process.argv[5] ? Math.min(N, Math.round(parseFloat(process.argv[5]) * FPS)) : N;
  for (let i = fa; i < fb; i++) { frame(ctx, i / FPS, true); if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise(r => ff.stdin.once('drain', r)); if (i % 300 === 0) console.error(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.error('done');
}
main().catch(e => { console.error(e); process.exit(1); });
