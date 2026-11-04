// Chế độ lắp ráp dùng chung cho bộ robotics: học sinh tự chọn chi tiết lắp tiếp theo; máy kiểm ba điều rồi mới cho lắp.
//   THỨ TỰ (order): chi tiết đỡ nó đã có chưa (needs);
//   LỐI VÀO (reach): đường đưa chi tiết hay dụng cụ vào có bị một chi tiết đã lắp chắn không (blocks);
//   VƯỚNG (clash): mọi điều chưa đạt hiện màu đỏ kèm lí do, chi tiết gây vướng nhấp nháy đỏ trong cảnh.
// Ý tưởng từ cách lập kế hoạch lắp đặt ORDER · REACH · CLASH (bài đăng của 0xWast3 trên X, 2026); quy trình của từng bài là
// quy trình rút gọn để học, ghi rõ trong dữ liệu của bài, không thay sách hướng dẫn sửa chữa.
//
// units: [{id, name, needs: [id], blocks: [[id, 'lí do']], from: [x, y, z] (hướng và quãng đưa vào, đơn vị cảnh), tool, note}]
// order: một thứ tự lắp đúng (dùng cho Lắp mẫu, Gợi ý); kiểm ngay lúc tạo.
// io: {pose(id, k, from) — đặt chi tiết theo tỉ lệ đã vào k ∈ [0, 1]; flash(id, màu | null); tuỳ chọn: ghost(id, on) khi cụm nằm ngoài máy, done()}

const ease = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };

const CSS = `
.lapw{position:fixed;z-index:22;left:16px;top:calc(var(--bg-bar,0px) + 12px + env(safe-area-inset-top));width:min(360px,calc(100vw - 32px));max-height:calc(100svh - var(--bg-bar,0px) - 28px);display:none;flex-direction:column;box-sizing:border-box;border-radius:14px;background:rgba(255,255,255,.97);box-shadow:0 18px 44px -18px rgba(16,24,40,.34),0 0 0 .5px rgba(16,24,40,.08);font-family:var(--bg-font,Inter,system-ui,sans-serif);color:#15171C;-webkit-font-smoothing:antialiased}
body.lap .lapw{display:flex}
body.lap .mob.cap{display:none!important}
.lapw .hd{padding:14px 16px 10px;border-bottom:1px solid rgba(16,24,40,.08);position:relative}
.lapw .k{font:600 13px/1.3 var(--bg-font,Inter,sans-serif);color:#5B6472}
.lapw h3{margin:2px 40px 8px 0;font:700 19px/1.25 var(--bg-font,Inter,sans-serif);letter-spacing:-.01em}
.lapw .pg{display:flex;align-items:center;gap:10px;font:500 13px var(--bg-font,Inter,sans-serif);color:#454A55}
.lapw .pg .tr{flex:1;height:4px;border-radius:2px;background:#e9ebef;overflow:hidden}
.lapw .pg .tr i{display:block;height:100%;width:0;background:var(--bg-s-cong,#5B6472);transition:width .3s}
.lapw .pg b{font-variant-numeric:tabular-nums;color:#15171C}
.lapw .x{position:absolute;right:8px;top:8px;width:36px;height:36px;border:0;border-radius:10px;background:none;font-size:22px;line-height:1;color:#626773;cursor:pointer}
.lapw .x:hover{background:#f1f2f5}
.lapw .msg{margin:10px 16px 0;padding:10px 12px;border-radius:10px;font:500 14px/1.5 var(--bg-font,Inter,sans-serif);background:#f3f4f6;color:#454A55}
.lapw .msg b{display:block;color:#15171C;margin-bottom:2px}
.lapw .msg ul{margin:4px 0 0;padding-left:18px}
.lapw .msg li{margin:2px 0}
.lapw .msg.ok{background:color-mix(in srgb,var(--bg-ok,#1F7A4D) 10%,#fff)}
.lapw .msg.ok b{color:var(--bg-ok,#1F7A4D)}
.lapw .msg.bad{background:color-mix(in srgb,var(--bg-bad,#B3261E) 8%,#fff)}
.lapw .msg.bad b{color:var(--bg-bad,#B3261E)}
.lapw .msg .tl{display:block;margin-top:6px;font-size:13px;color:#626773}
.lapw .ls{flex:1;min-height:0;overflow:auto;padding:10px 12px 4px;display:flex;flex-direction:column;gap:6px}
.lapw .ls button{display:flex;align-items:center;gap:10px;min-height:40px;padding:6px 12px;border:1px solid rgba(16,24,40,.14);border-radius:10px;background:#fff;color:#15171C;font:600 14px/1.3 var(--bg-font,Inter,sans-serif);text-align:left;cursor:pointer}
.lapw .ls button:hover{border-color:#626773}
.lapw .ls button .n{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:600 12px var(--bg-mono,monospace);background:#f1f2f5;color:#626773}
.lapw .ls button.in{background:#f6f7f9;border-color:transparent;color:#626773;font-weight:500}
.lapw .ls button.in .n{background:#15171C;color:#fff}
.lapw .ls button.flag{border-color:var(--bg-bad,#B3261E);box-shadow:0 0 0 2px color-mix(in srgb,var(--bg-bad,#B3261E) 18%,transparent)}
.lapw .ls button.hint{border-color:#1E2A44;box-shadow:0 0 0 2px rgba(30,42,68,.18)}
.lapw .ls .sep{font:600 13px var(--bg-font,Inter,sans-serif);color:#626773;margin:6px 2px 0}
.lapw .ft{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 12px;border-top:1px solid rgba(16,24,40,.08)}
.lapw .ft button{height:36px;padding:0 14px;border:1px solid rgba(16,24,40,.18);border-radius:999px;background:#fff;color:#15171C;font:600 13.5px var(--bg-font,Inter,sans-serif);cursor:pointer}
.lapw .ft button.pri{background:#1E2A44;border-color:#1E2A44;color:#fff}
.lapw .ft button:disabled{opacity:.45;cursor:default}
@media (pointer:coarse){.lapw .ls button{min-height:44px}.lapw .ft button{height:44px}.lapw .x{width:44px;height:44px}}
@media (max-width:700px),(orientation:landscape) and (max-height:520px){
  .lapw{left:8px;right:8px;width:auto;top:auto;bottom:calc(8px + env(safe-area-inset-bottom));max-height:48svh}
  body.bgs-nav-on .lapw{bottom:calc(76px + env(safe-area-inset-bottom));max-height:42svh}
}
@media (orientation:landscape) and (max-height:520px){.lapw{left:auto;right:8px;width:min(46vw,400px);top:calc(var(--bg-bar,48px) + 8px);bottom:auto;max-height:calc(100svh - var(--bg-bar,48px) - 16px)}}
html[data-chieu] .lapw{background:#fff}html[data-chieu] .lapw .ls button{font-size:17px}html[data-chieu] .lapw .msg{font-size:17px}
`;

export function createAssembly({units, order, io, title = 'Lắp ráp', kicker = 'Tự lắp theo thứ tự', exit = () => {}}) {
  const U = Object.fromEntries(units.map((u) => [u.id, {needs: [], blocks: [], ...u}]));
  const name = (id) => U[id].name;
  // tên trong câu: hạ chữ đầu của từ đầu tiên, giữ nguyên phần còn lại (OpenCR, XL430-W250); tên riêng (proper: true) giữ cả chữ đầu
  const lc = (id) => { const n = U[id].name, w = n.split(' ')[0]; return U[id].proper || w.slice(1) !== w.slice(1).toLocaleLowerCase('vi') ? n : n.charAt(0).toLocaleLowerCase('vi') + n.slice(1); };
  const st = {on: false, in: new Set(), k: Object.fromEntries(units.map((u) => [u.id, 0])), anim: new Map(), flash: new Map(), auto: null, errs: 0, last: null, hint: null, T: 0};

  // kiểm lắp: thiếu chi tiết đỡ, lối vào bị chắn
  const checkIn = (id, have = st.in) => ({miss: U[id].needs.filter((n) => !have.has(n)), clash: U[id].blocks.filter(([b]) => have.has(b))});
  // kiểm tháo: chi tiết nào đã lắp đang tựa vào nó, hoặc nó nằm sau chi tiết nào
  // (đường rút ra trùng đường đưa vào, nên chi tiết chắn lối lắp cũng chắn lối tháo)
  const checkOut = (id, have = st.in) => ({miss: [...have].filter((o) => o !== id && U[o].needs.includes(id)), clash: U[id].blocks.filter(([b]) => have.has(b))});
  {
    const have = new Set();
    for (const id of order) { const c = checkIn(id, have); if (c.miss.length || c.clash.length) throw new Error(`thứ tự mẫu sai ở ${id}`); have.add(id); }
    if (have.size !== units.length) throw new Error('thứ tự mẫu thiếu chi tiết');
  }

  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const box = document.createElement('div'); box.className = 'lapw'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', title);
  box.innerHTML = `<div class="hd"><div class="k">${kicker}</div><h3>${title}</h3><div class="pg"><span class="tr"><i></i></span><b></b></div><button class="x" type="button" aria-label="Thoát lắp ráp">×</button></div>
    <div class="msg" aria-live="polite"></div><div class="ls"></div>
    <div class="ft"><button type="button" data-f="hint">Gợi ý</button><button type="button" data-f="auto" class="pri">Lắp mẫu</button><button type="button" data-f="out">Tháo hết</button></div>`;
  document.body.appendChild(box);
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  const $ = (s) => box.querySelector(s);
  const say = (cls, head, items = [], tail = '') => {
    const m = $('.msg'); m.className = 'msg ' + cls;
    m.innerHTML = `<b>${head}</b>${items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}${tail ? `<span class="tl">${tail}</span>` : ''}`;
  };
  const list = () => {
    const rest = order.filter((id) => !st.in.has(id)), done = order.filter((id) => st.in.has(id));
    // chi tiết chưa lắp xếp theo tên để danh sách không lộ thứ tự đúng
    const sorted = rest.slice().sort((a, b) => name(a).localeCompare(name(b), 'vi'));
    const row = (id, i) => `<button type="button" data-u="${id}" class="${st.in.has(id) ? 'in' : ''}${st.last?.id === id && st.last.bad ? ' flag' : ''}${st.hint === id ? ' hint' : ''}" aria-label="${st.in.has(id) ? 'Tháo' : 'Lắp'} ${name(id)}"><span class="n">${st.in.has(id) ? i + 1 : '+'}</span>${name(id)}</button>`;
    $('.ls').innerHTML = (sorted.length ? '<div class="sep">Chưa lắp · chọn chi tiết lắp tiếp</div>' + sorted.map((id) => row(id, 0)).join('') : '')
      + (done.length ? `<div class="sep">Đã lắp · bấm để tháo</div>` + [...st.in].map((id, i) => row(id, i)).join('') : '');
    $('.pg i').style.width = `${(st.in.size / units.length) * 100}%`;
    $('.pg b').textContent = `${st.in.size} / ${units.length}${st.errs ? ` · ${st.errs} lần vướng` : ''}`;
    $('[data-f="out"]').disabled = !st.in.size || !!st.auto;
    $('[data-f="auto"]').textContent = st.auto ? 'Dừng' : st.in.size === units.length ? 'Lắp lại từ đầu' : 'Lắp mẫu';
    $('[data-f="hint"]').disabled = st.in.size === units.length || !!st.auto;
  };

  const move = (id, dir) => { st.anim.set(id, {dir, t: 0, dur: 0.85}); };
  const flashIds = (ids) => { for (const id of ids) st.flash.set(id, 1.4); };
  const install = (id, quiet) => {
    const c = checkIn(id);
    if (c.miss.length || c.clash.length) {
      st.errs++; st.last = {id, bad: true};
      say('bad', `Chưa lắp được ${lc(id)}`, [
        ...c.miss.map((n) => `Thứ tự: cần lắp ${lc(n)} trước.`),
        ...c.clash.map(([b, why]) => `Lối vào bị ${lc(b)} chắn: ${why}`)], U[id].tool ? `Dụng cụ: ${U[id].tool}` : '');
      flashIds(c.clash.map(([b]) => b)); st.flash.set(id, 1.4);
      list(); return false;
    }
    st.in.add(id); move(id, 1); st.last = {id, bad: false}; st.hint = null;
    if (!quiet) say('ok', `Đã lắp ${lc(id)}`, [], [U[id].note, U[id].tool ? `Dụng cụ: ${U[id].tool}` : ''].filter(Boolean).join(' · '));
    if (st.in.size === units.length) { say('ok', 'Lắp xong cả máy', [], 'Bấm × để thoát lắp ráp và cho máy chạy.'); io.done?.(); }
    list(); return true;
  };
  const remove = (id) => {
    const c = checkOut(id);
    if (c.miss.length || c.clash.length) {
      st.errs++; st.last = {id, bad: true};
      say('bad', `Chưa tháo được ${lc(id)}`, [...c.miss.filter((o) => !c.clash.some(([b]) => b === o)).map((o) => `Phải tháo ${lc(o)} trước: nó tựa vào chi tiết này.`), ...c.clash.map(([o, why]) => `Phải tháo ${lc(o)} trước, vì lối ra bị nó chắn: ${why}`)]);
      flashIds([...c.miss, ...c.clash.map(([o]) => o)]); list(); return false;
    }
    st.in.delete(id); move(id, -1); st.last = {id, bad: false};
    say('', `Đã tháo ${lc(id)}`); list(); return true;
  };
  const click = (id) => { if (!st.on || st.auto || !U[id]) return; (st.in.has(id) ? remove : install)(id); };
  const nextOk = () => order.find((id) => !st.in.has(id) && !checkIn(id).miss.length && !checkIn(id).clash.length);

  box.addEventListener('click', (e) => {
    if (e.target.closest('.x')) { exit(); return; }
    const u = e.target.closest('[data-u]'); if (u) { click(u.dataset.u); return; }
    const f = e.target.closest('[data-f]')?.dataset.f;
    if (f === 'hint') { const n = nextOk(); if (n) { st.hint = n; st.flash.set(n, 1.4); say('', `Gợi ý: thử ${lc(n)}`, [], U[n].needs.length ? `Nó tựa vào ${U[n].needs.map((x) => lc(x)).join(', ')}.` : 'Đây là chi tiết nền, các chi tiết khác tựa vào nó.'); list(); } }
    if (f === 'auto') { if (st.auto) { st.auto = null; list(); } else demo(); }
    if (f === 'out') teardown();
  });

  // lắp mẫu: tháo hết rồi lắp lần lượt theo thứ tự đúng; tháo hết: tháo ngược thứ tự
  function demo() { st.auto = {dir: 1, wait: st.in.size ? 0.9 : 0.2}; if (st.in.size) teardownNow(); say('', 'Lắp mẫu theo thứ tự đúng', [], 'Xem chi tiết nào vào trước, đi vào theo hướng nào.'); list(); }
  function teardownNow() { for (const id of [...st.in].reverse()) { st.in.delete(id); move(id, -1); } }
  function teardown() { st.auto = {dir: -1, wait: 0}; say('', 'Tháo rời theo thứ tự ngược', [], 'Chi tiết lắp sau cùng được tháo trước.'); list(); }

  const step = (dt) => {
    st.T += dt;
    if (st.auto) {
      st.auto.wait -= dt;
      if (st.auto.wait <= 0) {
        if (st.auto.dir > 0) { const n = order.find((id) => !st.in.has(id)); if (n) { install(n, true); say('', `Lắp mẫu · ${st.in.size}/${units.length}: ${lc(n)}`, [], [U[n].note, U[n].tool ? `Dụng cụ: ${U[n].tool}` : ''].filter(Boolean).join(' · ')); st.auto.wait = 1.05; } else { st.auto = null; say('ok', 'Lắp xong cả máy', [], 'Bấm × để thoát lắp ráp và cho máy chạy.'); io.done?.(); list(); } }
        else { const n = [...st.in].pop(); if (n) { st.in.delete(n); move(n, -1); st.auto.wait = 0.6; list(); } else { st.auto = null; say('', 'Đã tháo rời', [], 'Chọn chi tiết đầu tiên để tự lắp lại.'); list(); } }
      }
    }
    for (const [id, a] of st.anim) {
      a.t += dt / a.dur; const k = a.dir > 0 ? ease(a.t) : 1 - ease(a.t);
      st.k[id] = k; if (a.t >= 1) st.anim.delete(id);
    }
    for (const [id, t] of st.flash) { const nt = t - dt; if (nt <= 0) st.flash.delete(id); else st.flash.set(id, nt); }
  };
  const draw = () => {
    for (const u of units) {
      const k = st.on ? st.k[u.id] : 1;
      io.pose(u.id, k, u.from);
      io.ghost?.(u.id, st.on && k < 0.999 && !st.anim.has(u.id));
      const f = st.on ? st.flash.get(u.id) : 0;
      io.flash(u.id, f && Math.floor(f * 6) % 2 === 0 ? '#c4271c' : null);
    }
  };
  const start = ({empty = true} = {}) => {
    st.on = true; st.auto = null; st.errs = 0; st.last = null; st.hint = null; st.anim.clear(); st.flash.clear();
    if (empty) { st.in.clear(); for (const u of units) st.k[u.id] = 0; }
    document.body.classList.add('lap');
    say('', 'Chọn chi tiết lắp đầu tiên', [], 'Mỗi lần chọn, máy kiểm thứ tự (chi tiết đỡ đã có chưa) và lối vào (có chi tiết nào chắn đường đưa vào hay đường của dụng cụ không). Bấm chi tiết trong danh sách hoặc ngay trong cảnh.');
    list();
  };
  const stop = () => { st.on = false; st.auto = null; st.anim.clear(); st.flash.clear(); document.body.classList.remove('lap'); for (const u of units) st.k[u.id] = 1; st.in = new Set(order); draw(); };
  return {start, stop, step, draw, click, demo, teardown, get on() { return st.on; }, get done() { return st.in.size === units.length; }, get state() { return st; }, has: (id) => !!U[id], unit: (id) => U[id], checkIn, checkOut};
}
