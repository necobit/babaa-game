'use strict';
/* ==========================================================
   3D 描画（three.js）
   ゲームロジックは 2D のまま。ワールド座標 (x, y) を
   three の (x, z) に対応させ、高さ y は地形から引く。
   見た目はテクスチャ無しの箱と円柱だけで作る。
========================================================== */

const R3 = {
  renderer: null, scene: null, camera: null,
  sun: null, sunTarget: null,
  objs: new Map(),          // ゲーム内オブジェクト -> Object3D
  beams: [], fx: [],        // 使い回すプール
  camYaw: 0,
  camMode: 'fixed',         // 'fixed' = 向き固定 / 'follow' = 背後に回り込む
  basis: { fx: 0, fz: -1, rx: 1, rz: 0 },   // 入力を世界方向に直すための前方/右方向
  ready: false,
};

const GEO = {}, MAT = {};
const SKY = 0xbcd8ef;

/* ---------------------------------------------------------
   使い回す形と材質
--------------------------------------------------------- */
function initAssets() {
  GEO.box      = new THREE.BoxGeometry(1, 1, 1);
  GEO.cyl      = new THREE.CylinderGeometry(1, 1, 1, 12);
  GEO.pyramid  = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);  // 四角錐（屋根）
  GEO.sphere   = new THREE.SphereGeometry(1, 12, 10);
  GEO.lowSphere= new THREE.IcosahedronGeometry(1, 0);        // ローポリ球（木の葉）
  GEO.body     = new THREE.CylinderGeometry(8, 11, 20, 10);  // 胴（もんぺ）
  GEO.head     = new THREE.SphereGeometry(7, 12, 10);
  GEO.nose     = new THREE.SphereGeometry(2.2, 6, 5);
  GEO.beam     = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
  GEO.ring     = new THREE.RingGeometry(0.82, 1, 24);
  GEO.trunk    = new THREE.CylinderGeometry(3, 4.5, 18, 6);

  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  MAT.wall   = lam(0xded2bb);
  MAT.skin   = lam(0xe8bfa0);
  MAT.wood   = lam(0x8b5a2b);
  MAT.metal  = lam(0x8a8a86);
  MAT.dark   = lam(0x3a3a38);
  MAT.white  = lam(0xf2f2ec);
  MAT.trunk  = lam(0x6b4f33);
  MAT.red    = lam(0xc8452f);
  MAT.water  = new THREE.MeshLambertMaterial({ color: 0x4f8fc0, transparent: true, opacity: 0.8 });
  MAT.beam   = new THREE.MeshBasicMaterial({
    color: 0xffd23f, transparent: true, opacity: 0.2,
    side: THREE.DoubleSide, depthWrite: false,
  });
  MAT.ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd23f, transparent: true, opacity: 0.75,
    side: THREE.DoubleSide, depthWrite: false,
  });
}

/** 箱を 1 個置く便利関数 */
function boxAt(x, y, z, w, h, d, mat, parent) {
  const m = new THREE.Mesh(GEO.box, mat);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true; m.receiveShadow = true;
  (parent || R3.scene).add(m);
  return m;
}

function cylAt(x, y, z, r, h, mat, parent) {
  const m = new THREE.Mesh(GEO.cyl, mat);
  m.position.set(x, y, z);
  m.scale.set(r, h, r);
  m.castShadow = true; m.receiveShadow = true;
  (parent || R3.scene).add(m);
  return m;
}

/* =========================================================
   初期化
========================================================= */
R3.init = function (canvas, groundCanvas) {
  this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(SKY);
  this.scene.fog = new THREE.Fog(SKY, 900, 2400);

  this.camera = new THREE.PerspectiveCamera(52, 1, 1, 4000);

  initAssets();

  // --- 光 ---
  this.scene.add(new THREE.HemisphereLight(0xd8ecff, 0x5f7f42, 0.62));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -420; sc.right = 420; sc.top = 420; sc.bottom = -420;
  sc.near = 10; sc.far = 1600;
  sun.shadow.bias = -0.0012;
  this.sunTarget = new THREE.Object3D();
  this.scene.add(this.sunTarget);
  sun.target = this.sunTarget;
  this.scene.add(sun);
  this.sun = sun;

  buildTerrain(groundCanvas);
  buildRiver();
  buildBuildings();
  buildTrees();
  buildProps();
  buildPools();

  this.resize();
  this.ready = true;
};

R3.resize = function () {
  const w = window.innerWidth, h = window.innerHeight;
  this.renderer.setSize(w, h, false);
  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();
};

/* ---------------------------------------------------------
   地面：焼いた 2D マップをそのままテクスチャに使い、
   山のところだけ頂点を持ち上げる
--------------------------------------------------------- */
function buildTerrain(groundCanvas) {
  const g = new THREE.PlaneGeometry(WORLD.w, WORLD.h, 180, 135);
  g.rotateX(-Math.PI / 2);
  g.translate(WORLD.w / 2, 0, WORLD.h / 2);

  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  g.computeVertexNormals();

  const tex = new THREE.CanvasTexture(groundCanvas);
  tex.anisotropy = R3.renderer.capabilities.getMaxAnisotropy();

  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
  mesh.receiveShadow = true;
  R3.scene.add(mesh);

  // world の外側が見えないように、一回り大きい草の板を下に敷く
  const skirt = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.w * 3, WORLD.h * 3),
    new THREE.MeshLambertMaterial({ color: 0x74a052 })
  );
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.set(WORLD.w / 2, -1.5, WORLD.h / 2);
  R3.scene.add(skirt);
}

/* ---------------------------------------------------------
   川と橋
--------------------------------------------------------- */
function buildRiver() {
  const rv = WORLD.river;
  // 水面
  const w = new THREE.Mesh(new THREE.PlaneGeometry(rv.w, rv.h), MAT.water);
  w.rotation.x = -Math.PI / 2;
  w.position.set(rv.x + rv.w / 2, 1.2, rv.y + rv.h / 2);
  R3.scene.add(w);

  // 護岸（橋の部分は空ける）
  const gaps = WORLD.bridges.map(b => [b.y, b.y + b.h]).sort((a, b) => a[0] - b[0]);
  let cur = 0;
  const segs = [];
  for (const [a, b] of gaps) { if (a > cur) segs.push([cur, a]); cur = b; }
  if (cur < rv.h) segs.push([cur, rv.h]);

  for (const [a, b] of segs) {
    const len = b - a, cz = (a + b) / 2;
    boxAt(rv.x - 5, 3, cz, 10, 10, len, MAT.metal);
    boxAt(rv.x + rv.w + 5, 3, cz, 10, 10, len, MAT.metal);
  }

  // 橋
  for (const b of WORLD.bridges) {
    boxAt(b.x + b.w / 2, 5, b.y + b.h / 2, b.w, 6, b.h, MAT.wood);
    boxAt(b.x + 3, 12, b.y + b.h / 2, 4, 10, b.h, MAT.wood);
    boxAt(b.x + b.w - 3, 12, b.y + b.h / 2, 4, 10, b.h, MAT.wood);
  }
}

/* ---------------------------------------------------------
   建物：壁の箱 ＋ 四角錐の屋根
--------------------------------------------------------- */
function buildBuildings() {
  for (const b of WORLD.buildings) {
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
    const low = b.id === 'gomi';                    // ゴミ捨て場だけ低くする
    const wallH = low ? 16 : D3.wallH;
    const roofH = low ? 10 : D3.roofH;

    boxAt(cx, wallH / 2, cz, b.w, wallH, b.h, MAT.wall);

    const roof = new THREE.Mesh(GEO.pyramid, new THREE.MeshLambertMaterial({ color: b.roof }));
    roof.position.set(cx, wallH + roofH / 2, cz);
    roof.scale.set((b.w / 2 + D3.eave) * Math.SQRT2, roofH, (b.h / 2 + D3.eave) * Math.SQRT2);
    roof.castShadow = true;
    R3.scene.add(roof);

    // 正面に引き戸っぽい板を 1 枚
    if (!low) {
      boxAt(cx, 9, b.y + b.h + 0.6, Math.min(b.w * 0.4, 70), 18, 1.5, MAT.wood);
    }
    b._labelY = wallH + roofH + 14;
  }
}

/* ---------------------------------------------------------
   木：インスタンス描画
--------------------------------------------------------- */
function buildTrees() {
  const n = WORLD.trees.length;
  const trunks = new THREE.InstancedMesh(GEO.trunk, MAT.trunk, n);
  const leaves = new THREE.InstancedMesh(GEO.lowSphere, new THREE.MeshLambertMaterial({}), n);
  trunks.castShadow = leaves.castShadow = true;
  leaves.receiveShadow = true;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const t = WORLD.trees[i];
    const gy = terrainHeight(t.x, t.y);
    const h = 22 + t.tone * 14;

    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.tone * 6.28);
    v.set(t.x, gy + 9, t.y); s.set(1, h / 18, 1);
    m.compose(v, q, s);
    trunks.setMatrixAt(i, m);

    const r = t.r * 1.15;
    v.set(t.x, gy + h + r * 0.55, t.y);
    s.set(r, r * 0.92, r);
    m.compose(v, q, s);
    leaves.setMatrixAt(i, m);

    col.setHSL(0.27 + t.tone * 0.05, 0.45, 0.3 + t.tone * 0.12);
    leaves.setColorAt(i, col);
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;

  R3.scene.add(trunks, leaves);
}

/* ---------------------------------------------------------
   小物
--------------------------------------------------------- */
function buildProps() {
  for (const p of WORLD.props) {
    const gy = terrainHeight(p.x, p.y);
    switch (p.type) {
      case 'pole':
        cylAt(p.x, gy + 26, p.y, 2.6, 52, MAT.metal);
        boxAt(p.x, gy + 48, p.y, 34, 3, 3, MAT.metal);
        break;
      case 'vend':
        boxAt(p.x, gy + 20, p.y, 34, 40, 18, MAT.red);
        boxAt(p.x, gy + 26, p.y + 9.5, 26, 20, 1.5, new THREE.MeshLambertMaterial({ color: 0xffe9a8 }));
        break;
      case 'torii':
        boxAt(p.x - 34, gy + 26, p.y, 8, 52, 8, MAT.red);
        boxAt(p.x + 34, gy + 26, p.y, 8, 52, 8, MAT.red);
        boxAt(p.x, gy + 52, p.y, 96, 7, 10, MAT.red);
        boxAt(p.x, gy + 42, p.y, 78, 5, 7, MAT.red);
        break;
      case 'saisen':
        boxAt(p.x, gy + 11, p.y, 56, 22, 30, MAT.wood);
        boxAt(p.x, gy + 22, p.y, 40, 3, 10, MAT.dark);
        break;
      case 'bus':
        boxAt(p.x, gy + 13, p.y, 34, 26, 22, MAT.white);
        boxAt(p.x, gy + 28, p.y, 38, 4, 26, new THREE.MeshLambertMaterial({ color: 0x3b6ea5 }));
        break;
      case 'well':
        cylAt(p.x, gy + 8, p.y, 22, 16, MAT.metal);
        cylAt(p.x, gy + 17, p.y, 14, 3, MAT.dark);
        break;
      case 'sign':
        cylAt(p.x, gy + 12, p.y, 1.8, 24, MAT.wood);
        boxAt(p.x, gy + 27, p.y, 58, 16, 2, new THREE.MeshLambertMaterial({ color: 0xf2ead6 }));
        break;
    }
  }
}

/* ---------------------------------------------------------
   目的地の光の柱とエフェクトのプール
--------------------------------------------------------- */
function buildPools() {
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(GEO.beam, MAT.beam);
    beam.position.y = 160; beam.scale.set(1, 320, 1);
    const ring = new THREE.Mesh(GEO.ring, MAT.ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 1.5;
    g.add(beam, ring);
    g.visible = false;
    R3.scene.add(g);
    R3.beams.push(g);
  }
  for (let i = 0; i < 20; i++) {
    const m = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false,
    }));
    m.visible = false;
    R3.scene.add(m);
    R3.fx.push(m);
  }
}

/* =========================================================
   キャラクター
========================================================= */
function makePerson(bodyColor, hairColor) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(GEO.body, new THREE.MeshLambertMaterial({ color: bodyColor }));
  body.position.y = 10; body.castShadow = true;
  const head = new THREE.Mesh(GEO.head, new THREE.MeshLambertMaterial({ color: hairColor }));
  head.position.y = 25; head.castShadow = true;
  const nose = new THREE.Mesh(GEO.nose, MAT.skin);
  nose.position.set(6.4, 24, 0);
  g.add(body, head, nose);
  g.userData.head = head;
  return g;
}

function makeCane() {
  const c = new THREE.Mesh(GEO.cyl, MAT.wood);
  c.scale.set(1.3, 26, 1.3);
  c.castShadow = true;
  return c;
}

function makeTruck() {
  const g = new THREE.Group();
  boxAt(-6, 12, 0, 36, 10, 26, MAT.metal, g);          // 荷台
  boxAt(-6, 19, 0, 34, 4, 24, MAT.dark, g);
  boxAt(13, 20, 0, 20, 24, 25, MAT.white, g);          // キャビン
  boxAt(23.5, 24, 0, 2, 12, 20, new THREE.MeshLambertMaterial({ color: 0x3c4a55 }), g);
  boxAt(24.5, 12, 0, 2, 6, 22, new THREE.MeshLambertMaterial({ color: 0xffe9a8 }), g);
  for (const [dx, dz] of [[15, 13], [15, -13], [-15, 13], [-15, -13]]) {
    const w = new THREE.Mesh(GEO.cyl, MAT.dark);
    w.scale.set(7, 5, 7);
    w.rotation.x = Math.PI / 2;
    w.position.set(dx, 7, dz);
    w.castShadow = true;
    g.add(w);
  }
  return g;
}

function makeCritter(kind) {
  const g = new THREE.Group();
  const c = kind === 'chicken' ? 0xf4f0e4 : 0x4a4440;
  const mat = new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(GEO.sphere, mat);
  body.scale.set(9, 7, 7); body.position.y = 8; body.castShadow = true;
  const head = new THREE.Mesh(GEO.sphere, mat);
  head.scale.set(4.5, 4.5, 4.5); head.position.set(8, 13, 0);
  g.add(body, head);
  if (kind === 'chicken') {
    const comb = new THREE.Mesh(GEO.sphere, MAT.red);
    comb.scale.set(2, 2.5, 1.5); comb.position.set(8, 17, 0);
    g.add(comb);
  }
  return g;
}

function makeItem() {
  const m = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0xd8dcc4 }));
  m.scale.set(16, 18, 16);
  m.castShadow = true;
  return m;
}

/* =========================================================
   毎フレームの同期
========================================================= */
function getObj(ent, factory) {
  let o = R3.objs.get(ent);
  if (!o) { o = factory(); R3.scene.add(o); R3.objs.set(ent, o); }
  return o;
}

R3.sync = function (G) {
  const seen = new Set();
  const t = G.time;

  // --- ばあちゃん ---
  const p = G.player;
  if (!p.vehicle) {
    const o = getObj(p, () => {
      const g = makePerson(0xb9a4d2, 0xf0f0f0);
      const cane = makeCane();
      g.add(cane);
      g.userData.cane = cane;
      return g;
    });
    seen.add(p);
    o.visible = true;
    placeActor(o, p.x, p.y, p.face, p.moving ? p.bob : 0);
    // 杖：振っている間だけ前に出る
    const sw = p.swing > 0 ? p.swing / 0.24 : 0;
    const cane = o.userData.cane;
    cane.position.set(9, 13, 6 - sw * 14);
    cane.rotation.set(sw * 1.1, 0, -0.25 - sw * 0.5);
  } else {
    const o = R3.objs.get(p);
    if (o) o.visible = false;
  }

  // --- 村人 ---
  for (const n of G.npcs) {
    const o = getObj(n, () => makePerson(
      new THREE.Color(n.color || '#c9b3d6').getHex(),
      new THREE.Color(n.hair || '#e8e8e8').getHex()
    ));
    seen.add(n);
    placeActor(o, n.x, n.y, n.face, n.bob);
    // のびている間は倒す
    o.rotation.x = n.stun > 0 ? -1.2 : 0;
  }

  // --- 軽トラ ---
  for (const v of G.vehicles) {
    const o = getObj(v, makeTruck);
    seen.add(v);
    const gy = terrainHeight(v.x, v.y);
    o.position.set(v.x, gy, v.y);
    o.rotation.y = -v.angle;
  }

  // --- 動物 ---
  for (const c of G.critters) {
    const o = getObj(c, () => makeCritter(c.kind));
    seen.add(c);
    placeActor(o, c.x, c.y, c.face, c.bob);
  }

  // --- 落し物 ---
  for (const it of G.items) {
    const o = getObj(it, makeItem);
    seen.add(it);
    o.position.set(it.x, terrainHeight(it.x, it.y) + 10 + Math.sin(t * 3 + it.t) * 2, it.y);
    o.rotation.y = t * 1.2;
  }

  // --- 消えたものを片づける ---
  for (const [ent, obj] of R3.objs) {
    if (seen.has(ent)) continue;
    R3.scene.remove(obj);
    R3.objs.delete(ent);
  }

  // --- 目的地の光の柱 ---
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  G.markers.forEach((m, i) => {
    const g = R3.beams[i];
    if (!g) return;
    g.visible = true;
    g.position.set(m.x, terrainHeight(m.x, m.y), m.y);
    const r = m.r + 6;
    g.children[0].scale.set(r, 320, r);
    g.children[0].material.opacity = 0.14 + pulse * 0.14;
    g.children[1].scale.set(r + pulse * 8, r + pulse * 8, 1);
  });
  for (let i = G.markers.length; i < R3.beams.length; i++) R3.beams[i].visible = false;

  // --- エフェクト ---
  let fi = 0;
  for (const e of G.effects) {
    if (e.type === 'text') continue;         // 文字は DOM で出す
    const m = R3.fx[fi++];
    if (!m) break;
    const k = 1 - e.life / e.max;
    m.visible = true;
    m.position.set(e.x, terrainHeight(e.x, e.y) + 14, e.y);
    if (e.type === 'boom') {
      const r = 12 + k * 62;
      m.scale.set(r, r, r);
      m.material.color.setHex(0xffa83f);
      m.material.opacity = (1 - k) * 0.9;
    } else {
      const r = 5 + k * 22;
      m.scale.set(r, r * 0.5, r);
      m.material.color.setHex(e.type === 'hit' ? 0xffffff : 0xd8cfb4);
      m.material.opacity = (1 - k) * 0.7;
    }
  }
  for (let i = fi; i < R3.fx.length; i++) R3.fx[i].visible = false;
};

function placeActor(o, x, z, face, bob) {
  o.position.set(x, terrainHeight(x, z) + Math.abs(Math.sin(bob)) * 2.2, z);
  o.rotation.y = -face;
}

/* =========================================================
   カメラ
========================================================= */
R3.updateCamera = function (dt, G) {
  const p = G.player;
  const v = p.vehicle;
  const tx = v ? v.x : p.x, tz = v ? v.y : p.y;
  const gy = terrainHeight(tx, tz);

  if (this.camMode === 'follow') {
    const heading = (v ? v.angle : p.face) + Math.PI / 2;
    // ゆっくり背後に回り込む（急に回すと酔うので上限をつける）
    const d = angNorm(heading - this.camYaw);
    this.camYaw += clamp(d, -1.6 * dt, 1.6 * dt);
  } else {
    this.camYaw = lerp(this.camYaw, 0, 1 - Math.pow(0.02, dt));
  }

  const dist = v ? 330 : 250;
  const high = v ? 300 : 240;
  const fx = Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);   // 前方（画面奥）

  this.basis.fx = fx; this.basis.fz = fz;
  this.basis.rx = -fz; this.basis.rz = fx;                          // 右方向

  const cx = tx - fx * dist, cz = tz - fz * dist;
  const cy = Math.max(terrainHeight(cx, cz), gy) + high;

  const k = 1 - Math.pow(0.0009, dt);
  this.camera.position.x = lerp(this.camera.position.x, cx, k);
  this.camera.position.y = lerp(this.camera.position.y, cy, k);
  this.camera.position.z = lerp(this.camera.position.z, cz, k);
  this.camera.lookAt(tx, gy + 22, tz);

  // 影のカメラを主人公に追従させる
  this.sunTarget.position.set(tx, gy, tz);
  this.sun.position.set(tx - 320, gy + 620, tz - 280);
};

R3.snapCamera = function (G) {
  const p = G.player;
  const fx = Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
  this.camera.position.set(p.x - fx * 250, terrainHeight(p.x, p.y) + 240, p.y - fz * 250);
  this.camera.lookAt(p.x, 22, p.y);
};

R3.toggleCam = function () {
  this.camMode = this.camMode === 'fixed' ? 'follow' : 'fixed';
  return this.camMode;
};

R3.render = function () { this.renderer.render(this.scene, this.camera); };

/* =========================================================
   世界の中に出す文字（DOM で出すので日本語が綺麗）
========================================================= */
const Labels = {
  root: null, pool: [], used: 0,
  _v: null,

  init(root) { this.root = root; this._v = new THREE.Vector3(); },

  begin() { this.used = 0; },

  /** ワールド座標 (x, height, z) に文字を置く */
  add(x, y, z, text, cls) {
    const v = this._v.set(x, y, z).project(R3.camera);
    if (v.z > 1) return;                      // カメラの後ろ
    let el = this.pool[this.used];
    if (!el) {
      el = document.createElement('div');
      this.root.appendChild(el);
      this.pool.push(el);
    }
    this.used++;
    if (el._text !== text) { el.innerHTML = text; el._text = text; }
    if (el._cls !== cls) { el.className = 'wlabel ' + cls; el._cls = cls; }
    el.style.transform =
      `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px,${(-v.y * 0.5 + 0.5) * window.innerHeight}px)`;
    el.style.display = '';
  },

  end() {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].style.display = 'none';
  },
};

R3.drawLabels = function (G) {
  Labels.begin();
  const p = G.player;
  const px = p.vehicle ? p.vehicle.x : p.x, pz = p.vehicle ? p.vehicle.y : p.y;

  // 建物の名前（近いものだけ）
  for (const b of WORLD.buildings) {
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
    if (dist2(px, pz, cx, cz) > 620 * 620) continue;
    Labels.add(cx, terrainHeight(cx, cz) + (b._labelY || 70), cz, b.name, 'bldg');
  }

  const focus = G.focus;
  for (const n of G.npcs) {
    if (dist2(px, pz, n.x, n.y) > 700 * 700) continue;
    const gy = terrainHeight(n.x, n.y);
    if (n.talkT > 0) {
      Labels.add(n.x, gy + 44, n.y, n.talk, 'bubble');
    } else if (focus && focus.obj === n) {
      // プロンプトを出すので名前と「！」は省く
    } else if (n.kind === 'cop') {
      Labels.add(n.x, gy + 40, n.y, '駐在', 'name cop');
    } else if (n.kind === 'giver' && Missions.hasWork(n.id)) {
      Labels.add(n.x, gy + 52, n.y, '!', 'bang');
    } else if (n.kind === 'giver' || n.kind === 'fixed') {
      Labels.add(n.x, gy + 40, n.y, n.name, 'name');
    }
  }

  // 目の前の対象
  if (focus && focus.x != null && !p.vehicle) {
    const talking = focus.obj && focus.obj.talkT > 0;
    if (!talking) {
      Labels.add(focus.x, terrainHeight(focus.x, focus.y) + 46, focus.y,
        '<b>E</b>' + focus.label, 'prompt');
    }
  }

  // 飛び出す文字
  for (const e of G.effects) {
    if (e.type !== 'text') continue;
    const k = 1 - e.life / e.max;
    Labels.add(e.x, terrainHeight(e.x, e.y) + 34 + k * 34, e.y,
      `<span style="color:${e.color || '#fff'};opacity:${(1 - k).toFixed(2)}">${e.text}</span>`, 'pop');
  }

  Labels.end();
};
