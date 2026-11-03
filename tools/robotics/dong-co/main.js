// Động cơ xăng 4 kì (Công nghệ 11, cơ khí động lực): trang chạy trực tiếp. Mọi chi tiết, bảng số, biểu đồ đọc từ một mô hình
// (kin.js) với một đầu vào là góc trục khuỷu. Quy trình 9 bước của teardown (Elvar, MIT): tham chiếu thật (thông số Honda Wave
// Alpha 110), mô hình trước, bảng số chạy theo máy, một nút cho mỗi hệ thống, tự chạy có con trỏ, thử phá.
import * as THREE from 'three';
import {createStage, PAL_HOUSE} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {E, VCT, cm3, vbc, vol, fromTDC, pressure, liftIn, liftEx, strokeIdx, STROKES, cycleWork, otto, pistonSpeed} from './kin.js';
import {buildEngine, YC, DECK, CROWN_TDC, CROWN_BDC, CAMY, VX} from './engine.js';

const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.32, grid: 0.01, fade: 1.6, fov: 26, pal: PAL_HOUSE});
const ui = createUI(app, {theme: 'house'});
const eng = buildEngine(); st.scene.add(eng.root);
const vn = (v, n = 1) => fx(v, n).replace('.', ',');
const vnInt = (v) => Math.round(v).toLocaleString('vi-VN');

// ---------------- trạng thái: một đầu vào ψ, cộng các nút người xem chỉnh
const S = {hold: null, psi: 0, rpm: 1500, rpmT: 1500, slow: 1 / 100, eps: E.eps, spark: true, real: false, mode: 'cut', sys: null, labels: true, knock: false, stalled: false, gasK: 1, pvPath: '', W: 0, imep: 0};
const recompute = () => { const c = cycleWork({eps: S.eps, spark: S.spark}); S.W = c.W; S.imep = c.imep; S.knock = S.eps > 11.5 && S.spark; buildPV(); };

// ---------------- bảng điều khiển 1600 × 900
ui.header({code: '4 kì', kicker: 'CÔNG NGHỆ 11 · CƠ KHÍ ĐỘNG LỰC · ĐỘNG CƠ ĐỐT TRONG', title: 'Động cơ xăng 4 kì', sub: 'Một xi lanh · làm mát bằng không khí · thông số Honda Wave Alpha 110', hub: HUB_URL, hubLabel: '← SÁNG ĂN KHOAI',
  right: [['109,2 cm³', 'DUNG TÍCH'], ['9,0 : 1', 'TỈ SỐ NÉN'], ['6,12 kW', 'CÔNG SUẤT']]});
// 01 chu trình 720°
ui.panel(28, 112, 300, 292, 'CHU TRÌNH 4 KÌ · 720° TRỤC KHUỶU', '01');
const wheel = ui.svg(42, 146, 130, 130);
const kName = ui.text(184, 150, '', 'v', 'font-size:15px;font-weight:700;white-space:normal;width:132px;line-height:1.25;font-family:Inter,system-ui,sans-serif');
const bigAng = ui.text(184, 200, '', 'mo', 'position:absolute;font-size:30px;font-weight:700;letter-spacing:-1px');
ui.text(184, 240, 'Góc trục khuỷu trong chu trình', 'sm', 'font-size:9.5px;white-space:normal;width:130px');
const kRows = [['Góc trục cam', 'cam'], ['Vòng quay thứ', 'rev'], ['Pít-tông cách ĐCT', 'pos'], ['Xupap nạp', 'in'], ['Xupap thải', 'ex'], ['Bugi', 'sp']].map(([t], i) => { ui.text(42, 290 + i * 18, t, 'sm', 'font-size:10.5px'); return ui.text(150, 290 + i * 18, '', 'v', 'width:164px;text-align:right'); });
const xRows = kRows.slice(3);
// 02 xupap
ui.panel(28, 416, 300, 122, 'ĐỘ NÂNG XUPAP THEO GÓC (mm)', '02');
const valveChart = ui.chart(42, 448, 272, 58, {min: 0, max: E.lift * 1000 * 1.1, colors: ['#3c79a8', '#8b8278'], zero: false});
ui.text(42, 514, 'Nạp (xanh) · thải (xám) · độ nâng 5,5 mm là giá trị minh hoạ', 'sm', 'font-size:8.5px');
// 03 thông số
ui.panel(28, 550, 300, 216, 'THÔNG SỐ KĨ THUẬT', '03');
const spec = [];
for (let i = 0; i < 9; i++) { spec.push([ui.text(42, 582 + i * 19, '', 'sm', 'font-size:10.5px'), ui.text(170, 582 + i * 19, '', 'v', 'width:144px;text-align:right;font-size:11.5px')]); }
// 04 áp suất theo góc
ui.panel(1272, 112, 300, 160, 'ÁP SUẤT TRONG XI LANH (bar)', '04');
const pChart = ui.chart(1286, 146, 272, 84, {min: 0, max: 80, colors: [C.or], zero: false});
const pNow = ui.text(1286, 238, '', 'v', 'width:272px;text-align:right');
ui.text(1286, 238, '0 → 720° · MÔ HÌNH GẦN ĐÚNG', 'sm', 'font-size:8.5px');
// 05 p–V
ui.panel(1272, 284, 300, 238, 'ĐỒ THỊ p–V · CÔNG CHỈ THỊ', '05');
const pv = ui.svg(1286, 318, 272, 124);
const pvRows = [0, 1, 2, 3].map((i) => [ui.text(1286, 452 + i * 17, '', 'sm', 'font-size:10px'), ui.text(1420, 452 + i * 17, '', 'v', 'width:138px;text-align:right;font-size:11px')]);
// 06 cơ cấu và hệ thống
ui.panel(1272, 534, 300, 136, 'CƠ CẤU VÀ HỆ THỐNG', '06');
ui.buttons([['sys_crank', 'TRỤC KHUỶU – THANH TRUYỀN'], ['sys_valve', 'PHÂN PHỐI KHÍ'], ['sys_fuel', 'NHIÊN LIỆU, KHÔNG KHÍ'], ['sys_ign', 'ĐÁNH LỬA'], ['sys_cool', 'LÀM MÁT'], ['sys_lube', 'BÔI TRƠN'], ['sys_start', 'KHỞI ĐỘNG']], 1286, 568, 272);
// 07 điều khiển, thử phá
ui.panel(1272, 682, 300, 84, 'ĐIỀU KHIỂN · THỬ PHÁ', '07');
const sRpm = ui.slider('rpm', 1286, 712, 272, 'TAY GA', {lw: 74, vw: 92});
const sEps = ui.slider('eps', 1286, 734, 272, 'TỈ SỐ NÉN', {lw: 74, vw: 92});
const sSlow = ui.slider('slow', 1286, 756, 272, 'TUA CHẬM', {lw: 74, vw: 92});
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_front', 'CHÍNH DIỆN'], ['v_head', 'NẮP MÁY'], ['v_crank', 'TRỤC KHUỶU'], ['v_inside', 'TRONG XI LANH']], 360, 120, 600);
ui.buttons([['cut', 'CẮT DỌC'], ['glass', 'NHÌN XUYÊN'], ['solid', 'NGUYÊN KHỐI'], ['spark', 'BUGI'], ['real', 'PHA THỰC TẾ'], ['labels', 'NHÃN']], 360, 744, 900);
ui.cap = ui.caption(348, 772, 904, 126);
const alert = ui.alert(400, 712);
ui.callouts([
  {key: 'pis', title: 'PÍT-TÔNG', sub: 'Ø 50,0 mm'}, {key: 'rod', title: 'THANH TRUYỀN', sub: 'l = 100 mm (GIẢ ĐỊNH)'}, {key: 'crk', title: 'TRỤC KHUỶU', sub: 'BÁN KÍNH r = 27,8 mm'},
  {key: 'fw', title: 'MÁ KHUỶU, ĐỐI TRỌNG', sub: 'CÂN BẰNG LỰC QUÁN TÍNH'}, {key: 'vin', title: 'XUPAP NẠP', sub: ''}, {key: 'vex', title: 'XUPAP THẢI', sub: ''},
  {key: 'plug', title: 'BUGI', sub: 'TIA LỬA CUỐI KÌ NÉN'}, {key: 'cam', title: 'TRỤC CAM', sub: 'QUAY ½ TRỤC KHUỶU'}, {key: 'fin', title: 'CÁNH TẢN NHIỆT', sub: 'LÀM MÁT BẰNG KHÔNG KHÍ'},
  {key: 'tdc', title: 'ĐCT', sub: 'ĐIỂM CHẾT TRÊN'}, {key: 'bdc', title: 'ĐCD', sub: 'ĐIỂM CHẾT DƯỚI · S = 55,6 mm'}, {key: 'gas', title: '', sub: ''},
]);
// vạch ĐCT, ĐCD bên cạnh xi lanh
const mk = (y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0008, 0.0008), new THREE.MeshBasicMaterial({color: C.or})); m.position.set(-0.052, y, 0.012); eng.root.add(m); return m; };
mk(CROWN_TDC); mk(CROWN_BDC);
const dim = new THREE.Mesh(new THREE.BoxGeometry(0.0008, CROWN_TDC - CROWN_BDC, 0.0008), new THREE.MeshBasicMaterial({color: C.ink})); dim.position.set(-0.06, (CROWN_TDC + CROWN_BDC) / 2, 0.012); eng.root.add(dim);

// ---------------- đồ thị
const PV = {w: 272, h: 124};
function buildPV() {
  const Vmax = S.eps, pts = [];
  for (let a = 0; a <= 720; a += 2) pts.push([vol(a, S.eps) / Vmax, pressure(a, {eps: S.eps, spark: S.spark})]);
  S.pvPts = pts;
  S.pvPath = pts.map(([v, p], i) => `${i ? 'L' : 'M'}${(8 + v * (PV.w - 16)).toFixed(1)} ${(PV.h - 6 - (Math.min(p, 80) / 80) * (PV.h - 12)).toFixed(1)}`).join('');
}
const drawWheel = (ps) => {
  const c = 65, r = 56, rr = 40;
  let g = '';
  STROKES.forEach((k, i) => {
    const a0 = (i * 90 - 90) * Math.PI / 180, a1 = ((i + 1) * 90 - 90) * Math.PI / 180;
    const on = i === strokeIdx(ps);
    const p = (a, R0) => `${(c + R0 * Math.cos(a)).toFixed(1)} ${(c + R0 * Math.sin(a)).toFixed(1)}`;
    g += `<path d="M${p(a0, rr)} L${p(a0, r)} A${r} ${r} 0 0 1 ${p(a1, r)} L${p(a1, rr)} A${rr} ${rr} 0 0 0 ${p(a0, rr)}Z" fill="${k.c}" opacity="${on ? 0.95 : 0.22}" stroke="#fff" stroke-width="2"/>`;
    const am = (a0 + a1) / 2;
    g += `<text x="${(c + 48 * Math.cos(am)).toFixed(1)}" y="${(c + 48 * Math.sin(am) + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${on ? '#fff' : C.ink}" font-family="Inter,sans-serif">${i + 1}</text>`;
  });
  const a = (ps / 720) * 2 * Math.PI - Math.PI / 2;
  g += `<line x1="${c}" y1="${c}" x2="${(c + 60 * Math.cos(a)).toFixed(1)}" y2="${(c + 60 * Math.sin(a)).toFixed(1)}" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="4" fill="${C.ink}"/>`;
  g += `<text x="${c}" y="${c + 20}" text-anchor="middle" font-size="9.5" fill="#6e6257" font-family="JetBrains Mono,monospace">${Math.round(ps)}°</text>`;
  wheel.innerHTML = g;
};

// ---------------- tương tác
const SYSMAP = {sys_crank: 'crank', sys_valve: 'valve', sys_fuel: 'fuel', sys_ign: 'ign', sys_cool: 'cool', sys_lube: 'lube', sys_start: 'start'};
const sim = {
  reset() {
    Object.assign(S, {hold: null, psi: 0, rpm: 1500, rpmT: 1500, slow: 1 / 100, eps: E.eps, spark: true, real: false, mode: 'cut', sys: null, labels: true, stalled: false});
    eng.look('cut', null); recompute();
  },
  act(k) {
    if (k !== 'labels') S.hold = null;
    if (SYSMAP[k]) { S.sys = S.sys === SYSMAP[k] ? null : SYSMAP[k]; eng.look(S.mode, S.sys); return; }
    if (k === 'cut' || k === 'glass' || k === 'solid') { S.mode = k; eng.look(S.mode, S.sys); return; }
    if (k === 'spark') { S.spark = !S.spark; if (S.spark && S.stalled) { S.stalled = false; S.rpm = 900; } recompute(); return; }
    if (k === 'real') { S.real = !S.real; return; }
    if (k === 'labels') S.labels = !S.labels;
  },
  slide(k, t) {
    if (k !== 'slow') S.hold = null;
    if (k === 'rpm') { S.rpmT = 1500 + t * 7500; if (S.stalled && S.spark) { S.stalled = false; S.rpm = 900; } }
    if (k === 'eps') { S.eps = 6 + t * 8; recompute(); }
    if (k === 'slow') S.slow = Math.exp(Math.log(1 / 400) + t * (Math.log(1 / 20) - Math.log(1 / 400)));
  },
  step(dt) {
    if (S.film) return; // quay phim: ψ đặt từ ngoài theo từng khung
    if (S.spark && !S.stalled) S.rpm += (S.rpmT - S.rpm) * Math.min(1, dt * 1.6);
    else { S.rpm *= Math.exp(-dt / 1.4); if (S.rpm < 320) { S.rpm = 0; S.stalled = true; } }
    S.psi = (S.psi + 6 * S.rpm * dt * S.slow) % 720;
    // bước giảng một kì: máy chạy lặp trong đúng kì đó để giáo viên giảng chậm
    if (S.hold) { const [a, b] = S.hold; if (S.psi < a || S.psi >= b) S.psi = a + ((((S.psi - a) % (b - a)) + (b - a)) % (b - a)); }
  },
  shadowAt() { return new THREE.Vector3(0, 0.15, 0); },
  draw() {
    const ps = S.psi, k = strokeIdx(ps);
    eng.update(S);
    // 01
    drawWheel(ps);
    kName.innerHTML = ((a, b) => `<span style="display:block;font-size:12px;font-weight:600;color:${C.mute || '#626773'}">${a}</span><span style="display:block;white-space:nowrap;color:${STROKES[k].c}">${b || ''}</span>`)(...STROKES[k].t.split(' · '));
    bigAng.innerHTML = `${vnInt(ps)}°<span style="font-size:14px;color:#9b8f80;letter-spacing:0"> / 720°</span>`;
    kRows[0].textContent = `${vnInt(ps / 2)}° / 360°`; kRows[1].textContent = ps < 360 ? '1 / 2' : '2 / 2';
    kRows[2].textContent = `${vn(fromTDC(ps) * 1000, 1)} mm`;
    const li = liftIn(ps, S.real), le = liftEx(ps, S.real), sparkOn = S.spark && ps % 720 >= 350 && ps % 720 < 364;
    xRows[0].textContent = li > 0.01 ? `MỞ · ${vn(li * E.lift * 1000, 1)} mm` : 'ĐÓNG'; xRows[0].style.color = li > 0.01 ? '#3c79a8' : C.ink;
    xRows[1].textContent = le > 0.01 ? `MỞ · ${vn(le * E.lift * 1000, 1)} mm` : 'ĐÓNG'; xRows[1].style.color = le > 0.01 ? '#8b8278' : C.ink;
    xRows[2].textContent = !S.spark ? 'ĐÃ TẮT' : sparkOn ? 'BẬT TIA LỬA' : 'CHỜ'; xRows[2].style.color = sparkOn ? C.or : C.ink;
    // 02
    const A = [], B = []; for (let a = 0; a <= 720; a += 6) { A.push(liftIn(a, S.real) * E.lift * 1000); B.push(liftEx(a, S.real) * E.lift * 1000); }
    valveChart.set([A, B], {cursor: ps / 720});
    // 03
    const Vbc = cm3(vbc(S.eps)), Vct = cm3(VCT);
    const rows = [['D × S (Honda)', '50,0 × 55,6 mm'], ['Vct = π·D²·S / 4', `${vn(Vct, 1)} cm³`], ['Vbc = Vct / (ε − 1)', `${vn(Vbc, 1)} cm³`], ['Vtp = Vct + Vbc', `${vn(Vct + Vbc, 1)} cm³`],
      ['ε = Vtp / Vbc', `${vn(S.eps, 1)} : 1`], ['n (tay ga)', S.stalled ? 'MÁY ĐÃ DỪNG' : `${vnInt(S.rpm)} vòng/phút`], ['Tốc độ TB pít-tông', `${vn(pistonSpeed(S.rpm), 1)} m/s`],
      ['Honda công bố', '6,12 kW · 7.500 v/ph'], ['', '8,44 N·m · 5.500 v/ph']];
    rows.forEach(([a, b], i) => { spec[i][0].textContent = a; spec[i][1].textContent = b; });
    spec[4][1].style.color = S.eps !== E.eps ? C.or : C.ink;
    // 04
    const P = []; for (let a = 0; a <= 720; a += 4) P.push(pressure(a, {eps: S.eps, spark: S.spark}));
    pChart.set([P], {cursor: ps / 720});
    pNow.textContent = `${vn(pressure(ps, {eps: S.eps, spark: S.spark}), 1)} bar`;
    // 05
    const v = vol(ps, S.eps) / S.eps, p = pressure(ps, {eps: S.eps, spark: S.spark});
    const cx = 8 + v * (PV.w - 16), cy = PV.h - 6 - (Math.min(p, 80) / 80) * (PV.h - 12);
    pv.innerHTML = `<rect x="0" y="0" width="${PV.w}" height="${PV.h}" fill="#fbf6ee" stroke="${C.line}"/><path d="${S.pvPath}Z" fill="${C.or}" fill-opacity=".1" stroke="${C.or}" stroke-width="1.5"/>`
      + `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${STROKES[k].c}" stroke="#fff" stroke-width="1.5"/>`
      + `<text x="${PV.w - 6}" y="${PV.h - 9}" text-anchor="end" font-size="9" fill="#6e6257" font-family="Inter,sans-serif">V → Vtp</text><text x="${PV.w - 6}" y="13" text-anchor="end" font-size="9" fill="#6e6257" font-family="Inter,sans-serif">p (bar) · cao nhất ${vn(Math.max(...S.pvPts.map((q) => q[1])), 0)} bar</text>`;
    const rowsPV = [['W = ∮ p·dV (một chu trình)', `${vn(S.W, 0)} J`], ['p TB chỉ thị = W / Vct', `${vn(S.imep, 1)} bar`], ['Công suất chỉ thị W·n / 120', S.stalled ? '0 kW' : `${vn((S.W * S.rpm) / 120 / 1000, 2)} kW`], ['Hiệu suất lí thuyết (Otto)', `${vn(otto(S.eps) * 100, 1)} %`]];
    rowsPV.forEach(([a, b], i) => { pvRows[i][0].textContent = a; pvRows[i][1].textContent = b; });
    // nút
    for (const [b, sys] of Object.entries(SYSMAP)) ui.setOn(b, S.sys === sys);
    for (const m of ['cut', 'glass', 'solid']) ui.setOn(m, S.mode === m);
    ui.setOn('spark', S.spark); ui.setOn('real', S.real); ui.setOn('labels', S.labels);
    sRpm.set((S.rpmT - 1500) / 7500, `${vnInt(S.rpmT)} v/ph`);
    sEps.set((S.eps - 6) / 8, `ε = ${vn(S.eps, 1)}`);
    sSlow.set((Math.log(S.slow) - Math.log(1 / 400)) / (Math.log(1 / 20) - Math.log(1 / 400)), `chậm ${vnInt(1 / S.slow)} lần`);
    alert.set(S.stalled ? 'KHÔNG CÓ TIA LỬA · KHÔNG CÓ KÌ SINH CÔNG · MÁY DỪNG' : S.knock ? `ε = ${vn(S.eps, 1)} · NGUY CƠ KÍCH NỔ: HOÀ KHÍ TỰ BỐC CHÁY` : !S.spark ? 'BUGI TẮT · MÁY CHẠY THEO ĐÀ, CHẬM DẦN' : '');
    // nhãn có đường dẫn
    const pr = (x, y, z) => st.project(x, y, z);
    const th = (ps % 360) * Math.PI / 180, pinY = fromTDC(ps);
    void pinY;
    const crownY = CROWN_TDC - fromTDC(ps);
    ui.drawCallouts([
      {key: 'pis', p: pr(-0.02, crownY - 0.01, 0.012), dx: -150, dy: 26},
      {key: 'rod', p: pr(0.004 * Math.sin(th), (crownY - E.ch + YC + 0.0278 * Math.cos(th)) / 2, 0.006), dx: 120, dy: -10},
      {key: 'crk', p: pr(0.03, YC - 0.03, 0.02), dx: 120, dy: 40},
      {key: 'fw', p: pr(-0.025, YC - 0.02, 0.023), dx: -150, dy: 40},
      {key: 'vin', p: pr(-VX, DECK + 0.03, 0), dx: -150, dy: -45}, {key: 'vex', p: pr(VX, DECK + 0.03, 0), dx: 120, dy: -50},
      {key: 'plug', p: pr(0, DECK + 0.03, -0.03), dx: -200, dy: -100}, {key: 'cam', p: pr(0.01, CAMY, 0.005), dx: 110, dy: -40},
      {key: 'fin', p: pr(0.045, DECK - 0.05, 0.0), dx: 120, dy: 0},
      {key: 'tdc', p: pr(-0.067, CROWN_TDC, 0.012), dx: -90, dy: -30}, {key: 'bdc', p: pr(-0.067, CROWN_BDC, 0.012), dx: -60, dy: 14},
    ], S.labels ? 1 : 0);
  },
};
recompute();
window.ENGINE = S; // để kiểm, quay video: đặt ψ, tay ga, tỉ số nén từ ngoài
window.ENGINE_CAP = (i) => ui.cap.set(CAP[i], i, CAP.length);

// ---------------- góc nhìn (độ)
const views = {
  hero: (t) => ({tx: 0, ty: 0.19, tz: 0, az: 26 + 5 * Math.sin(t * 0.12), el: 12, d: 1.05, sx: 0, sy: -40}),
  front: () => ({tx: 0, ty: 0.2, tz: 0, az: 0, el: 4, d: 1.0, sx: 0, sy: -40}),
  head: () => ({tx: 0, ty: DECK + 0.03, tz: 0, az: 14, el: 10, d: 0.46, sx: 0, sy: -30}),
  crank: () => ({tx: 0, ty: YC + 0.02, tz: 0, az: 32, el: 6, d: 0.55, sx: 0, sy: -30}),
  inside: () => ({tx: 0, ty: DECK - 0.025, tz: 0, az: 4, el: 2, d: 0.3, sx: 0, sy: -30}),
};

// ---------------- bài giảng: mỗi lời giảng là một bước khi lên lớp
const CAP = [
  {k: 'ĐỘNG CƠ ĐỐT TRONG', t: 'Nhiên liệu cháy ngay bên trong xi lanh', b: 'Động cơ đốt trong đốt nhiên liệu ngay trong xi lanh và biến nhiệt năng thành cơ năng làm quay trục khuỷu. Phân loại theo nhiên liệu (xăng, diesel), theo số kì của một chu trình (2 kì, 4 kì), theo số xi lanh, theo cách làm mát. Động cơ xe Wave Alpha 110: xăng, 4 kì, 1 xi lanh, làm mát bằng không khí (thông số của Honda Việt Nam).', e: 'Nhiệt năng của nhiên liệu → cơ năng trên trục khuỷu',
    ask: {q: 'Động cơ xe Wave Alpha 110 thuộc loại nào?', o: ['Diesel, 2 kì, làm mát bằng nước', 'Xăng, 4 kì, 1 xi lanh, làm mát bằng không khí', 'Xăng, 2 kì, 2 xi lanh'], a: 1, e: 'Honda công bố: động cơ 4 kì, 1 xi lanh, làm mát bằng không khí, dùng xăng.'}},
  {k: 'CẤU TẠO', t: 'Hai cơ cấu và các hệ thống', b: 'Động cơ xăng gồm cơ cấu trục khuỷu – thanh truyền, cơ cấu phân phối khí, và các hệ thống: cung cấp nhiên liệu và không khí, đánh lửa, làm mát, bôi trơn, khởi động. Bấm từng nút ở bảng 06: hệ thống đó hiện rõ, phần còn lại mờ đi.', e: 'Thân máy, nắp máy · 2 cơ cấu · 5 hệ thống'},
  {k: 'ĐIỂM CHẾT VÀ HÀNH TRÌNH', t: 'Pít-tông đổi chiều ở hai điểm chết', b: 'Pít-tông chạy lên xuống giữa điểm chết trên (ĐCT) và điểm chết dưới (ĐCD). Quãng giữa hai điểm chết là hành trình S, bằng hai lần bán kính quay của trục khuỷu. Mỗi hành trình, trục khuỷu quay nửa vòng (180°).', e: 'S = 2r = 2 × 27,8 = 55,6 mm',
    ask: {q: 'Pít-tông đi một hành trình từ ĐCT xuống ĐCD thì trục khuỷu quay bao nhiêu?', o: ['Một vòng (360°)', 'Nửa vòng (180°)', 'Một phần tư vòng (90°)'], a: 1, e: 'Mỗi hành trình ứng với nửa vòng quay trục khuỷu, S = 2r.'}},
  {k: 'KÌ 1 · NẠP', t: 'Hoà khí được hút vào xi lanh', b: 'Pít-tông đi từ ĐCT xuống ĐCD. Xupap nạp mở, xupap thải đóng. Thể tích xi lanh tăng, áp suất giảm, hoà khí (xăng trộn không khí) được hút vào. Hạt xanh là dòng hoà khí qua đường nạp.', e: 'ĐCT → ĐCD · nạp mở, thải đóng · 0° → 180°'},
  {k: 'KÌ 2 · NÉN', t: 'Hai xupap đóng, hoà khí bị nén', b: 'Pít-tông đi từ ĐCD lên ĐCT, cả hai xupap đóng. Hoà khí bị nén lại, áp suất và nhiệt độ tăng (bảng 04). Cuối kì nén, bugi bật tia lửa điện.', e: 'ĐCD → ĐCT · hai xupap đóng · 180° → 360°',
    ask: {q: 'Trong kì nén, hai xupap ở trạng thái nào?', o: ['Nạp mở, thải đóng', 'Cả hai đóng', 'Cả hai mở'], a: 1, e: 'Kì nén cần buồng kín nên cả hai xupap đều đóng.'}},
  {k: 'KÌ 3 · CHÁY – DÃN NỞ', t: 'Kì duy nhất sinh công', b: 'Hoà khí cháy, áp suất tăng vọt lên hàng chục bar, đẩy pít-tông từ ĐCT xuống ĐCD. Qua thanh truyền, lực này làm trục khuỷu quay. Đây là kì sinh công; ba kì còn lại trục khuỷu quay nhờ đà của bánh đà.', e: 'ĐCT → ĐCD · hai xupap đóng · 360° → 540°',
    ask: {q: 'Trong bốn kì, kì nào sinh công?', o: ['Kì nạp', 'Kì nén', 'Kì cháy – dãn nở', 'Kì thải'], a: 2, e: 'Chỉ kì cháy – dãn nở có áp suất khí đẩy pít-tông; ba kì kia tiêu tốn công lấy từ đà bánh đà.'}},
  {k: 'KÌ 4 · THẢI', t: 'Khí cháy bị đẩy ra ngoài', b: 'Pít-tông đi từ ĐCD lên ĐCT. Xupap thải mở, khí đã cháy bị pít-tông đẩy ra đường thải (hạt xám). Hết kì thải, chu trình mới bắt đầu bằng kì nạp.', e: 'ĐCD → ĐCT · thải mở, nạp đóng · 540° → 720°'},
  {k: 'MỘT CHU TRÌNH = 720°', t: 'Hai vòng trục khuỷu, một vòng trục cam', b: 'Một chu trình 4 kì ứng với hai vòng quay trục khuỷu (720°). Mỗi xupap chỉ mở một lần trong chu trình, nên trục cam quay bằng nửa trục khuỷu: đĩa xích ở trục cam to gấp đôi đĩa ở trục khuỷu. Bật “Pha thực tế”: xupap mở sớm, đóng muộn để nạp đầy và thải sạch hơn.', e: 'n trục cam = n trục khuỷu / 2',
    ask: {q: 'Một chu trình của động cơ 4 kì, trục khuỷu quay mấy vòng?', o: ['1 vòng', '2 vòng', '4 vòng'], a: 1, e: 'Bốn kì, mỗi kì nửa vòng: tổng cộng 2 vòng (720°).'}},
  {k: 'THÔNG SỐ KĨ THUẬT', t: 'Dung tích xi lanh và tỉ số nén', b: 'Thể tích công tác Vct là thể tích pít-tông quét được giữa hai điểm chết. Thể tích buồng cháy Vbc là phần còn lại khi pít-tông ở ĐCT. Tỉ số nén ε là thể tích toàn phần chia thể tích buồng cháy. Với Wave Alpha 110: Vct = 109,2 cm³, ε = 9,0.', e: 'Vct = π·D²·S / 4 = 109,2 cm³ · ε = Vtp / Vbc',
    ask: {q: 'Biết D = 50 mm, S = 55,6 mm. Thể tích công tác gần bằng bao nhiêu?', o: ['55,6 cm³', '109,2 cm³', '218,3 cm³'], a: 1, e: 'Vct = π × (5,0 cm)² × 5,56 cm / 4 ≈ 109,2 cm³, khớp số Honda công bố.'}},
  {k: 'ĐỒ THỊ p–V', t: 'Công của khí bằng diện tích vòng', b: 'Bảng 05 vẽ áp suất theo thể tích trong cả chu trình. Diện tích vòng kín là công khí sinh ra trong một chu trình. Nhân với số chu trình mỗi giây ra công suất chỉ thị; trừ ma sát mới còn công suất có ích Honda công bố.', e: 'W = ∮ p·dV · P = W·n / 120 (động cơ 4 kì)'},
  {k: 'THỬ PHÁ', t: 'Tăng tỉ số nén, tắt bugi', b: 'Kéo tỉ số nén lên: hiệu suất lí thuyết tăng, nhưng quá cao thì hoà khí tự bốc cháy trước tia lửa (kích nổ), động cơ xăng thường để ε khoảng 8 đến 12. Tắt bugi: không còn kì sinh công, máy chạy theo đà rồi dừng.', e: 'η = 1 − 1/ε^0,4 (chu trình Otto lí tưởng)',
    ask: {q: 'Tắt bugi khi máy đang chạy thì điều gì xảy ra?', o: ['Máy chạy nhanh hơn', 'Không còn kì sinh công, máy chậm dần rồi dừng', 'Không có gì thay đổi'], a: 1, e: 'Không có tia lửa thì hoà khí không cháy, mất kì sinh công; bánh đà chỉ giữ đà một lúc.'}},
];
const ev = [];
const at = (t, o) => ev.push({at: t, ...o});
// mỗi lời giảng đặt góc nhìn và kì cần xem NGAY lúc bắt đầu, để khi lên lớp nhảy tới bước nào cũng đúng cảnh (soi bằng bảng ảnh)
const step = (t, cap, view, fn) => { at(t, {cap, view, do: () => { S.hold = null; if (fn) fn(); }}); };
const kì = (a) => () => { S.psi = a; S.hold = [a, a + 180]; S.slow = 1 / 160; };
step(0.2, 0, 'hero'); at(1.5, {click: 'labels'}); at(3.0, {click: 'labels'});
step(9, 1, 'hero');
['sys_crank', 'sys_valve', 'sys_fuel', 'sys_ign', 'sys_cool', 'sys_lube', 'sys_start'].forEach((k, i) => at(10 + i * 2.4, {click: k}));
at(27, {click: 'sys_start'});
step(29, 2, 'crank', () => { S.psi = 300; S.slow = 1 / 200; });
step(38, 3, 'inside', kì(0));
step(46, 4, 'inside', kì(180));
step(54, 5, 'head', kì(360));
step(62, 6, 'hero', kì(540));
step(70, 7, 'hero', () => { S.slow = 1 / 100; }); at(70.5, {slide: 'slow', to: 0.62, dur: 1.2}); at(73, {click: 'real'}); at(78, {click: 'real'});
step(80, 8, 'front'); at(84, {slide: 'rpm', to: 0.8, dur: 2.2}); at(88, {slide: 'rpm', to: 0, dur: 1.4});
step(90, 9, 'hero');
step(98, 10, 'hero'); at(99, {slide: 'eps', to: 0.86, dur: 2.4}); at(104, {slide: 'eps', to: 0.375, dur: 1.6}); at(106.5, {click: 'spark'}); at(112, {click: 'spark'});
ev.sort((a, b) => a.at - b.at);

runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 118}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_front', 3: 'v_head', 4: 'v_crank', 5: 'v_inside', c: 'cut', g: 'glass', o: 'solid', l: 'spark', r: 'real', n: 'labels'},
  shell: {subject: 'Công nghệ 11', variant: 'pho-thong',
    objectives: ['Trình bày được khái niệm, phân loại động cơ đốt trong.', 'Mô tả được cấu tạo, giải thích được nguyên lí làm việc của động cơ đốt trong.', 'Giải thích được ý nghĩa một số thông số kĩ thuật cơ bản của động cơ đốt trong.'],
    credit: 'Bài của Sáng Ăn Khoai, dựng theo quy trình teardown của elvarofficial và claude-motion của whaleyxbt (MIT). Thông số máy: Honda Việt Nam (Wave Alpha 110). Thanh truyền 100 mm, độ nâng xupap và góc phối khí thực tế là giả định minh hoạ; áp suất là mô hình gần đúng. Xi lanh đặt đứng cho dễ nhìn.'}});
