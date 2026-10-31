#!/usr/bin/env python3
"""Đưa 54 bài thư viện (bản Việt hoá của Tongjiang Lab, CC BY-NC 4.0) về giao diện nhà Bài Giảng (kế hoạch nâng cấp UI, Đợt 3).

Không sửa mã mô phỏng gốc. Chỉ:
  1. chèn lớp CSS <style id="bg-house"> trước </head>: token, phông, màu nhấn theo môn, bỏ ba hàng thanh trên của bản gốc
     (thanh đầu bài chung của vỏ thay thế), chân trang thành viên thuốc chuyển bước, cỡ chữ tối thiểu 13 px;
  2. nâng mọi cỡ chữ CSS dưới 13 px lên 13 px (tools/minfont.py);
  3. nhúng vỏ v2 và bộ gắn thư viện (tools/inject_shell.py --adapter=thu-vien).
Chạy lại bao nhiêu lần cũng được.  python3 tools/house_thu_vien.py [tệp…]   (mặc định: thu-vien/*-step.html)
"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import inject_shell, minfont  # noqa: E402

HOUSE = r"""<style id="bg-house">
/* Giao diện nhà Bài Giảng cho bài thư viện. Sinh bởi tools/house_thu_vien.py; không sửa tay. */
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
}
@media (max-width:700px),(orientation:portrait) and (max-width:1100px){body.bgs-on #eqb{transform:translateX(-50%)!important;width:min(380px,calc(100vw - 24px))!important}}
/* màn cảm ứng: vùng bấm từ 44 px */
@media (pointer:coarse){aside#left button,aside#right button,#mtabs button,footer#foot button,aside .chip{min-height:44px!important}aside .seg button{min-height:40px}}
@media (orientation:portrait) and (min-width:701px) and (max-width:1100px){body.bgs-nav-on #mtabs{bottom:calc(84px + 38svh + env(safe-area-inset-bottom))!important}}
@media (orientation:landscape) and (max-height:520px){
  body.bgs-on aside#left,body.bgs-on aside#right{top:calc(var(--bg-bar) + env(safe-area-inset-top) + 8px)!important}
  body.bgs-nav-on footer#foot{display:none!important}
  body.bgs-nav-on aside#left,body.bgs-nav-on aside#right{bottom:calc(76px + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on #mtabs{bottom:calc(76px + env(safe-area-inset-bottom))!important}
  body.bgs-nav-on .bgs-nav{right:calc(min(46vw,440px) + 16px)}
}
html[data-chieu] aside#left,html[data-chieu] aside#right,html[data-chieu] footer#foot,html[data-chieu] #eqb{background:#fff!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html[data-chieu]{--fs-b:17px;--fs-t:17px;--ink2:#141414;--ink3:#262626}
</style>
"""


def apply(path):
    p = pathlib.Path(path); s = p.read_text(encoding='utf-8')
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
