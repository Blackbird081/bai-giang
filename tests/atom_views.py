"""Góc nhìn nguyên tử của Tế Bào ở một cỡ màn và một mức chất lượng.  python3 tests/atom_views.py THU_MUC_ANH RONG CAO [chuan|cao]"""
import sys, time
from playwright.sync_api import sync_playwright
out = sys.argv[1]; W, H = int(sys.argv[2]), int(sys.argv[3]); tier = sys.argv[4] if len(sys.argv) > 4 else 'chuan'
RAF = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": W, "height": H}, reduced_motion='reduce'); pg = ctx.new_page(); pg.set_default_timeout(600000)
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text[:300]}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    pg.goto("http://localhost:8777/te-bao/#webgl")
    pg.wait_for_function("!!window.__cell", timeout=180000)
    pg.evaluate(f"window.__cell.setTier('{tier}')")
    pg.wait_for_function("window.__cell.mol.ready || window.__cell.mol.err", timeout=120000)
    vp = pg.locator("#viewport").bounding_box(); clip = {"x": vp["x"], "y": vp["y"], "width": vp["width"], "height": vp["height"]}
    def snap(name, js=None, frames=2):
        t = time.time()
        if js: pg.evaluate(js)
        for _ in range(frames): pg.evaluate(RAF)
        pg.screenshot(path=f"{out}_{name}.png", clip=clip)
        print(name, round(time.time() - t, 1), 's', pg.evaluate("({st: document.getElementById('sState').textContent, sc: document.getElementById('scaleTxt').textContent, sel: window.__cell.sel, atoms: window.__cell.mol.atomsOn, dh: +window.__cell.mol.dh.toFixed(4)})"), flush=True)
    steps = sys.argv[5].split(',') if len(sys.argv) > 5 else ['dive', 'trnaA', 'sec61', 'polysome', 'uranyl']
    JS = {'dive': "window.__cell.startDive()", 'lsu': "window.__cell.selectPart('lsu')", 'trnaA': "window.__cell.selectPart('trnaA')", 'mrna': "window.__cell.selectPart('mrna')",
          'sec61': "window.__cell.selectPart('sec61')", 'nascent': "window.__cell.selectPart('nascent')", 'grow': "window.__cell.setPlaying(true); window.__cell.selectPart('nascent')", 'polysome': "window.__cell.selectPart('polysome')", 'bilayer': "window.__cell.selectPart('bilayer')",
          'uranyl': "window.__cell.selectPart('lsu'); window.__cell.setStain(2)", 'osmium': "window.__cell.setStain(1)", 'color': "window.__cell.setStain(0)", 'back': "window.__cell.back()", 'home': "window.__cell.back(); window.__cell.back()"}
    for s in steps: snap(s, JS[s], 3 if s == 'dive' else 16 if s == 'grow' else 2)
    for l in logs[:20]: print(l)
    b.close()
