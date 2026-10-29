import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"]); pg = b.new_page(viewport={"width": 1366, "height": 800}); pg.set_default_timeout(240000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200])); pg.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" else None)
    pg.goto("http://localhost:8793/ar.html"); pg.wait_for_function("document.getElementById('mv').loaded === true", timeout=120000); time.sleep(4)
    pg.screenshot(path="ar_1.png")
    print('vật liệu:', pg.evaluate("window.__ar.mv.model.materials.map(m => m.name)"), '| AR khả dụng (máy tính):', pg.evaluate("window.__ar.mv.canActivateAR"))
    pg.click('#ghost40'); time.sleep(3); pg.screenshot(path="ar_2.png")
    print('QR hiện:', pg.evaluate("!document.getElementById('qrBox').hidden"), '| lỗi:', errs[:4]); b.close()
