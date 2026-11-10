/* Sáng Ăn Khoai · bộ nhớ đệm theo mã băm nội dung. Sinh bởi tools/sw.py; không sửa tay. */
const CACHE = 'bg-noi-dung';
const SCOPE = new URL('./', self.location).href;
const MAN = SCOPE + 'sw-manifest.json';
let man = null, manAt = 0;
const subs = new Map();   // danh sách con theo thư mục lớn (vd. co-the-nguoi/): mã băm của danh sách con → {tệp: mã băm}

const keyOf = (u) => { let k = decodeURIComponent(u.pathname.slice(new URL(SCOPE).pathname.length)); if (k === '' || k.endsWith('/')) k += 'index.html'; return k; };
const slot = (k, h) => SCOPE + k + '?__h=' + h;
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function manifest() {
  if (man && Date.now() - manAt < 30000) return man;
  try {
    // qua bộ nhớ đệm HTTP của trình duyệt (max-age 600): không thêm lượt hỏi mạng trong 10 phút; chờ tối đa 2,5 giây
    const r = await Promise.race([fetch(MAN), new Promise((_, no) => setTimeout(() => no(new Error('chậm')), 2500))]);
    if (r.ok) {
      const j = await r.clone().json();
      const c = await caches.open(CACHE); const old = man;
      man = j; manAt = Date.now(); await c.put(MAN, r);
      if (!old || old.v !== j.v) prune(c, j);
    }
  } catch (e) { /* mất mạng hoặc chậm: dùng danh sách đã lưu */ }
  if (!man) { const r = await (await caches.open(CACHE)).match(MAN); if (r) { man = await r.json(); manAt = Date.now(); } }
  if (man && man.tat) { await caches.delete(CACHE); await self.registration.unregister(); man = null; }
  return man;
}

async function prune(c, m) {
  // bỏ bản đã lưu không còn đúng mã băm trong danh sách mới (bản cũ sau một lần đăng)
  for (const req of await c.keys()) {
    const u = new URL(req.url), h = u.searchParams.get('__h'); if (!h) continue;
    const k = keyOf(u), d = dirOf(m, k);
    if (k.startsWith('sw-manifest/')) { if (!Object.entries(m.d || {}).some(([x, y]) => subKey(x) === k && y === h)) await c.delete(req); continue; }
    if (d) { const s = subs.get(m.d[d]); if (s && s[k] !== h) await c.delete(req); continue; }   // chưa nạp danh sách con thì để nguyên
    if (m.f[k] !== h) await c.delete(req);
  }
}

const dirOf = (m, k) => Object.keys(m.d || {}).find((d) => k.startsWith(d));
const subKey = (d) => 'sw-manifest/' + d.replace(/\/$/, '') + '.json';
// mã băm của tệp k: trong danh sách chính, hoặc trong danh sách con của thư mục lớn (tải khi lần đầu cần, lưu theo mã băm)
async function hashOf(m, k) {
  const d = dirOf(m, k); if (!d) return m.f[k];
  const sh = m.d[d];
  if (!subs.has(sh)) {
    const c = await caches.open(CACHE), sk = subKey(d);
    let r = await c.match(slot(sk, sh));
    if (!r) {
      let g = await getVerified(new Request(SCOPE + sk), sk, sh, false);
      if (!g.r && !g.ok) g = await getVerified(new Request(SCOPE + sk), sk, sh, true);
      if (g.r || !g.ok) return undefined;   // không lấy được danh sách con đúng mã băm: để tệp đi thẳng ra mạng
      r = new Response(g.buf, { status: 200, headers: g.head }); await c.put(slot(sk, sh), r.clone());
    }
    subs.set(sh, await r.json());
  }
  return subs.get(sh)[k];
}

async function getVerified(req, k, h, again) {
  const r = await (again ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req));
  if (!r.ok || r.type === 'opaqueredirect' || r.redirected) return { r };
  const buf = await r.arrayBuffer();
  const ok = hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, h.length) === h;
  const head = { 'content-type': r.headers.get('content-type') || 'application/octet-stream' };
  return { ok, buf, head, status: r.status };
}

async function handle(e, req, k, nav) {
  const m = await manifest();
  let h; try { h = m && await hashOf(m, k); } catch (err) { h = undefined; }
  if (!h) return fetch(req);
  const c = await caches.open(CACHE);
  const hit = await c.match(slot(k, h));
  if (hit) return hit;
  try {
    let g = await getVerified(req, k, h, false);
    if (g.r) return g.r;
    if (!g.ok) g = await getVerified(req, k, h, true);   // bộ nhớ đệm HTTP hay máy chủ còn bản cũ: hỏi lại một lần
    if (g.r) return g.r;
    const res = new Response(g.buf, { status: g.status, headers: g.head });
    if (g.ok) e.waitUntil(c.put(slot(k, h), res.clone()));
    return res;
  } catch (err) {
    const any = await c.match(SCOPE + k, { ignoreSearch: true });   // mất mạng: bản đã lưu gần nhất
    if (any) return any;
    if (nav) return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chưa có mạng</title>'
      + '<body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#1D1B16"><h1 style="font-size:22px">Chưa có mạng</h1>'
      + '<p>Trang này chưa được lưu trên máy. Các bài đã mở trước đây vẫn mở được khi không có mạng.</p><p><a href="' + SCOPE + '">Về trang chính</a></p>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
    throw err;
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range') || !req.url.startsWith(SCOPE)) return;
  const k = keyOf(new URL(req.url));
  if (k === 'sw.js' || k === 'sw-manifest.json' || k.startsWith('sw-manifest/')) return;
  e.respondWith(handle(e, req, k, req.mode === 'navigate'));
});
// gói bài: mọi tệp trong thư mục bài (không tính thư mục bài lồng bên trong), kèm mã băm
async function pack(m, dir) {
  if (!m || !m.g || !m.g[dir]) return null;
  const inner = Object.keys(m.g).filter((o) => o !== dir && o.startsWith(dir));
  let all = m.f; const d = dirOf(m, dir);
  if (d) { await hashOf(m, dir + 'index.html'); all = subs.get(m.d[d]) || {}; }
  return Object.keys(all).filter((k) => k.startsWith(dir) && !inner.some((o) => k.startsWith(o))).map((k) => [k, all[k]]);
}
// trang nhờ tải trước (bài sau): chỉ tệp có trong danh sách và chưa lưu đúng mã băm
self.addEventListener('message', (e) => {
  const d = e.data || {}, port = e.ports && e.ports[0];
  if ((d.t === 'goi' || d.t === 'luu') && port && typeof d.dir === 'string') {
    // goi: bài này có bao nhiêu tệp, bao nhiêu byte, còn thiếu mấy tệp trên máy. luu: tải nốt các tệp còn thiếu, báo tiến độ.
    e.waitUntil((async () => {
      try {
        const m = await manifest(), list = await pack(m, d.dir);
        if (!list) { port.postMessage({ n: 0 }); return; }
        const c = await caches.open(CACHE); const miss = [];
        for (const [k, h] of list) if (!(await c.match(slot(k, h)))) miss.push([k, h]);
        if (d.t === 'goi') { port.postMessage({ n: list.length, bytes: m.g[d.dir][1], con: miss.length }); return; }
        let done = list.length - miss.length, loi = 0;
        for (let i = 0; i < miss.length; i += 4) {
          await Promise.all(miss.slice(i, i + 4).map(async ([k, h]) => {
            try {
              let g = await getVerified(new Request(SCOPE + k), k, h, false);
              if (!g.r && !g.ok) g = await getVerified(new Request(SCOPE + k), k, h, true);
              if (g.ok) { await c.put(slot(k, h), new Response(g.buf, { status: g.status, headers: g.head })); done++; } else loi++;
            } catch (err) { loi++; }
          }));
          port.postMessage({ n: list.length, done, loi });
        }
        port.postMessage({ n: list.length, done, loi, xong: true });
      } catch (err) { port.postMessage({ n: 0, loi: 1, xong: true }); }
    })());
    return;
  }
  if (d.t !== 'prefetch' || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const m = await manifest(); if (!m) return;
    const c = await caches.open(CACHE);
    for (const u of d.urls.slice(0, 4)) {
      try {
        const url = new URL(u, SCOPE); if (!url.href.startsWith(SCOPE)) continue;
        const k = keyOf(url), h = await hashOf(m, k); if (!h || await c.match(slot(k, h))) continue;
        const g = await getVerified(new Request(url.href), k, h, false);
        if (g.ok) await c.put(slot(k, h), new Response(g.buf, { status: g.status, headers: g.head }));
      } catch (err) { /* bỏ qua */ }
    }
  })());
});
