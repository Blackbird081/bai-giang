#!/usr/bin/env python3
"""Đo tốc độ mở trang như người học ở trường: mạng giả lập 8 Mbps xuống, 2 Mbps lên, độ trễ 80 ms.

  python3 tests/perf.py https://nclamvn.github.io/bai-giang/ ket-qua.json "" thu-vien/ te-bao/ …

Mỗi trang mở hai lần trong cùng một trình duyệt: lần đầu (bộ nhớ đệm lạnh) và lần hai. Ghi: dung lượng tải qua mạng (KB, đã nén),
số yêu cầu, FCP, LCP, CLS, thời gian tới khi bài sẵn sàng (màn tải gỡ). Máy thử vẽ 3D bằng phần mềm nên "sẵn sàng" của bài 3D
chậm và dao động hơn máy thật nhiều; dung lượng, số yêu cầu, FCP/LCP của trang mục thì tin được. Độ mượt đo bằng kiem-may/ trên máy thật.
"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
BASE = sys.argv[1]; OUT = sys.argv[2]; PAGES = sys.argv[3:]
NET = {'offline': False, 'latency': 80, 'downloadThroughput': 8e6 / 8, 'uploadThroughput': 2e6 / 8}  # 8 Mbps / 2 Mbps / 80 ms
OBS = """(() => { window.__perf = {lcp: 0, fcp: 0, cls: 0, lt: 0};
 new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true});
 new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime; }).observe({type: 'paint', buffered: true});
 new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({type: 'layout-shift', buffered: true});
 try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lt += Math.max(0, e.duration - 50); }).observe({type: 'longtask', buffered: true}); } catch (e) {}
})();"""
READY = """() => { const L = document.getElementById('bgs-load'); const lab = window.__lab; if (lab) return !!lab._ready;
  if (window.__cell) return true; if (L) return !L.isConnected || getComputedStyle(L).display === 'none' || getComputedStyle(L).opacity === '0';
  return document.readyState === 'complete'; }"""
async def one(ctx, cdp, url, stats):
    pg = await ctx.new_page(); c = await ctx.new_cdp_session(pg)
    await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', NET)
    await c.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    reqs = {}
    c.on('Network.responseReceived', lambda e: reqs.setdefault(e['requestId'], {'url': e['response']['url'], 'cached': e['response'].get('fromDiskCache') or e['response'].get('fromServiceWorker') or e['response'].get('fromPrefetchCache'), 'type': e['type']}))
    c.on('Network.loadingFinished', lambda e: reqs.get(e['requestId']) is not None and reqs[e['requestId']].__setitem__('bytes', e['encodedDataLength']))
    await pg.add_init_script(OBS)
    t0 = time.time()
    await pg.goto(url, wait_until='load', timeout=600000); tload = time.time() - t0
    try: await pg.wait_for_function(READY, timeout=600000, polling=250); tready = time.time() - t0
    except Exception: tready = None
    await asyncio.sleep(3)
    p = await pg.evaluate('window.__perf')
    nav = await pg.evaluate("(() => { const n = performance.getEntriesByType('navigation')[0]; return {ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd}; })()")
    tot = sum(r.get('bytes', 0) for r in reqs.values()); big = sorted(reqs.values(), key=lambda r: -r.get('bytes', 0))[:5]
    await pg.close()
    return {'load_s': round(tload, 2), 'ready_s': tready and round(tready, 2), 'fcp_ms': round(p['fcp']), 'lcp_ms': round(p['lcp']), 'cls': round(p['cls'], 3), 'ttfb_ms': round(nav['ttfb']), 'dcl_ms': round(nav['dcl']),
            'kb': round(tot / 1024), 'req': len(reqs), 'cached_req': sum(1 for r in reqs.values() if r['cached']), 'top': [(r['url'].split('/bai-giang/')[-1][:60], round(r.get('bytes', 0) / 1024)) for r in big]}
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for path in PAGES:
            ctx = await b.new_context(viewport={'width': 1366, 'height': 800})
            r1 = await one(ctx, None, BASE + path, None)
            r2 = await one(ctx, None, BASE + path, None)
            res[path or '/'] = {'lanh': r1, 'lan2': r2}
            print(path or '/', json.dumps(r1['kb']), 'KB', r1['req'], 'yc · lạnh', r1['lcp_ms'], 'ms LCP', r1['ready_s'], 's sẵn sàng · lần 2', r2['kb'], 'KB', r2['ready_s'], 's', flush=True)
            await ctx.close()
        await b.close()
    json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=1)
asyncio.run(main())
