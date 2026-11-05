// Chó robot bốn chân (số đo MIT Mini Cheetah): trang chạy trực tiếp. Động học, lực đỡ, mô men khớp, bật nhảy đọc từ kin.js;
// các cụm lắp ráp, tách rời đọc từ cum.js. Bố cục thông tin (dải nhịp, sáu hệ thống, chế độ vận hành, lực đỡ, 12 khớp, nhật ký)
// phỏng theo các video teardown robot của 0xWast3 trên X; giao diện là bộ robotics của Sáng Ăn Khoai.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, follow, vn} from '../kit/soi.js';
import {createAssembly} from '../kit/lap.js';
import {hull, margin} from '../hexapod/gait.js';
import {MC, TAU, JN, JK, LEGS, GAITS, legIK, legPts, jointTau, motorOf, footAt, grf, leapPlan} from './kin.js';
import {UNITS, ORDER} from './cum.js';

const D = 180 / Math.PI, G = MC.g, RF = 0.019; // bán kính bàn chân cao su
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 1.1, grid: 0.05, fade: 4.2, fov: 26});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; st.scene.add(world);
const body = new THREE.Group(); world.add(body);
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const UG = {};
for (const u of UNITS) { const g = new THREE.Group(); g.userData.lap = u.id; body.add(g); UG[u.id] = g; }

// ---------------- hình khối: vỏ kem bóng, khung nhôm anod, động cơ xám đậm có nắp cam, cao su bàn chân
const shellMat = MAT.shell('#efeadf'), darkMat = MAT.satin('#2a2c30'), aluMat = MAT.anod('#b9bec4'), capMat = MAT.accent();
// khung thân và bụng
mk(SH.rbox(0.36, 0.128, 0.05, 0.014), MAT.anod('#5b6068'), UG.khung).position.z = -0.022;
for (const s of [-1, 1]) mk(SH.rbox(0.4, 0.012, 0.018, 0.004), aluMat, UG.khung).position.set(0, s * 0.058, -0.004);
// vỏ trên: khối bo tròn, rãnh giữa, đèn trạng thái ở đuôi
mk(SH.rbox(0.43, 0.148, 0.056, 0.024), shellMat, UG.vo).position.z = 0.03;
mk(SH.rbox(0.3, 0.012, 0.004, 0.002), MAT.satin('#d8d2c4'), UG.vo).position.set(-0.01, 0, 0.0585);
const leds = [0, 1, 2].map((k) => { const m = mk(SH.rbox(0.012, 0.006, 0.003, 0.001), new THREE.MeshStandardMaterial({color: '#1f7a4d', emissive: '#2fbf71', emissiveIntensity: 0.8}), UG.vo); m.position.set(-0.17, -0.016 + k * 0.016, 0.0585); return m; });
// pin 24 V trong khoang thân
mk(SH.rbox(0.22, 0.07, 0.036, 0.007), MAT.satin('#34373c'), UG.pin).position.z = -0.012;
mk(SH.rbox(0.07, 0.0712, 0.0372, 0.003), MAT.accent(), UG.pin).position.set(0.05, 0, -0.012);
// máy tính, mạch điều khiển, cảm biến quán tính
mk(SH.rbox(0.13, 0.08, 0.0018, 0.0006), MAT.pcb('#1f5a3c'), UG.maytinh).position.z = 0.02;
mk(SH.rbox(0.03, 0.03, 0.004, 0.001), MAT.chip(), UG.maytinh).position.set(0.02, 0.01, 0.023);
mk(SH.rbox(0.05, 0.035, 0.012, 0.002), aluMat, UG.maytinh).position.set(-0.03, -0.01, 0.027);
mk(SH.rbox(0.012, 0.012, 0.003, 0.0008), MAT.chip(), UG.maytinh).position.set(0.045, -0.025, 0.0225);
// đầu cảm biến: kính khói và hai cặp camera
mk(SH.rbox(0.03, 0.116, 0.046, 0.012), MAT.glass('#15191d'), UG.dau).position.set(0.222, 0, 0.028);
mk(SH.rbox(0.022, 0.13, 0.054, 0.01), shellMat, UG.dau).position.set(0.206, 0, 0.028);
for (const [y, z] of [[-0.036, 0.034], [-0.018, 0.034], [0.018, 0.034], [0.036, 0.034]]) { const g = SH.alongX(SH.roundCyl(0.0062, 0, 0.004, 0.001)); const m = mk(g, MAT.chip(), UG.dau); m.position.set(0.236, y, z); }
// bốn động cơ khép/mở ở bốn góc thân, trục dọc thân
const abadGeo = SH.alongX(SH.roundCyl(0.04, 0, 0.056, 0.006));
LEGS.forEach((L, i) => { // hình trụ chạy theo +x từ vị trí đặt: trước thì lùi vào trong thân, sau thì bắt đầu ngay ở khớp
  const m = mk(abadGeo, darkMat, UG.abad); m.position.set(L.sx > 0 ? L.A[0] - 0.056 : L.A[0], L.A[1], 0);
  const c = mk(SH.alongX(SH.roundCyl(0.026, 0, 0.006, 0.002)), capMat, UG.abad); c.position.set(L.sx > 0 ? L.A[0] : L.A[0] - 0.006, L.A[1], 0); tag(`${i}:abad`, m, c);
});
// chân: giá nối, mô-đun hông (động cơ hông và gối đồng trục), đùi, chốt gối, ống chân, bàn chân
const hipGeo = SH.roundCyl(0.046, -0.036, 0.036, 0.007), hipCap = SH.roundCyl(0.03, 0.036, 0.041, 0.002);
const thighGeo = SH.rbox(0.028, MC.l1, 0.05, 0.012), shankGeo = SH.rbox(0.016, MC.l2, 0.024, 0.007), brGeo = SH.rbox(0.03, MC.lab, 0.05, 0.008);
const kneeGeo = SH.roundCyl(0.018, -0.017, 0.017, 0.004), footGeo = new THREE.SphereGeometry(RF, 24, 16);
const LM = LEGS.map((L, i) => {
  const g = UG['chan' + L.name];
  const m = {br: mk(brGeo, aluMat, g), hip: mk(hipGeo, darkMat, g), cap: mk(hipCap, capMat, g), thigh: mk(thighGeo, aluMat, g), knee: mk(kneeGeo, darkMat, g), shank: mk(shankGeo, MAT.satin('#3a3d42'), g), foot: mk(footGeo, MAT.rubber(), g)};
  m.thigh.userData.L0 = MC.l1; m.shank.userData.L0 = MC.l2; m.br.userData.L0 = MC.lab;
  tag(`${i}:hip`, m.br, m.hip, m.cap, m.thigh); tag(`${i}:knee`, m.knee, m.shank, m.foot);
  return m;
});
tag('vo', UG.vo); tag('khung', UG.khung); tag('pin', UG.pin); tag('maytinh', UG.maytinh); tag('dau', UG.dau);
for (const g of Object.values(UG)) g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); // vật liệu riêng từng cụm: nhấp nháy, X-quang, cô lập không lan sang cụm khác
const v3 = (p) => new THREE.Vector3(p[0], p[1], p[2]), M4 = new THREE.Matrix4(), X1 = new THREE.Vector3(1, 0, 0);
const orient = (m, a, b, side) => { const A = v3(a), B = v3(b), Y = B.clone().sub(A), L = Y.length(); Y.normalize(); const X = side.clone().sub(Y.clone().multiplyScalar(side.dot(Y))).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromRotationMatrix(M4.makeBasis(X, Y, Z)); m.scale.set(1, L / (m.userData.L0 || L), 1); };
const axisZ = (m, p, n) => { const Y = new THREE.Vector3().crossVectors(n, X1); m.position.copy(v3(p)); m.quaternion.setFromRotationMatrix(M4.makeBasis(X1, Y, n)); };
// giá đỡ thân lúc lắp ráp
const standG = new THREE.Group(); world.add(standG); standG.visible = false;
mk(SH.roundCyl(0.03, 0, 1, 0.004), aluMat, standG); mk(SH.roundCyl(0.11, 0, 0.012, 0.004), MAT.anod('#7d838b'), standG);
// sàn: đa giác chống đỡ, hình chiếu trọng tâm, đoạn biên ổn định, mũi tên lực đỡ
const polyMat = new THREE.MeshBasicMaterial({color: C.or, transparent: true, opacity: 0.16, depthWrite: false});
const poly = new THREE.Mesh(new THREE.BufferGeometry(), polyMat); poly.position.z = 0.0015; world.add(poly);
const polyLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: C.or})); polyLine.position.z = 0.002; world.add(polyLine);
const mLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: C.ink})); mLine.position.z = 0.0025; world.add(mLine);
const com = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.016, 28), new THREE.MeshBasicMaterial({color: C.ink})); com.position.z = 0.003; world.add(com);
const arrowMat = new THREE.MeshBasicMaterial({color: C.or});
const shaftGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 1, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5), headGeo = new THREE.ConeGeometry(0.012, 0.03, 14).rotateX(Math.PI / 2).translate(0, 0, 0.015);
const arrows = LEGS.map(() => { const g = new THREE.Group(), s = new THREE.Mesh(shaftGeo, arrowMat), h = new THREE.Mesh(headGeo, arrowMat); g.add(s, h); world.add(g); return {g, s, h}; });
const AN = 0.0018; // độ dài mũi tên: 1,8 mm mỗi newton

// ---------------- trạng thái
const S = {gait: 'stand', phase: 0, v: 0.5, T: 0.4, h: 0.25, H: 0.25, load: 0, lift: 0.07, run: true, base: [0, 0], sway: [0, 0], pitch: 0, z: 0.25, az: 0,
  leap: null, asm: false, ex: 0, exT: 0, iso: null, t: 0, beat: 0, log: [], hist: [], out: null, disp: {poly: true, force: true, labels: true, xray: false}};
const M = () => MC.m + S.load;
const neutral = (L, h) => [L.A[0], L.A[1] + L.sy * MC.lab, RF - h];
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };

// ---------------- bảng
ui.header({code: 'QUADRUPED', kicker: 'ROBOT BỐN CHÂN · 12 ĐỘNG CƠ KHỚP · SỐ ĐO MIT Mini Cheetah', title: 'Chó robot bốn chân', sub: 'DÁNG ĐI · LỰC ĐỠ · MÔ MEN KHỚP · BẬT NHẢY', hub: HUB_URL,
  right: [['9 kg', 'KHỐI LƯỢNG'], ['12', 'ĐỘNG CƠ KHỚP'], ['1 : 6', 'HỘP SỐ HÀNH TINH'], ['2,45 m/s', 'TỐC ĐỘ ĐÃ ĐẠT']]});
// dải nhịp bài giảng
const BEATS = ['Động cơ', 'Đứng', 'Hộp số', 'Đi bước', 'Đi kiệu', 'Một chân', 'Tách rời', 'Bật nhảy', 'Lắp ráp'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 256, 'DÁNG ĐI · BỐN CHÂN', '01');
ui.buttons([['stand', 'ĐỨNG'], ['walk', 'ĐI BƯỚC'], ['trot', 'ĐI KIỆU'], ['leap', 'BẬT NHẢY'], ['stop', 'DỪNG']], 42, 146, 272);
const gaitSvg = ui.svg(42, 212, 272, 72);
const gRows = [0, 1, 2, 3].map((k) => [ui.text(42, 292 + k * 17, ['TẦN SỐ BƯỚC', 'VẬN TỐC', 'CHÂN CHẠM ĐẤT', 'HỆ SỐ CHỐNG β'][k]), ui.text(200, 290 + k * 17, '', 'v', 'width:114px;text-align:right')]);
ui.panel(28, 380, 300, 178, 'ĐIỀU KHIỂN', '02');
const SL = [['v', 'VẬN TỐC'], ['T', 'CHU KỲ BƯỚC'], ['h', 'CAO THÂN'], ['H', 'ĐỘ CAO NHẢY'], ['load', 'TẢI THÊM']];
const sl = Object.fromEntries(SL.map(([k, n], i) => [k, ui.slider(k, 42, 416 + i * 27, 272, n, {lw: 92, vw: 70})]));
ui.panel(28, 570, 300, 196, '12 ĐỘNG CƠ KHỚP · MÔ MEN', '03');
ui.text(42, 604, 'CHÂN'); JK.forEach((j, k) => ui.text(96 + k * 76, 604, j));
const dialSvg = ui.svg(42, 620, 272, 106);
const tqTxt = ui.text(42, 730, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 256, 'LỰC ĐỠ · CÂN BẰNG', '04');
ui.text(1286, 148, 'TỔNG LỰC ĐỠ (N)'); const fTot = ui.text(1286, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
ui.text(1430, 148, 'MÔ MEN LẬT DƯ (N·m)'); const fRes = ui.text(1430, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
const fb = LEGS.map((L, i) => ui.bar(1286, 204 + i * 19, 272, L.name, {lw: 30, vw: 74}));
const fChart = ui.chart(1286, 286, 272, 50, {min: 0, max: 320, colors: [C.or, C.ink], dash: [0, '3 3']});
ui.text(1286, 342, 'CAM: CẶP TRƯỚC · NÉT ĐỨT: CẶP SAU · 6 GIÂY');
ui.panel(1272, 380, 300, 232, 'SÁU HỆ THỐNG · TỪNG BỘ PHẬN', '05');
const SYS = [['dau', 'ĐẦU CẢM BIẾN'], ['abad', 'ĐỘNG CƠ KHỚP'], ['chanFR', 'CHÂN PHẢI TRƯỚC'], ['vo', 'VỎ VÀ KHUNG'], ['pin', 'PIN 24 V'], ['maytinh', 'MÁY TÍNH']];
const sysRows = SYS.map(([id, n], i) => { ui.button('iso_' + id, 1286, 412 + i * 29, 136, n); return [ui.text(1428, 416 + i * 29, '', 'v', 'width:78px;text-align:right;font-size:11px'), ui.text(1512, 414 + i * 29, '', 'v', 'width:48px;text-align:center;font-size:10px;font-weight:600;border-radius:999px;padding:2px 0')]; });
ui.text(1286, 590, 'BẤM ĐỂ CÔ LẬP MỘT HỆ VÀ SOI CHI TIẾT');
ui.panel(1272, 624, 300, 142, 'HIỂN THỊ · NHẬT KÝ', '06');
ui.buttons([['poly', 'ĐA GIÁC'], ['force', 'LỰC ĐỠ'], ['labels', 'NHÃN'], ['xray', 'X-QUANG'], ['explode', 'TÁCH RỜI']], 1286, 654, 272);
const logRows = [0, 1, 2].map((k) => ui.text(1286, 716 + k * 13, '', 'v', 'font-size:10px;font-weight:500;width:272px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_top', 'TRÊN'], ['v_leg', 'MỘT CHÂN']], 360, 120, 600);
// chế độ vận hành: chữ lớn ở góc trái cảnh
ui.text(362, 664, 'CHẾ ĐỘ VẬN HÀNH');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { S.beat = i; setBeat(i); set(c, i, n); }; } // dải nhịp đi theo lời giảng
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'dau', title: 'ĐẦU CẢM BIẾN', sub: '2 CẶP CAMERA'}, {key: 'abad', title: 'ĐỘNG CƠ KHÉP/MỞ', sub: '1 : 6 · 18 N·m'}, {key: 'hip', title: 'ĐỘNG CƠ HÔNG + GỐI', sub: 'ĐỒNG TRỤC'},
  {key: 'thigh', title: 'ĐÙI', sub: `${MC.l1 * 1000} mm`}, {key: 'shank', title: 'ỐNG CHÂN', sub: `${MC.l2 * 1000} mm`}, {key: 'foot', title: 'BÀN CHÂN FR', sub: '—'}, {key: 'pin', title: 'PIN', sub: '24 V'},
]);
const callSub = Object.fromEntries(['dau', 'abad', 'hip', 'thigh', 'shank', 'foot', 'pin'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- lắp ráp (kit/lap.js): thân đặt trên giá, cụm chờ lắp nằm trên sàn bên trái robot
const PARK = {}, EXP = 1.8;
const parkAll = () => {
  const ids = ORDER.slice().sort((a, b) => UNITS.find((u) => u.id === a).name.localeCompare(UNITS.find((u) => u.id === b).name, 'vi'));
  const bx = new THREE.Box3(), bp = body.position;
  ids.forEach((id, i) => {
    const ug = UG[id]; ug.position.set(0, 0, 0); ug.updateWorldMatrix(true, true); bx.setFromObject(ug);
    const cx = (bx.min.x + bx.max.x) / 2 - bp.x, cy = -(bx.min.z + bx.max.z) / 2 - bp.y, zmin = bx.min.y - bp.z;
    const col = i % 5, row = Math.floor(i / 5);
    PARK[id] = [-0.4 + col * 0.2 - cx, 0.36 + row * 0.26 - cy, 0.002 - S.h - zmin];
  });
};
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lap = createAssembly({units: UNITS, order: ORDER, title: 'Lắp ráp chó robot', kicker: 'Thứ tự · lối vào · va vướng', exit: () => sim.act('asm'),
  io: {
    pose(id, k, from) {
      const ug = UG[id]; if (!ug) return;
      if (k >= 0.999 || !PARK[id] || !S.asm) { const e = S.asm ? 0 : S.ex * EXP; ug.position.set(from[0] * e, from[1] * e, from[2] * e); return; }
      const o = k < 0.55 ? lerp3(PARK[id], from, k / 0.55) : lerp3(from, [0, 0, 0], (k - 0.55) / 0.45);
      ug.position.set(o[0], o[1], o[2]);
    },
    flash(id, col) { UG[id]?.traverse((m) => { if (!m.isMesh || !m.material.emissive) return; const u = m.material.userData; if (!u.e0) { u.e0 = m.material.emissive.clone(); u.i0 = m.material.emissiveIntensity; } m.material.emissive.copy(col ? new THREE.Color(col) : u.e0); m.material.emissiveIntensity = col ? 0.6 : u.i0; }); },
  }});
const lapOf = (o) => { for (let x = o; x; x = x.parent) if (x.userData && x.userData.lap) return x.userData.lap; return null; };

// ---------------- mô phỏng
const disp = S.disp;
const smooth = (u) => u * u * (3 - 2 * u);
function leapStep(dt) {
  const L = S.leap, P = L.plan; L.t += dt;
  const ph = L.t < P.tCrouch ? 'crouch' : L.t < P.tCrouch + P.tPush ? 'push' : L.t < P.tCrouch + P.tPush + P.tFly ? 'fly' : L.t < P.tCrouch + P.tPush + P.tFly + P.tLand ? 'land' : L.t < P.tCrouch + P.tPush + P.tFly + P.tLand + P.tRest ? 'rest' : 'end';
  if (ph !== L.ph) {
    L.ph = ph;
    if (ph === 'push') say(`bật nhảy · đẩy ${vn(P.F, 0)} N trong ${vn(P.tPush * 1000, 0)} ms`);
    if (ph === 'fly') { L.xF = S.base[0]; say(`bay · v₀ = ${vn(P.v0, 2)} m/s · ${vn(P.tFly, 2)} s`); }
    if (ph === 'land') { L.xL = S.base[0]; L.feetW = LEGS.map((Lg) => [S.base[0] + Lg.A[0] + L.dLand, Lg.A[1] + Lg.sy * MC.lab, RF]); say('tiếp đất · gập gối hấp thụ'); }
    if (ph === 'end') { S.leap = null; S.gait = 'stand'; S.phase = 0; say('đứng lại'); return; }
  }
  let u, z, az = 0, x = S.base[0], pitch = 0;
  if (ph === 'crouch') { u = L.t / P.tCrouch; z = P.h0 + (P.hc - P.h0) * smooth(u); az = ((P.hc - P.h0) * (6 - 12 * u)) / (P.tCrouch * P.tCrouch); }
  else if (ph === 'push') { const t = L.t - P.tCrouch; z = P.hc + 0.5 * P.a * t * t; az = P.a; x = L.x0 + 0.5 * (P.vx / P.tPush) * t * t; pitch = 5 * (t / P.tPush); }
  else if (ph === 'fly') { const t = L.t - P.tCrouch - P.tPush; z = P.hTop + P.v0 * t - 0.5 * G * t * t; az = -G; x = L.xF + P.vx * t; pitch = 5 - 9 * (t / P.tFly); }
  else if (ph === 'land') { const t = L.t - P.tCrouch - P.tPush - P.tFly, w = P.tLand; u = t / w; const m0 = -P.v0 * w; // Hermite: z(0) = hTop, z'(0) = −v0, z(1) = h0, z'(1) = 0
    z = P.hTop * (2 * u ** 3 - 3 * u * u + 1) + m0 * (u ** 3 - 2 * u * u + u) + P.h0 * (-2 * u ** 3 + 3 * u * u);
    az = (P.hTop * (12 * u - 6) + m0 * (6 * u - 4) + P.h0 * (6 - 12 * u)) / (w * w); x = L.xL + P.vx * t - 0.5 * (P.vx / w) * t * t; pitch = -4 * (1 - smooth(u)); }
  else { z = P.h0; }
  S.base[0] = x; S.z = z; S.az = az; S.pitch = pitch;
  // bàn chân: chạm đất thì đứng yên trên sàn; bay thì theo thân, co lên rồi duỗi ra đón đất
  const air = ph === 'fly';
  S.feet = LEGS.map((Lg, i) => {
    if (ph === 'land' || ph === 'rest') return {w: L.feetW[i], stance: true};
    if (!air) return {w: L.feetW0[i], stance: true};
    const t = (L.t - P.tCrouch - P.tPush) / P.tFly, dx = L.dPush + (L.dLand - L.dPush) * smooth(t);
    return {w: [x + Lg.A[0] + dx, Lg.A[1] + Lg.sy * MC.lab, z - P.hTop + RF + 0.07 * Math.sin(Math.PI * t)], stance: false};
  });
  S.leapPh = ph;
}
function gaitStep(dt) {
  const g = GAITS[S.gait], moving = S.run && S.gait !== 'stand', v = moving ? S.v : 0;
  if (moving) S.phase = (S.phase + dt / S.T) % 1;
  S.base[0] += v * dt;
  // đi bước: dồn trọng tâm vào tam giác của ba chân còn lại trước khi nhấc chân sắp bước
  let tgt = [0, 0];
  if (S.gait === 'walk' && moving) {
    let best = 9, j = 0;
    LEGS.forEach((L, i) => { const p = (S.phase + g.off[L.name]) % 1, w = p >= g.beta ? 0 : g.beta - p; if (w < best) { best = w; j = i; } });
    const n = neutral(LEGS[j], S.h); tgt = [-n[0] / 3 * 0.8, -n[1] / 3 * 0.8];
  }
  const k = Math.min(1, dt / (0.09 * S.T));
  S.sway[0] += (tgt[0] - S.sway[0]) * k; S.sway[1] += (tgt[1] - S.sway[1]) * k;
  S.z = S.h; S.az = 0; S.pitch = 0;
  S.feet = LEGS.map((L) => { const f = footAt(neutral(L, S.h), moving ? S.phase : 0, g.off[L.name], g.beta, v, S.T, S.lift); return {w: [S.base[0] + f.pos[0], S.base[1] + f.pos[1], f.pos[2] + S.h], stance: f.stance}; });
}
function solve() {
  const bx = S.base[0] + (S.leap ? 0 : S.sway[0]), by = S.base[1] + (S.leap ? 0 : S.sway[1]), bz = S.z, c = Math.cos(S.pitch / D), s = Math.sin(S.pitch / D);
  S.bp = [bx, by, bz];
  const out = LEGS.map((L, i) => {
    const f = S.feet[i], d = [f.w[0] - bx, f.w[1] - by, f.w[2] - bz];
    const pb = [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]; // thế giới → khung thân (chúi mũi lên dương)
    const ik = legIK(L, pb);
    return {L, i, ik, q: ik.q, P: legPts(L, ik.q), stance: f.stance, w: f.w};
  });
  // lực đỡ: tổng = m(g + a_z) (định luật II cho trọng tâm), chia cho các chân chống để mô men quanh trọng tâm bằng 0
  const st0 = out.filter((o) => o.stance), Wt = st0.length ? Math.max(0, M() * (G + S.az)) : 0;
  const R = grf(st0.map((o) => [o.w[0], o.w[1]]), [bx, by], Wt);
  out.forEach((o) => { o.f = 0; o.tau = [0, 0, 0]; });
  st0.forEach((o, k) => { o.f = Math.max(0, R.f[k]); const fb = [o.f * s, 0, o.f * c]; o.tau = jointTau(o.L, o.q, fb); });
  S.R = R; S.W = Wt;
  return out;
}
const standOut = () => { S.feet = LEGS.map((L) => ({w: [S.base[0] + L.A[0], L.A[1] + L.sy * MC.lab, RF], stance: true})); S.z = S.h; S.az = 0; S.pitch = 0; S.sway = [0, 0]; return solve(); };
const defaults = () => Object.assign(S, {gait: 'stand', phase: 0, v: 0.5, T: 0.4, h: 0.25, H: 0.25, load: 0, run: true, base: [0, 0], sway: [0, 0], pitch: 0, z: 0.25, az: 0, leap: null, ex: 0, exT: 0, iso: null, t: 0, log: [], hist: []});
let isoKey = '';
const applyLook = () => { // X-quang chỉ làm mờ vỏ, khung, đầu; cô lập làm mờ mọi thứ trừ hệ đang soi
  const key = `${S.iso}|${disp.xray}`; if (key === isoKey) return; isoKey = key;
  const F = new Set(); // các vật làm mờ; chia hai lượt để mỗi vật liệu chỉ đổi trạng thái một lần
  if (S.iso) { const keep = new Set([...walk(UG[S.iso]), ...(S.iso === 'vo' ? walk(UG.khung) : [])]); body.traverse((m) => { if (!keep.has(m)) F.add(m); }); }
  else if (disp.xray) for (const id of ['vo', 'dau', 'khung']) for (const m of walk(UG[id])) F.add(m);
  xray(body, 1, (m) => !F.has(m)); xray(body, 0, (m) => F.has(m));
};
const walk = (o) => { const r = []; o.traverse((m) => r.push(m)); return r; };
const sim = {
  S,
  reset() { if (S.asm) { S.asm = false; lap.stop(); } defaults(); Object.assign(disp, {poly: true, force: true, labels: true, xray: false}); say('khởi động · đứng bốn chân'); S.out = standOut(); },
  busy: () => S.asm,
  isOn: (k) => (k === 'asm' && S.asm) || (k === 'explode' && S.exT > 0) || (k === 'leap' && !!S.leap),
  act(k) {
    if (k === 'asm' || k === 'asm_demo') {
      if (k === 'asm_demo' && S.asm) { lap.demo(); return; }
      if (!S.asm) {
        S.asm = true; S.leap = null; S.gait = 'stand'; S.exT = S.ex = 0; S.iso = null; LIVE.closeInspect?.();
        Object.assign(disp, {poly: false, force: false, labels: false, xray: false}); S.out = standOut(); body.position.set(S.bp[0], S.bp[1], S.bp[2]); body.rotation.set(0, -S.pitch / D, 0); body.updateWorldMatrix(true, true);
        parkAll(); lap.start(); if (k === 'asm_demo') lap.demo(); say('lắp ráp · thân đặt trên giá');
        LIVE.setView('asm');
      } else { S.asm = false; lap.stop(); disp.force = disp.poly = true; say('lắp xong · đứng bốn chân'); LIVE.setView('hero'); }
      return;
    }
    if (k.startsWith('iso_')) { const id = k.slice(4); if (S.iso === id) { LIVE.closeInspect(); return; } S.iso = id; say(`cô lập · ${SYS.find((x) => x[0] === id)[1].toLocaleLowerCase('vi')}`); LIVE.inspect(cardOf(id === 'abad' ? '1:abad' : id === 'chanFR' ? '0:hip' : id, true)); return; }
    if (S.asm && !(k in disp)) return; // đang lắp ráp: robot đứng yên
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'explode') { S.exT = S.exT > 0 ? 0 : 1; if (S.exT) { S.leap = null; S.gait = 'stand'; } say(S.exT ? 'tách rời · 10 cụm' : 'ghép lại'); return; }
    if (S.exT > 0 && k !== 'stop') { S.exT = 0; }
    if (k === 'leap') { if (S.leap) return; const P = leapPlan(S.H, M(), S.h); S.out = standOut();
      S.leap = {plan: P, t: 0, ph: 'crouch', x0: S.base[0], feetW0: S.feet.map((f) => f.w.slice()), dPush: -0.5 * P.vx * P.tPush, dLand: 0.5 * P.vx * P.tLand}; say(`bật nhảy · H = ${vn(P.H, 2)} m · khom`); return; }
    if (S.leap) return;
    if (GAITS[k]) { if (S.gait !== k) say(`đổi dáng · ${GAITS[k].vn.toLocaleLowerCase('vi')}`); S.gait = k; S.run = true; return; }
    if (k === 'stop') { S.run = !S.run; say(S.run ? 'chạy tiếp' : 'dừng tại chỗ'); }
  },
  slide(k, t) {
    const R = {v: [0, 0.8], T: [0.25, 0.8], h: [0.18, 0.32], H: [0.05, 0.4], load: [0, 6]}[k];
    if (R) S[k] = R[0] + t * (R[1] - R[0]);
  },
  keyDown(k) { if (k === 'w') { S.v = Math.min(0.8, S.v + 0.1); return true; } if (k === 's') { S.v = Math.max(0, S.v - 0.1); return true; } return false; },
  step(dt) {
    lap.step(dt); S.t += dt;
    S.ex += (S.exT - S.ex) * Math.min(1, dt * 3.5);
    if (S.asm || S.exT > 0 || S.ex > 0.02) { S.out = standOut(); S.out.forEach((o) => { o.f = 0; o.tau = [0, 0, 0]; }); S.W = 0; S.R = {f: [], resid: 0, neg: false}; return; } // lắp ráp, tách rời: thân trên giá, chân không đỡ gì
    if (S.leap) leapStep(dt); else gaitStep(dt);
    S.out = solve();
  },
  shadowAt() { return new THREE.Vector3(S.base[0], 0.15, -S.base[1]); },
  pick: (hits) => {
    if (S.asm) { for (const h of hits) { const id = lapOf(h.object); if (id) { lap.click(id); return true; } } return null; }
    return soi(hits);
  },
  draw() {
    const out = S.out || standOut(), [bx, by, bz] = S.bp;
    body.position.set(bx, by, bz); body.rotation.set(0, -S.pitch / D, 0);
    standG.visible = S.asm || S.ex > 0.02; standG.position.set(bx, by, 0); standG.children[0].scale.set(1, 1, Math.max(0.01, bz - 0.047 - 0.18 * S.ex));
    out.forEach((o) => {
      const m = LM[o.i], P = o.P, n = v3(P.n);
      orient(m.br, P.A, P.hip, X1); axisZ(m.hip, P.hip, n); axisZ(m.cap, P.hip, n.clone().multiplyScalar(o.L.sy));
      orient(m.thigh, P.hip, P.knee, n); axisZ(m.knee, P.knee, n); orient(m.shank, P.knee, P.foot, n); m.foot.position.copy(v3(P.foot));
    });
    lap.draw();
    applyLook();
    // sàn: đa giác chống đỡ (hai chân thì là đoạn thẳng), hình chiếu trọng tâm, mũi tên lực
    const stp = out.filter((o) => o.stance && o.w[2] < RF + 0.002).map((o) => [o.w[0], o.w[1]]);
    const H = hull(stp), ctr = [bx, by], Mg = margin(H, ctr);
    S.ssm = H.length >= 3 ? Mg.m : null; S.nStance = stp.length;
    const pts = H.map((q) => new THREE.Vector3(q[0], q[1], 0));
    if (H.length >= 3) { poly.geometry.dispose(); poly.geometry = new THREE.ShapeGeometry(new THREE.Shape(H.map((q) => new THREE.Vector2(q[0], q[1])))); }
    if (H.length >= 2) { polyLine.geometry.dispose(); polyLine.geometry = new THREE.BufferGeometry().setFromPoints(pts); }
    if (H.length >= 3 && Mg.a) { const ex = Mg.b[0] - Mg.a[0], ey = Mg.b[1] - Mg.a[1], tt = Math.max(0, Math.min(1, ((ctr[0] - Mg.a[0]) * ex + (ctr[1] - Mg.a[1]) * ey) / (ex * ex + ey * ey))); mLine.geometry.setFromPoints([new THREE.Vector3(ctr[0], ctr[1], 0), new THREE.Vector3(Mg.a[0] + tt * ex, Mg.a[1] + tt * ey, 0)]); }
    const floor = !S.asm && S.ex < 0.02; poly.visible = disp.poly && H.length >= 3 && floor; polyLine.visible = disp.poly && H.length >= 2 && floor; mLine.visible = poly.visible; com.visible = disp.poly && floor;
    com.position.x = bx; com.position.y = by;
    out.forEach((o, i) => { const a = arrows[i], on = disp.force && o.f > 0.5 && !S.asm; a.g.visible = on; if (!on) return; const len = o.f * AN; a.g.position.set(o.w[0], o.w[1], 0.004); a.s.scale.z = Math.max(0.001, len - 0.03); a.h.position.z = Math.max(0, len - 0.03); });
    // bảng 01: biểu đồ bước (đậm = chống, nhạt = bước), vạch cam = pha hiện tại
    const g = GAITS[S.gait], moving = !S.leap && S.run && S.gait !== 'stand';
    let svg = '';
    LEGS.forEach((L, i) => {
      const y = i * 17 + 2;
      svg += `<text x="0" y="${y + 10}" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${L.name}</text><rect x="28" y="${y}" width="244" height="13" fill="${C.chart}" stroke="${C.line}"/>`;
      if (S.leap) { svg += `<rect x="29" y="${y + 1}" width="242" height="11" fill="${out[i].stance ? C.ink : '#c9ccd2'}"/>`; return; }
      const o = g.off[L.name], a0 = (((g.beta - o) % 1) + 1) % 1; // chân bước khi pha ∈ [β − off, 1 − off)
      svg += `<rect x="29" y="${y + 1}" width="242" height="11" fill="${C.ink}"/>`;
      if (g.beta < 1) { const segs = [[a0, Math.min(1, a0 + 1 - g.beta)]]; if (a0 + 1 - g.beta > 1) segs.push([0, a0 - g.beta]); for (const [u0, u1] of segs) svg += `<rect x="${28 + u0 * 244}" y="${y + 1}" width="${(u1 - u0) * 244}" height="11" fill="#c9ccd2"/>`; }
    });
    const ph = moving ? S.phase : 0;
    svg += `<line x1="${28 + ph * 244}" x2="${28 + ph * 244}" y1="0" y2="70" stroke="${C.or}" stroke-width="2"/>`;
    gaitSvg.innerHTML = svg;
    const vNow = S.leap ? (S.leapPh === 'fly' ? S.leap.plan.vx : 0) : moving ? S.v : 0;
    gRows[0][1].textContent = moving ? `${fx(1 / S.T, 2)} Hz` : '—'; gRows[1][1].textContent = `${fx(vNow, 2)} m/s`;
    gRows[2][1].textContent = `${S.nStance} / 4`; gRows[3][1].textContent = S.leap ? '—' : g.beta === 1 ? '1' : fx(g.beta, 2);
    sl.v.set(S.v / 0.8, `${fx(S.v, 2)} m/s`); sl.T.set((S.T - 0.25) / 0.55, `${fx(S.T, 2)} s`); sl.h.set((S.h - 0.18) / 0.14, `${fx(S.h * 1000, 0)} mm`);
    sl.H.set((S.H - 0.05) / 0.35, `${fx(S.H * 100, 0)} cm`); sl.load.set(S.load / 6, `${fx(S.load, 1)} kg`);
    // bảng 03: 12 mặt đồng hồ mô men, cung đầy = mô men tối đa của khớp
    let ds = '', loadSum = 0, heat = 0;
    const arc = (cx, cy, r, k) => { const a0 = 0.75 * Math.PI, a1 = a0 + 1.5 * Math.PI * Math.min(1, k), p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`; };
    out.forEach((o, i) => {
      const y = i * 26 + 12;
      ds += `<text x="0" y="${y + 4}" font-family="JetBrains Mono" font-size="9.5" fill="${C.mute}">${o.L.name}</text>`;
      o.tau.forEach((t, j) => {
        const k = Math.abs(t) / TAU[j], cx = 66 + j * 76, hot = k > 0.8; loadSum += k; heat += motorOf(t, j).P;
        ds += `<path d="${arc(cx, y, 9, 1)}" fill="none" stroke="${C.track}" stroke-width="3" stroke-linecap="round"/>`;
        if (k > 0.004) ds += `<path d="${arc(cx, y, 9, k)}" fill="none" stroke="${hot ? '#c4271c' : C.ink}" stroke-width="3" stroke-linecap="round"/>`;
        ds += `<text x="${cx + 15}" y="${y + 4}" font-family="JetBrains Mono" font-size="10" font-weight="600" fill="${hot ? '#c4271c' : C.ink}">${vn(Math.abs(t), 1)}</text>`;
      });
    });
    dialSvg.innerHTML = ds;
    S.load12 = loadSum / 12; S.heat = heat;
    tqTxt.innerHTML = `Tải trung bình <b>${vn(S.load12 * 100, 0)} %</b> · nhiệt cuộn dây <b>${vn(heat, 0)} W</b> · N·m, cung đầy = 18 / 18 / 28 N·m.`;
    // bảng 04: lực đỡ từng chân, tổng, mô men lật dư; biểu đồ cặp trước và cặp sau
    fTot.textContent = vn(S.W, 0); fRes.textContent = S.nStance === 2 || S.nStance === 1 ? vn(S.R.resid, 1) : '0';
    out.forEach((o, i) => fb[i].set(o.f / 160, `${vn(o.f, 1)} N`, o.f > 0 ? C.or : C.faint));
    S.hist.push([out[0].f + out[1].f, out[2].f + out[3].f]); if (S.hist.length > 360) S.hist.shift();
    fChart.set([S.hist.map((h) => h[0]), S.hist.map((h) => h[1])]);
    // bảng 05: sáu hệ thống
    const pill = (t, col) => `<span style="display:block;background:color-mix(in srgb,${col} 13%,#fff);color:${col};border-radius:999px">${t}</span>`;
    const FR = out[0], ok = '#1F7A4D', warn = '#B3261E', idle = C.mute, live = C.or;
    const rowsV = [
      ['2 cặp', S.ex > 0.5 ? pill('tách', idle) : pill('quét', ok)],
      [`tải ${vn(S.load12 * 100, 0)} %`, S.asm ? pill('khoá', idle) : out.some((o) => o.tau.some((t, j) => Math.abs(t) > 0.8 * TAU[j])) ? pill('nóng', warn) : pill('chạy', live)],
      [`${vn(FR.f, 0)} N`, S.leapPh === 'fly' && S.leap ? pill('bay', live) : FR.stance ? pill('chống', ok) : pill('bước', live)],
      [`tách ${vn(S.ex * 100, 0)} %`, S.ex > 0.02 ? pill('mở', idle) : pill('kín', ok)],
      [`${vn(heat / MC.V, 1)} A`, pill('xả', ok)],
      [S.leap ? 'bật nhảy' : GAITS[S.gait].vn.toLocaleLowerCase('vi'), S.nStance === 2 || S.leapPh === 'fly' ? pill('động', live) : S.ssm != null && S.ssm < 0 ? pill('lệch', warn) : pill('vững', ok)],
    ];
    sysRows.forEach(([a, b], i) => { a.textContent = rowsV[i][0]; b.innerHTML = rowsV[i][1]; ui.setOn('iso_' + SYS[i][0], S.iso === SYS[i][0]); });
    logRows.forEach((r, i) => { const l = S.log[i]; r.innerHTML = l ? `<span style="color:${C.faint}">${l[0]}</span>&nbsp;&nbsp;${l[1]}` : ''; r.style.opacity = 1 - i * 0.25; });
    // chế độ vận hành
    const MODE = {crouch: 'Khom', push: 'Đẩy', fly: 'Bay', land: 'Tiếp đất', rest: 'Đứng lại'};
    modeEl.textContent = S.asm ? 'Lắp ráp' : S.ex > 0.5 ? 'Tách rời' : S.leap ? MODE[S.leapPh] : !S.run && S.gait !== 'stand' ? 'Dừng' : GAITS[S.gait].vn;
    modeSub.textContent = S.leap ? `H = ${vn(S.H, 2)} m · v₀ = √(2gH) = ${vn(S.leap.plan.v0, 2)} m/s · lực đẩy ${vn(S.leap.plan.F, 0)} N · cao thân ${vn(S.z * 1000, 0)} mm`
      : `12 động cơ · ${S.nStance} chân chạm đất · ${moving ? `${fx(1 / S.T, 1)} Hz · ${fx(S.v, 2)} m/s` : 'đứng yên'} · tách ${vn(S.ex * 100, 0)} % · cao thân ${vn(S.z * 1000, 0)} mm`;
    for (const kk of Object.keys(GAITS)) ui.setOn(kk, !S.leap && S.gait === kk && (S.run || kk === 'stand'));
    ui.setOn('stop', !S.run); ui.setOn('leap', !!S.leap); ui.setOn('explode', S.exT > 0);
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]);
    const reach = out.every((o) => o.ik.ok), hotJ = out.some((o) => o.tau.some((t, j) => Math.abs(t) > TAU[j]));
    alert.set(S.asm ? '' : !reach ? 'CHÂN KHÔNG VỚI TỚI · GIẢM VẬN TỐC HOẶC CHU KỲ' : hotJ ? 'MÔ MEN VƯỢT GIỚI HẠN ĐỘNG CƠ' : S.R.neg ? 'TRỌNG TÂM RA NGOÀI CHÂN ĐẾ' : '');
    // nhãn có đường dẫn: lấy vị trí thật của chi tiết (tính cả lúc tách rời)
    const wp = (m) => { const p = m.getWorldPosition(new THREE.Vector3()); return st.project(p.x, p.y, p.z); };
    if (callSub.foot) callSub.foot.textContent = `${FR.stance ? 'chống' : 'bước'} · ${vn(FR.f, 1)} N`;
    if (callSub.hip) callSub.hip.textContent = `gối ${vn(Math.abs(FR.tau[2]), 1)} N·m`;
    if (callSub.pin) callSub.pin.textContent = `24 V · ${vn(heat / MC.V, 1)} A`;
    const lab = disp.labels && !S.asm ? 1 : 0;
    ui.drawCallouts([
      {key: 'dau', p: wp(UG.dau.children[0]), dx: -90, dy: -70}, {key: 'abad', p: wp(UG.abad.children[0]), dx: 110, dy: -80}, {key: 'hip', p: wp(LM[0].hip), dx: -110, dy: 30},
      {key: 'thigh', p: wp(LM[0].thigh), dx: 110, dy: 10}, {key: 'shank', p: wp(LM[0].shank), dx: 90, dy: 40}, {key: 'foot', p: wp(LM[0].foot), dx: -90, dy: 50},
      {key: 'pin', p: S.ex > 0.3 || disp.xray ? wp(UG.pin.children[0]) : null, dx: -100, dy: 40},
    ], lab);
    for (const l of leds) l.material.emissiveIntensity = S.asm ? 0.1 : 0.5 + 0.4 * Math.sin(S.t * 4 + l.position.y * 200);
  },
};

// ---------------- soi chi tiết
const SRC = 'Số đo: Cheetah-Software của MIT (MiniCheetah.h, giấy phép MIT): kích thước, khối lượng, tỉ số truyền, mô men động cơ 3 N·m, kT 0,05 N·m/A, R 0,173 Ω, pin 24 V. Katz và cộng sự (ICRA 2019): 9 kg, 2,45 m/s. Mô men khớp tính tĩnh τ = Jᵀf, bỏ quán tính chân.';
function cardOf(part, iso = false) {
  const close = iso ? {close: () => { S.iso = null; }} : {};
  const base = {src: SRC, ...close};
  if (part === 'vo' || part === 'khung') return {...base, k: 'Chó robot · theo MIT Mini Cheetah', t: 'Vỏ, khung và trọng tâm', b: 'Khung nhôm giữ pin, máy tính và bốn động cơ khép/mở. Vỏ chỉ che bụi; mọi lực đi qua khung. Trọng tâm coi như ở tâm thân, vì bốn chân đối xứng.',
    rows: [['Khối lượng', `${vn(MC.m, 0)} kg (thân 3,3 + 4 chân × 1,24 + 12 rô-to × 0,055 ≈ 8,9)`], ['Tải thêm', () => `${vn(S.load, 1)} kg`], ['Trọng lượng', () => `${vn(M() * G, 1)} N`], ['Cao thân', () => `${vn(S.z * 1000, 0)} mm`], ['Góc chúi', () => `${vn(S.pitch, 1)}°`], ['Thân dài × rộng', '380 × 98 mm (giữa các khớp)']],
    pos: follow(UG.vo), d: 1.5};
  if (part === 'dau') return {...base, k: 'Hệ 1 · đầu cảm biến', t: 'Đầu cảm biến', b: 'Kính khói che hai cặp camera nhìn nổi: so ảnh hai mắt để đo khoảng cách tới bậc, vật cản. Mini Cheetah gốc không có đầu này; bài thêm vào để học và không mô phỏng ảnh camera.',
    rows: [['Camera', '2 cặp nhìn nổi (giả định của bài)'], ['Đặt ở', 'mũi thân, cao hơn trục khớp 28 mm'], ['Trạng thái', () => (S.ex > 0.5 ? 'đang tách rời' : 'đang quét')]], pos: follow(UG.dau), d: 0.9};
  if (part === 'pin') return {...base, k: 'Hệ 5 · nguồn', t: 'Pin 24 V', b: 'Mỗi động cơ giữ mô men thì cuộn dây ăn dòng i = τ/(N·kT) và toả nhiệt i²R ngay cả khi chân đứng yên. Đó là lí do robot bốn chân hao pin cả lúc đứng. Dung lượng pin không có trong nguồn đã đọc.',
    rows: [['Điện áp', '24 V'], ['Nhiệt 12 cuộn dây', () => `${vn(S.heat || 0, 1)} W`], ['Dòng từ pin cho phần nhiệt', () => `${vn((S.heat || 0) / MC.V, 2)} A`], ['Dòng cuộn dây gối FR', () => `${vn(motorOf(S.out?.[0].tau[2] || 0, 2).i, 1)} A`]],
    pos: follow(UG.pin), d: 1.0};
  if (part === 'maytinh') return {...base, k: 'Hệ 6 · điều khiển', t: 'Máy tính và mạch điều khiển', b: 'Bộ sinh dáng đi quyết định chân nào chống, chân nào bước theo pha; bộ điều khiển chia lực đỡ cho các chân chống để tổng lực bằng trọng lượng và mô men quanh trọng tâm bằng 0, rồi đổi lực ra mô men khớp bằng τ = Jᵀf.',
    rows: [['Dáng', () => (S.leap ? 'bật nhảy' : GAITS[S.gait].vn)], ['Hệ số chống β', () => (S.leap ? '—' : fx(GAITS[S.gait].beta, 2))], ['Chân chạm đất', () => `${S.nStance} / 4`], ['Biên ổn định tĩnh', () => (S.ssm != null ? `${vn(S.ssm * 1000, 0)} mm` : 'không có (≤ 2 chân)')], ['Mô men lật dư', () => `${vn(S.R?.resid || 0, 1)} N·m`]],
    pos: follow(UG.maytinh), d: 1.0};
  const [li, j] = part.split(':'), i = +li, L = LEGS[i], o = () => S.out?.[i], J = {abad: 0, hip: 1, knee: 2}[j];
  const T = [
    {t: 'Động cơ khép/mở hông', b: 'Trục quay dọc thân, nghiêng cả chân ra ngoài hay vào trong. Bàn chân đặt lệch ra ngoài 62 mm so với trục, nên chỉ đứng yên khớp này đã gánh mô men ≈ lực đỡ × 62 mm.'},
    {t: 'Động cơ gập hông', b: 'Quay đùi tới lui. Khi bàn chân nằm ngay dưới trục hông, lực đỡ đi qua trục nên mô men gần 0; bàn chân lệch trước hay sau thì mô men tăng theo tay đòn.'},
    {t: 'Động cơ gập gối', b: 'Đặt đồng trục với động cơ hông, kéo gối qua dây truyền trong đùi, tổng tỉ số 9,33. Khi đứng, gối gánh nặng nhất: tay đòn là khoảng ngang từ gối tới bàn chân.'},
  ][J];
  return {...base, k: `Chân ${L.vn} · ${L.name} · ${JK[J].toLocaleLowerCase('vi')}`, t: T.t, b: T.b,
    rows: [[`Góc khớp`, () => (o() ? `${vn(o().q[J] * D, 1)}°` : '—')], ['Mô men lúc này', () => (o() ? `${vn(Math.abs(o().tau[J]), 2)} / ${vn(TAU[J], 0)} N·m` : '—')],
      ['Tỉ số truyền', `${vn(MC.gear[J], 2)} : 1 (động cơ 3 N·m)`], ['Dòng cuộn dây', () => (o() ? `${vn(motorOf(o().tau[J], J).i, 1)} A` : '—')], ['Nhiệt i²R', () => (o() ? `${vn(motorOf(o().tau[J], J).P, 1)} W` : '—')],
      ['Lực đỡ chân', () => (o() ? `${vn(o().f, 1)} N · ${o().stance ? 'chống' : 'bước'}` : '—')]],
    pos: J === 0 ? follow(UG.abad.children[i * 2]) : J === 1 ? follow(LM[i].hip) : follow(LM[i].knee), d: 0.85};
}
const soi = picker((part) => cardOf(part));

// ---------------- góc nhìn (bám theo thân)
const cur = {v: 'hero'};
const T0 = () => ({tx: S.bp ? S.bp[0] : 0, ty: 0.16, tz: S.bp ? -S.bp[1] : 0});
const views = {
  hero: (t) => (cur.v = 'hero', {...T0(), ty: 0.16 + 0.1 * S.ex, az: 38 + 10 * Math.sin(t * 0.1), el: 20 + 6 * S.ex, d: 2.5 + 1.1 * S.ex, sx: 0, sy: -40}), // trước bên phải: chân FR ở gần
  side: () => (cur.v = 'side', {...T0(), az: 0, el: 5, d: 2.4, sx: 0, sy: -40}),
  top: () => (cur.v = 'top', {...T0(), ty: 0.0, az: 0, el: 84, d: 2.6, sx: 0, sy: -30}),
  leg: () => { cur.v = 'leg'; const k = S.out?.[0]?.P.knee || [0.03, -0.11, -0.13]; return {tx: (S.bp?.[0] || 0) + k[0], ty: (S.bp?.[2] || 0.25) + k[2], tz: -((S.bp?.[1] || 0) + k[1]), az: 20, el: 12, d: 1.2, sx: 0, sy: -40}; },
  asm: (t) => (cur.v = 'asm', {tx: (S.bp?.[0] || 0) - 0.02, ty: 0.1, tz: -((S.bp?.[1] || 0) + 0.3), az: 200 + 4 * Math.sin(t * 0.1), el: 46, d: 3.0, sx: 0, sy: -10}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'MIT Mini Cheetah · 9 kg', t: 'Mười hai động cơ, bốn chân', b: 'Mỗi chân ba khớp: khép/mở hông (trục dọc thân), gập hông và gập gối (trục ngang). Mười hai động cơ giống nhau, mỗi chiếc 3 N·m qua hộp số hành tinh 1 : 6. Kích thước, khối lượng, tỉ số truyền lấy từ mã nguồn điều khiển Mini Cheetah của MIT; tổng 9 kg, đã đạt 2,45 m/s.', e: '3 khớp × 4 chân = 12 bậc tự do · đùi 209 mm · ống chân 195 mm'},
  {k: 'ĐỨNG YÊN · BỐN CHÂN', t: 'Trọng tâm trong hình chữ nhật', b: 'Bốn bàn chân chạm đất tạo mặt chân đế hình chữ nhật (cam). Trọng tâm (vòng đen) nằm giữa nên mỗi chân đỡ một phần tư trọng lượng. Hạ thân xuống: lực đỡ không đổi nhưng tay đòn ở gối dài ra, mô men gối tăng.', e: 'N = m·g / 4 = 9 × 9,81 / 4 ≈ 22 N · τ_gối = N × d',
    ask: {q: 'Khi đứng yên, vì sao động cơ gối gánh mô men lớn hơn động cơ gập hông?', o: ['Vì gối có hộp số lớn hơn', 'Vì lực đỡ đi gần như qua trục hông, còn gối nằm lệch ra sau bàn chân một khoảng', 'Vì ống chân nặng hơn đùi'], a: 1, e: 'Mô men = lực × tay đòn. Bàn chân ngay dưới hông nên tay đòn ở hông gần 0; gối lệch ra sau nên có tay đòn.'}},
  {k: 'HỘP SỐ HÀNH TINH 1 : 6', t: 'Đổi tốc độ lấy mô men', b: 'Động cơ cho 3 N·m; qua hộp số 1 : 6, khớp nhận 18 N·m; gối thêm dây truyền nên được 28 N·m. Mô men càng lớn, dòng qua cuộn dây càng lớn và nhiệt toả ra tăng theo bình phương dòng. Tăng tải thêm để xem mặt đồng hồ đỏ dần và công suất nhiệt nhảy lên.', e: 'τ_khớp = N·τ_động cơ · i = τ/(N·kT) · P = i²R'},
  {k: 'ĐI BƯỚC · β = 0,85', t: 'Luôn ba chân chống', b: 'Mỗi lần nhấc đúng một chân, theo thứ tự trái sau, trái trước, phải sau, phải trước. Trước khi nhấc, thân dồn trọng tâm vào tam giác của ba chân còn lại; nếu không, trọng tâm rơi đúng lên đường chéo và robot đổ về phía chân vừa nhấc.', e: 'đứng vững tĩnh khi trọng tâm nằm trong tam giác chân chống'},
  {k: 'ĐI KIỆU · β = 0,5', t: 'Hai chân chéo, cân bằng động', b: 'Cặp chéo trái trước và phải sau chống trong khi cặp kia bước, rồi đổi vai. Mặt chân đế chỉ còn một đoạn thẳng: không thể đứng yên trên hai chân chéo. Robot vẫn đi được vì nó đổi chân nhanh hơn thời gian đổ; mô men lật dư ở bảng 04 là phần mà bộ điều khiển phải bù bằng động lực học.', e: 'mô men lật dư = m·g × khoảng cách (trọng tâm → đường chéo)',
    ask: {q: 'Vì sao chó robot không đứng yên được trên hai chân chéo?', o: ['Vì động cơ không đủ mạnh', 'Vì mặt chân đế chỉ là một đoạn thẳng, trọng tâm lệch khỏi đoạn đó một chút là có mô men lật', 'Vì hai chân chéo dài khác nhau'], a: 1, e: 'Cân bằng tĩnh cần trọng tâm nằm trong mặt chân đế; một đoạn thẳng không có phần trong.'}},
  {k: 'MỘT CHÂN · ĐỘNG HỌC NGHỊCH', t: 'Biết bàn chân, tìm ba góc', b: 'Góc khép/mở ra từ mặt phẳng ngang qua trục dọc thân (tính cả độ lệch 62 mm). Phần còn lại là tay máy hai khâu đùi 209 mm, ống chân 195 mm trong mặt phẳng đứng: định lí cos cho góc gối, rồi góc hông. Gối luôn gập ra sau.', e: 'cos β = (l₁² + l₂² − D²) / (2·l₁·l₂)'},
  {k: 'TÁCH RỜI · 10 CỤM', t: 'Nhìn vào bên trong', b: 'Vỏ nhấc lên, pin trượt ra đuôi, bốn chân tách khỏi động cơ khép/mở. Khi đứng, 12 cuộn dây toả nhiệt vài chục oát dù robot không sinh công cơ học: pin trả giá cho việc giữ lực. Bấm từng hệ ở bảng 05 để cô lập và soi.', e: 'P_nhiệt = Σ i²R · I_pin ≈ P / 24 V'},
  {k: 'BẬT NHẢY', t: 'Định lí động năng trong 0,15 s', b: 'Khom xuống, đẩy thân lên quãng s = 16 cm tới vận tốc v₀, bay tự do, rồi gập gối đón đất. Muốn nhảy cao H thì v₀ = √(2gH), và lực đẩy trung bình phải bằng trọng lượng cộng m·v₀²/(2s). Biểu đồ lực đỡ vọt lên khi đẩy, về 0 khi bay, vọt lại khi tiếp đất.', e: 'F = m·g + m·v₀² / (2s) · t_bay = 2v₀ / g'},
  {k: 'LẮP RÁP · THỨ TỰ VÀ LỐI VÀO', t: 'Lắp từ khung ra ngoài', b: 'Bấm “Lắp ráp”: mười cụm nằm trên sàn cạnh giá đỡ, em tự chọn cụm lắp tiếp. Máy kiểm thứ tự (cụm đỡ nó đã có chưa) và lối vào (vỏ đóng rồi thì tuốc nơ vít còn tới được mạch và động cơ bên trong không). Pin vào qua cửa đuôi, chân bắt từ ngoài: hai cụm này lắp sau vỏ vẫn được. Quy trình rút gọn để học.', e: 'khung → mạch, động cơ khép/mở → vỏ → đầu · pin, chân lắp lúc nào cũng được sau khi có chỗ tựa',
    ask: {q: 'Vì sao phải bắt mạch điều khiển trước khi đóng vỏ?', o: ['Vì mạch nặng', 'Vì vỏ đóng lại thì tuốc nơ vít không còn lối tới vít của mạch', 'Vì pin cần mạch mới vào được'], a: 1, e: 'Đó là kiểm “lối vào”: cụm che mất đường của dụng cụ phải lắp sau.'}},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1, {click: 'stand'}); at(4.5, {click: 'v_side'}); at(8, {click: 'v_hero'});
at(10, {cap: 1}); at(10.5, {click: 'v_top'}); at(13, {click: 'v_side'}); at(14, {slide: 'h', to: 0.05, dur: 2}); at(18, {slide: 'h', to: 0.5, dur: 1.4}); at(20, {click: 'v_hero'});
at(21.5, {cap: 2}); at(22, {click: 'iso_abad'}); at(25, {slide: 'load', to: 1, dur: 2.2}); at(29, {slide: 'load', to: 0, dur: 1}); at(31, {do: () => LIVE.closeInspect()});
at(33, {cap: 3}); at(33.5, {slide: 'v', to: 0.3, dur: 0.6}); at(34.3, {slide: 'T', to: 0.6, dur: 0.6}); at(35.2, {click: 'walk'}); at(36.5, {click: 'v_top'}); at(43, {click: 'v_hero'});
at(45, {cap: 4}); at(45.3, {slide: 'T', to: 0.27, dur: 0.6}); at(46, {click: 'trot'}); at(47, {click: 'v_top'}); at(51, {slide: 'v', to: 0.75, dur: 1.4}); at(54, {click: 'v_side'}); at(57, {click: 'v_hero'});
at(59, {cap: 5}); at(59.4, {click: 'stand'}); at(60, {click: 'v_leg'}); at(61, {slide: 'h', to: 0.15, dur: 1.6}); at(64, {slide: 'h', to: 0.85, dur: 1.8}); at(67, {slide: 'h', to: 0.5, dur: 1}); at(68.5, {click: 'v_hero'});
at(70, {cap: 6}); at(70.5, {click: 'explode'}); at(74, {click: 'iso_pin'}); at(79, {click: 'iso_dau'}); at(83, {do: () => LIVE.closeInspect()}); at(84, {click: 'explode'});
at(86, {cap: 7}); at(86.5, {click: 'v_side'}); at(87.2, {click: 'leap'}); at(90.5, {slide: 'H', to: 0.86, dur: 1}); at(92, {click: 'leap'}); at(95.5, {click: 'v_hero'});
at(98, {cap: 8}); at(98.4, {do: () => sim.act('asm_demo')});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 122}, firstView: 'hero', extra: [{key: 'asm', label: 'Lắp ráp'}, {key: 'explode', label: 'Tách rời'}, {key: 'leap', label: 'Bật nhảy'}],
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_leg', g: 'stand', b: 'walk', t: 'trot', j: 'leap', ' ': 'stop', p: 'poly', f: 'force', n: 'labels', x: 'xray', e: 'explode'}});
