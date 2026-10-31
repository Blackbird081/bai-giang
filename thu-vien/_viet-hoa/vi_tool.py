#!/usr/bin/env python3
"""Công cụ Việt hoá bản đóng gói của Tongjiang Lab.

  extract <repo>                 -> units.json  (đoạn chữ cần dịch, mỗi đoạn một id)
  check <bản dịch.json>          -> kiểm một tệp bản dịch {id: "tiếng Việt"}
  apply <repo> <thư mục bản dịch> <thư mục ra>  -> ghi 54 bài đã Việt hoá + báo cáo

Đơn vị dịch = một đoạn chữ liền trong một chuỗi JS: chứa ít nhất một chữ Hán, có thể lẫn chữ Latin, số,
dấu câu, biến ${...} đơn giản, thẻ đơn giản (<b>, <sub>...) và ký tự thoát (\\xB7, \\n). Không lấy chữ Hán
nằm trong chú thích /* */ hay // của mã.
"""
import re, sys, json, glob, hashlib, collections, pathlib

CJK = re.compile(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2e80-\u2fdf\u3400-\u4dbf]')
LIT = re.compile(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`')
TAG = r'</?(?:b|i|em|strong|sub|sup|br|small|u|mark|kbd|code)\s*/?>'
PH = r'\$\{[^{}`"\'\n]{1,60}\}'
ESC = r'\\x[0-9A-Fa-f]{2}|\\n|\\t'
SAFE = r'[A-Za-z0-9 ,.:;!?%()\[\]+\-*/=×÷·•→←↑↓↔⇌⇋≥≤≈≠±°℃℉~#&|^_@…—–“”‘’′″αβγδεθλμνπρστφωΔΩ∠∑√∞∝⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉⁺⁻]'
TOK = f'(?:{TAG}|{PH}|{ESC}|{CJK.pattern}|{SAFE})'
RUN = re.compile(f'{TOK}+')
dec = lambda t: re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), t)

def comment_spans(d):
    sp = [m.span() for m in re.finditer(r'/\*.*?\*/', d, re.S)]
    sp += [m.span() for m in re.finditer(r'(?<![:\'"\\])//[^\n]*', d)]
    return sp

def runs(d):
    cs = comment_spans(d)
    for m in RUN.finditer(d):
        a, b = m.span()
        if not CJK.search(m.group()): continue
        if any(x <= a < y for x, y in cs): continue
        t = m.group(); l = len(t) - len(t.lstrip()); r = len(t.rstrip())
        yield a + l, a + r, t.strip()

# Template lồng trong template mà bộ tách không với tới (thông báo lỗi cho lập trình viên): "（多了 ${...}）" -> "(thừa ${...})"
_ZH_HEAD = '`' + '\\uFF08\\u591A\\u4E86 '
_ZH_TAIL = '\\uFF09' + '`'
POSTFIX_RE = [(re.compile(re.escape(_ZH_HEAD) + r'(\$\{[^`]*?\})' + re.escape(_ZH_TAIL)), lambda m: '`(th\\u1eeba ' + m.group(1) + ')`')]
VI_CSS = """<style id="vi-fit">
/* Bản Việt hoá: phông chữ hỗ trợ tiếng Việt và bù độ dài chữ (chữ Việt dài hơn chữ Trung) */
:root{--font:"Segoe UI","Roboto","Helvetica Neue","Noto Sans","Arial",system-ui,sans-serif!important}
.subs .sub{min-width:0}
.subs .sub b{font-size:15px!important;line-height:1.18!important;overflow-wrap:anywhere}
.subs .sub span,.subs .sub small,.subs .sub i{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
.slh b{font-size:17px!important}
</style>
"""
# Quy tắc thuật ngữ áp lúc ghép (không sửa từng dòng dịch): bài gốc trích sách giáo khoa Trung Quốc (NXB Giáo dục Nhân dân).
# "SGK" trơn dễ bị hiểu là SGK Việt Nam, nên đổi thành "SGK gốc", trừ chỗ đã ghi rõ.
TERM_FIX = [(re.compile(r'\bSGK\b(?! ?(?:gốc|Nhân Giáo|Trung Quốc))'), 'SGK gốc')]
def term_fix(t):
    for rx, b in TERM_FIX: t = rx.sub(b, t)
    return t
FONT_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">'
MOBILE_CSS = '<style id="lg-mobile">\n/* Điện thoại và máy tính bảng dựng đứng: thanh trên gọn, hai bảng thành tấm trượt dưới, chuyển bằng thanh chọn Bước này / Điều khiển / Xem 3D */\n#mtabs{display:none}\n@media (max-width:700px),(orientation:portrait) and (max-width:1100px){\n  header#top{left:8px!important;right:8px!important;top:calc(6px + env(safe-area-inset-top))!important;width:auto!important;height:auto!important;padding:6px 8px!important;border-radius:18px!important}\n  header#top .row1{overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap!important;gap:8px}\n  header#top .row1::-webkit-scrollbar{display:none}\n  header#top h1{font-size:15px!important;white-space:nowrap}\n  header#top .chain5{display:none!important}\n  nav#steps{top:calc(52px + env(safe-area-inset-top))!important;left:8px!important;right:8px!important;width:auto!important;overflow-x:auto;scrollbar-width:none;border-radius:16px!important}\n  nav#steps::-webkit-scrollbar{display:none}\n  #eqb{left:50%!important;top:calc(98px + env(safe-area-inset-top))!important;transform:translateX(-50%) scale(.82)!important;transform-origin:top center;width:min(380px,108vw)!important;max-width:none!important}\n  aside#left,aside#right{left:8px!important;right:8px!important;width:auto!important;top:auto!important;bottom:calc(56px + env(safe-area-inset-bottom))!important;height:42svh!important;max-height:42svh!important;transform:none!important;border-radius:20px!important}\n  body:not(.m-right) aside#right,body.m-right aside#left,body.m-3d aside#left,body.m-3d aside#right{display:none!important}\n  aside .phead .fold{display:none!important}\n  footer#foot{left:8px!important;right:8px!important;width:auto!important;bottom:calc(6px + env(safe-area-inset-bottom))!important;height:auto!important;border-radius:18px!important}\n  footer#foot .foot2{display:none!important}\n  #mtabs{display:flex;position:fixed;z-index:60;left:50%;transform:translateX(-50%);bottom:calc(64px + 42svh + env(safe-area-inset-bottom));gap:2px;padding:3px;border-radius:999px;\n    background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,.9);\n    box-shadow:0 0 0 .5px rgba(15,23,42,.08),0 8px 22px -8px rgba(15,23,42,.25)}\n  body.m-3d #mtabs{bottom:calc(64px + env(safe-area-inset-bottom))}\n  #mtabs button{white-space:nowrap;border:0;background:transparent;padding:6px 13px;border-radius:999px;font:600 12.5px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;color:#1D1D1F;cursor:pointer}\n  #mtabs button[aria-pressed="true"]{background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.16),0 0 0 .5px rgba(15,23,42,.06)}\n}\n@media (orientation:portrait) and (min-width:701px) and (max-width:1100px){\n  aside#left,aside#right{left:50%!important;right:auto!important;width:min(680px,calc(100vw - 16px))!important;transform:translateX(-50%)!important;height:38svh!important;max-height:38svh!important}\n  #mtabs{bottom:calc(64px + 38svh + env(safe-area-inset-bottom))}\n  footer#foot{left:50%!important;right:auto!important;width:min(680px,calc(100vw - 16px))!important;transform:translateX(-50%)!important}\n}\n/* Điện thoại xoay ngang: cảnh 3D bên trái, bảng bên phải, thanh chọn ở góc dưới trái */\n@media (orientation:landscape) and (max-height:520px){\n  header#top{left:8px!important;right:calc(min(46vw,440px) + 16px)!important;top:calc(6px + env(safe-area-inset-top))!important;width:auto!important;height:auto!important;padding:6px 8px!important;border-radius:16px!important}\n  header#top .row1{overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap!important;gap:8px}\n  header#top .row1::-webkit-scrollbar{display:none}\n  header#top h1{font-size:14px!important;white-space:nowrap}\n  header#top .chain5,#eqb{display:none!important}\n  nav#steps{top:calc(50px + env(safe-area-inset-top))!important;left:8px!important;right:calc(min(46vw,440px) + 16px)!important;width:auto!important;overflow-x:auto;scrollbar-width:none;border-radius:14px!important}\n  nav#steps::-webkit-scrollbar{display:none}\n  aside#left,aside#right{left:auto!important;right:8px!important;width:min(46vw,440px)!important;top:calc(8px + env(safe-area-inset-top))!important;bottom:calc(56px + env(safe-area-inset-bottom))!important;height:auto!important;max-height:none!important;transform:none!important;border-radius:18px!important}\n  body:not(.m-right) aside#right,body.m-right aside#left,body.m-3d aside#left,body.m-3d aside#right{display:none!important}\n  aside .phead .fold{display:none!important}\n  footer#foot{left:auto!important;right:8px!important;width:min(46vw,440px)!important;bottom:calc(6px + env(safe-area-inset-bottom))!important;height:auto!important;border-radius:16px!important}\n  footer#foot .foot2{display:none!important}\n  #mtabs{display:flex;position:fixed;z-index:60;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));gap:2px;padding:3px;border-radius:999px;\n    background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);border:1px solid rgba(255,255,255,.9);\n    box-shadow:0 0 0 .5px rgba(15,23,42,.08),0 8px 22px -8px rgba(15,23,42,.25)}\n  #mtabs button{white-space:nowrap;border:0;background:transparent;padding:6px 12px;border-radius:999px;font:600 12.5px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;color:#1D1D1F;cursor:pointer}\n  #mtabs button[aria-pressed="true"]{background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.16),0 0 0 .5px rgba(15,23,42,.06)}\n}\n</style>\n'
MOBILE_JS = '<script id="lg-mobile-js">(()=>{const t=document.createElement(\'div\');t.id=\'mtabs\';t.setAttribute(\'role\',\'tablist\');t.setAttribute(\'aria-label\',\'Chọn bảng\');\nconst M=[[\'m-left\',\'Bước này\'],[\'m-right\',\'Điều khiển\'],[\'m-3d\',\'Xem 3D\']];\nconst set=k=>{document.body.classList.remove(\'m-left\',\'m-right\',\'m-3d\');document.body.classList.add(k);t.querySelectorAll(\'button\').forEach(b=>b.setAttribute(\'aria-pressed\',String(b.dataset.k===k)));for(const a of document.querySelectorAll(\'aside\'))a.classList.remove(\'collapsed\');};\nM.forEach(([k,l])=>{const b=document.createElement(\'button\');b.type=\'button\';b.dataset.k=k;b.textContent=l;b.onclick=()=>set(k);t.appendChild(b)});\nconst go=()=>{document.body.appendChild(t);set(\'m-left\')};document.readyState===\'loading\'?addEventListener(\'DOMContentLoaded\',go):go()})()</script>\n'
THEME_CSS = '<style id="lg-theme">\n/* Giao diện chung của dự án: nền trắng, kính lỏng (tools/liquid_glass.py). Chỉ đổi màu nền, vật liệu kính, bo góc, phông; không đổi mô hình hay số liệu. */\n:root,:root[data-theme]{\n  --lg-page:#F5F5F7;\n  --lg-wash:radial-gradient(1100px 560px at 6% -12%, rgba(120,170,255,.13), transparent 62%),\n            radial-gradient(900px 520px at 104% -6%, rgba(255,160,190,.10), transparent 60%),\n            radial-gradient(1200px 700px at 50% 118%, rgba(140,220,210,.09), transparent 62%),\n            linear-gradient(180deg,#FCFCFD 0%,#F3F3F6 100%);\n  --lg-fill:linear-gradient(180deg,rgba(255,255,255,.78) 0%,rgba(255,255,255,.6) 100%);\n  --lg-fill-strong:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.8) 100%);\n  --lg-blur:blur(28px) saturate(185%);\n  --lg-stroke:rgba(255,255,255,.92);\n  --lg-hair:rgba(15,23,42,.08);\n  --lg-shadow:0 0 0 .5px rgba(15,23,42,.07),0 1px 2px rgba(15,23,42,.05),0 14px 36px -12px rgba(15,23,42,.20);\n  --lg-shadow-lo:0 0 0 .5px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.05),0 6px 16px -8px rgba(15,23,42,.18);\n  --lg-inner:inset 0 1px 0 rgba(255,255,255,.96),inset 0 -1px 0 rgba(255,255,255,.4);\n  --lg-r:24px; --lg-r-md:18px; --lg-r-sm:14px;\n  --lg-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Inter","Segoe UI",Roboto,"Helvetica Neue","Noto Sans",Arial,system-ui,sans-serif;\n  --lg-ink:#1D1D1F; --lg-ink2:#424245; --lg-muted:#6E6E73;\n\n  --tint:#F5F5F7;\n  --ink:#1D1D1F; --ink2:#424245; --ink3:#6E6E73;\n  --line:rgba(15,23,42,.08); --line-soft:rgba(15,23,42,.05); --line-2:rgba(15,23,42,.2);\n  --glass:rgba(255,255,255,.72); --glass-2:rgba(255,255,255,.64); --glass-bar:rgba(255,255,255,.66);\n  --glass-back:rgba(255,255,255,.86); --glass-solid:rgba(255,255,255,.88); --white-92:rgba(255,255,255,.9);\n  --glass-blur:blur(28px) saturate(185%);\n  --glass-edge:1px solid rgba(255,255,255,.92);\n  --glass-glow:inset 0 1px 0 rgba(255,255,255,.96),inset 0 -1px 0 rgba(255,255,255,.4);\n  --shadow-1:0 0 0 .5px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.05),0 6px 16px -8px rgba(15,23,42,.16);\n  --shadow-2:0 0 0 .5px rgba(15,23,42,.07),0 2px 6px rgba(15,23,42,.05),0 18px 44px -14px rgba(15,23,42,.22);\n  --shade-1:rgba(15,23,42,.08); --shade-2:rgba(15,23,42,.22);\n  --r-card:16px; --r-ctrl:14px; --r-panel:24px;\n  --font:var(--lg-font)!important;\n  --num:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Helvetica Neue",system-ui,sans-serif;\n  color-scheme:light;\n}\n@media (prefers-color-scheme: dark){:root:not([data-theme="light"]),:root[data-theme]{\n  --lg-page:#F5F5F7;\n  --lg-wash:radial-gradient(1100px 560px at 6% -12%, rgba(120,170,255,.13), transparent 62%),\n            radial-gradient(900px 520px at 104% -6%, rgba(255,160,190,.10), transparent 60%),\n            radial-gradient(1200px 700px at 50% 118%, rgba(140,220,210,.09), transparent 62%),\n            linear-gradient(180deg,#FCFCFD 0%,#F3F3F6 100%);\n  --lg-fill:linear-gradient(180deg,rgba(255,255,255,.78) 0%,rgba(255,255,255,.6) 100%);\n  --lg-fill-strong:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.8) 100%);\n  --lg-blur:blur(28px) saturate(185%);\n  --lg-stroke:rgba(255,255,255,.92);\n  --lg-hair:rgba(15,23,42,.08);\n  --lg-shadow:0 0 0 .5px rgba(15,23,42,.07),0 1px 2px rgba(15,23,42,.05),0 14px 36px -12px rgba(15,23,42,.20);\n  --lg-shadow-lo:0 0 0 .5px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.05),0 6px 16px -8px rgba(15,23,42,.18);\n  --lg-inner:inset 0 1px 0 rgba(255,255,255,.96),inset 0 -1px 0 rgba(255,255,255,.4);\n  --lg-r:24px; --lg-r-md:18px; --lg-r-sm:14px;\n  --lg-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Inter","Segoe UI",Roboto,"Helvetica Neue","Noto Sans",Arial,system-ui,sans-serif;\n  --lg-ink:#1D1D1F; --lg-ink2:#424245; --lg-muted:#6E6E73;\n\n  --tint:#F5F5F7;\n  --ink:#1D1D1F; --ink2:#424245; --ink3:#6E6E73;\n  --line:rgba(15,23,42,.08); --line-soft:rgba(15,23,42,.05); --line-2:rgba(15,23,42,.2);\n  --glass:rgba(255,255,255,.72); --glass-2:rgba(255,255,255,.64); --glass-bar:rgba(255,255,255,.66);\n  --glass-back:rgba(255,255,255,.86); --glass-solid:rgba(255,255,255,.88); --white-92:rgba(255,255,255,.9);\n  --glass-blur:blur(28px) saturate(185%);\n  --glass-edge:1px solid rgba(255,255,255,.92);\n  --glass-glow:inset 0 1px 0 rgba(255,255,255,.96),inset 0 -1px 0 rgba(255,255,255,.4);\n  --shadow-1:0 0 0 .5px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.05),0 6px 16px -8px rgba(15,23,42,.16);\n  --shadow-2:0 0 0 .5px rgba(15,23,42,.07),0 2px 6px rgba(15,23,42,.05),0 18px 44px -14px rgba(15,23,42,.22);\n  --shade-1:rgba(15,23,42,.08); --shade-2:rgba(15,23,42,.22);\n  --r-card:16px; --r-ctrl:14px; --r-panel:24px;\n  --font:var(--lg-font)!important;\n  --num:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Helvetica Neue",system-ui,sans-serif;\n  color-scheme:light;\n}}\nhtml,body{background:var(--lg-page)}\nbody{background:var(--lg-wash)!important;background-attachment:fixed!important;-webkit-font-smoothing:antialiased}\n</style>\n'
uid = lambda t: hashlib.sha1(t.encode('utf-8')).hexdigest()[:12]
tokens = lambda t, pat: sorted(re.findall(pat, t))

def extract(repo):
    cat = {c['slug']: c for c in json.load(open(f'{repo}/catalog.json'))}
    units = collections.OrderedDict(); where = collections.defaultdict(set)
    for f in sorted(glob.glob(f'{repo}/courses/*.html')):
        slug = pathlib.Path(f).stem; s = open(f, encoding='utf-8').read()
        for g in LIT.finditer(s):
            d = dec(next(x for x in g.groups() if x is not None) if any(x is not None for x in g.groups()) else '')
            if not CJK.search(d): continue
            for a, b, t in runs(d): units.setdefault(t, None); where[t].add(slug)
        # chữ Hán trong HTML ngoài script (tiêu đề...)
        head = s[:s.find('<script')] if '<script' in s else s
        for m in re.finditer(r'>([^<>]*[\u4e00-\u9fff][^<>]*)<', head):
            t = m.group(1).strip(); units.setdefault(t, None); where[t].add(slug)
    out = []
    for t in units:
        sl = sorted(where[t]); subj = sorted({cat[x]['subject'] for x in sl if x in cat})
        out.append({'id': uid(t), 'zh': t, 'n': len(sl), 'subj': subj[0] if len(subj) == 1 else 'common', 'lessons': sl[:4]})
    json.dump(out, open('units.json', 'w'), ensure_ascii=False, indent=0)
    c = collections.Counter(o['subj'] for o in out); ch = collections.Counter()
    for o in out: ch[o['subj']] += len(CJK.findall(o['zh']))
    print('đơn vị dịch:', len(out), dict(c)); print('chữ Hán:', dict(ch), 'tổng', sum(ch.values()))

def check_pair(zh, vi):
    errs = []
    if not isinstance(vi, str) or not vi.strip(): return ['rỗng']
    if CJK.search(vi): errs.append('còn chữ Hán hoặc dấu câu toàn khổ: ' + ''.join(sorted(set(CJK.findall(vi))))[:20])
    for name, pat in (('biến', PH), ('thẻ', TAG), ('ký tự thoát', ESC)):
        if tokens(zh, pat) != tokens(vi, pat): errs.append(f'{name} không khớp: {tokens(zh, pat)} → {tokens(vi, pat)}')
    if any(ch in vi for ch in '<>{}`"\'') and not re.fullmatch(f'(?:{TAG}|{PH}|[^<>{{}}`"\'])*', vi):
        errs.append('có ký tự cấm (< > {{ }} ` " \') ngoài thẻ/biến')
    if '\\' in re.sub(ESC, '', vi): errs.append('có dấu \\ lạ')
    if '\n' in vi: errs.append('có xuống dòng thật')
    return errs

def check(path, units_path='units.json'):
    U = {o['id']: o['zh'] for o in json.load(open(units_path))}
    T = json.load(open(path)); bad = {}
    for k, v in T.items():
        if k not in U: bad[k] = ['id không tồn tại']; continue
        e = check_pair(U[k], v)
        if e: bad[k] = e
    print(f'{path}: {len(T)} bản dịch, {len(bad)} lỗi')
    for k, e in list(bad.items())[:40]: print(' ', k, '|', U.get(k, '')[:50], '|', '; '.join(e))
    return bad

def enc(vi, quote):
    out = []
    for ch in vi:
        if ord(ch) > 126: out.append('\\u%04x' % ord(ch))
        else: out.append(ch)
    return ''.join(out)

def load_tr(paths):
    T = {}
    for p in paths:
        if p.endswith('.json'): T.update(json.load(open(p, encoding='utf-8'))); continue
        for line in open(p, encoding='utf-8'):
            line = line.rstrip('\n')
            if not line or line.startswith('#') or '\t' not in line: continue
            k, v = line.split('\t', 1); T[k.strip()] = v
    return T

def checktsv(batch, paths):
    U = {o['id']: o['zh'] for o in json.load(open('units.json'))}
    want = [l.split('\t', 1)[0] for l in open(batch, encoding='utf-8') if l.strip() and not l.startswith('#')]
    T = load_tr(paths); bad = {}
    for k in want:
        if k not in T: bad[k] = ['chưa dịch']; continue
        e = check_pair(U[k], T[k])
        if e: bad[k] = e
    extra = [k for k in T if k not in U]
    print(f'{batch}: cần {len(want)}, đã có {sum(1 for k in want if k in T)}, lỗi/thiếu {len(bad)}, id lạ {len(extra)}')
    for k, e in list(bad.items())[:60]: print(' ', k, '|', U[k][:60], '|', '; '.join(e))
    return bad or extra

def apply(repo, tdir, outdir):
    U = json.load(open('units.json')); Z = {o['zh']: o['id'] for o in U}
    T = load_tr(sorted(glob.glob(f'{tdir}/*.json')) + sorted(glob.glob(f'{tdir}/*.tsv')))
    missing = [o for o in U if o['id'] not in T]
    pathlib.Path(outdir, 'courses').mkdir(parents=True, exist_ok=True)
    rep = {'thiếu': len(missing), 'bài': {}}
    for f in sorted(glob.glob(f'{repo}/courses/*.html')):
        slug = pathlib.Path(f).stem; s = open(f, encoding='utf-8').read(); n = 0; left = 0
        def fix_lit(g):
            nonlocal n, left
            raw = g.group(0); q = raw[0]; body = raw[1:-1]
            if '\\u' not in body and not CJK.search(body): return raw
            d = dec(body)
            if not CJK.search(d): return raw
            parts = []; last = 0
            for a, b, t in runs(d):
                vi = T.get(Z.get(t, ''), None)
                if vi is not None: vi = term_fix(vi)
                if vi is None: left += 1; continue
                parts.append((a, b, vi)); n += 1
            if not parts: return raw
            nd = ''; last = 0
            for a, b, vi in parts: nd += d[last:a] + vi; last = b
            nd += d[last:]
            # mã hoá lại: chỉ ký tự ngoài ASCII thành \\uXXXX; phần còn lại giữ nguyên như nguồn
            return q + enc(nd, q) + q
        s2 = LIT.sub(fix_lit, s)
        head_end = s2.find('<script')
        h = s2[:head_end]
        for m in re.finditer(r'>([^<>]*[\u4e00-\u9fff][^<>]*)<', h):
            t = m.group(1).strip(); vi = T.get(Z.get(t, '')); vi = term_fix(vi) if vi else vi
            if vi: h = h.replace(m.group(1), m.group(1).replace(t, vi), 1)
        s2 = h.replace('lang="zh-CN"', 'lang="vi"') + s2[head_end:]
        # hậu xử lý: template lồng trong template mà bộ tách không với tới (thông báo lỗi cho lập trình viên)
        for rx, b in POSTFIX_RE: s2 = rx.sub(b, s2)
        if '</head>' in s2 and 'id="vi-fit"' not in s2: s2 = s2.replace('</head>', VI_CSS + '</head>', 1)
        if '</head>' in s2 and 'id="lg-theme"' not in s2: s2 = s2.replace('</head>', THEME_CSS + FONT_LINK + '</head>', 1)
        s2 = re.sub(r'<style id="lg-mobile">.*?</style>\n?', '', s2, flags=re.S)  # thay khối cũ nếu có
        if '</head>' in s2: s2 = s2.replace('</head>', MOBILE_CSS + '</head>', 1)
        if '</body>' in s2 and 'id="lg-mobile-js"' not in s2: i = s2.rindex('</body>'); s2 = s2[:i] + MOBILE_JS + s2[i:]
        open(pathlib.Path(outdir, 'courses', slug + '.html'), 'w', encoding='utf-8').write(s2)
        rep['bài'][slug] = {'đã thay': n, 'còn sót': left}
    json.dump(rep, open(pathlib.Path(outdir, 'bao-cao-viet-hoa.json'), 'w'), ensure_ascii=False, indent=1)
    print('thiếu bản dịch:', len(missing), '| tổng thay:', sum(v['đã thay'] for v in rep['bài'].values()), '| còn sót:', sum(v['còn sót'] for v in rep['bài'].values()))

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'extract': extract(sys.argv[2])
    elif cmd == 'check': sys.exit(1 if check(sys.argv[2]) else 0)
    elif cmd == 'checktsv': sys.exit(1 if checktsv(sys.argv[2], sys.argv[3:]) else 0)
    elif cmd == 'apply': apply(sys.argv[2], sys.argv[3], sys.argv[4])
