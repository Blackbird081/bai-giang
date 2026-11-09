#!/usr/bin/env python3
"""khung_bia.py · đóng khung lại ảnh bìa bài 3D nền sáng cho cùng một cỡ vật và cùng một bố cục.

  python3 tools/khung_bia.py            đóng khung các bìa trong DANH_SACH (thu-vien/covers/<tên>.webp), ghi đè
  python3 tools/khung_bia.py --kiem     chỉ in khung bao và độ phủ hiện tại, không ghi

Vì sao: bìa chụp từ từng cảnh nên vật to nhỏ, lệch chỗ khác nhau (hải đăng mảnh như que, cá mập tràn khung, cánh tay robot
nằm sát mép trên). Bước này chỉ cắt và căn, không vẽ thêm: tìm khung bao của vật trên nền sáng (điểm ảnh đậm hoặc có màu;
bóng đổ và lưới sàn nhạt nên bị bỏ), rồi lấy khung 3:2 tâm ở giữa vật sao cho vật chiếm 78 % chiều cao hoặc 80 % chiều rộng
(cái nào chạm trước). Phần khung vượt ra ngoài ảnh gốc được kéo dài bằng điểm ảnh ở mép. Ra 960 × 640.

Chạy lại không làm ảnh trôi: mã băm của bìa đã đóng khung ghi ở thu-vien/covers/khung.json; bìa trùng mã thì giữ nguyên,
chỉ bìa chụp lại (mã khác) mới được đóng khung. Bìa đã đạt độ phủ trong sai số 3 % cũng giữ. Bìa toàn cảnh (cá, neuron, Ty Thể, Cổ Loa,
Tế Bào) không ở danh sách. Sau khi chạy: python3 tools/the_chia_se.py --render để vẽ lại thẻ chia sẻ dùng bìa này.
"""
import hashlib, json, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
COV = ROOT / 'thu-vien/covers'
MANIFEST = COV / 'khung.json'
DANH_SACH = ['co-the-nguoi', 'dong-co', 'robo-ur5e', 'mako', 'robo-quadruped', 'robo-jellyfish', 'robo-hexapod', 'robo-crazyflie',
             'robo-turtlebot3', 'thap-5-tang', 'may-anh', 'piranha', 'nhen', 'dong-ho', 'hai-dang']
OUT_W, OUT_H = 960, 640
FILL_H, FILL_W, TOL = 0.78, 0.80, 0.03


def bbox(a):
    """Khung bao của vật: điểm ảnh tối (độ sáng < 200) hoặc có màu (chênh kênh > 40); bỏ 0,5 % ở mỗi phía để khỏi dính vụn."""
    rgb = a[..., :3].astype(int)
    luma = rgb @ np.array([299, 587, 114]) / 1000
    m = (luma < 200) | (rgb.max(-1) - rgb.min(-1) > 40)
    ys, xs = np.nonzero(m)
    if len(xs) < 50:
        return None
    x0, x1 = np.percentile(xs, [0.5, 99.5]); y0, y1 = np.percentile(ys, [0.5, 99.5])
    return float(x0), float(y0), float(x1 + 1), float(y1 + 1)


def frame(a):
    """Khung 3:2 (toạ độ ảnh gốc) để vật đạt độ phủ đích; None nếu đã đạt."""
    h, w = a.shape[:2]
    b = bbox(a)
    if not b:
        return None, None
    x0, y0, x1, y1 = b; bw, bh = x1 - x0, y1 - y0
    fw, fh = bw / w, bh / h
    near = abs(fh - FILL_H) < TOL or abs(fw - FILL_W) < TOL
    centred = abs((x0 + x1) / 2 - w / 2) < TOL * w and abs((y0 + y1) / 2 - h / 2) < TOL * h
    if near and fh <= FILL_H + TOL and fw <= FILL_W + TOL and centred and abs(w / h - 1.5) < 0.01:
        return None, (fw, fh)
    # cỡ khung: vật chiếm FILL_H chiều cao hoặc FILL_W chiều rộng
    cw = max(bw / FILL_W, bh / FILL_H * 1.5)
    ch = cw / 1.5
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return (cx - cw / 2, cy - ch / 2, cw, ch), (fw, fh)


def reframe(a, box):
    """Cắt khung, phần ra ngoài ảnh lấy điểm ảnh mép (np.pad edge), rồi đổi cỡ về OUT_W × OUT_H."""
    h, w = a.shape[:2]
    x, y, cw, ch = box
    L, T, R, B = int(np.floor(x)), int(np.floor(y)), int(np.ceil(x + cw)), int(np.ceil(y + ch))
    pad = ((max(0, -T), max(0, B - h)), (max(0, -L), max(0, R - w)), (0, 0))
    p = np.pad(a, pad, mode='edge')
    crop = p[T + pad[0][0]:B + pad[0][0], L + pad[1][0]:R + pad[1][0]]
    return Image.fromarray(crop).resize((OUT_W, OUT_H), Image.LANCZOS)


def main():
    only_check = '--kiem' in sys.argv
    done = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
    for name in DANH_SACH:
        f = COV / f'{name}.webp'
        if not f.exists():
            print(f'{name}: không có tệp'); continue
        if done.get(name) == sha(f):
            print(f'{name}: đã đóng khung · giữ'); continue
        a = np.asarray(Image.open(f).convert('RGB'))
        box, cover = frame(a)
        tag = f'{a.shape[1]}×{a.shape[0]}, vật phủ {cover[0]:.0%} rộng · {cover[1]:.0%} cao' if cover else 'không tìm thấy vật'
        if box is None or only_check:
            print(f'{name}: {tag}' + (' · giữ' if box is None else ' · cần đóng khung')); continue
        reframe(a, box).save(f, 'WEBP', quality=86, method=6)
        done[name] = sha(f)
        print(f'{name}: {tag} → {OUT_W}×{OUT_H}')
    if not only_check:
        MANIFEST.write_text(json.dumps(dict(sorted(done.items())), indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
