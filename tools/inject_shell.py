#!/usr/bin/env python3
"""Nhúng vỏ Bài Giảng (shell/bg-shell.js) vào trang bài học, giữa hai dấu <!--BG-SHELL:start--> và <!--BG-SHELL:end-->.
Chạy lại bao nhiêu lần cũng được: khối cũ được thay. Khối được đặt trước <script type="module"> đầu tiên để BGShell có sẵn
khi mã của bài chạy. Dùng:  python3 tools/inject_shell.py te-bao/index.html ty-the/index.html
"""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHELL = (ROOT / 'shell/bg-shell.js').read_text(encoding='utf-8')
BLOCK = '<!--BG-SHELL:start-->\n<script>\n' + SHELL + '</script>\n<!--BG-SHELL:end-->\n'


def inject(html: str) -> str:
    html = re.sub(r'<!--BG-SHELL:start-->.*?<!--BG-SHELL:end-->\n?', '', html, flags=re.S)
    for anchor in ('<script type="importmap">', '<script type="module">', '</body>'):
        i = html.find(anchor)
        if i >= 0: return html[:i] + BLOCK + html[i:]
    raise SystemExit('không tìm thấy chỗ nhúng')


if __name__ == '__main__':
    for f in sys.argv[1:]:
        p = pathlib.Path(f); p.write_text(inject(p.read_text(encoding='utf-8')), encoding='utf-8'); print('đã nhúng vỏ vào', f)
