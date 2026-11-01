#!/usr/bin/env python3
"""Dựng lại toàn bộ site Sáng Ăn Khoai theo đúng thứ tự, một lệnh.

  python3 tools/build_all.py            dựng tất cả (robotics cần `cd tools/robotics && npm ci` một lần)
  python3 tools/build_all.py --check    dựng rồi báo lỗi nếu tệp đã dựng trong git lệch với nguồn (CI dùng)
  python3 tools/build_all.py --skip=robotics,thu-vien

Thứ tự: token và phông → bài Tế Bào (ghép src/) → Ty Thể, Cổ Loa → robotics → 54 bài thư viện → trang mục.
Mọi bước chạy lại bao nhiêu lần cũng được. Ty Thể là bài viết tay một tệp: ty-the/index.html vừa là nguồn vừa là đầu ra;
chỉ các khối nhúng (vỏ, import map) được thay.
Bản offline không dựng ở đây: xem .github/workflows/offline-release.yml (đẩy thẻ offline-* để phát hành).
"""
import pathlib, subprocess, sys, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
PY = sys.executable

STEPS = [
    ('token', [[PY, 'tools/design.py']]),
    ('te-bao', [['bash', 'build.sh']]),
    ('ty-the', [[PY, 'tools/sri.py', 'ty-the/index.html'], [PY, 'tools/inject_shell.py', 'ty-the/index.html']]),
    ('co-loa', [[PY, 'tools/build_co_loa.py']]),
    ('robotics', [['node', 'build.mjs', '__cwd__tools/robotics'], [PY, 'tools/robotics/build_hub.py']]),
    ('thu-vien', [[PY, 'tools/house_thu_vien.py']]),
    ('trang-muc', [[PY, 'tools/build_ls10.py'], [PY, 'tools/build_pages.py']]),
]


def run(cmd):
    cwd = ROOT
    if cmd[-1].startswith('__cwd__'):
        cwd = ROOT / cmd[-1][7:]; cmd = cmd[:-1]
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    print('   ', out[-1] if out else '(xong)')
    if r.returncode:
        print('\n'.join(out[-30:]), file=sys.stderr)
        sys.exit(f'lỗi ở lệnh: {" ".join(cmd)}')


def main():
    skip = set()
    for a in sys.argv[1:]:
        if a.startswith('--skip='): skip |= set(a[7:].split(','))
    t0 = time.time()
    for name, cmds in STEPS:
        if name in skip: print(f'· bỏ qua {name}'); continue
        print(f'· {name}')
        for c in cmds: run(c)
    print(f'xong sau {time.time() - t0:.0f} giây')
    if '--check' in sys.argv:
        d = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if d:
            print('Tệp đã dựng lệch với nguồn (chạy python3 tools/build_all.py rồi commit):\n' + d, file=sys.stderr)
            subprocess.run(['git', '--no-pager', 'diff', '--stat'], cwd=ROOT)
            sys.exit(1)
        print('tệp đã dựng khớp với nguồn')


if __name__ == '__main__':
    main()
