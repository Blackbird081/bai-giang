"""Đo, không nhìn bằng mắt: mật độ cơ cấu, tỉ lệ kích thước, góc máy tháo rời của một bài 3D.

    python3 tools/robotics/do_mat_do.py robotics/dong-ho/ [bài khác …] [--port 8777] [--baseline]

Cần máy chủ tĩnh đang phục vụ thư mục gốc kho ở cổng đã cho. Với mỗi bài:
  · chụp toàn cảnh (tắt bóng, sàn trắng trơn), chụp lại khi giấu vật; điểm ảnh khác nhau là vật. Trong khung bao vật, đếm tỉ lệ
    điểm có độ sáng dưới 80. Bài mới phải đạt ít nhất 0,8 lần ảnh đã duyệt (chó robot, lưu trong do_mat_do.json).
    Vật thưa (vật chiếm dưới 0,6 lần tỉ lệ khung của ảnh đã duyệt) thì so tỉ lệ điểm tối trên điểm ảnh của vật.
  · LIVE.sim.measure() (nếu bài có): tỉ lệ đo trên mô hình so với số có nguồn, mỗi dòng có dung sai riêng.
  · LIVE.sim.cut.audit() (nếu bài có chế độ tháo rời): không có cặp nhịp nào đặt máy cùng chỗ.
--baseline: đo lại ảnh đã duyệt và ghi vào do_mat_do.json.
Phương pháp theo cutaway của Nyxera0x (MIT): "Count the share of dark pixels (luma under 80)… 0.8 of the reference's".
"""
import asyncio
import base64
import io
import json
import pathlib
import sys

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).parent
BASE = HERE / 'do_mat_do.json'
APPROVED = 'robotics/quadruped/'
READY = "window.SIM_SHOWN && window.LIVE && window.LIVE.sim"
FRAMES = "(n) => new Promise((r) => { const t0 = LIVE.T; let k = 0; const f = () => { if (LIVE.T > t0 && ++k >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); })"


def png(data):
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')


async def measure(pg, path, port):
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(f'http://localhost:{port}/{path}?lite=0&q=1', timeout=180000)
    await pg.wait_for_function(READY, timeout=400000)
    await pg.evaluate("() => { LIVE.takeOver(); LIVE.sim.reset(); LIVE.setRate(0); LIVE.setView('hero'); LIVE.st.sun.castShadow = false; const u = LIVE.st.ground.material.uniforms; for (const k of ['uG', 'uMi', 'uMa']) u[k].value.copy(u.uBg.value); }")
    await pg.evaluate(f"({FRAMES})(4)")
    a = png(await pg.evaluate("document.getElementById('gl').toDataURL('image/png')"))
    root = await pg.evaluate("() => { const r = LIVE.sim.root; if (!r) return false; r.visible = false; return true; }")
    out = {'path': path, 'errors': errs}
    if root:
        await pg.evaluate(f"({FRAMES})(3)")
        b = png(await pg.evaluate("document.getElementById('gl').toDataURL('image/png')"))
        await pg.evaluate("() => { LIVE.sim.root.visible = true; }")
        mask = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 10 else 0)
        box = mask.getbbox()
        if box:
            crop = a.crop(box).convert('L')
            px = list(crop.get_flattened_data())
            out['box'] = box
            out['dark'] = round(sum(1 for v in px if v < 80) / len(px), 4)
            m = list(mask.crop(box).get_flattened_data())
            obj = [v for v, k in zip(px, m) if k]
            out['dark_obj'] = round(sum(1 for v in obj if v < 80) / max(1, len(obj)), 4)
            out['fill'] = round(len(obj) / len(px), 3)
    out['measure'] = await pg.evaluate("() => LIVE.sim.measure ? LIVE.sim.measure() : null")
    out['audit'] = await pg.evaluate("() => LIVE.sim.cut ? LIVE.sim.cut.audit() : null")
    return out


async def main(argv):
    port = 8777
    if '--port' in argv:
        i = argv.index('--port'); port = int(argv[i + 1]); del argv[i:i + 2]
    refresh = '--baseline' in argv
    paths = [a for a in argv if not a.startswith('--')]
    base = json.loads(BASE.read_text()) if BASE.exists() else {}
    fails = 0
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 1200, 'height': 675}, reduced_motion='reduce')
        if refresh or 'dark' not in base:
            r = await measure(await ctx.new_page(), APPROVED, port)
            base = {'approved': APPROVED, 'dark': r['dark'], 'dark_obj': r['dark_obj'], 'fill': r['fill']}
            BASE.write_text(json.dumps(base, ensure_ascii=False, indent=1) + '\n')
            print('ảnh đã duyệt', base)
        for path in paths:
            r = await measure(await ctx.new_page(), path, port)
            bad = []
            if r.get('dark') is not None:
                # vật thưa (chân nhện, khung giàn) thì khung bao chủ yếu là nền: so trên điểm ảnh của chính vật
                sparse = r['fill'] < 0.6 * base['fill']
                k = (r['dark_obj'] / base['dark_obj']) if sparse else (r['dark'] / base['dark'])
                r['vs_approved'] = round(k, 2)
                r['metric'] = 'điểm ảnh của vật' if sparse else 'khung bao'
                if k < 0.8:
                    bad.append(f"mật độ {k:.2f} lần ảnh đã duyệt (< 0,8, đo theo {r['metric']})")
            for row in r['measure'] or []:
                off = abs(row['got'] - row['want']) / abs(row['want'])
                row['off'] = round(off, 3)
                if off > row.get('tol', 0.05):
                    bad.append(f"tỉ lệ {row['name']}: {row['got']:.3f}, nguồn {row['want']:.3f}")
            if r['audit'] and r['audit']['parked']:
                bad.append(f"góc máy đứng yên: {r['audit']['parked']}")
            if r['errors']:
                bad.append(f"lỗi trang: {r['errors']}")
            r['fail'] = bad
            fails += bool(bad)
            print(json.dumps({k: v for k, v in r.items() if k != 'audit'} | ({'cams': r['audit']['cams']} if r['audit'] else {}), ensure_ascii=False))
            print(('CHƯA ĐẠT: ' + '; '.join(bad)) if bad else 'ĐẠT', flush=True)
        await br.close()
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main(sys.argv[1:])))
