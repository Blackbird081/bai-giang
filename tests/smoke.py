#!/usr/bin/env python3
"""Kiểm nhanh (CI): mỗi trang mở được, không có lỗi JS, bài học gắn được vỏ Sáng Ăn Khoai, không còn link riêng tư.

Cần máy chủ tĩnh ở gốc repo:  python3 -m http.server 8777
Dùng:  python3 tests/smoke.py [cổng]
Bài nặng (Tế Bào, Cổ Loa) cần GPU thật để chạy mượt; ở đây chỉ chờ vỏ gắn xong, không đo khung hình.
"""
import asyncio, sys
from playwright.async_api import async_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8777'
# (đường dẫn, có vỏ bài học không)
PAGES = [('', False), ('chu-de/sinh-hoc-te-bao/', False), ('lich-su-10/', False), ('robotics/', False), ('kiem-may/', False),
         ('dieu-khien/', False), ('thu-vien/enzyme-step.html', True), ('thu-vien/titration-step.html', True),
         ('robotics/ur5e/', True), ('ty-the/', True), ('te-bao/', True), ('lich-su-10/co-loa/', True), ('co-the-nguoi/', True), ('than-kinh/', True), ('cong-nghe/dong-co-4-ki/', True),
         ('giao-vien/', False), ('giao-vien/te-bao/', False), ('giao-vien/than-kinh/', False), ('giao-vien/co-loa/', False)]
IGNORE = ('WebGPU', 'GPU stall', 'Automatic fallback', 'favicon', 'ERR_NAME_NOT_RESOLVED')


async def check(b, path, shell):
    pg = await b.new_page(viewport={'width': 1280, 'height': 800})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: m.type == 'error' and not any(k in m.text for k in IGNORE) and errs.append('console: ' + m.text[:200]))
    await pg.goto(f'http://localhost:{PORT}/{path}?lite=0', timeout=120000, wait_until='domcontentloaded')
    ok = True
    if shell:
        try:
            await pg.wait_for_function("document.body.classList.contains('bgs-on')", timeout=240000)
        except Exception:
            ok = False; errs.append('vỏ không gắn được trong 240 giây')
        else:
            # gói dạy thử (tools/goi-day): tên bước trong kịch bản phải khớp từng bước của bài, nếu không màn hình giáo viên hiện sai phút
            bad = await pg.evaluate("(() => { const P = window.BG_SEQ && BG_SEQ.plan; if (!P) return null; const S = BGShell.state.lesson.steps; if (P.length !== S.length) return `kịch bản ${P.length} bước, bài ${S.length} bước`; const k = S.findIndex((s, i) => s.t !== P[i].t); return k < 0 ? null : `bước ${k + 1}: bài “${S[k].t}”, kịch bản “${P[k].t}”`; })()")
            if bad: errs.append('gói dạy lệch với bài: ' + bad)
    else:
        await asyncio.sleep(2)
    private = await pg.evaluate("[...document.querySelectorAll('a[href*=\"claude.ai/\"]')].length")
    if private: errs.append(f'{private} link claude.ai')
    await pg.close()
    return path, ok and not errs, errs


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        bad = 0
        for path, shell in PAGES:
            path, ok, errs = await check(b, path, shell)
            bad += not ok
            print(('ok   ' if ok else 'LỖI ') + (path or '/') + ('' if ok else '\n     ' + '\n     '.join(errs)))
        await b.close()
    sys.exit(1 if bad else 0)


asyncio.run(main())
