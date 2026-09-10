'use strict';
/* ========== 入力 ========== */

const Input = {
  up: false, down: false, left: false, right: false, run: false,
  pressed: {},        // このフレームで押された瞬間のキー
  _down: {},

  init() {
    window.addEventListener('keydown', e => {
      if (e.repeat) { this._sync(e, true); return; }
      const k = this._key(e);
      if (!k) return;
      this._down[k] = true;
      this.pressed[k] = true;
      this._sync(e, true);
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'p', 'm', 'e'].includes(k)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      const k = this._key(e);
      if (!k) return;
      this._down[k] = false;
      this._sync(e, false);
    });
    window.addEventListener('blur', () => {
      this._down = {};
      this.up = this.down = this.left = this.right = this.run = false;
    });
  },

  _key(e) {
    let k = e.key;
    if (!k) return null;
    k = k.length === 1 ? k.toLowerCase() : k.toLowerCase();
    return k;
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

  endFrame() { this.pressed = {}; },
};
