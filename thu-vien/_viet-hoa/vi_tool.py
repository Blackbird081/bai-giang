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
