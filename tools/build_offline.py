#!/usr/bin/env python3
"""Đóng gói bản offline một file: index.html + three.js (data URL trong import map) + dữ liệu ribosome nhúng sẵn.

Cách dùng:
  python3 tools/build_offline.py index.html ribosome.b64.txt <thư mục gói three@0.180.0> offline/hanh-trinh-te-bao-offline.html
  python3 tools/build_offline.py ty-the.html - <thư mục gói three@0.180.0> offline/vao-ty-the-offline.html
Thư mục gói three lấy từ `npm i three@0.180.0` (node_modules/three).
"""
import base64, json, re, sys, pathlib

src, data, three_dir, out = sys.argv[1:5]
T = pathlib.Path(three_dir)
version = json.loads((T / 'package.json').read_text())['version']
if version != '0.180.0':
    sys.exit(f'Cần three 0.180.0 để khớp với trang, đang có {version}')

# specifier -> (tệp, các thay thế import tương đối thành tên gói)
MODS = {
    'three/core': ('build/three.core.js', []),
    'three/webgpu': ('build/three.webgpu.js', [("'./three.core.js'", "'three/core'"), ('"./three.core.js"', '"three/core"')]),
    'three/tsl': ('build/three.tsl.js', []),
    'three/addons/controls/OrbitControls.js': ('examples/jsm/controls/OrbitControls.js', []),
    'three/addons/utils/BufferGeometryUtils.js': ('examples/jsm/utils/BufferGeometryUtils.js', []),
    'three/addons/environments/RoomEnvironment.js': ('examples/jsm/environments/RoomEnvironment.js', []),
    'three/addons/tsl/display/BloomNode.js': ('examples/jsm/tsl/display/BloomNode.js', []),
    'three/addons/tsl/display/GTAONode.js': ('examples/jsm/tsl/display/GTAONode.js', []),
    'three/addons/tsl/display/GaussianBlurNode.js': ('examples/jsm/tsl/display/GaussianBlurNode.js', []),
    'three/addons/tsl/display/DepthOfFieldNode.js': ('examples/jsm/tsl/display/DepthOfFieldNode.js', [("'./GaussianBlurNode.js'", "'three/addons/tsl/display/GaussianBlurNode.js'")]),
}
imports = {}
for spec, (rel, subs) in MODS.items():
    code = (T / rel).read_text(encoding='utf-8')
    for a, b in subs:
        if a in code: code = code.replace(a, b)
    # cổng: không còn import tương đối nào sót lại
    left = re.findall(r"""(?:from|import)\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]""", code)
    if left: sys.exit(f'{rel}: còn import tương đối {left}')
    imports[spec] = 'data:text/javascript;base64,' + base64.b64encode(code.encode('utf-8')).decode()
imports['three'] = imports['three/webgpu']

html = pathlib.Path(src).read_text(encoding='utf-8')
m = re.search(r'<script type="importmap">.*?</script>', html, re.S)
if not m: sys.exit('Không thấy import map trong trang')
used = set(re.findall(r"""['"](three(?:/[A-Za-z0-9_./-]+)?)['"]""", html))
missing = sorted(u for u in used if u not in imports and not u.endswith('/'))
if missing: sys.exit(f'Trang dùng module chưa được đóng gói: {missing}')
html = html[:m.start()] + '<script type="importmap">' + json.dumps({'imports': imports}) + '</script>' + html[m.end():]
b64 = ''
if data != '-':  # '-': trang đã tự nhúng dữ liệu (ví dụ ty-the.html)
    b64 = pathlib.Path(data).read_text().strip()
    if not re.fullmatch(r'[A-Za-z0-9+/=]+', b64): sys.exit('ribosome.b64.txt không phải base64 hợp lệ')
    emb = f'<script type="text/plain" id="ribo-b64">{b64}</script>\n'
    i = html.index('<script type="importmap">')
    html = html[:i] + emb + html[i:]
# phông tự lưu nhúng thẳng (bản offline không có thư mục design/), liên kết về trang chính trỏ tới site
ROOTDIR = pathlib.Path(__file__).resolve().parent.parent
def _font(m):
    f = ROOTDIR / 'design/fonts' / m.group(1)
    return 'url(data:font/woff2;base64,' + base64.b64encode(f.read_bytes()).decode() + ')'
html = re.sub(r"url\((?:\.\./)*design/fonts/([a-z0-9-]+\.woff2)\)", _font, html)
html = re.sub(r'<meta name="bg-root" content="[^"]*">', '<meta name="bg-root" content="https://nclamvn.github.io/bai-giang/">', html)
html = html.replace('<title>', '<meta name="offline-build" content="three ' + version + '">\n<title>', 1)
if not html.lstrip().lower().startswith('<!doctype'):
    html = '<!doctype html>\n<html lang="vi">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + html
pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True); pathlib.Path(out).write_text(html, encoding="utf-8")
print(f'{out}: {len(html.encode()) / 1e6:.1f} MB, {len(imports)} module, dữ liệu ribosome {len(b64) / 1e6:.1f} MB')
