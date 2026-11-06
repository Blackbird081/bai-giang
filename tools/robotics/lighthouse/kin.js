// Hải đăng khung sắt Sanibel Island (Florida, 1884): số đo, kích thước phỏng dựng, gió và tầm nhìn đèn.
// Đơn vị: mét, giây, newton.
//
// Số có nguồn (Wikipedia: Sanibel Island Light; ghi trên trang):
//  · tháp khung sắt vuông hình chóp, ống cầu thang ở giữa, đèn trên đỉnh; cầu thang xoắn bắt đầu cao khoảng 10 ft (3 m)
//  · tháp cao 98 ft (30 m); tâm đèn cao 102 ft (31 m) trên mực nước biển; móng cọc sắt, xong đầu năm 1884
//  · thắp lần đầu 20/8/1884; thấu kính Fresnel bậc 3; năm 1933: hai chớp trắng mỗi 10 giây, Fl(2) W 10s; tầm 13 hải lí
//  · tàu chở khung sắt chìm cách đảo 2 dặm (3 km); thợ lặn vớt được tất cả trừ hai chi tiết
//  · bão Ian (2022) làm mất một chân tháp
//  · thấu kính bậc 3: tiêu cự 500 mm (Wikipedia: Fresnel lens, bảng bậc thấu kính hải đăng)
//  · tầm nhìn địa lí có tính khúc xạ: d ≈ 2,08·(√H + √h) hải lí, H và h tính bằng mét (công thức hàng hải thông dụng,
//    Bowditch, The American Practical Navigator)
// GIẢ ĐỊNH (ghi trên trang): đáy rộng 10 m, đỉnh khung 3,2 m, bốn đoạn mỗi đoạn 6,4 m; mặt đất cao 1,5 m trên mực nước biển;
// chân là ống gang dày 25 mm; gang 7200 kg/m³; hệ số cản của thanh 1,2; hai tấm thấu kính lệch nhau 30°, quay một vòng 10 s.
export const LH = {
  b0: 10, bt: 3.2, sec: 4, hs: 6.4, ground: 1.5, focal: 31.1, stair0: 3.0, nominal: 13, period: 10, split: 30,
  rhoAir: 1.225, Cd: 1.2, iron: 7200, lensF: 0.5,
};
LH.top = LH.sec * LH.hs; // đỉnh khung (chân phòng trực)
LH.lens = LH.focal - LH.ground; // tâm đèn so với mặt đất
LH.half = (z) => (LH.b0 + (LH.bt - LH.b0) * (z / LH.top)) / 2; // nửa bề rộng khung ở cao z

/** tầm nhìn địa lí (hải lí) từ đèn cao H tới mắt người cao h (mét, trên mực nước biển) */
export const geoRange = (H, h) => 2.08 * (Math.sqrt(H) + Math.sqrt(h));
/** cường độ tương đối của chớp theo thời gian: thấu kính quay, hai tấm lệch nhau split độ; mỗi lần quét qua người xem là một chớp */
export function flash(t) {
  const ang = ((t / LH.period) * 360) % 360, w = 6; // bề rộng chùm ±3°
  const d = (a) => { let x = Math.abs(((ang - a) % 360 + 540) % 360 - 180); return Math.max(0, 1 - x / (w / 2)); };
  return Math.max(d(0), d(LH.split));
}
/** gió ngang: lực cản trên từng đoạn (diện tích chắn gió A) và mô men lật quanh chân tháp */
export function wind(v, secs) {
  const q = 0.5 * LH.rhoAir * v * v;
  const F = secs.map((s) => q * LH.Cd * s.A), M = secs.reduce((m, s, i) => m + F[i] * s.zc, 0);
  return {q, F, M, Ft: F.reduce((a, b) => a + b, 0)};
}
/** lực dọc trong bốn chân ở chân tháp: trọng lượng chia đều, mô men lật chia cho hai cặp chân cách nhau b0.
 * Dương: nén; âm: kéo (cọc phải giữ tháp khỏi bị nhổ lên). Gió thổi theo +x: chân phía x âm là phía đón gió. */
export function legForces(W, M) {
  const dN = M / (2 * LH.b0);
  return [W / 4 - dN, W / 4 + dN, W / 4 + dN, W / 4 - dN]; // chân (−,−), (+,−), (+,+), (−,+)
}
