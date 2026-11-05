// Robot sáu chân: trang chạy trực tiếp. Dáng đi, đa giác chống đỡ, biên ổn định và mô men servo đều đọc từ gait.js.
import * as THREE from 'three';
import {createStage, MAT, setOpacity} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {LEG, LEGS, VN, GAITS, SERVO, legIK, legPoints, footAt, hull, margin} from './gait.js';

const D = 180 / Math.PI, G = 9.81;
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.75, grid: 0.05, fade: 3.2, fov: 26});
const ui = createUI(app);
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; st.scene.add(world);
const body = new THREE.Group(); world.add(body);
const mk = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

// ---------------- hình khối (bo cạnh, vật liệu thật: nhựa phủ bóng, nhôm anod, cao su)
const plateMat = MAT.pcb('#25272a'), servoMat = MAT.satin('#222326'), bracketMat = MAT.anod('#c4c8cc'), footMat = MAT.rubber(), hornMat = MAT.anod('#9ca2a8');
const outline = [[0.15, 0.05], [0.02, 0.118], [-0.02, 0.118], [-0.15, 0.05], [-0.15, -0.05], [-0.02, -0.118], [0.02, -0.118], [0.15, -0.05]];
const plateGeo = (() => {
  const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const [x, y] of [[0.075, 0.035], [-0.075, 0.035], [0.075, -0.035], [-0.075, -0.035]]) sh.holes.push(SH.slotHole(x, y, 0.05, 0.014));
  for (const [x, y] of [[0, 0.085], [0, -0.085], [0.12, 0], [-0.12, 0]]) sh.holes.push(SH.hole(x, y, 0.009));
  return SH.slab(sh, 0.004, 0.0012, 6);
})();
const topP = mk(plateGeo, plateMat), botP = mk(plateGeo, plateMat);
// bộ điều khiển ArbotiX: mạch xanh, chip, chân cắm
const board = new THREE.Group(); body.add(board);
mk(SH.rbox(0.09, 0.06, 0.0016, 0.0006), MAT.pcb('#1f5a3c'), board);
mk(SH.rbox(0.018, 0.018, 0.003, 0.0005), MAT.chip(), board).position.set(0.01, 0.006, 0.002);
for (let k = 0; k < 6; k++) mk(SH.rbox(0.0025, 0.016, 0.006, 0.0004), MAT.chip(), board).position.set(-0.036 + k * 0.006, -0.018, 0.0038);
mk(SH.rbox(0.012, 0.009, 0.005, 0.0008), MAT.steel(), board).position.set(0.035, 0.02, 0.0033);
const batt = mk(SH.rbox(0.1, 0.034, 0.024, 0.004), MAT.satin('#3a3d41'));
const battLabel = mk(SH.rbox(0.06, 0.0352, 0.0242, 0.002), MAT.accent());
// servo AX-12A 32 × 50 × 40 mm: thân bo cạnh, đường ghép vỏ, đĩa trục (horn) và ổ đỡ ở hai mặt vuông góc với trục quay
const horn = () => SH.merge([SH.roundCyl(0.0105, 0, 0.0028, 0.0008, 0.0012, 32), ...[0, 1, 2, 3].map((k) => { const g = SH.roundCyl(0.0013, 0.0028, 0.0038, 0, 0.0005, 10); g.translate(0.0075 * Math.cos((k * Math.PI) / 2 + 0.785), 0.0075 * Math.sin((k * Math.PI) / 2 + 0.785), 0); return g; })]);
function servoGeo(axis) { // axis 'z' hoặc 'y': trục quay của khớp
  const parts = [SH.rbox(0.032, 0.05, 0.04, 0.004)];
  const seam = SH.rbox(0.0328, 0.0508, 0.0016, 0.0006); seam.translate(0, 0, 0.006); parts.push(seam);
  for (const sgn of [1, -1]) {
    const h = horn(); if (sgn < 0) h.rotateX(Math.PI);
    if (axis === 'z') h.translate(0, 0, sgn * 0.02); else { h.rotateX(-Math.PI / 2); h.translate(0, sgn * 0.025, 0); }
    parts.push(h);
  }
  for (const sx of [-1, 1]) { const ear = SH.rbox(0.004, 0.044, 0.03, 0.0012); ear.translate(sx * 0.0175, 0, 0); parts.push(ear); }
  return SH.merge(parts);
}
const servoZ = servoGeo('z'), servoY = servoGeo('y');
// khung nhôm: thanh coxa (khối chữ U), hai má đùi có lỗ, ống chân thuôn có lỗ giảm nhẹ, đế cao su
const L0 = {coxa: LEG.coxa, femur: LEG.femur, tibia: LEG.tibia};
const coxaGeo = SH.rbox(0.012, L0.coxa, 0.03, 0.003);
const femGeo = (() => { const g = SH.linkBar(L0.femur, 0.022, 0.003, 0.0045); g.translate(0, -L0.femur / 2, 0); return g; })();
const tibGeo = (() => {
  const L = L0.tibia, sh = new THREE.Shape();
  sh.moveTo(-0.013, -L / 2); sh.lineTo(0.013, -L / 2); sh.quadraticCurveTo(0.012, 0, 0.006, L / 2); sh.lineTo(-0.006, L / 2); sh.quadraticCurveTo(-0.012, 0, -0.013, -L / 2);
  sh.holes.push(SH.slotHole(0, -L * 0.22, 0.008, 0.026), SH.slotHole(0, L * 0.12, 0.006, 0.022));
  const g = SH.slab(sh, 0.004, 0.0012, 12); g.rotateY(Math.PI / 2); return g;
})();
const footGeo = SH.lathe([[0, -0.009], [0.006, -0.008], [0.009, -0.004], [0.008, 0.002], [0.0055, 0.008], [0, 0.009]], 24);
const legMeshes = LEGS.map(() => ({
  hipServo: mk(servoZ, servoMat), coxa: mk(coxaGeo, bracketMat), femServo: mk(servoY, servoMat), femA: mk(femGeo, bracketMat), femB: mk(femGeo, bracketMat),
  kneeServo: mk(servoY, servoMat), tibia: mk(tibGeo, MAT.pcb('#2a2c30')), foot: mk(footGeo, footMat),
}));
for (const m of legMeshes) { m.coxa.userData.L0 = L0.coxa; m.femA.userData.L0 = m.femB.userData.L0 = L0.femur; m.tibia.userData.L0 = L0.tibia; }
// nhãn bộ phận cho thẻ soi chi tiết: thân, và từng khớp của từng chân (servo cùng khâu nó quay)
tag('body', body);
legMeshes.forEach((m, i) => { tag(`${i}:hip`, m.hipServo, m.coxa); tag(`${i}:fem`, m.femServo, m.femA, m.femB); tag(`${i}:knee`, m.kneeServo, m.tibia, m.foot); });
const v3 = (p) => new THREE.Vector3(p[0], p[1], p[2]), Zup = new THREE.Vector3(0, 0, 1), M4 = new THREE.Matrix4();
const orient = (m, a, b, side) => { // hộp nối a→b, mặt rộng hướng theo side; chiều dài khâu co giãn theo L0
  const A = v3(a), B = v3(b), Y = B.clone().sub(A), L = Y.length(); Y.normalize();
  const X = side.clone().sub(Y.clone().multiplyScalar(side.dot(Y))).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
  m.matrixAutoUpdate = true; m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromRotationMatrix(M4.makeBasis(X, Y, Z)); m.scale.set(1, L / (m.userData.L0 || L), 1);
};
const place = (m, p, X, Y) => { const Z = new THREE.Vector3().crossVectors(X, Y); m.position.copy(v3(p)); m.quaternion.setFromRotationMatrix(M4.makeBasis(X, Y, Z)); };
// sàn: dấu chân, đa giác chống đỡ, hình chiếu trọng tâm
const polyMat = new THREE.MeshBasicMaterial({color: '#e3562a', transparent: true, opacity: 0.16, depthWrite: false});
const poly = new THREE.Mesh(new THREE.BufferGeometry(), polyMat); poly.position.z = 0.0015; world.add(poly);
const polyLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: '#e3562a'})); polyLine.position.z = 0.002; world.add(polyLine);
const mLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: C.ink})); mLine.position.z = 0.0025; world.add(mLine);
const com = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.011, 24), new THREE.MeshBasicMaterial({color: C.ink})); com.position.z = 0.003; world.add(com);
const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.007, 16), new THREE.MeshBasicMaterial({color: '#9aa0aa', transparent: true, opacity: 0.6}), 240);
prints.count = 0; prints.frustumCulled = false; prints.position.z = 0.001; world.add(prints);
let printI = 0;

// ---------------- trạng thái
const S = {gait: 'tripod', phase: 0, stride: 0.05, Tc: 1.1, head: 0, turn: 0, h: 0.09, lift: 0.035, mass: 2.0, run: true,
  pose: {x: 0, y: 0, yaw: 0}, wasStance: Array(6).fill(true), hist: [], disp: {poly: true, trails: true, labels: true, xray: false}, out: null};
const cmdOf = () => {
  const g = GAITS[S.gait], v = S.run ? S.stride / (g.beta * S.Tc) : 0;
  return {vx: v * Math.cos(S.head), vy: v * Math.sin(S.head), w: S.run ? S.turn : 0, lift: S.lift, v};
};
const solve = () => {
  const g = GAITS[S.gait], cmd = cmdOf();
  return LEGS.map((L) => { const f = footAt(L, S.run ? S.phase : 0.0001, g, cmd, S.Tc); const a = legIK(L, f.pos, S.h); return {L, f, a, P: legPoints(L, a, S.h)}; });
};

// ---------------- bảng điều khiển
ui.header({code: 'HEXAPOD', kicker: 'ROBOT ĐI BỘ · 18 BẬC TỰ DO · 18 SERVO AX-12A', title: 'Robot sáu chân', sub: 'DÁNG ĐI · ĐA GIÁC CHỐNG ĐỠ · BIÊN ỔN ĐỊNH TĨNH · IK CHÂN', hub: HUB_URL,
  right: [['18', 'BẬC TỰ DO'], ['1,5 N·m', 'SERVO AX-12A'], ['½ · ⅔ · ⅚', 'HỆ SỐ CHỐNG β']]});
ui.panel(28, 112, 300, 238, 'DÁNG ĐI', '01');
ui.buttons([['tripod', 'TRIPOD'], ['tetrapod', 'TETRAPOD'], ['wave', 'WAVE'], ['stop', 'DỪNG']], 42, 146, 272);
const gaitSvg = ui.svg(42, 182, 272, 120);
const gaitTxt = ui.text(42, 296, '', 'sm', 'text-transform:none;letter-spacing:.4px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(28, 362, 300, 232, 'ĐIỀU KHIỂN', '02');
const SL = [['stride', 'SẢI CHÂN'], ['Tc', 'CHU KỲ'], ['head', 'HƯỚNG ĐI'], ['turn', 'XOAY'], ['h', 'CAO THÂN'], ['lift', 'NHẤC CHÂN'], ['mass', 'KHỐI LƯỢNG']];
const sl = Object.fromEntries(SL.map(([k, n], i) => [k, ui.slider(k, 42, 398 + i * 27, 272, n, {lw: 82, vw: 70})]));
ui.text(42, 580, 'Khối lượng: giả định, chưa có số công bố.', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:8.5px');
ui.panel(28, 606, 300, 160, 'GÓC KHỚP · IK TỪNG CHÂN', '03');
ui.text(42, 640, 'CHÂN&nbsp;&nbsp;&nbsp;HÁNG γ&nbsp;&nbsp;ĐÙI α&nbsp;&nbsp;&nbsp;GỐI β&nbsp;&nbsp;&nbsp;PHA');
const legRows = LEGS.map((L, i) => ui.text(42, 657 + i * 17, '', 'v', 'font-size:10.5px;font-weight:500'));
ui.panel(1272, 112, 300, 236, 'ỔN ĐỊNH TĨNH', '04');
ui.text(1286, 148, 'BIÊN ỔN ĐỊNH SSM (mm)'); const ssmTxt = ui.text(1286, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
ui.text(1430, 148, 'THEO CHIỀU ĐI (mm)'); const lsmTxt = ui.text(1430, 161, '', 'mo', 'position:absolute;font-size:24px;font-weight:700');
const ssmChart = ui.chart(1286, 202, 272, 70, {min: 0, max: 0.25, colors: [C.or, C.ink], dash: [0, '3 3']});
ui.text(1286, 280, 'CAM: SSM · NÉT ĐỨT: THEO CHIỀU ĐI · 6 GIÂY');
const nTxt = ui.text(1286, 298, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:9.5px;white-space:normal;width:272px;line-height:1.45');
ui.panel(1272, 360, 300, 186, 'MÔ MEN SERVO ĐÙI · ƯỚC LƯỢNG TĨNH', '05');
const tb = LEGS.map((L, i) => ui.bar(1286, 396 + i * 20, 272, L.name, {lw: 30, vw: 96, mark: 0.75}));
ui.text(1286, 520, 'τ ≈ m·g / n_chống × tay đòn · vạch 1,5 N·m', 'sm', 'text-transform:none;letter-spacing:.3px');
ui.panel(1272, 558, 300, 110, 'HIỂN THỊ', '06');
ui.buttons([['poly', 'ĐA GIÁC'], ['trails', 'DẤU CHÂN'], ['labels', 'NHÃN'], ['xray', 'X-QUANG']], 1286, 592, 272);
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_top', 'TRÊN'], ['v_leg', 'MỘT CHÂN']], 360, 120, 600);
ui.cap = ui.caption(348, 778, 904, 106);
const alert = ui.alert(800, 186);
ui.callouts([
  {key: 'coxa', title: 'KHỚP HÁNG γ', sub: `COXA ${LEG.coxa * 1000} mm`}, {key: 'femur', title: 'KHỚP ĐÙI α', sub: `FEMUR ${LEG.femur * 1000} mm`}, {key: 'tibia', title: 'KHỚP GỐI β', sub: `TIBIA ${LEG.tibia * 1000} mm`},
  {key: 'foot', title: 'BÀN CHÂN', sub: 'ĐIỂM TỰA'}, {key: 'board', title: 'BỘ ĐIỀU KHIỂN', sub: 'ARBOTIX'}, {key: 'servo', title: 'SERVO AX-12A', sub: '1,5 N·m · 59 rpm · 300°'},
]);

// ---------------- mô phỏng
const disp = S.disp;
const defaults = () => Object.assign(S, {gait: 'tripod', phase: 0, stride: 0.05, Tc: 1.1, head: 0, turn: 0, h: 0.09, lift: 0.035, mass: 2.0, run: true});
const sim = {
  reset() { defaults(); Object.assign(disp, {poly: true, trails: true, labels: true, xray: false}); S.hist = []; prints.count = 0; printI = 0; },
  act(k) {
    if (GAITS[k]) { S.gait = k; S.run = true; return; }
    if (k === 'stop') { S.run = !S.run; return; }
    if (k in disp) disp[k] = !disp[k];
  },
  slide(k, t) {
    const R = {stride: [0, 0.08], Tc: [0.6, 2.0], head: [-Math.PI, Math.PI], turn: [-0.5, 0.5], h: [0.05, 0.12], lift: [0.015, 0.06], mass: [1, 3]}[k];
    if (R) S[k] = R[0] + t * (R[1] - R[0]);
  },
  keyDown(k) {
    const m = {w: 0, s: Math.PI, a: Math.PI / 2, d: -Math.PI / 2}[k];
    if (m !== undefined) { S.head = m; S.run = true; if (S.stride < 0.03) S.stride = 0.05; return true; }
    if (k === 'q') { S.turn = 0.35; return true; } if (k === 'e') { S.turn = -0.35; return true; }
    return false;
  },
  keyUp(k) { if (k === 'q' || k === 'e') S.turn = 0; },
  step(dt) {
    const cmd = cmdOf();
    if (S.run) {
      S.phase = (S.phase + dt / S.Tc) % 1;
      const p = S.pose, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      p.x += (cmd.vx * c - cmd.vy * s) * dt; p.y += (cmd.vx * s + cmd.vy * c) * dt; p.yaw += cmd.w * dt;
    }
    S.out = solve();
  },
  shadowAt() { return new THREE.Vector3(S.pose.x, 0.08, -S.pose.y); },
  // soi chi tiết: bấm thân hay một khớp của một chân; camera bám theo chỗ đó khi robot đi
  pick: picker((part) => {
    const src = 'Servo: ROBOTIS AX-12A (1,5 N·m ở 12 V, 59 vòng/phút không tải, quay 300°). Kích thước chân theo cấu hình Phoenix cho PhantomX; đùi, ống chân tác giả ghi là ước đoán.';
    if (part === 'body') {
      const g = () => GAITS[S.gait];
      return {k: 'Robot sáu chân · 18 bậc tự do', t: 'Thân và bộ điều khiển', b: 'Hai tấm khung kẹp bộ điều khiển và pin. Bộ sinh dáng đi tính vị trí sáu bàn chân theo pha, rồi IK từng chân ra 18 góc servo.',
        rows: [['Dáng đi', () => (S.run ? `${g().vn.toLowerCase()} · β = ${g().beta === 0.5 ? '1/2' : g().beta < 0.7 ? '2/3' : '5/6'}` : 'đang dừng')], ['Vận tốc', () => `${vn(cmdOf().v * 100, 1)} cm/s`],
          ['Chân đang chống', () => `${S.nStance ?? '—'} / 6`], ['Biên ổn định tĩnh', () => (S.ssm != null ? `${vn(S.ssm * 1000, 1)} mm` : '—')], ['Khối lượng đặt', () => `${vn(S.mass, 1)} kg`]],
        src, d: 1.5};
    }
    const [li, j] = part.split(':'), i = +li, L = LEGS[i], o = () => S.out?.[i];
    const leg = VN[L.name].toLocaleLowerCase('vi');
    const J = {
      hip: {t: 'Khớp háng', ang: 'γ', key: 'gamma', len: LEG.coxa, b: 'Servo háng xoay cả chân trong mặt phẳng ngang. Góc γ ra thẳng từ atan2 của vị trí bàn chân.'},
      fem: {t: 'Khớp đùi', ang: 'α', key: 'alpha', len: LEG.femur, b: 'Servo đùi nâng hạ đùi. Đây là servo gánh nặng nhất khi chân chống: mô men xấp xỉ phần trọng lượng chân gánh nhân tay đòn ngang tới bàn chân.'},
      knee: {t: 'Khớp gối', ang: 'β', key: 'beta', len: LEG.tibia, b: 'Servo gối gập ống chân. Góc trong β tính bằng định lí cos trong tam giác đùi, ống chân và đoạn nối háng tới bàn chân.'},
    }[j];
    return {k: `Chân ${leg} · ${L.name}`, t: J.t, b: J.b,
      rows: [[`Góc ${J.ang} lúc này`, () => (o() ? `${vn(o().a[J.key] * D, 1)}°` : '—')], ['Chân đang', () => (o() ? (o().f.stance ? 'chống' : 'bước') : '—')],
        ...(j === 'fem' ? [['Mô men đùi ước lượng', () => (S.tq ? `${vn(S.tq[i], 2)} / 1,5 N·m` : '—')]] : []),
        [j === 'hip' ? 'Dài khâu háng' : j === 'fem' ? 'Dài đùi' : 'Dài ống chân', `${vn(J.len * 1000, 0)} mm`], ['Với tới được', () => (o() ? (o().a.ok ? 'có' : 'không, chân duỗi hết') : '—')]],
      src, d: 0.85};
  }),
  draw() {
    const out = S.out || solve(), p = S.pose, c = Math.cos(p.yaw), s = Math.sin(p.yaw), g = GAITS[S.gait];
    const toW = (q) => [p.x + q[0] * c - q[1] * s, p.y + q[0] * s + q[1] * c, q[2]];
    body.position.set(p.x, p.y, 0); body.rotation.set(0, 0, p.yaw);
    topP.position.z = S.h + 0.024; botP.position.z = S.h - 0.026; board.position.z = S.h + 0.034; batt.position.z = S.h + 0.004; battLabel.position.z = S.h + 0.004;
    // chân
    out.forEach((o, i) => {
      const m = legMeshes[i], P = o.P, ex = P.ex, ey = P.ey, side = new THREE.Vector3(-ey, ex, 0), fwd = new THREE.Vector3(ex, ey, 0);
      place(m.hipServo, [P.hip[0], P.hip[1], P.hip[2]], side, fwd);
      orient(m.coxa, P.hip, P.fem, Zup);
      place(m.femServo, P.fem, fwd, side.clone().negate());
      const off = side.clone().multiplyScalar(0.02), add = (q, o2) => [q[0] + o2.x, q[1] + o2.y, q[2] + o2.z];
      orient(m.femA, add(P.fem, off), add(P.knee, off), Zup); orient(m.femB, add(P.fem, off.clone().negate()), add(P.knee, off.clone().negate()), Zup);
      place(m.kneeServo, P.knee, fwd, side.clone().negate());
      orient(m.tibia, P.knee, [P.foot[0], P.foot[1], P.foot[2] + 0.008], side);
      m.foot.position.set(P.foot[0], P.foot[1], P.foot[2] + 0.008);
      // dấu chân khi vừa chạm đất
      if (o.f.stance && !S.wasStance[i] && disp.trails) { const w = toW(o.f.pos); prints.setMatrixAt(printI % 240, M4.makeTranslation(w[0], w[1], 0)); printI++; prints.count = Math.min(240, printI); prints.instanceMatrix.needsUpdate = true; }
      S.wasStance[i] = o.f.stance;
    });
    prints.visible = disp.trails;
    // đa giác chống đỡ
    const stance = out.filter((o) => o.f.stance).map((o) => toW(o.f.pos));
    const H = hull(stance.map((q) => [q[0], q[1]]));
    const ctr = [p.x, p.y];
    const M = margin(H, ctr);
    // biên theo chiều đi: cắt đa giác bằng đường thẳng qua trọng tâm theo hướng chuyển động
    const dir = [Math.cos(p.yaw + S.head), Math.sin(p.yaw + S.head)];
    let fwdD = Infinity, backD = Infinity;
    for (let k2 = 0; k2 < H.length; k2++) {
      const a = H[k2], b = H[(k2 + 1) % H.length], ex2 = b[0] - a[0], ey2 = b[1] - a[1], den = dir[0] * ey2 - dir[1] * ex2;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - ctr[0]) * ey2 - (a[1] - ctr[1]) * ex2) / den, u = ((a[0] - ctr[0]) * dir[1] - (a[1] - ctr[1]) * dir[0]) / den;
      if (u < -1e-9 || u > 1 + 1e-9) continue;
      if (t >= 0) fwdD = Math.min(fwdD, t); else backD = Math.min(backD, -t);
    }
    const lsm = H.length >= 3 ? Math.min(fwdD, backD) : -1;
    S.ssm = M.m; S.lsm = lsm; S.nStance = stance.length;
    if (H.length >= 3) {
      const sh = new THREE.Shape(H.map((q) => new THREE.Vector2(q[0], q[1]))); poly.geometry.dispose(); poly.geometry = new THREE.ShapeGeometry(sh);
      polyLine.geometry.dispose(); polyLine.geometry = new THREE.BufferGeometry().setFromPoints(H.map((q) => new THREE.Vector3(q[0], q[1], 0)));
      if (M.a) { const ex2 = M.b[0] - M.a[0], ey2 = M.b[1] - M.a[1], tt = Math.max(0, Math.min(1, ((ctr[0] - M.a[0]) * ex2 + (ctr[1] - M.a[1]) * ey2) / (ex2 * ex2 + ey2 * ey2))); mLine.geometry.setFromPoints([new THREE.Vector3(ctr[0], ctr[1], 0), new THREE.Vector3(M.a[0] + tt * ex2, M.a[1] + tt * ey2, 0)]); }
    }
    poly.visible = polyLine.visible = mLine.visible = disp.poly && H.length >= 3;
    com.position.x = p.x; com.position.y = p.y;
    xray(disp.xray ? 1 : 0);
    // bảng 01: biểu đồ dáng đi (đen = chống, trắng = bước), vạch dọc = pha hiện tại
    let svg = '';
    LEGS.forEach((L, i) => {
      const y = i * 17 + 2, o = g.off[L.name];
      svg += `<text x="0" y="${y + 10}" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${L.name}</text>`;
      svg += `<rect x="28" y="${y}" width="244" height="13" fill="${C.chart}" stroke="${C.line}"/>`;
      // pha chống: p ∈ [0, β) với p = phase + off
      const segs = []; const a0 = (1 - o) % 1, a1 = a0 + g.beta;
      segs.push([a0, Math.min(1, a1)]); if (a1 > 1) segs.push([0, a1 - 1]);
      for (const [u0, u1] of segs) svg += `<rect x="${28 + u0 * 244}" y="${y + 1}" width="${(u1 - u0) * 244}" height="11" fill="${out[i].f.stance ? C.ink : '#5b6472'}"/>`;
    });
    const ph = S.run ? S.phase : 0;
    svg += `<line x1="${28 + ph * 244}" x2="${28 + ph * 244}" y1="0" y2="104" stroke="${C.or}" stroke-width="2"/>`;
    gaitSvg.innerHTML = svg;
    const cmd = cmdOf();
    gaitTxt.innerHTML = `${g.vn}: β = ${g.beta === 0.5 ? '1/2' : g.beta < 0.7 ? '2/3' : '5/6'} · nhóm ${g.groups}. Tốc độ v = S/(β·T) = ${fx(S.stride * 100, 1)} cm / (${fx(g.beta, 2)} × ${fx(S.Tc, 2)} s) = <b>${fx(cmd.v * 100, 1)} cm/s</b>.`;
    sl.stride.set(S.stride / 0.08, `${fx(S.stride * 1000, 0)} mm`); sl.Tc.set((S.Tc - 0.6) / 1.4, `${fx(S.Tc, 2)} s`); sl.head.set((S.head + Math.PI) / (2 * Math.PI), `${fx(S.head * D, 0)}°`);
    sl.turn.set((S.turn + 0.5), `${fx(S.turn * D, 0)}°/s`); sl.h.set((S.h - 0.05) / 0.07, `${fx(S.h * 1000, 0)} mm`); sl.lift.set((S.lift - 0.015) / 0.045, `${fx(S.lift * 1000, 0)} mm`); sl.mass.set((S.mass - 1) / 2, `${fx(S.mass, 1)} kg`);
    out.forEach((o, i) => { legRows[i].innerHTML = `${o.L.name}&nbsp;&nbsp;&nbsp;&nbsp;${fx(o.a.gamma * D, 1).padStart(6, ' ')}&nbsp;&nbsp;${fx(o.a.alpha * D, 1).padStart(6, ' ')}&nbsp;&nbsp;${fx(o.a.beta * D, 1).padStart(6, ' ')}&nbsp;&nbsp;&nbsp;<span style="color:${o.f.stance ? C.ink : C.or}">${o.f.stance ? 'CHỐNG' : 'BƯỚC'}</span>`; });
    // bảng 04
    ssmTxt.textContent = fx(M.m * 1000, 1); lsmTxt.textContent = Number.isFinite(lsm) ? fx(lsm * 1000, 1) : '—';
    S.hist.push([M.m, Number.isFinite(lsm) ? lsm : 0]); if (S.hist.length > 360) S.hist.shift();
    ssmChart.set([S.hist.map((h) => h[0]), S.hist.map((h) => h[1])]);
    nTxt.innerHTML = `${stance.length} chân chống. Trọng tâm (vòng đen) trong đa giác cam: đứng vững tĩnh. Dáng sóng: S = (n/4)·β − 3/4.`;
    // bảng 05: mô men đùi
    const ns = Math.max(1, stance.length), Fz = (S.mass * G) / ns;
    out.forEach((o, i) => { const arm = o.f.stance ? Math.hypot(o.P.foot[0] - o.P.fem[0], o.P.foot[1] - o.P.fem[1]) : 0; const t = Fz * arm; (S.tq || (S.tq = []))[i] = t; tb[i].set(t / 2.0, `${fx(t, 2)} N·m`, t > SERVO.stall ? C.or : C.ink); });
    const maxT = Math.max(...out.map((o) => (o.f.stance ? Fz * Math.hypot(o.P.foot[0] - o.P.fem[0], o.P.foot[1] - o.P.fem[1]) : 0)));
    alert.set(!out.every((o) => o.a.ok) ? 'CHÂN KHÔNG VỚI TỚI · GIẢM SẢI HOẶC HẠ THÂN' : maxT > SERVO.stall ? 'SERVO ĐÙI VƯỢT 1,5 N·m' : M.m < 0.01 && stance.length ? 'TRỌNG TÂM SÁT MÉP ĐA GIÁC' : '');
    for (const k of Object.keys(GAITS)) ui.setOn(k, S.gait === k && S.run);
    ui.setOn('stop', !S.run);
    for (const k of Object.keys(disp)) ui.setOn(k, disp[k]);
    // nhãn trên chân phải trước
    const RF = out[0].P, W = (q) => { const w = toW(q); return st.project(w[0], w[2], -w[1]); };
    const kk = disp.labels ? 1 : 0;
    ui.drawCallouts([
      {key: 'coxa', p: W(RF.hip), dx: 70, dy: -70}, {key: 'femur', p: W(RF.fem), dx: 90, dy: -30}, {key: 'tibia', p: W(RF.knee), dx: 80, dy: -50},
      {key: 'foot', p: W(RF.foot), dx: 70, dy: 40}, {key: 'board', p: W([0, 0, S.h + 0.046]), dx: -90, dy: -70}, {key: 'servo', p: W(out[4].P.knee), dx: -100, dy: -40},
    ], kk);
  },
};
const xray = (() => { let cur = -1; return (k) => { if (Math.abs(k - cur) < 1e-3) return; cur = k; body.traverse((m) => { if (!m.isMesh) return; setOpacity(m.material, 1 - 0.7 * k, k < 0.5); }); }; })();

// ---------------- góc nhìn (bám theo thân)
const T = () => ({tx: S.pose.x, ty: S.h * 0.8, tz: -S.pose.y});
const views = {
  hero: (t) => ({...T(), az: 150 + S.pose.yaw * D + 8 * Math.sin(t * 0.12), el: 26, d: 2.1, sx: 0, sy: -40}),
  side: () => ({...T(), az: 90 + S.pose.yaw * D, el: 6, d: 1.9, sx: 0, sy: -40}),
  top: () => ({...T(), az: 90 + S.pose.yaw * D, el: 86, d: 2.1, sx: 0, sy: -30}),
  leg: () => { const o = S.out?.[0]?.P; const c = Math.cos(S.pose.yaw), s = Math.sin(S.pose.yaw); const q = o ? o.knee : [0.15, -0.15, 0.1]; return {tx: S.pose.x + q[0] * c - q[1] * s, ty: 0.07, tz: -(S.pose.y + q[0] * s + q[1] * c), az: 150 + S.pose.yaw * D, el: 12, d: 0.95, sx: 0, sy: -40}; },
};

// ---------------- bài giảng
const CAP = [
  {k: '18 SERVO · 3 KHỚP MỖI CHÂN', t: 'Sáu chân, mười tám bậc tự do', b: 'Mỗi chân có ba khớp quay: háng (coxa) xoay ngang, đùi (femur) và gối (tibia) nâng hạ. 18 servo Dynamixel AX-12A, mô men giữ tối đa 1,5 N·m ở 12 V. Chiều dài khâu lấy theo cấu hình mã nguồn Phoenix cho PhantomX: 52, 66, 133 mm; tác giả ghi hai số sau là ước đoán.', e: 'n = 6 chân × 3 khớp = 18 bậc tự do'},
  {k: 'ĐỘNG HỌC NGHỊCH MỘT CHÂN', t: 'Biết bàn chân, tìm ba góc', b: 'Góc háng γ ra thẳng từ atan2 trên mặt phẳng ngang. Phần còn lại là bài toán tay máy hai khâu trong mặt phẳng đứng: định lý cos cho góc gối, rồi góc đùi. Hạ thân xuống mà bàn chân đứng yên: cả ba góc đổi theo.', e: 'β = acos((F² + T² − D²) / 2FT) · α = acos((F² + D² − T²) / 2FD) − atan2(z, r)'},
  {k: 'DÁNG TRIPOD · β = 1/2', t: 'Hai tam giác thay phiên', b: 'Ba chân (phải trước, trái giữa, phải sau) chống trong khi ba chân kia bước, rồi đổi vai. Mỗi chân chống đúng nửa chu kỳ. Đây là dáng nhanh nhất có thể đứng vững tĩnh: β ≥ 3/n với n = 6.', e: 'v = S / (β·T) · β = thời gian chống / chu kỳ'},
  {k: 'ĐA GIÁC CHỐNG ĐỠ', t: 'Trọng tâm phải nằm trong', b: 'Nối các bàn chân đang chống được đa giác cam. Robot đứng vững tĩnh khi hình chiếu trọng tâm nằm trong đa giác. Khoảng cách tới cạnh gần nhất là biên ổn định tĩnh; theo chiều đi là biên dọc (McGhee và Frank 1968).', e: 'SSM = min khoảng cách (trọng tâm → cạnh đa giác)'},
  {k: 'DÁNG TETRAPOD · β = 2/3', t: 'Bốn chân luôn chạm đất', b: 'Ba cặp chân lần lượt bước, mỗi lúc bốn chân chống. Đa giác rộng hơn, biên dọc lớn hơn; đổi lại, cùng sải và chu kỳ thì chậm hơn tripod.', e: 'v = S / (⅔·T)'},
  {k: 'DÁNG WAVE · β = 5/6', t: 'Mỗi lần nhấc một chân', b: 'Sóng bước chạy từ sau ra trước, phía phải rồi phía trái. Năm chân luôn chống: chắc nhất, chậm nhất, hợp với địa hình xấu hoặc khi mang tải. Biên chuẩn hoá S = (6/4)·(5/6) − 3/4 = 0,5.', e: 'S = (n/4)·β − 3/4'},
  {k: 'ĐI MỌI HƯỚNG', t: 'Đi ngang và xoay tại chỗ', b: 'Cùng một bộ sinh dáng đi, chỉ đổi véc tơ vận tốc thân: robot sáu chân đi ngang, đi chéo, xoay quanh trọng tâm mà không cần quay thân trước. Mỗi bàn chân vẽ một cung quanh tâm xoay.', e: 'pᵢ(s) = R(s·ω·βT/2)·pᵢ⁰ + s·v·βT/2'},
  {k: 'MÔ MEN SERVO', t: 'Hạ thân và tăng tải', b: 'Mô men giữ ở servo đùi xấp xỉ phần trọng lượng chân đó gánh nhân với tay đòn ngang tới bàn chân. Tripod chỉ có ba chân chia tải nên mỗi servo gánh nặng hơn. Tăng khối lượng giả định lên 3 kg, servo tiến sát 1,5 N·m.', e: 'τ ≈ (m·g / n_chống) · r'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(3, {click: 'labels'}); at(4.4, {click: 'labels'});
at(7, {cap: 1}); at(7.3, {click: 'stop'}); at(8, {click: 'v_leg'}); at(9.5, {slide: 'h', to: 0.1, dur: 2}); at(12, {slide: 'h', to: 0.86, dur: 2.2}); at(14.6, {slide: 'h', to: 4 / 7, dur: 1}); at(16, {click: 'v_hero'});
at(17, {cap: 2}); at(17.5, {click: 'tripod'}); at(22, {click: 'v_side'}); at(27, {click: 'v_hero'});
at(28, {cap: 3}); at(28.5, {click: 'v_top'}); at(36, {click: 'v_hero'});
at(37, {cap: 4}); at(37.5, {click: 'tetrapod'}); at(39, {click: 'v_top'}); at(46, {click: 'v_hero'});
at(47, {cap: 5}); at(47.5, {click: 'wave'}); at(49, {click: 'v_side'}); at(57, {click: 'v_hero'});
at(58, {cap: 6}); at(58.5, {click: 'tripod'}); at(59.5, {slide: 'head', to: 0.75, dur: 1.4}); at(64, {slide: 'head', to: 0.5, dur: 1}); at(65.5, {slide: 'turn', to: 0.85, dur: 1}); at(70, {slide: 'turn', to: 0.5, dur: 0.8});
at(72, {cap: 7}); at(72.5, {click: 'v_side'}); at(73.5, {slide: 'mass', to: 1, dur: 2.2}); at(77, {slide: 'h', to: 0.15, dur: 1.6}); at(81, {slide: 'h', to: 4 / 7, dur: 1}); at(82, {slide: 'mass', to: 0.5, dur: 1}); at(83.5, {click: 'v_hero'});
ev.sort((a, b) => a.at - b.at);

runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 88}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_leg', t: 'tripod', r: 'tetrapod', v: 'wave', ' ': 'stop', p: 'poly', n: 'labels', x: 'xray', f: 'trails'}});
