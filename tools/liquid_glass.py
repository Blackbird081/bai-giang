"""Chuẩn giao diện chung: nền trắng, vật liệu kính lỏng (liquid glass) theo tinh thần iOS 27 và macOS 27.

Một nguồn duy nhất cho mọi trang: trang Tế Bào, Vào Ty Thể, thư viện, lộ trình chủ đề, AR và 54 bài thư viện.
Kính lỏng ở web chỉ là phỏng theo: nền mờ (backdrop-filter) + bão hoà màu + viền sáng bên trong + bóng mềm,
góc bo lớn, nút dạng viên thuốc. Không có khúc xạ thật như trên thiết bị Apple.
Giao diện luôn sáng: khối @media dark bên dưới ghim lại đúng các giá trị sáng, kể cả khi máy đặt chế độ tối.
"""

def font_link(root='../'):
    """Phông tự lưu và token chung (design/house.css, sinh bởi tools/design.py). root: đường dẫn từ trang về gốc site."""
    return (f'<link rel="stylesheet" href="{root}design/house.css">'
            f'<link rel="icon" type="image/png" sizes="32x32" href="{root}design/logo/favicon-32.png"><link rel="apple-touch-icon" href="{root}design/logo/apple-touch-icon.png">')



# Kính lỏng v14: lấy từ token chung (--bg-*), có giá trị dự phòng khi house.css chưa tải. Tiết chế: nền đặc hơn, bỏ quầng màu.
TOKENS = """
  --lg-page:var(--bg-page,#F3EFE6);
  --lg-wash:linear-gradient(180deg,#FAFAFB 0%,#F2F2F5 100%);
  --lg-fill:rgba(255,255,255,.86);
  --lg-fill-strong:rgba(255,255,255,.95);
  --lg-blur:blur(20px) saturate(170%);
  --lg-stroke:rgba(255,255,255,.9);
  --lg-hair:var(--bg-hair,rgba(16,24,40,.10));
  --lg-shadow:var(--bg-sh-1,0 0 0 .5px rgba(16,24,40,.06),0 6px 18px -10px rgba(16,24,40,.28));
  --lg-shadow-lo:0 0 0 .5px rgba(16,24,40,.06),0 2px 8px -4px rgba(16,24,40,.18);
  --lg-inner:inset 0 1px 0 rgba(255,255,255,.9);
  --lg-r:var(--bg-r-lg,20px); --lg-r-md:var(--bg-r-md,14px); --lg-r-sm:var(--bg-r-sm,10px);
  --lg-font:var(--bg-font,"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);
  --lg-ink:var(--bg-ink,#1D1B16); --lg-ink2:var(--bg-ink2,#454A55); --lg-muted:var(--bg-ink3,#626773);
"""


def root(extra=''):
    """Biến chung + biến riêng của trang, ghim chế độ sáng."""
    body = TOKENS + extra + '  color-scheme:light;\n'
    return (':root,:root[data-theme]{' + body + '}\n'
            '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]),:root[data-theme]{' + body + '}}\n')


def glass(sel, r='var(--lg-r)', strong=False):
    fill = 'var(--lg-fill-strong)' if strong else 'var(--lg-fill)'
    return (f'{sel}{{background:{fill};-webkit-backdrop-filter:var(--lg-blur);backdrop-filter:var(--lg-blur);'
            f'border:1px solid var(--lg-stroke);box-shadow:var(--lg-shadow),var(--lg-inner);border-radius:{r}}}\n')


def _each(sel, pseudo):
    """'.btn,.chip' + ':hover' → '.btn:hover,.chip:hover' (bản cũ chỉ gắn vào phần tử cuối, làm mọi nút luôn bị thu nhỏ)."""
    return ','.join(x.strip() + pseudo for x in sel.split(','))


def pill_buttons(sel, primary_sel):
    """Nút dạng viên thuốc: nút thường là kính, nút chính là màu thương hiệu phẳng (chuẩn thành phần, docs/he-thiet-ke.md)."""
    return (f'{sel}{{border-radius:999px!important;background:var(--lg-fill);-webkit-backdrop-filter:var(--lg-blur);backdrop-filter:var(--lg-blur);'
            f'border:1px solid var(--lg-stroke)!important;box-shadow:var(--lg-shadow-lo),var(--lg-inner);color:var(--lg-ink);font-family:var(--lg-font);font-weight:600;transition:transform .15s ease,box-shadow .2s ease}}\n'
            f'{_each(sel, ":hover")}{{box-shadow:0 0 0 .5px rgba(15,23,42,.1),0 8px 22px -8px rgba(15,23,42,.25),var(--lg-inner)}}\n'
            f'{_each(sel, ":active")}{{transform:scale(.97)}}\n'
            f'{primary_sel}{{background:var(--bg-brand,#1D1B16)!important;color:#fff!important;border-color:transparent!important;'
            'box-shadow:0 6px 16px -10px rgba(29,27,22,.65)!important}\n')


BODY = ('body{background:var(--lg-wash)!important;background-attachment:fixed!important;color:var(--lg-ink);font-family:var(--lg-font);'
        '-webkit-font-smoothing:antialiased}\n')


# ---------- nền trang dạng tài liệu (trang chính, trang chủ đề) ----------

PAPER_CSS = """
html{background:var(--lg-wash),var(--lg-page);background-attachment:fixed}
body{background:transparent!important}
"""


def logo(root):
    """Dấu Sáng Ăn Khoai (mặt cậu bé vẽ sáp màu, design/logo/)."""
    return f'<img src="{root}design/logo/mark-128.webp" alt="" width="32" height="32">'


SITE_BAR_CSS = """
.sitebar{position:sticky;top:0;z-index:50;background:rgba(243,239,230,.86);-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);border-bottom:1px solid var(--bg-hair,rgba(16,24,40,.1));font-family:var(--bg-font)}
.sitebar .in{max-width:1240px;margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:16px;height:var(--bg-bar,56px)}
.sitebar .brand{display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;color:var(--bg-ink,#1D1B16);text-decoration:none;min-height:44px;min-width:44px;letter-spacing:-.01em;flex:none}
.sitebar .brand img{width:32px;height:32px;display:block}
.sitebar .crumbs{display:flex;align-items:center;gap:8px;min-width:0;color:var(--bg-ink3,#626773);font-size:15px}
.sitebar .crumbs a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}.sitebar .crumbs a:hover{color:var(--bg-ink)}
.sitebar .crumbs b{color:var(--bg-ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sitebar nav{display:flex;gap:2px;margin-left:auto;overflow-x:auto;scrollbar-width:none}
.sitebar nav a{display:flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;text-decoration:none;font-weight:600;color:var(--bg-ink2,#454A55);white-space:nowrap}
.sitebar nav a:hover{background:var(--bg-hair)}
@media (max-width:760px){.sitebar .in{padding:0 12px;gap:8px}.sitebar .brand span,.sitebar nav{display:none}.sitebar .crumbs{font-size:15px}}
"""


def site_bar(root, crumbs=()):
    """Thanh trên của trang mục: logo về trang chính, đường dẫn hiện tại, các mục chính. crumbs: [(chữ, href hoặc None)]."""
    cr = ''.join((f'<span aria-hidden="true">/</span><a href="{h}">{t}</a>' if h else f'<span aria-hidden="true">/</span><b>{t}</b>') for t, h in crumbs)
    nav = ''.join(f'<a href="{root}{h}">{t}</a>' for t, h in (('Bài học', '#bai-hoc'), ('Lộ trình', '#lo-trinh'), ('Thư viện', 'thu-vien/'), ('Cho giáo viên', '#cho-giao-vien')))
    return (f'<header class="sitebar"><div class="in"><a class="brand" href="{root}" aria-label="Sáng Ăn Khoai, trang chính">{logo(root)}<span>Sáng Ăn Khoai</span></a>'
            f'<div class="crumbs">{cr}</div><nav aria-label="Mục chính">{nav}</nav></div></header>')
