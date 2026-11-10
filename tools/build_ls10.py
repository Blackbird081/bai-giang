#!/usr/bin/env python3
"""Dựng trang lộ trình Lịch sử 10 (lich-su-10/index.html) từ lich-su-10/chuong-trinh.json.

Lộ trình bám CHƯƠNG TRÌNH môn Lịch sử (TT 32/2018, ban hành lại bởi TT 13/2022, sửa đổi bởi TT 17/2025), nên dùng chung
cho cả ba bộ sách. Yêu cầu cần đạt trích nguyên văn. Cảnh 3D ghi "Dự kiến" là kế hoạch, chưa dựng.
Không chép nội dung sách giáo khoa: chỉ liệt kê tên bài của ba bộ sách để giáo viên đối chiếu.
Chạy: python3 tools/build_ls10.py [--artifact out.html hub_url coloa_url]
"""
import json, sys, html, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import liquid_glass as LG

ROOT = pathlib.Path(__file__).resolve().parent.parent
CT = json.loads((ROOT / 'lich-su-10/chuong-trinh.json').read_text(encoding='utf-8'))
E = lambda s: html.escape(str(s), quote=True)

TEN = ['Lịch sử và sử học', 'Vai trò của sử học', 'Một số nền văn minh thế giới thời cổ – trung đại',
       'Các cuộc cách mạng công nghiệp trong lịch sử thế giới', 'Văn minh Đông Nam Á thời cổ – trung đại',
       'Một số nền văn minh trên đất nước Việt Nam (trước năm 1858)', 'Cộng đồng các dân tộc Việt Nam', 'Thực hành lịch sử']
TILE = {t: v for t, v in CT['thoi_luong']['ti_le_lop_10'].items()}
TL = ['10% (chung chủ đề 1–2)', '10% (chung chủ đề 1–2)', TILE.get('Một số nền văn minh thế giới thời cổ - trung đại', ''),
      TILE.get('Các cuộc cách mạng công nghiệp trong lịch sử thế giới', ''), TILE.get('Văn minh Đông Nam Á thời cổ - trung đại', ''),
      TILE.get('Một số nền văn minh trên đất nước Việt Nam (trước năm 1858)', ''), TILE.get('Cộng đồng các dân tộc Việt Nam', ''), TILE.get('THỰC HÀNH LỊCH SỬ', '')]

# Cảnh 3D cho từng mục: (trạng thái, tên cảnh, mô tả). 'co' = đã có, 'du' = dự kiến
CANH = {
    'Lịch sử': ('du', 'Hố địa tầng', 'Một hố khảo cổ cắt lớp: các lớp đất và hiện vật là hiện thực còn lại; bản vẽ, nhật ký khai quật là lịch sử được nhận thức. Học sinh tự đào từng lớp và ghi chép.'),
    'Sử học': ('du', 'Bàn của nhà sử học', 'Tư liệu gốc, tư liệu phái sinh, truyền miệng đặt cạnh nhau; kéo từng tư liệu vào khung đối chiếu để thấy chỗ khớp, chỗ vênh.'),
    'Tri thức lịch sử và cuộc sống: Học tập và khám phá lịch sử suốt đời': ('du', 'Phòng trưng bày ảo', 'Một phòng bảo tàng nhỏ xoay quanh vài hiện vật, mỗi hiện vật mở ra câu hỏi để học sinh tự tìm hiểu tiếp.'),
    'Sử học với công tác bảo tồn và phát huy giá trị di sản văn hoá, di sản thiên nhiên': ('du', 'Các tầng di tích chồng lớp', 'Một khu di tích có nhiều thời kỳ chồng lên nhau, bóc từng tầng để thấy vì sao bảo tồn cần sử học.'),
    'Sử học với sự phát triển du lịch': ('du', 'Tuyến tham quan một đô thị cổ', 'Dựng tuyến tham quan 3D một đô thị cổ, gắn thông tin lịch sử vào từng điểm dừng.'),
    'Khái niệm văn minh': ('du', 'Quả địa cầu văn minh', 'Các trung tâm văn minh cổ hiện trên quả địa cầu theo dòng thời gian, phân biệt văn hoá và văn minh.'),
    'Văn minh Ai Cập': ('du', 'Kim tự tháp Khufu', 'Mặt cắt kim tự tháp theo số đo khảo cổ, các hành lang và buồng bên trong, công trường xây dựng.'),
    'Văn minh Trung Hoa': ('du', 'Giấy, la bàn, thuốc súng, kỹ thuật in', 'Bốn phát minh dưới dạng mô hình chuyển động, kèm niên đại và nguồn.'),
    'Văn minh Ấn Độ': ('du', 'Bảo tháp Sanchi', 'Bảo tháp và cổng đá chạm khắc, liên hệ với Phật giáo lan sang Đông Nam Á.'),
    'Văn minh Hy Lạp - La Mã': ('du', 'Đền Parthenon và đấu trường Colosseum', 'Hai công trình đúng tỉ lệ, xem cột, vòm và kỹ thuật xây dựng.'),
    'Văn minh thời Phục hưng': ('du', 'Mái vòm nhà thờ Florence', 'Cách Brunelleschi xây mái vòm hai lớp, từng vòng gạch xương cá.'),
    'Cách mạng công nghiệp lần thứ nhất': ('du', 'Máy hơi nước', 'Piston, van, bánh đà chuyển động; vì sao máy hơi nước thay đổi nhà máy và giao thông.'),
    'Cách mạng công nghiệp lần thứ hai': ('du', 'Động cơ đốt trong, máy phát điện, dây chuyền', 'Ba cỗ máy tiêu biểu chạy cạnh nhau.'),
    'Ý nghĩa của Cách mạng công nghiệp lần thứ nhất và lần thứ hai': ('du', 'Bản đồ đường sắt và nhà máy', 'Mạng đường sắt, nhà máy lan rộng qua các thập niên.'),
    'Cách mạng công nghiệp lần thứ ba': ('du', 'Từ bóng bán dẫn đến vi mạch', 'Phóng từ một chiếc máy tính xuống vi mạch và bóng bán dẫn.'),
    'Cách mạng công nghiệp lần thứ tư (Cách mạng 4.0)': ('du', 'Nhà máy thông minh', 'Robot, cảm biến, dữ liệu kết nối trong một xưởng sản xuất.'),
    'Ý nghĩa của Cách mạng công nghiệp lần thứ ba và lần thứ tư': ('du', 'Bốn cuộc cách mạng trên một trục', 'So sánh nguồn năng lượng, công cụ và tác động của bốn cuộc cách mạng.'),
    'Hành trình phát triển và thành tựu của văn mình Đông Nam Á thời cổ - trung đại': ('du', 'Angkor Wat và Borobudur', 'Mặt bằng mandala, các tầng đền tháp, liên hệ với văn minh Ấn Độ.'),
    'Văn minh Văn Lang - Âu Lạc': ('co', 'Thành Cổ Loa', 'Ba vòng thành phỏng dựng theo số đo khảo cổ, dòng thời gian từ thế kỷ IV TCN đến nay, hiện vật, truyền thuyết đối chiếu bằng chứng, chế độ học theo bước có câu hỏi.'),
    'Văn minh Champa': ('du', 'Thánh địa Mỹ Sơn', 'Các nhóm tháp gạch, kỹ thuật xây gạch không vữa nhìn thấy, liên hệ tôn giáo.'),
    'Văn minh Phù Nam': ('du', 'Cảng thị Óc Eo', 'Kênh đào, nhà sàn, cảng biển trong mạng giao thương.'),
    'Cơ sở hình thành và quá trình phát triển của văn minh Đại Việt': ('du', 'Kinh thành Thăng Long', 'Các tầng kiến trúc Hoàng thành Thăng Long qua các triều đại.'),
    'Một số thành tựu của văn minh Đại Việt': ('du', 'Văn Miếu, thành nhà Hồ', 'Hai công trình tiêu biểu cho giáo dục và kỹ thuật xây dựng.'),
    'Ý nghĩa của văn minh Đại Việt trong lịch sử dân tộc Việt Nam': ('du', 'Dòng thời gian văn minh Đại Việt', 'Các thành tựu đặt trên một trục thời gian để so sánh, tổng hợp.'),
    'Các dân tộc trên đất nước Việt Nam': ('du', 'Bản đồ ngữ hệ', 'Bản đồ phân bố các ngữ hệ, nhóm ngôn ngữ, chạm vào để xem từng dân tộc.'),
    'Khái quát về đời sống vật chất và tinh thần của cộng đồng các dân tộc Việt Nam': ('du', 'Ba kiểu nhà truyền thống', 'Nhà rông, nhà sàn, nhà trình tường dựng đúng cấu trúc, xem vật liệu và cách dùng không gian.'),
    'Khối đại đoàn kết dân tộc trong lịch sử Việt Nam': ('du', 'Dòng thời gian', 'Các mốc tiêu biểu của khối đại đoàn kết dân tộc.'),
    'Chính sách dân tộc của Đảng và Nhà nước hiện nay': ('tl', 'Trang tư liệu', 'Mục này hợp với văn bản, số liệu hơn là mô hình 3D.'),
    None: ('du', 'Thực địa ảo Cổ Loa', 'Đi thực địa trên mô hình Cổ Loa: đo mặt cắt, ghi chép, đối chiếu nguồn. Dùng lại bài Thành Cổ Loa.'),
}
# Tên bài của ba bộ sách theo từng chủ đề chương trình (chỉ tên bài, để đối chiếu)
def bo_sach_map():
    kn, ct, cd = CT['bo_sach']
    m = []
    for i in range(7):
        ct_bai = ct['chu_de'][0]['bai'][:2] if i == 0 else ct['chu_de'][0]['bai'][2:] if i == 1 else ct['chu_de'][i - 1]['bai']
        m.append([('Kết nối tri thức', kn['chu_de'][i]['bai']), ('Chân trời sáng tạo', ct_bai), ('Cánh diều', cd['chu_de'][i]['bai'])])
    return m


def build(hub, coloa, cover):
    BS = bo_sach_map()
    n_y = sum(len(m['ycd']) for cd in CT['chu_de'] for m in cd['muc'])
    n_cd = sum(len(m['ycd']) for cd in CT['chuyen_de'] for m in cd['muc'])
    secs = []
    for i, cd in enumerate(CT['chu_de']):
        rows = []
        for m in cd['muc']:
            st, canh, mo = CANH.get(m['ten'], ('du', 'Chưa lên kế hoạch', ''))
            ten = m['ten'] or 'Hoạt động thực hành'
            link = f'<a class="bg-btn sm" href="{E(coloa)}">Mở bài 3D</a>' if st == 'co' else ''
            y = ''.join(f'<li>{E(x)}</li>' for x in m['ycd'])
            sua = ' <span class="new" title="Sửa đổi theo Thông tư 17/2025">· sửa đổi 2025</span>' if m.get('sua_doi_2025') else ''
            rows.append(f'''<div class="muc {st}">
  <div class="mh"><h4>{E(ten)}{sua}</h4>{ {'co': '<span class="st co">Có bài 3D</span>', 'du': '', 'tl': '<span class="st tl">Tư liệu</span>'}[st] }</div>
  <div class="canh"><b>{E(canh)}</b>{(' · ' + E(mo)) if mo else ''}</div>
  <details{' open' if st == 'co' else ''}><summary>Yêu cầu cần đạt ({len(m['ycd'])})</summary><ul>{y}</ul></details>
  {link}
</div>''')
        bs = ''
        if i < 7:
            bs = '<div class="bs"><div class="lbl">Bài tương ứng trong sách</div><div class="bsg">' + ''.join(
                f'<div><b>{E(n)}</b><ul>{"".join(f"<li>{E(b)}</li>" for b in bai)}</ul></div>' for n, bai in BS[i]) + '</div></div>'
        secs.append(f'''<section class="cd glass" id="cd{i + 1}">
  <div class="ch"><span class="no">{i + 1 if i < 7 else '★'}</span><div><div class="lbl">{'Chủ đề ' + str(i + 1) if i < 7 else 'Hoạt động'} · thời lượng {E(TL[i])}</div><h3>{E(TEN[i])}</h3></div></div>
  {''.join(rows)}
  {bs}
</section>''')
    cds = ''.join(f'''<details class="cdx glass"><summary><b>{E(c['ten'].split(':')[0])}</b> {E(c['ten'].split(':', 1)[1].strip().capitalize() if ':' in c['ten'] else '')} <span class="small">· {sum(len(m['ycd']) for m in c['muc'])} yêu cầu</span></summary>
  {''.join(f"<div class='muc du'><h4>{E(m['ten'])}</h4><ul>{''.join(f'<li>{E(x)}</li>' for x in m['ycd'])}</ul></div>" for m in c['muc'])}</details>''' for c in CT['chuyen_de'])
    src = ''.join(f'<li><a href="{E(n["url"])}" target="_blank" rel="noopener">{E(n["ten"])}</a></li>' for n in CT['nguon'])
    css = LG.root('''
  --paper:var(--bg-page); --ink:var(--bg-ink); --ink2:var(--bg-ink2); --muted:var(--bg-ink3); --line:rgba(15,23,42,.08); --accent:#9A5B13; --accent2:#7A4510;
''') + LG.BODY + LG.PAPER_CSS + LG.glass('.glass', 'var(--lg-r)') + LG.pill_buttons('.btn', '.btn.primary')
    return f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F3EFE6">
<title>Lịch Sử 10</title>
<meta name="description" content="Lộ trình bài giảng 3D Lịch sử lớp 10 theo chương trình GDPT 2018 (sửa đổi 2025), dùng chung cho ba bộ sách; yêu cầu cần đạt trích nguyên văn; bài mẫu Thành Cổ Loa.">
{LG.font_link(hub)}
<style>
{css}
*{{box-sizing:border-box}} body{{margin:0;line-height:1.6;font-size:15px;font-family:var(--bg-font)}}
.muc.du .canh{{color:var(--bg-ink3)}} .muc.du h4{{font-weight:600}}
a{{color:var(--accent2)}}
.wrap{{max-width:1080px;margin:0 auto;padding:28px 18px 60px;display:grid;gap:20px}}
.lbl{{font-size:13px;font-weight:600;color:var(--muted)}}
.crumb a{{text-decoration:none;color:var(--muted);font-weight:500;font-size:14px}}
h1{{margin:6px 0 8px;font-size:clamp(30px,4.2vw,44px);letter-spacing:-.025em;line-height:1.08}}
h1 em{{font-style:normal;color:var(--accent)}}
header p{{margin:0;max-width:74ch;color:var(--ink2)}}
.feat{{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);overflow:hidden;text-decoration:none;color:inherit}}
.feat img{{width:100%;height:100%;object-fit:cover;display:block;min-height:240px}}
.feat .bd{{padding:22px 24px;display:grid;gap:10px;align-content:center}}
.feat h2{{margin:0;font-size:26px;letter-spacing:-.02em}}
.feat p{{margin:0;color:var(--ink2)}}
.feat .btn{{justify-self:start;text-decoration:none;padding:9px 16px}}
.kpi{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}}
.kpi div{{padding:12px 14px}}
.kpi b{{display:block;font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}}
h2.sec{{margin:28px 0 0}} .feat .bg-btn,.muc .bg-btn{{justify-self:start;margin-top:6px}}
.cd{{padding:18px 20px;display:grid;gap:10px}}
.ch{{display:flex;gap:14px;align-items:center}}
.ch .no{{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;color:#fff;background:var(--bg-ink)}}
.ch h3{{margin:0;font:400 24px/1.2 var(--bg-serif);letter-spacing:-.012em}}
.muc{{border-top:1px solid var(--line);padding:10px 0 4px;display:grid;gap:5px}}
.muc .mh{{display:flex;justify-content:space-between;gap:10px;align-items:baseline}}
.muc h4{{margin:0;font-size:15.5px}}
.muc .canh{{font-size:14px;color:var(--ink2)}}
.muc details summary{{cursor:pointer;font-size:13px;font-weight:600;color:var(--accent2)}}
.muc ul{{margin:4px 0 2px;padding-left:20px;font-size:14px}}
.muc .btn{{justify-self:start;text-decoration:none;margin:4px 0 6px;padding:7px 14px;font-size:13.5px}}
.muc.co{{background:var(--bg-page);border-radius:14px;padding:12px 14px;border-top-color:transparent}}
.st{{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;white-space:nowrap}}.st::before{{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}}
.st.co{{color:var(--bg-ok)}} .st.tl{{color:var(--bg-ink3)}}
.new{{font-size:13px;font-weight:500;color:var(--bg-ink3);margin-left:4px}}
.bs{{border-top:1px solid var(--line);padding-top:10px}}
.bsg{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:6px}}
.bsg b{{font-size:13px}} .bsg ul{{margin:4px 0 0;padding-left:16px;font-size:13px;color:var(--ink2)}}
.cdx{{padding:14px 18px}} .cdx summary{{cursor:pointer}} .small{{font-size:13px;color:var(--muted)}}
footer{{font-size:13px;color:var(--muted);border-top:1px solid var(--lg-hair);padding-top:18px;display:grid;gap:8px}}
footer ul{{margin:0;padding-left:18px}} footer a{{color:inherit}}
@media (max-width:760px){{.wrap{{padding:16px 12px 40px;gap:14px}} .feat{{grid-template-columns:1fr}} .feat img{{min-height:0;aspect-ratio:16/10}} .kpi{{grid-template-columns:1fr;gap:8px}} .kpi div{{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 14px}} .kpi b{{font-size:18px;text-align:right}} .bsg{{grid-template-columns:1fr}} .cd{{padding:14px}} .ch h3{{font-size:18px}}}}
</style>
</head>
<body class="bg-hub">
{LG.site_bar(hub, [('Lộ trình', hub + '#lo-trinh'), ('Lịch sử 10', None)])}
<div class="wrap">
<header>
  <span class="bg-eyebrow">Lịch sử · lớp 10 · chương trình GDPT 2018, sửa đổi 2025</span>
  <h1>Lịch sử 10 bằng mô hình 3D</h1>
  <p>Lộ trình bám theo chương trình môn Lịch sử, nên dùng chung được cho cả ba bộ sách Kết nối tri thức, Chân trời sáng tạo và Cánh diều. Mỗi mục ghi nguyên văn yêu cầu cần đạt và cảnh 3D sẽ dựng. Nội dung bài được viết mới từ nguồn khảo cổ, sử liệu công khai, có dẫn nguồn từng con số; phần phỏng dựng luôn được ghi rõ. Trang không chép nội dung sách giáo khoa.</p>
</header>
<a class="feat glass" href="{E(coloa)}">
  <img src="{E(cover)}" alt="Mô hình 3D ba vòng thành Cổ Loa trên đồng bằng">
  <div class="bd"><div class="lbl">Bài mẫu · Văn minh Văn Lang – Âu Lạc</div><h2>Thành Cổ Loa</h2>
  <p>Ba vòng thành đất dựng theo số đo khảo cổ trên đồng bằng ven sông Hoàng Giang. Kéo dòng thời gian từ thế kỷ IV TCN đến ngày nay, mở mặt cắt lũy đúng tỉ lệ, xem kho mũi tên, trống đồng, và đặt truyền thuyết cạnh bằng chứng.</p>
  <span class="bg-btn sm">Vào bài</span></div>
</a>
<h2 class="sec bg-h2">Lộ trình theo chương trình</h2>
<p class="small" style="margin:-8px 0 0">7 chủ đề và hoạt động thực hành · {n_y} yêu cầu cần đạt trích nguyên văn · bài 3D đầu tiên: Thành Cổ Loa; các mục khác đang dựng.</p>
{''.join(secs)}
<h2 class="sec bg-h2">Chuyên đề học tập lựa chọn</h2>
<p class="small" style="margin:-8px 0 0">{n_cd} yêu cầu cần đạt, 35 tiết. Chưa lên kế hoạch cảnh 3D; chuyên đề 10.2 về di sản có thể dùng lại mô hình Cổ Loa.</p>
{cds}
<footer>
  <div><b>Văn bản chương trình.</b> {E('; '.join(CT['can_cu_phap_ly']))}. Yêu cầu cần đạt chép theo văn bản, kể cả lỗi in có trong văn bản gốc. Dữ liệu: <a href="https://github.com/nclamvn/bai-giang/blob/main/lich-su-10/chuong-trinh.json">chuong-trinh.json</a>.</div>
  <ul>{src}</ul>
  <div><b>Tên bài ba bộ sách</b> lấy từ danh mục công khai trên VietJack và Loigiaihay, chỉ để đối chiếu. Bộ Kết nối tri thức có hai bản danh mục khác nhau giữa các nguồn; trang dùng bản 13 bài.</div>
  <div>Đối chiếu do người soạn thực hiện, chưa qua giáo viên bộ môn duyệt; góp ý tại <a href="https://github.com/nclamvn/bai-giang/issues" target="_blank" rel="noopener">GitHub Issues</a>.</div>
</footer>
</div>
</body>
</html>
'''


if __name__ == '__main__':
    out = ROOT / 'lich-su-10/index.html'
    out.write_text(build('../', 'co-loa/', '../thu-vien/covers/co-loa.webp'), encoding='utf-8')
    print('đã dựng', out.relative_to(ROOT))
    if len(sys.argv) > 4 and sys.argv[1] == '--artifact':
        pathlib.Path(sys.argv[2]).write_text(build(sys.argv[3], sys.argv[4], 'covers/co-loa.webp'), encoding='utf-8')
        print('đã dựng bản đăng', sys.argv[2])
