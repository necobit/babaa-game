'use strict';
/* ========== 村人とお仕事（ミッション） ========== */

/* ---------------- 村人の配置 ---------------- */
const NPC_DEFS = [
  // 依頼主（頭に「！」が出る）
  { id: 'tanaka',   name: '田中さん',   kind: 'giver', x: SPOT.tanakaDoor.x, y: SPOT.tanakaDoor.y - 10, color: '#7d8fbf', hair: '#dcdcdc' },
  { id: 'suzuki',   name: '鈴木さん',   kind: 'giver', x: SPOT.suzukiDoor.x, y: SPOT.suzukiDoor.y - 10, color: '#c48fa8', hair: '#efefef' },
  { id: 'sato',     name: '佐藤さん',   kind: 'giver', x: SPOT.satoDoor.x,   y: SPOT.satoDoor.y + 10,   color: '#8fb98f', hair: '#d8d8d8' },
  { id: 'kucho',    name: '区長',       kind: 'giver', x: SPOT.kaikanDoor.x, y: SPOT.kaikanDoor.y + 10, color: '#5f6f8a', hair: '#bdbdbd' },
  { id: 'kannushi', name: '神主',       kind: 'giver', x: 2790,              y: 1975,                   color: '#eae6dc', hair: '#cfcfcf' },
  { id: 'tencho',   name: 'ＪＡ店長',   kind: 'giver', x: SPOT.jaDoor.x + 90, y: SPOT.jaDoor.y,         color: '#b7a05e', hair: '#8a7a5a' },

  // 井戸端会議のばあちゃんたち
  { id: 'baaA', name: 'ハナさん', kind: 'fixed', x: 1040, y: 1195, color: '#cdb4dd', hair: '#f0f0f0' },
  { id: 'baaB', name: 'キクさん', kind: 'fixed', x: 1165, y: 1205, color: '#b4c7dd', hair: '#ececec' },
  { id: 'baaC', name: 'ウメさん', kind: 'fixed', x: 1105, y: 1140, color: '#ddc4b4', hair: '#f4f4f4' },

  // ケジメ対象
  { id: 'shinmai', name: '新入り', kind: 'target', state: 'flee', x: 2060, y: 1760, color: '#3f6b3f', hair: '#2b2b2b' },

  // その他の村人
  { id: 'v1', name: '村人', x: 900,  y: 620,  color: '#b9a9c9' },
  { id: 'v2', name: '村人', x: 1600, y: 1200, color: '#a9b9c9' },
  { id: 'v3', name: '村人', x: 2150, y: 900,  color: '#c9b9a9' },
  { id: 'v4', name: '村人', x: 500,  y: 1850, color: '#a9c9b9' },
  { id: 'v5', name: '村人', x: 2650, y: 1450, color: '#c9a9a9' },
  { id: 'v6', name: '村人', x: 1350, y: 1750, color: '#b0c0a0' },
  { id: 'v7', name: '村人', x: 2400, y: 2150, color: '#c0b0d0' },
  { id: 'v8', name: '村人', x: 700,  y: 1150, color: '#d0c0a0' },
];

/* ---------------- ミッション定義 ----------------
   step の type:
     talk   … 指定の人に E で話す
     goto   … 指定座標に入る（needVehicle:true なら軽トラで）
     action … 指定スポットで Space を hits 回
     collect… 落ちている物を全部拾う
     catch  … 動物を n 匹つかまえる
     beat   … 指定の人を杖で hits 回どつく
------------------------------------------------ */
const MISSION_DEFS = [
  {
    id: 'kairanban', giver: 'suzuki', title: '回覧板',
    brief: 'あんた、この回覧板を田中さんとこに持ってっとくれ。',
    steps: [
      { type: 'talk', who: 'tanaka', text: '回覧板を田中さんに届けろ' },
    ],
    reward: 300,
  },
  {
    id: 'kusa', giver: 'sato', title: '草むしり',
    brief: '畑が草だらけでなあ。ちょっとむしってくれんか。',
    steps: [
      {
        type: 'action', verb: '草むしり', hits: 4, text: '畑の草をむしれ',
        spots: [{ x: 640, y: 2180 }, { x: 760, y: 2255 }, { x: 870, y: 2170 }],
      },
    ],
    reward: 400,
  },
  {
    id: 'niwatori', giver: 'tanaka', title: '鶏が逃げた',
    brief: '鶏が小屋から逃げおった！ 捕まえてくれ！',
    steps: [
      {
        type: 'catch', kind: 'chicken', n: 3, text: '逃げた鶏を捕まえろ',
        spawns: [{ x: 560, y: 220 }, { x: 680, y: 200 }, { x: 500, y: 640 }],
      },
    ],
    reward: 500,
  },
  {
    id: 'taisou', giver: 'kucho', title: 'ラジオ体操',
    brief: 'ハンコ帳を忘れとるぞ。取ってきてから体操に間に合わせろ。',
    steps: [
      { type: 'goto', pos: SPOT.homeDoor, r: 55, text: 'ハンコ帳を取りに家へ帰れ' },
      { type: 'goto', pos: SPOT.kaikanDoor, r: 60, timeLimit: 60, text: 'ラジオ体操に間に合え！' },
    ],
    reward: 450,
  },
  {
    id: 'kejime', giver: 'kucho', title: 'ケジメ', requires: 'taisou',
    brief: '新入りが挨拶にも来おらん。ケジメつけてこい。',
    steps: [
      { type: 'beat', who: 'shinmai', hits: 3, text: '新入りにケジメをつけに行け' },
    ],
    reward: 1200,
  },
  {
    id: 'yasai', giver: 'tencho', title: '野菜の集荷',
    brief: '倉庫の野菜を軽トラで運んでくれ。歩きじゃ無理だぞ。',
    steps: [
      { type: 'goto', pos: SPOT.soukoDoor, r: 70, needVehicle: true, text: '軽トラで倉庫へ野菜を取りに行け' },
      { type: 'goto', pos: SPOT.jaDoor, r: 70, needVehicle: true, timeLimit: 75, text: '軽トラでＪＡへ運べ' },
    ],
    reward: 800,
  },
  {
    id: 'osaisen', giver: 'kannushi', title: 'お参り',
    brief: 'たまには手を合わせていきなさい。',
    steps: [
      { type: 'action', verb: 'お参り', hits: 3, text: '賽銭箱の前で拝め', spots: [SPOT.jinjaFront] },
    ],
    reward: 200,
  },
  {
    id: 'idobata', giver: 'suzuki', title: '井戸端会議',
    brief: '井戸んとこで皆待っとるよ。顔出しといで。',
    steps: [
      { type: 'talk', who: 'baaA', text: 'ハナさんと話せ' },
      { type: 'talk', who: 'baaB', text: 'キクさんと話せ' },
      { type: 'talk', who: 'baaC', text: 'ウメさんと話せ' },
    ],
    reward: 450,
  },
  {
    id: 'gomi', giver: 'sato', title: 'ゴミ拾い',
    brief: 'カラスがゴミを散らかしおって。集めて捨ててきて。',
    steps: [
      {
        type: 'collect', label: 'ゴミ袋', text: '散らかったゴミを拾え',
        items: [{ x: 1050, y: 1700 }, { x: 1180, y: 1780 }, { x: 980, y: 1830 }, { x: 1230, y: 1660 }],
      },
      { type: 'goto', pos: SPOT.gomiba, r: 55, text: 'ゴミ捨て場へ捨てに行け', drop: true },
    ],
    reward: 550,
  },
  {
    id: 'tama', giver: 'tanaka', title: '猫のタマ',
    brief: 'タマが帰ってこんのじゃ。村のどこかにおるはず……',
    steps: [
      { type: 'catch', kind: 'cat', n: 1, text: '猫のタマを探して捕まえろ', spawns: [{ x: 235, y: 2265 }] },
    ],
    reward: 900,
  },
  {
    id: 'ocha', giver: 'tencho', title: 'おつかい',
    brief: '喉が渇いた。自販機でお茶を買ってきてくれ。',
    steps: [
      { type: 'action', verb: '購入', hits: 2, text: '自販機でお茶を買え', spots: [{ x: SPOT.vending.x + 26, y: SPOT.vending.y }] },
    ],
    reward: 250,
  },
  {
    id: 'sanchou', giver: 'kannushi', title: 'ご来光', requires: 'osaisen',
    brief: '山の上から拝むと御利益があるそうな。行ってみんか。',
    steps: [
      { type: 'goto', pos: SPOT.summit, r: 80, text: '山の頂上を目指せ' },
      { type: 'action', verb: '合掌', hits: 3, text: 'ご来光を拝め', spots: [SPOT.summit] },
    ],
    reward: 1500,
  },
];

/* ---------------- ミッション管理 ---------------- */
const Missions = {
  active: null,      // 実行中のミッション（ランタイム）
  done: {},          // クリア済み id
  stepIndex: 0,
  timer: 0,

  reset() { this.active = null; this.done = {}; this.stepIndex = 0; this.timer = 0; },

  /** その人が今出せる仕事 */
  availableFor(npcId) {
    if (this.active) return null;
    for (const d of MISSION_DEFS) {
      if (d.giver !== npcId) continue;
      if (this.done[d.id]) continue;
      if (d.requires && !this.done[d.requires]) continue;
      return d;
    }
    return null;
  },

  hasWork(npcId) { return !!this.availableFor(npcId); },

  /** 受注 */
  accept(def) {
    // 定義を壊さないようランタイム用に複製
    const steps = def.steps.map(s => Object.assign({}, s, { progress: 0, spotHits: null, entities: [] }));
    // 最後に「依頼主へ報告」を足す
    const giverName = npcName(def.giver);
    steps.push({ type: 'talk', who: def.giver, text: `${giverName}に報告しろ`, progress: 0, report: true });

    this.active = { def, steps, giverName };
    this.stepIndex = 0;
    this.timer = 0;
    this.enterStep();

    G.toast(`仕事を受けた: ${def.title}`, 'good');
    const giver = G.npc(def.giver);
    if (giver) giver.say(def.brief, 4.5);
  },

  step() { return this.active ? this.active.steps[this.stepIndex] : null; },

  enterStep() {
    const st = this.step();
    if (!st) return;
    this.timer = st.timeLimit || 0;

    if (st.type === 'action') {
      st.spotHits = st.spots.map(() => 0);
    }
    if (st.type === 'collect') {
      st.entities = st.items.map(p => {
        const it = new Item('gomi', p.x, p.y, st.label);
        G.items.push(it);
        return it;
      });
    }
    if (st.type === 'catch') {
      st.entities = st.spawns.slice(0, st.n).map(p => {
        const c = new Critter(st.kind, p.x, p.y);
        G.critters.push(c);
        return c;
      });
    }
    if (st.type === 'beat') {
      const n = G.npc(st.who);
      if (n) { n.beatCount = 0; n.state = 'flee'; }
    }
  },

  advance() {
    const st = this.step();
    if (st && st.drop) { G.player.carry = 0; G.fx('text', G.player.x, G.player.y - 26, { text: 'ポイッ', color: '#fff', life: 1.1 }); }
    this.stepIndex++;
    if (this.stepIndex >= this.active.steps.length) { this.complete(); return; }
    this.enterStep();
    G.blip();
  },

  complete() {
    const def = this.active.def;
    this.done[def.id] = true;
    G.player.money += def.reward;
    G.toast(`${def.title} 完了！  ${yen(def.reward)}`, 'good');
    G.fx('text', G.player.x, G.player.y - 30, { text: '+' + yen(def.reward), color: '#c9f57b', life: 1.6 });
    this.active = null;
    this.stepIndex = 0;

    const total = Object.keys(this.done).length;
    if (total === MISSION_DEFS.length) {
      G.toast('村の仕事、ぜんぶ終わらせた！ あんたが村長じゃ', 'good');
    }
  },

  fail(reason) {
    const def = this.active.def;
    // 出したエンティティを片づける
    for (const s of this.active.steps) {
      if (s.entities) for (const e of s.entities) e.dead = true;
    }
    G.player.carry = 0;
    this.active = null;
    this.stepIndex = 0;
    G.toast(`失敗: ${reason}`, 'bad');
  },

  /* ---- 毎フレーム ---- */
  update(dt) {
    if (!this.active) return;
    const st = this.step();
    if (!st) return;

    // 制限時間
    if (st.timeLimit) {
      this.timer -= dt;
      if (this.timer <= 0) { this.fail('時間切れ'); return; }
    }

    const p = G.player;

    if (st.type === 'goto') {
      const d = dist(p.x, p.y, st.pos.x, st.pos.y);
      const ok = d < (st.r || 60) && (!st.needVehicle || !!p.vehicle);
      if (ok) this.advance();
    }
  },

  /* ---- プレイヤーからのイベント ---- */
  onTalk(npc) {
    const st = this.step();
    if (!st || st.type !== 'talk' || st.who !== npc.id) return false;
    if (st.report) {
      npc.say('ようやった。ほれ、駄賃じゃ。', 3);
    } else {
      npc.say(pick(['はいはい、ありがとねぇ', 'おお、来たか', 'まぁまぁ、上がってきなさい']), 2.6);
    }
    this.advance();
    return true;
  },

  onPickup(item) {
    const st = this.step();
    if (!st || st.type !== 'collect') return;
    if (!st.entities.includes(item)) return;
    st.progress++;
    if (st.progress >= st.entities.length) this.advance();
  },

  onCatch(critter) {
    const st = this.step();
    if (!st || st.type !== 'catch') return;
    if (!st.entities.includes(critter)) return;
    st.progress++;
    if (st.progress >= st.n) this.advance();
  },

  onBeat(npc) {
    const st = this.step();
    if (!st || st.type !== 'beat' || st.who !== npc.id) return false;
    st.progress = npc.beatCount;
    if (npc.beatCount >= st.hits) {
      npc.say('すんませんっしたぁ！！', 3.5);
      npc.state = 'wander';
      this.advance();
    } else {
      npc.say(pick(['ちょ、待って', 'うわっ', 'かんべんして！']), 1.4);
    }
    return true;   // ミッション対象なので村八分にはならない
  },

  /** Space（杖）による作業 */
  onAction(x, y) {
    const st = this.step();
    if (!st || st.type !== 'action') return false;
    for (let i = 0; i < st.spots.length; i++) {
      if (st.spotHits[i] >= st.hits) continue;
      const s = st.spots[i];
      if (dist(x, y, s.x, s.y) > 68) continue;

      st.spotHits[i]++;
      G.fx('text', s.x, s.y - 14, { text: st.verb, color: '#ffe27a', life: 0.7 });
      G.fx('dust', s.x, s.y, { life: 0.5 });

      if (st.spotHits[i] >= st.hits) {
        st.progress++;
        G.blip();
        if (st.progress >= st.spots.length) this.advance();
      }
      return true;
    }
    return false;
  },

  /* ---- 表示用 ---- */
  objective() {
    const st = this.step();
    if (!st) return null;
    let sub = '';
    if (st.type === 'action')  sub = `${st.progress}/${st.spots.length}`;
    if (st.type === 'collect') sub = `${st.progress}/${st.entities.length}`;
    if (st.type === 'catch')   sub = `${st.progress}/${st.n}`;
    if (st.type === 'beat')    sub = `${st.progress}/${st.hits}`;
    if (st.needVehicle && !G.player.vehicle) sub = '軽トラに乗れ';
    return { text: st.text, sub };
  },

  /** 目的地マーカー（複数返す） */
  markers() {
    const st = this.step();
    if (!st) return [];
    switch (st.type) {
      case 'talk': case 'beat': {
        const n = G.npc(st.who);
        return n ? [{ x: n.x, y: n.y, r: 26 }] : [];
      }
      case 'goto':
        return [{ x: st.pos.x, y: st.pos.y, r: st.r || 60 }];
      case 'action':
        return st.spots.filter((s, i) => st.spotHits[i] < st.hits).map(s => ({ x: s.x, y: s.y, r: 34 }));
      case 'collect':
        return st.entities.filter(e => !e.taken).map(e => ({ x: e.x, y: e.y, r: 20 }));
      case 'catch':
        return st.entities.filter(e => !e.caught).map(e => ({ x: e.x, y: e.y, r: 22 }));
    }
    return [];
  },
};

function npcName(id) {
  const d = NPC_DEFS.find(n => n.id === id);
  return d ? d.name : id;
}
