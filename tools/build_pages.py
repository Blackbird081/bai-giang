#!/usr/bin/env python3
"""Dựng trang thư viện và trang chủ đề từ một nguồn dữ liệu duy nhất.

Nguồn: thu-vien/catalog.vi.json (54 bài), thu-vien/gdpt2018.json (đối chiếu chương trình), tools/thu-vien.template.html.
Ra:
  thu-vien/index.html                  thư viện (bản GitHub Pages)
  chu-de-sinh-hoc-te-bao.html          lộ trình chủ đề Sinh học tế bào lớp 10 (bản GitHub Pages)
  và nếu truyền --artifact <thư mục> <url tế bào> <url ty thể> <url thư viện>: bản cho trang đăng trên Claude,
  nơi thư viện, 54 bài và trang chủ đề nằm cùng một thư mục.
Chạy từ thư mục gốc repo:  python3 tools/build_pages.py [--artifact out_dir cell_url mito_url lib_url]
"""
import json, sys, html, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import liquid_glass as LG

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = json.load(open(ROOT / 'thu-vien/catalog.vi.json', encoding='utf-8'))
GD = json.load(open(ROOT / 'thu-vien/gdpt2018.json', encoding='utf-8'))
TPL = open(ROOT / 'tools/thu-vien.template.html', encoding='utf-8').read()
E = lambda s: html.escape(str(s), quote=True)


def sources_html():
    out = []
    for mon, arr in GD['nguon'].items():
        main = [a for a in arr if 'Thông tư 13' not in a['ten'] and 'Thông tư 17' not in a['ten']][:2]
        out.append(f'{E(mon)}: ' + ', '.join(f'<a href="{E(a["url"])}" target="_blank" rel="noopener">{E(a["ten"].split("(")[0].strip())}</a>' for a in main))
    return '; '.join(out) + '.'


def library(links):
    keep = ('slug', 'subject', 'mon', 'file', 'cover', 'title', 'question', 'type', 'steps', 'textbook')
    lessons = [{k: c[k] for k in keep} for c in CAT]
    gd = {s: v for s, v in GD['bai'].items() if any(c['slug'] == s for c in CAT)}
    s = TPL.replace('__CATALOG__', json.dumps(lessons, ensure_ascii=False)).replace('__GDPT__', json.dumps(gd, ensure_ascii=False))
    s = s.replace('__SOURCES__', sources_html())
    for k, v in links.items(): s = s.replace(k, v)
    assert '__' not in s.replace('__proto__', ''), 'còn chỗ giữ chỗ chưa thay'
    return s


# ---------- Trang chủ đề Sinh học tế bào lớp 10 ----------
ROUTE = [  # thứ tự theo mạch nội dung của chương trình; thời lượng là gợi ý
    ('te-bao', 'Hành Trình Vào Tế Bào', 'cell', 'Cấu trúc tế bào nhân thực, nhập bào và xuất bào, truyền tin qua thụ thể', '1–2 tiết',
     'Một tế bào nhân thực đang hoạt động: bấm từng bào quan, xem đường tiết protein, nhập bào, tín hiệu và ATP; phóng xuống ribosome thật. Chế độ lên lớp 10 bước có câu đố cuối.',
     'Nếu tế bào là một nhà máy, bào quan nào là xưởng, kho, bưu điện và nhà máy điện?'),
    ('transport-step', None, 'lesson', 'Vận chuyển các chất qua màng sinh chất', '1 tiết', None, None),
    ('plasmolysis-step', None, 'lesson', 'Thực hành co và phản co nguyên sinh', '1 tiết thực hành', None, None),
    ('ty-the', 'Vào Ty Thể: động cơ ATP synthase', 'mito', 'ATP, ty thể và chuyển hoá năng lượng', '1 tiết',
     'Từ một ty thể xuống từng nguyên tử của ATP synthase thật. Dòng H⁺ làm vòng c quay, ba vị trí β lần lượt tạo ATP. Chế độ lên lớp 10 bước, câu đố cuối có câu bấm thẳng vào phân tử.',
     'Mỗi ngày cơ thể em tạo ra lượng ATP nặng xấp xỉ cân nặng của chính em. Cái máy nào làm được việc đó?'),
    ('enzyme-step', None, 'lesson', 'Enzyme và các yếu tố ảnh hưởng đến hoạt tính enzyme', '1 tiết', None, None),
    ('mitosis-step', None, 'lesson', 'Chu kì tế bào và nguyên phân, thực hành quan sát đầu rễ hành', '1 tiết thực hành', None, None),
]


def chu_de(links, lesson_href):
    cat = {c['slug']: c for c in CAT}
    sec = GD['sinh10_te_bao']
    # Ai phủ yêu cầu nào: so khớp nguyên văn
    cover = {}
    for slug, *_ in ROUTE:
        for m in GD['bai'].get(slug, {}).get('khop', []):
            if m['lop'] != 10 or m['mon'] != 'Sinh học': continue
            for y in m['ycd']: cover.setdefault(y, []).append((slug, m['muc_do']))
    name = {r[0]: (r[1] or cat[r[0]]['title']) for r in ROUTE}
    href = lambda slug: links['__L_CELL__'] if slug == 'te-bao' else links['__L_MITO__'] if slug == 'ty-the' else lesson_href(cat[slug]['file'])
    cards = []
    for i, (slug, title, kind, focus, dur, desc, ask) in enumerate(ROUTE, 1):
        c = cat.get(slug); g = GD['bai'].get(slug, {'khop': [], 'ghi_chu': ''})
        title = title or c['title']; desc = desc or ('Câu hỏi chính của bài: ' + c['question']); ask = ask or (c['question'] if c else '')
        steps = (' · '.join(c['steps'])) if c else ''
        ch = [m for m in g['khop'] if m['muc_do'] == 'chinh' and m['lop'] == 10]
        other = [m for m in g['khop'] if m not in ch]
        yl = ''.join(f'<li>{E(y)}<span class="mu">{E(m["muc"].split(" › ")[-1])}</span></li>' for m in ch for y in m['ycd'])
        ol = ''.join(f'<li>{E(y)}<span class="mu">{E(m["mon"])} {m["lop"]} · {E(m["muc"].split(" › ")[-1])}</span></li>' for m in other for y in m['ycd'])
        cover_img = f'<img src="{E(lesson_href(c["cover"] if c else "covers/" + slug + ".webp"))}" alt="" loading="lazy">'
        cards.append(f'''<article class="step">
  <div class="no">{i}</div>
  <div class="vis">{cover_img}</div>
  <div class="bd">
    <div class="meta"><span>{E(focus)}</span><span class="dur">{E(dur)} · gợi ý</span></div>
    <h3><a href="{E(href(slug))}">{E(title)}</a></h3>
    <p>{E(desc)}</p>
    {f'<p class="steps"><b>Các bước:</b> {E(steps)}</p>' if steps else ''}
    <div class="ask"><b>Mở bài</b>{E(ask)}</div>
    <div class="ycd"><div class="lbl">Yêu cầu cần đạt bài này dạy trực tiếp</div><ul>{yl or '<li>Không có yêu cầu nào được dạy trực tiếp.</li>'}</ul>
    {f'<details><summary>Liên quan và mở rộng ({sum(len(m["ycd"]) for m in other)})</summary><ul>{ol}</ul></details>' if other else ''}
    {f'<p class="gc"><b>Lưu ý:</b> {E(g["ghi_chu"])}</p>' if g.get('ghi_chu') else ''}</div>
    <a class="btn pri" href="{E(href(slug))}">Mở bài</a>
  </div>
</article>''')
    rows = []; n_ok = n_rel = n_no = 0
    for h in sec:
        for y in h['ycd']:
            who = cover.get(y, []); st = 'ok' if any(w[1] == 'chinh' for w in who) else 'rel' if who else 'no'
            n_ok += st == 'ok'; n_rel += st == 'rel'; n_no += st == 'no'
            names = ', '.join(sorted({name[w[0]] for w in who if (w[1] == 'chinh') == (st == 'ok')}))
            label = {'ok': 'Có bài', 'rel': 'Liên quan', 'no': 'Chưa có'}[st]
            rows.append(f'<tr class="{st}"><td>{E(h["muc"].replace(" › ", " › "))}</td><td>{E(y)}</td><td><span class="st {st}">{label}</span>{f"<div class=mu>{E(names)}</div>" if names else ""}</td></tr>')
    total = n_ok + n_rel + n_no
    src = GD['nguon']['Sinh học'][0]
    LG_CSS = LG.root('''
  --paper:#F5F5F7; --panel:#FFFFFF; --ink:#1D1D1F; --ink2:#424245; --muted:#6E6E73; --line:rgba(15,23,42,.08); --f-body:var(--lg-font); --f-mono:var(--lg-font); --r:22px;
''') + LG.BODY + 'html{background:var(--lg-page)} header h1{letter-spacing:-.025em} .lbl{font-weight:600;letter-spacing:.07em} .kpi b{font-variant-numeric:tabular-nums}\n' \
        + LG.glass('.kpi div,.step', 'var(--lg-r)') + LG.glass('table', 'var(--lg-r)') + LG.pill_buttons('.btn,.chip', '.btn.pri', '#D42150', '#B0123C') \
        + '.chip[aria-pressed="true"]{background:linear-gradient(180deg,#2C2C2E,#1D1D1F)!important;color:#fff!important}.ask{border-left:0;border-radius:14px;background:rgba(232,176,75,.14)} th{background:rgba(255,255,255,.5)} .step .vis img{border-radius:16px}\n'
    return f'''<!doctype html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sinh Học Tế Bào 10</title>
<meta name="description" content="Lộ trình 6 bài 3D cho chủ đề Sinh học tế bào lớp 10 theo chương trình GDPT 2018, kèm yêu cầu cần đạt trích nguyên văn và bảng những yêu cầu chưa có bài.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
:root{{--paper:#F6F3F0;--panel:#FFFFFF;--ink:#1B1416;--ink2:#4A3E41;--muted:#74676A;--line:#E6DDD9;--crimson:#BE1740;--gold:#A87A22;--gold-soft:#F6EBD3;--ok:#2C7A4B;--okbg:rgba(44,122,75,.12);--relbg:rgba(168,122,34,.14);--nobg:rgba(116,103,106,.12);
  --f-body:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--r:14px}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--paper:#141011;--panel:#1E1819;--ink:#F2EAE8;--ink2:#D3C6C8;--muted:#A8999C;--line:#33292B;--crimson:#F0587A;--gold:#E2B259;--gold-soft:#3A2F1A;--ok:#5FC28A}}}}
:root[data-theme="dark"]{{--paper:#141011;--panel:#1E1819;--ink:#F2EAE8;--ink2:#D3C6C8;--muted:#A8999C;--line:#33292B;--crimson:#F0587A;--gold:#E2B259;--gold-soft:#3A2F1A;--ok:#5FC28A}}
*{{box-sizing:border-box}} html,body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f-body);line-height:1.55}}
a{{color:var(--crimson)}}
.wrap{{max-width:1180px;margin:0 auto;padding:24px 16px 56px;display:grid;gap:22px}}
.lbl{{font-family:var(--f-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
header h1{{margin:4px 0 6px;font-size:clamp(26px,3.4vw,38px);line-height:1.15;letter-spacing:-.01em}}
header h1 em{{font-style:normal;color:var(--crimson)}}
header p{{margin:0;max-width:78ch;color:var(--ink2)}}
.nav{{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}}
.btn{{display:inline-flex;align-items:center;padding:8px 13px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap}}
.btn.pri{{background:var(--crimson);border-color:var(--crimson);color:#fff}}
.kpi{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}}
.kpi div{{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}}
.kpi b{{display:block;font-family:var(--f-mono);font-size:26px;line-height:1.1}}
.kpi .ok b{{color:var(--ok)}} .kpi .rel b{{color:var(--gold)}}
h2{{margin:8px 0 0;font-size:22px}}
.route{{display:grid;gap:14px;counter-reset:s}}
.step{{display:grid;grid-template-columns:44px 220px minmax(0,1fr);gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px}}
.step .no{{width:36px;height:36px;border-radius:50%;background:var(--crimson);color:#fff;display:grid;place-items:center;font-family:var(--f-mono);font-weight:600}}
.step .vis img,.step .vis .ph{{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;display:block;background:#EADFD9}}
.step .vis .ph.cell{{background:radial-gradient(circle at 50% 55%,#F7B6C6 0 22%,#E64A72 23% 26%,#F9D9E1 27% 58%,#E8A0B2 59% 63%,#FBF1F3 64%)}}
.step .vis .ph.mito{{background:radial-gradient(ellipse 46% 30% at 50% 50%,#FFE3A6 0 30%,#B0531D 31% 80%,#E7A33A 81% 92%,#FBF3E8 93%)}}
.step .bd{{display:grid;gap:8px;align-content:start}}
.step .meta{{display:flex;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}}
.step .meta .dur{{font-family:var(--f-mono)}}
.step h3{{margin:0;font-size:19px;line-height:1.3}} .step h3 a{{color:inherit;text-decoration:none}} .step h3 a:hover{{color:var(--crimson)}}
.step p{{margin:0}} .step .steps{{font-size:13.5px;color:var(--ink2)}}
.ask{{border-left:3px solid var(--gold);background:var(--gold-soft);padding:7px 10px;border-radius:0 8px 8px 0;font-size:14.5px}}
.ask b{{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-right:8px}}
.ycd ul{{margin:4px 0 0;padding-left:18px;display:grid;gap:4px;font-size:14px}}
.ycd .mu,td .mu{{display:block;font-size:12px;color:var(--muted)}}
.ycd details summary{{cursor:pointer;font-size:13.5px;color:var(--crimson);font-weight:600;margin-top:6px}}
.gc{{font-size:13.5px;color:var(--ink2);margin-top:6px!important}}
.step .btn{{justify-self:start}}
table{{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:9px 12px;border-top:1px solid var(--line)}}
th{{font-family:var(--f-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:var(--paper)}}
td:first-child{{width:24%;color:var(--ink2);font-size:13px}} td:last-child{{width:20%}}
.st{{display:inline-block;font-weight:700;font-size:12px;padding:2px 9px;border-radius:999px}}
.st.ok{{background:var(--okbg);color:var(--ok)}} .st.rel{{background:var(--relbg);color:var(--gold)}} .st.no{{background:var(--nobg);color:var(--muted)}}
.filters{{display:flex;gap:8px;flex-wrap:wrap}}
.chip{{padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 13px var(--f-body);cursor:pointer}}
.chip[aria-pressed="true"]{{background:var(--ink);color:var(--panel);border-color:var(--ink)}}
footer{{font-size:13.5px;color:var(--ink2);border-top:1px solid var(--line);padding-top:14px;display:grid;gap:6px}}
{LG_CSS}
@media (max-width:820px){{.step{{grid-template-columns:1fr}} .step .no{{display:none}} td:first-child{{display:none}} td:last-child{{width:32%}}}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="lbl">Chủ đề · lớp 10 · chương trình GDPT 2018</div>
  <h1>Sinh học <em>tế bào</em> bằng mô hình 3D</h1>
  <p>Lộ trình 6 bài cho mạch Sinh học tế bào lớp 10, sắp theo thứ tự nội dung của chương trình môn Sinh học (Thông tư 32/2018/TT-BGDĐT). Mỗi bài ghi yêu cầu cần đạt mà bài dạy trực tiếp, trích nguyên văn chương trình. Bảng cuối trang liệt kê toàn bộ yêu cầu của mạch này và chỉ rõ yêu cầu nào chưa có bài. Thời lượng là gợi ý; giáo viên tự điều chỉnh.</p>
  <div class="nav"><a class="btn" href="{E(links['__L_LIB__'])}">← Thư viện 54 bài</a><a class="btn" href="{E(links['__L_CELL__'])}">Hành Trình Vào Tế Bào</a><a class="btn" href="{E(links['__L_MITO__'])}">Vào Ty Thể</a></div>
</header>
<section class="kpi" aria-label="Mức phủ yêu cầu cần đạt">
  <div class="ok"><span class="lbl">Có bài dạy trực tiếp</span><b>{n_ok}/{total}</b></div>
  <div class="rel"><span class="lbl">Chỉ có bài liên quan</span><b>{n_rel}/{total}</b></div>
  <div><span class="lbl">Chưa có bài</span><b>{n_no}/{total}</b></div>
  <div><span class="lbl">Bài trong lộ trình</span><b>{len(ROUTE)}</b></div>
</section>
<h2>Lộ trình</h2>
<section class="route">
{''.join(cards)}
</section>
<h2>Toàn bộ yêu cầu cần đạt của mạch Sinh học tế bào lớp 10</h2>
<div class="filters"><button class="chip" data-f="" aria-pressed="true">Tất cả ({total})</button><button class="chip" data-f="ok" aria-pressed="false">Có bài ({n_ok})</button><button class="chip" data-f="rel" aria-pressed="false">Liên quan ({n_rel})</button><button class="chip" data-f="no" aria-pressed="false">Chưa có ({n_no})</button></div>
<table><thead><tr><th>Mục</th><th>Yêu cầu cần đạt (nguyên văn)</th><th>Trạng thái</th></tr></thead><tbody id="tb">
{''.join(rows)}
</tbody></table>
<footer>
  <div><b>Nguồn.</b> <a href="{E(src['url'])}" target="_blank" rel="noopener">{E(src['ten'])}</a>. Mọi yêu cầu cần đạt trên trang được so khớp bằng máy với văn bản này. Đã soát Thông tư 13/2022/TT-BGDĐT và 17/2025/TT-BGDĐT: không sửa môn Sinh học. Kể cả hai chuyên đề học tập 10.1 và 10.2 thuộc mạch này.</div>
  <div><b>Trạng thái.</b> “Có bài” khi ít nhất một bài trong lộ trình dạy trực tiếp yêu cầu đó; “Liên quan” khi chỉ có bài hỗ trợ hoặc mở rộng. Đối chiếu do người soạn thực hiện, chưa qua giáo viên bộ môn duyệt; góp ý tại <a href="https://github.com/nclamvn/hanh-trinh-te-bao/issues" target="_blank" rel="noopener">GitHub Issues</a>.</div>
  <div>Bài 2, 3, 5, 6 là bản tiếng Việt của Tongjiang Lab, giấy phép CC BY-NC 4.0, chỉ dùng phi thương mại. Trong các bài này, “SGK gốc” là sách giáo khoa Trung Quốc mà bài được thiết kế theo.</div>
</footer>
</div>
<script>
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {{ const f = c.dataset.f; document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); document.querySelectorAll('#tb tr').forEach((r) => {{ r.hidden = !!f && !r.classList.contains(f); }}); }}));
</script>
</body>
</html>
'''


if __name__ == '__main__':
    repo = {'__L_CELL__': '../index.html', '__L_MITO__': '../ty-the.html', '__L_CHUDE__': '../chu-de-sinh-hoc-te-bao.html', '__L_GDPT__': 'gdpt2018.json'}
    open(ROOT / 'thu-vien/index.html', 'w', encoding='utf-8').write(library(repo))
    open(ROOT / 'chu-de-sinh-hoc-te-bao.html', 'w', encoding='utf-8').write(chu_de({'__L_CELL__': 'index.html', '__L_MITO__': 'ty-the.html', '__L_LIB__': 'thu-vien/'}, lambda f: 'thu-vien/' + f))
    print('đã dựng thu-vien/index.html và chu-de-sinh-hoc-te-bao.html')
    if len(sys.argv) > 5 and sys.argv[1] == '--artifact':
        out = pathlib.Path(sys.argv[2]); cell, mito, lib = sys.argv[3], sys.argv[4], sys.argv[5]
        art = {'__L_CELL__': cell, '__L_MITO__': mito, '__L_CHUDE__': 'chu-de-sinh-hoc-te-bao.html', '__L_GDPT__': 'https://github.com/nclamvn/hanh-trinh-te-bao/blob/main/thu-vien/gdpt2018.json'}
        open(out / 'index_art.html', 'w', encoding='utf-8').write(library(art))
        open(out / 'chu-de-sinh-hoc-te-bao.html', 'w', encoding='utf-8').write(chu_de({'__L_CELL__': cell, '__L_MITO__': mito, '__L_LIB__': lib}, lambda f: f))
        print('đã dựng bản cho trang đăng vào', out)
