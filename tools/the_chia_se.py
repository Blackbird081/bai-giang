#!/usr/bin/env python3
"""Thẻ chia sẻ cho mọi trang (Facebook, Zalo, X, Slack): ảnh 1200×630 và thẻ og/twitter ở đầu <head>.

Theo bước 9 của quy trình teardown (Elvar, MIT): trình đọc liên kết chỉ đọc phần đầu trang, nên khối thẻ đặt ngay sau
<meta charset>, ảnh dùng địa chỉ tuyệt đối. Trang giữ dưới 1 MB khi làm được (xem README, mục Thẻ chia sẻ).

  python3 tools/the_chia_se.py            chèn hoặc thay khối <!--BG-SHARE--> trong mọi trang (tất định, build_all chạy bước này cuối)
  python3 tools/the_chia_se.py --render   vẽ lại ảnh thẻ design/the/*.jpg đã đổi nguồn (cần máy chủ tĩnh cổng 8777 và Playwright)
  python3 tools/the_chia_se.py --list     liệt kê trang, tiêu đề, ảnh

Ảnh thẻ nằm trong git; --render chỉ vẽ ảnh có tiêu đề, nhãn hay ảnh bìa đã đổi (design/the/manifest.json).
"""
import hashlib, html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from chuoi_bai import SEQ, BY  # noqa: E402

SITE = 'https://nclamvn.github.io/bai-giang/'
OUT = ROOT / 'design/the'
TPL_VER = '1'
SKIP_DIRS = ('tools/', 'offline/', '.art_robo/', 'node_modules/', 'co-the-nguoi/app/', 'co-the-nguoi/dental/')
E = lambda s: html.escape(str(s), quote=True)

# trang không phải bài: ảnh bìa và nhãn đặt tay
EXTRA = {
    'index.html': {'cover': 'mosaic', 'eye': 'Bài học 3D tiếng Việt · dùng tự do cho trường học'},
    'chu-de/sinh-hoc-te-bao/index.html': {'cover': 'thu-vien/covers/te-bao.webp', 'eye': 'Lộ trình · Sinh học 10'},
    'lich-su-10/index.html': {'cover': 'thu-vien/covers/co-loa.webp', 'eye': 'Lộ trình · Lịch sử 10'},
    'robotics/index.html': {'cover': 'thu-vien/covers/robo-hexapod.webp', 'eye': 'Robotics · Đại học'},
    'giao-vien/index.html': {'cover': 'mosaic-gv', 'eye': 'Cho giáo viên · Gói dạy thử 45 phút'},
    'kiem-may/index.html': {'cover': None, 'eye': 'Cho giáo viên · Dụng cụ lên lớp'},
    'dieu-khien/index.html': {'cover': None, 'eye': 'Cho giáo viên · Dụng cụ lên lớp'},
    'te-bao/ar.html': {'cover': 'thu-vien/covers/te-bao.webp', 'eye': 'Sinh học 10 · Thực tế tăng cường'},
}


def pages():
    out = []
    for p in sorted(ROOT.rglob('*.html')):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(SKIP_DIRS) or '/upstream/' in rel or '/node_modules/' in rel: continue
        s = p.read_text(encoding='utf-8', errors='ignore')
        if 'http-equiv="refresh"' in s[:4000]: continue
        out.append((rel, s))
    return out


def info(rel, s):
    s = re.sub(r'<!--BG-SHARE:start-->.*?<!--BG-SHARE:end-->', '', s, flags=re.S)  # mô tả do chính khối này chèn không tính
    t = re.search(r'<title>(.*?)</title>', s, re.S)
    title = html.unescape(t.group(1).strip()) if t else 'Sáng Ăn Khoai'
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    own = bool(d)
    desc = html.unescape(d.group(1)) if d else 'Bài học 3D tiếng Việt, dùng tự do cho trường học, phi thương mại.'
    c = BY.get(pathlib.PurePosixPath(rel).stem) if rel.startswith('thu-vien/') else None
    if c and not own: desc = f'Bài 3D {c["mon"]}: {c["question"]}'
    q = SEQ.get(rel)
    if q:
        cover = q.get('cover') or ''
        cover = cover if cover.startswith('thu-vien/') else 'thu-vien/' + cover
        crumb = ' · '.join(c['t'] for c in q.get('crumb') or [])
        eye = crumb or q.get('subject', '')
        head = q['title']
    elif rel.startswith('giao-vien/') and rel.count('/') == 2:
        slug = rel.split('/')[1]
        g = json.loads((ROOT / f'tools/goi-day/{slug}.json').read_text(encoding='utf-8'))
        cover, eye, head = f'thu-vien/covers/{slug}.webp', f'Gói dạy thử · {g["mon"]} {g["lop"]} · 45 phút', g['ten_tiet']
    else:
        x = EXTRA.get(rel, {'cover': None, 'eye': ''})
        cover, eye = x['cover'], x['eye']
        head = title.split(' · ')[0]
    if rel == 'index.html': head = 'Sáng Ăn Khoai'
    slug = 'index' if rel == 'index.html' else re.sub(r'(/index)?\.html$', '', rel).replace('/', '-')
    return {'rel': rel, 'title': title, 'desc': desc, 'own': own, 'head': head, 'eye': eye, 'cover': cover, 'img': f'design/the/{slug}.jpg'}


def url_of(rel):
    return SITE + (rel[:-10] if rel.endswith('index.html') else rel)


def block(i):
    img = SITE + i['img']
    return ('<!--BG-SHARE:start-->\n'
            '<meta property="og:type" content="website"><meta property="og:site_name" content="Sáng Ăn Khoai"><meta property="og:locale" content="vi_VN">\n'
            + ('' if i['own'] else f'<meta name="description" content="{E(i["desc"])}">\n') +
            f'<meta property="og:title" content="{E(i["title"])}"><meta property="og:description" content="{E(i["desc"])}">\n'
            f'<meta property="og:url" content="{E(url_of(i["rel"]))}"><link rel="canonical" href="{E(url_of(i["rel"]))}">\n'
            f'<meta property="og:image" content="{E(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{E(i["head"])}">\n'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{E(img)}">\n'
            '<!--BG-SHARE:end-->\n')


def inject(s, i):
    s = re.sub(r'<!--BG-SHARE:start-->.*?<!--BG-SHARE:end-->\n?', '', s, flags=re.S)
    m = re.search(r'<meta charset="?utf-8"?\s*/?>\n?', s, re.I)
    assert m, 'thiếu <meta charset>'
    return s[:m.end()] + ('' if s[m.end() - 1] == '\n' else '\n') + block(i) + s[m.end():]


def card_html(i):
    if i['cover'] in ('mosaic', 'mosaic-gv'):
        ks = ['te-bao', 'co-the-nguoi', 'than-kinh', 'co-loa'] if i['cover'] == 'mosaic' else ['te-bao', 'than-kinh', 'co-loa', 'te-bao']
        bg = '<div class="mo">' + ''.join(f'<img src="/thu-vien/covers/{k}.webp">' for k in ks[:4]) + '</div>'
    elif i['cover']:
        bg = f'<img class="bg" src="/{i["cover"]}">'
    else:
        bg = '<div class="plain"></div><img class="big" src="/design/logo/sang-an-khoai.webp">'
    big = len(i['head']) <= 34
    return f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="stylesheet" href="/design/house.css"><style>
*{{margin:0;box-sizing:border-box}}html,body{{width:1200px;height:630px;overflow:hidden;background:#F4F4F6}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.mo{{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;background:#fff}}.mo img{{width:100%;height:100%;object-fit:cover}}
.big{{position:absolute;right:70px;top:50%;width:380px;transform:translateY(-50%)}}
.plain{{position:absolute;inset:0;background:radial-gradient(900px 500px at 85% 10%,rgba(194,24,74,.10),transparent 60%),radial-gradient(800px 500px at 0% 100%,rgba(30,42,68,.10),transparent 60%),#F7F7F9}}
.card{{position:absolute;left:40px;bottom:40px;max-width:{'760' if big else '900'}px;padding:24px 30px 26px;border-radius:26px;background:rgba(255,255,255,.93);box-shadow:0 0 0 1px rgba(16,24,40,.06),0 24px 60px -24px rgba(16,24,40,.5);font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#15171C}}
.br{{display:flex;align-items:center;gap:12px;font:600 22px 'Be Vietnam Pro';color:#454A55}}.br img{{width:40px;height:40px;border-radius:10px}}
.eye{{margin-top:14px;font:600 24px 'Be Vietnam Pro';color:#C2184A}}
h1{{margin-top:6px;font:700 {'60' if big else '48'}px/1.12 'Be Vietnam Pro';letter-spacing:-.015em}}
</style></head><body>{bg}<div class="card"><div class="br"><img src="/design/logo/mark-96.webp">Sáng Ăn Khoai</div>{f'<div class="eye">{E(i["eye"])}</div>' if i["eye"] else ''}<h1>{E(i["head"])}</h1></div></body></html>'''


def key(i):
    h = hashlib.sha256((TPL_VER + i['head'] + '|' + i['eye'] + '|' + str(i['cover'])).encode())
    if i['cover'] and not i['cover'].startswith('mosaic'):
        h.update((ROOT / i['cover']).read_bytes())
    return h.hexdigest()[:16]


def render(items):
    import asyncio
    from playwright.async_api import async_playwright
    from PIL import Image
    import io
    OUT.mkdir(parents=True, exist_ok=True)
    man_p = OUT / 'manifest.json'
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    todo = [i for i in items if man.get(i['img']) != key(i) or not (ROOT / i['img']).exists()]

    async def go():
        async with async_playwright() as p:
            b = await p.chromium.launch()
            pg = await b.new_page(viewport={'width': 1200, 'height': 630})
            for n, i in enumerate(todo):
                # mỗi ảnh một tệp riêng: cùng một địa chỉ thì trình duyệt có thể trả bản cũ trong bộ nhớ đệm
                f = ROOT / f'design/the/_card{n}.html'
                f.write_text(card_html(i), encoding='utf-8')
                await pg.goto(f'http://localhost:8777/design/the/_card{n}.html')
                await pg.wait_for_load_state('networkidle'); await pg.evaluate('document.fonts.ready')
                png = await pg.screenshot(type='png')
                Image.open(io.BytesIO(png)).convert('RGB').save(ROOT / i['img'], 'JPEG', quality=84, optimize=True, progressive=True)
                man[i['img']] = key(i)
                f.unlink()
                print('vẽ', i['img'])
            await b.close()
    asyncio.run(go())
    man_p.write_text(json.dumps(dict(sorted(man.items())), ensure_ascii=False, indent=1) + '\n')
    print(f'{len(todo)} ảnh vẽ lại, {len(items) - len(todo)} giữ nguyên')


def main():
    items = [info(rel, s) for rel, s in pages()]
    if '--list' in sys.argv:
        for i in items: print(f"{i['rel']:45} {i['img']:40} {i['eye']} | {i['head']}")
        return
    if '--render' in sys.argv:
        render(items); return
    miss = [i['img'] for i in items if not (ROOT / i['img']).exists()]
    n = 0
    for rel, s in pages():
        i = info(rel, s)
        t = inject(s, i)
        if t != s: (ROOT / rel).write_text(t, encoding='utf-8'); n += 1
    print(f'thẻ chia sẻ: {len(items)} trang, {n} trang cập nhật' + (f'; THIẾU {len(miss)} ảnh, chạy --render' if miss else ''))
    if miss and '--strict' in sys.argv: sys.exit('thiếu ảnh thẻ: ' + ', '.join(miss[:5]))


if __name__ == '__main__':
    main()
