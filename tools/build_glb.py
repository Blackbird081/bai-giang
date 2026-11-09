#!/usr/bin/env python3
"""Dựng mô hình AR: bề mặt phân tử của ribosome 3J7R trên một mảnh màng lưới nội chất -> GLB.

Đọc ribosome.b64.txt (đã qua build_ribosome.py, hệ trục +Y = pháp tuyến màng, gốc = mặt giữa màng).
Mỗi nhóm (rRNA/protein của 60S và 40S, mRNA, tRNA, Sec61) là một lưới riêng, một vật liệu riêng.
Tỉ lệ 1 Å = 1 mm (phóng to 10 triệu lần): ribosome rộng khoảng 0,3 m khi đặt lên bàn bằng AR.
Cách dùng: python3 tools/build_glb.py ribosome.b64.txt assets/ribosome-3j7r.glb
"""
import base64, gzip, json, pathlib, struct, sys
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes
import fast_simplification, trimesh

src, out = sys.argv[1], sys.argv[2]
raw = gzip.decompress(base64.b64decode(pathlib.Path(src).read_text(encoding='utf-8').strip()))
n = struct.unpack('<I', raw[:4])[0]; meta = json.loads(raw[4:4 + n]); off = 4 + n + (-(4 + n) % 4)
rec = np.frombuffer(raw[off:off + meta['so_nguyen_tu'] * 10], dtype=[('x', '<i2'), ('y', '<i2'), ('z', '<i2'), ('c', 'u1'), ('h', 'u1'), ('e', 'u1'), ('p', 'u1')])
P = np.stack([rec['x'], rec['y'], rec['z']], 1).astype(np.float64) / meta['scale']; C = rec['c']

GROUPS = [  # tên, nhóm nguyên tử, màu (sRGB), số tam giác mục tiêu
    ('rRNA tiểu phần lớn', [0], '#E8B04B', 70000), ('Protein tiểu phần lớn', [1], '#C8264C', 60000),
    ('rRNA tiểu phần nhỏ', [2], '#F2D48E', 40000), ('Protein tiểu phần nhỏ', [3], '#E2728C', 36000),
    ('mRNA', [4], '#B4007E', 3000), ('tRNA A/P', [5], '#14A3A3', 8000), ('tRNA P/E', [6], '#1F6FB2', 8000),
    ('Kênh Sec61', [7], '#5B3FC4', 10000),
]
H = 2.0; PAD = 8.0
lo = P.min(0) - PAD; hi = P.max(0) + PAD; shape = np.ceil((hi - lo) / H).astype(int) + 1
def surface(mask, target):
    idx = np.floor((P[mask] - lo) / H).astype(int)
    g = np.zeros(shape, np.float32); np.add.at(g, (idx[:, 0], idx[:, 1], idx[:, 2]), 1.0)
    g = gaussian_filter(g, sigma=1.15)
    v, f, _, _ = marching_cubes(g, level=0.16, spacing=(H, H, H))
    v = v + lo
    if len(f) > target:
        v, f = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=1 - target / len(f))
    m = trimesh.Trimesh(vertices=v, faces=f, process=True)
    trimesh.repair.fix_normals(m)
    return m

# glTF hiểu baseColorFactor theo thang tuyến tính: đổi từ sRGB
lin = lambda h: [int(round(255 * (((int(h[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 if int(h[i:i + 2], 16) / 255 > 0.04045 else int(h[i:i + 2], 16) / 255 / 12.92))) for i in (1, 3, 5)]
scene = trimesh.Scene(); stats = []
for name, cats, hexc, target in GROUPS:
    m = surface(np.isin(C, cats), target)
    rgb = lin(hexc)
    m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=name, baseColorFactor=rgb + [255], roughnessFactor=0.55, metallicFactor=0.0))
    scene.add_geometry(m, node_name=name, geom_name=name); stats.append((name, len(m.faces)))

# Mảnh màng lưới nội chất: đĩa dày 40 Å (hai lớp đầu phospholipid ± 20 Å), bán kính 260 Å, có lỗ cho Sec61
mem = trimesh.creation.annulus(r_min=26.0, r_max=260.0, height=40.0, sections=96)
mem.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))  # trục đĩa theo +Y
mem.apply_translation([float(np.mean(meta['lo_sec61'][0])), 0.0, float(meta['lo_sec61'][1])])
mem.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name='Màng lưới nội chất', baseColorFactor=lin('#EC93A9') + [255], roughnessFactor=0.75, metallicFactor=0.0))
scene.add_geometry(mem, node_name='Màng lưới nội chất', geom_name='Màng lưới nội chất'); stats.append(('Màng', len(mem.faces)))

# Đặt đáy màng ở y = 0 để mô hình "ngồi" trên mặt bàn; đổi Å -> m (1 Å = 1 mm)
T = trimesh.transformations.translation_matrix([0, 20.0, 0]); S = trimesh.transformations.scale_matrix(0.001)
scene.apply_transform(trimesh.transformations.concatenate_matrices(S, T))
scene.export(out)
b = scene.bounds; size = (b[1] - b[0])
print('tam giác:', stats, 'tổng', sum(s for _, s in stats))
print(f'kích thước (m): {size.round(3)} | tệp {out}: {round(__import__("os").path.getsize(out) / 1e6, 2)} MB')
# vị trí nhãn (m) cho trang AR
lab = {k: [round((v[0]) * 0.001, 4), round((v[1] + 20) * 0.001, 4), round(v[2] * 0.001, 4)] for k, v in ((k, meta['bo_phan'][k]['tam']) for k in ('lsu', 'ssu', 'mrna', 'trnaA', 'trnaP', 'sec61'))}
lab['lsu'][1] += 0.0; pathlib.Path(out.replace('.glb', '.labels.json')).write_text(json.dumps(lab, indent=1), encoding='utf-8'); print('nhãn:', lab)
