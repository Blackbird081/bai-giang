#!/usr/bin/env python3
"""Kiểm bộ nhớ đệm theo mã băm (sw.js, tools/sw.py) trên máy thử.

  python3 tests/sw_check.py [cổng]        cần máy chủ tĩnh ở gốc kho (python3 -m http.server 8777)

Một trình duyệt mới, một bài thư viện có "Bài sau":
  1. lần đầu: sw.js được đăng ký và nắm trang;
  2. mở lại: mọi tệp trong danh sách đi qua sw.js và được lưu;
  3. tệp trong bộ nhớ trùng mã băm trong danh sách (đọc lại, tính SHA-256 trong trang); "Bài sau" đã được tải trước;
  4. tắt mạng: bài đã mở và bài sau vẫn mở và sẵn sàng (chỉ từ bộ nhớ); trang chưa từng mở hiện trang báo "Chưa có mạng".
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
BASE = f'http://localhost:{PORT}/'
LESSON = 'thu-vien/titration-step.html'
READY = "() => { const L = document.getElementById('bgs-load'); return !L || !L.isConnected || L.classList.contains('out'); }"


async def visit(ctx, path, wait=True):
    pg = await ctx.new_page(); net = []
    pg.on('response', lambda r: net.append((r.url, r.from_service_worker)))
    await pg.goto(BASE + path, timeout=300000)
    if wait: await pg.wait_for_function(READY, timeout=300000)
    return pg, net


async def main():
    bad = []
    def check(ok, msg):
        print(('ĐẠT ' if ok else 'LỖI ') + msg, flush=True)
        if not ok: bad.append(msg)
    man = json.loads(open('sw-manifest.json', encoding='utf-8').read())['f']
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1366, 'height': 800})
        pg, _ = await visit(ctx, LESSON)
        reg = await pg.evaluate("Promise.race([navigator.serviceWorker.ready.then(r => r.active && r.active.state), new Promise(ok => setTimeout(() => ok(null), 30000))])")
        nxt = await pg.evaluate("window.BG_SEQ && window.BG_SEQ.next && window.BG_SEQ.next.href")
        await pg.close()
        check(reg in ('activated', 'activating'), f'lần đầu: sw.js được đăng ký ({reg})')
        # lần hai: trang do sw.js nắm; chờ đủ lâu để vỏ gửi lời nhờ tải trước bài sau (8 giây sau khi bài sẵn sàng)
        pg, net = await visit(ctx, LESSON)
        ctl = await pg.evaluate('!!navigator.serviceWorker.controller')
        check(ctl, 'mở lại: sw.js nắm trang')
        inlist = [(u, sw) for u, sw in net if u.startswith(BASE) and u[len(BASE):].split('?')[0] in man]
        miss = [u for u, sw in inlist if not sw]
        check(inlist and not miss, f'mở lại: {len(inlist)} tệp trong danh sách đều đi qua sw.js' + (f' (trừ {miss[:3]})' if miss else ''))
        # chờ vỏ nhờ tải trước bài sau (8 giây sau khi bài sẵn sàng, lúc máy rảnh): tối đa 60 giây
        nk = nxt and nxt.split('/')[-1]
        for _ in range(60):
            if not nk or await pg.evaluate("async (k) => (await (await caches.open('bg-noi-dung')).keys()).some(r => new URL(r.url).pathname.endsWith('/' + k))", nk): break
            await asyncio.sleep(1)
        # 5. đối chiếu mã băm của bản đã lưu
        got = await pg.evaluate("""async () => { const c = await caches.open('bg-noi-dung'); const out = {};
          for (const r of await c.keys()) { const u = new URL(r.url), h = u.searchParams.get('__h'); if (!h) continue;
            const buf = await (await c.match(r)).arrayBuffer(); const d = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
            out[u.pathname] = [h, d.slice(0, 12)]; } return out; }""")
        wrong = [k for k, (h, d) in got.items() if h != d]
        check(got and not wrong, f'{len(got)} tệp đã lưu, mã băm khớp' + (f' (lệch {wrong[:3]})' if wrong else ''))
        nkey = nxt and (nxt.replace('../', '').split('/')[-1])
        have_next = any(k.endswith('/' + nkey) for k in got) if nkey else False
        check(have_next, f'bài sau đã tải trước: {nkey}')
        await pg.close()
        # 3–4. mất mạng: bài đã mở và bài sau (tải trước) vẫn mở và sẵn sàng, hoàn toàn từ bộ nhớ; trang chưa từng mở báo rõ
        await ctx.set_offline(True)
        try:
            pg, _ = await visit(ctx, LESSON); await pg.close(); check(True, 'tắt mạng: bài đã mở vẫn mở và sẵn sàng')
        except Exception as e:
            check(False, f'tắt mạng: bài đã mở không mở được ({str(e)[:80]})')
        if nkey:
            try:
                pg, _ = await visit(ctx, 'thu-vien/' + nkey); await pg.close(); check(True, 'tắt mạng: bài sau (tải trước) mở được và sẵn sàng')
            except Exception as e:
                check(False, f'tắt mạng: bài sau không mở được ({str(e)[:80]})')
        other = 'thu-vien/carbon-step.html' if nkey == 'karst-step.html' else 'thu-vien/karst-step.html'
        pg = await ctx.new_page(); r = await pg.goto(BASE + other)
        txt = await pg.text_content('body')
        check(r.status == 503 and 'Chưa có mạng' in txt, 'tắt mạng: trang chưa từng mở hiện "Chưa có mạng"')
        await pg.close()
        await ctx.set_offline(False)
        await b.close()
    print('\n' + ('Tất cả đạt' if not bad else f'{len(bad)} lỗi'))
    sys.exit(1 if bad else 0)


asyncio.run(main())
