#!/usr/bin/env python3
"""Nhạc nền cho phim động cơ 4 kì, dựng hoàn toàn bằng mã trên cùng timeline.json với hình (bước 8 của quy trình teardown):
nền hợp âm Am9 – Fmaj7 – Cmaj7 – G6 nhịp 92, một tiếng thịch trầm đúng mỗi kì cháy – dãn nở (nhịp dày lên khi mở ga),
gió nhẹ khi đổi góc máy và khi mở ga. Đo độ to theo ITU-R BS.1770 (lọc K, cổng −70 LUFS và −10 LU) rồi đưa về −14 LUFS,
đỉnh không quá −1 dBFS. Viết lại theo cách làm của claude-motion (MIT), không dùng mã của kho đó.

  python3 tools/robotics/dong-co/film/diem.py OUT.wav
"""
import json, pathlib, sys, wave
import numpy as np
from scipy.signal import lfilter, butter, resample_poly

HERE = pathlib.Path(__file__).resolve().parent
SR = 48000
TL = json.loads((HERE / 'timeline.json').read_text())
DUR = TL['duration']
rng = np.random.default_rng(11)
N = int(DUR * SR) + SR
L = np.zeros(N); Rt = np.zeros(N)

hz = lambda n: 440.0 * 2 ** (n / 12)                 # n: số nửa cung so với A4
CH = [[-24, -17, -14, -10, -9], [-28, -21, -17, -12], [-21, -17, -14, -10], [-26, -19, -17, -10]]  # Am9, Fmaj7, Cmaj7, G6
BAR = 4 * 60 / 92


def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += g * x[: j - i]


def pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 1.2).clip(0)
    x = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * 0.6 + 0.25 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    b, a = butter(2, 2800 / (SR / 2)); return lfilter(b, a, x) * env / len(freqs)


def thud(f=62, decay=0.05, dur=0.32):
    t = np.arange(int(dur * SR)) / SR
    pitch = f * (1 + 1.2 * np.exp(-t / 0.012))
    x = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t / decay * 1.0) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t / 0.004)
    b, a = butter(2, 900 / (SR / 2)); return lfilter(b, a, x)


def airy(dur, f0, f1):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); out = np.zeros(n); seg = 2400
    for k in range(0, n, seg):
        fc = f0 + (f1 - f0) * (k / n); b, a = butter(2, [fc * 0.7 / (SR / 2), min(0.99, fc * 1.4 / (SR / 2))], btype='band')
        out[k:k + seg] = lfilter(b, a, x[k:k + seg])
    return out * np.sin(np.pi * t / dur) ** 2


# nền hợp âm, mỗi ô nhịp một hợp âm, trái phải lệch nhẹ
t0, k = 0.0, 0
while t0 < DUR:
    x = pad([hz(n) for n in CH[k % 4]], BAR + 1.2)
    put(L, t0, x, 0.9); put(Rt, t0 + 0.012, x, 0.9)
    put(L, t0, pad([hz(CH[k % 4][0] - 12)], BAR + 0.8), 0.6); put(Rt, t0, pad([hz(CH[k % 4][0] - 12)], BAR + 0.8), 0.6)
    t0 += BAR; k += 1
for t in TL['firings']:
    x = thud(); put(L, t, x, 1.2); put(Rt, t, x, 1.2)
a, b = TL['throttle']
x = airy(b - a + 0.6, 400, 1600); put(L, a, x, 0.5); put(Rt, a, x, 0.5)
for t in TL['views']:
    x = airy(1.2, 700, 1500); put(L, t, x, 0.25); put(Rt, t, x * 0.8, 0.25)
L, Rt = L[: int(DUR * SR)], Rt[: int(DUR * SR)]
fade = np.minimum(1, (DUR - np.arange(len(L)) / SR) / 1.0).clip(0); L *= fade; Rt *= fade


def lufs(chs):
    """độ to tích hợp BS.1770-4: lọc K, khối 400 ms chồng 75 %, cổng tuyệt đối −70 và cổng tương đối −10 LU"""
    pre = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
    rlb = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])
    ys = [lfilter(*rlb, lfilter(*pre, c)) for c in chs]
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    z = np.array([sum(np.mean(y[i:i + blk] ** 2) for y in ys) for i in range(0, len(ys[0]) - blk, hop)])
    lk = -0.691 + 10 * np.log10(z + 1e-12)
    g = z[lk > -70]; rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(lk > -70) & (lk > rel)]
    return -0.691 + 10 * np.log10(g2.mean())


# đưa về −14 LUFS: tăng độ to, nén đỉnh mềm (tanh) cho tiếng thịch không chạm trần, lặp vài lần
for _ in range(5):
    g = 10 ** ((-14.0 - lufs([L, Rt])) / 20); L *= g; Rt *= g
    L = np.tanh(L / 0.8) * 0.8; Rt = np.tanh(Rt / 0.8) * 0.8
tp = max(np.abs(resample_poly(L, 4, 1)).max(), np.abs(resample_poly(Rt, 4, 1)).max())
if tp > 10 ** (-1 / 20): s = 10 ** (-1 / 20) / tp; L *= s; Rt *= s
print(f'độ to {lufs([L, Rt]):.1f} LUFS · đỉnh thật {20 * np.log10(max(np.abs(resample_poly(L, 4, 1)).max(), np.abs(resample_poly(Rt, 4, 1)).max())):.1f} dBFS · {len(TL["firings"])} tiếng thịch')
out = sys.argv[1] if len(sys.argv) > 1 else str(HERE / 'dong-co-score.wav')
pcm = (np.stack([L, Rt], 1).clip(-1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('đã ghi', out)
