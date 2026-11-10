#!/usr/bin/env python3
"""Dựng trang chính Sáng Ăn Khoai và trang chủ đề từ một nguồn dữ liệu duy nhất.

Nguồn: thu-vien/catalog.vi.json (54 bài), thu-vien/gdpt2018.json (đối chiếu chương trình), tools/bai-giang.template.html.
Cấu trúc trang (GitHub Pages):
  index.html                           trang chính Sáng Ăn Khoai: hành trình 3D, lộ trình, thư viện 54 bài
  te-bao/  ty-the/                     hai hành trình 3D (dựng riêng)
  lich-su-10/  lich-su-10/co-loa/      lộ trình Lịch sử 10 (tools/build_ls10.py), bài Thành Cổ Loa (tools/build_co_loa.py)
  robotics/  robotics/<robot>/          mục lục Robotics (tools/robotics/build_hub.py); 6 mô phỏng chạy trực tiếp (tools/robotics, node build.mjs): 4 robot, Động cơ 4 kì, Robot cá mập
  chu-de/sinh-hoc-te-bao/              lộ trình Sinh học tế bào lớp 10
  thu-vien/<bài>.html                  54 bài; thu-vien/index.html chuyển về mục Thư viện của trang chính
  ty-the.html, ar.html, chu-de-sinh-hoc-te-bao.html   trang chuyển hướng từ địa chỉ cũ
Nếu truyền --artifact <thư mục> <url tế bào> <url ty thể> <url trang chính> <url Cổ Loa>: bản cho trang đăng trên Claude,
nơi trang chính, 54 bài và trang chủ đề nằm cùng một thư mục.
Chạy từ thư mục gốc repo:  python3 tools/build_pages.py [--artifact out_dir cell_url mito_url hub_url]
"""
import json, re, sys, html, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import liquid_glass as LG

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / 'thu-vien/catalog.vi.json').read_text(encoding='utf-8'))
GD = json.loads((ROOT / 'thu-vien/gdpt2018.json').read_text(encoding='utf-8'))
TPL = (ROOT / 'tools/bai-giang.template.html').read_text(encoding='utf-8')
E = lambda s: html.escape(str(s), quote=True)


def sources_html():
    out = []
    for mon, arr in GD['nguon'].items():
        main = [a for a in arr if 'Thông tư 13' not in a['ten'] and 'Thông tư 17' not in a['ten']][:2]
        out.append(' '.join(f'<a href="{E(a["url"])}" target="_blank" rel="noopener" title="{E(a["ten"])}">{E(mon) if k == 0 else k + 1}</a>' for k, a in enumerate(main)))
    return 'Văn bản chương trình: ' + ' · '.join(out) + '.'


# các bài 3D riêng trong mục lục của trang chính, theo thứ tự hiện; bài mang bìa HERO đứng làm hình lớn ở màn đầu.
# Xe tự hành, robot sáu chân và drone Crazyflie vẫn có ở mục Robotics.
FEATURED = [
    ('__L_CELL__', 'te-bao', 'sinh', 'Sinh học', 'Lớp 10', 'Hành Trình Vào Tế Bào', 'Tế bào nhân thực đang hoạt động; phóng liền mạch xuống 222.336 nguyên tử của ribosome thật.'),
    ('__L_BODY__', 'co-the-nguoi', 'sinh', 'Khoa học tự nhiên', 'Lớp 8', 'Cơ thể người 3D', '2.900 cấu trúc giải phẫu thật, 140 chuyển động sinh lí, 6 chủ đề hiển vi: tim đập, phổi thở, thận lọc máu.'),
    ('__L_GILL__', 'mang', 'sinh', 'Sinh học', 'Lớp 11', 'Cá thở bằng mang', 'Bơm miệng–nắp mang khi bơi chậm, ép dòng khi bơi nhanh; cá ngừ không được dừng; máu chảy ngược chiều nước lấy ≈ 75 % ô xi.'),
    ('__L_NEURON__', 'than-kinh', 'sinh', 'Sinh học', 'Lớp 11', 'Neuron và xung thần kinh', 'Xung nhảy cóc qua eo Ranvier, điện thế màng theo từng pha, synapse giải phóng chất dẫn truyền; phong cách điện ảnh.'),
    ('__L_ENGINE__', 'dong-co', 'cong', 'Công nghệ', 'Lớp 11', 'Động cơ xăng 4 kì', 'Cắt dọc động cơ theo thông số Honda Wave Alpha 110: bốn kì, xupap, trục cam, đồ thị p–V; thử tăng tỉ số nén, tắt bugi.'),
    ('__L_MITO__', 'ty-the', 'sinh', 'Sinh học', 'Lớp 10', 'Vào Ty Thể', 'Dòng H⁺ làm vòng c quay, ba vị trí β lần lượt tạo ATP, dựng từ 37.733 nguyên tử thật.'),
    ('__L_COLOA__', 'co-loa', 'su', 'Lịch sử', 'Lớp 10', 'Thành Cổ Loa', 'Ba vòng thành đất theo số đo khảo cổ, dòng thời gian từ thế kỷ IV TCN đến nay.'),
    ('__L_R_UR5E__', 'robo-ur5e', 'robo', 'Robotics', 'Đại học', 'Cánh tay robot 6 trục', 'UR5e đúng bảng DH của hãng: động học nghịch 8 nghiệm, Jacobian, điểm kỳ dị.'),
    ('__L_MAKO__', 'mako', 'ly', 'Vật lí', 'Lớp 10', 'Robot cá mập mako', 'Bơi theo số đo cá mập thật: một đầu vào là tốc độ; tần số vẫy đuôi, sóng thân, số Strouhal, lực cản tăng theo v².'),
    ('__L_DOG__', 'robo-quadruped', 'robo', 'Robotics', 'Đại học', 'Chó robot bốn chân', 'Theo số đo MIT Mini Cheetah: đi bước, đi kiệu, bật nhảy; lực đỡ từng chân, 12 mô men khớp, tách rời và lắp ráp.'),
    ('__L_JELLY__', 'robo-jellyfish', 'robo', 'Robotics', 'Đại học', 'Sứa robot', 'Theo Cyro của Virginia Tech: chuông co đẩy nước, phản lực và động lượng, rhopalia giữ thăng bằng, tế bào gai 700 ns.'),
    ('__L_PAGODA__', 'thap-5-tang', 'ly', 'Vật lí', 'Lớp 11', 'Tháp năm tầng Hōryū-ji', 'Dựng 52 thao tác theo tám giai đoạn, mặt cắt qua cột tâm; rung nền để thấy dao động riêng 1,1 s và cộng hưởng.'),
    ('__L_CAMERA__', 'may-anh', 'ly', 'Khoa học tự nhiên', 'Lớp 9', 'Máy ảnh cắt lớp', 'Ống kính Canon 50 mm: ba tia tạo ảnh thật, ngược trên cảm biến; lấy nét là dời thấu kính; khẩu bảy lá; kiểm lại góc nhìn 40° của hãng.'),
    ('__L_PIRANHA__', 'piranha', 'ly', 'Vật lí', 'Lớp 10', 'Cá piranha', 'Cú cắn 320 N mạnh nhất từng đo ở cá: hàm dưới là đòn bẩy, F_cắn·d = F_cơ·L_in; răng trong cắn mạnh gấp ba răng ngoài.'),
    ('__L_SPIDER__', 'nhen', 'ly', 'Vật lí', 'Lớp 10', 'Nhện chân thuỷ lực', 'Chân duỗi bằng áp suất như tarantula thật: một bơm, tám chân, cùng một áp suất (Pascal); τ = P·A·r, dáng chạy theo nhiệt độ.'),
    ('__L_WATCH__', 'dong-ho', 'ly', 'Vật lí', 'Lớp 11', 'Đồng hồ cơ', 'ETA 6497-1 theo tài liệu hãng: bánh lắc dao động điều hoà 2,5 Hz, bộ thoát 15 răng, tỉ số truyền bắt buộc; tháo từng bộ phận.'),
    ('__L_LIGHT__', 'hai-dang', 'ly', 'Vật lí', 'Lớp 10', 'Hải đăng khung sắt', 'Sanibel 1884: lắp dựng khung giằng chéo, chớp đèn Fl(2) W 10s, tầm nhìn theo độ cong Trái Đất, gió và mô men lật.'),
]


CSS = (ROOT / 'tools/trang-chinh.css').read_text(encoding='utf-8')
LIB_TPL = (ROOT / 'tools/thu-vien.template.html').read_text(encoding='utf-8')
N_SHOWN = 8  # số bài hiện sẵn trong mục lục; các bài sau mở bằng nút "Xem cả … bài"
HERO = 'than-kinh'  # bìa của bài đứng làm hình lớn duy nhất ở màn đầu
HERO_ALT = 'Neuron phát sáng với bao myelin chia đốt và chuỳ synapse trên nền tối'
HOME_CSS = (ROOT / 'tools/trang-chu.css').read_text(encoding='utf-8')
N_LABS = 16  # số thí nghiệm hiện sẵn trên trang chính khi chưa chọn môn


def hero():
    """Hình lớn duy nhất của trang chủ: một bài, ảnh tràn khung, chú thích một dòng bên dưới."""
    href, cov, _, mon, lv, title, desc = next(f for f in FEATURED if f[1] == HERO)
    return f'''<a class="feat" href="{href}" aria-label="{E(title)}, vào bài"><div class="im"><img src="__L_BASE__covers/{cov}.webp" alt="{E(HERO_ALT)}" fetchpriority="high"></div>
    <div class="fc"><b>{E(title)}</b><span class="d">{E(desc)}</span><span class="k">{E(mon)} · {E(lv)}</span></div></a>'''


def featured():
    """Mục lục bài giảng: mỗi bài một dòng (ảnh nhỏ, tên, một ý, môn · lớp); từ bài thứ N_SHOWN + 1 ẩn tới khi bấm nút."""
    out = []
    for k, (href, cov, sk, mon, lv, title, desc) in enumerate(FEATURED):
        out.append(f'''<a class="bai{' x' if k >= N_SHOWN else ''}" href="{href}"><img src="__L_BASE__covers/{cov}.webp" alt="" loading="lazy" width="88" height="66"><b>{E(title)}</b><span class="d">{E(desc)}</span><span class="k">{E(mon)} · {E(lv)}</span></a>''')
    return '\n      '.join(out)


SUBJ_TILES = [('phys', 'Vật lí'), ('chem', 'Hoá học'), ('bio', 'Sinh học'), ('geo', 'Địa lí')]


def labs():
    """54 thí nghiệm của thư viện trên trang chính: ảnh, tên, môn · số bước. Xếp xen kẽ bốn môn để hàng đầu có đủ môn;
    từ ô thứ N_LABS + 1 ẩn tới khi bấm nút hoặc chọn một môn."""
    by = {sub: [c for c in CAT if c['subject'] == sub] for sub, _ in SUBJ_TILES}
    order = [by[sub][k] for k in range(max(map(len, by.values()))) for sub, _ in SUBJ_TILES if k < len(by[sub])]
    assert len(order) == len(CAT), 'có bài thư viện ngoài bốn môn'
    return '\n      '.join(f'''<a class="tn{' x' if k >= N_LABS else ''}" data-s="{c['subject']}" href="__L_BASE__{c['file']}"><img src="__L_BASE__{c['cover']}" alt="" loading="lazy" width="480" height="320"><b>{E(c['title'])}</b><span class="k">{E(c['mon'])} · {len(c['steps'])} bước</span></a>''' for k, c in enumerate(order))


def lab_chips():
    return ''.join(f'<button class="chip" data-s="{sub}" aria-pressed="false">{name} {sum(c["subject"] == sub for c in CAT)}</button>' for sub, name in SUBJ_TILES)


def catalog_json():
    keep = ('slug', 'subject', 'mon', 'file', 'cover', 'title', 'question', 'type', 'steps', 'textbook')
    lessons = [{k: c[k] for k in keep} for c in CAT]
    gd = {s: v for s, v in GD['bai'].items() if any(c['slug'] == s for c in CAT)}
    return json.dumps(lessons, ensure_ascii=False), json.dumps(gd, ensure_ascii=False)


def fill(s):
    assert '__' not in s.replace('__proto__', ''), 'còn chỗ giữ chỗ chưa thay: ' + ', '.join(sorted(set(re.findall(r'__[A-Z0-9_]+__', s))))
    return s


def library(links):
    """Trang chính (tên hàm giữ từ khi thư viện còn nằm trong trang chính)."""
    s = TPL.replace('__STYLE__', CSS + HOME_CSS).replace('__SOURCES__', sources_html()).replace('__FEATURED__', featured()).replace('__HERO__', hero())
    s = s.replace('__N3D__', str(len(FEATURED))).replace('__NLIB__', str(len(CAT))).replace('__LABS__', labs()).replace('__CHIPS__', lab_chips())
    for k, v in links.items(): s = s.replace(k, v)
    return fill(s)


def lib_page():
    """Trang Thư viện riêng (thu-vien/index.html): tìm, lọc theo môn và lớp, mọi bài thí nghiệm."""
    cat, gd = catalog_json()
    s = LIB_TPL.replace('__STYLE__', CSS).replace('__CATALOG__', cat).replace('__GDPT__', gd).replace('__SOURCES__', sources_html()).replace('__NLIB__', str(len(CAT)))
    return fill(s)


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
    for i, (slug, title, _kind, focus, dur, desc, ask) in enumerate(ROUTE, 1):
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
    <a class="bg-btn sm" href="{E(href(slug))}">Mở bài</a>
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
  --paper:var(--bg-page); --panel:#FFFFFF; --ink:var(--bg-ink); --ink2:var(--bg-ink2); --muted:var(--bg-ink3); --line:rgba(15,23,42,.08); --f-body:var(--lg-font); --f-mono:var(--lg-font); --r:22px;
''') + LG.BODY + 'html{background:var(--lg-page)} header h1{letter-spacing:-.025em} .lbl{font-weight:600;letter-spacing:.07em} .kpi b{font-variant-numeric:tabular-nums}\n' \
        + LG.glass('.kpi div,.step', 'var(--lg-r)') + LG.glass('table', 'var(--lg-r)') + LG.pill_buttons('.btn,.chip', '.btn.pri') \
        + '.chip[aria-pressed="true"]{background:var(--bg-ink)!important;color:#fff!important}.ask{border-left:0;border-radius:12px;background:var(--bg-page)} th{background:rgba(255,255,255,.5)} .step .vis img{border-radius:16px}\n'
    return f'''<!doctype html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sinh Học Tế Bào 10</title>
<meta name="description" content="Lộ trình 6 bài 3D cho chủ đề Sinh học tế bào lớp 10 theo chương trình GDPT 2018, kèm yêu cầu cần đạt trích nguyên văn và bảng những yêu cầu chưa có bài.">
{LG.font_link(links['__L_LIB__'])}
<style>
:root{{--paper:#F6F3F0;--panel:#FFFFFF;--ink:#1B1416;--ink2:#4A3E41;--muted:#74676A;--line:#E6DDD9;--crimson:#BE1740;--gold:#A87A22;--gold-soft:#F6EBD3;--ok:#2C7A4B;--okbg:rgba(44,122,75,.12);--relbg:rgba(168,122,34,.14);--nobg:rgba(116,103,106,.12);
  --f-body:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:var(--bg-mono);--r:14px}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--paper:#141011;--panel:#1E1819;--ink:#F2EAE8;--ink2:#D3C6C8;--muted:#A8999C;--line:#33292B;--crimson:#F0587A;--gold:#E2B259;--gold-soft:#3A2F1A;--ok:#5FC28A}}}}
:root[data-theme="dark"]{{--paper:#141011;--panel:#1E1819;--ink:#F2EAE8;--ink2:#D3C6C8;--muted:#A8999C;--line:#33292B;--crimson:#F0587A;--gold:#E2B259;--gold-soft:#3A2F1A;--ok:#5FC28A}}
*{{box-sizing:border-box}} html,body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f-body);line-height:1.55}}
a{{color:var(--bg-ink)}}
.wrap{{max-width:1180px;margin:0 auto;padding:24px 16px 56px;display:grid;gap:22px}}
.lbl{{font-size:13px;font-weight:600;color:var(--muted)}}
header h1{{margin:4px 0 6px;font-size:clamp(26px,3.4vw,38px);line-height:1.15;letter-spacing:-.01em}}
header h1 em{{font-style:normal;color:var(--crimson)}}
header p{{margin:0;max-width:78ch;color:var(--ink2)}}
.nav{{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}}
.btn{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap}}
.btn.pri{{background:var(--crimson);border-color:var(--crimson);color:#fff}}
.kpi{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}}
.kpi div{{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}}
.kpi b{{display:block;font-family:var(--f-mono);font-size:26px;line-height:1.1}}
.kpi .ok b{{color:var(--ok)}} .kpi .rel b{{color:var(--gold)}}
h2{{margin:8px 0 0;font-size:22px}}
.route{{display:grid;gap:14px;counter-reset:s}}
.step{{display:grid;grid-template-columns:44px 220px minmax(0,1fr);gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px}}
.cov{{margin:12px 0 0!important;font-size:var(--bg-fs-xs);font-weight:600;color:var(--bg-ink3)!important}}
.nav{{gap:12px!important;margin-top:24px!important}}
.step .no{{width:32px;height:32px;border-radius:50%;background:var(--bg-ink);color:#fff;display:grid;place-items:center;font-family:var(--f-mono);font-weight:600}}
.step .vis img,.step .vis .ph{{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;display:block;background:#EADFD9}}
.step .vis .ph.cell{{background:radial-gradient(circle at 50% 55%,#F7B6C6 0 22%,#E64A72 23% 26%,#F9D9E1 27% 58%,#E8A0B2 59% 63%,#FBF1F3 64%)}}
.step .vis .ph.mito{{background:radial-gradient(ellipse 46% 30% at 50% 50%,#FFE3A6 0 30%,#B0531D 31% 80%,#E7A33A 81% 92%,#FBF3E8 93%)}}
.step .bd{{display:grid;gap:8px;align-content:start}}
.step .meta{{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--muted)}}
.step .meta .dur{{font-family:var(--f-mono)}}
.step h3{{margin:0;font-size:19px;line-height:1.3}} .step h3 a{{color:inherit;text-decoration:none}} .step h3 a:hover{{text-decoration:underline;text-underline-offset:3px}}
.step p{{margin:0}} .step .steps{{font-size:13.5px;color:var(--ink2)}}
.ask{{background:var(--bg-page);padding:10px 14px;border-radius:12px;font-size:14.5px}}
.ask b{{font-size:13px;font-weight:600;color:var(--bg-ink3);margin-right:8px}}
.ycd ul{{margin:4px 0 0;padding-left:18px;display:grid;gap:4px;font-size:14px}}
.ycd .mu,td .mu{{display:block;font-size:13px;color:var(--muted)}}
.ycd details summary{{cursor:pointer;font-size:13.5px;color:var(--crimson);font-weight:600;margin-top:6px}}
.gc{{font-size:13.5px;color:var(--ink2);margin-top:6px!important}}
.step .btn{{justify-self:start}}
table{{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:9px 12px;border-top:1px solid var(--line)}}
th{{font-size:13px;font-weight:600;color:var(--muted);background:var(--paper)}}
td:first-child{{width:24%;color:var(--ink2);font-size:13px}} td:last-child{{width:20%}}
.st{{display:inline-flex;align-items:center;gap:7px;font-weight:600;font-size:13px}}.st::before{{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}}
.st.ok{{color:var(--bg-ok)}} .st.rel{{color:var(--bg-warn)}} .st.no{{color:var(--bg-ink3)}}
.filters{{display:flex;gap:8px;flex-wrap:wrap}}
.chip{{padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 13px var(--f-body);cursor:pointer}}
.chip[aria-pressed="true"]{{background:var(--ink);color:var(--panel);border-color:var(--ink)}}
footer{{font-size:13px;line-height:1.55;color:var(--lg-muted);border-top:1px solid var(--lg-hair);margin-top:24px;padding:20px 4px 8px;display:grid;gap:6px}} footer a{{color:inherit;text-decoration:underline;text-decoration-color:rgba(110,110,115,.35);text-underline-offset:2px}} footer b{{font-weight:600;color:var(--lg-ink2)}}
{LG_CSS}
{LG.PAPER_CSS}
{LG.SITE_BAR_CSS}
:root{{--muted:var(--bg-ink3);--ink2:var(--bg-ink2);--f-body:var(--bg-font);--f-mono:var(--bg-mono)}}
.wrap{{padding-top:32px}}
@media (max-width:640px){{.wrap{{padding:max(12px,env(safe-area-inset-top)) 14px calc(36px + env(safe-area-inset-bottom));gap:16px}} header h1{{font-size:28px}} header p{{font-size:15px}} .nav .btn{{font-size:14px;padding:0 14px;min-height:44px}} .kpi{{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}} .kpi div{{padding:10px 12px}} .kpi b{{font-size:22px}} .step{{padding:12px;gap:10px;border-radius:20px}} .step h3{{font-size:17.5px}} .ycd ul{{font-size:13.5px}} table{{font-size:13px}} th,td{{padding:8px 10px}}}}
@media (max-width:820px){{.step{{grid-template-columns:1fr}} .step .no{{display:none}} td:first-child{{display:none}} td:last-child{{width:32%}}}}
</style>
</head>
<body class="bg-hub">
{LG.site_bar(links['__L_LIB__'], [('Lộ trình', links['__L_LIB__'] + '#lo-trinh'), ('Sinh học tế bào 10', None)])}
<div class="wrap">
<header>
  <span class="bg-eyebrow">Chủ đề · lớp 10 · chương trình GDPT 2018</span>
  <h1>Sinh học tế bào bằng mô hình 3D</h1>
  <p>Lộ trình 6 bài cho mạch Sinh học tế bào lớp 10, sắp theo thứ tự nội dung của chương trình môn Sinh học (Thông tư 32/2018/TT-BGDĐT). Mỗi bài ghi yêu cầu cần đạt mà bài dạy trực tiếp, trích nguyên văn chương trình. Bảng cuối trang liệt kê toàn bộ yêu cầu của mạch này và chỉ rõ yêu cầu nào chưa có bài. Thời lượng là gợi ý; giáo viên tự điều chỉnh.</p>
  <p class="cov">{len(ROUTE)} bài · {n_ok} yêu cầu cần đạt có bài dạy trực tiếp · {n_rel} yêu cầu có bài liên quan · {n_no} chưa có bài</p>
  <div class="nav"><a class="bg-btn" href="{E(links['__L_CELL__'])}">Hành Trình Vào Tế Bào</a><a class="bg-btn ghost" href="{E(links['__L_MITO__'])}">Vào Ty Thể</a></div>
</header>
<h2 class="bg-h2">Lộ trình</h2>
<section class="route">
{''.join(cards)}
</section>
<h2 class="bg-h2">Toàn bộ yêu cầu cần đạt của mạch Sinh học tế bào lớp 10</h2>
<div class="filters"><button class="chip" data-f="" aria-pressed="true">Tất cả ({total})</button><button class="chip" data-f="ok" aria-pressed="false">Có bài ({n_ok})</button><button class="chip" data-f="rel" aria-pressed="false">Liên quan ({n_rel})</button><button class="chip" data-f="no" aria-pressed="false">Chưa có ({n_no})</button></div>
<table><thead><tr><th>Mục</th><th>Yêu cầu cần đạt (nguyên văn)</th><th>Trạng thái</th></tr></thead><tbody id="tb">
{''.join(rows)}
</tbody></table>
<footer>
  <div><b>Nguồn.</b> <a href="{E(src['url'])}" target="_blank" rel="noopener">{E(src['ten'])}</a>. Mọi yêu cầu cần đạt trên trang được so khớp bằng máy với văn bản này. Đã soát Thông tư 13/2022/TT-BGDĐT và 17/2025/TT-BGDĐT: không sửa môn Sinh học. Kể cả hai chuyên đề học tập 10.1 và 10.2 thuộc mạch này.</div>
  <div><b>Trạng thái.</b> “Có bài” khi ít nhất một bài trong lộ trình dạy trực tiếp yêu cầu đó; “Liên quan” khi chỉ có bài hỗ trợ hoặc mở rộng. Đối chiếu do người soạn thực hiện, chưa qua giáo viên bộ môn duyệt; góp ý tại <a href="https://github.com/nclamvn/bai-giang/issues" target="_blank" rel="noopener">GitHub Issues</a>.</div>
  <div>Bài 2, 3, 5, 6 là bản tiếng Việt của Tongjiang Lab, giấy phép CC BY-NC 4.0, chỉ dùng phi thương mại. Bài gốc được thiết kế theo sách Nhân Giáo 2019 (Trung Quốc); đối chiếu với chương trình Việt Nam do Sáng Ăn Khoai làm.</div>
</footer>
</div>
<script>
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {{ const f = c.dataset.f; document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); document.querySelectorAll('#tb tr').forEach((r) => {{ r.hidden = !!f && !r.classList.contains(f); }}); }}));
</script>
</body>
</html>
'''


def redirect(to, title):
    return (f'<!doctype html>\n<html lang="vi"><head><meta charset="utf-8"><title>{E(title)}</title>'
            f'<meta http-equiv="refresh" content="0; url={E(to)}"><link rel="canonical" href="{E(to)}">'
            f'<script>location.replace({json.dumps(to)} + location.hash)</script></head>'
            f'<body style="font-family:system-ui;padding:24px">Trang đã chuyển tới <a href="{E(to)}">{E(to)}</a>.</body></html>\n')


def write(rel, text):
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text, encoding='utf-8')


if __name__ == '__main__':
    write('index.html', library({'__L_GV__': 'giao-vien/', '__L_ENGINE__': 'cong-nghe/dong-co-4-ki/', '__L_MAKO__': 'vat-li-10/ca-map-robot/', '__L_BODY__': 'co-the-nguoi/', '__L_NEURON__': 'than-kinh/', '__L_CELL__': 'te-bao/', '__L_MITO__': 'ty-the/', '__L_CHUDE__': 'chu-de/sinh-hoc-te-bao/', '__L_COLOA__': 'lich-su-10/co-loa/', '__L_LS10__': 'lich-su-10/', '__L_ROBO__': 'robotics/', '__L_KIEM__': 'kiem-may/', '__L_REMOTE__': 'dieu-khien/', '__L_R_UR5E__': 'robotics/ur5e/', '__L_DOG__': 'robotics/quadruped/', '__L_JELLY__': 'robotics/jellyfish/', '__L_PAGODA__': 'vat-li-11/thap-nam-tang/', '__L_LIGHT__': 'vat-li-10/hai-dang/', '__L_WATCH__': 'vat-li-11/dong-ho-co/', '__L_SPIDER__': 'vat-li-10/nhen-thuy-luc/', '__L_PIRANHA__': 'vat-li-10/ca-piranha/', '__L_CAMERA__': 'khtn-9/may-anh/', '__L_GILL__': 'sinh-hoc-11/ca-tho-bang-mang/', '__L_BASE__': 'thu-vien/', '__L_LIBPAGE__': 'thu-vien/', '__L_GDPT__': 'thu-vien/gdpt2018.json', '__L_ROOT__': ''}))
    write('chu-de/sinh-hoc-te-bao/index.html', chu_de({'__L_CELL__': '../../te-bao/', '__L_MITO__': '../../ty-the/', '__L_LIB__': '../../'}, lambda f: '../../thu-vien/' + f))
    import robotics.build_hub as RH
    write('robotics/index.html', RH.build({'hub': '../', 'sims': {r['key']: r['key'] + '/' for r in RH.ROBOTS}, 'covers': {r['key']: f"../thu-vien/covers/robo-{r['key']}.webp" for r in RH.ROBOTS}}))
    write('thu-vien/index.html', lib_page())
    write('chu-de-sinh-hoc-te-bao.html', redirect('chu-de/sinh-hoc-te-bao/', 'Sinh Học Tế Bào 10'))
    write('ty-the.html', redirect('ty-the/', 'Vào Ty Thể'))
    write('ar.html', redirect('te-bao/ar.html', 'Ribosome trên bàn'))
    print('đã dựng trang chính, trang chủ đề và các trang chuyển hướng')
    if len(sys.argv) > 6 and sys.argv[1] == '--artifact':
        out = pathlib.Path(sys.argv[2]); cell, mito, hub, coloa = sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
        art = {'__L_GV__': 'https://nclamvn.github.io/bai-giang/giao-vien/', '__L_ENGINE__': 'https://nclamvn.github.io/bai-giang/cong-nghe/dong-co-4-ki/', '__L_MAKO__': 'https://nclamvn.github.io/bai-giang/vat-li-10/ca-map-robot/', '__L_BODY__': 'https://nclamvn.github.io/bai-giang/co-the-nguoi/', '__L_NEURON__': 'https://nclamvn.github.io/bai-giang/than-kinh/', '__L_CELL__': cell, '__L_MITO__': mito, '__L_CHUDE__': 'chu-de-sinh-hoc-te-bao.html', '__L_COLOA__': coloa, '__L_LS10__': 'lich-su-10.html', '__L_ROBO__': 'robotics.html', '__L_KIEM__': 'https://nclamvn.github.io/bai-giang/kiem-may/', '__L_REMOTE__': 'https://nclamvn.github.io/bai-giang/dieu-khien/', '__L_R_UR5E__': 'robotics-ur5e.html', '__L_DOG__': 'https://nclamvn.github.io/bai-giang/robotics/quadruped/', '__L_JELLY__': 'https://nclamvn.github.io/bai-giang/robotics/jellyfish/', '__L_PAGODA__': 'https://nclamvn.github.io/bai-giang/vat-li-11/thap-nam-tang/', '__L_LIGHT__': 'https://nclamvn.github.io/bai-giang/vat-li-10/hai-dang/', '__L_WATCH__': 'https://nclamvn.github.io/bai-giang/vat-li-11/dong-ho-co/', '__L_SPIDER__': 'https://nclamvn.github.io/bai-giang/vat-li-10/nhen-thuy-luc/', '__L_PIRANHA__': 'https://nclamvn.github.io/bai-giang/vat-li-10/ca-piranha/', '__L_CAMERA__': 'https://nclamvn.github.io/bai-giang/khtn-9/may-anh/', '__L_GILL__': 'https://nclamvn.github.io/bai-giang/sinh-hoc-11/ca-tho-bang-mang/', '__L_BASE__': '', '__L_LIBPAGE__': 'https://nclamvn.github.io/bai-giang/thu-vien/', '__L_GDPT__': 'https://github.com/nclamvn/bai-giang/blob/main/thu-vien/gdpt2018.json', '__L_ROOT__': 'https://nclamvn.github.io/bai-giang/'}
        import build_ls10
        (out / 'lich-su-10.html').write_text(encoding='utf-8', data=build_ls10.build(hub, coloa, 'covers/co-loa.webp'))
        (out / 'index_art.html').write_text(encoding='utf-8', data=library(art))
        import robotics.build_hub as RH
        (out / 'robotics.html').write_text(encoding='utf-8', data=RH.build({'hub': hub, 'sims': {r['key']: f"robotics-{r['key']}.html" for r in RH.ROBOTS}, 'covers': {r['key']: f"covers/robo-{r['key']}.webp" for r in RH.ROBOTS}}))
        (out / 'chu-de-sinh-hoc-te-bao.html').write_text(encoding='utf-8', data=chu_de({'__L_CELL__': cell, '__L_MITO__': mito, '__L_LIB__': hub}, lambda f: f))
        print('đã dựng bản cho trang đăng vào', out)
