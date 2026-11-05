// Sứa robot (theo Cyro, Virginia Tech; sinh học sứa bờm sư tử Cyanea capillata): trang chạy trực tiếp. Lực phụt, lực cản,
// chuyển động đọc từ kin.js; các cụm lắp ráp, tách rời đọc từ cum.js. Bố cục thông tin (dải nhịp, sáu hệ thống, chế độ vận hành,
// lực phụt, tám cánh tay, nhật ký) phỏng theo video teardown sứa robot của 0xWast3 trên X; giao diện là bộ robotics Sáng Ăn Khoai.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, follow, vn} from '../kit/soi.js';
import {createAssembly} from '../kit/lap.js';
import {JF, contraction, bell, jet, jetSpeed} from './kin.js';
import {UNITS, ORDER} from './cum.js';

const D = 180 / Math.PI, PI = Math.PI;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 3.2, grid: 0.25, fade: 11, fov: 26});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -PI / 2; st.scene.add(world);
const jelly = new THREE.Group(); world.add(jelly);
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const UG = {};
for (const u of UNITS) { const g = new THREE.Group(); g.userData.lap = u.id; jelly.add(g); UG[u.id] = g; }
const LOBE = [...Array(8)].map((_, k) => (k * PI) / 4), NOTCH = LOBE.map((t) => t + PI / 8);
const PSI = (PI / 2) * 1.08; // mép chuông cong vào trong một chút

// ---------------- hình khối
// chuông: vòm bán elipxôit tám thuỳ, khía giữa các thuỳ (chỗ cắm rhopalia), mép cong vào; silicone trong mờ
function bellGeo(R, H, seg = 128, rings = 30) {
  const pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const v = i / rings, psi = v * PSI;
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * 2 * PI;
      let notch = 0; for (const n of NOTCH) { let d = Math.abs(th - n); d = Math.min(d, 2 * PI - d); notch += Math.exp(-((d / 0.1) ** 2)); }
      const k = 1 - 0.09 * v ** 5 * notch + 0.012 * Math.sin(th * 8) * v ** 3;
      pos.push(R * Math.sin(psi) * k * Math.cos(th), R * Math.sin(psi) * k * Math.sin(th), H * Math.cos(psi) - 0.04 * v ** 6 * notch);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const bellMat = new THREE.MeshPhysicalMaterial({color: '#efae86', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false});
const bellM = mk(bellGeo(JF.D0 / 2, JF.H0), bellMat, UG.chuong); bellM.castShadow = false;
const bellIn = mk(bellGeo(JF.D0 / 2 - 0.035, JF.H0 - 0.04, 96, 24), new THREE.MeshPhysicalMaterial({color: '#e7a07a', roughness: 0.4, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false}), UG.chuong); bellIn.castShadow = false;
// lõi điện tử ở đỉnh chuông
const coreG = new THREE.Group(); UG.loi.add(coreG);
mk(SH.roundCyl(0.2, -0.07, 0.07, 0.03), MAT.satin('#2a2c30'), coreG);
mk(SH.roundCyl(0.205, -0.012, 0.012, 0.004), MAT.accent(), coreG);
mk(SH.roundCyl(0.09, -0.11, -0.07, 0.015), MAT.anod('#9aa0a8'), coreG);
// vòng co: tám cánh tay từ lõi tới mép chuông
const armGeo = SH.rbox(0.03, 1, 0.02, 0.008); const arms = LOBE.map(() => { const m = mk(armGeo, MAT.anod('#c4c8cc'), UG.vong); m.userData.L0 = 1; return m; });
const hubR = mk(SH.roundCyl(0.24, -0.02, 0.02, 0.008), MAT.anod('#7d838b'), UG.vong);
// tám cảm biến rhopalia ở khía, đèn viền, giá tua ở giữa thuỳ
const rhop = NOTCH.map(() => { const g = new THREE.Group(); UG.rhop.add(g); mk(SH.roundCyl(0.008, -0.05, 0, 0.003), MAT.satin('#f5e6d6'), g); mk(new THREE.SphereGeometry(0.016, 14, 10), new THREE.MeshStandardMaterial({color: '#f7f1e3', emissive: '#ffd58a', emissiveIntensity: 0.5}), g).position.z = -0.055; return g; });
const ledMat = new THREE.MeshStandardMaterial({color: '#1f7a4d', emissive: '#2fbf71', emissiveIntensity: 0.6});
const leds = [...Array(16)].map(() => mk(SH.rbox(0.03, 0.012, 0.01, 0.004), ledMat, UG.den));
const mounts = LOBE.map(() => mk(SH.rbox(0.06, 0.05, 0.04, 0.012), MAT.satin('#3a3d42'), UG.gia));
// tua: 8 chùm × 6 sợi × 22 nút, mô phỏng dây Verlet trong khung sứa
const NS = 6, NN = 22, NT = 8 * NS, LS = JF.tentL / (NN - 1);
const tx = new Float32Array(NT * NN * 3), tp = new Float32Array(NT * NN * 3);
const tGeo = new THREE.BufferGeometry(); const tPos = new Float32Array(NT * (NN - 1) * 6); tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
const tLines = new THREE.LineSegments(tGeo, new THREE.LineBasicMaterial({color: '#c9643d', transparent: true, opacity: 0.85})); tLines.frustumCulled = false; UG.tua.add(tLines);
const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshStandardMaterial({color: '#e3562a', emissive: '#e3562a', emissiveIntensity: 0.2}), NT); tips.frustumCulled = false; UG.tua.add(tips);
// bốn tay miệng: dải có diềm treo dưới lõi
const oralGeo = (() => { const g = new THREE.PlaneGeometry(0.16, 1.0, 8, 40); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.05 * Math.sin(y * 22) * (Math.abs(x) / 0.08) ** 1.5); p.setX(i, x * (0.6 + 0.4 * (y + 0.5))); } g.translate(0, -0.5, 0); g.rotateX(PI / 2); g.computeVertexNormals(); return g; })();
const oral = [0, 1, 2, 3].map((k) => { const g = new THREE.Group(); UG.mieng.add(g); g.rotation.z = (k * PI) / 2 + PI / 4; const m = mk(oralGeo, new THREE.MeshPhysicalMaterial({color: '#eb9f78', roughness: 0.4, transparent: true, opacity: 0.8, side: THREE.DoubleSide}), g); m.castShadow = false; return g; });
tag('chuong', bellM, bellIn); tag('loi', coreG); tag('vong', ...arms, hubR); tag('rhop', ...rhop); tag('den', ...leds); tag('gia', ...mounts); tag('gai', tips); tag('tua', tLines); tag('mieng', ...oral);
for (const g of Object.values(UG)) g.traverse((m) => { if (m.isMesh && !m.isInstancedMesh) m.material = m.material.clone(); });
const v3 = (p) => new THREE.Vector3(p[0], p[1], p[2]), M4 = new THREE.Matrix4();
const orient = (m, a, b, side) => { const A = v3(a), B = v3(b), Y = B.clone().sub(A), L = Y.length(); Y.normalize(); const X = side.clone().sub(Y.clone().multiplyScalar(side.dot(Y))).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromRotationMatrix(M4.makeBasis(X, Y, Z)); m.scale.set(1, L / (m.userData.L0 || L), 1); };
// nước: mặt nước, hạt lơ lửng (để thấy sứa đi so với nước), thước độ sâu, dòng phụt, vòng xoáy
const surf = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({color: '#cfe2f1', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false})); surf.position.z = JF.tank; world.add(surf);
const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 6, 4), new THREE.MeshBasicMaterial({color: '#8fa6bb', transparent: true, opacity: 0.55}), 420);
{ const r = (a) => (Math.random() - 0.5) * a; for (let i = 0; i < 420; i++) motes.setMatrixAt(i, M4.makeTranslation(r(7), r(7), Math.random() * JF.tank)); motes.frustumCulled = false; world.add(motes); }
const ruler = (() => { const p = [-2.2, -1.2, 0, -2.2, -1.2, JF.tank]; for (let z = 0; z <= JF.tank + 1e-6; z += 0.5) p.push(-2.2, -1.2, z, -2.08, -1.2, z); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: '#8b93a0'})); })(); world.add(ruler);
const jetM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 1, 32, 1, true).rotateX(PI / 2).translate(0, 0, -0.5), new THREE.MeshBasicMaterial({color: '#7fb0d8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false})); jelly.add(jetM);
const rings = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 10, 48), new THREE.MeshBasicMaterial({color: '#6f9fc8', transparent: true, opacity: 0, depthWrite: false})); world.add(m); return {m, t: 9}; });

// ---------------- trạng thái
const S = {mode: 'swim', p: 0, T: 4, duty: 0.3, a: JF.a0, aCur: JF.a0, B: -3, spread: 0.2, x: 0, z: JF.z0, vx: 0, vz: 0, phi: 0, c: 0, V: JF.V0, F: 0, u: 0, J: 0, Jlast: 0, dV: 0, zt: 2.6,
  rhopOn: true, gaiT: 9, asm: false, ex: 0, exT: 0, iso: null, t: 0, beat: 0, log: [], hist: [], hz: [], disp: {flow: true, labels: true, xray: false}};
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const Mt = JF.m + JF.ma;

// ---------------- bảng
ui.header({code: 'CYRO', kicker: 'ROBOT MỀM DƯỚI NƯỚC · 8 CÁNH TAY CO CHUÔNG · THEO Cyro (Virginia Tech)', title: 'Sứa robot', sub: 'PHẢN LỰC · ĐỘNG LƯỢNG · LỰC CẢN · TẾ BÀO GAI', hub: HUB_URL,
  right: [['1,7 m', 'KÍCH THƯỚC'], ['77 kg', 'KHỐI LƯỢNG'], ['5 nhịp', 'LÊN 2,4 M'], ['700 ns', 'TẾ BÀO GAI PHÓNG']]});
const BEATS = ['Bơi', 'Phản lực', 'Co và giãn', 'Lực cản', 'Rhopalia', 'Lơ lửng', 'Tách rời', 'Tế bào gai', 'Lắp ráp'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 256, 'NHỊP CO CHUÔNG', '01');
ui.buttons([['swim', 'BƠI LÊN'], ['hover', 'LƠ LỬNG'], ['rest', 'NGHỈ'], ['tilt', 'ĐẨY NGHIÊNG'], ['gai', 'PHÓNG GAI']], 42, 146, 272);
const fChart = ui.chart(42, 212, 272, 62, {min: -30, max: 150, colors: [C.or, C.ink], dash: [0, '3 3']});
ui.text(42, 278, 'CAM: LỰC PHỤT (N) · NÉT ĐỨT: VẬN TỐC (cm/s) · 12 GIÂY');
const pRows = [0, 1, 2, 3].map((k) => [ui.text(42, 298 + k * 17, ['ĐƯỜNG KÍNH · KHOANG', 'NƯỚC PHỤT MỖI NHỊP', 'TỐC ĐỘ DÒNG PHỤT u', 'XUNG LỰC NHỊP TRƯỚC'][k]), ui.text(184, 296 + k * 17, '', 'v', 'width:130px;text-align:right')]);
ui.panel(28, 380, 300, 178, 'ĐIỀU KHIỂN', '02');
const SL = [['T', 'CHU KỲ NHỊP'], ['duty', 'PHẦN CO δ'], ['a', 'BIÊN ĐỘ CO'], ['B', 'NỔI DƯ'], ['spread', 'ĐỘ XOÈ TUA']];
const sl = Object.fromEntries(SL.map(([k, n], i) => [k, ui.slider(k, 42, 416 + i * 27, 272, n, {lw: 92, vw: 70})]));
ui.panel(28, 570, 300, 196, 'TÁM CÁNH TAY CO · VÒNG CO', '03');
const armSvg = ui.svg(42, 604, 272, 120);
const armTxt = ui.text(42, 730, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 256, 'LỰC · VẬN TỐC · ĐỘ SÂU', '04');
ui.text(1286, 148, 'LỰC PHỤT (N)'); const fNow = ui.text(1286, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
ui.text(1430, 148, 'VẬN TỐC (cm/s)'); const vNow = ui.text(1430, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
const fb = [['PHỤT', 0], ['CẢN', 1], ['NỔI DƯ', 2], ['TỔNG', 3]].map(([n], i) => ui.bar(1286, 204 + i * 19, 272, n, {lw: 52, vw: 70, center: true}));
const dChart = ui.chart(1286, 286, 272, 50, {min: 0, max: JF.tank, colors: [C.ink], zero: false});
const dTxt = ui.text(1286, 342, '', 'sm');
ui.panel(1272, 380, 300, 232, 'SÁU HỆ THỐNG · TỪNG BỘ PHẬN', '05');
const SYS = [['rhop', 'RHOPALIA'], ['mieng', 'TAY MIỆNG'], ['tua', 'CHÙM TUA'], ['chuong', 'CHUÔNG'], ['vong', 'VÒNG CO'], ['loi', 'LÕI ĐIỆN TỬ']];
const sysRows = SYS.map(([id, n], i) => { ui.button('iso_' + id, 1286, 412 + i * 29, 136, n); return [ui.text(1428, 416 + i * 29, '', 'v', 'width:78px;text-align:right;font-size:11px'), ui.text(1512, 414 + i * 29, '', 'v', 'width:48px;text-align:center;font-size:10px;font-weight:600;border-radius:999px;padding:2px 0')]; });
ui.text(1286, 590, 'BẤM ĐỂ CÔ LẬP MỘT HỆ VÀ SOI CHI TIẾT');
ui.panel(1272, 624, 300, 142, 'HIỂN THỊ · NHẬT KÝ', '06');
ui.buttons([['flow', 'DÒNG NƯỚC'], ['rhopon', 'RHOPALIA'], ['labels', 'NHÃN'], ['xray', 'X-QUANG'], ['explode', 'TÁCH RỜI']], 1286, 654, 272);
const logRows = [0, 1, 2].map((k) => ui.text(1286, 716 + k * 13, '', 'v', 'font-size:10px;font-weight:500;width:272px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'NGANG'], ['v_top', 'TỪ TRÊN'], ['v_close', 'CHUÔNG']], 360, 120, 600);
ui.text(362, 664, 'CHẾ ĐỘ VẬN HÀNH');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { S.beat = i; setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'chuong', title: 'CHUÔNG SILICONE', sub: '—'}, {key: 'vong', title: 'VÒNG CO', sub: '8 CÁNH TAY · 45°'}, {key: 'rhop', title: 'RHOPALIA', sub: 'CẢM BIẾN THĂNG BẰNG'},
  {key: 'loi', title: 'LÕI ĐIỆN TỬ', sub: '—'}, {key: 'mieng', title: 'TAY MIỆNG', sub: '4 DẢI CÓ DIỀM'}, {key: 'gai', title: 'ĐẦU TẾ BÀO GAI', sub: '48 HẠT'},
]);
const callSub = Object.fromEntries(['chuong', 'vong', 'rhop', 'loi', 'mieng', 'gai'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- hình theo trạng thái: chuông co giãn, mép, cánh tay, tua
const margin = (th, Dm, Hm, notch = 0) => { const R = (Dm / 2) * Math.sin(PSI) * (1 - 0.09 * notch); return [R * Math.cos(th), R * Math.sin(th), Hm * Math.cos(PSI) - 0.04 * notch]; };
function shape(c, a) {
  const b = bell(c, a), sx = b.D / JF.D0, sz = b.H / JF.H0;
  UG.chuong.children.forEach((m) => m.scale.set(sx, sx, sz));
  coreG.position.z = b.H - 0.1; hubR.position.z = b.H - 0.2;
  LOBE.forEach((th, k) => {
    const s = 1 + S.armSkew[k] * c; // cánh tay phía cần sửa nghiêng co mạnh hơn
    const mp = margin(th, JF.D0 - (JF.D0 - b.D) * s, b.H), hp = [0.22 * Math.cos(th), 0.22 * Math.sin(th), b.H - 0.2];
    orient(arms[k], hp, [mp[0] * 0.97, mp[1] * 0.97, mp[2] + 0.05], new THREE.Vector3(0, 0, 1));
    mounts[k].position.set(mp[0], mp[1], mp[2] - 0.02); mounts[k].rotation.z = th;
    const np = margin(NOTCH[k], b.D, b.H, 1); rhop[k].position.set(np[0], np[1], np[2]);
    for (const j of [0, 1]) { const lp = margin(th + (j ? 0.22 : -0.22), b.D, b.H); const L = leds[k * 2 + j]; L.position.set(lp[0], lp[1], lp[2] + 0.005); L.rotation.z = th + PI / 2; }
  });
  return b;
}
S.armSkew = Array(8).fill(0);
// tua: gốc ở giá, nút đầu hướng xuống và xoè ra theo góc giá; lực: trọng lực nhẹ, nước chảy ngược chiều chuyển động
function tentInit() {
  const b = bell(0, S.a);
  for (let k = 0; k < 8; k++) for (let s = 0; s < NS; s++) {
    const th = LOBE[k] + (s - (NS - 1) / 2) * 0.05, mp = margin(th, b.D, b.H);
    for (let n = 0; n < NN; n++) { const i = ((k * NS + s) * NN + n) * 3, r = n * LS * Math.sin(S.spread); tx[i] = tp[i] = mp[0] + r * Math.cos(th); tx[i + 1] = tp[i + 1] = mp[1] + r * Math.sin(th); tx[i + 2] = tp[i + 2] = mp[2] - n * LS * Math.cos(S.spread); }
  }
}
function tentStep(dt, b) {
  const c = Math.cos(S.phi), s = Math.sin(S.phi);
  // trong khung sứa (nghiêng quanh trục y): trọng lực biểu kiến và dòng nước tương đối
  const gx = 0.6 * s, gz = -0.6 * c, wx = -(S.vx * c - S.vz * s), wz = -(S.vx * s + S.vz * c);
  const damp = 0.045, d2 = dt * dt;
  for (let t = 0; t < NT; t++) {
    const k = Math.floor(t / NS), sidx = t % NS, th = LOBE[k] + (sidx - (NS - 1) / 2) * 0.05, mp = margin(th, b.D, b.H), base = t * NN * 3;
    tx[base] = tp[base] = mp[0]; tx[base + 1] = tp[base + 1] = mp[1]; tx[base + 2] = tp[base + 2] = mp[2] - 0.03;
    const dir = [Math.sin(S.spread) * Math.cos(th), Math.sin(S.spread) * Math.sin(th), -Math.cos(S.spread)];
    for (let n = 1; n < NN; n++) {
      const i = base + n * 3;
      for (let q = 0; q < 3; q++) { const x = tx[i + q], vel = (x - tp[i + q]) * (1 - damp); tp[i + q] = x; tx[i + q] = x + vel + ((q === 0 ? gx + 2.2 * wx : q === 2 ? gz + 2.2 * wz : 0) + (n < 3 ? 6 * dir[q] : 0)) * d2; }
    }
    for (let it = 0; it < 3; it++) for (let n = 1; n < NN; n++) {
      const i = base + n * 3, j = i - 3, dx = tx[i] - tx[j], dy = tx[i + 1] - tx[j + 1], dz = tx[i + 2] - tx[j + 2], L = Math.hypot(dx, dy, dz) || 1e-6, f = (L - LS) / L;
      if (n === 1) { tx[i] -= dx * f; tx[i + 1] -= dy * f; tx[i + 2] -= dz * f; } else { tx[i] -= dx * f * 0.5; tx[i + 1] -= dy * f * 0.5; tx[i + 2] -= dz * f * 0.5; tx[j] += dx * f * 0.5; tx[j + 1] += dy * f * 0.5; tx[j + 2] += dz * f * 0.5; }
    }
  }
}
function tentDraw() {
  let o = 0;
  for (let t = 0; t < NT; t++) {
    const base = t * NN * 3;
    for (let n = 0; n < NN - 1; n++) { const i = base + n * 3; for (let q = 0; q < 6; q++) tPos[o++] = tx[i + q]; }
    const e = base + (NN - 1) * 3, sc = S.gaiT < 1.2 ? 1 + 1.4 * Math.sin(S.gaiT * 30) ** 2 : 1;
    tips.setMatrixAt(t, M4.makeScale(sc, sc, sc).setPosition(tx[e], tx[e + 1], tx[e + 2]));
  }
  tGeo.attributes.position.needsUpdate = true; tips.instanceMatrix.needsUpdate = true; tGeo.computeBoundingSphere();
  tips.material.emissiveIntensity = S.gaiT < 1.2 ? 1.2 : 0.2;
}

// ---------------- lắp ráp và tách rời
const PARK = {}, EXP = 1.0;
const parkAll = () => {
  const ids = ORDER.slice().sort((a, b) => UNITS.find((u) => u.id === a).name.localeCompare(UNITS.find((u) => u.id === b).name, 'vi'));
  const bx = new THREE.Box3(), jp = jelly.position;
  ids.forEach((id, i) => {
    const ug = UG[id]; ug.position.set(0, 0, 0); ug.updateWorldMatrix(true, true); bx.setFromObject(ug);
    const cx = (bx.min.x + bx.max.x) / 2 - jp.x, cy = -(bx.min.z + bx.max.z) / 2 - jp.y, zmin = bx.min.y - jp.z;
    PARK[id] = [-2.4 + (i % 4) * 1.6 - cx, 2.0 + Math.floor(i / 4) * 1.7 - cy, 0.002 - jp.z - zmin];
  });
};
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lap = createAssembly({units: UNITS, order: ORDER, title: 'Lắp ráp sứa robot', kicker: 'Thứ tự · lối vào · va vướng', exit: () => sim.act('asm'),
  io: {
    pose(id, k, from) {
      const ug = UG[id]; if (!ug) return;
      if (k >= 0.999 || !PARK[id] || !S.asm) { const e = S.asm ? 0 : S.ex * EXP; ug.position.set(from[0] * e, from[1] * e, from[2] * e); return; }
      const o = k < 0.55 ? lerp3(PARK[id], from, k / 0.55) : lerp3(from, [0, 0, 0], (k - 0.55) / 0.45); ug.position.set(o[0], o[1], o[2]);
    },
    flash(id, col) { UG[id]?.traverse((m) => { if (!m.isMesh || !m.material.emissive) return; const u = m.material.userData; if (!u.e0) { u.e0 = m.material.emissive.clone(); u.i0 = m.material.emissiveIntensity; } m.material.emissive.copy(col ? new THREE.Color(col) : u.e0); m.material.emissiveIntensity = col ? 0.6 : u.i0; }); },
  }});
const lapOf = (o) => { for (let x = o; x; x = x.parent) if (x.userData && x.userData.lap) return x.userData.lap; return null; };
let isoKey = '';
const walk = (o) => { const r = []; o.traverse((m) => r.push(m)); return r; };
const applyLook = () => {
  const key = `${S.iso}|${S.disp.xray}`; if (key === isoKey) return; isoKey = key;
  const F = new Set();
  if (S.iso) { const keep = new Set([...walk(UG[S.iso]), ...(S.iso === 'tua' ? walk(UG.gia) : [])]); jelly.traverse((m) => { if (!keep.has(m)) F.add(m); }); }
  else if (S.disp.xray) for (const m of walk(UG.chuong)) F.add(m);
  xray(jelly, 1, (m) => !F.has(m) || m === jetM); xray(jelly, 0, (m) => F.has(m) || m === jetM);
};

// ---------------- mô phỏng
const disp = S.disp;
let Vp = null, acc = 0;
function physics(dt) {
  const T = S.T;
  if (S.mode !== 'rest') {
    const p0 = S.p; S.p += dt / T;
    if (S.p >= 1) { // nhịp mới
      S.p -= 1; S.Jlast = S.J; S.J = 0;
      if (S.mode === 'hover') { S.aCur = Math.max(0, Math.min(0.35, 0.12 + 1.2 * (S.zt - S.z) - 1.6 * S.vz)); if (S.aCur < 0.03) S.aCur = 0; }
      else S.aCur = S.a;
      S.armSkew = LOBE.map((th) => (S.rhopOn ? Math.max(-0.5, Math.min(0.5, 1.4 * S.phi)) * Math.cos(th) : 0));
    }
    if (p0 < S.duty && S.p >= S.duty) spawnRing();
  }
  // độ co đi theo nhịp nhưng không được nhảy bậc (đổi chế độ, kéo thanh trượt giữa nhịp): nhảy bậc làm dV/dt và lực phụt vọt vô lí
  const cT = S.mode === 'rest' ? 0 : contraction(S.p, S.duty), up = (dt * 3) / (S.duty * T), down = (dt * 1.6) / ((1 - S.duty) * T);
  S.c += Math.max(-down, Math.min(up, cT - S.c));
  const b = bell(S.c, S.aCur), dV = Vp == null ? 0 : (b.V - Vp) / dt; Vp = b.V;
  S.b = b; S.dV = dV; S.F = jet(dV, b.A); S.u = jetSpeed(dV, b.A); if (S.F > 0) S.J += S.F * dt;
  const ax = Math.sin(S.phi), az = Math.cos(S.phi), sp = Math.hypot(S.vx, S.vz), Fd = 0.5 * JF.rho * JF.Cd * b.A * sp;
  S.Fd = -Fd * S.vz; // thành phần dọc của lực cản −½ρCA·|v|·v
  const Fx = S.F * ax - Fd * S.vx, Fz = S.F * az - Fd * S.vz + S.B;
  S.Fnet = Fz; S.vx += (Fx / Mt) * dt; S.vz += (Fz / Mt) * dt; S.x += S.vx * dt; S.z += S.vz * dt;
  // rhopalia: cơ quan thăng bằng thấy chuông nghiêng, cánh tay phía thấp co mạnh hơn, chuông tự dựng lại trong lúc co
  if (S.rhopOn && S.F > 0) S.phi -= S.phi * Math.min(1, (S.F / 60) * 1.6 * dt);
  // mặt nước và đáy bể
  const top = JF.tank - S.b.H - 0.02;
  if (S.z > top) { S.z = top; S.vz = Math.min(0, S.vz); if (S.mode === 'swim') { S.mode = 'hover'; S.zt = top - 0.4; say('chạm mặt nước · chuyển sang lơ lửng'); } }
  if (S.z < JF.tentL + 0.1) { S.z = JF.tentL + 0.1; S.vz = Math.max(0, S.vz); }
  S.gaiT += dt;
}
function spawnRing() { const r = rings.reduce((a, b) => (a.t > b.t ? a : b)); r.t = 0; const R = (S.b?.D || JF.D0) * 0.42; r.R = R; r.x = S.x + Math.sin(S.phi) * -0.05; r.z = S.z - 0.08; r.vz = -0.35 * Math.cos(S.phi); r.vx = -0.35 * Math.sin(S.phi); r.phi = S.phi; }
const defaults = () => { Object.assign(S, {mode: 'swim', p: 0, T: 4, duty: 0.3, a: JF.a0, aCur: JF.a0, B: -3, spread: 0.2, x: 0, z: JF.z0, vx: 0, vz: 0, phi: 0, c: 0, F: 0, u: 0, J: 0, Jlast: 0, zt: 2.6, rhopOn: true, gaiT: 9, ex: 0, exT: 0, iso: null, t: 0, log: [], hist: [], hz: []}); S.armSkew = Array(8).fill(0); S.b = bell(0, S.a); Vp = null; tentInit(); };
const sim = {
  S,
  reset() { if (S.asm) { S.asm = false; lap.stop(); } defaults(); Object.assign(disp, {flow: true, labels: true, xray: false}); for (const r of rings) r.t = 9; say('thả trong giếng lặn · độ sâu 2,4 m'); },
  busy: () => S.asm,
  isOn: (k) => (k === 'asm' && S.asm) || (k === 'explode' && S.exT > 0) || (k === 'gai' && S.gaiT < 1.2),
  act(k) {
    if (k === 'asm' || k === 'asm_demo') {
      if (k === 'asm_demo' && S.asm) { lap.demo(); return; }
      if (!S.asm) {
        S.asm = true; S.exT = S.ex = 0; S.iso = null; S.phi = 0; S.vx = S.vz = 0; S.c = 0; LIVE.closeInspect?.(); S.z = 2.2; Object.assign(disp, {flow: false, labels: false, xray: false});
        jelly.position.set(S.x, 0, S.z); jelly.rotation.set(0, 0, 0); shape(0, S.a); tentInit(); jelly.updateWorldMatrix(true, true);
        parkAll(); lap.start(); if (k === 'asm_demo') lap.demo(); say('lắp ráp · cụm chờ nằm dưới đáy giếng'); LIVE.setView('asm');
      } else { S.asm = false; lap.stop(); disp.flow = true; tentInit(); say('lắp xong · thả xuống nước'); LIVE.setView('hero'); }
      return;
    }
    if (k.startsWith('iso_')) { const id = k.slice(4); if (S.iso === id) { LIVE.closeInspect(); return; } S.iso = id; say(`cô lập · ${SYS.find((x) => x[0] === id)[1].toLocaleLowerCase('vi')}`); LIVE.inspect(cardOf(id, true)); return; }
    if (S.asm && !(k in disp)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'rhopon') { S.rhopOn = !S.rhopOn; say(S.rhopOn ? 'bật rhopalia · tự giữ thăng bằng' : 'tắt rhopalia'); return; }
    if (k === 'explode') { S.exT = S.exT > 0 ? 0 : 1; say(S.exT ? 'tách rời · 8 cụm' : 'ghép lại'); return; }
    if (S.exT > 0) S.exT = 0;
    if (k === 'swim' || k === 'hover' || k === 'rest') { if (S.mode !== k) say({swim: 'bơi lên', hover: `lơ lửng · giữ độ sâu ${vn(JF.tank - S.z - S.b.H, 2)} m`, rest: 'nghỉ · ngừng co chuông'}[k]); if (k === 'hover') S.zt = S.z; if (S.mode === 'rest' && k !== 'rest') S.p = 0; S.mode = k; if (k !== 'rest') S.aCur = k === 'swim' ? S.a : S.aCur; return; }
    if (k === 'tilt') { S.phi = Math.min(0.6, S.phi + 0.45); say(`bị đẩy nghiêng ${vn(S.phi * D, 0)}°`); return; }
    if (k === 'gai') { S.gaiT = 0; say('phóng tế bào gai · 700 ns'); LIVE.inspect(cardOf('gai')); }
  },
  slide(k, t) {
    const R = {T: [2, 8], duty: [0.15, 0.6], a: [0, 0.4], B: [-20, 20], spread: [0, 1.05]}[k];
    if (R) S[k] = R[0] + t * (R[1] - R[0]);
  },
  keyDown() { return false; },
  step(dt) {
    lap.step(dt); S.t += dt; S.ex += (S.exT - S.ex) * Math.min(1, dt * 3.5);
    for (const r of rings) r.t += dt;
    if (S.asm || S.ex > 0.02 || S.exT > 0) { if (!S.asm) S.z += (Math.max(S.zx ?? (S.zx = S.z), 1.9) - S.z) * Math.min(1, dt * 2); S.c = Math.max(0, S.c - dt); S.b = shape(S.c, S.aCur); S.F = 0; S.u = 0; S.Fd = 0; S.Fnet = 0; S.vx = S.vz = 0; return; }
    S.zx = undefined;
    acc += dt; while (acc >= 1 / 240) { physics(1 / 240); acc -= 1 / 240; }
    S.b = shape(S.c, S.aCur);
    for (let i = 0; i < 2; i++) tentStep(dt / 2, S.b);
    S.hist.push([S.F, S.vz * 100]); if (S.hist.length > 720) S.hist.shift();
    if (Math.floor(S.t * 10) !== S.hzT) { S.hzT = Math.floor(S.t * 10); S.hz.push(S.z + S.b.H); if (S.hz.length > 300) S.hz.shift(); }
  },
  shadowAt() { return new THREE.Vector3(S.x, 1.0, 0); },
  pick: (hits) => {
    if (S.asm) { for (const h of hits) { const id = lapOf(h.object); if (id) { lap.click(id); return true; } } return null; }
    return soi(hits);
  },
  draw() {
    jelly.position.set(S.x, 0, S.z); jelly.rotation.set(0, S.phi, 0);
    if (!S.b) S.b = shape(0, S.a);
    tentDraw();
    oral.forEach((g, k) => { g.rotation.x = 0.12 * Math.sin(S.t * 0.9 + k * 1.7); g.position.z = S.b.H - 0.18; });
    lap.draw(); applyLook();
    // dòng phụt và vòng xoáy
    const jk = disp.flow && S.F > 0.5 && !S.asm && S.ex < 0.02 ? Math.min(1, S.u / 0.4) : 0;
    jetM.material.opacity = 0.22 * jk; jetM.scale.set(S.b.D * 0.42, S.b.D * 0.42, 0.3 + 1.6 * jk); jetM.position.z = -0.06;
    for (const r of rings) { const on = disp.flow && r.t < 4 && !S.asm; r.m.visible = on; if (!on) continue; const R = r.R * (1 + 0.12 * r.t); r.m.scale.set(R, R, 1 + r.t * 0.6); r.m.position.set(r.x + r.vx * r.t, 0, r.z + r.vz * r.t); r.m.rotation.set(0, r.phi, 0); r.m.material.opacity = 0.42 * (1 - r.t / 4); }
    for (const l of leds) l.material.emissiveIntensity = 0.25 + 1.4 * S.c;
    const depth = JF.tank - (S.z + S.b.H);
    // bảng 01
    fChart.set([S.hist.map((h) => h[0]), S.hist.map((h) => h[1])]);
    const dVp = bell(0, S.aCur).V - bell(1, S.aCur).V;
    pRows[0][1].textContent = `${vn(S.b.D, 2)} m · ${vn(S.b.V, 2)} m³`;
    pRows[1][1].textContent = `${vn(dVp * 1000, 0)} L · ${vn(dVp * JF.rho, 0)} kg`;
    pRows[2][1].textContent = `${vn(S.F > 0 ? S.u : 0, 2)} m/s`;
    pRows[3][1].textContent = `${vn(S.Jlast, 0)} N·s`;
    sl.T.set((S.T - 2) / 6, `${fx(S.T, 1)} s`); sl.duty.set((S.duty - 0.15) / 0.45, `${vn(S.duty * 100, 0)} %`); sl.a.set(S.a / 0.4, `${vn(S.a * 100, 0)} %`);
    sl.B.set((S.B + 20) / 40, `${S.B > 0 ? '+' : ''}${vn(S.B, 1)} N`); sl.spread.set(S.spread / 1.05, `${vn(S.spread * D, 0)}°`);
    // bảng 03: tám cánh tay, hành trình co và phần công suất phụt
    const P = Math.max(0, S.F) * S.u; let svg = '';
    LOBE.forEach((th, k) => {
      const s = S.c * S.aCur * (1 + S.armSkew[k] * 1), cx = 32 + (k % 4) * 68, cy = 22 + Math.floor(k / 4) * 54, kk = Math.min(1, s / 0.4);
      const a0 = 0.75 * PI, a1 = a0 + 1.5 * PI * kk, pt = (a) => `${(cx + 15 * Math.cos(a)).toFixed(1)} ${(cy + 15 * Math.sin(a)).toFixed(1)}`;
      svg += `<path d="M${pt(a0)} A15 15 0 1 1 ${pt(a0 + 1.5 * PI)}" fill="none" stroke="${C.track}" stroke-width="3.5" stroke-linecap="round"/>`;
      if (kk > 0.004) svg += `<path d="M${pt(a0)} A15 15 0 ${a1 - a0 > PI ? 1 : 0} 1 ${pt(a1)}" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
      svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="JetBrains Mono" font-size="9.5" font-weight="600" fill="${C.ink}">${vn(s * JF.D0 * 500, 0)}</text><text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${k * 45}° · ${vn((P / 8) * (1 + S.armSkew[k]), 1)} W</text>`;
    });
    armSvg.innerHTML = svg;
    armTxt.innerHTML = `Số giữa: mép chuông kéo vào (mm). Công suất phụt P = F·u = <b>${vn(P, 0)} W</b>, chia cho 8 cánh tay; lệch nhau khi rhopalia sửa nghiêng.`;
    // bảng 04
    fNow.textContent = vn(S.F, 0); vNow.textContent = vn(S.vz * 100, 1);
    const bars = [S.F, S.Fd, S.B, S.Fnet];
    fb.forEach((b, i) => b.set(bars[i] / 120, `${vn(bars[i], 1)} N`, bars[i] >= 0 ? C.or : C.ink));
    dChart.set([S.hz]);
    dTxt.innerHTML = `Đường: độ cao đỉnh chuông, 30 giây · sâu <b>${vn(Math.max(0, depth), 2)} m</b>`;
    // bảng 05
    const pill = (t, col) => `<span style="display:block;background:color-mix(in srgb,${col} 13%,#fff);color:${col};border-radius:999px">${t}</span>`;
    const ok = '#1F7A4D', warn = '#B3261E', idle = C.mute, live = C.or;
    const rowsV = [
      [`nghiêng ${vn(Math.abs(S.phi * D), 0)}°`, !S.rhopOn ? pill('tắt', warn) : Math.abs(S.phi) > 0.05 ? pill('sửa', live) : pill('giữ', ok)],
      ['4 dải', pill('trôi', ok)],
      [`xoè ${vn(S.spread * D, 0)}°`, S.gaiT < 1.2 ? pill('phóng', warn) : pill('kéo', ok)],
      [`D ${vn(S.b.D, 2)} m`, S.ex > 0.02 ? pill('tách', idle) : S.dV < -1e-4 ? pill('co', live) : pill('giãn', ok)],
      [`${vn(S.aCur * 100, 0)} %`, S.asm ? pill('khoá', idle) : S.mode === 'rest' ? pill('nghỉ', idle) : pill('chạy', live)],
      [`${vn(Math.max(0, depth), 1)} m`, pill(S.mode === 'hover' ? 'giữ sâu' : 'ổn', ok)],
    ];
    sysRows.forEach(([a, bEl], i) => { a.textContent = rowsV[i][0]; bEl.innerHTML = rowsV[i][1]; ui.setOn('iso_' + SYS[i][0], S.iso === SYS[i][0]); });
    logRows.forEach((r, i) => { const l = S.log[i]; r.innerHTML = l ? `<span style="color:${C.faint}">${l[0]}</span>&nbsp;&nbsp;${l[1]}` : ''; r.style.opacity = 1 - i * 0.25; });
    const MODE = {swim: 'Bơi lên', hover: 'Lơ lửng', rest: 'Nghỉ'};
    modeEl.textContent = S.asm ? 'Lắp ráp' : S.ex > 0.5 ? 'Tách rời' : S.gaiT < 1.2 ? 'Phóng gai' : MODE[S.mode];
    modeSub.textContent = `8 cánh tay · nhịp ${fx(S.T, 1)} s · co ${vn(S.duty * 100, 0)} % chu kỳ · biên độ ${vn(S.aCur * 100, 0)} % · sâu ${vn(Math.max(0, depth), 2)} m · ${vn(S.vz * 100, 1)} cm/s`;
    for (const k of ['swim', 'hover', 'rest']) ui.setOn(k, S.mode === k && !S.asm);
    ui.setOn('gai', S.gaiT < 1.2); ui.setOn('tilt', Math.abs(S.phi) > 0.05); ui.setOn('rhopon', S.rhopOn); ui.setOn('explode', S.exT > 0);
    for (const k of Object.keys(disp)) ui.setOn(k, disp[k]);
    alert.set(S.asm ? '' : !S.rhopOn && Math.abs(S.phi) > 0.1 ? 'CHUÔNG NGHIÊNG · BẬT RHOPALIA ĐỂ TỰ DỰNG LẠI' : S.mode !== 'rest' && S.duty > 0.5 ? 'CO CHẬM NHƯ GIÃN · LỰC NGƯỢC KHI GIÃN GẦN BẰNG LỰC PHỤT' : '');
    // nhãn
    const wp = (m) => { const p = m.getWorldPosition(new THREE.Vector3()); return st.project(p.x, p.y, p.z); };
    if (callSub.chuong) callSub.chuong.textContent = `D ${vn(S.b.D, 2)} m · ${S.dV < -1e-4 ? 'đang co' : 'đang giãn'}`;
    if (callSub.loi) callSub.loi.textContent = `sâu ${vn(Math.max(0, depth), 2)} m`;
    const tipW = (() => { const e = (3 * NS * NN + NN - 1) * 3; const v = new THREE.Vector3(tx[e], tx[e + 1], tx[e + 2]); UG.tua.localToWorld(v); return st.project(v.x, v.y, v.z); })();
    const lab = disp.labels && !S.asm ? 1 : 0;
    ui.drawCallouts([
      {key: 'chuong', p: wp(rhop[1]), dx: 110, dy: -90}, {key: 'vong', p: wp(arms[6]), dx: -120, dy: -60}, {key: 'rhop', p: wp(rhop[0]), dx: 120, dy: 20},
      {key: 'loi', p: wp(coreG), dx: 90, dy: -80}, {key: 'mieng', p: wp(oral[1].children[0]), dx: -130, dy: 60}, {key: 'gai', p: tipW, dx: 100, dy: 20},
    ], lab);
  },
};
tentInit();

// ---------------- soi chi tiết
const SRC = 'Cyro: Live Science 29/3/2013 (Virginia Tech, 1,7 m, 77 kg, lên 2,4 m trong 5 nhịp). Lực phụt F = (ρ/A)(dV/dt)²: Daniel 1983, theo Dabiri, Colin, Costello 2007 (J. Exp. Biol.). Robojelly: Colin và cộng sự 2012 (PLoS ONE). Hình chuông, khối nước kéo theo, hệ số cản là giả định của bài.';
function cardOf(part, iso = false) {
  const base = {src: SRC, ...(iso ? {close: () => { S.iso = null; }} : {})};
  if (part === 'chuong') return {...base, k: 'Hệ 4 · thân', t: 'Chuông silicone', b: 'Chuông là khoang chứa nước. Co lại, thể tích khoang giảm, nước bị đẩy ra qua miệng chuông; phản lực của nước đẩy chuông đi ngược lại. Robojelly dùng silicone mô đun đàn hồi 56 kPa, mềm hơn tầng keo của sứa thật khoảng 0,9 MPa.',
    rows: [['Đường kính D', () => `${vn(S.b.D, 2)} m`], ['Cao H', () => `${vn(S.b.H, 2)} m`], ['Thể tích khoang V = (π/6)·H·D²', () => `${vn(S.b.V, 3)} m³`], ['Miệng chuông A = πD²/4', () => `${vn(S.b.A, 2)} m²`], ['Đang co', () => `${vn(S.c * 100, 0)} %`]], pos: follow(UG.chuong), d: 3.6};
  if (part === 'vong') return {...base, k: 'Hệ 5 · cơ', t: 'Vòng co tám cánh tay', b: 'Sứa thật co chuông bằng một dải cơ vòng ở mép. Cyro dùng cánh tay kéo hướng tâm; Robojelly dùng 8 bộ chấp hành hợp kim nhớ hình cách nhau 45°, nhịp 0,7 Hz. Co nhanh, giãn chậm: lực phụt tỉ lệ bình phương tốc độ đổi thể tích, nên giãn chậm thì lực ngược nhỏ.',
    rows: [['Chu kỳ nhịp', () => `${vn(S.T, 1)} s`], ['Phần co δ', () => `${vn(S.duty * 100, 0)} % chu kỳ`], ['Biên độ co', () => `${vn(S.aCur * 100, 0)} % đường kính`], ['Công suất phụt F·u', () => `${vn(Math.max(0, S.F) * S.u, 0)} W`]], pos: follow(hubR), d: 3.2};
  if (part === 'loi') return {...base, k: 'Hệ 6 · điều khiển', t: 'Lõi điện tử', b: 'Mạch, pin và cảm biến áp suất ở đỉnh chuông. Ở chế độ lơ lửng, mỗi đầu nhịp lõi đặt biên độ co theo sai lệch độ sâu và vận tốc: chìm thì co mạnh, nổi thì co nhẹ hoặc bỏ nhịp. Đó là điều khiển phản hồi.',
    rows: [['Độ sâu đỉnh chuông', () => `${vn(Math.max(0, JF.tank - S.z - S.b.H), 2)} m`], ['Vận tốc lên', () => `${vn(S.vz * 100, 1)} cm/s`], ['Nổi dư (Acsimet − trọng lượng)', () => `${vn(S.B, 1)} N`], ['Khối lượng + nước kéo theo', `${vn(JF.m, 0)} + ${vn(JF.ma, 0)} kg`]], pos: follow(coreG), d: 3.0};
  if (part === 'rhop') return {...base, k: 'Hệ 1 · cảm biến', t: 'Rhopalia: cơ quan thăng bằng', b: 'Sứa bờm sư tử có tám rhopalia nằm ở tám khía giữa các thuỳ chuông. Mỗi rhopalium có hạt đá thăng bằng (statolith): chuông nghiêng, hạt đè lệch, sứa co mạnh phía thấp để tự dựng lại, giống tai trong của người. Trong bài, tắt rhopalia thì chuông giữ nguyên độ nghiêng và bơi lệch.',
    rows: [['Độ nghiêng', () => `${vn(S.phi * D, 1)}°`], ['Trạng thái', () => (S.rhopOn ? 'đang giữ thăng bằng' : 'đã tắt')], ['Số cảm biến', '8, ở 8 khía']], pos: follow(rhop[0]), d: 2.2};
  if (part === 'den') return {...base, k: 'Chi tiết', t: 'Đèn viền', b: 'Mười sáu đèn ở mép chuông sáng theo độ co, để nhìn nhịp từ xa. Chi tiết của bài, không có trong nguồn về Cyro.', rows: [['Độ sáng', () => `${vn(S.c * 100, 0)} %`]], pos: follow(UG.den), d: 2.6};
  if (part === 'gia' || part === 'tua') return {...base, k: 'Hệ 3 · tua', t: 'Tám chùm tua', b: 'Sứa bờm sư tử có tám thuỳ chuông, mỗi thuỳ mang khoảng 70 đến 150 tua xếp bốn hàng. Con lớn nhất ghi nhận (Massachusetts, 1865) có chuông 2,1 m và tua 36,6 m, có thể thuộc loài Cyanea khác. Tua của robot dài 1,5 m (giả định), bị dòng nước kéo ngược chiều chuyển động.',
    rows: [['Độ xoè giá tua', () => `${vn(S.spread * D, 0)}°`], ['Sợi mô phỏng', `${NT} sợi · ${NN} nút`], ['Dài tua', `${vn(JF.tentL, 1)} m`]], pos: follow(UG.gia), d: 3.4};
  if (part === 'mieng') return {...base, k: 'Hệ 2 · ăn', t: 'Tay miệng', b: 'Bốn tay miệng rộng, có diềm, mang nhiều tế bào gai, đưa mồi bị tua làm tê liệt vào miệng ở giữa chuông. Sứa bờm sư tử ăn cá, động vật phù du và sứa nhỏ hơn.', rows: [['Số dải', '4'], ['Dài', '1,0 m (giả định)']], pos: follow(UG.mieng), d: 2.8};
  return {...base, k: 'Tế bào gai · nematocyst', t: 'Một trong những chuyển động nhanh nhất của sinh vật', b: 'Mỗi tế bào gai là một nang chứa sợi cuộn, áp suất trong nang khoảng 15 MPa. Khi chạm mồi, nắp bật và kim phóng ra. Nüchter và cộng sự (Current Biology, 2006) quay ở 1,43 triệu khung hình/giây trên Hydra: cả quá trình khoảng 700 ns, gia tốc tới 5,41 triệu g. Kiểm: v = a·t = 5,41·10⁶ × 9,81 × 7·10⁻⁷ ≈ 37 m/s, khớp mức trên của vận tốc đo được (18,5–37,1 m/s).',
    rows: [['Thời gian phóng', '≈ 700 ns'], ['Gia tốc cực đại', '5,41 triệu g'], ['Vận tốc kim', '18,5–37,1 m/s'], ['Áp suất trong nang', '15 MPa'], ['Áp suất chỗ chạm', 'trên 7 GPa'], ['Khối lượng được phóng', '≈ 1 ng']],
    d: 3.8, src: 'Nüchter T., Benoit M., Engel U., Özbek S., Holstein T. W. (2006), Nanosecond-scale kinetics of nematocyst discharge, Current Biology 16: R316–R318 (số đo trên Hydra). Đầu tua của robot chỉ mô phỏng hình ảnh.', pos: () => { const e = ((3 * NS) * NN + NN - 1) * 3, v = new THREE.Vector3(tx[e], tx[e + 1], tx[e + 2]); UG.tua.localToWorld(v); return [v.x, v.y, v.z]; }};
}
const soi = picker((part) => cardOf(part));

// ---------------- góc nhìn
const T0 = () => ({tx: S.x, ty: S.z + 0.15, tz: 0});
const views = {
  hero: (t) => ({...T0(), ty: S.z - 0.1 + 0.4 * S.ex, az: 28 + 8 * Math.sin(t * 0.08), el: 10 + 8 * S.ex, d: 8.2 + 2.5 * S.ex, sx: 0, sy: -40}),
  side: () => ({...T0(), az: 0, el: 0, d: 7.6, sx: 0, sy: -40}),
  top: () => ({...T0(), ty: S.z + 0.4, az: 0, el: 78, d: 6.4, sx: 0, sy: -30}),
  close: () => ({...T0(), ty: S.z + 0.3, az: 35, el: 22, d: 4.4, sx: 0, sy: -40}),
  asm: (t) => ({tx: S.x, ty: 1.3, tz: -1.5, az: 12 + 4 * Math.sin(t * 0.1), el: 26, d: 12.5, sx: 0, sy: -10}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'Cyro · Virginia Tech · 2013', t: 'Sứa robot to bằng người', b: 'Cyro dài 1,7 m, nặng 77 kg, mô phỏng sứa bờm sư tử Cyanea capillata: chuông silicone, cánh tay co hướng tâm, điện tử ở đỉnh chuông. Thả trong giếng lặn sâu 4,3 m, nó lên từ độ sâu 2,4 m tới mặt nước sau 5 nhịp. Bài này dựng lại nhịp bơi đó bằng một mô hình lực phụt và lực cản.', e: '77 kg · 1,7 m · 5 nhịp lên 2,4 m'},
  {k: 'PHẢN LỰC · ĐỊNH LUẬT III', t: 'Đẩy nước xuống, chuông đi lên', b: 'Chuông co lại, thể tích khoang giảm, khối nước bên trong bị đẩy ra qua miệng chuông. Nước nhận động lượng hướng xuống thì chuông nhận động lượng hướng lên bằng như thế. Lực phụt tăng theo bình phương tốc độ đổi thể tích: co nhanh gấp đôi, lực gấp bốn.', e: 'F = (ρ/A)·(dV/dt)² · V = (π/6)·H·D² · A = πD²/4',
    ask: {q: 'Vì sao chuông đi lên khi nó đẩy nước xuống?', o: ['Vì nước nóng lên', 'Vì nước đẩy ngược chuông bằng một lực cùng độ lớn, ngược chiều (định luật III)', 'Vì lực đẩy Acsimet tăng'], a: 1, e: 'Chuông tác dụng lực lên nước, nước tác dụng lại chuông lực bằng và ngược chiều; tổng động lượng nước và chuông được bảo toàn.'}},
  {k: 'CO NHANH · GIÃN CHẬM', t: 'Vì sao nhịp không đối xứng', b: 'Khi giãn, chuông hút nước vào lại và chịu một lực ngược. Lực ấy cũng tăng theo bình phương tốc độ, nên giãn chậm gấp đôi thì lực ngược chỉ còn một phần tư. Kéo phần co δ lên 50 %: co và giãn nhanh như nhau, lực ngược gần bằng lực phụt, robot gần như đứng yên.', e: 'giãn chậm k lần → lực ngược nhỏ đi k² lần'},
  {k: 'LỰC CẢN · VẬN TỐC', t: 'Nước cản càng mạnh khi đi càng nhanh', b: 'Lực cản tăng theo bình phương vận tốc. Mỗi nhịp, lực phụt tăng tốc chuông; lực cản và lực ngược khi giãn hãm lại. Robot còn phải kéo theo một khối nước: trong bài lấy bằng nửa khối nước trong khoang, khoảng 430 kg, nhiều gấp năm lần chính nó.', e: 'F_cản = ½·ρ·C·A·v² · (m + m_nước)·a = F_phụt + F_cản + F_nổi'},
  {k: 'RHOPALIA · THĂNG BẰNG', t: 'Tám cơ quan giữ thăng bằng', b: 'Sứa bờm sư tử có tám rhopalia ở tám khía giữa các thuỳ chuông, mỗi cái chứa hạt đá thăng bằng. Bị đẩy nghiêng, phía thấp co mạnh hơn và chuông tự dựng lại sau vài nhịp. Tắt rhopalia rồi đẩy lần nữa: chuông giữ độ nghiêng, lực phụt lệch trục, robot bơi chéo.', e: 'chuông nghiêng φ → cánh tay phía thấp co thêm → mô men dựng lại'},
  {k: 'LƠ LỬNG · ĐIỀU KHIỂN PHẢN HỒI', t: 'Giữ một độ sâu', b: 'Robot nặng hơn lực đẩy Acsimet 3 N nên tự chìm từ từ. Ở chế độ lơ lửng, mỗi đầu nhịp lõi điện tử so độ sâu với độ sâu cần giữ: chìm sâu hơn thì co mạnh, nổi cao hơn thì co nhẹ hoặc bỏ nhịp. Đổi nổi dư để xem bộ điều khiển xoay xở.', e: 'biên độ = 0,12 + 1,2·(z_cần − z) − 1,6·v'},
  {k: 'TÁCH RỜI · 8 CỤM', t: 'Nhìn vào bên trong', b: 'Lõi điện tử nhấc lên, chuông silicone tách khỏi vòng co, tua, tay miệng, rhopalia rời ra. Bấm từng hệ ở bảng 05 để cô lập và soi.', e: 'lõi → vòng co → chuông → rhopalia, đèn → giá tua → tua · tay miệng'},
  {k: 'TẾ BÀO GAI · 700 NS', t: 'Kim phóng với gia tốc 5 triệu g', b: 'Đầu tua sứa thật chứa hàng nghìn tế bào gai. Đo trên Hydra (Nüchter và cộng sự, 2006): cả quá trình phóng khoảng 700 ns, gia tốc tới 5,41 triệu g, áp suất trong nang 15 MPa. Thử kiểm bằng v = a·t: được khoảng 37 m/s, khớp vận tốc đo được 18,5–37,1 m/s.', e: 'v = a·t = 5,41·10⁶ · 9,81 · 7·10⁻⁷ ≈ 37 m/s'},
  {k: 'LẮP RÁP · THỨ TỰ VÀ LỐI VÀO', t: 'Lắp từ lõi ra ngoài', b: 'Bấm “Lắp ráp”: tám cụm nằm dưới đáy giếng, em tự chọn cụm lắp tiếp. Máy kiểm thứ tự (cụm đỡ nó đã có chưa) và lối vào (chuông silicone phủ lên rồi thì tuốc nơ vít còn tới được vít cánh tay không). Quy trình rút gọn để học.', e: 'lõi → vòng co → chuông → rhopalia, đèn · giá tua → tua · tay miệng',
    ask: {q: 'Vì sao phải bắt vòng co vào lõi trước khi phủ chuông silicone?', o: ['Vì vòng co nặng', 'Vì chuông phủ lên rồi thì tuốc nơ vít không còn lối tới vít cánh tay', 'Vì rhopalia cần vòng co để sáng'], a: 1, e: 'Đó là kiểm “lối vào”: cụm che mất đường của dụng cụ phải lắp sau.'}},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1, {click: 'swim'}); at(8, {click: 'v_close'}); at(13, {click: 'v_hero'});
at(22, {cap: 1}); at(22.5, {click: 'rest'}); at(24, {click: 'v_side'}); at(30, {click: 'swim'}); at(34, {click: 'v_hero'});
at(36, {cap: 2}); at(36.5, {slide: 'duty', to: 0.78, dur: 1.4}); at(43, {slide: 'duty', to: 1 / 3, dur: 1}); at(44, {click: 'v_close'});
at(46, {cap: 3}); at(46.3, {click: 'v_hero'}); at(46.8, {click: 'rest'}); at(52, {click: 'swim'}); at(53, {slide: 'a', to: 0.95, dur: 1.4}); at(57.5, {slide: 'a', to: 0.775, dur: 1});
at(60, {cap: 4}); at(60.4, {click: 'tilt'}); at(61, {click: 'v_side'}); at(66, {click: 'rhopon'}); at(67, {click: 'tilt'}); at(72, {click: 'rhopon'}); at(73, {click: 'v_hero'});
at(75, {cap: 5}); at(75.4, {click: 'hover'}); at(77, {slide: 'B', to: 0.15, dur: 1.4}); at(83, {slide: 'B', to: 0.425, dur: 1});
at(87, {cap: 6}); at(87.5, {click: 'explode'}); at(91, {click: 'iso_vong'}); at(96, {click: 'iso_rhop'}); at(100, {do: () => LIVE.closeInspect()}); at(101, {click: 'explode'});
at(103, {cap: 7}); at(103.5, {click: 'v_close'}); at(104.5, {click: 'gai'}); at(111, {do: () => LIVE.closeInspect()}); at(111.5, {click: 'v_hero'});
at(113, {cap: 8}); at(113.4, {do: () => sim.act('asm_demo')});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 135}, firstView: 'hero', extra: [{key: 'asm', label: 'Lắp ráp'}, {key: 'explode', label: 'Tách rời'}, {key: 'gai', label: 'Phóng gai'}],
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_close', b: 'swim', h: 'hover', r: 'rest', t: 'tilt', g: 'gai', f: 'flow', n: 'labels', x: 'xray', e: 'explode'}});
