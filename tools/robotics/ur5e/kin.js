// UR5e: động học thuận theo bảng DH của Universal Robots, động học nghịch giải tích (Hawkins 2013, 8 nghiệm),
// Jacobian hình học, chỉ số thao tác Yoshikawa, mô men giữ do trọng lực theo khối lượng và trọng tâm từng khâu.
// Đơn vị: mét, radian, kg, N·m. Không dùng three.js ở đây. Hệ toạ độ robot: z hướng lên.
export const DH = [ // Universal Robots, "DH parameters for calculations of kinematics and dynamics", UR5e
  {a: 0, d: 0.1625, al: Math.PI / 2},
  {a: -0.425, d: 0, al: 0},
  {a: -0.3922, d: 0, al: 0},
  {a: 0, d: 0.1333, al: Math.PI / 2},
  {a: 0, d: 0.0997, al: -Math.PI / 2},
  {a: 0, d: 0.0996, al: 0},
];
export const LINK = [ // khối lượng (kg) và trọng tâm trong khung i (m), cùng trang của UR
  {m: 3.761, c: [0, -0.02561, 0.00193]},
  {m: 8.058, c: [0.2125, 0, 0.11336]},
  {m: 2.846, c: [0.15, 0, 0.0265]},
  {m: 1.37, c: [0, -0.0018, 0.01634]},
  {m: 1.3, c: [0, 0.0018, 0.01634]},
  {m: 0.365, c: [0, 0, -0.001159]},
];
export const JOINT = [ // cỡ khớp và mô men tối đa (UR "Max. joint torques"), tốc độ tối đa ±180°/s (datasheet)
  {name: 'ĐẾ', size: 3, tmax: 150}, {name: 'VAI', size: 3, tmax: 150}, {name: 'KHUỶU', size: 3, tmax: 150},
  {name: 'CỔ TAY 1', size: 1, tmax: 28}, {name: 'CỔ TAY 2', size: 1, tmax: 28}, {name: 'CỔ TAY 3', size: 1, tmax: 28},
];
export const VMAX = Math.PI; // 180°/s
export const REACH = 0.85;
export const G = 9.81;

// ---------- ma trận 4×4 hàng trước ----------
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const mul = (A, B) => {
  const C = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) C[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c] + A[r * 4 + 3] * B[12 + c];
  return C;
};
export const inv = (A) => { // nghịch đảo phép biến đổi cứng
  const R = [A[0], A[4], A[8], A[1], A[5], A[9], A[2], A[6], A[10]], p = [A[3], A[7], A[11]];
  const t = [-(R[0] * p[0] + R[1] * p[1] + R[2] * p[2]), -(R[3] * p[0] + R[4] * p[1] + R[5] * p[2]), -(R[6] * p[0] + R[7] * p[1] + R[8] * p[2])];
  return [R[0], R[1], R[2], t[0], R[3], R[4], R[5], t[1], R[6], R[7], R[8], t[2], 0, 0, 0, 1];
};
export const dhT = (i, q) => {
  const {a, d, al} = DH[i], c = Math.cos(q), s = Math.sin(q), ca = Math.cos(al), sa = Math.sin(al);
  return [c, -s * ca, s * sa, a * c, s, c * ca, -c * sa, a * s, 0, sa, ca, d, 0, 0, 0, 1];
};
/** Các khung T0..T6 (T0 = đế) */
export function fk(q) {
  const F = [I4()];
  for (let i = 0; i < 6; i++) F.push(mul(F[i], dhT(i, q[i])));
  return F;
}
const wrapPi = (x) => Math.atan2(Math.sin(x), Math.cos(x));

/** Động học nghịch giải tích cho khung bích T06: tối đa 8 nghiệm, mỗi nghiệm kèm cờ cấu hình */
export function ik(T) {
  const {d: d1} = DH[0], a2 = DH[1].a, a3 = DH[2].a, d4 = DH[3].d, d5 = DH[4].d, d6 = DH[5].d;
  const out = [];
  const p05 = [T[3] - d6 * T[2], T[7] - d6 * T[6]];
  const R = Math.hypot(p05[0], p05[1]);
  if (R < Math.abs(d4)) return out;
  const psi = Math.atan2(p05[1], p05[0]), phi = Math.acos(d4 / R);
  for (const s1 of [1, -1]) {
    const q1 = psi + s1 * phi + Math.PI / 2, c1 = Math.cos(q1), sn1 = Math.sin(q1);
    const c5 = (T[3] * sn1 - T[7] * c1 - d4) / d6;
    if (Math.abs(c5) > 1 + 1e-9) continue;
    for (const s5 of [1, -1]) {
      const q5 = s5 * Math.acos(Math.max(-1, Math.min(1, c5))), sn5 = Math.sin(q5);
      const q6 = Math.abs(sn5) < 1e-6 ? 0 : Math.atan2((-T[1] * sn1 + T[5] * c1) / sn5, (T[0] * sn1 - T[4] * c1) / sn5);
      const T01 = dhT(0, q1), T45 = dhT(4, q5), T56 = dhT(5, q6);
      const T14 = mul(mul(inv(T01), T), inv(mul(T45, T56)));
      const px = T14[3] - d4 * T14[1], py = T14[7] - d4 * T14[5]; // p13 = T14·(0,-d4,0,1)
      const L = Math.hypot(px, py);
      const c3 = (L * L - a2 * a2 - a3 * a3) / (2 * a2 * a3);
      if (Math.abs(c3) > 1 + 1e-9) continue;
      for (const s3 of [1, -1]) {
        const q3 = s3 * Math.acos(Math.max(-1, Math.min(1, c3)));
        const q2 = -Math.atan2(py, -px) + Math.asin(Math.max(-1, Math.min(1, (a3 * Math.sin(q3)) / L)));
        const T13 = mul(dhT(1, q2), dhT(2, q3));
        const T34 = mul(inv(T13), T14);
        const q4 = Math.atan2(T34[4], T34[0]);
        out.push({q: [q1, q2, q3, q4, q5, q6].map(wrapPi), shoulder: s1, wrist: s5, elbow: s3});
      }
    }
  }
  void d1;
  return out;
}
const dist = (a, b) => a.reduce((s, v, i) => s + wrapPi(v - b[i]) ** 2, 0);
/** Nghiệm gần cấu hình hiện tại nhất, giữ liên tục khi chạy đường thẳng (bỏ bội 2π) */
export function ikNearest(T, qRef) {
  const sols = ik(T);
  if (!sols.length) return null;
  let best = sols[0], bd = Infinity;
  for (const s of sols) { const d = dist(s.q, qRef); if (d < bd) { bd = d; best = s; } }
  return best.q.map((v, i) => qRef[i] + wrapPi(v - qRef[i]));
}

// ---------- Jacobian, chỉ số thao tác ----------
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const col = (F, k) => [F[k], F[4 + k], F[8 + k]];
export const pos = (F) => [F[3], F[7], F[11]];
export function jacobian(F) {
  const pe = pos(F[6]), J = [];
  for (let i = 0; i < 6; i++) {
    const z = col(F[i], 2), p = pos(F[i]);
    const v = cross(z, [pe[0] - p[0], pe[1] - p[1], pe[2] - p[2]]);
    J.push([...v, ...z]); // cột i
  }
  return J; // J[i] = cột i (6 phần tử)
}
function det(M) { // khử Gauss, M n×n (hàng)
  const n = M.length, A = M.map((r) => r.slice()); let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-14) return 0;
    if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; d = -d; }
    d *= A[c][c];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; }
  }
  return d;
}
/** Yoshikawa w = √det(J·Jᵀ) = |det J| với J vuông 6×6; tách phần tịnh tiến để dễ đọc: wv = √det(Jv·Jvᵀ) */
export function manip(J) {
  const rows = [0, 1, 2, 3, 4, 5].map((r) => J.map((c) => c[r]));
  const w = Math.abs(det(rows));
  const Jv = rows.slice(0, 3), JJ = [0, 1, 2].map((i) => [0, 1, 2].map((k) => Jv[i].reduce((s, v, j) => s + v * Jv[k][j], 0)));
  return {w, wv: Math.sqrt(Math.max(0, det(JJ)))};
}

/** Mô men giữ ở từng khớp do trọng lực (N·m), có tải tại bích cách bích dz (m) theo trục z6 */
export function gravity(F, payload = 0, tool = 0.12) {
  const pts = LINK.map((L, i) => {
    const T = F[i + 1];
    return {m: L.m, p: [T[0] * L.c[0] + T[1] * L.c[1] + T[2] * L.c[2] + T[3], T[4] * L.c[0] + T[5] * L.c[1] + T[6] * L.c[2] + T[7], T[8] * L.c[0] + T[9] * L.c[1] + T[10] * L.c[2] + T[11]], k: i};
  });
  if (payload > 0) { const T = F[6]; pts.push({m: payload, p: [T[3] + T[2] * tool, T[7] + T[6] * tool, T[11] + T[10] * tool], k: 5}); }
  return [0, 1, 2, 3, 4, 5].map((j) => {
    const z = col(F[j], 2), o = pos(F[j]); let t = 0;
    for (const P of pts) { if (P.k < j) continue; const r = [P.p[0] - o[0], P.p[1] - o[1], P.p[2] - o[2]]; const f = [0, 0, -P.m * G]; const m = cross(r, f); t += m[0] * z[0] + m[1] * z[1] + m[2] * z[2]; }
    return -t; // mô men động cơ phải sinh ra để giữ yên
  });
}

/** Tư thế khung bích từ vị trí và ma trận quay (hàng) */
export const pose = (R, p) => [R[0], R[1], R[2], p[0], R[3], R[4], R[5], p[1], R[6], R[7], R[8], p[2], 0, 0, 0, 1];
export const rotOf = (T) => [T[0], T[1], T[2], T[4], T[5], T[6], T[8], T[9], T[10]];
/** Hướng dụng cụ chĩa xuống, xoay quanh trục đứng một góc yaw */
export const downR = (yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [c, s, 0, s, -c, 0, 0, 0, -1]; };
/** Góc Euler kiểu vector quay (rx, ry, rz) như bảng UR hiển thị */
export function rotvec(R) {
  const tr = R[0] + R[4] + R[8], th = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  if (th < 1e-9) return [0, 0, 0];
  if (Math.PI - th < 1e-6) { const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)) * Math.sign(R[1] || 1), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2)) * Math.sign(R[2] || 1); return [x * th, y * th, z * th]; }
  const k = th / (2 * Math.sin(th));
  return [(R[7] - R[5]) * k, (R[2] - R[6]) * k, (R[3] - R[1]) * k];
}
/** Nội suy quay giữa hai ma trận (qua quaternion) */
export function slerpR(A, B, t) {
  const q = (R) => { const w = Math.sqrt(Math.max(0, 1 + R[0] + R[4] + R[8])) / 2, x = Math.sqrt(Math.max(0, 1 + R[0] - R[4] - R[8])) / 2 * Math.sign(R[7] - R[5] || 1), y = Math.sqrt(Math.max(0, 1 - R[0] + R[4] - R[8])) / 2 * Math.sign(R[2] - R[6] || 1), z = Math.sqrt(Math.max(0, 1 - R[0] - R[4] + R[8])) / 2 * Math.sign(R[3] - R[1] || 1); return [w, x, y, z]; };
  let a = q(A), b = q(B), d = a.reduce((s, v, i) => s + v * b[i], 0);
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  let r;
  if (d > 0.9995) r = a.map((v, i) => v + (b[i] - v) * t);
  else { const th = Math.acos(d), s = Math.sin(th); r = a.map((v, i) => (Math.sin((1 - t) * th) * v + Math.sin(t * th) * b[i]) / s); }
  const n = Math.hypot(...r); const [w, x, y, z] = r.map((v) => v / n);
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}
/** Hàm chia thời gian bậc năm: s(0)=0, s(1)=1, vận tốc và gia tốc đầu cuối bằng 0; vận tốc đỉnh 1,875 */
export const quintic = (x) => { const u = Math.max(0, Math.min(1, x)); return u * u * u * (10 + u * (-15 + 6 * u)); };
