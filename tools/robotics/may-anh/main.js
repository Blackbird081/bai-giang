// Máy ảnh cắt lớp: ống kính Canon EF 50mm f/1.8 STM trên thân phản xạ khổ 36 × 24 mm, chụp một ngọn nến.
// Thấu kính mỏng 1/f = 1/d + 1/d': ba tia sáng từ đỉnh ngọn lửa gặp nhau trên cảm biến thành ảnh thật, ngược, nhỏ hơn;
// lấy nét là dời thấu kính; khẩu bảy lá đổi đường kính D = f/N; gương lật, màn trập. Tháo từng bộ phận bằng kit/tach.js
// (theo cutaway của Nyxera0x, MIT). Cảnh dùng mét; máy ảnh dựng bằng milimét, thu 1/1000.
import * as THREE from 'three';
import {createStage, MAT, xray} from '../kit/stage.js';
import {C, createUI} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {createCutaway} from '../kit/tach.js';
import {CAM, imageDist, focusAt, aovOf, pupil, blur, exposure} from './kin.js';

const D2R = Math.PI / 180, AX = 62; // độ cao trục quang (mm)
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.9, grid: 0.01, fade: 3.2, fov: 26, near: 0.01, far: 12});
const ui = createUI(app);
const root = new THREE.Group(); st.scene.add(root);
const turn = new THREE.Group(); root.add(turn);
const mm = new THREE.Group(); mm.scale.setScalar(0.001); turn.add(mm); // hệ toạ độ máy: cảm biến ở x = 0, ống kính hướng +x
const sceneMM = new THREE.Group(); sceneMM.scale.setScalar(0.001); root.add(sceneMM); // nến, tường, tia sáng (không xoay theo bệ)

const M_ = {
  shell: MAT.shell('#f3f2ef'), dark: new THREE.MeshStandardMaterial({color: '#111214', metalness: 0.25, roughness: 0.55, envMapIntensity: 0.4}), dark2: MAT.satin('#26282c'),
  steel: MAT.steel(), acc: MAT.accent(), rubber: MAT.rubber(),
  glass: new THREE.MeshPhysicalMaterial({color: '#cfe3ee', roughness: 0.04, transparent: true, opacity: 0.38, depthWrite: false, clearcoat: 1, envMapIntensity: 1}),
  mirror: new THREE.MeshStandardMaterial({color: '#d9dde2', metalness: 1, roughness: 0.12}),
  sensor: new THREE.MeshPhysicalMaterial({color: '#1b1630', metalness: 0.6, roughness: 0.2, clearcoat: 1, iridescence: 0.8}),
  wax: MAT.satin('#efe7d6'), flame: new THREE.MeshBasicMaterial({color: '#ffb347'}),
};
const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const cylX = (r, x0, x1, seg = 48, r1 = r) => new THREE.CylinderGeometry(r1, r, x1 - x0, seg).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
const ringX = (ro, ri, x0, x1, seg = 64) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(h); return new THREE.ExtrudeGeometry(s, {depth: x1 - x0, bevelEnabled: false, curveSegments: seg}).rotateY(Math.PI / 2).translate(x0, 0, 0); };
// thấu kính: tiện xoay quanh trục x, hai mặt cầu bán kính R1 (trước), R2 (sau); dương là lồi về phía trước
function lensGeo(r, t, R1, R2) {
  const pts = [], n = 14, sag = (R, y) => (R ? Math.sign(R) * (Math.abs(R) - Math.sqrt(Math.max(0, R * R - y * y))) : 0);
  for (let i = 0; i <= n; i++) { const y = (r * i) / n; pts.push(new THREE.Vector2(y, t / 2 - sag(R1, y))); }
  for (let i = n; i >= 0; i--) { const y = (r * i) / n; pts.push(new THREE.Vector2(y, -t / 2 - sag(R2, y))); }
  return new THREE.LatheGeometry(pts, 40).rotateZ(-Math.PI / 2);
}

// ---------------- thân máy: tấm trắng có khe, hộp gương, lăng kính, màn trập, cảm biến, bo mạch, pin trong báng cầm
const than = new THREE.Group(); than.position.y = AX; mm.add(than);
const plates = [];
const BODY = MAT.satin('#303236');
const plate = (w, h, d, x, y, z, n, mat = BODY) => { const g = new THREE.Group(); g.position.set(x, y, z); than.add(g); const m = mk(new THREE.BoxGeometry(w, h, d), mat, g); plates.push({g, n: new THREE.Vector3(...n), base: g.position.clone()}); return m; };
plate(4, 92, 132, 42, -6, 0, [1, 0, 0]); // tấm trước (có lỗ ngàm phủ bằng vòng ngàm)
plate(66, 4, 132, 9, 38, 0, [0, 1, 0], M_.shell); // tấm nóc (trắng)
plate(66, 4, 132, 9, -50, 0, [0, -1, 0], M_.dark2); // tấm đáy
for (const s of [1, -1]) plate(66, 40, 4, 9, 14, 64 * s, [0, 0, s]), plate(66, 44, 4, 9, -30, 64 * s, [0, 0, s]);
plate(4, 84, 120, -24, -6, 0, [-1, 0, 0], M_.dark2); // tấm sau
const grip = mk(new THREE.BoxGeometry(46, 86, 30), M_.rubber, than); grip.position.set(30, -8, -58); // báng cầm phía tay phải
const prism = new THREE.Group(); prism.position.set(9, 40, 0); than.add(prism); // lăng kính năm mặt trên nóc
{ const s = new THREE.Shape(); s.moveTo(-24, 0); s.lineTo(24, 0); s.lineTo(10, 30); s.lineTo(-14, 30); s.closePath(); const g = new THREE.ExtrudeGeometry(s, {depth: 58, bevelEnabled: false}).translate(0, 0, -29); mk(g, BODY, prism); mk(new THREE.BoxGeometry(30, 2, 60), M_.shell, prism).position.set(-2, 31, 0);
  const pg = new THREE.ExtrudeGeometry(s, {depth: 40, bevelEnabled: false}).translate(0, 0, -20).scale(0.75, 0.75, 1); mk(pg, M_.glass, prism).position.y = 3; }
mk(new THREE.BoxGeometry(62, 80, 120), M_.dark, than).position.set(9, -6, 0); // thân trong tối
const ngam = mk(ringX(CAM.mountD / 2 + 6, CAM.mountD / 2, 44, 47), M_.steel, than); mk(ringX(CAM.mountD / 2 + 6.4, CAM.mountD / 2 + 5.6, 47, 47.4), M_.acc, than);
const hop = new THREE.Group(); hop.position.set(24, 0, 0); than.add(hop); // hộp gương
mk(new THREE.BoxGeometry(36, 40, 44), M_.dark2, hop).position.y = -2;
const mirrorG = new THREE.Group(); mirrorG.position.set(0, 17, 0); hop.add(mirrorG); // bản lề ở mép trên
const mirror = mk(new THREE.BoxGeometry(1.2, 36, 34), M_.mirror, mirrorG); mirror.position.set(0, -17, 0); mirrorG.rotation.z = -Math.PI / 4;
const manG = new THREE.Group(); manG.position.set(4, 0, 0); than.add(manG); // màn trập hai lá trước cảm biến
mk(new THREE.BoxGeometry(3, 44, 54), M_.dark2, manG);
const curtains = [0, 1].map((k) => { const g = new THREE.Group(); manG.add(g); for (let i = 0; i < 4; i++) mk(new THREE.BoxGeometry(1, 6.4, 38), k ? M_.dark : MAT.satin('#3a3d42'), g).position.set(2 + k * 0.8, 9 - i * 6, 0); return g; });
const camG = new THREE.Group(); camG.position.set(0, 0, 0); than.add(camG); // cảm biến 36 × 24 mm trên bo mạch
mk(new THREE.BoxGeometry(2, 30, 44), MAT.pcb('#1f3a2c'), camG).position.x = -2.2;
const sensor = mk(new THREE.BoxGeometry(0.8, CAM.sh, CAM.sw), M_.sensor, camG);
mk(new THREE.BoxGeometry(0.6, CAM.sh + 3, CAM.sw + 3), M_.acc, camG).position.x = -0.5;
for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(1.5, 4, 6), MAT.chip(), camG).position.set(-3.8, -10 + (i % 3) * 10, -16 + Math.floor(i / 3) * 32);
const pin = mk(new THREE.BoxGeometry(36, 56, 18), M_.dark2, than); pin.position.set(30, -16, -56);

// ---------------- ống kính: thân ống, vòng lấy nét có vạch nhấn, vòng tên, 6 thấu kính 5 nhóm, khẩu 7 lá
const ong = new THREE.Group(); than.add(ong);
const barrel = new THREE.Group(); ong.add(barrel);
mk(ringX(CAM.lensD / 2, CAM.lensD / 2 - 3, 47, 47 + CAM.lensL), M_.dark2, barrel);
const keo = new THREE.Group(); ong.add(keo); // phần ống trong vươn ra khi lấy nét gần
mk(ringX(CAM.lensD / 2 - 3.5, CAM.lensD / 2 - 6, 60, 47 + CAM.lensL + 2), MAT.satin('#3a3d42'), keo);
mk(ringX(CAM.lensD / 2 - 3.2, CAM.filter / 2, 47 + CAM.lensL - 2, 47 + CAM.lensL + 2), M_.shell, keo);
const focusRing = mk(ringX(CAM.lensD / 2 + 0.6, CAM.lensD / 2 - 1, 70, 78), M_.rubber, barrel); mk(ringX(CAM.lensD / 2 + 0.8, CAM.lensD / 2, 73.5, 74.5), M_.acc, barrel);
mk(ringX(CAM.lensD / 2 + 0.3, CAM.lensD / 2 - 1, 52, 56), M_.shell, barrel);
// sáu thấu kính, năm nhóm (sơ đồ minh hoạ kiểu Gauss kép; không phải thiết kế của hãng)
const ELEM = [[0, 21, 4.5, 60, 300, 82], [1, 18, 4.0, 30, 60, 75.5], [1, 16, 1.6, 120, 22, 72.2], [3, 13, 1.6, -22, -100, 63.6], [3, 15, 4.2, -500, -30, 60.2], [4, 16, 3.6, 120, -60, 55]];
const groups = [0, 1, 2, 3, 4].map(() => { const g = new THREE.Group(); keo.add(g); return g; });
ELEM.forEach(([gi, r, t, R1, R2, x]) => { const m = mk(lensGeo(r, t, R1, R2), M_.glass, groups[gi]); m.position.x = x; m.castShadow = false; m.userData.cast = false; const rim = mk(ringX(r + 1.6, r, x - t / 2 - 0.4, x + t / 2 + 0.4, 40), M_.dark, groups[gi]); void rim; });
const khau = new THREE.Group(); khau.position.x = 67; keo.add(khau);
mk(ringX(20, 17.5, -1.2, 1.2), M_.dark2, khau);
const blades = [];
for (let k = 0; k < CAM.blades; k++) { const g = new THREE.Group(); g.rotation.x = (k / CAM.blades) * Math.PI * 2; khau.add(g); const b = mk(new THREE.BoxGeometry(0.4, 14, 22), M_.dark, g); b.position.x = 0.25 * (k % 2); blades.push(b); }

// ---------------- cảnh: nến, tường hậu cảnh, tia sáng, ảnh trên cảm biến
const nen = new THREE.Group(); sceneMM.add(nen);
mk(new THREE.CylinderGeometry(70, 70, 22, 40), M_.shell, nen).position.y = 11; // đế
mk(new THREE.CylinderGeometry(22, 23, 110, 32), M_.wax, nen).position.y = 22 + 55;
mk(new THREE.CylinderGeometry(1.2, 1.2, 9, 8), M_.dark, nen).position.y = 136;
const flame = mk(new THREE.SphereGeometry(7, 16, 12), M_.flame, nen); flame.scale.set(1, 2.2, 1); flame.position.y = 150; flame.castShadow = false;
const glowL = new THREE.PointLight('#ffb347', 0.06, 0.6); glowL.position.y = 0.15; nen.add(glowL);
const TIP_Y = 165; // đỉnh ngọn lửa (mm trên sàn)
const tuong = new THREE.Group(); sceneMM.add(tuong); tuong.position.x = 3000;
mk(new THREE.BoxGeometry(20, 700, 1400), M_.shell, tuong).position.y = 350;
for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) mk(new THREE.BoxGeometry(24, 60, 60), M_.dark2, tuong).position.set(-2, 120 + j * 150, -480 + i * 160);
const rayMat = new THREE.LineBasicMaterial({color: C.or}), rayMat2 = new THREE.LineDashedMaterial({color: C.or, dashSize: 8, gapSize: 6});
const rays = [0, 1, 2].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), rayMat); sceneMM.add(l); return l; });
const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-40, AX, 0), new THREE.Vector3(3000, AX, 0)]), rayMat2); axisLine.computeLineDistances(); sceneMM.add(axisLine);
const anh = new THREE.Group(); camG.add(anh); // ảnh ngọn nến trên cảm biến: lộn ngược
mk(new THREE.BoxGeometry(0.3, 110, 45), M_.wax, anh).position.set(1, 22 + 55 - AX, 0); const fl2 = mk(new THREE.SphereGeometry(7, 12, 8), M_.flame, anh); fl2.scale.set(0.3, 2.2, 1); fl2.position.set(1, 150 - AX, 0); // toạ độ theo trục quang; nhóm lật âm nên ảnh lộn ngược

const meshes = (o) => { const a = []; o.traverse((m) => { if (m.isMesh) a.push(m); }); return a; };
tag('ong', ...meshes(barrel), ...meshes(keo)); tag('khau', ...meshes(khau)); tag('guong', ...meshes(hop)); tag('man', ...meshes(manG)); tag('cam', ...meshes(camG)); tag('than', ...plates.flatMap((p) => meshes(p.g)), ...meshes(prism)); tag('nen', ...meshes(nen));
mm.traverse((m) => { if (m.isMesh && m.material !== M_.glass) m.material = m.material.clone(); });

// ---------------- trạng thái
const S = {t: 0, obj: 1000, focus: 1000, af: true, N: 2.8, shutter: 1 / 125, shot: 0, last: null, log: [], disp: {labels: true, xray: false, rays: true}};
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const OPEN = {ong: 0, khau: 0, guong: 0, man: 0, cam: 0};
let EX = 0;
const optics = () => { const F = focusAt(S.focus) || {d: S.focus, dp: CAM.f * 1.2, m: 0}; const dObj = S.obj - F.dp, ip = imageDist(dObj); return {F, dp: F.dp, dObj, ip, m: ip / dObj}; };
const SPEEDS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
const NS = [1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const fmtT = (t) => (t >= 1 ? `${t} s` : `1/${Math.round(1 / t)} s`);

// ---------------- bảng
ui.header({code: 'EF 50', kicker: 'MÁY ẢNH CẮT LỚP · ỐNG KÍNH CANON EF 50MM F/1.8 STM · CẢM BIẾN 36 × 24 MM', title: 'Máy ảnh', sub: 'THẤU KÍNH HỘI TỤ · ẢNH THẬT · KHẨU ĐỘ · LẤY NÉT', hub: HUB_URL,
  right: [['50 mm', 'TIÊU CỰ'], ['6 / 5', 'THẤU KÍNH / NHÓM'], ['f/1.8', 'KHẨU LỚN NHẤT'], ['0,21×', 'PHÓNG ĐẠI LỚN NHẤT']]});
const BEATS = ['Toàn máy', 'Ba tia', 'Lấy nét', 'Gần nhất', 'Khẩu độ', 'Độ nét sâu', 'Chụp', 'Góc nhìn', 'Phim'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:84px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });
ui.panel(28, 112, 300, 268, 'THẤU KÍNH HỘI TỤ · 1/f = 1/d + 1/d′', '01');
const raySvg = ui.svg(42, 146, 272, 104);
const oRows = ['VẬT CÁCH THẤU KÍNH d', 'ẢNH CÁCH THẤU KÍNH d′', 'THẤU KÍNH CÁCH CẢM BIẾN', 'SỐ PHÓNG ĐẠI d′/d', 'ẢNH'].map((n, k) => [ui.text(42, 262 + k * 20, n), ui.text(196, 260 + k * 20, '', 'v', 'width:118px;text-align:right')]);
ui.panel(28, 392, 300, 200, 'ĐIỀU KHIỂN', '02');
ui.buttons([['shoot', 'CHỤP'], ['af', 'LẤY NÉT TỰ ĐỘNG'], ['rays', 'TIA SÁNG']], 42, 426, 272);
const sl = {obj: ui.slider('obj', 42, 474, 272, 'VẬT CÁCH MÁY', {lw: 92, vw: 74}), focus: ui.slider('focus', 42, 500, 272, 'VÒNG LẤY NÉT', {lw: 92, vw: 74}), N: ui.slider('N', 42, 526, 272, 'KHẨU ĐỘ', {lw: 92, vw: 74}), sh: ui.slider('sh', 42, 552, 272, 'MÀN TRẬP', {lw: 92, vw: 74})};
ui.panel(28, 604, 300, 162, 'ẢNH VỪA CHỤP', '03');
const prev = ui.add(`<canvas width="384" height="256" style="position:absolute;left:42px;top:634px;width:180px;height:120px;border-radius:4px;background:#ddd"></canvas>`);
const prevTxt = ui.text(232, 636, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:84px;line-height:1.45');
ui.panel(1272, 112, 300, 256, 'GÓC NHÌN · CẢM BIẾN 36 × 24', '04');
const aovSvg = ui.svg(1286, 146, 272, 90);
const aRows = ['NGANG · TÍNH / HÃNG', 'DỌC · TÍNH / HÃNG', 'CHÉO · TÍNH / HÃNG', 'NGÀM TỚI CẢM BIẾN'].map((n, k) => [ui.text(1286, 252 + k * 20, n), ui.text(1440, 250 + k * 20, '', 'v', 'width:118px;text-align:right')]);
ui.panel(1272, 380, 300, 200, 'THÁO TỪNG BỘ PHẬN', '05');
ui.panel(1272, 592, 300, 174, 'KHẨU ĐỘ · ĐỘ NÉT SÂU', '06');
const kRows = ['ĐƯỜNG KÍNH LỖ D = f/N', 'LƯỢNG SÁNG (SO f/1.8, 1/125)', 'VÒNG NHOÈ CỦA NẾN', 'VÒNG NHOÈ CỦA TƯỜNG 3 M', 'LÁ KHẨU'].map((n, k) => [ui.text(1286, 626 + k * 20, n), ui.text(1460, 624 + k * 20, '', 'v', 'width:98px;text-align:right')]);
ui.buttons([['v_hero', 'MÁY ẢNH'], ['v_wide', 'CẢ CẢNH'], ['v_side', 'TIA SÁNG'], ['v_back', 'PHÍA SAU'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 360, 120, 600);
ui.text(362, 664, 'ẢNH TRÊN CẢM BIẾN');
const modeEl = ui.add(`<div style="position:absolute;left:360px;top:678px;font:700 40px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:${C.ink}"></div>`);
const modeSub = ui.text(362, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:11px;white-space:nowrap');
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([{key: 'ong', title: 'ỐNG KÍNH', sub: '6 THẤU KÍNH · 5 NHÓM'}, {key: 'ring', title: 'VÒNG LẤY NÉT', sub: '—'}, {key: 'ngam', title: 'NGÀM EF', sub: 'CÁCH CẢM BIẾN 44 MM'}, {key: 'prism', title: 'LĂNG KÍNH NGẮM', sub: 'KÍNH NGẮM'}]);
const callSub = Object.fromEntries(['ong', 'ring', 'ngam', 'prism'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- tháo từng bộ phận
const wp = (o, x = 0, y = 0, z = 0) => { const v = o.localToWorld(new THREE.Vector3(x, y, z)); return [v.x, v.y, v.z]; };
const SRC = 'Số đo: Canon, thông số EF 50mm f/1.8 STM (50 mm; 6 thấu kính 5 nhóm; 7 lá khẩu; f/1.8–f/22; gần nhất 0,35 m; 0,21×; kính lọc 49 mm; 69,2 × 39,3 mm; 160 g; góc nhìn 40°, 27°, 46°). Wikipedia: Canon EF lens mount (ngàm cách cảm biến 44,0 mm; trong 54 mm; 1987). Cảm biến 36 × 24 mm. Giả định: thấu kính mỏng; sơ đồ 6 thấu kính chỉ minh hoạ; thân máy, gương, màn trập.';
const cut = createCutaway({st, ui, parts: [
  {key: 'ong', label: 'ỐNG KÍNH', open: (k) => { OPEN.ong = k; }, at: () => wp(keo, 66, 0, 0), sub: () => '6 thấu kính · 5 nhóm', cam: {az: 48, el: 16, d: 0.36}, card: () => cardOf('ong')},
  {key: 'khau', label: 'KHẨU 7 LÁ', open: (k) => { OPEN.khau = k; }, at: () => wp(khau), sub: () => `f/${vn(S.N, 1)} · D ${vn(pupil(S.N), 1)} mm`, cam: {az: 88, el: 6, d: 0.2}, card: () => cardOf('khau')},
  {key: 'guong', label: 'GƯƠNG LẬT', open: (k) => { OPEN.guong = k; }, at: () => wp(hop, 0, 10, 0), sub: () => 'lật lên khi chụp', cam: {az: 8, el: 32, d: 0.3}, card: () => cardOf('guong')},
  {key: 'man', label: 'MÀN TRẬP', open: (k) => { OPEN.man = k; }, at: () => wp(manG), sub: () => fmtT(S.shutter), cam: {az: -58, el: 10, d: 0.3}, card: () => cardOf('man')},
  {key: 'cam', label: 'CẢM BIẾN', open: (k) => { OPEN.cam = k; }, at: () => wp(camG), sub: () => `36 × 24 mm · ảnh ${vn(Math.abs(optics().m) * TIP_Y, 1)} mm`, cam: {az: -28, el: 16, d: 0.24}, card: () => cardOf('cam')},
], explode: (k) => { EX = k; }, turn: (d) => { turn.rotation.y = d * D2R; }});
cut.pills(1286, 412, 272);
ui.text(1286, 530, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = 'Bấm một bộ phận: nó tách ra trong 1 giây, vẫn chạy trong lúc treo, máy quay tới gần từ phía riêng.';

// ---------------- mô phỏng
const disp = S.disp;
let lookKey = '';
const applyLook = () => { const key = `${disp.xray}`; if (key === lookKey) return; lookKey = key; const F = new Set(); if (disp.xray) { for (const p of plates) p.g.traverse((m) => F.add(m)); barrel.traverse((m) => F.add(m)); prism.traverse((m) => F.add(m)); } xray(mm, 1, (m) => !F.has(m)); xray(mm, 0, (m) => F.has(m)); };
const defaults = () => Object.assign(S, {t: 0, obj: 1000, focus: 1000, af: true, N: 2.8, shutter: 1 / 125, shot: 0, last: null, log: []});
function drawPreview(o) { // ảnh vừa chụp (đã lật lại): nến theo số phóng đại, nhoè theo vòng nhoè, sáng theo lượng sáng
  const c = prev.getContext('2d'), W = 384, H = 256, pxmm = H / CAM.sh, ex = exposure(S.N, S.shutter), L = Math.max(0.05, Math.min(1.6, ex));
  const bg = Math.round(Math.min(255, 70 + 150 * L)); c.fillStyle = `rgb(${bg},${bg},${Math.round(bg * 0.97)})`; c.fillRect(0, 0, W, H);
  const bw = blur(3000, o.dp, S.N) * pxmm, bc = blur(o.dObj, o.dp, S.N) * pxmm;
  // tường ở 3 m: các ô tối, nhoè theo vòng nhoè
  const mw = imageDist(3000 - o.dp) / (3000 - o.dp), cell = 60 * mw * pxmm, gap = 160 * mw * pxmm;
  c.filter = `blur(${Math.min(30, bw / 2).toFixed(1)}px)`; c.fillStyle = `rgba(30,32,36,${0.75 * Math.min(1, L)})`;
  for (let i = -8; i <= 8; i++) for (let j = -2; j <= 6; j++) c.fillRect(W / 2 + i * gap - cell / 2, H / 2 - (120 + j * 150 - AX) * mw * pxmm - cell / 2, cell, cell);
  // nến
  const m = Math.abs(o.m) * pxmm; c.filter = `blur(${Math.min(30, bc / 2).toFixed(1)}px)`;
  const yb = H / 2 + (AX - 22) * m, w = 45 * m, h = 110 * m; c.fillStyle = `rgba(239,231,214,${Math.min(1, 0.4 + L)})`; c.fillRect(W / 2 - w / 2, yb - h, w, h);
  c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(W / 2, H / 2 - (150 - AX) * m, 7 * m, 15 * m, 0, 0, Math.PI * 2); c.fill(); c.filter = 'none';
  prevTxt.innerHTML = `f/${vn(S.N, 1)} · ${fmtT(S.shutter)}<br>sáng ×${vn(ex, 2)}<br>nhoè nền ${vn(blur(3000, o.dp, S.N), 2)} mm`;
}
const sim = {
  S, root, cut,
  reset() { defaults(); cut.reset(); Object.assign(disp, {labels: true, xray: false, rays: true}); say('lấy nét vào ngọn nến cách 1 m'); drawPreview(optics()); },
  busy: () => cut.busy(),
  isOn: (k) => (k === 'af' && S.af) || (k === 'shoot' && S.shot > 0),
  act(k) {
    if (cut.act(k)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k === 'af') { S.af = !S.af; if (S.af) S.focus = S.obj; say(S.af ? 'lấy nét tự động: thấu kính dời tới khi ảnh rơi đúng cảm biến' : 'lấy nét tay: xoay vòng lấy nét'); return; }
    if (k === 'shoot') { S.shot = 1e-6; say(`chụp · f/${vn(S.N, 1)} · ${fmtT(S.shutter)}`); }
  },
  slide(k, t) {
    if (k === 'obj') { S.obj = 350 + t * 2400; if (S.af) S.focus = S.obj; }
    if (k === 'focus') { S.focus = 350 + t * 2400; S.af = false; }
    if (k === 'N') S.N = NS[Math.round(t * (NS.length - 1))];
    if (k === 'sh') S.shutter = SPEEDS[Math.round(t * (SPEEDS.length - 1))];
  },
  step(dt) {
    S.t += dt;
    if (S.af) S.focus += (S.obj - S.focus) * Math.min(1, dt / 0.12); // động cơ STM dời thấu kính
    if (S.shot > 0) { S.shot += dt; const end = 0.3 + Math.max(0.12, S.shutter) + 0.2; if (S.shot > 0.2 && !S.done) { S.done = true; drawPreview(optics()); } if (S.shot > end) { S.shot = 0; S.done = false; } }
    cut.step(dt);
  },
  shadowAt() { return new THREE.Vector3(0.4, 0.05, 0); },
  pick: (hits) => soi(hits),
  measure() { const F = focusAt(CAM.close); return [{name: 'góc nhìn ngang (°), hãng 40', got: aovOf(CAM.sw), want: 40, tol: 0.02}, {name: 'góc nhìn dọc (°), hãng 27', got: aovOf(CAM.sh), want: 27, tol: 0.02}, {name: 'góc nhìn chéo (°), hãng 46', got: aovOf(Math.hypot(CAM.sw, CAM.sh)), want: 46, tol: 0.03},
    {name: 'phóng đại ở 0,35 m, hãng 0,21×', got: F.m, want: CAM.magMax, tol: 0.03}]; },
  draw() {
    const O = OPEN, o = optics(), ex = EX;
    // thấu kính dời ra theo d′ (ống trong vươn ra), các nhóm tách dọc trục khi tháo ống kính
    keo.position.x = o.dp - CAM.f + 20 * O.ong + 40 * ex; barrel.position.x = 20 * O.ong + 40 * ex;
    groups.forEach((g, i) => { g.position.x = (i - 2) * 14 * O.ong; });
    khau.position.set(67, 46 * O.khau, 0); khau.rotation.y = 0;
    const D = pupil(S.N); blades.forEach((b, k) => { b.position.y = D / 2 + 7; b.rotation.x = 0.35; void k; });
    // gương: lật lên khi chụp; hộp gương nhấc lên khi tháo
    const up = S.shot > 0 && S.shot < 0.3 + Math.max(0.12, S.shutter) + 0.1 ? 1 : 0;
    mirrorG.rotation.z = -Math.PI / 4 + (Math.PI / 4) * up + 0.6 * O.guong * Math.sin(S.t * 3) * 0.5;
    hop.position.set(24, 60 * O.guong + 30 * ex, 0); prism.position.set(9, 40 + 24 * O.guong + 40 * ex, 0);
    // màn trập: lá trước kéo xuống mở, lá sau kéo xuống đóng
    const sh = S.shot, t0 = 0.12, T = Math.max(0.12, S.shutter), open1 = Math.min(1, Math.max(0, (sh - t0) / 0.04)), close2 = Math.min(1, Math.max(0, (sh - t0 - T) / 0.04));
    curtains[0].position.y = sh > 0 ? -26 * open1 : 0; curtains[1].position.y = sh > 0 ? 26 - 26 * close2 : 26;
    if (O.man > 0.02 && sh === 0) { const u = (Math.sin(S.t * 2) + 1) / 2; curtains[0].position.y = -26 * u; curtains[1].position.y = 26 * (1 - u) ; }
    manG.position.set(4, -60 * O.man - 20 * ex, 0);
    camG.position.set(-14 * O.cam - 40 * ex, 0, 96 * O.cam); camG.rotation.y = -1.15 * O.cam; // trượt ra bên hông, xoay mặt cảm biến về phía máy quay
    plates.forEach((p) => { p.g.position.copy(p.base).addScaledVector(p.n, 26 * ex + (p.n.z !== 0 ? 30 * O.guong : 0)); });
    grip.position.set(30, -8, -58 - 30 * ex); pin.position.set(30, -16 - 40 * ex, -56 - 30 * ex);
    // ảnh trên cảm biến: lộn ngược, thu theo số phóng đại; ngoài nét thì mờ đi
    const m = o.ip / o.dObj; anh.scale.set(1, -m, -m); // ảnh thật: lộn ngược cả trên dưới lẫn trái phải anh.position.x = 0.6; anh.visible = disp.xray || O.cam > 0.05 || O.man > 0.05;
    // nến và tia sáng (hệ mét của cảnh; máy ảnh đặt ở gốc, trục quang theo +x)
    nen.position.set(S.obj, 0, 0); turn.position.set(0, 0, 0);
    const lensX = o.dp, P = new THREE.Vector3(S.obj, TIP_Y, 0), yP = TIP_Y - AX, xQ = lensX - o.ip, yQ = -yP * (o.ip / o.dObj);
    const toSensor = (a, b) => { const u = (0 - a.x) / (b.x - a.x); return new THREE.Vector3(0, a.y + (b.y - a.y) * u, 0); };
    const L1 = new THREE.Vector3(lensX, TIP_Y, 0), L2 = new THREE.Vector3(lensX, AX, 0);
    const Qw = new THREE.Vector3(xQ, AX + yQ, 0), L3 = new THREE.Vector3(lensX, AX + yQ, 0);
    const paths = [[P, L1, Qw, toSensor(L1, Qw)], [P, L2, Qw, toSensor(L2, Qw)], [P, L3, Qw, new THREE.Vector3(0, AX + yQ, 0)]];
    rays.forEach((r, i) => { r.geometry.setFromPoints(paths[i]); r.visible = disp.rays && ex < 0.05; });
    axisLine.visible = disp.rays && ex < 0.05;
    applyLook();
    cut.draw();
    // bảng 01: sơ đồ tia
    { const sx = (x) => 260 - (x / (S.obj + 60)) * 230, sy = (y) => 60 - y * 0.28; let g = `<rect x="0" y="0" width="272" height="104" fill="${C.chart}" stroke="${C.line}"/><line x1="0" x2="272" y1="${sy(0)}" y2="${sy(0)}" stroke="${C.faint}"/>`;
      const lx = sx(lensX), f = CAM.f; g += `<line x1="${lx}" x2="${lx}" y1="8" y2="96" stroke="${C.ink}" stroke-width="2"/><path d="M${lx - 5} 14 L${lx} 6 L${lx + 5} 14 M${lx - 5} 90 L${lx} 98 L${lx + 5} 90" stroke="${C.ink}" fill="none"/>`;
      g += `<line x1="${sx(0)}" x2="${sx(0)}" y1="${sy(12) }" y2="${sy(-12)}" stroke="${C.ink}" stroke-width="3"/><text x="${sx(0) + 4}" y="100" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">cảm biến</text>`;
      for (const xf of [lensX + f, lensX - f]) g += `<circle cx="${sx(xf)}" cy="${sy(0)}" r="2.2" fill="${C.ink}"/>`;
      const ox = sx(S.obj); g += `<line x1="${ox}" x2="${ox}" y1="${sy(0)}" y2="${sy(yP)}" stroke="${C.ink}" stroke-width="2"/><path d="M${ox - 4} ${sy(yP) + 6} L${ox} ${sy(yP)} L${ox + 4} ${sy(yP) + 6}" stroke="${C.ink}" fill="none"/>`;
      for (const p of paths) g += `<polyline points="${p.map((v) => `${sx(v.x).toFixed(1)},${sy(v.y - AX).toFixed(1)}`).join(' ')}" fill="none" stroke="${C.or}" stroke-width="1.2"/>`;
      g += `<line x1="${sx(xQ)}" x2="${sx(xQ)}" y1="${sy(0)}" y2="${sy(yQ)}" stroke="${C.or}" stroke-width="2"/><text x="6" y="12" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">trục ngang co giãn · F, F′ chấm đen</text>`;
      raySvg.innerHTML = g; }
    const focused = Math.abs(o.ip - o.dp) < 0.05;
    oRows[0][1].textContent = `${vn(o.dObj / 1000, 3)} m`; oRows[1][1].textContent = `${vn(o.ip, 2)} mm`; oRows[2][1].textContent = `${vn(o.dp, 2)} mm`; oRows[3][1].textContent = `${vn(o.m, 3)} ×`; oRows[4][1].textContent = 'thật, ngược, nhỏ';
    sl.obj.set((S.obj - 350) / 2400, `${vn(S.obj / 1000, 2)} m`); sl.focus.set((S.focus - 350) / 2400, `${vn(S.focus / 1000, 2)} m`); sl.N.set(NS.indexOf(S.N) / (NS.length - 1), `f/${vn(S.N, 1)}`); sl.sh.set(SPEEDS.indexOf(S.shutter) / (SPEEDS.length - 1), fmtT(S.shutter));
    // bảng 04: góc nhìn
    { const a = aovOf(CAM.sw, o.dp); let g = `<rect x="0" y="0" width="272" height="90" fill="${C.chart}" stroke="${C.line}"/>`; const cx = 30, cy = 45, R = 220;
      void 0; g += `<path d="M${cx} ${cy} L${cx + R * Math.cos((a / 2) * D2R)} ${cy - R * Math.sin((a / 2) * D2R)} L${cx + R * Math.cos((a / 2) * D2R)} ${cy + R * Math.sin((a / 2) * D2R)} Z" fill="${C.or}" opacity=".12" stroke="${C.or}"/><rect x="${cx - 14}" y="${cy - 9}" width="14" height="18" fill="${C.ink}"/><text x="${cx + 40}" y="${cy + 4}" font-family="JetBrains Mono" font-size="10" fill="${C.ink}">${vn(a, 1)}° ngang lúc này (vô cực: 39,6°)</text>`; aovSvg.innerHTML = g; }
    aRows[0][1].textContent = `${vn(aovOf(CAM.sw), 1)}° / 40°`; aRows[1][1].textContent = `${vn(aovOf(CAM.sh), 1)}° / 27°`; aRows[2][1].textContent = `${vn(aovOf(Math.hypot(CAM.sw, CAM.sh)), 1)}° / 46°`; aRows[3][1].textContent = '44,0 mm';
    // bảng 06
    kRows[0][1].textContent = `${vn(pupil(S.N), 1)} mm`; kRows[1][1].textContent = `× ${vn(exposure(S.N, S.shutter), 2)}`; kRows[2][1].textContent = `${vn(blur(o.dObj, o.dp, S.N), 3)} mm`; kRows[3][1].textContent = `${vn(blur(3000 - o.dp, o.dp, S.N), 2)} mm`; kRows[4][1].textContent = '7';
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]); ui.setOn('af', S.af); ui.setOn('shoot', S.shot > 0);
    modeEl.textContent = focused ? `Rõ nét · ${vn(Math.abs(o.m) * TIP_Y, 1)} mm` : `Nhoè · ${vn(blur(o.dObj, o.dp, S.N), 2)} mm`;
    modeSub.textContent = `ngọn nến cao ${TIP_Y} mm cách máy ${vn(S.obj / 1000, 2)} m → ảnh ngược cao ${vn(Math.abs(o.m) * TIP_Y, 1)} mm trên cảm biến 24 mm · f/${vn(S.N, 1)} · ${fmtT(S.shutter)}`;
    alert.set(S.obj < CAM.close + 1 ? 'GẦN NHẤT 0,35 M · PHÓNG ĐẠI 0,21×' : !focused && !S.af ? 'ẢNH KHÔNG RƠI ĐÚNG CẢM BIẾN · XOAY VÒNG LẤY NÉT' : '');
    if (callSub.ring) callSub.ring.textContent = `NÉT Ở ${vn(S.focus / 1000, 2)} M`;
    const Pp = (obj, x = 0, y = 0, z = 0) => { const v = wp(obj, x, y, z); return st.project(v[0], v[1], v[2]); };
    const lab = disp.labels && !cut.active && EX < 0.05 ? 1 : 0;
    ui.drawCallouts([{key: 'ong', p: Pp(barrel, 80, 30, 20), dx: 100, dy: -70}, {key: 'ring', p: Pp(focusRing, 74, -34, 10), dx: 110, dy: 40}, {key: 'ngam', p: Pp(ngam, 46, -30, 20), dx: -110, dy: 60}, {key: 'prism', p: Pp(prism, 0, 30, 0), dx: -100, dy: -60}], lab);
  },
};

function cardOf(part) {
  const base = {src: SRC}, o = optics();
  if (part === 'ong') return {...base, k: 'Thấu kính hội tụ', t: 'Ống kính 50 mm', b: 'Sáu thấu kính trong năm nhóm cùng làm việc như một thấu kính hội tụ tiêu cự 50 mm (nhiều thấu kính để sửa quang sai). Lấy nét là dời cả cụm thấu kính: vật càng gần, ảnh càng nằm xa thấu kính, nên ống kính phải vươn ra.',
    rows: [['Tiêu cự', '50 mm'], ['Cấu tạo', '6 thấu kính, 5 nhóm'], ['Thấu kính cách cảm biến', () => `${vn(optics().dp, 2)} mm`], ['Vươn thêm so với vô cực', () => `${vn(optics().dp - CAM.f, 2)} mm`], ['Kích thước', '69,2 × 39,3 mm · 160 g']]};
  if (part === 'khau') return {...base, k: 'Lượng sáng', t: 'Khẩu bảy lá', b: 'Bảy lá xếp thành lỗ bảy cạnh. Số f là tỉ số tiêu cự trên đường kính lỗ: N = f/D. Lượng sáng tỉ lệ diện tích lỗ, tức tỉ lệ 1/N²; khép từ f/2,8 xuống f/4 là giảm một nửa.',
    rows: [['Số f', () => `f/${vn(S.N, 1)}`], ['Đường kính lỗ', () => `${vn(pupil(S.N), 1)} mm`], ['Khoảng (hãng)', 'f/1.8 – f/22'], ['Số lá', '7']]};
  if (part === 'guong') return {...base, k: 'Ngắm qua ống kính', t: 'Gương lật', b: 'Gương nghiêng 45° hắt ánh sáng lên lăng kính để mắt nhìn qua kính ngắm thấy đúng ảnh ống kính tạo ra. Khi bấm chụp, gương lật lên cho ánh sáng đi thẳng tới cảm biến.', rows: [['Góc gương', '45° (khi ngắm)']]};
  if (part === 'man') return {...base, k: 'Thời gian phơi sáng', t: 'Màn trập hai lá', b: 'Lá trước kéo xuống để mở, sau thời gian t lá sau kéo xuống để đóng. Lượng sáng tới cảm biến tỉ lệ t/N².', rows: [['Tốc độ', () => fmtT(S.shutter)], ['Lượng sáng so f/1.8, 1/125', () => `× ${vn(exposure(S.N, S.shutter), 2)}`]]};
  if (part === 'cam') return {...base, k: 'Nơi ảnh hiện ra', t: 'Cảm biến 36 × 24 mm', b: 'Ảnh thật do ống kính tạo ra rơi lên cảm biến, lộn ngược và nhỏ hơn vật. Máy đọc cảm biến rồi lật lại khi hiện ảnh. Mặt ngàm EF cách cảm biến 44,0 mm.',
    rows: [['Khổ', '36 × 24 mm'], ['Ảnh ngọn nến', () => `${vn(Math.abs(o.m) * TIP_Y, 1)} mm, lộn ngược`], ['Số phóng đại', () => `${vn(optics().m, 3)} ×`]]};
  if (part === 'than') return {...base, k: 'Thân máy', t: 'Thân máy phản xạ', b: 'Thân giữ ngàm ống kính đúng 44,0 mm trước cảm biến; bên trong là hộp gương, lăng kính ngắm, màn trập, cảm biến, bo mạch và pin trong báng cầm. Kích thước thân là giả định của bài.', rows: [['Ngàm', 'EF, trong 54 mm, 1987']]};
  if (part === 'nen') return {...base, k: 'Vật', t: 'Ngọn nến', b: 'Vật đặt trước ống kính; đỉnh ngọn lửa cao 165 mm trên mặt bàn. Kéo “vật cách máy” để dời nến.', rows: [['Cách máy', () => `${vn(S.obj / 1000, 2)} m`]]};
  return null;
}
const soi = picker((part) => cardOf(part));

const views = {
  hero: (t) => ({tx: 0.035, ty: 0.06, tz: 0, az: 58 + 5 * Math.sin(t * 0.12), el: 20, d: 0.52, sx: 0, sy: -30}),
  wide: () => ({tx: S.obj * 0.0005, ty: 0.08, tz: 0, az: 32, el: 24, d: 0.55 + S.obj * 0.0016, sx: 0, sy: -20}),
  side: () => ({tx: S.obj * 0.0005, ty: 0.07, tz: 0, az: 0, el: 3, d: 0.4 + S.obj * 0.0014, sx: 0, sy: -40}),
  back: () => ({tx: 0.0, ty: 0.06, tz: 0, az: -130, el: 18, d: 0.5, sx: 0, sy: -30}),
};
views.cut = (t) => cut.view(views.hero(t)) || views.hero(t);

const CAP = [
  {k: 'CANON EF 50MM F/1.8 STM · KHỔ 36 × 24 MM', t: 'Máy ảnh là một thấu kính hội tụ', b: 'Ống kính 50 mm có sáu thấu kính nhưng cả cụm tác dụng như một thấu kính hội tụ. Ánh sáng từ ngọn nến qua ống kính hội tụ lại trên cảm biến, cách mặt ngàm 44,0 mm. Bài coi ống kính là một thấu kính mỏng và kiểm lại bằng chính số của hãng.', e: 'f = 50 mm · 6 thấu kính, 5 nhóm · 7 lá khẩu'},
  {k: 'BA TIA ĐẶC BIỆT', t: 'Ảnh thật, ngược, nhỏ hơn vật', b: 'Từ đỉnh ngọn lửa vẽ ba tia: tia song song trục đi qua tiêu điểm sau; tia qua quang tâm đi thẳng; tia qua tiêu điểm trước ra song song trục. Ba tia gặp nhau ở một điểm phía sau thấu kính: đó là ảnh của đỉnh ngọn lửa, nằm dưới trục, tức là ảnh lộn ngược.', e: '1/f = 1/d + 1/d′ · số phóng đại = d′/d',
    ask: {q: 'Ảnh ngọn nến trên cảm biến máy ảnh có tính chất gì?', o: ['Ảo, cùng chiều, lớn hơn vật', 'Thật, ngược chiều, nhỏ hơn vật', 'Thật, cùng chiều, bằng vật'], a: 1, e: 'Vật ở xa hơn hai lần tiêu cự cho ảnh thật, ngược chiều, nhỏ hơn vật, hứng được trên cảm biến.'}},
  {k: 'LẤY NÉT · DỜI THẤU KÍNH', t: 'Vật gần hơn, ảnh lùi xa hơn', b: 'Tắt lấy nét tự động rồi kéo nến lại gần: ảnh rơi sau cảm biến, các tia chưa kịp gặp nhau nên ngọn nến nhoè. Lấy nét là dời thấu kính ra xa cảm biến cho tới khi ảnh rơi đúng mặt cảm biến; ống kính này vươn ra khi lấy nét gần.', e: 'd giảm → d′ tăng'},
  {k: 'GẦN NHẤT · 0,35 M', t: 'Kiểm lại bằng số của hãng', b: 'Canon ghi: lấy nét gần nhất 0,35 m (tính từ cảm biến), phóng đại lớn nhất 0,21×. Giải 1/50 = 1/d + 1/d′ với d + d′ = 350 mm: d′ ≈ 60,4 mm, d ≈ 289,6 mm, phóng đại d′/d ≈ 0,209. Mô hình thấu kính mỏng cho đúng con số của hãng.', e: 'd + d′ = 350 · d·d′ = 50 × 350 → d′/d ≈ 0,21',
    ask: {q: 'Lấy nét ở 0,35 m, thấu kính 50 mm cách cảm biến khoảng bao nhiêu?', o: ['50 mm', 'Khoảng 60 mm', '350 mm'], a: 1, e: 'Giải d + d′ = 350 mm và 1/50 = 1/d + 1/d′ được d′ ≈ 60,4 mm: thấu kính phải vươn ra khoảng 10 mm so với khi lấy nét ở vô cực.'}},
  {k: 'KHẨU ĐỘ · N = f/D', t: 'Bảy lá đóng mở lỗ sáng', b: 'Số f là tiêu cự chia đường kính lỗ: f/1.8 cho lỗ 27,8 mm, f/22 chỉ 2,3 mm. Lượng sáng tỉ lệ diện tích lỗ, tức 1/N². Kéo thanh khẩu độ và xem ảnh vừa chụp tối đi.', e: 'D = 50 / N · lượng sáng ∝ t / N²'},
  {k: 'ĐỘ NÉT SÂU', t: 'Lỗ nhỏ, hậu cảnh bớt nhoè', b: 'Bức tường ở 3 m không rơi đúng cảm biến nên mỗi điểm thành một vòng nhoè; vòng nhoè tỉ lệ đường kính lỗ. Ở f/1.8 vòng nhoè của tường khoảng 1 mm trên cảm biến; khép về f/22 còn chưa tới 0,1 mm, hậu cảnh gần như rõ.', e: 'vòng nhoè = D·|d′_tường − d′| / d′_tường'},
  {k: 'CHỤP', t: 'Gương lật, màn trập mở rồi đóng', b: 'Bấm “Chụp”: gương lật lên, lá màn trập trước kéo xuống mở, sau thời gian t lá sau kéo xuống đóng, gương hạ. Ảnh vừa chụp hiện ở bảng 03, đã được lật lại cho đúng chiều.', e: 'lượng sáng ∝ t / N²'},
  {k: 'GÓC NHÌN', t: '36 mm và 50 mm cho 40°', b: 'Góc nhìn ngang bằng 2·arctan(36/(2·50)) = 39,6°, dọc 27,0°, chéo 46,8°. Canon ghi 40°, 27°, 46°. Cùng một ống kính gắn lên cảm biến nhỏ hơn thì góc nhìn hẹp lại.', e: 'góc nhìn = 2·arctan(cạnh cảm biến / 2f)'},
  {k: 'PHIM THÁO RỜI', t: 'Từng bộ phận, rồi cả máy', b: 'Mỗi bộ phận tách ra dưới một góc máy riêng, rồi cả máy bung ra trên bàn xoay và lắp lại. Bấm từng nút ở bảng 05 để tự tháo.', e: 'ống kính → khẩu → gương → màn trập → cảm biến → cả máy'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(3, {click: 'v_wide'}); at(7, {click: 'v_hero'});
at(9, {cap: 1}); at(9.5, {click: 'v_side'}); at(12, {click: 'xray'}); at(17, {click: 'xray'});
at(19, {cap: 2}); at(19.5, {click: 'af'}); at(20.5, {slide: 'obj', to: 0.05, dur: 2}); at(24, {slide: 'focus', to: 0.05, dur: 1.5}); at(27, {click: 'af'}); at(27.5, {click: 'cut_ong'}); at(33, {click: 'cut_ong'});
at(35, {cap: 3}); at(35.5, {slide: 'obj', to: 0, dur: 1}); at(38, {click: 'cut_cam'}); at(44, {click: 'cut_cam'});
at(46, {cap: 4}); at(46.5, {click: 'cut_khau'}); at(48, {slide: 'N', to: 1, dur: 2.5}); at(52, {slide: 'N', to: 0, dur: 1.5}); at(54.5, {click: 'cut_khau'});
at(56, {cap: 5}); at(56.5, {slide: 'obj', to: 0.27, dur: 1.5}); at(58.5, {click: 'shoot'}); at(60, {slide: 'N', to: 1, dur: 1}); at(62, {click: 'shoot'}); at(64, {slide: 'N', to: 0.25, dur: 1});
at(66, {cap: 6}); at(66.5, {click: 'cut_guong'}); at(70, {click: 'shoot'}); at(72.5, {click: 'cut_guong'}); at(73, {click: 'cut_man'}); at(77.5, {click: 'cut_man'});
at(79, {cap: 7}); at(79.5, {click: 'v_wide'}); at(84, {click: 'v_hero'});
at(86, {cap: 8}); at(86.5, {click: 'cut_film'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 86.5 + cut.duration + 2}, firstView: 'hero',
  extra: [{key: 'shoot', label: 'Chụp'}, {key: 'af', label: 'Lấy nét tự động'}, {key: 'rays', label: 'Tia sáng'}],
  shell: {subject: 'Khoa học tự nhiên 9 · thấu kính', objectives: ['Vẽ ba tia đặc biệt qua thấu kính hội tụ, nêu tính chất ảnh thật trên cảm biến', 'Dùng 1/f = 1/d + 1/d′ giải thích vì sao lấy nét là dời thấu kính', 'Liên hệ số f, đường kính lỗ khẩu và lượng sáng'],
    credit: 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial, claude-motion của whaleyxbt và cutaway của Nyxera0x (MIT). Thông số ống kính theo Canon; chỗ giả định ghi rõ trong thẻ soi.'},
  keys: {1: 'v_hero', 2: 'v_wide', 3: 'v_side', 4: 'v_back', ' ': 'shoot', a: 'af', r: 'rays', n: 'labels', x: 'xray', q: 'cut_ong', w: 'cut_khau', e: 'cut_guong', s: 'cut_man', c: 'cut_cam', f: 'cut_film', t: 'cut_all'}});
