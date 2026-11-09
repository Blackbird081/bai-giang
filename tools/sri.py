#!/usr/bin/env python3
"""Mã băm toàn vẹn (SRI, sha384) cho tệp tải từ CDN, và import map three.js (tự lưu) có khoá "integrity".

three.js 0.180.0 tự lưu ở vendor/three@0.180.0/ (bản .min chính thức của gói npm, cùng mã với bản đầy đủ, nhẹ hơn một nửa
khi nén): cùng nguồn với trang nên không phụ thuộc CDN bên thứ ba (mạng trường hay chặn), một kết nối, nằm trong bộ nhớ đệm
của site (sw.js). Import map dùng đường dẫn tương đối tới gốc site, tính theo vị trí trang.
  python3 tools/sri.py <trang.html> …   thay import map three.js trong trang (đường dẫn tương đối theo vị trí tệp)
  python3 tools/sri.py --check          tệp tự lưu trùng từng byte với bản jsDelivr; mã băm CDN còn khớp
Trình duyệt chưa hiểu khoá "integrity" của import map (Chrome < 127, Safari < 18) bỏ qua nó, bài vẫn chạy.
"""
import base64, hashlib, json, pathlib, re, sys, urllib.request

J = 'https://cdn.jsdelivr.net/npm/'
T = J + 'three@0.180.0/'
ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = 'vendor/three@0.180.0/'
# tệp three.js trang dùng (đúng tập này: addon không import gì ngoài three, three/tsl, three/webgpu và GaussianBlurNode cạnh nó)
LOCAL = ['build/three.webgpu.min.js', 'build/three.core.min.js', 'build/three.tsl.min.js', 'examples/jsm/controls/OrbitControls.js',
         'examples/jsm/environments/RoomEnvironment.js', 'examples/jsm/objects/SkyMesh.js', 'examples/jsm/tsl/display/BloomNode.js',
         'examples/jsm/tsl/display/DepthOfFieldNode.js', 'examples/jsm/tsl/display/GaussianBlurNode.js', 'examples/jsm/tsl/display/GTAONode.js',
         'examples/jsm/utils/BufferGeometryUtils.js']
HASH = {
    J + 'peerjs@1.5.4/dist/peerjs.min.js': 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR',
    J + 'qrcode-generator@1.4.4/qrcode.js': 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k',
    J + '@google/model-viewer@3.5.0/dist/model-viewer.min.js': 'sha384-Ftcjj/GNLxPvzNDftO/oryXB9aGxsGZY9JGqsXG0uUKgQDl9RfDgsx9NJ/4IVNPe',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js': 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1',
}


def importmap(root):
    """Import map three.js dùng chung cho Tế Bào, Ty Thể, Cổ Loa, Neuron. root: đường dẫn từ trang về gốc site ('../')."""
    V = root + VENDOR
    m = {'imports': {'three': V + 'build/three.webgpu.min.js', 'three/webgpu': V + 'build/three.webgpu.min.js',
                     'three/tsl': V + 'build/three.tsl.min.js', 'three/addons/': V + 'examples/jsm/'},
         'integrity': {V + f: sha((ROOT / VENDOR / f).read_bytes()) for f in LOCAL}}
    body = json.dumps(m, indent=1, ensure_ascii=False)
    return '<script type="importmap">\n' + body + '\n</script>'


def fix(s, root):
    """Thay import map three.js trong một trang. Trả (chuỗi mới, số chỗ thay)."""
    return re.subn(r'<script type="importmap">\s*\{\s*"imports":\s*\{\s*"three":.*?</script>', lambda _: importmap(root), s, flags=re.S)


def root_of(path):
    """Đường dẫn tương đối từ thư mục chứa tệp về gốc kho ('' nếu ở gốc)."""
    d = pathlib.Path(path).resolve().parent.relative_to(ROOT)
    return '../' * len(d.parts)


def sha(b):
    return 'sha384-' + base64.b64encode(hashlib.sha384(b).digest()).decode()


if __name__ == '__main__':
    if '--check' in sys.argv:
        bad = 0
        for f in LOCAL:
            same = (ROOT / VENDOR / f).read_bytes() == urllib.request.urlopen(T + f, timeout=60).read()
            bad += not same
            print(('ok  ' if same else 'SAI ') + VENDOR + f + ('' if same else ' khác bản ' + T + f))
        for u, h in HASH.items():
            got = sha(urllib.request.urlopen(u, timeout=60).read())
            ok = got == h; bad += not ok
            print(('ok  ' if ok else 'SAI ') + u + ('' if ok else f'\n    đang ghi {h}\n    CDN trả  {got}'))
        sys.exit(1 if bad else 0)
    for f in sys.argv[1:]:
        s = pathlib.Path(f).read_text(encoding='utf-8'); s, n = fix(s, root_of(f))
        pathlib.Path(f).write_text(s, encoding='utf-8'); print(f, n)
