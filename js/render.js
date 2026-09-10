'use strict';
/* ========== 描画 ========== */

const JP_FONT = '"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif';

/* ---------------- 人 ---------------- */
function drawPerson(ctx, p, opts) {
  const o = opts || {};
  const s = o.scale || 1;
  const bobY = Math.sin(p.bob) * 1.6 * s;

  ctx.save();
  ctx.translate(p.x, p.y);

  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(2 * s, 4 * s, 12 * s, 7 * s, 0, 0, TAU); ctx.fill();

  ctx.translate(0, bobY);
  ctx.rotate(p.face + Math.PI / 2);

  // 腕（歩行で振れる）
  const sw = Math.sin(p.bob) * 5 * s;
  ctx.strokeStyle = o.body || '#c9b3d6';
  ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9 * s, 0); ctx.lineTo(-11 * s, sw);
  ctx.moveTo(9 * s, 0);  ctx.lineTo(11 * s, -sw);
  ctx.stroke();

  // 胴（もんぺ＋割烹着）
  ctx.fillStyle = o.body || '#c9b3d6';
  ctx.beginPath(); ctx.ellipse(0, 1 * s, 10 * s, 12 * s, 0, 0, TAU); ctx.fill();
  // 花柄
  if (o.pattern) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (const d of [[-4, -4], [3, -6], [5, 2], [-3, 4], [0, -1]]) {
      ctx.beginPath(); ctx.arc(d[0] * s, d[1] * s, 1.5 * s, 0, TAU); ctx.fill();
    }
  }
  // 背中の丸み（腰が曲がってる）
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(0, 5 * s, 8 * s, 6 * s, 0, 0, TAU); ctx.fill();

  // 頭（白髪）
  ctx.fillStyle = o.hair || '#e8e8e8';
  ctx.beginPath(); ctx.arc(0, -8 * s, 7.2 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.beginPath(); ctx.arc(0, -6.5 * s, 7.2 * s, 0.2, Math.PI - 0.2); ctx.fill();
  // 鼻先で向きを示す
  ctx.fillStyle = '#e8bfa0';
  ctx.beginPath(); ctx.arc(0, -13.5 * s, 2.2 * s, 0, TAU); ctx.fill();

  ctx.restore();
}

/* 杖 */
function drawCane(ctx, p) {
  const t = p.swing > 0 ? p.swing / 0.24 : 0;
  const a = p.face + (t > 0 ? lerp(0.9, -0.9, 1 - t) : 0.7);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(24, -2); ctx.stroke();
  ctx.restore();

  if (p.swing > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(p.swing / 0.24, 0, 1) * 0.5;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 30, p.face - 0.9, p.face + 0.9); ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- 軽トラ ---------------- */
function drawVehicle(ctx, v) {
  ctx.save();
  ctx.translate(v.x, v.y);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.save(); ctx.rotate(v.angle);
  roundRect(ctx, -v.hl + 4, -v.hw + 5, v.hl * 2, v.hw * 2, 5); ctx.fill();
  ctx.restore();

  ctx.rotate(v.angle);

  // 荷台
  ctx.fillStyle = '#cfcfc8';
  roundRect(ctx, -v.hl, -v.hw, v.hl * 2, v.hw * 2, 4); ctx.fill();
  ctx.fillStyle = '#9a9a92';
  ctx.fillRect(-v.hl + 3, -v.hw + 3, v.hl - 2, v.hw * 2 - 6);
  // キャビン
  ctx.fillStyle = '#f2f2ec';
  roundRect(ctx, 2, -v.hw + 1, v.hl - 3, v.hw * 2 - 2, 4); ctx.fill();
  // 窓
  ctx.fillStyle = '#3c4a55';
  ctx.fillRect(v.hl - 12, -v.hw + 4, 6, v.hw * 2 - 8);
  ctx.fillRect(4, -v.hw + 4, 4, v.hw * 2 - 8);
  // タイヤ
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-v.hl + 3, -v.hw - 2, 8, 4);
  ctx.fillRect(-v.hl + 3, v.hw - 2, 8, 4);
  ctx.fillRect(v.hl - 12, -v.hw - 2, 8, 4);
  ctx.fillRect(v.hl - 12, v.hw - 2, 8, 4);
  // ライト
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(v.hl - 2, -v.hw + 3, 3, 4);
  ctx.fillRect(v.hl - 2, v.hw - 7, 3, 4);

  ctx.restore();
}

/* ---------------- 動物 ---------------- */
function drawCritter(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y + Math.sin(c.bob) * 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(1, 4, 8, 4, 0, 0, TAU); ctx.fill();
  ctx.rotate(c.face);

  if (c.kind === 'chicken') {
    ctx.fillStyle = '#f4f0e4';
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4f0e4';
    ctx.beginPath(); ctx.arc(7, 0, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e03b2f';
    ctx.beginPath(); ctx.arc(7, -3.5, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8a13a';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, 1); ctx.lineTo(10, 2); ctx.fill();
  } else {
    ctx.fillStyle = '#4a4440';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 0, 5, 0, TAU); ctx.fill();
    // 耳
    ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(9, -9); ctx.lineTo(11, -4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(9, 9); ctx.lineTo(11, 4); ctx.fill();
    // しっぽ
    ctx.strokeStyle = '#4a4440'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-16, -4, -14, -10); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- 落し物 ---------------- */
function drawItem(ctx, it, time) {
  const y = it.y + Math.sin(time * 3 + it.t) * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(it.x + 1, it.y + 8, 9, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d8dcc4';
  roundRect(ctx, it.x - 9, y - 10, 18, 18, 5); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, it.x - 5, y - 13, 10, 5, 2); ctx.fill();
  ctx.restore();
}

/* ---------------- マーカー ---------------- */
function drawMarker(ctx, m, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = 0.25 + pulse * 0.25;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r + pulse * 6, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke();
  // 下向き矢印
  ctx.globalAlpha = 0.85 + pulse * 0.15;
  const off = -m.r - 18 - pulse * 5;
  ctx.beginPath();
  ctx.moveTo(m.x, m.y + off + 14);
  ctx.lineTo(m.x - 9, m.y + off);
  ctx.lineTo(m.x + 9, m.y + off);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* 依頼主の「！」 */
function drawBang(ctx, n, time) {
  const b = Math.sin(time * 5) * 3;
  ctx.save();
  ctx.translate(n.x, n.y - 30 + b);
  ctx.font = 'bold 26px ' + JP_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText('!', 0, 0);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('!', 0, 0);
  ctx.restore();
}

/* 名前 / セリフ */
function drawLabel(ctx, x, y, text, color, size) {
  ctx.save();
  ctx.font = `bold ${size || 12}px ` + JP_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color || '#fff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 日本語は単語区切りが無いので 1 文字ずつ詰めて折り返す */
function wrapJa(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    // 禁則処理：行頭に来ると具合の悪い文字は前の行に押し込む
    if (line && ctx.measureText(line + ch).width > maxW && !NO_LINE_START.includes(ch)) {
      lines.push(line); line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const BUBBLE_LH = 18;   // 行の高さ
// 行頭に置かない文字（句読点・閉じ括弧・小書きかな・長音）
const NO_LINE_START = '、。，．！？」』）］｝・…ー〜っゃゅょぁぃぅぇぉッャュョァィゥェォヽヾゝゞ';

function drawBubble(ctx, x, y, text) {
  ctx.save();
  ctx.font = 'bold 13px ' + JP_FONT;
  const lines = wrapJa(ctx, text, 260);
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
  const w = tw + 22;
  const h = lines.length * BUBBLE_LH + 12;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, x - w / 2, y - h, w, h, 8); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y); ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y - h + 6 + BUBBLE_LH * (i + 0.5));
  }
  ctx.restore();
}

/* 対象の頭上に出す操作プロンプト */
function drawKeyPrompt(ctx, x, y, key, text) {
  ctx.save();
  ctx.font = 'bold 12px ' + JP_FONT;
  const tw = ctx.measureText(text).width;
  const kw = Math.max(26, ctx.measureText(key).width + 14);
  const pad = 7, gap = 6;
  const w = pad * 2 + kw + gap + tw, h = 24;
  const bx = x - w / 2, by = y - h;

  ctx.fillStyle = 'rgba(14,17,11,0.85)';
  roundRect(ctx, bx, by, w, h, 6); ctx.fill();

  ctx.fillStyle = '#fff';
  roundRect(ctx, bx + pad, by + 4, kw, h - 8, 4); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px ' + JP_FONT;
  ctx.fillText(key, bx + pad + kw / 2, by + h / 2 + 0.5);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px ' + JP_FONT;
  ctx.fillText(text, bx + pad + kw + gap, by + h / 2 + 0.5);
  ctx.restore();
}

/* ---------------- エフェクト ---------------- */
function drawEffect(ctx, e) {
  const t = e.life / e.max;
  ctx.save();
  ctx.globalAlpha = clamp(t, 0, 1);
  switch (e.type) {
    case 'text':
      ctx.font = 'bold ' + (e.size || 16) + 'px ' + JP_FONT;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(e.text, e.x, e.y);
      ctx.fillStyle = e.color || '#fff';
      ctx.fillText(e.text, e.x, e.y);
      break;
    case 'dust':
      ctx.fillStyle = e.color || 'rgba(220,210,180,0.9)';
      ctx.beginPath(); ctx.arc(e.x, e.y, (1 - t) * 22 + 4, 0, TAU); ctx.fill();
      break;
    case 'hit':
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, (1 - t) * 26 + 6, 0, TAU); ctx.stroke();
      break;
    case 'boom': {
      const r = (1 - t) * 70 + 10;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, 'rgba(255,240,160,0.95)');
      g.addColorStop(0.5, 'rgba(255,140,40,0.85)');
      g.addColorStop(1, 'rgba(120,40,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* =========================================================
   メイン描画
========================================================= */
function drawScene(ctx, G) {
  const { cam, view } = G;
  const z = cam.zoom;

  ctx.save();
  ctx.fillStyle = '#20301a';
  ctx.fillRect(0, 0, view.w, view.h);

  ctx.translate(view.w / 2, view.h / 2);
  ctx.scale(z, z);
  ctx.translate(-cam.x, -cam.y);

  // 可視範囲
  const vw = view.w / z, vh = view.h / z;
  const vx = cam.x - vw / 2, vy = cam.y - vh / 2;

  // 地面（焼いた画像から切り出す）
  const sx = clamp(vx, 0, WORLD.w), sy = clamp(vy, 0, WORLD.h);
  const ex = clamp(vx + vw, 0, WORLD.w), ey = clamp(vy + vh, 0, WORLD.h);
  if (ex > sx && ey > sy) {
    ctx.drawImage(G.ground, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  }

  const inView = (x, y, pad) => x > vx - pad && x < vx + vw + pad && y > vy - pad && y < vy + vh + pad;
  const focus = G.focus;

  // マーカー（地面の上）
  for (const m of G.markers) if (inView(m.x, m.y, 120)) drawMarker(ctx, m, G.time);

  // 落し物
  for (const it of G.items) if (!it.taken && inView(it.x, it.y, 60)) drawItem(ctx, it, G.time);

  // 動物
  for (const c of G.critters) if (!c.caught && inView(c.x, c.y, 60)) drawCritter(ctx, c);

  // 軽トラ
  for (const v of G.vehicles) if (inView(v.x, v.y, 90)) drawVehicle(ctx, v);

  // 村人
  for (const n of G.npcs) {
    if (!inView(n.x, n.y, 90)) continue;
    const isCop = n.kind === 'cop';
    drawPerson(ctx, n, {
      body: n.color, hair: n.hair,
      pattern: n.kind !== 'cop' && n.kind !== 'target',
      scale: isCop ? 1.02 : 1,
    });
    if (isCop) {
      // 制帽
      ctx.save();
      ctx.fillStyle = '#1b2a52';
      ctx.beginPath(); ctx.arc(n.x, n.y - 8, 7.6, 0, TAU); ctx.fill();
      ctx.restore();
      drawLabel(ctx, n.x, n.y - 30, '駐在', '#9fd0ff', 12);
    } else if (n.stun > 0) {
      drawLabel(ctx, n.x, n.y - 30, '＠＠', '#ffd23f', 14);
    }

    if (n.talkT > 0) drawBubble(ctx, n.x, n.y - 34, n.talk);
    else if (focus && focus.obj === n) { /* 頭上にプロンプトが出るので名前と「！」は省く */ }
    else if (n.kind === 'giver' && Missions.hasWork(n.id)) drawBang(ctx, n, G.time);
    else if (n.kind === 'giver' || n.kind === 'fixed') drawLabel(ctx, n.x, n.y - 28, n.name, '#e8f0d8', 11);
  }

  // ばあちゃん本体
  const p = G.player;
  if (!p.vehicle) {
    drawPerson(ctx, p, { body: '#b9a4d2', hair: '#f0f0f0', pattern: true });
    drawCane(ctx, p);
    if (p.carry > 0) {
      ctx.save();
      ctx.fillStyle = '#d8dcc4';
      roundRect(ctx, p.x - 8, p.y - 26, 16, 14, 4); ctx.fill();
      drawLabel(ctx, p.x + 14, p.y - 20, '×' + p.carry, '#fff', 11);
      ctx.restore();
    }
  }

  // 目の前の対象に「E」プロンプト。
  // セリフの吹き出しが出ている間は重なって読めなくなるので出さない。
  const talking = focus && focus.obj && focus.obj.talkT > 0;
  if (focus && focus.x != null && !p.vehicle && !talking) {
    const dy = focus.type === 'talk' ? 34 : focus.type === 'ride' ? 32 : 26;
    drawKeyPrompt(ctx, focus.x, focus.y - dy, 'E', focus.label);
  }

  // エフェクト
  for (const e of G.effects) drawEffect(ctx, e);

  // 画面外マーカーの方向指示
  ctx.restore();
  drawOffscreenArrows(ctx, G);
}

function drawOffscreenArrows(ctx, G) {
  const { cam, view } = G;
  const z = cam.zoom;
  for (const m of G.markers) {
    const sx = (m.x - cam.x) * z + view.w / 2;
    const sy = (m.y - cam.y) * z + view.h / 2;
    const pad = 60;
    if (sx > pad && sx < view.w - pad && sy > pad && sy < view.h - pad) continue;

    const cx = view.w / 2, cy = view.h / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const rx = view.w / 2 - 54, ry = view.h / 2 - 54;
    // 楕円上に配置
    const k = 1 / Math.max(Math.abs(Math.cos(a)) / rx, Math.abs(Math.sin(a)) / ry);
    const px = cx + Math.cos(a) * k, py = cy + Math.sin(a) * k;

    ctx.save();
    ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    const d = Math.round(dist(G.player.x, G.player.y, m.x, m.y));
    drawLabel(ctx, px, py + 22, d + 'm', '#ffd23f', 11);
  }
}

/* =========================================================
   ミニマップ
========================================================= */
function drawMinimap(mctx, G) {
  const S = 170, R = S / 2;
  const span = 620;   // 表示するワールド範囲
  const k = S / span;
  const p = G.player.vehicle || G.player;

  mctx.save();
  mctx.clearRect(0, 0, S, S);
  mctx.beginPath(); mctx.arc(R, R, R, 0, TAU); mctx.clip();

  mctx.fillStyle = '#2c3a22';
  mctx.fillRect(0, 0, S, S);

  const sx = p.x - span / 2, sy = p.y - span / 2;
  mctx.drawImage(G.ground, sx, sy, span, span, 0, 0, S, S);

  const toMap = (x, y) => [(x - sx) * k, (y - sy) * k];

  // 目的地
  for (const m of G.markers) {
    const [x, y] = toMap(m.x, m.y);
    mctx.fillStyle = '#ffd23f';
    mctx.beginPath(); mctx.arc(x, y, 5, 0, TAU); mctx.fill();
  }
  // 依頼主
  for (const n of G.npcs) {
    if (n.kind === 'cop') {
      const [x, y] = toMap(n.x, n.y);
      mctx.fillStyle = '#4d9bff';
      mctx.beginPath(); mctx.arc(x, y, 4, 0, TAU); mctx.fill();
    } else if (n.kind === 'giver' && Missions.hasWork(n.id)) {
      const [x, y] = toMap(n.x, n.y);
      mctx.fillStyle = '#ffe27a';
      mctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }
  // 軽トラ
  for (const v of G.vehicles) {
    const [x, y] = toMap(v.x, v.y);
    mctx.fillStyle = '#f2f2ec';
    mctx.fillRect(x - 2.5, y - 2.5, 5, 5);
  }
  // 自分
  const [px, py] = toMap(p.x, p.y);
  mctx.save();
  mctx.translate(px, py);
  mctx.rotate((G.player.vehicle ? G.player.vehicle.angle : G.player.face) + Math.PI / 2);
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(0, 3); mctx.lineTo(-5, 6);
  mctx.closePath(); mctx.fill();
  mctx.restore();

  mctx.restore();

  // 枠
  mctx.save();
  mctx.strokeStyle = 'rgba(0,0,0,0.6)'; mctx.lineWidth = 4;
  mctx.beginPath(); mctx.arc(R, R, R - 2, 0, TAU); mctx.stroke();
  mctx.restore();
}

/* =========================================================
   拡大マップ
========================================================= */
function drawBigmap(bctx, G) {
  const W = 800, H = 600;
  const k = W / WORLD.w;
  bctx.clearRect(0, 0, W, H);
  bctx.drawImage(G.ground, 0, 0, WORLD.w, WORLD.h, 0, 0, W, H);
  bctx.fillStyle = 'rgba(0,0,0,0.15)';
  bctx.fillRect(0, 0, W, H);

  for (const n of G.npcs) {
    if (n.kind === 'giver' && Missions.hasWork(n.id)) {
      bctx.fillStyle = '#ffe27a';
      bctx.fillRect(n.x * k - 4, n.y * k - 4, 8, 8);
      bctx.font = 'bold 11px ' + JP_FONT;
      bctx.textAlign = 'center';
      bctx.lineWidth = 3; bctx.strokeStyle = 'rgba(0,0,0,0.8)';
      bctx.strokeText(n.name, n.x * k, n.y * k - 8);
      bctx.fillText(n.name, n.x * k, n.y * k - 8);
    }
  }
  for (const m of G.markers) {
    bctx.fillStyle = '#ffd23f';
    bctx.beginPath(); bctx.arc(m.x * k, m.y * k, 7, 0, TAU); bctx.fill();
    bctx.strokeStyle = '#fff'; bctx.lineWidth = 2; bctx.stroke();
  }
  for (const v of G.vehicles) {
    bctx.fillStyle = '#f2f2ec';
    bctx.fillRect(v.x * k - 3, v.y * k - 3, 6, 6);
  }
  const p = G.player.vehicle || G.player;
  bctx.fillStyle = '#ff3b30';
  bctx.beginPath(); bctx.arc(p.x * k, p.y * k, 6, 0, TAU); bctx.fill();
  bctx.strokeStyle = '#fff'; bctx.lineWidth = 2; bctx.stroke();
}
