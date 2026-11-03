#!/usr/bin/env python3
"""Quay phim động cơ 4 kì theo từng khung (bước 8 của quy trình teardown): góc trục khuỷu là hàm thuần của thời gian,
mỗi khung đặt ψ rồi chụp, nên không rơi khung dù máy yếu. Ghi timeline.json để nhạc nền (diem.py) khớp từng kì cháy.

  python3 tools/robotics/dong-co/film/quay.py OUT.mp4 [--fps 30]     (cần máy chủ tĩnh cổng 8777, ffmpeg)
"""
import asyncio, json, math, pathlib, subprocess, sys
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else str(HERE / 'dong-co-silent.mp4')
FPS = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 30
DUR = 18.0
SLOW = 1 / 66.67          # tua chậm hiển thị: 1.500 vòng/phút ↔ 135°/giây trên màn hình
VIEWS = [(0, 'hero'), (4.0, 'inside'), (8.0, 'head'), (11.0, 'hero')]
CAPS = [(0, 7), (12.0, 9)]   # lời giảng: một chu trình 720°, rồi đồ thị p–V khi mở ga


def rate(t):              # độ/giây trên màn hình: chạy đều, rồi mở ga từ 12 s đến 14 s
    a, b = 135.0, 540.0
    if t < 12: return a
    if t < 14: u = (t - 12) / 2; return a + (b - a) * u * u * (3 - 2 * u)
    return b


def table(dt=1 / 600):
    psi, t, out, fire, nxt = 0.0, 0.0, [], [], 360.0
    while t <= DUR + 1e-9:
        out.append((t, psi))
        psi += rate(t) * dt
        if psi >= nxt: fire.append(round(t, 4)); nxt += 720
        t += dt
    return out, fire


TAB, FIRES = table()
def psi_at(t):
    i = min(len(TAB) - 1, int(t * 600)); return TAB[i][1]


async def main():
    tl = {'duration': DUR, 'fps': FPS, 'firings': FIRES, 'views': [v[0] for v in VIEWS[1:]], 'throttle': [12.0, 14.0]}
    (HERE / 'timeline.json').write_text(json.dumps(tl, indent=1) + '\n')
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
                           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 1600, 'height': 900})
        # tự bước từng khung: giữ mọi requestAnimationFrame lại, mỗi khung phim gọi đúng một lần rồi chụp (không tranh với vòng vẽ)
        await pg.add_init_script("window.__rafQ=[];window.__manual=false;const __o=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=(cb)=>{if(window.__manual){window.__rafQ.push(cb);return 0}return __o(cb)};window.__step=(ts)=>{const q=window.__rafQ;window.__rafQ=[];q.forEach(cb=>cb(ts))};")
        await pg.goto('http://localhost:8777/cong-nghe/dong-co-4-ki/?lite=0&q=1', timeout=180000)
        await pg.wait_for_function("window.SIM_SHOWN && window.LIVE && document.body.classList.contains('bgs-on')", timeout=400000)
        await pg.evaluate("BGShell.panel(0, true)")
        await pg.add_style_tag(content='.bgs,.tourchip,.cur,.ring,#bgs-load{display:none!important}')
        await pg.evaluate(f"dispatchEvent(new Event('resize')); LIVE.takeOver(); Object.assign(ENGINE, {{film: true, slow: {SLOW}}});")
        await asyncio.sleep(1)
        await pg.evaluate("window.__manual = true")
        ts0 = await pg.evaluate("performance.now()") + 50
        cdp = await pg.context.new_cdp_session(pg)
        view, cap = None, None
        n = int(DUR * FPS)
        for f in range(n):
            t = f / FPS
            v = [x for x in VIEWS if x[0] <= t][-1][1]
            rpm = rate(t) / (6 * SLOW)
            c = [x for x in CAPS if x[0] <= t][-1][1]
            js = f"LIVE.takeOver(); Object.assign(ENGINE, {{psi: {psi_at(t) % 720:.4f}, rpm: {rpm:.1f}, rpmT: {rpm:.1f}}});"
            if c != cap: js += f"ENGINE_CAP({c});"; cap = c
            if v != view: js += f"LIVE.setView('{v}');"; view = v
            await pg.evaluate(js)
            await pg.evaluate(f"window.__step({ts0 + f * 1000 / FPS:.3f})")  # thời gian giả lập: camera trôi đúng 1/FPS mỗi khung
            r = await cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 92, 'optimizeForSpeed': True})
            ff.stdin.write(__import__('base64').b64decode(r['data']))
            if f % 60 == 0: print(f, '/', n, flush=True)
        await b.close()
    ff.stdin.close(); ff.wait(); print('đã ghi', OUT)


asyncio.run(main())
