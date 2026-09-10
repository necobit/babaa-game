'use strict';
/* ========== ゲーム本体 ========== */

const G = {
  state: 'title',           // title | play | pause | map | busted
  time: 0,
  view: { w: 0, h: 0 },
  cam: { x: 0, y: 0, zoom: 1 },

  player: null,
  vehicles: [],
  npcs: [],
  critters: [],
  items: [],
  effects: [],
  markers: [],
  cops: [],

  wanted: 0,
  wantedDecay: 0,
  copCatch: 0,
  focus: null,
  ground: null,
  colliders: null,

  npc(id) { return this.npcs.find(n => n.id === id); },
};

/* ---------------- DOM ---------------- */
const el = {};
function grabDOM() {
  const ids = ['game', 'minimap', 'title', 'pause', 'bigmap', 'bigmapCanvas', 'busted',
    'hpFill', 'spFill', 'money', 'wanted', 'missionTitle', 'missionTimer',
    'objective', 'hint', 'tut', 'toasts', 'questLog', 'startBtn', 'resumeBtn'];
  for (const id of ids) el[id] = document.getElementById(id);
}

/* ---------------- 音（簡易） ---------------- */
const Sfx = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol == null ? 0.06 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  blip()  { this.tone(880, 0.12, 'square', 0.05); setTimeout(() => this.tone(1320, 0.12, 'square', 0.04), 70); },
  hit()   { this.tone(160, 0.12, 'sawtooth', 0.07); },
  pick()  { this.tone(1046, 0.08, 'triangle', 0.05); },
  bad()   { this.tone(220, 0.25, 'sawtooth', 0.07); },
  boom()  { this.tone(70, 0.45, 'sawtooth', 0.12); },
};

/* ---------------- HUD ヘルパ ---------------- */
G.toast = function (text, kind) {
  const d = document.createElement('div');
  d.className = 'toast' + (kind ? ' ' + kind : '');
  d.textContent = text;
  el.toasts.appendChild(d);
  setTimeout(() => d.classList.add('fade'), 2400);
  setTimeout(() => d.remove(), 3000);
};
G.fx = function (type, x, y, opt) { G.effects.push(new Effect(type, x, y, opt)); };
G.blip = function () { Sfx.blip(); };

let tutText = '', tutT = 0;
function tut(text, dur) {
  if (tutText === text) return;
  tutText = text; tutT = dur || 5;
  el.tut.textContent = text;
  el.tut.classList.add('show');
}

/* =========================================================
   初期化
========================================================= */
function init() {
  grabDOM();
  Input.init();

  generateProps();
  G.ground = bakeGround();
  G.colliders = buildColliders();

  resize();
  window.addEventListener('resize', resize);

  el.startBtn.addEventListener('click', startGame);
  el.resumeBtn.addEventListener('click', () => setState('play'));

  resetGame();
  requestAnimationFrame(frame);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  G.view.w = w; G.view.h = h;
  el.game.width = Math.floor(w * dpr);
  el.game.height = Math.floor(h * dpr);
  G.dpr = dpr;
}

function resetGame() {
  G.player = new Player(SPOT.homeDoor.x + 40, SPOT.homeDoor.y + 60);
  G.vehicles = [
    new Vehicle(430, 1720, -Math.PI / 2),
    new Vehicle(1500, 1050, 0),
    new Vehicle(2620, 1360, Math.PI),
    new Vehicle(1390, 700, Math.PI / 2),
  ];
  G.npcs = NPC_DEFS.map(d => new NPC(Object.assign({}, d)));
  G.critters = [];
  G.items = [];
  G.effects = [];
  G.cops = [];
  G.wanted = 0; G.wantedDecay = 0; G.copCatch = 0;
  G.time = 0;
  Missions.reset();
  G.cam.x = G.player.x; G.cam.y = G.player.y;
}

function startGame() {
  Sfx.ensure();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  setState('play');
  tut('WASD で移動 ／ Shift 長押しで早足 ／ Space で調べる', 8);
}

function setState(s) {
  G.state = s;
  Input.flush();
  el.title.classList.toggle('hidden', s !== 'title');
  el.pause.classList.toggle('hidden', s !== 'pause');
  el.bigmap.classList.toggle('hidden', s !== 'map');
  el.busted.classList.toggle('hidden', s !== 'busted');
  if (s === 'pause') renderQuestLog();
  if (s === 'map') drawBigmap(el.bigmapCanvas.getContext('2d'), G);
}

/* =========================================================
   メインループ
========================================================= */
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;

  handleGlobalKeys();

  if (G.state === 'play') update(dt);
  else if (G.state === 'busted') updateBusted(dt);

  render();
  Input.endFrame();
  requestAnimationFrame(frame);
}

function handleGlobalKeys() {
  if (G.state === 'title') {
    if (Input.hitAny(KEYS.interact)) startGame();
    return;
  }
  if (Input.hitAny(KEYS.pause)) {
    if (G.state === 'play') setState('pause');
    else if (G.state === 'pause') setState('play');
  }
  if (Input.hitAny(KEYS.map)) {
    if (G.state === 'play') setState('map');
    else if (G.state === 'map') setState('play');
  }
}

/* =========================================================
   更新
========================================================= */
function update(dt) {
  G.time += dt;
  const p = G.player;

  // --- 操作 ---
  // 対象が目の前にあるときは Space が優先で「調べる」。杖は J / 左クリック。
  if (Input.hitAny(KEYS.interact)) doInteract();
  if ((Input.hitAny(KEYS.attack) || Input.hit('@click')) && !p.vehicle) doSwing();

  // --- 移動 ---
  if (p.vehicle) {
    const v = p.vehicle;
    v.update(dt, Input);
    collideVehicle(v, dt);
    p.x = v.x; p.y = v.y;
    p.sp = Math.min(p.maxSp, p.sp + 22 * dt);
    if (v.smoke > 0 && Math.random() < 0.4) {
      G.fx('dust', v.x - Math.cos(v.angle) * 24, v.y - Math.sin(v.angle) * 24,
        { life: 0.4, color: 'rgba(180,170,150,0.55)' });
    }
  } else {
    p.update(dt, Input);
    collideActor(p);
  }
  // 他の軽トラも慣性で止める
  for (const v of G.vehicles) if (v !== p.vehicle) v.update(dt, {});

  // --- 村人 ---
  for (const n of G.npcs) {
    n.update(dt, G);
    collideActor(n);
    n.x = clamp(n.x, 20, WORLD.w - 20);
    n.y = clamp(n.y, 20, WORLD.h - 20);
  }

  // --- 動物 ---
  for (const c of G.critters) { if (!c.caught) c.update(dt, G); }
  G.critters = G.critters.filter(c => !c.caught && !c.dead);
  G.items = G.items.filter(i => !i.taken && !i.dead);

  // --- 軽トラで轢く ---
  if (p.vehicle && Math.abs(p.vehicle.speed) > 120) {
    for (const n of G.npcs) {
      if (n.knock > 0 || n.kind === 'cop') continue;
      if (dist2(n.x, n.y, p.vehicle.x, p.vehicle.y) < 30 * 30) {
        n.hitBy(p.vehicle.x, p.vehicle.y, 340);
        n.say('ぎゃあ！', 2);
        Sfx.hit();
        G.fx('hit', n.x, n.y, { life: 0.35 });
        addWanted(2, '軽トラで村人を轢いた！');
      }
    }
  }

  // --- 駐在さん ---
  updateCops(dt);

  // --- 村八分度の自然減衰 ---
  if (G.wanted > 0) {
    const inSanct = dist2(p.x, p.y, WORLD.sanctuary.x, WORLD.sanctuary.y) < WORLD.sanctuary.r ** 2;
    G.wantedDecay += dt * (inSanct ? 4.5 : 1);
    if (inSanct) tut('神社の境内に隠れとる……', 2);
    if (G.wantedDecay > 26) { G.wantedDecay = 0; G.wanted--; G.toast('村八分度が下がった'); }
  }

  // --- ミッション ---
  Missions.update(dt);
  G.markers = Missions.active ? Missions.markers() : [];

  // --- エフェクト ---
  G.effects = G.effects.filter(e => e.update(dt));

  // --- HP 0 ---
  if (p.hp <= 0) busted('のびてしまった');

  // --- カメラ ---
  const target = p.vehicle || p;
  const k = 1 - Math.pow(0.0008, dt);
  G.cam.x = lerp(G.cam.x, target.x, k);
  G.cam.y = lerp(G.cam.y, target.y, k);
  G.cam.zoom = lerp(G.cam.zoom, p.vehicle ? 0.82 : 1.0, 1 - Math.pow(0.05, dt));
  clampCamera();

  // --- フォーカス（E で何ができるか） ---
  G.focus = findFocus();

  // --- チュートリアル ---
  if (tutT > 0) { tutT -= dt; if (tutT <= 0) { el.tut.classList.remove('show'); tutText = ''; } }
  if (!Missions.active && G.time > 8 && G.time < 9) tut('頭に「！」が出とる人に E で話しかけろ', 6);
}

function clampCamera() {
  const vw = G.view.w / G.cam.zoom, vh = G.view.h / G.cam.zoom;
  if (vw >= WORLD.w) G.cam.x = WORLD.w / 2;
  else G.cam.x = clamp(G.cam.x, vw / 2, WORLD.w - vw / 2);
  if (vh >= WORLD.h) G.cam.y = WORLD.h / 2;
  else G.cam.y = clamp(G.cam.y, vh / 2, WORLD.h - vh / 2);
}

/* ---------------- 衝突 ---------------- */
function collideActor(a) {
  const before = { x: a.x, y: a.y };
  for (const r of G.colliders.rects) pushOutRect(a, r);
  for (const c of G.colliders.circles) pushOutCircle(a, c);

  // 川（橋以外は渡れない）
  if (inRiver(a.x, a.y)) {
    a.x = before.x; a.y = before.y;
    if (inRiver(a.x, a.y)) {
      // 万一はまったら岸へ
      a.x = a.x < WORLD.river.x + WORLD.river.w / 2 ? WORLD.river.x - 16 : WORLD.river.x + WORLD.river.w + 16;
    }
  }
  a.x = clamp(a.x, 16, WORLD.w - 16);
  a.y = clamp(a.y, 16, WORLD.h - 16);
}

function collideVehicle(v, dt) {
  const px = v.x, py = v.y;
  let hit = false;
  const probe = { x: v.x, y: v.y, r: 20 };
  for (const r of G.colliders.rects) if (pushOutRect(probe, r)) hit = true;
  for (const c of G.colliders.circles) if (pushOutCircle(probe, c)) hit = true;
  v.x = probe.x; v.y = probe.y;

  if (inRiver(v.x, v.y)) { v.x = px; v.y = py; hit = true; }

  if (v.x < 24 || v.x > WORLD.w - 24 || v.y < 24 || v.y > WORLD.h - 24) {
    v.x = clamp(v.x, 24, WORLD.w - 24);
    v.y = clamp(v.y, 24, WORLD.h - 24);
    hit = true;
  }

  if (hit) {
    const sp = Math.abs(v.speed);
    if (sp > 320 && v.driver) {
      // 派手に爆発して放り出される
      explodeVehicle(v);
    } else if (sp > 60) {
      Sfx.hit();
      G.fx('dust', v.x, v.y, { life: 0.4 });
    }
    v.speed *= -0.18;
  }
}

function explodeVehicle(v) {
  Sfx.boom();
  for (let i = 0; i < 5; i++) {
    G.fx('boom', v.x + rand(-24, 24), v.y + rand(-24, 24), { life: rand(0.5, 0.9) });
  }
  G.fx('text', v.x, v.y - 40, { text: 'ドカーン', color: '#ff9b3f', size: 22, life: 1.4 });
  const p = G.player;
  exitVehicle();
  p.hp = Math.max(1, p.hp - 32);
  p.hurtCool = 1.2;
  p.x = v.x - Math.cos(v.angle) * 46;
  p.y = v.y - Math.sin(v.angle) * 46;
  collideActor(p);
  v.speed = 0;
  G.toast('軽トラが爆発した！', 'bad');
}

/* ---------------- 駐在さん ---------------- */
function addWanted(n, msg) {
  if (G.wanted === 0) tut('駐在さんが来るぞ。逃げるか神社に隠れろ', 6);
  G.wanted = Math.min(5, G.wanted + n);
  G.wantedDecay = 0;
  if (msg) G.toast(msg, 'bad');
  Sfx.bad();
}

function updateCops(dt) {
  const p = G.player;
  const want = G.wanted;

  // 数を合わせる
  const cops = G.npcs.filter(n => n.kind === 'cop');
  if (cops.length < want) {
    const a = rand(0, TAU);
    const d = 520;
    const cop = new NPC({
      id: 'cop' + Math.random().toString(36).slice(2, 7),
      name: '駐在さん', kind: 'cop',
      x: clamp(p.x + Math.cos(a) * d, 40, WORLD.w - 40),
      y: clamp(p.y + Math.sin(a) * d, 40, WORLD.h - 40),
      color: '#2f4173', hair: '#3a3a3a',
    });
    G.npcs.push(cop);
    if (cops.length === 0) G.toast('駐在さんが自転車で来た！', 'bad');
  } else if (cops.length > want) {
    const victim = cops[0];
    G.npcs.splice(G.npcs.indexOf(victim), 1);
  }

  // 接触
  let touching = false;
  for (const c of cops) {
    if (dist2(c.x, c.y, p.x, p.y) < 26 * 26 && !p.vehicle) touching = true;
  }
  if (touching) {
    G.copCatch += dt;
    p.hp = Math.max(0, p.hp - 7 * dt);
    if (G.copCatch > 1.1) busted('駐在さんに捕まった');
  } else {
    G.copCatch = Math.max(0, G.copCatch - dt * 0.6);
  }
}

function busted(reason) {
  setState('busted');
  Sfx.bad();
  const p = G.player;
  const lost = Math.floor(p.money * 0.5);
  p.money -= lost;
  if (Missions.active) Missions.fail(reason);
  G.wanted = 0; G.wantedDecay = 0; G.copCatch = 0;
  G.npcs = G.npcs.filter(n => n.kind !== 'cop');
  G.bustTimer = 1.8;
  G.bustLost = lost;
}

function updateBusted(dt) {
  G.bustTimer -= dt;
  if (G.bustTimer <= 0) {
    const p = G.player;
    exitVehicle();
    p.x = SPOT.homeDoor.x + 40; p.y = SPOT.homeDoor.y + 60;
    p.hp = 70; p.sp = 100; p.carry = 0;
    p.vx = p.vy = 0;
    G.cam.x = p.x; G.cam.y = p.y;
    setState('play');
    if (G.bustLost > 0) G.toast(`治療費と迷惑料で ${yen(G.bustLost)} 取られた`, 'bad');
  }
}

/* =========================================================
   インタラクション
========================================================= */
function findFocus() {
  const p = G.player;
  if (p.vehicle) return { type: 'exit', label: '降りる' };

  let best = null;
  const consider = (d, max, obj) => {
    if (d > max) return;
    if (!best || d < best.d) best = { d, ...obj };
  };

  for (const v of G.vehicles) consider(dist(p.x, p.y, v.x, v.y), 70, { type: 'ride', obj: v, label: '軽トラに乗る' });
  for (const it of G.items) if (!it.taken) consider(dist(p.x, p.y, it.x, it.y), 56, { type: 'pick', obj: it, label: (it.label || '拾う') + 'を拾う' });
  for (const c of G.critters) if (!c.caught) consider(dist(p.x, p.y, c.x, c.y), 46, { type: 'catch', obj: c, label: (c.kind === 'cat' ? '猫' : '鶏') + 'を捕まえる' });
  for (const n of G.npcs) {
    if (n.kind === 'cop') continue;
    const work = n.kind === 'giver' && Missions.hasWork(n.id);
    const label = work ? `${n.name}の仕事を受ける` : `${n.name}と話す`;
    // 仕事をくれる人は少し遠くからでも拾えるようにする
    consider(dist(p.x, p.y, n.x, n.y), work ? 92 : 82, { type: 'talk', obj: n, label });
  }
  if (dist(p.x, p.y, SPOT.homeDoor.x, SPOT.homeDoor.y) < 70 && p.hp < p.maxHp) {
    consider(0.1, 70, { type: 'rest', label: 'ひと休みする', x: SPOT.homeDoor.x, y: SPOT.homeDoor.y });
  }
  if (best && best.obj) { best.x = best.obj.x; best.y = best.obj.y; }
  return best;
}

function doInteract() {
  const p = G.player;
  if (p.vehicle) { exitVehicle(); return; }
  const f = G.focus;
  if (!f) return;

  switch (f.type) {
    case 'ride':
      enterVehicle(f.obj);
      break;

    case 'pick':
      f.obj.taken = true;
      p.carry++;
      Sfx.pick();
      G.fx('text', f.obj.x, f.obj.y - 16, { text: '拾った', color: '#fff', life: 0.9 });
      Missions.onPickup(f.obj);
      G.items = G.items.filter(i => !i.taken);
      break;

    case 'catch':
      f.obj.caught = true;
      Sfx.pick();
      G.fx('text', f.obj.x, f.obj.y - 18, { text: 'つかまえた！', color: '#ffe27a', life: 1.1 });
      Missions.onCatch(f.obj);
      break;

    case 'talk': {
      const n = f.obj;
      if (Missions.onTalk(n)) break;
      const def = Missions.availableFor(n.id);
      if (def) { Missions.accept(def); break; }
      if (Missions.active) n.say(pick(['忙しいんじゃろ、はよ行き', 'まだ終わっとらんのかい']), 2.2);
      else n.say(pick(['今日はええ天気じゃなあ', 'こしが痛くてなあ', 'また来なさい', 'それにしても最近は物騒よねえ']), 2.6);
      break;
    }

    case 'rest':
      p.hp = p.maxHp; p.sp = p.maxSp;
      G.fx('text', p.x, p.y - 30, { text: 'ぐっすり', color: '#9fd0ff', life: 1.4 });
      G.toast('ひと休みした');
      break;
  }
}

function enterVehicle(v) {
  const p = G.player;
  p.vehicle = v; v.driver = p;
  p.vx = p.vy = 0;
  tut('W 前進 ／ S ブレーキ・バック ／ A D ハンドル', 6);
  Sfx.pick();
}

function exitVehicle() {
  const p = G.player;
  const v = p.vehicle;
  if (!v) return;
  v.driver = null;
  p.vehicle = null;
  p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 34;
  p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 34;
  p.face = v.angle;
  collideActor(p);
}

/* ---------------- 杖を振る ---------------- */
function doSwing() {
  const p = G.player;
  if (p.swingCool > 0) return;
  p.swing = 0.24;
  p.swingCool = 0.36;

  // 作業（草むしり・お参りなど）
  if (Missions.onAction(p.x, p.y)) { Sfx.pick(); return; }

  // 人をどつく
  let hitAny = false;
  for (const n of G.npcs) {
    const d = dist(p.x, p.y, n.x, n.y);
    if (d > 46) continue;
    if (Math.abs(angNorm(angTo(p.x, p.y, n.x, n.y) - p.face)) > 1.05) continue;

    n.hitBy(p.x, p.y, 300);
    hitAny = true;
    Sfx.hit();
    G.fx('hit', n.x, n.y, { life: 0.35 });
    G.fx('text', n.x, n.y - 26, { text: 'ゴッ', color: '#fff', size: 18, life: 0.8 });

    if (Missions.onBeat(n)) continue;          // ケジメ対象は無罪
    if (n.kind === 'cop') addWanted(1, '駐在さんをどついた！');
    else addWanted(1, '村人をどついた！ 村八分度アップ');
  }
  if (!hitAny) Sfx.tone(300, 0.06, 'triangle', 0.03);
}

/* =========================================================
   描画 + HUD
========================================================= */
let _ctx = null;
function render() {
  const ctx = _ctx || (_ctx = el.game.getContext('2d'));
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  drawScene(ctx, G);
  drawMinimap(el.minimap.getContext('2d'), G);
  updateHUD();
}

let hudCache = {};
function updateHUD() {
  const p = G.player;
  el.hpFill.style.width = (p.hp / p.maxHp * 100) + '%';
  el.spFill.style.width = (p.sp / p.maxSp * 100) + '%';

  const money = yen(p.money);
  if (hudCache.money !== money) { el.money.textContent = money; hudCache.money = money; }

  if (hudCache.wanted !== G.wanted) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="${i < G.wanted ? 'on' : 'off'}">★</span>`;
    el.wanted.innerHTML = s;
    hudCache.wanted = G.wanted;
  }

  const m = Missions.active;
  const title = m ? `【${m.def.title}】` : '';
  if (hudCache.title !== title) { el.missionTitle.textContent = title; hudCache.title = title; }

  const st = Missions.step();
  const tl = st && st.timeLimit ? Math.max(0, Missions.timer).toFixed(1) : '';
  if (hudCache.tl !== tl) { el.missionTimer.textContent = tl; hudCache.tl = tl; }

  const ob = Missions.objective();
  const obHtml = ob ? ob.text + (ob.sub ? `<span class="sub">${ob.sub}</span>` : '') : '';
  if (hudCache.ob !== obHtml) { el.objective.innerHTML = obHtml; hudCache.ob = obHtml; }

  const f = G.focus;
  const hintHtml = f
    ? (f.type === 'exit' ? `<b>Space</b>${f.label}` : `<b>Space</b>${f.label}`)
    : (G.player.vehicle ? '' : '<b>J</b>杖を振る');
  if (hudCache.hint !== hintHtml) { el.hint.innerHTML = hintHtml; hudCache.hint = hintHtml; }
}

function renderQuestLog() {
  let html = '<h3>受けた仕事</h3>';
  const doneIds = Object.keys(Missions.done);
  html += `<div>クリア ${doneIds.length} / ${MISSION_DEFS.length}　　所持金 ${yen(G.player.money)}</div>`;
  html += '<h3>村の困りごと</h3>';
  for (const d of MISSION_DEFS) {
    const done = Missions.done[d.id];
    const locked = d.requires && !Missions.done[d.requires];
    const who = npcName(d.giver);
    if (done) html += `<div class="done">${d.title}（${who}）</div>`;
    else if (locked) html += `<div class="open" style="opacity:.45">？？？（${who}）</div>`;
    else html += `<div class="open">${d.title}（${who}） … ${yen(d.reward)}</div>`;
  }
  el.questLog.innerHTML = html;
}

/* ---------------- 起動 ---------------- */
window.addEventListener('DOMContentLoaded', init);
