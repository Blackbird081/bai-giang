#!/usr/bin/env python3
"""Dựng bài "Neuron và xung thần kinh" (bản thử phong cách điện ảnh) từ tools/than-kinh.template.html.

  python3 tools/build_than_kinh.py      → than-kinh/index.html (import map three.js có mã băm, vỏ Sáng Ăn Khoai)
  than-kinh/?film                       ẩn vỏ và nút, dùng để kết xuất video theo từng khung (window.NEURON.renderAt)
"""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import sri, inject_shell  # noqa: E402

s = (ROOT / 'tools/than-kinh.template.html').read_text(encoding='utf-8')
s = s.replace('__IMPORTMAP__', sri.importmap())
s = inject_shell.inject(s, None, 'than-kinh/index.html')
out = ROOT / 'than-kinh/index.html'; out.parent.mkdir(exist_ok=True); out.write_text(s, encoding='utf-8')
print('đã dựng', out.relative_to(ROOT), f'({out.stat().st_size // 1024} KB)')
