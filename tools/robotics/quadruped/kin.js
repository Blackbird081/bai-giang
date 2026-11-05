// Chó robot bốn chân theo số đo MIT Mini Cheetah: động học chân 3 bậc (khép/mở hông, gập hông, gập gối), dáng đi theo
// hệ số chống β, lực đỡ từng chân (cân bằng lực và mô men), mô men khớp τ = Jᵀf, dòng điện và nhiệt cuộn dây, bật nhảy.
// Đơn vị: mét, radian, giây, newton. Khung thân: x tiến, y trái, z lên; gốc ở tâm thân, ngang trục các khớp khép/mở.
//
// Nguồn số đo:
//  · Cheetah-Software (MIT, giấy phép MIT), common/include/Dynamics/MiniCheetah.h: kích thước thân, khâu, khối lượng,
//    tỉ số truyền, mô men động cơ tối đa, hằng số mô men, điện trở cuộn dây, điện áp pin.
//  · Katz, Di Carlo, Kim (2019), Mini Cheetah: A Platform for Pushing the Limits of Dynamic Quadruped Control, ICRA:
//    9 kg, 2,45 m/s, đi kiệu, nhảy lộn ngược.
export const MC = {
  m: 9, g: 9.81,
  body: {L: 0.38, W: 0.098, H: 0.1, m: 3.3},
  lab: 0.062, l1: 0.209, l2: 0.195, maxLeg: 0.409,
  gear: [6, 6, 9.33], tauMotor: 3, KT: 0.05, R: 0.173, V: 24,
  mass: {abad: 0.54, hip: 0.634, knee: 0.064, rotor: 0.055},
  vmax: 2.45,
};
export const TAU = MC.gear.map((n) => MC.tauMotor * n); // mô men khớp tối đa: 18, 18, 28 N·m
export const JN = ['khép/mở hông', 'gập hông', 'gập gối'];
export const JK = ['ABAD', 'HÔNG', 'GỐI'];
// thứ tự chân như mã nguồn: 0 phải trước, 1 trái trước, 2 phải sau, 3 trái sau
export const LEGS = [['FR', 1, -1, 'phải trước'], ['FL', 1, 1, 'trái trước'], ['RR', -1, -1, 'phải sau'], ['RL', -1, 1, 'trái sau']]
  .map(([name, sx, sy, vn]) => ({name, sx, sy, vn, A: [(sx * MC.body.L) / 2, (sy * MC.body.W) / 2, 0]}));

// dáng đi: β = phần chu kỳ chân chạm đất; off = lệch pha. Đi bước theo thứ tự trái sau → trái trước → phải sau → phải trước,
// β = 0,85 để có quãng bốn chân cùng chống mà dồn trọng tâm. Kiệu: hai cặp chéo (FL + RR) và (FR + RL) thay nhau.
export const GAITS = {
  stand: {beta: 1, off: {FR: 0, FL: 0, RR: 0, RL: 0}, vn: 'Đứng'},
  walk: {beta: 0.85, off: {RL: 0.75, FL: 0.5, RR: 0.25, FR: 0}, vn: 'Đi bước'},
  trot: {beta: 0.5, off: {FL: 0, RR: 0, FR: 0.5, RL: 0.5}, vn: 'Đi kiệu'},
};

const rx = (q, v) => { const c = Math.cos(q), s = Math.sin(q); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Động học thuận: q = [khép/mở, gập hông (dương: đùi ngả ra sau), gập gối (0: duỗi thẳng)] → điểm khớp trong khung thân */
export function legPts(L, q) {
  const s = L.sy * MC.lab, t = q[1], u = q[2] - q[1];
  const hip = add(L.A, rx(q[0], [0, s, 0]));
  const knee = add(L.A, rx(q[0], [-MC.l1 * Math.sin(t), s, -MC.l1 * Math.cos(t)]));
  const foot = add(knee, rx(q[0], [MC.l2 * Math.sin(u), 0, -MC.l2 * Math.cos(u)]));
  return {A: L.A, hip, knee, foot, n: rx(q[0], [0, 1, 0])};
}
/** Động học nghịch (gối gập ra sau): bàn chân p trong khung thân → q; ok = với tới được */
export function legIK(L, p) {
  const d = [p[0] - L.A[0], p[1] - L.A[1], p[2] - L.A[2]];
  const r2 = d[1] * d[1] + d[2] * d[2], Lz = Math.sqrt(Math.max(r2 - MC.lab * MC.lab, 1e-8));
  const q0 = Math.atan2(d[2], d[1]) - Math.atan2(-Lz, L.sy * MC.lab);
  const q0n = Math.atan2(Math.sin(q0), Math.cos(q0));
  const x = d[0], D0 = Math.hypot(x, Lz), l1 = MC.l1, l2 = MC.l2;
  const ok = D0 <= l1 + l2 - 1e-3 && D0 >= Math.abs(l1 - l2) + 1e-3;
  const D = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, D0));
  const phi = Math.atan2(x, Lz), al = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))));
  const be = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2))));
  return {q: [q0n, al - phi, Math.PI - be], ok, D: D0};
}
/** Mô men khớp để bàn chân ấn xuống đất với lực f (khung thân): τ = Jᵀ(−f), Jacobian tính số */
export function jointTau(L, q, f) {
  const p0 = legPts(L, q).foot, e = 1e-6;
  return q.map((_, j) => { const qq = q.slice(); qq[j] += e; const p = legPts(L, qq).foot; return -((p[0] - p0[0]) * f[0] + (p[1] - p0[1]) * f[1] + (p[2] - p0[2]) * f[2]) / e; });
}
/** dòng điện cuộn dây và nhiệt Joule của một động cơ khi khớp giữ mô men τ: i = τ / (N·kT), P = i²R */
export const motorOf = (tau, j) => { const i = Math.abs(tau) / (MC.gear[j] * MC.KT); return {i, P: i * i * MC.R}; };

/** Bàn chân theo pha trong khung "hông" (đi đều với vận tốc v): chống thì lùi đều, bước thì nhấc theo nửa sin */
export function footAt(n, phase, off, beta, v, T, lift) {
  const p = (((phase + off) % 1) + 1) % 1, stance = p < beta;
  let s, h = 0;
  if (stance) s = 1 - (2 * p) / beta;
  else { const u = (p - beta) / (1 - beta); s = -1 + 2 * (u * u * (3 - 2 * u)); h = Math.sin(Math.PI * u); }
  const half = (v * beta * T) / 2;
  return {pos: [n[0] + s * half, n[1], n[2] + h * lift], stance, p, s};
}

/** Lực đỡ thẳng đứng của các chân đang chống, để tổng lực = W và mô men quanh trọng tâm c bằng 0.
 * 4 chân: nghiệm chuẩn nhỏ nhất (vô số nghiệm); 3 chân: nghiệm duy nhất; 2 chân: chỉ cân bằng được dọc đường nối,
 * phần còn lại là mô men lật dư (resid, N·m) mà robot phải bù bằng động lực học. */
export function grf(P, c, W) {
  const n = P.length;
  if (!n) return {f: [], resid: 0, neg: false};
  if (n === 1) return {f: [W], resid: W * Math.hypot(P[0][0] - c[0], P[0][1] - c[1]), neg: false};
  if (n === 2) {
    const [a, b] = P, ex = b[0] - a[0], ey = b[1] - a[1], L2 = ex * ex + ey * ey;
    const u = ((c[0] - a[0]) * ex + (c[1] - a[1]) * ey) / L2;
    const d = Math.abs((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / Math.sqrt(L2);
    return {f: [W * (1 - u), W * u], resid: W * d, neg: u < 0 || u > 1};
  }
  // f = Aᵀ (A Aᵀ)⁻¹ b, A = [1; x − cx; y − cy], b = [W, 0, 0]
  const A = [P.map(() => 1), P.map((p) => p[0] - c[0]), P.map((p) => p[1] - c[1])];
  const M = A.map((r) => A.map((s) => r.reduce((t, x, i) => t + x * s[i], 0)));
  const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  if (Math.abs(det) < 1e-12) return {f: P.map(() => W / n), resid: 0, neg: false};
  // cột đầu của M⁻¹ (b chỉ có thành phần đầu)
  const y = [(M[1][1] * M[2][2] - M[1][2] * M[2][1]) / det, -(M[1][0] * M[2][2] - M[1][2] * M[2][0]) / det, (M[1][0] * M[2][1] - M[1][1] * M[2][0]) / det].map((v) => v * W);
  const f = P.map((_, i) => A[0][i] * y[0] + A[1][i] * y[1] + A[2][i] * y[2]);
  return {f, resid: 0, neg: f.some((v) => v < -1e-6)};
}

/** Bật nhảy: khom từ cao h0 xuống hc, đẩy thẳng lên trên quãng s = hTop − hc tới vận tốc v0 = √(2gH),
 * bay tự do, tiếp đất ở cao hTop rồi hấp thụ về h0. Lực đẩy trung bình F = m·g + m·v0²/(2s) (định lí động năng). */
export function leapPlan(H, m, h0, vx = 0.6) {
  const hc = 0.17, hTop = 0.33, s = hTop - hc, v0 = Math.sqrt(2 * MC.g * H);
  const a = (v0 * v0) / (2 * s), tPush = v0 / a, tFly = (2 * v0) / MC.g;
  return {H, hc, hTop, s, v0, a, F: m * (MC.g + a), tCrouch: 0.55, tPush, tFly, tLand: 0.45, tRest: 0.5, h0, vx};
}
