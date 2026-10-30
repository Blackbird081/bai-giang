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


# ---------- Nền giấy kẻ ô chìm và giáo cụ nét mảnh ở góc (cho các trang dạng tài liệu: trang chính, trang chủ đề) ----------
import math as _m

PAPER_CSS = """
html{background:var(--lg-wash),var(--lg-page);background-attachment:fixed}
body{background:transparent!important}
.paper-grid{position:fixed;inset:0;z-index:-1;pointer-events:none;
  background-image:
    linear-gradient(to right,rgba(15,23,42,.048) 1px,transparent 1px),
    linear-gradient(to bottom,rgba(15,23,42,.048) 1px,transparent 1px),
    linear-gradient(to right,rgba(15,23,42,.024) 1px,transparent 1px),
    linear-gradient(to bottom,rgba(15,23,42,.024) 1px,transparent 1px);
  background-size:120px 120px,120px 120px,24px 24px,24px 24px;background-position:-1px -1px;
  -webkit-mask-image:radial-gradient(ellipse 85% 70% at 50% 35%,#000 35%,rgba(0,0,0,.35) 75%,transparent 100%);
          mask-image:radial-gradient(ellipse 85% 70% at 50% 35%,#000 35%,rgba(0,0,0,.35) 75%,transparent 100%)}
.decor{position:fixed;z-index:-1;pointer-events:none;color:#1D1D1F}
.decor svg{display:block;width:100%;height:auto;overflow:visible}
.decor .ln{fill:none;stroke:currentColor;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;opacity:.22}
.decor .hl{fill:none;stroke:#C2184A;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;opacity:.28}
.decor .tk{stroke:currentColor;stroke-width:.8;opacity:.2}
.decor .fl{fill:#C2184A;opacity:.05}
.decor .dot{fill:currentColor;opacity:.22}
.decor.tr{top:72px;right:-18px;width:min(330px,26vw)}
.decor.bl{bottom:-10px;left:-14px;width:min(340px,27vw)}
.decor.br{bottom:26px;right:28px;width:min(150px,12vw)}
@media (max-width:900px){.decor{opacity:.55}.decor.br{display:none}}
@media (max-width:640px){.decor{display:none}}
@media (prefers-reduced-motion:no-preference){.decor.br svg{animation:orb 60s linear infinite}@keyframes orb{to{transform:rotate(360deg)}}}
"""


def _protractor(cx, cy, r):
    out = [f'<path class="ln" d="M{cx-r} {cy} A{r} {r} 0 0 1 {cx+r} {cy} Z"/>',
           f'<path class="ln" d="M{cx-r*.62:.1f} {cy} A{r*.62:.1f} {r*.62:.1f} 0 0 1 {cx+r*.62:.1f} {cy}"/>']
    for d in range(0, 181, 5):
        a = _m.radians(d); L = .16 if d % 30 == 0 else .1 if d % 10 == 0 else .055
        x1, y1 = cx - r * _m.cos(a), cy - r * _m.sin(a); x2, y2 = cx - r * (1 - L) * _m.cos(a), cy - r * (1 - L) * _m.sin(a)
        out.append(f'<line class="tk" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    out.append(f'<circle class="dot" cx="{cx}" cy="{cy}" r="2.4"/><line class="tk" x1="{cx}" y1="{cy}" x2="{cx}" y2="{cy-r*.62:.1f}"/>')
    return ''.join(out)


def _ruler(x, y, w, h, n):
    out = [f'<rect class="ln" x="{x}" y="{y}" width="{w}" height="{h}" rx="3"/>']
    for i in range(1, n):
        xx = x + w * i / n; L = h * (.45 if i % 5 == 0 else .25)
        out.append(f'<line class="tk" x1="{xx:.1f}" y1="{y}" x2="{xx:.1f}" y2="{y+L:.1f}"/>')
    return ''.join(out)


def decor_html():
    # Góc trên phải: thước đo góc, com-pa và cung tròn vừa vẽ
    tr = ('<svg viewBox="0 0 330 300" aria-hidden="true">'
          + _protractor(185, 228, 118)
          + '<path class="hl" d="M58 118 A112 112 0 0 1 268 70" stroke-dasharray="3 5"/>'
          + '<g transform="rotate(-14 150 40)"><rect class="ln" x="143" y="10" width="14" height="22" rx="4"/><circle class="ln" cx="150" cy="40" r="8"/><circle class="dot" cx="150" cy="40" r="2"/>'
          + '<path class="ln" d="M145 47 L104 200"/><path class="ln" d="M155 47 L196 190"/><path class="ln" d="M104 200 l-2 12"/>'
          + '<path class="ln" d="M196 190 l6 4 l3 14 l-9 -6 z"/><path class="ln" d="M124 126 q26 -8 52 0"/></g>'
          + '<circle class="dot" cx="58" cy="118" r="2.2"/></svg>')
    # Góc dưới trái: bình tam giác, ê-ke, thước kẻ và bút chì
    bl = ('<svg viewBox="0 0 340 300" aria-hidden="true">'
          + '<g transform="translate(40 40)"><path class="ln" d="M38 0 h28 M42 0 v58 L4 156 q-4 12 10 12 h76 q14 0 10 -12 L62 58 v-58"/>'
          + '<path class="fl" d="M22 112 L82 112 L100 156 q4 12 -10 12 h-76 q-14 0 -10 -12 z"/><path class="hl" d="M22 112 q30 -8 60 0"/>'
          + '<circle class="ln" cx="40" cy="138" r="5"/><circle class="ln" cx="62" cy="126" r="3.4"/><circle class="ln" cx="54" cy="150" r="2.4"/>'
          + '<line class="tk" x1="46" y1="70" x2="56" y2="70"/><line class="tk" x1="46" y1="82" x2="54" y2="82"/><line class="tk" x1="46" y1="94" x2="56" y2="94"/></g>'
          + '<g transform="translate(150 70)"><path class="ln" d="M0 0 L0 170 L150 170 Z"/><path class="ln" d="M22 74 L22 148 L84 148 Z"/>'
          + ''.join(f'<line class="tk" x1="0" y1="{170 - i*10}" x2="{9 if i % 5 == 0 else 5}" y2="{170 - i*10}"/>' for i in range(1, 17)) + '</g>'
          + '<g transform="rotate(-8 170 268)">' + _ruler(40, 256, 270, 22, 27) + '</g>'
          + '<g transform="rotate(-38 250 110)"><path class="ln" d="M210 104 h108 l14 6 l-14 6 h-108 z"/><line class="tk" x1="210" y1="110" x2="318" y2="110"/><path class="hl" d="M318 104 l14 6 l-14 6"/></g>'
          + '</svg>')
    # Góc dưới phải: mô hình nguyên tử nhỏ
    br = ('<svg viewBox="0 0 150 150" aria-hidden="true"><g transform="translate(75 75)">'
          + '<ellipse class="ln" rx="62" ry="22"/><ellipse class="ln" rx="62" ry="22" transform="rotate(60)"/><ellipse class="ln" rx="62" ry="22" transform="rotate(-60)"/>'
          + '<circle class="fl" r="10" style="opacity:.12"/><circle class="hl" r="7"/><circle class="dot" cx="62" cy="0" r="3"/><circle class="dot" cx="-31" cy="-53.7" r="3"/><circle class="dot" cx="-31" cy="53.7" r="3"/></g></svg>')
    return ('<div class="paper-grid" aria-hidden="true"></div>'
            f'<div class="decor tr">{tr}</div><div class="decor bl">{bl}</div><div class="decor br">{br}</div>')
