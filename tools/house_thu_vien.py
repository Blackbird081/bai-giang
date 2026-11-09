#!/usr/bin/env python3
"""Đưa 54 bài thư viện (bản Việt hoá của Tongjiang Lab, CC BY-NC 4.0) về giao diện nhà Sáng Ăn Khoai (kế hoạch nâng cấp UI, Đợt 3).

Không sửa mã mô phỏng gốc. Chỉ:
  1. chèn lớp CSS <style id="bg-house"> trước </head>: token, phông, màu nhấn theo môn, bỏ ba hàng thanh trên của bản gốc
     (thanh đầu bài chung của vỏ thay thế), chân trang thành viên thuốc chuyển bước, cỡ chữ tối thiểu 13 px;
  2. nâng mọi cỡ chữ CSS dưới 13 px lên 13 px (tools/minfont.py);
  3. nhúng vỏ v2 và bộ gắn thư viện (tools/inject_shell.py --adapter=thu-vien);
  4. bỏ liên kết Google Fonts (phông của site tự lưu);
  5. tách ảnh nhúng base64 lớn (từ 20 KB) ra thu-vien/anh/, đặt tên theo mã băm nội dung: ảnh Trái Đất dùng chung cho 4 bài chỉ tải một lần;
  6. bỏ khối @media (prefers-color-scheme: dark) trong <style id="lg-theme"> khi nó lặp y hệt khối sáng (site chỉ có giao diện sáng).
Chạy lại bao nhiêu lần cũng được.  python3 tools/house_thu_vien.py [tệp…]   (mặc định: thu-vien/*-step.html)
"""
import base64, hashlib, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import inject_shell, minfont  # noqa: E402

HOUSE = r"""<style id="bg-house">
/* Giao diện nhà Sáng Ăn Khoai cho bài thư viện. Sinh bởi tools/house_thu_vien.py; không sửa tay. */
html:root,html:root[data-theme]{--font:var(--bg-font)!important;--sci:var(--bg-accent,#2F6BFF);--sci-d:color-mix(in srgb,var(--bg-accent,#2F6BFF) 78%,#000);--sci-30:color-mix(in srgb,var(--bg-accent,#2F6BFF) 30%,transparent);--sci-28:color-mix(in srgb,var(--bg-accent,#2F6BFF) 28%,transparent);--sci-26:color-mix(in srgb,var(--bg-accent,#2F6BFF) 26%,transparent);--sci-22:color-mix(in srgb,var(--bg-accent,#2F6BFF) 22%,transparent);--sci-12:color-mix(in srgb,var(--bg-accent,#2F6BFF) 12%,transparent);--sci-8:color-mix(in srgb,var(--bg-accent,#2F6BFF) 8%,transparent);--sci-4:color-mix(in srgb,var(--bg-accent,#2F6BFF) 4%,transparent);--sci-0:color-mix(in srgb,var(--bg-accent,#2F6BFF) 0%,transparent);--num:var(--bg-font);--fs-xs:13px;--fs-b:14px;--fs-t:14px;--lg-font:var(--bg-font);
  --grad:linear-gradient(100deg,var(--bg-accent,#2F6BFF) 0%,color-mix(in srgb,var(--bg-accent,#2F6BFF) 72%,#000) 100%);--grad-soft:color-mix(in srgb,var(--bg-accent,#2F6BFF) 10%,transparent);
  --ink:var(--bg-ink,#15171C);--ink2:var(--bg-ink2,#454A55);--ink3:var(--bg-ink3,#626773);--glass:rgba(255,255,255,.9);--glass-2:rgba(255,255,255,.88);--glass-bar:rgba(255,255,255,.9);--glass-blur:blur(20px) saturate(170%)}
body{font-family:var(--bg-font)}
.phead h2,.sb,.ct,.bk,.lbl,.k{letter-spacing:.01em!important;text-transform:none!important}
/* thanh đầu bài chung của vỏ thay header#top và nav#steps của bản gốc */
body.bgs-on{--top-h:calc(var(--bg-bar) - 8px);--steps-h:0px;--foot-h:60px}
body.bgs-on #eqb{top:calc(var(--bg-bar) + 12px)!important}
body.bgs-on header#top,body.bgs-on nav#steps,body.bgs-on .tab,body.bgs-on aside .phead .fold{display:none!important}
/* chân trang: viên thuốc chuyển bước ở giữa, chữ ghi chú chuyển vào bảng Bước này */
body.bgs-on footer#foot{left:50%;right:auto;transform:translateX(-50%);width:min(560px,calc(100vw - 32px));height:auto;bottom:10px;padding:6px;border-radius:999px}
body.bgs-on footer#foot .foot2{display:none!important}
body.bgs-on footer#foot .nav{gap:8px}
body.bgs-on footer#foot .navbtn{height:44px;padding:0 18px;font-size:15px;border-radius:999px}
body.bgs-on footer#foot .cur{font:600 14px var(--bg-mono);color:var(--bg-ink2)}
.exbadge{color:var(--bg-ink2,#454A55)!important}
.bg-credit{margin:14px 2px 4px;padding-top:10px;border-top:1px solid var(--line,rgba(16,24,40,.1));font-size:13px;line-height:1.55;color:var(--bg-ink3,#626773)}
.bg-credit a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.bg-credit p{margin:0 0 6px}
/* điện thoại, máy tính bảng dựng: thanh dưới của vỏ thay chân trang; tấm trượt nằm trên thanh dưới */
@media (max-width:700px),(orientation:portrait) and (max-width:1100px){
  body.bgs-on #eqb{top:calc(var(--bg-bar) + env(safe-area-inset-top) + 8px)!important}
  body.bgs-nav-on footer#foot{display:none!important}
  body.bgs-nav-on aside#left,body.bgs-nav-on aside#right{bottom:calc(76px + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on #mtabs{bottom:calc(84px + 42svh + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on.m-3d #mtabs{bottom:calc(84px + env(safe-area-inset-bottom))!important}
  #mtabs button{min-height:40px;padding:0 14px!important;font:600 14px var(--bg-font)!important}
  /* thanh ba nút đè lên nhãn 3D: nền đặc để nhãn phía sau không lộ qua */
  #mtabs{background:rgba(244,244,246,.98)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:0 6px 18px -8px rgba(16,24,40,.28),0 0 0 .5px rgba(16,24,40,.08)!important}
}
@media (max-width:700px),(orientation:portrait) and (max-width:1100px){body.bgs-on #eqb{transform:translateX(-50%)!important;width:min(380px,calc(100vw - 24px))!important}}
/* điện thoại: chữ nhỏ nhất 14 px (minfont viết các cỡ ngưỡng thành var(--bg-fs-min)) */
@media (max-width:700px){html:root{--bg-fs-min:14px;--fs-xs:14px;--fs-b:15px;--fs-t:15px}}
@media (max-width:700px){
  body.bgs-on #eqb{cursor:pointer;padding-bottom:10px!important}
  body.bgs-on #eqb:not(.bg-open) .bt,body.bgs-on #eqb:not(.bg-open) .btags,body.bgs-on #eqb:not(.bg-open) .bcal{display:none!important}
  body.bgs-on #eqb:not(.bg-open) .beq{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  body.bgs-on #eqb::after{content:"Chạm để xem điều kiện";display:block;margin-top:4px;font:500 13px var(--bg-font);color:var(--bg-ink3)}
  body.bgs-on #eqb.bg-open::after{content:"Chạm để thu gọn"}
}
/* màn cảm ứng: vùng bấm từ 44 px */
@media (pointer:coarse){aside#left button,aside#right button,#mtabs button,footer#foot button,aside .chip{min-height:44px!important}aside .seg button{min-height:40px}}
@media (orientation:portrait) and (min-width:701px) and (max-width:1100px){body.bgs-nav-on #mtabs{bottom:calc(84px + 38svh + env(safe-area-inset-bottom))!important}}
@media (orientation:portrait) and (min-width:641px) and (max-width:1100px){body.bgs-on .bgs-desk{display:none!important}}
@media (orientation:landscape) and (max-height:520px){
  body.bgs-on aside#left,body.bgs-on aside#right{top:calc(var(--bg-bar) + env(safe-area-inset-top) + 8px)!important}
  body.bgs-nav-on footer#foot{display:none!important}
  body.bgs-nav-on aside#left,body.bgs-nav-on aside#right{bottom:calc(76px + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on #mtabs{bottom:calc(76px + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on .bgs-nav{right:calc(min(46vw,440px) + 16px)}
}
/* chữ tiếng Việt dài hơn bản gốc: không để chữ chạm mép hay tràn khỏi khung (tests/ui_audit.py, mục clip và edge) */
#right .sl{padding:5px 10px!important}
aside .btn{white-space:normal!important;padding:6px 10px!important;line-height:1.25!important;text-align:center}
.kpi{padding-block:6px!important}
.subs .sub,.sub .cal{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere}
.chartwrap .ch b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:700px){.at,.lab{max-width:46vw;white-space:normal!important;overflow-wrap:anywhere}.lab .n{white-space:normal!important}}
#eqb .btags span,#eqb .tg,.btags .tg,.tagrow .tg{white-space:normal!important;overflow-wrap:anywhere;min-width:0;max-width:100%}
/* máy tính: hàng thẻ trong hộp phương trình trùng với thẻ ở bảng Bước này; khi bảng đang mở thì ẩn để cảnh 3D rộng hơn */
@media (min-width:1101px){body.bgs-on:has(aside#left:not(.collapsed)) #eqb .btags{display:none!important}}
html[data-chieu] aside#left,html[data-chieu] aside#right,html[data-chieu] footer#foot,html[data-chieu] #eqb{background:#fff!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html[data-chieu]{--fs-b:17px;--fs-t:17px;--ink2:#141414;--ink3:#262626}
</style>
"""


IMG = ROOT / 'thu-vien/anh'


def unembed(s):
    def out(m):
        ext = {'jpeg': 'jpg'}.get(m.group(1), m.group(1)); data = base64.b64decode(m.group(2))
        name = f'{hashlib.sha256(data).hexdigest()[:12]}.{ext}'
        IMG.mkdir(exist_ok=True); f = IMG / name
        if not f.exists(): f.write_bytes(data)
        return f'anh/{name}'
    return re.sub(r'data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]{20000,})', out, s)


def drop_dark_dup(s):
    """Khối tối của lg-theme (bản Việt hoá cũ) lặp nguyên văn khối sáng: bỏ đi không đổi gì trên màn hình, mỗi bài nhẹ ~3,3 KB."""
    m = re.search(r'(<style id="lg-theme">\n/\*.*?\*/\n:root,:root\[data-theme\]\{)(.*?)\n\}\n(@media \(prefers-color-scheme: dark\)\{:root:not\(\[data-theme="light"\]\),:root\[data-theme\]\{(.*?)\n\}\}\n)', s, re.S)
    if m and m.group(2) == m.group(4):
        s = s[:m.start(3)] + s[m.end(3):]
    return s


GFONT = re.compile(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n?<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n?<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?[^"]*">\n?')


def apply(path):
    # bỏ liên kết Google Fonts của bản gốc: phông của site tự lưu (Be Vietnam Pro), không gửi yêu cầu ra bên thứ ba
    p = pathlib.Path(path); s = drop_dark_dup(GFONT.sub('', unembed(p.read_text(encoding='utf-8'))))
    s = re.sub(r'<style id="bg-house">.*?</style>\n?', '', s, flags=re.S)
    s, n = minfont.fix(s)
    s = s.replace('</head>', HOUSE + '</head>', 1)
    s = inject_shell.inject(s, 'thu-vien', inject_shell.key_of(p))
    p.write_text(s, encoding='utf-8')
    return n


if __name__ == '__main__':
    files = sys.argv[1:] or sorted(str(x) for x in (ROOT / 'thu-vien').glob('*-step.html'))
    tot = sum(apply(f) for f in files)
    print(f'{len(files)} bài thư viện · nâng {tot} cỡ chữ')
