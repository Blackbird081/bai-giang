// TurtleBot3 Burger: trang chạy trực tiếp. Robot thật (theo vật lý có trượt bánh) và robot "trong đầu" (odometry từ
// encoder) chạy song song; LiDAR quét từ tư thế thật, bản đồ dựng theo tư thế robot tin là đúng.
import * as THREE from 'three';
import {createStage, MAT} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
const {alongY} = SH;
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {TB, WHEEL_MAX, ROOM, BOXES, CYLS, PATH, ray, collides, rng, createGrid} from './diff.js';

const D = 180 / Math.PI;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 2.2, grid: 0.1, fade: 6.5, fov: 26});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; st.scene.add(world);
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------------- phòng và vật cản
const wallMat = MAT.plastic('#dccbad'), boxMat = MAT.plastic('#c79f6e'), cylMat = MAT.glossy('#f0ece4');
{
  const W = ROOM.w / 2, H = ROOM.h / 2, t = 0.03, h = 0.22;
  for (const [x, y, w, d] of [[0, -H - t / 2, ROOM.w + 2 * t, t], [0, H + t / 2, ROOM.w + 2 * t, t], [-W - t / 2, 0, t, ROOM.h], [W + t / 2, 0, t, ROOM.h]]) { const m = mk(new THREE.BoxGeometry(w, d, h), wallMat, world); m.position.set(x, y, h / 2); }
  for (const b of BOXES) { const m = mk(new THREE.BoxGeometry(b.w, b.h, 0.2), boxMat, world); m.position.set(b.x, b.y, 0.1); m.rotation.z = b.a; }
  for (const c of CYLS) { const m = mk(new THREE.CylinderGeometry(c.r, c.r, 0.26, 40), cylMat, world); m.rotation.x = Math.PI / 2; m.position.set(c.x, c.y, 0.13); }
}
// ---------------- robot Burger: 4 tầng tấm "waffle", 2 bánh XL430, bi đỡ, OpenCR, Raspberry Pi, pin, LDS-02
// tấm "waffle" 138 mm có lưới lỗ (dùng chung một hình cho 4 tầng)
const waffleGeo = (() => {
  const sh = SH.rrect(0.138, 0.138, 0.02);
  for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) { const x = a * 0.0115, y = b * 0.0115; if (Math.hypot(x, y) > 0.072 || (Math.abs(x) > 0.055 && Math.abs(y) > 0.055)) continue; sh.holes.push(SH.hole(x, y, 0.0032)); }
  return SH.slab(sh, 0.003, 0.0008, 4);
})();
const plainPlate = SH.slab(SH.rrect(0.138, 0.138, 0.02), 0.003, 0.0008, 6);
// bánh 66 mm: lốp có gai, mâm 6 nan, trục theo y
const wheelGeo = (() => {
  const r = TB.r, w = 0.018;
  const tire = SH.lathe([[0.022, -w / 2], [r - 0.003, -w / 2], [r - 0.0005, -w / 2 + 0.002], [r, -w / 2 + 0.004], [r, w / 2 - 0.004], [r - 0.0005, w / 2 - 0.002], [r - 0.003, w / 2], [0.022, w / 2]], 48);
  const tread = SH.ringOf(30, () => { const g = SH.rbox(0.0024, 0.003, w * 0.82, 0.0008); g.translate(0, r + 0.0006, 0); return g; });
  return alongY(SH.merge([tire, tread]));
})();
const hubGeo = (() => { const parts = [SH.roundCyl(0.022, -0.0075, 0.0075, 0.0015, 0.0015, 36), SH.roundCyl(0.008, -0.0095, 0.0095, 0.0015, 0.0015, 20)]; return alongY(SH.merge(parts)); })();
const servoGeo = SH.merge([SH.rbox(0.0285, 0.0465, 0.034, 0.0035), (() => { const g = SH.roundCyl(0.0095, 0, 0.0025, 0.0006, 0.001, 24); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0.004); return g; })()]);
function buildBurger(ghost) {
  const g = new THREE.Group();
  const plate = ghost ? new THREE.MeshBasicMaterial({color: '#3c79a8', transparent: true, opacity: 0.22, depthWrite: false}) : MAT.pcb('#2b2e32');
  const m2 = (geo, mat) => { if (ghost) { const m = new THREE.Mesh(geo, plate); g.add(m); return m; } return mk(geo, mat || plate, g); };
  for (const z of [0.0135, 0.0635, 0.1065, 0.1495]) { const p = m2(ghost ? plainPlate : waffleGeo, null); p.position.z = z; }
  if (!ghost) {
    const post = SH.lathe([[0, 0], [0.0032, 0], [0.0032, 0.003], [0.0026, 0.004], [0.0026, 0.044], [0.0032, 0.045], [0.0032, 0.048], [0, 0.048]], 6);
    for (const z0 of [0.015, 0.065, 0.108]) for (const [x, y] of [[0.058, 0.058], [-0.058, 0.058], [0.058, -0.058], [-0.058, -0.058]]) { const s = mk(post, MAT.anod('#c8ccd0'), g); s.position.set(x, y, z0); s.scale.z = z0 > 0.1 ? 0.88 : z0 > 0.06 ? 0.86 : 1.02; }
    for (const sd of [-1, 1]) { const sv = mk(servoGeo, MAT.satin('#1f2023'), g); sv.position.set(0.0, sd * 0.045, 0.039); sv.rotation.x = sd > 0 ? 0 : Math.PI; sv.rotation.z = 0; }
    // OpenCR: mạch xanh tím than, chip STM32, cổng; Raspberry Pi 4: mạch xanh lá, SoC, cổng USB/Ethernet
    const opencr = mk(SH.rbox(0.105, 0.075, 0.0016, 0.002), MAT.pcb('#25306b'), g); opencr.position.z = 0.0715;
    mk(SH.rbox(0.014, 0.014, 0.0016, 0.0005), MAT.chip(), g).position.set(0.01, 0.005, 0.0735);
    for (const [x, y, w, h, t] of [[-0.045, 0.02, 0.012, 0.014, 0.006], [-0.045, -0.015, 0.01, 0.008, 0.004], [0.03, -0.028, 0.03, 0.005, 0.006]]) mk(SH.rbox(w, h, t, 0.0008), x < 0 ? MAT.steel() : MAT.chip(), g).position.set(x, y, 0.0725 + t / 2);
    const rpi = mk(SH.rbox(0.085, 0.056, 0.0016, 0.003), MAT.pcb('#2d6a46'), g); rpi.position.z = 0.1145;
    mk(SH.rbox(0.015, 0.015, 0.0024, 0.0008), MAT.anod('#b8bcc0'), g).position.set(0.005, 0.004, 0.1165);
    for (const [x, y] of [[-0.036, 0.016], [-0.036, -0.004]]) mk(SH.rbox(0.017, 0.013, 0.015, 0.001), MAT.steel(), g).position.set(x, y, 0.123);
    mk(SH.rbox(0.021, 0.016, 0.013, 0.001), MAT.steel(), g).position.set(-0.036, -0.022, 0.122);
    // pin LiPo 11,1 V 1800 mAh, nhãn cam
    mk(SH.rbox(0.087, 0.032, 0.026, 0.004), MAT.satin('#2b2b2c'), g).position.set(0, 0, 0.03);
    mk(SH.rbox(0.05, 0.0324, 0.0264, 0.002), MAT.accent(), g).position.set(0, 0, 0.03);
    // bi đỡ: chụp nhựa và viên bi thép
    mk(SH.lathe([[0, 0.006], [0.009, 0.006], [0.0095, 0.0105], [0.007, 0.0135], [0, 0.0135]], 24), MAT.satin('#2a2b2e'), g).position.set(-0.081, 0, 0);
    const caster = mk(new THREE.SphereGeometry(0.0075, 20, 14), MAT.steel(), g); caster.position.set(-0.081, 0, 0.0075);
  }
  const wheels = [-1, 1].map((sd) => {
    const w = new THREE.Group(); w.position.set(0, sd * TB.L / 2, TB.r); g.add(w);
    if (!ghost) { mk(wheelGeo, MAT.tire(), w); mk(hubGeo, MAT.satin('#d4d6d8'), w); for (let k = 0; k < 6; k++) { const b = mk(SH.roundCyl(0.0018, 0.0075, 0.0095, 0, 0.0006, 8), MAT.steel(), w); b.rotation.x = -sd * Math.PI / 2; b.position.set(0.014 * Math.cos(k * 1.047), 0, 0.014 * Math.sin(k * 1.047)); } }
    return w;
  });
  // LDS-02: đế đen, mâm quay có cửa sổ quang kính khói
  const lid = new THREE.Group(); lid.position.set(TB.lidar.x, 0, 0.152); g.add(lid);
  const lbase = m2(SH.rbox(0.096, 0.07, 0.016, 0.004), MAT.satin('#1d1e20')); lbase.position.set(TB.lidar.x, 0, 0.159);
  if (!ghost) {
    mk(SH.lathe([[0, 0.016], [0.033, 0.016], [0.0335, 0.019], [0.0335, 0.03], [0.031, 0.034], [0, 0.034]], 48), MAT.satin('#202224'), lid);
    const win = mk(SH.lathe([[0.0337, 0.021], [0.0342, 0.0215], [0.0342, 0.0285], [0.0337, 0.029]], 48), MAT.glass('#30363b'), lid); void win;
    mk(SH.rbox(0.008, 0.012, 0.007, 0.0015), MAT.accent(), lid).position.set(0.03, 0, 0.025);
  }
  return {g, wheels, lid};
}
const bot = buildBurger(false), ghost = buildBurger(true);
world.add(bot.g, ghost.g);
// đường đi, điểm nhìn trước, tia LiDAR, vết
const pathLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(PATH.map(([x, y]) => new THREE.Vector3(x, y, 0.009))), new THREE.LineDashedMaterial({color: '#2a2521', dashSize: 0.04, gapSize: 0.03}));
pathLine.computeLineDistances(); world.add(pathLine);
const wp = new THREE.InstancedMesh(new THREE.CircleGeometry(0.018, 20), new THREE.MeshBasicMaterial({color: '#2a2521'}), PATH.length);
PATH.forEach(([x, y], i) => wp.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, 0.0095))); world.add(wp);
const look = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({color: '#e3562a'})); world.add(look);
const lookLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({color: '#e3562a'})); world.add(lookLine);
const rayGeo = new THREE.BufferGeometry(); rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(360 * 6), 3));
const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({color: '#e3562a', transparent: true, opacity: 0.18})); world.add(rays);
const hitGeo = new THREE.BufferGeometry(); hitGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(360 * 3), 3));
const hits = new THREE.Points(hitGeo, new THREE.PointsMaterial({color: '#e3562a', size: 5, sizeAttenuation: false})); world.add(hits);
const dots = (col) => { const m = new THREE.InstancedMesh(new THREE.CircleGeometry(0.006, 10), new THREE.MeshBasicMaterial({color: col}), 1500); m.count = 0; m.frustumCulled = false; world.add(m); return {m, i: 0, last: null}; };
const trTrue = dots('#2a2521'), trOdom = dots('#3c79a8');
const M4 = new THREE.Matrix4();
const pushDot = (t, x, y) => { if (t.last && Math.hypot(x - t.last[0], y - t.last[1]) < 0.02) return; t.m.setMatrixAt(t.i % 1500, M4.makeTranslation(x, y, 0.008)); t.i++; t.m.count = Math.min(1500, t.i); t.m.instanceMatrix.needsUpdate = true; t.last = [x, y]; };
// bản đồ lưới trên sàn
const grid = createGrid(0.04);
const mapCv = document.createElement('canvas'); mapCv.width = grid.W; mapCv.height = grid.H;
const mapCtx = mapCv.getContext('2d'), mapImg = mapCtx.createImageData(grid.W, grid.H);
const mapTex = new THREE.CanvasTexture(mapCv); mapTex.magFilter = THREE.NearestFilter; mapTex.minFilter = THREE.NearestFilter; mapTex.colorSpace = THREE.SRGBColorSpace;
const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(grid.W * grid.res, grid.H * grid.res), new THREE.MeshBasicMaterial({map: mapTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4}));
mapPlane.renderOrder = -1; // vẽ trước lớp bóng đổ (ShadowMaterial ghi chiều sâu)
mapPlane.position.set(grid.x0 + (grid.W * grid.res) / 2, grid.y0 + (grid.H * grid.res) / 2, 0.0025); world.add(mapPlane);

// ---------------- trạng thái
const R = rng(11);
const S = {truth: {x: -1.2, y: -0.95, th: 0}, odom: {x: -1.2, y: -0.95, th: 0}, cmd: {v: 0, w: 0}, wL: 0, wR: 0, phiL: 0, phiR: 0, tL: 0, tR: 0, tL0: 0, tR0: 0,
  mode: 'stop', vset: 0.15, Ld: 0.3, radErr: 0.003, slip: 0.02, amcl: false, mapPose: 'odom', scan: new Float32Array(360), scanT: 0, look: [0, 0], seg: 0, bump: false, safety: false, errH: [], tele: {v: 0, w: 0},
  disp: {rays: true, ghost: true, path: true, map: true, labels: true, xray: false}};
const resetState = () => {
  Object.assign(S, {truth: {x: -1.2, y: -0.95, th: 0}, odom: {x: -1.2, y: -0.95, th: 0}, cmd: {v: 0, w: 0}, wL: 0, wR: 0, phiL: 0, phiR: 0, tL: 0, tR: 0, tL0: 0, tR0: 0, mode: 'stop', vset: 0.15, Ld: 0.3, radErr: 0.003, slip: 0.02, amcl: false, mapPose: 'odom', seg: 0, recover: 0, turn: 0, safeT: 0, bump: false, safety: false, errH: [], tele: {v: 0, w: 0}});
  Object.assign(S.disp, {rays: true, ghost: true, path: true, map: true, labels: true, xray: false});
  grid.clear(); for (const t of [trTrue, trOdom]) { t.m.count = 0; t.i = 0; t.last = null; }
};
// pure pursuit trên tư thế odometry: tìm điểm trên đường vòng cách robot đúng Ld, đi tới trước
const pursuit = () => {
  const o = S.odom, n = PATH.length;
  // đoạn gần nhất, chỉ cho phép tiến
  let best = Infinity, bi = S.seg;
  for (let k = 0; k < 3; k++) {
    const i = (S.seg + k) % n, a = PATH[i], b = PATH[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], t = Math.max(0, Math.min(1, ((o.x - a[0]) * ex + (o.y - a[1]) * ey) / (ex * ex + ey * ey)));
    const d = Math.hypot(a[0] + t * ex - o.x, a[1] + t * ey - o.y); if (d < best - 1e-6) { best = d; bi = i; }
  }
  S.seg = bi; S.cte = best;
  let pt = PATH[(bi + 1) % n];
  for (let k = 0; k < n; k++) {
    const i = (bi + k) % n, a = PATH[i], b = PATH[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], fx0 = a[0] - o.x, fy0 = a[1] - o.y;
    const A = ex * ex + ey * ey, B = 2 * (fx0 * ex + fy0 * ey), Cc = fx0 * fx0 + fy0 * fy0 - S.Ld * S.Ld, disc = B * B - 4 * A * Cc;
    if (disc < 0) continue; const t = (-B + Math.sqrt(disc)) / (2 * A);
    if (t >= 0 && t <= 1) { pt = [a[0] + t * ex, a[1] + t * ey]; break; }
  }
  S.look = pt;
  const dx = pt[0] - o.x, dy = pt[1] - o.y, yr = -Math.sin(o.th) * dx + Math.cos(o.th) * dy, L2 = dx * dx + dy * dy;
  S.kappa = (2 * yr) / Math.max(1e-6, L2);
  return {v: S.vset, w: S.vset * S.kappa};
};
const physics = (dt) => {
  let {v, w} = S.mode === 'auto' ? pursuit() : S.mode === 'tele' ? S.tele : {v: 0, w: 0};
  // phục hồi khi kẹt (kiểu "back up" của Nav2): lùi 1 s rồi bám đường lại
  if (S.mode === 'auto' && S.bump && !(S.recover > 0)) S.recover = 1.0;
  if (S.recover > 0) { S.recover -= dt; v = -0.06; w = 0; }
  // an toàn: vật cản phía trước gần hơn 0,22 m thì dừng tiến
  let front = Infinity; for (let k = -25; k <= 25; k++) { const r = S.scan[(k + 360) % 360]; if (r > 0) front = Math.min(front, r); }
  S.safety = v > 0 && front < 0.22; if (S.safety) v = 0;
  // bị chặn quá 1,5 s khi tự chạy: xoay tại chỗ về phía thoáng hơn
  S.safeT = S.safety && S.mode === 'auto' ? (S.safeT || 0) + dt : 0;
  if (S.safeT > 1.5) { let l = 0, r = 0; for (let k = 20; k < 90; k++) { l += Math.min(2, S.scan[k] || 0); r += Math.min(2, S.scan[360 - k] || 0); } S.turn = 0.8; S.turnDir = l > r ? 1 : -1; S.safeT = 0; }
  if (S.turn > 0) { S.turn -= dt; v = 0; w = 1.2 * S.turnDir; }
  v = Math.max(-TB.vmax, Math.min(TB.vmax, v)); w = Math.max(-TB.wmax, Math.min(TB.wmax, w));
  S.cmd = {v, w};
  // tốc độ bánh đặt, bão hoà 61 vòng/phút, giới hạn gia tốc
  let tL = (v - (w * TB.L) / 2) / TB.r, tR = (v + (w * TB.L) / 2) / TB.r; const k = Math.max(1, Math.abs(tL) / WHEEL_MAX, Math.abs(tR) / WHEEL_MAX); tL /= k; tR /= k;
  const amax = (TB.acc / TB.r) * dt;
  S.wL += Math.max(-amax, Math.min(amax, tL - S.wL)); S.wR += Math.max(-amax, Math.min(amax, tR - S.wR));
  // bánh thật: bán kính lệch ±radErr/2, trượt ngẫu nhiên
  const rL = TB.r * (1 - S.radErr / 2), rR = TB.r * (1 + S.radErr / 2);
  const sL = S.wL * dt * rL * (1 + S.slip * R.n()), sR = S.wR * dt * rR * (1 + S.slip * R.n());
  const ds = (sL + sR) / 2, dth = (sR - sL) / TB.L, t = S.truth;
  const nx = t.x + ds * Math.cos(t.th + dth / 2), ny = t.y + ds * Math.sin(t.th + dth / 2);
  S.bump = collides(nx, ny);
  if (!S.bump) { t.x = nx; t.y = ny; t.th += dth; }
  S.phiL += S.wL * dt; S.phiR += S.wR * dt; // kẹt tường: bánh vẫn quay, encoder vẫn đếm
  // encoder 4096 xung/vòng → odometry với bán kính danh định
  S.tL = Math.floor((S.phiL * TB.ticks) / (2 * Math.PI)); S.tR = Math.floor((S.phiR * TB.ticks) / (2 * Math.PI));
  const dL = ((S.tL - S.tL0) * 2 * Math.PI * TB.r) / TB.ticks, dR = ((S.tR - S.tR0) * 2 * Math.PI * TB.r) / TB.ticks; S.tL0 = S.tL; S.tR0 = S.tR;
  const o = S.odom, ods = (dL + dR) / 2, odth = (dR - dL) / TB.L;
  o.x += ods * Math.cos(o.th + odth / 2); o.y += ods * Math.sin(o.th + odth / 2); o.th += odth;
};
const scanNow = () => {
  const t = S.truth, lx = t.x + TB.lidar.x * Math.cos(t.th), ly = t.y + TB.lidar.x * Math.sin(t.th);
  for (let k = 0; k < 360; k++) {
    let r = ray(lx, ly, t.th + (k * Math.PI) / 180);
    if (r < TB.lidar.rmin) r = 0; else if (r > TB.lidar.rmax) r = Infinity; else r *= 1 + (r < 0.3 ? 0.01 / r : 0.015) * R.n() * 0.5; // độ chính xác LDS-02: ±10 mm dưới 0,3 m, ±3 % tới 6 m
    S.scan[k] = r;
  }
  // ĐỊNH VỊ LIÊN TỤC: mô phỏng kết quả của bộ định vị theo bản đồ (kiểu AMCL), không chạy bộ lọc hạt thật:
  // ước lượng bị kéo về tư thế thật cộng nhiễu σ 1 cm, 0,5°
  if (S.amcl) { const o = S.odom; o.x += 0.5 * (t.x + 0.01 * R.n() - o.x); o.y += 0.5 * (t.y + 0.01 * R.n() - o.y); o.th += 0.5 * (t.th + 0.009 * R.n() - o.th); }
  const P = S.mapPose === 'odom' ? S.odom : S.truth;
  grid.update(P.x + TB.lidar.x * Math.cos(P.th), P.y + TB.lidar.x * Math.sin(P.th), P.th, S.scan);
};

// ---------------- bảng điều khiển
ui.header({code: 'TB3', kicker: 'ROBOT DI ĐỘNG · TURTLEBOT3 BURGER · ROS 2', title: 'Xe tự hành vi sai', sub: 'ĐỘNG HỌC VI SAI · ODOMETRY · LIDAR · BẢN ĐỒ LƯỚI · PURE PURSUIT', hub: HUB_URL,
  right: [['0,22 m/s', 'TỐC ĐỘ TỐI ĐA'], ['360 tia', 'LIDAR LDS-02'], ['4096', 'XUNG / VÒNG BÁNH']]});
ui.panel(28, 112, 300, 206, 'BÁNH XE · ĐỘNG HỌC VI SAI', '01');
const vTxt = ui.text(42, 146, '', 'mo', 'position:absolute;font-size:17px;font-weight:700');
const wb = ['TRÁI', 'PHẢI'].map((n, i) => ui.bar(42, 180 + i * 22, 272, n, {lw: 40, vw: 100, center: true}));
const tickTxt = ui.text(42, 226, '', 'v', 'font-size:10.5px;font-weight:500');
ui.text(42, 250, 'v = r·(ωR + ωL)/2 · ω = r·(ωR − ωL)/L', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px');
ui.text(42, 266, `r 33 mm · L 160 mm · XL430: 61 vòng/ph @12 V`, 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px');
ui.text(42, 282, `→ trần bánh ${fx(WHEEL_MAX * TB.r, 3)} m/s (công bố 0,22 m/s)`, 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px');
ui.panel(28, 330, 300, 214, 'ODOMETRY · TỰ ĐOÁN VỊ TRÍ', '02');
const odoTxt = ui.text(42, 364, '', 'v', 'font-size:10.5px;font-weight:500;line-height:1.7');
const errLbl = ui.text(42, 404, '');
const errChart = ui.chart(42, 420, 272, 54, {min: 0, max: 300, colors: [C.blue]});
const sRad = ui.slider('rad', 42, 488, 272, 'LỆCH BÁN KÍNH', {lw: 96, vw: 54});
const sSlip = ui.slider('slip', 42, 514, 272, 'TRƯỢT BÁNH', {lw: 96, vw: 54});
ui.panel(28, 556, 300, 210, 'BÁM ĐƯỜNG · PURE PURSUIT', '03');
const sV = ui.slider('vset', 42, 592, 272, 'TỐC ĐỘ', {lw: 96, vw: 54});
const sLd = ui.slider('ld', 42, 618, 272, 'NHÌN TRƯỚC Ld', {lw: 96, vw: 54});
const ppTxt = ui.text(42, 644, '', 'v', 'font-size:10.5px;font-weight:500;line-height:1.7');
ui.text(42, 690, 'κ = 2·y_L / Ld² · ω = v·κ', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px');
ui.text(42, 708, 'Bám theo tư thế ước lượng: tắt định vị thì robot không biết mình đã trôi.', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9px;white-space:normal;width:272px;line-height:1.5');
ui.panel(1272, 112, 300, 268, 'LIDAR LDS-02 · 360 TIA · 5 Hz', '04');
const radar = ui.svg(1286, 146, 272, 200);
const lidTxt = ui.text(1286, 352, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px');
ui.panel(1272, 392, 300, 210, 'BẢN ĐỒ LƯỚI CHIẾM CHỖ', '05');
const mini = ui.add(`<canvas width="${grid.W}" height="${grid.H}" style="position:absolute;left:1286px;top:426px;width:186px;height:${Math.round((186 * grid.H) / grid.W)}px;image-rendering:pixelated;border:1px solid ${C.line};background:#fbf6ee"></canvas>`);
ui.buttons([['mapodom', 'THEO ODOM'], ['maptrue', 'THEO TƯ THẾ THẬT'], ['mapclear', 'XOÁ']], 1286, 572, 272);
const mapTxt = ui.text(1482, 428, '', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:8.6px;white-space:normal;width:84px;line-height:1.45');
ui.panel(1272, 614, 300, 152, 'LỆNH · HIỂN THỊ', '06');
ui.buttons([['auto', 'TỰ CHẠY'], ['tele', 'LÁI TAY'], ['stop', 'DỪNG']], 1286, 644, 272);
ui.buttons([['amcl', 'ĐỊNH VỊ LIÊN TỤC'], ['reloc', 'ĐẶT LẠI ODOM']], 1286, 672, 272);
ui.buttons([['rays', 'TIA'], ['ghost', 'BÓNG'], ['path', 'ĐƯỜNG'], ['map', 'BẢN ĐỒ'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 704, 272);
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_follow', 'BÁM ROBOT'], ['v_top', 'TRÊN'], ['v_close', 'SÁT']], 360, 120, 600);
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'lds', title: 'LIDAR LDS-02', sub: '0,16–8 m · 1° · 5 Hz'}, {key: 'wheel', title: 'BÁNH + XL430-W250', sub: '4096 XUNG/VÒNG · 1,5 N·m'}, {key: 'rpi', title: 'RASPBERRY PI 4', sub: 'ROS 2'},
  {key: 'opencr', title: 'OPENCR 1.0', sub: 'STM32F746 · IMU'}, {key: 'bat', title: 'PIN LIPO 11,1 V', sub: '1800 mAh · 2 h 30'}, {key: 'ghost', title: 'BÓNG ODOMETRY', sub: 'VỊ TRÍ ROBOT TỰ TIN'},
]);

// ---------------- mô phỏng
const disp = S.disp;
let acc = 0;
const sim = {
  S,
  reset() { resetState(); scanNow(); },
  act(k) {
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'amcl') S.amcl = !S.amcl; if (k === 'auto') S.mode = 'auto'; if (k === 'tele') { S.mode = 'tele'; S.tele = {v: 0, w: 0}; } if (k === 'stop') { S.mode = 'stop'; S.tele = {v: 0, w: 0}; }
    if (k === 'reloc') { Object.assign(S.odom, S.truth); S.seg = 0; let b = 1e9; PATH.forEach(([x, y], i) => { const d = Math.hypot(x - S.truth.x, y - S.truth.y); if (d < b) { b = d; S.seg = (i + PATH.length - 1) % PATH.length; } }); }
    if (k === 'mapodom') { S.mapPose = 'odom'; grid.clear(); } if (k === 'maptrue') { S.mapPose = 'true'; grid.clear(); } if (k === 'mapclear') grid.clear();
    if (k === 'fwd') { S.mode = 'tele'; S.tele.v = Math.min(TB.vmax, S.tele.v + 0.05); } if (k === 'back') { S.mode = 'tele'; S.tele.v = Math.max(-TB.vmax, S.tele.v - 0.05); }
    if (k === 'left') { S.mode = 'tele'; S.tele.w = Math.min(TB.wmax, S.tele.w + 0.5); } if (k === 'right') { S.mode = 'tele'; S.tele.w = Math.max(-TB.wmax, S.tele.w - 0.5); }
    if (k === 'spin') { S.mode = 'tele'; S.tele = {v: 0, w: 1.2}; } if (k === 'arc') { S.mode = 'tele'; S.tele = {v: 0.15, w: 0.6}; } if (k === 'straight') { S.mode = 'tele'; S.tele = {v: 0.2, w: 0}; }
  },
  slide(k, t) { if (k === 'rad') S.radErr = t * 0.02; if (k === 'slip') S.slip = t * 0.1; if (k === 'vset') S.vset = 0.03 + t * 0.19; if (k === 'ld') S.Ld = 0.1 + t * 0.6; },
  keyDown(k) {
    const m = {w: [0.01, 0], x: [-0.01, 0], a: [0, 0.1], d: [0, -0.1]}[k]; // bước như turtlebot3_teleop_key
    if (m) { S.mode = 'tele'; S.tele.v = Math.max(-TB.vmax, Math.min(TB.vmax, S.tele.v + m[0] * 5)); S.tele.w = Math.max(-TB.wmax, Math.min(TB.wmax, S.tele.w + m[1] * 3)); return true; }
    if (k === 's') { S.tele = {v: 0, w: 0}; return true; }
    return false;
  },
  step(dt) { acc += dt; while (acc >= 0.01) { physics(0.01); S.scanT += 0.01; if (S.scanT >= 1 / TB.lidar.hz) { S.scanT = 0; scanNow(); } pushDot(trTrue, S.truth.x, S.truth.y); pushDot(trOdom, S.odom.x, S.odom.y); acc -= 0.01; } },
  shadowAt() { return new THREE.Vector3(S.truth.x * 0.5, 0.1, -S.truth.y * 0.5); },
  draw() {
    const t = S.truth, o = S.odom;
    bot.g.position.set(t.x, t.y, 0); bot.g.rotation.z = t.th; ghost.g.position.set(o.x, o.y, 0); ghost.g.rotation.z = o.th; ghost.g.visible = disp.ghost && Math.hypot(o.x - t.x, o.y - t.y) + 0.05 * Math.abs(o.th - t.th) > 0.015; // trùng nhau thì ẩn bóng để thấy rõ robot
    bot.wheels[0].rotation.y = S.phiR; bot.wheels[1].rotation.y = S.phiL; bot.lid.rotation.z += 0.21;
    // tia LiDAR từ tư thế thật
    const lx = t.x + TB.lidar.x * Math.cos(t.th), ly = t.y + TB.lidar.x * Math.sin(t.th), pa = rayGeo.attributes.position.array, ha = hitGeo.attributes.position.array;
    for (let k = 0; k < 360; k++) {
      const r = S.scan[k], a = t.th + (k * Math.PI) / 180, d = r > 0 && Number.isFinite(r) ? r : 0;
      pa.set([lx, ly, 0.17, lx + d * Math.cos(a), ly + d * Math.sin(a), 0.17], k * 6); ha.set([lx + d * Math.cos(a), ly + d * Math.sin(a), 0.17], k * 3);
    }
    rayGeo.attributes.position.needsUpdate = true; hitGeo.attributes.position.needsUpdate = true; rays.visible = hits.visible = disp.rays;
    pathLine.visible = wp.visible = disp.path; look.visible = lookLine.visible = disp.path && S.mode === 'auto';
    look.position.set(S.look[0], S.look[1], 0.02); lookLine.geometry.setFromPoints([new THREE.Vector3(o.x, o.y, 0.02), new THREE.Vector3(S.look[0], S.look[1], 0.02)]);
    // bản đồ
    const L = grid.L, im = mapImg.data;
    let occ = 0, free = 0;
    for (let j = 0; j < grid.H; j++) for (let i = 0; i < grid.W; i++) {
      const v = L[j * grid.W + i], p = ((grid.H - 1 - j) * grid.W + i) * 4;
      if (v > 0.6) { im[p] = 60; im[p + 1] = 52; im[p + 2] = 46; im[p + 3] = 175; occ++; } else if (v < -0.3) { im[p] = 255; im[p + 1] = 252; im[p + 2] = 246; im[p + 3] = 120; free++; } else { im[p + 3] = 0; }
    }
    mapCtx.putImageData(mapImg, 0, 0); mapTex.needsUpdate = true; mapPlane.visible = disp.map;
    const mc = mini.getContext('2d'); mc.clearRect(0, 0, grid.W, grid.H); mc.drawImage(mapCv, 0, 0);
    const P = S.mapPose === 'odom' ? o : t, px = (P.x - grid.x0) / grid.res, py = grid.H - (P.y - grid.y0) / grid.res;
    mc.fillStyle = C.or; mc.beginPath(); mc.arc(px, py, 2.2, 0, 7); mc.fill(); mc.strokeStyle = C.or; mc.beginPath(); mc.moveTo(px, py); mc.lineTo(px + 6 * Math.cos(P.th), py - 6 * Math.sin(P.th)); mc.stroke();
    mapTxt.innerHTML = `Ô 4 cm<br>chiếm: ${occ}<br>trống: ${free}<br>dựng theo:<br><b>${S.mapPose === 'odom' ? 'odometry' : 'tư thế thật'}</b>`;
    xray(disp.xray ? 1 : 0);
    // bảng 01
    const v = (TB.r * (S.wR + S.wL)) / 2, w = (TB.r * (S.wR - S.wL)) / TB.L;
    vTxt.innerHTML = `v ${fx(v, 3)} m/s&nbsp;&nbsp;ω ${fx(w, 2)} rad/s`;
    wb[0].set(S.wL / WHEEL_MAX, `${fx((S.wL * 60) / (2 * Math.PI), 1)} vòng/ph`); wb[1].set(S.wR / WHEEL_MAX, `${fx((S.wR * 60) / (2 * Math.PI), 1)} vòng/ph`);
    tickTxt.textContent = `ENCODER  TRÁI ${S.tL}  PHẢI ${S.tR} xung`;
    // bảng 02
    const err = Math.hypot(o.x - t.x, o.y - t.y);
    odoTxt.innerHTML = `ODOM&nbsp;&nbsp;x ${fx(o.x, 3)}&nbsp;&nbsp;y ${fx(o.y, 3)}&nbsp;&nbsp;θ ${fx(((o.th * D) % 360 + 540) % 360 - 180, 1)}°<br><span style="color:${C.mute}">THẬT&nbsp;&nbsp;x ${fx(t.x, 3)}&nbsp;&nbsp;y ${fx(t.y, 3)}&nbsp;&nbsp;θ ${fx(((t.th * D) % 360 + 540) % 360 - 180, 1)}°</span>`;
    S.errH.push(err * 1000); if (S.errH.length > 400) S.errH.shift(); errChart.lim.max = Math.max(100, Math.ceil(Math.max(...S.errH) / 100) * 100); errChart.set([S.errH]);
    errLbl.textContent = `SAI SỐ (mm) · TRẦN ${errChart.lim.max}${S.amcl ? ' · ĐỊNH VỊ' : ''}`;
    sRad.set(S.radErr / 0.02, `${fx(S.radErr * 100, 2)} %`); sSlip.set(S.slip / 0.1, `${fx(S.slip * 100, 1)} %`);
    sV.set((S.vset - 0.03) / 0.19, `${fx(S.vset, 2)} m/s`); sLd.set((S.Ld - 0.1) / 0.6, `${fx(S.Ld, 2)} m`);
    ppTxt.innerHTML = S.mode === 'auto' ? `κ ${fx(S.kappa, 2)} 1/m · ω đặt ${fx(S.cmd.w, 2)} rad/s<br>lệch đường (odom) ${fx((S.cte || 0) * 1000, 0)} mm · sai thật ${fx(err * 1000, 0)} mm` : `<span style="color:${C.mute}">Bấm TỰ CHẠY để bám đường.</span><br>&nbsp;`;
    // bảng 04: radar quanh robot, hướng tiến lên trên
    const cx = 136, cy = 100, sc = 100 / 2.5;
    let g = `<rect x="0" y="0" width="272" height="200" fill="#fbf6ee" stroke="${C.line}"/>`;
    for (const r of [0.5, 1, 1.5, 2, 2.5]) g += `<circle cx="${cx}" cy="${cy}" r="${r * sc}" fill="none" stroke="${C.line}"/>`;
    g += `<text x="${cx + 2.5 * sc * 0.72}" y="${cy - 2.5 * sc * 0.72}" font-family="JetBrains Mono" font-size="8" fill="${C.mute}">2,5 m</text>`;
    let pts = '', mn = Infinity, mnk = 0, valid = 0;
    for (let k = 0; k < 360; k++) { const r = S.scan[k]; if (!(r > 0) || !Number.isFinite(r)) continue; valid++; if (r < mn) { mn = r; mnk = k; } if (r > 2.5) continue; const a = (k * Math.PI) / 180; pts += `<circle cx="${(cx - Math.sin(a) * r * sc).toFixed(1)}" cy="${(cy - Math.cos(a) * r * sc).toFixed(1)}" r="1.3" fill="${C.or}"/>`; }
    g += pts + `<path d="M${cx} ${cy - 7}L${cx - 5} ${cy + 5}L${cx + 5} ${cy + 5}Z" fill="${C.ink}"/>`;
    radar.innerHTML = g;
    lidTxt.textContent = `${valid}/360 tia · gần nhất ${fx(mn, 2)} m ở ${mnk}°`;
    alert.set(S.bump ? 'VA CHẠM · ODOMETRY VẪN TIN MÌNH ĐANG CHẠY' : S.safety ? 'VẬT CẢN < 22 cm · DỪNG' : '');
    for (const k of Object.keys(disp)) ui.setOn(k, disp[k]);
    ui.setOn('amcl', S.amcl); ui.setOn('auto', S.mode === 'auto'); ui.setOn('tele', S.mode === 'tele'); ui.setOn('stop', S.mode === 'stop'); ui.setOn('mapodom', S.mapPose === 'odom'); ui.setOn('maptrue', S.mapPose === 'true');
    // nhãn
    const W = (x, y, z, b = t) => st.project(b.x + x * Math.cos(b.th) - y * Math.sin(b.th), z, -(b.y + x * Math.sin(b.th) + y * Math.cos(b.th)));
    const kk = disp.labels ? 1 : 0;
    ui.drawCallouts([
      {key: 'lds', p: W(TB.lidar.x, 0, 0.19), dx: -110, dy: -30}, {key: 'wheel', p: W(0, -TB.L / 2 - 0.01, 0.04), dx: 80, dy: 50}, {key: 'rpi', p: W(0.04, 0.02, 0.122), dx: 90, dy: -60},
      {key: 'opencr', p: W(0.05, 0.03, 0.075), dx: 100, dy: -20}, {key: 'bat', p: W(0.04, 0.0, 0.03), dx: -110, dy: 40}, {key: 'ghost', p: disp.ghost && err > 0.05 ? W(0, 0, 0.16, o) : null, dx: -90, dy: -50},
    ], kk * (cur.v === 'close' || cur.v === 'follow' ? 1 : 0));
  },
};
const xray = (() => { let c = -1; return (k) => { if (Math.abs(k - c) < 1e-3) return; c = k; bot.g.traverse((m) => { if (!m.isMesh) return; m.material.transparent = k > 0; m.material.opacity = 1 - 0.75 * k; m.material.depthWrite = k < 0.5; }); }; })();
const cur = {v: 'hero'};
const Tg = () => ({tx: S.truth.x, ty: 0.08, tz: -S.truth.y});
const views = {
  hero: (tt) => (cur.v = 'hero', {tx: 0.0, ty: 0.0, tz: 0.1, az: 20 + 6 * Math.sin(tt * 0.1), el: 52, d: 8.2, sx: 0, sy: -30}),
  follow: () => (cur.v = 'follow', {...Tg(), az: (S.truth.th * D + 90) - 140, el: 32, d: 1.5, sx: 0, sy: -40}),
  top: () => (cur.v = 'top', {tx: 0, ty: 0, tz: 0.05, az: 0, el: 88, d: 8.4, sx: 0, sy: -30}),
  close: () => (cur.v = 'close', {...Tg(), ty: 0.1, az: (S.truth.th * D + 90) + 60, el: 26, d: 0.7, sx: 0, sy: -40}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'TURTLEBOT3 BURGER · 1 kg', t: 'Robot di động chuẩn của ROS', b: 'Hai bánh chủ động dẫn bởi servo Dynamixel XL430-W250, một bi đỡ phía sau, bộ điều khiển OpenCR (STM32F746), máy tính Raspberry Pi 4 chạy ROS 2, LiDAR LDS-02 quét 360°. Kích thước 138 × 178 × 192 mm. Thông số trên trang lấy từ tài liệu ROBOTIS và mã nguồn turtlebot3.', e: 'r = 33 mm · L = 160 mm · 0,22 m/s · 2,84 rad/s'},
  {k: 'ĐỘNG HỌC VI SAI', t: 'Hai bánh, ba kiểu chuyển động', b: 'Hai bánh cùng tốc độ: đi thẳng. Ngược chiều: xoay tại chỗ. Lệch nhau: đi theo cung tròn bán kính v/ω. Robot không đi ngang được: đó là ràng buộc không khả tích (nonholonomic). Trần 61 vòng/phút của servo giới hạn cả v lẫn ω cùng lúc.', e: 'ẋ = v·cosθ · ẏ = v·sinθ · θ̇ = ω'},
  {k: 'LIDAR LDS-02', t: '360 khoảng cách mỗi vòng quay', b: 'Đầu quét quay 5 vòng mỗi giây, mỗi độ một khoảng cách, tầm 0,16–8 m, sai số ±10 mm dưới 0,3 m và ±3 % tới 6 m. Bảng 04 vẽ lại lần quét quanh robot: tường, hộp, trụ hiện ra thành chuỗi điểm. Gần hơn 0,16 m là điểm mù.', e: 'pₖ = p_lidar + rₖ·(cos(θ + k°), sin(θ + k°))'},
  {k: 'BÁM ĐƯỜNG PURE PURSUIT', t: 'Đuổi theo một điểm phía trước', b: 'Chọn điểm trên đường cách robot đúng Ld, tính cung tròn đi qua điểm đó và đặt ω = v·κ. Ld nhỏ: bám sát nhưng lắc và vượt góc. Ld lớn: êm nhưng cắt góc, có thể quệt vật cản. Đây là bộ bám đường mặc định của nhiều robot di động.', e: 'κ = 2·y_L / Ld²'},
  {k: 'ENCODER VÀ ODOMETRY', t: 'Đếm xung để đoán vị trí', b: 'Tắt định vị, robot chỉ còn đếm xung: 4096 xung mỗi vòng bánh, đổi ra quãng đường hai bánh rồi cộng dồn. Bánh thật lệch bán kính 0,8 % và trượt ngẫu nhiên: bóng xanh (vị trí robot tin) tách dần khỏi robot thật. Sai số chỉ tăng, không tự giảm.', e: 'Δs = (ΔsR + ΔsL)/2 · Δθ = (ΔsR − ΔsL)/L'},
  {k: 'BẢN ĐỒ LƯỚI CHIẾM CHỖ', t: 'Vẽ bản đồ từ lần quét', b: 'Mỗi tia làm các ô nó đi qua thêm "trống", ô nó chạm thêm "chiếm" (log-odds). Dựng theo odometry đang trôi: tường bị nhân đôi, mờ nhoè. Dựng theo tư thế thật: sắc nét. Khoảng cách giữa hai bản đồ là lý do cần SLAM.', e: 'lₜ = lₜ₋₁ + log(p/(1 − p))'},
  {k: 'ĐỊNH VỊ THEO BẢN ĐỒ', t: 'Khi robot biết mình sai', b: 'Bộ định vị (AMCL, SLAM) so lần quét với bản đồ để kéo ước lượng về đúng chỗ. Trang này mô phỏng kết quả của bước đó (σ 1 cm, 0,5°), không chạy bộ lọc hạt. Bóng xanh nhập lại robot, bản đồ dựng lại sắc nét.', e: 'odometry dự báo · LiDAR + bản đồ hiệu chỉnh'},
  {k: 'AN TOÀN', t: 'Dừng trước vật cản', b: 'Lái tay thẳng về phía tường: khi tia LiDAR phía trước (±25°) báo gần hơn 22 cm, lệnh tiến bị chặn, robot vẫn được phép xoay. Nếu robot va vào vật, nó lùi 1 s rồi bám đường lại, giống hành vi phục hồi của Nav2.', e: 'v = 0 khi r_trước < 0,22 m'},
];
const ev = [], at = (tt, o) => ev.push({at: tt, ...o});
at(0.2, {cap: 0}); at(2, {click: 'v_close'}); at(8, {click: 'v_hero'});
at(9, {cap: 1}); at(9.5, {click: 'v_follow'}); at(10.5, {do: () => sim.act('straight')}); at(13, {do: () => sim.act('spin')}); at(15.5, {do: () => sim.act('arc')}); at(19, {click: 'stop'}); at(19.5, {click: 'reloc'});
at(20, {cap: 2}); at(20.3, {click: 'amcl'}); at(20.8, {click: 'auto'}); at(23, {click: 'rays'}); at(25, {click: 'rays'}); at(26, {click: 'v_close'});
at(30, {cap: 3}); at(30.5, {click: 'v_top'}); at(32, {slide: 'ld', to: 0.04, dur: 1.4}); at(37, {slide: 'ld', to: 0.75, dur: 1.4}); at(42, {slide: 'ld', to: 1 / 3, dur: 1});
at(44, {cap: 4}); at(44.3, {click: 'amcl'}); at(44.8, {click: 'mapclear'}); at(45.5, {slide: 'rad', to: 0.4, dur: 1}); at(47, {click: 'v_hero'});
at(57, {cap: 5}); at(57.5, {click: 'v_top'}); at(66, {click: 'maptrue'});
at(70, {cap: 6}); at(70.5, {click: 'amcl'}); at(71.5, {slide: 'rad', to: 0.15, dur: 1}); at(73, {click: 'mapodom'}); at(75, {click: 'v_hero'});
at(84, {cap: 7}); at(84.2, {click: 'v_follow'}); at(84.6, {click: 'tele'}); at(85, {do: () => sim.act('straight')}); at(93, {click: 'auto'}); at(95, {click: 'v_hero'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 100}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_follow', 3: 'v_top', 4: 'v_close', p: 'auto', t: 'tele', ' ': 'stop', r: 'reloc', k: 'amcl', m: 'map', n: 'labels', g: 'ghost', l: 'rays', z: 'xray'}});
