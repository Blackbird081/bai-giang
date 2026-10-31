#!/usr/bin/env python3
"""Nhúng vỏ Bài Giảng (shell/bg-shell.js, đã rút gọn) vào trang bài học, giữa <!--BG-SHELL:start--> và <!--BG-SHELL:end-->.

Cùng lúc đặt:
  <meta name="bg-root">  đường dẫn từ bài về gốc site (phông, trang chính, bài tiếp theo)
  window.BG_SEQ          vị trí của bài trong site (tools/chuoi_bai.py): chủ đề, bài tiếp theo, ảnh bìa
  #bgs-load              màn tải có ảnh bìa ngay đầu <body>, hiện trước khi mã nặng của bài chạy; vỏ gỡ khi cảnh sẵn sàng
Chạy lại bao nhiêu lần cũng được: khối cũ được thay. Dùng:
  python3 tools/inject_shell.py te-bao/index.html ty-the/index.html
  python3 tools/inject_shell.py --adapter=thu-vien thu-vien/*-step.html
  python3 tools/inject_shell.py --root=https://nclamvn.github.io/bai-giang/ --as=te-bao/index.html out.html   (bản đăng lên Claude)
"""
import html as H, json, os, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from chuoi_bai import SEQ  # noqa: E402
import design as D  # noqa: E402

ESBUILD = ROOT / 'tools/robotics/node_modules/esbuild/bin/esbuild'
_MIN = {}


def minify(src, name):
    if name in _MIN: return _MIN[name]
    try:
        out = subprocess.run([str(ESBUILD), '--minify', '--loader=js', '--charset=utf8'], input=src.encode(), capture_output=True, check=True).stdout.decode()
    except Exception as e:  # không có esbuild: dùng bản gốc
        print('cảnh báo: không rút gọn được', name, e, file=sys.stderr); out = src
    _MIN[name] = out; return out


def shell_js():
    # thụt lề trong chuỗi CSS/HTML không có nghĩa: bỏ trước khi rút gọn mã
    return minify(re.sub(r'\n[ \t]+', '\n', (ROOT / 'shell/bg-shell.js').read_text(encoding='utf-8')), 'shell')


def adapter_js(name):
    return minify((ROOT / f'shell/adapter-{name}.js').read_text(encoding='utf-8'), name)


def rel_root(key):
    d = pathlib.PurePosixPath(key).parent
    return '../' * len(d.parts) if d.parts else './'


def block(adapter, seq):
    extra = ('<script>' + adapter_js(adapter) + '</script>\n') if adapter else ''
    s = f'<script>window.BG_SEQ={json.dumps(seq, ensure_ascii=False)};</script>\n' if seq else ''
    return '<!--BG-SHELL:start-->\n' + s + '<script>' + shell_js() + '</script>\n' + extra + '<!--BG-SHELL:end-->\n'


def loader(seq, root):
    if not seq: return ''
    cover = root + seq['cover']
    t = H.escape(seq['title'])
    return ('<!--BG-LOAD:start--><div id="bgs-load" role="progressbar" aria-label="Đang tải bài" style="position:fixed;inset:0;z-index:2147483600;'
            f'background:#E9EAEE url(\'{cover}\') center/cover no-repeat;display:flex;align-items:flex-end;justify-content:center;padding:0 16px max(10vh,72px);transition:opacity .6s cubic-bezier(.2,.8,.2,1)">'
            '<div style="width:min(360px,100%);padding:14px 18px 16px;border-radius:16px;background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);'
            'box-shadow:0 18px 44px -18px rgba(16,24,40,.4);font:600 17px/1.35 \'Be Vietnam Pro\',system-ui,sans-serif;color:#15171C">'
            f'<div style="font-size:13px;font-weight:500;color:#626773">Đang dựng cảnh 3D</div><div>{t}</div>'
            '<div style="height:4px;border-radius:2px;background:rgba(16,24,40,.1);margin-top:12px;overflow:hidden"><i style="display:block;height:100%;width:38%;border-radius:2px;background:#1E2A44;animation:bgsl 1.3s cubic-bezier(.65,0,.35,1) infinite"></i></div></div>'
            '<style>@keyframes bgsl{from{transform:translateX(-100%)}to{transform:translateX(270%)}}#bgs-load.out{opacity:0;pointer-events:none}@media (prefers-reduced-motion:reduce){#bgs-load i{animation:none;width:100%!important;opacity:.35}}</style></div><!--BG-LOAD:end-->')


def patch_free_rect(html: str) -> str:
    """Bài thư viện: hàm khung trống của cảnh 3D gọi __bgL/__bgR/__bgB (adapter-thu-vien.js) để đúng trên điện thoại, máy tính bảng."""
    if '__bgL()' in html: return html
    pl = re.compile(r'(\w+)&&!\1\.classList\.contains\("collapsed"\)\?\1\.getBoundingClientRect\(\)\.right:0')
    pr = re.compile(r'(\w+)&&!\1\.classList\.contains\("collapsed"\)\?\1\.getBoundingClientRect\(\)\.left:(\w+)')
    pb = re.compile(r'b:\((\w+)\?\1\.getBoundingClientRect\(\)\.top:(\w+)-44\)-4')
    html, a = pl.subn('(window.__bgL?__bgL():0)', html, count=1)
    html, b = pr.subn(lambda m: f'(window.__bgR?__bgR({m.group(2)}):{m.group(2)})', html, count=1)
    html, c = pb.subn(lambda m: f'b:(window.__bgB?__bgB({m.group(1)}?{m.group(1)}.getBoundingClientRect().top:{m.group(2)}-44):({m.group(1)}?{m.group(1)}.getBoundingClientRect().top:{m.group(2)}-44))-4', html, count=1)
    assert (a, b, c) == (1, 1, 1), f'không vá được khung trống: {(a, b, c)}'
    return html


def inject(html: str, adapter=None, key=None, root=None) -> str:
    seq = SEQ.get(key) if key else None
    root = root or (rel_root(key) if key else '../')
    if adapter == 'thu-vien': html = patch_free_rect(html)
    html = re.sub(r'<!--BG-SHELL:start-->.*?<!--BG-SHELL:end-->\n?', '', html, flags=re.S)
    html = re.sub(r'<!--BG-LOAD:start-->.*?<!--BG-LOAD:end-->', '', html, flags=re.S)
    html = re.sub(r'<meta name="bg-root"[^>]*>\n?', '', html)
    html = re.sub(r'<!--BG-TOKENS:start-->.*?<!--BG-TOKENS:end-->\n?', '', html, flags=re.S)
    # token và phông có sẵn trong <head> để chữ đúng ngay khung hình đầu, trước khi mã của vỏ chạy
    head = f'<meta name="bg-root" content="{root}">\n<!--BG-TOKENS:start--><style id="bg-tokens">' + D.fontface(root=root + 'design/fonts/') + D.tokens_css() + '</style><!--BG-TOKENS:end-->\n'
    html = html.replace('<head>', '<head>\n' + head, 1) if '<head>' in html else re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + head, html, count=1)
    m = re.search(r'<body[^>]*>', html)
    if m and seq: html = html[:m.end()] + loader(seq, root) + html[m.end():]
    BLOCK = block(adapter, seq)
    for anchor in ('<script type="importmap">', '<script type="module">', '</body>'):
        i = html.find(anchor, m.end() if m else 0)
        if i >= 0: return html[:i] + BLOCK + html[i:]
    raise SystemExit('không tìm thấy chỗ nhúng')


def key_of(p: pathlib.Path):
    try: return p.resolve().relative_to(ROOT).as_posix()
    except ValueError: return None


if __name__ == '__main__':
    args = sys.argv[1:]; adapter = None; root = None; as_key = None
    while args and args[0].startswith('--'):
        a = args.pop(0)
        if a.startswith('--adapter='): adapter = a.split('=', 1)[1]
        elif a.startswith('--root='): root = a.split('=', 1)[1]
        elif a.startswith('--as='): as_key = a.split('=', 1)[1]
    for f in args:
        p = pathlib.Path(f)
        p.write_text(inject(p.read_text(encoding='utf-8'), adapter, as_key or key_of(p), root), encoding='utf-8')
    print(f'đã nhúng vỏ vào {len(args)} tệp' + (f' (bộ gắn {adapter})' if adapter else ''))
