"""Lên lớp ở Tế Bào qua vỏ chung: vào chế độ lên lớp, nhảy bước 1, 2, 8, 11, đóng. Chạy tay, ghi ảnh ra thư mục hiện tại."""
import time
from playwright.sync_api import sync_playwright
RAF = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1366, "height": 768}); pg.set_default_timeout(300000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200])); pg.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" else None)
    pg.goto("http://localhost:8777/te-bao/#webgl"); pg.wait_for_function("!!window.__cell", timeout=180000); pg.evaluate("window.__cell.setTier('chuan')"); time.sleep(4)
    vp = pg.locator("#viewport").bounding_box(); clip = {"x": vp["x"], "y": vp["y"], "width": vp["width"], "height": vp["height"]}
    st = lambda: pg.evaluate("({lesson: window.__cell.lesson.state, sel: window.__cell.sel && window.__cell.sel.key, status: document.getElementById('sState') && document.getElementById('sState').textContent, k: document.getElementById('lsK').textContent, fb: (document.getElementById('qFb')||{}).textContent, b: document.getElementById('lsB').textContent.slice(0,80)})")
    # Lên lớp đi qua vỏ chung (BGShell): vỏ gọi go(i) của bài, bài tự mở chế độ lên lớp rồi nhảy bước
    pg.evaluate("BGShell.go(0)"); time.sleep(3); pg.screenshot(path="ls_0.png", clip=clip); print(0, st())
    pg.evaluate("BGShell.go(1)"); time.sleep(4); pg.screenshot(path="ls_1.png", clip=clip); print(1, st())
    pg.evaluate("BGShell.go(7)"); time.sleep(5); pg.screenshot(path="ls_7.png", clip=clip); print(7, st())
    pg.evaluate("BGShell.go(10)"); time.sleep(3); print(10, st())
    assert pg.evaluate("window.__cell.lesson.state") is not None, 'không vào được chế độ lên lớp'
    pg.evaluate("BGShell.stop()"); time.sleep(2); print("đóng", pg.evaluate("document.getElementById('lesson').hidden"), pg.evaluate("window.__cell.lesson.state"))
    print('lỗi:', errs[:6]); b.close()
