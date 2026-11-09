#!/usr/bin/env python3
"""Kiểm trợ năng bằng axe-core (WCAG 2 A, AA) cho các trang của Sáng Ăn Khoai (kế hoạch nâng cấp UI, việc 4.5).

Cần axe.min.js của axe-core (npm pack axe-core, giải nén) và máy chủ tĩnh ở gốc repo (python3 -m http.server 8777).
Dùng: python3 tests/a11y_audit.py <đường dẫn axe.min.js> [trang…]   (mặc định: trang mục và vài bài mẫu)
Ra: số lỗi theo mức (critical, serious, moderate, minor) và tên quy tắc lỗi của từng trang.
Lưu ý: axe không đọc được nội dung vẽ trong canvas 3D; phần đó dựa vào mô tả bước cho trình đọc màn hình của vỏ.
"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

PAGES = ['', 'thu-vien/', 'chu-de/sinh-hoc-te-bao/', 'lich-su-10/', 'robotics/', 'kiem-may/', 'ty-the/', 'robotics/ur5e/?q=2', 'thu-vien/enzyme-step.html']


async def main():
    axe = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
    pages = sys.argv[2:] or PAGES
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for u in pages:
            pg = await b.new_page(viewport={'width': 1440, 'height': 900})
            await pg.goto('http://localhost:8777/' + u, timeout=120000)
            await asyncio.sleep(8)
            await pg.add_script_tag(content=axe)
            r = await pg.evaluate("""async () => { const r = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}, resultTypes: ['violations']});
              return r.violations.map((v) => ({id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map((x) => x.target.join(' ')).join(' | ').slice(0, 160)})); }""")
            out[u or '/'] = r
            cnt = {k: sum(v['n'] for v in r if v['impact'] == k) for k in ('critical', 'serious', 'moderate', 'minor')}
            print(f"{u or '/':34s} {cnt}  " + '; '.join(f"{v['id']}({v['impact']},{v['n']})" for v in r))
            await pg.close()
        await b.close()
    pathlib.Path('tests/a11y_audit.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')


asyncio.run(main())
