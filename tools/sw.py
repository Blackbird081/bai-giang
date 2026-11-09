#!/usr/bin/env python3
"""Bộ nhớ đệm theo mã băm nội dung cho cả site (service worker), bước cuối của tools/build_all.py.

  python3 tools/sw.py          ghi sw-manifest.json, sw.js và khối đăng ký <script id="bg-sw"> vào mọi trang HTML được phục vụ

Vì sao: GitHub Pages chỉ cho bộ nhớ đệm 10 phút (cache-control: max-age=600) và mỗi lần đăng thì đổi ETag của mọi tệp, kể cả
tệp không đổi. Người học quay lại sau 10 phút phải hỏi lại máy chủ từng tệp; sau mỗi lần đăng phải tải lại hết (Cơ thể người
4,6 MB, bài thư viện 0,5 MB) dù nội dung y nguyên. Ở trường mạng chậm hoặc chập chờn, đó là chỗ chờ lớn nhất.

Cách làm, không đánh đổi chất lượng (tệp nhận được trùng từng byte với bản trên site):
  · sw-manifest.json: mã băm SHA-256 (12 kí tự đầu) của mọi tệp site phục vụ. Tệp chỉ tải lại khi mã băm đổi. Thư mục lớn
    (Cơ thể người) có danh sách con ở sw-manifest/, chỉ tải khi vào thư mục đó.
  · sw.js: tệp có trong danh sách và đã lưu đúng mã băm thì trả ngay từ máy, không hỏi mạng; chưa có thì tải, tính lại
    SHA-256 và chỉ lưu khi khớp danh sách (máy chủ hay bộ nhớ đệm HTTP còn bản cũ thì hỏi lại một lần, vẫn lệch thì dùng
    nhưng không lưu). Mất mạng: trả bản đã lưu gần nhất của trang hoặc tệp. Danh sách đọc qua bộ nhớ đệm HTTP (10 phút),
    nên trang mở ngay, bản mới vào chậm nhất 10 phút sau khi đăng, như hiện nay.
  · Trang bài gửi lời nhờ tải trước "Bài sau" khi máy rảnh và mạng tốt (shell/bg-shell.js), để bấm sang là mở ngay.
  · Công tắc: thêm "tat": true vào sw-manifest.json thì sw.js tự gỡ và xoá bộ nhớ của mình; ?sw=0 trên một trang gỡ ở máy đó.
"""
import hashlib, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# không phục vụ cho người học (mã nguồn, công cụ, kiểm thử, tài liệu kho)
SKIP = re.compile(r'^(tools/|tests/|src/|docs/|\.github/|offline/|LICENSE$|README|build\.sh$|\.nojekyll$|\.gitignore$|sw\.js$|sw-manifest\.json$|sw-manifest/)'
                  r'|__pycache__|\.py$|\.md$|\.tsv$|\.mjs$|/_viet-hoa/')
SPLIT = 300
MARK = re.compile(r'<script id="bg-sw">.*?</script>\n?', re.S)


def served():
    out = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return sorted(f for f in out.split('\n') if f and not SKIP.search(f) and (ROOT / f).is_file())


def rel_root(path):
    d = pathlib.PurePosixPath(path).parent
    return '../' * len(d.parts) if d.parts else './'


def snippet(root):
    # chỉ đăng ký trên site thật và máy thử (không trong bản đăng lên Claude hay tệp offline); chờ trang tải xong 3 giây
    return ('<script id="bg-sw">(function(){try{if(!("serviceWorker"in navigator)||!/(^|\\.)github\\.io$|^localhost$|^127\\.0\\.0\\.1$/.test(location.hostname))return;'
            f'var r=new URL("{root}",location.href).href;'
            'if(/[?&]sw=0/.test(location.search)){navigator.serviceWorker.getRegistrations().then(function(a){a.forEach(function(x){x.unregister()})});return}'
            'addEventListener("load",function(){setTimeout(function(){navigator.serviceWorker.register(r+"sw.js",{scope:r}).catch(function(){})},3000)})'
            '}catch(e){}})();</script>\n')


def put_snippet(path):
    p = ROOT / path; s = p.read_text(encoding='utf-8'); t = MARK.sub('', s); sn = snippet(rel_root(path))
    if '</head>' in t: t = t.replace('</head>', sn + '</head>', 1)
    else:  # trang viết gọn không có thẻ head (Tế Bào): đặt ngay sau <meta charset>
        m = re.search(r'<meta charset="?utf-8"?>\n?', t, re.I)
        if not m: return False
        t = t[:m.end()] + sn + t[m.end():]
    if t != s: p.write_text(t, encoding='utf-8')
    return True


SW = r"""/* Sáng Ăn Khoai · bộ nhớ đệm theo mã băm nội dung. Sinh bởi tools/sw.py; không sửa tay. */
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
      + '<body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#15171C"><h1 style="font-size:22px">Chưa có mạng</h1>'
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
"""


def main():
    files = served()
    pages = [f for f in files if f.endswith('.html')]
    n = sum(put_snippet(f) for f in pages)
    files = served()  # trang vừa đổi: tính mã băm sau khi chèn khối đăng ký
    f = {x: hashlib.sha256((ROOT / x).read_bytes()).hexdigest()[:12] for x in files}
    # "gói bài": thư mục có index.html và tệp kèm (mô hình, ảnh). g[thư mục] = [số tệp, số byte], không tính thư mục bài lồng
    # bên trong (vd. co-the-nguoi/dental/ là gói riêng). Menu của bài dùng để "Lưu bài để dùng khi mất mạng".
    lesson_dirs = sorted({x.rsplit('/', 1)[0] + '/' for x in f if x.endswith('/index.html')}, key=len, reverse=True)
    g = {}
    for dd in lesson_dirs:
        own = [x for x in f if x.startswith(dd) and not any(o != dd and o.startswith(dd) and x.startswith(o) for o in lesson_dirs)]
        if len(own) > 1: g[dd] = [len(own), sum((ROOT / x).stat().st_size for x in own)]
    # thư mục lớn (từ SPLIT tệp, vd. co-the-nguoi/ 2.800 tệp) có danh sách con riêng ở sw-manifest/<thư mục>.json: trang khác
    # không phải tải phần đó; danh sách chính chỉ giữ mã băm của danh sách con
    tops = {}
    for x in f: tops.setdefault(x.split('/')[0] + '/', []).append(x)
    sub_dir = ROOT / 'sw-manifest'; sub_dir.mkdir(exist_ok=True); d = {}; keep = set()
    for top, xs in sorted(tops.items()):
        if '/' not in xs[0] or len(xs) < SPLIT: continue
        body = json.dumps({x: f.pop(x) for x in xs}, separators=(',', ':'), sort_keys=True) + '\n'
        name = top.rstrip('/') + '.json'; (sub_dir / name).write_text(body, encoding='utf-8'); keep.add(name)
        d[top] = hashlib.sha256(body.encode()).hexdigest()[:12]
    for old in sub_dir.iterdir():
        if old.name not in keep: old.unlink()
    v = hashlib.sha256(json.dumps([f, d, g], sort_keys=True).encode()).hexdigest()[:12]
    (ROOT / 'sw-manifest.json').write_text(json.dumps({'v': v, 'f': f, 'd': d, 'g': g}, separators=(',', ':'), sort_keys=True) + '\n', encoding='utf-8')
    (ROOT / 'sw.js').write_text(SW, encoding='utf-8')
    print(f'bộ nhớ đệm: {len(f)} tệp trong danh sách chính, {len(d)} danh sách con ({", ".join(d)}), {n} trang có khối đăng ký, phiên bản {v}')


if __name__ == '__main__':
    sys.exit(main())
