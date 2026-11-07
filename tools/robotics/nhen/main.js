// Nhện robot chân thuỷ lực (theo tarantula Aphonopelma hentzi): trang chạy trực tiếp. Bơm trong đầu ngực tạo áp suất
// truyền nguyên vẹn tới tám chân (định luật Pascal); túi duỗi ở khớp đùi–gối và chày–bàn đổi áp suất thành mô men duỗi;
// dáng chạy hai nhóm bốn chân, tần số bước theo nhiệt độ. Tháo từng bộ phận bằng kit/tach.js (theo cutaway của
// Nyxera0x, MIT). Số đo đọc từ kin.js; đơn vị hình học trong cảnh là milimét, cả cụm thu 1/1000 về mét.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createStage, MAT, xray} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {createCutaway} from '../kit/tach.js';
import {SP, LEGS, GROUP, SEG_VN, strideHz, speedOf, legFK, legIK, kneeTau, pNeed} from './kin.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.12, grid: 0.001, fade: 0.5, fov: 26, near: 0.003, far: 4});
const ui = createUI(app);
const root = new THREE.Group(); st.scene.add(root);
const turn = new THREE.Group(); root.add(turn);
const mm = new THREE.Group(); mm.scale.setScalar(0.001); turn.add(mm);
const bodyG = new THREE.Group(); mm.add(bodyG); // thân: đầu ngực, bụng; chân gắn vào thân

// ---------------- vật liệu
const M_ = {
  shell: MAT.shell('#f3f2ef'), dark: new THREE.MeshStandardMaterial({color: '#121316', metalness: 0.25, roughness: 0.55, envMapIntensity: 0.4}), dark2: MAT.satin('#24262a'),
  steel: MAT.steel(), acc: MAT.accent(), lens: new THREE.MeshPhysicalMaterial({color: '#050506', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, metalness: 0.2}),
  memb: new THREE.MeshPhysicalMaterial({color: '#f4efe6', roughness: 0.55, transmission: 0, transparent: true, opacity: 0.88, clearcoat: 0.3}),
  glass: new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 0.5}),
  fluid: new THREE.MeshStandardMaterial({color: '#e3562a', emissive: '#e3562a', emissiveIntensity: 0.3, metalness: 0.1, roughness: 0.4}),
  bristle: new THREE.MeshStandardMaterial({color: '#0b0b0c', roughness: 0.7}),
};
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
// đốt chân dọc trục +x: ống thon kèm gai mảnh (0,15–0,25 bề dày, 10–20 gai), bám chặt vào một hình
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function segGeo(len, r0, r1, nb) {
  const tube = new THREE.CylinderGeometry(r1, r0, len, 14, 1).rotateZ(-Math.PI / 2).translate(len / 2, 0, 0);
  const list = [tube];
  for (let i = 0; i < nb; i++) {
    const u = 0.12 + 0.8 * rnd(), r = r0 + (r1 - r0) * u, a = rnd() * Math.PI * 2, bl = (0.15 + 0.1 * rnd()) * 2 * r;
    const b = new THREE.CylinderGeometry(0.035, 0.055, bl, 4).translate(0, bl / 2, 0);
    b.rotateZ(-0.5); b.rotateX(a); b.translate(u * len, 0, 0);
    // dời gốc gai ra mặt ống
    const off = new THREE.Vector3(0, Math.cos(a), Math.sin(a)).multiplyScalar(r * 0.92); b.translate(0, off.y, off.z);
    list.push(b);
  }
  return merge(list);
}
const ringGeo = (r) => new THREE.TorusGeometry(r, 0.22, 8, 24).rotateY(Math.PI / 2);

// ---------------- đầu ngực: thân tối bên trong, mai chia tấm có khe, gò mắt tám mắt, kìm và nanh, bơm, ống dẫn dịch
const nguc = new THREE.Group(); bodyG.add(nguc);
const inner = mk(new THREE.SphereGeometry(8.3, 32, 20), M_.dark, nguc); inner.scale.set(1.38, 0.62, 1.0);
const plates = [];
{ const mkPlate = (p0, pl, t0, tl, grp) => { const g = new THREE.SphereGeometry(9, 20, 10, p0, pl, t0, tl); const m = mk(g, M_.shell, grp); m.scale.set(1.35, 0.6, 1.0); return m; };
  const cap = new THREE.Group(); nguc.add(cap); plates.push({g: cap, dir: [-1.1, 1, 0], tilt: 1}); mkPlate(0, Math.PI * 2, 0, 0.5, cap);
  for (let i = 0; i < 8; i++) { const g = new THREE.Group(); nguc.add(g); const p0 = (i / 8) * Math.PI * 2 + 0.05; mkPlate(p0, Math.PI / 4 - 0.1, i % 2 ? 0.56 : 0.6, i % 2 ? 0.86 : 0.7, g); const mid = p0 + Math.PI / 8 - 0.05; plates.push({g, dir: [Math.cos(mid), 0.6, -Math.sin(mid)]}); }
  const sternum = mk(new THREE.SphereGeometry(7.2, 24, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), M_.dark2, nguc); sternum.scale.set(1.3, 0.55, 0.95); }
// gò mắt và tám mắt (hai mắt giữa trước lớn có viền màu nhấn)
const matG = new THREE.Group(); matG.position.set(6.0, 5.2, 0); nguc.add(matG);
mk(new THREE.SphereGeometry(2.0, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M_.shell, matG).scale.set(1.2, 0.8, 1.0);
const eyes = [];
for (const [x, y, z, r, big] of [[1.6, 1.1, 0.6, 0.62, 1], [1.6, 1.1, -0.6, 0.62, 1], [1.9, 0.6, 1.5, 0.4, 0], [1.9, 0.6, -1.5, 0.4, 0], [0.6, 1.4, 1.2, 0.38, 0], [0.6, 1.4, -1.2, 0.38, 0], [0.9, 0.9, 1.9, 0.33, 0], [0.9, 0.9, -1.9, 0.33, 0]]) {
  const g = new THREE.Group(); g.position.set(x, y, z); matG.add(g); g.userData.base = [x, y, z];
  mk(new THREE.SphereGeometry(r, 16, 12), M_.lens, g);
  if (big) { const ring = mk(new THREE.TorusGeometry(r * 1.05, 0.07, 6, 24), M_.acc, g); ring.lookAt(new THREE.Vector3(x + 1, y * 0.6, z * 1.2)); ring.position.set(0, 0, 0); }
  eyes.push(g);
}
// kìm (chelicerae) và nanh
const nanhG = new THREE.Group(); nanhG.position.set(10.6, 0.4, 0); nguc.add(nanhG);
const fangs = [];
for (const s of [1, -1]) {
  const g = new THREE.Group(); g.position.set(0, 0, 2.0 * s); nanhG.add(g);
  const base = mk(new THREE.SphereGeometry(2.3, 16, 12), M_.shell, g); base.scale.set(1.5, 1.1, 0.9); base.position.set(1.2, 0.4, 0);
  mk(new THREE.SphereGeometry(1.6, 14, 10), M_.dark, g).position.set(2.6, -0.6, 0);
  const fg = new THREE.Group(); fg.position.set(3.4, -1.3, 0); g.add(fg); fangs.push(fg);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.6, -1.4, 0), new THREE.Vector3(0.1, -2.9, 0), new THREE.Vector3(-1.0, -3.6, 0)]);
  const tube = new THREE.TubeGeometry(curve, 16, 0.42, 8, false);
  mk(tube, M_.lens, fg); mk(new THREE.ConeGeometry(0.42, 0.9, 8).rotateZ(Math.PI * 0.65).translate(-1.3, -3.75, 0), M_.acc, fg);
}
// bơm thuỷ lực (giả định cho robot; nhện thật tạo áp suất bằng cách co phần đầu ngực): xi lanh, pít tông, vòng nhấn
const bom = new THREE.Group(); bom.position.set(-1, 0.5, 0); nguc.add(bom);
mk(new THREE.CylinderGeometry(2.4, 2.4, 5.2, 24), M_.dark2, bom); mk(new THREE.TorusGeometry(2.45, 0.18, 8, 28).rotateX(Math.PI / 2).translate(0, 1.6, 0), M_.acc, bom);
const piston = mk(new THREE.CylinderGeometry(1.0, 1.0, 4.0, 16), M_.steel, bom); piston.position.y = 3.0;
const tubes = [];
// ---------------- bụng: khung đai trắng, kính trong, bình chứa dịch, lò xo tích áp sáng theo áp suất, núm nhả tơ
const bung = new THREE.Group(); bung.position.set(-25.5, 2.4, 0); bodyG.add(bung);
const bands = [];
{ const RX = 13.8, RY = 10.2, RZ = 10.8;
  for (let i = 0; i < 6; i++) { const u = -0.82 + i * 0.33, x = u * RX, s = Math.sqrt(Math.max(0.05, 1 - u * u)); const g = new THREE.Group(); g.position.x = x; bung.add(g); const t = mk(new THREE.TorusGeometry(1, 0.1, 8, 40).rotateY(Math.PI / 2), M_.shell, g); t.scale.set(1, RY * s, RZ * s); bands.push({g, i, x}); }
  const spine = new THREE.Group(); bung.add(spine); bands.push({g: spine, i: 6, x: 0});
  const pts = []; for (let i = 0; i <= 24; i++) { const u = -0.95 + (1.9 * i) / 24; pts.push(new THREE.Vector3(u * RX, RY * Math.sqrt(Math.max(0, 1 - u * u)) + 0.2, 0)); }
  mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.1, 8, false), M_.shell, spine);
  const gl = mk(new THREE.SphereGeometry(1, 36, 24), M_.glass, bung); gl.scale.set(RX, RY, RZ); gl.userData.cast = false; gl.castShadow = false; }
const ruot = new THREE.Group(); bung.add(ruot);
mk(new THREE.CapsuleGeometry(7.2, 11, 8, 24).rotateZ(Math.PI / 2), M_.dark, ruot); // bình chứa dịch
const coilPts = []; for (let i = 0; i <= 200; i++) { const u = i / 200, a = u * Math.PI * 2 * 7; coilPts.push(new THREE.Vector3(-6.5 + 13 * u, 7.7 * Math.cos(a), 7.7 * Math.sin(a))); }
const coil = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 480, 0.16, 6, false), M_.steel, ruot); // lò xo tích áp
const level = mk(new THREE.CylinderGeometry(7.3, 7.3, 0.5, 32).rotateZ(Math.PI / 2), M_.fluid, ruot); level.position.x = 4.6; // vạch dịch
for (let i = 0; i < 3; i++) mk(new THREE.BoxGeometry(3.0, 2.0, 6.4), M_.dark2, ruot).position.set(-4 + i * 3.6, -8.2, 0);
for (const s of [1, -1]) for (const k of [0, 1]) { const sp = mk(new THREE.CylinderGeometry(0.5, 0.35, 3.2 - k, 10).rotateZ(Math.PI / 2 - 0.4), M_.dark2, bung); sp.position.set(-14.4 - k, -1 + k * 0.8, 1.1 * s * (k + 1)); }
mk(new THREE.CylinderGeometry(1.5, 1.8, 3.4, 16).rotateZ(Math.PI / 2), M_.dark2, bodyG).position.set(-11.6, 1.2, 0); // cuống nối (pedicel)

// ---------------- tám chân: mỗi chân một chuỗi nhóm lồng nhau (háng → đùi → gối+chày → bàn+cổ chân)
const LG = LEGS.map((L, i) => {
  const g = new THREE.Group(); g.position.set(L.root[0], -1.2, L.root[1]); bodyG.add(g);
  const r = (L.id === 'IV' ? 1.5 : L.id === 'III' ? 1.3 : L.id === 'II' ? 1.36 : 1.42);
  const Lc = L.seg[0] + L.seg[1];
  mk(segGeo(Lc, r * 1.2, r * 1.05, 10), M_.dark2, g);
  const fem = new THREE.Group(); fem.position.set(Lc, -Lc * Math.sin(0.18), 0); g.add(fem);
  mk(ringGeo(r * 1.05), M_.dark2, fem);
  mk(segGeo(L.Lf, r, r * 0.9, 30), M_.shell, fem);
  const pat = new THREE.Group(); pat.position.set(L.Lf, 0, 0); fem.add(pat);
  mk(new THREE.SphereGeometry(r * 0.95, 14, 10), M_.dark, pat);
  const bel1 = mk(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 1.6, 12), M_.memb, pat); bel1.position.set(0, r * 0.85, 0); bel1.rotation.z = 0;
  mk(new THREE.TorusGeometry(r * 0.95, 0.12, 6, 20).rotateY(Math.PI / 2), M_.acc, pat);
  mk(segGeo(L.Lpt, r * 0.88, r * 0.74, 34), M_.dark2, pat);
  mk(segGeo(L.seg[3], r * 0.97, r * 0.92, 14), M_.shell, pat); // đốt gối sáng: vân sọc như chân tarantula
  const mt = new THREE.Group(); mt.position.set(L.Lpt, 0, 0); pat.add(mt);
  mk(new THREE.SphereGeometry(r * 0.78, 12, 8), M_.dark, mt);
  const bel2 = mk(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 1.3, 12), M_.memb, mt); bel2.position.set(0, r * 0.7, 0);
  mk(segGeo(L.Lmt, r * 0.7, r * 0.42, 28), M_.dark, mt);
  const tip = new THREE.Object3D(); tip.position.set(L.Lmt, 0, 0); mt.add(tip);
  // gân gập (cơ gập kéo phía bụng chân): dây tối
  const tendon = mk(new THREE.CylinderGeometry(0.16, 0.16, L.Lf * 0.9, 6).rotateZ(Math.PI / 2).translate(L.Lf * 0.5, -r * 0.8, 0), M_.dark2, fem);
  tag(`leg:${i}`, ...(() => { const a = []; g.traverse((m) => { if (m.isMesh) a.push(m); }); return a; })());
  return {L, i, g, fem, pat, mt, tip, bel1, bel2, r, Lc, tendon, a: 0.5, b: 1.0, ab: [0.4, 0.9]};
});
// ống dẫn dịch: từ bơm tới gốc từng chân
for (const o of LG) {
  const a = new THREE.Vector3(-1, 0.6, 0), b = new THREE.Vector3(o.L.root[0], -0.8, o.L.root[1]), m = a.clone().lerp(b, 0.5); m.y += 2.4;
  const t = mk(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 16, 0.32, 6, false), M_.fluid, nguc); tubes.push(t);
}
// chân xúc giác (pedipalp): ngắn, đứng yên
for (const s of [1, -1]) {
  const g = new THREE.Group(); g.position.set(9.5, -1.2, 3.4 * s); g.rotation.y = -0.25 * s; nguc.add(g);
  mk(segGeo(5, 1.0, 0.9, 6), M_.shell, g); const k = new THREE.Group(); k.position.set(5, 0, 0); k.rotation.z = -0.9; g.add(k); mk(segGeo(6, 0.9, 0.7, 8), M_.shell, k);
  const k2 = new THREE.Group(); k2.position.set(6, 0, 0); k2.rotation.z = -0.7; k.add(k2); mk(segGeo(5, 0.7, 0.5, 8), M_.dark, k2);
}
tag('nguc', ...(() => { const a = []; for (const p of plates) p.g.traverse((m) => { if (m.isMesh) a.push(m); }); a.push(inner); return a; })());
tag('bom', ...(() => { const a = []; bom.traverse((m) => { if (m.isMesh) a.push(m); }); return [...a, ...tubes]; })());
tag('mat', ...(() => { const a = []; matG.traverse((m) => { if (m.isMesh) a.push(m); }); return a; })());
tag('nanh', ...(() => { const a = []; nanhG.traverse((m) => { if (m.isMesh) a.push(m); }); return a; })());
tag('bung', ...(() => { const a = []; bung.traverse((m) => { if (m.isMesh) a.push(m); }); return a; })());
bodyG.traverse((m) => { if (m.isMesh && m.material !== M_.fluid && m.material !== M_.glass) m.material = m.material.clone(); });
// vật được nâng (tải thêm): khối gỗ treo dưới bụng khi kéo "tải thêm"
const load = mk(new THREE.BoxGeometry(10, 8, 10), MAT.satin('#c9a46b'), mm); load.visible = false;

// ---------------- trạng thái
const S = {t: 0, T: 26, run: false, auto: true, P: SP.Prest, Pc: SP.Prest, leak: false, dump: false, extra: 0, phase: 0, x: 0, h: 13.5, hNom: 13.5, curl: 0, need: 0, needs: new Array(8).fill(0),
  feet: null, hist: [], log: [], rng: {fp: [9, -9], hp: [9, -9], fd: [9, -9], hd: [9, -9]}, rngT: 0, disp: {labels: true, xray: false}};
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const OPEN = {mat: 0, chan: 0, nguc: 0, bung: 0, nanh: 0};
let EX = 0;
const mass = () => SP.m + S.extra / 1000;
const DUTY = 0.55, LIFT = 6;
const Lc = (o) => o.Lc;
// điểm đặt chân trung tính trong khung thân (mm)
const neutral = (o) => { const L = o.L, a = L.yaw0 * D2R, R = Lc(o) + 0.8 * (L.Lf + L.Lpt + L.Lmt); return [L.root[0] + R * Math.cos(a), L.root[1] + R * Math.sin(a)]; };

// ---------------- bảng
ui.header({code: 'TH-A', kicker: 'NHỆN ROBOT 8 CHÂN · CHÂN DUỖI BẰNG ÁP SUẤT · THEO TARANTULA Aphonopelma hentzi', title: 'Nhện chân thuỷ lực', sub: 'ÁP SUẤT · ĐỊNH LUẬT PASCAL · MÔ MEN · DÁNG CHẠY', hub: HUB_URL,
  right: [['15,5 g', 'KHỐI LƯỢNG'], ['5,3 cm', 'THÂN DÀI'], ['5,97 cm', 'SẢI BƯỚC'], ['6,7 kPa', 'ÁP SUẤT NGHỈ']]});
const BEATS = ['Toàn thân', 'Pascal', 'Túi duỗi', 'Đứng', 'Chạy', 'Nhiệt độ', 'Xả áp', 'Mắt, nanh', 'Phim'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 236, 'ÁP SUẤT · PASCAL', '01');
ui.text(42, 146, 'ÁP SUẤT TRONG CHÂN'); const pBig = ui.text(42, 159, '', 'mo', 'position:absolute;font-size:26px;font-weight:700');
const pSub = ui.text(186, 166, '', 'v', 'font-size:11px;width:128px;text-align:right');
const pChart = ui.chart(42, 200, 272, 70, {min: 0, max: 70, colors: [C.or, C.ink], dash: [0, '3 3']});
ui.text(42, 276, 'CAM: ÁP SUẤT · NÉT ĐỨT: ÁP SUẤT CẦN · KPA · 6 GIÂY');
const pTxt = ui.text(42, 296, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45');
ui.panel(28, 360, 300, 214, 'ĐIỀU KHIỂN', '02');
ui.buttons([['run', 'CHẠY'], ['stand', 'ĐỨNG'], ['auto', 'TỰ BƠM'], ['dump', 'XẢ ÁP'], ['leak', 'RÒ RỈ']], 42, 394, 272);
const SL = [['T', 'NHIỆT ĐỘ'], ['Pc', 'ÁP SUẤT BƠM'], ['extra', 'TẢI THÊM']];
const sl = Object.fromEntries(SL.map(([k, n], i) => [k, ui.slider(k, 42, 464 + i * 30, 272, n, {lw: 92, vw: 74})]));
ui.panel(28, 586, 300, 180, 'TÁM CHÂN · ÁP SUẤT CẦN', '03');
const legSvg = ui.svg(42, 620, 272, 100);
const legTxt = ui.text(42, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 256, 'DÁNG CHẠY · HAI NHÓM BỐN CHÂN', '04');
const gaitSvg = ui.svg(1286, 146, 272, 92);
const gRows = ['TẦN SỐ BƯỚC', 'TỐC ĐỘ', 'SẢI BƯỚC', 'THÂN / GIÂY'].map((n, k) => [ui.text(1286, 252 + k * 20, n), ui.text(1440, 250 + k * 20, '', 'v', 'width:118px;text-align:right')]);
ui.panel(1272, 380, 300, 200, 'THÁO TỪNG BỘ PHẬN', '05');
ui.panel(1272, 592, 300, 174, 'KHỚP THUỶ LỰC · ĐO / NGUỒN', '06');
ui.text(1286, 624, 'KHỚP'); ui.text(1430, 624, 'ĐO ĐƯỢC'); ui.text(1508, 624, 'NGUỒN');
const jRows = [['Đùi–gối · chân I', 70], ['Đùi–gối · chân IV', 53], ['Chày–bàn · chân I', 36], ['Chày–bàn · chân IV', 27]].map(([n, src], k) => { ui.text(1286, 644 + k * 20, n, 'v', 'font-size:11.5px;font-weight:600'); const v = ui.text(1430, 644 + k * 20, '', 'v', 'font-size:11.5px'); ui.text(1508, 644 + k * 20, `${src}°`, 'v', 'font-size:11.5px'); return v; });
ui.text(1286, 730, 'BIÊN ĐỘ GÓC KHI CHẠY · BOOSTER VÀ CỘNG SỰ 2015');
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_top', 'TRÊN'], ['v_leg', 'MỘT CHÂN'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 360, 120, 600);
ui.text(362, 664, 'TRẠNG THÁI');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([{key: 'bom', title: 'BƠM DỊCH', sub: '—'}, {key: 'bel', title: 'TÚI DUỖI ĐÙI–GỐI', sub: 'KHỚP THUỶ LỰC'}, {key: 'mat', title: 'TÁM MẮT', sub: 'GÒ MẮT'}, {key: 'bung', title: 'BÌNH TÍCH ÁP', sub: 'BỤNG'}, {key: 'tip', title: 'ĐẦU CHÂN', sub: '—'}]);
const callSub = Object.fromEntries(['bom', 'bel', 'mat', 'bung', 'tip'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- tháo từng bộ phận
const wp = (o, dx = 0, dy = 0, dz = 0) => { const v = o.localToWorld(new THREE.Vector3(dx, dy, dz)); return [v.x, v.y, v.z]; };
const FL = LG[0]; // chân phải I
const SRC = 'Số đo: Booster và cộng sự, J. Exp. Biol. 2015 (Aphonopelma hentzi: 15,5 g, sải bước 5,97 cm, 3,83–9,40 Hz, 21–53 cm/s, biên độ khớp, 8–20 µl). Parry và Brown, J. Exp. Biol. 1959 (áp suất nghỉ ≈ 5 cmHg, đỉnh 40–45 cmHg; mô men duỗi tỉ lệ áp suất). Landkammer và cộng sự, Robotics 2016 (nghỉ 0,01–0,15 bar; cử động 0,1–0,64 bar; đầu ngực co làm tăng áp suất mọi chân cùng lúc). Wikipedia: Arachnid locomotion, Aphonopelma hentzi. Đại học Rice 2022 (necrobotics). Giả định: độ dài đốt, A·r của túi duỗi, bơm pít tông của robot.';
const cut = createCutaway({st, ui, parts: [
  {key: 'mat', label: 'TÁM MẮT', open: (k) => { OPEN.mat = k; }, at: () => wp(matG, 1.5, 1, 0), sub: () => '2 mắt giữa trước lớn', cam: {az: 84, el: 30, d: 0.07}, card: () => cardOf('mat')},
  {key: 'chan', label: 'CHÂN TRƯỚC', open: (k) => { OPEN.chan = k; }, at: () => wp(FL.pat, 0, 0, 0), sub: () => `túi duỗi · ${vn(S.P / 1000, 1)} kPa`, cam: {az: 18, el: 10, d: 0.11}, card: () => cardOf('leg:0')},
  {key: 'nguc', label: 'ĐẦU NGỰC', open: (k) => { OPEN.nguc = k; }, at: () => wp(bom, 0, 3, 0), sub: () => `bơm · ${vn(S.P / 1000, 1)} kPa`, cam: {az: 128, el: 62, d: 0.1}, card: () => cardOf('bom')},
  {key: 'bung', label: 'BỤNG', open: (k) => { OPEN.bung = k; }, at: () => wp(bung, 0, 2, 0), sub: () => 'bình chứa · lò xo tích áp', cam: {az: -150, el: 26, d: 0.12}, card: () => cardOf('bung')},
  {key: 'nanh', label: 'KÌM VÀ NANH', open: (k) => { OPEN.nanh = k; }, at: () => wp(nanhG, 3, -2, 0), sub: () => 'đầu nanh màu nhấn', cam: {az: 66, el: 4, d: 0.065}, card: () => cardOf('nanh')},
], explode: (k) => { EX = k; }, turn: (d) => { turn.rotation.y = d * D2R; }});
cut.pills(1286, 412, 272);
ui.text(1286, 530, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = 'Bấm một bộ phận: nó tách ra trong 1 giây, vẫn chạy trong lúc treo; nhện đứng lại, máy quay tới gần từ phía riêng.';

// ---------------- mô phỏng
const disp = S.disp;
const legTarget = (o, footB) => { // đầu chân trong khung thân → góc quay háng, (α, β)
  const L = o.L, dx = footB[0] - L.root[0], dz = footB[2] - L.root[1], yaw = Math.atan2(dz, dx);
  const hip = [L.root[0] + o.Lc * Math.cos(yaw), -1.2 - o.Lc * Math.sin(0.18), L.root[1] + o.Lc * Math.sin(yaw)];
  const rho = Math.hypot(footB[0] - hip[0], footB[2] - hip[2]), h = footB[1] - hip[1];
  let ik = legIK(L, rho, h, o.ab);
  if (!ik.ok || ik.a > 0.95) for (const g of [[0.3, 0.8], [0.2, 0.4], [0.5, 1.0]]) { const r = legIK(L, rho, h, g); if (r.ok && (!ik.ok || r.a < ik.a)) ik = r; } // nhánh nghiệm gối thấp
  o.ab = [ik.a, ik.b];
  return {yaw, a: ik.a, b: ik.b, ok: ik.ok};
};
function gait(dt) {
  const f = strideHz(S.T), v = S.run && !cut.active && !EX ? speedOf(S.T) : 0;
  if (v) S.phase = (S.phase + dt * f) % 1;
  S.x += v * dt;
  const step = SP.stride * DUTY; // quãng đầu chân lùi trong khung thân khi chống
  S.feet = LG.map((o) => {
    const n = neutral(o), grp = GROUP(o.L), ph = (S.phase + grp * 0.5) % 1;
    if (!v) return {b: [n[0], -S.h, n[1]], stance: true};
    if (ph < DUTY) { const u = ph / DUTY; return {b: [n[0] + step * (0.5 - u), -S.h, n[1]], stance: true}; }
    const u = (ph - DUTY) / (1 - DUTY), e = u * u * (3 - 2 * u);
    return {b: [n[0] + step * (e - 0.5), -S.h + LIFT * Math.sin(Math.PI * u), n[1]], stance: false};
  });
}
function pressure(dt) {
  // áp suất cần: mô men duỗi ở khớp đùi–gối của chân chống nặng nhất; chạy thì lực đỡ đỉnh gấp 2 lần lực trung bình (giả định)
  const nSt = S.feet.filter((f) => f.stance).length || 1, dyn = S.run && !cut.active ? 2 : 1, N = (mass() * SP.g * dyn) / nSt;
  let need = 0;
  LG.forEach((o, i) => { const f = S.feet[i]; const tq = f.stance ? kneeTau(o.L, o.a, o.b, N) : 0; S.needs[i] = pNeed(tq); need = Math.max(need, S.needs[i]); });
  S.need = need;
  let tgt = S.dump ? 0 : S.auto ? Math.min(SP.Pmax, Math.max(SP.Prest, need * 1.25)) : S.Pc;
  if (S.leak) tgt = Math.min(tgt, SP.Prest * 0.35);
  const tau = tgt > S.P ? 0.01 : S.dump ? 0.35 : 0.08; // áp suất tăng nhanh (≈ 10 ms), xả chậm hơn
  S.P += (tgt - S.P) * Math.min(1, dt / tau);
}
const defaults = () => Object.assign(S, {t: 0, T: 26, run: false, auto: true, P: SP.Prest, Pc: SP.Prest, leak: false, dump: false, extra: 0, phase: 0, x: 0, h: 13.5, curl: 0, hist: [], log: [], rng: {fp: [9, -9], hp: [9, -9], fd: [9, -9], hd: [9, -9]}, rngT: 0});
let lookKey = '';
const applyLook = () => { const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key; const F = new Set(); if (disp.xray) for (const p of plates) p.g.traverse((m) => F.add(m)); for (const b of bands) b.g.traverse((m) => F.add(m)); if (!disp.xray) F.clear(); xray(bodyG, 1, (m) => !F.has(m)); xray(bodyG, 0, (m) => F.has(m)); };
const sim = {
  S, root, cut,
  reset() { defaults(); cut.reset(); Object.assign(disp, {labels: true, xray: false}); gait(0); for (const o of LG) o.ab = [0.4, 0.9]; for (let i = 0; i < 6; i++) { gait(0); S.feet.forEach((f, j) => { const r = legTarget(LG[j], f.b); Object.assign(LG[j], r); }); } say('đứng · áp suất nghỉ 6,7 kPa'); },
  busy: () => cut.busy(),
  isOn: (k) => (k === 'run' && S.run) || (k === 'auto' && S.auto) || (k === 'dump' && S.dump) || (k === 'leak' && S.leak),
  act(k) {
    if (cut.act(k)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'run') { S.run = true; S.dump = false; say(`chạy · ${vn(strideHz(S.T), 2)} Hz · ${vn(speedOf(S.T) / 10, 1)} cm/s`); return; }
    if (k === 'stand') { S.run = false; say('đứng lại · tám chân chống'); return; }
    if (k === 'auto') { S.auto = !S.auto; if (!S.auto) S.Pc = S.P; say(S.auto ? 'tự bơm theo nhu cầu' : 'bơm tay · kéo thanh áp suất'); return; }
    if (k === 'dump') { S.dump = !S.dump; if (S.dump) S.run = false; say(S.dump ? 'xả áp · cơ gập thắng, chân co quắp' : 'bơm lại · chân duỗi ra'); return; }
    if (k === 'leak') { S.leak = !S.leak; say(S.leak ? 'rò rỉ một chân · áp suất tụt ở cả tám chân' : 'đã vá chỗ rò'); }
  },
  slide(k, t) {
    if (k === 'T') S.T = 15 + 25 * t;
    if (k === 'Pc') { S.Pc = t * SP.Pmax; S.auto = false; }
    if (k === 'extra') S.extra = 20 * t;
  },
  step(dt) {
    S.t += dt;
    gait(dt);
    // thân hạ xuống khi áp suất không đủ; dưới khoảng một phần ba áp suất nghỉ thì chân co quắp, thân nằm sàn
    const ratio = S.need > 0 ? S.P / S.need : 1, sag = Math.max(0, Math.min(1, 1 - ratio));
    const curlT = Math.max(0, Math.min(1, 1 - S.P / (SP.Prest * 0.45)));
    S.curl += (curlT - S.curl) * Math.min(1, dt / 0.25);
    const hT = S.hNom - (S.hNom - 4.6) * Math.max(Math.min(1, sag * 1.6), S.curl);
    S.h += (hT - S.h) * Math.min(1, dt / 0.15);
    S.feet.forEach((f, j) => { f.b[1] = Math.max(f.b[1], -S.h); if (f.stance) f.b[1] = -S.h; const r = legTarget(LG[j], f.b); Object.assign(LG[j], r); });
    pressure(dt);
    cut.step(dt);
    // biên độ góc khớp khi chạy (cửa sổ 2 giây)
    if (S.run && !cut.active) {
      const R = S.rng, up = (k, v) => { R[k][0] = Math.min(R[k][0], v); R[k][1] = Math.max(R[k][1], v); };
      up('fp', LG[0].b); up('hp', LG[3].b); up('fd', LG[0].b * 0.55); up('hd', LG[3].b * 0.55);
      S.rngT += dt; if (S.rngT > 2) { S.rngShow = JSON.parse(JSON.stringify(R)); S.rng = {fp: [9, -9], hp: [9, -9], fd: [9, -9], hd: [9, -9]}; S.rngT = 0; }
    }
    if ((S.hT = (S.hT || 0) + dt) > 0.05) { S.hT = 0; S.hist.push([S.P / 1000, S.need / 1000]); if (S.hist.length > 120) S.hist.shift(); }
  },
  shadowAt() { return new THREE.Vector3(S.x * 0.001, 0.01, 0); },
  pick: (hits) => soi(hits),
  measure() { // tỉ lệ đo trên mô hình so với số đo (do_mat_do.py): thân dài, sải chân đứng
    const bx = new THREE.Box3(), s = new THREE.Vector3(); turn.rotation.y = 0; mm.updateWorldMatrix(true, true);
    for (const p of plates) bx.expandByObject(p.g); bx.expandByObject(bung); bx.getSize(s);
    let span = 0; const len = (L) => L.seg.reduce((x, y) => x + y, 0);
    for (const A of LEGS) for (const B of LEGS) if (A.side > 0 && B.side < 0) span = Math.max(span, Math.hypot(A.root[0] - B.root[0], A.root[1] - B.root[1]) + len(A) + len(B));
    return [{name: 'thân dài (mm)', got: s.x * 1000, want: SP.BL, tol: 0.06}, {name: 'sải chân duỗi thẳng (mm), nguồn: hơn 100', got: span, want: 115, tol: 0.13},
      {name: 'sải bước ở 16,8 °C (cm)', got: speedOf(SP.T0) / SP.f0 / 10, want: 5.97, tol: 0.001}];
  },
  draw() {
    const O = OPEN, sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    bodyG.position.set(S.x, S.h, 0);
    bodyG.rotation.z = 0.02 * Math.sin(S.phase * Math.PI * 4) * (S.run ? 1 : 0);
    // chân: góc háng, nâng đùi, gập đùi–gối, gập chày–bàn (tỉ lệ κ), cộng thêm co quắp khi mất áp suất
    LG.forEach((o, i) => {
      const curl = S.curl, swingLift = 0;
      o.g.rotation.y = -o.yaw;
      const a = o.a * (1 - curl) + 0.95 * curl + swingLift, b = o.b * (1 - curl) + 2.5 * curl;
      o.fem.rotation.z = a; o.pat.rotation.z = -b; o.mt.rotation.z = -(0.55 * b + 0.9 * curl);
      const k = Math.min(1.6, S.P / SP.Prest), sw = 0.55 + 0.45 * Math.min(1, k); // túi duỗi phồng theo áp suất
      o.bel1.scale.set(sw, 0.6 + 0.6 * Math.min(1.2, k), sw); o.bel2.scale.set(sw, 0.6 + 0.6 * Math.min(1.2, k), sw);
      // tháo chân trước: các đốt tách dọc trục chân
      const e = i === 0 ? O.chan : 0, ex = EX;
      o.fem.position.x = o.Lc + 4 * e + 3 * ex; o.pat.position.x = o.L.Lf + 5 * e + 3 * ex; o.mt.position.x = o.L.Lpt + 5 * e + 3 * ex;
      o.g.position.set(o.L.root[0] * (1 + 0.6 * ex), -1.2 + 6 * e, o.L.root[1] * (1 + 0.8 * ex));
    });
    // mắt: gò mắt nhấc lên, từng thấu kính tách ra theo trục
    matG.position.set(6.0, 5.2 + 7 * O.mat + 9 * EX, 0);
    eyes.forEach((g) => { const b = g.userData.base, k = 1 + 1.6 * O.mat; g.position.set(b[0] * k, b[1] * (1 + 0.6 * O.mat), b[2] * k); });
    // mai: các tấm toả ra; bơm nhô lên, pít tông chạy theo áp suất
    const pl = O.nguc + 0.9 * EX;
    plates.forEach((p, j) => { const d = p.dir; p.g.position.set(d[0] * (j ? 6 : 9) * pl, d[1] * (j ? 5 : 11) * pl, d[2] * 6 * pl); p.g.rotation.set(0, 0, p.tilt ? 0.9 * pl : 0); }); // tấm giữa lật ra sau để lộ bơm
    bom.position.set(-1, 0.5 + 5 * O.nguc + 4 * EX, 0);
    piston.position.y = 2.6 + 1.4 * Math.min(1, S.P / SP.Pmax) + 0.25 * Math.sin(S.t * 30) * (S.run ? 1 : 0.2);
    // bụng: các đai mở như lồng, ruột nhô ra phía sau
    const bo = O.bung + EX;
    bands.forEach((b) => { b.g.position.y = (b.i === 6 ? 7 : 0) * bo; b.g.position.z = b.i < 6 ? ((b.i % 2 ? 1 : -1) * 5 * bo) : 0; b.g.rotation.x = b.i < 6 ? (b.i % 2 ? 1 : -1) * 0.5 * bo : 0; });
    bung.position.set(-25.5 - 6 * EX, 2.4 + 2 * O.bung, 0); ruot.position.set(-4 * O.bung, 4 * O.bung, 0);
    // kìm và nanh: hạ xuống, nanh mở ra
    nanhG.position.set(10.6 + 4 * O.nanh + 5 * EX, 0.4 - 3 * O.nanh, 0);
    fangs.forEach((f) => { f.rotation.z = -1.1 * O.nanh; });
    nanhG.children.forEach((g, i) => { g.position.z = (i ? -1 : 1) * (2.0 + 1.6 * O.nanh); });
    // dịch sáng theo áp suất (màu nhấn đánh dấu thứ đang làm việc)
    M_.fluid.emissiveIntensity = 0.05 + 1.1 * Math.min(1, S.P / 40e3);
    load.visible = S.extra > 0.3; load.position.set(S.x - 26, Math.max(4, S.h - 12), 0); load.scale.setScalar(0.6 + 0.04 * S.extra);
    applyLook();
    cut.draw();
    // bảng 01
    pBig.textContent = `${vn(S.P / 1000, 1)} kPa`;
    pSub.innerHTML = `${vn(S.P / 1333.2, 1)} cmHg<br>${vn(S.P / 1e5, 3)} bar`;
    pChart.set([S.hist.map((h) => h[0]), S.hist.map((h) => h[1])]);
    pTxt.innerHTML = `Áp suất truyền nguyên vẹn tới cả tám chân (Pascal). Mô men duỗi τ = P·A·r với A·r = ${vn(SP.Ar * 1e9, 0)} mm³ (giả định).`;
    // bảng 02
    sl.T.set((S.T - 15) / 25, `${vn(S.T, 1)} °C`); sl.Pc.set((S.auto ? S.P : S.Pc) / SP.Pmax, `${vn((S.auto ? S.P : S.Pc) / 1000, 1)} kPa`); sl.extra.set(S.extra / 20, `${vn(S.extra, 1)} g`);
    // bảng 03: áp suất cần từng chân, vạch ngang = áp suất đang có
    { let g = `<rect x="0" y="0" width="272" height="88" fill="${C.chart}" stroke="${C.line}"/>`; const Y = (p) => 86 - Math.min(1, p / SP.Pmax) * 84;
      LG.forEach((o, i) => { const x = 8 + i * 33, n = S.needs[i], st0 = S.feet[i].stance; g += `<rect x="${x}" y="${Y(n).toFixed(1)}" width="22" height="${(86 - Y(n)).toFixed(1)}" fill="${n > S.P ? '#c4271c' : st0 ? C.ink : '#c9ccd2'}"/><text x="${x + 11}" y="99" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${o.L.name}</text>`; });
      g += `<line x1="0" x2="272" y1="${Y(S.P).toFixed(1)}" y2="${Y(S.P).toFixed(1)}" stroke="${C.or}" stroke-width="2"/>`; legSvg.innerHTML = g; }
    legTxt.innerHTML = `Chân chống ${S.feet.filter((f) => f.stance).length}/8 · cần nhiều nhất <b>${vn(S.need / 1000, 1)} kPa</b> · đang có <b>${vn(S.P / 1000, 1)} kPa</b>${S.P < S.need ? ' · thân lún' : ''}`;
    // bảng 04: biểu đồ bước của hai nhóm
    { let g = ''; const ph = S.run ? S.phase : 0; LG.forEach((o, i) => { const y = i * 11, a0 = (1 - 0.5 * GROUP(o.L)) % 1; g += `<text x="0" y="${y + 9}" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">${o.L.name}</text><rect x="30" y="${y}" width="242" height="9" fill="${S.run ? '#c9ccd2' : C.ink}"/>`;
      if (S.run) for (const [u0, u1] of [[a0, Math.min(1, a0 + DUTY)], ...(a0 + DUTY > 1 ? [[0, a0 + DUTY - 1]] : [])]) g += `<rect x="${30 + u0 * 242}" y="${y}" width="${(u1 - u0) * 242}" height="9" fill="${C.ink}"/>`; });
      g += `<line x1="${30 + ph * 242}" x2="${30 + ph * 242}" y1="0" y2="88" stroke="${C.or}" stroke-width="2"/>`; gaitSvg.innerHTML = g; }
    const f = strideHz(S.T), v = speedOf(S.T);
    gRows[0][1].textContent = `${vn(f, 2)} Hz`; gRows[1][1].textContent = S.run ? `${vn(v / 10, 1)} cm/s` : '0 cm/s'; gRows[2][1].textContent = `${vn(SP.stride / 10, 2)} cm`; gRows[3][1].textContent = `${vn(v / SP.BL, 2)}`;
    // bảng 06
    const R = S.rngShow; jRows.forEach((el, k) => { if (!R) { el.textContent = '—'; return; } const r = R[['fp', 'hp', 'fd', 'hd'][k]]; el.textContent = `${vn((r[1] - r[0]) * R2D, 0)}°`; });
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]); ui.setOn('run', S.run); ui.setOn('stand', !S.run); ui.setOn('auto', S.auto); ui.setOn('dump', S.dump); ui.setOn('leak', S.leak);
    modeEl.textContent = S.curl > 0.5 ? 'Co quắp' : S.P < S.need ? 'Lún xuống' : S.run ? 'Đang chạy' : 'Đứng';
    modeSub.textContent = `${vn(S.P / 1000, 1)} kPa ở cả 8 chân · cần ${vn(S.need / 1000, 1)} kPa · ${vn(S.T, 0)} °C · ${S.run ? `${vn(f, 2)} Hz · ${vn(v / 10, 1)} cm/s` : 'đứng yên'} · tải ${vn(S.extra, 1)} g`;
    alert.set(S.curl > 0.5 ? 'MẤT ÁP SUẤT · CƠ GẬP THẮNG, CHÂN CO QUẮP' : S.P < S.need * 0.98 ? 'ÁP SUẤT KHÔNG ĐỦ ĐỠ THÂN' : '');
    if (callSub.bom) callSub.bom.textContent = `${vn(S.P / 1000, 1)} KPA`;
    if (callSub.tip) callSub.tip.textContent = `${S.feet[0].stance ? 'CHỐNG' : 'BƯỚC'} · CẦN ${vn(S.needs[0] / 1000, 1)} KPA`;
    const P = (o, x = 0, y = 0, z = 0) => { const v3 = wp(o, x, y, z); return st.project(v3[0], v3[1], v3[2]); };
    const lab = disp.labels && !cut.active && EX < 0.05 ? 1 : 0;
    ui.drawCallouts([{key: 'bom', p: P(bom, 0, 3, 0), dx: -110, dy: -80}, {key: 'bel', p: P(FL.bel1), dx: 140, dy: -20}, {key: 'mat', p: P(matG, 1.5, 1, 0), dx: 130, dy: -130},
      {key: 'bung', p: P(bung, 0, 8, 0), dx: -120, dy: -50}, {key: 'tip', p: P(FL.tip), dx: 100, dy: 50}], lab);
  },
};

// ---------------- soi chi tiết
function cardOf(part) {
  const base = {src: SRC};
  if (part === 'bom') return {...base, k: 'Nguồn áp suất', t: 'Bơm dịch trong đầu ngực', b: 'Ở nhện thật, phần đầu ngực co lại làm tăng áp suất dịch ở mọi chân cùng lúc. Robot thay bằng một bơm pít tông. Chất lỏng gần như không nén được, nên áp suất tạo ra ở bơm truyền nguyên vẹn tới tám chân: đó là định luật Pascal.',
    rows: [['Áp suất', () => `${vn(S.P / 1000, 1)} kPa · ${vn(S.P / 1333.2, 1)} cmHg`], ['Áp suất nghỉ (nguồn)', '≈ 5 cmHg ≈ 6,7 kPa'], ['Khi cử động (nguồn)', '0,1–0,64 bar'], ['Đỉnh khi giãy (nguồn)', '≈ 0,7 bar'], ['Chế độ', () => (S.dump ? 'xả' : S.auto ? 'tự bơm' : 'bơm tay')]]};
  if (part === 'mat') return {...base, k: 'Thị giác', t: 'Tám mắt trên gò mắt', b: 'Tarantula có tám mắt nhỏ tụ trên một gò ở trước mai; thị lực kém, nó cảm nhận chủ yếu bằng lông và rung động. Hai mắt giữa trước lớn nhất.',
    rows: [['Số mắt', '8'], ['Vị trí', 'gò mắt trước mai'], ['Ghi chú', 'kích thước mắt là giả định của bài']]};
  if (part === 'nanh') return {...base, k: 'Kìm (chelicerae)', t: 'Kìm và nanh', b: 'Hai kìm ở trước miệng, mỗi kìm mang một nanh gập. Tarantula cắm nanh từ trên xuống, song song với nhau. Ở bài này nanh chỉ là hình dạng; kích thước là giả định.',
    rows: [['Số nanh', '2'], ['Hướng cắm', 'từ trên xuống']]};
  if (part === 'bung' || part === 'nguc') return {...base, k: 'Thân', t: part === 'bung' ? 'Bụng và bình tích áp' : 'Mai đầu ngực', b: part === 'bung' ? 'Robot giữ dịch dự trữ và một lò xo tích áp trong bụng; lò xo sáng theo áp suất. Ở nhện thật, tim nằm trong bụng còn áp suất duỗi chân đến từ phần đầu ngực.' : 'Mai là các tấm cứng; bên dưới là cơ và bơm. Bốn đôi chân gắn quanh đầu ngực.',
    rows: [['Khối lượng (nguồn)', '15,5 g'], ['Tải thêm', () => `${vn(S.extra, 1)} g`], ['Trọng lượng', () => `${vn(mass() * SP.g * 1000, 0)} mN`]]};
  if (part.startsWith('leg:')) { const o = LG[+part.slice(4)], L = o.L;
    return {...base, k: `Chân ${L.vn} · bảy đốt`, t: 'Chân duỗi bằng áp suất', b: 'Khớp đùi–gối và khớp chày–bàn không có cơ duỗi. Cơ gập kéo chân co lại; muốn duỗi, dịch được bơm vào khớp, túi màng phồng lên và đẩy đốt chân thẳng ra. Mô men duỗi tỉ lệ thuận với áp suất.',
      rows: [['Đốt (mm)', L.seg.map((x, j) => `${SEG_VN[j].slice(0, 3)} ${vn(x, 1)}`).join(' · ')], ['Gập đùi–gối', () => `${vn(o.b * R2D, 0)}°`], ['Trạng thái', () => (S.feet[o.i].stance ? 'chống' : 'bước')], ['Áp suất cần', () => `${vn(S.needs[o.i] / 1000, 1)} kPa`], ['Áp suất có', () => `${vn(S.P / 1000, 1)} kPa`]]}; }
  return null;
}
const soi = picker((part) => cardOf(part));

// ---------------- góc nhìn (bám theo thân)
const T0 = () => ({tx: (S.x + (S.run && !cut.active ? speedOf(S.T) * 0.3 : 0)) * 0.001, ty: 0.009, tz: 0}); // đi trước một đoạn bù độ trễ của máy quay
const views = {
  hero: (t) => ({...T0(), az: 58 + 6 * Math.sin(t * 0.12), el: 24, d: 0.24, sx: 0, sy: -30}),
  side: () => ({...T0(), az: 0, el: 6, d: 0.3, sx: 0, sy: -40}),
  top: () => ({...T0(), ty: 0.004, az: 0, el: 84, d: 0.32, sx: 0, sy: -20}),
  leg: () => { const p = wp(FL.pat); return {tx: p[0], ty: p[1], tz: p[2], az: 30, el: 18, d: 0.12, sx: 0, sy: -30}; },
};
views.cut = (t) => cut.view(views.hero(t)) || views.hero(t);

// ---------------- bài giảng
const CAP = [
  {k: 'NHỆN ROBOT · THEO TARANTULA', t: 'Tám chân không có cơ duỗi', b: 'Nhện chỉ có cơ gập ở hai khớp lớn của chân. Để duỗi chân, nó dùng áp suất dịch: bơm dịch vào khớp, túi màng phồng lên đẩy đốt chân thẳng ra. Robot này làm theo đúng nguyên lí đó, số đo theo nhện Aphonopelma hentzi 15,5 g.', e: 'khớp đùi–gối và khớp chày–bàn: duỗi bằng thuỷ lực'},
  {k: 'ĐỊNH LUẬT PASCAL', t: 'Một bơm, tám chân, cùng một áp suất', b: 'Áp suất tạo ra ở bơm trong đầu ngực truyền nguyên vẹn qua chất lỏng tới cả tám chân, nên mọi túi duỗi nhận cùng một áp suất (vạch cam ở bảng 03). Bấm “Rò rỉ”: chỉ một chỗ hở mà áp suất tụt ở tất cả các chân.', e: 'p bằng nhau tại mọi điểm cùng độ cao trong chất lỏng đứng yên',
    ask: {q: 'Một chân bị rò dịch. Áp suất ở bảy chân còn lại thay đổi thế nào?', o: ['Không đổi', 'Giảm theo, vì cả tám chân nối chung một khối chất lỏng', 'Tăng lên để bù'], a: 1, e: 'Các chân nối với nhau qua cùng một khối chất lỏng, áp suất truyền nguyên vẹn (Pascal) nên tụt ở mọi chân.'}},
  {k: 'TÚI DUỖI · τ = P·A·r', t: 'Áp suất thành mô men', b: 'Áp suất P ép lên túi màng có tiết diện A tạo lực F = P·A; lực đặt cách khớp một tay đòn r cho mô men duỗi τ = P·A·r. Số đo trên nhện thật cho thấy mô men duỗi tỉ lệ thuận với áp suất. Bấm “Chân trước” để tháo một chân xem túi duỗi.', e: 'F = P·A · τ = F·r = P·A·r'},
  {k: 'ĐỨNG YÊN · 6,7 KPA', t: 'Áp suất nghỉ vừa đủ đỡ thân', b: 'Đứng trên tám chân, mỗi chân đỡ một phần tám trọng lượng. Mô men cần ở khớp đùi–gối bằng lực đỡ nhân khoảng ngang từ khớp tới đầu chân. Với A·r giả định của robot, áp suất cần xấp xỉ áp suất nghỉ đo được ở nhện, khoảng 5 cmHg. Kéo “Tải thêm”: áp suất cần tăng theo.', e: 'N = m·g / 8 · τ = N·d · P = τ / (A·r)'},
  {k: 'CHẠY · HAI NHÓM BỐN CHÂN', t: 'Bốn chân chống, bốn chân bước', b: 'Nhóm trái I, phải II, trái III, phải IV chống trong khi nhóm kia bước, rồi đổi vai. Chỉ bốn chân đỡ thân, và lực đỡ lúc chân chạm đất lớn hơn trung bình, nên áp suất cần tăng mấy lần. Đồ thị ở bảng 01 thấy áp suất nhảy lên theo từng bước.', e: 'sải bước 5,97 cm · v = f × sải bước'},
  {k: 'NHIỆT ĐỘ · 3,83 → 9,40 HZ', t: 'Trời ấm, nhện chạy nhanh hơn', b: 'Đo trên nhện thật: từ 16,8 °C lên 37,9 °C, tần số bước tăng từ 3,83 lên 9,40 Hz còn sải bước giữ nguyên 5,97 cm, nên tốc độ tăng khoảng 2,5 lần, tới 53 cm/s, hơn 10 thân mỗi giây. Kéo thanh nhiệt độ để xem.', e: 'v = f · s · 21 cm/s ở 16,8 °C · 53 cm/s ở 37,9 °C',
    ask: {q: 'Khi nhiệt độ tăng, tarantula chạy nhanh hơn chủ yếu nhờ thay đổi gì?', o: ['Sải bước dài ra', 'Tần số bước tăng, sải bước gần như không đổi', 'Dùng ít chân hơn'], a: 1, e: 'Booster và cộng sự (2015): sải bước 5,97 cm không đổi theo nhiệt độ; tần số bước tăng 3,83 → 9,40 Hz.'}},
  {k: 'XẢ ÁP · VÌ SAO NHỆN CHẾT CO CHÂN', t: 'Mất áp suất, cơ gập thắng', b: 'Xả áp: không còn gì đẩy khớp duỗi ra, cơ gập kéo tám chân co quắp dưới thân. Đó là lí do nhện chết thường co chân. Năm 2022, các kĩ sư Đại học Rice bơm khí vào xác nhện sói để biến nó thành tay gắp: nó nâng được hơn 130 % khối lượng của chính nó và chạy 1.000 lần đóng mở.', e: 'P → 0 ⇒ τ_duỗi → 0'},
  {k: 'MẮT VÀ NANH', t: 'Tám mắt, hai nanh', b: 'Gò mắt nhấc lên cho thấy tám mắt; hai mắt giữa trước lớn nhất. Kìm hạ xuống, nanh gập mở ra. Tarantula nhìn kém, cảm nhận thế giới chủ yếu bằng lông và rung động.', e: '8 mắt · 2 kìm · 2 nanh'},
  {k: 'PHIM THÁO RỜI', t: 'Từng bộ phận, rồi cả con', b: 'Mỗi bộ phận tách ra dưới một góc máy riêng, rồi cả con bung ra trên bàn xoay và lắp lại. Bấm từng nút ở bảng 05 để tự tháo.', e: 'mắt → chân trước → đầu ngực → bụng → kìm và nanh → cả con'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(2, {click: 'v_leg'}); at(7, {click: 'v_hero'});
at(10, {cap: 1}); at(11, {click: 'cut_nguc'}); at(17, {click: 'cut_nguc'}); at(18, {click: 'leak'}); at(21.5, {click: 'leak'});
at(24, {cap: 2}); at(24.5, {click: 'cut_chan'}); at(32, {click: 'cut_chan'});
at(34, {cap: 3}); at(34.5, {click: 'v_side'}); at(36, {slide: 'extra', to: 0.8, dur: 2}); at(41, {slide: 'extra', to: 0, dur: 1}); at(42.5, {click: 'v_hero'});
at(44, {cap: 4}); at(44.5, {click: 'run'}); at(47, {click: 'v_side'}); at(52, {click: 'v_hero'});
at(55, {cap: 5}); at(55.5, {slide: 'T', to: 0.1, dur: 1.5}); at(59, {slide: 'T', to: 0.92, dur: 2.5}); at(64, {slide: 'T', to: 0.44, dur: 1});
at(66, {cap: 6}); at(66.3, {click: 'stand'}); at(67, {click: 'dump'}); at(72.5, {click: 'dump'});
at(76, {cap: 7}); at(76.5, {click: 'cut_mat'}); at(81, {click: 'cut_nanh'}); at(86, {click: 'cut_nanh'});
at(88, {cap: 8}); at(88.5, {click: 'cut_film'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 88.5 + cut.duration + 2}, firstView: 'hero',
  extra: [{key: 'run', label: 'Chạy'}, {key: 'stand', label: 'Đứng'}, {key: 'dump', label: 'Xả áp'}, {key: 'leak', label: 'Rò rỉ'}],
  shell: {subject: 'Vật lí 10 · áp suất chất lỏng', objectives: ['Phát biểu và vận dụng định luật Pascal: áp suất truyền nguyên vẹn trong chất lỏng', 'Tính lực và mô men từ áp suất: F = P·A, τ = P·A·r', 'Giải thích vì sao nhện duỗi chân bằng áp suất và co chân khi mất áp suất'],
    credit: 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial, claude-motion của whaleyxbt và cutaway của Nyxera0x (MIT). Số đo nhện theo Booster và cộng sự (2015), Parry và Brown (1959); chỗ giả định ghi rõ trong thẻ soi.'},
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_leg', r: 'run', s: 'stand', d: 'dump', l: 'leak', a: 'auto', n: 'labels', x: 'xray', q: 'cut_mat', w: 'cut_chan', e: 'cut_nguc', b: 'cut_bung', f: 'cut_film', t: 'cut_all'}});
