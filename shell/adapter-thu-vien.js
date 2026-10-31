/* Gắn vỏ Bài Giảng vào 54 bài thư viện (bản Việt hoá của Tongjiang Lab, CC BY-NC 4.0).
 * Bài thư viện là bản đóng gói sẵn, nên vỏ điều khiển qua giao diện của chính bài: thanh bước nav#steps (nút .chip,
 * nút đang chọn có lớp .on), khung "Bước này" bên trái (câu hỏi, tự tay thử, kết luận, ý chính).
 * Ghi chú cho giáo viên của mỗi bước được đọc từ khung "Bước này" khi bước đó được mở.
 */
/* Khung trống cho cảnh 3D trên mọi cỡ màn hình. Bản gốc chỉ tính hai bảng hai bên (máy tính); trên điện thoại và
 * máy tính bảng các bảng thành tấm trượt dưới hoặc một cột bên phải, nên cảnh bị đẩy ra ngoài màn hình. inject_shell.py thay
 * ba biểu thức trong hàm khung trống của bài bằng __bgL(), __bgR(), __bgB(): chỉ bảng dựng đứng mới chắn hai bên,
 * tấm trượt dưới và thanh chọn bảng chắn phía dưới. */
(function () {
  const vis = (el) => { if (!el) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
  const panels = () => ['left', 'right'].map((id) => document.getElementById(id)).filter((e) => e && !e.classList.contains('collapsed')).map(vis).filter(Boolean);
  const side = (r) => r.height >= innerHeight * 0.5;
  window.__bgL = () => { let x = 0; for (const r of panels()) if (side(r) && r.left + r.width / 2 < innerWidth / 2) x = Math.max(x, r.right); return x; };
  window.__bgR = (W) => { let x = W; for (const r of panels()) if (side(r) && r.left + r.width / 2 >= innerWidth / 2) x = Math.min(x, r.left); return x; };
  window.__bgB = (b) => { let y = b; for (const r of panels()) if (!side(r)) y = Math.min(y, r.top); const t = vis(document.getElementById('mtabs')); if (t && t.top > innerHeight * 0.4) y = Math.min(y, t.top); return y; };
  // Bài gốc luôn đặt tâm cảnh ở giữa màn hình. Trên điện thoại xoay ngang khung trống nằm nửa trái, dựng đứng thì nằm dải
  // trên, nên dời tâm chiếu của camera về giữa khung trống (setViewOffset); phép chọn vật và nhãn dùng cùng camera nên vẫn khớp.
  const mobile = () => matchMedia('(max-width:700px), (orientation:portrait) and (max-width:1100px), (orientation:landscape) and (max-height:520px)').matches;
  const recenter = () => {
    const L = window.__lab, cam = L && L.camera; if (!cam || !L.freeRect) return;
    if (!mobile()) { if (cam.userData.bgOffset) { cam.clearViewOffset(); cam.userData.bgOffset = false; } return; }
    const f = L.freeRect(), W = innerWidth, H = innerHeight;
    if (f.r - f.l < 40 || f.b - f.t < 40) return;
    cam.setViewOffset(W, H, W / 2 - (f.l + f.r) / 2, H / 2 - (f.t + f.b) / 2, W, H); cam.userData.bgOffset = true;
  };
  // đổi bảng (Bước này / Điều khiển / Xem 3D), xoay máy: tính lại tâm rồi báo bài dựng lại khung hình
  let busy = false;
  const kick = () => { clearTimeout(kick.t); kick.t = setTimeout(() => { recenter(); busy = true; dispatchEvent(new Event('resize')); busy = false; }, 60); };
  addEventListener('resize', () => { if (!busy) kick(); });
  const go = () => {
    new MutationObserver(kick).observe(document.body, {attributes: true, attributeFilter: ['class']});
    let n = 0; const wait = setInterval(() => { if (window.__lab && window.__lab.camera) { clearInterval(wait); kick(); } else if (++n > 120) clearInterval(wait); }, 250);
  };
  document.body ? go() : addEventListener('DOMContentLoaded', go);
})();

(function () {
  'use strict';
  if (!window.BGShell) return;
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  let tries = 0;
  const wait = setInterval(() => {
    const chips = document.querySelectorAll('nav#steps .chip');
    if (!chips.length) { if (++tries > 80) clearInterval(wait); return; }
    clearInterval(wait);
    mount(chips);
  }, 250);

  function current() { const cs = [...document.querySelectorAll('nav#steps .chip')]; return cs.findIndex((c) => c.classList.contains('on')); }
  function readNote() {
    const L = document.getElementById('left'); if (!L) return {note: '', ask: null};
    const q = txt(L.querySelector('.cq')), act = txt(L.querySelector('.atxt')), see = txt(L.querySelector('.ev')), concl = txt(L.querySelector('.ctxt'));
    const pts = [...L.querySelectorAll('.pts li')].map(txt).filter(Boolean);
    const parts = [];
    if (act) parts.push('Tự tay thử: ' + act);
    if (see) parts.push('Học sinh sẽ thấy: ' + see);
    if (concl) parts.push('Kết luận: ' + concl);
    if (pts.length) parts.push('Ý chính:\n' + pts.map((p) => '• ' + p).join('\n'));
    return {note: parts.join('\n\n'), ask: q ? {q, o: [], a: -1} : null};
  }

  function mount(chips) {
    const steps = [...chips].map((c) => ({t: txt(c.querySelector('.nm')) || txt(c), note: '', ask: null}));
    const title = txt(document.querySelector('header#top h1')) || document.title;
    const mq = txt(document.querySelector('header#top .mq b'));
    let syncing = false;
    const sync = () => {
      const i = current(); if (i < 0) return;
      const n = readNote(); steps[i].note = n.note; steps[i].ask = n.ask;
      if (syncing) return;
      if (window.BGShell.state.on) window.BGShell.update(i); else window.BGShell.refresh();
    };
    window.BGShell.mount({
      id: location.pathname.split('/').pop().replace(/\.html$/, ''), title, subject: 'Thư viện thí nghiệm', variant: 'pho-thong',
      objectives: mq ? ['Câu hỏi chính của bài: ' + mq] : [], steps,
      // thanh lên lớp dựng đứng, sát mép trái bảng điều khiển bên phải của bài; dải bước ẩn vì bài đã có "Bước i / n" ở chân trang
      layout: {minWidth: 700, compact: true, vertical: true, hud: 'display:none!important',
        dock: () => { const r = document.getElementById('right'), rr = r && r.getBoundingClientRect(); const side = rr && rr.width > 60 && rr.height > innerHeight * 0.5, st = document.getElementById('steps'), sb = st ? st.getBoundingClientRect().bottom + 10 : 150; const x = side ? innerWidth - rr.left + 10 : 14; const y = side ? Math.max(rr.top, sb) : sb; return `top:${Math.round(y)}px;right:${Math.round(x)}px;bottom:auto;left:auto`; }},
      go: (i) => {
        const cs = document.querySelectorAll('nav#steps .chip'); const c = cs[i]; if (!c) return;
        syncing = true; c.click(); syncing = false;
        setTimeout(sync, 60);
      },
      end: () => {},
    });
    // bài tự chuyển bước (nút của bài, phím của bài) → báo cho vỏ để màn hình giáo viên đi theo
    const nav = document.querySelector('nav#steps');
    new MutationObserver(() => setTimeout(sync, 30)).observe(nav, {subtree: true, attributes: true, attributeFilter: ['class']});
    const left = document.getElementById('left');
    if (left) new MutationObserver(() => { clearTimeout(sync.t); sync.t = setTimeout(sync, 80); }).observe(left, {subtree: true, childList: true});
    sync();
  }
})();
