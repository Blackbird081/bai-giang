// TurtleBot3 Burger: động học vi sai, encoder 4096 xung/vòng, odometry có trượt bánh, LiDAR 360 tia, bản đồ lưới
// chiếm chỗ (log-odds) và bám đường pure pursuit. Số liệu: ROBOTIS e-Manual và mã nguồn turtlebot3 (GitHub).
export const TB = {
  r: 0.033, L: 0.160, vmax: 0.22, wmax: 2.84, // bán kính bánh, khoảng cách hai bánh, tốc độ công bố
  rpm: 61, ticks: 4096, acc: 1.0, // XL430-W250 không tải @12 V; encoder 12 bit; gia tốc tối đa (mô hình Gazebo)
  lidar: {x: -0.032, z: 0.172, n: 360, rmin: 0.16, rmax: 8.0, hz: 5}, // LDS-02
};
export const WHEEL_MAX = (TB.rpm * 2 * Math.PI) / 60; // rad/s

// sân: phòng 3,2 × 2,4 m, vật cản là hộp và trụ (đơn vị m, gốc ở giữa phòng)
export const ROOM = {w: 3.2, h: 2.4};
export const BOXES = [{x: 0.35, y: 0.35, w: 0.4, h: 0.3, a: 0.3}, {x: -0.85, y: -0.4, w: 0.3, h: 0.45, a: 0}, {x: 1.15, y: -0.65, w: 0.25, h: 0.25, a: 0.6}];
export const CYLS = [{x: -0.6, y: 0.75, r: 0.13}, {x: 0.95, y: 0.45, r: 0.09}];
export const SEGS = (() => {
  const s = [], W = ROOM.w / 2, H = ROOM.h / 2;
  s.push([-W, -H, W, -H], [W, -H, W, H], [W, H, -W, H], [-W, H, -W, -H]);
  for (const b of BOXES) {
    const c = Math.cos(b.a), n = Math.sin(b.a), P = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]].map(([u, v]) => [b.x + u * c - v * n, b.y + u * n + v * c]);
    for (let i = 0; i < 4; i++) s.push([...P[i], ...P[(i + 1) % 4]]);
  }
  return s;
})();
export const PATH = [[-1.2, -0.95], [0.2, -0.95], [0.75, -0.25], [1.3, 0.05], [1.3, 0.95], [0.2, 0.98], [-0.15, 0.3], [-0.75, 0.2], [-1.35, 0.85], [-1.38, -0.3]];

/** Tia 2D: khoảng cách tới vật gần nhất */
export function ray(x, y, a) {
  const dx = Math.cos(a), dy = Math.sin(a); let best = Infinity;
  for (const [x1, y1, x2, y2] of SEGS) {
    const ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((x1 - x) * ey - (y1 - y) * ex) / den, u = ((x1 - x) * dy - (y1 - y) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
  }
  for (const c of CYLS) {
    const fx = x - c.x, fy = y - c.y, b = fx * dx + fy * dy, cc = fx * fx + fy * fy - c.r * c.r, disc = b * b - cc;
    if (disc < 0) continue; const t = -b - Math.sqrt(disc); if (t > 0 && t < best) best = t;
  }
  return best;
}
/** Va chạm thân robot (bán kính 0,105 m theo firmware) */
export function collides(x, y, R = 0.105) {
  const W = ROOM.w / 2, H = ROOM.h / 2;
  if (x < -W + R || x > W - R || y < -H + R || y > H - R) return true;
  for (const [x1, y1, x2, y2] of SEGS.slice(4)) {
    const ex = x2 - x1, ey = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * ex + (y - y1) * ey) / (ex * ex + ey * ey)));
    if (Math.hypot(x1 + t * ex - x, y1 + t * ey - y) < R) return true;
  }
  return CYLS.some((c) => Math.hypot(x - c.x, y - c.y) < c.r + R);
}
// ngẫu nhiên có hạt giống, phân phối chuẩn
export const rng = (seed = 7) => { let a = seed; const u = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; return {u, n: () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u())}; };

/** Bản đồ lưới chiếm chỗ, ô 4 cm, log-odds */
export function createGrid(res = 0.04) {
  const W = Math.ceil((ROOM.w + 0.6) / res), H = Math.ceil((ROOM.h + 0.6) / res), x0 = -(ROOM.w + 0.6) / 2, y0 = -(ROOM.h + 0.6) / 2;
  const L = new Float32Array(W * H), lo = 0.85, lf = -0.4, cap = 4;
  const idx = (x, y) => { const i = Math.floor((x - x0) / res), j = Math.floor((y - y0) / res); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
  const update = (px, py, pa, scan) => {
    for (let k = 0; k < scan.length; k++) {
      const r = scan[k]; if (!(r > 0)) continue;
      const a = pa + (k * 2 * Math.PI) / scan.length, hit = r < TB.lidar.rmax, d = Math.min(r, TB.lidar.rmax), n = Math.ceil(d / (res * 0.8));
      for (let s = 0; s < n; s++) { const t = (s / n) * d, c = idx(px + t * Math.cos(a), py + t * Math.sin(a)); if (c >= 0) L[c] = Math.max(-cap, L[c] + lf); }
      if (hit) { const c = idx(px + d * Math.cos(a), py + d * Math.sin(a)); if (c >= 0) L[c] = Math.min(cap, L[c] + lo + 0.4); }
    }
  };
  return {W, H, x0, y0, res, L, update, clear: () => L.fill(0)};
}
