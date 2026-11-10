#!/usr/bin/env python3
"""Ảnh nhỏ cho mục lục bài giảng trên trang chính: thu-vien/covers/nho/<tên>.webp, 264 × 198 (ô hiện 88 × 66 px, đủ nét ở màn 3x).

  python3 tools/anh_nho.py     dựng ảnh nhỏ cho mọi bìa trong FEATURED của tools/build_pages.py

Mục lục chỉ hiện ảnh 88 px; tải cả bìa 960–1200 px cho ô đó là thừa (8 dòng đầu ≈ 300 KB so với ≈ 40 KB ảnh nhỏ).
Chạy lại không làm ảnh trôi: mã băm của bìa nguồn ghi ở nho/nguon.json, bìa không đổi thì giữ nguyên ảnh nhỏ.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COV = ROOT / 'thu-vien/covers'
OUT = COV / 'nho'
W, H = 264, 198


def names():
    src = (ROOT / 'tools/build_pages.py').read_text(encoding='utf-8')
    block = src[src.index('FEATURED = ['):src.index(']\n', src.index('FEATURED = ['))]
    return re.findall(r"^\s*\('__L_[A-Z0-9_]+__', '([a-z0-9-]+)'", block, flags=re.M)


def main():
    OUT.mkdir(exist_ok=True)
    log_p = OUT / 'nguon.json'
    log = json.loads(log_p.read_text(encoding='utf-8')) if log_p.exists() else {}
    made = 0
    for n in names():
        src = COV / f'{n}.webp'
        h = hashlib.sha256(src.read_bytes()).hexdigest()[:16]
        dst = OUT / f'{n}.webp'
        if log.get(n) == h and dst.exists():
            continue
        from PIL import Image  # chỉ cần Pillow khi có bìa mới hoặc bìa đổi
        im = Image.open(src).convert('RGB')
        w, hh = im.size
        cw = min(w, hh * W // H); ch = cw * H // W  # cắt giữa về 4:3
        im = im.crop(((w - cw) // 2, (hh - ch) // 2, (w - cw) // 2 + cw, (hh - ch) // 2 + ch)).resize((W, H), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=76, method=6)
        log[n] = h; made += 1
    log_p.write_text(json.dumps(log, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    print(f'ảnh nhỏ: {len(names())} bìa, dựng mới {made}, tổng {sum(p.stat().st_size for p in OUT.glob("*.webp")) // 1024} KB')


if __name__ == '__main__':
    main()
