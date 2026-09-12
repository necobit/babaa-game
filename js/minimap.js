'use strict';
/* ========== ミニマップ／拡大マップ（2D キャンバスのまま） ==========
   3D 表示とは別に、焼いておいた真上からのマップ画像を使う。
------------------------------------------------------------------ */

const JP_FONT = '"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif';

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
