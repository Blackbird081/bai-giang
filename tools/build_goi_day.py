#!/usr/bin/env python3
"""Gói dạy thử 45 phút: kịch bản, phiếu học tập in A4, đáp án, hướng dẫn giáo viên. Một nguồn cho mỗi bài.

Nguồn:  tools/goi-day/<id>.json
Đầu ra: giao-vien/<id>/index.html (trang in được), giao-vien/index.html (danh sách gói)
Cùng nguồn này đi vào màn hình giáo viên lúc lên lớp: tools/chuoi_bai.py nhúng phút dự kiến và việc của giáo viên
từng bước (BG_SEQ.plan), vỏ bài hiện ra cạnh ghi chú và đồng hồ. tests/smoke.py kiểm tên bước trong gói khớp với bài.

Trường có HTML tin cậy (do nhóm soạn): nhanh, loi. Mọi trường khác được thoát ký tự.
Chạy:  python3 tools/build_goi_day.py
"""
import html, json, pathlib
import liquid_glass as LG

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools/goi-day'
E = lambda s: html.escape(str(s), quote=True)
ORDER = ['te-bao', 'than-kinh', 'co-loa']
COVER = {'te-bao': 'te-bao', 'than-kinh': 'than-kinh', 'co-loa': 'co-loa'}
ACCENT = {'sinh': '#C2184A', 'su': '#B26A1A'}
VERSION = 'Bản thử 1 · 03/11/2026'
GHUB = 'https://github.com/nclamvn/bai-giang/issues'


def load():
    packs = {}
    for f in sorted(SRC.glob('*.json')):
        g = json.loads(f.read_text(encoding='utf-8'))
        check(g, f.name)
        packs[g['id']] = g
    return [packs[k] for k in ORDER if k in packs] + [g for k, g in packs.items() if k not in ORDER]


def check(g, name):
    """Lỗi nội dung làm dừng bản dựng: phút liền mạch 0 → 45, hoạt động trỏ đúng bước, mỗi bước có việc của giáo viên."""
    b = g['buoc']
    assert b and b[0]['tu'] == 0, f'{name}: bước đầu phải bắt đầu ở phút 0'
    for k in range(1, len(b)):
        assert b[k]['tu'] == b[k - 1]['den'], f'{name}: phút bước {k + 1} không nối tiếp bước {k}'
    assert b[-1]['den'] == g['phut'], f'{name}: bước cuối phải kết thúc ở phút {g["phut"]}'
    assert all(x['gv'].strip() and x['hs'].strip() for x in b), f'{name}: bước thiếu việc của giáo viên hoặc học sinh'
    for h in g['hoat_dong']:
        assert all(1 <= i <= len(b) for i in h['buoc']), f'{name}: hoạt động {h["ten"]} trỏ ra ngoài số bước'
    assert g['hoat_dong'][0]['tu'] == 0 and g['hoat_dong'][-1]['den'] == g['phut'], f'{name}: hoạt động phải phủ đủ tiết'
    need = []
    for p in g['phieu']:
        if p['loai'] == 'tu_danh_gia': continue
        if p['loai'] == 'hoi': need += [f"{p['so']}{c['k']}" for c in p['cau']]
        else: need.append(str(p['so']))
    have = {d['k'] for d in g['dap_an']}
    miss = [k for k in need if k not in have]
    assert not miss, f'{name}: phiếu có câu chưa có đáp án: {miss}'


LOGO = '<img src="../../design/logo/mark-96.webp" width="30" height="30" alt="" class="lg">'

CSS = r"""
*{box-sizing:border-box}
html{scroll-padding-top:76px}
body{margin:0;background:var(--bg-page);color:var(--bg-ink);font:500 16px/1.6 var(--bg-font);-webkit-font-smoothing:antialiased}
a{color:var(--acc)}
.bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;min-height:60px;padding:8px max(16px,calc((100vw - 1120px)/2));background:var(--bg-glass-strong);-webkit-backdrop-filter:blur(var(--bg-blur)) saturate(1.6);backdrop-filter:blur(var(--bg-blur)) saturate(1.6);border-bottom:1px solid var(--bg-hair)}
.bar .home{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--bg-ink);text-decoration:none;font-weight:600;min-height:44px;min-width:44px}
.bar .lg{border-radius:8px}
.bar .sep{width:1px;height:22px;background:var(--bg-hair2)}
.bar .crumb{color:var(--bg-ink2);font-size:15px;text-decoration:none;min-height:44px;display:flex;align-items:center}
.bar .sp{flex:1}
.btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:0;background:#fff;color:var(--bg-ink);font:600 15px var(--bg-font);text-decoration:none;cursor:pointer;box-shadow:0 0 0 1px var(--bg-hair2);white-space:nowrap}
.btn:hover{box-shadow:0 0 0 1px var(--bg-ink3)}
.btn.pri{background:var(--bg-brand);color:var(--bg-brand-ink);box-shadow:none}
.btn svg{width:18px;height:18px}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:40px;align-items:center;padding:44px 0 28px}
.eye{font:600 14px var(--bg-font);color:var(--acc)}
h1{margin:10px 0 12px;font:600 clamp(32px,4vw,48px)/1.12 var(--bg-serif);letter-spacing:-.02em}
.lead{margin:0;color:var(--bg-ink2);font-size:17px;max-width:56ch}
.badge{display:inline-flex;align-items:center;gap:8px;margin-top:16px;padding:6px 12px;border-radius:999px;background:color-mix(in srgb,var(--bg-warn,#B26A1A) 10%,#fff);color:#7a4a12;font-size:14px;font-weight:600}
.cover{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:16/10;box-shadow:var(--bg-sh-2)}
.cover img{width:100%;height:100%;object-fit:cover;display:block}
.cover a{position:absolute;left:14px;bottom:14px}
.tabs{position:sticky;top:60px;z-index:9;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:8px 0;margin:0 0 8px;background:linear-gradient(var(--bg-page) 70%,transparent)}
.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;display:flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;color:var(--bg-ink2);font-weight:600;font-size:15px;text-decoration:none}
.tabs a:hover{background:var(--bg-hair)}
section{padding:28px 0 12px}
h2{margin:0 0 6px;font:600 28px/1.25 var(--bg-serif);letter-spacing:-.01em}
.sub{margin:0 0 20px;color:var(--bg-ink2)}
.card{background:var(--bg-surface,#fff);border-radius:20px;padding:20px 22px;box-shadow:var(--bg-sh-1)}
.g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
h3{margin:0 0 10px;font:700 17px/1.35 var(--bg-font)}
ul.tick,ol.steps{margin:0;padding:0;list-style:none}
ul.tick li{position:relative;padding:4px 0 4px 26px}
ul.tick li::before{content:"";position:absolute;left:4px;top:13px;width:9px;height:5px;border:solid var(--acc);border-width:0 0 2px 2px;transform:rotate(-45deg)}
ol.steps{counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:6px 0 10px 42px}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:4px;width:28px;height:28px;border-radius:50%;background:var(--acc);color:#fff;font:700 14px/28px var(--bg-font);text-align:center}
kbd{font:600 13px var(--bg-mono);padding:1px 6px;border-radius:6px;background:var(--bg-hair);border:1px solid var(--bg-hair2)}
code{font:500 14px var(--bg-mono)}
.mini{font-size:14px;color:var(--bg-ink2)}
table.fix{width:100%;border-collapse:collapse;font-size:15px}
table.fix th,table.fix td{text-align:left;vertical-align:top;padding:10px 12px;border-top:1px solid var(--bg-hair)}
table.fix th{width:30%;font-weight:600}
.tl{display:flex;height:56px;border-radius:14px;overflow:hidden;margin:0 0 22px;box-shadow:inset 0 0 0 1px var(--bg-hair)}
.tl a{display:flex;flex-direction:column;justify-content:center;padding:0 12px;min-width:0;color:var(--bg-ink);text-decoration:none;border-right:2px solid var(--bg-page)}
.tl a:last-child{border:0}
.tl b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl span{font-size:13px;color:var(--bg-ink2);font-variant-numeric:tabular-nums}
.act{margin:0 0 18px}
.act>header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:0 0 10px}
.act>header h3{margin:0;font-size:19px}
.act>header .min{font:600 14px var(--bg-mono);color:var(--acc)}
.act>header p{flex-basis:100%;margin:0;color:var(--bg-ink2)}
.row{display:grid;grid-template-columns:96px minmax(0,1.1fr) minmax(0,1.6fr) minmax(0,1fr);gap:14px;padding:14px 0;border-top:1px solid var(--bg-hair)}
.row:first-of-type{border-top:0}
.row .m{font:600 15px var(--bg-mono);font-variant-numeric:tabular-nums;color:var(--bg-ink)}
.row .m span{display:block;font:500 13px var(--bg-font);color:var(--bg-ink3)}
.row .t{font-weight:700}
.row .t small{display:block;font-weight:500;color:var(--bg-ink3);font-size:13px}
.row .k{display:none;font-size:13px;font-weight:600;color:var(--bg-ink3)}
.row .hs{color:var(--bg-ink2)}
.thead{display:grid;grid-template-columns:96px minmax(0,1.1fr) minmax(0,1.6fr) minmax(0,1fr);gap:14px;padding:0 0 8px;font-size:13px;font-weight:600;color:var(--bg-ink3)}
.prod{margin-top:6px;font-size:14px;color:var(--bg-ink2)}
.sheet-wrap{display:flex;justify-content:center;padding:8px 0 4px}
.sheet-zoom{width:210mm;zoom:var(--z,1)}
.paper{width:210mm;min-height:297mm;padding:11mm 13mm 10mm;background:#fff;color:#111;box-shadow:0 1px 2px rgba(0,0,0,.08),0 18px 48px -20px rgba(15,23,42,.35);font:500 10pt/1.42 var(--bg-font)}
.paper header{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;padding-bottom:3mm;border-bottom:.4mm solid #111}
.paper .pk{font:600 9pt var(--bg-font);color:#555}
.paper h4{margin:1mm 0 0;font:700 14pt/1.2 var(--bg-font)}
.paper .who{flex:none;display:grid;grid-template-columns:auto 1fr;gap:2.5mm 3mm;width:66mm;font-size:9.5pt;color:#333}
.paper .who i{display:block;border-bottom:.25mm solid #999;height:5mm}
.paper .lg2{display:flex;align-items:center;gap:2mm;font:600 9pt var(--bg-font);color:#333}
.paper .lg2 img{width:7mm;height:7mm;border-radius:1.5mm}
.part{margin-top:3.4mm}
.part .ph{display:flex;align-items:baseline;gap:2.5mm;margin-bottom:1.6mm}
.part .ph b{display:inline-flex;align-items:center;justify-content:center;width:5.6mm;height:5.6mm;border-radius:50%;background:#111;color:#fff;font:700 9pt var(--bg-font)}
.part .ph strong{font-size:11pt}
.part .ph em{font-style:normal;color:#666;font-size:9pt}
.part p{margin:0 0 1.6mm}
.chain{display:flex;align-items:center;gap:1.6mm}
.chain span{flex:1;height:11mm;border:.3mm solid #444;border-radius:2mm;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:9.5pt;text-align:center;padding:0 1mm}
.chain span.f{background:#f2f2f2}
.chain i{font-style:normal;color:#666}
.paper table{width:100%;border-collapse:collapse;font-size:9.5pt}
.paper th{text-align:left;font-weight:700;background:#f2f2f2}
.paper th,.paper td{border:.3mm solid #555;padding:1.4mm 2mm}
.paper td{height:9.4mm}
.paper td:first-child,.paper th:first-child{width:13mm;text-align:center}
.paper table.free td,.paper table.free th{width:auto!important;text-align:left!important}
.paper table.free td{height:auto;padding:1.8mm 2mm;font-size:9pt}
.paper table.free td{height:8.6mm}
.draw{position:relative;border:.3mm solid #999;border-radius:2mm;overflow:hidden}.draw svg{display:block;width:100%;height:100%}
.lbl{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 5mm;margin-top:2mm}.lbl span{display:flex;align-items:flex-end;gap:1.5mm}.lbl i{flex:1;border-bottom:.25mm dotted #777;height:5.5mm}
.paper td:nth-child(2),.paper th:nth-child(2){width:46mm}
.q{margin-bottom:1.6mm}
.q .qq{display:flex;gap:1.6mm}
.q .qq b{flex:none}
.ln{height:6.9mm;border-bottom:.25mm dotted #777}
.ck{display:flex;align-items:center;gap:2.4mm;margin:1.2mm 0}
.ck i{flex:none;width:4mm;height:4mm;border:.3mm solid #444;border-radius:.8mm}
.paper footer{margin-top:3mm;padding-top:1.6mm;border-top:.25mm solid #bbb;display:flex;justify-content:space-between;font-size:8pt;color:#777}
dl.ans{margin:0;display:grid;grid-template-columns:110px minmax(0,1fr);gap:0}
dl.ans dt,dl.ans dd{margin:0;padding:12px 0;border-top:1px solid var(--bg-hair)}
dl.ans dt{font-weight:700;color:var(--acc)}
.src{margin:0;padding-left:20px;color:var(--bg-ink2);font-size:15px}
.src li{margin:4px 0}
.yccd li{margin:4px 0}
.foot{margin:36px 0 0;padding:20px 0 40px;border-top:1px solid var(--bg-hair);color:var(--bg-ink3);font-size:14px;display:flex;flex-wrap:wrap;gap:6px 20px;justify-content:space-between}
@media (max-width:900px){.hero{grid-template-columns:1fr;gap:22px;padding:28px 0 16px}.g2{grid-template-columns:1fr}
  .thead{display:none}.row{grid-template-columns:72px minmax(0,1fr);gap:4px 12px}.row .m{grid-row:span 3}.row .k{display:block;margin-top:6px}}
@media (max-width:560px){.bar .crumb,.bar .sep,.bar .opt{display:none}.bar .home span{display:none}.btn{padding:0 14px}
  h2{font-size:24px}.tl{height:auto;flex-direction:column}.tl a{flex:none!important;padding:8px 12px;border-right:0;border-bottom:2px solid var(--bg-page)}
  dl.ans{grid-template-columns:1fr}dl.ans dd{border-top:0;padding-top:0}.card{padding:16px}
  table.fix,table.fix tbody,table.fix tr,table.fix th,table.fix td{display:block;width:auto}table.fix th{padding:12px 0 2px}table.fix td{border-top:0;padding:0 0 12px}}
@page{size:A4;margin:12mm 13mm}
@media print{
  body{background:#fff;font-size:10pt;line-height:1.5}
  h2{font-size:17pt;break-after:avoid}h3{break-after:avoid}.sub{margin-bottom:3mm}
  .g2{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:4mm}
  .act.card{break-inside:auto}.act>header{break-after:avoid}
  .row .m{grid-row:auto}.row .k{display:none!important}.thead{display:grid!important}
  table.fix th,table.fix td{padding:2mm 3mm}
  .bar,.tabs,.cover,.noprint,.foot .noprint{display:none!important}
  .wrap{max-width:none;padding:0}
  .hero{display:block;padding:0 0 4mm}
  h1{font-size:22pt;margin:2mm 0}
  section{padding:4mm 0 0;break-inside:auto}
  .card{box-shadow:none;border:.3mm solid #ccc;padding:4mm 5mm}
  .g2>.card{break-inside:avoid}dl.ans dt,dl.ans dd{break-inside:avoid}
  .row{break-inside:avoid;grid-template-columns:18mm 34mm minmax(0,1.7fr) minmax(0,1fr);gap:3mm;padding:2.6mm 0}
  .thead{grid-template-columns:18mm 34mm minmax(0,1.7fr) minmax(0,1fr);gap:3mm}
  #kich-ban{break-before:page}
  #phieu{display:none}
  .tl a{border-right-color:#fff}
  body.in-phieu > *:not(main){display:none!important}
  body.in-phieu main > *:not(#phieu){display:none!important}
  body.in-phieu #phieu{display:block;padding:0}
  body.in-phieu #phieu > :not(.sheet-wrap){display:none}
  body.in-phieu .sheet-wrap{padding:0;display:block}
  body.in-phieu .sheet-zoom{zoom:1!important;width:auto}
  body.in-phieu .paper{width:auto;min-height:0;padding:0;box-shadow:none}
}
"""

ICON = {
    'play': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    'print': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/></svg>',
}


def mins(a, b): return f'{a}–{b}′'


def phieu_html(g):
    parts = []
    for p in g['phieu']:
        head = f'<div class="ph"><b>{p["so"]}</b><strong>{E(p["tieu_de"])}</strong><em>{E(p["khi"])}</em></div>'
        if p['loai'] == 'chuoi':
            cells = '<i>→</i>'.join(f'<span class="{"f" if o else ""}">{E(o)}</span>' for o in p['o'])
            body = f'<p>{E(p["hoi"])}</p><div class="chain">{cells}</div>'
        elif p['loai'] == 'bang':
            cg = ('<colgroup>' + ''.join(f'<col style="width:{w}mm">' if w else '<col>' for w in p['w']) + '</colgroup>') if p.get('w') else ''
            body = (f'<table class="{"free" if cg else ""}">{cg}<tr>' + ''.join(f'<th>{E(c)}</th>' for c in p['cot']) + '</tr>'
                    + ''.join('<tr>' + f'<td>{E(d)}</td>' + '<td></td>' * (len(p['cot']) - 1) + '</tr>' for d in p['dong']) + '</table>')
            if p.get('hoi'): body = f'<p>{E(p["hoi"])}</p>' + body
        elif p['loai'] == 'hoi':
            body = ''.join(f'<div class="q"><div class="qq">{f"<b>{E(c["k"])}.</b>" if c["k"] else ""}<span>{E(c["q"])}</span></div>' + '<div class="ln"></div>' * c['dong'] + '</div>' for c in p['cau'])
        elif p['loai'] == 've':
            body = f'<p>{E(p["hoi"])}</p><div class="draw" style="height:{p.get("cao", 40)}mm">{p.get("svg", "")}</div>'
            if p.get('nhan'): body += f'<div class="lbl" style="grid-template-columns:repeat({min(len(p["nhan"]), 6)},1fr)">' + ''.join(f'<span><b>{E(n)}.</b><i></i></span>' for n in p['nhan']) + '</div>'
        else:  # tu_danh_gia
            body = ''.join(f'<div class="ck"><i></i><span>{E(d)}</span></div>' for d in p['dong'])
        parts.append(f'<div class="part">{head}{body}</div>')
    return f'''<div class="paper" lang="vi">
  <header><div><div class="lg2"><img src="../../design/logo/mark-96.webp" alt="">Sáng Ăn Khoai · {E(g["mon"])} {E(g["lop"])} · Phiếu học tập</div><h4>{E(g["ten_tiet"])}</h4></div>
    <div class="who"><span>Họ tên</span><i></i><span>Lớp, nhóm</span><i></i></div></header>
  {''.join(parts)}
  <footer><span>Dùng cùng bài 3D “{E(g["ten_bai"])}”</span><span>nclamvn.github.io/bai-giang</span></footer>
</div>'''


def page(g):
    acc = ACCENT.get(g['s'], '#1D1B16')
    nb = len(g['buoc'])
    tl = ''.join(f'<a href="#hd-{k}" style="flex:{h["den"] - h["tu"]};background:color-mix(in srgb,{acc} {14 + k * 7}%,#fff)"><b>{E(h["ten"])}</b><span>{mins(h["tu"], h["den"])}</span></a>' for k, h in enumerate(g['hoat_dong']))
    acts = []
    for k, h in enumerate(g['hoat_dong']):
        rows = []
        for i in h['buoc']:
            x = g['buoc'][i - 1]
            # bước cuối có thể nằm trong hai hoạt động (luyện tập trên màn chiếu, vận dụng trên phiếu): chỉ in một lần
            if any(i in hh['buoc'] for hh in g['hoat_dong'][:k]): continue
            rows.append(f'<div class="row"><div class="m">{mins(x["tu"], x["den"])}<span>{x["den"] - x["tu"]} phút</span></div>'
                        f'<div class="t"><small>Bước {i}/{nb}</small>{E(x["t"])}</div>'
                        f'<div class="gv"><span class="k">Giáo viên</span>{E(x["gv"])}</div><div class="hs"><span class="k">Học sinh</span>{E(x["hs"])}</div></div>')
        body = ('<div class="thead"><span>Phút</span><span>Trên màn chiếu</span><span>Giáo viên</span><span>Học sinh</span></div>' + ''.join(rows)) if rows else '<p class="mini">Tiếp nối bước trên, không cần chuyển màn chiếu.</p>'
        acts.append(f'<div class="act card" id="hd-{k}"><header><h3>{k + 1}. {E(h["ten"])}</h3><span class="min">{mins(h["tu"], h["den"])}</span><p>{E(h["muc"])}</p></header>{body}<div class="prod"><b>Sản phẩm:</b> {E(h["san_pham"])}</div></div>')
    ans = ''.join(f'<dt>{E(d["k"])}</dt><dd>{E(d["a"])}</dd>' for d in g['dap_an'])
    loi = ''.join(f'<tr><th>{E(a)}</th><td>{b}</td></tr>' for a, b in g['loi'])
    title = f'{g["ten_tiet"]} · Gói dạy {g["mon"]} {g["lop"]} · Sáng Ăn Khoai'
    return f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(f'Gói dạy thử 45 phút cho bài 3D {g["ten_bai"]} ({g["mon"]} {g["lop"]}): kịch bản theo phút, phiếu học tập in A4, đáp án, hướng dẫn giáo viên.')}">
<link rel="icon" type="image/png" sizes="32x32" href="../../design/logo/favicon-32.png"><link rel="apple-touch-icon" href="../../design/logo/apple-touch-icon.png">
<link rel="stylesheet" href="../../design/house.css">
<style>:root{{--acc:{acc}}}{CSS}</style>
</head>
<body>
<div class="bar">
  <a class="home" href="../../">{LOGO}<span>Sáng Ăn Khoai</span></a><span class="sep"></span><a class="crumb" href="../">Gói dạy thử</a>
  <span class="sp"></span>
  <button class="btn opt" type="button" data-print="gv">{ICON['print']}In kịch bản</button>
  <button class="btn" type="button" data-print="phieu">{ICON['print']}In phiếu</button>
  <a class="btn pri" href="../../{E(g['bai'])}">{ICON['play']}Mở bài 3D</a>
</div>
<main class="wrap">
  <div class="hero">
    <div>
      <div class="eye">{E(g['mon'])} {E(g['lop'])} · {g['phut']} phút · Gói dạy thử</div>
      <h1>{E(g['ten_tiet'])}</h1>
      <p class="lead">Kịch bản theo phút, phiếu học tập một trang A4 và đáp án cho bài 3D <a href="../../{E(g['bai'])}">{E(g['ten_bai'])}</a>. Đọc 10 phút là dạy được. Phút dự kiến và việc của giáo viên từng bước cũng hiện trên màn hình giáo viên khi lên lớp.</p>
      <div class="badge">Bản thử, chờ giáo viên bộ môn duyệt</div>
    </div>
    <div class="cover"><img src="../../thu-vien/covers/{COVER.get(g['id'], g['id'])}.webp" alt="Cảnh 3D của bài {E(g['ten_bai'])}"><a class="btn pri" href="../../{E(g['bai'])}">{ICON['play']}Mở bài 3D</a></div>
  </div>
  <nav class="tabs" aria-label="Các phần của gói dạy"><a href="#bat-dau">Bắt đầu nhanh</a><a href="#kich-ban">Kịch bản {g['phut']} phút</a><a href="#phieu">Phiếu học tập</a><a href="#dap-an">Đáp án</a><a href="#nguon">Yêu cầu cần đạt, nguồn</a></nav>

  <section id="bat-dau" aria-labelledby="h-bd">
    <h2 id="h-bd">Bắt đầu trong 10 phút</h2>
    <p class="sub">Những gì cần biết trước khi vào lớp. Trang này in ra được (nút In kịch bản).</p>
    <div class="g2">
      <div class="card"><h3>Học sinh làm được</h3><ul class="tick">{''.join(f'<li>{E(x)}</li>' for x in g['hs_lam_duoc'])}</ul>
        <h3 style="margin-top:18px">Chuẩn bị</h3><ul class="tick">{''.join(f'<li>{E(x)}</li>' for x in g['chuan_bi']['gv'])}{''.join(f'<li>Học sinh: {E(x)}</li>' for x in g['chuan_bi']['hs'])}</ul></div>
      <div class="card"><h3>Năm bước lên lớp</h3><ol class="steps">{''.join(f'<li>{x}</li>' for x in g['nhanh'])}</ol></div>
    </div>
    <div class="card" style="margin-top:20px"><h3>Khi gặp sự cố</h3><table class="fix">{loi}</table></div>
  </section>

  <section id="kich-ban" aria-labelledby="h-kb">
    <h2 id="h-kb">Kịch bản {g['phut']} phút</h2>
    <p class="sub">Bốn hoạt động theo mạch dự đoán, quan sát trên cảnh 3D, giải thích. Mỗi dòng là một bước trên màn chiếu; phút là gợi ý, giáo viên chủ động co giãn.</p>
    <div class="tl" role="list" aria-label="Phân bổ thời gian">{tl}</div>
    {''.join(acts)}
  </section>

  <section id="phieu" aria-labelledby="h-ph">
    <h2 id="h-ph">Phiếu học tập</h2>
    <p class="sub">Một trang A4, in đen trắng được. Mỗi học sinh một tờ hoặc mỗi cặp một tờ. <button class="btn noprint" type="button" data-print="phieu" style="margin-left:6px;vertical-align:middle">{ICON['print']}In phiếu</button></p>
    <div class="sheet-wrap"><div class="sheet-zoom">{phieu_html(g)}</div></div>
  </section>

  <section id="dap-an" aria-labelledby="h-da">
    <h2 id="h-da">Đáp án và gợi ý chấm</h2>
    <p class="sub">Theo số mục trên phiếu. Câu hỏi trên màn chiếu có đáp án ngay trong màn hình giáo viên.</p>
    <div class="card"><dl class="ans">{ans}</dl></div>
  </section>

  <section id="nguon" aria-labelledby="h-ng">
    <h2 id="h-ng">Yêu cầu cần đạt và nguồn</h2>
    <div class="g2">
      <div class="card"><h3>Yêu cầu cần đạt</h3><p class="mini">{E(g['muc_chuong_trinh'])}. Trích nguyên văn Chương trình GDPT 2018.</p><ul class="yccd">{''.join(f'<li>{E(x)}</li>' for x in g['yccd'])}</ul></div>
      <div class="card"><h3>Nguồn</h3><ul class="src">{''.join(f'<li>{E(x)}</li>' for x in g['nguon'])}</ul><p class="mini" style="margin-top:12px">Nội dung viết mới, không chép sách giáo khoa; dùng chung được cho cả ba bộ sách vì bám theo chương trình.</p></div>
    </div>
  </section>
  <div class="foot"><span>{VERSION} · chưa qua giáo viên bộ môn duyệt</span><span class="noprint">Góp ý sau khi dạy thử: <a href="{GHUB}" target="_blank" rel="noopener">GitHub</a> · © 2026 Sáng Ăn Khoai</span></div>
</main>
<script>
(function(){{
  var z=document.querySelector('.sheet-zoom'),w=document.querySelector('.sheet-wrap');
  function fit(){{var mm=210*96/25.4;z.style.setProperty('--z',Math.min(1,(w.clientWidth)/mm).toFixed(3))}}
  fit();addEventListener('resize',fit);
  document.querySelectorAll('[data-print]').forEach(function(b){{b.addEventListener('click',function(){{
    document.body.classList.toggle('in-phieu',b.dataset.print==='phieu');window.print();}})}});
  addEventListener('afterprint',function(){{document.body.classList.remove('in-phieu')}});
}})();
</script>
</body>
</html>
'''


def index(packs):
    cards = ''.join(f'''<a class="pk" href="{E(g['id'])}/"><img src="../thu-vien/covers/{COVER.get(g['id'], g['id'])}.webp" alt="" loading="lazy"><div><span class="eye">{E(g['mon'])} {E(g['lop'])} · {g['phut']} phút · {len(g['buoc'])} bước</span><b>{E(g['ten_tiet'])}</b><span class="d">Bài 3D: {E(g['ten_bai'])}</span></div></a>''' for g in packs)
    return f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gói dạy thử · Sáng Ăn Khoai</title>
<meta name="description" content="Gói dạy thử 45 phút cho các bài 3D của Sáng Ăn Khoai: kịch bản theo phút, phiếu học tập in A4, đáp án, hướng dẫn giáo viên.">
<link rel="icon" type="image/png" sizes="32x32" href="../design/logo/favicon-32.png"><link rel="apple-touch-icon" href="../design/logo/apple-touch-icon.png">
<link rel="stylesheet" href="../design/house.css">
<style>{CSS.replace('../../', '../')}
.list{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:8px 0 0}}
.pk{{display:block;background:#fff;border-radius:var(--bg-r-md);overflow:hidden;box-shadow:var(--bg-sh-1);color:var(--bg-ink);text-decoration:none;transition:transform .3s var(--bg-ease),box-shadow .3s var(--bg-ease)}}
.pk:hover{{transform:translateY(-2px);box-shadow:var(--bg-sh-2)}}
.pk img{{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}}
.pk div{{padding:14px 18px 18px;display:grid;gap:4px}}
.pk .eye{{font-size:13px}}.pk b{{font-size:18px;line-height:1.35}}.pk .d{{color:var(--bg-ink2);font-size:15px}}
@media (max-width:900px){{.list{{grid-template-columns:1fr}}}}
.tools{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:36px}}
.tools a{{display:grid;gap:4px;padding:18px 20px;border-radius:var(--bg-r-md);background:#fff;box-shadow:var(--bg-sh-1);color:var(--bg-ink);text-decoration:none;transition:box-shadow .3s var(--bg-ease)}}
.tools a:hover{{box-shadow:var(--bg-sh-2)}}.tools b{{font-size:17px}}.tools span{{color:var(--bg-ink2);font-size:15px}}
@media (max-width:900px){{.tools{{grid-template-columns:1fr}}}}
{LG.SITE_BAR_CSS}
</style>
</head>
<body class="bg-hub">
{LG.site_bar('../', [('Cho giáo viên', '../#cho-giao-vien'), ('Gói dạy thử', None)])}
<main class="wrap">
  <div style="padding:48px 0 24px"><span class="bg-eyebrow">Cho giáo viên</span><h1 style="margin:8px 0 12px">Gói dạy thử 45 phút</h1>
  <p class="lead">Mỗi gói gồm kịch bản theo phút, phiếu học tập một trang A4, đáp án và cách xử lý sự cố. Phút dự kiến và việc của giáo viên hiện cả trên màn hình giáo viên khi lên lớp. Đây là bản thử để dạy thử ở trường, đang chờ giáo viên bộ môn duyệt.</p></div>
  <div class="list">{cards}</div>
  <h2 class="bg-h2" style="margin:56px 0 0">Công cụ khi lên lớp</h2>
  <div class="tools" style="margin-top:14px">
    <a href="../kiem-may/"><b>Kiểm máy trước giờ dạy</b><span>Chạy thử mọi bài trên máy của lớp, xem bài nào chạy mượt.</span></a>
    <a href="../dieu-khien/"><b>Điện thoại làm điều khiển</b><span>Nhập mã trên màn chiếu để chuyển bước, xem ghi chú và đáp án.</span></a>
    <a href="../#cho-giao-vien"><b>Lên lớp trong mọi bài</b><span>Bấm Lên lớp trên thanh đầu bài, dùng bút trình chiếu hoặc phím mũi tên.</span></a>
  </div>
  <div class="foot"><span>{VERSION}</span><span>Góp ý sau khi dạy thử: <a href="{GHUB}" target="_blank" rel="noopener">GitHub</a> · © 2026 Sáng Ăn Khoai</span></div>
</main>
</body>
</html>
'''


def main():
    packs = load()
    for g in packs:
        out = ROOT / 'giao-vien' / g['id'] / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(g), encoding='utf-8')
    (ROOT / 'giao-vien/index.html').write_text(index(packs), encoding='utf-8')
    print(f'đã dựng {len(packs)} gói dạy: ' + ', '.join(g['id'] for g in packs))


if __name__ == '__main__':
    main()
