#!/usr/bin/env python3
"""Phim giới thiệu khoảng một phút về bài Động cơ xăng 4 kì, 1920 × 1080, 30 khung/giây, quay từng khung từ chính bài học.

Tám cảnh: thẻ mở đầu, toàn cảnh, bốn kì trong xi lanh, cơ cấu phân phối khí, bảng số khi mở ga, ba chế độ nhìn,
thử phá (tắt bugi), thẻ kết. Góc trục khuỷu là hàm thuần của thời gian; mỗi khung đặt góc, bước đúng một khung hình
rồi chụp, nên không rơi khung dù máy yếu. Ghi phim_gioi_thieu.json (thời điểm kì cháy, đổi cảnh, mở ga) để
nhạc nền khớp hình:  python3 diem.py --tl phim_gioi_thieu.json OUT.wav

  python3 tools/robotics/dong-co/film/phim_gioi_thieu.py THƯ_MỤC_RA [--thu 2.5,12,31]   (cần máy chủ tĩnh cổng 8777, ffmpeg)
  --thu: chỉ chụp vài thời điểm (giây trên toàn phim) thành ảnh để soi trước khi quay hết.
"""
import asyncio, base64, json, math, pathlib, subprocess, sys
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else HERE / 'phim')
TEST = [float(x) for x in sys.argv[sys.argv.index('--thu') + 1].split(',')] if '--thu' in sys.argv else None
ONLY = set(sys.argv[sys.argv.index('--canh') + 1].split(',')) if '--canh' in sys.argv else None  # quay lại vài cảnh, giữ tệp các cảnh khác
W, H, FPS = 1920, 1080, 30
Q = sys.argv[sys.argv.index('--q') + 1] if '--q' in sys.argv else '1'  # bậc chất lượng của bài: 0 cao nhất
STROKE = [('Kì 1 · Nạp', 'Pít-tông đi xuống, xupap nạp mở, hoà khí được hút vào'),
          ('Kì 2 · Nén', 'Hai xupap đóng, hoà khí bị nén tới 1/9 thể tích'),
          ('Kì 3 · Cháy – dãn nở', 'Bugi bật tia lửa, áp suất đẩy pít-tông: kì duy nhất sinh công'),
          ('Kì 4 · Thải', 'Xupap thải mở, khí cháy bị đẩy ra ngoài')]

# góc máy riêng cho phim (độ, mét); t là giây từ lúc vào cảnh
CAMS = {
    'f_orbit': "(t) => ({tx: 0, ty: 0.2, tz: 0, az: -24 + 6.2 * t, el: 11 + 0.5 * t, d: 1.0 - 0.012 * t, sx: 0, sy: 0})",
    'f_inside': "(t) => ({tx: 0.01, ty: 0.215, tz: 0, az: 6 + 1.2 * t, el: 4, d: 0.52 - 0.008 * t, sx: 0, sy: 0})",
    'f_head': "(t) => ({tx: 0, ty: 0.29, tz: 0, az: 34 - 6 * t, el: 16 - 0.6 * t, d: 0.52, sx: 0, sy: 0})",
    'f_orbit2': "(t) => ({tx: 0, ty: 0.2, tz: 0, az: 28 + 6 * t, el: 14, d: 0.98, sx: 0, sy: 0})",
}
# cảnh: (tên, giây, loại, góc máy, hiện bảng điều khiển)
SCENES = [
    ('mo', 3.5, 'card', None, False),
    ('toan-canh', 7.0, 'live', 'f_orbit', False),
    ('bon-ki', 10.0, 'live', 'f_inside', False),
    ('nap-may', 6.5, 'live', 'f_head', False),
    ('bang-so', 9.0, 'live', 'hero', True),
    ('che-do', 6.6, 'live', 'f_orbit2', False),
    ('thu-pha', 7.5, 'live', 'front', True),
    ('ket', 5.0, 'card', None, False),
]
FADE = 0.45


def psi_rate(name, t):
    """độ/giây trên màn hình theo cảnh; 'bang-so' mở ga từ giây 2 tới giây 6"""
    if name == 'bon-ki': return 72.0
    if name == 'nap-may': return 90.0
    if name == 'bang-so':
        u = min(1, max(0, (t - 2) / 4)); return 135 + 405 * u * u * (3 - 2 * u)
    if name == 'thu-pha':
        return 150 * math.exp(-max(0, t - 1.5) / 1.6) if t > 1.5 else 150
    return 120.0


def caption(name, t, dur):
    """(dòng nhỏ, dòng lớn, độ hiện 0..1) của thẻ chữ dưới góc trái"""
    def env(a, b):  # hiện từ a tới b giây trong cảnh, mờ vào ra 0,35 s
        return max(0.0, min(1.0, (t - a) / 0.35, (b - t) / 0.35))
    if name == 'toan-canh': return ('Công nghệ 11 · thông số Honda Wave Alpha 110', 'Động cơ xăng 4 kì', env(0.6, dur - 0.5))
    if name == 'bon-ki':
        k = min(3, int(t / 2.5)); return (STROKE[k][1], STROKE[k][0], env(k * 2.5 + 0.15, k * 2.5 + 2.45))
    if name == 'nap-may': return ('Mỗi xupap mở đúng một lần trong hai vòng quay', 'Trục cam quay bằng nửa trục khuỷu', env(0.5, dur - 0.5))
    if name == 'bang-so': return ('Mở ga: áp suất, đồ thị p–V, công suất tính lại theo từng góc quay', 'Mọi con số là trạng thái thật của mô phỏng', env(0.5, dur - 0.5))
    if name == 'che-do':
        k = min(2, int(t / (dur / 3))); return ('Một mô hình, ba cách nhìn', ['Cắt dọc', 'Nhìn xuyên', 'Nguyên khối'][k], env(k * dur / 3 + 0.15, (k + 1) * dur / 3 - 0.15))
    if name == 'thu-pha': return ('Không còn kì sinh công, máy chạy theo đà rồi dừng', 'Thử phá: tắt bugi', env(0.5, dur - 0.4))
    return ('', '', 0.0)


OVERLAY = """
(() => {
  const st = document.createElement('style');
  st.textContent = `
  body.film-clean .bgs, body.film-clean .ui, body.film-ui .bgs, .tourchip, .cur, .ring, #bgs-load, .mob, .turn {display:none!important}
  #film-lt{position:fixed;left:84px;bottom:80px;z-index:999;padding:22px 30px 24px;border-radius:22px;background:rgba(255,255,255,.92);
    box-shadow:0 0 0 1px rgba(16,24,40,.06),0 18px 50px -20px rgba(16,24,40,.35);font-family:'Be Vietnam Pro',system-ui,sans-serif;max-width:900px}
  #film-lt b{display:block;font-size:46px;font-weight:600;letter-spacing:-.02em;color:#15171C;line-height:1.15}
  #film-lt span{display:block;font-size:22px;font-weight:500;color:#5B6472;margin-top:8px}
  #film-lt i{position:absolute;left:30px;top:-5px;width:44px;height:5px;border-radius:3px;background:#e3562a}
  body.film-ui .cap{visibility:hidden}
  body.film-ui #film-lt{background:#fff;left:50%;transform:translateX(-50%);bottom:26px;width:1040px;max-width:none;padding:18px 28px 20px;box-shadow:0 0 0 1px rgba(16,24,40,.08),0 10px 40px -16px rgba(16,24,40,.4)}
  body.film-ui #film-lt b{font-size:36px} body.film-ui #film-lt span{font-size:20px}`;
  document.head.appendChild(st);
  const lt = document.createElement('div'); lt.id = 'film-lt'; lt.innerHTML = '<i></i><b></b><span></span>'; document.body.appendChild(lt);
  window.FILM_LT = (sub, title, k) => {
    lt.style.opacity = k; lt.style.translate = `0 ${(1 - k) * 14}px`;
    if (title) { lt.querySelector('b').textContent = title; lt.querySelector('span').textContent = sub; }
  };
  // có vỏ bài thì cảnh chiếm cả màn hình, bảng số mở bằng BGShell.panel; thẻ lời giảng thu nhỏ để camera không lệch sang phải
  document.querySelector('.mob.cap')?.classList.add('min');
  window.FILM_MODE = (ui) => { document.body.classList.toggle('film-ui', ui); document.body.classList.toggle('film-clean', !ui); BGShell.panel(0, ui); dispatchEvent(new Event('resize')); };
})();
"""


def card_html(kind):
    logo = 'http://localhost:8777/design/logo/mark.png'  # trang thẻ dựng bằng set_content: tài nguyên lấy qua máy chủ tĩnh
    font = 'http://localhost:8777/design/house.css'
    if kind == 'mo':
        body = f'''<img src="{logo}"><div class="k">Sáng Ăn Khoai</div><h1>Bài giảng 3D tiếng Việt<br>chạy bằng số liệu thật</h1>'''
    else:
        body = f'''<img src="{logo}"><h1 style="font-size:66px">Sáng Ăn Khoai</h1>
        <div class="row"><div><b>65</b><span>bài học 3D</span></div><div><b>64</b><span>chủ đề GDPT 2018</span></div><div><b>0</b><span>dữ liệu học sinh thu về</span></div><div><b>Offline</b><span>chạy không cần mạng</span></div></div>
        <div class="u">nclamvn.github.io/bai-giang</div>'''
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{font}"><style>
    html,body{{margin:0;width:{W}px;height:{H}px;background:#fff;font-family:'Be Vietnam Pro',sans-serif;color:#15171C}}
    body{{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}}
    img{{width:150px;height:150px}} .k{{font-size:30px;font-weight:600;color:#5B6472;letter-spacing:.02em}}
    h1{{margin:0;font:600 76px/1.12 'Noto Serif',Georgia,serif;letter-spacing:-.02em}}
    .row{{display:flex;gap:28px;margin-top:22px}} .row div{{min-width:230px;padding:22px 26px;border-radius:22px;background:#f6f7f9;display:grid;gap:4px}}
    .row b{{font-size:48px;font-weight:600;letter-spacing:-.02em}} .row span{{font-size:22px;color:#5B6472}}
    .u{{margin-top:26px;font-size:28px;font-weight:600;color:#e3562a}}
    </style></head><body>{body}</body></html>'''


def encode(frames_cmd_input, path, dur):
    fades = f'fade=t=in:st=0:d={FADE}:color=white,fade=t=out:st={dur - FADE:.3f}:d={FADE}:color=white'
    return ['ffmpeg', '-y', '-loglevel', 'error'] + frames_cmd_input + ['-vf', f'format=yuv420p,{fades}', '-r', str(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast',
                                                                      '-pix_fmt', 'yuv420p', '-t', f'{dur:.3f}', path]


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    t0s, acc = [], 0.0
    for s in SCENES: t0s.append(acc); acc += s[1]
    total = acc
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        # thẻ mở đầu, thẻ kết: một ảnh tĩnh, giữ bằng ffmpeg
        cp = await b.new_page(viewport={'width': W, 'height': H})
        await cp.goto('http://localhost:8777/design/')  # cùng nguồn với phông (máy chủ tĩnh không gửi CORS)
        for name, dur, kind, _, _ in SCENES:
            if kind != 'card' or TEST or (ONLY and name not in ONLY): continue
            await cp.set_content(card_html(name)); await cp.evaluate('document.fonts.ready'); await cp.wait_for_timeout(1500)
            png = str(OUT / f'{name}.png'); await cp.screenshot(path=png)
            tmp = str(OUT / f'_{name}.mp4')
            vf = f'format=yuv420p,loop=-1:1,trim=duration={dur},fade=t=in:st=0:d={FADE}:color=white,fade=t=out:st={dur - FADE:.3f}:d={FADE}:color=white'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', png, '-vf', vf, '-r', str(FPS), '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', tmp], check=True)
            pathlib.Path(tmp).rename(OUT / f'{name}.mp4')
        pg = await b.new_page(viewport={'width': W, 'height': H})
        await pg.add_init_script("window.__rafQ=[];window.__manual=false;const __o=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=(cb)=>{if(window.__manual){window.__rafQ.push(cb);return 0}return __o(cb)};window.__step=(ts)=>{const q=window.__rafQ;window.__rafQ=[];q.forEach(cb=>cb(ts))};")
        await pg.goto(f'http://localhost:8777/cong-nghe/dong-co-4-ki/?lite=0&q={Q}', timeout=180000)
        await pg.wait_for_function("window.SIM_SHOWN && window.LIVE && window.ENGINE_VIEWS && document.body.classList.contains('bgs-on') && !document.getElementById('bgs-load')", timeout=400000)
        await pg.evaluate(OVERLAY)
        await pg.evaluate('LIVE.takeOver(); Object.assign(ENGINE, {film: true, labels: false}); ' + ''.join(f'ENGINE_VIEWS.{k} = {v};' for k, v in CAMS.items()))
        await asyncio.sleep(1.5)
        await pg.evaluate("window.__manual = true")
        ts = await pg.evaluate("performance.now()") + 50
        cdp = await pg.context.new_cdp_session(pg)
        fires, psi, spark = [], 0.0, True
        for si, (name, dur, kind, cam, ui) in enumerate(SCENES):
            if kind != 'live': continue
            want = [x for x in TEST if t0s[si] <= x < t0s[si] + dur] if TEST else None
            if TEST and not want: continue
            if ONLY and name not in ONLY:  # không quay lại: chỉ tính góc quay và kì cháy để nhạc vẫn khớp
                if name == 'bon-ki': psi = 0.0
                sp = True
                for f in range(int(round(dur * FPS))):
                    t = f / FPS
                    if name == 'bon-ki': psi = 72.0 * t
                    if name == 'thu-pha' and t >= 1.5: sp = False
                    nxt = psi + psi_rate(name, t) / FPS
                    if sp and math.floor((nxt - 360) / 720) > math.floor((psi - 360) / 720): fires.append(round(t0s[si] + t, 4))
                    psi = nxt
                continue
            # vào cảnh: chế độ, góc máy đặt thẳng (không bay từ cảnh trước), trạng thái máy
            setup = f"FILM_MODE({'true' if ui else 'false'}); LIVE.setView('{cam}'); Object.assign(LIVE.cam, ENGINE_VIEWS['{cam}'](0));"
            setup += f"if (!ENGINE.spark) LIVE.sim.act('spark'); ENGINE.stalled = false; ENGINE.labels = {'true' if name == 'bang-so' else 'false'}; ENGINE.mode !== 'cut' && LIVE.sim.act('cut');"
            if name == 'bon-ki': psi = 0.0
            await pg.evaluate(setup); spark = True
            for _ in range(3): ts += 1000 / FPS; await pg.evaluate(f"window.__step({ts:.3f})")
            ff = None
            if not TEST:
                tmp = str(OUT / f'_{name}.mp4')
                ff = subprocess.Popen(encode(['-f', 'image2pipe', '-framerate', str(FPS), '-i', '-'], tmp, dur), stdin=subprocess.PIPE)
            n = int(round(dur * FPS))
            frames = range(n)
            if TEST:  # soi nhanh: nhảy thẳng tới khung cần xem, góc máy đặt đúng thời điểm đó
                frames = [int(round((x - t0s[si]) * FPS)) for x in want]
            for f in frames:
                if TEST:
                    tt = f / FPS
                    await pg.evaluate(f"ENGINE_VIEWS.f_tmp = (t) => ENGINE_VIEWS['{cam}'](t + {tt:.4f}); LIVE.setView('f_tmp'); Object.assign(LIVE.cam, ENGINE_VIEWS.f_tmp(0));")
                    if name != 'bon-ki': psi = sum(psi_rate(name, k / FPS) / FPS for k in range(f))
                t = f / FPS
                if name == 'bon-ki': psi = 72.0 * t
                rate = psi_rate(name, t)
                rpm = rate / (6 / 66.67)
                js = 'LIVE.takeOver();'  # giữ quyền điều khiển: không để bài giảng tự chạy lại sau 25 giây
                if name == 'che-do':
                    m = ['cut', 'glass', 'solid'][min(2, int(t / (dur / 3)))]
                    js += f"ENGINE.mode !== '{m}' && LIVE.sim.act('{m}');"
                if name == 'thu-pha' and t >= 1.5 and spark: js += "LIVE.sim.act('spark');"; spark = False
                stalled = name == 'thu-pha' and t > 5.6
                sub, title, k = caption(name, t, dur)
                js += f"Object.assign(ENGINE, {{psi: {psi % 720:.4f}, rpm: {0 if stalled else rpm:.1f}, rpmT: {rpm:.1f}, stalled: {'true' if stalled else 'false'}}}); FILM_LT({json.dumps(sub)}, {json.dumps(title)}, {k:.3f});"
                await pg.evaluate(js)
                ts += 1000 / FPS
                await pg.evaluate(f"window.__step({ts:.3f})")
                gt = t0s[si] + t
                if TEST:
                    for _ in range(2): ts += 1000 / FPS; await pg.evaluate(f"window.__step({ts:.3f})")
                    r = await cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 92})
                    (OUT / f'thu-{gt:05.1f}.jpg').write_bytes(base64.b64decode(r['data'])); print('ảnh', gt, flush=True)
                else:
                    r = await cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 92, 'optimizeForSpeed': True})
                    ff.stdin.write(base64.b64decode(r['data']))
                # kì cháy: góc đi qua 360° (mod 720) khi bugi còn bật
                nxt = psi + rate / FPS
                if spark and math.floor((nxt - 360) / 720) > math.floor((psi - 360) / 720): fires.append(round(gt, 4))
                psi = nxt
                if f % 60 == 0: print(name, f, '/', n, flush=True)
            if ff:
                ff.stdin.close(); ff.wait()
                if ff.returncode == 0: pathlib.Path(tmp).rename(OUT / f'{name}.mp4')
        await b.close()
    if TEST: return
    (OUT / 'list.txt').write_text(''.join(f"file '{s[0]}.mp4'\n" for s in SCENES))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(OUT / 'list.txt'), '-c', 'copy', str(OUT / 'phim-cam.mp4')], check=True)
    tl = {'duration': total, 'fps': FPS, 'firings': fires, 'views': t0s[1:], 'throttle': [t0s[4] + 2, t0s[4] + 6]}
    (HERE / 'phim_gioi_thieu.json').write_text(json.dumps(tl, indent=1) + '\n')
    print('đã ghi', OUT / 'phim-cam.mp4', f'{total:.1f} s', len(fires), 'kì cháy')


if __name__ == "__main__":
    asyncio.run(main())
