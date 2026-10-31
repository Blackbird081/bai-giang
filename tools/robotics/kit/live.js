// Vỏ trang chạy trực tiếp dùng chung: khung 1600 × 900 co theo cửa sổ, ba bậc chất lượng tự hạ khi máy yếu,
// xoay/thu phóng bằng chuột hoặc ngón tay, chuyến tham quan tự chạy có con trỏ bấm từng nút kèm lời giảng;
// chạm vào bất cứ đâu là người xem cầm lái, 25 giây không thao tác thì tham quan chạy lại.
// Cách tổ chức theo live.js của teardown (MIT).
import {warmComposer} from './warm.js';

const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const CSS = (W, H) => `
html,body{background:#f2e6d2;overflow:hidden;margin:0}
#app{position:absolute!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{position:absolute;left:0;top:0;width:${W}px!important;height:${H}px!important;touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.bt{pointer-events:auto;cursor:pointer}
.bt:hover{filter:brightness(.96)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid #eadfcd;border-radius:4px;background:rgba(252,249,244,.95);color:#2a2521;font:700 9px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#e3562a}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:14px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#9b8f80;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive({stage: st, ui, sim, views, script, captions, keys = {}, idle = 25, chip = [800, 152], W = 1600, H = 900, firstView = 'hero'}) {
  const style = document.createElement('style'); style.textContent = CSS(W, H); document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = st.renderer.domElement;
  const tourChip = document.createElement('div'); tourChip.className = 'tourchip';
  Object.assign(tourChip.style, {left: `${chip[0]}px`, top: `${chip[1]}px`}); ui.root.appendChild(tourChip);
  const note = document.createElement('div'); note.className = 'turn'; note.textContent = 'Xoay ngang điện thoại để thấy đủ bảng điều khiển'; document.body.appendChild(note);
  const cap = ui.caption ? ui.capBox : null;

  // bậc chất lượng
  const TIERS = [{samples: 8, ao: true, shadow: 4096, pr: 2}, {samples: 4, ao: false, shadow: 2048, pr: 1.5}, {samples: 2, ao: false, shadow: 1024, pr: 1}];
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  const qp = new URLSearchParams(location.search).get('q');
  let tier = qp !== null ? Math.min(2, +qp) : light ? 2 : 0, scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => { const {pr, ...q} = TIERS[tier]; st.setQuality(q); fit(); };
  applyTier(); addEventListener('resize', fit);
  const toStage = (cx, cy) => { const r = app.getBoundingClientRect(); return [(cx - r.left) / scale, (cy - r.top) / scale]; };

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
    sim.reset(); setView(firstView); Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => { lastInput = T; if (!AP.on) return; AP.on = false; AP.slide = null; };
  tourChip.addEventListener('pointerdown', (e) => { e.stopPropagation(); lastInput = T; if (AP.on) takeOver(); else startTour(); });
  addEventListener('pointerdown', (e) => { if (e.target !== tourChip) takeOver(); });
  const knob = (k) => { const s = ui.sliders[k]; return s ? [s.x + s.t * s.w, s.y] : [W / 2, H / 2]; };
  const target = (e) => (e.click ? ui.spots[e.click] : e.slide ? knob(e.slide) : null);
  const fire = (e, cyc) => {
    if (e.cap !== undefined) ui.cap?.set(captions[e.cap], e.cap, captions.length);
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
    const a = keys[k]; if (!a) return;
    takeOver(); pulse(a); if (a.startsWith('v_')) setView(a.slice(2)); else sim.act(a); e.preventDefault();
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (held.delete(k)) sim.keyUp?.(k); });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = {x: e.clientX, y: e.clientY}; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az -= ((e.clientX - drag.x) / scale) * 0.3; off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -40, 70);
    drag = {x: e.clientX, y: e.clientY}; lastInput = T;
  });
  const endDrag = () => { drag = null; canvas.classList.remove('drag'); };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); takeOver(); off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.3, 3); }, {passive: false});

  // khung hình
  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
    if (tier < TIERS.length - 1) {
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
      if (T - lastInput > idle) startTour();
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    sim.step(dt, T);
    const since = T - viewAt0;
    const tgt = views[view](since, sim);
    tgt.az += off.az; tgt.el = clamp(tgt.el + off.el, -30, 88); tgt.d *= off.k;
    const k = 1 - Math.exp(-dt / (AP.on ? 0.22 : 0.35));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] += ((tgt[key] ?? 0) - (cam[key] ?? 0)) * k;
    st.frame({...cam, az: cam.az * D2R, el: cam.el * D2R}, sim.shadowAt?.());
    sim.draw({T, view, since, auto: AP.on});
    ui.pointer(cursor);
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>BÀI GIẢNG TỰ CHẠY · BẤM ĐỂ TỰ ĐIỀU KHIỂN' : '▶ CHẠY LẠI BÀI GIẢNG';
    }
    if (!window.SIM_SHOWN) { window.SIM_SHOWN = true; dispatchEvent(new Event('simframe')); }
    requestAnimationFrame(frame);
  };
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, sim, startTour, takeOver, setView, get tier() { return tier; }, get T() { return T; }, get auto() { return AP.on; }};
  void cap;
}
