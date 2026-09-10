'use strict';
/* ========== 入力 ==========
   移動は矢印キー（右手）。右 Shift が真隣なので早足はそこ。
   右手が矢印キーに乗るぶん左手が空くので、「調べる」は左手の E。
   「杖」は連打しやすい親指の Space（Z / X / 左クリックでも可）。
   WASD・J・K・F・Enter は互換用のエイリアスとして残してある。
--------------------------------------------------------------- */

const KEYS = {
  interact: ['e', 'enter'],
  attack:   [' ', 'z', 'x', 'j', 'k', 'f'],
  start:    ['e', 'enter', ' '],
  pause:    ['p', 'escape'],
  map:      ['m', 'tab'],
};

const PREVENT = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'w', 'a', 's', 'd', ' ', 'e', 'z', 'x', 'j', 'k', 'f', 'p', 'm', 'tab'];

const Input = {
  up: false, down: false, left: false, right: false, run: false,
  pressed: {},        // このフレームで押された瞬間のキー
  _down: {},

  init() {
    window.addEventListener('keydown', e => {
      const k = this._key(e);
      if (!k) return;
      if (PREVENT.includes(k)) e.preventDefault();
      if (e.repeat) return;
      this._down[k] = true;
      this.pressed[k] = true;
      this._sync();
    });

    window.addEventListener('keyup', e => {
      const k = this._key(e);
      if (!k) return;
      this._down[k] = false;
      this._sync();
    });

    window.addEventListener('blur', () => {
      this._down = {};
      this.pressed = {};
      this.up = this.down = this.left = this.right = this.run = false;
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

  _key(e) {
    return e.key ? e.key.toLowerCase() : null;
  },

  _sync() {
    const d = this._down;
    this.up    = !!(d['w'] || d['arrowup']);
    this.down  = !!(d['s'] || d['arrowdown']);
    this.left  = !!(d['a'] || d['arrowleft']);
    this.right = !!(d['d'] || d['arrowright']);
    this.run   = !!(d['shift']);
  },

  /** 押された瞬間か（1フレームだけ true） */
  hit(k) { return !!this.pressed[k]; },

  /** 候補キーのどれかが押された瞬間か */
  hitAny(list) {
    for (const k of list) if (this.pressed[k]) return true;
    return false;
  },

  /** 押しっぱなしか */
  down(k) { return !!this._down[k]; },

  /** 溜まった「押した瞬間」を捨てる（画面遷移で誤爆させないため） */
  flush() { this.pressed = {}; },

  endFrame() { this.pressed = {}; },
};
