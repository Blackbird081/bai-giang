// Hải đăng khung sắt Sanibel Island (1884): trang chạy trực tiếp. Lắp dựng từng nhóm cấu kiện theo tám giai đoạn, mặt cắt,
// chớp đèn Fl(2) W 10s và tầm nhìn, gió ngang và lực trong bốn chân (kin.js). Bố cục thông tin (khung tên bản vẽ, trình tự
// dựng dạng Gantt, cấu kiện đang cẩu với tải móc, nhật ký LẮP/KIỂM, dải tám giai đoạn) phỏng theo video bản vẽ lắp dựng hải đăng
// của 0xWast3 trên X; giao diện là bộ robotics Sáng Ăn Khoai.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {LH, geoRange, flash, wind, legForces} from './kin.js';

const PI = Math.PI, G = 9.81;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 18, grid: 1, fade: 90, fov: 26, near: 0.3, far: 400});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -PI / 2; st.scene.add(world);
const root = new THREE.Group(); world.add(root);
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const v3 = (p) => new THREE.Vector3(p[0], p[1], p[2]);
const rod = (a, b, r, mat, parent, n = 12) => { const A = v3(a), B = v3(b), L = A.distanceTo(B), g = new THREE.CylinderGeometry(r, r, L, n); const m = mk(g, mat, parent); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return {m, L}; };

// ---------------- vật liệu: gang trần xám trước khi sơn
const M = {iron: MAT.satin('#5a5f66'), leg: [0, 1, 2, 3].map(() => MAT.satin('#5a5f66')), cyl: MAT.satin('#5a5f66'), room: MAT.satin('#5a5f66'), glass: MAT.glass('#cfe0ea'), brass: MAT.gold(), lens: new THREE.MeshPhysicalMaterial({color: '#e8f3f7', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1}), conc: MAT.satin('#b7b2a8'), step: MAT.anod('#8d9298')};
const RAW = new THREE.Color('#5a5f66'), PAINT = {iron: new THREE.Color('#3b3632'), room: new THREE.Color('#f1efe9')};

// ---------------- thao tác lắp
const OPS = [], STAGES = ['Cọc móng', 'Đoạn 1', 'Đoạn 2', 'Đoạn 3', 'Đoạn 4', 'Phòng trực · đèn', 'Sơn', 'Mặt cắt A-A'];
function op(stage, name, qty, mat, part, build, extra = {}) {
  const g = new THREE.Group(); root.add(g); g.visible = false; let vol = 0;
  const add = (m, v = 0) => { vol += v; return m; };
  build(g, add); tag(part, g);
  const o = {stage, name, qty, mat, g, part, mass: vol * LH.iron + (extra.kg || 0), at: extra.at || '', fix: extra.fix || '—', note: extra.note || '', sec: extra.sec ?? -1, A: extra.A || 0, zc: extra.zc || 0, k: 0};
  OPS.push(o); return o;
}
const tube = (ro, t, L) => PI * (ro * ro - (ro - t) ** 2) * L;
const corner = (z, k) => { const h = LH.half(z), s = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k]; return [s[0] * h, s[1] * h, z]; };
op(0, 'Cọc sắt', 4, 'gang', 'coc', (g, add) => { for (let k = 0; k < 4; k++) { const [x, y] = corner(0, k); add(rod([x, y, -4], [x, y, 0.4], 0.2, M.iron, g), tube(0.2, 0.03, 4.4)); add(mk(SH.roundCyl(0.6, -4.1, -3.95, 0.02), M.iron, g), 0.04).position.set(x, y, 0); } }, {at: 'bốn góc móng, sâu 4 m (giả định)', fix: 'đóng xuống cát', note: 'Móng cọc sắt, xong đầu năm 1884.'});
op(0, 'Bệ chân cột', 4, 'gang', 'coc', (g, add) => { for (let k = 0; k < 4; k++) { const [x, y] = corner(0, k); add(mk(SH.rbox(1.0, 1.0, 0.3, 0.05), M.iron, g), 0.3 * 0.2).position.set(x, y, 0.4); } }, {at: 'đầu cọc', fix: 'bu lông mặt bích'});
const SECS = [];
for (let s = 0; s < LH.sec; s++) {
  const z0 = s * LH.hs, z1 = z0 + LH.hs, stage = s + 1, T = `đoạn ${s + 1}`, zc = (z0 + z1) / 2, hw = LH.half(zc) * 2;
  let Aleg = 0;
  const legs = op(stage, `Chân cột ${T}`, 4, 'gang', `${s}:chan`, (g, add) => { for (let k = 0; k < 4; k++) { const r = rod(corner(z0 + (s ? 0 : 0.55), k), corner(z1, k), 0.15 - s * 0.015, M.leg[k], g); r.m.userData.leg = k; add(r.m, tube(0.15 - s * 0.015, 0.025, r.L)); Aleg = 2 * 0.3 * r.L; } }, {sec: s, at: `cao ${vn(z0, 1)} → ${vn(z1, 1)} m`, fix: 'mặt bích, bu lông', note: 'Bốn chân là ống gang nghiêng vào trong: khung hình chóp vuông, đáy rộng đỉnh hẹp.'});
  op(stage, `Giằng ngang ${T}`, 8, 'gang', `${s}:giang`, (g, add) => { for (let k = 0; k < 4; k++) { const a = corner(z1, k), b = corner(z1, (k + 1) % 4); add(rod(a, b, 0.07, M.iron, g).m, PI * 0.0049 * Math.hypot(a[0] - b[0], a[1] - b[1])); const r = Math.hypot(a[0], a[1]), u = [a[0] / r, a[1] / r]; add(rod([u[0] * 0.95, u[1] * 0.95, z1], a, 0.05, M.iron, g).m, 0.01); } }, {sec: s, at: `cao ${vn(z1, 1)} m`, fix: 'chốt, bu lông', note: 'Vòng giằng ngang và bốn thanh chống giữ ống cầu thang ở giữa.'});
  let Abr = 0;
  op(stage, `Giằng chéo chữ X ${T}`, 8, 'thép thanh', `${s}:cheo`, (g, add) => { for (let k = 0; k < 4; k++) { const a0 = corner(z0, k), b0 = corner(z0, (k + 1) % 4), a1 = corner(z1, k), b1 = corner(z1, (k + 1) % 4); for (const [p, q] of [[a0, b1], [b0, a1]]) { const r = rod(p, q, 0.05, M.iron, g, 8); add(r.m, PI * 0.05 * 0.05 * r.L); Abr = 2 * 0.1 * r.L; } } }, {sec: s, at: 'bốn mặt khung', fix: 'tai bắt, tăng đơ', note: 'Hai thanh chéo chia mỗi ô thành tam giác: tam giác không biến dạng, ô vuông thì có.'});
  const c0 = Math.max(z0, LH.stair0), Hc = z1 - c0;
  const cyl = op(stage, `Ống cầu thang ${T}`, 1, 'tôn sắt', `${s}:ong`, (g, add) => {
    add(mk(new THREE.CylinderGeometry(0.95, 0.95, Hc, 32, 1, true).rotateX(PI / 2).translate(0, 0, c0 + Hc / 2), M.cyl, g), 2 * PI * 0.95 * 0.012 * Hc).material.side = THREE.DoubleSide;
    const n = Math.round(Hc / 0.2), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.28, 0.04), M.step, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const z = c0 + i * 0.2, a = z * 1.9; q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a); m4.compose(new THREE.Vector3(0.45 * Math.cos(a), 0.45 * Math.sin(a), z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }
    g.add(im); add(im, n * 0.8 * 0.28 * 0.012);
    if (!s) { const r = rod([3.2, 0, 0.1], [0.95, 0, LH.stair0], 0.05, M.iron, g); add(r.m, 0.02); mk(SH.rbox(0.9, 0.1, 2.0, 0.02), M.room, g).position.set(0.97, 0, LH.stair0 + 1.0); }
  }, {sec: s, at: `cao ${vn(c0, 1)} → ${vn(z1, 1)} m`, fix: 'mặt bích tròn', note: s ? 'Ống tôn sắt bọc cầu thang xoắn ở giữa khung.' : 'Cửa và cầu thang xoắn bắt đầu cao khoảng 3 m (10 ft) trên mặt đất.'});
  SECS.push({s, zc, A: 2 * 2 * 0.3 * LH.hs * 1.02 + 2 * 2 * 0.07 * Math.hypot(hw, LH.hs) + 1.9 * Hc, ops: [legs, cyl]});
}
const zR = LH.top;
op(5, 'Sàn ban công, lan can', 1, 'gang', 'phong', (g, add) => { add(mk(SH.roundCyl(2.5, -0.15, 0, 0.02, 0.02, 8), M.iron, g), PI * 6.25 * 0.15 * 0.3).position.z = zR; for (let k = 0; k < 16; k++) { const a = (k * PI) / 8; add(rod([2.4 * Math.cos(a), 2.4 * Math.sin(a), zR], [2.4 * Math.cos(a), 2.4 * Math.sin(a), zR + 1.0], 0.025, M.iron, g, 6).m, 0.002); } add(mk(new THREE.TorusGeometry(2.4, 0.04, 8, 48), M.iron, g), 0.01).position.z = zR + 1.0; }, {at: `cao ${vn(zR, 1)} m`, fix: 'bu lông vào đầu khung'});
op(5, 'Phòng trực', 1, 'gang', 'phong', (g, add) => { add(mk(SH.roundCyl(1.65, 0, 2.1, 0.02, 0.02, 8), M.room, g), 2 * PI * 1.65 * 0.015 * 2.1).position.z = zR; for (let k = 0; k < 4; k++) { const a = (k * PI) / 2 + PI / 8, w = mk(new THREE.CircleGeometry(0.2, 18), M.glass, g); w.position.set(1.66 * Math.cos(a), 1.66 * Math.sin(a), zR + 1.2); w.rotation.set(PI / 2, 0, a + PI / 2); } }, {at: 'trên sàn ban công', fix: 'tấm gang ghép mặt bích', note: 'Người gác đèn trực ở đây: lên dây cót bộ quay thấu kính, châm dầu, lau kính.'});
const zL = zR + 2.1;
op(5, 'Lồng kính đèn', 8, 'đồng, kính', 'den', (g, add) => { add(mk(new THREE.CylinderGeometry(1.25, 1.25, 2.2, 8, 1, true).rotateX(PI / 2).translate(0, 0, zL + 1.1), M.glass, g)); for (let k = 0; k < 8; k++) { const a = (k * PI) / 4 + PI / 8; add(rod([1.26 * Math.cos(a), 1.26 * Math.sin(a), zL], [1.26 * Math.cos(a), 1.26 * Math.sin(a), zL + 2.2], 0.03, M.brass, g, 6).m, 0.002); } add(mk(SH.roundCyl(1.35, -0.25, 0, 0.03, 0.03, 8), M.room, g), 0.05).position.z = zL; }, {at: `trên phòng trực, cao ${vn(zL, 1)} m`, fix: 'khung đồng, ron chì'});
const lensG = new THREE.Group();
const lensOp = op(5, 'Thấu kính Fresnel bậc 3', 1, 'kính, đồng', 'lens', (g) => { g.add(lensG); lensG.position.z = LH.lens; for (let k = 0; k < 9; k++) { const zz = -0.5 + k * 0.125, r = 0.5 * Math.sqrt(1 - (zz / 0.62) ** 2); mk(new THREE.TorusGeometry(r, 0.035, 8, 40), M.lens, lensG).position.z = zz; } mk(SH.roundCyl(0.12, -0.08, 0.08, 0.02), M.brass, lensG); for (const a of [0, (LH.split * PI) / 180]) { const p = mk(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 16, 1, true, -0.25, 0.5).rotateX(PI / 2), M.lens, lensG); p.rotation.z = a; } }, {kg: 900, at: `tâm đèn cao ${vn(LH.lens, 1)} m, ${vn(LH.focal, 1)} m trên mực nước biển`, fix: 'bệ quay', note: 'Bậc 3: tiêu cự 500 mm. Các vành lăng kính bẻ tia sáng từ ngọn đèn thành chùm gần song song.'});
op(5, 'Mái vòm, quả thông gió', 2, 'đồng', 'den', (g, add) => { add(mk(new THREE.SphereGeometry(1.4, 24, 10, 0, 2 * PI, 0, PI / 2).rotateX(PI / 2), M.room, g), 0.08).position.z = zL + 2.2; add(mk(new THREE.SphereGeometry(0.25, 16, 12), M.room, g), 0.01).position.z = zL + 3.75; }, {at: 'đỉnh tháp', fix: 'bu lông vòng'});
op(6, 'Sơn khung, trắng phòng đèn', 1, 'sơn', 'son', () => {}, {note: 'Màu sơn trong bài chỉ để thấy giai đoạn sơn.'});
op(7, 'Mặt cắt A-A', 1, '—', 'cat', () => {}, {note: 'Cắt đôi tháp qua trục để thấy ống cầu thang xoắn, cửa ở cao 3 m, thấu kính.'});
const N_OPS = OPS.length, stageEnd = STAGES.map((_, k) => OPS.reduce((m, o, j) => (o.stage === k ? j + 1 : m), 0));
const MATS = new Set(); root.traverse((o) => { if (o.isMesh) MATS.add(o.material); });
const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
// chùm sáng: hai nón vàng nhạt quay theo thấu kính; mũi tên gió
const beamMat = new THREE.MeshBasicMaterial({color: '#ffd76a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide});
const beams = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(4, 70, 24, 1, true).rotateZ(PI / 2).translate(35, 0, 0), beamMat); world.add(m); return m; });
const windArrows = [0, 1, 2, 3].map((k) => { const g = new THREE.Group(); const sh = mk(new THREE.CylinderGeometry(0.12, 0.12, 1, 8).rotateZ(PI / 2).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({color: C.or}), g); const h = mk(new THREE.ConeGeometry(0.35, 0.8, 12).rotateZ(-PI / 2).translate(0.4, 0, 0), new THREE.MeshBasicMaterial({color: C.or}), g); g.userData = {sh, h, k}; world.add(g); return g; });

// ---------------- trạng thái
const S = {k: 0, auto: true, wait: 0.6, paint: 0, sect: false, light: true, v: 0, eye: 5, t: 0, log: [], disp: {labels: true, xray: false}, hist: []};
const say = (t, s) => { if (S.log[0]?.[1] === s) return; S.log.unshift([t, s]); S.log.length = Math.min(S.log.length, 3); };
const fmtM = (kg) => (kg > 1500 ? `≈ ${vn(kg / 1000, 1)} t` : kg > 0 ? `≈ ${vn(kg, 0)} kg` : '—');

// ---------------- bảng
ui.header({code: 'Sanibel', kicker: 'HẢI ĐĂNG KHUNG SẮT · Florida · 1884 · thấu kính Fresnel bậc 3', title: 'Hải đăng khung sắt', sub: 'LẮP DỰNG · MÔ MEN LẬT · CHỚP ĐÈN · TẦM NHÌN', hub: HUB_URL,
  right: [['30 m', 'THÁP CAO'], ['31 m', 'TÂM ĐÈN TRÊN MẶT BIỂN'], ['Fl(2) W 10s', 'ĐẶC TÍNH ĐÈN, 1933'], ['13 hải lí', 'TẦM']]});
const strip = ui.add(`<div style="position:absolute;left:348px;top:82px;width:904px;display:flex;gap:4px;pointer-events:auto">${STAGES.map((n, i) => `<button type="button" data-s="${i}" style="flex:1;min-width:0;padding:3px 0 5px;border:0;border-bottom:2px solid ${C.line};background:none;text-align:left;font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${n}</button>`).join('')}</div>`);
strip.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; LIVE.takeOver(); sim.act('stage' + b.dataset.s); });
ui.panel(28, 112, 300, 214, 'KHUNG TÊN BẢN VẼ', '01');
const TB = [['Công trình', 'Sanibel Island Light'], ['Thắp lần đầu', '20/8/1884'], ['Kiểu', 'chóp vuông khung sắt'], ['Móng', 'cọc sắt'], ['Đèn', 'Fresnel bậc 3 · f 500 mm'], ['Bước', ''], ['Giai đoạn', '']];
const tbV = TB.map(([a, b], i) => { ui.text(42, 146 + i * 24, a); ui.rule(42, 163 + i * 24, 272); return ui.text(130, 144 + i * 24, b, 'v', 'width:184px;text-align:right;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'); });
ui.panel(28, 338, 300, 196, 'TRÌNH TỰ DỰNG', '02');
ui.buttons([['build', 'DỰNG'], ['step', 'TỪNG BƯỚC'], ['reset', 'DỰNG LẠI']], 42, 372, 272);
const gantt = ui.svg(42, 404, 272, 120);
ui.panel(28, 546, 300, 220, 'CẤU KIỆN ĐANG CẨU', '03');
const AC = ['Cấu kiện', 'Bước', 'Số lượng · vật liệu', 'Khối lượng ước', 'Tải móc cẩu', 'Liên kết', 'Lắp vào'];
const acV = AC.map((a, i) => { ui.text(42, 580 + i * 20, a); return ui.text(150, 578 + i * 20, '', 'v', 'width:164px;text-align:right;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'); });
const acNote = ui.text(42, 724, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 230, 'ĐÈN · Fl(2) W 10s', '04');
ui.buttons([['light', 'BẬT ĐÈN']], 1286, 146, 272);
const flashSvg = ui.svg(1286, 178, 272, 40);
const eyeSl = ui.slider('eye', 1286, 238, 272, 'MẮT NGƯỜI XEM', {lw: 92, vw: 70});
const rangeSvg = ui.svg(1286, 256, 272, 42);
const rangeTxt = ui.text(1286, 302, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(1272, 354, 300, 256, 'GIÓ NGANG · LỰC TRONG CHÂN', '05');
const windSl = ui.slider('v', 1286, 392, 272, 'GIÓ', {lw: 60, vw: 92});
ui.text(1286, 416, 'TỔNG LỰC GIÓ (kN)'); const fW = ui.text(1286, 429, '', 'mo', 'position:absolute;font-size:22px;font-weight:700');
ui.text(1430, 416, 'MÔ MEN LẬT (kN·m)'); const fM = ui.text(1430, 429, '', 'mo', 'position:absolute;font-size:22px;font-weight:700');
const legBars = ['CHÂN 1', 'CHÂN 2', 'CHÂN 3', 'CHÂN 4'].map((n, i) => ui.bar(1286, 470 + i * 19, 272, n, {lw: 52, vw: 82, center: true}));
const wTxt = ui.text(1286, 548, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(1272, 622, 300, 144, 'HIỂN THỊ · NHẬT KÝ', '06');
ui.buttons([['sect', 'MẶT CẮT A-A'], ['paint', 'SƠN'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 654, 272);
const logRows = [0, 1, 2].map((k) => ui.text(1286, 716 + k * 13, '', 'v', 'font-size:10px;font-weight:500;width:272px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_front', 'CHÍNH DIỆN'], ['v_lamp', 'PHÒNG ĐÈN'], ['v_sect', 'NHÌN MẶT CẮT']], 360, 120, 600);
ui.text(362, 664, 'CHẾ ĐỘ');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'den', title: 'LỒNG ĐÈN', sub: 'FRESNEL BẬC 3'}, {key: 'phong', title: 'PHÒNG TRỰC', sub: 'BAN CÔNG'}, {key: 'cheo', title: 'GIẰNG CHÉO CHỮ X', sub: 'ĐOẠN 2'},
  {key: 'ong', title: 'ỐNG CẦU THANG', sub: 'CỬA CAO 3 M'}, {key: 'chan', title: 'CHÂN ỐNG GANG', sub: '—'}, {key: 'coc', title: 'CỌC SẮT', sub: 'MÓNG'},
]);
const callSub = Object.fromEntries(['den', 'phong', 'cheo', 'ong', 'chan', 'coc'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- mô phỏng
const disp = S.disp;
const builtW = () => OPS.reduce((w, o, j) => w + (j < S.k ? o.mass : 0), 0) * G;
const setBuilt = (k) => { S.k = Math.max(0, Math.min(N_OPS, k)); OPS.forEach((o, j) => { o.g.visible = j < S.k; o.k = j < S.k ? 1 : 0; o.g.position.z = 0; }); S.sect = S.k >= N_OPS; S.paintT = S.k > OPS.findIndex((o) => o.part === 'son') ? 1 : 0; S.paint = S.paintT; };
let clipOn = null;
const applyClip = () => { if (S.sect === clipOn) return; clipOn = S.sect; for (const m of MATS) { m.clippingPlanes = S.sect ? [clip] : null; m.needsUpdate = true; } st.ground.visible = !S.sect; };
let lookKey = '';
const applyLook = () => { const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key; xray(root, disp.xray ? 1 : 0, (m) => { for (let x = m; x; x = x.parent) if (/ong|lens/.test(x.userData.part || '')) return true; return false; }); };
function placeNext() {
  if (S.k >= N_OPS) { S.auto = false; return; }
  if (S.auto && OPS[S.k].part === 'cat') { S.auto = false; say('KIỂM', 'dựng xong · bấm Mặt cắt A-A để xem bên trong'); return; }
  const o = OPS[S.k]; o.g.visible = true; o.k = 0.001; S.k++;
  say('LẮP', `${o.name.toLocaleLowerCase('vi')} · ${o.qty} chiếc · ${fmtM(o.mass)}`);
  if (o.part === 'son') S.paintT = 1;
  const nxt = OPS[S.k]; if (o.stage !== nxt?.stage) say('KIỂM', `${STAGES[o.stage].toLocaleLowerCase('vi')}: đủ ${OPS.filter((x) => x.stage === o.stage).length} thao tác · khung thẳng đứng`);
}
const defaults = () => { Object.assign(S, {auto: true, wait: 0.6, paint: 0, paintT: 0, light: true, v: 0, eye: 5, t: 0, log: [], hist: []}); setBuilt(0); };
const lightReady = () => S.k > OPS.indexOf(lensOp);
const sim = {
  S,
  reset() { defaults(); Object.assign(disp, {labels: true, xray: false}); say('KIỂM', 'mặt bằng trống · bắt đầu đóng cọc'); },
  busy: () => false,
  isOn: (k) => (k === 'sect' && S.sect) || (k === 'light' && S.light),
  act(k) {
    if (k.startsWith('stage')) { const s = +k.slice(5); setBuilt(stageEnd[s]); S.auto = false; say('KIỂM', `xong giai đoạn ${s + 1}: ${STAGES[s].toLocaleLowerCase('vi')}`); return; }
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'build') { if (S.k >= N_OPS) setBuilt(0); S.auto = !S.auto; return; }
    if (k === 'step') { S.auto = false; placeNext(); return; }
    if (k === 'reset') { setBuilt(0); S.auto = true; say('KIỂM', 'tháo hết · dựng lại từ cọc móng'); return; }
    if (k === 'sect') { S.sect = !S.sect; return; }
    if (k === 'paint') { S.paintT = S.paint > 0.5 ? 0 : 1; return; }
    if (k === 'light') { S.light = !S.light; say('KIỂM', S.light ? 'bật đèn · Fl(2) W 10s' : 'tắt đèn'); }
  },
  slide(k, t) { if (k === 'v') S.v = t * 70; if (k === 'eye') S.eye = 1 + t * 29; },
  keyDown() { return false; },
  step(dt) {
    S.t += dt;
    if (S.auto) { S.wait -= dt * 1.15; if (S.wait <= 0) { placeNext(); S.wait = 0.75; } }
    for (const o of OPS) if (o.k > 0 && o.k < 1) { o.k = Math.min(1, o.k + dt * 2.2); o.g.position.z = 4 * (1 - o.k) ** 2; }
    S.paint += ((S.paintT || 0) - S.paint) * Math.min(1, dt * 2);
  },
  shadowAt() { return new THREE.Vector3(0, 12, 0); },
  pick: picker((part) => cardOf(part)),
  draw() {
    applyClip(); applyLook();
    for (const m of [M.iron, M.cyl, ...M.leg]) m.color.copy(RAW).lerp(PAINT.iron, S.paint);
    M.room.color.copy(RAW).lerp(PAINT.room, S.paint);
    // đèn: thấu kính quay một vòng 10 s, hai tấm lệch 30°; chùm sáng theo hai tấm
    const on = S.light && lightReady(), ang = ((S.t / LH.period) * 2 * PI) % (2 * PI);
    lensG.rotation.z = ang;
    beams.forEach((b, i) => { b.visible = on; b.position.set(0, 0, LH.lens); b.rotation.set(0, 0, ang + (i ? (LH.split * PI) / 180 : 0)); });
    beamMat.opacity = on ? 0.22 : 0;
    const I = on ? flash(S.t) : 0;
    // gió: lực trên các đoạn đã dựng, mô men lật, lực dọc bốn chân
    const secs = SECS.filter((s) => s.ops.every((o) => OPS.indexOf(o) < S.k)).map((s) => ({A: s.A, zc: s.zc}));
    if (S.k > OPS.indexOf(lensOp)) secs.push({A: 2 * 2.6 * 4.5, zc: LH.top + 2.5});
    const Wd = wind(S.v, secs), W = builtW(), N = legForces(W, Wd.M);
    S.N = N; S.Wd = Wd; S.W = W;
    windArrows.forEach((g, k) => { const s = secs[k]; const on2 = S.v > 1 && s; g.visible = !!on2; if (!on2) return; const L = Math.min(9, 0.5 + Wd.F[k] / 400); g.userData.sh.scale.x = L; g.userData.h.position.x = L - 0.4; g.position.set(-LH.half(s.zc) - L - 1.2, 0, s.zc); });
    N.forEach((n, k) => { M.leg[k].emissive.set(n < 0 ? '#c4271c' : '#000000'); M.leg[k].emissiveIntensity = n < 0 ? Math.min(0.9, -n / 60000 + 0.25) : 0; });
    // bảng 01–03
    const done = S.k >= N_OPS, last = OPS[Math.max(0, S.k - 1)], show = S.k ? last : OPS[0];
    tbV[5].textContent = `${String(S.k).padStart(3, '0')} / ${String(N_OPS).padStart(3, '0')}`; tbV[6].textContent = STAGES[show.stage];
    let gs = ''; STAGES.forEach((nm, sI) => {
      const ids = OPS.map((x, j) => [x, j]).filter(([x]) => x.stage === sI), a = ids[0][1], b = ids[ids.length - 1][1] + 1, x0 = 92 + (a / N_OPS) * 180, w = Math.max(3, ((b - a) / N_OPS) * 180), fill = Math.max(0, Math.min(1, (S.k - a) / (b - a)));
      gs += `<text x="0" y="${sI * 15 + 10}" font-family="Be Vietnam Pro" font-size="9.5" font-weight="600" fill="${fill > 0 && fill < 1 ? C.ink : C.mute}">${String(sI + 1).padStart(2, '0')} ${nm.split(' ·')[0]}</text><rect x="${x0}" y="${sI * 15 + 2}" width="${w}" height="10" fill="${C.chart}" stroke="${C.line}"/><rect x="${x0}" y="${sI * 15 + 2}" width="${w * fill}" height="10" fill="${fill >= 1 ? C.ink : C.or}"/>`;
    });
    gs += `<line x1="${92 + (S.k / N_OPS) * 180}" x2="${92 + (S.k / N_OPS) * 180}" y1="0" y2="120" stroke="${C.or}" stroke-width="1.5"/>`;
    gantt.innerHTML = gs;
    acV[0].textContent = show.name; acV[1].textContent = `${String(Math.max(1, S.k)).padStart(3, '0')} / ${N_OPS} · giai đoạn ${show.stage + 1}`; acV[2].textContent = `${show.qty} · ${show.mat}`;
    acV[3].textContent = fmtM(show.mass); acV[4].textContent = show.mass ? `${vn((show.mass * G) / 1000, 1)} kN` : '—'; acV[5].textContent = show.fix; acV[6].textContent = show.at || '—'; acNote.textContent = show.note || '';
    // bảng 04: dải 10 giây của đặc tính đèn, tầm nhìn
    let fs = `<rect x="0" y="6" width="272" height="20" fill="${C.chart}" stroke="${C.line}"/>`;
    for (let i = 0; i < 272; i++) { const v = flash((i / 272) * LH.period); if (v > 0.02) fs += `<rect x="${i}" y="${26 - 20 * v}" width="1" height="${20 * v}" fill="${C.or}"/>`; }
    const cx = ((S.t % LH.period) / LH.period) * 272; fs += `<line x1="${cx}" x2="${cx}" y1="2" y2="30" stroke="${C.ink}" stroke-width="1.2"/><text x="0" y="40" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">0 s</text><text x="272" y="40" text-anchor="end" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">10 s · lặp lại</text>`;
    flashSvg.innerHTML = fs;
    eyeSl.set((S.eye - 1) / 29, `${vn(S.eye, 0)} m`);
    const dG = geoRange(LH.focal, S.eye), dU = Math.min(dG, LH.nominal);
    let rs = `<path d="M0 40 Q136 22 272 40" fill="none" stroke="${C.line}" stroke-width="1.5"/><line x1="8" y1="38" x2="8" y2="${38 - Math.min(30, LH.focal * 0.8)}" stroke="${C.ink}" stroke-width="2"/>`;
    const px = 8 + Math.min(1, dG / 30) * 256; rs += `<line x1="8" y1="${38 - Math.min(30, LH.focal * 0.8)}" x2="${px}" y2="${36 - Math.min(14, S.eye * 0.5)}" stroke="${C.or}" stroke-dasharray="3 2"/><line x1="${px}" y1="36" x2="${px}" y2="${36 - Math.min(14, S.eye * 0.5)}" stroke="${C.ink}" stroke-width="2"/>`;
    rangeSvg.innerHTML = rs;
    rangeTxt.innerHTML = `Tầm địa lí d = 2,08(√31 + √${vn(S.eye, 0)}) = <b>${vn(dG, 1)} hải lí</b>; tầm sáng của đèn 13 hải lí → thấy được tới <b>${vn(dU, 1)} hải lí</b> (${vn(dU * 1.852, 0)} km). ${dG < LH.nominal ? 'Độ cong Trái Đất giới hạn.' : 'Độ sáng của đèn giới hạn.'}`;
    // bảng 05
    windSl.set(S.v / 70, `${vn(S.v, 0)} m/s`);
    fW.textContent = vn(Wd.Ft / 1000, 1); fM.textContent = vn(Wd.M / 1000, 0);
    N.forEach((n, i) => legBars[i].set(n / Math.max(1, W / 2), `${n < 0 ? 'kéo ' : 'nén '}${vn(Math.abs(n) / 1000, 0)} kN`, n < 0 ? '#B3261E' : C.or));
    wTxt.innerHTML = `Gió ${vn(S.v * 3.6, 0)} km/h. Trọng lượng phần đã dựng <b>${vn(W / 1000, 0)} kN</b> (gang 7 200 kg/m³, ước). Gió thổi từ trái: chân 1 và 4 đón gió mất bớt nén; khi mô men lật lớn hơn W·b/2, chân phía gió bị kéo, cọc phải giữ tháp khỏi bị nhổ.`;
    logRows.forEach((r, i) => { const l = S.log[i]; r.innerHTML = l ? `<span style="color:${l[0] === 'KIỂM' ? '#1F7A4D' : C.or};font-weight:700">${l[0]}</span>&nbsp;&nbsp;${l[1]}` : ''; r.style.opacity = 1 - i * 0.25; });
    modeEl.textContent = S.sect ? 'Mặt cắt A-A' : S.v > 25 ? 'Gió bão' : on && done ? 'Đèn sáng' : done ? 'Hoàn thành' : S.auto ? 'Đang lắp' : 'Tạm dừng';
    modeSub.textContent = `bước ${String(S.k).padStart(3, '0')}/${N_OPS} · ${STAGES[show.stage].toLocaleLowerCase('vi')} · ${show.name.toLocaleLowerCase('vi')} · gió ${vn(S.v, 0)} m/s${on ? ` · chớp ${vn(I * 100, 0)} %` : ''}`;
    ui.setOn('build', S.auto); ui.setOn('sect', S.sect); ui.setOn('paint', S.paint > 0.5); ui.setOn('light', S.light);
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]);
    strip.querySelectorAll('[data-s]').forEach((b, i) => { const a = i ? stageEnd[i - 1] : 0, on3 = S.k > a && S.k <= stageEnd[i]; b.style.borderBottomColor = S.k >= stageEnd[i] ? C.ink : on3 ? C.or : C.line; b.style.color = on3 || S.k >= stageEnd[i] ? C.ink : C.mute; });
    alert.set(N.some((n) => n < 0) ? 'CHÂN PHÍA GIÓ BỊ KÉO · CỌC CHỊU NHỔ' : '');
    // nhãn
    const W3 = (x, y, z) => { const v = new THREE.Vector3(x, y, z); world.localToWorld(v); return st.project(v.x, v.y, v.z); };
    const vis = (re) => OPS.some((o, j) => re.test(o.part) && j < S.k);
    if (callSub.chan) callSub.chan.textContent = `chân 1 · ${N[0] < 0 ? 'kéo' : 'nén'} ${vn(Math.abs(N[0]) / 1000, 0)} kN`;
    const c1 = corner(LH.hs * 0.5, 0), c2 = corner(LH.hs * 1.5, 1);
    ui.drawCallouts([
      {key: 'den', p: vis(/^den$/) ? W3(1.2, -1.0, LH.lens) : null, dx: 110, dy: -20}, {key: 'phong', p: vis(/^phong$/) ? W3(1.7, -0.4, LH.top + 1) : null, dx: 120, dy: 20},
      {key: 'cheo', p: vis(/^1:cheo$/) ? W3(c2[0] * 0.5, c2[1], LH.hs * 1.5) : null, dx: 120, dy: 10}, {key: 'ong', p: vis(/^0:ong$/) ? W3(0.95, 0, LH.stair0 + 1) : null, dx: 130, dy: 30},
      {key: 'chan', p: vis(/^0:chan$/) ? W3(c1[0], c1[1], c1[2]) : null, dx: -120, dy: 0}, {key: 'coc', p: vis(/^coc$/) && S.sect ? W3(corner(0, 0)[0], corner(0, 0)[1], -2) : null, dx: -120, dy: 30},
    ], disp.labels ? 1 : 0);
  },
};

// ---------------- soi chi tiết
const SRC = 'Số có nguồn (Wikipedia: Sanibel Island Light): tháp khung sắt chóp vuông, ống cầu thang giữa, cầu thang bắt đầu cao ≈ 3 m, cao 30 m, tâm đèn 31 m trên mặt biển, móng cọc sắt, thắp 20/8/1884, Fresnel bậc 3, Fl(2) W 10s (1933), tầm 13 hải lí. Tiêu cự bậc 3: 500 mm (Wikipedia: Fresnel lens). Kích thước khung, khối lượng là phỏng dựng.';
function cardOf(part) {
  const base = {src: SRC}, posAt = (x, y, z) => () => { const v = new THREE.Vector3(x, y, z); world.localToWorld(v); return [v.x, v.y, v.z]; };
  if (part === 'lens' || part === 'den') return {...base, k: 'Thấu kính Fresnel bậc 3', t: 'Lồng đèn và thấu kính', b: 'Thấu kính Fresnel ghép nhiều vành lăng kính mỏng thay cho một thấu kính dày: nhẹ hơn mà vẫn bẻ ánh sáng từ ngọn đèn ở tiêu điểm thành chùm gần song song. Bậc 3 có tiêu cự 500 mm. Thấu kính quay; mỗi lần một tấm quét qua mắt người trên biển là một chớp.', rows: [['Đặc tính (1933)', 'Fl(2) W 10s'], ['Tâm đèn', '31 m trên mặt biển'], ['Cường độ lúc này', () => `${vn((S.light && lightReady() ? flash(S.t) : 0) * 100, 0)} %`]], pos: posAt(0, 0, LH.lens), d: 16};
  if (part === 'phong') return {...base, k: 'Giai đoạn 6', t: 'Phòng trực và ban công', b: 'Người gác đèn lên 30 m bằng cầu thang xoắn trong ống giữa, trực ở phòng này, lau kính và giữ cho đèn chạy suốt đêm.', rows: [['Cao sàn', `${vn(LH.top, 1)} m (phỏng dựng)`]], pos: posAt(0, 0, LH.top + 1), d: 20};
  if (part === 'coc') return {...base, k: 'Giai đoạn 1', t: 'Cọc sắt', b: 'Móng cọc sắt, xong đầu năm 1884. Khi gió lật tháp, chân phía đón gió bị kéo lên: cọc phải giữ được lực nhổ đó. Năm 2022, bão Ian làm mất một chân tháp.', rows: [['Lực chân 1 lúc này', () => `${vn((S.N?.[0] || 0) / 1000, 0)} kN`]], pos: posAt(corner(0, 0)[0], corner(0, 0)[1], 0), d: 26};
  if (part === 'son' || part === 'cat') return null;
  const [si, kind] = part.split(':'), s = +si;
  const T = {chan: ['Chân cột', 'Ống gang nghiêng vào trong. Trọng lượng chia cho bốn chân; gió thêm mô men lật, chân phía khuất gió nén thêm, phía đón gió bớt nén, có thể bị kéo.'], giang: ['Giằng ngang', 'Vòng giằng ở mỗi đoạn nối bốn chân và chống ống cầu thang ở giữa.'], cheo: ['Giằng chéo chữ X', 'Ô vuông có khớp ở bốn góc bị xô thành hình bình hành. Thêm thanh chéo, ô thành hai tam giác, mà tam giác không đổi hình khi độ dài ba cạnh không đổi.'], ong: ['Ống cầu thang', 'Ống tôn sắt bọc cầu thang xoắn. Cửa vào ở cao khoảng 3 m.']}[kind] || ['Cấu kiện', ''];
  return {...base, k: `Đoạn ${s + 1}`, t: T[0], b: T[1], rows: [['Cao đoạn', `${vn(s * LH.hs, 1)} → ${vn((s + 1) * LH.hs, 1)} m`], ['Rộng khung giữa đoạn', `${vn(2 * LH.half((s + 0.5) * LH.hs), 1)} m (phỏng dựng)`]], pos: posAt(0, 0, (s + 0.5) * LH.hs), d: 30};
}

// ---------------- góc nhìn
const views = {
  hero: (t) => ({tx: 0, ty: 15, tz: 0, az: 34 + 6 * Math.sin(t * 0.06), el: 9, d: 118, sx: 0, sy: -30}),
  front: () => ({tx: 0, ty: 15, tz: 0, az: 0, el: 2, d: 122, sx: 0, sy: -30}),
  lamp: () => ({tx: 0, ty: LH.lens - 1, tz: 0, az: 30, el: 8, d: 26, sx: 0, sy: -40}),
  sect: () => ({tx: 0, ty: 13, tz: 0, az: 90, el: 4, d: 112, sx: 0, sy: -30}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'Sanibel Island · Florida · 1884', t: 'Một hải đăng dựng từ bộ khung sắt', b: 'Tháp khung sắt hình chóp vuông, ống cầu thang ở giữa, đèn trên đỉnh, thắp lần đầu ngày 20/8/1884. Tàu chở bộ khung chìm cách đảo khoảng 3 km; thợ lặn vớt lên được tất cả trừ hai chi tiết. Bài dựng lại tháp theo tám giai đoạn như một bản vẽ lắp dựng.', e: 'tháp 30 m · tâm đèn 31 m trên mặt biển · Fresnel bậc 3'},
  {k: 'GIAI ĐOẠN 1 · CỌC SẮT', t: 'Đứng trên cát', b: 'Móng là cọc sắt đóng xuống, xong đầu năm 1884. Khung thưa để gió và sóng bão lùa qua thay vì đập vào một thân tháp đặc; các chi tiết đúc sẵn, chở bằng tàu, lắp bằng bu lông tại chỗ.', e: 'cọc → bệ chân cột → đoạn 1'},
  {k: 'LẮP TỪNG ĐOẠN', t: 'Bốn chân nghiêng vào trong', b: 'Mỗi đoạn: bốn chân ống gang, vòng giằng ngang, giằng chéo bốn mặt, rồi một khúc ống cầu thang. Chân nghiêng vào trong nên khung rộng ở đáy, hẹp ở đỉnh: trọng tâm thấp, chân tháp đứng xa nhau để chống lật.', e: 'chân → giằng ngang → giằng chéo → ống cầu thang'},
  {k: 'GIẰNG CHÉO CHỮ X', t: 'Vì sao lại là tam giác', b: 'Một ô vuông nối khớp ở bốn góc bị gió xô thành hình bình hành mà các cạnh không hề dài ra. Thêm thanh chéo, ô thành hai tam giác: tam giác chỉ đổi hình khi một cạnh đổi độ dài, nên thanh chéo chịu kéo hoặc nén và giữ khung đứng.', e: 'ba cạnh cố định → hình tam giác cố định',
    ask: {q: 'Vì sao khung tháp cần thanh giằng chéo?', o: ['Để tháp nặng hơn', 'Để chia mỗi ô thành tam giác, hình không biến dạng khi các cạnh không đổi độ dài', 'Để làm bậc thang'], a: 1, e: 'Ô vuông có khớp xô lệch được; tam giác thì không. Thanh chéo chịu kéo hoặc nén khi gió xô ngang.'}},
  {k: 'PHÒNG TRỰC VÀ ĐÈN', t: 'Thấu kính Fresnel bậc 3', b: 'Trên đỉnh khung: ban công, phòng trực, lồng kính, thấu kính, mái vòm. Thấu kính Fresnel ghép nhiều vành lăng kính mỏng, bẻ ánh sáng ngọn đèn ở tiêu điểm (bậc 3: tiêu cự 500 mm) thành chùm gần song song chiếu ra xa.', e: 'ngọn đèn ở tiêu điểm → chùm song song'},
  {k: 'Fl(2) W 10s', t: 'Mỗi hải đăng một nhịp chớp', b: 'Năm 1933 đèn Sanibel chớp trắng hai lần mỗi 10 giây. Người đi biển nhìn nhịp chớp mà biết mình đang thấy đèn nào. Trong bài, thấu kính có hai tấm lệch nhau 30° quay một vòng 10 s: mỗi tấm quét qua mắt là một chớp.', e: 'Fl(2) W 10s = 2 chớp trắng, lặp mỗi 10 s'},
  {k: 'TẦM NHÌN · ĐỘ CONG TRÁI ĐẤT', t: 'Đèn cao bao nhiêu thì thấy xa bấy nhiêu', b: 'Trái Đất cong nên đèn khuất dưới chân trời ở một khoảng cách. Tầm địa lí tăng theo căn bậc hai độ cao của đèn và của mắt. Đèn 31 m, mắt 5 m: khoảng 16 hải lí; nhưng đèn chỉ đủ sáng tới 13 hải lí, nên độ sáng mới là giới hạn. Kéo mắt xuống 1 m để xem độ cong giành lại phần giới hạn.', e: 'd ≈ 2,08·(√H + √h) hải lí, H, h tính bằng mét'},
  {k: 'GIÓ BÃO · MÔ MEN LẬT', t: 'Chân phía gió bị kéo lên', b: 'Lực gió tăng theo bình phương vận tốc và đặt cao trên khung, tạo mô men lật quanh chân tháp. Trọng lượng chia đều cho bốn chân; mô men lật cộng thêm nén ở hai chân khuất gió và trừ bớt ở hai chân đón gió. Gió đủ mạnh thì chân đón gió chuyển sang bị kéo: cọc phải giữ tháp khỏi bị nhổ.', e: 'F = ½·ρ·C·A·v² · N = W/4 ± M/(2b)',
    ask: {q: 'Gió tăng gấp đôi thì lực gió lên tháp tăng mấy lần?', o: ['2 lần', '4 lần', 'Không đổi'], a: 1, e: 'Lực cản tỉ lệ với bình phương vận tốc: v gấp đôi, lực gấp bốn.'}},
  {k: 'MẶT CẮT A-A', t: 'Nhìn vào bên trong', b: 'Cắt đôi tháp qua trục: cầu thang xoắn chạy trong ống giữa từ cửa ở cao khoảng 3 m lên phòng trực, cọc sắt dưới chân. Bấm từng phần để soi.', e: 'giai đoạn 8 · mặt cắt qua trục'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1, {click: 'reset'}); at(3, {click: 'v_hero'});
at(9, {cap: 1}); at(16, {cap: 2}); at(24, {click: 'v_front'});
at(30, {cap: 3}); at(30.5, {do: () => sim.act('stage2')}); at(33, {click: 'build'});
at(40, {cap: 4}); at(41, {do: () => sim.act('stage6')}); at(42, {click: 'v_lamp'}); at(48, {click: 'v_hero'});
at(50, {cap: 5}); at(50.5, {click: 'v_lamp'}); at(58, {click: 'v_hero'});
at(60, {cap: 6}); at(61, {slide: 'eye', to: 0, dur: 1.5}); at(66, {slide: 'eye', to: 4 / 29, dur: 1});
at(70, {cap: 7}); at(70.5, {click: 'v_front'}); at(71, {slide: 'v', to: 30 / 70, dur: 2}); at(75, {slide: 'v', to: 65 / 70, dur: 2.5}); at(84, {slide: 'v', to: 0, dur: 1.2});
at(87, {cap: 8}); at(87.5, {click: 'sect'}); at(88, {click: 'v_sect'}); at(96, {click: 'sect'}); at(97, {click: 'v_hero'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 104}, firstView: 'hero', extra: [{key: 'light', label: 'Đèn'}, {key: 'sect', label: 'Mặt cắt'}, {key: 'build', label: 'Dựng'}],
  keys: {1: 'v_hero', 2: 'v_front', 3: 'v_lamp', 4: 'v_sect', d: 'build', s: 'step', l: 'light', c: 'sect', p: 'paint', n: 'labels', x: 'xray'}});
