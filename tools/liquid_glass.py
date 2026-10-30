"""Chuẩn giao diện chung: nền trắng, vật liệu kính lỏng (liquid glass) theo tinh thần iOS 27 và macOS 27.

Một nguồn duy nhất cho mọi trang: trang Tế Bào, Vào Ty Thể, thư viện, lộ trình chủ đề, AR và 54 bài thư viện.
Kính lỏng ở web chỉ là phỏng theo: nền mờ (backdrop-filter) + bão hoà màu + viền sáng bên trong + bóng mềm,
góc bo lớn, nút dạng viên thuốc. Không có khúc xạ thật như trên thiết bị Apple.
Giao diện luôn sáng: khối @media dark bên dưới ghim lại đúng các giá trị sáng, kể cả khi máy đặt chế độ tối.
"""

FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">')

TOKENS = """
  --lg-page:#F5F5F7;
  --lg-wash:radial-gradient(1100px 560px at 6% -12%, rgba(120,170,255,.13), transparent 62%),
            radial-gradient(900px 520px at 104% -6%, rgba(255,160,190,.10), transparent 60%),
            radial-gradient(1200px 700px at 50% 118%, rgba(140,220,210,.09), transparent 62%),
            linear-gradient(180deg,#FCFCFD 0%,#F3F3F6 100%);
  --lg-fill:linear-gradient(180deg,rgba(255,255,255,.78) 0%,rgba(255,255,255,.6) 100%);
  --lg-fill-strong:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.8) 100%);
  --lg-blur:blur(28px) saturate(185%);
  --lg-stroke:rgba(255,255,255,.92);
  --lg-hair:rgba(15,23,42,.08);
  --lg-shadow:0 0 0 .5px rgba(15,23,42,.07),0 1px 2px rgba(15,23,42,.05),0 14px 36px -12px rgba(15,23,42,.20);
  --lg-shadow-lo:0 0 0 .5px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.05),0 6px 16px -8px rgba(15,23,42,.18);
  --lg-inner:inset 0 1px 0 rgba(255,255,255,.96),inset 0 -1px 0 rgba(255,255,255,.4);
  --lg-r:24px; --lg-r-md:18px; --lg-r-sm:14px;
  --lg-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Inter","Segoe UI",Roboto,"Helvetica Neue","Noto Sans",Arial,system-ui,sans-serif;
  --lg-ink:#1D1D1F; --lg-ink2:#424245; --lg-muted:#6E6E73;
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


def pill_buttons(sel, primary_sel, accent, accent2):
    """Nút dạng viên thuốc: nút thường là kính, nút chính là màu nhấn có ánh sáng trên."""
    return (f'{sel}{{border-radius:999px!important;background:var(--lg-fill);-webkit-backdrop-filter:var(--lg-blur);backdrop-filter:var(--lg-blur);'
            f'border:1px solid var(--lg-stroke)!important;box-shadow:var(--lg-shadow-lo),var(--lg-inner);color:var(--lg-ink);font-family:var(--lg-font);font-weight:600;transition:transform .15s ease,box-shadow .2s ease}}\n'
            f'{sel}:hover{{box-shadow:0 0 0 .5px rgba(15,23,42,.1),0 8px 22px -8px rgba(15,23,42,.25),var(--lg-inner)}}\n'
            f'{sel}:active{{transform:scale(.97)}}\n'
            f'{primary_sel}{{background:linear-gradient(180deg,{accent} 0%,{accent2} 100%)!important;color:#fff!important;border-color:transparent!important;'
            f'box-shadow:0 8px 20px -8px {accent},inset 0 1px 0 rgba(255,255,255,.35),inset 0 -1px 0 rgba(0,0,0,.08)!important}}\n')


BODY = ('body{background:var(--lg-wash)!important;background-attachment:fixed!important;color:var(--lg-ink);font-family:var(--lg-font);'
        '-webkit-font-smoothing:antialiased}\n')
