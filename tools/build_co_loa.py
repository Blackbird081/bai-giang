#!/usr/bin/env python3
"""Dựng trang Thành Cổ Loa (lich-su-10/co-loa/index.html) từ tools/co-loa.template.html.

Hình học ba vòng thành là SƠ ĐỒ PHỎNG DỰNG: OpenStreetMap không có tuyến thành, chưa có bản đồ mở có toạ độ.
Phần đúng theo tài liệu: số vòng (3), chu vi (Nội 1.650 m, Trung 6.500 m, Ngoại 8.000 m), hình dạng (Nội gần chữ nhật,
Trung và Ngoại uốn lượn), mặt cắt lũy (chân 20–30 m, mặt 6–12 m, cao trung bình 4–5 m), hào (rộng 10–30 m; hào
thành Trung cách chân lũy 6 m, rộng 12 m, sâu 4,8 m ở hố Xóm Thượng), sông Hoàng Giang làm hào phía nam, đông nam,
số cửa (Nội 1, Trung 5 hoặc 4, Ngoại 4), 18 ụ ở thành Nội, vị trí đền đình (OSM, ODbL).
Phần ước lượng: đường đi cụ thể của từng vòng, vị trí các cửa, vị trí kho mũi tên và kho trống đồng.
Chạy: python3 tools/build_co_loa.py [--artifact out.html hub_url]
"""
import json, math, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import liquid_glass as LG

LAT0, LON0 = 21.1134, 105.8732
KX, KZ = 111320 * math.cos(math.radians(LAT0)), 110574
ll = lambda la, lo: [round((lo - LON0) * KX, 1), round(-(la - LAT0) * KZ, 1)]


def ring(cx, cz, per, harm, n=480):
    def pts(R):
        out = []
        for i in range(n):
            t = i * 2 * math.pi / n; r = R * (1 + sum(a * math.sin(k * t + p) for k, a, p in harm))
            out.append((cx + r * math.cos(t), cz + r * math.sin(t)))
        return out
    P = lambda pp: sum(math.dist(pp[i], pp[(i + 1) % len(pp)]) for i in range(len(pp)))
    R = 1000.0
    for _ in range(3): R *= per / P(pts(R))
    return [[round(x, 1), round(z, 1)] for x, z in pts(R)]


def rect(cx, cz, w, h, rot_deg, n_side=40):
    rot = math.radians(rot_deg); out = []
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    for i in range(4):
        (u0, v0), (u1, v1) = corners[i], corners[(i + 1) % 4]
        for k in range(n_side):
            f = k / n_side; u, v = u0 + (u1 - u0) * f, v0 + (v1 - v0) * f
            out.append([round(cx + u * math.cos(rot) - v * math.sin(rot), 1), round(cz + u * math.sin(rot) + v * math.cos(rot), 1)])
    return out


def nearest_idx(poly, ang, c):
    best, bi = 1e9, 0
    for i, (x, z) in enumerate(poly):
        d = abs(math.atan2(math.sin(math.atan2(z - c[1], x - c[0]) - ang), math.cos(math.atan2(z - c[1], x - c[0]) - ang)))
        if d < best: best, bi = d, i
    return bi


# Ba vòng thành (x: đông, z: nam; đơn vị mét; gốc ở toạ độ Wikipedia của di tích)
inner = rect(-70, 35, 500, 325, -6)            # chu vi 1.650 m
mid = ring(-90, 40, 6500, [(2, .12, .6), (3, .07, 1.9), (5, .035, .3)])
outer = ring(-170, -20, 8000, [(2, .09, .75), (3, .07, 2.2), (4, .04, .1)])
S, N, E, W = math.pi / 2, -math.pi / 2, 0.0, math.pi
RINGS = [
    {'id': 'noi', 'ten': 'Thành Nội', 'pts': inner, 'c': [-70, 35], 'per': 1650, 'base': 25, 'top': 9, 'h': 5, 'gates': [S], 'bastions': 18, 'moat': 20, 'moat_gap': 6},
    {'id': 'trung', 'ten': 'Thành Trung', 'pts': mid, 'c': [-90, 40], 'per': 6500, 'base': 21.5, 'top': 8, 'h': 6, 'gates': [S, S + 0.8, W + 0.15, N - 0.2, E + 0.15], 'bastions': 0, 'moat': 12, 'moat_gap': 6},
    {'id': 'ngoai', 'ten': 'Thành Ngoại', 'pts': outer, 'c': [-170, -20], 'per': 8000, 'base': 26, 'top': 9, 'h': 4, 'gates': [S + 0.1, W, N, E - 0.2], 'bastions': 0, 'moat': 20, 'moat_gap': 6},
]
for r in RINGS:
    r['gate_idx'] = [nearest_idx(r['pts'], a, r['c']) for a in r['gates']]
# Sông Hoàng Giang: chạy sát chân thành Ngoại từ đông bắc qua đông, đông nam xuống nam, kéo dài hai đầu
oc = RINGS[2]['c']; river = []
for i in range(len(outer)):
    x, z = outer[i]; a = math.atan2(z - oc[1], x - oc[0])
    if -0.55 <= a <= 2.05:
        d = math.hypot(x - oc[0], z - oc[1]); k = (d + 62) / d
        river.append([oc[0] + (x - oc[0]) * k, oc[1] + (z - oc[1]) * k, a])
river.sort(key=lambda p: p[2]); river = [[round(x, 1), round(z, 1)] for x, z, _ in river[::3]]
h0, h1 = river[0], river[-1]
head = [[round(h0[0] + 300 * k + 60 * math.sin(k * 3), 1), round(h0[1] - 700 * k, 1)] for k in (1.6, 1.2, .8, .4)]
tail = [[round(h1[0] - 650 * k, 1), round(h1[1] + 300 * k + 80 * math.sin(k * 2.5), 1)] for k in (.4, .8, 1.2, 1.6, 2.0)]
river = head + river + tail

POI = {
    'den': {'ten': 'Đền Thượng: khuôn đúc mũi tên', 'p': ll(21.11245, 105.87155), 'loai': 'hien_vat'},
    'dinh': {'ten': 'Đình Cổ Loa', 'p': ll(21.11378, 105.87356), 'loai': 'nay'},
    'am': {'ten': 'Am Mỵ Châu', 'p': ll(21.1137, 105.87334), 'loai': 'truyen_thuyet'},
    'gieng': {'ten': 'Giếng Trọng Thủy', 'p': ll(21.11163, 105.87115), 'loai': 'truyen_thuyet'},
    'cauvuc': {'ten': 'Kho mũi tên Cầu Vực (vị trí phỏng chừng)', 'p': None, 'loai': 'hien_vat'},
    'matre': {'ten': 'Kho trống đồng Mả Tre (vị trí phỏng chừng)', 'p': [-560, 520], 'loai': 'hien_vat'},
    'xomthuong': {'ten': 'Hố khai quật Xóm Thượng 2007–2008', 'p': None, 'loai': 'khao_co'},
    'dongdan': {'ten': 'Hố khai quật Đống Dân 2012 (vị trí phỏng chừng)', 'p': None, 'loai': 'khao_co'},
}
gi = RINGS[2]['gate_idx'][0]; gx, gz = outer[gi]; POI['cauvuc']['p'] = [round(gx + (oc[0] - gx) * .07, 1), round(gz + (oc[1] - gz) * .07, 1)]
xi = RINGS[1]['gate_idx'][3]; xx, xz = mid[(xi + 10) % len(mid)]; POI['xomthuong']['p'] = [xx, xz]
di = nearest_idx(outer, W + 0.5, oc); POI['dongdan']['p'] = outer[di]

# Cụm cây và làng (minh hoạ), tránh tường và hào
import random
rnd = random.Random(7)
def near_wall(x, z):
    for r in RINGS:
        for px, pz in r['pts'][::3]:
            if (px - x) ** 2 + (pz - z) ** 2 < 75 ** 2: return True
    for px, pz in river:
        if (px - x) ** 2 + (pz - z) ** 2 < 80 ** 2: return True
    return False
groves = []
centers = [[rnd.uniform(-3200, 3000), rnd.uniform(-3000, 3000)] for _ in range(70)] + [POI['dinh']['p'], POI['den']['p'], [-1177, 374], [7, -785], [756, -888], [-2012, -248]]
for cx, cz in centers:
    for _ in range(rnd.randint(10, 26)):
        x, z = cx + rnd.gauss(0, 70), cz + rnd.gauss(0, 70)
        if near_wall(x, z): continue
        groves.append([round(x, 1), round(z, 1), round(rnd.uniform(4, 9), 1)])

# Đầm Cả: hồ phía đông, nơi hào thông sông qua Cống Song, Cửa Khâu (vị trí, hình dạng phỏng chừng)
ei = nearest_idx(outer, -0.15, oc); ex, ez = outer[ei]
POI['damca'] = {'ten': 'Đầm Cả (vị trí phỏng chừng)', 'p': [round(ex + 330, 1), round(ez - 60, 1)], 'loai': 'nuoc'}
lake = [[round(ex + 330 + 260 * math.cos(t) * (1 + .12 * math.sin(3 * t)), 1), round(ez - 60 + 150 * math.sin(t) * (1 + .1 * math.cos(2 * t)), 1)] for t in [i * 2 * math.pi / 48 for i in range(48)]]
NGUON = json.loads((ROOT / 'tools/co_loa_nguon.json').read_text(encoding='utf-8'))
DATA = {'rings': [{k: v for k, v in r.items() if k not in ('gates',)} for r in RINGS], 'river': river, 'lake': lake, 'poi': POI, 'groves': groves, 'nguon': NGUON}


def build(home, hub, cell, mito):
    tpl = (ROOT / 'tools/co-loa.template.html').read_text(encoding='utf-8')
    css = LG.root("""
  --paper:#F5F5F7; --panel:#FFFFFF; --ink:#1D1D1F; --muted:#6E6E73; --line:rgba(15,23,42,.08); --hair:rgba(15,23,42,.14);
  --accent:#9A5B13; --accent2:#7A4510; --crimson:#BE1740; --f-body:var(--lg-font); --r:22px;
""") + LG.BODY + 'html{background:var(--lg-page)}\n' + LG.glass('header.top,.ctrl,.timeline', 'var(--lg-r)') + LG.glass('.glass', 'var(--lg-r-sm)') \
        + LG.glass('#info,.lesson', 'var(--lg-r)', strong=True) + LG.pill_buttons('.btn,.ph', '.btn.primary', '#B26A1A', '#8E5110')
    s = tpl.replace('__LG_CSS__', css).replace('__DATA__', json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))).replace('__HUB__', hub).replace('__HOME__', home)
    s = s.replace('__FONT__', LG.FONT_LINK)
    assert '__' not in s, 'còn chỗ giữ chỗ: ' + s[s.find('__') - 40:s.find('__') + 40]
    return s


if __name__ == '__main__':
    out = ROOT / 'lich-su-10/co-loa/index.html'; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build('../', '../../', '../../te-bao/', '../../ty-the/'), encoding='utf-8')
    print('đã dựng', out.relative_to(ROOT), f'({out.stat().st_size // 1024} KB, {len(groves)} cây)')
    if len(sys.argv) > 3 and sys.argv[1] == '--artifact':
        pathlib.Path(sys.argv[2]).write_text(build(sys.argv[3] + '#lich-su-10', sys.argv[3], '', ''), encoding='utf-8')
        print('đã dựng bản đăng', sys.argv[2])
