/* Vỏ Bài Giảng (bg-shell) · M1 "nền chung liền mạch"
 * Một tệp, không phụ thuộc, nhúng vào mọi bài. Cho mọi bài cùng một cách lên lớp:
 *   - Chế độ lên lớp: phím mũi tên, PageUp/PageDown (cả bút trình chiếu) chuyển bước; B màn đen; F toàn màn hình.
 *   - Màn hình giáo viên: cửa sổ thứ hai trên cùng máy (kéo sang laptop khi máy chiếu mở rộng màn hình), thấy ghi chú và đáp án.
 *   - Điều khiển bằng điện thoại: quét mã QR (WebRTC qua PeerJS, chỉ tải khi giáo viên bấm, cần mạng).
 * Bài học gắn vào bằng BGShell.mount({ id, title, subject, objectives, steps:[{t, note, ask}], go(i), end() })
 * và báo bước hiện tại bằng BGShell.update(i) khi chính bài tự chuyển bước. Mã MIT, thuộc repo nclamvn/bai-giang.
 */
(function () {
  'use strict';
  if (window.BGShell && window.BGShell.version) return;
  const VERSION = '1.0.0';
  const REMOTE_URL = 'https://nclamvn.github.io/bai-giang/dieu-khien/';
  const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const QRLIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';

  /* ---------- hệ thiết kế: token dùng chung (xem docs/he-thiet-ke.md) ---------- */
  const TOKENS = `
  .bgs{--bgs-ink:#1c1c1e;--bgs-ink2:#5b5b63;--bgs-hair:rgba(15,23,42,.10);--bgs-accent:#C2184A;--bgs-accent-ink:#fff;
    --bgs-fill:rgba(255,255,255,.72);--bgs-stroke:rgba(255,255,255,.75);--bgs-blur:blur(22px) saturate(180%);
    --bgs-shadow:0 0 0 .5px rgba(15,23,42,.06),0 12px 32px -14px rgba(15,23,42,.30);--bgs-r:18px;--bgs-r-sm:12px;
    --bgs-font:"Inter","SF Pro Text",system-ui,-apple-system,"Segoe UI",sans-serif;--bgs-mono:"JetBrains Mono",ui-monospace,monospace}
  .bgs[data-variant="dai-hoc"]{--bgs-ink:#2a2521;--bgs-ink2:#7d7165;--bgs-hair:#e3d6c1;--bgs-accent:#e3562a;
    --bgs-fill:rgba(251,247,240,.96);--bgs-stroke:#e3d6c1;--bgs-blur:none;--bgs-shadow:0 10px 26px -16px rgba(60,40,20,.35);--bgs-r:6px;--bgs-r-sm:4px}`;
  const CSS = TOKENS + `
  .bgs,.bgs *{box-sizing:border-box}
  .bgs{position:fixed;z-index:2147483000;font:500 13px/1.4 var(--bgs-font);color:var(--bgs-ink);-webkit-font-smoothing:antialiased}
  .bgs-glass{background:var(--bgs-fill);-webkit-backdrop-filter:var(--bgs-blur);backdrop-filter:var(--bgs-blur);border:1px solid var(--bgs-stroke);box-shadow:var(--bgs-shadow)}
  .bgs-dock{right:14px;bottom:14px;display:flex;gap:6px;padding:6px;border-radius:999px}
  .bgs[data-variant="dai-hoc"].bgs-dock{border-radius:var(--bgs-r)}
  .bgs button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
  .bgs-b{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:999px;font-weight:600;white-space:nowrap}
  .bgs[data-variant="dai-hoc"] .bgs-b{border-radius:var(--bgs-r-sm);font:700 11px var(--bgs-mono);letter-spacing:1.2px;text-transform:uppercase}
  .bgs-b:hover{background:rgba(15,23,42,.06)}
  .bgs-b.on,.bgs-b.pri{background:var(--bgs-accent);color:var(--bgs-accent-ink)}
  .bgs-b svg{width:15px;height:15px}
  .bgs-hud{left:14px;bottom:14px;display:none;align-items:center;gap:12px;padding:8px 14px 8px 10px;border-radius:999px;max-width:min(560px,calc(100vw - 340px))}
  .bgs[data-variant="dai-hoc"].bgs-hud{border-radius:var(--bgs-r)}
  .bgs-hud.show{display:flex}
  .bgs-hud .n{min-width:44px;height:28px;border-radius:999px;background:var(--bgs-accent);color:#fff;display:grid;place-items:center;font-weight:700;font-variant-numeric:tabular-nums}
  .bgs-hud .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
  .bgs-hud .c{color:var(--bgs-ink2);font-variant-numeric:tabular-nums}
  .bgs-black{inset:0;background:#000;display:none;cursor:none}
  .bgs-black.show{display:block}
  .bgs-black span{position:absolute;right:18px;bottom:14px;color:#333;font:600 12px var(--bgs-font)}
  .bgs-modal{inset:0;display:none;place-items:center;background:rgba(15,23,42,.28)}
  .bgs-modal.show{display:grid}
  .bgs-card{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border-radius:var(--bgs-r);padding:20px 22px;background:#fff;box-shadow:0 30px 80px -20px rgba(15,23,42,.45)}
  .bgs[data-variant="dai-hoc"] .bgs-card{background:#fbf7f0;border:1px solid var(--bgs-hair)}
  .bgs-card h3{margin:0 0 4px;font-size:19px;letter-spacing:-.01em}
  .bgs-card p{margin:6px 0;color:var(--bgs-ink2)}
  .bgs-opt{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;width:100%;text-align:left;margin-top:12px;padding:14px;border-radius:var(--bgs-r-sm);border:1px solid var(--bgs-hair)!important}
  .bgs-opt:hover{border-color:var(--bgs-accent)!important}
  .bgs-opt b{display:block;font-size:15px}
  .bgs-opt i{font-style:normal;color:var(--bgs-ink2)}
  .bgs-ico{width:38px;height:38px;border-radius:10px;background:rgba(194,24,74,.1);color:var(--bgs-accent);display:grid;place-items:center}
  .bgs-qr{display:grid;justify-items:center;gap:8px;margin-top:14px}
  .bgs-qr canvas,.bgs-qr img{width:220px;height:220px;image-rendering:pixelated}
  .bgs-code{font:700 22px var(--bgs-mono);letter-spacing:3px}
  .bgs-small{font-size:12px;color:var(--bgs-ink2)}
  .bgs-keys{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:12px 0 0;font-size:13px}
  .bgs-keys kbd{font:600 11.5px var(--bgs-mono);background:rgba(15,23,42,.06);border-radius:6px;padding:2px 7px}
  .bgs-x{float:right;height:30px;padding:0 10px;border-radius:999px}
  .bgs-toast{left:50%;top:16px;transform:translateX(-50%);padding:9px 16px;border-radius:999px;font-weight:600;opacity:0;transition:opacity .25s;pointer-events:none}
  .bgs-toast.show{opacity:1}
  @media (max-width:640px){.bgs-dock .bgs-lbl{display:none}.bgs-hud{max-width:calc(100vw - 200px)}}
  .bgs-dock.bgs-compact .bgs-lbl{display:none}
  .bgs-dock.bgs-compact .bgs-b{padding:0 10px}
  .bgs-dock.bgs-vert{flex-direction:column}
  @media (pointer:coarse){.bgs-b{height:44px;min-width:44px;justify-content:center}.bgs-dock{gap:4px}}
  @media print{.bgs{display:none!important}}`;

  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/></svg>',
    screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  };
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Không tải được ' + src)); document.head.appendChild(s); });

  /* ---------- trạng thái ---------- */
  const S = { L: null, i: -1, on: false, black: false, t0: 0, links: new Set(), peer: null, variant: 'pho-thong' };
  let dock, hud, black, modal, toast, styleTag;

  function snapshot() {
    const L = S.L;
    return { t: 'state', v: VERSION, lesson: L ? { id: L.id, title: L.title, subject: L.subject || '', objectives: L.objectives || [], steps: (L.steps || []).map((s) => ({ t: s.t, note: s.note || '', ask: s.ask || null })) } : null,
      i: S.i, on: S.on, black: S.black, elapsed: S.on ? Date.now() - S.t0 : 0 };
  }
  function broadcast() { if (S.relayout) S.relayout(); const m = snapshot(); for (const l of S.links) { try { l.send(m); } catch (e) { S.links.delete(l); } } renderHud(); }
  function say(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 2200); }

  /* ---------- điều khiển bước ---------- */
  function go(i) {
    const L = S.L; if (!L || !L.steps || !L.steps.length) return;
    i = Math.max(0, Math.min(L.steps.length - 1, i));
    if (!S.on) start(true);
    S.i = i; try { L.go(i); } catch (e) { console.error('[bg-shell] go', e); }
    broadcast();
  }
  const next = () => go(S.i + 1), prev = () => go(S.i - 1);
  function start(quiet) {
    if (S.on) return; S.on = true; S.t0 = Date.now(); if (S.i < 0) S.i = 0;
    dock.querySelector('[data-k="class"]').classList.add('on');
    dock.querySelector('[data-k="class"]').innerHTML = `${ICON.stop}<span class="bgs-lbl">Kết thúc</span>`;
    if (!quiet) { try { S.L.go(S.i); } catch (e) { console.error(e); } say('Chế độ lên lớp · → bước sau, ← bước trước, B màn đen'); }
    broadcast();
  }
  function stop() {
    if (!S.on) return; S.on = false; setBlack(false);
    dock.querySelector('[data-k="class"]').classList.remove('on');
    dock.querySelector('[data-k="class"]').innerHTML = `${ICON.play}<span class="bgs-lbl">Lên lớp</span>`;
    try { S.L.end && S.L.end(); } catch (e) { console.error(e); }
    broadcast();
  }
  function setBlack(v) { S.black = v; black.classList.toggle('show', v); broadcast(); }
  function fullscreen() { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement); }

  function handle(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') broadcast();
    else if (m.t === 'go') go(+m.i);
    else if (m.t === 'next') next();
    else if (m.t === 'prev') prev();
    else if (m.t === 'black') setBlack(!S.black);
    else if (m.t === 'start') start();
    else if (m.t === 'stop') stop();
  }

  function renderHud() {
    const L = S.L; if (!hud) return;
    hud.classList.toggle('show', S.on && !!L);
    if (!S.on || !L) return;
    const st = L.steps[S.i] || {};
    hud.innerHTML = `<span class="n">${S.i + 1}/${L.steps.length}</span><span class="t">${esc(st.t)}</span><span class="c" data-clock>${fmt(Date.now() - S.t0)}</span>${S.links.size ? `<span class="c" title="Thiết bị điều khiển đang nối">● ${S.links.size}</span>` : ''}`;
  }
  setInterval(() => { const c = hud && hud.querySelector('[data-clock]'); if (c && S.on) c.textContent = fmt(Date.now() - S.t0); }, 1000);

  /* ---------- phím (bắt trước bài học) ---------- */
  function onKey(e) {
    if (!S.L) return;
    const tg = e.target; if (tg && tg.closest && tg.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey || e.altKey;
    if (mod) return;
    if ((k === 'p' || k === 'P') && e.shiftKey) { e.preventDefault(); S.on ? stop() : start(); return; }
    if (!S.on) return;
    let used = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown') next(); // không dùng phím cách: nhiều bài dùng nó để tạm dừng
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') prev();
    else if (k === 'Home') go(0);
    else if (k === 'End') go(S.L.steps.length - 1);
    else if (k === 'b' || k === 'B' || k === '.') setBlack(!S.black);
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'Escape') { if (S.black) setBlack(false); else used = false; }
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  /* ---------- màn hình giáo viên và điện thoại ---------- */
  function openModal(html) { modal.querySelector('.bgs-card').innerHTML = `<button class="bgs-b bgs-x" data-x>Đóng</button>` + html; modal.classList.add('show'); }
  function closeModal() { modal.classList.remove('show'); }
  function connectMenu() {
    openModal(`<h3>Điều khiển bài giảng</h3><p>Chọn cách giáo viên điều khiển màn chiếu. Bút trình chiếu cắm USB dùng được ngay, không cần chọn gì.</p>
      <button class="bgs-opt" data-k="window"><span class="bgs-ico">${ICON.screen}</span><span><b>Màn hình giáo viên trên máy này</b><i>Mở cửa sổ thứ hai có danh sách bước, ghi chú và đáp án. Kéo cửa sổ sang màn hình laptop khi máy chiếu đang mở rộng màn hình. Không cần mạng.</i></span></button>
      <button class="bgs-opt" data-k="phone"><span class="bgs-ico">${ICON.phone}</span><span><b>Điện thoại của giáo viên</b><i>Quét mã QR để chuyển bước từ điện thoại. Cần mạng Internet ở cả hai máy.</i></span></button>
      <div class="bgs-keys"><kbd>→ PgDn</kbd><span>bước sau</span><kbd>← PgUp</kbd><span>bước trước</span><kbd>B</kbd><span>màn đen để học sinh tập trung nghe</span><kbd>F</kbd><span>toàn màn hình</span><kbd>Shift P</kbd><span>bật, tắt chế độ lên lớp</span></div>`);
  }
  function openWindow() {
    const w = window.open('', 'bgs-teacher-' + (S.L.id || 'bai'), 'width=520,height=760');
    if (!w) { say('Trình duyệt chặn cửa sổ mới: cho phép cửa sổ bật lên rồi thử lại'); return; }
    w.document.open(); w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Màn hình giáo viên · ${esc(S.L.title)}</title></head><body></body></html>`); w.document.close();
    let peer = null;
    const link = { send: (m) => peer && peer(m) };
    S.links.add(link);
    runRemote(w.document, { send: handle, onMessage: (fn) => { peer = fn; }, close: () => S.links.delete(link) }, S.variant);
    w.addEventListener('beforeunload', () => { S.links.delete(link); renderHud(); });
    closeModal(); if (!S.on) start(); broadcast();
  }
  async function openPhone() {
    openModal(`<h3>Điện thoại của giáo viên</h3><p>Đang chuẩn bị mã kết nối…</p>`);
    try {
      if (!window.Peer) await loadScript(PEERJS);
      if (!window.qrcode) await loadScript(QRLIB);
    } catch (e) { openModal(`<h3>Không tải được bộ kết nối</h3><p>Máy cần mạng Internet để dùng điện thoại làm điều khiển. Khi không có mạng, hãy dùng màn hình giáo viên trên máy này hoặc bút trình chiếu.</p>`); return; }
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    const id = 'baigiang-' + code.toLowerCase();
    if (S.peer) { try { S.peer.destroy(); } catch (e) { /* bỏ qua */ } }
    const peer = new window.Peer(id); S.peer = peer;
    peer.on('error', (e) => openModal(`<h3>Không kết nối được</h3><p>${esc(e && e.type || e)}. Thử lại, hoặc dùng màn hình giáo viên trên máy này.</p>`));
    peer.on('open', () => {
      const url = `${REMOTE_URL}#${code}`;
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      openModal(`<h3>Quét để điều khiển</h3><p>Mở camera điện thoại, quét mã. Hoặc vào <b>${esc(REMOTE_URL.replace('https://', ''))}</b> và nhập mã.</p>
        <div class="bgs-qr">${qr.createImgTag(6, 8)}<div class="bgs-code">${code}</div><div class="bgs-small">Kết nối trực tiếp giữa hai máy (WebRTC), không lưu gì trên máy chủ.</div></div>`);
    });
    peer.on('connection', (conn) => {
      const link = { send: (m) => conn.open && conn.send(m) };
      conn.on('open', () => { S.links.add(link); closeModal(); say('Đã nối điện thoại'); if (!S.on) start(); broadcast(); });
      conn.on('data', handle);
      conn.on('close', () => { S.links.delete(link); renderHud(); say('Điện thoại đã ngắt'); });
    });
  }

  /* ---------- giao diện điều khiển (dùng cho cửa sổ giáo viên và trang điện thoại) ---------- */
  function runRemote(doc, port, variant) {
    const st = doc.createElement('style');
    st.textContent = TOKENS + `
      *{box-sizing:border-box}html,body{margin:0;height:100%}
      body{font:500 15px/1.45 var(--bgs-font);color:var(--bgs-ink);background:#f4f4f7;-webkit-font-smoothing:antialiased}
      body.bgs[data-variant="dai-hoc"]{background:#f2e6d2}
      .bgs{position:static}
      header{position:sticky;top:0;padding:14px 16px 10px;background:rgba(244,244,247,.92);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--bgs-hair);z-index:2}
      body[data-variant="dai-hoc"] header{background:rgba(242,230,210,.95)}
      .k{font:700 11px var(--bgs-mono);letter-spacing:1.4px;text-transform:uppercase;color:var(--bgs-ink2)}
      h1{margin:2px 0 0;font-size:19px;letter-spacing:-.01em}
      .row{display:flex;gap:8px;align-items:center;margin-top:10px}
      .clock{font:700 15px var(--bgs-mono);margin-left:auto}
      .st{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--bgs-ink2)}
      .st i{width:8px;height:8px;border-radius:50%;background:#aaa}.st.ok i{background:#2C7A4B}
      main{padding:12px 16px 120px}
      .now{border-radius:var(--bgs-r);padding:14px 16px;background:#fff;box-shadow:var(--bgs-shadow)}
      body[data-variant="dai-hoc"] .now{background:#fbf7f0;border:1px solid var(--bgs-hair)}
      .now h2{margin:4px 0 6px;font-size:21px;letter-spacing:-.01em}
      .note{color:var(--bgs-ink2);white-space:pre-wrap}
      .ask{margin-top:12px;border-radius:12px;padding:10px 12px;background:rgba(232,176,75,.16)}
      .ask ol{margin:6px 0 0;padding-left:20px}.ask li.a{font-weight:700;color:#2C7A4B}
      .ask .e{margin-top:6px;font-size:13.5px;color:var(--bgs-ink2)}
      ol.steps{list-style:none;margin:14px 0 0;padding:0}
      ol.steps li{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer}
      ol.steps li:hover{background:rgba(15,23,42,.05)}
      ol.steps li.cur{background:var(--bgs-accent);color:#fff}
      ol.steps li b{min-width:26px;font-variant-numeric:tabular-nums}
      ol.steps li .q{margin-left:auto;font-size:11px;opacity:.75}
      .bar{position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr 2fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(244,244,247,.94);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-top:1px solid var(--bgs-hair)}
      body[data-variant="dai-hoc"] .bar{background:rgba(242,230,210,.96)}
      .bar button{height:58px;border:0;border-radius:16px;font:700 16px var(--bgs-font);background:#fff;color:var(--bgs-ink);box-shadow:var(--bgs-shadow)}
      .bar button.pri{background:var(--bgs-accent);color:#fff}
      .bar button.on{background:#111;color:#fff}
      .obj{margin:10px 0 0;padding-left:18px;color:var(--bgs-ink2);font-size:13.5px}
      details{margin-top:14px}summary{cursor:pointer;font-weight:600}
      .empty{padding:40px 16px;text-align:center;color:var(--bgs-ink2)}`;
    doc.head.appendChild(st);
    const b = doc.body; b.className = 'bgs'; b.dataset.variant = variant || 'pho-thong';
    b.innerHTML = `<header><div class="k" id="sub">Màn hình giáo viên</div><h1 id="ttl">Đang nối…</h1>
      <div class="row"><span class="st" id="stt"><i></i><span>chưa nối</span></span><span class="clock" id="clk">00:00</span></div></header>
      <main id="main"><div class="empty">Đang chờ bài giảng…</div></main>
      <div class="bar"><button id="bB">Màn đen</button><button id="bP">← Trước</button><button class="pri" id="bN">Tiếp →</button></div>`;
    const $ = (id) => doc.getElementById(id);
    let last = null;
    const send = (m) => { try { port.send(m); } catch (e) { /* bỏ qua */ } };
    $('bN').onclick = () => send({ t: 'next' });
    $('bP').onclick = () => send({ t: 'prev' });
    $('bB').onclick = () => send({ t: 'black' });
    doc.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); send({ t: 'next' }); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); send({ t: 'prev' }); }
      if (e.key === 'b' || e.key === 'B') send({ t: 'black' });
    });
    let t0 = 0, prevI = -1;
    setInterval(() => { if (last && last.on) $('clk').textContent = fmt(Date.now() - t0); }, 1000);
    port.onMessage((m) => {
      if (!m || m.t !== 'state') return;
      const fresh = !last || !last.lesson || !m.lesson || last.lesson.id !== m.lesson.id;
      last = m; t0 = Date.now() - (m.elapsed || 0);
      $('stt').className = 'st ok'; $('stt').lastChild.textContent = 'đã nối';
      const L = m.lesson; if (!L) return;
      $('sub').textContent = (L.subject ? L.subject + ' · ' : '') + 'Màn hình giáo viên';
      $('ttl').textContent = L.title;
      $('bB').classList.toggle('on', !!m.black); $('bB').textContent = m.black ? 'Bật lại' : 'Màn đen';
      const s = L.steps[m.i] || L.steps[0] || {};
      const ask = s.ask ? `<div class="ask"><b>Câu hỏi cho lớp:</b> ${esc(s.ask.q)}<ol type="A">${(s.ask.o || []).map((o, k) => `<li class="${k === s.ask.a ? 'a' : ''}">${esc(o)}${k === s.ask.a ? ' ✓' : ''}</li>`).join('')}</ol>${s.ask.e ? `<div class="e">${esc(s.ask.e)}</div>` : ''}</div>` : '';
      $('main').innerHTML = `<section class="now"><div class="k">Bước ${m.i + 1}/${L.steps.length}${m.on ? '' : ' · chưa bắt đầu'}</div><h2>${esc(s.t)}</h2><div class="note">${esc(s.note)}</div>${ask}</section>
        <ol class="steps">${L.steps.map((x, k) => `<li class="${k === m.i ? 'cur' : ''}" data-i="${k}"><b>${k + 1}</b><span>${esc(x.t)}</span>${x.ask ? '<span class="q">câu hỏi</span>' : ''}</li>`).join('')}</ol>
        ${L.objectives && L.objectives.length ? `<details ${fresh ? '' : 'open'}><summary>Yêu cầu cần đạt</summary><ul class="obj">${L.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></details>` : ''}`;
      $('main').querySelectorAll('li[data-i]').forEach((li) => { li.onclick = () => send({ t: 'go', i: +li.dataset.i }); });
      if (!fresh && last.i !== prevI) (doc.scrollingElement || doc.documentElement).scrollTop = 0; // bước mới: đưa ghi chú lên đầu
      prevI = m.i;
    });
    send({ t: 'hello' });
    return { status: (txt, ok) => { $('stt').className = 'st' + (ok ? ' ok' : ''); $('stt').lastChild.textContent = txt; } };
  }

  /* ---------- gắn vào bài ---------- */
  function mount(L) {
    if (!L || typeof L.go !== 'function') throw new Error('BGShell.mount cần { steps, go(i) }');
    S.L = L; S.variant = L.variant || 'pho-thong'; S.i = -1;
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'bg-shell-css'; styleTag.textContent = CSS; document.head.appendChild(styleTag); }
    const mk = (cls, html) => { const n = el('div', 'bgs ' + cls, html); n.dataset.variant = S.variant; document.body.appendChild(n); return n; };
    if (L.accent) document.documentElement.style.setProperty('--bgs-accent', L.accent);
    dock = mk('bgs-dock bgs-glass', `<button class="bgs-b pri" data-k="class" title="Chế độ lên lớp (Shift P)">${ICON.play}<span class="bgs-lbl">Lên lớp</span></button><button class="bgs-b" data-k="remote" title="Màn hình giáo viên, điện thoại">${ICON.phone}<span class="bgs-lbl">Điều khiển</span></button><button class="bgs-b" data-k="full" title="Toàn màn hình (F)">${ICON.full}</button>`);
    hud = mk('bgs-hud bgs-glass', '');
    black = mk('bgs-black', '<span>Màn đen · bấm B để bật lại</span>');
    modal = mk('bgs-modal', '<div class="bgs-card"></div>');
    toast = mk('bgs-toast bgs-glass', '');
    if (L.accent) for (const n of [dock, hud, modal, toast]) n.style.setProperty('--bgs-accent', L.accent);
    // vị trí riêng cho từng bài trên màn rộng (tránh đè bảng của bài); màn hẹp dùng mặc định
    // vị trí: mỗi bài đặt riêng trên màn rộng để không đè bảng của bài. Điện thoại (cạnh ngắn < 560 px) ẩn thanh lên lớp:
    // học sinh dùng điện thoại để tự học, giáo viên lên lớp từ máy tính; phím và ?lenlop vẫn dùng được.
    const Ly = L.layout || {};
    const val = (v) => (typeof v === 'function' ? v() : v) || '';
    const apply = () => {
      const wide = innerWidth >= (Ly.minWidth ?? 900), phone = Math.min(innerWidth, innerHeight) < 560;
      dock.style.cssText = wide ? val(Ly.dock) : ''; hud.style.cssText = wide ? val(Ly.hud) : '';
      dock.classList.toggle('bgs-compact', !!val(Ly.compact) || !wide); dock.classList.toggle('bgs-vert', !!Ly.vertical && wide);
      if (phone && !S.on) dock.style.display = 'none';
      if (phone) hud.style.display = 'none';
      if (L.accent) for (const n of [dock, hud]) n.style.setProperty('--bgs-accent', L.accent);
    };
    apply(); addEventListener('resize', apply); S.relayout = apply;
    if (typeof Ly.dock === 'function' || typeof Ly.hud === 'function') setInterval(apply, 1200); // bảng của bài có thể gập, mở
    dock.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === 'class') S.on ? stop() : start();
      if (b.dataset.k === 'remote') connectMenu();
      if (b.dataset.k === 'full') fullscreen();
    });
    black.addEventListener('click', () => setBlack(false));
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-x]')) closeModal();
      const o = e.target.closest('.bgs-opt'); if (!o) return;
      if (o.dataset.k === 'window') openWindow();
      if (o.dataset.k === 'phone') openPhone();
    });
    addEventListener('keydown', onKey, true);
    const q = new URLSearchParams(location.search);
    if (q.has('lenlop')) start();
    return api;
  }
  function update(i) { if (!S.L) return; if (i == null || i < 0) { if (S.on) stop(); return; } S.i = i; if (!S.on) { S.on = true; S.t0 = Date.now(); const b = dock.querySelector('[data-k="class"]'); b.classList.add('on'); b.innerHTML = `${ICON.stop}<span class="bgs-lbl">Kết thúc</span>`; } broadcast(); }

  /* ---------- trang điều khiển trên điện thoại ---------- */
  async function phonePage() {
    document.title = 'Điều khiển Bài Giảng';
    const code0 = decodeURIComponent(location.hash.slice(1)).trim().toUpperCase();
    const askCode = () => new Promise((ok) => {
      document.body.innerHTML = `<div style="font:500 16px system-ui;padding:32px 20px;max-width:420px;margin:auto"><h2 style="margin:0 0 6px">Điều khiển Bài Giảng</h2><p style="color:#666">Nhập mã 4 ký tự hiện trên màn chiếu.</p><input id="c" maxlength="4" autocapitalize="characters" style="font:700 28px monospace;letter-spacing:6px;width:100%;padding:12px;border-radius:14px;border:1px solid #ccc;text-transform:uppercase"><button id="g" style="margin-top:12px;width:100%;height:54px;border:0;border-radius:14px;background:#C2184A;color:#fff;font:700 17px system-ui">Kết nối</button></div>`;
      document.getElementById('g').onclick = () => ok(document.getElementById('c').value.trim().toUpperCase());
    });
    const code = /^[A-Z0-9]{4}$/.test(code0) ? code0 : await askCode();
    let handler = null, conn = null;
    const ui = runRemote(document, { send: (m) => conn && conn.open && conn.send(m), onMessage: (fn) => { handler = fn; } }, 'pho-thong');
    ui.status('đang tải bộ kết nối…');
    try { if (!window.Peer) await loadScript(PEERJS); } catch (e) { ui.status('cần mạng Internet'); return; }
    const peer = new window.Peer();
    peer.on('error', (e) => ui.status('lỗi: ' + (e && e.type || e)));
    peer.on('open', () => {
      ui.status('đang nối mã ' + code + '…');
      conn = peer.connect('baigiang-' + code.toLowerCase(), { reliable: true });
      conn.on('open', () => { ui.status('đã nối', true); conn.send({ t: 'hello' }); });
      conn.on('data', (m) => handler && handler(m));
      conn.on('close', () => ui.status('mất kết nối: quét lại mã'));
    });
  }

  const api = { version: VERSION, mount, update, refresh: () => broadcast(), go, next, prev, start, stop, phonePage, runRemote, get state() { return snapshot(); }, _handle: handle };
  window.BGShell = api;
})();
