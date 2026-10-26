from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"]); pg = b.new_page(viewport={"width": 900, "height": 600}); pg.set_default_timeout(300000)
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:8765/local.html#webgl"); pg.wait_for_function("!!window.__cell", timeout=180000)
    pg.wait_for_function("window.__cell.mol.ready || window.__cell.mol.err", timeout=120000)
    print(pg.evaluate("({ready: window.__cell.mol.ready, err: String(window.__cell.mol.err), counts: window.__cell.mol.counts, kAtoms: document.getElementById('kAtoms').textContent, dive: document.getElementById('diveBtn').textContent})"), errs)
    b.close()
