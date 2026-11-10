// Cá thở bằng mang (Sinh học 11, hô hấp và trao đổi khí ở động vật): trang chạy trực tiếp. Cá là mô hình từ ảnh của
// Fish Kit (なちゃっと, CC0); miệng, nắp mang, vây chạy bằng shader của kit. Bài điều khiển nhịp thở: bơm miệng–nắp mang
// khi bơi chậm, ép dòng khi bơi nhanh (Roberts 1975); tính lượng nước phải qua mang từ ô xi hoà tan (Benson và Krause 1984)
// và trao đổi chất chuẩn (Wegner và cộng sự 2010). Tháo từng bộ phận bằng kit/tach.js (theo cutaway của Nyxera0x, MIT).
import * as THREE from 'three';
import {createStage} from '../kit/stage.js';
import {C, createUI} from '../kit/ui.js';
import {runLive} from '../kit/live.js';
import {tag, picker, vn} from '../kit/soi.js';
import {createCutaway} from '../kit/tach.js';
import {loadFish, createFish} from '../kit/fish-kit.js';
import {createLookup} from './tra-cuu.js';
import {SRC, FISHES, ALL, RAM_SRC, SKIPJACK, toadArea, UTIL, RAM, AIR_O2, o2Sat, smrAt, waterPerMin, NTU, effCounter, effCo, profile} from './kin.js';

const D2R = Math.PI / 180, Y0 = 0.17, LEN = 40; // độ cao trục cá (m), cỡ vẽ (cm)
const GILL = 0.35; // góc mở nắp mang lớn nhất của kit (rad), chỉ để vẽ
// nước sâu: nền xanh than, đáy lưới 5 cm
const PAL_WATER = {exact: true, bg: '#0f2a44', ground: '#0d243a', minor: '#143450', major: '#1d4567', shadow: '#01060c', env: '#3a6690', envGround: '#0a1c2e', sky: '#bcdcf4', hemiGround: '#0a1c2e'};
const app = document.getElementById('app');
const canvas = document.createElement('canvas'); canvas.id = 'gl'; app.appendChild(canvas);
const st = createStage({canvas, extent: 0.7, grid: 0.05, fade: 2.6, fov: 26, near: 0.01, far: 14, pal: PAL_WATER, sunDir: [-0.25, 0.9, 0.35]});
st.scene.fog.near = 1.6; st.scene.fog.far = 5.5;
const ui = createUI(app);

// ---------------- cá
const url = (n) => (ASSET_MAP ? ASSET_MAP[n] : `./fish/${n}`);
// chỉ chờ con cá hiện đầu tiên (saba); ba loài còn lại của nhóm có số đo mang tải ngầm ngay sau, không chặn màn đầu
await loadFish(url, ['saba']);
const root = new THREE.Group(); st.scene.add(root);
const turn = new THREE.Group(); root.add(turn);
const FISH = {}, BY = Object.fromEntries(ALL.map((f) => [f.id, f])), CORE = new Set(FISHES.map((f) => f.id));
const meshesOf = (o) => { const r = []; o.traverse((m) => { if (m.isMesh) r.push(m); }); return r; };
function makeActor(f) {
  const a = createFish(f.id, LEN), g = new THREE.Group(); turn.add(g); g.add(a.object); g.visible = false;
  a.object.rotation.y = Math.PI / 2; // kit: cá nhìn về +Z; bài: đầu về +X
  a.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.userData.fish = f.id; } });
  a.setMotion('swim');
  FISH[f.id] = {f, a, g, phase: Math.random() * 6, ram: 0, y: ['magochi', 'kasago'].includes(f.id) ? 0.035 : Y0};
  tag('ca', ...meshesOf(a.object));
}
makeActor(BY.saba);
// 16 loài còn lại của kit chỉ tải khi cần (danh sách loài, bộ sưu tập, nút "Loài khác"); mỗi loài có cả bản gần và bản xa như kit
const LOADING = new Map();
const ensure = (ids) => Promise.all(ids.map((id) => {
  if (FISH[id]) return null;
  if (!LOADING.has(id)) LOADING.set(id, loadFish(url, [id]).then(() => { makeActor(BY[id]); }).catch(() => { LOADING.delete(id); }));
  return LOADING.get(id);
}));
ensure(FISHES.map((f) => f.id));

// hạt lơ lửng trong nước: trôi ngược chiều bơi với đúng tốc độ bơi
const SNOW = 420, snowPos = new Float32Array(SNOW * 3);
for (let i = 0; i < SNOW; i++) snowPos.set([(Math.random() * 2 - 1) * 1.3, 0.02 + Math.random() * 0.85, (Math.random() * 2 - 1) * 0.9], i * 3);
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
// chấm tròn mềm cho hạt (mặc định Points vẽ ô vuông)
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(0.55, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({color: '#d6e8f7', map: dot, size: 0.004, transparent: true, opacity: 0.6, depthWrite: false, sizeAttenuation: true}));
st.scene.add(snow);
// dòng nước qua mang: vào miệng, ra khe nắp mang hai bên (toạ độ của kit: +Z là phía đầu, đơn vị mét)
const FLOW = 90, flowPos = new Float32Array(FLOW * 3), flowS = new Float32Array(FLOW), flowSide = new Float32Array(FLOW), flowJ = new Float32Array(FLOW * 2);
for (let i = 0; i < FLOW; i++) { flowS[i] = Math.random(); flowSide[i] = i % 2 ? 1 : -1; flowJ[i * 2] = Math.random() * 2 - 1; flowJ[i * 2 + 1] = Math.random() * 2 - 1; }
const flowGeo = new THREE.BufferGeometry(); flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({color: C.or, map: dot, size: 0.0045, transparent: true, opacity: 0.95, depthWrite: false}));
flow.frustumCulled = false;
function flowAt(s, side, j0, j1, Lm) {
  const zM = 0.47 * Lm, zG = 0.29 * Lm, zO = 0.16 * Lm;
  if (s < 0.4) { const u = s / 0.4, w = (1 - u) * (1 - u); return [j0 * 0.02 * w, j1 * 0.014 * w - 0.004, zM + 0.07 * (1 - u)]; }
  if (s < 0.6) { const u = (s - 0.4) / 0.2; return [side * 0.05 * Lm * u + j0 * 0.002, -0.004 + j1 * 0.004, zM + (zG - zM) * u]; }
  const u = (s - 0.6) / 0.4; return [side * (0.05 * Lm + 0.05 * u + 0.004 * j0), -0.004 - 0.012 * u + j1 * 0.008, zG + (zO - zG) * u - 0.05 * u * u];
}

// ---------------- trạng thái
const S = {t: 0, sel: 'saba', U: 0.3, T: 20, counter: true, compare: false, gallery: false, wait: '', motion: 'auto', low: false, hist: [], log: [], disp: {labels: true}, note: ''};
const OPEN = {mieng: 0, nap: 0, lung: 0, nguc: 0, duoi: 0};
let EX = 0;
const say = (txt) => { const t = Math.floor(S.t), s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; if (S.log[0]?.[1] === txt) return; S.log.unshift([s, txt]); S.log.length = Math.min(S.log.length, 3); };
const cur = () => FISH[S.sel];
const info = () => cur().f;
// phần ép dòng theo tốc độ: cá ngừ luôn ép dòng, cá chai không bao giờ; loài khác chuyển dần trên 35–82 cm/s (Roberts)
const smooth = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
const ramShare = (f, U) => (f.ram === 'bat-buoc' ? 1 : f.ram === 'khong' ? 0 : smooth((U - RAM.lo) / (RAM.hi - RAM.lo)));
const speedOf = (f) => (f.ram === 'bat-buoc' ? Math.max(S.U, RAM.mid) : S.U);
const needRatio = (t) => (smrAt(1, t) / smrAt(1, 20)) * (o2Sat(20) / o2Sat(t)); // lượng nước cần so với 20 °C (không phụ thuộc loài)
const tailHz = (U, Lm = LEN / 100) => (U > 0.02 ? (4 * U / Lm + 4) / 3 : 0); // Bainbridge 1958: U = L/4·(3f − 4)
const KIEU = {'bat-buoc': 'luôn ép dòng (bắt buộc)', chuyen: 'bơm khi chậm, ép dòng khi nhanh', khong: 'luôn bơm, không ép dòng', null: 'chưa có số đo; bài vẽ theo quy luật chung của Roberts'};
// mười dáng của Fish Kit (mô tả dịch từ kit); 'auto' là bài tự điều khiển nhịp thở theo tốc độ
const MOT = [['auto', 'BÀI', 'Bài điều khiển: tốc độ, nhịp thở, dòng nước qua mang'], ['swim', 'BƠI', 'Bơi thong thả; loài bơi chậm vẫy vài cái rồi lướt'], ['power', 'LAO', 'Tốc độ cao nhất: cả thân uốn sóng, vây xếp lại'],
  ['turn', 'RẼ', 'Vừa bơi vừa rẽ trái phải, thân cong theo vòng, vây lái'], ['hover', 'ĐỨNG', 'Đứng yên thở, vây ngực chèo giữ chỗ, mắt đảo'], ['range', 'MỞ HẾT', '4 giây một lần: miệng, nắp mang, vây mở hết cỡ rồi khép'],
  ['bite', 'CẮN', 'Ngậm mồi giả, lắc đầu nhẹ'], ['hooked', 'MẮC CÂU', 'Mắc câu, lắc đầu mạnh, vây xoè hết'], ['tired', 'KIỆT SỨC', 'Đuối sức, nghiêng ngửa, vẫy đuôi chậm'],
  ['air', 'TRÊN KHÔNG', 'Bị nhấc khỏi nước: treo đầu lên, giãy, há miệng và nắp mang'], ['landed', 'GIÃY', 'Nằm trên sàn giãy, lúc đầu mạnh rồi yếu dần']];
const kitM = () => S.motion !== 'auto';
const VISRC = {fb: 'theo FishBase', nhom: 'theo nhóm cá, gần đúng', nhat: 'chưa có tên Việt, đọc theo tên Nhật'};
const isCmp = () => document.body.classList.contains('cmp');
const galCols = () => (isCmp() && innerWidth < innerHeight ? 2 : 4); // màn dọc: bộ sưu tập 2 cột
// tên loài cho màn hẹp (bảng bên bị ẩn)
const mobName = document.createElement('div'); mobName.className = 'mang-mob'; app.appendChild(mobName);
document.head.insertAdjacentHTML('beforeend', `<style>.mang-mob{display:none;position:absolute;left:12px;top:160px;z-index:5;font:600 13px/1.35 'Be Vietnam Pro',system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);pointer-events:none;max-width:70vw}body.cmp .mang-mob{display:block}.mang-mob i{font-style:normal;opacity:.75;font-weight:500}</style>`);
const shown = (id) => (S.gallery ? true : S.compare ? CORE.has(id) : id === S.sel);

// ---------------- bảng: khung bể ở giữa, ngoài khung là nền trắng của nhà
ui.add(`<div style="position:absolute;left:344px;top:100px;width:912px;height:668px;border-radius:18px;box-shadow:0 0 0 2400px #fff,inset 0 0 0 .5px rgba(16,24,40,.12);pointer-events:none"></div>`);
ui.header({code: 'Mang', kicker: 'SINH HỌC 11 · HÔ HẤP VÀ TRAO ĐỔI KHÍ Ở ĐỘNG VẬT · CÁ XƯƠNG', title: 'Cá thở bằng mang', sub: 'BƠM HAI PHA · ÉP DÒNG · NGƯỢC DÒNG', hub: HUB_URL,
  right: [['≈ 1/38', 'Ô XI NƯỚC SO VỚI KHÍ'], ['≈ 75 %', 'Ô XI MANG LẤY ĐƯỢC'], ['35–82 cm/s', 'CHUYỂN SANG ÉP DÒNG'], ['1327 mm²/g', 'MANG CÁ NGỪ']]});
const BEATS = ['Nước nghèo ô xi', 'Bơm hai pha', 'Ép dòng', 'Cá ngừ', 'Cá chai', 'Ngược dòng', 'Diện tích mang', 'Nước ấm', '20 loài', 'Phim'];
const beatEl = ui.add(`<div style="position:absolute;left:348px;top:80px;width:904px;display:flex;gap:4px">${BEATS.map((b, i) => `<div data-b="${i}" style="flex:1;padding:3px 0 5px;border-bottom:2px solid ${C.line};font:600 11px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:${C.mute};white-space:nowrap"><span style="font:500 10px 'JetBrains Mono',monospace;color:${C.faint};margin-right:5px">${String(i + 1).padStart(2, '0')}</span>${b}</div>`).join('')}</div>`);
const setBeat = (i) => beatEl.querySelectorAll('[data-b]').forEach((n) => { const on = +n.dataset.b === i; n.style.borderBottomColor = on ? C.or : C.line; n.style.color = on ? C.ink : C.mute; });

ui.panel(28, 112, 300, 262, 'CÁCH THỞ · THEO TỐC ĐỘ', '01');
const modeTxt = ui.add(`<div style="position:absolute;left:42px;top:142px;font:700 17px/1.15 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.2px;color:${C.ink};width:272px"></div>`);
const ramSvg = ui.svg(42, 172, 272, 96);
const rRows = ['TỐC ĐỘ BƠI', 'PHẦN ÉP DÒNG', 'NHỊP ĐUÔI (BAINBRIDGE)', 'KIỂU CỦA LOÀI'].map((n, k) => [ui.text(42, 282 + k * 20, n), ui.text(150, 280 + k * 20, '', 'v', 'width:164px;text-align:right')]);
ui.panel(28, 386, 300, 206, 'ĐIỀU KHIỂN', '02');
const pick = ui.add(`<select aria-label="Chọn loài cá" style="position:absolute;left:42px;top:416px;width:272px;height:28px;pointer-events:auto;box-sizing:border-box;padding:0 8px;border:1px solid #e3e6ea;border-radius:8px;background:#fff;color:#1D1B16;font:600 12px 'Be Vietnam Pro',system-ui,sans-serif">
  <optgroup label="Có số đo mang">${FISHES.map((f) => `<option value="${f.id}">${f.vi} · ${f.sci}</option>`).join('')}</optgroup>
  <optgroup label="Bộ sưu tập Fish Kit">${ALL.filter((f) => !CORE.has(f.id)).map((f) => `<option value="${f.id}">${f.vi} · ${f.sci}</option>`).join('')}</optgroup></select>`);
pick.addEventListener('pointerdown', (e) => e.stopPropagation());
pick.addEventListener('change', () => { window.LIVE?.takeOver(); sim.act('f_' + pick.value); });
ui.buttons(FISHES.map((f) => ['f_' + f.id, f.vi.replace('Cá ', '').toUpperCase()]), 42, 450, 272);
ui.buttons([['stop', 'DỪNG'], ['fast', 'LAO NHANH'], ['prev', '‹'], ['next', 'LOÀI KHÁC ›']], 42, 480, 272);
const sl = {U: ui.slider('U', 42, 512, 272, 'TỐC ĐỘ BƠI', {lw: 92, vw: 74}), T: ui.slider('T', 42, 542, 272, 'NHIỆT ĐỘ NƯỚC', {lw: 92, vw: 74})};
ui.text(42, 566, 'NƯỚC BIỂN 35 ‰ · CÁ 1 KG · CỠ VẼ 40 CM · 20 LOÀI');
ui.panel(28, 604, 300, 162, 'MÁU VÀ NƯỚC TRONG PHIẾN MANG', '03');
const ccSvg = ui.svg(42, 634, 272, 84);
ui.buttons([['cc', 'CÙNG CHIỀU']], 42, 730, 120);
const ccTxt = ui.text(150, 733, '', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:10px;white-space:normal;width:164px;line-height:1.35');

ui.panel(1272, 112, 300, 270, 'Ô XI TRONG NƯỚC BIỂN', '04');
const oRows = ['Ô XI BÃO HOÀ', 'TRONG KHÔNG KHÍ (20 °C)', 'KHÔNG KHÍ NHIỀU GẤP', 'TIÊU HAO Ô XI LÚC NGHỈ', 'NƯỚC QUA MANG'].map((n, k) => [ui.text(1286, 146 + k * 20, n), ui.text(1430, 144 + k * 20, '', 'v', 'width:128px;text-align:right')]);
const needSvg = ui.svg(1286, 254, 272, 100);
const needCap = ui.text(1286, 360, '', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9.5px');
ui.panel(1272, 394, 300, 186, 'DIỆN TÍCH MANG · CÁ 1 KG', '05');
const areaSvg = ui.svg(1286, 426, 272, 112);
ui.text(1286, 544, '', 'sm', 'text-transform:none;letter-spacing:.2px;font-size:9.5px;white-space:normal;width:272px;line-height:1.4').innerHTML = 'Hàng rào nước–máu: họ cá thu ngừ 0,5–1,2 µm, cá khác 2–11 µm (Wegner 2010). Cá cóc tính từ 560,7·W^0,79 (Hughes và Gray 1972).';
ui.panel(1272, 592, 300, 174, 'THÁO TỪNG BỘ PHẬN', '06');
ui.buttons([['v_hero', 'TOÀN CẢNH'], ['v_side', 'BÊN'], ['v_head', 'ĐẦU'], ['v_top', 'TRÊN'], ['v_compare', 'BỐN LOÀI'], ['v_gallery', '20 LOÀI'], ['lookup', 'TRA CỨU LOÀI'], ['labels', 'NHÃN']], 360, 116, 800);
ui.text(362, 152, 'DÁNG', 'sm', 'color:rgba(255,255,255,.7);font-weight:600');
ui.buttons([...MOT.map(([k, l]) => ['m_' + k, l]), ['low', 'LƯỚI NHẸ']], 404, 148, 840);
const nameEl = ui.add(`<div style="position:absolute;left:364px;top:182px;font:600 13px/1.3 'Be Vietnam Pro',system-ui,sans-serif;color:#fff;white-space:nowrap"></div>`);
const bigK = ui.add(`<div style="position:absolute;left:364px;top:664px;font:600 11px 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:.6px;color:rgba(255,255,255,.72)">NƯỚC QUA MANG · 1 KG</div>`);
const bigV = ui.add(`<div style="position:absolute;left:362px;top:680px;font:700 38px/1.1 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.8px;color:#fff;font-variant-numeric:tabular-nums"></div>`);
const bigS = ui.add(`<div style="position:absolute;left:364px;top:728px;font:500 11px 'JetBrains Mono',monospace;color:rgba(255,255,255,.75);white-space:nowrap"></div>`);
ui.cap = ui.caption(348, 778, 904, 106);
{ const set = ui.cap.set; ui.cap.set = (c, i, n) => { setBeat(i); set(c, i, n); }; }
const alert = ui.alert(800, 186);
ui.callouts([{key: 'mieng', title: 'MIỆNG', sub: '—'}, {key: 'nap', title: 'NẮP MANG', sub: '—'}, {key: 'nguc', title: 'VÂY NGỰC', sub: 'LÁI · HÃM'}, {key: 'lung', title: 'VÂY LƯNG', sub: 'GIỮ THĂNG BẰNG'}, {key: 'duoi', title: 'VÂY ĐUÔI', sub: '—'},
  {key: 'c_saba', title: 'CÁ SABA', sub: 'CHUYỂN BƠM ↔ ÉP DÒNG'}, {key: 'c_kihada', title: 'CÁ NGỪ VÂY VÀNG', sub: 'LUÔN ÉP DÒNG'}, {key: 'c_seabass', title: 'CÁ VƯỢC NHẬT', sub: 'CHUYỂN BƠM ↔ ÉP DÒNG'}, {key: 'c_magochi', title: 'CÁ CHAI', sub: 'LUÔN BƠM'}, ...ALL.map((f) => ({key: 'g_' + f.id, title: `<em style="font-style:normal">${f.vi}</em>`, sub: f.fb.maxL ? `<em style="font-style:normal">tối đa ${f.fb.maxL.split(' (')[0]}</em>` : ''}))]); // thẻ HTML giữ chữ hoa của tên riêng (Nhật)
const callSub = Object.fromEntries(['mieng', 'nap', 'duoi'].map((k, i) => [k, ui.root.querySelectorAll('.call')[i]?.querySelector('span')]));

// ---------------- điểm trên cá (toạ độ kit, nhân chiều dài) → thế giới
const Lm = LEN / 100;
const PT = {mieng: [0, -0.004, 0.47], nap: [0.06, 0.0, 0.27], nguc: [0.075, -0.05, 0.2], lung: [0, 0.16, -0.02], duoi: [0, 0, -0.46]};
const wpt = (key, id = S.sel) => { const a = FISH[id].a, p = PT[key], bh = a.p.bodyHeight || 0.25; const y = key === 'lung' ? (0.5 * bh + 0.015) : p[1]; const v = a.object.localToWorld(new THREE.Vector3(p[0] * Lm, y * Lm, p[2] * Lm)); return [v.x, v.y, v.z]; };

// ---------------- tháo từng bộ phận
const SRC_TXT = `Số đo: ${SRC.wegner} (diện tích mang, trao đổi chất chuẩn, hàng rào nước–máu, cá ngừ bắt buộc ép dòng); ${SRC.hughes} (cá cóc); ${SRC.roberts} (ngưỡng ép dòng 35–82 cm/s, cá đáy không ép dòng); ${SRC.amnh} (mang lấy ≈ 75 % ô xi); ${SRC.benson} (ô xi hoà tan); Bainbridge 1958 (nhịp đuôi); FishBase (kích thước, môi trường sống của 20 loài); Hara và Sunobe 2021 (cá chai Platycephalus sp. 2); Martinez-Takeshita và cộng sự 2015 (cá cam vằn Nhật là S. aureovittata). Mô hình cá: Fish Kit của なちゃっと, CC0, dựng từ ảnh do máy sinh: chỉ để nhìn, không đo. Giả định: 75 % cho mọi loài, NTU = 3, cỡ vẽ 40 cm, nhịp vẽ miệng và nắp mang.`;
const cut = createCutaway({st, ui, parts: [
  {key: 'mieng', label: 'MIỆNG', open: (k) => { OPEN.mieng = k; }, at: () => wpt('mieng'), sub: () => 'pha 1: hút nước vào xoang miệng', cam: {az: 86, el: 2, d: 0.34}, card: () => cardOf('mieng')},
  {key: 'nap', label: 'NẮP MANG', open: (k) => { OPEN.nap = k; }, at: () => wpt('nap'), sub: () => 'bốn cung mang mỗi bên', cam: {az: -40, el: 10, d: 0.36}, card: () => cardOf('nap')},
  {key: 'lung', label: 'VÂY LƯNG', open: (k) => { OPEN.lung = k; }, at: () => wpt('lung'), sub: () => 'vây lưng và vây hậu môn', cam: {az: -28, el: 34, d: 0.62}, card: () => cardOf('lung')},
  {key: 'nguc', label: 'VÂY NGỰC', open: (k) => { OPEN.nguc = k; }, at: () => wpt('nguc'), sub: () => 'lái, hãm, giữ chỗ khi dừng', cam: {az: 78, el: -14, d: 0.46}, card: () => cardOf('nguc')},
  {key: 'duoi', label: 'VÂY ĐUÔI', open: (k) => { OPEN.duoi = k; }, at: () => wpt('duoi'), sub: () => `${vn(tailHz(speedOf(info()) + 0.6 * OPEN.duoi), 1)} lần vẫy mỗi giây`, cam: {az: -122, el: 14, d: 0.56}, card: () => cardOf('duoi')},
], explode: (k) => { EX = k; }, turn: (d) => { turn.rotation.y = d * D2R; }});
cut.pills(1286, 626, 272);
ui.text(1286, 728, '', 'sm', 'text-transform:none;letter-spacing:.3px;font-size:10px;white-space:normal;width:272px;line-height:1.45').innerHTML = 'Bấm một bộ phận: nó mở hết cỡ trong 1 giây, cá vẫn bơi, máy quay tới gần từ phía riêng.';

// ---------------- mô phỏng
const disp = S.disp;
// tra cứu mọi loài có số đo hô hấp trên FishBase (qua Refinery); loài có mô hình thì mở được trong bể
const lookup = createLookup({url: url('loai.json'), models: Object.fromEntries(ALL.map((f) => [f.sci, f.id])), onModel: (id) => { window.LIVE?.takeOver(); choose(id); }});
// chọn loài: loài chưa tải thì tải xong mới đổi (vẫn bơi con cũ trong lúc chờ)
function choose(id) {
  if (!BY[id]) return;
  S.wait = id;
  ensure([id]).then(() => { if (S.wait !== id) return; S.wait = ''; if (!FISH[id]) return; if (S.low) FISH[id].a.setDetail('low'); S.sel = id; say(`${BY[id].vi} · ${KIEU[BY[id].ram]}`); });
}
const defaults = () => Object.assign(S, {t: 0, sel: 'saba', U: 0.3, T: 20, counter: true, compare: false, gallery: false, wait: '', motion: 'auto', low: false, hist: [], log: [], note: ''});
const sim = {
  S, root, cut, FISH, photo: 'Cá dựng từ ảnh (Fish Kit, CC0): luật mật độ cơ cấu tối không áp dụng',
  reset() { defaults(); cut.reset(); Object.assign(disp, {labels: true}); say('cá saba bơi 30 cm/s · bơm miệng–nắp mang'); },
  busy: () => cut.busy(),
  isOn: (k) => (k === 'lookup' && lookup.isOpen()) || (k === 'cc' && !S.counter) || k === 'f_' + S.sel || (k === 'mnext' && kitM()) || (k === 'loadall' && Object.keys(FISH).length === ALL.length),
  act(k) {
    if (cut.act(k)) return;
    if (k in disp) { disp[k] = !disp[k]; return; }
    if (k.startsWith('m_')) { S.motion = k.slice(2); return; }
    if (k === 'lookup') { lookup.toggle(info().sci); return; }
    if (k === 'mnext') { const i = MOT.findIndex((m) => m[0] === S.motion); S.motion = MOT[(i + 1) % MOT.length][0]; return; }
    if (k === 'loadall') { S.galleryAsked = true; ensure(ALL.map((x) => x.id)); return; }
    if (k === 'low') { S.low = !S.low; for (const id in FISH) FISH[id].a.setDetail(S.low ? 'low' : 'auto'); return; }
    if (k.startsWith('f_')) { choose(k.slice(2)); return; }
    if (k === 'cc') { S.counter = !S.counter; return; }
    if (k === 'stop') { S.U = 0; return; }
    if (k === 'fast') { S.U = 0.95; return; }
    if (k === 'next' || k === 'prev') {
      const i = ALL.findIndex((f) => f.id === (S.wait || S.sel)); choose(ALL[(i + (k === 'next' ? 1 : ALL.length - 1)) % ALL.length].id);
    }
  },
  slide(k, t) {
    if (k === 'U') S.U = t * 1.0;
    if (k === 'T') S.T = 10 + 20 * t;
  },
  step(dt) {
    S.t += dt;
    cut.step(dt);
    // hạt lơ lửng trôi ngược chiều bơi
    const U = kitM() ? cur().a.currentSpeed : S.compare || S.gallery ? 0.2 : speedOf(info()) + 0.6 * OPEN.duoi;
    for (let i = 0; i < SNOW; i++) { let x = snowPos[i * 3] - (U + 0.01) * dt; if (x < -1.3) x += 2.6; snowPos[i * 3] = x; snowPos[i * 3 + 1] += Math.sin(S.t * 0.7 + i) * 0.0006 * dt; }
    snowGeo.attributes.position.needsUpdate = true;
    // cá: cập nhật dáng bơi của kit, rồi bài đặt nhịp thở
    const fr = 0.8 * needRatio(S.T); // nhịp vẽ (Hz), tỉ lệ với lượng nước cần
    for (const id in FISH) {
      const F = FISH[id]; if (!shown(id)) continue;
      const f = F.f; let Uf = S.compare || S.gallery ? (f.ram === 'bat-buoc' ? 0.7 : f.ram === 'khong' || F.y < Y0 ? 0 : 0.25) : speedOf(f) + 0.6 * OPEN.duoi;
      if (kitM()) { F.a.drive = null; F.a.setMotion(S.motion); } else { F.a.setMotion(Uf > 0.02 ? 'swim' : 'hover'); F.a.drive = Uf > 0.02 ? {speed: Uf, turnRate: 0} : null; }
      F.a.update(dt);
      if (kitM()) Uf = F.a.currentSpeed; // dáng của kit: kit tự đặt tốc độ, miệng, nắp mang
      const r = ramShare(f, Uf); F.ram += (r - F.ram) * Math.min(1, dt * 2);
      F.phase += dt * Math.PI * 2 * fr * (1 - 0.7 * F.ram);
      const pump = 1 - F.ram, mesh = F.a.mesh, mm = mesh.mouthMax || 0.35;
      const sel = id === S.sel ? 1 : 0, ex = EX * sel;
      const g = GILL * (0.5 - 0.5 * Math.cos(F.phase)) * pump + 0.1 * GILL * F.ram;
      const m = 0.6 * mm * (0.5 - 0.5 * Math.cos(F.phase + 1.4)) * pump + 0.3 * mm * F.ram;
      const cg = 1.7 * GILL * Math.max(OPEN.nap * sel, ex), cm = mm * Math.max(OPEN.mieng * sel, ex); // tháo: mở rộng hơn lúc thở để thấy mang đỏ
      if (!kitM()) { mesh.gill(Math.max(g, cg)); mesh.mouth(Math.max(m, cm)); } else { if (cg > 0.001) mesh.gill(cg); if (cm > 0.001) mesh.mouth(cm); }
      const kl = Math.max(OPEN.lung * sel, ex), kn = Math.max(OPEN.nguc * sel, ex);
      if (kl > 0.001 || kn > 0.001) mesh.finMove(F.a.finClock, 0.15, 0.45 * (1 - kl), 0, 0.25 * (1 - Math.max(kl, kn)), 0.12 + 0.3 * kn, 0.2);
    }
    // dòng nước qua mang của cá đang chọn
    const F = cur(); if (flow.parent !== F.a.object) F.a.object.add(flow);
    flow.visible = !S.compare && !S.gallery && !kitM();
    const pulse = Math.max(0, Math.sin(F.phase + 1.0)), rate = (1 - F.ram) * (0.25 + 1.6 * pulse) * fr + F.ram * (0.4 + 2.2 * U);
    for (let i = 0; i < FLOW; i++) { flowS[i] = (flowS[i] + dt * rate * (0.8 + 0.4 * ((i * 37) % 10) / 10)) % 1; flowPos.set(flowAt(flowS[i], flowSide[i], flowJ[i * 2], flowJ[i * 2 + 1], Lm), i * 3); }
    flowGeo.attributes.position.needsUpdate = true;
    if ((S.hT = (S.hT || 0) + dt) > 0.05) { S.hT = 0; S.hist.push(F.ram); if (S.hist.length > 120) S.hist.shift(); }
  },
  shadowAt() { return new THREE.Vector3(0, 0.05, 0); },
  pick: (hits) => soi(hits),
  measure() {
    const F = FISH.saba; turn.rotation.y = 0; root.updateWorldMatrix(true, true);
    const bx = new THREE.Box3(); F.a.object.traverse((o) => { if (o.isMesh) bx.expandByObject(o); }); // chỉ thân cá, không tính hạt nước
    const s = bx.getSize(new THREE.Vector3());
    return [{name: 'chiều dài mô hình cá (cm), đặt 40', got: s.x * 100, want: LEN, tol: 0.06},
      {name: 'ô xi bão hoà nước ngọt 20 °C (mg/L), bảng USGS 9,09', got: o2Sat(20, 0), want: 9.09, tol: 0.003},
      {name: 'SMR/diện tích × diện tích, cá ngừ vây vàng (mg/kg/h), bảng 3: 286', got: 215.5 * 1.327, want: 286, tol: 0.005},
      {name: 'SMR/diện tích × diện tích, cá saba (mg/kg/h), bảng 3: 132', got: 118.9 * 1.110, want: 132, tol: 0.005},
      {name: 'cá cam vằn: 3,31 mg/phút/kg × 60 (Clark và Seymour 2006) = 199 mg/kg/h', got: 3.31 * 60, want: BY.hiramasa.smr, tol: 0.005},
      {name: 'hiệu suất ngược dòng NTU 3, AMNH ≈ 75 %', got: effCounter(), want: UTIL, tol: 0.01},
      {name: 'mang cá ngừ vây vàng gấp cá cóc 1 kg, Wegner: "một bậc độ lớn"', got: 1327 / toadArea(1000), want: 10, tol: 0.15}];
  },
  draw() {
    const f = info(), F = cur(), U = kitM() ? F.a.currentSpeed : speedOf(f);
    const yOf = (G) => (S.motion === 'landed' ? 0.03 : S.motion === 'air' ? Y0 + 0.12 : G.y + (G.y < Y0 ? 0 : 0.004 * Math.sin(S.t * 0.8)));
    // vị trí: một con giữa nước, hoặc bốn loài xếp chồng để so
    const ORDER = ['saba', 'kihada', 'seabass', 'magochi'];
    if (S.gallery && !S.galleryAsked && !isCmp()) { S.galleryAsked = true; ensure(ALL.map((x) => x.id)); } // màn hẹp: chờ bấm "Tải đủ 20 loài"
    for (const id in FISH) { const G = FISH[id]; G.g.visible = shown(id); G.g.scale.setScalar(S.gallery ? 0.75 : 1);
      if (S.gallery) { const k = ALL.findIndex((x) => x.id === id), c = galCols(); G.g.position.set((k % c - (c - 1) / 2) * 0.4, (c === 4 ? 0.86 : 1.58) - Math.floor(k / c) * (c === 4 ? 0.19 : 0.17), 0); continue; }
      if (S.compare) { const k = ORDER.indexOf(id); G.g.position.set(k % 2 ? 0.25 : -0.25, [0.44, 0.44, 0.22, 0.035][k], 0); } else G.g.position.set(0, yOf(G), 0); }
    snow.visible = true;
    // sương nước theo khoảng cách máy: góc xa (bộ sưu tập, bốn loài) đẩy sương ra xa, nếu không cá chìm vào nền
    { const far = S.gallery || S.compare; st.scene.fog.near = far ? 4 : 1.6; st.scene.fog.far = far ? 16 : 5.5; }
    cut.draw();
    // bảng 01: phần ép dòng theo tốc độ
    modeTxt.textContent = F.ram > 0.85 ? 'Ép dòng: há miệng mà bơi' : F.ram > 0.15 ? 'Đang chuyển sang ép dòng' : 'Bơm miệng–nắp mang';
    { const X = (u) => 8 + u * 256, Yr = (r) => 84 - r * 70; let g = `<rect x="0" y="0" width="272" height="96" fill="${C.chart}" stroke="${C.line}"/>`;
      g += `<rect x="${X(RAM.lo)}" y="10" width="${X(RAM.hi) - X(RAM.lo)}" height="76" fill="${C.or}" opacity="0.08"/><line x1="${X(RAM.mid)}" y1="10" x2="${X(RAM.mid)}" y2="86" stroke="${C.or}" stroke-dasharray="2 2"/>`;
      let d = ''; for (let u = 0; u <= 1.0001; u += 0.02) d += `${u ? 'L' : 'M'}${X(u).toFixed(1)} ${Yr(ramShare(f, u)).toFixed(1)}`;
      g += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="1.6"/><circle cx="${X(U)}" cy="${Yr(F.ram)}" r="4" fill="${C.or}"/>`;
      g += `<text x="${X(RAM.lo)}" y="94" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}" text-anchor="middle">35</text><text x="${X(RAM.mid)}" y="8" font-family="JetBrains Mono" font-size="8.5" fill="${C.or}" text-anchor="middle">≈ 65 cm/s</text><text x="${X(RAM.hi)}" y="94" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}" text-anchor="middle">82</text>`;
      g += `<text x="6" y="20" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">ép dòng</text><text x="6" y="82" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">bơm</text>`;
      ramSvg.innerHTML = g; }
    rRows[0][1].textContent = `${vn(U * 100, 0)} cm/s · ${vn(U / Lm, 1)} thân/s`; rRows[1][1].textContent = `${vn(F.ram * 100, 0)} %`;
    rRows[2][1].textContent = U > 0.02 ? `${vn(tailHz(U), 1)} lần/s` : 'đứng yên'; rRows[3][1].textContent = f.ram === 'bat-buoc' ? 'luôn ép dòng' : f.ram === 'khong' ? 'luôn bơm' : f.ram ? 'chuyển theo tốc độ' : 'chưa có số đo'; if (f.ramSuy) rRows[3][1].textContent = (f.ram === 'khong' ? 'luôn bơm' : 'đổi theo tốc độ') + ' (suy)';
    sl.U.set(S.U, `${vn(S.U * 100, 0)} cm/s`); sl.T.set((S.T - 10) / 20, `${vn(S.T, 0)} °C`);
    // bảng 03: ngược dòng / cùng chiều
    { const X = (x) => 6 + x * 260, Y = (v) => 76 - v * 66; let g = `<rect x="0" y="0" width="272" height="84" fill="${C.chart}" stroke="${C.line}"/>`;
      let dw = '', db = ''; for (let i = 0; i <= 40; i++) { const x = i / 40, p = profile(x, S.counter); dw += `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(p.w).toFixed(1)}`; db += `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(p.b).toFixed(1)}`; }
      g += `<path d="${dw}" fill="none" stroke="${C.blue}" stroke-width="1.8"/><path d="${db}" fill="none" stroke="${C.or}" stroke-width="1.8"/>`;
      const ah = (x, y, dir, c) => `<path d="M${X(x)} ${y} l${-6 * dir} -3.5 l0 7 Z" fill="${c}"/>`;
      g += ah(0.97, 10, 1, C.blue) + `<text x="${X(0.02)}" y="13" font-family="JetBrains Mono" font-size="8.5" fill="${C.blue}">nước →</text>`;
      g += S.counter ? ah(0.03, 80, -1, C.or) + `<text x="${X(0.98)}" y="82" text-anchor="end" font-family="JetBrains Mono" font-size="8.5" fill="${C.or}">← máu</text>` : ah(0.97, 80, 1, C.or) + `<text x="${X(0.02)}" y="82" font-family="JetBrains Mono" font-size="8.5" fill="${C.or}">máu →</text>`;
      ccSvg.innerHTML = g; }
    const eff = S.counter ? effCounter() : effCo();
    ccTxt.innerHTML = `${S.counter ? 'Ngược dòng' : 'Cùng chiều'}: máu ra mang lấy được <b style="color:${C.or}">${vn(eff * 100, 0)} %</b> ô xi của nước vào. Mô hình NTU = ${NTU} (giả định).`;
    // bảng 04: ô xi, trao đổi chất, lượng nước
    const C0 = o2Sat(S.T), smr = f.smr ? smrAt(f.smr, S.T, f.smrT) : null, need = f.smr ? waterPerMin(f.smr, S.T, f.smrT) : null;
    oRows[0][1].textContent = `${vn(C0, 2)} mg/L`; oRows[1][1].textContent = `${vn(AIR_O2, 0)} mg/L`; oRows[2][1].textContent = `${vn(AIR_O2 / C0, 0)} lần`;
    oRows[3][1].textContent = smr ? `${vn(smr, 0)} mg/kg/h` : 'chưa có số đo'; oRows[4][1].textContent = need ? `${vn(need, 2)} L/phút` : `× ${vn(needRatio(S.T), 2)} so 20 °C`;
    { const X = (t) => 8 + ((t - 10) / 20) * 256; const ref = ALL.filter((x) => x.smr); const mx = waterPerMin(286, 30) * 1.08, Y = (v) => 90 - (v / mx) * 80;
      let g = `<rect x="0" y="0" width="272" height="100" fill="${C.chart}" stroke="${C.line}"/>`;
      for (const x of ref) { let d = ''; for (let t = 10; t <= 30.01; t += 1) d += `${t === 10 ? 'M' : 'L'}${X(t).toFixed(1)} ${Y(waterPerMin(x.smr, t, x.smrT)).toFixed(1)}`; g += `<path d="${d}" fill="none" stroke="${x.id === f.id ? C.or : C.ink}" stroke-width="${x.id === f.id ? 2 : 1.2}" opacity="${x.id === f.id ? 1 : 0.55}"/><text x="${X(30) - 2}" y="${Y(waterPerMin(x.smr, 30, x.smrT)) - 4}" text-anchor="end" font-family="JetBrains Mono" font-size="8.5" fill="${x.id === f.id ? C.or : C.mute}">${x.id === f.id || x.id === 'kihada' ? x.smrShort : ''}</text>`; }
      g += `<line x1="${X(S.T)}" y1="8" x2="${X(S.T)}" y2="92" stroke="${C.mute}" stroke-dasharray="2 2"/>`;
      g += `<text x="6" y="12" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">L/phút cho 1 kg</text><text x="${X(10)}" y="99" font-family="JetBrains Mono" font-size="8" fill="${C.mute}">10 °C</text><text x="${X(30)}" y="99" text-anchor="end" font-family="JetBrains Mono" font-size="8" fill="${C.mute}">30 °C</text>`;
      needSvg.innerHTML = g; }
    needCap.textContent = 'nước = SMR ÷ (ô xi × 75 %) · SMR ×2 mỗi 10 °C';
    // bảng 05: diện tích mang
    { const bars = [['cá ngừ vằn', SKIPJACK, false], ['cá ngừ vây vàng', 1327, f.id === 'kihada'], ['cá saba', 1110, f.id === 'saba'], ['cá cóc (đáy)', toadArea(1000), false]];
      let g = `<rect x="0" y="0" width="272" height="112" fill="${C.chart}" stroke="${C.line}"/>`;
      bars.forEach(([n, v, on], i) => { const y = 10 + i * 25, w = (v / 1900) * 150; g += `<text x="6" y="${y + 12}" font-family="JetBrains Mono" font-size="9" fill="${C.mute}">${n}</text><rect x="100" y="${y + 2}" width="${w.toFixed(1)}" height="14" fill="${on ? C.or : C.ink}"/><text x="${104 + w}" y="${y + 13}" font-family="JetBrains Mono" font-size="9" fill="${C.ink}">${vn(v, 0)}</text>`; });
      g += `<text x="266" y="108" text-anchor="end" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">mm² mỗi gam cơ thể</text>`; areaSvg.innerHTML = g; }
    // số lớn
    for (const e of [bigK, bigV, bigS]) e.style.display = S.gallery ? 'none' : '';
    bigV.textContent = need ? `${vn(need, 2)} L/phút` : `× ${vn(needRatio(S.T), 2)}`;
    bigS.textContent = need ? `${f.vi} · ${vn(S.T, 0)} °C · ô xi ${vn(C0, 1)} mg/L · lấy 75 %` : `${f.vi}: chưa có SMR có nguồn, chỉ so với 20 °C`;
    for (const kk of Object.keys(disp)) ui.setOn(kk, disp[kk]);
    for (const x of FISHES) ui.setOn('f_' + x.id, x.id === S.sel);
    ui.setOn('cc', !S.counter); ui.setOn('stop', S.U < 0.01); ui.setOn('fast', S.U > 0.9);
    ui.setOn('v_compare', S.compare); ui.setOn('v_gallery', S.gallery); for (const [k] of MOT) ui.setOn('m_' + k, S.motion === k); ui.setOn('low', S.low);
    if (document.activeElement !== pick && pick.value !== (S.wait || S.sel)) pick.value = S.wait || S.sel;
    const nLoaded = Object.keys(FISH).length;
    const nL = Object.keys(FISH).length;
    mobName.innerHTML = S.gallery ? `Bộ sưu tập · ${nL}/${ALL.length} loài${nL < ALL.length ? (LOADING.size > nL - 4 ? ' · đang tải…' : '<br><i>Bấm “Tải đủ 20 loài” (khoảng 9 MB)</i>') : ''}` : `${f.vi}${S.wait ? ' <i>· đang tải ' + BY[S.wait].vi.toLowerCase() + '…</i>' : ''}<br><i>${f.sci}${kitM() ? ' · ' + MOT.find((m) => m[0] === S.motion)[1].toLowerCase() : ''}</i>`;
    nameEl.innerHTML = S.gallery ? `Bộ sưu tập Fish Kit · ${nLoaded}/${ALL.length} loài${nLoaded < ALL.length ? ' · đang tải…' : ''} · cỡ vẽ bằng nhau` : S.compare ? 'Bốn loài có số đo mang' : `${kitM() ? '<span style="opacity:.85;font-weight:500">Dáng của kit: ' + MOT.find((m) => m[0] === S.motion)[2] + '</span><br>' : ''}${f.vi} <span style="opacity:.7;font-weight:500">· ${f.sci} · ${ALL.findIndex((x) => x.id === S.sel) + 1}/${ALL.length}${S.wait ? ' · đang tải ' + BY[S.wait].vi.toLowerCase() + '…' : ''}</span>`;
    alert.set(f.ram === 'bat-buoc' && S.U < RAM.mid && !S.compare && !S.gallery ? 'CÁ NGỪ KHÔNG BƠM ĐƯỢC NƯỚC: GIỮ ≥ 65 CM/S' : '');
    if (callSub.mieng) callSub.mieng.textContent = F.ram > 0.85 ? 'HÉ MỞ, NƯỚC TỰ VÀO' : 'HÁ RỒI KHÉP';
    if (callSub.nap) callSub.nap.textContent = F.ram > 0.85 ? 'HÉ, NƯỚC CHẢY ĐỀU' : 'MỞ SAU MIỆNG';
    if (callSub.duoi) callSub.duoi.textContent = U > 0.02 ? `${vn(tailHz(U), 1)} LẦN/S` : 'ĐỨNG YÊN';
    const P = (v) => { const q = st.project(v[0], v[1], v[2]); return q && q[0] > 360 && q[0] < 1240 && q[1] > 150 && q[1] < 700 ? q : null; }; // chỉ nhãn trong khung bể
    const lab = disp.labels && !cut.active && EX < 0.05 ? 1 : 0;
    // nhãn nằm trong khung bể: lật phía nếu nhãn tràn ra ngoài
    const fit = (list) => list.map((c) => { if (!c.p) return c; let {dx, dy} = c; if (c.p[0] + dx < 380 || c.p[0] + dx - (dx < 0 ? 150 : 0) < 360) dx = Math.abs(dx); if (c.p[0] + dx + (dx > 0 ? 160 : 0) > 1244) dx = -Math.abs(dx); if (c.p[1] + dy < 160 || c.p[1] + dy > 640) dy = -dy; return {...c, dx, dy}; });
    const parts5 = ['mieng', 'nap', 'nguc', 'lung', 'duoi'], none = (keys) => keys.map((key) => ({key, p: null}));
    const gKeys = ALL.map((x) => 'g_' + x.id), cKeys = FISHES.map((x) => 'c_' + x.id);
    if (S.gallery) ui.drawCallouts([...none(parts5), ...none(cKeys), ...ALL.map((x) => ({key: 'g_' + x.id, p: FISH[x.id] ? P(wpt('mieng', x.id)) : null, dx: -30, dy: 34}))], lab, '#ffffff');
    else if (S.compare) ui.drawCallouts(fit([...none(parts5), ...none(gKeys), ...FISHES.map((x) => ({key: 'c_' + x.id, p: FISH[x.id] ? P(wpt('lung', x.id)) : null, dx: 24, dy: -44}))]), lab, '#ffffff');
    else ui.drawCallouts(fit([{key: 'mieng', p: P(wpt('mieng')), dx: 80, dy: -70}, {key: 'nap', p: P(wpt('nap')), dx: -40, dy: -110}, {key: 'nguc', p: P(wpt('nguc')), dx: 60, dy: 80}, {key: 'lung', p: P(wpt('lung')), dx: -110, dy: -60}, {key: 'duoi', p: P(wpt('duoi')), dx: -80, dy: 70},
      ...none(cKeys), ...none(gKeys)]), lab, '#ffffff');
  },
};

// ---------------- soi chi tiết
function cardOf(part) {
  const base = {src: SRC_TXT}, f = info();
  if (part === 'ca') return {...base, k: `${f.sci}${f.fb.author ? ' · ' + f.fb.author : ''}`, t: f.vi, b: `${f.fb.note ? f.fb.note[0].toUpperCase() + f.fb.note.slice(1) + ' (FishBase). ' : ''}${f.ja ? 'Tên Nhật trong kit: ' + f.ja + '. ' : ''}Kiểu thở: ${KIEU[f.ram]}${f.ramSuy ? ', suy theo lối sống và quy luật chung của Roberts 1975, chưa đo ở loài này' : ' (' + RAM_SRC[f.id] + ')'}. Mô hình từ Fish Kit (CC0), dựng từ ảnh do máy sinh: hình dáng chỉ minh hoạ.`,
    rows: [['Dài tối đa (FishBase)', f.fb.maxL || '—'], ...(f.fb.comL ? [['Dài thường gặp', f.fb.comL]] : []), ...(f.fb.maxW ? [['Nặng tối đa', f.fb.maxW]] : []), ['Môi trường', f.fb.env || '—'], ...(f.fb.depth ? [['Độ sâu', f.fb.depth]] : []), ['Diện tích mang, cá 1 kg', f.area ? `${vn(f.area, 0)} mm²/g` : 'chưa có số đo'], ['Phiến mang thứ cấp', f.lam ? `${f.lam} mỗi mm` : '—'], ['Hàng rào nước–máu', f.barrier ? `${f.barrier} µm` : 'chưa có số đo'], ['Tiêu hao ô xi lúc nghỉ', f.smr ? `${vn(f.smr, 0)} mg O₂/kg/h ở ${f.smrT} °C` : 'chưa có số đo'], ...(f.smrNote ? [['Số đo ấy', f.smrNote]] : []), ...(f.ja ? [['Tên Việt', VISRC[f.viSrc || 'nhom']]] : []), ['Phần ép dòng lúc này', () => `${vn(cur().ram * 100, 0)} %`]]};
  if (part === 'mieng') return {...base, k: 'Pha 1 của bơm', t: 'Miệng và xoang miệng', b: 'Miệng mở, nền xoang miệng hạ xuống: thể tích tăng, áp suất giảm, nước bị hút vào. Miệng khép, xoang miệng nâng lên ép nước ra sau qua mang. Van ở môi giữ nước không trào ngược ra miệng.',
    rows: [['Nhịp vẽ', () => `${vn(0.8 * needRatio(S.T) * (1 - 0.7 * cur().ram), 2)} lần/s (minh hoạ)`], ['Khi ép dòng', 'hé mở, không bơm']]};
  if (part === 'nap') return {...base, k: 'Pha 2 của bơm', t: 'Nắp mang và mang', b: 'Xoang nắp mang nở ra hút nước từ xoang miệng qua các lá mang; khi nó co lại, mép nắp mang mở cho nước ra. Hai xoang lệch pha nên nước qua mang gần như liên tục, một chiều. Dưới nắp là bốn cung mang mỗi bên, mỗi cung mang hai hàng sợi mang phủ đầy phiến mang thứ cấp.',
    rows: [['Ô xi mang lấy được', '≈ 75 % (AMNH)'], ['Phiến mang thứ cấp, cá saba', '30–36 mỗi mm'], ['Phiến mang thứ cấp, cá cóc', '10–13 mỗi mm'], ['Nước qua mang (1 kg)', () => (info().smr ? `${vn(waterPerMin(info().smr, S.T, info().smrT), 2)} L/phút` : '—')]]};
  if (part === 'lung') return {...base, k: 'Giữ thăng bằng', t: 'Vây lưng và vây hậu môn', b: 'Hai vây lẻ dọc sống lưng và bụng dựng lên giữ cá không lật nghiêng và không lắc ngang; khi lao nhanh cá xếp chúng sát thân cho đỡ cản nước.', rows: [['Khi lao nhanh', 'xếp sát thân']]};
  if (part === 'nguc') return {...base, k: 'Lái và hãm', t: 'Vây ngực', b: 'Đôi vây ngực xoè ra như bánh lái và phanh: rẽ, hãm, chúc lên xuống, và chèo nhẹ để giữ chỗ khi cá dừng lại thở bằng bơm.', rows: [['Khi dừng', 'chèo giữ chỗ']]};
  if (part === 'duoi') return {...base, k: 'Đẩy cá tiến', t: 'Vây đuôi', b: 'Khúc đuôi và vây đuôi quạt sang hai bên đẩy cá tiến lên. Nhịp vẫy tăng theo tốc độ: Bainbridge (1958) đo ở cá hồi, cá vàng, cá dace được U = L/4·(3f − 4).',
    rows: [['Tốc độ', () => `${vn(speedOf(info()) * 100, 0)} cm/s`], ['Nhịp đuôi theo Bainbridge', () => `${vn(tailHz(speedOf(info())), 2)} lần/s`], ['Chiều dài cá (vẽ)', `${LEN} cm`]]};
  return null;
}
const soi = picker((part, holder) => { if (part === 'ca' && holder.userData.fish && FISH[holder.userData.fish]) S.sel = holder.userData.fish; return cardOf(part); }); // bấm cá nào (kể cả trong bộ sưu tập) thì chọn cá đó

// ---------------- góc nhìn (theo cá đang chọn)
const tgt = () => [0.02, cur().g.position.y || Y0, 0];
const views = {
  hero: (t) => { const p = tgt(); return {tx: p[0], ty: p[1] + 0.01, tz: 0, az: 42 + 5 * Math.sin(t * 0.12), el: 12, d: 1.2, sx: 0, sy: -20}; },
  side: () => { const p = tgt(); return {tx: p[0], ty: p[1], tz: 0, az: 0, el: 3, d: 1.1, sx: 0, sy: -20}; },
  head: () => { const p = wpt('nap'); return {tx: p[0] + 0.03, ty: p[1], tz: 0, az: 30, el: 8, d: 0.42, sx: 0, sy: -20}; },
  top: () => { const p = tgt(); return {tx: p[0], ty: p[1], tz: 0, az: 0, el: 80, d: 1.2, sx: 0, sy: -20}; },
  compare: () => ({tx: 0, ty: 0.25, tz: 0, az: 10, el: 6, d: 2.1, sx: 0, sy: -20}),
  gallery: () => (galCols() === 4 ? {tx: 0, ty: 0.48, tz: 0, az: 6, el: 4, d: 3.8, sx: 0, sy: -20} : {tx: 0, ty: 1.3, tz: 0, az: 0, el: 3, d: 4.9, sx: 0, sy: 0}),
};
views.cut = (t) => cut.view(views.hero(t)) || views.hero(t);
// góc "Bốn loài" bật chế độ so sánh, các góc khác tắt (góc đang dùng được gọi mỗi khung)
for (const k of Object.keys(views)) { const v = views[k]; views[k] = (...a) => { if (k !== 'cut') { S.compare = k === 'compare'; S.gallery = k === 'gallery'; } return v(...a); }; }

// ---------------- bài giảng
const CAP = [
  {k: 'CÁ SABA · SCOMBER JAPONICUS', t: 'Nước nghèo ô xi hơn không khí gần 40 lần', b: 'Một lít nước biển 20 °C chỉ hoà tan được khoảng 7,4 mg ô xi, trong khi một lít không khí chứa 279 mg. Nước lại nặng và đặc hơn không khí nhiều lần. Muốn sống trong nước, mang phải cho rất nhiều nước đi qua và lấy được phần lớn ô xi trong đó: khoảng 75 %.', e: '279 mg/L ÷ 7,4 mg/L ≈ 38'},
  {k: 'BƠM MIỆNG–NẮP MANG', t: 'Hai cái bơm lệch pha', b: 'Khi cá đứng yên, miệng há ra trước: xoang miệng nở, nước bị hút vào. Miệng khép, xoang miệng ép nước ra sau; lúc ấy xoang nắp mang nở rồi mép nắp mang mở cho nước ra. Hai pha so le nên nước qua mang gần như liên tục và một chiều (hạt cam).', e: 'miệng mở → miệng khép, nắp mang mở → lặp lại',
    ask: {q: 'Vì sao miệng và nắp mang không mở cùng một lúc?', o: ['Để cá đỡ tốn sức', 'Để nước chỉ đi một chiều: vào miệng, qua mang, ra nắp mang', 'Vì cá không điều khiển được nắp mang'], a: 1, e: 'Nếu mở cùng lúc, nước có thể chảy ngược ra miệng. Lệch pha giữ dòng nước đi một chiều qua các lá mang.'}},
  {k: 'ÉP DÒNG · ROBERTS 1975', t: 'Bơi đủ nhanh thì thôi bơm', b: 'Kéo tốc độ lên: từ khoảng 35 cm/s, nhịp bơm thưa dần; đến khoảng 65 cm/s phần lớn loài đo được đã chuyển hẳn sang ép dòng: há miệng mà bơi, nước tự ép qua mang. Ép dòng ở cá ngừ vằn chỉ tốn 1–3 % năng lượng, trong khi ước lượng công bơm lúc nghỉ dao động 0,5–43 %.', e: 'chuyển hẳn ở 35–82 cm/s tuỳ loài'},
  {k: 'CÁ NGỪ VÂY VÀNG · THUNNUS ALBACARES', t: 'Cá ngừ không được dừng', b: 'Cá ngừ là loài bắt buộc ép dòng: chúng không dùng xoang nắp mang để đẩy nước, nên phải bơi suốt đời. Đổi lại, mang của chúng lớn nhất trong các loài cá: 1327 mm² mỗi gam ở con 1 kg, hàng rào giữa nước và máu chỉ dày 0,5–1,2 µm.', e: 'dừng bơi = không có nước qua mang'},
  {k: 'CÁ CHAI · CÁ ĐÁY', t: 'Cá nằm phục thì luôn bơm', b: 'Cá chai nằm im dưới đáy cát rình mồi. Theo Roberts, cá đáy có hệ tia nắp mang lớn nói chung không thở ép dòng: chúng bơm nước bằng miệng và nắp mang cả khi bơi. Kéo tốc độ lên cũng không đổi kiểu thở.', e: 'cá đáy: bơm · cá nổi bơi nhanh: ép dòng'},
  {k: 'TRAO ĐỔI NGƯỢC DÒNG', t: 'Máu chảy ngược chiều nước', b: 'Trong mỗi phiến mang, máu chảy ngược chiều với nước. Dọc suốt phiến, nước luôn giàu ô xi hơn máu bên cạnh một chút, nên máu lấy được phần lớn ô xi. Bấm “Cùng chiều”: hai dòng nhanh chóng bằng nhau rồi thôi trao đổi, máu lấy được nhiều nhất một nửa.', e: 'ngược dòng ≈ 75 % · cùng chiều ≤ 50 %',
    ask: {q: 'Nếu máu chảy cùng chiều với nước, máu lấy được tối đa bao nhiêu phần ô xi của nước vào?', o: ['Khoảng một nửa', 'Gần hết', 'Không lấy được chút nào'], a: 0, e: 'Cùng chiều thì hai dòng tiến tới cân bằng ở giữa: máu cao nhất bằng nửa lượng ô xi của nước vào.'}},
  {k: 'DIỆN TÍCH VÀ ĐỘ MỎNG', t: 'Bốn loài, bốn bộ mang', b: 'Khí khuếch tán qua mang càng nhanh khi diện tích càng lớn và hàng rào càng mỏng. Cá ngừ vây vàng 1 kg có 1327 mm² mang mỗi gam, cá saba 1110; cá cóc sống đáy chỉ khoảng 130, ít hơn khoảng mười lần. Cá bơi nhanh, tiêu nhiều ô xi thì mang lớn và mỏng.', e: 'tốc độ khuếch tán ∝ diện tích × chênh lệch nồng độ ÷ bề dày'},
  {k: 'NƯỚC ẤM', t: 'Nước ấm: ít ô xi hơn, cá cần nhiều hơn', b: 'Kéo nhiệt độ từ 20 lên 30 °C: ô xi bão hoà giảm từ 7,4 xuống 6,2 mg/L, còn trao đổi chất của cá biến nhiệt tăng khoảng gấp đôi. Cá saba 1 kg phải cho lượng nước qua mang tăng khoảng 2,4 lần; nhịp bơm của cá đứng yên nhanh hẳn lên.', e: 'nước = SMR ÷ (ô xi × 75 %)',
    ask: {q: 'Vì sao mùa hè nóng, cá trong ao hay nổi đầu?', o: ['Vì cá thích nắng', 'Vì nước ấm hoà tan ít ô xi hơn trong khi cá cần nhiều ô xi hơn', 'Vì nước ấm nặng hơn'], a: 1, e: 'Hai hiệu ứng cùng chiều: ô xi hoà tan giảm và trao đổi chất tăng, nên cá thiếu ô xi và lên mặt nước nơi có lớp nước giàu ô xi hơn.'}},
  {k: 'BỘ SƯU TẬP FISH KIT', t: 'Hai mươi loài, mỗi loài một dáng', b: 'Cá nổi bơi nhanh như cá thu, cá cam thân thon hình thoi; cá sống đáy như cá chai, cá kasago thân dẹt hoặc to đầu; cá hố dài như dải băng. Bấm một con để đưa nó vào bài: thở, dòng nước qua mang, tháo từng bộ phận. Năm loài có số đo tiêu hao ô xi; các loài khác ghi rõ chưa có số đo. Nút “Tra cứu loài” mở dữ liệu hô hấp của hơn 350 loài trên FishBase.', e: 'chọn loài: danh sách, góc “20 loài”, nút “Loài khác”'},
  {k: 'PHIM THÁO RỜI', t: 'Từng bộ phận, rồi cả con', b: 'Miệng, nắp mang, vây lưng, vây ngực, vây đuôi lần lượt mở hết cỡ dưới góc máy riêng, rồi cả con mở cùng lúc trên bàn xoay. Bấm từng nút ở bảng 06 để tự xem.', e: 'miệng → nắp mang → vây lưng → vây ngực → vây đuôi → cả con'},
];
const ev = [], at = (t, o) => ev.push({at: t, ...o});
at(0.2, {cap: 0}); at(1, {click: 'v_hero'});
at(10, {cap: 1}); at(10.5, {slide: 'U', to: 0, dur: 1.5}); at(12, {click: 'v_head'}); at(16, {click: 'cut_nap'}); at(21.5, {click: 'cut_nap'});
at(24, {cap: 2}); at(24.5, {click: 'v_side'}); at(25, {slide: 'U', to: 0.95, dur: 6}); at(32, {click: 'v_hero'});
at(35, {cap: 3}); at(35.5, {click: 'f_kihada'}); at(37, {slide: 'U', to: 0.75, dur: 2}); at(40, {click: 'v_head'});
at(44, {cap: 4}); at(44.5, {click: 'f_magochi'}); at(45, {slide: 'U', to: 0, dur: 1.5}); at(46.5, {click: 'v_hero'}); at(49, {slide: 'U', to: 0.6, dur: 2});
at(53, {cap: 5}); at(53.5, {click: 'f_saba'}); at(54, {slide: 'U', to: 0.3, dur: 1}); at(56, {click: 'cc'}); at(60, {click: 'cc'});
at(62, {cap: 6}); at(62.5, {click: 'v_compare'}); at(69, {click: 'v_hero'});
at(70, {cap: 7}); at(70.5, {slide: 'U', to: 0, dur: 1}); at(71.5, {click: 'v_head'}); at(72, {slide: 'T', to: 1, dur: 4}); at(77, {slide: 'T', to: 0.5, dur: 1.5});
at(80, {cap: 8}); at(80.5, {click: 'v_gallery'}); at(85, {click: 'm_range'}); at(89, {click: 'm_auto'}); at(89.5, {click: 'v_hero'});
at(90, {cap: 9}); at(90.2, {slide: 'U', to: 0.3, dur: 0.6}); at(90.5, {click: 'cut_film'});
ev.sort((a, b) => a.at - b.at);

sim.reset();
runLive({stage: st, ui, sim, views, captions: CAP, script: {events: ev, duration: 90.5 + cut.duration + 2}, firstView: 'hero',
  extra: [{key: 'stop', label: 'Dừng'}, {key: 'fast', label: 'Lao nhanh'}, {key: 'next', label: 'Loài khác'}, {key: 'mnext', label: 'Dáng khác'}, {key: 'loadall', label: 'Tải đủ 20 loài'}, {key: 'lookup', label: 'Tra cứu loài'}, {key: 'cc', label: 'Cùng chiều'}],
  shell: {subject: 'Sinh học 11 · hô hấp ở động vật', objectives: ['Trình bày cơ chế bơm miệng–nắp mang và thông khí ép dòng ở cá xương', 'Giải thích vì sao trao đổi ngược dòng giúp mang lấy được phần lớn ô xi trong nước', 'Liên hệ diện tích mang, nhiệt độ nước và nhu cầu ô xi với lối sống của từng loài cá'],
    credit: 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial, claude-motion của whaleyxbt và cutaway của Nyxera0x (MIT). Mô hình cá: Fish Kit của なちゃっと (@nachat_dayo), CC0. Số đo theo Wegner và cộng sự (2010), Hughes và Gray (1972), Roberts (1975), Benson và Krause (1984), AMNH; chỗ giả định ghi rõ trong thẻ soi.'},
  keys: {k: 'lookup', 1: 'v_hero', 2: 'v_side', 3: 'v_head', 4: 'v_top', 5: 'v_compare', 6: 'v_gallery', l: 'next', s: 'stop', f: 'fast', c: 'cc', n: 'labels', q: 'cut_mieng', w: 'cut_nap', e: 'cut_lung', r: 'cut_nguc', d: 'cut_duoi', g: 'cut_film', t: 'cut_all'}});
