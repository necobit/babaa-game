'use strict';
/* ========== 汎用ユーティリティ ========== */

const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

function angNorm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
/** a を b に向けて最大 max ラジアン回す */
function angApproach(a, b, max) { const d = angNorm(b - a); return a + clamp(d, -max, max); }

const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];

/** 決定的な乱数（マップ生成の再現用） */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 矩形 {x,y,w,h} の中に点があるか */
function inRect(x, y, R) {
  return x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;
}

/** 矩形を pad ぶん広げた判定 */
function inRectPad(x, y, R, pad) {
  return x >= R.x - pad && x <= R.x + R.w + pad && y >= R.y - pad && y <= R.y + R.h + pad;
}

/** 円 c={x,y,r} を矩形 R={x,y,w,h} の外へ押し出す。押し出したら true */
function pushOutRect(c, R) {
  const nx = clamp(c.x, R.x, R.x + R.w);
  const ny = clamp(c.y, R.y, R.y + R.h);
  const dx = c.x - nx, dy = c.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 > c.r * c.r) return false;

  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    c.x = nx + (dx / d) * c.r;
    c.y = ny + (dy / d) * c.r;
  } else {
    // 中心が矩形の内側 → いちばん近い辺へ吐き出す
    const l = c.x - R.x, r = R.x + R.w - c.x, t = c.y - R.y, b = R.y + R.h - c.y;
    const m = Math.min(l, r, t, b);
    if (m === l)      c.x = R.x - c.r;
    else if (m === r) c.x = R.x + R.w + c.r;
    else if (m === t) c.y = R.y - c.r;
    else              c.y = R.y + R.h + c.r;
  }
  return true;
}

/** 円 c を 円 o={x,y,r} の外へ押し出す */
function pushOutCircle(c, o) {
  const rr = c.r + o.r;
  const dx = c.x - o.x, dy = c.y - o.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > rr * rr || d2 < 1e-9) return false;
  const d = Math.sqrt(d2);
  c.x = o.x + (dx / d) * rr;
  c.y = o.y + (dy / d) * rr;
  return true;
}

/** 数値を 1,234 形式に */
function yen(n) { return '¥' + Math.round(n).toLocaleString('ja-JP'); }

/** 角丸矩形パス */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
