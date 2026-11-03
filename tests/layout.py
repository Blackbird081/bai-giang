import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    for w, h in [(1920, 1080), (1366, 768)]:
        pg = b.new_page(viewport={"width": w, "height": h}); pg.set_default_timeout(300000); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:8777/te-bao/#webgl"); pg.wait_for_function("!!window.__cell", timeout=180000); pg.evaluate("window.__cell.setTier('chuan')"); time.sleep(6)
        m = lambda: pg.evaluate("(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { vp: [Math.round(r('#viewport').width), Math.round(r('#viewport').height)], stageBottom: Math.round(r('.stage').bottom), aside: Math.round(r('aside').width) }; })()")
        print(w, h, 'mở', m(), errs); pg.screenshot(path=f"l7_{w}_open.png")
        pg.click("#drawerTab"); time.sleep(12); print(w, h, 'thu', m()); pg.screenshot(path=f"l7_{w}_wide.png")
        pg.close()
    b.close()
