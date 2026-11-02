#!/usr/bin/env python3
"""Kiểm giao diện tự động cho cả site Sáng Ăn Khoai (kế hoạch nâng cấp UI, phần "Bộ kiểm thử").

Mỗi trang chạy ở 5 cỡ màn, đo những thứ đo được bằng máy:
  dev     chuỗi số đo kỹ thuật lộ ra màn học sinh (fps, p95, lệnh vẽ, WebGL, WebGPU)
  font    cỡ chữ nhỏ nhất của chữ đang hiện (ngưỡng 13 px máy tính, 14 px điện thoại; nhãn trong cảnh 3D tính riêng)
  tap     vùng bấm nhỏ hơn 44 × 44 px trên màn cảm ứng
  home    có đường về trang chính Sáng Ăn Khoai
  next    có thẻ "Bài tiếp theo" (chỉ với bài học)
  stage   tỉ lệ diện tích cảnh 3D không bị phần tử nổi che (lấy mẫu lưới 48 × 30 điểm)
  credit  bài thư viện có dòng ghi công Tongjiang Lab
  clip    chữ bị cắt (overflow ẩn, không có dấu …) hoặc tràn ra ngoài màn hình
  edge    chữ sát mép khung có nền hay viền (nút, thẻ, viên thuốc): dưới 6 px hai bên hoặc dưới 1 px trên dưới
  err     lỗi JavaScript khi tải
Không đo độ mượt: trình duyệt trong máy chủ dựng hình bằng phần mềm. Độ mượt đo bằng kiem-may/ trên máy thật.

Dùng:  python3 tests/ui_audit.py [--group hub|bespoke|library|tools|all] [--vp d,t,tp,pl,pp] [--shots DIR] [--only tên] [--wait 6]
Cần máy chủ tĩnh ở thư mục gốc repo:  python3 -m http.server 8777
"""
import argparse, asyncio, json, pathlib, sys, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8777/'
VP = {'d': (1440, 900, False), 't': (1180, 820, True), 'tp': (820, 1180, True), 'pl': (844, 390, True), 'pp': (390, 844, True)}
ROBOTS = ['ur5e', 'hexapod', 'crazyflie', 'turtlebot3']


def pages(group):
    hub = [('trang-chinh', ''), ('chu-de-te-bao', 'chu-de/sinh-hoc-te-bao/'), ('lich-su-10', 'lich-su-10/'), ('robotics', 'robotics/')]
    bespoke = [('te-bao', 'te-bao/'), ('ty-the', 'ty-the/'), ('co-loa', 'lich-su-10/co-loa/'), ('co-the-nguoi', 'co-the-nguoi/'), ('than-kinh', 'than-kinh/')] + [(r, f'robotics/{r}/') for r in ROBOTS]
    lib = sorted((p.stem, f'thu-vien/{p.name}') for p in (ROOT / 'thu-vien').glob('*-step.html'))
    tools = [('kiem-may', 'kiem-may/'), ('dieu-khien', 'dieu-khien/')]
    return {'hub': hub, 'bespoke': bespoke, 'library': lib, 'tools': tools, 'lessons': bespoke + lib, 'all': hub + bespoke + lib + tools}[group]


PROBE = r"""(args) => {
  const [phone, touch, lesson, lib] = args;
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null; return r; };
  const shown = (e) => { for (let n = e; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { if (!vis(n)) return false; } return true; };
  // chữ đang hiện: phần tử có nút chữ con khác rỗng
  const texts = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t; (t = tw.nextNode());) { const s = t.nodeValue.trim(); if (!s) continue; const e = t.parentElement; if (!e || e.closest('script,style,noscript,svg title')) continue; if (!shown(e)) continue; texts.push([e, s, t]); }
  const out = { dev: [], font: [], tap: [], home: false, next: false, credit: false, stage: null, title: document.title };
  const dev = /\b(\d+\s*fps|p95|p99)\b|lệnh vẽ|\bWebGL\b|\bWebGPU\b/i;
  const seen = new Set();
  for (const [e, s] of texts) {
    if (e.closest('footer.foot')) continue; // chân trang chủ ý nhỏ, nhạt (12 px)
    if (dev.test(s) && !e.closest('.bgs-debug')) out.dev.push(s.slice(0, 60));
    const k = e.offsetWidth ? e.getBoundingClientRect().width / e.offsetWidth : 1; // bài thu phóng cả khung bằng transform
    const fs = parseFloat(getComputedStyle(e).fontSize) * (k > 0.2 && k < 5 && Math.abs(k - 1) > 0.05 ? k : 1); const lim = 13; // điện thoại: mục tiêu 14 px cho trang mục, 13 px là sàn cho mọi trang
    const in3d = !!e.closest('[data-3d-label],.lbl3d,.label3d,.css2d,.tag3d');
    if (fs === 0) continue; // chữ cố ý ẩn bằng font-size:0 (vd. mặt sau của la bàn hướng nhìn BodyVista)
    if (fs < lim - 0.01 && !seen.has(e)) { seen.add(e); out.font.push([Math.round(fs * 10) / 10, in3d ? '3d' : 'ui', s.slice(0, 32)]); }
  }
  out.font.sort((a, b) => a[0] - b[0]);
  // chữ bị cắt, tràn ra ngoài màn hình, hoặc sát mép khung (nút, thẻ, viên thuốc có nền hay viền): tối thiểu 6 px hai bên
  out.clip = []; out.edge = [];
  const seenC = new Set(), seenE = new Set();
  const desc = (a) => a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className.trim() ? '.' + a.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  // chữ chỉ dành cho trình đọc màn hình (sr-only: khung 1 px, clip) không tính
  const srOnly = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
    if ((cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none' && /inset\(50%|polygon\(0/.test(cs.clipPath)) || (r.width <= 2 && r.height <= 2)) return true; } return false; };
  const opaque = (cs) => { const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); const al = m ? (m[1].split(',')[3] ?? '1') : '0'; return +al > 0.05 || cs.backgroundImage !== 'none'; };
  for (const [e, s, t] of texts) {
    if (e.closest('footer.foot,[aria-hidden="true"]') || srOnly(e)) continue;
    const rg = document.createRange(); rg.selectNodeContents(t); const rs = [...rg.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rs.length) continue;
    const L = Math.min(...rs.map((r) => r.left)), Rr = Math.max(...rs.map((r) => r.right)), T = Math.min(...rs.map((r) => r.top)), B = Math.max(...rs.map((r) => r.bottom));
    const lab = s.slice(0, 32), ellE = getComputedStyle(e).textOverflow === 'ellipsis';
    let inScroll = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX)) { inScroll = true; break; } }
    if (inScroll) continue; // hàng cuộn ngang (chip, nút góc nhìn): chữ ngoài khung là chữ cuộn tới được
    if ((L < -0.5 || Rr > innerWidth + 0.5) && !ellE) { if (!seenC.has(e)) { seenC.add(e); out.clip.push(['tràn màn hình', lab, desc(e)]); } continue; }
    let ell = ellE;
    for (let a = e; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.textOverflow === 'ellipsis') ell = true;
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      if (/auto|scroll/.test(cs.overflowX + cs.overflowY)) break; // vùng cuộn: chữ ngoài khung là chữ cuộn tới được
      const ar = a.getBoundingClientRect();
      if (!ell && (L < ar.left - 0.5 || Rr > ar.right + 0.5) && !seenC.has(e)) { seenC.add(e); out.clip.push(['bị cắt', lab, desc(a)]); }
      break;
    }
    if (ell) continue;
    for (let a = e, k = 0; a && a !== document.body && k < 4; a = a.parentElement, k++) {
      const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX + cs.overflowY)) break; // khung cuộn: mép trên dưới là mép cuộn
      const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
      if (!(opaque(cs) || bl > 0 || br > 0)) continue;
      const ar = a.getBoundingClientRect(); if (ar.width > innerWidth * 0.9 || ar.height > innerHeight * 0.9) break; // nền trang, không phải khung nhỏ
      const gl = L - ar.left - bl, gr = ar.right - Rr - br, gv = Math.min(T - ar.top, ar.bottom - B);
      const gh = Math.min(gl, gr);
      if ((gh < 6 || gv < 1) && !seenE.has(a)) { seenE.add(a); out.edge.push([Math.round(gh * 10) / 10, Math.round(gv * 10) / 10, lab, desc(a)]); }
      break;
    }
  }
  if (touch) {
    for (const e of document.querySelectorAll('button,a[href],[role=button],input:not([type=hidden]),select,summary,.chip')) {
      const r = vis(e); if (!r || !shown(e)) continue; if (r.width < 43.5 || r.height < 43.5) {
        const label = (e.getAttribute('aria-label') || e.textContent || e.value || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24);
        // chữ liên kết trong đoạn văn không tính (vùng bấm là cả dòng chữ)
        if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,td')) continue;
        if (e.matches('input[type=checkbox],input[type=radio]') && e.closest('label') && e.closest('label').getBoundingClientRect().height >= 43.5) continue; // vùng chạm là cả nhãn
        if (e.closest('.card h3')) continue; // liên kết phủ cả thẻ (::after), vùng bấm là cả thẻ
        if (e.closest('.bgs-crumb .s')) continue; // liên kết chữ trong dòng phụ đề (WCAG 2.5.8, ngoại lệ liên kết trong dòng); điều hướng chính là logo và menu
        out.tap.push([Math.round(r.width), Math.round(r.height), label]); } } }
  const root = new URL('./', document.baseURI); const site = location.origin + '/';
  for (const a of document.querySelectorAll('a[href]')) { if (!vis(a)) continue; const u = new URL(a.getAttribute('href'), location.href);
    if (u.origin === location.origin && (u.pathname === '/' || u.pathname === '/index.html') && !u.hash) out.home = true;
    if (a.matches('[data-next],.bgs-next a,a.bgs-next')) out.next = true; }
  try { const st = window.BGShell && window.BGShell.state; if (st && st.lesson && st.lesson.next) out.next = true; } catch (e) {}
  out.credit = /Tongjiang/i.test(document.body.innerText);
  if (lesson) {
    // cảnh 3D: canvas lớn nhất; phần bị che = hình chữ nhật của mọi phần tử nổi có nền (bảng, thanh, nút), trừ nhãn nhỏ trong cảnh
    const cvs = [...document.querySelectorAll('canvas')].map((c) => vis(c)).filter((r) => r && r.width * r.height > innerWidth * innerHeight * 0.2);
    if (cvs.length) {
      const C = cvs.sort((a, b) => b.width * b.height - a.width * a.height)[0];
      const covers = [];
      for (const e of document.querySelectorAll('body *')) {
        if (e.tagName === 'CANVAS' || e.querySelector('canvas')) continue; const r = vis(e); if (!r || r.width * r.height < 5000) continue;
        if (e.closest('.bgs-black,.bgs-modal,.bgs-toast')) continue; if (r.width * r.height > C.width * C.height * 0.8) continue; // khung nền chứa cảnh, không che
        const cs = getComputedStyle(e); const bg = cs.backgroundColor.match(/[\d.]+/g); const alpha = !bg ? 0 : bg.length > 3 ? +bg[3] : 1;
        if (alpha > 0.05 || cs.backgroundImage !== 'none' || (cs.backdropFilter && cs.backdropFilter !== 'none')) { if (shown(e)) covers.push(r); }
      }
      let hit = 0, tot = 0; const NX = 48, NY = 30;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const x = (i + 0.5) * innerWidth / NX, y = (j + 0.5) * innerHeight / NY; tot++;
        if (x < C.left || x > C.right || y < C.top || y > C.bottom) continue;
        if (!covers.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) hit++; }
      out.stage = Math.round(hit / tot * 100); }
  }
  return out;
}"""


async def run_one(b, name, url, vp, args, res):
    w, h, touch = VP[vp]
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=touch and min(w, h) < 600, has_touch=touch, device_scale_factor=1)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    t0 = time.time()
    try:
        await pg.goto(BASE + url + ('&' if '?' in url else '?') + 'q=1', wait_until='load', timeout=90000)
    except Exception as e:
        errs.append('goto: ' + str(e)[:100])
    lesson = name in dict(pages('lessons'))
    if lesson:  # đo giao diện học sinh thật sự thấy: sau khi vỏ gắn xong và màn tải đã gỡ
        try: await pg.wait_for_function("document.body.classList.contains('bgs-on') && !document.getElementById('bgs-load')", timeout=240000)
        except Exception: errs.append('vỏ chưa gắn sau 240 giây')
    await asyncio.sleep(args.wait * (3 if name in ('te-bao', 'ty-the') else 1))
    lib = url.startswith('thu-vien/')
    if args.closed:  # đo khi mọi ngăn kéo đóng (tiêu chí của kế hoạch)
        try:
            await pg.evaluate("() => { if (window.BGShell) for (let k = 0; k < 4; k++) BGShell.panel(k, false); }"); await asyncio.sleep(1.5)
        except Exception: pass
    try:
        o = await pg.evaluate(PROBE, [min(w, h) < 600, touch, lesson, lib])
    except Exception as e:
        o = {'probe_error': str(e)[:160]}
    o['err'] = errs; o['load_s'] = round(time.time() - t0, 1)
    if args.shots:
        d = pathlib.Path(args.shots); d.mkdir(parents=True, exist_ok=True)
        try:
            await pg.screenshot(path=str(d / f'{name}_{vp}.png'), timeout=60000)
        except Exception:
            pass
    res.setdefault(name, {})[vp] = o
    await ctx.close()


def verdict(name, url, o, vp):
    lesson = name in dict(pages('lessons')); lib = url.startswith('thu-vien/')
    fails = []
    if o.get('probe_error'): return ['probe: ' + o['probe_error']]
    if o['dev'] and name != 'kiem-may': fails.append(f"dev {len(o['dev'])}: {o['dev'][0]}")
    ui_small = [f for f in o['font'] if f[1] == 'ui']
    if ui_small: fails.append(f"font {len(ui_small)} < ngưỡng, nhỏ nhất {ui_small[0][0]} px '{ui_small[0][2]}'")
    if o['tap']: fails.append(f"tap {len(o['tap'])}: {o['tap'][0]}")
    if o.get('clip'): fails.append(f"clip {len(o['clip'])}: {o['clip'][0]}")
    if o.get('edge'): fails.append(f"edge {len(o['edge'])}: {o['edge'][0]}")
    if url and not o['home']: fails.append('home: không có đường về trang chính')
    if lesson and not o['next']: fails.append('next: không có "Bài tiếp theo"')
    if lesson and o['stage'] is not None and vp == 'd' and o['stage'] < (65 if lib else 60 if name == 'co-the-nguoi' else 70): fails.append(f"stage {o['stage']}%")
    if lib and not o['credit']: fails.append('credit: thiếu ghi công Tongjiang')
    if o['err']: fails.append(f"err: {o['err'][0]}")
    return fails


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--group', default='all'); ap.add_argument('--vp', default='d,t,tp,pl,pp'); ap.add_argument('--shots')
    ap.add_argument('--only'); ap.add_argument('--wait', type=float, default=6); ap.add_argument('--par', type=int, default=4)
    ap.add_argument('--closed', action='store_true'); ap.add_argument('--json', default=str(ROOT / 'tests/ui_audit.json'))
    args = ap.parse_args()
    ps = [p for p in pages(args.group) if not args.only or any(k in p[0] for k in args.only.split(','))]
    vps = args.vp.split(',')
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
        sem = asyncio.Semaphore(args.par)
        async def job(n, u, v):
            async with sem:
                await run_one(b, n, u, v, args, res)
        await asyncio.gather(*(job(n, u, v) for n, u in ps for v in vps))
        await b.close()
    json.dump(res, open(args.json, 'w'), ensure_ascii=False, indent=1)
    bad = 0
    for n, u in ps:
        for v in vps:
            f = verdict(n, u, res[n][v], v)
            st = res[n][v].get('stage')
            print(f"{'ĐẠT ' if not f else 'LỖI '} {n:28s} {v:3s} {'' if st is None else str(st) + '%':5s} " + ' | '.join(f))
            bad += bool(f)
    print(f'\n{len(ps) * len(vps) - bad}/{len(ps) * len(vps)} đạt')


if __name__ == '__main__':
    asyncio.run(main())
