// Crazyflie 2.x: thân cứng 6 bậc tự do theo nhận dạng của Förster (2015), bộ điều khiển PID xếp tầng đúng cấu trúc
// và hệ số mặc định của crazyflie-firmware (vị trí 100 Hz → vận tốc → góc 500 Hz → tốc độ góc 500 Hz → bộ trộn legacy).
// Khung thân: x tiến, y trái, z lên. Góc lăn dương: bên trái lên. Góc chúc dương: mũi ngóc lên (quy ước của firmware).
export const P = {
  m: 0.028, J: [1.657171e-5, 1.6655602e-5, 2.9261652e-5], g: 9.81, arm: 0.046, // Förster 2015; ARM_LENGTH firmware
  thrust: (c) => 2.130295e-11 * c * c + 1.032633e-6 * c + 5.48456e-4, // N mỗi động cơ, c ∈ [0, 65535]
  omega: (c) => 0.04076521 * c + 380.8359, // rad/s
  torque: (f) => 0.005964552 * f + 1.563383e-5, // N·m mỗi rô-to
  tau: 0.0646, // hằng số thời gian động cơ, từ hàm truyền rời rạc của Förster (cực 0,9695 ở 500 Hz)
  kaero: [-9.1785e-7, -9.1785e-7, -10.311e-7], // cản khí động đơn giản của Förster, nhân tổng tốc độ rô-to
};
const d = P.arm / Math.SQRT2; // tay đòn mỗi trục, cấu hình X
export const MOTORS = [ // M1 trước phải, M2 sau phải, M3 sau trái, M4 trước trái; s: chiều mô men phản lực quanh z suy từ dấu của bộ trộn
  {x: d, y: -d, s: -1}, {x: -d, y: -d, s: 1}, {x: -d, y: d, s: -1}, {x: d, y: d, s: 1},
];
export const GAINS = { // crazyflie-firmware, nhánh master đọc ngày 31/10/2026
  rate: {roll: [250, 500, 2.5, 33.3], pitch: [250, 500, 2.5, 33.3], yaw: [120, 16.7, 0, 166.7]},
  att: {roll: [6, 3, 0, 20], pitch: [6, 3, 0, 20], yaw: [6, 1, 0.35, 360]},
  vel: {x: [25, 1, 0], y: [25, 1, 0], z: [25, 15, 0]}, pos: {x: [2, 0, 0], y: [2, 0, 0], z: [2, 0.5, 0]},
  thrustBase: 36000, thrustMin: 20000, thrustScale: 1000, rpLimit: 20, velMax: 1,
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
class PID {
  constructor([kp, ki, kd, ilim = 1e9], olim = 1e9) { Object.assign(this, {kp, ki, kd, ilim, olim, i: 0, prev: 0, p: 0, dd: 0, out: 0}); }
  run(err, dt, kscale = 1) {
    this.i = clamp(this.i + err * dt, -this.ilim, this.ilim);
    const der = (err - this.prev) / dt; this.prev = err;
    this.p = this.kp * kscale * err; this.ii = this.ki * kscale * this.i; this.dd = this.kd * kscale * der;
    this.out = clamp(this.p + this.ii + this.dd, -this.olim, this.olim);
    return this.out;
  }
  reset() { this.i = 0; this.prev = 0; }
}
const R0 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mulR = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
const orth = (R) => { // Gram–Schmidt giữ ma trận quay trực chuẩn
  const x = [R[0], R[3], R[6]], y = [R[1], R[4], R[7]];
  let n = Math.hypot(...x); x.forEach((v, i) => (x[i] = v / n));
  const dp = x[0] * y[0] + x[1] * y[1] + x[2] * y[2]; y.forEach((v, i) => (y[i] = v - dp * x[i])); n = Math.hypot(...y); y.forEach((v, i) => (y[i] = v / n));
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};
export const euler = (R) => ({roll: Math.atan2(R[7], R[8]) * 57.29578, pitch: Math.asin(clamp(R[6], -1, 1)) * 57.29578, yaw: Math.atan2(R[3], R[0]) * 57.29578}); // pitch: mũi lên dương

export function createQuad() {
  const S = {
    p: [0, 0, 0], v: [0, 0, 0], R: R0(), w: [0, 0, 0], f: [0, 0, 0, 0], pwm: [0, 0, 0, 0], t: 0, k1: 0, k2: 0,
    mode: 'off', sp: {x: 0, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0}, armed: false, ground: true,
    kRate: 1, kAtt: 1, wind: [0, 0, 0], kick: [0, 0, 0], kickT: 0,
    rng: (() => { let a = 12345; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })(), gPrev: null, gyro: {roll: 0, pitch: 0, yaw: 0},
    pid: {}, cmd: {roll: 0, pitch: 0, yaw: 0, thrust: 0}, att: {roll: 0, pitch: 0, yawRate: 0}, rateSp: {roll: 0, pitch: 0, yaw: 0},
  };
  const mk = () => ({
    rr: new PID(GAINS.rate.roll, 32767), rp: new PID(GAINS.rate.pitch, 32767), ry: new PID(GAINS.rate.yaw, 32767),
    ar: new PID(GAINS.att.roll), ap: new PID(GAINS.att.pitch), ay: new PID(GAINS.att.yaw),
    vx: new PID(GAINS.vel.x, GAINS.rpLimit * 1.1), vy: new PID(GAINS.vel.y, GAINS.rpLimit * 1.1), vz: new PID(GAINS.vel.z, 65535 / 2 / 1000),
    px: new PID(GAINS.pos.x, 1.1), py: new PID(GAINS.pos.y, 1.1), pz: new PID(GAINS.pos.z, 1.1),
  });
  S.pid = mk();
  const reset = () => { Object.assign(S, {p: [0, 0, 0], v: [0, 0, 0], R: R0(), w: [0, 0, 0], f: [0, 0, 0, 0], pwm: [0, 0, 0, 0], t: 0, mode: 'off', ground: true, wind: [0, 0, 0], kick: [0, 0, 0], kickT: 0}); S.sp = {x: 0, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0}; S.pid = mk(); };

  // bộ điều khiển: gọi mỗi 2 ms (500 Hz); vòng vị trí chạy mỗi lần thứ năm (100 Hz)
  const control = () => {
    const e = euler(S.R), pid = S.pid, dtA = 0.002;
    if (S.mode === 'off') { S.pwm = [0, 0, 0, 0]; return; }
    if (S.k2++ % 5 === 0) { // 100 Hz
      const dtP = 0.01, yaw = (e.yaw * Math.PI) / 180, cy = Math.cos(yaw), sy = Math.sin(yaw);
      let vsx = 0, vsy = 0, vsz = 0;
      if (S.mode === 'pos') { vsx = pid.px.run(S.sp.x - S.p[0], dtP); vsy = pid.py.run(S.sp.y - S.p[1], dtP); }
      vsz = pid.pz.run(S.sp.z - S.p[2], dtP);
      const bvx = S.v[0] * cy + S.v[1] * sy, bvy = -S.v[0] * sy + S.v[1] * cy, bsx = vsx * cy + vsy * sy, bsy = -vsx * sy + vsy * cy;
      if (S.mode === 'pos') { S.att.pitch = clamp(-pid.vx.run(bsx - bvx, dtP), -GAINS.rpLimit, GAINS.rpLimit); S.att.roll = clamp(-pid.vy.run(bsy - bvy, dtP), -GAINS.rpLimit, GAINS.rpLimit); }
      else { S.att.roll = S.sp.roll; S.att.pitch = S.sp.pitch; }
      S.cmd.thrust = Math.max(GAINS.thrustMin, Math.min(65535, pid.vz.run(vsz - S.v[2], dtP) * GAINS.thrustScale + GAINS.thrustBase));
      if (S.mode === 'land' && S.p[2] < 0.03) { S.mode = 'off'; }
    }
    // vòng góc → tốc độ góc (500 Hz)
    S.rateSp.roll = pid.ar.run(S.att.roll - e.roll, dtA, S.kAtt);
    S.rateSp.pitch = pid.ap.run(S.att.pitch - e.pitch, dtA, S.kAtt);
    S.rateSp.yaw = pid.ay.run(wrap180(S.sp.yaw - e.yaw), dtA, S.kAtt);
    // con quay BMI088: nhiễu trắng cỡ 0,4 °/s (mật độ 0,014 °/s/√Hz trên dải 1 kHz) và trễ một chu kỳ 2 ms
    const n = () => (S.rng() - 0.5) * 2 * 0.7;
    const gyro = S.gPrev || {roll: 0, pitch: 0, yaw: 0};
    S.gPrev = {roll: S.w[0] * 57.29578 + n(), pitch: -S.w[1] * 57.29578 + n(), yaw: S.w[2] * 57.29578 + n()}; S.gyro = gyro;
    S.cmd.roll = pid.rr.run(S.rateSp.roll - gyro.roll, dtA, S.kRate);
    S.cmd.pitch = pid.rp.run(S.rateSp.pitch - gyro.pitch, dtA, S.kRate);
    S.cmd.yaw = -pid.ry.run(S.rateSp.yaw - gyro.yaw, dtA, S.kRate); // firmware: control->yaw = -control->yaw
    // bộ trộn legacy: m1 = T − r + p + y; m2 = T − r − p − y; m3 = T + r − p + y; m4 = T + r + p − y (r, p chia đôi)
    const T = S.cmd.thrust, r = S.cmd.roll / 2, p = S.cmd.pitch / 2, y = S.cmd.yaw;
    S.pwm = [T - r + p + y, T - r - p - y, T + r - p + y, T + r + p - y].map((v) => clamp(v, 0, 65535));
  };

  // động lực học 1 kHz
  const physics = (dt) => {
    for (let i = 0; i < 4; i++) { const ft = S.pwm[i] > 0 ? P.thrust(S.pwm[i]) : 0; S.f[i] += (ft - S.f[i]) * (dt / P.tau); }
    const R = S.R;
    let Fz = 0, tx = 0, ty = 0, tz = 0, wsum = 0;
    MOTORS.forEach((m, i) => { Fz += S.f[i]; tx += m.y * S.f[i]; ty -= m.x * S.f[i]; tz += m.s * (S.f[i] > 1e-5 ? P.torque(S.f[i]) : 0); wsum += S.pwm[i] > 0 ? P.omega(S.pwm[i]) : 0; });
    // vận tốc thân, cản khí động
    const vb = [R[0] * S.v[0] + R[3] * S.v[1] + R[6] * S.v[2], R[1] * S.v[0] + R[4] * S.v[1] + R[7] * S.v[2], R[2] * S.v[0] + R[5] * S.v[1] + R[8] * S.v[2]];
    const vr = [vb[0] - (R[0] * S.wind[0] + R[3] * S.wind[1]), vb[1] - (R[1] * S.wind[0] + R[4] * S.wind[1]), vb[2]];
    const fb = [P.kaero[0] * wsum * vr[0], P.kaero[1] * wsum * vr[1], Fz + P.kaero[2] * wsum * vr[2]];
    const F = [R[0] * fb[0] + R[1] * fb[1] + R[2] * fb[2], R[3] * fb[0] + R[4] * fb[1] + R[5] * fb[2], R[6] * fb[0] + R[7] * fb[1] + R[8] * fb[2] - P.m * P.g];
    if (S.kickT > 0) { tx += S.kick[0]; ty += S.kick[1]; tz += S.kick[2]; S.kickT -= dt; }
    // mặt đất: không cho chui xuống, triệt tiêu xoay khi nằm trên đất
    S.ground = S.p[2] <= 0 && F[2] <= 0;
    if (S.ground) { S.v = [0, 0, 0]; S.w = [0, 0, 0]; S.p[2] = 0; const e = euler(S.R); if (Math.abs(e.roll) + Math.abs(e.pitch) > 0.01) S.R = (() => { const c = Math.cos(e.yaw / 57.29578), s = Math.sin(e.yaw / 57.29578); return [c, -s, 0, s, c, 0, 0, 0, 1]; })(); return; }
    for (let k = 0; k < 3; k++) { S.v[k] += (F[k] / P.m) * dt; S.p[k] += S.v[k] * dt; }
    if (S.p[2] < 0) { S.p[2] = 0; S.v[2] = Math.max(0, S.v[2]); }
    const J = P.J, w = S.w;
    const dw = [(tx - (w[1] * J[2] * w[2] - w[2] * J[1] * w[1])) / J[0], (ty - (w[2] * J[0] * w[0] - w[0] * J[2] * w[2])) / J[1], (tz - (w[0] * J[1] * w[1] - w[1] * J[0] * w[0])) / J[2]];
    for (let k = 0; k < 3; k++) S.w[k] += dw[k] * dt;
    const W = [0, -w[2] * dt, w[1] * dt, w[2] * dt, 0, -w[0] * dt, -w[1] * dt, w[0] * dt, 0];
    S.R = orth(mulR(S.R, [1 + W[0], W[1], W[2], W[3], 1 + W[4], W[5], W[6], W[7], 1 + W[8]]));
  };
  // bước thời gian bất kỳ: chia nhỏ 1 ms
  const step = (dt) => {
    let acc = S.acc || 0; acc += dt;
    while (acc >= 0.001) { if (S.k1++ % 2 === 0) control(); physics(0.001); S.t += 0.001; acc -= 0.001; }
    S.acc = acc;
  };
  return {S, step, reset, euler: () => euler(S.R)};
}
