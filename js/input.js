'use strict';
/* ========== 入力 ==========
   移動は矢印キー（右手）。右 Shift が真隣なので早足はそこ。
   右手が矢印キーに乗るぶん左手が空くので、「調べる」は左手の E。
   「杖」は連打しやすい親指の Space（Z / X / 左クリックでも可）。
   WASD・J・K・F・Enter は互換用のエイリアスとして残してある。

   キーの拾い方について：
   - リスナーは「キャプチャ段階」に付ける。バブリング段階だと途中の誰か
     （拡張機能など）が stopPropagation() したキーが届かなくなる。
     実際に矢印の上下だけ横取りされる環境があった。
   - キーの判別は e.code（物理キー）を優先する。キーボード配列や IME の
     状態で e.key が変わっても影響を受けない。
--------------------------------------------------------------- */

const KEYS = {
  interact: ['e', 'enter'],
  attack:   [' ', 'z', 'x', 'j', 'k', 'f'],
  start:    ['e', 'enter', ' '],
  pause:    ['p', 'escape'],
  map:      ['m', 'tab'],
  camera:   ['c'],
  debug:    ['f1', '`'],
};

/** e.code から論理キー名へ。配列に依存しない */
const CODE_MAP = {
  ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright',
  KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
  KeyE: 'e', KeyZ: 'z', KeyX: 'x', KeyJ: 'j', KeyK: 'k', KeyF: 'f',
  KeyC: 'c', KeyM: 'm', KeyP: 'p',
  Space: ' ', Enter: 'enter', NumpadEnter: 'enter', Escape: 'escape',
  ShiftLeft: 'shift', ShiftRight: 'shift',
  F1: 'f1', Backquote: '`', Tab: 'tab',
  Numpad8: 'arrowup', Numpad2: 'arrowdown', Numpad4: 'arrowleft', Numpad6: 'arrowright',
};

const PREVENT = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'w', 'a', 's', 'd', ' ', 'e', 'z', 'x', 'j', 'k', 'f', 'p', 'm', 'c', 'tab', 'f1'];

const Input = {
  up: false, down: false, left: false, right: false, run: false,
  pressed: {},        // このフレームで押された瞬間のキー
  _down: {},
  raw: [],            // 直近の生イベント（デバッグ表示用）

  init() {
    this._sync();   // 方向フラグを確実に boolean にしてから始める

    const onDown = e => this._onDown(e);
    const onUp   = e => this._onUp(e);

    // キャプチャ段階で先に拾う。window と document の両方に付けておく
    for (const t of [window, document]) {
      t.addEventListener('keydown', onDown, true);
      t.addEventListener('keyup', onUp, true);
    }
    // 念のためバブリング段階でも拾う（重複して呼ばれても害はない）
    window.addEventListener('keydown', onDown, false);
    window.addEventListener('keyup', onUp, false);

    window.addEventListener('blur', () => {
      this._down = {};
      this.pressed = {};
      this._sync();
    });

    // 左クリックでも杖を振れる
    const cv = document.getElementById('game');
    if (cv) {
      cv.addEventListener('mousedown', e => {
        if (e.button === 0) { this.pressed['@click'] = true; e.preventDefault(); }
      });
      cv.addEventListener('contextmenu', e => e.preventDefault());
    }
  },

  _onDown(e) {
    const k = this._key(e);
    this._log(e, 'down', k);
    if (!k) return;
    if (PREVENT.includes(k)) e.preventDefault();
    this._down[k] = true;                 // リピートでも「押しっぱなし」は維持する
    if (!e.repeat) this.pressed[k] = true;
    this._sync();
  },

  _onUp(e) {
    const k = this._key(e);
    this._log(e, 'up', k);
    if (!k) return;
    this._down[k] = false;
    this._sync();
  },

  _key(e) {
    if (e.code && CODE_MAP[e.code]) return CODE_MAP[e.code];
    return e.key ? e.key.toLowerCase() : null;
  },

  /** 生イベントの記録。届いているかどうかをデバッグ表示で確認するため */
  _log(e, type, k) {
    this.raw.unshift(`${type} key=${e.key} code=${e.code || '-'}${e.repeat ? ' rep' : ''} -> ${k || '(未対応)'}`);
    if (this.raw.length > 3) this.raw.pop();
  },

  _sync() {
    const d = this._down;
    this.up    = !!(d['arrowup'] || d['w']);
    this.down  = !!(d['arrowdown'] || d['s']);
    this.left  = !!(d['arrowleft'] || d['a']);
    this.right = !!(d['arrowright'] || d['d']);
    this.run   = !!d['shift'];
  },

  /** 押された瞬間か（1フレームだけ true） */
  hit(k) { return !!this.pressed[k]; },

  /** 候補キーのどれかが押された瞬間か */
  hitAny(list) {
    for (const k of list) if (this.pressed[k]) return true;
    return false;
  },

  /** 押しっぱなしか（プロパティの down と衝突させないため isDown） */
  isDown(k) { return !!this._down[k]; },

  /** 溜まった「押した瞬間」を捨てる（画面遷移で誤爆させないため） */
  flush() { this.pressed = {}; },

  endFrame() { this.pressed = {}; },
};
