// Robot sáu chân kiểu PhantomX AX (18 servo Dynamixel AX-12A): IK chân 3 bậc giải tích, bộ sinh dáng đi theo hệ số
// chống β (tripod 1/2, tetrapod 2/3, wave 5/6), đa giác chống đỡ, biên ổn định tĩnh, mô men servo ước lượng.
// Đơn vị: mét, radian, giây. Khung thân: x tiến, y trái, z lên.
export const LEG = {coxa: 0.052, femur: 0.066, tibia: 0.133}; // cấu hình Phoenix cho PhantomX (femur, tibia: tác giả ghi "đoán")
export const NAMES = ['RF', 'RM', 'RR', 'LF', 'LM', 'LR'];
export const VN = {RF: 'PHẢI TRƯỚC', RM: 'PHẢI GIỮA', RR: 'PHẢI SAU', LF: 'TRÁI TRƯỚC', LM: 'TRÁI GIỮA', LR: 'TRÁI SAU'};
const MOUNT = {F: [0.12, 0.06], M: [0, 0.1], R: [-0.12, 0.06]}; // Phoenix: 60/100 mm ngang, 120 mm dọc
const HEAD = {F: 45, M: 90, R: 135};
export const LEGS = NAMES.map((n) => {
  const side = n[0] === 'R' ? -1 : 1, k = n[1];
  const m = MOUNT[k], psi = (side * HEAD[k] * Math.PI) / 180;
  return {name: n, side, mount: [m[0], side * m[1]], psi};
});
export const REACH0 = 0.147; // khoảng nằm ngang mặc định từ khớp háng tới bàn chân (Phoenix cHexInitXZ)
export const GAITS = {
  tripod: {beta: 1 / 2, off: {RF: 0, LM: 0, RR: 0, LF: 0.5, RM: 0.5, LR: 0.5}, vn: 'TRIPOD', groups: '(RF, LM, RR) ↔ (LF, RM, LR)'},
  tetrapod: {beta: 2 / 3, off: {LR: 0, RM: 0, LM: 1 / 3, RF: 1 / 3, LF: 2 / 3, RR: 2 / 3}, vn: 'TETRAPOD', groups: '(LR, RM) → (LM, RF) → (LF, RR)'},
  wave: {beta: 5 / 6, off: {RR: 0, RM: 1 / 6, RF: 2 / 6, LR: 3 / 6, LM: 4 / 6, LF: 5 / 6}, vn: 'WAVE', groups: 'RR → RM → RF → LR → LM → LF'},
};
export const SERVO = {name: 'AX-12A', stall: 1.5, speed: 59, range: 300}; // ROBOTIS: 1,5 N·m @12 V, 59 rpm, 300°

/** IK một chân: vị trí bàn chân trong khung thân (đã trừ tư thế thân), trả góc háng γ, đùi α (trên phương ngang), gối β (góc trong) */
export function legIK(L, foot, bodyH) {
  const dx = foot[0] - L.mount[0], dy = foot[1] - L.mount[1], c = Math.cos(-L.psi), s = Math.sin(-L.psi);
  const u = dx * c - dy * s, v = dx * s + dy * c;
  const gamma = Math.atan2(v, u);
  const r = Math.hypot(u, v) - LEG.coxa, z = bodyH - foot[2];
  const D = Math.hypot(r, z), F = LEG.femur, T = LEG.tibia;
  const ok = D <= F + T - 1e-4 && D >= Math.abs(T - F) + 1e-4;
  const Dc = Math.min(F + T - 1e-4, Math.max(Math.abs(T - F) + 1e-4, D));
  const alpha = Math.acos((F * F + Dc * Dc - T * T) / (2 * F * Dc)) - Math.atan2(z, r);
  const beta = Math.acos((F * F + T * T - Dc * Dc) / (2 * F * T));
  return {gamma, alpha, beta, r, z, ok};
}
/** Điểm khớp của chân trong khung thân từ góc: háng, đầu đùi (gối), bàn chân */
export function legPoints(L, a, bodyH) {
  const ang = L.psi + a.gamma, ex = Math.cos(ang), ey = Math.sin(ang);
  const hip = [L.mount[0], L.mount[1], bodyH];
  const fem = [hip[0] + ex * LEG.coxa, hip[1] + ey * LEG.coxa, bodyH];
  const knee = [fem[0] + ex * LEG.femur * Math.cos(a.alpha), fem[1] + ey * LEG.femur * Math.cos(a.alpha), bodyH + LEG.femur * Math.sin(a.alpha)];
  const tA = a.alpha - (Math.PI - a.beta); // hướng ống chân
  const foot = [knee[0] + ex * LEG.tibia * Math.cos(tA), knee[1] + ey * LEG.tibia * Math.cos(tA), knee[2] + LEG.tibia * Math.sin(tA)];
  return {hip, fem, knee, foot, ex, ey};
}

/** Vị trí bàn chân (khung thân) theo pha: stance kéo lùi tuyến tính, swing đưa lên theo nửa sin */
export function footAt(L, phase, g, cmd, Tc) {
  const n = [L.mount[0] + Math.cos(L.psi) * (LEG.coxa + REACH0), L.mount[1] + Math.sin(L.psi) * (LEG.coxa + REACH0)];
  const p = (((phase + g.off[L.name]) % 1) + 1) % 1, stance = p < g.beta;
  // s: +1 đầu pha chống (bàn chân phía trước), −1 cuối pha chống
  let s, lift = 0;
  if (stance) s = 1 - (2 * p) / g.beta;
  else { const u = (p - g.beta) / (1 - g.beta); s = -1 + 2 * (u * u * (3 - 2 * u)); lift = Math.sin(Math.PI * u); }
  const half = g.beta * Tc / 2; // nửa thời gian chống
  const th = s * cmd.w * half, c = Math.cos(th), sn = Math.sin(th);
  const x = n[0] * c - n[1] * sn + s * cmd.vx * half, y = n[0] * sn + n[1] * c + s * cmd.vy * half;
  return {pos: [x, y, lift * cmd.lift], stance, p, s};
}

/** Bao lồi (Andrew), điểm 2D */
export function hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Biên ổn định tĩnh: khoảng cách nhỏ nhất từ hình chiếu trọng tâm tới cạnh đa giác chống đỡ (âm nếu nằm ngoài) */
export function margin(poly, c = [0, 0]) {
  if (poly.length < 3) return {m: -1, a: null, b: null};
  let best = Infinity, ea = null, eb = null, inside = true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    const d = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / L; // >0 nếu c ở bên phải cạnh (đa giác ngược chiều kim)
    if (d > 0) inside = false;
    const t = Math.max(0, Math.min(1, ((c[0] - a[0]) * ex + (c[1] - a[1]) * ey) / (L * L)));
    const dist = Math.hypot(a[0] + t * ex - c[0], a[1] + t * ey - c[1]);
    if (dist < best) { best = dist; ea = a; eb = b; }
  }
  return {m: inside ? best : -best, a: ea, b: eb};
}
