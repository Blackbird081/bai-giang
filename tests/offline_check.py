import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": 1280, "height": 760}, offline=True); pg = ctx.new_page(); pg.set_default_timeout(300000); errs = []; reqs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200])); pg.on("console", lambda m: errs.append(m.text[:160]) if m.type == "error" else None)
    pg.on("request", lambda r: reqs.append(r.url[:60]) if not r.url.startswith(('data:', 'file:', 'blob:')) else None)
    pg.goto("file://" + __import__("os").path.abspath("offline/hanh-trinh-te-bao-offline.html") + "#webgl"); pg.wait_for_function("!!window.__cell", timeout=200000)
    pg.wait_for_function("window.__cell.mol.ready || window.__cell.mol.err", timeout=120000); time.sleep(4)
    print(pg.evaluate("({ready: window.__cell.mol.ready, err: String(window.__cell.mol.err), atoms: document.getElementById('kAtoms').textContent, dive: document.getElementById('diveBtn').textContent, post: !!document.querySelector('canvas')})"))
    pg.screenshot(path="offline_home.png")
    print('yêu cầu mạng ngoài (đã chặn vì offline):', sorted(set(reqs))); print('lỗi:', errs[:6]); b.close()
