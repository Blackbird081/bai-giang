#!/usr/bin/env python3
"""Mã băm toàn vẹn (SRI, sha384) cho mọi tệp tải từ CDN, và import map three.js có khoá "integrity".

Trình duyệt chỉ chạy tệp CDN khi nội dung khớp mã băm, nên CDN có bị tráo tệp cũng không chèn được mã lạ vào bài.
Mã băm đã đối chiếu giữa gói npm và bản jsDelivr/cdnjs thật (01/11/2026). Đổi phiên bản thì tính lại:
  python3 tools/sri.py --check      (tải lại từ CDN và so)
Trình duyệt chưa hiểu khoá "integrity" của import map (Chrome < 127, Safari < 18) bỏ qua nó, bài vẫn chạy.
"""
import base64, hashlib, json, re, sys, urllib.request

J = 'https://cdn.jsdelivr.net/npm/'
T = J + 'three@0.180.0/'
HASH = {
    T + 'build/three.webgpu.js': 'sha384-SkTLw/lN3jv1UIxteuivToEdXgaEiflmc3P+f8n+GoIqsbu3KE8adYoNlmTYWg0u',
    T + 'build/three.tsl.js': 'sha384-mTV2JED+dL4P7GN+ME+E4dwyCszzmZWF7VS6S/Y42R6oMgcD9K9bIQAZlxiyC5J7',
    T + 'build/three.core.js': 'sha384-r1q8Si7xFBrvMv3Q4yjQkKhkYZ2lp+wn/bPPzNZTsc8DY4uPJmm2vheuz1Yn+8m8',
    T + 'examples/jsm/controls/OrbitControls.js': 'sha384-tLl9+KfQJPCciIc85xSuJobNxPRrzSLDNrDFvDDTKE7fA9XvUq4UImkENfnQRUvW',
    T + 'examples/jsm/environments/RoomEnvironment.js': 'sha384-WonUB49tSHm5CcExDQcL5s5lZy4/MNADu2G8l7KoDzrZ7T3zKnU3JSic+kMfHWQU',
    T + 'examples/jsm/objects/SkyMesh.js': 'sha384-Ndo9sn3syj5Rbcb6XAwo+uLfL89l2Mtc6XtkT9FYR2ZXJz7vll8F2USUdTrd2jjd',
    T + 'examples/jsm/tsl/display/BloomNode.js': 'sha384-+yqj9lMYDxcuo7sz+GC8xoTVyFE+PkbhEf6To8Z1ToSpFpCQsILYqGXR6J98Kic7',
    T + 'examples/jsm/tsl/display/DepthOfFieldNode.js': 'sha384-vEUM7LTfQoSfRhLjiU5nzU2n/uC3pJA6QkBbaNs1qxC0QVCMMWDU4NWpvFCaJqXK',
    T + 'examples/jsm/tsl/display/GaussianBlurNode.js': 'sha384-sdwLh/+GDgeWs5eLoVAu2pHcooktwXrTgWmjPEU6jguATGgM2FU3l2s6EijkczPb',
    T + 'examples/jsm/tsl/display/GTAONode.js': 'sha384-w5pzloSXfpmnhPUjWhpashl6Xi6AUk6Gz+HceNkZCvU33r4Z4eK3+0fHeXB5IBGM',
    T + 'examples/jsm/utils/BufferGeometryUtils.js': 'sha384-Qy9m6qi71cTFsL476nB1aK+wPxxPgU6H6pn/++8gOgy4/vTtkDuFBfPo22hBhx36',
    J + 'peerjs@1.5.4/dist/peerjs.min.js': 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR',
    J + 'qrcode-generator@1.4.4/qrcode.js': 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k',
    J + '@google/model-viewer@3.5.0/dist/model-viewer.min.js': 'sha384-Ftcjj/GNLxPvzNDftO/oryXB9aGxsGZY9JGqsXG0uUKgQDl9RfDgsx9NJ/4IVNPe',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js': 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1',
}


def importmap():
    """Import map three.js dùng chung cho Tế Bào, Ty Thể, Cổ Loa."""
    m = {'imports': {'three': T + 'build/three.webgpu.js', 'three/webgpu': T + 'build/three.webgpu.js',
                     'three/tsl': T + 'build/three.tsl.js', 'three/addons/': T + 'examples/jsm/'},
         'integrity': {u: h for u, h in HASH.items() if u.startswith(T)}}
    body = json.dumps(m, indent=1, ensure_ascii=False)
    return '<script type="importmap">\n' + body + '\n</script>'


def fix(s):
    """Thay import map three.js trong một trang bằng bản có integrity. Trả (chuỗi mới, số chỗ thay)."""
    return re.subn(r'<script type="importmap">\s*\{\s*"imports":\s*\{\s*"three":\s*"' + re.escape(T) + r'.*?</script>', lambda _: importmap(), s, flags=re.S)


def sha(b):
    return 'sha384-' + base64.b64encode(hashlib.sha384(b).digest()).decode()


if __name__ == '__main__':
    if '--check' in sys.argv:
        bad = 0
        for u, h in HASH.items():
            got = sha(urllib.request.urlopen(u, timeout=60).read())
            ok = got == h; bad += not ok
            print(('ok  ' if ok else 'SAI ') + u + ('' if ok else f'\n    đang ghi {h}\n    CDN trả  {got}'))
        sys.exit(1 if bad else 0)
    for f in sys.argv[1:]:
        s = open(f, encoding='utf-8').read(); s, n = fix(s)
        open(f, 'w', encoding='utf-8').write(s); print(f, n)
