#!/usr/bin/env python3
"""Nâng mọi cỡ chữ CSS nhỏ hơn ngưỡng lên ngưỡng (mặc định 13 px), trong font-size và trong font viết gọn.

Chuẩn của kế hoạch nâng cấp UI: chữ trên màn chiếu không dưới 13 px. Chỉ đụng tới khai báo CSS (có dấu hai chấm),
nên chữ vẽ trên canvas (ctx.font = '…') giữ nguyên. Dùng:  python3 tools/minfont.py [--min 13] tệp…
"""
import re, sys

FS = re.compile(r'(font-size\s*:\s*)(\d+(?:\.\d+)?)px')
SH = re.compile(r'(\bfont\s*:\s*(?:italic\s+|normal\s+)?(?:\$\{[^}]*\}\s+|\d{3}\s+|bold\s+|normal\s+)?)(\d+(?:\.\d+)?)px')


def fix(text, lo=13.0):
    n = [0]

    def up(m):
        v = float(m.group(2))
        if v < lo:
            n[0] += 1
            return f'{m.group(1)}{lo:g}px'
        return m.group(0)
    text = FS.sub(up, text)
    text = SH.sub(up, text)
    return text, n[0]


if __name__ == '__main__':
    a = sys.argv[1:]; lo = 13.0
    if a and a[0] == '--min': lo = float(a[1]); a = a[2:]
    for f in a:
        s = open(f, encoding='utf-8').read(); s2, n = fix(s, lo)
        if n: open(f, 'w', encoding='utf-8').write(s2)
        print(f, n, 'chỗ')
