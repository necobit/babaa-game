'use strict';
/* ========== 登場人物・乗り物・小物 ========== */

const WALK_SPEED = 108;
const RUN_SPEED  = 196;

/* ---------------- ばあちゃん ---------------- */
class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 12;
    this.vx = 0; this.vy = 0;
    this.face = -Math.PI / 2;      // 向き
    this.hp = 100; this.maxHp = 100;
    this.sp = 100; this.maxSp = 100;
    this.money = 0;
    this.vehicle = null;           // 乗車中の軽トラ
    this.bob = 0;                  // 歩行アニメ
    this.swing = 0;                // 杖スイングの残り時間
    this.swingCool = 0;
    this.carry = 0;                // 手荷物の数
    this.hurtCool = 0;
  }

  get moving() { return Math.hypot(this.vx, this.vy) > 8; }

  /** 徒歩の更新 */
  update(dt, input) {
    if (this.vehicle) return;

    let ix = 0, iy = 0;
    if (input.left)  ix -= 1;
    if (input.right) ix += 1;
    if (input.up)    iy -= 1;
    if (input.down)  iy += 1;
    const len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; }

    const wantRun = input.run && this.sp > 1 && len > 0;
    let speed = wantRun ? RUN_SPEED : WALK_SPEED;

    // 山の斜面と田んぼは歩きにくい
    if (onMountain(this.x, this.y)) speed *= 0.62;
    for (const p of WORLD.paddies) { if (inRect(this.x, this.y, p)) { speed *= 0.72; break; } }
    if (this.carry > 0) speed *= 0.92;

    // スタミナ
    if (wantRun) this.sp = Math.max(0, this.sp - 30 * dt);
    else         this.sp = Math.min(this.maxSp, this.sp + 19 * dt);

    const tvx = ix * speed, tvy = iy * speed;
    // 加減速
    const k = 1 - Math.pow(0.0012, dt);
    this.vx = lerp(this.vx, tvx, k);
    this.vy = lerp(this.vy, tvy, k);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (len > 0) this.face = Math.atan2(iy, ix);
    this.bob += (this.moving ? (wantRun ? 13 : 8) : 0) * dt;

    if (this.swing > 0)     this.swing -= dt;
    if (this.swingCool > 0) this.swingCool -= dt;
    if (this.hurtCool > 0)  this.hurtCool -= dt;
  }

  hurt(n) {
    if (this.hurtCool > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.hurtCool = 0.5;
    return true;
  }
}

/* ---------------- 軽トラ ---------------- */
class Vehicle {
  constructor(x, y, angle) {
    this.x = x; this.y = y; this.r = 22;
    this.angle = angle || 0;
    this.speed = 0;
    this.driver = null;
    this.hw = 13;  // 車体半幅
    this.hl = 24;  // 車体半長
    this.smoke = 0;
  }

  update(dt, input) {
    const drive = !!this.driver;
    const MAX = 430, REV = -150;

    if (drive) {
      if (input.up)        this.speed += 300 * dt;
      else if (input.down) this.speed -= 340 * dt;
      else                 this.speed *= Math.pow(0.35, dt);

      this.speed = clamp(this.speed, REV, MAX);

      // ハンドル（速度が出ているほど曲がる）
      const grip = clamp(Math.abs(this.speed) / 150, 0, 1);
      const dir  = this.speed >= 0 ? 1 : -1;
      let steer = 0;
      if (input.left)  steer -= 1;
      if (input.right) steer += 1;
      this.angle += steer * 2.5 * grip * dir * dt;
    } else {
      this.speed *= Math.pow(0.1, dt);
    }

    // 道路の外は減速
    let onRoad = false;
    for (const r of WORLD.roads) { if (inRect(this.x, this.y, r)) { onRoad = true; break; } }
    if (!onRoad) this.speed *= Math.pow(0.55, dt);

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    if (Math.abs(this.speed) > 200) this.smoke += dt; else this.smoke = 0;
  }
}

/* ---------------- 村人 / 依頼主 / 駐在さん ---------------- */
class NPC {
  constructor(opt) {
    Object.assign(this, {
      id: '', name: '村人', kind: 'villager',
      x: 0, y: 0, r: 11,
      color: '#c9b3d6', hair: '#e8e8e8',
      state: 'wander', t: 0,
      tx: 0, ty: 0,
      face: 0, bob: 0,
      speed: 62,
      stun: 0, knock: 0, kvx: 0, kvy: 0,
      beatCount: 0,
      talk: '', talkT: 0,
    }, opt);
    this.hx = this.x; this.hy = this.y;   // 定位置
    this.tx = this.x; this.ty = this.y;
  }

  say(text, dur) { this.talk = text; this.talkT = dur || 2.6; }

  update(dt, G) {
    if (this.talkT > 0) this.talkT -= dt;

    if (this.knock > 0) {
      this.knock -= dt;
      this.x += this.kvx * dt; this.y += this.kvy * dt;
      this.kvx *= Math.pow(0.06, dt); this.kvy *= Math.pow(0.06, dt);
      return;
    }
    if (this.stun > 0) { this.stun -= dt; return; }

    const p = G.player;
    const px = p.vehicle ? p.vehicle.x : p.x;
    const py = p.vehicle ? p.vehicle.y : p.y;

    if (this.kind === 'cop') {
      // 駐在さん：追跡
      this.face = angTo(this.x, this.y, px, py);
      const d = dist(this.x, this.y, px, py);
      const sp = p.vehicle ? 210 : 155;
      if (d > 16) {
        this.x += Math.cos(this.face) * sp * dt;
        this.y += Math.sin(this.face) * sp * dt;
      }
      this.bob += 10 * dt;
      return;
    }

    if (this.state === 'flee') {
      // 逃げる（新入り）
      const d = dist(this.x, this.y, px, py);
      if (d < 340) {
        const a = angTo(px, py, this.x, this.y) + Math.sin(G.time * 2 + this.hx) * 0.5;
        this.face = a;
        this.x += Math.cos(a) * 150 * dt;
        this.y += Math.sin(a) * 150 * dt;
        this.bob += 12 * dt;
        // ワールド外に出ない
        this.x = clamp(this.x, 60, WORLD.w - 60);
        this.y = clamp(this.y, 60, WORLD.h - 60);
        return;
      }
    }

    // うろうろ
    this.t -= dt;
    if (this.t <= 0) {
      this.t = rand(1.6, 4.5);
      if (this.kind === 'giver' || this.kind === 'fixed') {
        this.tx = this.hx + rand(-26, 26);
        this.ty = this.hy + rand(-26, 26);
      } else {
        this.tx = this.hx + rand(-130, 130);
        this.ty = this.hy + rand(-130, 130);
      }
    }
    const d = dist(this.x, this.y, this.tx, this.ty);
    if (d > 6) {
      this.face = angTo(this.x, this.y, this.tx, this.ty);
      this.x += Math.cos(this.face) * this.speed * dt;
      this.y += Math.sin(this.face) * this.speed * dt;
      this.bob += 7 * dt;
    }
  }

  /** 杖でどつかれた */
  hitBy(px, py, power) {
    const a = angTo(px, py, this.x, this.y);
    this.kvx = Math.cos(a) * power;
    this.kvy = Math.sin(a) * power;
    this.knock = 0.28;
    this.stun = 1.3;
    this.beatCount++;
  }
}

/* ---------------- 動物（鶏・猫） ---------------- */
class Critter {
  constructor(kind, x, y) {
    this.kind = kind;             // 'chicken' | 'cat'
    this.x = x; this.y = y; this.r = 8;
    this.face = rand(0, TAU);
    this.t = 0; this.bob = 0;
    this.caught = false;
    this.speed = kind === 'chicken' ? 132 : 168;
    this.fleeRange = kind === 'chicken' ? 150 : 210;
  }
  update(dt, G) {
    if (this.caught) return;
    const p = G.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d < this.fleeRange && !p.vehicle) {
      const a = angTo(p.x, p.y, this.x, this.y) + Math.sin(G.time * 5 + this.x) * 0.6;
      this.face = a;
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      this.bob += 20 * dt;
    } else {
      this.t -= dt;
      if (this.t <= 0) { this.t = rand(0.8, 2.4); this.face = rand(0, TAU); }
      if (this.t > 1.4) {
        this.x += Math.cos(this.face) * 34 * dt;
        this.y += Math.sin(this.face) * 34 * dt;
        this.bob += 8 * dt;
      }
    }
    this.x = clamp(this.x, 40, WORLD.w - 40);
    this.y = clamp(this.y, 40, WORLD.h - 40);
  }
}

/* ---------------- 落ちてる物 ---------------- */
class Item {
  constructor(kind, x, y, label) {
    this.kind = kind; this.x = x; this.y = y; this.r = 12;
    this.label = label || '';
    this.taken = false;
    this.t = rand(0, TAU);
  }
}

/* ---------------- エフェクト ---------------- */
class Effect {
  constructor(type, x, y, opt) {
    this.type = type; this.x = x; this.y = y;
    this.life = 1; this.max = 1;
    Object.assign(this, opt || {});
    this.max = this.life;
  }
  update(dt) {
    this.life -= dt;
    if (this.type === 'text') this.y -= 34 * dt;
    if (this.type === 'dust') { this.x += (this.vx || 0) * dt; this.y += (this.vy || 0) * dt; }
    return this.life > 0;
  }
}
