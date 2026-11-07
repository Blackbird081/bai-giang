// Vỏ trang chạy trực tiếp dùng chung: khung 1600 × 900 co theo cửa sổ, ba bậc chất lượng tự hạ khi máy yếu,
// xoay/thu phóng bằng chuột hoặc ngón tay, chuyến tham quan tự chạy có con trỏ bấm từng nút kèm lời giảng;
// chạm vào bất cứ đâu là người xem cầm lái, 25 giây không thao tác thì tham quan chạy lại.
// Cách tổ chức theo live.js của teardown (MIT).
import * as THREE from 'three';
import {warmComposer} from './warm.js';
import {sc} from './ui.js';

const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const CSS = (W, H) => `
html,body{background:#ffffff;overflow:hidden;margin:0}
#app{position:fixed!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{position:absolute;left:0;top:0;width:${W}px!important;height:${H}px!important;touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.bt{pointer-events:auto;cursor:pointer}
.bt:hover{filter:brightness(.96)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:24px;padding:0 12px;border:1px solid #e7e9ed;border-radius:4px;background:rgba(255,255,255,.95);color:#15171C;font:600 11px Inter,system-ui,sans-serif;letter-spacing:0;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#e3562a}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:14px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#626773;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
body.cmp .turn{display:none}
body.cmp #app{width:100vw!important;height:100svh!important;transform:none!important}
body.cmp #gl{width:100vw!important;height:100svh!important}
body.cmp #app>.ui{display:none}
.mob{display:none;position:fixed;z-index:20;font-family:var(--bg-font,Inter,system-ui,sans-serif);color:#15171C;-webkit-font-smoothing:antialiased}
body.cmp .mob{display:block}
.mob.top{left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));display:none;align-items:center;gap:10px;padding:8px 12px 8px 8px;background:rgba(255,255,255,.96);border:1px solid #e7e9ed;border-radius:14px;box-shadow:0 10px 26px -18px rgba(16,24,40,.35);margin-right:150px}
body.cmp .mob.top{display:flex}
.mob.top a{flex:none;background:#f1f2f5;color:#15171C;text-decoration:none;font:700 12px var(--bg-font,Inter,sans-serif);padding:8px 10px;border-radius:10px}
.mob.top b{font-size:15px;line-height:1.15;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mob.cap{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);border:1px solid #e7e9ed;border-radius:14px;box-shadow:0 14px 34px -20px rgba(16,24,40,.4);padding:10px 12px 12px;max-height:46svh;overflow:auto}
.mob.cap .k{font:600 13px 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:0;color:#5B6472;display:flex;justify-content:space-between;gap:8px}
.mob.cap .t{font-weight:700;font-size:16px;margin:3px 0 2px;letter-spacing:-.01em}
.mob.cap .b{font-size:13.5px;line-height:1.45;color:#454A55}
.mob.cap .e{font:600 12px 'JetBrains Mono',monospace;color:#15171C;margin-top:6px}
.mob.cap.min .b,.mob.cap.min .e{display:none}
.mob .row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:9px}
.mob .row::-webkit-scrollbar{display:none}
.mob .row button{flex:none;height:36px;padding:0 12px;border:1px solid #e3e6ea;background:#fff;border-radius:4px;font:700 11px 'JetBrains Mono',monospace;letter-spacing:1px;color:#15171C}
.mob .row button.on{background:#15171C;color:#fff;border-color:#15171C}
.mob .row button.acc{background:#1E2A44;color:#fff;border-color:#1E2A44}
.mob.back{right:10px;top:calc(10px + env(safe-area-inset-top));display:none!important}
body.full .mob.back{display:block!important}
@media (orientation:landscape) and (max-height:520px){.mob.cap{left:auto;right:10px;width:min(46vw,440px);top:calc(64px + env(safe-area-inset-top));max-height:none}.mob.top{margin-right:calc(min(46vw,440px) + 10px)}}
.mob.back button{height:40px;padding:0 14px;border:0;border-radius:4px;background:#15171C;color:#fff;font:700 11px 'JetBrains Mono',monospace;letter-spacing:1px;box-shadow:0 8px 20px -10px rgba(0,0,0,.5)}
/* Bản 14: thẻ lời giảng kiểu nhà; cảnh 3D là màn hình ở mọi cỡ màn, bảng số là ngăn kéo của thanh đầu bài */
body.bgs-on .mob.top,body.bgs-on .mob.back{display:none!important}
body.bgs-on .turn{display:none!important}
.mob.cap{left:16px;right:auto;bottom:16px;width:min(440px,calc(100vw - 32px));padding:14px 16px 14px;border-radius:14px;max-height:min(52svh,520px)}
.mob.cap .k{font:600 13px/1.3 var(--bg-font,Inter,sans-serif);letter-spacing:.01em;text-transform:none;color:#5B6472}
.mob.cap .k span:last-child{font-family:var(--bg-mono,monospace);color:#626773}
.mob.cap .t{font-size:20px;line-height:1.25;margin:4px 0 6px}
.mob.cap .b{font-size:15px;line-height:1.6;color:#454A55}
.mob.cap .e{font:500 13px/1.5 var(--bg-mono,monospace);background:#f3f4f6;border-radius:4px;padding:5px 8px;display:inline-block}
.mob .row{margin-top:12px;flex-wrap:wrap;overflow:visible}
.mob .row button{height:44px;padding:0 14px;font:600 14px var(--bg-font,Inter,sans-serif);letter-spacing:0;border-radius:999px}
body.bgs-nav-on .mob.cap{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));width:auto;bottom:calc(76px + env(safe-area-inset-bottom));max-height:40svh}
body.bgs-nav-on .mob .row{flex-wrap:nowrap;overflow-x:auto}
@media (orientation:landscape) and (max-height:520px){.mob.cap,body.bgs-nav-on .mob.cap{left:auto;right:max(8px,env(safe-area-inset-right));width:min(46vw,440px);top:calc(var(--bg-bar,48px) + 8px);bottom:auto;max-height:calc(100svh - var(--bg-bar,48px) - 16px)}}
html[data-chieu] .mob.cap{background:#fff}html[data-chieu] .mob.cap .b{font-size:18px;color:#000}html[data-chieu] .mob.cap .t{font-size:24px}
/* thanh tốc độ chuẩn của bộ robotics: tạm dừng, 0,5× đến 10×, như trò chơi chiến thuật */
.lv-time{position:fixed;z-index:21;right:16px;top:calc(var(--bg-bar,0px) + 12px + env(safe-area-inset-top));display:none;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 10px 26px -18px rgba(16,24,40,.45),0 0 0 .5px rgba(16,24,40,.08);font:600 13px var(--bg-font,Inter,sans-serif);color:#15171C}
body.cmp .lv-time{display:flex}
.lv-time .lb{padding:0 6px 0 10px;color:#626773;font-weight:500}
.lv-time button{height:32px;min-width:40px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:#454A55;font:inherit;font-variant-numeric:tabular-nums;cursor:pointer}
.lv-time button:hover{background:#f1f2f5}
.lv-time button.on{background:#15171C;color:#fff}
@media (pointer:coarse){.lv-time button{height:40px;min-width:44px}}
@media (max-width:520px){.lv-time .lb{display:none}.lv-time button{min-width:38px;padding:0 6px}}
/* thẻ soi chi tiết: bấm vào một chi tiết trong cảnh, camera bám theo nó */
.lv-insp{position:fixed;z-index:21;right:16px;top:calc(var(--bg-bar,0px) + 64px + env(safe-area-inset-top));width:min(340px,calc(100vw - 32px));display:none;box-sizing:border-box;padding:14px 16px 12px;border-radius:14px;background:rgba(255,255,255,.97);box-shadow:0 18px 44px -18px rgba(16,24,40,.34),0 0 0 .5px rgba(16,24,40,.08);font-family:var(--bg-font,Inter,sans-serif);color:#15171C;max-height:calc(100svh - var(--bg-bar,0px) - 96px);overflow:auto}
.lv-insp.on{display:block}
.lv-insp .k{font:600 13px/1.3 var(--bg-font,Inter,sans-serif);color:#5B6472;margin-right:40px}
.lv-insp .t{font:700 19px/1.25 var(--bg-font,Inter,sans-serif);letter-spacing:-.01em;margin:3px 40px 6px 0}
.lv-insp .b{font:500 14.5px/1.55 var(--bg-font,Inter,sans-serif);color:#454A55;margin:0 0 8px}
.lv-insp table{width:100%;border-collapse:collapse;font-size:13.5px}
.lv-insp td{padding:5px 0;border-top:1px solid rgba(16,24,40,.08);color:#454A55;vertical-align:top}
.lv-insp td+td{text-align:right;color:#15171C;font-weight:600;font-variant-numeric:tabular-nums;padding-left:12px}
.lv-insp .x{position:absolute;right:8px;top:8px;width:36px;height:36px;border:0;border-radius:10px;background:none;font-size:22px;line-height:1;color:#626773;cursor:pointer}
.lv-insp .x:hover{background:#f1f2f5}
.lv-insp .act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.lv-insp .act button{height:36px;padding:0 14px;border:1px solid rgba(16,24,40,.18);border-radius:999px;background:#fff;font:600 13.5px var(--bg-font,Inter,sans-serif);color:#15171C;cursor:pointer}
.lv-insp .act button.on{background:#15171C;color:#fff;border-color:#15171C}
.lv-insp .fol{display:flex;align-items:center;gap:7px;margin-top:10px;font:500 13px var(--bg-font,Inter,sans-serif);color:#626773}
.lv-insp .fol i{width:7px;height:7px;border-radius:50%;background:#1E2A44;animation:blink 1.4s steps(2) infinite}
.lv-insp .src{margin-top:6px;font-size:13px;line-height:1.45;color:#626773}
@media (pointer:coarse){.lv-insp .x{width:44px;height:44px}.lv-insp .act button{height:44px}}
@media (max-width:700px){.lv-insp{left:8px;right:8px;width:auto;top:calc(var(--bg-bar,48px) + 60px + env(safe-area-inset-top));max-height:34svh}}
html[data-chieu] .lv-insp{background:#fff}html[data-chieu] .lv-insp .b{font-size:18px;color:#000}html[data-chieu] .lv-insp .t{font-size:24px}
`;

export function runLive({stage: st, ui, sim, views, script, captions, keys = {}, idle = 25, chip = [800, 152], W = 1600, H = 900, firstView = 'hero', shell = {}, extra = []}) {
  const style = document.createElement('style'); style.textContent = CSS(W, H); document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = st.renderer.domElement;
  const tourChip = document.createElement('div'); tourChip.className = 'tourchip';
  Object.assign(tourChip.style, {left: `${chip[0]}px`, top: `${chip[1]}px`}); ui.root.appendChild(tourChip);
  const note = document.createElement('div'); note.className = 'turn'; note.textContent = 'Xoay ngang điện thoại để thấy đủ bảng điều khiển'; document.body.appendChild(note);
  const mob = (cls, html) => { const n = document.createElement('div'); n.className = 'mob ' + cls; n.innerHTML = html; document.body.appendChild(n); return n; };
  mob('top', `<a href="${ui.hub || '../../'}">←</a><b>${document.title}</b>`);
  const mCap = mob('cap', '<div class="k"><span></span><span></span></div><div class="t"></div><div class="b"></div><div class="e"></div><div class="row" data-r></div>');
  const mBack = mob('back', '<button>← CẢNH 3D</button>');

  // bậc chất lượng
  const TIERS = [{samples: 8, ao: true, shadow: 4096, pr: 2}, {samples: 4, ao: false, shadow: 2048, pr: 1.5}, {samples: 2, ao: false, shadow: 1024, pr: 1}];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  const qp = new URLSearchParams(location.search).get('q');
  let tier = qp !== null ? Math.min(2, +qp) : light ? 2 : 0, scale = 1;
  // màn hẹp (điện thoại, máy tính bảng dựng đứng): cảnh 3D phủ màn hình, lời giảng thành thẻ đọc được, bảng số mở khi cần
  let compact = false, full = false;
  const wantCompact = () => !!window.BGShell || innerWidth < 900 || innerHeight < 500; // có vỏ: cảnh trước ở mọi cỡ màn
  const barH = () => (document.body.classList.contains('bgs-on') ? (document.querySelector('.bgs-bar')?.getBoundingClientRect().height || 0) : 0);
  const fit = () => {
    compact = wantCompact() && !full;
    document.body.classList.toggle('cmp', compact); document.body.classList.toggle('full', wantCompact() && full);
    if (compact) { scale = 1; app.style.transform = ''; st.resize(innerWidth, innerHeight, clamp(devicePixelRatio || 1, 0.75, Math.min(1.5, TIERS[tier].pr))); return; }
    const top = barH(), avail = innerHeight - top;
    scale = Math.min(innerWidth / W, avail / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${top + (avail - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => { const {pr, ...q} = TIERS[tier]; st.setQuality(q); fit(); };
  applyTier(); addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 250));
  const toStage = (cx, cy) => { const r = app.getBoundingClientRect(); return [(cx - r.left) / scale, (cy - r.top) / scale]; };

  // thẻ lời giảng trên màn hẹp
  let mI = -1;
  const mShow = (c, i) => {
    if (!c) return; mI = i;
    const q = (sel) => mCap.querySelector(sel);
    q('.k').firstChild.textContent = sc(c.k || ''); // chữ thường kiểu câu, giữ tên riêng có số (UR5e, TurtleBot3) và từ viết tắt q('.k').lastChild.textContent = `${i + 1}/${captions.length}`;
    q('.t').textContent = c.t; q('.b').innerHTML = c.b; q('.e').textContent = c.e || '';
  };

  // trạng thái
  let T = 0, view = firstView, viewAt0 = 0, lastInput = 0;
  const off = {az: 0, el: 0, k: 1};
  const cam = {...views[view](0, sim)};
  let ring = {t: -9, x: 0, y: 0};
  const pulse = (k) => { const s = ui.spots[k]; if (s) ring = {t: T, x: s[0], y: s[1]}; };
  const setView = (v) => {
    if (!views[v]) return;
    view = v; viewAt0 = T; Object.assign(off, {az: 0, el: 0, k: 1});
    for (const k of Object.keys(views)) ui.setOn('v_' + k, k === v);
  };
  setView(view);

  // chuyến tham quan
  const E = script.events;
  const AP = {on: true, t0: 0, ev: 0, pos: [W / 2, H * 0.62], slide: null, lastAt: 0, loop: 0};
  const startTour = () => {
    Object.assign(AP, {on: true, t0: T, ev: 0, slide: null, lastAt: 0});
    setRate(1); closeInsp();
    sim.reset(); setView(firstView); Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => { lastInput = T; if (!AP.on) return; AP.on = false; AP.slide = null; };

  // tốc độ mô phỏng (chuẩn của bộ robotics): tạm dừng, 0,5×, 1×, 2×, 5×, 10×. Bước lớn chia nhỏ để mô phỏng vẫn ổn định;
  // chuyến tham quan và lời giảng luôn chạy theo giờ thật
  const RATES = [0, 0.5, 1, 2, 5, 10];
  let rate = 1;
  const tBar = document.createElement('div'); tBar.className = 'lv-time'; tBar.setAttribute('role', 'group'); tBar.setAttribute('aria-label', 'Tốc độ mô phỏng');
  tBar.innerHTML = '<span class="lb">Tốc độ</span>' + RATES.map((r) => `<button type="button" data-r="${r}" aria-label="${r ? `${String(r).replace('.', ',')} lần` : 'Tạm dừng'}">${r ? `${String(r).replace('.', ',')}×` : '❚❚'}</button>`).join('');
  document.body.appendChild(tBar);
  const setRate = (r) => { rate = r; tBar.querySelectorAll('button').forEach((b) => { const on = +b.dataset.r === r; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); };
  tBar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; takeOver(); setRate(+b.dataset.r); });
  setRate(1);
  const stepSim = (dt) => { if (!rate) return; const n = Math.max(1, Math.ceil(rate)); for (let i = 0; i < n; i++) sim.step((dt * rate) / n, T); };

  // soi chi tiết: bấm (không kéo) vào vật trong cảnh; sim.pick(hits) trả về thẻ {k, t, b, rows, actions, src, pos(), d},
  // true nếu bài tự xử lí cú bấm (vd chế độ lắp ráp), null nếu không trúng gì. Có thẻ thì camera bám theo pos() mỗi khung hình.
  const insp = document.createElement('div'); insp.className = 'lv-insp'; insp.setAttribute('role', 'dialog'); insp.setAttribute('aria-label', 'Chi tiết'); document.body.appendChild(insp);
  let FOL = null;
  const val = (v) => (typeof v === 'function' ? v() : v);
  const renderInsp = () => {
    const i = FOL.info;
    insp.innerHTML = `<button class="x" type="button" aria-label="Đóng">×</button><div class="k">${i.k || ''}</div><div class="t">${i.t}</div>${i.b ? `<p class="b">${i.b}</p>` : ''}`
      + (i.rows?.length ? `<table>${i.rows.map(([a, b]) => `<tr><td>${a}</td><td>${val(b)}</td></tr>`).join('')}</table>` : '')
      + (i.actions?.length ? `<div class="act">${i.actions.map((a, j) => `<button type="button" data-j="${j}" class="${val(a.on) ? 'on' : ''}">${a.label}</button>`).join('')}</div>` : '')
      + (i.pos ? '<div class="fol"><i></i>Camera đang bám theo chi tiết này</div>' : '') + (i.src ? `<div class="src">${i.src}</div>` : '');
  };
  const closeInsp = () => { if (!FOL) return; const f = FOL; FOL = null; insp.classList.remove('on'); f.info.close?.(); };
  const openInsp = (info) => { closeInsp(); FOL = {info}; renderInsp(); insp.classList.add('on'); info.open?.(); };
  insp.addEventListener('pointerdown', (e) => e.stopPropagation());
  insp.addEventListener('click', (e) => {
    lastInput = T;
    if (e.target.closest('.x')) { closeInsp(); return; }
    const b = e.target.closest('[data-j]'); if (b && FOL) { FOL.info.actions[+b.dataset.j].fn(); if (FOL) renderInsp(); }
  });
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const pickAt = (cx, cy) => {
    if (!sim.pick) return;
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    st.camera.updateMatrixWorld(); rc.setFromCamera(ndc, st.camera);
    const hits = rc.intersectObjects(st.scene.children, true).filter((h) => (h.object.isMesh || h.object.isInstancedMesh) && shown(h.object));
    const res = sim.pick(hits);
    if (res === true) return;
    if (res) openInsp(res); else closeInsp();
  };
  tourChip.addEventListener('pointerdown', (e) => { e.stopPropagation(); lastInput = T; if (AP.on) takeOver(); else startTour(); });
  addEventListener('pointerdown', (e) => { if (e.target !== tourChip && !(e.target.closest && e.target.closest('.bgs,.mob'))) takeOver(); });
  const knob = (k) => { const s = ui.sliders[k]; return s ? [s.x + s.t * s.w, s.y] : [W / 2, H / 2]; };
  const target = (e) => (e.click ? ui.spots[e.click] : e.slide ? knob(e.slide) : null);
  const fire = (e, cyc) => {
    if (e.cap !== undefined) { ui.cap?.set(captions[e.cap], e.cap, captions.length); mShow(captions[e.cap], e.cap); }
    if (e.view) setView(e.view);
    if (e.click) { if (e.click.startsWith('v_')) setView(e.click.slice(2)); else sim.act(e.click); pulse(e.click); AP.pos = ui.spots[e.click] || AP.pos; }
    if (e.slide) AP.slide = {key: e.slide, from: ui.sliders[e.slide]?.t ?? 0, to: e.to, at: e.at, dur: e.dur || 1.2};
    if (e.do) e.do(sim);
    AP.lastAt = cyc;
  };

  // điều khiển của người xem
  for (const [k, b] of Object.entries(ui.btn)) b.addEventListener('click', () => { takeOver(); pulse(k); if (k.startsWith('v_')) setView(k.slice(2)); else sim.act(k); });
  for (const [k, s] of Object.entries(ui.sliders)) {
    const d = document.createElement('div'); d.className = 'hit';
    Object.assign(d.style, {left: `${s.x - 8}px`, top: `${s.y - 11}px`, width: `${s.w + 16}px`, height: '22px'});
    const move = (e) => { const [x] = toStage(e.clientX, e.clientY); sim.slide(k, clamp((x - s.x) / s.w, 0, 1)); lastInput = T; };
    d.addEventListener('pointerdown', (e) => {
      takeOver(); d.setPointerCapture(e.pointerId);
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up); move(e);
    });
    ui.root.appendChild(d);
  }
  const held = new Set();
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (sim.keyDown && sim.keyDown(k)) { held.add(k); takeOver(); e.preventDefault(); return; }
    if (k === 'escape' && FOL) { closeInsp(); return; }
    const a = keys[k]; if (!a) return;
    takeOver(); pulse(a); if (a.startsWith('v_')) setView(a.slice(2)); else sim.act(a); e.preventDefault();
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (held.delete(k)) sim.keyUp?.(k); });
  let drag = null;
  const pts = new Map(); let pinch = 0;
  let tap = null;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); drag = {x: e.clientX, y: e.clientY}; tap = pts.size === 1 ? {x: e.clientX, y: e.clientY, t: performance.now()} : null; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); pinch = 0; });
  canvas.addEventListener('pointerup', (e) => { if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 6 && performance.now() - tap.t < 600) pickAt(e.clientX, e.clientY); tap = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size >= 2) { // hai ngón: thu phóng
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) off.k = clamp(off.k * (pinch / d), 0.3, 3);
      pinch = d; lastInput = T; return;
    }
    const sc = compact ? 0.7 : scale;
    off.az -= ((e.clientX - drag.x) / sc) * 0.3; off.el = clamp(off.el + ((e.clientY - drag.y) / sc) * 0.2, -40, 70);
    drag = {x: e.clientX, y: e.clientY}; lastInput = T;
  });
  const endDrag = (e) => { if (e) pts.delete(e.pointerId); if (!pts.size) { drag = null; canvas.classList.remove('drag'); } pinch = 0; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); takeOver(); off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.3, 3); }, {passive: false});

  // chế độ lên lớp (vỏ Sáng Ăn Khoai): mỗi lời giảng là một bước; nhảy tới bước i = tua nhanh chuyến tham quan tới đầu đoạn đó
  const capAt = []; for (const e of E) if (e.cap !== undefined && capAt[e.cap] === undefined) capAt[e.cap] = e.at;
  const CL = {on: false, i: 0};
  const classGo = (i) => {
    i = clamp(i, 0, captions.length - 1); CL.on = true; CL.i = i;
    startTour(); lastInput = T;
    const goal = capAt[i] ?? 0, h = 1 / 60;
    for (let t = 0; t <= goal + 1e-6; t += h) { // tua nhanh: chạy sự kiện và mô phỏng, không vẽ
      while (AP.ev < E.length && E[AP.ev].at <= t) fire(E[AP.ev++], t);
      if (AP.slide) { const s = AP.slide, k = clamp((t - s.at) / s.dur, 0, 1); sim.slide(s.key, s.from + (s.to - s.from) * ease(k)); if (k >= 1) AP.slide = null; }
      if (t < goal) sim.step(h, T);
    }
    // bước cộng dồn 1/60 có thể dừng ngay trước mốc của bước (vd 50,9999 < 51): chạy nốt sự kiện đúng mốc
    while (AP.ev < E.length && E[AP.ev].at <= goal + 1e-6) fire(E[AP.ev++], goal);
    AP.t0 = T - goal; mShow(captions[i], i);
  };
  const classEnd = () => { CL.on = false; };
  const mViews = Object.keys(views).filter((k) => ui.btn['v_' + k]); // góc máy riêng (quay phim, lắp ráp) không có nút trên bảng thì không hiện
  const cap1 = (t) => { const x = String(t || '').trim().toLocaleLowerCase('vi'); return x.charAt(0).toLocaleUpperCase('vi') + x.slice(1); };
  const vLabel = (k) => cap1(ui.btn['v_' + k] ? ui.btn['v_' + k].textContent : k);
  mCap.querySelector('[data-r]').innerHTML = `<button data-m="tour" class="acc">Tự chạy</button>${extra.map((x) => `<button data-a="${x.key}">${x.label}</button>`).join('')}${mViews.map((k) => `<button data-v="${k}">${vLabel(k)}</button>`).join('')}<button data-m="min">Thu gọn</button>${window.BGShell ? '' : '<button data-m="full">Bảng số</button>'}`;
  mCap.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) { takeOver(); setView(b.dataset.v); }
    if (b.dataset.a) { takeOver(); closeInsp(); sim.act(b.dataset.a); }
    if (b.dataset.m === 'tour') { if (AP.on) takeOver(); else startTour(); }
    if (b.dataset.m === 'min') { mCap.classList.toggle('min'); b.textContent = mCap.classList.contains('min') ? 'Mở lời giảng' : 'Thu gọn'; }
    if (b.dataset.m === 'full') { full = true; fit(); }
  });
  mBack.addEventListener('click', () => { full = false; fit(); });
  const mSync = () => {
    mCap.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
    mCap.querySelectorAll('[data-a]').forEach((b) => b.classList.toggle('on', !!sim.isOn?.(b.dataset.a)));
    const t = mCap.querySelector('[data-m="tour"]'); t.textContent = AP.on ? 'Dừng tự chạy' : 'Tự chạy'; t.classList.toggle('acc', !AP.on);
  };

  // khung hình
  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
    if (qp === null && tier < TIERS.length - 1) { // ?q= ép bậc thì không tự hạ
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt; perf.n++;
        if (perf.sum >= 0.5 && perf.n >= 6) {
          perf.slow = perf.sum / perf.n > 0.022 ? perf.slow + 1 : 0; perf.sum = 0; perf.n = 0;
          if (perf.slow >= (perf.age < 6 ? 1 : 2)) { tier++; applyTier(); Object.assign(perf, {age: 0, slow: 0}); }
        }
      }
    }
    let cursor = {x: -99, y: -99, press: false, ring: 0, ringX: 0, ringY: 0};
    if (AP.on) {
      let cyc = T - AP.t0;
      if (CL.on) { const hold = (capAt.at(CL.i + 1) ?? script.duration) - 0.001; if (cyc > hold) { AP.t0 = T - hold; cyc = hold; } } // lên lớp: dừng ở cuối đoạn của bước
      if (cyc >= script.duration) { AP.loop++; startTour(); cyc = 0; }
      while (AP.ev < E.length && E[AP.ev].at <= cyc) fire(E[AP.ev++], cyc);
      let press = false;
      if (AP.slide) {
        const s = AP.slide, k = clamp((cyc - s.at) / s.dur, 0, 1);
        sim.slide(s.key, s.from + (s.to - s.from) * ease(k));
        AP.pos = knob(s.key); press = true;
        if (k >= 1) { AP.slide = null; AP.lastAt = cyc; }
      }
      let pos = AP.pos;
      if (!AP.slide) {
        const nx = E.slice(AP.ev).find((e) => e.click || e.slide);
        if (nx) {
          const tg = target(nx), t1 = nx.at - 0.08, t0 = Math.max(AP.lastAt + 0.35, nx.at - 1.0);
          if (tg && cyc > t0) pos = [AP.pos[0] + (tg[0] - AP.pos[0]) * ease((cyc - t0) / (t1 - t0)), AP.pos[1] + (tg[1] - AP.pos[1]) * ease((cyc - t0) / (t1 - t0))];
          press = press || (tg && cyc > t1 - 0.06);
        }
      }
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: pos[0], y: pos[1], press, ring: rk, ringX: ring.x, ringY: ring.y};
    } else {
      if (T - lastInput > idle && !CL.on && !FOL && !sim.busy?.()) startTour(); // đang soi chi tiết hay đang lắp ráp thì không tự chạy lại
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    stepSim(dt);
    const since = T - viewAt0;
    const tgt = views[view](since, sim);
    tgt.az += off.az; tgt.el = clamp(tgt.el + off.el, -30, 88); tgt.d *= off.k;
    if (FOL && FOL.info.pos) { const p = FOL.info.pos(); tgt.tx = p[0]; tgt.ty = p[1]; tgt.tz = p[2]; tgt.sx = 0; tgt.sy = 0; if (FOL.info.d) tgt.d = FOL.info.d * off.k; }
    const k = RM.matches ? 1 : 1 - Math.exp(-dt / (AP.on ? 0.22 : 0.35)); // giảm chuyển động: camera cắt thẳng tới góc mới
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] += ((tgt[key] ?? 0) - (cam[key] ?? 0)) * k;
    let cf = cam;
    if (compact) { // màn hẹp: lùi camera theo tỉ lệ khung, đẩy vật sang chỗ trống bên cạnh thẻ lời giảng
      const asp = innerWidth / innerHeight, land = asp > 1 && innerHeight < 520;
      const wide = innerWidth >= 900 && !land, cw = Math.min(440, innerWidth - 32) + 16, mini = mCap.classList.contains('min');
      // đang soi chi tiết trên màn rộng: đặt vật giữa thẻ lời giảng (trái) và thẻ chi tiết (phải)
      cf = {...cam, d: cam.d * Math.pow(clamp(1.78 / asp, 1, 2.6), 0.6), sx: land ? -Math.min(innerWidth * 0.46, 440) / 2 : wide ? ((mini ? 0 : cw) - (FOL && innerWidth > 700 ? insp.offsetWidth + 16 : 0)) / 2 : 0, sy: land || wide ? 0 : -innerHeight * 0.16};
    }
    st.frame({...cf, az: cf.az * D2R, el: cf.el * D2R}, sim.shadowAt?.());
    sim.draw({T, view, since, auto: AP.on});
    ui.pointer(cursor);
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>Bài giảng đang tự chạy · bấm để tự điều khiển' : '▶ Chạy lại bài giảng';
    }
    if ((frame.n = (frame.n || 0) + 1) % 15 === 0) {
      if (compact) mSync();
      if (FOL && FOL.info.rows?.some(([, b]) => typeof b === 'function')) insp.querySelectorAll('td+td').forEach((td, j) => { td.textContent = val(FOL.info.rows[j][1]); });
    }
    if (!window.SIM_SHOWN) { window.SIM_SHOWN = true; dispatchEvent(new Event('simframe')); }
    requestAnimationFrame(frame);
  };
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, sim, startTour, takeOver, setView, classGo, classEnd, setRate, inspect: openInsp, closeInspect: closeInsp, pickAt,
    get rate() { return rate; }, get view() { return view; }, get inspecting() { return FOL ? FOL.info : null; }, get tier() { return tier; }, get T() { return T; }, get auto() { return AP.on; }, get compact() { return compact; }};
  // vỏ Sáng Ăn Khoai: lên lớp bằng bút trình chiếu, màn hình giáo viên, điện thoại (shell/bg-shell.js nhúng khi đóng gói)
  if (window.BGShell) {
    const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
    window.BGShell.mount({
      id: location.pathname.split('/').filter(Boolean).pop() || 'robotics', title: document.title, subject: shell.subject || 'Robotics · đại học', variant: shell.variant || 'pho-thong', objectives: shell.objectives || [],
      steps: captions.map((c) => ({t: c.t, note: [c.k, strip(c.b), c.e].filter(Boolean).join('\n\n'), sr: strip(c.b), ask: c.ask || null})),
      go: classGo, end: classEnd,
      panels: [{label: 'Bảng số', icon: 'chart', open: false, apply: (o) => { full = o; fit(); }}],
      keys: Object.entries(keys).slice(0, 8).map(([k, a]) => [k.toUpperCase(), (ui.btn[a] ? cap1(ui.btn[a].textContent) : a)]),
      credit: shell.credit || 'Mô phỏng chạy trực tiếp trong trình duyệt, dựng trên teardown của elvarofficial và claude-motion của whaleyxbt (MIT). Thông số máy lấy từ tài liệu của hãng; chỗ giả định ghi rõ trong bảng số.',
    });
  }
}
