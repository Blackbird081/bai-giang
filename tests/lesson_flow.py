import time
from playwright.sync_api import sync_playwright
RAF = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1366, "height": 768}); pg.set_default_timeout(300000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200])); pg.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" else None)
    pg.goto("http://localhost:8765/local.html#webgl"); pg.wait_for_function("!!window.__cell", timeout=180000); pg.evaluate("window.__cell.setTier('chuan')"); time.sleep(4)
    vp = pg.locator("#viewport").bounding_box(); clip = {"x": vp["x"], "y": vp["y"], "width": vp["width"], "height": vp["height"]}
    st = lambda: pg.evaluate("({lesson: window.__cell.lesson.state, sel: window.__cell.sel && window.__cell.sel.key, status: document.getElementById('sState') && document.getElementById('sState').textContent, k: document.getElementById('lsK').textContent, fb: (document.getElementById('qFb')||{}).textContent, b: document.getElementById('lsB').textContent.slice(0,80)})")
    pg.click('#lessonBtn'); time.sleep(3); pg.screenshot(path="ls_0.png", clip=clip); print(0, st())
    pg.keyboard.press('ArrowRight'); time.sleep(4); pg.screenshot(path="ls_1.png", clip=clip); print(1, st())
    pg.evaluate("window.__cell.lesson.go(7)"); time.sleep(5); pg.screenshot(path="ls_7.png", clip=clip); print(7, st())
    pg.evaluate("window.__cell.lesson.go(10)"); time.sleep(3); print(10, st()); b.close() if False else None
    pg.keyboard.press('h'); time.sleep(1); print('compact', pg.evaluate("document.getElementById('lesson').classList.contains('compact')"))
    pg.evaluate("document.getElementById('lsX').click()"); time.sleep(2); print('đóng', pg.evaluate("document.getElementById('lesson').hidden"), st()['status'])
    print('lỗi:', errs[:6]); b.close()
