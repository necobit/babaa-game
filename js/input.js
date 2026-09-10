'use strict';
/* ========== 入力 ==========
   移動は WASD（左手）。
   「調べる」は親指の Space に置いて、移動しながらでも押せるようにする。
   「杖」は右手の J（左クリックでも可）。E / Enter / F などは互換用のエイリアス。
--------------------------------------------------------------- */

const KEYS = {
  interact: [' ', 'e', 'enter'],
  attack:   ['j', 'k', 'f'],
  pause:    ['p', 'escape'],
  map:      ['m', 'tab'],
};

const PREVENT = ['w', 'a', 's', 'd', ' ', 'e', 'j', 'k', 'f', 'p', 'm', 'tab',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

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
