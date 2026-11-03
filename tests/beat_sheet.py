#!/usr/bin/env python3
"""Bảng ảnh từng bước của một bài 3D, để soi lỗi bằng mắt trước khi đưa lên (bước 6 của quy trình teardown, MIT).

Mỗi bước của bài (BGShell.go) chụp một ảnh sau khi camera bay xong, ghép thành một tờ có nhãn "Bước k: tên bước".
Đọc từng ô theo danh sách: vật xuyên qua vật, vật lơ lửng rời chỗ gắn, nhãn che đúng thứ nó gọi tên, số trên bảng
không khớp với cảnh, chữ bị cắt, thứ quan trọng sát mép dưới 60 px.

Cần máy chủ tĩnh ở gốc repo (python3 -m http.server 8777).
  python3 tests/beat_sheet.py te-bao/ --out /tmp/te-bao.png [--wait 3] [--size 1440x900] [--cols 3] [--lenlop]
"""
import argparse, asyncio, io, sys
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont


def font(sz):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, sz)
        except OSError: pass
    return ImageFont.load_default()


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path'); ap.add_argument('--out', required=True)
    ap.add_argument('--wait', type=float, default=3.0); ap.add_argument('--size', default='1440x900')
    ap.add_argument('--cols', type=int, default=3); ap.add_argument('--port', default='8777'); ap.add_argument('--query', default='lite=0')
    ap.add_argument('--steps', default='', help='vd 0,3,5 (mặc định: mọi bước)')
    ap.add_argument('--js', default='', help='JS chạy sau khi vỏ gắn xong, vd mở bảng số: BGShell.panel(0, true)')
    a = ap.parse_args()
    W, H = map(int, a.size.split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': W, 'height': H})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        await pg.goto(f'http://localhost:{a.port}/{a.path}?{a.query}', timeout=180000, wait_until='domcontentloaded')
        await pg.wait_for_function("document.body.classList.contains('bgs-on') && !document.getElementById('bgs-load')", timeout=300000)
        if a.js: await pg.evaluate(a.js); await asyncio.sleep(1)
        steps = await pg.evaluate('BGShell.state.lesson.steps.map(s => s.t)')
        idx = [int(x) for x in a.steps.split(',')] if a.steps else list(range(len(steps)))
        tiles = []
        for i in idx:
            await pg.evaluate(f'BGShell.go({i})')
            await asyncio.sleep(a.wait)
            png = await pg.screenshot(type='png', timeout=300000, animations='disabled')
            im = Image.open(io.BytesIO(png)).convert('RGB')
            tiles.append((i, steps[i], im))
            print(f'bước {i + 1}/{len(steps)}: {steps[i]}', flush=True)
        await b.close()
    tw = 640; th = round(tw * H / W); lab = 34; cols = min(a.cols, len(tiles)); rows = -(-len(tiles) // cols)
    sheet = Image.new('RGB', (cols * tw + (cols + 1) * 8, rows * (th + lab) + (rows + 1) * 8), (235, 236, 240))
    d = ImageDraw.Draw(sheet); f = font(17)
    for k, (i, t, im) in enumerate(tiles):
        x = 8 + (k % cols) * (tw + 8); y = 8 + (k // cols) * (th + lab + 8)
        d.text((x + 4, y + 7), f'Bước {i + 1}: {t}'[:70], fill=(20, 22, 28), font=f)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
    sheet.save(a.out)
    print('đã ghi', a.out, '· lỗi JS:', errs or 'không')
    sys.exit(1 if errs else 0)


asyncio.run(main())
