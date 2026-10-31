// Drone bốn cánh Crazyflie: trang chạy trực tiếp. Mọi chuyển động, lực đẩy, số liệu và biểu đồ đọc từ quad.js
// (thân cứng 6 bậc tự do theo Förster 2015, PID xếp tầng theo crazyflie-firmware).
import * as THREE from 'three';
import {createStage, MAT} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {createQuad, MOTORS, P, GAINS} from './quad.js';

const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.45, grid: 0.05, fade: 2.6, fov: 26, near: 0.005});
const ui = createUI(app);
const Q = createQuad(), S = Q.S;
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; st.scene.add(world);
const drone = new THREE.Group(); world.add(drone);
const mk = (geo, mat, parent = drone) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------------- hình khối Crazyflie (92 mm giữa hai động cơ chéo, mạch in hình chữ thập)
const pcb = MAT.glossy('#1f2124'), white = MAT.plastic('#f1efe9'), silver = MAT.steel(), propMat = MAT.plastic('#e9e6df');
const H0 = 0.017; // độ cao mạch in so với đáy chân đế động cơ
mk(new THREE.BoxGeometry(0.034, 0.034, 0.0016), pcb).position.z = H0;
for (const m of MOTORS) {
  const arm = mk(new THREE.BoxGeometry(Math.hypot(m.x, m.y) - 0.004, 0.007, 0.0016), pcb);
  arm.position.set(m.x / 2, m.y / 2, H0); arm.rotation.z = Math.atan2(m.y, m.x);
}
const motorG = MOTORS.map((m) => {
  const g = new THREE.Group(); g.position.set(m.x, m.y, 0); drone.add(g);
  const mount = mk(new THREE.CylinderGeometry(0.0048, 0.0052, 0.016, 20), white, g); mount.rotation.x = Math.PI / 2; mount.position.z = 0.008;
  const can = mk(new THREE.CylinderGeometry(0.0035, 0.0035, 0.009, 20), silver, g); can.rotation.x = Math.PI / 2; can.position.z = 0.0205;
  const prop = new THREE.Group(); prop.position.z = 0.026; g.add(prop);
  for (const s of [0, Math.PI]) { const b = mk(new THREE.BoxGeometry(0.0225, 0.0052, 0.0007), propMat, prop); b.position.x = 0.0115 * Math.cos(s); b.position.y = 0.0115 * Math.sin(s); b.rotation.z = s; b.rotation.x = 0.18; }
  const hub = mk(new THREE.CylinderGeometry(0.0022, 0.0022, 0.003, 12), white, prop); hub.rotation.x = Math.PI / 2;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.0235, 40), new THREE.MeshBasicMaterial({color: '#f4efe6', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide})); disc.position.z = 0.0265; g.add(disc);
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 10), new THREE.MeshBasicMaterial({color: '#e3562a'})); arrow.rotation.x = Math.PI / 2; g.add(arrow);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.009, 14), new THREE.MeshBasicMaterial({color: '#e3562a'})); tip.rotation.x = Math.PI / 2; g.add(tip);
  return {g, prop, disc, arrow, tip, ang: 0};
});
mk(new THREE.BoxGeometry(0.03, 0.02, 0.0072), MAT.plastic('#9aa3ab')).position.z = H0 - 0.0045; // pin 250 mAh dưới mạch
mk(new THREE.BoxGeometry(0.009, 0.009, 0.0012), MAT.plastic('#0d0e10')).position.set(0.004, 0, H0 + 0.0014); // vi điều khiển
const deck = mk(new THREE.BoxGeometry(0.014, 0.004, 0.0016), MAT.accent()); deck.position.set(-0.011, 0, H0 + 0.0012);
const axes = new THREE.Group(); drone.add(axes); axes.position.z = H0;
[['#e3562a', [1, 0, 0]], ['#2fa36b', [0, 1, 0]], ['#3c79a8', [0, 0, 1]]].forEach(([c, d]) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.07, 8), new THREE.MeshBasicMaterial({color: c}));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d)); m.position.set(d[0] * 0.035, d[1] * 0.035, d[2] * 0.035); axes.add(m);
});
// bệ cất cánh, điểm đặt, vết bay
const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.003), MAT.plastic('#e8dcc8')); pad.position.z = -0.0015; pad.receiveShadow = true; world.add(pad);
const padMark = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.054, 48), new THREE.MeshBasicMaterial({color: '#cbb894'})); padMark.position.z = 0.0002; world.add(padMark);
const spMark = new THREE.Group(); world.add(spMark);
const spMat = new THREE.MeshBasicMaterial({color: '#2a2521', transparent: true, opacity: 0.55});
spMark.add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0012, 8, 48), spMat));
for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.0015, 0.0015), spMat); b.rotation.z = r; spMark.add(b); }
const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 8, 6), new THREE.MeshBasicMaterial({color: '#e3562a'}), 600); trail.count = 0; trail.frustumCulled = false; world.add(trail);
let trailI = 0, lastT = null;
const M4 = new THREE.Matrix4();

// ---------------- bảng điều khiển
ui.header({code: 'CF2.1', kicker: 'MÁY BAY BỐN CÁNH · NANO QUADROTOR DÙNG TRONG NGHIÊN CỨU', title: 'Drone bốn cánh', sub: 'ĐỘNG LỰC HỌC 6 BẬC · PID XẾP TẦNG · BỘ TRỘN · NHẬN DẠNG HỆ THỐNG', hub: HUB_URL,
  right: [['29 g', 'KHỐI LƯỢNG CẤT CÁNH'], ['92 mm', 'ĐỘNG CƠ – ĐỘNG CƠ'], ['500 Hz', 'VÒNG GÓC']]});
ui.panel(28, 112, 300, 204, 'ĐỘNG CƠ · PWM → LỰC ĐẨY', '01');
const mb = MOTORS.map((m, i) => ui.bar(42, 148 + i * 22, 272, `M${i + 1}`, {lw: 26, vw: 116}));
const thrTxt = ui.text(42, 244, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.5');
ui.text(42, 268, 'f(c) = 2,13·10⁻¹¹c² + 1,03·10⁻⁶c + 5,48·10⁻⁴ N', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9px');
ui.panel(28, 328, 300, 252, 'PID XẾP TẦNG · FIRMWARE', '02');
const casc = ui.svg(42, 362, 272, 206);
ui.panel(28, 592, 300, 174, 'HỆ SỐ VÀ NHIỄU', '03');
const sKa = ui.slider('katt', 42, 628, 272, 'GAIN GÓC ×', {lw: 92, vw: 54});
const sKr = ui.slider('krate', 42, 656, 272, 'GAIN TỐC ĐỘ ×', {lw: 92, vw: 54});
const sWind = ui.slider('wind', 42, 684, 272, 'GIÓ NGANG', {lw: 92, vw: 54});
ui.text(42, 708, `m = 28,0 g · Ixx = 1,66·10⁻⁵ · Izz = 2,93·10⁻⁵ kg·m²`, 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9px');
ui.text(42, 724, `τ động cơ ≈ 65 ms · con quay: nhiễu 0,4 °/s, trễ 2 ms`, 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9px');
ui.text(42, 740, `Tay đòn 46 mm · cấu hình X · bộ trộn legacy`, 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9px');
ui.panel(1272, 112, 300, 222, 'GÓC LĂN · ĐÁP ỨNG', '04');
ui.text(1286, 146, 'GÓC LĂN φ (°) · ĐỨT: ĐẶT · CAM: ĐO');
const cRoll = ui.chart(1286, 162, 272, 62, {min: -30, max: 30, colors: [C.ink, C.or], dash: ['3 3', 0]});
ui.text(1286, 234, 'TỐC ĐỘ GÓC p (°/s) · ĐỨT: ĐẶT · CAM: ĐO');
const cRate = ui.chart(1286, 250, 272, 62, {min: -300, max: 300, colors: [C.ink, C.or], dash: ['3 3', 0]});
ui.panel(1272, 346, 300, 160, 'TRẠNG THÁI', '05');
const xyz = ['X', 'Y', 'Z'].map((n, i) => { ui.text(1286 + i * 94, 380, n + ' (m)'); return ui.text(1286 + i * 94, 393, '', 'mo', 'position:absolute;font-size:19px;font-weight:700'); });
const rpy = ui.text(1286, 424, '', 'v', 'font-size:10.5px;font-weight:500');
const cAlt = ui.chart(1286, 446, 272, 46, {min: 0, max: 1, colors: [C.or, C.ink], dash: [0, '3 3']});
ui.panel(1272, 518, 300, 140, 'LỆNH', '06');
ui.buttons([['takeoff', 'CẤT CÁNH'], ['land', 'HẠ CÁNH'], ['roll', 'LĂN 10°'], ['fwd', 'TIẾN 0,5 m'], ['yaw', 'XOAY 90°'], ['gust', 'CÚ ĐẨY'], ['reset', 'ĐẶT LẠI']], 1286, 552, 272);
ui.panel(1272, 670, 300, 96, 'HIỂN THỊ', '07');
ui.buttons([['thrust', 'LỰC ĐẨY'], ['axes', 'TRỤC THÂN'], ['trail', 'VẾT BAY'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 702, 272);
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_top', 'TRÊN'], ['v_close', 'SÁT']], 360, 120, 600);
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'm1', title: 'M1', sub: 'TRƯỚC PHẢI'}, {key: 'm2', title: 'M2', sub: 'SAU PHẢI'}, {key: 'm3', title: 'M3', sub: 'SAU TRÁI'}, {key: 'm4', title: 'M4', sub: 'TRƯỚC TRÁI'},
  {key: 'mcu', title: 'STM32F405 · BMI088', sub: 'ĐIỀU KHIỂN 1 kHz · IMU'}, {key: 'bat', title: 'PIN 250 mAh', sub: '3,7 V · 7,1 g'}, {key: 'prop', title: 'CÁNH 47 mm', sub: 'ĐỘNG CƠ 7×16 · 14 000 KV'},
]);

// ---------------- mô phỏng và lệnh
const disp = {thrust: true, axes: false, trail: true, labels: true, xray: false};
const H = {roll: [], rollSp: [], rate: [], rateSp: [], z: [], zSp: []};
let attTimer = 0, crashed = false, info = '';
const sim = {
  reset() { Q.reset(); S.kAtt = 1; S.kRate = 1; S.wind = [0, 0, 0]; crashed = false; attTimer = 0; Object.assign(disp, {thrust: true, axes: false, trail: true, labels: true, xray: false}); trail.count = 0; trailI = 0; lastT = null; for (const k in H) H[k] = []; },
  act(k) {
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'reset') { const ka = S.kAtt, kr = S.kRate; Q.reset(); S.kAtt = ka; S.kRate = kr; crashed = false; trail.count = 0; trailI = 0; return; }
    if (crashed) return;
    if (k === 'takeoff') { S.mode = 'pos'; S.sp.x = S.p[0]; S.sp.y = S.p[1]; S.sp.z = 0.5; S.sp.yaw = Q.euler().yaw; }
    if (k === 'land') { if (S.mode !== 'off') { S.mode = 'land'; S.sp.z = 0; } }
    if (S.mode === 'off' || S.mode === 'land') return;
    if (k === 'roll') { S.mode = 'att'; S.sp.roll = 10; S.sp.pitch = 0; attTimer = 0.9; }
    if (k === 'fwd') { S.mode = 'pos'; S.sp.x = Math.abs(S.sp.x) < 0.25 ? 0.5 : 0; }
    if (k === 'yaw') S.sp.yaw = ((S.sp.yaw + 90 + 180) % 360) - 180;
    if (k === 'gust') { S.kick = [0.0025, -0.0012, 0]; S.kickT = 0.04; }
  },
  slide(k, t) { if (k === 'katt') S.kAtt = 0.25 + t * 7.75; if (k === 'krate') S.kRate = 0.25 + t * 3.75; if (k === 'wind') S.wind = [0, t * 1.5, 0]; },
  step(dt) {
    Q.step(dt);
    if (attTimer > 0) { attTimer -= dt; if (attTimer <= 0.45) S.sp.roll = 0; if (attTimer <= 0) { S.mode = 'pos'; S.sp.x = S.p[0]; S.sp.y = S.p[1]; } }
    const e = Q.euler();
    if (!crashed && S.mode !== 'off' && (Math.abs(e.roll) > 75 || Math.abs(e.pitch) > 75)) { crashed = true; S.mode = 'off'; }
  },
  shadowAt() { return new THREE.Vector3(S.p[0], 0.05, -S.p[1]); },
  draw() {
    const e = Q.euler(), R = S.R;
    drone.position.set(S.p[0], S.p[1], S.p[2]);
    drone.quaternion.setFromRotationMatrix(M4.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1));
    const ftot = S.f.reduce((a, b) => a + b, 0), W = P.m * P.g;
    motorG.forEach((m, i) => {
      const w = S.pwm[i] > 0 ? P.omega(S.pwm[i]) : 0; m.ang += Math.min(w, 60) * 0.016 * (MOTORS[i].s > 0 ? 1 : -1); m.prop.rotation.z = m.ang;
      m.disc.material.opacity = Math.min(0.32, S.f[i] * 2.4);
      const L = (S.f[i] / 0.15) * 0.07; m.arrow.visible = m.tip.visible = disp.thrust && L > 0.002;
      m.arrow.scale.set(1, L, 1); m.arrow.position.z = 0.028 + L / 2; m.tip.position.z = 0.028 + L + 0.0045;
    });
    axes.visible = disp.axes;
    if (disp.trail && S.mode !== 'off' && (!lastT || Math.hypot(S.p[0] - lastT[0], S.p[1] - lastT[1], S.p[2] - lastT[2]) > 0.012)) { trail.setMatrixAt(trailI % 600, M4.makeTranslation(S.p[0], S.p[1], S.p[2] + H0)); trailI++; trail.count = Math.min(600, trailI); trail.instanceMatrix.needsUpdate = true; lastT = S.p.slice(); }
    trail.visible = disp.trail;
    spMark.position.set(S.sp.x, S.sp.y, Math.max(0.001, S.sp.z + H0)); spMark.visible = S.mode === 'pos';
    xrayD(disp.xray ? 1 : 0);
    // bảng 01
    S.pwm.forEach((c, i) => mb[i].set(c / 65535, `${Math.round(c).toLocaleString('en').replace(/,/g, ' ')} · ${fx((S.f[i] / P.g) * 1000, 1)} g`));
    thrTxt.innerHTML = `Tổng lực đẩy <b>${fx((ftot / P.g) * 1000, 1)} g</b> · trọng lượng ${fx(P.m * 1000, 1)} g · T/W = ${fx(ftot / W, 2)}`;
    // bảng 02: sơ đồ xếp tầng, vòng đang chạy tô cam
    const on = (m) => (m ? C.or : C.faint), modePos = S.mode === 'pos' || S.mode === 'land';
    const box = (x, y, w, t1, t2, act) => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="3" fill="${act ? '#fff4ee' : '#fbf6ee'}" stroke="${on(act)}"/><text x="${x + 6}" y="${y + 14}" font-family="JetBrains Mono" font-size="9" font-weight="700" fill="${C.ink}">${t1}</text><text x="${x + 6}" y="${y + 27}" font-family="JetBrains Mono" font-size="8" fill="${C.mute}">${t2}</text>`;
    const g = (k, a) => GAINS[a][k].slice(0, 3).map((v) => fx(v * (a === 'att' ? S.kAtt : a === 'rate' ? S.kRate : 1), v < 10 ? 2 : 0)).join(' / ');
    let svg = '';
    svg += box(0, 0, 130, 'VỊ TRÍ · 100 Hz', `kp ${GAINS.pos.x[0]} · z: ${GAINS.pos.z[0]}/${GAINS.pos.z[1]}`, modePos);
    svg += box(142, 0, 130, 'VẬN TỐC · 100 Hz', `kp ${GAINS.vel.x[0]} · trần ±20°`, modePos);
    svg += box(0, 52, 130, 'GÓC · 500 Hz', `φθ ${g('roll', 'att')}`, S.mode !== 'off');
    svg += box(142, 52, 130, 'TỐC ĐỘ GÓC · 500 Hz', `pq ${g('roll', 'rate')}`, S.mode !== 'off');
    svg += box(0, 104, 130, 'BỘ TRỘN', 'm = T ∓ r/2 ± p/2 ± y', S.mode !== 'off');
    svg += box(142, 104, 130, '4 ĐỘNG CƠ · PWM', 'f = f(c) · trễ 65 ms', S.mode !== 'off');
    const arr = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${C.ink}" stroke-width="1" marker-end="url(#ah)"/>`;
    svg = `<defs><marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${C.ink}"/></marker></defs>` + svg + arr(130, 17, 141, 17) + arr(207, 34, 70, 51) + arr(130, 69, 141, 69) + arr(207, 86, 70, 103) + arr(130, 121, 141, 121);
    svg += `<text x="0" y="160" font-family="JetBrains Mono" font-size="8.6" fill="${C.ink}">Ra từng tầng: v đặt (m/s) → góc đặt (°)</text><text x="0" y="174" font-family="JetBrains Mono" font-size="8.6" fill="${C.ink}">→ tốc độ góc đặt (°/s) → lệnh int16 → PWM.</text>`;
    svg += `<text x="0" y="192" font-family="JetBrains Mono" font-size="8.6" fill="${C.or}">Lăn, tốc độ góc: P ${fx(S.pid.rr.p, 0)} · I ${fx(S.pid.rr.ii || 0, 0)} · D ${fx(S.pid.rr.dd, 0)}</text>`;
    casc.innerHTML = svg;
    sKa.set((S.kAtt - 0.25) / 7.75, `× ${fx(S.kAtt, 2)}`); sKr.set((S.kRate - 0.25) / 3.75, `× ${fx(S.kRate, 2)}`); sWind.set(S.wind[1] / 1.5, `${fx(S.wind[1], 2)} m/s`);
    // bảng 04, 05
    const push = (a, v, n = 300) => { a.push(v); if (a.length > n) a.shift(); };
    push(H.roll, e.roll); push(H.rollSp, S.att.roll); push(H.rate, S.gyro.roll); push(H.rateSp, S.rateSp.roll); push(H.z, S.p[2]); push(H.zSp, S.mode === 'pos' ? S.sp.z : S.p[2]);
    cRoll.set([H.rollSp, H.roll]); cRate.set([H.rateSp, H.rate]); cAlt.set([H.z, H.zSp]);
    xyz[0].textContent = fx(S.p[0], 3); xyz[1].textContent = fx(S.p[1], 3); xyz[2].textContent = fx(S.p[2], 3);
    rpy.textContent = `LĂN ${fx(e.roll, 1)}°  CHÚC ${fx(e.pitch, 1)}°  HƯỚNG ${fx(e.yaw, 1)}°  vz ${fx(S.v[2], 2)} m/s`;
    alert.set(crashed ? 'MẤT THĂNG BẰNG · ĐÃ TẮT ĐỘNG CƠ · BẤM ĐẶT LẠI' : S.kAtt / S.kRate > 5 && S.mode !== 'off' ? 'VÒNG NGOÀI NHANH HƠN VÒNG TRONG · DAO ĐỘNG' : S.mode === 'att' ? 'CHẾ ĐỘ GÓC · BƯỚC 10°' : '');
    for (const k of Object.keys(disp)) ui.setOn(k, disp[k]);
    ui.setOn('takeoff', S.mode === 'pos'); ui.setOn('land', S.mode === 'land');
    // nhãn
    const Wp = (x, y, z) => { const wx = S.p[0] + R[0] * x + R[1] * y + R[2] * z, wy = S.p[1] + R[3] * x + R[4] * y + R[5] * z, wz = S.p[2] + R[6] * x + R[7] * y + R[8] * z; return st.project(wx, wz, -wy); };
    const kk = disp.labels ? 1 : 0;
    ui.drawCallouts([
      ...MOTORS.map((m, i) => ({key: 'm' + (i + 1), p: Wp(m.x, m.y, 0.018), dx: m.y < 0 ? 70 : -70, dy: m.x > 0 ? -50 : 40})),
      {key: 'mcu', p: Wp(0.004, 0, H0 + 0.002), dx: -120, dy: -90}, {key: 'bat', p: Wp(-0.01, 0.005, H0 - 0.008), dx: -110, dy: 70}, {key: 'prop', p: Wp(MOTORS[0].x + 0.02, MOTORS[0].y, 0.026), dx: 90, dy: -40},
    ], kk * (views.cur === 'close' || views.cur === 'hero' ? 1 : 0.0));
    info = '';
  },
};
const xrayD = (() => { let cur = -1; return (k) => { if (Math.abs(k - cur) < 1e-3) return; cur = k; drone.traverse((m) => { if (!m.isMesh || m.material.isMeshBasicMaterial) return; m.material.transparent = k > 0; m.material.opacity = 1 - 0.7 * k; m.material.depthWrite = k < 0.5; }); }; })();

// ---------------- góc nhìn (bám theo drone)
const T = () => ({tx: S.p[0], ty: S.p[2] + 0.02, tz: -S.p[1]});
const views = {
  cur: 'hero',
  hero: (t) => (views.cur = 'hero', {...T(), az: 35 + 8 * Math.sin(t * 0.14), el: 22, d: 0.62, sx: 0, sy: -40}),
  side: () => (views.cur = 'side', {...T(), ty: Math.max(0.15, S.p[2] * 0.6), tx: S.p[0] * 0.6, az: 0, el: 6, d: 1.6, sx: 0, sy: -40}),
  top: () => (views.cur = 'top', {...T(), az: 0, el: 85, d: 0.8, sx: 0, sy: -30}),
  close: () => (views.cur = 'close', {...T(), az: 55, el: 30, d: 0.36, sx: 0, sy: -40}),
};
const vfn = {hero: views.hero, side: views.side, top: views.top, close: views.close};

// ---------------- bài giảng
const CAP = [
  {k: 'CRAZYFLIE 2.1 · 29 g', t: 'Một chiếc máy bay vừa lòng bàn tay', b: 'Bốn động cơ chổi than 7×16 mm (14 000 KV), cánh 47 mm, vi điều khiển STM32F405, cảm biến quán tính BMI088. Mô hình vật lý dùng số nhận dạng của Förster (ETH Zürich, 2015): khối lượng 28 g, mô men quán tính, đường cong lực đẩy theo PWM. Bộ điều khiển là PID mặc định của firmware mã nguồn mở.', e: 'm·v̇ = R·[0, 0, Σfᵢ]ᵀ + F_cản − m·g · J·ω̇ = τ − ω × Jω'},
  {k: 'LỰC ĐẨY', t: 'Từ lệnh PWM ra Newton', b: 'Mỗi động cơ nhận lệnh 16 bit. Förster đo trên cân lực và khớp được một đa thức bậc hai. Muốn lơ lửng, mỗi cánh phải đẩy khoảng 6,9 g, tức chừng 37 000 / 65 535. Lực đẩy không đổi tức thì: động cơ có hằng số thời gian khoảng 65 ms.', e: 'f(c) = 2,13·10⁻¹¹c² + 1,03·10⁻⁶c + 5,48·10⁻⁴ N'},
  {k: 'BỘ TRỘN', t: 'Bốn động cơ, ba mô men và một lực', b: 'Lăn: tăng hai động cơ trái, giảm hai động cơ phải. Chúc: trước so với sau. Hướng: hai cặp chéo quay ngược chiều nhau; tăng một cặp thì mô men phản lực làm thân xoay quanh trục đứng. Xoay 90° chỉ bằng chênh lệch tốc độ.', e: 'm₁ = T − r + p + y · m₂ = T − r − p − y · m₃ = T + r − p + y · m₄ = T + r + p − y'},
  {k: 'XẾP TẦNG', t: 'Bốn vòng PID lồng nhau', b: 'Muốn tiến 0,5 m: vòng vị trí ra vận tốc đặt, vòng vận tốc ra góc chúc đặt (tối đa 20°), vòng góc ra tốc độ góc đặt, vòng tốc độ góc ra lệnh cho bộ trộn. Vòng trong chạy 500 Hz, vòng ngoài 100 Hz. Drone nghiêng mũi xuống để lấy thành phần lực đẩy theo phương ngang.', e: 'x → v (kp 2) → θ (kp 25) → q (kp 6, ki 3) → lệnh (kp 250, ki 500, kd 2,5)'},
  {k: 'ĐÁP ỨNG BƯỚC', t: 'Đặt góc lăn 10°', b: 'Ở chế độ góc, ra lệnh lăn 10° trong 0,45 s rồi về 0. Biểu đồ 04: nét đứt là góc đặt, đường cam là góc đo. Bên dưới là tốc độ góc đặt và tốc độ góc con quay đo được, có nhiễu thật của cảm biến.', e: 'p_đặt = kp·eφ + ki·∫eφ · lệnh = kp·eₚ + ki·∫eₚ + kd·ėₚ'},
  {k: 'NHIỄU LOẠN', t: 'Một cú đẩy bất ngờ', b: 'Một mô men 2,5 mN·m tác động trong 40 ms làm drone nghiêng. Vòng tốc độ góc phản ứng trước, vòng góc kéo về, vòng vị trí đưa drone về đúng chỗ. Gió ngang tạo lực cản theo mô hình khí động của Förster: drone phải nghiêng để đứng yên.', e: 'F_cản = K_aero · Σωᵢ · v_tương đối'},
  {k: 'CHỈNH HỆ SỐ', t: 'Vòng ngoài quá mạnh thì lật', b: 'Tăng gain vòng góc lên 6,6 lần, giữ nguyên vòng tốc độ góc, rồi lặp lại đúng cú đẩy lúc nãy: vòng ngoài đòi tốc độ góc lớn hơn khả năng của vòng trong, cộng trễ cảm biến 2 ms, trễ động cơ 65 ms và PWM chạm trần, drone lật. Trả hệ số về mặc định của firmware, cất cánh lại: cùng cú đẩy, drone đứng vững.', e: 'băng thông vòng trong ≫ băng thông vòng ngoài · firmware: góc kp 6, tốc độ góc kp 250'},
  {k: 'HẠ CÁNH', t: 'Về bệ', b: 'Đặt độ cao về 0; vòng độ cao giảm lực đẩy từ từ, chạm bệ thì tắt động cơ. Toàn bộ hành vi trên trang chỉ đến từ mô hình vật lý và các hệ số của firmware: không có chuyển động nào được vẽ tay.', e: 'z_đặt = 0 → vz < 0 → T giảm → tắt khi z < 3 cm'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(3.5, {click: 'v_close'}); at(8, {click: 'v_hero'});
at(9, {cap: 1}); at(10, {click: 'takeoff'});
at(17, {cap: 2}); at(18, {click: 'yaw'}); at(22, {click: 'yaw'});
at(25, {cap: 3}); at(26, {click: 'v_side'}); at(27, {click: 'fwd'}); at(31.5, {click: 'fwd'}); at(35, {click: 'v_hero'});
at(36, {cap: 4}); at(37, {click: 'roll'}); at(40, {click: 'roll'});
at(43, {cap: 5}); at(44, {click: 'gust'}); at(46.5, {slide: 'wind', to: 0.66, dur: 1.5}); at(50, {slide: 'wind', to: 0, dur: 1});
at(52, {cap: 6}); at(53, {slide: 'katt', to: (6.6 - 0.25) / 7.75, dur: 1.6}); at(55.5, {click: 'gust'}); at(58.5, {click: 'reset'}); at(59.5, {slide: 'katt', to: 0.75 / 7.75, dur: 1}); at(61, {click: 'takeoff'}); at(64.8, {click: 'gust'});
at(67, {cap: 7}); at(68, {click: 'land'});
ev.sort((a, b) => a.at - b.at);

runLive({stage: st, ui, sim, views: vfn, captions: CAP, script: {events: ev, duration: 76}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_close', t: 'takeoff', l: 'land', r: 'roll', f: 'fwd', y: 'yaw', g: 'gust', n: 'labels', x: 'xray', a: 'axes'}});
void info;
