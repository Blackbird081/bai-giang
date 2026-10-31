#!/usr/bin/env python3
"""Nhúng vỏ Bài Giảng (shell/bg-shell.js) vào trang bài học, giữa hai dấu <!--BG-SHELL:start--> và <!--BG-SHELL:end-->.
Chạy lại bao nhiêu lần cũng được: khối cũ được thay. Khối được đặt trước <script type="module"> đầu tiên để BGShell có sẵn
khi mã của bài chạy. Dùng:  python3 tools/inject_shell.py te-bao/index.html ty-the/index.html
      python3 tools/inject_shell.py --adapter=thu-vien thu-vien/*-step.html   (54 bài thư viện)
"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHELL = (ROOT / 'shell/bg-shell.js').read_text(encoding='utf-8')
ADAPTERS = {'thu-vien': (ROOT / 'shell/adapter-thu-vien.js').read_text(encoding='utf-8')}


def block(adapter=None):
    extra = ('<script>\n' + ADAPTERS[adapter] + '</script>\n') if adapter else ''
    return '<!--BG-SHELL:start-->\n<script>\n' + SHELL + '</script>\n' + extra + '<!--BG-SHELL:end-->\n'


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


def inject(html: str, adapter=None) -> str:
    BLOCK = block(adapter)
    if adapter == 'thu-vien': html = patch_free_rect(html)
    html = re.sub(r'<!--BG-SHELL:start-->.*?<!--BG-SHELL:end-->\n?', '', html, flags=re.S)
    for anchor in ('<script type="importmap">', '<script type="module">', '</body>'):
        i = html.find(anchor)
        if i >= 0: return html[:i] + BLOCK + html[i:]
    raise SystemExit('không tìm thấy chỗ nhúng')


if __name__ == '__main__':
    args = sys.argv[1:]; adapter = None
    if args and args[0].startswith('--adapter='): adapter = args.pop(0).split('=', 1)[1]
    for f in args:
        p = pathlib.Path(f); p.write_text(inject(p.read_text(encoding='utf-8'), adapter), encoding='utf-8')
    print(f'đã nhúng vỏ vào {len(args)} tệp' + (f' (bộ gắn {adapter})' if adapter else ''))
