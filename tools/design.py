#!/usr/bin/env python3
"""Sinh hệ thiết kế từ một nguồn: design/tokens.json và bộ biểu tượng dưới đây.

Ra:
  design/house.css     token (biến CSS --bg-*), phông tự lưu, lớp chữ và nút chung cho các trang dựng bằng Python
  design/icons.svg     sprite biểu tượng (dùng <svg><use href="design/icons.svg#i-home"/></svg>)
  shell/bg-shell.js    khối giữa /*TOKENS:start*/ và /*TOKENS:end*/ (token + biểu tượng nhúng sẵn cho mọi bài 3D)
Chạy: python3 tools/design.py
"""
import base64, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
T = json.loads((ROOT / 'design/tokens.json').read_text(encoding='utf-8'))

# Biểu tượng: lưới 24, nét 1,75, đầu tròn. Chỉ path, màu theo currentColor.
ICONS = {
    'home': '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    'chev-l': '<path d="m14.5 6-6 6 6 6"/>',
    'chev-r': '<path d="m9.5 6 6 6-6 6"/>',
    'arrow-r': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-l': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'play': '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    'stop': '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
    'phone': '<rect x="7" y="2.75" width="10" height="18.5" rx="2.5"/><path d="M11 18h2"/>',
    'screen': '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
    'full': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    'more': '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
    'close': '<path d="M6 6l12 12M18 6 6 18"/>',
    'list': '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.75" cy="6.5" r="1.1" fill="currentColor"/><circle cx="4.75" cy="12" r="1.1" fill="currentColor"/><circle cx="4.75" cy="17.5" r="1.1" fill="currentColor"/>',
    'chart': '<path d="M4 20V4M4 20h16"/><path d="m7.5 15 3.5-4 3 2.5 5-6.5"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    'sliders': '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    'book': '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>',
    'keys': '<rect x="2.75" y="6" width="18.5" height="12" rx="2"/><path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M7.5 14h9"/>',
    'projector': '<rect x="2.75" y="8" width="18.5" height="9" rx="2"/><circle cx="15.5" cy="12.5" r="2.25"/><path d="M6 12.5h4M6 17v2M18 17v2"/>',
    'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'filter': '<path d="M4 6h16M7 12h10M10 18h4"/>',
    'external': '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    'download': '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    'hand': '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.6 15.4a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
    'rotate': '<path d="M20 12a8 8 0 1 1-2.35-5.65M20 4v4.5h-4.5"/>',
    'pinch': '<path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/><path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4"/>',
    'tap': '<circle cx="12" cy="9" r="3"/><path d="M12 15v5M8.5 5.5a5 5 0 0 1 7 0"/>',
    'black': '<rect x="3" y="4.5" width="18" height="12" rx="2" fill="currentColor"/><path d="M8.5 20h7M12 16.5V20"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.6M12 17v.1"/>',
    'layers': '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
    'grad': '<path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.5 3.4 2.25 5.5 2.25s4-.75 5.5-2.25V11M21.5 9v5"/>',
    'spark': '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
}


def px(v):
    return f'{v}px'


def var_block(c, extra=''):
    out = []
    for k, v in c.items():
        out.append(f'--bg-{k}:{v}')
    return ';'.join(out) + extra


def tokens_css():
    C, S, R, M = T['color'], T['size'], T['radius'], T['motion']
    sub = ';'.join(f'--bg-s-{k}:{v}' for k, v in T['subject'].items())
    base = var_block(C) + ';' + sub + ';' + ';'.join(f'--bg-fs-{k}:calc({v}px * var(--bg-k))' for k, v in S.items())
    base += f";--bg-k:1;--bg-font:{T['font']['sans']};--bg-serif:{T['font']['serif']};--bg-mono:{T['font']['mono']}"
    base += ';' + ';'.join(f'--bg-r-{k}:{px(v)}' for k, v in R.items())
    base += f";--bg-sh-1:{T['shadow']['1']};--bg-sh-2:{T['shadow']['2']};--bg-blur:{T['blur']}"
    base += f";--bg-t-fast:{M['fast']}ms;--bg-t-mid:{M['mid']}ms;--bg-t-slow:{M['slow']}ms;--bg-ease:{M['out']};--bg-ease-io:{M['in-out']}"
    base += f";--bg-bar:{T['bar']['h']}px;--bg-tap:{T['tap']}px;--bg-accent:var(--bg-brand)"
    pj = T['projector']
    pjs = ';'.join(f'--bg-{k}:{val}' for k, val in pj.items() if k != 'scale') + f";--bg-k:{pj['scale']}"
    css = f':root{{{base}}}\n'
    css += f'@media (max-width:640px),(max-height:520px){{:root{{--bg-bar:{T["bar"]["h-phone"]}px;--bg-fs-xs:calc(14px * var(--bg-k))}}}}\n'
    css += f'html[data-chieu]{{{pjs}}}\n'
    css += '@media (prefers-reduced-motion:reduce){:root{--bg-t-fast:1ms;--bg-t-mid:1ms;--bg-t-slow:1ms}}\n'
    return css


def fontface(root_expr=None, root='fonts/'):
    """@font-face cho hai tập con (latin, tiếng Việt) mỗi độ đậm. root_expr: biểu thức JS cho thư mục phông khi nhúng vào vỏ."""
    out = []
    for fam, w, slug in T['fonts']:
        for sub in ('latin', 'vietnamese'):
            f = f'{slug}-{sub}-{w}-normal.woff2'
            url = f'url(${{{root_expr}}}{f})' if root_expr else f'url({root}{f})'
            out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:{url} format('woff2');unicode-range:{T['unicode'][sub]}}}")
    return '\n'.join(out)


def std_css(scope):
    """Chuẩn thành phần chung (docs/he-thiet-ke.md, mục Thành phần chuẩn). scope: 'body.bgs-on' cho bài 3D, 'html' cho trang dựng bằng Python.
    Chỉ đặt vai màu và chữ (nút chính, nút đang bật, ô chọn, vòng focus); kích thước và bố cục vẫn của từng bài."""
    S = scope
    PRI = ':is(.btn.primary,.btn.pri,.btn.gold,.btn.cta)'
    ON = ':is(.btn.on,.btn.dark,.btn[aria-pressed="true"],.chip.on,.chip[aria-pressed="true"],.seg button.on,.sw button.on)'
    return (
        '/* chuẩn thành phần Sáng Ăn Khoai: sinh bằng tools/design.py, không sửa tay */\n'
        f'{S} :is(button,.btn,select){{font-family:var(--bg-font)}}\n'
        f'{S} .btn{{font-weight:600;letter-spacing:0;text-transform:none}}\n'
        # nút chính: một màu thương hiệu, phẳng, không chuyển sắc theo môn
        f'{S} {PRI}{{background:var(--bg-brand)!important;background-image:none!important;border-color:var(--bg-brand)!important;color:var(--bg-brand-ink)!important;'
        'box-shadow:none!important;text-shadow:none!important}\n'
        f'{S} {PRI}:hover:not(:disabled){{filter:brightness(1.18)}}\n'
        # đang bật, đang chọn: mực đậm
        f'{S} {ON}{{background:var(--bg-ink)!important;background-image:none!important;border-color:var(--bg-ink)!important;color:var(--bg-page)!important}}\n'
        f'{S} :is(input[type=range],input[type=checkbox],input[type=radio]){{accent-color:var(--bg-brand)}}\n'
        f'{S} :is(a,button,input,select,textarea,summary,[tabindex]):focus-visible{{outline:2px solid var(--bg-focus)!important;outline-offset:2px}}\n'
    )


HOUSE_EXTRA = """
/* lớp chung cho các trang dựng bằng Python (trang chính, chủ đề, lộ trình) */
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{font-family:var(--bg-font);color:var(--bg-ink);font-size:var(--bg-fs-sm);line-height:1.6;-webkit-font-smoothing:antialiased;font-feature-settings:"ss01" 0}
.bg-ico{width:20px;height:20px;flex:none;vertical-align:middle}
:focus-visible{outline:2px solid var(--bg-focus);outline-offset:2px;border-radius:6px}
.bg-num{font-family:var(--bg-mono);font-variant-numeric:tabular-nums}
.bg-serif{font-family:var(--bg-serif);font-weight:400;letter-spacing:-.015em}
h1,h2,h3{text-wrap:balance}
p,li{text-wrap:pretty}
/* màn cảm ứng (máy tính bảng, điện thoại): vùng chạm từ 44 px cho nút chữ và dòng mở rộng */
@media (pointer:coarse){a.btn,button.btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center}summary{padding-block:12px}h2>a:only-child,h3>a:only-child{display:inline-flex;align-items:center;min-height:44px}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important;scroll-behavior:auto!important}}

/* khung trang mục (body.bg-hub): một độ rộng, một mép trái, một thang tiêu đề, một nút chính, một kiểu mục thu gọn.
   Mép trái nội dung trùng mép logo trên thanh trên (1240 px, lề 24 px). Trang mục chỉ dùng các lớp dưới đây cho các vai này. */
:root{--bg-page-w:1240px;--bg-gutter:24px}
@media (max-width:640px){:root{--bg-gutter:16px}}
/* trang mục không dùng hộp đổ bóng: bóng của thẻ đổi thành một đường kẻ mảnh */
body.bg-hub{background:var(--bg-page);margin:0;--bg-sh-1:0 0 0 1px var(--bg-hair);--bg-sh-2:0 0 0 1px var(--bg-hair2)}
body.bg-hub :is(.wrap,.sitebar .in,.bg-frame){max-width:var(--bg-page-w);margin-inline:auto;padding-inline:var(--bg-gutter);box-sizing:border-box}
body.bg-hub h1{font:400 clamp(38px,5.2vw,68px)/1.06 var(--bg-serif);letter-spacing:-.028em;color:var(--bg-ink);text-wrap:balance}
body.bg-hub h1 em{font-style:normal;color:inherit}
body.bg-hub h1.bg-display{font-size:clamp(44px,7vw,96px);line-height:1.04;letter-spacing:-.03em}
body.bg-hub .bg-eyebrow{display:block;font:400 13px/1.4 var(--bg-font);letter-spacing:.01em;color:var(--bg-ink3);text-transform:none}
body.bg-hub .bg-lead{font-size:var(--bg-fs-md);line-height:1.6;color:var(--bg-ink2);max-width:62ch}
body.bg-hub .bg-h2{font:400 clamp(26px,3.2vw,40px)/1.12 var(--bg-serif);letter-spacing:-.02em;color:var(--bg-ink);margin:0}
body.bg-hub .bg-h3{font:400 var(--bg-fs-xl)/1.2 var(--bg-serif);letter-spacing:-.012em;color:var(--bg-ink);margin:0}
.bg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 22px;border-radius:var(--bg-r-sm);border:1px solid var(--bg-brand);background:var(--bg-brand);color:var(--bg-brand-ink);font:500 15px/1 var(--bg-font);letter-spacing:0;text-decoration:none;white-space:nowrap;cursor:pointer;box-shadow:none;transition:filter var(--bg-t-fast) var(--bg-ease),background-color var(--bg-t-fast) var(--bg-ease)}
.bg-btn:hover:not(:disabled){filter:brightness(1.18)}
.bg-btn.ghost{background:transparent;color:var(--bg-ink);border-color:var(--bg-hair2)}
.bg-btn.ghost:hover:not(:disabled){filter:none;background:var(--bg-surface);border-color:var(--bg-ink3)}
.bg-tl{display:inline-flex;align-items:center;min-height:44px;font-weight:500;color:var(--bg-ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:6px}
.bg-tl:hover{text-decoration-thickness:2px}
.bg-btn.sm{height:36px;padding:0 16px;font-size:14px}
.bg-btn:disabled{background:var(--bg-hair);border-color:transparent;color:var(--bg-ink3);cursor:not-allowed}
.bg-btn .bg-ico{width:18px;height:18px}
body.bg-hub details>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:36px;font:600 14px/1.3 var(--bg-font);color:var(--bg-ink2)}
body.bg-hub details>summary::-webkit-details-marker{display:none}
body.bg-hub details>summary::marker{content:""}
body.bg-hub details>summary::after{content:"";flex:none;width:7px;height:7px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform var(--bg-t-mid) var(--bg-ease);opacity:.75}
body.bg-hub details[open]>summary::after{transform:translateY(1px) rotate(-135deg)}
body.bg-hub details>summary:hover{color:var(--bg-ink)}
"""


def main():
    (ROOT / 'design').mkdir(exist_ok=True)
    house = '/* Sinh từ design/tokens.json bằng tools/design.py. Không sửa tay. */\n' + fontface() + '\n' + tokens_css() + HOUSE_EXTRA + std_css('html')
    (ROOT / 'design/house.css').write_text(house, encoding='utf-8')
    sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + ''.join(
        f'<symbol id="i-{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{v}</symbol>' for k, v in ICONS.items()) + '</svg>\n'
    (ROOT / 'design/icons.svg').write_text(sprite, encoding='utf-8')
    # khối nhúng vào vỏ: token, phông (đường dẫn tính lúc chạy theo gốc site), biểu tượng
    js = ('/*TOKENS:start*/\n  // sinh bằng tools/design.py từ design/tokens.json; không sửa tay\n'
          f'  const TOKENS_CSS = {json.dumps(tokens_css())};\n'
          f'  const FONTFACE = (root) => {{ const U = {json.dumps(T["unicode"])}; return {json.dumps([[f, w, slug] for f, w, slug in T["fonts"]])}.map(([f, w, s]) => [\'latin\', \'vietnamese\'].map((u) => `@font-face{{font-family:\'${{f}}\';font-style:normal;font-weight:${{w}};font-display:swap;src:url(${{root}}design/fonts/${{s}}-${{u}}-${{w}}-normal.woff2) format(\'woff2\');unicode-range:${{U[u]}}}}`).join(\'\\n\')).join(\'\\n\'); }};\n'
          f'  const ICON_PATHS = {json.dumps(ICONS, ensure_ascii=False)};\n'
          f'  const SUBJECT = {json.dumps(T["subject"])};\n'
          f'  const LOGO_SRC = "data:image/webp;base64,{base64.b64encode((ROOT / "design/logo/mark-96.webp").read_bytes()).decode()}";\n'
          '  /*TOKENS:end*/')
    p = ROOT / 'shell/bg-shell.js'
    s = p.read_text(encoding='utf-8')
    s2 = re.sub(r'/\*TOKENS:start\*/.*?/\*TOKENS:end\*/', lambda m: js, s, flags=re.S)
    if s2 == s and '/*TOKENS:start*/' not in s:
        raise SystemExit('bg-shell.js thiếu dấu /*TOKENS:start*/ … /*TOKENS:end*/')
    p.write_text(s2, encoding='utf-8')
    print('design/house.css', len(house), 'B · design/icons.svg', len(sprite), 'B · shell tokens cập nhật')


if __name__ == '__main__':
    main()
