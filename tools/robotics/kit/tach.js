// Chế độ tháo từng bộ phận dùng chung cho bộ robotics. Học theo phương pháp cutaway của Nyxera0x (MIT,
// github.com/Nyxera0x/cutaway): mỗi bộ phận là một nút; bấm thì bộ phận đó tách ra trong khoảng 1 giây, treo lơ lửng
// trong lúc chi tiết bên trong vẫn chạy, đóng lại trong 0,5 giây; mỗi bộ phận có góc máy riêng (phía, độ cao, khoảng cách)
// nhắm vào chính nó và đẩy lại gần trong lúc nó mở; "tách cả bộ" bung mọi cụm trên bàn xoay 330° rồi lắp nhanh trong lúc
// vẫn xoay. Phim tháo rời là một kịch bản {t, act}: cảnh, nhãn và nút cùng đọc một danh sách.
//
// parts: [{key, label, open(k, t), at() → [x, y, z] (toạ độ three, theo vị trí hiện tại), cam: {az, el, d, push, orbit},
//          sub() → chữ phụ trên nhãn, card() → thẻ soi chi tiết cho LIVE.inspect}]
// explode(k): bài tự đặt độ bung của cả bộ, k ∈ [0, 1]. turn(độ): bài tự quay bệ xoay quanh trục đứng.
import * as THREE from 'three';
import {C, sc} from './ui.js';

/** Gắn chế độ tháo rời vào bài có sẵn mà không sửa cách bài đặt vị trí chi tiết: bọc mỗi vật vào một nhóm mới nằm ở gốc
 * của cha cũ; bài vẫn đặt vị trí vật trong hệ toạ độ cũ, còn nhóm bọc thì dời theo hướng dir × k. Trả về hàm move(k). */
export function mover(objs, dir, rot = null) {
  const ws = objs.filter(Boolean).map((o) => { const p = o.parent, w = new THREE.Group(); p.add(w); w.add(o); return w; });
  return (k) => { for (const w of ws) { w.position.set(dir[0] * k, dir[1] * k, dir[2] * k); if (rot) w.rotation.set(rot[0] * k, rot[1] * k, rot[2] * k); } };
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sm5 = (x) => { const u = clamp(x, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
const OPEN = 1.0, CLOSE = 0.5; // giây: mở, đóng (quy tắc nhịp của cutaway)
const ALL = {out: 1.6, turn: 5.4, back: 4.2, home: 1.0, deg: 330};

const CSS = `
.cut-lab{position:absolute;left:0;top:0;pointer-events:none;z-index:6;display:none;padding:6px 10px 7px;border-radius:10px;background:rgba(255,255,255,.96);box-shadow:0 10px 26px -16px rgba(16,24,40,.45),0 0 0 .5px rgba(16,24,40,.1);font:600 12px/1.25 var(--bg-font,'Be Vietnam Pro',var(--bg-font,system-ui,sans-serif));color:#1D1B16;white-space:nowrap}
.cut-lab small{display:block;font:500 11px/1.3 var(--bg-mono,'JetBrains Mono',monospace);color:#626773;margin-top:2px}
.cut-svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5}
.cutbar{position:fixed;z-index:21;left:16px;top:calc(var(--bg-bar,0px) + 64px + env(safe-area-inset-top));max-width:calc(100vw - 404px);display:none;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px}
.cutbar::-webkit-scrollbar{display:none}
body.cmp .cutbar{display:flex}
.cutbar button{flex:none;height:36px;padding:0 13px;border:0;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 8px 22px -16px rgba(16,24,40,.5),0 0 0 .5px rgba(16,24,40,.12);font:600 13px var(--bg-font,system-ui,sans-serif);color:#1D1B16;cursor:pointer;white-space:nowrap}
.cutbar button.on{background:#1D1B16;color:#fff}
.cutbar button.acc{background:#1D1B16;color:#fff}
.cutbar .lb{flex:none;align-self:center;padding:0 4px 0 2px;font:600 13px var(--bg-font,system-ui,sans-serif);color:#626773}
@media (pointer:coarse){.cutbar button{height:44px}}
@media (max-width:700px){.cutbar{left:8px;right:8px;max-width:none;top:calc(var(--bg-bar,48px) + 58px + env(safe-area-inset-top))}body.cut-on .lv-insp{top:calc(var(--bg-bar,48px) + 108px + env(safe-area-inset-top))}}
html[data-chieu] .cut-lab{font-size:16px}html[data-chieu] .cut-lab small{font-size:14px}
`;

export function createCutaway({st, ui, parts, explode = () => {}, turn = () => {}, beat = 2.6, title = 'Tháo từng bộ phận'}) {
  if (!document.getElementById('cut-css')) { const s = document.createElement('style'); s.id = 'cut-css'; s.textContent = CSS; document.head.appendChild(s); }
  document.body.classList.add('cut-on');
  const app = document.getElementById('app');
  const P = Object.fromEntries(parts.map((p) => [p.key, {p, x: 0, dir: 0, hold: Infinity, t: 0}]));
  const S = {active: null, since: 0, T: 0, all: null, film: null, ex: 0, deg: 0, prev: 'hero', card: false};

  // nhãn có đường dẫn trên bộ phận đang mở (nằm trong #app, cùng hệ toạ độ với canvas ở mọi cỡ màn)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'cut-svg'); app.appendChild(svg);
  const lab = document.createElement('div'); lab.className = 'cut-lab'; app.appendChild(lab);

  // thanh nút trên màn hẹp
  const bar = document.createElement('div'); bar.className = 'cutbar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', title);
  const cap1 = (t) => { const x = sc(String(t)); return x.charAt(0).toLocaleUpperCase('vi') + x.slice(1); };
  bar.innerHTML = `<span class="lb">Tháo</span>${parts.map((p) => `<button type="button" data-c="${p.key}">${cap1(p.label)}</button>`).join('')}<button type="button" data-c="all">Tách cả bộ</button><button type="button" data-c="film" class="acc">▶ Phim tháo rời</button>`;
  document.body.appendChild(bar);
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; window.LIVE?.takeOver(); cut.act('cut_' + b.dataset.c); });

  const live = () => window.LIVE;
  const rememberView = () => { const v = live()?.view; if (v && v !== 'cut') S.prev = v; };
  const setActive = (key) => {
    if (key && S.active !== key) { if (!S.active && !S.all) rememberView(); S.since = 0; }
    S.active = key;
    if (key) live()?.setView('cut');
  };
  const anyOpen = () => parts.some((p) => P[p.key].x > 0.001 || P[p.key].dir > 0);

  const openPart = (key, hold) => {
    for (const p of parts) if (p.key !== key && P[p.key].dir >= 0 && P[p.key].x > 0) P[p.key].dir = -1;
    const s = P[key]; s.dir = 1; s.hold = hold; s.t = 0; setActive(key);
  };
  const closePart = (key) => { const s = P[key]; if (s) s.dir = -1; };
  const closeAll = () => { for (const p of parts) closePart(p.key); };

  // tách cả bộ: tự chạy (phim) thì bung, xoay 330°, lắp lại trong lúc xoay; bấm tay thì bung và giữ, bệ xoay chậm
  const startAll = (auto) => { if (!S.active && !S.all) rememberView(); closeAll(); S.all = {t: 0, auto, back: auto ? ALL.back : Infinity, d0: S.deg}; S.since = 0; live()?.setView('cut'); };
  const endAll = () => { if (S.all && S.all.back === Infinity) { S.all.back = S.all.t; S.all.d0 = S.deg; } };

  // phim tháo rời: mỗi bộ phận một nhịp, rồi tách cả bộ, lắp lại, về toàn cảnh
  const script = [];
  { let t = 0.6; for (const p of parts) { script.push({t: +t.toFixed(2), act: p.key}); t += beat; } script.push({t: +t.toFixed(2), act: 'exploded'}); script.push({t: +(t + ALL.back).toFixed(2), act: 'assemble'}); script.push({t: +(t + ALL.turn + 0.4).toFixed(2), act: 'hero'}); }
  const duration = script.at(-1).t + 1.2;
  const startFilm = () => { closeAll(); live()?.closeInspect?.(); S.all = null; S.film = {t: 0, i: 0}; };
  const stopFilm = () => { S.film = null; };

  const cut = {
    S, script, duration, parts,
    get active() { return S.active; },
    get filming() { return !!S.film; },
    get exploded() { return S.ex; },
    k: (key) => sm5(P[key]?.x || 0),
    busy: () => !!S.film || !!S.all || anyOpen(),
    timeline: () => ({duration: +duration.toFixed(2), pills: [...parts.map((p) => p.key), 'exploded', 'hero'], script}),
    /** nhận lệnh 'cut_<khoá>', 'cut_all', 'cut_film'; trả về true nếu là lệnh của chế độ tháo rời */
    act(k) {
      if (!k.startsWith('cut_')) return false;
      const key = k.slice(4);
      if (key === 'film') { if (S.film) { stopFilm(); closeAll(); S.all = null; } else startFilm(); return true; }
      stopFilm();
      if (key === 'all') { if (S.all && S.all.back === Infinity) endAll(); else if (!S.all) startAll(false); return true; }
      if (!P[key]) return true;
      if (S.all) { S.all = null; S.ex = 0; explode(0); }
      if (P[key].dir > 0) { closePart(key); live()?.closeInspect?.(); return true; }
      openPart(key, Infinity);
      const card = P[key].p.card?.();
      if (card && live()?.inspect) live().inspect({...card, close: () => { closePart(key); card.close?.(); }});
      return true;
    },
    /** một nhịp tự chạy: mở, giữ, đóng (dùng trong chuyến tham quan) */
    beat(key, hold = 1.0) { stopFilm(); if (P[key]) openPart(key, hold); },
    closeAll() { stopFilm(); closeAll(); if (S.all) endAll(); },
    reset() { stopFilm(); S.all = null; S.ex = 0; S.deg = 0; for (const p of parts) Object.assign(P[p.key], {x: 0, dir: 0, t: 0}); S.active = null; explode(0); turn(0); for (const p of parts) p.open(0, 0); },
    step(dt) {
      S.T += dt; S.since += dt;
      if (S.film) {
        const f = S.film; f.t += dt;
        while (f.i < script.length && script[f.i].t <= f.t) {
          const e = script[f.i++];
          if (P[e.act]) openPart(e.act, beat - OPEN - CLOSE - 0.15);
          else if (e.act === 'exploded') startAll(true);
          else if (e.act === 'hero') { live()?.setView(S.prev || 'hero'); }
        }
        if (f.t > duration) { S.film = null; }
      }
      for (const p of parts) {
        const s = P[p.key];
        if (s.dir > 0) { s.x = Math.min(1, s.x + dt / OPEN); if (s.x >= 1) { s.t += dt; if (s.t >= s.hold) s.dir = -1; } }
        else if (s.dir < 0) { s.x = Math.max(0, s.x - dt / CLOSE); if (s.x <= 0) s.dir = 0; }
        p.open(sm5(s.x), S.T);
      }
      if (S.active && P[S.active].x <= 0 && P[S.active].dir === 0) {
        const next = parts.find((p) => P[p.key].dir > 0);
        S.active = next ? next.key : null;
        if (!S.active && !S.all) live()?.setView(S.prev || 'hero');
      }
      if (S.all) {
        const a = S.all; a.t += dt;
        const out = sm5(a.t / ALL.out), home = a.back === Infinity ? 0 : sm5((a.t - a.back) / ALL.home);
        S.ex = out * (1 - home);
        if (a.auto) { const span = ALL.turn; S.deg = a.d0 + ALL.deg * sm5((a.t - 0.2) / span); }
        else if (a.back === Infinity) S.deg += dt * 14; // bấm tay: bệ xoay chậm 14°/s trong lúc giữ
        else { const tgt = Math.round(a.d0 / 360) * 360; S.deg = a.d0 + (tgt - a.d0) * sm5((a.t - a.back) / ALL.home); }
        const done = a.back !== Infinity && a.t > a.back + ALL.home && (!a.auto || a.t > ALL.turn + 0.25);
        if (done) { S.all = null; S.ex = 0; S.deg = a.auto ? 0 : S.deg % 360; if (!S.film) live()?.setView(S.prev || 'hero'); }
        explode(S.ex); turn(a.auto && done ? 0 : S.deg);
      }
    },
    /** góc máy của chế độ tháo rời; null khi không có gì đang mở */
    view(fallback) {
      if (S.all) {
        const u = S.all.t, base = fallback || {tx: 0, ty: 0, tz: 0, az: 30, el: 18, d: 1};
        const go = sm5((u - 0.3) / 2.5), back = S.all.back === Infinity ? 0 : sm5((u - S.all.back) / 1.5);
        return {...base, az: base.az + 38 * go - 30 * back, el: base.el + (-10 * go + 8 * back), d: base.d * (1 + 0.45 * go - 0.4 * back)};
      }
      if (!S.active) return null;
      const s = P[S.active], c = s.p.cam, u = S.since, at = s.p.at();
      const push = c.push ?? 0.78, orbit = c.orbit ?? 7;
      return {tx: at[0], ty: at[1], tz: at[2], az: c.az + orbit * Math.min(u, 3), el: c.el + 4 * sm5(u / 2.5), d: c.d * (1 + (push - 1) * sm5(u / 2.5)), sx: c.sx ?? 0, sy: c.sy ?? -20};
    },
    /** nhãn, nút: gọi trong draw() của bài */
    draw() {
      for (const p of parts) { const on = P[p.key].dir > 0; ui?.setOn('cut_' + p.key, on); bar.querySelector(`[data-c="${p.key}"]`)?.classList.toggle('on', on); }
      ui?.setOn('cut_all', !!S.all); bar.querySelector('[data-c="all"]').classList.toggle('on', !!S.all);
      const fb = bar.querySelector('[data-c="film"]'); fb.textContent = S.film ? '■ Dừng phim' : '▶ Phim tháo rời'; ui?.setOn('cut_film', !!S.film);
      const key = S.active, s = key && P[key];
      const k = s ? sm5(s.x) : 0;
      if (!s || k < 0.15) { lab.style.display = 'none'; svg.innerHTML = ''; return; }
      const a = s.p.at(), q = st.project(a[0], a[1], a[2]);
      if (!q) { lab.style.display = 'none'; svg.innerHTML = ''; return; }
      const W = st.size.w, H = st.size.h, right = q[0] < W * 0.62, dx = right ? 96 : -96, dy = q[1] > H * 0.3 ? -64 : 64;
      const lx = q[0] + dx, ly = q[1] + dy;
      lab.innerHTML = `${sc(s.p.label)}${s.p.sub ? `<small>${s.p.sub()}</small>` : ''}`;
      lab.style.display = 'block'; lab.style.opacity = String(clamp((k - 0.15) / 0.4, 0, 1));
      lab.style.transform = `translate(${(right ? lx : lx - lab.offsetWidth).toFixed(1)}px, ${(ly - 12).toFixed(1)}px)`;
      svg.innerHTML = `<path d="M${q[0].toFixed(1)} ${q[1].toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}" stroke="${C.ink}" stroke-width="1" fill="none" opacity="${lab.style.opacity}"/><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3" fill="${C.or}" opacity="${lab.style.opacity}"/>`;
    },
    /** nút trên bảng 1600 × 900: một nút mỗi bộ phận, thêm tách cả bộ và phim */
    /** một dòng nút trong vùng cảnh cho bài có sẵn (bảng hai bên đã kín) */
    pillRow(x = 360, y = 150) { ui.text(x, y + 4, 'THÁO', 'sm', 'font-weight:600'); return ui.buttons([...parts.map((p) => ['cut_' + p.key, p.label]), ['cut_all', 'TÁCH CẢ BỘ'], ['cut_film', '▶ PHIM THÁO RỜI']], x + 44, y, 860); },
    pills(x, y, w) { return ui.buttons([...parts.map((p) => ['cut_' + p.key, p.label]), ['cut_all', 'TÁCH CẢ BỘ'], ['cut_film', '▶ PHIM THÁO RỜI']], x, y, w); },
    /** kiểm góc máy (đo, không nhìn bằng mắt): hai nhịp "đứng yên" nếu cùng phía, cùng độ cao, cùng khoảng cách */
    audit() {
      const cams = parts.map((p) => ({key: p.key, az: p.cam.az, el: p.cam.el, d: p.cam.d}));
      const parked = [];
      for (let i = 0; i < cams.length; i++) for (let j = i + 1; j < cams.length; j++) {
        const a = cams[i], b = cams[j], daz = Math.abs(((a.az - b.az + 540) % 360) - 180);
        if (daz < 25 && Math.abs(a.el - b.el) < 12 && Math.max(a.d, b.d) / Math.min(a.d, b.d) < 1.25) parked.push([a.key, b.key]);
      }
      return {cams, parked, script, duration};
    },
  };
  return cut;
}
