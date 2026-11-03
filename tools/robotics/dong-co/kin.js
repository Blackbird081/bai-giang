// Động cơ xăng 4 kì một xi lanh: mọi tư thế, bảng số và biểu đồ là hàm của MỘT đầu vào, góc trục khuỷu ψ trong chu trình
// 0..720° (0 = điểm chết trên đầu kì nạp). Không có thứ gì chuyển động bằng tay. Cách làm theo teardown (MIT): mô hình trước,
// hình sau. Không dùng three.js ở đây. Đơn vị: mét, độ, bar.
//
// Số thật (Honda Việt Nam, Wave Alpha 110, honda.com.vn): động cơ 4 kì, 1 xi lanh, làm mát bằng không khí; đường kính ×
// hành trình pít-tông 50,0 × 55,6 mm; dung tích 109,2 cm³; tỉ số nén 9,0 : 1; 6,12 kW / 7.500 vòng/phút; 8,44 N·m / 5.500.
// Kiểm tay: Vct = π·D²·S/4 = π·(5,0 cm)²·5,56 cm / 4 = 109,17 cm³ ≈ 109,2 cm³ công bố.
// Giả định (ghi rõ trên bảng): thanh truyền 100 mm (l/r = 3,6, trong khoảng 3–4 của động cơ cỡ nhỏ và vừa, Heywood 1988);
// độ nâng xupap 5,5 mm và góc phối khí thực tế là giá trị điển hình minh hoạ; áp suất là mô hình gần đúng (nén, dãn đa biến).
export const E = {D: 0.050, S: 0.0556, l: 0.100, eps: 9.0, ch: 0.022, lift: 0.0055};
export const R = E.S / 2;
export const AREA = (Math.PI * E.D * E.D) / 4;
export const VCT = AREA * E.S; // thể tích công tác, m³
export const cm3 = (v) => v * 1e6;
const mod = (a, m) => ((a % m) + m) % m;

/** khoảng cách tâm trục khuỷu → chốt pít-tông, θ = 0 ở ĐCT (cơ cấu tay quay – con trượt, chính xác) */
export const pinDist = (th) => {
  const a = (th * Math.PI) / 180;
  return R * Math.cos(a) + Math.sqrt(E.l * E.l - (R * Math.sin(a)) ** 2);
};
/** vị trí chốt khuỷu trong mặt phẳng (x ngang, y dọc trục xi lanh), quay thuận chiều kim đồng hồ nhìn từ trước */
export const crankPin = (th) => { const a = (th * Math.PI) / 180; return [R * Math.sin(a), R * Math.cos(a)]; };
/** pít-tông cách ĐCT bao nhiêu mét (0 ở ĐCT, S ở ĐCD) */
export const fromTDC = (th) => R + E.l - pinDist(th);
/** tỉ số nén → thể tích buồng cháy và chiều cao khe hở (nắp phẳng, gần đúng) */
export const vbc = (eps = E.eps) => VCT / (eps - 1);
export const gapH = (eps = E.eps) => E.S / (eps - 1);
/** thể tích xi lanh tính theo Vbc (1 ở ĐCT, ε ở ĐCD) */
export const vol = (ps, eps = E.eps) => 1 + (eps - 1) * (fromTDC(ps) / E.S);

export const STROKES = [
  {k: 'NAP', t: 'Kì 1 · Nạp', c: '#3c79a8'},
  {k: 'NEN', t: 'Kì 2 · Nén', c: '#7a5ab8'},
  {k: 'CHAY', t: 'Kì 3 · Cháy – dãn nở', c: '#e3562a'},
  {k: 'THAI', t: 'Kì 4 · Thải', c: '#8b8278'},
];
export const strokeIdx = (ps) => Math.floor(mod(ps, 720) / 180);

// xupap: độ nâng 0..1 là một bướu sin² giữa góc mở và góc đóng (độ trong chu trình 0..720)
// lí thuyết: mở đúng ở các điểm chết; thực tế (minh hoạ điển hình): nạp mở sớm 10° trước ĐCT, đóng muộn 40° sau ĐCD,
// thải mở sớm 40° trước ĐCD, đóng muộn 10° sau ĐCT; hai xupap cùng hé quanh ĐCT cuối kì thải (trùng điệp)
export const TIMING = {
  ideal: {in: [0, 180], ex: [540, 720]},
  real: {in: [-10, 220], ex: [500, 730]},
};
const bump = (ps, [a, b]) => {
  const x = mod(ps - a, 720) / (b - a);
  return x >= 0 && x <= 1 ? Math.sin(Math.PI * x) ** 2 : 0;
};
export const liftIn = (ps, real) => bump(ps, (real ? TIMING.real : TIMING.ideal).in);
export const liftEx = (ps, real) => bump(ps, (real ? TIMING.real : TIMING.ideal).ex);

/** áp suất trong xi lanh, bar (tuyệt đối). spark=false: không có tia lửa, khí nén chỉ dãn ngược lại, không sinh công. */
export const pressure = (ps, {eps = E.eps, spark = true} = {}) => {
  ps = mod(ps, 720);
  const V = vol(ps, eps);
  if (ps < 180) return 0.92;
  if (ps >= 540) return 1.05 + 0.5 * Math.max(0, 1 - (ps - 540) / 50);
  const comp = 0.95 * Math.pow(eps / V, 1.32);
  if (ps < 360 || !spark) return comp;
  // cháy: áp suất tăng vọt trong ~12° đầu sau ĐCT, rồi dãn nở đa biến. Hệ số 4,0 hiệu chỉnh để áp suất chỉ thị trung bình
  // ≈ 10,5 bar ở ε = 9: công suất chỉ thị ở 7.500 vòng/phút ≈ 7,2 kW, lớn hơn 6,12 kW có ích Honda công bố một khoảng ma sát hợp lí.
  const pc = 0.95 * Math.pow(eps, 1.32);
  const burn = 4.0 * pc * Math.pow(1 / V, 1.28);
  const k = Math.min(1, (ps - 360) / 12);
  return Math.max(1.05, comp + (burn - comp) * (k * k * (3 - 2 * k)));
};

/** công chỉ thị của một chu trình W = ∮p dV (J), áp suất chỉ thị trung bình p_tb = W / Vct (bar) */
export const cycleWork = (o = {}) => {
  const eps = o.eps ?? E.eps; let W = 0;
  for (let a = 0; a < 720; a += 0.5) {
    const v0 = vol(a, eps) * vbc(eps), v1 = vol(a + 0.5, eps) * vbc(eps);
    W += ((pressure(a, o) + pressure(a + 0.5, o)) / 2) * 1e5 * (v1 - v0);
  }
  return {W, imep: W / VCT / 1e5};
};
/** hiệu suất lí thuyết của chu trình Otto: η = 1 − 1/ε^(γ−1), γ = 1,4 */
export const otto = (eps) => 1 - Math.pow(eps, -0.4);
/** tốc độ trung bình của pít-tông, m/s: 2·S·n/60 */
export const pistonSpeed = (rpm) => (2 * E.S * rpm) / 60;
/** hoà khí, khí cháy, khí thải: 0 hoà khí, 1 bị nén, 2 đang cháy, 3 khí thải */
export const chargeOf = (ps, spark = true) => {
  ps = mod(ps, 720);
  if (ps < 180) return 0;
  if (ps < 360) return 1;
  if (ps < 540) return spark ? (ps < 420 ? 2 : 3) : 1;
  return 3;
};
