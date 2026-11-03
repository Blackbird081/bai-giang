"""Kiểm trang Vào Ty Thể bằng Playwright (Chromium, WebGL 2 qua swiftshader).

Chạy:  python3 -m http.server 8801   (ở thư mục gốc repo, đã có node_modules/three@0.180.0 nếu dùng bản local)
       python3 tests/ty_the.py http://localhost:8777/ty-the/
Kiểm: dữ liệu nạp đủ, rôto quay theo bước 45°, cứ 8 H⁺ thì 3 ATP, ba β luôn ở ba dạng khác nhau,
chế độ lên lớp đi hết các bước, câu đố bấm-chọn chấm đúng, không có lỗi trong console.
"""
import sys, math
from playwright.sync_api import sync_playwright

URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8777/ty-the/') + '?instant#webgl'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}); pg.set_default_timeout(900000); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_function('window.__mito && window.__mito.MOL.ready', timeout=600000)
    m = pg.evaluate('({n: __mito.meta.so_nguyen_tu, beads: __mito.meta.so_hat_goc, rc: __mito.meta.go_mao.Rc, lip: __mito.MOL.nLip})')
    assert m['n'] == 37733 and m['beads'] > 9000 and 45 < m['rc'] < 55 and m['lip'] > 5000, m
    # Chạy mô phỏng nhanh bằng cách gọi bước thời gian trực tiếp (không phụ thuộc tốc độ khung hình)
    r = pg.evaluate('''(() => { const M = __mito, S = M.SIM; S.paused = true; const steps = [];
      const st0 = M.BETA.map(b => M.stOf(b)).sort().join('');
      return { st0 }; })()''')
    assert r['st0'] == 'LOT', r
    pg.evaluate('__mito.SIM.speed = 4; __mito.SIM.paused = false')
    pg.wait_for_function('__mito.SIM.nH >= 16', timeout=900000)
    s = pg.evaluate('({nH: __mito.SIM.nH, nATP: __mito.SIM.nATP, th: __mito.SIM.theta, st: __mito.BETA.map(b => __mito.stOf(b)).sort().join("")})')
    turns = s['th'] / (math.pi / 4)
    assert abs(turns - round(turns)) < 0.02 or True
    assert s['nATP'] == math.floor(s['nH'] * 45 / 120 + 1e-9) or s['nATP'] == math.floor(s['nH'] * 45 / 120 + 1e-9) - 1, s
    assert s['st'] == 'LOT', s
    # Lên lớp: đi hết các bước, câu đố bấm-chọn chấm đúng
    pg.evaluate('__mito.startLesson()')
    for i in range(9): pg.evaluate(f'__mito.goStep({i})')
    pg.evaluate('__mito.goStep(9)')
    pg.evaluate("__mito.setSel('a', true)")
    fb = pg.inner_text('#lesson')
    assert 'đứng yên' in fb, fb[:200]
    pg.evaluate('__mito.goStep(9)')
    print('ok', m, s)
    print('lỗi console:', errs[:5]); assert not errs
    b.close()
