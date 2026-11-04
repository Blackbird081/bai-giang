// Cánh tay robot 6 trục UR5e: trang chạy trực tiếp. Mọi khớp, bảng số và biểu đồ đọc từ cùng một mô hình động học
// (kin.js): bảng DH của Universal Robots, động học nghịch Hawkins 2013, Jacobian, mô men trọng lực theo khối lượng khâu.
import * as THREE from 'three';
import {createStage} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {DH, LINK, fk, ik, ikNearest, jacobian, manip, gravity, pose, downR, mul, inv, rotOf, rotvec, slerpR, quintic, JOINT, VMAX, REACH} from './kin.js';
import {buildArm, TOOL} from './robot.js';

const D = 180 / Math.PI, R = Math.PI / 180;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 1.3, grid: 0.1, fade: 4.2, fov: 26});
const ui = createUI(app);
const arm = buildArm(); st.scene.add(arm.root);
// nhãn bộ phận cho thẻ soi chi tiết: khung i mang vỏ khớp i + 1 và khâu nối sau nó; khung 6 mang bích và kẹp
arm.L.forEach((g, i) => tag(i < 6 ? 'j' + i : 'grip', g));
const TT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, TOOL, 0, 0, 0, 1], TTi = inv(TT);
const flangeAt = (p, R0) => mul(pose(R0, p), TTi);

// ---------------- cảnh: pa-lét, khối hàng, vùng với, vết TCP
const add = (m) => { m.castShadow = m.receiveShadow = true; arm.root.add(m); return m; };
const PAL = {A: [0.45, -0.25], B: [0.4, 0.35]};
for (const k of ['A', 'B']) {
  const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.012), new THREE.MeshStandardMaterial({color: '#d9dce1', roughness: 0.8})));
  p.position.set(PAL[k][0], PAL[k][1], 0.006);
}
const cubeMat = new THREE.MeshStandardMaterial({color: '#e3562a', roughness: 0.5});
const cube = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), cubeMat));
const CUBE_Z = 0.012 + 0.025;
const ghostMat = (col, a) => new THREE.ShaderMaterial({transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: {uC: {value: new THREE.Color(col)}, uA: {value: a}},
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uC; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor = vec4(uC, uA*(0.06+0.7*f)); }`});
const reachMat = ghostMat('#3c79a8', 0);
const reach = new THREE.Mesh(new THREE.SphereGeometry(REACH, 64, 40), reachMat); reach.position.z = DH[0].d; arm.root.add(reach);
const holeMat = ghostMat('#e3562a', 0);
const hole = new THREE.Mesh(new THREE.CylinderGeometry(DH[3].d, DH[3].d, 1.6, 48, 1, true), holeMat); hole.rotation.x = Math.PI / 2; hole.position.z = 0.6; arm.root.add(hole);
const dots = (col) => {
  const n = 900, m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshBasicMaterial({color: col}), n);
  m.count = 0; m.frustumCulled = false; arm.root.add(m); return {m, n, last: null};
};
const traceJ = dots('#e3562a'), traceL = dots(C.ink);
const M4 = new THREE.Matrix4();
const pushDot = (tr, p) => {
  if (tr.last && Math.hypot(p[0] - tr.last[0], p[1] - tr.last[1], p[2] - tr.last[2]) < 0.007) return;
  if (tr.m.count >= tr.n) return;
  tr.m.setMatrixAt(tr.m.count++, M4.makeTranslation(p[0], p[1], p[2])); tr.m.instanceMatrix.needsUpdate = true; tr.last = p;
};
const clearDots = (tr) => { tr.m.count = 0; tr.last = null; };

// ---------------- trạng thái
const HOME = [0, -90, 0, -90, 0, 0].map((v) => v * R);
const READY = [-14, -120, -73, 103, -90, 76].map((v) => v * R); // một nghiệm IK phía trên pa-lét A
const S = {q: READY.slice(), qd: [0, 0, 0, 0, 0, 0], hot: [0, 0, 0, 0, 0, 0], grip: 0, payload: 0, speed: 0.5, queue: [], seg: null, carry: false, cube: [PAL.A[0], PAL.A[1], CUBE_Z],
  disp: {frames: false, reach: false, trace: true, labels: true, xray: false}, wHist: [], vHist: [[], [], [], [], [], []], over: 0, alert: '', note: '', prog: '', lastTrace: null};
const F = () => fk(S.q);
const tcpOf = (Fr) => mul(Fr[6], TT);
const down0 = downR(0);

// ---------------- chuyển động: hàng đợi đoạn J (nội suy khớp), L (đường thẳng, giải IK mỗi bước), G (kẹp), W (chờ)
const enqueue = (...segs) => S.queue.push(...segs);
const stopAll = () => { S.queue = []; S.seg = null; };
const durJ = (q0, q1) => Math.max(0.7, (1.875 * Math.max(...q1.map((v, i) => Math.abs(v - q0[i])))) / (VMAX * S.speed * 0.6));
const durL = (p0, p1) => Math.max(0.7, (1.875 * Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])) / (0.5 * S.speed));
const startSeg = (g) => {
  const Fr = F(), T0 = tcpOf(Fr);
  g.t = 0; g.q0 = S.q.slice();
  if (g.type === 'J') { if (g.p) { const q = ikNearest(flangeAt(g.p, g.R || down0), S.q); g.q1 = q || S.q.slice(); } g.dur = g.dur || durJ(g.q0, g.q1); }
  if (g.type === 'L') { g.p0 = [T0[3], T0[7], T0[11]]; g.R0 = rotOf(T0); g.R1 = g.R || g.R0; g.dur = g.dur || durL(g.p0, g.p); }
  if (g.type === 'G') g.g0 = S.grip;
  if (g.trace) clearDots(g.type === 'J' ? traceJ : traceL);
  S.seg = g;
};
const stepMotion = (dt) => {
  if (!S.seg && S.queue.length) startSeg(S.queue.shift());
  const g = S.seg; if (!g) { S.qd = S.qd.map((v) => v * 0.8); return; }
  g.t += dt; const k = Math.min(1, g.t / (g.dur || 0.5)), s = quintic(k);
  const prev = S.q.slice();
  if (g.type === 'J') S.q = g.q0.map((v, i) => v + (g.q1[i] - v) * s);
  else if (g.type === 'L') {
    const p = g.p0.map((v, i) => v + (g.p[i] - v) * s), Rm = slerpR(g.R0, g.R1, s);
    const q = ikNearest(flangeAt(p, Rm), S.q);
    if (!q) { S.alert = 'NGOÀI VÙNG VỚI · KHÔNG CÓ NGHIỆM IK'; S.note = 'Cổ tay đi vào trụ quanh trục đế bán kính d4 = 133 mm: không có nghiệm, robot dừng.'; stopAll(); return; }
    S.q = q;
  } else if (g.type === 'G') { S.grip = g.g0 + ((g.close ? 1 : 0) - g.g0) * s; if (k >= 1 && g.close !== undefined) S.carry = g.close; }
  if (g.fn && k >= 1) g.fn();
  S.qd = S.q.map((v, i) => (v - prev[i]) / Math.max(dt, 1e-4));
  if (g.trace) { const T = tcpOf(F()); pushDot(g.type === 'J' ? traceJ : traceL, [T[3], T[7], T[11]]); }
  if (k >= 1) S.seg = null;
};

// ---------------- chương trình mẫu
const P1 = [0.45, -0.25, 0.32], P2 = [0.4, 0.35, 0.32];
const programs = {
  movej: () => { stopAll(); S.prog = 'MOVEJ'; enqueue({type: 'J', p: P1}, {type: 'W', dur: 0.3}, {type: 'J', p: P2, trace: true}); },
  movel: () => { stopAll(); S.prog = 'MOVEL'; enqueue({type: 'J', p: P1}, {type: 'W', dur: 0.3}, {type: 'L', p: P2, R: down0, trace: true}); },
  pick: () => {
    stopAll(); S.prog = 'GẮP – ĐẶT';
    const c = S.cube, dst = S.cube[0] === PAL.A[0] ? PAL.B : PAL.A, up = 0.22;
    enqueue({type: 'G', close: false, dur: 0.3}, {type: 'J', p: [c[0], c[1], up]}, {type: 'L', p: [c[0], c[1], CUBE_Z + 0.015], R: down0}, {type: 'G', close: true, dur: 0.5},
      {type: 'L', p: [c[0], c[1], up], R: down0}, {type: 'J', p: [dst[0], dst[1], up]}, {type: 'L', p: [dst[0], dst[1], CUBE_Z + 0.015], R: down0},
      {type: 'G', close: false, dur: 0.5, fn: () => { S.carry = false; S.cube = [dst[0], dst[1], CUBE_Z]; }}, {type: 'L', p: [dst[0], dst[1], up], R: down0});
  },
  sing: () => { stopAll(); S.prog = 'KỲ DỊ VAI'; enqueue({type: 'J', p: [0.45, 0.136, 0.35]}, {type: 'W', dur: 0.4}, {type: 'L', p: [-0.45, 0.136, 0.35], R: down0, trace: true, dur: 5.2}); },
  home: () => { stopAll(); S.prog = 'VỀ GỐC'; enqueue({type: 'J', q1: HOME}); },
  ready: () => { stopAll(); S.prog = ''; enqueue({type: 'J', q1: READY}); },
};
let sols = [];
const goSol = (i) => {
  const T = F()[6]; sols = ik(T); const s = sols[i]; if (!s) return;
  stopAll(); S.prog = `NGHIỆM S${i + 1}`;
  const q1 = s.q.map((v, k) => S.q[k] + Math.atan2(Math.sin(v - S.q[k]), Math.cos(v - S.q[k])));
  enqueue({type: 'J', q1, dur: Math.max(1.6, durJ(S.q, q1))});
};

// ---------------- bảng điều khiển
ui.header({code: 'UR5e', kicker: 'ROBOT CÔNG NGHIỆP · CÁNH TAY 6 BẬC TỰ DO', title: 'Cánh tay robot 6 trục', sub: 'ĐỘNG HỌC THUẬN · NGHỊCH · JACOBIAN · MÔ MEN TRỌNG LỰC', hub: HUB_URL,
  right: [['850 mm', 'TẦM VỚI'], ['5 kg', 'TẢI TRỌNG'], ['±0,03 mm', 'LẶP LẠI ISO 9283']]});
// 01 khớp
ui.panel(28, 112, 300, 256, 'KHỚP · ĐIỀU KHIỂN TAY', '01');
const jog = JOINT.map((j, i) => ui.slider('j' + i, 42, 148 + i * 30, 272, `J${i + 1} ${j.name}`, {lw: 78, vw: 60}));
ui.rule(42, 330, 272);
const spd = ui.slider('speed', 42, 342, 272, 'TỐC ĐỘ', {lw: 78, vw: 60});
// 02 bảng DH
ui.panel(28, 380, 300, 196, 'BẢNG DH · CẬP NHẬT THEO KHỚP', '02');
ui.text(42, 414, 'i&nbsp;&nbsp;&nbsp;&nbsp;θ (°)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;d (mm)&nbsp;&nbsp;&nbsp;a (mm)&nbsp;&nbsp;&nbsp;α (°)');
const dhRows = DH.map((r, i) => ui.text(42, 432 + i * 19, '', 'v', 'font-size:10.5px;font-weight:500;letter-spacing:.3px'));
ui.text(42, 552, 'Aᵢ = Rz(θᵢ)·Tz(dᵢ)·Tx(aᵢ)·Rx(αᵢ)', 'sm', 'text-transform:none;letter-spacing:.4px');
// 03 mô men trọng lực
ui.panel(28, 588, 300, 178, 'MÔ MEN GIỮ DO TRỌNG LỰC', '03');
const tb = JOINT.map((j, i) => ui.bar(42, 624 + i * 19, 272, `J${i + 1}`, {lw: 28, vw: 92}));
const pay = ui.slider('payload', 42, 744, 272, 'TẢI Ở KẸP', {lw: 78, vw: 60});
// 04 TCP
ui.panel(1272, 112, 300, 210, 'ĐẦU DỤNG CỤ · TCP', '04');
const tcpXYZ = ['X', 'Y', 'Z'].map((n, i) => { ui.text(1286 + i * 94, 148, n + ' (mm)'); return ui.text(1286 + i * 94, 161, '', 'mo', 'position:absolute;font-size:19px;font-weight:700'); });
const tcpR = ui.text(1286, 192, '', 'v', 'font-size:10.5px;font-weight:500');
ui.text(1286, 214, 'CHỈ SỐ THAO TÁC w = |det J|');
const wTxt = ui.text(1500, 211, '', 'v', 'width:58px;text-align:right');
const wChart = ui.chart(1286, 232, 272, 54, {min: 0, max: 0.1, colors: [C.or]});
ui.text(1286, 294, 'GẦN 0 = GẦN ĐIỂM KỲ DỊ · 6 GIÂY GẦN NHẤT', 'sm', 'font-size:8px');
// 05 IK
ui.panel(1272, 334, 300, 150, 'ĐỘNG HỌC NGHỊCH · 8 NGHIỆM', '05');
for (let i = 0; i < 8; i++) ui.button('s' + i, 1286 + (i % 4) * 68, 368 + Math.floor(i / 4) * 30, 62, `S${i + 1}`);
const solTxt = ui.text(1286, 432, '', 'sm', 'white-space:normal;width:272px;line-height:1.5;text-transform:none;letter-spacing:.4px;font-size:9.5px');
// 06 chương trình
ui.panel(1272, 496, 300, 172, 'CHƯƠNG TRÌNH', '06');
ui.buttons([['movej', 'MOVEJ'], ['movel', 'MOVEL'], ['pick', 'GẮP – ĐẶT'], ['sing', 'KỲ DỊ'], ['home', 'VỀ GỐC']], 1286, 530, 272);
ui.text(1286, 590, 'TỐC ĐỘ KHỚP (°/s) · GIỚI HẠN ±180');
const vChart = ui.chart(1286, 606, 272, 50, {min: -240, max: 240, colors: [C.or, C.blue, C.green, C.violet, C.gold, C.ink]});
// 07 hiển thị
ui.panel(1272, 680, 300, 86, 'HIỂN THỊ', '07');
ui.buttons([['frames', 'KHUNG DH'], ['reach', 'VÙNG VỚI'], ['trace', 'VẾT TCP'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 712, 272);
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_front', 'TRƯỚC'], ['v_top', 'TRÊN'], ['v_wrist', 'CỔ TAY']], 360, 120, 600);
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'j1', title: 'J1 ĐẾ', sub: 'CỠ 3 · 150 N·m'}, {key: 'j2', title: 'J2 VAI', sub: 'CỠ 3 · 150 N·m'}, {key: 'j3', title: 'J3 KHUỶU', sub: 'CỠ 3 · 150 N·m'},
  {key: 'j4', title: 'J4 CỔ TAY 1', sub: 'CỠ 1 · 28 N·m'}, {key: 'j5', title: 'J5 CỔ TAY 2', sub: 'CỠ 1 · 28 N·m'}, {key: 'j6', title: 'J6 CỔ TAY 3', sub: 'CỠ 1 · 28 N·m'},
  {key: 'tcp', title: 'TCP', sub: 'CÁCH BÍCH 140 mm'}, {key: 'ua', title: 'CÁNH TAY TRÊN', sub: 'a₂ = 425 mm'}, {key: 'fa', title: 'CẲNG TAY', sub: 'a₃ = 392,2 mm'},
]);

// ---------------- tương tác
const disp = S.disp;
const sim = {
  reset() {
    stopAll(); S.q = READY.slice(); S.grip = 0; S.carry = false; S.cube = [PAL.A[0], PAL.A[1], CUBE_Z]; S.payload = 0; S.speed = 0.5; S.prog = '';
    Object.assign(disp, {frames: false, reach: false, trace: true, labels: true, xray: false}); clearDots(traceJ); clearDots(traceL); S.alert = ''; S.note = '';
  },
  act(k) {
    if (programs[k]) { S.alert = ''; S.note = ''; programs[k](); return; }
    if (k[0] === 's' && k.length === 2) { goSol(+k[1]); return; }
    if (k in disp) disp[k] = !disp[k];
  },
  slide(k, t) {
    if (k[0] === 'j') { stopAll(); S.prog = ''; S.q[+k[1]] = (t * 2 - 1) * 2 * Math.PI; return; }
    if (k === 'speed') S.speed = 0.1 + t * 0.9;
    if (k === 'payload') S.payload = t * 5;
  },
  step(dt) { stepMotion(dt); },
  // soi chi tiết: bấm một khớp hay kẹp; số chạy theo cánh tay, camera bám theo khớp đó
  pick: picker((part) => {
    const src = 'Số đo: Universal Robots, bảng DH và khối lượng khâu của UR5e; mô men tối đa và tốc độ khớp theo datasheet UR5e.';
    if (part === 'grip') {
      return {k: 'UR5e · dụng cụ', t: 'Bích dụng cụ và kẹp hai ngón', b: 'Bích theo chuẩn ISO 9409-1-50-4-M6 để thay dụng cụ. Điểm làm việc TCP đặt ở đầu ngón kẹp; mọi lệnh MoveL tính theo điểm này.',
        rows: [['Kẹp', () => (S.grip > 0.5 ? 'đang đóng' : 'đang mở')], ['Đang mang hàng', () => (S.carry ? 'có' : 'không')], ['Tải đặt', () => `${vn(S.payload, 1)} kg / 5 kg`],
          ['TCP x, y, z', () => (S.T ? `${vn(S.T[3] * 1000, 0)}, ${vn(S.T[7] * 1000, 0)}, ${vn(S.T[11] * 1000, 0)} mm` : '—')], ['TCP cách bích', `${TOOL * 1000} mm (giả định kẹp)`]],
        src, d: 1.0};
    }
    const i = +part.slice(1), J = JOINT[i];
    const nm = ['Đế', 'Vai', 'Khuỷu', 'Cổ tay 1', 'Cổ tay 2', 'Cổ tay 3'][i];
    const role = [
      'Xoay cả cánh tay quanh trục đứng.',
      'Nâng hạ cánh tay trên. Khi tay duỗi ngang, khớp này gánh mô men trọng lực lớn nhất.',
      'Gập, duỗi cẳng tay so với cánh tay trên; cùng khớp vai quyết định cổ tay ở xa hay gần.',
      'Khớp nhỏ đầu tiên của cổ tay. Ba khớp cổ tay đặt hướng của dụng cụ; trục của chúng không cắt nhau tại một điểm nên UR dùng lời giải riêng (Hawkins 2013).',
      'Khớp cổ tay giữa. Khi góc khớp này bằng 0, trục khớp 4 và khớp 6 song song: cánh tay rơi vào điểm kỳ dị cổ tay.',
      'Khớp cuối, xoay bích dụng cụ quanh trục của nó.'][i];
    return {k: `UR5e · khớp ${i + 1} / 6 · cỡ ${J.size}`, t: `Khớp ${nm.toLocaleLowerCase('vi')}`, b: role,
      rows: [['Góc lúc này', () => `${vn(S.q[i] * D, 1)}°`], ['Tốc độ', () => `${vn(S.qd[i] * D, 0)} / 180 °/s`], ['Mô men giữ do trọng lực', () => (S.g ? `${vn(S.g[i], 1)} / ${J.tmax} N·m` : '—')],
        ['Khối lượng khâu sau khớp', `${vn(LINK[i].m, 2)} kg`], ['DH: d, a', `${vn(DH[i].d * 1000, 1)} mm, ${vn(DH[i].a * 1000, 1)} mm`]],
      src, d: i < 3 ? 1.5 : 1.15};
  }),
  shadowAt() { return new THREE.Vector3(0, 0.3, 0); },
  draw() {
    const Fr = F(), T = tcpOf(Fr), J = jacobian(Fr), {w} = manip(J), g = gravity(Fr, S.payload, TOOL);
    S.g = g; S.T = T; S.w = w;
    S.hot = S.qd.map((v) => Math.min(1, Math.abs(v) / VMAX));
    arm.update(Fr, {grip: S.grip, hot: S.hot, frames: disp.frames});
    // khối hàng theo kẹp
    if (S.carry) cube.position.set(T[3] - 0.015 * T[2], T[7] - 0.015 * T[6], T[11] - 0.015 * T[10]), cube.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(T[0], T[1], T[2], 0, T[4], T[5], T[6], 0, T[8], T[9], T[10], 0, 0, 0, 0, 1));
    else { cube.position.set(...S.cube); cube.quaternion.identity(); }
    reachMat.uniforms.uA.value += ((disp.reach ? 0.55 : 0) - reachMat.uniforms.uA.value) * 0.15;
    holeMat.uniforms.uA.value += ((disp.reach || S.prog === 'KỲ DỊ VAI' ? 0.6 : 0) - holeMat.uniforms.uA.value) * 0.15;
    reach.visible = reachMat.uniforms.uA.value > 0.01; hole.visible = holeMat.uniforms.uA.value > 0.01;
    traceJ.m.visible = traceL.m.visible = disp.trace;
    xrayArm(disp.xray ? 1 : 0);
    // bảng
    S.q.forEach((v, i) => jog[i].set((Math.max(-2 * Math.PI, Math.min(2 * Math.PI, v)) / (2 * Math.PI) + 1) / 2, `${fx(v * D, 1)}°`));
    spd.set((S.speed - 0.1) / 0.9, `${Math.round(S.speed * 100)} %`);
    pay.set(S.payload / 5, `${fx(S.payload, 1)} kg`);
    DH.forEach((r, i) => { dhRows[i].innerHTML = `${i + 1}&nbsp;&nbsp;&nbsp;<span style="color:${C.or}">${(S.q[i] * D).toFixed(1).padStart(7, ' ')}</span>&nbsp;&nbsp;&nbsp;${(r.d * 1000).toFixed(1).padStart(6, ' ')}&nbsp;&nbsp;&nbsp;${(r.a * 1000).toFixed(1).padStart(7, ' ')}&nbsp;&nbsp;&nbsp;${(r.al * D).toFixed(0).padStart(4, ' ')}`; });
    g.forEach((t, i) => tb[i].set(Math.abs(t) / JOINT[i].tmax, `${fx(t, 1)} / ${JOINT[i].tmax}`, Math.abs(t) / JOINT[i].tmax > 0.85 ? C.or : C.ink));
    tcpXYZ[0].textContent = (T[3] * 1000).toFixed(1); tcpXYZ[1].textContent = (T[7] * 1000).toFixed(1); tcpXYZ[2].textContent = (T[11] * 1000).toFixed(1);
    const rv = rotvec(rotOf(T)); tcpR.textContent = `RX ${fx(rv[0], 3)}  RY ${fx(rv[1], 3)}  RZ ${fx(rv[2], 3)} rad`;
    S.wHist.push(w); if (S.wHist.length > 360) S.wHist.shift();
    wTxt.textContent = w.toExponential(2);
    wChart.set([S.wHist], {band: [0, 0.008]});
    S.qd.forEach((v, i) => { S.vHist[i].push(v * D); if (S.vHist[i].length > 240) S.vHist[i].shift(); });
    vChart.set(S.vHist, {band: [-180, 180]});
    // nghiệm IK của tư thế hiện tại
    sols = ik(Fr[6]);
    let cur = -1, bd = 1e9;
    sols.forEach((s, i) => { const d = s.q.reduce((a, v, k) => a + Math.atan2(Math.sin(v - S.q[k]), Math.cos(v - S.q[k])) ** 2, 0); if (d < bd) { bd = d; cur = i; } });
    for (let i = 0; i < 8; i++) { ui.setOn('s' + i, i === cur && bd < 1e-4); ui.btn['s' + i].style.opacity = sols[i] ? 1 : 0.35; }
    const s = sols[cur];
    solTxt.textContent = s ? `S${cur + 1}: vai ${s.shoulder > 0 ? 'nhánh 1' : 'nhánh 2'} · khuỷu ${s.elbow > 0 ? 'nhánh 1' : 'nhánh 2'} · cổ tay ${s.wrist > 0 ? 'không lật' : 'lật'}. Cùng một tư thế đầu dụng cụ, ${sols.length} cách đặt cánh tay.` : 'Tư thế suy biến: số nghiệm thay đổi.';
    const over = S.qd.some((v) => Math.abs(v) > VMAX * 1.001);
    S.over = over ? 1.2 : Math.max(0, S.over - 1 / 60);
    alert.set(S.alert || (S.over > 0 ? 'VƯỢT 180°/s · GẦN ĐIỂM KỲ DỊ' : w < 0.005 ? 'ĐIỂM KỲ DỊ · w → 0' : ''));
    for (const k of Object.keys(disp)) ui.setOn(k, disp[k]);
    ui.setOn('movej', S.prog === 'MOVEJ'); ui.setOn('movel', S.prog === 'MOVEL'); ui.setOn('pick', S.prog === 'GẮP – ĐẶT'); ui.setOn('sing', S.prog === 'KỲ DỊ VAI');
    // nhãn
    const o = (i, dz = 0) => { const T2 = Fr[i]; return st.project(T2[3] + T2[2] * dz, T2[11] + T2[10] * dz, -(T2[7] + T2[6] * dz)); };
    const mid = (a, b, z) => { const A = Fr[a], B = Fr[b]; return st.project((A[3] + B[3]) / 2 + A[2] * z, (A[11] + B[11]) / 2 + A[10] * z, -((A[7] + B[7]) / 2 + A[6] * z)); };
    const k = disp.labels ? 1 : 0;
    ui.drawCallouts([
      {key: 'j1', p: o(0, 0.06), dx: -120, dy: 30}, {key: 'j2', p: o(1, 0.07), dx: -110, dy: -40}, {key: 'j3', p: o(2, 0.07), dx: -90, dy: -60},
      {key: 'j4', p: o(3, 0.07), dx: 70, dy: -50}, {key: 'j5', p: o(4, 0.02), dx: 90, dy: -20}, {key: 'j6', p: o(5, 0.05), dx: 90, dy: 20},
      {key: 'tcp', p: st.project(T[3], T[11], -T[7]), dx: 80, dy: 50}, {key: 'ua', p: mid(1, 2, 0.138), dx: -70, dy: -70}, {key: 'fa', p: mid(2, 3, 0.007), dx: 40, dy: -80},
    ], k);
  },
};
const xrayArm = (() => { let cur = -1; return (k) => { if (Math.abs(k - cur) < 1e-3) return; cur = k; arm.root.traverse((m) => { if (!m.isMesh || m === cube || m === reach || m === hole || m.isInstancedMesh) return; const mats = Array.isArray(m.material) ? m.material : [m.material]; for (const x of mats) { if (x.isShaderMaterial || x.isMeshBasicMaterial) continue; x.transparent = k > 0; x.opacity = 1 - 0.75 * k; x.depthWrite = k < 0.5; } }); }; })();

// ---------------- góc nhìn
const views = {
  hero: (t) => ({tx: 0.12, ty: 0.32, tz: 0.0, az: 68 + 6 * Math.sin(t * 0.15), el: 22, d: 3.0, sx: 0, sy: -30}),
  front: () => ({tx: 0.1, ty: 0.4, tz: 0, az: 90, el: 8, d: 3.2, sx: 0, sy: -30}),
  top: () => ({tx: 0.12, ty: 0.1, tz: -0.05, az: 90, el: 84, d: 3.0, sx: 0, sy: -20}),
  wrist: () => { const Fr = F(), T = Fr[4]; return {tx: T[3], ty: T[11], tz: -T[7], az: 40, el: 22, d: 1.25, sx: 0, sy: -30}; },
};

// ---------------- bài giảng (chuyến tham quan)
const CAP = [
  {k: 'UR5e · 6 KHỚP QUAY', t: 'Một cánh tay, sáu bậc tự do', b: 'UR5e có sáu khớp quay nối tiếp. Ba khớp lớn (đế, vai, khuỷu, cỡ 3, 150 N·m) đặt vị trí cổ tay; ba khớp nhỏ ở cổ tay (cỡ 1, 28 N·m) đặt hướng dụng cụ. Tầm với 850 mm, tải 5 kg, độ lặp lại ±0,03 mm. Mọi con số trên bảng đọc từ cùng một mô hình.', e: 'q = (θ₁, …, θ₆) → tư thế đầu dụng cụ T ∈ SE(3)'},
  {k: 'MÔ HÌNH DENAVIT–HARTENBERG', t: 'Bốn số cho mỗi khâu', b: 'Mỗi khớp gắn một hệ trục. Biến đổi từ khung i−1 sang khung i chỉ cần bốn số: góc θ quanh z, dời d dọc z, dời a dọc x, xoay α quanh x. Bảng 02 là bảng DH do chính Universal Robots công bố; cột θ đổi theo khớp.', e: 'Aᵢ = Rz(θᵢ)·Tz(dᵢ)·Tx(aᵢ)·Rx(αᵢ)'},
  {k: 'ĐỘNG HỌC THUẬN', t: 'Quay từng khớp, đọc tư thế', b: 'Kéo một khớp, nhân lại sáu ma trận là ra vị trí và hướng của đầu dụng cụ (bảng 04). Đó là động học thuận: luôn có đúng một đáp án và tính rất nhanh.', e: 'T₀⁶(q) = A₁(θ₁)·A₂(θ₂)···A₆(θ₆)'},
  {k: 'ĐỘNG HỌC NGHỊCH', t: 'Một tư thế, tám cánh tay', b: 'Bài toán ngược: biết tư thế cần đạt, tìm góc khớp. Với UR có lời giải đóng (Hawkins 2013): hai nhánh vai × hai nhánh cổ tay × hai nhánh khuỷu = 8 nghiệm. Đầu dụng cụ đứng yên trong khi cánh tay đổi cách đặt.', e: 'θ₁ = atan2(p₀₅y, p₀₅x) ± acos(d₄ / ‖p₀₅,xy‖) + π/2'},
  {k: 'MOVEJ VÀ MOVEL', t: 'Nội suy khớp hay nội suy đường thẳng', b: 'MoveJ chia đều góc khớp theo đa thức bậc năm: các khớp chạy êm nhưng đầu dụng cụ vẽ đường cong (chấm cam). MoveL chia đều vị trí trên đoạn thẳng và giải động học nghịch ở từng bước: đường thẳng (chấm đen), đổi lại tốc độ khớp có thể dồn lên.', e: 's(τ) = 10τ³ − 15τ⁴ + 6τ⁵ · vận tốc đỉnh 1,875·Δ/T'},
  {k: 'JACOBIAN VÀ ĐIỂM KỲ DỊ', t: 'Khi cánh tay mất một hướng chuyển động', b: 'Jacobian J(q) nối tốc độ khớp với vận tốc đầu dụng cụ. Khi det J → 0, có hướng mà đầu dụng cụ không đi được; muốn giữ đường thẳng, khớp phải quay rất nhanh. Đi ngang gần trục đế, w lao xuống và tốc độ khớp vượt 180°/s.', e: 'ẋ = J(q)·q̇ · w = |det J| (Yoshikawa)'},
  {k: 'TĨNH HỌC', t: 'Mô men giữ do trọng lực', b: 'Mỗi khâu có khối lượng và trọng tâm (UR công bố). Mô men khớp j để giữ yên bằng tổng mô men của trọng lực các khâu phía sau. Duỗi tay và tăng tải lên 5 kg: khớp vai tiến sát giới hạn 150 N·m, cổ tay gần như không chịu.', e: 'τ = −Σᵢ Jᵥ,ᵢᵀ(q)·mᵢ·g'},
  {k: 'ỨNG DỤNG', t: 'Gắp và đặt', b: 'Chu trình thật: MoveJ tới trên vật, MoveL xuống thẳng, đóng kẹp, nhấc thẳng, MoveJ sang pa-lét kia, hạ, mở kẹp. Đoạn tiếp cận dùng MoveL để kẹp không quét ngang vật.', e: 'MoveJ → MoveL ↓ → kẹp → MoveL ↑ → MoveJ → MoveL ↓ → nhả'},
  {k: 'VÙNG LÀM VIỆC', t: 'Cầu 850 mm và trụ không với tới', b: 'Vùng với là quả cầu bán kính 850 mm quanh khớp vai. Quanh trục đế có một trụ hẹp bán kính d₄ = 133 mm mà cổ tay không vào được: điểm kỳ dị vai. Bố trí trạm làm việc nên tránh trụ này.', e: 'R ≤ 850 mm · ‖p₀₅,xy‖ ≥ d₄'},
];
const ev = [];
const at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1.2, {click: 'labels'}); at(2.6, {click: 'labels'});
at(6, {cap: 1}); at(7, {click: 'frames'}); at(8.5, {click: 'v_wrist'}); at(13, {click: 'v_hero'});
at(15, {cap: 2}); at(16, {slide: 'j0', to: 0.5 + 40 / 720, dur: 1.6}); at(18.2, {slide: 'j1', to: 0.5 - 100 / 720, dur: 1.4}); at(20.2, {slide: 'j4', to: 0.5 - 30 / 720, dur: 1.2}); at(22, {click: 'frames'});
at(24, {cap: 3}); at(24.5, {do: () => programs.ready()}); for (let i = 0; i < 8; i++) at(26.5 + i * 2.6, {click: 's' + [7, 3, 1, 5, 6, 2, 0, 4][i]});
at(48, {cap: 4}); at(49, {click: 'movej'}); at(56, {click: 'movel'});
at(64, {cap: 5}); at(65, {click: 'sing'}); at(66, {click: 'v_top'}); at(73, {click: 'v_hero'});
at(75, {cap: 6}); at(76, {click: 'home'}); at(77.5, {do: () => programs.movej()}); at(78, {do: () => { stopAll(); enqueue({type: 'J', q1: [0, 0, 0, 0, Math.PI / 2, 0], dur: 2.2}); }}); at(81, {slide: 'payload', to: 1, dur: 2.5});
at(86, {cap: 7}); at(86.5, {slide: 'payload', to: 0.2, dur: 0.8}); at(87.5, {click: 'pick'}); at(88.5, {click: 'v_front'});
at(101, {cap: 8}); at(101.5, {click: 'v_hero'}); at(102, {click: 'reach'}); at(108, {click: 'reach'});
ev.sort((a, b) => a.at - b.at);

runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 111}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_front', 3: 'v_top', 4: 'v_wrist', j: 'movej', l: 'movel', p: 'pick', k: 'sing', h: 'home', f: 'frames', r: 'reach', x: 'xray', t: 'trace', n: 'labels'}});
