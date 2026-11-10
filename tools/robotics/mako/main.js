// Robot cá mập mako (Vật lí 10, lực cản và lực nâng; mở rộng sang mô phỏng sinh học): trang chạy trực tiếp.
// Một đầu vào là tốc độ bơi U. Tần số vẫy đuôi lấy từ hồi quy đo trên cá mập mako thật (Waller và cộng sự 2023);
// sóng thân, 8 khớp servo, số Strouhal, lực cản, vết đuôi trên nước đều tính từ U. Ý tưởng từ bài chia sẻ của シャック
// (@SHACK_SAME_SAME) về robot cá mập dựng bằng quy trình teardown; mã, mô hình và số liệu ở đây là của bài này.
import * as THREE from 'three';
import {createStage} from '../kit/stage.js';
import {C, createUI, fx} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {L, CRUISE, BURST, REG, ST_BAND, U_MIN, U_MAX, JOINTS, fOf, lat, latDs, latDt, jointAngles, derive} from './kin.js';
import {buildShark, Y0, prof} from './shark.js';

const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 1.5, grid: 0.1, fade: 9, fov: 26});
const ui = createUI(app);
const fish = buildShark(); st.scene.add(fish.root);
const vn = (v, n = 1) => fx(v, n).replace('.', ',');
const vnInt = (v) => Math.round(v).toLocaleString('vi-VN');
const D2 = 180 / Math.PI;

// lưới sàn trôi theo nước: cá đứng yên trong khung hình, nước và sàn lùi về sau với tốc độ U (như bể thử có dòng chảy)
{
  const gm = st.ground.material;
  gm.uniforms.uOff = {value: 0};
  gm.vertexShader = gm.vertexShader.replace('varying vec3 vW;', 'uniform float uOff; varying vec3 vW;').replace('vW = w.xyz;', 'vW = w.xyz + vec3(uOff, 0.0, 0.0);');
  gm.needsUpdate = true;
}

// ---------------- trạng thái
const S0 = {U: CRUISE.U, Ut: CRUISE.U, AL: 0.2, lam: 1.0, slow: 1, mode: 'skin', trail: true, flow: true, labels: true, phi: 0, D: 0, beats: 0};
const S = {...S0, peak: new Array(8).fill(0), peakNow: new Array(8).fill(0), ang: new Array(8).fill(0), trailPts: [], aoa: 0};

// ---------------- bảng điều khiển 1600 × 900
ui.header({code: 'MAKO', kicker: 'VẬT LÍ 10 · LỰC CẢN VÀ LỰC NÂNG · MÔ PHỎNG SINH HỌC', title: 'Robot cá mập mako', sub: 'Một đầu vào là tốc độ bơi · số đo cá mập thật (Waller và cộng sự, 2023)',
  right: [['0,90 m/s', 'TUẦN TRA (ĐO)'], ['5,02 m/s', 'BỨT TỐC (ĐO)'], ['1,97 m', 'CHIỀU DÀI CÁ']]});
// 01 tốc độ
ui.panel(28, 112, 300, 262, 'TỐC ĐỘ BƠI · MỘT ĐẦU VÀO', '01');
const bigU = ui.text(42, 142, '', 'mo', 'position:absolute;font-size:34px;font-weight:700;letter-spacing:-1px;color:#1D1B16');
const kmh = ui.text(200, 156, '', 'v', 'width:114px;text-align:right;font-size:13px;color:#626773');
const R1 = ['Tần số vẫy đuôi f', 'Quãng đi mỗi nhịp U/f', 'Tốc độ sóng thân c = λ·f', 'Tỉ số U / c', 'Số nhịp đã vẫy', 'Quãng đường đã bơi'].map((t, i) => { ui.text(42, 196 + i * 18, t, 'sm', 'font-size:10.5px'); return ui.text(150, 196 + i * 18, '', 'v', 'width:164px;text-align:right;font-size:11px'); });
ui.buttons([['cruise', 'TUẦN TRA · 0,90 m/s'], ['burst', 'BỨT TỐC · 5,02 m/s']], 42, 310, 272);
const sU = ui.slider('U', 42, 350, 272, 'TỐC ĐỘ U', {lw: 74, vw: 74});
// 02 tần số theo tốc độ
ui.panel(28, 386, 300, 196, 'TẦN SỐ VẪY ĐUÔI THEO TỐC ĐỘ', '02');
const chart = ui.svg(42, 418, 272, 122);
ui.text(42, 548, 'U = 1,24·f + 0,20 · hồi quy đo trên con cái 197 cm · R² = 0,55', 'sm', 'font-size:9px');
ui.text(42, 562, 'Chấm đen: số đo · chấm cam: hiện tại · Waller và cs. 2023', 'sm', 'font-size:9px');
// 03 lực cản
ui.panel(28, 594, 300, 172, 'LỰC CẢN CỦA NƯỚC · VẬT LÍ 10', '03');
const R3 = ['Lực cản so với lúc tuần tra', 'Công suất thắng lực cản', 'Tốc độ so với lúc tuần tra'].map((t, i) => { ui.text(42, 628 + i * 19, t, 'sm', 'font-size:10.5px'); return ui.text(200, 628 + i * 19, '', 'v', 'width:114px;text-align:right;font-size:12.5px'); });
const dragBar = ui.svg(42, 690, 272, 22);
ui.text(42, 720, 'Mô hình F ≈ ½·ρ·C·S·v², công suất P = F·v', 'sm', 'font-size:9.5px');
ui.text(42, 736, 'Lần bứt tốc 5,02 m/s đo được kéo dài 14 giây', 'sm', 'font-size:9.5px');
// 04 sóng thân nhìn từ trên
ui.panel(1272, 112, 300, 250, 'SÓNG THÂN · NHÌN TỪ TRÊN, ĐÚNG TỈ LỆ', '04');
const topv = ui.svg(1286, 144, 272, 122);
const R4 = ['Bước sóng λ (giả định)', 'Biên độ đuôi A, đỉnh – đỉnh', 'Góc tới của vây đuôi', 'Mũi lệch ngang'].map((t, i) => { ui.text(1286, 276 + i * 19, t, 'sm', 'font-size:10.5px'); return ui.text(1420, 276 + i * 19, '', 'v', 'width:138px;text-align:right'); });
// 05 Strouhal
ui.panel(1272, 372, 300, 150, 'SỐ STROUHAL St = f·A / U', '05');
const stBig = ui.text(1286, 402, '', 'mo', 'position:absolute;font-size:26px;font-weight:700;letter-spacing:-.5px');
const stVerd = ui.text(1390, 410, '', 'sm', 'width:168px;white-space:normal;font-size:10.5px;line-height:1.35;text-align:right');
const gauge = ui.svg(1286, 444, 272, 36);
const sA = ui.slider('amp', 1286, 500, 272, 'BIÊN ĐỘ A/L', {lw: 80, vw: 70});
// 06 khớp servo
ui.panel(1272, 532, 300, 134, '8 KHỚP SERVO · GÓC TỨC THỜI', '06');
const jsv = ui.svg(1286, 562, 272, 78);
ui.text(1286, 646, 'Thanh: góc lúc này · vạch: lớn nhất nhịp trước · robot minh hoạ', 'sm', 'font-size:9px');
// 07 điều khiển
ui.panel(1272, 676, 300, 90, 'THỬ PHÁ · TUA CHẬM', '07');
const sLam = ui.slider('lam', 1286, 708, 272, 'BƯỚC SÓNG λ', {lw: 80, vw: 70});
const sSlow = ui.slider('slow', 1286, 736, 272, 'TUA CHẬM', {lw: 80, vw: 96});
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_top', 'TRÊN'], ['v_below', 'DƯỚI'], ['v_tail', 'CẬN ĐUÔI']], 360, 120, 600);
ui.buttons([['skin', 'DA CÁ'], ['glass', 'NHÌN XUYÊN'], ['frame', 'KHUNG ROBOT'], ['trail', 'VẾT ĐUÔI'], ['flow', 'DÒNG NƯỚC'], ['labels', 'NHÃN']], 360, 744, 900);
ui.cap = ui.caption(348, 772, 904, 126);
const alert = ui.alert(400, 712);
ui.callouts([
  {key: 'snout', title: 'MŨI HÌNH NÓN', sub: 'THÂN THUÔN HÌNH GIỌT NƯỚC'}, {key: 'gill', title: 'KHE MANG', sub: '5 KHE MỖI BÊN'},
  {key: 'pect', title: 'VÂY NGỰC', sub: 'TẠO LỰC NÂNG, GIỮ THĂNG BẰNG'}, {key: 'dors', title: 'VÂY LƯNG', sub: 'GIỮ THÂN ỔN ĐỊNH'},
  {key: 'keel', title: 'CUỐNG ĐUÔI HẸP', sub: 'CÓ GỜ BÊN (KEEL)'}, {key: 'caud', title: 'VÂY ĐUÔI LƯỠI LIỀM', sub: 'TẠO LỰC ĐẨY NHƯ MỘT CÁNH'},
  {key: 'nose', title: 'CẢM BIẾN MŨI', sub: 'ĐO TỐC ĐỘ NƯỚC (MINH HOẠ)'}, {key: 'batt', title: 'PIN · MẠCH ĐIỀU KHIỂN', sub: 'THÂN TRƯỚC CỨNG'},
  {key: 'jnt', title: '8 KHỚP SERVO', sub: 'LỆCH PHA · SÓNG CHẠY VỀ ĐUÔI'},
]);

// ---------------- nước: hạt trôi theo dòng, vết đuôi để lại trên nước
const NP = 900, pp = new Float32Array(NP * 3);
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
for (let i = 0; i < NP; i++) pp.set([-3.2 + 6.4 * rnd(), 0.06 + 1.3 * rnd(), -1.1 + 2.2 * rnd()], i * 3);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
const flow = new THREE.Points(pGeo, new THREE.PointsMaterial({color: '#7f93ab', size: 0.012, transparent: true, opacity: 0.55, depthWrite: false}));
flow.frustumCulled = false; st.scene.add(flow);
const NT = 420, tp = new Float32Array(NT * 3);
const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tGeo.setDrawRange(0, 0);
const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({color: '#e3562a', transparent: true, opacity: 0.9}));
trail.frustumCulled = false; st.scene.add(trail);

// ---------------- vẽ bảng
const CH = {w: 272, h: 122, u: 5.5, f: 4.5};
const cx = (U) => 22 + (U / CH.u) * (CH.w - 30), cy = (f) => CH.h - 16 - (f / CH.f) * (CH.h - 24);
const drawChart = (U, f) => {
  let g = `<rect x="0" y="0" width="${CH.w}" height="${CH.h}" fill="${C.chart}" stroke="${C.line}"/>`;
  for (let u = 1; u <= 5; u++) g += `<line x1="${cx(u)}" x2="${cx(u)}" y1="6" y2="${CH.h - 16}" stroke="${C.line}" stroke-width=".6"/><text x="${cx(u)}" y="${CH.h - 4}" text-anchor="middle" font-size="8.5" fill="#626773" font-family="JetBrains Mono,monospace">${u}</text>`;
  for (let k = 1; k <= 4; k++) g += `<line x1="22" x2="${CH.w - 8}" y1="${cy(k)}" y2="${cy(k)}" stroke="${C.line}" stroke-width=".6"/><text x="16" y="${cy(k) + 3}" text-anchor="end" font-size="8.5" fill="#626773" font-family="JetBrains Mono,monospace">${k}</text>`;
  g += `<text x="${CH.w - 8}" y="${CH.h - 18}" text-anchor="end" font-size="8.5" fill="#626773" font-family="Be Vietnam Pro,sans-serif">U (m/s)</text><text x="26" y="13" font-size="8.5" fill="#626773" font-family="Be Vietnam Pro,sans-serif">f (Hz)</text>`;
  g += `<line x1="${cx(REG.b)}" y1="${cy(0)}" x2="${cx(CH.u)}" y2="${cy(fOf(CH.u))}" stroke="${C.ink}" stroke-width="1.3"/>`;
  // số đo: tuần tra (thanh lệch chuẩn), bứt tốc
  g += `<line x1="${cx(CRUISE.U)}" x2="${cx(CRUISE.U)}" y1="${cy(CRUISE.f - CRUISE.fsd)}" y2="${cy(CRUISE.f + CRUISE.fsd)}" stroke="#1D1B16" stroke-width="1"/>`;
  for (const [p, t, dx] of [[CRUISE, 'tuần tra 0,51 Hz', 8], [BURST, 'bứt tốc 3,65 Hz', -8]]) g += `<circle cx="${cx(p.U)}" cy="${cy(p.f)}" r="3.6" fill="#1D1B16"/><text x="${cx(p.U) + dx}" y="${cy(p.f) + (dx > 0 ? 12 : 13)}" text-anchor="${dx > 0 ? 'start' : 'end'}" font-size="8.5" fill="#1D1B16" font-family="Be Vietnam Pro,sans-serif">${t}</text>`;
  g += `<circle cx="${cx(U)}" cy="${cy(f)}" r="5" fill="${C.or}" stroke="#fff" stroke-width="1.6"/>`;
  chart.innerHTML = g;
};
const TV = {w: 272, h: 122, k: 256 / L};
const tvx = (s) => 264 - s * 256, tvy = (y) => 58 - y * TV.k;
const drawTop = (phi, A, lam) => {
  let up = '', dn = '', mid = '', e1 = '', e2 = '';
  for (let i = 0; i <= 60; i++) {
    const s = i / 60, y = lat(s, phi, A, lam), w = prof(s).w, a = 0.5 * A * (0.02 - 0.12 * s + 1.1 * s * s);
    up += `${i ? 'L' : 'M'}${tvx(s).toFixed(1)} ${tvy(y + w).toFixed(1)}`; dn = `L${tvx(s).toFixed(1)} ${tvy(y - w).toFixed(1)}` + dn;
    mid += `${i ? 'L' : 'M'}${tvx(s).toFixed(1)} ${tvy(y).toFixed(1)}`;
    e1 += `${i ? 'L' : 'M'}${tvx(s).toFixed(1)} ${tvy(a).toFixed(1)}`; e2 += `${i ? 'L' : 'M'}${tvx(s).toFixed(1)} ${tvy(-a).toFixed(1)}`;
  }
  let g = `<rect x="0" y="0" width="${TV.w}" height="${TV.h}" fill="${C.chart}" stroke="${C.line}"/>`;
  g += `<path d="${e1}" fill="none" stroke="#9aa0aa" stroke-dasharray="3 3" stroke-width=".9"/><path d="${e2}" fill="none" stroke="#9aa0aa" stroke-dasharray="3 3" stroke-width=".9"/>`;
  g += `<path d="${up}${dn}Z" fill="#3b6496" fill-opacity=".16" stroke="#3b6496" stroke-width="1"/><path d="${mid}" fill="none" stroke="${C.ink}" stroke-width="1.1"/>`;
  for (const s of [0.4, 0.475, 0.55, 0.625, 0.7, 0.775, 0.85, 0.925]) g += `<circle cx="${tvx(s).toFixed(1)}" cy="${tvy(lat(s, phi, A, lam)).toFixed(1)}" r="2.4" fill="${C.or}"/>`;
  // thước bước sóng và biên độ
  const lx = Math.min(lam, 1);
  g += `<line x1="${tvx(0)}" x2="${tvx(lx)}" y1="${TV.h - 12}" y2="${TV.h - 12}" stroke="#1D1B16" stroke-width=".9"/><text x="${(tvx(0) + tvx(lx)) / 2}" y="${TV.h - 3}" text-anchor="middle" font-size="8.5" fill="#1D1B16" font-family="Be Vietnam Pro,sans-serif">${lam <= 1 ? 'λ' : 'λ dài hơn thân'}</text>`;
  g += `<line x1="9" x2="9" y1="${tvy(A / 2)}" y2="${tvy(-A / 2)}" stroke="${C.or}" stroke-width="1.4"/><text x="14" y="${tvy(A / 2) + 3}" font-size="8.5" fill="${C.or}" font-family="Be Vietnam Pro,sans-serif">A</text>`;
  g += `<text x="${TV.w - 6}" y="12" text-anchor="end" font-size="8.5" fill="#626773" font-family="Be Vietnam Pro,sans-serif">mũi →</text>`;
  topv.innerHTML = g;
};
const drawGauge = (St) => {
  const W = 272, x = (v) => 6 + (Math.min(v, 0.6) / 0.6) * (W - 12);
  let g = `<rect x="6" y="10" width="${W - 12}" height="8" rx="4" fill="${C.track}"/><rect x="${x(ST_BAND[0])}" y="10" width="${x(ST_BAND[1]) - x(ST_BAND[0])}" height="8" fill="#2fa36b" fill-opacity=".35"/>`;
  for (const v of [0, 0.2, 0.4, 0.6]) g += `<text x="${x(v)}" y="32" text-anchor="middle" font-size="8.5" fill="#626773" font-family="JetBrains Mono,monospace">${vn(v, 1)}</text>`;
  g += `<text x="${(x(0.2) + x(0.4)) / 2}" y="7" text-anchor="middle" font-size="8" fill="#1f7a4f" font-family="Be Vietnam Pro,sans-serif">hiệu suất cao · Taylor và cs. 2003</text>`;
  g += `<path d="M${x(St)} 21 l-5 7 h10z" fill="${C.ink}"/><line x1="${x(St)}" x2="${x(St)}" y1="7" y2="21" stroke="${C.ink}" stroke-width="1.6"/>`;
  gauge.innerHTML = g;
};
const drawJoints = () => {
  const W = 272, H = 78, mid = 36, k = 32 / 20;
  let g = `<line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="${C.line}"/>`;
  S.ang.forEach((a, i) => {
    const x = 10 + i * 33, d = Math.max(-20, Math.min(20, a * D2)), h = d * k, pk = Math.min(20, S.peak[i]) * k;
    g += `<rect x="${x}" y="${Math.min(mid, mid - h)}" width="18" height="${Math.abs(h) + 0.5}" rx="2" fill="${C.or}"/>`;
    g += `<line x1="${x - 2}" x2="${x + 20}" y1="${mid - pk}" y2="${mid - pk}" stroke="${C.ink}" stroke-width="1"/><line x1="${x - 2}" x2="${x + 20}" y1="${mid + pk}" y2="${mid + pk}" stroke="${C.ink}" stroke-width="1"/>`;
    g += `<text x="${x + 9}" y="${H}" text-anchor="middle" font-size="8.5" fill="#626773" font-family="JetBrains Mono,monospace">${i + 1}</text>`;
  });
  jsv.innerHTML = g;
};
const drawDrag = (r) => {
  const W = 272, x = (v) => (Math.log10(Math.max(1, v)) / Math.log10(200)) * W;
  let g = `<rect x="0" y="6" width="${W}" height="8" rx="4" fill="${C.track}"/><rect x="0" y="6" width="${Math.max(4, x(r))}" height="8" rx="4" fill="${C.or}"/>`;
  for (const v of [1, 10, 100]) g += `<text x="${Math.min(W - 10, x(v) + 2)}" y="22" font-size="8" fill="#626773" font-family="JetBrains Mono,monospace">×${v}</text>`;
  dragBar.innerHTML = g;
};

// ---------------- mô phỏng
const sim = {
  reset() {
    Object.assign(S, S0, {peak: new Array(8).fill(0), peakNow: new Array(8).fill(0), trailPts: []});
    fish.look('skin');
  },
  act(k) {
    if (k === 'cruise') S.Ut = CRUISE.U;
    if (k === 'burst') S.Ut = BURST.U;
    if (k === 'skin' || k === 'glass' || k === 'frame') { S.mode = k; fish.look(k); }
    if (k === 'trail') { S.trail = !S.trail; S.trailPts = []; }
    if (k === 'flow') S.flow = !S.flow;
    if (k === 'labels') S.labels = !S.labels;
  },
  slide(k, t) {
    if (k === 'U') { S.Ut = U_MIN + t * (U_MAX - U_MIN); S.U = S.Ut; }
    if (k === 'amp') S.AL = 0.05 + t * 0.3;
    if (k === 'lam') S.lam = 0.5 + t;
    if (k === 'slow') S.slow = Math.exp(Math.log(0.1) * (1 - t));
  },
  step(dt) {
    const h = dt * S.slow;
    S.U += (S.Ut - S.U) * Math.min(1, h * 1.2);
    const f = fOf(S.U), A = S.AL * L;
    const b0 = Math.floor(S.beats);
    S.phi += 2 * Math.PI * f * h; S.D += S.U * h; S.beats = S.phi / (2 * Math.PI);
    S.ang = jointAngles(S.phi, A, S.lam);
    S.ang.forEach((a, i) => { S.peakNow[i] = Math.max(S.peakNow[i], Math.abs(a) * D2); });
    if (Math.floor(S.beats) !== b0) { S.peak = S.peakNow.slice(); S.peakNow.fill(0); }
    // góc tới của vây đuôi: hướng vây so với hướng nước tới (vận tốc của vây trong nước)
    const vz = latDt(1, S.phi, A, S.lam, f), af = Math.atan2(latDs(1, S.phi, A, S.lam), L), bf = Math.atan2(-vz, S.U);
    S.aoa = (bf - af) * D2;
    // nước lùi về sau
    if (S.flow) { const arr = pGeo.attributes.position.array; for (let i = 0; i < NP; i++) { let x = arr[i * 3] - S.U * h; if (x < -3.2) x += 6.4; arr[i * 3] = x; } pGeo.attributes.position.needsUpdate = true; }
    if (S.trail) { S.trailPts.push([S.D, lat(1, S.phi, A, S.lam)]); while (S.trailPts.length > NT || (S.trailPts.length && S.D - S.trailPts[0][0] > 3.6)) S.trailPts.shift(); }
    st.ground.material.uniforms.uOff.value = S.D % 1;
  },
  shadowAt() { return new THREE.Vector3(0, 0.3, 0); },
  // soi chi tiết (kit/live.js): bấm một servo ở chế độ khung robot, hoặc bấm thân cá; camera bám theo chỗ đó khi thân uốn
  pick(hits) {
    for (const h of hits) {
      const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
      if (m && m.transparent && m.opacity < 0.35) continue;
      let i = -1; for (let x = h.object; x && i < 0; x = x.parent) i = fish.servos.indexOf(x);
      if (i >= 0) {
        const at = () => { const v = new THREE.Vector3(); fish.servos[i].getWorldPosition(v); return [v.x, v.y, v.z]; };
        return {k: 'Robot cá · khung trong', t: `Khớp servo ${i + 1} / 8`, b: 'Servo quay đốt sau so với đốt trước. Góc của nó là hiệu hướng của hai đốt kề nhau khi đặt các khớp lên sóng thân, nên khớp càng gần đuôi góc càng lớn.',
          rows: [['Vị trí trên thân', `s = ${vn(JOINTS[i], 3)} (từ mũi)`], ['Góc lúc này', () => `${vn(S.ang[i] * D2, 1)}°`], ['Biên độ chu kì trước', () => `± ${vn(S.peak[i], 1)}°`], ['Tần số vẫy', () => `${vn(fOf(S.U), 2)} Hz`]],
          src: 'Robot 8 khớp là phần giả định minh hoạ của bài; tần số vẫy từ hồi quy đo trên cá mako (Waller và cs. 2023).', pos: at, d: 1.1};
      }
      if (h.object.parent && fish.root.getObjectById(h.object.id)) {
        const d0 = () => derive(S.U, S.AL, S.lam);
        return {k: 'Cá mập mako vây ngắn · Isurus oxyrinchus', t: 'Thân cá đang bơi', b: 'Mọi đại lượng đọc từ tốc độ bơi U: tần số vẫy đuôi theo hồi quy đo trên cá thật, sóng thân và số Strouhal tính từ đó.',
          rows: [['Tốc độ U', () => `${vn(S.U, 2)} m/s · ${vn(S.U * 3.6, 1)} km/h`], ['Tần số vẫy f', () => `${vn(d0().f, 2)} Hz`], ['Số Strouhal', () => `${vn(d0().St, 2)}`], ['Lực cản so với tuần tra', () => `× ${vn(d0().drag, 1)}`]],
          src: 'Số đo: Waller và cs. (2023), J Fish Biol 103: 864–883; vùng Strouhal: Taylor và cs. (2003), Nature 425.', pos: () => { const p = fish.anchor(0.45, 0, 0, S.phi, S.AL * L, S.lam); return [p.x, p.y, p.z]; }, d: 4.4};
      }
    }
    return null;
  },
  draw({view} = {}) {
    const d = derive(S.U, S.AL, S.lam), A = d.A;
    fish.update(S.phi, A, S.lam);
    flow.visible = S.flow;
    // vết đuôi: chỗ đuôi đã đi qua, trôi về sau cùng nước
    const xt = L / 2 - L - 0.12, n = S.trail ? S.trailPts.length : 0;
    for (let i = 0; i < n; i++) { const [Dk, z] = S.trailPts[i]; tp.set([xt - (S.D - Dk), Y0, z], i * 3); }
    tGeo.setDrawRange(0, n); tGeo.attributes.position.needsUpdate = true; trail.visible = n > 1;
    // 01
    bigU.innerHTML = `${vn(S.U, 2)}<span style="font-size:15px;color:#626773;letter-spacing:0;font-weight:600"> m/s</span>`;
    kmh.textContent = `${vn(d.kmh, 1)} km/h`;
    const r1 = [`${vn(d.f, 2)} Hz`, `${vn(d.stride, 2)} m · ${vn(d.stride / L, 2)} L`, `${vn(d.c, 2)} m/s`, vn(d.slip, 2), vnInt(Math.floor(S.beats)), `${vn(S.D, 1)} m`];
    r1.forEach((t, i) => { R1[i].textContent = t; });
    R1[3].style.color = d.slip >= 1 ? C.or : C.ink;
    sU.set((S.Ut - U_MIN) / (U_MAX - U_MIN), `${vn(S.Ut, 2)} m/s`);
    ui.setOn('cruise', Math.abs(S.Ut - CRUISE.U) < 0.01); ui.setOn('burst', Math.abs(S.Ut - BURST.U) < 0.01);
    // 02, 03
    drawChart(S.U, d.f);
    R3[0].textContent = `× ${vn(d.drag, 1)}`; R3[1].textContent = `× ${vn(d.power, d.power < 10 ? 1 : 0)}`; R3[2].textContent = `× ${vn(S.U / CRUISE.U, 2)}`;
    drawDrag(d.power);
    // 04
    drawTop(S.phi, A, S.lam);
    const r4 = [`${vn(S.lam, 2)} L · ${vn(S.lam * L, 2)} m`, `${vn(A, 2)} m · ${vn(S.AL, 2)} L`, `${S.aoa >= 0 ? '+' : '−'}${vn(Math.abs(S.aoa), 0)}°`, `${vn(Math.abs(lat(0, S.phi, A, S.lam)) * 100, 1)} cm`];
    r4.forEach((t, i) => { R4[i].textContent = t; });
    // 05
    const inBand = d.St >= ST_BAND[0] && d.St <= ST_BAND[1];
    stBig.textContent = vn(d.St, 2); stBig.style.color = inBand ? '#1D1B16' : C.or;
    stVerd.textContent = inBand ? 'Trong khoảng 0,2–0,4 của cá và cá heo khi bơi tuần tra' : d.St > ST_BAND[1] ? 'Trên 0,4: đuôi quẫy nhiều so với tốc độ, hiệu suất giảm' : 'Dưới 0,2: đuôi quét quá hẹp, hiệu suất giảm';
    drawGauge(d.St);
    sA.set((S.AL - 0.05) / 0.3, `${vn(S.AL, 2)} L`);
    // 06, 07
    drawJoints();
    sLam.set(S.lam - 0.5, `${vn(S.lam, 2)} L`);
    sSlow.set(1 - Math.log(S.slow) / Math.log(0.1), S.slow > 0.97 ? 'tốc độ thật' : `chậm ${vn(1 / S.slow, 1)} lần`);
    for (const m of ['skin', 'glass', 'frame']) ui.setOn(m, S.mode === m);
    ui.setOn('trail', S.trail); ui.setOn('flow', S.flow); ui.setOn('labels', S.labels);
    alert.set(d.slip >= 1 ? `U / c = ${vn(d.slip, 2)} ≥ 1 · SÓNG THÂN CHẠY CHẬM HƠN CÁ · KHÔNG CÒN ĐẨY NƯỚC RA SAU` : !inBand ? `St = ${vn(d.St, 2)} · NGOÀI KHOẢNG 0,2–0,4 · HIỆU SUẤT ĐẨY THẤP` : '');
    // nhãn
    const pr = (s, v, u) => { const p = fish.anchor(s, v, u, S.phi, A, S.lam); return st.project(p.x, p.y, p.z); };
    const skin = S.mode === 'skin';
    ui.drawCallouts([
      ...(skin ? [
        {key: 'snout', p: pr(0.03, 0.01, 0), dx: 20, dy: -60},
        {key: 'gill', p: pr(0.21, -0.02, prof(0.21).w), dx: 40, dy: 70},
        ...(view === 'top' ? [] : [{key: 'dors', p: pr(0.45, prof(0.45).ht + 0.17, 0), dx: 20, dy: -60}]),
        {key: 'keel', p: pr(0.93, 0, prof(0.93).w), dx: -40, dy: 80},
      ] : [
        {key: 'nose', p: pr(0.03, 0, 0), dx: 20, dy: -60},
        {key: 'batt', p: pr(0.24, -0.07, 0.06), dx: 40, dy: 90},
        {key: 'jnt', p: pr(0.625, 0.03, 0), dx: 20, dy: -80},
      ]),
      {key: 'pect', p: pr(0.33, -0.2, 0.3), dx: 70, dy: 50},
      {key: 'caud', p: pr(1.0, 0.24, 0), dx: 40, dy: -70},
    ], S.labels ? 1 : 0);
  },
};
window.MAKO = S; // để kiểm, quay phim: đặt tốc độ, pha từ ngoài
window.MAKO_CAP = (i) => ui.cap.set(CAP[i], i, CAP.length);

// ---------------- góc nhìn (độ)
const views = {
  hero: (t) => ({tx: -0.05, ty: Y0 - 0.05, tz: 0, az: 32 + 5 * Math.sin(t * 0.1), el: 17, d: 6.8, sx: 0, sy: -30}),
  side: () => ({tx: 0, ty: Y0, tz: 0, az: 0, el: 3, d: 6.2, sx: 0, sy: -30}),
  top: () => ({tx: 0, ty: Y0, tz: 0, az: 0, el: 84, d: 6.4, sx: 0, sy: -20}),
  below: () => ({tx: 0.1, ty: Y0, tz: 0, az: 26, el: -5, d: 5.6, sx: 0, sy: -30}),
  tail: (t) => ({tx: -0.55, ty: Y0, tz: 0, az: -64 + 4 * Math.sin(t * 0.15), el: 14, d: 4.1, sx: 0, sy: -30}),
};

// ---------------- bài giảng
const CAP = [
  {k: 'CÁ MẬP MAKO · SỐ ĐO THẬT', t: 'Một con cá mập mang máy đo tốc độ', b: 'Năm 2022, các nhà khoa học gắn thẻ có cánh quạt đo tốc độ và gia tốc kế lên hai con cá mập mako dài khoảng 2 m ngoài khơi quần đảo Azores (Bồ Đào Nha). Con cái dài 197 cm bơi tuần tra trung bình 0,90 m/s và một lần bứt tốc tới 5,02 m/s (Waller và cộng sự, 2023). Robot trên màn hình dài đúng bằng con cá đó.', e: 'Tuần tra 0,90 m/s ≈ 3,2 km/h · bứt tốc 5,02 m/s ≈ 18,1 km/h',
    ask: {q: 'Tốc độ bứt tốc 5,02 m/s bằng khoảng bao nhiêu km/h?', o: ['5,0 km/h', '18,1 km/h', '50,2 km/h'], a: 1, e: '5,02 × 3,6 ≈ 18,1 km/h.'}},
  {k: 'KIỂU BƠI CÁ NGỪ', t: 'Thân trước gần như đứng yên, đuôi vẫy', b: 'Mako bơi kiểu cá ngừ (thunniform): nửa thân trước gần như không lắc, chuyển động dồn về cuống đuôi hẹp và vây đuôi hình lưỡi liềm, nơi sinh ra phần lớn lực đẩy. Cá mập họ Lamnidae và cá ngừ không phải họ hàng gần nhưng có thân hình và cách bơi giống nhau tới cả cấu trúc cơ và gân: một ví dụ của tiến hoá hội tụ (Donley và cộng sự, 2004).', e: 'Bảng 04: đường đứt là biên độ, nhỏ ở mũi, lớn dần về đuôi',
    ask: {q: 'Ở kiểu bơi cá ngừ, phần nào lắc ngang mạnh nhất?', o: ['Đầu', 'Giữa thân', 'Cuống đuôi và vây đuôi'], a: 2, e: 'Thân trước gần như đứng yên; biên độ lớn nhất ở cuống đuôi và vây đuôi.'}},
  {k: 'MỘT ĐẦU VÀO', t: 'Chọn tốc độ, mọi thứ chạy theo', b: 'Cả mô phỏng chỉ có một đầu vào là tốc độ bơi U. Tần số vẫy đuôi f lấy từ đường hồi quy trong chính bài báo, U = 1,24·f + 0,20, đo trên con cái 197 cm. Kéo thanh tốc độ ở bảng 01: tần số, quãng đi mỗi nhịp, tám khớp servo và mọi con số khác đổi theo.', e: 'f = (U − 0,20) / 1,24',
    ask: {q: 'Theo công thức, khi U = 0,90 m/s thì f bằng khoảng bao nhiêu?', o: ['0,20 Hz', '0,56 Hz', '1,24 Hz'], a: 1, e: '(0,90 − 0,20) / 1,24 ≈ 0,56 Hz; số đo là 0,51 ± 0,16 Hz.'}},
  {k: 'KIỂM MÔ HÌNH', t: 'Đường mô hình và hai điểm đo', b: 'Bảng 02 vẽ đường mô hình cùng hai điểm đo: tuần tra 0,90 m/s với 0,51 Hz, bứt tốc 5,02 m/s với 3,65 Hz. Mô hình cho 0,56 Hz và 3,89 Hz, lệch 0,05 Hz và 0,24 Hz. Hồi quy chỉ dựa trên một con cá trong khoảng 16 giờ (R² = 0,55), nên đây là ước lượng chứ không phải định luật.', e: 'Tuần tra: đo 0,51 · mô hình 0,56 Hz · bứt tốc: đo 3,65 · mô hình 3,89 Hz'},
  {k: 'SÓNG THÂN', t: 'Một làn sóng chạy từ mũi ra đuôi', b: 'Đường giữa thân lượn theo sóng ngang y = a(x)·sin(kx − ωt): biên độ a(x) nhỏ ở mũi, lớn ở đuôi, sóng chạy về phía đuôi với tốc độ c = λ·f và đẩy nước ra sau. Bật "Vết đuôi": khoảng cách giữa hai đỉnh của vết bằng quãng đi mỗi nhịp U/f. Bước sóng λ = 1 thân và biên độ đuôi 0,2 thân là giả định của bài, nằm trong khoảng đo được ở nhiều loài cá (0,1 đến 0,3 thân).', e: 'c = λ·f · muốn đẩy được nước thì U / c < 1'},
  {k: 'ROBOT 8 KHỚP · MINH HOẠ', t: 'Tám servo chép lại làn sóng', b: 'Robot thay cột sống bằng chuỗi 9 đốt nhôm nối bởi 8 khớp servo dồn về nửa sau thân. Mỗi khớp quay đúng bằng hiệu góc của hai đốt kề nhau trên đường sóng; các khớp lệch pha nên chuỗi đốt uốn thành sóng chạy. Thân trước cứng chứa pin và mạch điều khiển. Bấm "Khung robot" để bỏ lớp da.', e: 'θᵢ = góc đốt i − góc đốt (i − 1) · bảng 06'},
  {k: 'SỐ STROUHAL', t: 'Vẫy bao nhiêu là vừa?', b: 'Số Strouhal St = f·A/U so sánh tốc độ quét ngang của đuôi với tốc độ tiến. Cá heo, cá mập và cá xương khi bơi tuần tra đều có 0,2 < St < 0,4, khoảng mà hiệu suất đẩy cao (Taylor, Nudds và Thomas, 2003). Với số đo của mako và A = 0,2 thân, khi tuần tra St ≈ 0,25.', e: 'St = f·A / U',
    ask: {q: 'Cá vẫy f = 1 Hz, biên độ đuôi A = 0,4 m, bơi U = 1,6 m/s. St bằng bao nhiêu?', o: ['0,25', '0,4', '4'], a: 0, e: '1 × 0,4 / 1,6 = 0,25: nằm trong khoảng 0,2–0,4.'}},
  {k: 'LỰC CẢN · VẬT LÍ 10', t: 'Nhanh gấp 5,6 lần, tốn công suất gấp hơn 170 lần', b: 'Nước cản mọi vật chuyển động trong nó; lực cản phụ thuộc hình dạng và tốc độ của vật. Thân thuôn của mako giảm lực cản. Ở tốc độ lớn, lực cản tăng gần theo bình phương tốc độ, còn công suất để thắng nó (P = F·v) tăng theo lập phương. Từ 0,90 lên 5,02 m/s: lực cản gấp khoảng 31 lần, công suất gấp khoảng 174 lần. Lần bứt tốc đo được chỉ kéo dài 14 giây.', e: 'F ≈ ½·ρ·C·S·v² · P = F·v, tỉ lệ với v³',
    ask: {q: 'Theo mô hình F tỉ lệ với v², tốc độ tăng gấp đôi thì lực cản tăng bao nhiêu lần?', o: ['2 lần', '4 lần', '8 lần'], a: 1, e: '2² = 4; công suất P = F·v khi đó tăng 2³ = 8 lần.'}},
  {k: 'LỰC NÂNG Ở VÂY', t: 'Vây đuôi làm việc như một cánh', b: 'Khi đuôi quét ngang, nước gặp vây đuôi theo một góc nghiêng (góc tới, bảng 04). Như cánh máy bay, vây lưỡi liềm sinh lực nâng vuông góc với dòng nước tới; phần hướng về phía trước của lực đó đẩy cá đi. Cá mập không có bóng bơi, nên vây ngực cũng phải tạo lực nâng để thân không chìm.', e: 'Lực nâng vuông góc dòng tới · thành phần hướng về trước = lực đẩy'},
  {k: 'THỬ PHÁ', t: 'Đổi biên độ và bước sóng', b: 'Kéo biên độ đuôi lên 0,35 thân: St vượt 0,4, đuôi quẫy rộng mà cá không nhanh hơn. Kéo xuống 0,08 thân: St dưới 0,2. Kéo bước sóng ngắn lại: sóng thân chạy chậm hơn, tỉ số U/c vượt 1, thân không còn đẩy nước ra sau. Cá thật tự giữ mình trong vùng hiệu quả.', e: 'Bảng 05 và bảng 01 · cảnh báo hiện khi ra ngoài vùng'},
];
const ev = [];
const at = (t, o) => ev.push({at: t, ...o});
const step = (t, cap, view, fn) => { at(t, {cap, view, do: () => { if (fn) fn(); }}); };
const set = (o) => () => Object.assign(S, o);
step(0.2, 0, 'hero', set({Ut: CRUISE.U, slow: 1})); at(2, {click: 'labels'}); at(3.4, {click: 'labels'});
step(11, 1, 'top', set({Ut: CRUISE.U, slow: 1}));
step(21, 2, 'hero'); at(23, {slide: 'U', to: 0.45, dur: 2.4}); at(28, {slide: 'U', to: (CRUISE.U - U_MIN) / (U_MAX - U_MIN), dur: 1.4});
step(31, 3, 'side'); at(33, {click: 'burst'}); at(38, {click: 'cruise'});
step(41, 4, 'top', set({trail: false, slow: 1})); at(43, {click: 'trail'});
step(51, 5, 'hero', () => sim.act('frame')); at(56, {click: 'glass'}); at(59.5, {click: 'skin'});
step(62, 6, 'top');
step(71, 7, 'hero'); at(73, {click: 'burst'}); at(79, {click: 'cruise'});
step(82, 8, 'tail', set({slow: 0.35}));
step(91, 9, 'hero', set({slow: 1})); at(93, {slide: 'amp', to: 1, dur: 1.6}); at(97, {slide: 'amp', to: 0.1, dur: 1.6}); at(101, {slide: 'amp', to: 0.5, dur: 1}); at(103, {slide: 'lam', to: 0.05, dur: 1.6}); at(107, {slide: 'lam', to: 0.5, dur: 1});
ev.sort((a, b) => a.at - b.at);

runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 111}, firstView: 'hero',
  keys: {1: 'v_hero', 2: 'v_side', 3: 'v_top', 4: 'v_below', 5: 'v_tail', d: 'skin', x: 'glass', k: 'frame', v: 'trail', w: 'flow', n: 'labels'},
  shell: {subject: 'Vật lí 10', variant: 'pho-thong',
    objectives: ['Nêu được lực cản của nước lên vật chuyển động trong nó phụ thuộc vào hình dạng và tốc độ của vật.', 'Giải thích được vì sao thân thuôn và vây đuôi hình lưỡi liềm giúp cá mập bơi nhanh mà ít tốn năng lượng.', 'Đọc và dùng được số đo thật: tốc độ bơi, tần số vẫy đuôi, số Strouhal.'],
    credit: 'Bài của Sáng Ăn Khoai. Số đo cá mập mako: Waller và cộng sự (2023), Journal of Fish Biology 103: 864–883. Khoảng Strouhal: Taylor, Nudds, Thomas (2003), Nature 425: 707–711. Tiến hoá hội tụ cá mập Lamnidae và cá ngừ: Donley và cộng sự (2004), Nature 429: 61–65. Bước sóng, biên độ đuôi, hình dạng thân và robot 8 khớp là giả định minh hoạ. Ý tưởng từ bài chia sẻ của シャック (@SHACK_SAME_SAME); dựng theo quy trình teardown của elvarofficial và claude-motion của whaleyxbt (MIT).'}});
