// Tháp năm tầng chùa Hōryū-ji: trang chạy trực tiếp. Lắp dựng từng cấu kiện theo tám giai đoạn, mặt cắt A-A, sơn,
// và dao động khi động đất (kin.js). Bố cục thông tin (khung tên bản vẽ, trình tự dựng dạng Gantt, cấu kiện đang lắp,
// kết cấu từng tầng, nhật ký lắp và kiểm, dải tám giai đoạn) phỏng theo video bản vẽ lắp dựng tháp của 0xWast3 trên X;
// giao diện là bộ robotics Sáng Ăn Khoai.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, follow, vn} from '../kit/soi.js';
import {PG, KM, periods, quake} from './kin.js';

const PI = Math.PI;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 20, grid: 1, fade: 90, fov: 26, near: 0.3, far: 400});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -PI / 2; st.scene.add(world);
const root = new THREE.Group(); world.add(root); // dời theo nền khi động đất
const tierG = PG.s.map(() => { const g = new THREE.Group(); root.add(g); return g; });
const pivot = new THREE.Group(); pivot.position.z = -PG.pit; root.add(pivot); // cột tâm quay quanh đá nền
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------------- vật liệu
const M = {
  stone: MAT.satin('#bdb5a8'), wood: MAT.satin('#b98d62'), red: MAT.satin('#b98d62'), wall: MAT.satin('#a88a66'), tile: new THREE.MeshStandardMaterial({color: '#4c535b', roughness: 0.7, side: THREE.DoubleSide}),
  bronze: new THREE.MeshStandardMaterial({color: '#6f6446', metalness: 0.7, roughness: 0.5}), gold: MAT.gold(), clay: MAT.satin('#c9b79a'), door: MAT.satin('#6b4a35'), pit: MAT.satin('#8b8478'),
};
const BARE = {red: new THREE.Color('#b98d62'), wall: new THREE.Color('#a88a66')}, PAINT = {red: new THREE.Color('#9b3a24'), wall: new THREE.Color('#ece5d6')};
const DEN = {wood: 410, stone: 2600, bronze: 8700}; // kg/m³, giả định để ước khối lượng

// ---------------- hình khối
const box = (w, d, h, r = 0.04) => SH.rbox(w, d, h, r);
const cyl = (r0, r1, h, n = 16) => new THREE.CylinderGeometry(r1, r0, h, n).rotateX(PI / 2).translate(0, 0, h / 2);
/** mái bốn mặt: mép (nửa rộng e, cong lên ở góc u) lên tới đỉnh (nửa rộng t) cao rise */
function roofGeo(e, t, rise, u = 0.45, sag = 0.12) {
  const faces = [], N = 18, K = 6;
  for (let f = 0; f < 4; f++) {
    const pos = [], idx = [];
    for (let j = 0; j <= K; j++) for (let i = 0; i <= N; i++) {
      const a = (i / N) * 2 - 1, b = j / K, lift = (u * a ** 6 - sag * (1 - a * a)) * (1 - b) ** 1.6;
      const half = e + (t - e) * b, y = -half, x = a * half, z = rise * (1 - (1 - b) ** 1.25) + lift;
      pos.push(x, y, z);
    }
    for (let j = 0; j < K; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i, q = p + N + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.rotateZ((f * PI) / 2); faces.push(g.toNonIndexed());
  }
  const g = SH.merge(faces); g.computeVertexNormals(); return g;
}

// ---------------- danh sách thao tác lắp (mỗi thao tác một nhóm cấu kiện cùng loại)
const OPS = [], STAGES = ['Nền và móng', 'Tầng 1 · mái hiên phụ', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5 · chóp', 'Sơn · tượng đất', 'Mặt cắt A-A'];
function op(stage, name, qty, mat, parent, part, build, extra = {}) {
  const g = new THREE.Group(); parent.add(g); g.visible = false; let vol = 0;
  const add = (geo, m, x = 0, y = 0, z = 0, v = 0) => { const o = mk(geo, m, g); o.position.set(x, y, z); vol += v; return o; };
  build(add, g);
  tag(part, g);
  const o = {stage, name, qty, mat, g, part, mass: vol * (DEN[extra.den || 'wood'] || 0) + (extra.kg || 0), at: extra.at || '', note: extra.note || '', tier: extra.tier ?? -1, k: 0};
  OPS.push(o); return o;
}
// giai đoạn 1: nền
op(0, 'Đá nền cột tâm', 1, 'đá', pivot, 'pit', (add) => { add(box(2.4, 2.4, 0.7, 0.15), M.pit, 0, 0, -0.35, 4); }, {den: 'stone', at: 'đáy hố sâu 3 m dưới mặt nền', note: 'Đá nền (shinso) đỡ chân cột tâm.'});
op(0, 'Hộp xá lợi', 1, 'đồng, vàng', pivot, 'relic', (add) => { add(SH.roundCyl(0.16, 0, 0.3, 0.06), M.gold, 0, 0, -0.32); }, {kg: 8, at: 'hốc trên đá nền', note: 'Xá lợi Phật đặt trong đá nền dưới chân cột tâm, sâu khoảng 3 m.'});
op(0, 'Nền đá tầng dưới', 1, 'đá', root, 'plinth', (add) => { add(box(13.8, 13.8, 0.6, 0.08), M.stone, 0, 0, 0.3, 13.8 * 13.8 * 0.6); }, {den: 'stone', at: 'mặt đất', note: 'Nền hai bậc kê toàn bộ tháp.'});
op(0, 'Nền đá tầng trên', 1, 'đá', root, 'plinth', (add) => { add(box(12.2, 12.2, 0.6, 0.08), M.stone, 0, 0, 0.9, 12.2 * 12.2 * 0.6); }, {den: 'stone', at: 'trên nền dưới'});
op(0, 'Bậc thềm', 4, 'đá', root, 'plinth', (add) => { for (let k = 0; k < 4; k++) { const a = (k * PI) / 2, o = add(box(2.4, 1.2, 0.6, 0.05), M.stone, 7.4 * Math.cos(a), 7.4 * Math.sin(a), 0.3, 2 * 2.4 * 1.2 * 0.3); o.rotation.z = a + PI / 2; } }, {den: 'stone', at: 'giữa bốn mặt nền'});
// cột tâm: ba đoạn (chân tới tầng 3, tầng 4 tới chân chóp, đoạn chóp)
const seg = (stage, n, z0, z1, r0, r1) => op(stage, `Cột tâm · đoạn ${n}`, 1, 'gỗ bách Nhật', pivot, 'pillar', (add) => { add(cyl(r0, r1, z1 - z0, 8), M.wood, 0, 0, z0 + PG.pit, PI * ((r0 + r1) / 2) ** 2 * (z1 - z0)); }, {at: `cao ${vn(z0, 1)} → ${vn(z1, 1)} m`, note: 'Thân cây nguyên khúc đẽo tám cạnh, xuyên qua giữa các tầng, không đỡ mái.'});
function tier(i) {
  const stage = i + 1, s = PG.s[i], b = PG.bays[i], z0 = PG.z[i], hp = PG.hp[i], e = PG.eave[i], P = tierG[i], T = `tầng ${i + 1}`;
  const zB = z0 + hp, zE = z0 + hp + PG.hb * 0.55, top = i < 4 ? PG.s[i + 1] / 2 : 0.35, rise = (i < 4 ? PG.z[i + 1] : PG.top) - zE;
  if (i === 0) seg(1, 1, -PG.pit, PG.z[3], 0.39, 0.33);
  if (i === 3) seg(4, 2, PG.z[3], PG.top, 0.33, 0.24);
  if (i > 0) op(stage, `Ban công, lan can ${T}`, 4, 'gỗ bách Nhật', P, `${i}:lan`, (add) => {
    const w = s + 1.2; add(box(w, w, 0.18), M.wood, 0, 0, z0 + 0.09, w * w * 0.18);
    for (let k = 0; k < 4; k++) { const a = (k * PI) / 2, r = add(box(w, 0.1, 0.1), M.red, 0, 0, z0 + 0.85, w * 0.01); r.position.set((w / 2) * Math.sin(a), -(w / 2) * Math.cos(a), z0 + 0.85); r.rotation.z = a;
      for (let q = 0; q <= 6; q++) { const t = (q / 6 - 0.5) * w, pz = add(box(0.1, 0.1, 0.7), M.red, 0, 0, z0 + 0.5); pz.position.set(t * Math.cos(a) + (w / 2) * Math.sin(a), t * Math.sin(a) - (w / 2) * Math.cos(a), z0 + 0.5); } }
  }, {tier: i, at: `chân ${T}, trên mái tầng dưới`, note: 'Lan can có ô chữ vạn biến thể ở bản gốc; ở đây vẽ giản lược.'});
  const posts = []; for (let k = 0; k < 4 * b; k++) { const sd = Math.floor(k / b), t = ((k % b) / b - 0.5) * s, a = (sd * PI) / 2; posts.push([t * Math.cos(a) + (s / 2) * Math.sin(a), t * Math.sin(a) - (s / 2) * Math.cos(a)]); }
  const rp = 0.24 - 0.02 * i;
  op(stage, `Cột ${T}`, posts.length, 'gỗ bách Nhật', P, `${i}:cot`, (add) => { for (const [x, y] of posts) add(cyl(rp, rp * 0.9, hp, 14), M.red, x, y, z0, PI * rp * rp * hp); }, {tier: i, at: `${b} gian mỗi mặt, vuông ${vn(s, 1)} m`, note: i === 4 ? 'Tầng 5 chỉ hai gian, các tầng dưới ba gian.' : 'Mỗi tầng dựng như một hộp riêng đặt lên tầng dưới.'});
  op(stage, `Xà đầu cột ${T}`, 8, 'gỗ bách Nhật', P, `${i}:cot`, (add) => { for (const zz of [z0 + hp - 0.15, z0 + hp * 0.45]) for (let k = 0; k < 4; k++) { const a = (k * PI) / 2, o = add(box(s + 0.4, 0.22, 0.3), M.red, (s / 2) * Math.sin(a), -(s / 2) * Math.cos(a), zz, (s + 0.4) * 0.066); o.rotation.z = a; } }, {tier: i, at: 'nối đầu cột thành khung'});
  op(stage, `Vách ${T}`, 4 * b, 'gỗ, vữa vôi', P, `${i}:vach`, (add) => {
    for (let sd = 0; sd < 4; sd++) for (let q = 0; q < b; q++) { const a = (sd * PI) / 2, t = ((q + 0.5) / b - 0.5) * s, door = q === Math.floor(b / 2) && b === 3, o = add(box(s / b - 2 * rp, 0.14, hp - 0.6), door ? M.door : M.wall, 0, 0, 0, (s / b) * 0.14 * hp); o.position.set(t * Math.cos(a) + (s / 2) * Math.sin(a), t * Math.sin(a) - (s / 2) * Math.cos(a), z0 + hp / 2 - 0.05); o.rotation.z = a; }
  }, {tier: i, at: 'giữa các cột', note: 'Gian giữa mỗi mặt là cửa.'});
  op(stage, `Đấu củng hình mây ${T}`, posts.length + 4, 'gỗ bách Nhật', P, `${i}:dau`, (add) => {
    const parts = [];
    for (const [x, y] of posts) { const L = Math.hypot(x, y), ux = x / L, uy = y / L;
      const d = box(0.6, 0.6, 0.32); d.translate(x, y, zB + 0.16); parts.push(d);
      const arm = box(1.5, 0.24, 0.3); arm.rotateZ(Math.atan2(uy, ux)); arm.translate(x + ux * 0.45, y + uy * 0.45, zB + 0.47); parts.push(arm);
      const d2 = box(0.45, 0.45, 0.26); d2.translate(x + ux * 1.0, y + uy * 1.0, zB + 0.75); parts.push(d2); }
    add(SH.merge(parts), M.red, 0, 0, 0, (posts.length) * 0.3);
  }, {tier: i, at: 'đầu cột, đỡ mái vươn ra', note: 'Đấu (khối vuông) và củng (tay đỡ) cong như mây: đặc trưng thời Asuka ở chính điện, trung môn và tháp chùa này.'});
  op(stage, `Kèo mái ${T}`, 4, 'gỗ bách Nhật', P, `${i}:keo`, (add, g) => {
    const n = Math.round((2 * e) / 0.38), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 1, 0.13), M.red, n * 4), q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
    let c = 0; for (let sd = 0; sd < 4; sd++) { const a = (sd * PI) / 2; for (let k = 0; k < n; k++) { const t = ((k + 0.5) / n - 0.5) * 2 * e * 0.94, r0 = s / 2, r1 = e, dz = zE - (zB + PG.hb), L = Math.hypot(r1 - r0, dz);
      const p = new THREE.Vector3(t * Math.cos(a) + ((r0 + r1) / 2) * Math.sin(a), t * Math.sin(a) - ((r0 + r1) / 2) * Math.cos(a), (zB + PG.hb + zE) / 2 - 0.34);
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3((r1 - r0) * Math.sin(a), -(r1 - r0) * Math.cos(a), dz).normalize()); m4.compose(p, q, new THREE.Vector3(1, L, 1)); im.setMatrixAt(c++, m4); } }
    im.castShadow = true; g.add(im);
  }, {tier: i, at: 'từ thân tháp vươn ra mép mái', note: `Mái vươn ra ${vn(e - s / 2, 1)} m khỏi thân tầng (độ vươn trong bài tỉ lệ với bề rộng thân).`});
  op(stage, i < 4 ? `Mái ngói ${T}` : 'Mái chóp tầng 5', 4, 'ngói đất nung', P, `${i}:mai`, (add) => { add(roofGeo(e, top, rise), M.tile, 0, 0, zE); add(roofGeo(e - 0.05, top, rise), M.wood, 0, 0, zE - 0.2); }, {kg: (4 * e * e - 4 * top * top) * 160, tier: i, at: `mép mái cao ${vn(zE, 1)} m, rộng ${vn(2 * e, 1)} m`, note: i === 4 ? 'Mái tầng 5 rộng khoảng một nửa mái tầng 1.' : 'Ngói ước 160 kg/m² (giả định).'});
  if (i === 0) {
    const w = s + 3.2, n = 4;
    op(1, 'Cột mái hiên phụ', 4 * n, 'gỗ bách Nhật', P, 'mok', (add) => { for (let k = 0; k < 4 * n; k++) { const sd = Math.floor(k / n), t = ((k % n) / n - 0.5) * w, a = (sd * PI) / 2; add(cyl(0.16, 0.15, 2.6, 12), M.red, t * Math.cos(a) + (w / 2) * Math.sin(a), t * Math.sin(a) - (w / 2) * Math.cos(a), z0, PI * 0.024 * 2.6); } }, {tier: 0, at: `vòng ngoài, vuông ${vn(w, 1)} m`, note: 'Mái hiên phụ (mokoshi) quanh tầng 1 làm tháp trông như có thêm một tầng.'});
    op(1, 'Mái hiên phụ', 4, 'ván gỗ', P, 'mok', (add) => { add(roofGeo(w / 2 + 1.1, s / 2, 1.0, 0.15, 0.04), M.tile, 0, 0, z0 + 2.5); }, {kg: (w + 2.2) ** 2 * 40, tier: 0, at: 'giữa cột ngoài và vách tầng 1'});
  }
}
for (let i = 0; i < 5; i++) tier(i);
// chóp (sōrin): trên đoạn cột tâm thứ ba
seg(5, 3, PG.top, PG.H - 0.6, 0.24, 0.12);
const zS = PG.top + PG.pit;
op(5, 'Đế chóp (rohan)', 1, 'đồng', pivot, 'spire', (add) => { add(box(1.5, 1.5, 0.6, 0.06), M.bronze, 0, 0, zS + 0.2, 0.02); }, {den: 'bronze', at: 'đỉnh mái tầng 5'});
op(5, 'Bát úp, đài sen', 2, 'đồng', pivot, 'spire', (add) => { add(SH.lathe([[0, 0], [0.75, 0], [0.7, 0.25], [0.45, 0.48], [0, 0.5]]), M.bronze, 0, 0, zS + 0.5, 0.03); add(SH.lathe([[0.2, 0], [0.62, 0.12], [0.66, 0.26], [0.2, 0.3]]), M.bronze, 0, 0, zS + 1.0, 0.01); }, {den: 'bronze', at: 'trên đế chóp'});
op(5, 'Chín vòng (kurin)', 9, 'đồng', pivot, 'spire', (add) => { for (let k = 0; k < 9; k++) add(new THREE.TorusGeometry(0.6 - k * 0.025, 0.07, 10, 36), M.bronze, 0, 0, zS + 1.45 + k * 0.33, 0.006); }, {den: 'bronze', at: 'quanh đoạn cột tâm thứ ba'});
op(5, 'Bốn lưỡi liềm', 4, 'sắt', pivot, 'liem', (add) => { for (let k = 0; k < 4; k++) { const a = (k * PI) / 2 + PI / 4, o = add(new THREE.TorusGeometry(0.42, 0.025, 6, 20, 1.6), M.bronze, 0.75 * Math.cos(a), 0.75 * Math.sin(a), zS + 2.2); o.rotation.set(PI / 2, 0, a); } }, {kg: 12, at: 'treo dưới chín vòng', note: 'Truyền thuyết kể liềm treo để trừ sét sau một lần tháp bị sét đánh; nay có cột thu lôi.'});
op(5, 'Lửa nước, rồng xe, ngọc', 3, 'đồng', pivot, 'spire', (add) => { for (let k = 0; k < 4; k++) { const o = add(box(0.9, 0.05, 0.75, 0.02), M.bronze, 0, 0, zS + 4.65); o.rotation.z = (k * PI) / 4; } add(new THREE.SphereGeometry(0.22, 16, 12), M.bronze, 0, 0, zS + 5.2); add(SH.lathe([[0, 0], [0.24, 0.12], [0.18, 0.32], [0, 0.48]]), M.gold, 0, 0, zS + 5.4); }, {den: 'bronze', at: 'đỉnh chóp, cao 32,5 m'});
// giai đoạn 7: sơn và tượng đất; giai đoạn 8: mặt cắt
op(6, 'Sơn đỏ cột, xà, đấu, kèo', 1, 'sơn đất đỏ', root, 'son', () => {}, {note: 'Gỗ quét sơn đỏ gốc oxit sắt, vách trát vôi trắng.'});
op(6, 'Tượng đất bốn mặt', 4, 'đất sét', tierG[0], 'tuong', (add) => { for (let k = 0; k < 4; k++) { const a = (k * PI) / 2; add(SH.lathe([[0, 0], [1.1, 0], [0.9, 0.5], [0.5, 1.1], [0.2, 1.5], [0, 1.6]], 10), M.clay, 1.45 * Math.cos(a), 1.45 * Math.sin(a), PG.z[0], 0); } }, {kg: 0, tier: 0, at: 'trong tầng 1, quanh cột tâm', note: 'Bốn cảnh đời Đức Phật bằng đất, mỗi mặt một cảnh; mặt bắc là cảnh nhập niết bàn. Hoàn thành năm 711.'});
op(7, 'Mặt cắt A-A', 1, '—', root, 'cat', () => {}, {note: 'Cắt đôi tháp theo mặt phẳng qua trục để thấy cột tâm, hố xá lợi, tượng đất.'});
const N_OPS = OPS.length, stageEnd = STAGES.map((_, k) => OPS.reduce((m, o, j) => (o.stage === k ? j + 1 : m), 0));
const MATS = new Set(); root.traverse((o) => { if (o.isMesh) MATS.add(o.material); });
const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

// ---------------- trạng thái
const S = {k: 0, auto: true, wait: 0.6, rate: 1.1, paint: 0, sect: false, quake: false, stop: true, f: 0.91, A: 1.0, t: 0, tq: 0, q: {x: [0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0], th: 0, om: 0, h: PG.z.map((z, i) => z + PG.pit + PG.hp[i] + PG.hb)},
  log: [], hist: [], drift: [0, 0, 0, 0, 0], dmax: [0, 0, 0, 0, 0], disp: {labels: true, xray: false}, ug: 0};
const say = (tagS, txt) => { if (S.log[0]?.[1] === txt) return; S.log.unshift([tagS, txt]); S.log.length = Math.min(S.log.length, 3); };
const built = (j) => j < S.k;
const tiersDone = () => { let n = 0; for (let i = 0; i < 5; i++) { if (OPS.some((o, j) => o.tier === i && /^Mái/.test(o.name) && !built(j))) break; if (OPS.some((o, j) => o.tier === i && /^Mái/.test(o.name) && built(j))) n++; } return n; };
const cur = () => OPS[Math.min(S.k, N_OPS - 1)];

// ---------------- bảng
ui.header({code: 'Hōryū-ji', kicker: 'NGŨ TRỌNG THÁP · GỖ BÁCH NHẬT · THẾ KỶ 7 · Nara', title: 'Tháp năm tầng', sub: 'LẮP DỰNG · DAO ĐỘNG RIÊNG · CỘNG HƯỞNG · CỘT TÂM', hub: HUB_URL,
  right: [['32,5 m', 'CAO TỪ NỀN'], ['594', 'VÒNG NĂM CỘT TÂM'], ['½', 'MÁI TẦNG 5 / TẦNG 1'], ['1,1 s', 'CHU KỲ RIÊNG']]});
const strip = ui.add(`<div style="position:absolute;left:348px;top:82px;width:904px;display:flex;gap:4px;pointer-events:auto">${STAGES.map((n, i) => `<button type="button" data-s="${i}" style="flex:1;min-width:0;padding:3px 0 5px;border:0;border-bottom:2px solid ${C.line};background:none;text-align:left;font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${n}</button>`).join('')}</div>`);
strip.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; LIVE.takeOver(); sim.act('stage' + b.dataset.s); });

ui.panel(28, 112, 300, 214, 'KHUNG TÊN BẢN VẼ', '01');
const TB = [['Công trình', 'chùa Hōryū-ji, Nara'], ['Niên đại', 'dựng lại sau hoả hoạn 670'], ['Cao', '32,5 m từ nền'], ['Cột tâm', 'vòng năm ngoài cùng: 594'], ['Số gian', '3 gian · tầng 5: 2 gian'], ['Bước', ''], ['Giai đoạn', '']];
const tbV = TB.map(([a, b], i) => { ui.text(42, 146 + i * 24, a); ui.rule(42, 163 + i * 24, 272); return ui.text(130, 144 + i * 24, b, 'v', 'width:184px;text-align:right;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'); });
ui.panel(28, 338, 300, 196, 'TRÌNH TỰ DỰNG', '02');
ui.buttons([['build', 'DỰNG'], ['step', 'TỪNG BƯỚC'], ['reset', 'DỰNG LẠI']], 42, 372, 272);
const gantt = ui.svg(42, 404, 272, 120);
ui.panel(28, 546, 300, 220, 'CẤU KIỆN ĐANG LẮP', '03');
const AC = ['Cấu kiện', 'Bước', 'Số lượng', 'Vật liệu', 'Khối lượng ước', 'Lắp vào'];
const acV = AC.map((a, i) => { ui.text(42, 580 + i * 22, a); return ui.text(140, 578 + i * 22, '', 'v', 'width:174px;text-align:right;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'); });
const acNote = ui.text(42, 714, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');

ui.panel(1272, 112, 300, 214, 'KẾT CẤU · TỪNG TẦNG', '04');
const tierBars = [4, 3, 2, 1, 0].map((i, r) => [i, ui.bar(1286, 148 + r * 19, 272, `T${i + 1}`, {lw: 30, vw: 92})]);
const plan = ui.svg(1286, 246, 272, 72);
ui.panel(1272, 338, 300, 272, 'ĐỘNG ĐẤT · DAO ĐỘNG RIÊNG', '05');
ui.buttons([['quake', 'RUNG NỀN'], ['stopper', 'CỘT TÂM CHẶN'], ['tune', 'ĐÚNG CỘNG HƯỞNG']], 1286, 372, 272);
const sl = {f: ui.slider('f', 1286, 438, 272, 'TẦN SỐ NỀN', {lw: 92, vw: 70}), A: ui.slider('A', 1286, 465, 272, 'GIA TỐC NỀN', {lw: 92, vw: 70})};
const perTxt = ui.text(1286, 486, '', 'v', 'font-size:11px;width:272px');
const qChart = ui.chart(1286, 506, 272, 56, {min: -0.8, max: 0.8, colors: [C.or, C.ink], dash: [0, '3 3']});
const qTxt = ui.text(1286, 568, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(1272, 622, 300, 144, 'HIỂN THỊ · NHẬT KÝ', '06');
ui.buttons([['sect', 'MẶT CẮT A-A'], ['paint', 'SƠN'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 654, 272);
const logRows = [0, 1, 2].map((k) => ui.text(1286, 716 + k * 13, '', 'v', 'font-size:10px;font-weight:500;width:272px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'));
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_front', 'CHÍNH DIỆN'], ['v_detail', 'ĐẤU CỦNG'], ['v_sect', 'NHÌN MẶT CẮT']], 360, 120, 600);
ui.text(362, 664, 'CHẾ ĐỘ');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'cot', title: 'CỘT TÂM', sub: 'BÁCH NHẬT · 594'}, {key: 'dau', title: 'ĐẤU CỦNG HÌNH MÂY', sub: 'ĐỠ MÁI VƯƠN'}, {key: 'mai', title: 'MÁI TẦNG 5', sub: '≈ ½ MÁI TẦNG 1'},
  {key: 'mok', title: 'MÁI HIÊN PHỤ', sub: 'MOKOSHI · TẦNG 1'}, {key: 'chop', title: 'CHÓP · 9 VÒNG', sub: 'KURIN'}, {key: 'xa', title: 'XÁ LỢI', sub: 'SÂU ≈ 3 M'},
]);

// ---------------- mô phỏng
const disp = S.disp;
const setBuilt = (k) => { S.k = Math.max(0, Math.min(N_OPS, k)); OPS.forEach((o, j) => { o.g.visible = j < S.k; o.k = j < S.k ? 1 : 0; o.g.position.z = 0; }); S.sect = S.k >= N_OPS; S.paint = S.k > OPS.findIndex((o) => o.part === 'son') ? 1 : 0; };
let clipOn = null;
const applyClip = () => { const on = S.sect; if (on === clipOn) return; clipOn = on; for (const m of MATS) { m.clippingPlanes = on ? [clip] : null; m.clipShadows = true; m.needsUpdate = true; } st.ground.visible = !on; };
let lookKey = '';
const applyLook = () => { const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key; xray(root, disp.xray ? 1 : 0, (m) => { for (let x = m; x; x = x.parent) if (x.userData.part === 'pillar' || x.userData.part === 'pit' || x.userData.part === 'relic' || x.userData.part === 'tuong') return true; return false; }); };
const defaults = () => { Object.assign(S, {auto: true, wait: 0.6, paint: 0, quake: false, stop: true, f: 0.91, A: 1.0, t: 0, tq: 0, log: [], hist: [], dmax: [0, 0, 0, 0, 0], ug: 0}); Object.assign(S.q, {x: [0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0], th: 0, om: 0}); setBuilt(0); };
function placeNext() {
  if (S.k >= N_OPS) { S.auto = false; return; }
  if (S.auto && OPS[S.k].part === 'cat') { S.auto = false; say('KIỂM', 'dựng xong · bấm Mặt cắt A-A để xem bên trong'); return; } // giai đoạn 8 chỉ mở bằng tay
  const o = OPS[S.k]; o.g.visible = true; o.k = 0.001; S.k++;
  say('LẮP', `${o.name.toLocaleLowerCase('vi')} · ${o.qty} chiếc${o.mass ? ` · ≈ ${o.mass > 1500 ? vn(o.mass / 1000, 1) + ' t' : vn(o.mass, 0) + ' kg'}` : ''}`);
  if (o.part === 'son') S.paintT = 1;
  if (o.part === 'cat') S.sect = true;
  const nxt = OPS[S.k]; if (o.stage !== nxt?.stage) say('KIỂM', `${STAGES[o.stage].toLocaleLowerCase('vi')}: đủ ${OPS.filter((x) => x.stage === o.stage).length}/${OPS.filter((x) => x.stage === o.stage).length} thao tác`);
}
const sim = {
  S,
  reset() { defaults(); Object.assign(disp, {labels: true, xray: false}); say('KIỂM', 'mặt bằng trống · bắt đầu từ đá nền'); },
  busy: () => false,
  isOn: (k) => (k === 'quake' && S.quake) || (k === 'sect' && S.sect),
  act(k) {
    if (k.startsWith('stage')) { const s = +k.slice(5); setBuilt(stageEnd[s]); S.auto = false; say('KIỂM', `xong giai đoạn ${s + 1}: ${STAGES[s].toLocaleLowerCase('vi')}`); return; }
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'build') { if (S.k >= N_OPS) setBuilt(0); S.auto = !S.auto; return; }
    if (k === 'step') { S.auto = false; placeNext(); return; }
    if (k === 'reset') { setBuilt(0); S.auto = true; S.quake = false; say('KIỂM', 'tháo hết · dựng lại từ đá nền'); return; }
    if (k === 'sect') { S.sect = !S.sect; return; }
    if (k === 'paint') { S.paintT = S.paint > 0.5 ? 0 : 1; return; }
    if (k === 'quake') { S.quake = !S.quake; S.dmax = [0, 0, 0, 0, 0]; S.tq = 0; S.auto = false; say(S.quake ? 'RUNG' : 'KIỂM', S.quake ? `rung nền ${vn(S.f, 2)} Hz · ${vn(S.A * 100, 0)} gal · ${tiersDone()} tầng` : 'dừng rung'); return; }
    if (k === 'stopper') { S.stop = !S.stop; S.dmax = [0, 0, 0, 0, 0]; say('KIỂM', S.stop ? 'cột tâm chặn: bật' : 'cột tâm chặn: tắt'); return; }
    if (k === 'tune') { const n = Math.max(1, tiersDone()); S.f = 1 / periods(n)[0]; S.dmax = [0, 0, 0, 0, 0]; say('RUNG', `tần số nền = tần số riêng ${vn(S.f, 2)} Hz`); }
  },
  slide(k, t) { if (k === 'f') S.f = 0.3 + t * 2.7; if (k === 'A') S.A = t * 3; S.dmax = [0, 0, 0, 0, 0]; },
  keyDown() { return false; },
  step(dt) {
    S.t += dt;
    if (S.auto && !S.quake) { S.wait -= dt * S.rate; if (S.wait <= 0) { placeNext(); S.wait = 0.75; } }
    for (const o of OPS) if (o.k > 0 && o.k < 1) { o.k = Math.min(1, o.k + dt * 2.2); o.g.position.z = 4 * (1 - o.k) ** 2; }
    if (S.paintT !== undefined) S.paint += (S.paintT - S.paint) * Math.min(1, dt * 2);
    // động đất: n tầng đã có mái
    const n = tiersDone(), q = S.q;
    if (S.quake && n) {
      S.tq += dt; const ramp = Math.min(1, S.tq / 3), w = 2 * PI * S.f;
      for (let s = 0; s < 10; s++) { const tt = S.tq - dt + (dt * (s + 1)) / 10, ag = S.A * ramp * Math.sin(w * tt); quake(q, n, ag, dt / 10, S.stop); }
      S.ug = -(S.A * ramp * Math.sin(w * S.tq)) / (w * w);
      for (let i = 0; i < n; i++) { const d = Math.abs(q.x[i] - (i ? q.x[i - 1] : 0)); S.drift[i] = d; if (S.tq > 4) S.dmax[i] = Math.max(S.dmax[i], d); }
    } else { for (let i = 0; i < 5; i++) { q.x[i] *= 0.9; q.v[i] *= 0.9; S.drift[i] = 0; } q.th *= 0.9; S.ug *= 0.9; }
    for (let i = n; i < 5; i++) { q.x[i] = q.v[i] = 0; }
    S.hist.push([q.x[Math.max(0, n - 1)] || 0, S.ug]); if (S.hist.length > 400) S.hist.shift();
  },
  shadowAt() { return new THREE.Vector3(0, 12, 0); },
  pick: picker((part) => cardOf(part)),
  draw() {
    const VIS = 3, q = S.q, n = tiersDone();
    root.position.x = S.ug * VIS;
    let acc = 0; tierG.forEach((g, i) => { acc = q.x[i] || 0; g.position.x = acc * VIS; });
    pivot.rotation.y = q.th * VIS;
    M.red.color.copy(BARE.red).lerp(PAINT.red, S.paint); M.wall.color.copy(BARE.wall).lerp(PAINT.wall, S.paint);
    applyClip(); applyLook();
    const o = cur(), done = S.k >= N_OPS;
    // bảng 01, 02, 03
    tbV[5].textContent = `${String(S.k).padStart(3, '0')} / ${String(N_OPS).padStart(3, '0')}`; tbV[6].textContent = STAGES[(OPS[S.k - 1] || OPS[0]).stage];
    let gs = ''; STAGES.forEach((nm, sI) => {
      const ops = OPS.map((x, j) => [x, j]).filter(([x]) => x.stage === sI), a = ops[0][1], b = ops[ops.length - 1][1] + 1, x0 = 92 + (a / N_OPS) * 180, w = Math.max(3, ((b - a) / N_OPS) * 180), fill = Math.max(0, Math.min(1, (S.k - a) / (b - a)));
      gs += `<text x="0" y="${sI * 15 + 10}" font-family="Be Vietnam Pro" font-size="9.5" font-weight="600" fill="${fill > 0 && fill < 1 ? C.ink : C.mute}">${String(sI + 1).padStart(2, '0')} ${nm.split(' ·')[0]}</text><rect x="${x0}" y="${sI * 15 + 2}" width="${w}" height="10" fill="${C.chart}" stroke="${C.line}"/><rect x="${x0}" y="${sI * 15 + 2}" width="${w * fill}" height="10" fill="${fill >= 1 ? C.ink : C.or}"/>`;
    });
    gs += `<line x1="${92 + (S.k / N_OPS) * 180}" x2="${92 + (S.k / N_OPS) * 180}" y1="0" y2="120" stroke="${C.or}" stroke-width="1.5"/>`;
    gantt.innerHTML = gs;
    const last = OPS[Math.max(0, S.k - 1)], show = S.k ? last : OPS[0];
    acV[0].textContent = show.name; acV[1].textContent = `${String(Math.max(1, S.k)).padStart(3, '0')} / ${N_OPS} · giai đoạn ${show.stage + 1}`; acV[2].textContent = `${show.qty} chiếc`; acV[3].textContent = show.mat;
    acV[4].textContent = show.mass ? (show.mass > 1500 ? `≈ ${vn(show.mass / 1000, 1)} t` : `≈ ${vn(show.mass, 0)} kg`) : '—'; acV[5].textContent = show.at || '—';
    acNote.textContent = show.note || '';
    // bảng 04: phần đã lắp của từng tầng, độ lệch tầng khi rung
    tierBars.forEach(([i, b]) => { const ops = OPS.filter((x) => x.tier === i), k = ops.filter((x) => OPS.indexOf(x) < S.k).length / ops.length; b.set(S.quake && i < n ? Math.min(1, S.drift[i] / 0.2) : k, S.quake && i < n ? `lệch ${vn(S.drift[i] * 1000, 0)} mm` : `${vn(k * 100, 0)} %`, S.quake ? (S.drift[i] > 0.1 ? '#B3261E' : C.or) : k >= 1 ? C.ink : C.or); });
    let ps = ''; for (let i = 0; i < 5; i++) { const s = PG.s[i] * 5.2, e = PG.eave[i] * 2 * 5.2, cx = 26 + i * 56; ps += `<rect x="${cx - e / 2 / 1.6}" y="${36 - e / 2 / 1.6}" width="${e / 1.6}" height="${e / 1.6}" fill="none" stroke="${C.line}"/><rect x="${cx - s / 2 / 1.6}" y="${36 - s / 2 / 1.6}" width="${s / 1.6}" height="${s / 1.6}" fill="${i < n ? C.ink : 'none'}" stroke="${C.ink}" stroke-width=".8"/><text x="${cx}" y="70" text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${PG.bays[i]} gian</text>`; }
    plan.innerHTML = ps;
    // bảng 05
    const T = periods(Math.max(1, n));
    sl.f.set((S.f - 0.3) / 2.7, `${vn(S.f, 2)} Hz`); sl.A.set(S.A / 3, `${vn(S.A * 100, 0)} gal`);
    perTxt.innerHTML = n ? `T₁ ${vn(T[0], 2)} s · T₂ ${T[1] ? vn(T[1], 2) : '—'} s · T₃ ${T[2] ? vn(T[2], 2) : '—'} s · ${n} tầng` : 'chưa có tầng nào đủ mái';
    qChart.set([S.hist.map((h) => h[0]), S.hist.map((h) => h[1])]);
    const top = S.q.x[Math.max(0, n - 1)] || 0, fr = n ? S.f * T[0] : 0;
    qTxt.innerHTML = `Cam: đỉnh tầng ${Math.max(1, n)} so với nền (m) · nét đứt: nền. f / f₁ = <b>${vn(fr, 2)}</b>${Math.abs(fr - 1) < 0.08 ? ' · <b>cộng hưởng</b>' : ''}. Lệch lớn nhất: <b>${vn(Math.max(...S.dmax) * 1000, 0)} mm</b>.`;
    logRows.forEach((r, i) => { const l = S.log[i]; r.innerHTML = l ? `<span style="color:${l[0] === 'KIỂM' ? '#1F7A4D' : l[0] === 'RUNG' ? '#B3261E' : C.or};font-weight:700">${l[0]}</span>&nbsp;&nbsp;${l[1]}` : ''; r.style.opacity = 1 - i * 0.25; });
    modeEl.textContent = S.quake ? 'Động đất' : S.sect ? 'Mặt cắt A-A' : done ? 'Hoàn thành' : S.auto ? 'Đang dựng' : 'Tạm dừng';
    modeSub.textContent = S.quake ? `nền ${vn(S.f, 2)} Hz · ${vn(S.A * 100, 0)} gal · đỉnh lệch ${vn(Math.abs(top) * 1000, 0)} mm · cột tâm chặn ${S.stop ? 'bật' : 'tắt'} · phóng đại ×${VIS}` : `bước ${String(S.k).padStart(3, '0')}/${N_OPS} · ${STAGES[show.stage].toLocaleLowerCase('vi')} · ${show.name.toLocaleLowerCase('vi')}`;
    ui.setOn('build', S.auto); ui.setOn('quake', S.quake); ui.setOn('stopper', S.stop); ui.setOn('sect', S.sect); ui.setOn('paint', S.paint > 0.5); ui.setOn('tune', n && Math.abs(fr - 1) < 0.03);
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]);
    strip.querySelectorAll('[data-s]').forEach((b, i) => { const a = i ? stageEnd[i - 1] : 0, on = S.k > a && S.k <= stageEnd[i]; b.style.borderBottomColor = S.k >= stageEnd[i] ? C.ink : on ? C.or : C.line; b.style.color = on || S.k >= stageEnd[i] ? C.ink : C.mute; });
    alert.set(S.quake && !n ? 'CHƯA CÓ TẦNG NÀO ĐỦ MÁI ĐỂ RUNG' : S.quake && Math.max(...S.drift) > 0.15 ? 'ĐỘ LỆCH TẦNG LỚN · GẦN CỘNG HƯỞNG' : '');
    // nhãn
    const W = (x, y, z) => { const v = new THREE.Vector3(x, y, z); world.localToWorld(v); return st.project(v.x, v.y, v.z); };
    const vis = (part) => OPS.some((x, j) => x.part === part && j < S.k);
    const lab = disp.labels ? 1 : 0, rx = root.position.x;
    ui.drawCallouts([
      {key: 'cot', p: vis('pillar') && (S.sect || disp.xray) ? W(rx, 0, 9) : null, dx: 110, dy: -40},
      {key: 'dau', p: OPS.some((x, j) => x.part === '2:dau' && j < S.k) ? W(rx + tierG[2].position.x + PG.s[2] / 2 + 0.6, -PG.s[2] / 2 - 0.6, PG.z[2] + PG.hp[2] + 0.5) : null, dx: 120, dy: 20},
      {key: 'mai', p: vis('4:mai') ? W(rx + tierG[4].position.x + PG.eave[4] * 0.9, -PG.eave[4] * 0.9, PG.z[4] + PG.hp[4] + 0.6) : null, dx: 110, dy: -30},
      {key: 'mok', p: vis('mok') ? W(rx + tierG[0].position.x + 4.5, -4.5, 3.2) : null, dx: 120, dy: 30},
      {key: 'chop', p: vis('spire') ? W(rx + q.th * VIS * (zS + 3), 0, PG.top + 2.5) : null, dx: -120, dy: -20},
      {key: 'xa', p: vis('relic') && S.sect ? W(rx, 0, -PG.pit + 0.2) : null, dx: -120, dy: 30},
    ], lab);
  },
};

// ---------------- soi chi tiết
const SRC = 'Số có nguồn: cao ≈ 32,5 m, cột tâm bách Nhật năm 594, xá lợi sâu ≈ 3 m (MLIT); tầng 5 hai gian, mái tầng 5 ≈ ½ mái tầng 1, mái hiên phụ tầng 1, tượng đất năm 711 (Wikipedia tiếng Nhật); cột tâm 31,5 m, chia ba đoạn (JAANUS); T₁ ≈ 1,1 s (Hanazato và cộng sự, 2004). Kích thước khác và khối lượng là phỏng dựng.';
function cardOf(part) {
  const base = {src: SRC};
  if (part === 'pillar') return {...base, k: 'Shinbashira · cột tâm', t: 'Cột tâm', b: 'Thân cây bách Nhật đẽo tám cạnh, chạy từ đá nền dưới đất lên tới chóp, chia ba đoạn. Vòng năm ngoài cùng là năm 594, sớm hơn các cấu kiện khác: có thể là gỗ dùng lại. Cột tâm không đỡ mái; mỗi tầng tựa lên tầng dưới. Khi động đất, cột chạm vào dầm sàn khi các tầng lệch quá nhiều.',
    rows: [['Dài (JAANUS)', '31,5 m, chia 3 đoạn'], ['Đường kính chân · giữa', '77,8 · 65,1 cm'], ['Góc nghiêng lúc này', () => `${vn(S.q.th * 180 / PI * 1000, 2)} ‰ độ`], ['Chặn tầng', () => (S.stop ? 'bật' : 'tắt')]], pos: () => { const v = new THREE.Vector3(root.position.x, 0, 9); world.localToWorld(v); return [v.x, v.y, v.z]; }, d: 40};
  if (part === 'relic' || part === 'pit') return {...base, k: 'Dưới chân cột tâm', t: 'Đá nền và xá lợi', b: 'Đá nền (shinso) nằm sâu khoảng 3 m dưới mặt nền tháp; trong hốc đặt hộp đựng xá lợi Phật. Bật mặt cắt A-A để nhìn thấy.', rows: [['Độ sâu', '≈ 3 m']], pos: follow(OPS[0].g), d: 22};
  if (part === 'plinth') return {...base, k: 'Giai đoạn 1', t: 'Nền đá hai bậc', b: 'Nền đá cao, bốn mặt có bậc thềm. Kích thước nền trong bài là phỏng dựng.', rows: [['Cao nền', `${vn(PG.plinth, 1)} m (phỏng dựng)`]], pos: follow(OPS[2].g), d: 50};
  if (part === 'spire' || part === 'liem') return {...base, k: 'Sōrin', t: 'Chóp chín vòng', b: 'Chóp bằng đồng cắm trên đoạn cột tâm thứ ba: đế, bát úp, đài sen, chín vòng (kurin), lửa nước, ngọc. Dưới chín vòng treo bốn lưỡi liềm; truyền thuyết kể để trừ sét, nay tháp có cột thu lôi.', rows: [['Cao chóp trong bài', `${vn(PG.spire, 1)} m (phỏng dựng)`], ['Đỉnh', '32,5 m']], pos: () => { const v = new THREE.Vector3(root.position.x, 0, PG.top + 3); world.localToWorld(v); return [v.x, v.y, v.z]; }, d: 22};
  if (part === 'mok') return {...base, k: 'Mokoshi', t: 'Mái hiên phụ tầng 1', b: 'Một mái hiên thấp quanh tầng 1, đỡ bằng hàng cột ngoài. Nó làm tháp trông như sáu tầng mái, dù thân chỉ có năm tầng.', rows: [['Số cột trong bài', '16']], pos: follow(OPS.find((o) => o.part === 'mok').g), d: 40};
  if (part === 'tuong') return {...base, k: 'Năm 711', t: 'Tượng đất bốn mặt', b: 'Trong tầng 1 có bốn nhóm tượng đất, mỗi mặt một cảnh đời Đức Phật; mặt bắc là cảnh nhập niết bàn với các đệ tử khóc quanh. Hoàn thành năm 711.', rows: [['Vị trí', 'quanh chân cột tâm, tầng 1']], pos: follow(OPS.find((o) => o.part === 'tuong').g), d: 30};
  if (part === 'son' || part === 'cat') return null;
  const [ti, kind] = part.split(':'), i = +ti, nm = {lan: 'Ban công và lan can', cot: 'Cột và xà', vach: 'Vách và cửa', dau: 'Đấu củng hình mây', keo: 'Kèo mái', mai: 'Mái'}[kind];
  const B = {dau: 'Khối vuông (đấu) và tay đỡ cong (củng) chồng lên nhau, đỡ mái vươn ra xa thân tháp. Ở chùa này tay đỡ cong như mây, đặc trưng thời Asuka.', mai: i === 4 ? 'Mái tầng 5 rộng khoảng một nửa mái tầng 1: tháp thu nhỏ dần, trọng tâm thấp.' : 'Ngói đất nung trên ván và kèo; mép mái cong lên ở góc.', cot: `Tầng ${i + 1} rộng ${PG.bays[i]} gian mỗi mặt. Mỗi tầng là một hộp riêng đặt lên tầng dưới.`}[kind] || 'Cấu kiện gỗ của tầng.';
  return {...base, k: `Tầng ${i + 1}`, t: nm, b: B, rows: [['Bề rộng thân', `${vn(PG.s[i], 1)} m (phỏng dựng)`], ['Mái rộng', `${vn(PG.eave[i] * 2, 1)} m`], ['Lệch tầng lúc này', () => `${vn((S.drift[i] || 0) * 1000, 0)} mm`]], pos: () => { const v = new THREE.Vector3(root.position.x + tierG[i].position.x, 0, PG.z[i] + PG.hp[i]); world.localToWorld(v); return [v.x, v.y, v.z]; }, d: 34};
}

// ---------------- góc nhìn
const views = {
  hero: (t) => ({tx: 0, ty: 14, tz: 0, az: 32 + 6 * Math.sin(t * 0.06), el: 9, d: 112, sx: 0, sy: -30}),
  front: () => ({tx: 0, ty: 14, tz: 0, az: 0, el: 2, d: 112, sx: 0, sy: -30}),
  detail: () => ({tx: PG.s[2] / 2, ty: PG.z[2] + PG.hp[2], tz: PG.s[2] / 2, az: 40, el: -4, d: 26, sx: 0, sy: -40}),
  sect: () => ({tx: 0, ty: 12, tz: 0, az: 90, el: 4, d: 118, sx: 0, sy: -30}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'Hōryū-ji · Nara · thế kỷ VII', t: 'Một trong những công trình gỗ cổ nhất thế giới', b: 'Tháp năm tầng của chùa Hōryū-ji cao khoảng 32,5 m tính từ nền, dựng lại sau trận hoả hoạn năm 670. Bên trong không có sàn để đi lên: tháp là nơi giữ xá lợi. Bài dựng lại tháp theo tám giai đoạn, từng nhóm cấu kiện, rồi rung nền để xem nó dao động.', e: 'cao ≈ 32,5 m · 5 tầng · 1 cột tâm · chóp 9 vòng'},
  {k: 'GIAI ĐOẠN 1 · NỀN VÀ CỘT TÂM', t: 'Bắt đầu từ dưới đất 3 m', b: 'Đá nền đặt sâu khoảng 3 m, trong hốc là xá lợi. Cột tâm bằng gỗ bách Nhật đứng trên đá nền; phép đo vòng năm năm 2001 cho vòng ngoài cùng là năm 594, sớm hơn các cấu kiện khác. Cột dài 31,5 m, chia ba đoạn.', e: 'đá nền → xá lợi → nền hai bậc → cột tâm đoạn 1'},
  {k: 'XẾP TẦNG · MỖI TẦNG MỘT HỘP', t: 'Tầng trên tựa lên tầng dưới', b: 'Mỗi tầng là một hộp riêng: cột, xà, vách, đấu củng, kèo, mái, đặt chồng lên mái tầng dưới. Cột tâm xuyên qua giữa nhưng không đỡ mái. Tầng 1 đến 4 rộng ba gian mỗi mặt, riêng tầng 5 chỉ hai gian. Tầng 1 có thêm mái hiên phụ.', e: 'cột → xà → vách → đấu củng → kèo → mái → ban công tầng trên'},
  {k: 'THU NHỎ DẦN · ½', t: 'Mái tầng 5 bằng nửa mái tầng 1', b: 'Từ dưới lên, mỗi tầng hẹp dần; mái tầng 5 rộng khoảng một nửa mái tầng 1, một tỉ lệ thu nhỏ mạnh mà các tháp đời sau không còn giữ. Phần nặng dồn xuống thấp: trọng tâm thấp, tháp vững hơn khi bị xô ngang.', e: 'rộng mái tầng 5 / tầng 1 ≈ 1/2'},
  {k: 'ĐẤU CỦNG HÌNH MÂY', t: 'Đỡ mái vươn xa', b: 'Mái phải vươn xa để che mưa cho vách gỗ. Ở đầu cột, khối vuông (đấu) và tay đỡ cong (củng) chồng lên nhau, đẩy điểm đỡ ra ngoài. Ở chùa này tay đỡ uốn như mây, cùng kiểu với chính điện và trung môn. Lan can các tầng có ô hoa chữ vạn biến thể.', e: 'mái vươn = tay đòn · đấu củng chia tải xuống cột'},
  {k: 'CHÓP · CHÍN VÒNG', t: 'Đỉnh tháp', b: 'Chóp bằng đồng cắm trên đoạn cột tâm thứ ba: đế, bát úp, đài sen, chín vòng, lửa nước, ngọc. Dưới chín vòng treo bốn lưỡi liềm; truyền thuyết kể để trừ sét sau một lần tháp bị sét đánh. Rồi sơn đỏ gỗ, trát vôi vách, và tượng đất bốn mặt (năm 711) vào tầng 1.', e: 'đế → bát úp → đài sen → 9 vòng → lửa nước → ngọc'},
  {k: 'DAO ĐỘNG RIÊNG · T₁ ≈ 1,1 s', t: 'Rung nền đúng nhịp của tháp', b: 'Đo vi chấn ở Hōryū-ji cho chu kỳ dao động riêng thứ nhất khoảng 1,1 s. Mô hình năm khối nối bằng lò xo, cản 3 %: rung nền ở 0,5 Hz thì tháp lắc nhẹ; đúng 0,91 Hz (= 1/1,1 s) thì biên độ vọt lên gấp nhiều lần. Đó là cộng hưởng. Ở tần số cao hơn, các tầng lắc ngược chiều nhau.', e: 'f₁ = 1/T₁ ≈ 0,91 Hz · biên độ cực đại khi f nền ≈ f₁',
    ask: {q: 'Vì sao rung nền ở 0,91 Hz làm tháp lắc mạnh hơn hẳn ở 0,5 Hz dù gia tốc nền như nhau?', o: ['Vì 0,91 Hz nhanh hơn', 'Vì 0,91 Hz trùng tần số dao động riêng của tháp: cộng hưởng', 'Vì cột tâm bị gãy'], a: 1, e: 'Khi tần số lực cưỡng bức bằng tần số riêng, mỗi chu kỳ nền lại đẩy thêm đúng lúc: biên độ tăng tới khi lực cản cân bằng.'}},
  {k: 'CỘT TÂM CHẶN · MỘT GIẢ THUYẾT', t: 'Cột tâm giữ các tầng không lệch quá', b: 'Một cách giải thích vì sao tháp gỗ ít đổ: cột tâm cứng, đứng riêng; khi một tầng lệch quá khe hở thì chạm vào cột và bị kéo lại. Trong mô hình (khe 3 cm), bật cột tâm chặn làm độ lệch ở cộng hưởng giảm khoảng một phần tư. Nghiên cứu ở một tháp mới dựng (Hanazato và cộng sự, 2004) tính được mức giảm khoảng 30 %. Đây là mô hình để học, không phải tính toán kết cấu thật.', e: 'tắt chặn → so độ lệch lớn nhất · bật chặn → so lại'},
  {k: 'MẶT CẮT A-A', t: 'Nhìn vào bên trong', b: 'Cắt đôi tháp theo mặt phẳng qua trục: cột tâm chạy suốt từ đá nền dưới đất tới chóp, các tầng như những chiếc hộp xếp quanh nó, bốn nhóm tượng đất ở tầng 1, hộp xá lợi ở đáy. Bấm từng phần để soi.', e: 'giai đoạn 8 · mặt cắt qua trục cột tâm'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1, {click: 'reset'}); at(3, {click: 'v_hero'});
at(9, {cap: 1}); at(9.5, {click: 'sect'}); at(11, {click: 'v_sect'}); at(17, {click: 'sect'}); at(17.5, {click: 'v_hero'});
at(19, {cap: 2}); at(28, {click: 'v_front'});
at(31, {cap: 3}); at(36, {click: 'v_hero'});
at(42, {cap: 4}); at(42.5, {click: 'v_detail'}); at(50, {click: 'v_hero'});
at(53, {cap: 5}); at(53.5, {do: () => sim.act('stage6')}); at(55, {click: 'paint'}); at(56, {click: 'paint'});
at(62, {cap: 6}); at(62.5, {click: 'v_front'}); at(63, {slide: 'f', to: 0.2 / 2.7, dur: 1}); at(64.5, {click: 'quake'}); at(71, {click: 'tune'}); at(80, {slide: 'f', to: 2.3 / 2.7, dur: 1.2});
at(86, {cap: 7}); at(86.5, {click: 'tune'}); at(87, {click: 'stopper'}); at(94, {click: 'stopper'}); at(101, {click: 'quake'});
at(103, {cap: 8}); at(103.5, {click: 'sect'}); at(104, {click: 'v_sect'}); at(110, {click: 'xray'}); at(114, {click: 'xray'}); at(116, {click: 'v_hero'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 122}, firstView: 'hero', extra: [{key: 'quake', label: 'Rung nền'}, {key: 'sect', label: 'Mặt cắt'}, {key: 'build', label: 'Dựng'}],
  keys: {1: 'v_hero', 2: 'v_front', 3: 'v_detail', 4: 'v_sect', d: 'build', s: 'step', q: 'quake', c: 'sect', p: 'paint', n: 'labels', x: 'xray'}});
