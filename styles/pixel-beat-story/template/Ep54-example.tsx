import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont as loadSans} from '@remotion/google-fonts/NotoSansSC';
import {loadFont as loadSerif} from '@remotion/google-fonts/NotoSerifSC';

loadSans('normal', {weights: ['400', '700', '900'], subsets: ['chinese-simplified', 'latin'], ignoreTooManyRequestsWarning: true});
loadSerif('normal', {weights: ['400', '700', '900'], subsets: ['chinese-simplified', 'latin'], ignoreTooManyRequestsWarning: true});

/**
 * ep54 他不是来自星星 —— 第一幕样片（0–70.5s），4:3 1440×1080，像素暖光，无口播。
 * 卡点：配乐 ep53-bgm.wav 实测一拍 0.532s，两小节（8 拍）乐句 4.256s，乐句线 PH(m) = 25.47 + 4.256m。
 * 场景硬切都落在乐句线上，文字/星点/计数落在拍上。20.96s 是全曲第一个强进（drop）。
 */
export const FPS = 30;
export const W = 1440;
export const H = 1080;
export const DURATION_ACT1 = Math.round(70.5 * FPS);
const s = (t: number) => Math.round(t * FPS);

/* 节拍网格 */
const B = 0.532;
const PH = (m: number) => 25.47 + 4.256 * m; // m=-5→4.19 … m=10→68.03
const bt = (m: number, k: number) => PH(m) + k * B;
/** 自 t0 起每拍一次的冲击（0..1，拍上=1 后衰减） */
const pulse = (f: number, t0: number, n = 999, dec = 0.28) => {
  const t = f / FPS - t0;
  if (t < 0) return 0;
  const k = Math.floor(t / B);
  if (k >= n) return 0;
  const ph = t - k * B;
  return Math.max(0, 1 - ph / dec);
};

const SANS = "'Noto Sans SC', sans-serif";
const SERIF = "'Noto Serif SC', serif";
const COL = {an: '#ffb35c', mom: '#f4efe6', star: '#8fc8ff', gold: '#f3c77a', dim: 'rgba(244,239,230,0.55)', other: '#e08a8a'};
const WHO: Record<string, {name: string; color: string}> = {
  an: {name: '安安', color: COL.an},
  mom: {name: '妈妈', color: COL.mom},
  star: {name: '小星', color: COL.star},
  girl: {name: '邻居小孩', color: COL.other},
  po: {name: '外婆', color: '#d9c7a6'},
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (f: number, a: number, d = 0.5) => clamp((f - s(a)) / s(d));
const win = (f: number, a: number, b: number, fi = 0.5, fo = 0.5) => (f < s(a) || f >= s(b) ? 0 : Math.min(ramp(f, a, fi), 1 - ramp(f, b - fo, fo)));
const typed = (text: string, f: number, at: number, cps = 14) => {
  const n = Math.max(0, Math.floor(((f - s(at)) / FPS) * cps));
  return [Array.from(text).slice(0, n).join(''), n < Array.from(text).length] as const;
};
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 拍上弹入：缩放 1.25→1 */
const popIn = (f: number, at: number) => {
  const p = ramp(f, at, 0.22);
  return {opacity: p, transform: `scale(${1 + 0.25 * (1 - p) * (p > 0 ? 1 : 0)})`};
};

/* ───────── 房间 ───────── */
const ROOM_K = 1440 / 1024;
const ROOM_TOP = -150 * ROOM_K;
const rx = (x: number) => x * ROOM_K;
const ry = (y: number) => y * ROOM_K + ROOM_TOP;
const PLUSH = {x: 634, bottom: 686, h: 86};
const GLOW = {x: 634, y: 650};
// 窗外 7 颗星（房间原图坐标），第 0 颗最亮：楼顶上面，左边
const SKY: [number, number, number][] = [
  [648, 492, 1.5],
  [700, 330, 0.9],
  [808, 262, 1],
  [884, 352, 0.85],
  [912, 236, 0.8],
  [786, 430, 0.95],
  [616, 282, 0.8],
];

const Star5: React.FC<{x: number; y: number; r: number; o: number; color?: string; glow?: number}> = ({x, y, r, o, color = '#fff6d8', glow = 1}) => (
  <g opacity={o} transform={`translate(${x},${y})`}>
    <circle r={r * 3.2} fill={color} opacity={0.12 * glow} />
    <rect x={-r * 0.35} y={-r * 1.6} width={r * 0.7} height={r * 3.2} fill={color} opacity={0.75} />
    <rect x={-r * 1.6} y={-r * 0.35} width={r * 3.2} height={r * 0.7} fill={color} opacity={0.75} />
    <rect x={-r * 0.6} y={-r * 0.6} width={r * 1.2} height={r * 1.2} fill={color} />
  </g>
);

/** 窗外星星：n 颗可见，appear[i] 为第 i 颗出现时间 */
const SkyStars: React.FC<{f: number; n?: number; appear?: number[]; glint?: number}> = ({f, n = 7, appear, glint = 0}) => (
  <svg width={1440} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
    {SKY.slice(0, n).map(([x, y, k], i) => {
      const a = appear ? ramp(f, appear[i], 0.18) : 1;
      if (a <= 0) return null;
      const tw = 0.8 + 0.2 * Math.sin(f / 9 + i * 1.7);
      const pop = appear ? 1 + 0.9 * Math.max(0, 1 - (f - s(appear[i])) / 8) : 1;
      const g = i === 0 ? 1 + glint * 0.45 : 1;
      return <Star5 key={i} x={rx(x)} y={ry(y)} r={4.2 * k * pop * g} o={a * tw} glow={i === 0 ? 1.5 + glint * 1.5 : 1} />;
    })}
  </svg>
);

type RoomProps = {f: number; glow: number; dark: number; warm?: number; stars?: React.ReactNode; children?: React.ReactNode};
const Room: React.FC<RoomProps> = ({f, glow, dark, warm = 0, stars, children}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#0b0d18'}}>
    <Img src={staticFile('ep54/room.png')} style={{position: 'absolute', left: 0, top: ROOM_TOP, width: 1440, height: 1440, imageRendering: 'pixelated'}} />
    {children}
    <AbsoluteFill style={{background: `rgba(255,170,90,${0.04 * glow + 0.06 * warm})`, mixBlendMode: 'soft-light'}} />
    <AbsoluteFill style={{background: `rgba(6,9,24,${dark})`}} />
    {/* 小星的光：冷暖之间的淡金，压在夜色之上 */}
    <AbsoluteFill style={{opacity: glow, mixBlendMode: 'screen', background: `radial-gradient(circle 380px at ${GLOW.x}px ${GLOW.y}px, rgba(255,226,150,0.5), rgba(170,200,255,0.14) 45%, transparent 75%)`}} />
    <Plush glow={glow} f={f} />
    {stars}
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,5,12,0.88) 0%, rgba(4,5,12,0.5) 22%, transparent 40%)'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 50% 55%, transparent 60%, rgba(0,0,0,0.55) 100%)'}} />
  </AbsoluteFill>
);

/** 星星玩偶：glow 0..1 亮度 */
const Plush: React.FC<{glow: number; f: number}> = ({glow}) => {
  const w = (PLUSH.h * 706) / 684;
  return (
    <>
      <div style={{position: 'absolute', left: PLUSH.x - 60, top: PLUSH.bottom - PLUSH.h / 2 - 50, width: 120, height: 100, borderRadius: 60, background: `rgba(255,230,150,${0.55 * glow})`, filter: 'blur(22px)'}} />
      <Img
        src={staticFile('ep54/star.png')}
        style={{position: 'absolute', left: PLUSH.x - w / 2, top: PLUSH.bottom - PLUSH.h, width: w, height: PLUSH.h, imageRendering: 'pixelated', filter: `brightness(${0.45 + 0.75 * glow}) saturate(${0.6 + 0.4 * glow})`}}
      />
    </>
  );
};

/* ───────── 角色（复用 ep53 精灵） ───────── */
const SPR: Record<string, {w: number; h: number}> = {
  boy_sit: {w: 484, h: 774},
  boy_curl: {w: 506, h: 768},
  boy_stand: {w: 370, h: 802},
  mom_stand: {w: 336, h: 814},
  mom_sit: {w: 382, h: 785},
};
const Sprite: React.FC<{name: string; x: number; bottom: number; height: number; flip?: boolean; o?: number; tint?: number}> = ({name, x, bottom, height, flip, o = 1, tint = 0}) => {
  const k = height / SPR[name].h;
  const w = SPR[name].w * k;
  return (
    <Img
      src={staticFile(`ep53/${name}.png`)}
      style={{position: 'absolute', left: x - w / 2, top: bottom - height, width: w, height, opacity: o, transform: flip ? 'scaleX(-1)' : undefined, filter: tint ? `brightness(${1 - tint * 0.55}) saturate(${1 - tint * 0.4})` : undefined}}
    />
  );
};

/* ───────── HUD ───────── */
const Hud: React.FC<{left: string; right?: React.ReactNode; pill?: React.ReactNode; o?: number}> = ({left, right, pill, o = 1}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 70, opacity: o}}>
    <div style={{position: 'absolute', left: 48, top: 26, fontFamily: SANS, fontSize: 24, color: COL.dim, letterSpacing: 1}}>{left}</div>
    <div style={{position: 'absolute', right: 48, top: 22, fontFamily: SANS, fontSize: 24, color: COL.dim, textAlign: 'right'}}>{right}</div>
    {pill && (
      <div style={{position: 'absolute', left: '50%', top: 74, transform: 'translateX(-50%)', fontFamily: SANS, fontSize: 20, color: COL.dim, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '4px 16px', background: 'rgba(0,0,0,0.35)', whiteSpace: 'nowrap'}}>
        {pill}
      </div>
    )}
  </div>
);
const Counter: React.FC<{n: number}> = ({n}) => (
  <span>
    对妈妈说的话 <b style={{color: n > 0 ? COL.an : COL.mom, fontSize: 30}}>{n}</b>
  </span>
);

/* ───────── 对话气泡 ───────── */
type Line = {who: keyof typeof WHO; text: string; at: number; fade?: number; cps?: number};
const Dialogue: React.FC<{f: number; lines: Line[]; top?: number; left?: number; size?: number; width?: number}> = ({f, lines, top = 120, left = 80, size = 40, width = 1180}) => {
  const fs = Math.max(size, 38);
  // 只排最近三句，旧句不占位
  const shown = lines.filter((l) => f >= s(l.at) && (l.fade === undefined || f < s(l.fade + 0.6))).slice(-3);
  return (
    <div style={{position: 'absolute', left, top, width}}>
      {shown.map((l) => {
        const [t, typing] = typed(l.text, f, l.at, l.cps ?? 13);
        const fade = l.fade !== undefined ? 1 - ramp(f, l.fade, 0.6) : 1;
        const age = shown.length - 1 - shown.indexOf(l);
        const p = ramp(f, l.at, 0.18);
        const c = WHO[l.who].color;
        return (
          <div key={l.at + l.text} style={{marginBottom: 16, opacity: (1 - age * 0.22) * fade * p, transform: `translateY(${(1 - p) * 14}px)`}}>
            <div style={{display: 'inline-block', maxWidth: width, padding: '12px 26px 14px 22px', borderRadius: 18, background: 'rgba(8,9,14,0.66)', borderLeft: `5px solid ${c}`, boxShadow: '0 8px 24px rgba(0,0,0,0.35)'}}>
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 21, color: c, opacity: 0.75, letterSpacing: 2, marginBottom: 4}}>{WHO[l.who].name}</div>
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: fs, color: c, lineHeight: 1.42, letterSpacing: 1}}>
                {t}
                {typing || (l.text === '' && Math.floor(f / 12) % 2 === 0) ? <span style={{display: 'inline-block', width: 4, height: fs * 0.9, background: c, marginLeft: 6, verticalAlign: 'middle', opacity: Math.floor(f / 8) % 2 ? 1 : 0.3}} /> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Narr: React.FC<{f: number; a: number; b: number; children: React.ReactNode; y?: number; size?: number}> = ({f, a, b, children, y = 300, size = 48}) => {
  const o = win(f, a, b, 0.25, 0.4);
  if (o <= 0) return null;
  const p = ramp(f, a, 0.3);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity: o, transform: `scale(${1.06 - 0.06 * p})`, fontFamily: SERIF, fontWeight: 700, fontSize: Math.max(size, 44), color: COL.mom, letterSpacing: 3, lineHeight: 1.5, textShadow: '0 2px 16px rgba(0,0,0,0.85)'}}>
      <span style={{display: 'inline-block', padding: '10px 36px', borderRadius: 16, background: 'radial-gradient(ellipse at center, rgba(5,5,8,0.62), rgba(5,5,8,0.35) 70%, transparent)'}}>{children}</span>
    </div>
  );
};
const G: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: COL.gold}}>{children}</span>;
const Black: React.FC<{o?: number; children?: React.ReactNode}> = ({o = 1, children}) => <AbsoluteFill style={{background: '#050507', opacity: o}}>{children}</AbsoluteFill>;
/** 场景硬切：[a,b) 内可见，开头 2 帧闪白 */
const Cut: React.FC<{f: number; a: number; b: number; children: React.ReactNode; flash?: boolean}> = ({f, a, b, children, flash = true}) => {
  if (f < s(a) || f >= s(b)) return null;
  const fl = flash ? Math.max(0, 1 - (f - s(a)) / 5) : 0;
  return (
    <AbsoluteFill>
      {children}
      {fl > 0 && <AbsoluteFill style={{background: `rgba(255,248,230,${0.35 * fl})`}} />}
    </AbsoluteFill>
  );
};

/* ───────── 1. 钩子 0 – 12.71：星海 ───────── */
const FIELD = new Array(1368).fill(0).map((_, i) => {
  // 一条斜向的银河带
  const u = rnd(i);
  const v = (rnd(i + 2000) + rnd(i + 4000) + rnd(i + 6000)) / 3 - 0.5;
  const x = 80 + u * 1280;
  const y = 760 - u * 260 + v * 380;
  return {x, y, r: 1.2 + rnd(i + 9) * 2.2, order: rnd(i + 77)};
});
const MOMSTAR = {x: 1250, y: 980};
const Hook: React.FC<{f: number}> = ({f}) => {
  if (f >= s(PH(-3))) return null;
  // 4.19 → 8.45 共 8 拍，每拍点亮一批
  const t0 = PH(-5);
  const tt = f / FPS - t0;
  const k = Math.floor(tt / B);
  const frac = clamp((tt - k * B) / 0.14);
  const prog = tt < 0 ? 0 : k >= 8 ? 1 : clamp((k + frac) / 8);
  const lit = Math.floor(prog * 1368);
  const thr = prog;
  const pu = pulse(f, t0, 8);
  const momOn = f >= s(PH(-4));
  return (
    <Black o={1 - ramp(f, PH(-3) - 0.35, 0.35)}>
      <svg width={1440} height={1080} style={{position: 'absolute'}}>
        {FIELD.map((p, i) => {
          const on = p.order < thr;
          return <circle key={i} cx={p.x} cy={p.y} r={on ? p.r * (1 + 0.35 * pu) : p.r * 0.6} fill={on ? '#ffd98a' : '#2a2a38'} opacity={on ? 0.85 : 0.5} />;
        })}
        <g opacity={momOn ? 1 : 0}>
          <Star5 x={MOMSTAR.x} y={MOMSTAR.y - 30} r={6} o={0.35 + 0.1 * Math.sin(f / 7)} color="#7a7a88" glow={0} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: MOMSTAR.x - 30, top: MOMSTAR.y - 6, fontFamily: SANS, fontSize: 18, color: COL.dim, opacity: momOn ? ramp(f, PH(-4) + 0.3, 0.4) : 0}}>妈妈</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: COL.mom, lineHeight: 1.75}}>
        <div style={popIn(f, 0.93)}>安安，7 岁。</div>
        <div style={popIn(f, t0)}>
          他对一颗星星说了 <G><span style={{display: 'inline-block', minWidth: 130, transform: `scale(${1 + 0.12 * pu})`}}>{lit.toLocaleString('en-US')}</span></G> 句话。
        </div>
        <div style={popIn(f, PH(-4))}>
          对妈妈，<span style={{color: COL.an}}>0</span> 句。
        </div>
      </div>
    </Black>
  );
};

/* ───────── 2. 傍晚：今天开心吗 12.71 – 20.96 ───────── */
const AskScene: React.FC<{f: number}> = ({f}) => {
  const a = PH(-3);
  const asked = f >= s(bt(-3, 1));
  return (
    <Cut f={f} a={a} b={20.96} flash={false}>
      <AbsoluteFill style={{opacity: ramp(f, a, 0.5) * (1 - ramp(f, 20.5, 0.46))}}>
        <Room f={f} glow={0} dark={0.16} warm={0.9}>
          <Sprite name="boy_sit" x={430} bottom={770} height={235} />
          <Sprite name="mom_stand" x={900} bottom={965} height={470} />
        </Room>
        <Hud left="第 211 天 · 18:40" right={<Counter n={0} />} pill={<>「今天开心吗？」 ×{asked ? 211 : 210}</>} />
        <Dialogue
          f={f}
          top={140}
          lines={[
            {who: 'mom', text: '安安，今天在学校开心吗？', at: bt(-3, 1), fade: PH(-2) - 0.3},
            {who: 'an', text: '', at: bt(-3, 5), fade: PH(-2) - 0.3},
          ]}
        />
        {/* 他把积木按颜色排成一条线 —— 拍上一块一块落下 */}
        <svg width={1440} height={1080} style={{position: 'absolute'}}>
          {['#d9534f', '#f0ad4e', '#f7e463', '#5cb85c', '#5bc0de', '#428bca', '#9b59b6'].map((c, i) => {
            const at = bt(-3, 3 + i * 0.5);
            const p = ramp(f, at, 0.12);
            return <rect key={i} x={560 + i * 30} y={1000 - (1 - p) * 40} width={24} height={24} fill={c} opacity={p} stroke="#2a1d14" strokeWidth={3} />;
          })}
        </svg>
        <Narr f={f} a={PH(-2)} b={20.6} y={170}>
          她每天都问。他从来<G>不答</G>。
        </Narr>
      </AbsoluteFill>
    </Cut>
  );
};

/* ───────── 3. drop：每个人都在问 20.96 – 33.98 ───────── */
const ChatGroup: React.FC<{f: number}> = ({f}) => {
  const a = 20.96;
  const msgs: {who: string; text: string; at: number; me?: boolean; hl?: boolean}[] = [
    {who: '乐乐妈妈', text: '收到', at: a},
    {who: '朵朵爸爸', text: '收到，谢谢林老师', at: a},
    {who: '林老师', text: '@安安妈妈 安安今天午睡时又一直捂耳朵，下午不肯进教室。', at: bt(-1, 1), hl: true},
    {who: '林老师', text: '您方便的话，今天早点来接一下？', at: bt(-1, 3), hl: true},
    {who: '我', text: '好的林老师，我马上请假过去。', at: bt(-1, 5), me: true},
  ];
  const shake = f >= s(bt(-1, 1)) && f < s(bt(-1, 1) + 0.25) ? Math.sin(f * 3) * 6 : 0;
  return (
    <Cut f={f} a={a} b={PH(0)}>
      <Black>
        <Hud left="第 211 天 · 14:26" />
        <div style={{position: 'absolute', left: 720 - 340, top: 90, width: 680, height: 920, borderRadius: 42, background: '#ededed', overflow: 'hidden', transform: `translateX(${shake}px)`, boxShadow: '0 30px 90px rgba(0,0,0,0.7)'}}>
          <div style={{height: 84, background: '#f7f7f7', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 26, color: '#222'}}>一（3）班家长群（42）</div>
          <div style={{padding: '20px 26px'}}>
            {msgs.map((m, i) => {
              const p = ramp(f, m.at, 0.15);
              if (p <= 0) return null;
              return (
                <div key={i} style={{display: 'flex', flexDirection: m.me ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 22, opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}>
                  <div style={{width: 58, height: 58, borderRadius: 8, background: m.me ? '#e8b48a' : m.hl ? '#6c8ebf' : '#b9b9b9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 22, color: '#fff', fontWeight: 700}}>{m.who.slice(0, 1)}</div>
                  <div style={{margin: '0 14px', maxWidth: 440}}>
                    {!m.me && <div style={{fontFamily: SANS, fontSize: 17, color: '#888', marginBottom: 4}}>{m.who}</div>}
                    <div style={{background: m.me ? '#95ec69' : '#fff', borderRadius: 8, padding: '12px 16px', fontFamily: SANS, fontSize: 25, color: '#111', lineHeight: 1.45}}>
                      {m.hl && m.text.startsWith('@') ? (
                        <>
                          <span style={{color: '#576b95'}}>@安安妈妈</span>
                          {m.text.slice(5)}
                        </>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Black>
    </Cut>
  );
};

const Elevator: React.FC<{f: number}> = ({f}) => {
  const a = PH(0);
  const z = 1.04 + 0.05 * ramp(f, a, 4.2);
  return (
    <Cut f={f} a={a} b={PH(1)}>
      <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
        <Img src={staticFile('ep54/elevator.png')} style={{position: 'absolute', left: 0, top: 0, width: 1440, height: 1075, transform: `scale(${z})`, transformOrigin: '70% 60%', imageRendering: 'pixelated'}} />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,5,12,0.75) 0%, transparent 30%)'}} />
        <Hud left="第 211 天 · 17:48 · 电梯里" />
        {/* 小孩的问话气泡 */}
        <div style={{position: 'absolute', left: 150, top: 430, ...popIn(f, bt(0, 1))}}>
          <div style={{background: '#fff', borderRadius: 18, padding: '14px 22px', fontFamily: SANS, fontWeight: 700, fontSize: 34, color: '#222', boxShadow: '0 6px 20px rgba(0,0,0,0.35)'}}>{typed('妈妈，他为什么不说话？', f, bt(0, 1), 12)[0]}</div>
        </div>
        <div style={{position: 'absolute', left: 300, top: 300, ...popIn(f, bt(0, 5))}}>
          <div style={{background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: '10px 18px', fontFamily: SANS, fontSize: 26, color: '#444'}}>嘘——别指人家。</div>
        </div>
      </AbsoluteFill>
    </Cut>
  );
};

const GrandmaCall: React.FC<{f: number}> = ({f}) => {
  const a = PH(1);
  const sec = 137 + Math.floor((f - s(a)) / FPS);
  return (
    <Cut f={f} a={a} b={PH(2)}>
      <Black>
        <Hud left="第 211 天 · 20:05" />
        <div style={{position: 'absolute', left: 720 - 300, top: 120, width: 600, textAlign: 'center'}}>
          <div style={{width: 130, height: 130, borderRadius: 65, margin: '0 auto', background: '#8a7a64', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 52, color: '#fff', boxShadow: `0 0 0 ${10 + 10 * pulse(f, a)}px rgba(138,122,100,0.25)`}}>外</div>
          <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 34, color: COL.mom, marginTop: 20}}>外婆</div>
          <div style={{fontFamily: SANS, fontSize: 22, color: COL.dim, marginTop: 6}}>通话中 {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</div>
        </div>
        <Dialogue
          f={f}
          top={470}
          left={170}
          size={40}
          lines={[
            {who: 'po', text: '都七岁了，连声妈都不叫？', at: bt(1, 0.5), cps: 11},
            {who: 'po', text: '是不是你太惯着他了。', at: bt(1, 3), cps: 11},
            {who: 'mom', text: '……嗯，我知道了。', at: bt(1, 5.5), cps: 7},
          ]}
        />
      </Black>
    </Cut>
  );
};

const EveryoneAsks: React.FC<{f: number}> = ({f}) => {
  const a = PH(2);
  const words = ['为', '什', '么', '他', '不', '说', '话', '？'];
  return (
    <Cut f={f} a={a} b={PH(3)} flash={false}>
      <Black o={1 - ramp(f, PH(3) - 0.3, 0.3)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: COL.mom, ...popIn(f, a)}}>每个人都在问她：</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 480, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 96, color: COL.gold, letterSpacing: 6}}>
          {words.map((w, i) => (
            <span key={i} style={{display: 'inline-block', ...popIn(f, bt(2, 1.5 + i * 0.5))}}>
              {w}
            </span>
          ))}
        </div>
      </Black>
    </Cut>
  );
};

/* ───────── 4. 夜里：数星星 38.24 – 51.01 ───────── */
const StarTalk: React.FC<{f: number}> = ({f}) => {
  const a = PH(3);
  const speak = (t0: number, t1: number) => (f >= s(t0) && f < s(t1) ? 0.18 * Math.abs(Math.sin(f / 2.2)) : 0);
  const glow = 0.85 + 0.15 * pulse(f, a, 999, 0.4) + speak(PH(4), PH(4) + 1.2) + speak(PH(5), PH(5) + 1.2);
  const appear = [0, 1, 2, 3, 4, 5, 6].map((i) => bt(3, 1 + i)); // 7 拍，7 颗
  const glint = f >= s(PH(5)) ? Math.max(0, Math.sin(clamp((f - s(PH(5))) / s(2)) * Math.PI)) : 0;
  const momIn = ramp(f, PH(5) + 1, 1.2);
  return (
    <Cut f={f} a={a} b={PH(6)} flash={false}>
      <AbsoluteFill style={{opacity: ramp(f, a, 0.4)}}>
        <Room f={f} glow={glow} dark={0.55} stars={<SkyStars f={f} appear={appear} glint={glint} />}>
          <Sprite name="boy_sit" x={430} bottom={770} height={235} />
          <Sprite name="mom_stand" x={1100} bottom={965} height={470} o={momIn * 0.8} tint={0.9} />
        </Room>
        <Hud left="第 211 天 · 21:30" right={<Counter n={0} />} />
        <div style={{position: 'absolute', right: 48, top: 66, fontFamily: SANS, fontSize: 20, color: COL.gold, opacity: f >= s(appear[0]) ? 1 : 0}}>
          ★ × {appear.filter((t) => f >= s(t)).length}
        </div>
        <Dialogue
          f={f}
          top={110}
          lines={[
            {who: 'an', text: '小星，今天能看见 7 颗。', at: a + 0.2, fade: PH(6) - 0.5},
            {who: 'star', text: '比昨天多 1 颗。', at: PH(4), fade: PH(6) - 0.5},
            {who: 'an', text: '最亮的那颗在楼顶上面，左边。', at: bt(4, 3), fade: PH(6) - 0.5},
            {who: 'star', text: '那是你的那颗。', at: PH(5), fade: PH(6) - 0.5},
          ]}
        />
        <Narr f={f} a={bt(5, 4)} b={PH(6) - 0.1} y={890}>
          他什么都<G>告诉它</G>。
        </Narr>
      </AbsoluteFill>
    </Cut>
  );
};

/* ───────── 5. 家长端：续费 / 想关掉 51.01 – 63.78 ───────── */
const Phone: React.FC<{title: string; children: React.ReactNode; h?: number}> = ({title, children, h = 760}) => (
  <div style={{position: 'absolute', left: 720 - 330, top: 80, width: 660, height: h, borderRadius: 42, background: '#14151d', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 90px rgba(0,0,0,0.7)', overflow: 'hidden'}}>
    <div style={{height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 24, color: COL.mom, borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
      <span style={{display: 'inline-block', marginRight: 10, color: '#ffd98a'}}>★</span>
      {title}
    </div>
    <div style={{padding: '26px 34px', position: 'relative', height: h - 76}}>{children}</div>
  </div>
);
const WantOff: React.FC<{f: number}> = ({f}) => {
  const a = PH(6);
  const q = '怎么关闭孩子的对话功能？';
  const tType = PH(7);
  const tDel = PH(8);
  let txt = '';
  if (f < s(tDel)) txt = typed(q, f, tType, 6)[0];
  else {
    // 删除：每拍删 3 个字
    const del = Math.floor(((f - s(tDel)) / FPS / B) * 3);
    txt = Array.from(q).slice(0, Math.max(0, q.length - del)).join('');
  }
  const popupO = win(f, bt(6, 1), bt(6, 5.5), 0.15, 0.25);
  const paid = f >= s(bt(6, 4));
  return (
    <Cut f={f} a={a} b={PH(9)} flash={false}>
      <Black o={1 - ramp(f, PH(9) - 0.3, 0.3)}>
        <Hud left="第 211 天 · 23:52" />
        <Phone title="小星 · 家长端">
          <div style={{fontFamily: SANS, fontSize: 20, color: COL.dim, marginBottom: 14}}>帮助与设置</div>
          {['对话记录', '儿童对话：已开启', '会员：' + (paid ? '已续费至 2027-06' : '3 天后到期'), '提醒与作息'].map((t, i) => (
            <div key={i} style={{fontFamily: SANS, fontSize: 26, color: i === 1 ? COL.gold : i === 2 && paid ? '#9fdc8f' : COL.mom, padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>{t}</div>
          ))}
          <div style={{marginTop: 120, fontFamily: SANS, fontSize: 20, color: COL.dim}}>问问客服</div>
          <div style={{marginTop: 10, height: 64, borderRadius: 16, background: '#1f2130', display: 'flex', alignItems: 'center', padding: '0 20px', fontFamily: SANS, fontSize: 26, color: COL.mom}}>
            {txt}
            <span style={{display: 'inline-block', width: 3, height: 30, background: COL.mom, marginLeft: 4, opacity: Math.floor(f / 10) % 2 ? 1 : 0.2}} />
          </div>
          {/* 续费弹窗 */}
          {popupO > 0 && (
            <div style={{position: 'absolute', left: 20, right: 20, top: 120, borderRadius: 22, background: '#24263a', border: '1px solid rgba(255,255,255,0.15)', padding: '30px 30px', opacity: popupO, transform: `scale(${0.94 + 0.06 * popupO})`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)'}}>
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 28, color: COL.mom}}>小星会员将于 3 天后到期</div>
              <div style={{fontFamily: SANS, fontSize: 22, color: COL.dim, marginTop: 10}}>到期后孩子将无法与小星对话</div>
              <div style={{marginTop: 28, height: 66, borderRadius: 33, background: paid ? '#4a7a44' : '#f3c77a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 900, fontSize: 28, color: '#1a1a1a', transform: `scale(${f >= s(bt(6, 4)) && f < s(bt(6, 4) + 0.2) ? 0.92 : 1})`}}>
                {paid ? '✓ 已续费' : '续费 ¥299 / 年'}
              </div>
            </div>
          )}
        </Phone>
        <Narr f={f} a={bt(8, 1)} b={PH(9) - 0.1} y={880} size={42}>
          她付钱让它陪他。也想过，把它<G>关掉</G>。
        </Narr>
      </Black>
    </Cut>
  );
};

/* ───────── 6. 预告：412 63.78 – 70.5 ───────── */
const Teaser: React.FC<{f: number; full?: boolean}> = ({f, full}) => {
  const a = PH(9);
  const hit = PH(10);
  const n = Math.round(interpolate(f, [s(hit), s(hit + 0.5)], [0, 412], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const shake = f >= s(hit) && f < s(hit + 0.3) ? Math.sin(f * 2.7) * 10 : 0;
  const fl = f >= s(hit) ? Math.max(0, 1 - (f - s(hit)) / 8) : 0;
  return (
    <Cut f={f} a={a} b={full ? hit : 70.5} flash={false}>
      <Black o={full ? 1 : 1 - ramp(f, 70.1, 0.4)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 46, color: COL.mom, lineHeight: 1.8, opacity: 1 - ramp(f, hit - 0.2, 0.2)}}>
          <div style={popIn(f, a + 0.1)}>直到那天夜里，</div>
          <div style={popIn(f, bt(9, 4))}>她打开了它的对话记录。</div>
        </div>
        {f >= s(hit) && (
          <div style={{position: 'absolute', left: 260, right: 260, top: 420, transform: `translateX(${shake}px) scale(${1 + 0.08 * fl})`}}>
            <div style={{height: 96, borderRadius: 22, background: '#1f2130', display: 'flex', alignItems: 'center', padding: '0 30px', fontFamily: SANS, fontSize: 40, color: COL.mom, border: '1px solid rgba(255,255,255,0.12)'}}>
              <span style={{color: COL.dim, marginRight: 16}}>⌕</span>妈妈
              <span style={{marginLeft: 'auto', fontSize: 28, color: COL.dim}}>
                找到 <b style={{color: COL.gold, fontSize: 56}}>{n}</b> 条
              </span>
            </div>
          </div>
        )}
        <AbsoluteFill style={{background: `rgba(255,240,210,${0.5 * fl})`}} />
      </Black>
    </Cut>
  );
};

/* ───────── 封面 ───────── */
export const Ep54Cover: React.FC = () => (
  <AbsoluteFill>
    <Room f={40} glow={1} dark={0.52} stars={<SkyStars f={40} glint={0.6} />}>
      <Sprite name="boy_sit" x={430} bottom={770} height={235} />
      <Sprite name="mom_stand" x={1100} bottom={965} height={470} o={0.8} tint={0.88} />
    </Room>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,5,12,0.85) 0%, rgba(4,5,12,0.4) 40%, transparent 58%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 66, textAlign: 'center'}}>
      <div style={{fontFamily: SANS, fontSize: 26, color: COL.dim, letterSpacing: 6}}>他对一颗星星说了 1368 句话 · 对妈妈 0 句</div>
      <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 132, color: COL.gold, letterSpacing: 10, marginTop: 12, textShadow: '0 0 50px rgba(243,180,90,0.5), 0 6px 20px rgba(0,0,0,0.8)'}}>他不是来自星星</div>
    </div>
    <div style={{position: 'absolute', left: 500, top: 520, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: COL.an, textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>小星，今天能看见 7 颗。</div>
    <div style={{position: 'absolute', bottom: 26, left: 0, right: 0, textAlign: 'center', fontFamily: SERIF, fontSize: 22, color: COL.dim, letterSpacing: 6}}>苏格拉没有底</div>
  </AbsoluteFill>
);

export const Ep54Act1: React.FC = () => {
  const f = useCurrentFrame();
  const vol = (fr: number) => 1 - clamp((fr - s(69.4)) / s(1.1));
  return (
    <AbsoluteFill style={{background: '#050507'}}>
      <Audio src={staticFile('music/ep53-bgm.wav')} volume={vol} />
      <Hook f={f} />
      <AskScene f={f} />
      <ChatGroup f={f} />
      <Elevator f={f} />
      <GrandmaCall f={f} />
      <EveryoneAsks f={f} />
      <StarTalk f={f} />
      <WantOff f={f} />
      <Teaser f={f} />
    </AbsoluteFill>
  );
};

/* ═══════════════════ 完整版：第二幕 · 第三幕 · 结尾 ═══════════════════
 * 配乐 ep54-bgm.wav = 原曲 [0,136.13) + 原曲 [76.54,114.85)（9 个乐句）+ 原曲 [136.13, 结尾)。
 * 插入的是整乐句，所以乐句线 PH(m) 全片连续。安静段落在 PH(35)=174.43 – PH(41)=199.97，
 * PH(41) 音乐回来、PH(42) 全奏，原曲尾声在 PH(49)=234.01 之后。
 */
export const DURATION_FULL = Math.round(247 * FPS);

/* 窗：房间原图 582–935 × 205–740 */
const WIN = {x: rx(584), y: ry(208), w: rx(935) - rx(584), h: ry(738) - ry(208)};
const WinRain: React.FC<{f: number; o: number}> = ({f, o}) => {
  const drops = React.useMemo(() => new Array(90).fill(0).map((_, i) => ({x: WIN.x + rnd(i) * WIN.w, y0: rnd(i + 50) * WIN.h, sp: 20 + rnd(i + 9) * 12, l: 16 + rnd(i + 3) * 18})), []);
  if (o <= 0) return null;
  return (
    <svg width={1440} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 0.5 * o}}>
      <defs>
        <clipPath id="win54">
          <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#win54)">
        {drops.map((d, i) => {
          const y = WIN.y + ((d.y0 + f * d.sp) % WIN.h);
          return <line key={i} x1={d.x} y1={y} x2={d.x - 4} y2={y + d.l} stroke="#bcd3ff" strokeWidth={2} />;
        })}
      </g>
    </svg>
  );
};
/** 窗里的云：cover 0..1 */
const Clouds: React.FC<{f: number; cover: number}> = ({f, cover}) => {
  if (cover <= 0) return null;
  const blobs = [
    [0.1, 0.18, 0.5], [0.45, 0.12, 0.6], [0.8, 0.22, 0.5], [0.25, 0.38, 0.55], [0.65, 0.42, 0.6], [0.95, 0.5, 0.45], [0.05, 0.55, 0.4],
  ];
  return (
    <div style={{position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, overflow: 'hidden', opacity: cover}}>
      {blobs.map(([x, y, r], i) => (
        <div key={i} style={{position: 'absolute', left: (x + Math.sin(f / 200 + i) * 0.03) * WIN.w - r * WIN.w * 0.6, top: y * WIN.h - r * WIN.w * 0.3, width: r * WIN.w * 1.2, height: r * WIN.w * 0.6, borderRadius: '50%', background: '#2b3044', filter: 'blur(18px)'}} />
      ))}
    </div>
  );
};
const flashAt = (f: number, ts: number[]) => ts.reduce((m, t) => Math.max(m, f >= s(t) && f < s(t + 0.5) ? (f - s(t) < 3 ? 1 : Math.max(0, 1 - (f - s(t) - 3) / 10)) : 0), 0);
const Flash: React.FC<{v: number}> = ({v}) => (v > 0 ? <AbsoluteFill style={{background: `rgba(210,225,255,${0.55 * v})`}} /> : null);

/* ───────── 记录卡 ───────── */
const SearchBar2: React.FC<{f: number; q: string; at: number; count: number; countAt: number; big?: boolean}> = ({f, q, at, count, countAt, big}) => {
  const n = Math.round(interpolate(f, [s(countAt), s(countAt + 0.5)], [0, count], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{height: big ? 80 : 64, borderRadius: 16, background: '#1f2130', display: 'flex', alignItems: 'center', padding: '0 20px', fontFamily: SANS, fontSize: big ? 32 : 26, color: COL.mom}}>
      <span style={{color: COL.dim, marginRight: 12}}>⌕</span>
      {at <= 0 ? q : typed(q, f, at, 8)[0]}
      <span style={{marginLeft: 'auto', fontSize: 20, color: COL.dim, opacity: f >= s(countAt) ? 1 : 0}}>
        找到 <b style={{color: COL.gold, fontSize: big ? 40 : 30}}>{n}</b> 条
      </span>
    </div>
  );
};
const Rec: React.FC<{f: number; at: number; date: string; text: string; to?: string; color?: string}> = ({f, at, date, text, to = '安安 → 小星', color = COL.an}) => {
  const o = ramp(f, at, 0.2);
  return (
    <div style={{marginTop: 14, padding: '14px 20px', borderRadius: 16, background: '#1b1d28', border: '1px solid rgba(255,255,255,0.07)', opacity: o, transform: `translateY(${(1 - o) * 26}px) scale(${1 + 0.04 * (1 - o)})`}}>
      <div style={{fontFamily: SANS, fontSize: 17, color: COL.dim}}>{date} · {to}</div>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 26, color, marginTop: 4, lineHeight: 1.4}}>{text}</div>
    </div>
  );
};
const BigPhone: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
  <div style={{position: 'absolute', left: 720 - 360, top: 60, width: 720, height: 980, borderRadius: 42, background: '#14151d', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 90px rgba(0,0,0,0.7)', overflow: 'hidden'}}>
    <div style={{height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 24, color: COL.mom, borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
      <span style={{marginRight: 10, color: '#ffd98a'}}>★</span>
      {title}
    </div>
    <div style={{padding: '22px 30px'}}>{children}</div>
  </div>
);

/* ───────── 第二幕 ───────── */
const SearchMom: React.FC<{f: number}> = ({f}) => {
  const a = PH(10);
  const fl = Math.max(0, 1 - (f - s(a)) / 8);
  return (
    <Cut f={f} a={a} b={PH(14)} flash={false}>
      <Black o={1 - ramp(f, PH(14) - 0.35, 0.35)}>
        <Hud left="第 211 天 · 23:55" />
        <BigPhone title="小星 · 对话记录">
          <SearchBar2 f={f} q="妈妈" at={0} count={412} countAt={a} big />
          <Rec f={f} at={bt(10, 4)} date="第 203 天 21:34" text="妈妈今天头发是湿的。外面下雨了。" />
          <Rec f={f} at={PH(11)} date="第 207 天 21:30" text="妈妈说话的时候，我在数她衣服的扣子。五颗。" />
          <Rec f={f} at={bt(11, 4)} date="第 209 天 21:41" text="妈妈的眼睛红了。我不知道该看哪里。" />
          <Rec f={f} at={PH(12)} date="第 210 天 20:31" text="外婆电话里声音很大。妈妈去阳台站了 11 分钟。" />
          <Rec f={f} at={bt(12, 4)} date="第 210 天 21:32" text="妈妈回来的时候，天上有 4 颗星。" />
        </BigPhone>
        <AbsoluteFill style={{background: `rgba(255,240,210,${0.5 * fl})`}} />
      </Black>
    </Cut>
  );
};

const BigLine: React.FC<{f: number}> = ({f}) => {
  const a = PH(14);
  const glow = ramp(f, a, 1.2);
  return (
    <Cut f={f} a={a} b={PH(16)} flash={false}>
      <Black o={1 - ramp(f, PH(16) - 0.4, 0.4)}>
        <AbsoluteFill style={{background: `radial-gradient(ellipse 50% 35% at 50% 45%, rgba(243,180,90,${0.22 * glow}), transparent 70%)`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: 132, color: COL.gold, letterSpacing: 8, opacity: glow, textShadow: '0 0 40px rgba(243,180,90,0.45)'}}>他不是不说。</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: COL.mom, ...popIn(f, PH(15))}}>他只是，没法看着她的眼睛说。</div>
      </Black>
    </Cut>
  );
};

const Pair: React.FC<{f: number; at: number; day: string}> = ({f, at, day}) => {
  const o = ramp(f, at, 0.2);
  const o2 = ramp(f, at + B, 0.2);
  return (
    <div style={{display: 'flex', gap: 18, marginTop: 18}}>
      <div style={{flex: 1, padding: '14px 18px', borderRadius: 14, background: '#1b1d28', opacity: o, transform: `translateX(${(1 - o) * -30}px)`}}>
        <div style={{fontFamily: SANS, fontSize: 17, color: COL.dim}}>{day} 18:40 · 妈妈 → 安安</div>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 25, color: COL.mom, marginTop: 4}}>今天开心吗？</div>
        <div style={{fontFamily: SANS, fontSize: 18, color: 'rgba(255,255,255,0.3)', marginTop: 4}}>（没有回答）</div>
      </div>
      <div style={{flex: 1.25, padding: '14px 18px', borderRadius: 14, background: '#2a2216', border: '1px solid rgba(255,179,92,0.3)', opacity: o2, transform: `translateX(${(1 - o2) * 30}px)`}}>
        <div style={{fontFamily: SANS, fontSize: 17, color: COL.dim}}>{day} 21:30 · 安安 → 小星</div>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 25, color: COL.an, marginTop: 4}}>妈妈问我开不开心。开心。</div>
      </div>
    </div>
  );
};
const SearchHappy: React.FC<{f: number}> = ({f}) => {
  const a = PH(16);
  return (
    <Cut f={f} a={a} b={PH(18)} flash={false}>
      <Black>
        <div style={{position: 'absolute', left: 140, right: 140, top: 110}}>
          <SearchBar2 f={f} q="开心" at={a + 0.1} count={211} countAt={bt(16, 2)} />
          <Pair f={f} at={bt(16, 3)} day="第 209 天" />
          <Pair f={f} at={bt(16, 5)} day="第 210 天" />
          <Pair f={f} at={bt(16, 7)} day="第 211 天" />
        </div>
        <Narr f={f} a={bt(17, 2)} b={PH(18) - 0.05} y={800} size={42}>
          每一个没回答的「开心吗」，他都在<G>晚上</G>回答了。
        </Narr>
      </Black>
    </Cut>
  );
};

const SearchFear: React.FC<{f: number}> = ({f}) => {
  const a = PH(18);
  return (
    <Cut f={f} a={a} b={PH(20)}>
      <Black o={1 - ramp(f, PH(20) - 0.4, 0.4)}>
        <div style={{position: 'absolute', left: 200, right: 200, top: 110}}>
          <SearchBar2 f={f} q="怕" at={a + 0.05} count={37} countAt={bt(18, 1)} />
          <Rec f={f} at={bt(18, 2)} date="第 188 天 21:30" text="教室的灯会嗡嗡响。" />
          <Rec f={f} at={bt(18, 4)} date="第 196 天 21:36" text="妈妈突然抱我的时候，像被很多手按住。" />
          <Rec f={f} at={bt(18, 6)} date="第 205 天 21:40" text="我怕妈妈以为我不喜欢她。" />
        </div>
        <Narr f={f} a={bt(19, 2)} b={PH(20) - 0.05} y={760} size={44}>
          她一直以为，他推开她，是<G>不要她</G>。
        </Narr>
      </Black>
    </Cut>
  );
};

const speakGlow = (f: number, spans: [number, number][]) => spans.reduce((m, [a, b]) => (f >= s(a) && f < s(b) ? 0.2 * Math.abs(Math.sin(f / 2.2)) : m), 0);

const MomAsksStar: React.FC<{f: number}> = ({f}) => {
  const a = PH(20);
  const L = [a + 0.3, bt(20, 5), PH(21) + B, bt(21, 6), PH(22) + B * 3];
  const glow = 0.85 + speakGlow(f, [[L[1], L[1] + 1], [L[2], L[2] + 1.6], [L[4], L[4] + 2.2]]);
  return (
    <Cut f={f} a={a} b={PH(24)} flash={false}>
      <AbsoluteFill style={{opacity: ramp(f, a, 0.5) * (1 - ramp(f, PH(24) - 0.4, 0.4))}}>
        <Room f={f} glow={glow} dark={0.6} stars={<SkyStars f={f} n={5} />}>
          <Sprite name="mom_sit" x={420} bottom={800} height={330} />
        </Room>
        <Hud left="第 212 天 · 22:10 · 安安睡着了" right={<Counter n={0} />} />
        <Dialogue
          f={f}
          top={110}
          size={34}
          lines={[
            {who: 'mom', text: '你能不能告诉他，妈妈下班路上也看见星星了？', at: L[0]},
            {who: 'star', text: '我可以转告。', at: L[1]},
            {who: 'star', text: '但他每天讲的那个人，是你。', at: L[2]},
            {who: 'mom', text: '可他从来不看我。', at: L[3]},
            {who: 'star', text: '他看星星的时候最放松。你可以坐到他旁边，一起看。', at: L[4]},
          ]}
        />
      </AbsoluteFill>
    </Cut>
  );
};

const FailedTry: React.FC<{f: number}> = ({f}) => {
  const a = PH(24);
  const scream = PH(25);
  const after = f >= s(scream);
  const shake = f >= s(scream) && f < s(scream + 0.6) ? Math.sin(f * 2.3) * 14 * (1 - (f - s(scream)) / s(0.6)) : 0;
  const red = f >= s(scream) ? Math.max(0, 1 - (f - s(scream)) / 14) : 0;
  return (
    <Cut f={f} a={a} b={PH(27)} flash={false}>
      <AbsoluteFill style={{transform: `translateX(${shake}px)`}}>
        <Room f={f} glow={0.8} dark={0.5} stars={<SkyStars f={f} n={6} />}>
          {after ? <Sprite name="boy_curl" x={430} bottom={775} height={225} tint={0.2} /> : <Sprite name="boy_sit" x={430} bottom={770} height={235} />}
          <Sprite name="mom_stand" x={after ? 760 : 640} bottom={985} height={470} flip />
        </Room>
        <AbsoluteFill style={{background: `rgba(255,80,60,${0.28 * red})`}} />
        <Hud left="第 213 天 · 21:00" right={<Counter n={0} />} />
        <Dialogue
          f={f}
          top={110}
          size={33}
          lines={[
            {who: 'mom', text: '安安，你喜欢星星对不对？告诉妈妈，你今天开不开心？', at: a + 0.2, cps: 16, fade: PH(26) - 0.3},
            {who: 'an', text: '啊——！', at: scream, cps: 20, fade: PH(26) - 0.3},
            {who: 'star', text: '太近了。问题太多了。', at: bt(25, 4), fade: PH(26) - 0.3},
          ]}
        />
        <Narr f={f} a={PH(26)} b={PH(27) - 0.05} y={170}>
          她学得很慢。<G>他也是。</G>
        </Narr>
      </AbsoluteFill>
    </Cut>
  );
};

const Notebook: React.FC<{f: number}> = ({f}) => {
  const a = PH(27);
  const rows = ['① 坐在旁边，别坐对面。', '② 一起看窗外，不看眼睛。', '③ 慢一点，一次一句。', '④ 问数字，不问心情。', '⑤ 抱之前，先说「我要抱你了」。'];
  return (
    <Cut f={f} a={a} b={PH(29)}>
      <Black>
        <div style={{position: 'absolute', left: 290, top: 120, width: 860, height: 820, background: '#efe6d2', borderRadius: 10, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', transform: 'rotate(-1.5deg)', backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 63px, rgba(80,110,160,0.25) 63px 65px)', padding: '46px 66px'}}>
          <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: '#3a2e22'}}>跟安安说话</div>
          <div style={{fontFamily: SANS, fontSize: 20, color: '#8a7a64', marginTop: 4}}>第 214 天 · 跟小星学的</div>
          {rows.map((r, i) => (
            <div key={r} style={{fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: i === 4 ? '#a3502a' : '#3a2e22', marginTop: i === 0 ? 40 : 24, opacity: ramp(f, bt(27, 1 + i * 2), 0.15)}}>
              {typed(r, f, bt(27, 1 + i * 2), 14)[0]}
            </div>
          ))}
        </div>
      </Black>
    </Cut>
  );
};

const Relay: React.FC<{f: number}> = ({f}) => {
  const a = PH(29);
  const glow = 0.85 + speakGlow(f, [[a + 0.4, a + 2.4]]);
  return (
    <Cut f={f} a={a} b={PH(31)}>
      <AbsoluteFill>
        <Room f={f} glow={glow} dark={0.55} stars={<><SkyStars f={f} n={3} /><Clouds f={f} cover={0.5} /></>}>
          <Sprite name="boy_sit" x={430} bottom={770} height={235} />
        </Room>
        <Hud left="第 218 天 · 21:30" right={<Counter n={0} />} />
        <Dialogue
          f={f}
          top={110}
          lines={[
            {who: 'star', text: '妈妈说，她今天在公交站看见了 3 颗。', at: a + 0.4},
            {who: 'an', text: '……少了 4 颗。在云后面。', at: PH(30), cps: 9},
          ]}
        />
      </AbsoluteFill>
    </Cut>
  );
};

/* 天花板：夜光贴纸（不用电） */
const CEIL: [number, number][] = [
  [470, 560], [560, 380], [740, 300], [870, 420], [960, 270], [700, 500], [430, 330],
];
const Ceiling: React.FC<{f: number; lit: number[]; glow?: number; children?: React.ReactNode}> = ({f, lit, glow = 1, children}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #1b2030, #0a0c14)'}}>
    <svg width={1440} height={1080} style={{position: 'absolute'}}>
      {new Array(9).fill(0).map((_, i) => <line key={i} x1={0} y1={140 + i * 110} x2={1440} y2={100 + i * 110} stroke="rgba(255,255,255,0.03)" strokeWidth={2} />)}
      {CEIL.map(([x, y], i) => {
        const o = clamp(lit[i] ?? 0) * glow;
        if (o <= 0) return null;
        const k = i === 0 ? 1.4 : 1;
        const pts = new Array(10).fill(0).map((_, j) => {
          const r = (j % 2 ? 14 : 34) * k;
          const ang = -Math.PI / 2 + (j * Math.PI) / 5;
          return `${x + r * Math.cos(ang)},${y + r * Math.sin(ang)}`;
        });
        return (
          <g key={i} opacity={o}>
            <circle cx={x} cy={y} r={70 * k} fill="#c8f0a0" opacity={0.12} />
            <polygon points={pts.join(' ')} fill="#d9f5b0" opacity={0.9} />
          </g>
        );
      })}
    </svg>
    {children}
  </AbsoluteFill>
);
const Stickers: React.FC<{f: number}> = ({f}) => {
  const a = PH(31);
  const lit = CEIL.map((_, i) => ramp(f, bt(31, 1 + i), 0.12));
  return (
    <Cut f={f} a={a} b={PH(33)}>
      <Ceiling f={f} lit={lit}>
        <Hud left="第 221 天 · 23:40" />
        <Narr f={f} a={bt(32, 1)} b={PH(33) - 0.05} y={860} size={40}>
          她照着他说的位置，一颗一颗贴上去。<G>最亮的那颗，在左边。</G>
        </Narr>
      </Ceiling>
    </Cut>
  );
};
const CeilingSeen: React.FC<{f: number}> = ({f}) => {
  const a = PH(33);
  return (
    <Cut f={f} a={a} b={PH(35)} flash={false}>
      <AbsoluteFill style={{opacity: 1 - ramp(f, PH(35) - 0.4, 0.4)}}>
        <Room f={f} glow={0.8} dark={0.55} stars={<SkyStars f={f} n={7} />}>
          <Sprite name="boy_sit" x={430} bottom={770} height={235} />
        </Room>
        <Hud left="第 222 天 · 21:30" right={<Counter n={0} />} />
        <div style={{position: 'absolute', left: 140, right: 140, top: 120}}>
          <Rec f={f} at={bt(33, 2)} date="第 222 天 21:31" text="屋顶上有星星了。7 颗。" />
          <Rec f={f} at={bt(33, 6)} date="第 222 天 21:32" text="和天上一样。" />
        </div>
      </AbsoluteFill>
    </Cut>
  );
};

/* ───────── 第三幕 ───────── */
const Storm: React.FC<{f: number}> = ({f}) => {
  const a = PH(35);
  const out = bt(35, 4);
  const batt = f < s(out) ? 3 : f < s(bt(36, 0)) ? 3 : f < s(bt(36, 2)) ? 2 : f < s(bt(36, 4)) ? 1 : 0;
  let glow = 0.85;
  if (f >= s(out) && f < s(bt(36, 4))) glow = rnd(Math.floor(f / 3)) > 0.3 + (f - s(out)) / s(5) ? 0.75 : 0.15;
  if (f >= s(bt(36, 4))) glow = 0;
  const curl = f >= s(bt(36, 6));
  const flash = flashAt(f, [out, bt(36, 5)]);
  return (
    <Cut f={f} a={a} b={PH(37)} flash={false}>
      <AbsoluteFill>
        <Room f={f} glow={glow} dark={f >= s(out) ? 0.72 : 0.6} stars={<><Clouds f={f} cover={1} /><WinRain f={f} o={1.6} /></>}>
          {curl ? <Sprite name="boy_curl" x={430} bottom={775} height={225} tint={0.3} /> : <Sprite name="boy_sit" x={430} bottom={770} height={235} />}
        </Room>
        <Flash v={flash} />
        <Hud
          left="第 226 天 · 21:30 · 暴雨"
          right={
            <span>
              {f >= s(out) && <span style={{color: '#ff7a6b', marginRight: 22}}>⚡ 停电</span>}
              小星电量 <b style={{color: batt <= 1 ? '#ff7a6b' : COL.mom}}>{batt}%</b>
            </span>
          }
        />
        <Dialogue
          f={f}
          top={110}
          lines={[
            {who: 'an', text: '小星，今天一颗都——', at: a + 0.4, fade: bt(36, 6)},
            {who: 'star', text: '安安，云后面还有……', at: bt(35, 6), fade: bt(36, 6), cps: 5},
          ]}
        />
      </AbsoluteFill>
    </Cut>
  );
};
const Gone: React.FC<{f: number}> = ({f}) => {
  const a = PH(37);
  const flash = flashAt(f, [bt(37, 5)]);
  return (
    <Cut f={f} a={a} b={PH(38)} flash={false}>
      <AbsoluteFill>
        <Room f={f} glow={0} dark={0.74} stars={<><Clouds f={f} cover={1} /><WinRain f={f} o={1.6} /></>}>
          <Sprite name="boy_curl" x={430} bottom={775} height={225} tint={0.3} />
        </Room>
        <Flash v={flash} />
        <Hud left="第 226 天 · 21:41 · 停电" right={<span>小星电量 <b style={{color: '#ff7a6b'}}>0%</b></span>} />
        <Narr f={f} a={a + 0.3} b={PH(38) - 0.05} y={170}>
          星星灭了。那个声音，<G>不见了</G>。
        </Narr>
      </AbsoluteFill>
    </Cut>
  );
};
const SitBeside: React.FC<{f: number}> = ({f}) => {
  const a = PH(38);
  const momO = ramp(f, a + 0.3, 1.4);
  return (
    <Cut f={f} a={a} b={bt(39, 4)} flash={false}>
      <AbsoluteFill>
        <Room f={f} glow={0} dark={0.72} stars={<><Clouds f={f} cover={1} /><WinRain f={f} o={1.4} /></>}>
          <Sprite name="mom_sit" x={290} bottom={800} height={330} o={momO} tint={0.25} />
          <Sprite name="boy_curl" x={450} bottom={775} height={225} tint={0.3} />
        </Room>
        <Hud left="第 226 天 · 21:47 · 停电" right={<Counter n={0} />} />
        <Narr f={f} a={a + 0.5} b={PH(39) - 0.1} y={170} size={42}>
          她想抱他。手停在半空。她没有抱他，也没有看他。
        </Narr>
        <Narr f={f} a={PH(39)} b={bt(39, 4)} y={170} size={42}>
          她坐到他旁边，和他一起<G>抬头</G>。
        </Narr>
      </AbsoluteFill>
    </Cut>
  );
};
const LookUp: React.FC<{f: number}> = ({f}) => {
  const a = bt(39, 4);
  const lit = CEIL.map((_, i) => ramp(f, a + 0.4 + i * 0.35, 1.2));
  const n = f >= s(PH(41) + 2 * B * 2) ? 2 : f >= s(PH(41)) ? 1 : 0;
  const pop = (t: number) => (f >= s(t) ? Math.max(0, 1 - (f - s(t)) / 18) : 0);
  const momStar = f >= s(PH(41));
  return (
    <Cut f={f} a={a} b={PH(42)} flash={false}>
      <Ceiling f={f} lit={lit}>
        <Hud left="第 226 天 · 21:49 · 停电" right={<span>对妈妈说的话 <b style={{display: 'inline-block', color: n ? COL.an : COL.mom, fontSize: 26 + 16 * Math.max(pop(PH(41)), pop(PH(41) + 4 * B)), minWidth: 18, textAlign: 'center'}}>{n}</b></span>} />
        <Dialogue
          f={f}
          top={640}
          left={160}
          size={42}
          lines={[
            {who: 'mom', text: '安安……屋顶上……今天有几颗？', at: PH(40) - 0.3, cps: 5},
            {who: 'an', text: '7 颗。', at: PH(41), cps: 4},
            {who: 'an', text: '和天上一样。', at: PH(41) + 4 * B, cps: 6},
          ]}
        />
        {/* 片头那颗暗着的「妈妈」星，在这里亮起 */}
        <svg width={1440} height={1080} style={{position: 'absolute'}}>
          <Star5 x={1250} y={950} r={6 + 3 * pop(PH(41))} o={momStar ? 1 : 0.3} color={momStar ? '#ffe6a8' : '#7a7a88'} glow={momStar ? 2 : 0} />
        </svg>
        <div style={{position: 'absolute', left: 1222, top: 975, fontFamily: SANS, fontSize: 18, color: momStar ? COL.gold : COL.dim}}>妈妈</div>
      </Ceiling>
    </Cut>
  );
};
const NextNight: React.FC<{f: number}> = ({f}) => {
  const a = PH(42);
  const stand = f >= s(bt(43, 0));
  const momIn = f >= s(bt(44, 2));
  const n = f >= s(bt(43, 4)) ? 3 : 2;
  const glow = 0.95 + speakGlow(f, [[bt(42, 4), bt(42, 6)]]);
  return (
    <Cut f={f} a={a} b={PH(46)}>
      <AbsoluteFill style={{opacity: 1 - ramp(f, PH(46) - 0.4, 0.4)}}>
        <Room f={f} glow={glow} dark={0.5} stars={<SkyStars f={f} n={7} glint={stand ? 0.5 : 0} />}>
          {stand ? <Sprite name="boy_stand" x={1000} bottom={905} height={300} /> : <Sprite name="boy_sit" x={430} bottom={770} height={235} />}
          {stand && <Sprite name="mom_stand" x={momIn ? 1150 : 330} bottom={965} height={470} />}
        </Room>
        <Hud left="第 227 天 · 21:30 · 来电了，云散了" right={<Counter n={n} />} />
        <Dialogue
          f={f}
          top={110}
          lines={[
            {who: 'an', text: '小星，昨天晚上你不在。', at: a + 0.4, fade: bt(43, 0) - 0.2},
            {who: 'star', text: '那是谁陪你数的？', at: bt(42, 4), fade: bt(43, 0) - 0.2},
            {who: 'an', text: '妈妈，星星出来了。', at: bt(43, 4), cps: 8},
            {who: 'mom', text: '嗯。7 颗。', at: PH(45), cps: 6},
          ]}
        />
      </AbsoluteFill>
    </Cut>
  );
};
const LastLog: React.FC<{f: number}> = ({f}) => {
  const a = PH(46);
  return (
    <Cut f={f} a={a} b={PH(48)} flash={false}>
      <Black o={ramp(f, a, 0.4) * (1 - ramp(f, PH(48) - 0.4, 0.4))}>
        <Hud left="第 227 天 · 23:10" />
        <BigPhone title="小星 · 家长端">
          <div style={{fontFamily: SANS, fontSize: 20, color: COL.dim, marginBottom: 10}}>今日对话</div>
          <div style={{fontFamily: SANS, fontSize: 30, color: COL.mom, ...popIn(f, bt(46, 1))}}>
            孩子与小星对话 <b style={{color: COL.gold, fontSize: 52}}>4</b> 句 <span style={{color: '#9fdc8f'}}>↓</span>
          </div>
          <Rec f={f} at={bt(46, 4)} date="第 227 天 21:52" text="今天跟妈妈说话了。开心。" />
        </BigPhone>
      </Black>
    </Cut>
  );
};
const Finale: React.FC<{f: number}> = ({f}) => {
  const a = PH(48);
  const cards = PH(50) + 2 * B;
  return (
    <>
      {f >= s(a) && f < s(cards) && (
        <Black>
          <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: SERIF, fontWeight: 700, fontSize: 56, color: COL.mom, lineHeight: 1.9, letterSpacing: 3, opacity: 1 - ramp(f, cards - 0.4, 0.4)}}>
            <div style={popIn(f, a + 0.2)}>人们叫他们：来自星星的孩子。</div>
            <div style={popIn(f, bt(48, 4))}>好像他们离我们很远。</div>
            <div style={popIn(f, PH(49))}>其实他们就在这间屋子里。</div>
            <div style={popIn(f, bt(49, 4))}>
              只是需要有人，和他们一起<G>抬头</G>。
            </div>
          </div>
        </Black>
      )}
      {f >= s(cards) && (
        <AbsoluteFill>
          <Room f={f} glow={0.8} dark={0.55} stars={<SkyStars f={f} n={7} glint={0.3} />}>
            <Sprite name="mom_sit" x={290} bottom={800} height={330} />
            <Sprite name="boy_sit" x={450} bottom={770} height={235} />
          </Room>
          <AbsoluteFill style={{background: 'rgba(5,5,7,0.25)'}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,5,7,0.55) 0%, transparent 28%, transparent 58%, rgba(5,5,7,0.92) 82%)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', opacity: ramp(f, cards, 0.8)}}>
            <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 100, color: COL.gold, letterSpacing: 12, textShadow: '0 0 40px rgba(243,180,90,0.45)'}}>他不是来自星星</div>
            <div style={{fontFamily: SANS, fontSize: 28, color: 'rgba(244,239,230,0.75)', marginTop: 22, letterSpacing: 6}}>安安 · 妈妈 · 小星</div>
          </div>
          <div style={{position: 'absolute', left: 120, right: 120, bottom: 72, textAlign: 'center', opacity: ramp(f, cards + 1.2, 0.8)}}>
            <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, color: 'rgba(244,239,230,0.92)', lineHeight: 1.6}}>
              中国 6–12 岁儿童中，约每 <span style={{color: COL.gold}}>142</span> 人就有 1 人属于孤独症谱系
            </div>
            <div style={{fontFamily: SANS, fontSize: 22, color: 'rgba(244,239,230,0.55)', marginTop: 6}}>（2020 年全国多中心研究）</div>
            <div style={{fontFamily: SANS, fontSize: 24, color: 'rgba(244,239,230,0.7)', marginTop: 18, letterSpacing: 2}}>故事为虚构 · 每个孤独症孩子都不一样</div>
            <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 30, color: COL.gold, marginTop: 30, letterSpacing: 8}}>— 苏格拉没有底 —</div>
          </div>
          <Black o={ramp(f, 246.2, 0.8)} />
        </AbsoluteFill>
      )}
    </>
  );
};

export const Ep54Full: React.FC = () => {
  const f = useCurrentFrame();
  const vol = (fr: number) => 1 - clamp((fr - s(245.6)) / s(1.4));
  return (
    <AbsoluteFill style={{background: '#050507'}}>
      <Audio src={staticFile('music/ep54-bgm.wav')} volume={vol} />
      <Hook f={f} />
      <AskScene f={f} />
      <ChatGroup f={f} />
      <Elevator f={f} />
      <GrandmaCall f={f} />
      <EveryoneAsks f={f} />
      <StarTalk f={f} />
      <WantOff f={f} />
      <Teaser f={f} full />
      <SearchMom f={f} />
      <BigLine f={f} />
      <SearchHappy f={f} />
      <SearchFear f={f} />
      <MomAsksStar f={f} />
      <FailedTry f={f} />
      <Notebook f={f} />
      <Relay f={f} />
      <Stickers f={f} />
      <CeilingSeen f={f} />
      <Storm f={f} />
      <Gone f={f} />
      <SitBeside f={f} />
      <LookUp f={f} />
      <NextNight f={f} />
      <LastLog f={f} />
      <Finale f={f} />
    </AbsoluteFill>
  );
};
