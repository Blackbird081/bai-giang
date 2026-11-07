// Cá piranha robot theo piranha đen (Serrasalmus rhombeus): trang chạy trực tiếp. Hàm dưới là một đòn bẩy quay quanh
// khớp hàm: lực cơ khép hàm đặt cách khớp L_in, lực cắn ở răng cách khớp d, cân bằng mô men F_cắn·d = F_cơ·L_in.
// Lực cắn theo cỡ cá đọc từ hồi quy của Grubich và cộng sự (2012). Tháo từng bộ phận bằng kit/tach.js (theo cutaway
// của Nyxera0x, MIT). Đơn vị hình học trong cảnh là milimét, cả cụm thu 1/1000 về mét.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import {C, createUI} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {createCutaway} from '../kit/tach.js';
import {PR, TEETH, biteOf, biteFit, massOf, csaOf, muscleOf, biteAt} from './kin.js';

const D2R = Math.PI / 180, Y0 = 0.125; // độ cao lơ lửng của trục cá (m)
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.35, grid: 0.01, fade: 1.6, fov: 26, near: 0.01, far: 8});
const ui = createUI(app);
const root = new THREE.Group(); root.position.y = Y0; st.scene.add(root);
const turn = new THREE.Group(); root.add(turn);
const sc = new THREE.Group(); turn.add(sc); // tỉ lệ theo chiều dài cá
const mm = new THREE.Group(); mm.scale.setScalar(0.001); sc.add(mm);

// ---------------- vật liệu
const M_ = {
  shell: MAT.shell('#f3f2ef'), dark: new THREE.MeshStandardMaterial({color: '#111214', metalness: 0.25, roughness: 0.55, envMapIntensity: 0.4}), dark2: MAT.satin('#26282c'),
  steel: MAT.steel(), acc: MAT.accent(), lens: new THREE.MeshPhysicalMaterial({color: '#050506', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0.2}),
  tooth: new THREE.MeshPhysicalMaterial({color: '#f7f5f0', roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15}),
  fin: new THREE.MeshPhysicalMaterial({color: '#e6e1d6', roughness: 0.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide}),
  glass: new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 0.5, side: THREE.DoubleSide}),
  gold: MAT.gold(), ray: new THREE.MeshStandardMaterial({color: '#2a2c30', roughness: 0.6}),
};
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------------- dáng thân: nửa chiều cao H(x), nửa bề dày W(x), tâm yc(x) (mm; đầu ở +x)
const KN = [[-152, 13], [-125, 22], [-90, 46], [-45, 68], [5, 76], [55, 72], [95, 60], [128, 44], [150, 26], [160, 8]];
const H = (x) => { if (x <= KN[0][0]) return KN[0][1]; for (let i = 1; i < KN.length; i++) if (x <= KN[i][0]) { const [x0, h0] = KN[i - 1], [x1, h1] = KN[i], u = (x - x0) / (x1 - x0), s = (1 - Math.cos(Math.PI * u)) / 2; return h0 + (h1 - h0) * s; } return KN.at(-1)[1]; };
const Wd = (x) => 3 + 0.34 * H(x);
const yc = (x) => -0.07 * H(x);
const XMIN = -152, XMAX = 158;
const surfP = (u, v, off = 0) => { const x = XMIN + (XMAX - XMIN) * u, h = H(x) + off, w = Wd(x) + off; return new THREE.Vector3(x, yc(x) + h * Math.sin(v), w * Math.cos(v)); };
function patch(u0, u1, v0, v1, off, nu = 8, nv = 8) {
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = surfP(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * j) / nv, off); pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// thân trong tối (cơ cấu) và các tấm giáp trắng có khe hở; cửa kính hai bên hông
const than = new THREE.Group(); mm.add(than);
for (const [u0, u1] of [[0.03, 0.31], [0.55, 0.97]]) mk(patch(u0, u1, -Math.PI / 2, 1.5 * Math.PI, -2.5, 14, 36), M_.dark, than);
for (const [v0, v1] of [[0.62, Math.PI - 0.62], [Math.PI + 0.42, 1.5 * Math.PI + Math.PI / 2 - 0.42 + 0.0001]]) mk(patch(0.31, 0.55, v0, v1, -2.5, 10, 10), M_.dark, than);
mk(patch(0.31, 0.55, -Math.PI / 2, -0.42, -2.5, 10, 4), M_.dark, than);
{ const wall = mk(new THREE.BoxGeometry(80, 70, 4), M_.dark, than); wall.position.set(-5, 2, 0); } // vách giữa: bánh răng hai bên nằm trước nó
const plates = [];
const COLS = [0.1, 0.2, 0.31, 0.43, 0.55, 0.66, 0.76, 0.84];
const ROWS = [-1.45, -0.95, -0.42, 0.12, 0.62, 1.12, 1.5];
for (let c = 0; c < COLS.length - 1; c++) for (let s of [1, -1]) for (let r = 0; r < ROWS.length - 1; r++) {
  const win = c >= 2 && c <= 4 && r >= 2 && r <= 3; // cửa kính hông
  if (win) continue;
  const gu = 0.004 + 0.002 * (c % 2), gv = 0.024;
  let v0 = ROWS[r] + gv, v1 = ROWS[r + 1] - gv; if (s < 0) { const a = Math.PI - v1, b = Math.PI - v0; v0 = a; v1 = b; }
  const g = new THREE.Group(); than.add(g);
  const m = mk(patch(COLS[c] + gu, COLS[c + 1] - gu, v0, v1, 1.2, 8, 8), r >= 4 ? M_.dark2 : M_.shell, g); // lưng sẫm như piranha đen, hông trắng
  const mid = surfP((COLS[c] + COLS[c + 1]) / 2, (v0 + v1) / 2); plates.push({g, n: new THREE.Vector3(0, mid.y - yc(mid.x), mid.z).normalize(), c, r, s, flank: c >= 1 && c <= 5 && r >= 1 && r <= 4});
  void m;
}
// sống lưng và sống bụng: dải tấm nhỏ dọc trục
for (const v of [Math.PI / 2, -Math.PI / 2]) for (let c = 0; c < 9; c++) { const g = new THREE.Group(); than.add(g); mk(patch(0.1 + c * 0.082 + 0.004, 0.1 + (c + 1) * 0.082 - 0.004, v - 0.12, v + 0.12, 1.6, 4, 3), v > 0 ? M_.dark : M_.shell, g); plates.push({g, n: new THREE.Vector3(0, Math.sign(v), 0), c, r: -1, s: 0}); }
const winG = new THREE.Group(); than.add(winG);
for (const s of [1, -1]) { const g = mk(patch(0.31, 0.55, s > 0 ? -0.42 : Math.PI - 0.62, s > 0 ? 0.62 : Math.PI + 0.42, 0.9, 10, 8), M_.glass, winG); g.castShadow = false; g.userData.cast = false; }
// bên trong hông: hai bánh răng lớn, bánh nhỏ, pin, dây
const banhG = new THREE.Group(); banhG.position.set(-5, 2, 0); than.add(banhG);
const gearGeo = (z, r, t) => { const s = new THREE.Shape(); for (let i = 0; i < z; i++) { const a = (i / z) * Math.PI * 2, st_ = (Math.PI * 2) / z; const P = (rr, u) => [rr * Math.cos(a + u * st_), rr * Math.sin(a + u * st_)]; [P(r * 0.9, 0), P(r * 0.9, 0.15), P(r, 0.32), P(r, 0.52), P(r * 0.9, 0.7), P(r * 0.9, 1)].forEach(([x, y], j) => (i || j ? s.lineTo(x, y) : s.moveTo(x, y))); }
  for (let i = 0; i < 5; i++) { const h = new THREE.Path(), b = (i / 5) * Math.PI * 2; h.absarc(0, 0, r * 0.72, b + 1.1, b + 0.15, true); h.absarc(0, 0, r * 0.3, b + 0.4, b + 0.85, false); h.closePath(); s.holes.push(h); }
  return new THREE.ExtrudeGeometry(s, {depth: t, bevelEnabled: false, curveSegments: 6}).translate(0, 0, -t / 2); };
const gears = [[0, 6, 34, 26], [40, -4, 22, 18], [-34, -16, 18, 14], [22, 34, 14, 12]].map(([x, y, r, z], i) => { const g = new THREE.Group(); g.position.set(x, y, 18 - i * 3); banhG.add(g); mk(gearGeo(z, r, 4), i % 2 ? M_.gold : M_.dark2, g); mk(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 7, 16).rotateX(Math.PI / 2), M_.steel, g); g.userData.r = r; const gm = g.clone(); gm.position.z = -(18 - i * 3); banhG.add(gm); return [g, gm]; });
for (let i = 0; i < 3; i++) mk(new THREE.BoxGeometry(18, 46, 22), M_.dark2, banhG).position.set(-60 + i * 20, -10, 0);
mk(new THREE.TorusGeometry(30, 1.2, 8, 40, Math.PI * 1.2).rotateZ(0.4), M_.acc, banhG).position.set(-40, 6, 0);

// ---------------- đầu: gờ mày, mắt (thấu kính đen, viền nhấn), má (che bộ dẫn động khép hàm), hàm trên có răng
const dau = new THREE.Group(); mm.add(dau);
for (const s of [1, -1]) {
  for (const [u0, u1, v0, v1] of [[0.84, 0.9, 0.2, 1.3], [0.9, 0.95, 0.1, 1.25], [0.95, 0.985, -0.1, 1.1], [0.84, 0.9, -1.3, -0.25]]) { const a = s > 0 ? v0 : Math.PI - v1, b = s > 0 ? v1 : Math.PI - v0; const g = new THREE.Group(); dau.add(g); mk(patch(u0, u1, a, b, 0.8, 5, 6), M_.shell, g); plates.push({g, n: new THREE.Vector3(0.6, 0.3, s).normalize(), c: 9, r: 0, s, head: true}); }
}
const mat = []; // hai mắt
for (const s of [1, -1]) {
  const g = new THREE.Group(); const p = surfP(0.865, 0.55); g.position.set(p.x, p.y, p.z * s * 0.98); dau.add(g);
  g.lookAt(new THREE.Vector3(p.x + 8, p.y + 2, p.z * s * 3)); // trục mắt hướng ra ngoài
  const rings = [];
  for (let k = 0; k < 3; k++) { const r = new THREE.Group(); g.add(r); mk(new THREE.TorusGeometry(10.5 - k * 2.4, 1.3, 8, 32), k ? M_.dark2 : M_.shell, r); rings.push(r); }
  const lens = new THREE.Group(); g.add(lens); mk(new THREE.SphereGeometry(6.6, 24, 16), M_.lens, lens).scale.set(1, 1, 0.55); mk(new THREE.TorusGeometry(6.8, 0.35, 6, 32), M_.acc, lens);
  const brow = mk(new THREE.BoxGeometry(26, 4, 10), M_.shell, dau); brow.position.set(p.x + 4, p.y + 12, p.z * s * 0.92); brow.rotation.set(0.3 * s, 0, -0.32);
  mat.push({g, rings, lens, base: g.position.clone()});
}
// khớp hàm, hàm dưới (đòn bẩy), răng
const HINGE = new THREE.Vector3(160 - PR.jaw, -26, 0);
const hamTren = new THREE.Group(); dau.add(hamTren);
const hamDuoi = new THREE.Group(); hamDuoi.position.copy(HINGE); mm.add(hamDuoi);
const teethDuoi = [], teethTren = [];
const toothGeo = (h, w) => new THREE.ConeGeometry(w, h, 4).translate(0, h / 2, 0);
const tipGeo = (h, w) => new THREE.ConeGeometry(w * 0.32, h * 0.32, 4).translate(0, h * 0.84, 0);
for (const s of [1, -1]) {
  // hai cành hàm dưới hội về mút cằm; hàm dưới chìa ra trước hàm trên
  const a = new THREE.Vector3(0, 0, 20 * s), b = new THREE.Vector3(PR.jaw, -8, 5 * s), len = a.distanceTo(b);
  const bar = mk(new THREE.BoxGeometry(len, 9, 6), M_.shell, hamDuoi); bar.position.copy(a).lerp(b, 0.5); bar.lookAt(b.clone().add(new THREE.Vector3(0, 0, 0))); bar.rotateY(Math.PI / 2);
  const inn = mk(new THREE.BoxGeometry(len * 0.9, 5, 3), M_.dark, hamDuoi); inn.position.copy(a).lerp(b, 0.5).add(new THREE.Vector3(0, -3, -2 * s)); inn.lookAt(b); inn.rotateY(Math.PI / 2);
  TEETH.forEach((d, i) => { const u = d / PR.jaw, p = a.clone().lerp(b, u), g = new THREE.Group(); g.position.copy(p).add(new THREE.Vector3(0, 4, 0)); hamDuoi.add(g); const h = 5 + 4 * u, w = 2.0 + 0.8 * u; mk(toothGeo(h, w), M_.tooth, g); mk(tipGeo(h, w), M_.acc, g); g.userData = {base: g.position.clone(), d, i, s}; teethDuoi.push(g); });
  // mỏm hàm (coronoid): chỗ bộ dẫn động bám vào, cách khớp L_in
  const cor = mk(new THREE.BoxGeometry(5, 16, 4), M_.dark2, hamDuoi); cor.position.set(PR.Lin * 0.96, 6, 17 * s);
  // hàm trên: cung răng cố định vào đầu
  const ua = new THREE.Vector3(HINGE.x + 6, HINGE.y + 14, 19 * s), ub = new THREE.Vector3(156, HINGE.y + 6, 5 * s);
  const ubar = mk(new THREE.BoxGeometry(ua.distanceTo(ub), 7, 6), M_.shell, hamTren); ubar.position.copy(ua).lerp(ub, 0.5); ubar.lookAt(ub); ubar.rotateY(Math.PI / 2);
  for (let i = 0; i < 7; i++) { const u = 0.25 + 0.75 * (i / 6), p = ua.clone().lerp(ub, u), g = new THREE.Group(); g.position.copy(p).add(new THREE.Vector3(0, -3.5, 0)); g.rotation.x = Math.PI; hamTren.add(g); const h = 4.5 + 3.5 * u, w = 1.9 + 0.7 * u; mk(toothGeo(h, w), M_.tooth, g); mk(tipGeo(h, w), M_.acc, g); g.userData = {base: g.position.clone(), s}; teethTren.push(g); }
}
mk(new THREE.CylinderGeometry(4, 4, 46, 16).rotateX(Math.PI / 2), M_.steel, hamDuoi);
mk(new THREE.TorusGeometry(4.6, 0.6, 6, 20), M_.acc, hamDuoi).position.z = 23;
// bộ dẫn động khép hàm (thay cơ khép hàm): xi lanh gắn vào sọ, cần đẩy bám mỏm hàm; má che bên ngoài
const coG = new THREE.Group(); mm.add(coG);
const ORIG = new THREE.Vector3(HINGE.x - 30, HINGE.y + 38, 0);
const actuators = [1, -1].map((s) => { const cyl = mk(new THREE.CylinderGeometry(4.2, 4.2, 26, 16), M_.dark2, coG), rod = mk(new THREE.CylinderGeometry(1.8, 1.8, 30, 12), M_.steel, coG), ring = mk(new THREE.TorusGeometry(4.4, 0.5, 6, 20).rotateX(Math.PI / 2), M_.acc, coG); return {s, cyl, rod, ring}; });
const ma = [1, -1].map((s) => { const g = new THREE.Group(); g.position.set(HINGE.x - 2, HINGE.y + 18, 0); dau.add(g); const m = mk(patch(0.62, 0.8, s > 0 ? -0.6 : Math.PI - 0.25, s > 0 ? 0.25 : Math.PI + 0.6, 1.6, 6, 6), M_.shell, g); m.position.set(-(HINGE.x - 2), -(HINGE.y + 18), 0); return {g, s}; });

// ---------------- vây: màng sữa mờ có tia mảnh và mép màu nhấn
const finMesh = (pts, parent, rays = 6) => {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.Group(); parent.add(g); const m = mk(new THREE.ShapeGeometry(s), M_.fin, g); m.castShadow = false;
  for (let k = 1; k <= rays; k++) { const t = k / (rays + 1), a = pts[0], i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1))), b = pts[i]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const r = mk(new THREE.CylinderGeometry(0.35, 0.5, len, 5), M_.ray, g); r.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.2); r.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2; }
  const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.slice(1, -1).map(([x, y]) => new THREE.Vector3(x, y, 0.3))), new THREE.LineBasicMaterial({color: C.or})); g.add(edge);
  return g;
};
const vay = new THREE.Group(); mm.add(vay);
const dorsal = finMesh([[-10, 70], [-28, 112], [-55, 100], [-75, 74], [-60, 66]], vay, 7);
const anal = finMesh([[-40, -66], [-60, -98], [-100, -84], [-118, -48], [-90, -42]], vay, 8);
const pelv = [1, -1].map((s) => { const f = finMesh([[30, -66], [18, -94], [0, -86], [8, -64]], vay, 4); f.position.z = 14 * s; f.rotation.y = 0.35 * s; return f; });
const pect = [1, -1].map((s) => { const f = finMesh([[0, 0], [-34, -8], [-44, -22], [-26, -26], [0, -10]], vay, 5); f.position.set(96, -20, 26 * s); f.rotation.y = -0.5 * s; return f; });
const duoi = new THREE.Group(); duoi.position.set(-128, -2, 0); mm.add(duoi);
const collars = [0, 1, 2].map((k) => { const g = new THREE.Group(); g.position.x = -k * 9; duoi.add(g); mk(new THREE.CylinderGeometry(11 - k * 1.2, 11 - k * 1.2, 7, 24).rotateZ(Math.PI / 2), M_.shell, g); mk(new THREE.TorusGeometry(10.6 - k * 1.2, 0.6, 6, 24).rotateY(Math.PI / 2), M_.acc, g).position.x = -4.2; mk(new THREE.CylinderGeometry(7, 7, 4, 16).rotateZ(Math.PI / 2), M_.dark, g).position.x = -5.5; return g; });
const caudal = new THREE.Group(); caudal.position.x = -26; duoi.add(caudal);
finMesh([[0, 0], [-34, 62], [-58, 70], [-46, 38], [-34, 4], [-46, -36], [-58, -66], [-34, -58], [0, 0]], caudal, 9);

// gắn nhãn soi chi tiết
const meshes = (o) => { const a = []; o.traverse((m) => { if (m.isMesh) a.push(m); }); return a; };
tag('than', ...meshes(than)); tag('banh', ...meshes(banhG)); tag('mat', ...mat.flatMap((e) => meshes(e.g))); tag('ham', ...meshes(hamDuoi), ...meshes(hamTren)); tag('co', ...meshes(coG), ...ma.flatMap((e) => meshes(e.g))); tag('duoi', ...meshes(duoi)); tag('vay', ...meshes(vay));
mm.traverse((m) => { if (m.isMesh && m.material !== M_.glass && m.material !== M_.fin) m.material = m.material.clone(); });
// đầu đo lực (như thiết bị đo lực cắn trong nghiên cứu): hai tấm kẹp, hiện khi cắn
const doLuc = new THREE.Group(); mm.add(doLuc); mk(new THREE.BoxGeometry(18, 5, 26), M_.dark2, doLuc); mk(new THREE.BoxGeometry(14, 2, 22), M_.acc, doLuc).position.y = 3.2; doLuc.visible = false;

// ---------------- trạng thái
const S = {t: 0, TL: PR.TL, d: PR.jaw, gape: 0.05, gT: 0.05, biting: 0, swim: true, open: false, force: 0, peak: 0, hist: [], log: [], disp: {labels: true, xray: false}};
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const OPEN = {mat: 0, ham: 0, co: 0, than: 0, duoi: 0};
let EX = 0;
const Ftip = () => biteOf(S.TL), Fm = () => muscleOf(Ftip()), MA = () => PR.Lin / S.d, Fbite = () => biteAt(Fm(), S.d);
const toothIdx = () => { let best = 0; TEETH.forEach((d, i) => { if (Math.abs(d - S.d) < Math.abs(TEETH[best] - S.d)) best = i; }); return best; };

// ---------------- bảng
ui.header({code: 'S. rh', kicker: 'CÁ PIRANHA ROBOT · HÀM LÀ ĐÒN BẨY · THEO PIRANHA ĐEN Serrasalmus rhombeus', title: 'Cá piranha', sub: 'MÔ MEN LỰC · ĐÒN BẨY · LỢI THẾ CƠ HỌC', hub: HUB_URL,
  right: [['368 mm', 'DÀI TOÀN THÂN'], ['1,12 kg', 'KHỐI LƯỢNG'], ['320 N', 'LỰC CẮN ĐO ĐƯỢC'], ['> 30 ×', 'TRỌNG LƯỢNG']]});
const BEATS = ['Toàn thân', 'Đòn bẩy', 'Dọc hàm', 'Cơ khép', 'Theo cỡ', 'Mắt', 'Hông, đuôi', 'So sánh', 'Phim'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 268, 'HÀM DƯỚI · ĐÒN BẨY', '01');
const levSvg = ui.svg(42, 146, 272, 104);
const lRows = ['LỰC CƠ KHÉP HÀM', 'TAY ĐÒN CỦA CƠ L_in', 'TAY ĐÒN CỦA LỰC CẮN d', 'LỢI THẾ CƠ HỌC L_in/d', 'LỰC CẮN Ở RĂNG NÀY'].map((n, k) => [ui.text(42, 262 + k * 20, n), ui.text(214, 260 + k * 20, '', 'v', 'width:100px;text-align:right')]);
ui.panel(28, 392, 300, 180, 'ĐIỀU KHIỂN', '02');
ui.buttons([['bite', 'CẮN'], ['gape', 'HÁ MIỆNG'], ['swim', 'BƠI']], 42, 426, 272);
const sl = {d: ui.slider('d', 42, 474, 272, 'VỊ TRÍ CẮN', {lw: 92, vw: 74}), TL: ui.slider('TL', 42, 504, 272, 'CHIỀU DÀI CÁ', {lw: 92, vw: 74})};
ui.text(42, 534, 'TRÁI: RĂNG ĐẦU MÚT · PHẢI: RĂNG TRONG CÙNG');
ui.panel(28, 584, 300, 182, 'LỰC CẮN DỌC HÀM · 7 RĂNG', '03');
const toothSvg = ui.svg(42, 616, 272, 110);
const toothTxt = ui.text(42, 734, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 256, 'CỠ CÁ · LỰC CẮN', '04');
const sizeSvg = ui.svg(1286, 146, 272, 96);
const sRows = ['KHỐI LƯỢNG (FISHBASE)', 'TRỌNG LƯỢNG', 'LỰC CẮN ĐẦU MÚT', 'GẤP TRỌNG LƯỢNG'].map((n, k) => [ui.text(1286, 262 + k * 20, n), ui.text(1440, 260 + k * 20, '', 'v', 'width:118px;text-align:right')]);
ui.panel(1272, 380, 300, 200, 'THÁO TỪNG BỘ PHẬN', '05');
ui.panel(1272, 592, 300, 174, 'CƠ KHÉP HÀM', '06');
const mRows = ['LỰC CƠ', 'TIẾT DIỆN (≈ ∝ TL²)', 'ỨNG SUẤT F / TIẾT DIỆN', 'KHỐI LƯỢNG CƠ (≈ ∝ TL³)', 'PHẦN KHỐI LƯỢNG CƠ THỂ'].map((n, k) => [ui.text(1286, 626 + k * 20, n), ui.text(1460, 624 + k * 20, '', 'v', 'width:98px;text-align:right')]);
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_jaw', 'HÀM'], ['v_top', 'TRÊN'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 360, 120, 600);
ui.text(362, 664, 'LỰC CẮN');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink};font-variant-numeric:tabular-nums"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([{key: 'khop', title: 'KHỚP HÀM', sub: 'ĐIỂM TỰA'}, {key: 'co', title: 'BỘ DẪN ĐỘNG KHÉP HÀM', sub: '—'}, {key: 'rang', title: 'RĂNG ĐANG CẮN', sub: '—'}, {key: 'mat', title: 'MẮT', sub: 'THẤU KÍNH'}, {key: 'hong', title: 'CỬA KÍNH HÔNG', sub: 'BÁNH RĂNG · PIN'}]);
const callSub = Object.fromEntries(['khop', 'co', 'rang', 'mat', 'hong'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- tháo từng bộ phận
const wp = (o, x = 0, y = 0, z = 0) => { const v = o.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z]; };
const SRC = 'Số đo: Grubich và cộng sự, Scientific Reports 2012 ("Mega-Bites"): lực cắn 320 N ở cá 368 mm, 1,12 kg; 67 N ở 0,17 kg; log₁₀F = 2,30·log₁₀TL − 3,469; hơn 30 lần trọng lượng; lợi thế cơ học 0,46–0,51 ở răng đầu mút, 1,0 ở răng thứ tư, ≈ 1,5 ở răng sau cùng; cơ khép hàm 26,5 g, tiết diện 23,5 cm²; một hàng 6–7 răng tam giác. FishBase: Serrasalmus rhombeus, W = 0,01288·TL^3,19. Giả định: dáng thân, độ dài hàm 46 mm, vị trí răng, cấu tạo robot.';
const cut = createCutaway({st, ui, parts: [
  {key: 'mat', label: 'MẮT', open: (k) => { OPEN.mat = k; }, at: () => wp(mat[0].g), sub: () => 'thấu kính · ba vòng vặn', cam: {az: 76, el: 16, d: 0.26}, card: () => cardOf('mat')},
  {key: 'ham', label: 'HÀM DƯỚI', open: (k) => { OPEN.ham = k; }, at: () => wp(hamDuoi, 24, 0, 0), sub: () => `${vn(Fbite(), 0)} N ở răng ${toothIdx() + 1}`, cam: {az: 34, el: -6, d: 0.32}, card: () => cardOf('ham')},
  {key: 'co', label: 'CƠ KHÉP HÀM', open: (k) => { OPEN.co = k; }, at: () => wp(coG, HINGE.x - 12, HINGE.y + 22, 20), sub: () => `${vn(Fm(), 0)} N`, cam: {az: 72, el: 30, d: 0.3}, card: () => cardOf('co')},
  {key: 'than', label: 'HÔNG KÍNH', open: (k) => { OPEN.than = k; }, at: () => wp(banhG, 0, 0, 20), sub: () => 'bánh răng · pin', cam: {az: 8, el: 42, d: 0.5}, card: () => cardOf('than')},
  {key: 'duoi', label: 'CUỐNG ĐUÔI', open: (k) => { OPEN.duoi = k; }, at: () => wp(duoi, -12, 0, 0), sub: () => 'ba khớp lồng nhau', cam: {az: -132, el: 14, d: 0.46}, card: () => cardOf('duoi')},
], explode: (k) => { EX = k; }, turn: (d) => { turn.rotation.y = d * D2R; }});
cut.pills(1286, 412, 272);
ui.text(1286, 530, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = 'Bấm một bộ phận: nó tách ra trong 1 giây, vẫn chạy trong lúc treo, máy quay tới gần từ phía riêng.';

// ---------------- mô phỏng
const disp = S.disp;
let lookKey = '';
const applyLook = () => { const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key; const F = new Set(); if (disp.xray) for (const p of plates) p.g.traverse((m) => F.add(m)); xray(mm, 1, (m) => !F.has(m)); xray(mm, 0, (m) => F.has(m)); };
const defaults = () => Object.assign(S, {t: 0, TL: PR.TL, d: PR.jaw, gape: 0.05, gT: 0.05, biting: 0, swim: true, open: false, force: 0, peak: 0, hist: [], log: []});
const sim = {
  S, root, cut,
  reset() { defaults(); cut.reset(); Object.assign(disp, {labels: true, xray: false}); say('bơi chậm · miệng khép'); },
  busy: () => cut.busy(),
  isOn: (k) => (k === 'swim' && S.swim) || (k === 'gape' && S.open) || (k === 'bite' && S.biting > 0),
  act(k) {
    if (cut.act(k)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'bite') { S.biting = 1e-6; S.peak = 0; say(`cắn ở răng ${toothIdx() + 1} · ${vn(Fbite(), 0)} N`); return; }
    if (k === 'gape') { S.open = !S.open; S.gT = S.open ? 0.62 : 0.05; return; }
    if (k === 'swim') { S.swim = !S.swim; }
  },
  slide(k, t) {
    if (k === 'd') S.d = TEETH[0] + (TEETH[6] - TEETH[0]) * t;
    if (k === 'TL') S.TL = 205 + (PR.TL - 205) * t;
  },
  step(dt) {
    S.t += dt;
    // chu kì cắn: há 0,3 s, đóng sập 0,1 s lên đầu đo lực, giữ 0,8 s, nhả
    if (S.biting > 0) {
      S.biting += dt; const b = S.biting;
      S.gT = b < 0.3 ? 0.62 : S.open ? 0.62 : 0.05;
      if (b >= 0.3 && b < 0.4) S.gT = 0.12;
      const clamp = b >= 0.4 && b < 1.2;
      S.force = clamp ? Fbite() * Math.min(1, (b - 0.4) / 0.06) : 0; S.peak = Math.max(S.peak, S.force);
      if (b >= 1.5) { S.biting = 0; S.gT = S.open ? 0.62 : 0.05; }
    } else S.force = 0;
    const gapeRate = S.gT < S.gape ? 18 : 6;
    S.gape += (S.gT - S.gape) * Math.min(1, dt * gapeRate);
    cut.step(dt);
    if ((S.hT = (S.hT || 0) + dt) > 0.04) { S.hT = 0; S.hist.push(S.force); if (S.hist.length > 120) S.hist.shift(); }
  },
  shadowAt() { return new THREE.Vector3(0, 0.05, 0); },
  pick: (hits) => soi(hits),
  measure() {
    const bx = new THREE.Box3(), s = new THREE.Vector3(); turn.rotation.y = 0; sc.scale.setScalar(1); mm.updateWorldMatrix(true, true);
    bx.expandByObject(than); bx.expandByObject(dau); bx.expandByObject(duoi); bx.getSize(s);
    return [{name: 'chiều dài toàn thân (mm)', got: s.x * 1000, want: PR.TL, tol: 0.04}, {name: 'lợi thế cơ học răng đầu mút', got: PR.Lin / TEETH[0], want: 0.485, tol: 0.06},
      {name: 'lợi thế cơ học răng thứ tư', got: PR.Lin / TEETH[3], want: 1.0, tol: 0.02}, {name: 'lợi thế cơ học răng trong cùng', got: PR.Lin / TEETH[6], want: 1.5, tol: 0.02},
      {name: 'lực cắn đầu mút ở 368 mm (N), đo 320', got: biteAt(muscleOf(biteOf(PR.TL)), TEETH[0]), want: 320, tol: 0.01}, {name: 'hồi quy gốc ở 368 mm so với đo (N)', got: biteFit(PR.TL), want: 320, tol: 0.2}];
  },
  draw() {
    const O = OPEN, t = S.t, sw = S.swim && !cut.active ? 1 : 0.25;
    sc.scale.setScalar(S.TL / PR.TL);
    // bơi chậm tại chỗ: thân lắc nhẹ, đuôi quạt
    mm.position.set(0, 0.003 * Math.sin(t * 0.9), 0); // mm nằm trong nhóm đơn vị mét mm.rotation.set(0.03 * Math.sin(t * 0.7), 0.05 * Math.sin(t * 1.6) * sw, 0.02 * Math.sin(t * 0.8));
    duoi.rotation.y = 0.28 * Math.sin(t * 3.2) * sw;
    pect.forEach((f, i) => { f.rotation.x = 0.25 * Math.sin(t * 4 + i * 2); });
    // hàm dưới: góc há (rad), quay quanh khớp; tháo hàm: hạ xuống và tách ra, răng bay ra theo vành
    const ex = EX, oh = O.ham;
    hamDuoi.position.set(HINGE.x + 22 * ex + 10 * oh, HINGE.y - 30 * ex - 26 * oh, 0);
    hamDuoi.rotation.z = -(S.gape + 0.25 * oh);
    teethDuoi.forEach((g) => { const b = g.userData.base, k = 1 + 0; g.position.set(b.x, b.y + 9 * oh * (0.5 + 0.5 * Math.sin(t * 3 + g.userData.i)), b.z + 8 * oh * g.userData.s); void k; });
    teethTren.forEach((g) => { const b = g.userData.base; g.position.set(b.x, b.y - 6 * oh, b.z + 5 * oh * g.userData.s); });
    // bộ dẫn động: từ gốc trên sọ tới mỏm hàm (cách khớp L_in), co lại khi khép hàm; má mở ra
    const ins = new THREE.Vector3(PR.Lin * 0.96, 12, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), hamDuoi.rotation.z).add(hamDuoi.position);
    actuators.forEach((a) => { const o = ORIG.clone(), e = ins.clone(); o.z = e.z = 17 * a.s + 10 * a.s * O.co; const mid = o.clone().lerp(e, 0.38), dir = e.clone().sub(o), len = dir.length(); dir.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); a.cyl.position.copy(o).addScaledVector(dir, 13); a.cyl.quaternion.copy(q); a.rod.position.copy(e).addScaledVector(dir, -15); a.rod.quaternion.copy(q); a.ring.position.copy(o).addScaledVector(dir, 25); a.ring.quaternion.copy(q); void mid; void len;
      const glow = S.force > 1 ? 1 : 0.15; a.ring.material.emissive?.set(C.or); if (a.ring.material.emissive) a.ring.material.emissiveIntensity = glow; });
    coG.position.set(22 * ex, 0, 0);
    ma.forEach((m) => { m.g.rotation.y = -1.1 * O.co * m.s; m.g.position.z = 6 * O.co * m.s; });
    dau.position.set(30 * ex, 6 * ex, 0); hamTren.position.set(0, 0, 0);
    // mắt: ba vòng vặn ra theo trục, thấu kính ra xa nhất
    mat.forEach((e) => { e.rings.forEach((r, k) => { r.position.z = (6 + 7 * k) * O.mat; r.rotation.z = (k % 2 ? 1 : -1) * 2 * O.mat; }); e.lens.position.z = 28 * O.mat; });
    // hông: các tấm quanh cửa kính bung ra, kính mở; bánh răng quay (nhanh hơn khi đang mở)
    plates.forEach((p) => { const k = (p.flank ? O.than : 0) * 1 + ex; p.g.position.copy(p.n).multiplyScalar(18 * k * (p.head ? 0.6 : 1)); });
    winG.position.set(0, 26 * O.than + 30 * ex, 0); winG.rotation.x = 0;
    banhG.position.set(-5, 2 + 4 * O.than, 0);
    gears.forEach(([g, gm], i) => { const w = (i % 2 ? -1 : 1) * (0.6 + 4 * O.than) * (34 / g.userData.r); g.rotation.z = w * t; gm.rotation.z = w * t; });
    // cuống đuôi: ba khớp lồng nhau kéo dài ra
    duoi.position.set(-128 - 40 * ex - 12 * O.duoi, -2, 0); collars.forEach((c, k) => { c.position.x = -k * (9 + 9 * O.duoi); });
    caudal.position.x = -26 - 22 * O.duoi;
    vay.position.set(0, 8 * ex, 0); dorsal.position.y = 14 * ex; anal.position.y = -14 * ex; pelv.forEach((f) => { f.position.y = -10 * ex; }); pect.forEach((f, i) => { f.position.z = (i ? -1 : 1) * (26 + 22 * ex); });
    // đầu đo lực giữa hai hàm ở vị trí răng đang chọn
    const ti = toothIdx(), tg = teethDuoi[ti]; doLuc.visible = S.biting > 0 && !cut.active; if (doLuc.visible) { const p = tg.getWorldPosition(new THREE.Vector3()); mm.worldToLocal(p); doLuc.position.set(p.x, p.y + 8, 0); }
    applyLook();
    cut.draw();
    // bảng 01: sơ đồ đòn bẩy
    const fm = Fm(), fb = Fbite(), X = (d) => 250 - (d / 50) * 230;
    { const xh = X(0), xi = X(PR.Lin), xb = X(S.d), xt = X(PR.jaw); let g = `<rect x="0" y="0" width="272" height="104" fill="${C.chart}" stroke="${C.line}"/>`;
      g += `<line x1="${xh}" y1="62" x2="${xt}" y2="62" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
      g += `<path d="M${xh - 8} 82 L${xh} 64 L${xh + 8} 82 Z" fill="${C.mute}"/><text x="${xh}" y="98" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">khớp</text>`;
      g += `<line x1="${xi}" y1="14" x2="${xi}" y2="56" stroke="${C.ink}" stroke-width="2"/><path d="M${xi - 5} 48 L${xi} 58 L${xi + 5} 48 Z" fill="${C.ink}"/><text x="${xi + 6}" y="22" font-family="JetBrains Mono" font-size="9" fill="${C.ink}">F cơ ${vn(fm, 0)} N</text>`;
      const al = Math.min(48, 12 + fb / 14); g += `<line x1="${xb}" y1="${68 + al}" x2="${xb}" y2="68" stroke="${C.or}" stroke-width="3"/><path d="M${xb - 6} 76 L${xb} 66 L${xb + 6} 76 Z" fill="${C.or}"/>`;
      g += `<text x="${xb + (xb < 140 ? 8 : -6)}" y="${Math.min(100, 72 + al)}" text-anchor="${xb < 140 ? 'start' : 'end'}" font-family="JetBrains Mono" font-size="9" fill="${C.or}">F cắn ${vn(fb, 0)} N</text>`;
      g += `<line x1="${xh}" y1="40" x2="${xi}" y2="40" stroke="${C.mute}" stroke-dasharray="2 2"/><text x="${(xh + xi) / 2}" y="36" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">L_in</text>`;
      levSvg.innerHTML = g; }
    lRows[0][1].textContent = `${vn(fm, 0)} N`; lRows[1][1].textContent = `${vn(PR.Lin, 1)} mm`; lRows[2][1].textContent = `${vn(S.d, 1)} mm`; lRows[3][1].textContent = vn(MA(), 2); lRows[4][1].textContent = `${vn(fb, 0)} N`;
    sl.d.set((S.d - TEETH[0]) / (TEETH[6] - TEETH[0]), `răng ${ti + 1}`); sl.TL.set((S.TL - 205) / (PR.TL - 205), `${vn(S.TL, 0)} mm`);
    // bảng 03: lực cắn ở từng răng
    { let g = `<rect x="0" y="0" width="272" height="96" fill="${C.chart}" stroke="${C.line}"/>`; const mx = biteAt(muscleOf(biteOf(PR.TL)), TEETH[6]) * 1.05;
      TEETH.forEach((d, i) => { const f = biteAt(fm, d), h = (f / mx) * 88, x = 10 + i * 37; g += `<rect x="${x}" y="${(94 - h).toFixed(1)}" width="26" height="${h.toFixed(1)}" fill="${i === ti ? C.or : C.ink}"/><text x="${x + 13}" y="108" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${i + 1}</text><text x="${x + 13}" y="${(90 - h).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono" font-size="8.5" fill="${C.ink}">${vn(f, 0)}</text>`; });
      toothSvg.innerHTML = g; }
    toothTxt.innerHTML = `Cùng một lực cơ, răng càng gần khớp cắn càng mạnh: F = F_cơ·L_in/d. Răng đầu mút neo theo con đo được 320 N; răng 4 và 7 tính từ lợi thế cơ học 1,0 và 1,5.`;
    // bảng 04: hồi quy lực cắn theo chiều dài
    { let g = `<rect x="0" y="0" width="272" height="96" fill="${C.chart}" stroke="${C.line}"/>`; const XL = (L) => 10 + ((L - 200) / 175) * 252, YF = (f) => 90 - (f / 350) * 84; let d = '';
      for (let L = 205; L <= 368; L += 4) d += `${L === 205 ? 'M' : 'L'}${XL(L).toFixed(1)} ${YF(biteOf(L)).toFixed(1)}`;
      let d2 = ''; for (let L = 205; L <= 368; L += 4) d2 += `${L === 205 ? 'M' : 'L'}${XL(L).toFixed(1)} ${YF(biteFit(L)).toFixed(1)}`;
      g += `<path d="${d2}" fill="none" stroke="${C.faint}" stroke-width="1.2" stroke-dasharray="3 3"/><path d="${d}" fill="none" stroke="${C.ink}" stroke-width="1.6"/><circle cx="${XL(368)}" cy="${YF(320)}" r="3.5" fill="none" stroke="${C.or}" stroke-width="1.5"/><text x="${XL(368) - 6}" y="${YF(320) - 6}" text-anchor="end" font-family="JetBrains Mono" font-size="9" fill="${C.or}">đo: 320 N</text>`;
      g += `<circle cx="${XL(S.TL)}" cy="${YF(Ftip())}" r="4" fill="${C.or}"/><text x="10" y="12" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">F (N) · đứt: hồi quy gốc · liền: neo qua 320 N</text>`; sizeSvg.innerHTML = g; }
    const m = massOf(S.TL), Wt = m * 9.81;
    sRows[0][1].textContent = `${vn(m * 1000, 0)} g`; sRows[1][1].textContent = `${vn(Wt, 1)} N`; sRows[2][1].textContent = `${vn(Ftip(), 0)} N`; sRows[3][1].textContent = `${vn(Ftip() / Wt, 0)} lần`;
    // bảng 06: cơ khép hàm
    const csa = csaOf(S.TL), amm = PR.AM * (S.TL / PR.TL) ** 3;
    mRows[0][1].textContent = `${vn(fm, 0)} N`; mRows[1][1].textContent = `${vn(csa, 1)} cm²`; mRows[2][1].textContent = `${vn(fm / csa, 1)} N/cm²`; mRows[3][1].textContent = `${vn(amm, 1)} g`; mRows[4][1].textContent = `${vn((amm / (m * 1000)) * 100, 1)} %`;
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]); ui.setOn('swim', S.swim); ui.setOn('gape', S.open); ui.setOn('bite', S.biting > 0);
    modeEl.textContent = S.biting > 0.4 && S.biting < 1.2 ? `${vn(S.force, 0)} N` : `${vn(fb, 0)} N`;
    modeSub.textContent = `răng ${ti + 1} · cách khớp ${vn(S.d, 1)} mm · lợi thế cơ học ${vn(MA(), 2)} · cá ${vn(S.TL, 0)} mm · ${vn(fb / Wt, 0)} lần trọng lượng`;
    alert.set(S.biting > 0.4 && S.biting < 1.2 ? `ĐẦU ĐO LỰC · ${vn(S.force, 0)} N` : '');
    if (callSub.co) callSub.co.textContent = `${vn(fm, 0)} N · CÁCH KHỚP ${vn(PR.Lin, 0)} MM`;
    if (callSub.rang) callSub.rang.textContent = `RĂNG ${ti + 1} · ${vn(fb, 0)} N`;
    const P = (o, x = 0, y = 0, z = 0) => { const v = wp(o, x, y, z); return st.project(v[0], v[1], v[2]); };
    const lab = disp.labels && !cut.active && EX < 0.05 ? 1 : 0;
    ui.drawCallouts([{key: 'khop', p: P(hamDuoi, 0, 0, 23), dx: -100, dy: 70}, {key: 'co', p: P(coG, ORIG.x, ORIG.y - 10, 22), dx: -120, dy: -70}, {key: 'rang', p: P(tg), dx: 110, dy: 50},
      {key: 'mat', p: P(mat[0].g), dx: 90, dy: -80}, {key: 'hong', p: P(banhG, 0, 10, 24), dx: -110, dy: -110}], lab);
  },
};

// ---------------- soi chi tiết
function cardOf(part) {
  const base = {src: SRC};
  if (part === 'ham') return {...base, k: 'Đòn bẩy loại 3', t: 'Hàm dưới', b: 'Hàm dưới quay quanh khớp hàm. Cơ khép hàm kéo mỏm hàm ở gần khớp (L_in); răng cắn ở xa hơn (d). Cân bằng mô men quanh khớp: F_cắn·d = F_cơ·L_in. Ở răng đầu mút d lớn nên lực cắn chỉ bằng khoảng một nửa lực cơ; ở răng trong cùng d nhỏ nên lực cắn lớn hơn lực cơ.',
    rows: [['L_in (giả định)', `${vn(PR.Lin, 1)} mm`], ['Răng đầu mút', `${vn(TEETH[0], 1)} mm · lợi thế ${vn(PR.Lin / TEETH[0], 2)} (nguồn 0,46–0,51)`], ['Răng thứ tư', `${vn(TEETH[3], 1)} mm · lợi thế 1,0`], ['Răng trong cùng', `${vn(TEETH[6], 1)} mm · lợi thế 1,5`], ['Cá xương trung bình', 'lợi thế 0,27'], ['Lực ở răng đang chọn', () => `${vn(Fbite(), 0)} N`]]};
  if (part === 'co') return {...base, k: 'Lực đóng hàm', t: 'Cơ khép hàm', b: 'Ở cá thật đây là cơ khép hàm, hơn 2 % khối lượng cơ thể; robot thay bằng hai bộ dẫn động thẳng. Lực cơ suy ngược từ lực cắn đo được ở răng đầu mút: F_cơ = F_đầu mút / lợi thế cơ học.',
    rows: [['Lực cơ', () => `${vn(Fm(), 0)} N`], ['Tiết diện (nguồn, 368 mm)', '23,5 cm²'], ['Ứng suất', () => `${vn(Fm() / csaOf(S.TL), 1)} N/cm²`], ['Khối lượng cơ (nguồn)', '26,5 g ở 368 mm']]};
  if (part === 'mat') return {...base, k: 'Thị giác', t: 'Mắt', b: 'Thấu kính đen bóng dưới gờ mày, ba vòng vặn ra khi tháo. Hình dáng mắt là của robot, không phải số đo.', rows: [['Số mắt', '2']]};
  if (part === 'than' || part === 'banh') return {...base, k: 'Thân', t: 'Hông kính và truyền động', b: 'Piranha đen có thân ngắn, cao, dẹt hai bên (FishBase). Robot đặt pin và bánh răng truyền động ở giữa thân, nhìn qua cửa kính hông.',
    rows: [['Dài toàn thân', () => `${vn(S.TL, 0)} mm`], ['Khối lượng (FishBase)', () => `${vn(massOf(S.TL) * 1000, 0)} g`], ['Dài tối đa (FishBase)', '41,5 cm (SL)'], ['Nặng tối đa (FishBase)', '3,8 kg']]};
  if (part === 'duoi' || part === 'vay') return {...base, k: 'Bơi', t: part === 'duoi' ? 'Cuống đuôi' : 'Vây', b: 'Cuống đuôi ba khớp lồng nhau kéo vây đuôi chẻ đôi quạt qua lại. Bài này tập trung vào hàm; cách cá bơi xem bài Robot cá mập mako.', rows: [['Vây đuôi', 'chẻ đôi']]};
  return null;
}
const soi = picker((part) => cardOf(part));

// ---------------- góc nhìn
const views = {
  hero: (t) => ({tx: 0.01, ty: Y0, tz: 0, az: 50 + 5 * Math.sin(t * 0.12), el: 14, d: 0.82, sx: 0, sy: -30}),
  side: () => ({tx: 0, ty: Y0, tz: 0, az: 0, el: 4, d: 0.8, sx: 0, sy: -40}),
  top: () => ({tx: 0, ty: Y0, tz: 0, az: 0, el: 84, d: 0.85, sx: 0, sy: -20}),
  jaw: () => { const p = wp(hamDuoi, 24, 0, 0); return {tx: p[0], ty: p[1], tz: p[2], az: 30, el: 4, d: 0.34, sx: 0, sy: -30}; },
};
views.cut = (t) => cut.view(views.hero(t)) || views.hero(t);

// ---------------- bài giảng
const CAP = [
  {k: 'PIRANHA ĐEN · 368 MM · 1,12 KG', t: 'Cú cắn mạnh nhất từng đo ở cá', b: 'Năm 2012, nhóm Grubich đo lực cắn của 15 con piranha đen ngoài tự nhiên. Con lớn nhất, dài 368 mm, nặng 1,12 kg, cắn 320 N: mạnh nhất từng đo ở cá xương và cá sụn, hơn 30 lần trọng lượng của nó. Robot này dựng theo con cá đó.', e: '320 N ÷ (1,12 kg × 9,81 m/s²) ≈ 29'},
  {k: 'ĐÒN BẨY · QUY TẮC MÔ MEN', t: 'Hàm dưới là một đòn bẩy', b: 'Hàm dưới quay quanh khớp hàm (điểm tựa). Cơ khép hàm kéo ở gần khớp, cách L_in; răng cắn ở xa hơn, cách d. Hàm đứng yên khi hai mô men quanh khớp cân bằng: F_cắn·d = F_cơ·L_in. Bấm “Cắn” để xem đầu đo lực.', e: 'F_cắn = F_cơ × L_in / d · lợi thế cơ học = L_in / d',
    ask: {q: 'Cơ khép hàm kéo cách khớp 22 mm, răng cách khớp 46 mm. Lực cắn bằng bao nhiêu lần lực cơ?', o: ['2,1 lần', 'Khoảng 0,48 lần', 'Bằng nhau'], a: 1, e: 'F_cắn/F_cơ = L_in/d = 22/46 ≈ 0,48: răng đầu mút có tay đòn dài nên lực nhỏ hơn lực cơ.'}},
  {k: 'DỌC HÀM · 0,5 → 1,5', t: 'Răng trong cắn mạnh hơn răng ngoài', b: 'Kéo “vị trí cắn” từ răng đầu mút vào trong: d ngắn lại nên lực cắn tăng. Đo trên piranha đen, lợi thế cơ học ở răng đầu mút khoảng 0,5, ở răng thứ tư 1,0, ở răng trong cùng khoảng 1,5; nhiều loài cá xương khác chỉ 0,27.', e: 'răng 1: 0,48 · răng 4: 1,0 · răng 7: 1,5'},
  {k: 'CƠ KHÉP HÀM', t: 'Suy ngược lực cơ từ lực cắn', b: 'Biết lực cắn ở răng đầu mút và lợi thế cơ học ở đó, suy ra lực cơ: 320 N ÷ 0,48 ≈ 670 N. Cơ này nặng 26,5 g, tiết diện 23,5 cm² ở con 368 mm, chia ra mỗi xăng-ti-mét vuông cơ kéo khoảng 28 N.', e: 'F_cơ = F_đầu mút / 0,48 · ứng suất = F_cơ / tiết diện'},
  {k: 'THEO CỠ CÁ', t: 'Cá dài gấp đôi, cắn mạnh gấp gần năm', b: 'Lực cắn đo được tăng nhanh hơn chiều dài: log₁₀F = 2,30·log₁₀TL − 3,469, tức F tỉ lệ với TL^2,3 (đường đứt ở bảng 04). Con 368 mm cắn mạnh hơn trung bình, nên bài neo đường cong qua điểm đo 320 N mà giữ độ dốc 2,30. Kéo “chiều dài cá” từ 205 lên 368 mm: lực cắn tăng khoảng 3,8 lần, khối lượng tăng theo TL^3,19.', e: 'F ∝ TL^2,30 · khối lượng ∝ TL^3,19',
    ask: {q: 'Vì sao cá nhỏ lại cắn mạnh hơn so với trọng lượng của nó?', o: ['Vì răng cá nhỏ sắc hơn', 'Vì lực cắn tăng theo TL^2,3 còn khối lượng tăng nhanh hơn, theo TL^3,19', 'Vì cá nhỏ có nhiều răng hơn'], a: 1, e: 'Chia hai lũy thừa: F/W ∝ TL^(2,30 − 3,19) giảm khi cá lớn lên.'}},
  {k: 'MẮT', t: 'Thấu kính vặn ra', b: 'Ba vòng vặn quanh mắt tháo ra theo trục, thấu kính ra sau cùng. Mỗi bộ phận tháo rời có góc máy riêng nhắm vào chính nó.', e: 'tháo theo trục mắt'},
  {k: 'HÔNG KÍNH VÀ CUỐNG ĐUÔI', t: 'Bên trong thân', b: 'Các tấm giáp quanh cửa kính hông bung ra để thấy bánh răng truyền động và pin; cuống đuôi kéo dài ba khớp. Phần bơi xem kĩ hơn ở bài Robot cá mập mako.', e: 'bánh răng · pin · ba khớp đuôi'},
  {k: 'SO SÁNH', t: 'Mạnh gần gấp ba cá sấu cùng cỡ', b: 'Theo nhóm Grubich, cú cắn của piranha đen mạnh gần gấp ba một con cá sấu Mỹ cùng kích thước. Bí quyết nằm ở cơ khép hàm rất lớn so với thân và hàm ngắn, tay đòn cắn ngắn.', e: 'hàm ngắn + cơ lớn = lực cắn lớn'},
  {k: 'PHIM THÁO RỜI', t: 'Từng bộ phận, rồi cả con', b: 'Mỗi bộ phận tách ra dưới một góc máy riêng, rồi cả con bung ra trên bàn xoay và lắp lại. Bấm từng nút ở bảng 05 để tự tháo.', e: 'mắt → hàm dưới → cơ khép hàm → hông kính → cuống đuôi → cả con'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(2.5, {click: 'gape'}); at(5, {click: 'gape'}); at(6, {click: 'bite'});
at(10, {cap: 1}); at(10.5, {click: 'v_jaw'}); at(12, {click: 'bite'}); at(15, {click: 'cut_ham'}); at(21, {click: 'cut_ham'});
at(23, {cap: 2}); at(23.5, {click: 'v_jaw'}); at(24, {slide: 'd', to: 0.5, dur: 1.5}); at(26, {click: 'bite'}); at(28, {slide: 'd', to: 1, dur: 1.2}); at(30, {click: 'bite'}); at(32, {slide: 'd', to: 0, dur: 1});
at(34, {cap: 3}); at(34.5, {click: 'cut_co'}); at(37, {click: 'bite'}); at(42, {click: 'cut_co'});
at(44, {cap: 4}); at(44.5, {click: 'v_hero'}); at(45, {slide: 'TL', to: 0, dur: 2.5}); at(49, {slide: 'TL', to: 1, dur: 2.5});
at(53, {cap: 5}); at(53.5, {click: 'cut_mat'}); at(59.5, {click: 'cut_mat'});
at(61, {cap: 6}); at(61.5, {click: 'cut_than'}); at(66.5, {click: 'cut_duoi'}); at(71.5, {click: 'cut_duoi'});
at(73, {cap: 7}); at(73.5, {click: 'v_side'}); at(74, {click: 'bite'}); at(78, {click: 'v_hero'});
at(80, {cap: 8}); at(80.5, {click: 'cut_film'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 80.5 + cut.duration + 2}, firstView: 'hero',
  extra: [{key: 'bite', label: 'Cắn'}, {key: 'gape', label: 'Há miệng'}, {key: 'swim', label: 'Bơi'}],
  shell: {subject: 'Vật lí 10 · mô men lực', objectives: ['Vận dụng quy tắc mô men cho đòn bẩy: F_cắn·d = F_cơ·L_in', 'Giải thích vì sao răng gần khớp cắn mạnh hơn răng đầu mút', 'Suy lực cơ từ lực cắn đo được và đọc quan hệ lực cắn theo kích thước'],
    credit: 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial, claude-motion của whaleyxbt và cutaway của Nyxera0x (MIT). Số đo theo Grubich và cộng sự (2012) và FishBase; chỗ giả định ghi rõ trong thẻ soi.'},
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_jaw', 4: 'v_top', b: 'bite', g: 'gape', s: 'swim', n: 'labels', x: 'xray', q: 'cut_mat', w: 'cut_ham', e: 'cut_co', r: 'cut_than', d: 'cut_duoi', f: 'cut_film', t: 'cut_all'}});
