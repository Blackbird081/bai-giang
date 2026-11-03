// Mô hình bơi của cá mập mako (Isurus oxyrinchus): một đầu vào là tốc độ bơi U, mọi đại lượng khác tính từ đó.
// Số đo thật: Waller, Queiroz, da Costa và cộng sự (2023), Direct measurement of cruising and burst swimming speeds of the
// shortfin mako shark with estimates of field metabolic rate, Journal of Fish Biology 103(5): 864–883, doi:10.1111/jfb.15475.
// Hai con dài khoảng 2 m, gắn thẻ ngoài khơi đảo Faial (Azores) tháng 6/2022; con cái S1 dài 197 cm mang cảm biến tốc độ cánh quạt.
// Vùng Strouhal: Taylor, Nudds, Thomas (2003), Nature 425: 707–711, doi:10.1038/nature02000.
// Phần nào là giả định của bài (bước sóng, biên độ đuôi, đường bao biên độ, robot 8 khớp) thì ghi rõ ngay chỗ đó.

export const L = 1.97; // m, tổng chiều dài con cái S1
export const CRUISE = {U: 0.90, f: 0.51, fsd: 0.16}; // tuần tra: tốc độ trung bình đo được, tần số vẫy đuôi trung bình (± độ lệch chuẩn)
export const BURST = {U: 5.02, f: 3.65, dur: 14}; // bứt tốc lớn nhất đo được, tần số vẫy lúc đó (tóm tắt bài báo), kéo dài 14 s
export const REG = {a: 1.24, b: 0.20, r2: 0.55}; // hồi quy của bài báo trên con S1: U = 1,24·f + 0,20
export const ST_BAND = [0.2, 0.4];
export const U_MIN = 0.3, U_MAX = 5.2;

/** tần số vẫy đuôi (Hz) theo tốc độ (m/s), đảo hồi quy U = a·f + b */
export const fOf = (U) => Math.max(0, (U - REG.b) / REG.a);

// sóng thân: y(s, t) = (A/2)·g(s)·sin(2π·s/λ − φ), s = 0 ở mũi, 1 ở cuối cuống đuôi, λ tính theo chiều dài thân.
// Đường bao bậc hai g(s) (g(1) = 1) là dạng thường dùng cho robot cá (RoboTuna, MIT); hệ số chọn cho kiểu cá ngừ: thân trước gần như đứng yên.
export const env = (s) => 0.02 - 0.12 * s + 1.1 * s * s;
export const lat = (s, phi, A, lam) => 0.5 * A * env(s) * Math.sin((2 * Math.PI * s) / lam - phi);
/** đạo hàm theo s của độ lệch ngang (m trên một đơn vị s) */
export const latDs = (s, phi, A, lam) => 0.5 * A * ((-0.12 + 2.2 * s) * Math.sin((2 * Math.PI * s) / lam - phi) + env(s) * ((2 * Math.PI) / lam) * Math.cos((2 * Math.PI * s) / lam - phi));
/** vận tốc ngang (m/s) của điểm s khi pha tăng với tốc độ ω = 2πf */
export const latDt = (s, phi, A, lam, f) => -0.5 * A * env(s) * Math.cos((2 * Math.PI * s) / lam - phi) * 2 * Math.PI * f;

// robot minh hoạ: thân trước cứng (pin, mạch điều khiển) rồi 8 khớp servo dồn về nửa sau, vây đuôi gắn sau khớp cuối
export const JOINTS = [0.4, 0.475, 0.55, 0.625, 0.7, 0.775, 0.85, 0.925];
export const LINK0 = 0.12; // đầu trước của đốt cứng đầu tiên
/** góc (rad) của đoạn thẳng nối hai điểm s0, s1 trên đường giữa, so với trục thân */
export const chordAng = (s0, s1, phi, A, lam) => Math.atan2(lat(s1, phi, A, lam) - lat(s0, phi, A, lam), (s1 - s0) * L);
/** góc 8 khớp: hiệu góc của hai đốt kề nhau (đốt i nối khớp i với khớp i+1, đốt cuối tới s = 1) */
export function jointAngles(phi, A, lam) {
  const pts = [LINK0, ...JOINTS, 1];
  const ang = [];
  for (let i = 0; i + 1 < pts.length; i++) ang.push(chordAng(pts[i], pts[i + 1], phi, A, lam));
  return JOINTS.map((_, i) => ang[i + 1] - ang[i]);
}

/** mọi đại lượng hiển thị, tính từ U và hai tham số giả định A/L, λ/L */
export function derive(U, AL, lam) {
  const f = fOf(U), A = AL * L, c = lam * L * f;
  return {f, A, stride: f > 0 ? U / f : 0, c, slip: c > 0 ? U / c : Infinity, St: U > 0 ? (f * A) / U : 0,
    drag: (U / CRUISE.U) ** 2, power: (U / CRUISE.U) ** 3, kmh: U * 3.6};
}
