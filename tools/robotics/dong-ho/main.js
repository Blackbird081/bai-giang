// Đồng hồ cơ ETA 6497-1: trang chạy trực tiếp. Bánh lắc dao động, bộ thoát nhảy từng nấc, chuỗi bánh răng, hộp cót;
// mỗi bộ phận một nút tháo rời (kit/tach.js, học theo cutaway của Nyxera0x, MIT). Số đo đọc từ kin.js.
// Giao diện là bộ robotics của Sáng Ăn Khoai; đơn vị hình học trong cảnh là milimét, cả cụm thu 1/1000 về mét.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {createCutaway} from '../kit/tach.js';
import {W, TRAIN, L, R, createBalance, ampOf, torqueOf, vphOfTrain} from './kin.js';

const D2R = Math.PI / 180, H0 = 0.016; // độ cao lơ lửng (m)
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.05, grid: 0.001, fade: 0.2, fov: 26, near: 0.002, far: 3});
const ui = createUI(app);
const root = new THREE.Group(); root.position.y = H0; st.scene.add(root); // bệ lơ lửng
const turn = new THREE.Group(); root.add(turn);
const mv = new THREE.Group(); mv.scale.setScalar(0.001); mv.rotation.x = 0.12; turn.add(mv); // nghiêng nhẹ về phía máy quay

// ---------------- vật liệu: tấm cầu trắng bóng, bánh răng tối, trục thép, chân kính hồng ngọc, thép xanh, một màu nhấn
const M_ = {
  shell: MAT.shell('#f3f2ef'), plate: new THREE.MeshStandardMaterial({color: '#0d0e10', metalness: 0.15, roughness: 0.62, envMapIntensity: 0.35}), wheel: new THREE.MeshStandardMaterial({color: '#a8823f', metalness: 0.85, roughness: 0.45, envMapIntensity: 0.6}), wheel2: new THREE.MeshStandardMaterial({color: '#111214', metalness: 0.2, roughness: 0.55, envMapIntensity: 0.4}), steel: MAT.steel(), dark: MAT.satin('#202226'),
  ruby: new THREE.MeshPhysicalMaterial({color: '#7a1626', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, metalness: 0}),
  blue: new THREE.MeshStandardMaterial({color: '#2a4478', metalness: 0.7, roughness: 0.4}), acc: MAT.accent(),
  dial: MAT.shell('#efe9dc'), ink: MAT.satin('#16181c'),
  glass: new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.035, depthWrite: false, envMapIntensity: 0.25}),
};
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const cylY = (r, y0, y1, seg = 40) => new THREE.CylinderGeometry(r, r, y1 - y0, seg).translate(0, (y0 + y1) / 2, 0);
const flat = (shape, y0, t, curve = 10) => { const g = new THREE.ExtrudeGeometry(shape, {depth: t, bevelEnabled: false, curveSegments: curve}); g.rotateX(Math.PI / 2); g.translate(0, y0 + t, 0); return g; };
const circ = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
const holeP = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };
/** bánh răng có nan hoa: z răng, bán kính vòng lăn rp, n cửa sổ giữa các nan */
function gearShape(z, rp, {spokes = 5, hub = 0.22, spw = 0.32, rim = 0.16} = {}) {
  const m = (2 * rp) / z, ra = rp + 0.9 * m, rr = rp - 1.15 * m, s = new THREE.Shape();
  for (let i = 0; i < z; i++) {
    const a = (i / z) * Math.PI * 2, st_ = (Math.PI * 2) / z, P = (r, u) => [r * Math.cos(a + u * st_), r * Math.sin(a + u * st_)];
    const pts = [P(rr, 0), P(rr, 0.12), P(ra, 0.3), P(ra, 0.5), P(rr, 0.68), P(rr, 1)];
    pts.forEach(([x, y], j) => (i === 0 && j === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  }
  if (spokes) {
    const ri = rr - rim * rp, rh = Math.max(hub * rp, 0.5);
    for (let i = 0; i < spokes; i++) {
      const b = (i / spokes) * Math.PI * 2 + 0.3, stp = (Math.PI * 2) / spokes, h = new THREE.Path();
      const ao = spw / 2 / ri, ai = spw / 2 / rh;
      if (stp - 2 * ai < 0.15) continue;
      h.absarc(0, 0, ri, b + stp - ao, b + ao, true); h.absarc(0, 0, rh, b + ai, b + stp - ai, false); h.closePath(); s.holes.push(h);
    }
  }
  return s;
}
/** bánh thoát 15 răng hình móc nghiêng theo chiều quay */
function escapeShape(r = R.esc) {
  const s = new THREE.Shape(), z = W.escTeeth, rr = r * 0.72;
  for (let i = 0; i < z; i++) {
    const a = (i / z) * Math.PI * 2, stp = (Math.PI * 2) / z, P = (rad, u) => [rad * Math.cos(a - u * stp), rad * Math.sin(a - u * stp)];
    const pts = [P(rr, 0), P(r * 0.98, 0.18), P(r, 0.3), P(r * 0.93, 0.36), P(rr * 1.02, 0.62), P(rr, 1)];
    pts.forEach(([x, y], j) => (i === 0 && j === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  }
  for (let i = 0; i < 4; i++) { const b = (i / 4) * Math.PI * 2 + 0.4, h = new THREE.Path(), ri = rr - 0.28, rh = 0.42; h.absarc(0, 0, ri, b + Math.PI / 2 - 0.16, b + 0.16, true); h.absarc(0, 0, rh, b + 0.5, b + Math.PI / 2 - 0.5, false); h.closePath(); s.holes.push(h); }
  return s;
}
/** thanh dẹt bo tròn hai đầu từ A tới B (toạ độ mặt phẳng x, z), rộng w */
function barShape(A, B, w) {
  const dx = B[0] - A[0], dz = B[1] - A[1], a = Math.atan2(dz, dx), r = w / 2, s = new THREE.Shape();
  s.absarc(A[0], A[1], r, a + Math.PI / 2, a + (3 * Math.PI) / 2, false); s.absarc(B[0], B[1], r, a - Math.PI / 2, a + Math.PI / 2, false); s.closePath();
  return s;
}
const spiralLine = (n, r0, r1, turns) => { const p = new Float32Array(n * 3); return {geo: new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(p, 3)), p, n, r0, r1, turns}; };

// ---------------- các cụm (mỗi cụm một nhóm có điểm neo; tháo rời và bung cả bộ chỉ dời các nhóm)
const G = {}, EV = {}; // EV: hướng bung (mm) khi tách cả bộ
const group = (id, x = 0, z = 0, ev = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.base = [x, 0, z]; mv.add(g); G[id] = g; EV[id] = ev; return g; };
const jewel = (parent, x, z, y, r = 0.55) => { y -= 0.1; mk(cylY(r, y, y + 0.12, 20), M_.ruby, parent).position.set(x, 0, z); mk(cylY(r * 0.28, y + 0.12, y + 0.16, 10), M_.steel, parent).position.set(x, 0, z); };
const screw = (parent, x, z, y, r = 0.62) => { y -= 0.22; mk(cylY(r, y, y + 0.32, 20), M_.blue, parent).position.set(x, 0, z); const sl = mk(new THREE.BoxGeometry(r * 2.05, 0.12, 0.14), M_.dark, parent); sl.position.set(x, y + 0.29, z); sl.rotation.y = (x * 7 + z * 3) % 3; };

// vỏ: vành ngoài trắng bóng (giả định Ø 42 mm), kính mặt đáy, kính mặt số
const vo = group('vo', 0, 0, [0, -9, 0]);
{
  const prof = [[18.45, -2.3], [19.9, -2.3], [20.4, -1.6], [20.4, 4.6], [19.7, 5.4], [18.45, 5.4]];
  mk(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 96), M_.shell, vo);
  mk(new THREE.LatheGeometry([[18.0, 5.1], [18.6, 5.1], [18.6, 5.45], [18.0, 5.45]].map(([r, y]) => new THREE.Vector2(r, y)), 96), M_.steel, vo);
}
const nap = group('nap', 0, 0, [0, 26, 0]);
mk(cylY(18.3, 5.0, 5.3, 96), M_.glass, nap).userData.cast = false;
const kinh = group('kinh', 0, 0, [0, -16, 0]);
mk(cylY(18.3, -2.25, -1.9, 96), M_.glass, kinh).userData.cast = false;
// núm lên dây ở 3 giờ (−x), đầu núm màu nhấn; trục núm
const num = group('num', 0, 0, [-9, 0, 0]);
const knob = new THREE.Group(); knob.position.set(-23.4, 2.0, 0); num.add(knob);
{ mk(new THREE.CylinderGeometry(2.7, 2.7, 3.6, 28).rotateZ(Math.PI / 2), M_.shell, knob);
  for (let i = 0; i < 24; i++) { const r = mk(new THREE.BoxGeometry(3.3, 0.35, 0.35), M_.plate, knob); const a = (i / 24) * Math.PI * 2; r.position.set(0, 2.72 * Math.cos(a), 2.72 * Math.sin(a)); r.rotation.x = a; }
  mk(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 24).rotateZ(Math.PI / 2), M_.acc, knob).position.set(-1.85, 0, 0);
  mk(new THREE.CylinderGeometry(0.5, 0.5, 8.6, 12).rotateZ(Math.PI / 2), M_.steel, num).position.set(-16.6, 2.0, 0); }
// mâm chính (main plate): đĩa Ø 36,60 mm, vát mép
const mam = group('mam', 0, 0, [0, 0, 0]);
mk(new THREE.LatheGeometry([[0, 0], [18.0, 0], [18.3, 0.3], [18.3, 1.0], [17.9, 1.25], [0, 1.25]].map(([r, y]) => new THREE.Vector2(r, y)), 96), M_.plate, mam);
for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r = 4 + (i % 7) * 2; const d = mk(cylY(0.9, 1.25, 1.27, 16), MAT.chip(), mam); d.position.set(r * Math.cos(a * 1.7), 0, r * Math.sin(a * 1.7)); } // vân tròn (perlage)
for (const a of [0.7, 0.7 + Math.PI]) { const cl = mk(flat(barShape([16.2 * Math.cos(a - 0.12), 16.2 * Math.sin(a - 0.12)], [16.2 * Math.cos(a + 0.12), 16.2 * Math.sin(a + 0.12)], 1.6), 1.25, 0.25, 8), M_.steel, mam); cl.userData.k = 'kep'; screw(mam, 16.2 * Math.cos(a), 16.2 * Math.sin(a), 1.72, 0.5); } // hai vít kẹp máy vào vỏ
// mặt số và kim (mặt số quay xuống dưới); kim giây nhỏ ở vị trí 9 giờ, đối diện núm
const mat = group('mat', 0, 0, [0, -7, 0]); mat.rotation.order = 'ZYX'; // lật ra: quay quanh x để mặt số hướng về máy quay, rồi 180° quanh z cho 12 giờ lên trên
const dialG = new THREE.Group(); mat.add(dialG);
mk(cylY(18.2, -0.45, -0.1, 96), M_.dial, dialG); { const rim = circ(18.2); rim.holes.push(holeP(0, 0, 17.6)); mk(flat(rim, -0.5, 0.06, 96), M_.ink, dialG); }
for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, l = big ? 2.2 : 0.9; const t = mk(new THREE.BoxGeometry(big ? 0.55 : 0.18, 0.04, l), M_.ink, dialG); const r = 16.6 - l / 2; t.position.set(-r * Math.sin(a), -0.47, -r * Math.cos(a)); t.rotation.y = a; }
{ const sub = new THREE.Shape(); sub.absarc(0, 0, 4.4, 0, Math.PI * 2, false); sub.holes.push(holeP(0, 0, 4.0)); const s = mk(flat(sub, -0.5, 0.04, 48), M_.ink, dialG); s.position.set(L.fourth[0], 0, L.fourth[1]); }
const handShape = (len, w, tail) => { const s = new THREE.Shape(); s.moveTo(-w * 0.35, tail); s.lineTo(-w / 2, 0); s.lineTo(-w * 0.18, -len); s.lineTo(w * 0.18, -len); s.lineTo(w / 2, 0); s.lineTo(w * 0.35, tail); s.closePath(); return s; };
const hands = {};
{ const mkHand = (len, w, y, mat_, x = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); dialG.add(g); mk(flat(handShape(len, w, 1.6), y, 0.08), mat_, g); mk(cylY(0.6, y - 0.08, y + 0.04, 16), mat_, g); return g; };
  hands.h = mkHand(9.5, 1.3, -0.62, M_.ink); hands.m = mkHand(14.5, 0.9, -0.78, M_.ink); hands.s = mkHand(3.8, 0.35, -0.62, M_.acc, L.fourth[0], L.fourth[1]); }

// hộp cót: trống có răng ở mép dưới, nắp, dây cót xoắn ốc bên trong; trục và bánh cóc ở trên cầu
const cot = group('cot', L.barrel[0], L.barrel[1], [0, 6, 0]);
mk(flat(gearShape(72, R.barrel, {spokes: 0}), 1.35, 0.42, 6), M_.wheel, cot);
mk(new THREE.LatheGeometry([[5.0, 1.77], [5.45, 1.77], [5.45, 3.15], [5.0, 3.15]].map(([r, y]) => new THREE.Vector2(r, y)), 64), M_.wheel2, cot);
const lid = new THREE.Group(); cot.add(lid);
{ const s = circ(5.45); s.holes.push(holeP(0, 0, 1.2)); mk(flat(s, 3.0, 0.18, 48), M_.wheel2, lid); }
mk(cylY(1.0, 1.3, 3.4, 20), M_.steel, cot);
const spring = {mesh: null, key: -1};
const springGeo = (hours) => { // dây cót: lên dây đủ thì cuộn chặt quanh trục, gần hết thì bung ra sát vỏ
  const k = Math.min(1, hours / W.reserve), turns = 8, pts = [], r0 = 1.25 + 2.15 * (1 - k), r1 = 2.9 + 2.0 * (1 - k);
  for (let i = 0; i <= turns * 40; i++) { const u = i / (turns * 40), a = u * turns * Math.PI * 2, r = r0 + (r1 - r0) * u; pts.push(new THREE.Vector3(r * Math.cos(a), 2.4, r * Math.sin(a))); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.11, 4, false);
};
// bánh trung tâm (kim phút, 1 vòng/giờ), bánh thứ ba, bánh giây (1 vòng/phút): mỗi bánh kèm bánh nhỏ (pinion) và trục
const wheelGroup = (id, pos, z, rp, y, pinZ, pinR, pinY, ev) => {
  const g = group(id, pos[0], pos[1], ev);
  const spin = new THREE.Group(); g.add(spin); g.userData.spin = spin;
  mk(flat(gearShape(z, rp, {spokes: 5}), y, 0.2, 4), M_.wheel, spin);
  mk(cylY(Math.max(0.55, rp * 0.16), y - 0.05, y + 0.25, 20), M_.steel, spin);
  if (pinZ) mk(flat(gearShape(pinZ, pinR, {spokes: 0}), pinY, 0.55, 3), M_.steel, spin);
  mk(cylY(0.22, 1.25, 4.4, 10), M_.steel, spin);
  return g;
};
wheelGroup('center', L.center, 80, R.center, 3.33, 12, R.pinC, 1.33, [0, 9, 0]);
wheelGroup('third', L.third, 75, R.third, 2.6, 10, R.pinT, 3.25, [0, 7, 0]);
wheelGroup('fourth', L.fourth, 80, R.fourth, 2.0, 10, R.pinF, 2.45, [0, 8, 0]);
// bánh thoát 15 răng thép, bánh nhỏ 8 lá ăn với bánh giây
const thoat = group('thoat', L.escape[0], L.escape[1], [0, 8, 0]);
{ const spin = new THREE.Group(); thoat.add(spin); thoat.userData.spin = spin;
  mk(flat(escapeShape(), 2.35, 0.16, 4), M_.steel, spin); mk(flat(gearShape(8, R.pinE, {spokes: 0}), 1.85, 0.5, 3), M_.steel, spin); mk(cylY(0.2, 1.25, 4.0, 10), M_.steel, spin); mk(cylY(0.45, 2.3, 2.56, 16), M_.dark, spin); }
// cần thoát: trục đặt giữa bánh thoát và bánh lắc; hai chân kính ăn vào răng bánh thoát, chạc ôm chốt kính của bánh lắc
const can = group('can', L.pallet[0], L.pallet[1], [0, 10, 0]);
const forkAng = Math.atan2(L.balance[1] - L.pallet[1], L.balance[0] - L.pallet[0]);
const fork = new THREE.Group(); can.add(fork);
{ const dB = Math.hypot(L.balance[0] - L.pallet[0], L.balance[1] - L.pallet[1]), dE = Math.hypot(L.escape[0] - L.pallet[0], L.escape[1] - L.pallet[1]);
  const lever = new THREE.Shape(); const w = 0.32, end = dB - 1.15;
  lever.moveTo(0, -w); lever.lineTo(end, -w); lever.lineTo(end, -0.42); lever.lineTo(end + 0.75, -0.48); lever.lineTo(end + 0.75, -0.2); lever.lineTo(end + 0.15, -0.16);
  lever.lineTo(end + 0.15, 0.16); lever.lineTo(end + 0.75, 0.2); lever.lineTo(end + 0.75, 0.48); lever.lineTo(end, 0.42); lever.lineTo(end, w); lever.lineTo(0, w); lever.closePath();
  const lv = mk(flat(lever, 2.42, 0.14, 4), M_.dark, fork); lv.rotation.y = -forkAng;
  for (const s of [-1, 1]) { // hai cánh mang chân kính vào và chân kính ra
    const a = forkAng + Math.PI + s * 0.62, tip = [dE * 0.82 * Math.cos(a), dE * 0.82 * Math.sin(a)];
    mk(flat(barShape([0, 0], tip, 0.6), 2.42, 0.14, 8), M_.dark, fork);
    const pj = mk(new THREE.BoxGeometry(0.34, 0.3, 0.9), M_.ruby, fork); pj.position.set(tip[0] * 1.08, 2.5, tip[1] * 1.08); pj.rotation.y = -a;
  }
  mk(cylY(0.25, 1.25, 3.4, 10), M_.steel, fork); }
// bánh lắc: vành tối có vạch nhấn, ba nan, tám vít vành, mâm chốt kính; dây tóc thép xanh 12 vòng (vẽ lại mỗi khung hình)
const lac = group('lac', L.balance[0], L.balance[1], [0, 16, 0]);
const bal = new THREE.Group(); lac.add(bal);
{ const ring = circ(W.balR); ring.holes.push(holeP(0, 0, W.balR - 0.55)); mk(flat(ring, 2.75, 0.5, 64), M_.dark, bal);
  const line = circ(W.balR - 0.12); line.holes.push(holeP(0, 0, W.balR - 0.3)); mk(flat(line, 3.25, 0.03, 64), M_.acc, bal);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; mk(flat(barShape([0, 0], [(W.balR - 0.4) * Math.cos(a), (W.balR - 0.4) * Math.sin(a)], 0.55), 2.95, 0.22, 6), M_.dark, bal); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, sc = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 10).rotateZ(Math.PI / 2), i % 2 ? M_.steel : M_.blue, bal); sc.position.set((W.balR + 0.25) * Math.cos(a), 3.0, (W.balR + 0.25) * Math.sin(a)); sc.rotation.y = -a; }
  mk(cylY(0.25, 1.25, 4.3, 10), M_.steel, bal); mk(cylY(1.0, 2.38, 2.52, 24), M_.steel, bal);
  mk(cylY(0.13, 2.25, 2.55, 8), M_.ruby, bal).position.set(0.78, 0, 0); }
const hs = spiralLine(720, 0.45, 3.5, 12);
const hsLine = new THREE.Line(hs.geo, new THREE.LineBasicMaterial({color: '#2a4478'})); hsLine.position.y = 3.42; lac.add(hsLine);
// cầu: cầu hộp cót (có cửa sổ), cầu bánh răng (ba nhánh), cầu cần thoát, cầu bánh lắc; chân kính, vít xanh
const cauCot = group('cauCot', 0, 0, [0, 14, 0]);
{ const s = new THREE.Shape(); const B = L.barrel; s.absarc(B[0], B[1], 6.6, 0, Math.PI * 2, false);
  for (let i = 0; i < 3; i++) { const a0 = i * 2.09 + 0.5, h = new THREE.Path(); h.absarc(B[0], B[1], 5.4, a0 + 1.2, a0, true); h.absarc(B[0], B[1], 2.6, a0 + 0.12, a0 + 1.08, false); h.closePath(); s.holes.push(h); }
  mk(flat(s, 3.45, 0.6, 48), M_.shell, cauCot);
  mk(flat(barShape(B, [-15.6, -2.2], 3.8), 3.45, 0.6, 16), M_.shell, cauCot); mk(flat(barShape(B, [-9.5, -13.6], 3.2), 3.45, 0.6, 16), M_.shell, cauCot);
  screw(cauCot, -15.4, -2.4, 4.05); screw(cauCot, -9.4, -13.4, 4.05); screw(cauCot, -1.6, -9.6, 4.05);
  // bánh cóc trên trục hộp cót, bánh vương miện ăn với nó; con cóc giữ không cho cót bung ngược
  const rat = new THREE.Group(); rat.position.set(B[0], 0, B[1]); cauCot.add(rat); cauCot.userData.rat = rat;
  mk(flat(gearShape(54, R.ratchet, {spokes: 0}), 4.05, 0.28, 3), M_.steel, rat); mk(cylY(1.1, 4.33, 4.45, 20), M_.blue, rat);
  const crw = new THREE.Group(); crw.position.set(L.crownW[0], 0, L.crownW[1]); cauCot.add(crw); cauCot.userData.crw = crw;
  mk(flat(gearShape(28, R.crownW, {spokes: 0}), 4.05, 0.26, 3), M_.steel, crw); mk(cylY(0.7, 4.31, 4.43, 16), M_.blue, crw);
  mk(flat(barShape([B[0] - 3.2, B[1] + 4.6], [B[0] - 5.4, B[1] + 2.8], 0.7), 4.05, 0.24, 6), M_.steel, cauCot); }
const cauBR = group('cauBR', 0, 0, [0, 15, 0]);
{ const P = [L.center, L.third, L.fourth], hub = [6.2, -8.6];
  for (const p of P) mk(flat(barShape(hub, p, 2.9), 3.7, 0.8, 12), M_.shell, cauBR);
  mk(flat(barShape(hub, [14.6, -9.6], 3.4), 3.7, 0.8, 12), M_.shell, cauBR);
  for (const p of P) jewel(cauBR, p[0], p[1], 4.5);
  const jm = new THREE.Object3D(); jm.position.set(L.fourth[0], 4.62, L.fourth[1]); cauBR.add(jm); cauBR.userData.jm = jm;
  screw(cauBR, hub[0], hub[1], 4.5); screw(cauBR, 14.4, -9.4, 4.5); }
const cauCan = group('cauCan', 0, 0, [0, 13, 0]);
{ const a = L.pallet, b = [a[0] + 5.6, a[1] - 1.2]; mk(flat(barShape(a, b, 2.0), 2.75, 0.55, 10), M_.shell, cauCan); jewel(cauCan, a[0], a[1], 3.3, 0.45); jewel(cauCan, L.escape[0], L.escape[1], 3.3, 0.45);
  mk(flat(barShape(L.escape, b, 1.7), 2.75, 0.55, 10), M_.shell, cauCan); screw(cauCan, b[0], b[1], 3.3, 0.5); }
const cauLac = group('cauLac', 0, 0, [0, 22, 0]);
{ const c = L.balance, foot = [c[0] - 9.0, c[1] + 4.6], s = barShape(foot, c, 3.4); mk(flat(s, 3.7, 0.8, 16), M_.shell, cauLac);
  const end = circ(2.1); const e = mk(flat(end, 3.7, 0.8, 32), M_.shell, cauLac); e.position.set(c[0], 0, c[1]);
  jewel(cauLac, c[0], c[1], 4.5, 0.65); screw(cauLac, foot[0], foot[1], 4.5);
  const reg = mk(flat(barShape([c[0], c[1]], [c[0] + 4.4, c[1] - 3.2], 0.6), 4.42, 0.08, 6), M_.steel, cauLac); reg.userData.cast = false; } // tay chỉnh Etachron

// gắn nhãn soi chi tiết
const PART = {vo: 'vo', nap: 'vo', kinh: 'vo', num: 'num', mam: 'mam', mat: 'mat', cot: 'cot', cauCot: 'cot', center: 'center', third: 'third', fourth: 'fourth', thoat: 'thoat', can: 'thoat', cauCan: 'thoat', lac: 'lac', cauLac: 'lac', cauBR: 'center'};
for (const [id, g] of Object.entries(G)) tag(PART[id] || id, ...(() => { const r = []; g.traverse((m) => { if (m.isMesh) r.push(m); }); return r; })());
for (const g of Object.values(G)) g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });

// ---------------- trạng thái
const B = createBalance();
const S = {t: 0, beats: 0, escT: 0, esc: 0, four: 0, wind: 0, start: (10 * 3600 + 10 * 60), demo: 0, log: [], hist: [], tg: [], winding: 0, snd: false,
  disp: {labels: true, xray: false}, slReg: 0.5, slI: 0.5};
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const OPEN = {lac: 0, thoat: 0, banhrang: 0, cot: 0, mat: 0};
let EX = 0;

// âm thanh tích tắc (tuỳ chọn, chỉ phát sau khi người xem bấm nút): một cú gõ ngắn mỗi nhịp
let AC = null;
const tick = (hi) => { if (!S.snd || !AC || LIVE.rate > 2) return; const t = AC.currentTime, n = AC.createBufferSource(), b = AC.createBuffer(1, 360, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < 360; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 50); n.buffer = b; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 4200 : 3300; f.Q.value = 3; const g = AC.createGain(); g.gain.value = 0.22; n.connect(f).connect(g).connect(AC.destination); n.start(t); };

// ---------------- bảng
ui.header({code: '6497', kicker: 'ĐỒNG HỒ CƠ LÊN DÂY TAY · ETA 6497-1 · Ø 36,60 MM', title: 'Đồng hồ cơ', sub: 'DAO ĐỘNG ĐIỀU HOÀ · BỘ THOÁT · TỈ SỐ TRUYỀN', hub: HUB_URL,
  right: [['2,5 Hz', 'BÁNH LẮC'], ['18.000', 'DAO ĐỘNG/GIỜ'], ['17', 'CHÂN KÍNH'], ['46 h', 'TRỮ CÓT']]});
const BEATS = ['Toàn máy', 'Bánh lắc', 'Bộ thoát', 'Bánh răng', 'Hộp cót', 'Đẳng thời', 'Chỉnh giờ', 'Mặt số', 'Phim'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 236, 'BÁNH LẮC · DAO ĐỘNG', '01');
ui.text(42, 146, 'GÓC LỆCH θ (°) · 1,6 GIÂY GẦN NHẤT');
const thChart = ui.chart(42, 162, 272, 84, {min: -320, max: 320, colors: [C.ink, C.or], dash: [0, '3 3']});
const bRows = ['TẦN SỐ', 'CHU KÌ ĐO ĐƯỢC', 'BIÊN ĐỘ', 'DAO ĐỘNG / GIỜ'].map((n, k) => [ui.text(42, 258 + k * 20, n), ui.text(200, 256 + k * 20, '', 'v', 'width:114px;text-align:right')]);
ui.panel(28, 360, 300, 200, 'ĐIỀU CHỈNH', '02');
ui.buttons([['wind', 'LÊN DÂY'], ['imp', 'BỘ THOÁT'], ['sound', 'ÂM THANH']], 42, 394, 272);
const SL = [['hours', 'DÂY CÓT CÒN'], ['reg', 'TAY CHỈNH'], ['inert', 'VÍT VÀNH']];
const sl = Object.fromEntries(SL.map(([k, n], i) => [k, ui.slider(k, 42, 440 + i * 30, 272, n, {lw: 92, vw: 74})]));
const regTxt = ui.text(42, 530, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(28, 572, 300, 194, 'MÁY ĐO NHỊP', '03');
ui.text(42, 606, 'SAI SỐ (GIÂY/NGÀY)'); const rateEl = ui.text(42, 619, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
ui.text(186, 606, 'BIÊN ĐỘ · LỆCH NHỊP'); const ampEl = ui.text(186, 621, '', 'v', 'font-size:15px;font-weight:700');
const tgSvg = ui.svg(42, 660, 272, 72);
ui.text(42, 740, 'MỖI CHẤM MỘT NHỊP · DỐC LÊN = CHẠY NHANH');

ui.panel(1272, 112, 300, 256, 'CHUỖI BÁNH RĂNG · TỈ SỐ', '04');
ui.text(1286, 146, 'BÁNH'); ui.text(1416, 146, 'RĂNG : LÁ'); ui.text(1500, 146, 'VÒNG/GIỜ');
const trRows = TRAIN.map((w, i) => { ui.text(1286, 166 + i * 24, w.vn, 'v', 'font-size:12px;font-weight:600'); const r = ui.text(1416, 166 + i * 24, `${w.z}${w.mesh ? ` : ${w.mesh}` : ''}`, 'v', 'font-size:12px'); return [r, ui.text(1500, 166 + i * 24, '', 'v', 'width:58px;text-align:right;font-size:12px')]; });
const trSvg = ui.svg(1286, 290, 272, 30);
ui.text(1286, 332, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = `Bánh thoát ${TRAIN.at(-1).rph} vòng/giờ × ${W.escTeeth} răng × 2 nhịp = <b>${vphOfTrain().toLocaleString('vi-VN')} nhịp/giờ</b>`;
ui.panel(1272, 380, 300, 212, 'THÁO TỪNG BỘ PHẬN', '05');
const cutY = 412;
ui.panel(1272, 604, 300, 162, 'HIỂN THỊ · NHẬT KÝ', '06');
ui.buttons([['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 634, 272);
const logRows = [0, 1, 2].map((k) => ui.text(1286, 690 + k * 15, '', 'v', 'font-size:10px;font-weight:500;width:272px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_top', 'TRÊN'], ['v_side', 'BÊN'], ['v_bal', 'BÁNH LẮC']], 360, 120, 600);
ui.text(362, 664, 'GIỜ TRÊN MẶT SỐ');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink};font-variant-numeric:tabular-nums"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'lac', title: 'BÁNH LẮC', sub: '2,5 HZ'}, {key: 'thoat', title: 'BÁNH THOÁT', sub: '15 RĂNG'}, {key: 'cot', title: 'HỘP CÓT', sub: '—'},
  {key: 'num', title: 'NÚM LÊN DÂY', sub: '3 GIỜ'}, {key: 'fourth', title: 'BÁNH GIÂY', sub: '1 VÒNG/PHÚT'}, {key: 'jewel', title: 'CHÂN KÍNH', sub: 'HỒNG NGỌC · 17'},
]);
const callSub = Object.fromEntries(['lac', 'cot'].map((k, i) => [k, ui.root.querySelectorAll('.call')[[0, 2][i]]?.querySelector('span')]));

// ---------------- tháo từng bộ phận
const wp = (o, dy = 0) => { const v = o.getWorldPosition(new THREE.Vector3()); v.y += dy; return [v.x, v.y, v.z]; };
const SRC = 'Số đo: ETA, tài liệu kĩ thuật CT 6497-1 (2016): Ø 36,60 mm, cao 4,50 mm, 17 chân kính, 18.000 dao động/giờ, góc nâng 44°, trữ cót 46 giờ, Incabloc, Etachron. Monochrome Watches: kiểu Lépine, kim giây nhỏ ở 9 giờ, đổi tên ETA 6497-1 năm 1967. Wikipedia (Lever escapement; Balance wheel): bánh thoát 15 răng, Thomas Mudge khoảng 1754, bánh lắc quay khoảng 270° mỗi phía. Giả định: số răng, vị trí trục, bánh lắc Ø 12 mm, I = 9·10⁻⁹ kg·m², Q = 180, vỏ Ø 42 mm.';
const cut = createCutaway({st, ui, parts: [
  {key: 'lac', label: 'BÁNH LẮC', open: (k) => { OPEN.lac = k; }, at: () => wp(bal, 0.003), sub: () => `${vn(B.amp / D2R, 0)}° · ${fx(B.freq(), 2)} Hz`, cam: {az: 58, el: 46, d: 0.062},
    card: () => cardOf('lac')},
  {key: 'thoat', label: 'BỘ THOÁT', open: (k) => { OPEN.thoat = k; }, at: () => wp(G.thoat.userData.spin, 0.0025), sub: () => `nhảy ${vn(S.beats % 30, 0)}/30 nửa răng`, cam: {az: 142, el: 34, d: 0.06},
    card: () => cardOf('thoat')},
  {key: 'banhrang', label: 'BÁNH RĂNG', open: (k) => { OPEN.banhrang = k; }, at: () => wp(G.third, 0.006), sub: () => 'trình diễn: quay nhanh 60 lần', cam: {az: -38, el: 30, d: 0.08},
    card: () => cardOf('center')},
  {key: 'cot', label: 'HỘP CÓT', open: (k) => { OPEN.cot = k; }, at: () => wp(G.cot, 0.005), sub: () => `còn ${vn(B.hours, 1)} giờ`, cam: {az: -128, el: 42, d: 0.074},
    card: () => cardOf('cot')},
  {key: 'mat', label: 'MẶT SỐ', open: (k) => { OPEN.mat = k; }, at: () => wp(dialG, 0), sub: () => clockText(), cam: {az: 6, el: 14, d: 0.135},
    card: () => cardOf('mat')},
], explode: (k) => { EX = k; }, turn: (d) => { turn.rotation.y = d * D2R; }});
cut.pills(1286, cutY, 272);
ui.text(1286, 540, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = 'Bấm một bộ phận: nó tách ra trong 1 giây, vẫn chạy trong lúc treo, máy quay tới gần từ phía riêng. Bấm lại để lắp vào.';

// ---------------- mô phỏng
const disp = S.disp;
const clockSec = () => S.start + (S.four / 360) * 60; // kim giây: bánh giây quay 1 vòng/phút
const clockText = () => { const t = clockSec(), h = Math.floor(t / 3600) % 12 || 12, m = Math.floor(t / 60) % 60, s = Math.floor(t) % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
const applySliders = () => { B.kK = 1 / (1 + (S.slReg - 0.5) * 0.01); B.kI = 1 + (S.slI - 0.5) * 0.02; };
let lookKey = '';
const applyLook = () => {
  const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key;
  const F = new Set(); if (disp.xray) for (const id of ['vo', 'cauCot', 'cauBR', 'cauLac', 'cauCan', 'mam']) G[id].traverse((m) => F.add(m));
  xray(mv, 1, (m) => !F.has(m)); xray(mv, 0, (m) => F.has(m));
};
const defaults = () => { Object.assign(S, {t: 0, beats: 0, esc: 0, four: 0, escT: 0, demo: 0, log: [], hist: [], tg: [], winding: 0, slReg: 0.5, slI: 0.5}); Object.assign(B, {th: (W.A0 - 5) * D2R, om: 0, imp: true, hours: 40, periods: [], tLast: 0, peak: 0, amp: W.A0 * D2R, beatT: []}); applySliders(); };
const sim = {
  S, root, cut,
  reset() { defaults(); cut.reset(); Object.assign(disp, {labels: true, xray: false}); say('lên dây · 40 giờ cót'); },
  busy: () => cut.busy(),
  isOn: (k) => (k === 'imp' && B.imp) || (k === 'sound' && S.snd) || (k.startsWith('cut_') && (k === 'cut_film' ? cut.filming : k === 'cut_all' ? cut.exploded > 0 : cut.k(k.slice(4)) > 0.5)),
  act(k) {
    if (cut.act(k)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'wind') { S.winding = 1; say('lên dây · núm quay, bánh cóc khoá từng nấc'); return; }
    if (k === 'imp') { B.imp = !B.imp; say(B.imp ? 'bộ thoát chạy lại' : 'tháo bộ thoát: bánh lắc dao động tắt dần'); return; }
    if (k === 'sound') { S.snd = !S.snd; if (S.snd && !AC) { try { AC = new AudioContext(); } catch { S.snd = false; } } AC?.resume?.(); return; }
  },
  slide(k, t) {
    if (k === 'hours') { B.hours = t * W.reserve; S.winding = 0; }
    if (k === 'reg') { S.slReg = t; applySliders(); }
    if (k === 'inert') { S.slI = t; applySliders(); }
  },
  step(dt) {
    S.t += dt;
    if (S.winding) { B.hours = Math.min(W.reserve, B.hours + dt * 22); S.wind += dt * 900; if (B.hours >= W.reserve) { S.winding = 0; say('đã lên dây đủ · 46 giờ'); } }
    const nb = B.step(dt);
    for (let i = 0; i < nb; i++) tick(S.beats++ % 2);
    S.esc += ((S.beats / 30) * 360 - S.esc) * Math.min(1, dt / 0.012); // bánh thoát nhảy nửa răng mỗi nhịp, rơi rất nhanh
    S.four = S.esc / 10;
    S.demo += dt * OPEN.banhrang * 60; // trình diễn chiều quay khi tháo cụm bánh răng
    cut.step(dt);
    if ((S.th100 = (S.th100 || 0) + dt) > 0.012) { S.th100 = 0; S.hist.push([B.th / D2R, B.drive ? 0 : null]); if (S.hist.length > 134) S.hist.shift(); }
    if (nb && B.beatT.length) { S.tg.push([B.beatT.at(-1), B.beats]); if (S.tg.length > 160) S.tg.shift(); }
  },
  shadowAt() { return new THREE.Vector3(0, 0.005, 0); },
  pick: (hits) => soi(hits),
  measure() { // tỉ lệ đo trên mô hình so với số có nguồn (do_mat_do.py); đo khi máy nằm ngang, không tách
    const bx = new THREE.Box3(), s = new THREE.Vector3(), r0 = mv.rotation.x, t0 = turn.rotation.y;
    mv.rotation.x = 0; turn.rotation.y = 0; mv.updateWorldMatrix(true, true);
    for (const id of ['mam', 'cauCot', 'cauBR', 'cauLac', 'cot', 'center']) bx.expandByObject(G[id]);
    bx.getSize(s); mv.rotation.x = r0; turn.rotation.y = t0; mv.updateWorldMatrix(true, true);
    return [{name: 'đường kính máy (mm)', got: Math.max(s.x, s.z) * 1000, want: W.D, tol: 0.02}, {name: 'cao / đường kính', got: s.y / Math.max(s.x, s.z), want: W.H / W.D, tol: 0.06},
      {name: 'tần số bánh lắc (Hz)', got: 1 / B.period(), want: W.f, tol: 0.003}, {name: 'nhịp/giờ từ tỉ số răng', got: vphOfTrain(), want: W.vph, tol: 0.0001}];
  },
  draw() {
    // dời các cụm: vị trí gốc + hướng bung × độ bung + độ tách của bộ phận đang mở
    const O = OPEN, sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const off = {};
    const add = (id, x, y, z, rx = 0, rz = 0) => { const o = off[id] || (off[id] = [0, 0, 0, 0, 0]); o[0] += x; o[1] += y; o[2] += z; o[3] += rx; o[4] += rz; };
    add('cauLac', 0, 13 * O.lac, 0, -0.2 * O.lac); add('lac', 0, 7 * O.lac, 2 * O.lac, -0.32 * O.lac);
    add('cauCan', 0, 11 * O.thoat, 0); add('can', 0, 6 * O.thoat, 3 * O.thoat); add('thoat', 2 * O.thoat, 4 * O.thoat, 0); add('lac', 0, 2 * O.thoat, 0);
    add('cauLac', 0, 5 * O.thoat, 0);
    add('cauBR', 0, 15 * O.banhrang, 0, 0, 0.16 * O.banhrang); add('center', 0, 12 * O.banhrang, 0); add('third', 0, 8 * O.banhrang, 0); add('fourth', 0, 10 * O.banhrang, 0);
    add('cauCot', -3 * O.cot, 13 * O.cot, 0, 0, 0.15 * O.cot); add('cot', 0, 6 * O.cot, 0); add('center', 0, 5 * O.cot, 0);
    const dm = O.mat;
    add('mat', 0, -6 * sm(0, 0.35, dm) + 26 * sm(0.3, 1, dm), 30 * sm(0.3, 1, dm), -Math.PI / 2 * sm(0.45, 1, dm), Math.PI * sm(0.45, 1, dm));
    for (const [id, g] of Object.entries(G)) {
      const b = g.userData.base, e = EV[id], o = off[id] || [0, 0, 0, 0, 0];
      g.position.set(b[0] * (1 + 0.15 * EX) + e[0] * EX + o[0], b[1] + e[1] * EX + o[1], b[2] * (1 + 0.15 * EX) + e[2] * EX + o[2]);
      g.rotation.set(o[3], 0, o[4]);
    }
    lid.position.y = 4 * O.cot; lid.rotation.z = 0.5 * O.cot; lid.position.x = 2.4 * O.cot;
    // quay: trung tâm +, thứ ba −, giây +, thoát −; hộp cót − (ăn với bánh nhỏ trung tâm); kim phút theo bánh trung tâm
    const four = S.four + S.demo, third = -four / 7.5, center = (S.start % 3600) / 10 + S.four / 60;
    G.fourth.userData.spin.rotation.y = four * D2R; G.third.userData.spin.rotation.y = third * D2R; G.center.userData.spin.rotation.y = (center + S.demo / 60) * D2R;
    G.thoat.userData.spin.rotation.y = -(S.esc + S.demo * 10) * D2R;
    cot.rotation.y = -(center / 6) * D2R; cauCot.userData.rat.rotation.y = S.wind * D2R; cauCot.userData.crw.rotation.y = -S.wind * (R.ratchet / R.crownW) * D2R;
    knob.rotation.x = S.wind * 0.2 * D2R;
    const ct = clockSec();
    hands.s.rotation.y = ((ct % 60) / 60) * Math.PI * 2; hands.m.rotation.y = ((ct % 3600) / 3600) * Math.PI * 2; hands.h.rotation.y = ((ct % 43200) / 43200) * Math.PI * 2;
    // bánh lắc và dây tóc: vòng trong quay theo θ, vòng ngoài giữ ở cọc; cần thoát gạt qua lại trong vùng góc nâng
    bal.rotation.y = B.th;
    { const p = hs.p, n = hs.n; for (let i = 0; i < n; i++) { const u = i / (n - 1), r = hs.r0 + (hs.r1 - hs.r0) * u, a = u * hs.turns * Math.PI * 2 + B.th * (1 - u); p[i * 3] = r * Math.cos(a); p[i * 3 + 1] = 0; p[i * 3 + 2] = -r * Math.sin(a); } hs.geo.attributes.position.needsUpdate = true; }
    const lift = (W.lift / 2) * D2R; fork.rotation.y = 0.17 * Math.max(-1, Math.min(1, B.th / lift)) * (B.imp ? 1 : 0.3);
    // dây cót: dựng lại khi số giờ còn lại đổi đáng kể
    const key = Math.round(B.hours / 2);
    if (key !== spring.key) { spring.key = key; if (spring.mesh) { cot.remove(spring.mesh); spring.mesh.geometry.dispose(); } spring.mesh = mk(springGeo(B.hours), M_.blue, cot); }
    root.position.y = H0 + 0.0004 * Math.sin(S.t * 0.9);
    applyLook();
    cut.draw();
    // bảng 01
    thChart.set([S.hist.map((h) => h[0])], {band: [-W.lift / 2, W.lift / 2]});
    const per = B.period();
    bRows[0][1].textContent = `${fx(1 / per, 3)} Hz`; bRows[1][1].textContent = `${fx(per, 4)} s`;
    bRows[2][1].textContent = B.hours > 0 || !B.imp ? `${vn(B.amp / D2R, 0)}°` : 'dừng'; bRows[3][1].textContent = `${Math.round(7200 / per).toLocaleString('vi-VN')}`;
    // bảng 02
    sl.hours.set(B.hours / W.reserve, `${vn(B.hours, 1)} h`); sl.reg.set(S.slReg, `${S.slReg >= 0.5 ? '−' : '+'}${vn(Math.abs(S.slReg - 0.5) * 1, 2)} %`); sl.inert.set(S.slI, `${S.slI >= 0.5 ? '+' : '−'}${vn(Math.abs(S.slI - 0.5) * 2, 2)} %`);
    regTxt.innerHTML = `Tay chỉnh: độ dài hiệu dụng dây tóc · vít vành: mô men quán tính I. f = (1/2π)·√(κ/I) = <b>${fx(B.freq(), 4)} Hz</b>`;
    // bảng 03: máy đo nhịp
    const rate = B.rate(); rateEl.textContent = `${rate >= 0 ? '+' : '−'}${vn(Math.abs(rate), 1)}`;
    const bt = B.beatT; let be = 0; if (bt.length >= 3) { const a = bt.at(-1) - bt.at(-2), b = bt.at(-2) - bt.at(-3); be = Math.abs(a - b) / 2 * 1000; }
    ampEl.textContent = `${vn(B.amp / D2R, 0)}° · ${fx(be, 1)} ms`;
    { const N = S.tg.length; let g = `<rect x="0" y="0" width="272" height="72" fill="${C.chart}" stroke="${C.line}"/><line x1="0" x2="272" y1="36" y2="36" stroke="${C.faint}"/>`;
      if (N > 1) { const [t0, n0] = S.tg[0], step = 1 / (2 * W.f); for (let i = 0; i < N; i++) { const dev = (S.tg[i][0] - t0 - (S.tg[i][1] - n0) * step) * 1000, y = 36 - dev * 1.6; if (y > 1 && y < 71) g += `<circle cx="${(i / 160) * 272}" cy="${y.toFixed(1)}" r="1.3" fill="${C.ink}"/>`; } }
      tgSvg.innerHTML = g; }
    // bảng 04: tốc độ quay
    trRows.forEach(([, v], i) => { v.textContent = vn(TRAIN[i].rph / (per * W.f), TRAIN[i].rph < 1 ? 3 : TRAIN[i].rph < 10 ? 1 : 0); });
    { let g = ''; TRAIN.forEach((w, i) => { const x = 18 + i * 59, a = [-center / 6, center, third, four, -S.esc][i] * D2R; g += `<circle cx="${x}" cy="14" r="11" fill="none" stroke="${C.line}" stroke-width="2"/><line x1="${x}" y1="14" x2="${(x + 10 * Math.sin(a)).toFixed(1)}" y2="${(14 - 10 * Math.cos(a)).toFixed(1)}" stroke="${i === 4 ? C.or : C.ink}" stroke-width="2"/>`; }); trSvg.innerHTML = g; }
    // bảng 06 và chữ lớn
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]); ui.setOn('imp', B.imp); ui.setOn('sound', S.snd); ui.setOn('wind', !!S.winding);
    logRows.forEach((r, i) => { const l = S.log[i]; r.innerHTML = l ? `<span style="color:${C.faint}">${l[0]}</span>&nbsp;&nbsp;${l[1]}` : ''; r.style.opacity = 1 - i * 0.25; });
    modeEl.textContent = clockText();
    modeSub.textContent = `${B.imp ? (B.hours > 0 ? 'đang chạy' : 'hết cót · dừng') : 'tháo bộ thoát · dao động tắt dần'} · ${fx(1 / per, 3)} Hz · biên độ ${vn(B.amp / D2R, 0)}° · sai số ${rate >= 0 ? '+' : '−'}${vn(Math.abs(rate), 1)} s/ngày`;
    alert.set(B.hours <= 0 && B.imp ? 'HẾT CÓT · BẤM LÊN DÂY' : Math.abs(rate) > 60 ? 'SAI SỐ LỚN · KÉO TAY CHỈNH VỀ GIỮA' : '');
    if (callSub.lac) callSub.lac.textContent = `${fx(1 / per, 2)} Hz · ${vn(B.amp / D2R, 0)}°`;
    if (callSub.cot) callSub.cot.textContent = `CÒN ${vn(B.hours, 0)} GIỜ`;
    const P = (o, dy = 0) => { const v = wp(o, dy); return st.project(v[0], v[1], v[2]); };
    const lab = disp.labels && !cut.active && EX < 0.05 ? 1 : 0;
    ui.drawCallouts([{key: 'lac', p: P(bal, 0.003), dx: 110, dy: -60}, {key: 'thoat', p: P(G.thoat.userData.spin, 0.0025), dx: 130, dy: 90}, {key: 'cot', p: P(G.cot, 0.004), dx: -120, dy: -60},
      {key: 'num', p: P(knob), dx: -80, dy: 60}, {key: 'fourth', p: P(G.fourth, 0.004), dx: 120, dy: -80}, {key: 'jewel', p: P(cauBR.userData.jm), dx: 120, dy: -10}], lab);
  },
};

// ---------------- soi chi tiết
function cardOf(part) {
  const base = {src: SRC};
  if (part === 'lac') return {...base, k: 'Bộ phận giữ nhịp · con lắc xoắn', t: 'Bánh lắc và dây tóc', b: 'Bánh lắc quay qua lại quanh trục; dây tóc xoắn ốc kéo nó về vị trí cân bằng với mô men tỉ lệ góc lệch, M = −κθ. Đó là dao động điều hoà: chu kì chỉ phụ thuộc mô men quán tính I và độ cứng κ, không phụ thuộc biên độ.',
    rows: [['Tần số', () => `${fx(B.freq(), 4)} Hz`], ['Chu kì T = 2π√(I/κ)', () => `${fx(B.period(), 4)} s`], ['Biên độ', () => `${vn(B.amp / D2R, 0)}° (nguồn: khoảng 270°)`], ['I (giả định)', '9·10⁻⁹ kg·m²'], ['κ = I·ω²', `${vn(W.kappa * 1e6, 2)}·10⁻⁶ N·m/rad`], ['Góc nâng', `${W.lift}° (ETA)`]]};
  if (part === 'thoat') return {...base, k: 'Bộ thoát kiểu cần (Mudge, khoảng 1754)', t: 'Bánh thoát và cần thoát', b: 'Bánh thoát bị một chân kính khoá lại. Mỗi lần bánh lắc đi qua giữa, chốt kính của nó gạt cần: chân kính nhả ra, răng trượt trên mặt nghiêng của chân kính và đẩy bánh lắc một cái nhỏ, rồi chân kính kia khoá răng kế tiếp. Mỗi nhịp bánh thoát nhảy nửa răng.',
    rows: [['Răng bánh thoát', '15'], ['Nhịp mỗi vòng', '30'], ['Tốc độ', () => `${vn(600 / (B.period() * W.f) / 60, 2)} vòng/phút`], ['Đã nhảy', () => `${S.beats.toLocaleString('vi-VN')} nhịp`], ['Bộ thoát', () => (B.imp ? 'đang đẩy' : 'đã tháo')]]};
  if (part === 'cot') return {...base, k: 'Nguồn năng lượng', t: 'Hộp cót', b: 'Dây cót cuộn trong trống. Lên dây là cuộn chặt nó quanh trục; con cóc khoá bánh cóc để cót không bung ngược. Cót bung ra đẩy trống quay, kéo cả chuỗi bánh răng. Mô men cót giảm dần khi hết, nên bánh lắc nhận cú đẩy yếu hơn và biên độ nhỏ đi.',
    rows: [['Còn lại', () => `${vn(B.hours, 1)} / ${W.reserve} giờ (ETA)`], ['Mô men tương đối (giả định)', () => `${vn(torqueOf(B.hours) * 100, 0)} %`], ['Biên độ ổn định', () => `${vn(ampOf(B.hours), 0)}°`], ['Trống quay', '1 vòng / 6 giờ (72 : 12)'], ['Số vòng trống cho 46 giờ', `${vn(46 / 6, 1)}`]]};
  if (part === 'mat') return {...base, k: 'Kiểu Lépine', t: 'Mặt số và kim', b: 'Kim phút gắn trên trục bánh trung tâm (1 vòng/giờ); kim giờ qua bộ bánh dưới mặt số, chậm 12 lần. Kim giây nhỏ gắn thẳng trên trục bánh giây ở vị trí 9 giờ, đối diện núm ở 3 giờ.',
    rows: [['Giờ', () => clockText()], ['Kim giây', 'trục bánh giây, 1 vòng/phút'], ['Kim phút', 'trục bánh trung tâm, 1 vòng/giờ'], ['Kim giờ', '1 vòng / 12 giờ']]};
  if (part === 'num') return {...base, k: 'Lên dây và chỉnh giờ', t: 'Núm và bánh vương miện', b: 'Quay núm làm bánh vương miện quay, bánh vương miện quay bánh cóc trên trục hộp cót: dây cót cuộn chặt lại. Bấm “Lên dây” để xem.',
    rows: [['Vị trí', '3 giờ'], ['Cót còn', () => `${vn(B.hours, 1)} giờ`]]};
  if (part === 'vo' || part === 'mam') return {...base, k: 'Khung máy', t: part === 'vo' ? 'Vỏ và kính' : 'Mâm chính', b: 'Mâm chính là tấm đế mang mọi trục; các cầu bắt vít lên trên, mỗi trục quay giữa hai chân kính hồng ngọc (một ở mâm, một ở cầu) để ma sát nhỏ và ít mòn.',
    rows: [['Đường kính máy', `${W.D} mm`], ['Cao máy', `${W.H} mm`], ['Chân kính', `${W.jewels}`], ['Vỏ', 'Ø 42 mm (giả định của bài)']]};
  const w = TRAIN.find((x) => x.id === part);
  if (w) return {...base, k: 'Chuỗi bánh răng', t: w.vn, b: 'Tỉ số truyền giữa hai bánh bằng tỉ số số răng. Muốn bánh thoát quay 600 vòng/giờ khi bánh trung tâm quay 1 vòng/giờ, tích các tỉ số phải đúng 600 = 8 × 7,5 × 10. Số răng là giả định của bài, tỉ số thì bắt buộc.',
    rows: [['Số răng', `${w.z}`], ['Ăn với bánh nhỏ', w.mesh ? `${w.mesh} lá` : '—'], ['Tốc độ', `${w.rph} vòng/giờ`], ['Tỉ số tới bánh thoát', `${vn(600 / w.rph, 1)}`]]};
  return null;
}
const soi = picker((part) => cardOf(part));

// ---------------- góc nhìn
const views = {
  hero: (t) => ({tx: 0, ty: H0 + 0.002, tz: 0.002, az: 28 + 6 * Math.sin(t * 0.12), el: 34, d: 0.118, sx: 0, sy: -30}),
  top: () => ({tx: 0, ty: H0, tz: 0, az: 0, el: 86, d: 0.12, sx: 0, sy: -20}),
  side: () => ({tx: 0, ty: H0, tz: 0, az: 90, el: 6, d: 0.12, sx: 0, sy: -40}),
  bal: (t) => { const p = wp(bal); return {tx: p[0], ty: p[1], tz: p[2], az: 40 + 3 * Math.sin(t * 0.3), el: 52, d: 0.05, sx: 0, sy: -20}; },
};
views.cut = (t) => cut.view(views.hero(t)) || views.hero(t);

// ---------------- bài giảng
const CAP = [
  {k: 'ETA 6497-1 · Ø 36,60 MM · 17 CHÂN KÍNH', t: 'Một máy đồng hồ lên dây tay', b: 'Máy 6497 ra đời ở Unitas thập niên 1950, đổi tên ETA 6497-1 năm 1967, đến nay vẫn được dùng trong trường dạy chế tác đồng hồ vì to và dễ tháo. Mọi thứ trong máy phục vụ một việc: đếm dao động của bánh lắc và đổi số đếm ra giờ.', e: 'Ø 36,60 mm · cao 4,50 mm · 18.000 dao động/giờ · trữ cót 46 giờ'},
  {k: 'BÁNH LẮC · CON LẮC XOẮN', t: 'Dao động điều hoà 2,5 Hz', b: 'Dây tóc kéo bánh lắc về giữa với mô men tỉ lệ góc lệch, M = −κθ. Phương trình giống hệt con lắc lò xo nên nghiệm là dao động điều hoà: đồ thị θ(t) ở bảng 01 là hình sin, chu kì 0,4 s. Một dao động có hai nhịp, nên 18.000 nhịp/giờ là 2,5 dao động mỗi giây.', e: 'T = 2π·√(I/κ) = 0,400 s · f = 1/T = 2,5 Hz',
    ask: {q: 'Bánh lắc của máy 6497 thực hiện bao nhiêu dao động toàn phần mỗi giây?', o: ['5', '2,5', '18'], a: 1, e: '18.000 nhịp/giờ = 5 nhịp/giây; mỗi dao động gồm hai nhịp (đi và về) nên f = 2,5 Hz.'}},
  {k: 'BỘ THOÁT · 15 RĂNG', t: 'Khoá, nhả, đẩy', b: 'Bánh thoát muốn quay vì cót kéo, nhưng cần thoát khoá nó lại. Mỗi lần bánh lắc đi qua giữa, chốt kính gạt cần: răng nhả ra, trượt trên mặt nghiêng chân kính và đẩy bánh lắc một chút trong vùng góc nâng 44° (dải tô ở đồ thị), rồi bị khoá lại. Bánh thoát nhảy nửa răng mỗi nhịp.', e: '15 răng × 2 nhịp = 30 nhịp mỗi vòng bánh thoát'},
  {k: 'CHUỖI BÁNH RĂNG · TỈ SỐ BẮT BUỘC', t: 'Từ 18.000 nhịp ra kim giây', b: 'Bánh thoát nhảy 18.000 lần/giờ, mỗi vòng 30 nhịp, vậy quay 600 vòng/giờ, tức 10 vòng/phút. Kim giây phải quay 1 vòng/phút nên tỉ số bánh giây → bánh thoát là 10; bánh trung tâm 1 vòng/giờ nên tích các tỉ số tới bánh thoát là 600. Số răng là giả định, tỉ số thì không chọn khác được.', e: '600 = 8 × 7,5 × 10 · 80:10 · 75:10 · 80:8'},
  {k: 'HỘP CÓT · NĂNG LƯỢNG', t: 'Cót yếu dần, biên độ nhỏ dần', b: 'Dây cót trữ năng lượng cho 46 giờ. Cót càng bung, mô men càng giảm, cú đẩy của bộ thoát yếu đi nên bánh lắc lắc hẹp hơn. Kéo “dây cót còn” xuống: biên độ giảm từ khoảng 270° xuống dưới 230°.', e: 'năng lượng đẩy mỗi nhịp = năng lượng mất vì cản → A ∝ √(mô men cót)'},
  {k: 'ĐẲNG THỜI', t: 'Biên độ đổi, chu kì không đổi', b: 'Tháo bộ thoát: không còn cú đẩy, bánh lắc dao động tắt dần. Biên độ tụt dần nhưng chu kì đo được ở bảng 01 vẫn 0,400 s. Đó là tính đẳng thời của dao động điều hoà, và là lí do đồng hồ vẫn đúng giờ khi cót gần hết.', e: 'T không chứa biên độ A: T = 2π·√(I/κ)',
    ask: {q: 'Khi cót gần hết, biên độ bánh lắc giảm. Chu kì dao động thay đổi thế nào (lí tưởng)?', o: ['Giảm theo biên độ', 'Không đổi', 'Tăng gấp đôi'], a: 1, e: 'Dao động điều hoà có chu kì T = 2π√(I/κ), không phụ thuộc biên độ.'}},
  {k: 'CHỈNH NHANH CHẬM', t: 'Một phần nghìn là 43 giây mỗi ngày', b: 'Tay chỉnh dời điểm kẹp dây tóc, đổi độ dài hiệu dụng nên đổi κ. Ngắn đi 0,1 % thì κ tăng 0,1 %, tần số tăng 0,05 %, đồng hồ nhanh khoảng 43 giây mỗi ngày. Máy đo nhịp ở bảng 03 vẽ mỗi nhịp một chấm: dãy chấm dốc lên là đồng hồ chạy nhanh.', e: 'Δf/f = ½·Δκ/κ · sai số = 86 400 s × Δf/f'},
  {k: 'MẶT SỐ · KIỂU LÉPINE', t: 'Kim giây ở 9 giờ, núm ở 3 giờ', b: 'Mặt số lật ra cho thấy kim. Kim phút nằm trên trục bánh trung tâm, kim giây nhỏ gắn thẳng trên trục bánh giây nên nằm ở 9 giờ, đối diện núm. Bản 6498 xoay chuỗi bánh răng để kim giây xuống 6 giờ.', e: 'kim giây: bánh giây · kim phút: bánh trung tâm · kim giờ: chậm 12 lần'},
  {k: 'PHIM THÁO RỜI', t: 'Từng bộ phận, rồi cả máy', b: 'Mỗi bộ phận tách ra dưới một góc máy riêng, vẫn chạy trong lúc treo, rồi cả máy bung ra trên bàn xoay và lắp lại. Bấm từng nút ở bảng 05 để tự tháo.', e: 'bánh lắc → bộ thoát → bánh răng → hộp cót → mặt số → cả máy'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(3.5, {click: 'v_top'}); at(7, {click: 'v_hero'});
at(10, {cap: 1}); at(10.6, {click: 'cut_lac'}); at(17.5, {click: 'cut_lac'}); at(19, {click: 'v_bal'});
at(22, {cap: 2}); at(22.5, {click: 'v_hero'}); at(23, {click: 'cut_thoat'}); at(31, {click: 'cut_thoat'});
at(33, {cap: 3}); at(33.5, {click: 'cut_banhrang'}); at(41, {click: 'cut_banhrang'});
at(43, {cap: 4}); at(43.5, {click: 'cut_cot'}); at(46, {slide: 'hours', to: 0.08, dur: 2.5}); at(51.5, {click: 'cut_cot'}); at(52.5, {click: 'wind'});
at(55, {cap: 5}); at(55.4, {click: 'v_bal'}); at(56, {click: 'imp'}); at(63.5, {click: 'imp'}); at(64.5, {click: 'v_hero'});
at(66, {cap: 6}); at(66.5, {slide: 'reg', to: 0.4, dur: 1.5}); at(73, {slide: 'reg', to: 0.5, dur: 1});
at(76, {cap: 7}); at(76.5, {click: 'cut_mat'}); at(84, {click: 'cut_mat'});
at(86, {cap: 8}); at(86.5, {click: 'cut_film'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 86.5 + cut.duration + 2}, firstView: 'hero', chip: [800, 152],
  extra: [{key: 'wind', label: 'Lên dây'}, {key: 'imp', label: 'Bộ thoát'}, {key: 'sound', label: 'Âm thanh'}],
  shell: {subject: 'Vật lí 11 · dao động', objectives: ['Nhận ra dao động của bánh lắc là dao động điều hoà, tính chu kì từ tần số', 'Giải thích vì sao chu kì không phụ thuộc biên độ (đẳng thời)', 'Tính tỉ số truyền của chuỗi bánh răng từ số nhịp mỗi giờ'],
    credit: 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial, claude-motion của whaleyxbt và cutaway của Nyxera0x (MIT). Thông số máy theo tài liệu kĩ thuật ETA CT 6497-1; chỗ giả định ghi rõ trong thẻ soi.'},
  keys: {1: 'v_hero', 2: 'v_top', 3: 'v_side', 4: 'v_bal', w: 'wind', e: 'imp', n: 'labels', x: 'xray', q: 'cut_lac', a: 'cut_thoat', z: 'cut_banhrang', c: 'cut_cot', m: 'cut_mat', f: 'cut_film', t: 'cut_all'}});
