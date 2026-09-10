'use strict';
/* ========== ワールド定義（限界集落） ========== */

const WORLD = {
  w: 3200,
  h: 2400,

  // --- 道路（矩形）---
  roads: [
    { x: 100, y: 514, w: 3000, h: 92 },   // H1 上の県道
    { x: 100, y: 1314, w: 3000, h: 92 },  // H2 中央の村道
    { x: 100, y: 1974, w: 3000, h: 92 },  // H3 下の農道
    { x: 374, y: 120, w: 92, h: 2080 },   // V1
    { x: 1254, y: 120, w: 92, h: 2140 },  // V2
    { x: 2254, y: 300, w: 92, h: 1960 },  // V3
    { x: 2854, y: 514, w: 92, h: 1552 },  // V4
  ],

  // --- 川（衝突あり。橋の部分だけ通れる）---
  river: { x: 1850, y: 0, w: 86, h: 2400 },
  bridges: [
    { x: 1836, y: 500, w: 114, h: 120 },
    { x: 1836, y: 1300, w: 114, h: 120 },
    { x: 1836, y: 1960, w: 114, h: 120 },
  ],

  // --- 田んぼ ---
  paddies: [
    { x: 520, y: 700, w: 500, h: 270 },
    { x: 520, y: 1030, w: 500, h: 230 },
    { x: 1450, y: 1500, w: 340, h: 380 },
    { x: 2400, y: 620, w: 400, h: 250 },
    { x: 2000, y: 260, w: 200, h: 210 },
  ],

  // --- 畑（土）---
  farms: [
    { x: 560, y: 1900, w: 380, h: 240 },   // 草むしり現場
    { x: 1450, y: 190, w: 380, h: 230 },
  ],

  // --- 建物 ---
  buildings: [
    { id: 'home',    x: 150,  y: 1480, w: 200, h: 160, name: 'ばあちゃんの家', roof: '#8d6b52' },
    { id: 'tanaka',  x: 600,  y: 300,  w: 230, h: 170, name: '田中さん宅',     roof: '#7c6a86' },
    { id: 'suzuki',  x: 1000, y: 260,  w: 210, h: 160, name: '鈴木さん宅',     roof: '#6f7d8c' },
    { id: 'sato',    x: 760,  y: 1600, w: 210, h: 165, name: '佐藤さん宅',     roof: '#87705a' },
    { id: 'kaikan',  x: 1450, y: 700,  w: 320, h: 210, name: '公民館',         roof: '#5e6f7a' },
    { id: 'ja',      x: 2400, y: 250,  w: 300, h: 185, name: 'ＪＡ直売所',     roof: '#7a8a5c' },
    { id: 'souko',   x: 2500, y: 1100, w: 260, h: 170, name: '農協倉庫',       roof: '#6b6b6b' },
    { id: 'jinja',   x: 2560, y: 1680, w: 250, h: 220, name: '鎮守の森神社',   roof: '#8b4a3a' },
    { id: 'gomi',    x: 1080, y: 1500, w: 130, h: 100, name: 'ゴミ捨て場',     roof: '#5a6a4a' },
  ],

  // --- 山（円形エリア。頂上へ登れる）---
  mountain: { x: 3000, y: 160, r: 430 },
  trail: [{ x: 2900, y: 545 }, { x: 3000, y: 175 }],  // 登山道

  // --- 神社の境内（村八分度が下がるセーフゾーン）---
  sanctuary: { x: 2685, y: 1830, r: 210 },

  // 生成物（初期化時に埋める）
  trees: [],
  props: [],
};

/* よく使う座標に名前を付けておく */
const SPOT = {
  homeDoor:   { x: 250,  y: 1680 },
  homeBed:    { x: 250,  y: 1560 },
  tanakaDoor: { x: 715,  y: 500 },
  suzukiDoor: { x: 1105, y: 450 },
  satoDoor:   { x: 865,  y: 1795 },
  kaikanDoor: { x: 1610, y: 945 },
  jaDoor:     { x: 2550, y: 478 },
  soukoDoor:  { x: 2630, y: 1300 },
  jinjaFront: { x: 2685, y: 1960 },
  gomiba:     { x: 1145, y: 1640 },
  vending:    { x: 1370, y: 1210 },
  summit:     { x: 3000, y: 175 },
  torii:      { x: 2685, y: 2090 },
  idobata:    { x: 1100, y: 1230 },
};

/* ---------------------------------------------------------
   マップ上の「空き地」判定（木やアイテムを置いていい場所か）
--------------------------------------------------------- */
function isBlockedArea(x, y, pad) {
  pad = pad || 0;
  for (const r of WORLD.roads)     if (inRectPad(x, y, r, pad)) return true;
  for (const b of WORLD.buildings) if (inRectPad(x, y, b, pad + 20)) return true;
  for (const p of WORLD.paddies)   if (inRectPad(x, y, p, pad)) return true;
  for (const f of WORLD.farms)     if (inRectPad(x, y, f, pad)) return true;
  if (inRectPad(x, y, WORLD.river, pad + 30)) return true;
  // 登山道の近くは空けておく
  const t = WORLD.trail;
  if (distToSeg(x, y, t[0].x, t[0].y, t[1].x, t[1].y) < 70 + pad) return true;
  return false;
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}

/** 川の上（＝渡れない）か。橋の上なら false */
function inRiver(x, y) {
  if (!inRect(x, y, WORLD.river)) return false;
  for (const b of WORLD.bridges) if (inRect(x, y, b)) return false;
  return true;
}

/** 山の斜面にいるか（速度が落ちる） */
function onMountain(x, y) {
  const m = WORLD.mountain;
  return dist2(x, y, m.x, m.y) < m.r * m.r;
}

/* ---------------------------------------------------------
   木・小物の配置
--------------------------------------------------------- */
function generateProps() {
  const rnd = mulberry32(20260910);

  // --- 木 ---
  const trees = [];
  let tries = 0;
  while (trees.length < 210 && tries < 6000) {
    tries++;
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
    if (isBlockedArea(x, y, 26)) continue;

    // 山の上は密度アップ、平地はまばら
    const m = WORLD.mountain;
    const onMt = dist2(x, y, m.x, m.y) < m.r * m.r;
    if (!onMt && rnd() < 0.55) continue;

    let ok = true;
    for (const t of trees) { if (dist2(x, y, t.x, t.y) < 62 * 62) { ok = false; break; } }
    if (!ok) continue;

    trees.push({ x, y, r: 15 + rnd() * 7, tone: rnd() });
  }
  WORLD.trees = trees;

  // --- 小物 ---
  const props = [];
  // 電柱（道路沿い）
  for (let x = 200; x < WORLD.w; x += 260) {
    props.push({ type: 'pole', x, y: 494 });
    props.push({ type: 'pole', x: x + 130, y: 1428 });
  }
  for (let y = 260; y < 2200; y += 280) props.push({ type: 'pole', x: 356, y });

  props.push({ type: 'vend',   x: SPOT.vending.x, y: SPOT.vending.y });
  props.push({ type: 'torii',  x: SPOT.torii.x,   y: SPOT.torii.y });
  props.push({ type: 'saisen', x: SPOT.jinjaFront.x, y: SPOT.jinjaFront.y - 45 });
  props.push({ type: 'bus',    x: 1380, y: 620 });
  props.push({ type: 'sign',   x: 1200, y: 1450, text: '←ゴミ捨て場' });
  props.push({ type: 'sign',   x: 2960, y: 640,  text: '登山道→' });
  props.push({ type: 'well',   x: SPOT.idobata.x, y: SPOT.idobata.y + 34 });
  WORLD.props = props;
}

/* ---------------------------------------------------------
   背景を 1 枚のオフスクリーンキャンバスに焼く
--------------------------------------------------------- */
function bakeGround() {
  const c = document.createElement('canvas');
  c.width = WORLD.w; c.height = WORLD.h;
  const g = c.getContext('2d');
  const rnd = mulberry32(777);

  // 草地ベース
  g.fillStyle = '#7fae5a';
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // 草のムラ
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
    const r = 24 + rnd() * 90;
    g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * TAU, 0, TAU); g.fill();
  }

  // 山（同心円で高さを表現）
  const m = WORLD.mountain;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    g.fillStyle = `rgba(${Math.round(70 - t * 22)},${Math.round(122 - t * 34)},${Math.round(58 - t * 14)},0.85)`;
    g.beginPath(); g.arc(m.x, m.y, m.r * (1 - t * 0.13), 0, TAU); g.fill();
  }
  // 登山道
  g.strokeStyle = '#a98f63'; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(WORLD.trail[0].x, WORLD.trail[0].y);
  g.quadraticCurveTo(2830, 380, WORLD.trail[1].x, WORLD.trail[1].y); g.stroke();

  // 田んぼ
  for (const p of WORLD.paddies) {
    g.fillStyle = '#8fae4d';
    g.fillRect(p.x, p.y, p.w, p.h);
    g.strokeStyle = 'rgba(60,90,30,0.45)'; g.lineWidth = 3;
    for (let y = p.y + 16; y < p.y + p.h; y += 22) {
      g.beginPath(); g.moveTo(p.x + 6, y); g.lineTo(p.x + p.w - 6, y); g.stroke();
    }
    g.strokeStyle = '#6d8a3c'; g.lineWidth = 8;
    g.strokeRect(p.x, p.y, p.w, p.h);
  }

  // 畑
  for (const f of WORLD.farms) {
    g.fillStyle = '#9a7b4f';
    g.fillRect(f.x, f.y, f.w, f.h);
    g.fillStyle = 'rgba(0,0,0,0.10)';
    for (let x = f.x + 14; x < f.x + f.w - 8; x += 34) g.fillRect(x, f.y + 8, 16, f.h - 16);
    g.strokeStyle = '#7d6340'; g.lineWidth = 6;
    g.strokeRect(f.x, f.y, f.w, f.h);
  }

  // 川
  const rv = WORLD.river;
  g.fillStyle = '#7a8f5e'; g.fillRect(rv.x - 16, rv.y, rv.w + 32, rv.h);   // 岸
  g.fillStyle = '#4f8fc0'; g.fillRect(rv.x, rv.y, rv.w, rv.h);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  for (let y = 0; y < WORLD.h; y += 46) g.fillRect(rv.x + 12 + (y % 92 ? 20 : 0), y, 30, 5);

  // 道路
  for (const r of WORLD.roads) {
    g.fillStyle = '#6f6f6b'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(r.x, r.y, r.w, 5);
    g.fillRect(r.x, r.y + r.h - 5, r.w, 5);
  }
  // センターライン
  g.strokeStyle = 'rgba(240,240,220,0.55)'; g.lineWidth = 4; g.setLineDash([26, 22]);
  for (const r of WORLD.roads) {
    g.beginPath();
    if (r.w > r.h) { g.moveTo(r.x, r.y + r.h / 2); g.lineTo(r.x + r.w, r.y + r.h / 2); }
    else           { g.moveTo(r.x + r.w / 2, r.y); g.lineTo(r.x + r.w / 2, r.y + r.h); }
    g.stroke();
  }
  g.setLineDash([]);

  // 橋
  for (const b of WORLD.bridges) {
    g.fillStyle = '#9b7c50'; g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = b.y + 6; y < b.y + b.h; y += 16) g.fillRect(b.x, y, b.w, 4);
    g.fillStyle = '#c8ac7c';
    g.fillRect(b.x - 6, b.y, 8, b.h); g.fillRect(b.x + b.w - 2, b.y, 8, b.h);
  }

  // 神社の境内
  const s = WORLD.sanctuary;
  g.fillStyle = 'rgba(200,180,120,0.35)';
  g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();

  // 建物
  for (const b of WORLD.buildings) drawBuilding(g, b);

  // 小物
  for (const p of WORLD.props) drawProp(g, p);

  // 木
  for (const t of WORLD.trees) drawTree(g, t);

  return c;
}

function drawBuilding(g, b) {
  // 影
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(b.x + 9, b.y + 11, b.w, b.h);
  // 壁（外周の見え）
  g.fillStyle = '#d9cdb6';
  g.fillRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
  // 屋根
  g.fillStyle = b.roof;
  g.fillRect(b.x, b.y, b.w, b.h);
  // 棟と瓦
  g.fillStyle = 'rgba(0,0,0,0.18)';
  if (b.w > b.h) {
    g.fillRect(b.x, b.y + b.h / 2 - 4, b.w, 8);
    for (let x = b.x + 10; x < b.x + b.w; x += 20) g.fillRect(x, b.y, 2, b.h);
  } else {
    g.fillRect(b.x + b.w / 2 - 4, b.y, 8, b.h);
    for (let y = b.y + 10; y < b.y + b.h; y += 20) g.fillRect(b.x, y, b.w, 2);
  }
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(b.x, b.y, b.w, 6);

  // 名札
  g.font = 'bold 17px "Hiragino Sans","Yu Gothic",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.strokeText(b.name, b.x + b.w / 2, b.y + b.h / 2);
  g.fillStyle = '#fff';
  g.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2);
}

function drawTree(g, t) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(t.x + 5, t.y + 7, t.r, t.r * 0.85, 0, 0, TAU); g.fill();
  const dark = 42 + t.tone * 26;
  g.fillStyle = `rgb(${Math.round(38 + t.tone * 20)},${Math.round(88 + dark)},${Math.round(44 + t.tone * 22)})`;
  g.beginPath(); g.arc(t.x, t.y, t.r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.beginPath(); g.arc(t.x - t.r * 0.28, t.y - t.r * 0.3, t.r * 0.5, 0, TAU); g.fill();
}

function drawProp(g, p) {
  g.save();
  switch (p.type) {
    case 'pole':
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(p.x - 3 + 4, p.y - 3 + 5, 10, 10);
      g.fillStyle = '#8a8a86'; g.fillRect(p.x - 5, p.y - 5, 10, 10);
      g.fillStyle = '#6b6b66'; g.fillRect(p.x - 16, p.y - 2, 32, 4);
      break;
    case 'vend':
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(p.x - 16, p.y - 10, 36, 30);
      g.fillStyle = '#d33a3a'; g.fillRect(p.x - 20, p.y - 14, 36, 30);
      g.fillStyle = '#ffe9a8'; g.fillRect(p.x - 16, p.y - 10, 28, 14);
      g.fillStyle = '#333';    g.fillRect(p.x - 16, p.y + 6, 28, 5);
      break;
    case 'torii':
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(p.x - 44, p.y - 10, 92, 26);
      g.fillStyle = '#c8452f';
      g.fillRect(p.x - 48, p.y - 14, 96, 12);
      g.fillRect(p.x - 40, p.y + 2, 80, 7);
      g.fillRect(p.x - 40, p.y - 14, 12, 34);
      g.fillRect(p.x + 28, p.y - 14, 12, 34);
      break;
    case 'saisen':
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(p.x - 24, p.y - 12, 56, 30);
      g.fillStyle = '#6f5433'; g.fillRect(p.x - 28, p.y - 16, 56, 30);
      g.fillStyle = '#3a2c1c'; g.fillRect(p.x - 20, p.y - 10, 40, 8);
      break;
    case 'bus':
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(p.x - 14, p.y - 8, 34, 22);
      g.fillStyle = '#e8e4d8'; g.fillRect(p.x - 18, p.y - 12, 34, 22);
      g.fillStyle = '#3b6ea5'; g.fillRect(p.x - 14, p.y - 8, 26, 6);
      break;
    case 'well':
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(p.x + 4, p.y + 5, 22, 0, TAU); g.fill();
      g.fillStyle = '#8e8a80'; g.beginPath(); g.arc(p.x, p.y, 22, 0, TAU); g.fill();
      g.fillStyle = '#2c3a44'; g.beginPath(); g.arc(p.x, p.y, 14, 0, TAU); g.fill();
      break;
    case 'sign':
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(p.x - 26, p.y - 6, 60, 18);
      g.fillStyle = '#f2ead6'; g.fillRect(p.x - 30, p.y - 10, 60, 18);
      g.fillStyle = '#333'; g.font = 'bold 12px "Hiragino Sans",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(p.text, p.x, p.y);
      break;
  }
  g.restore();
}

/** 静的な衝突物のリスト（建物＋木＋一部の小物） */
function buildColliders() {
  const rects = WORLD.buildings.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  const circles = WORLD.trees.map(t => ({ x: t.x, y: t.y, r: t.r * 0.7 }));
  for (const p of WORLD.props) {
    if (p.type === 'vend')   circles.push({ x: p.x - 2, y: p.y, r: 18 });
    if (p.type === 'well')   circles.push({ x: p.x, y: p.y, r: 22 });
    if (p.type === 'saisen') circles.push({ x: p.x, y: p.y, r: 22 });
    if (p.type === 'pole')   circles.push({ x: p.x, y: p.y, r: 7 });
  }
  return { rects, circles };
}
