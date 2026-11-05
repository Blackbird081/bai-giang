// Sứa robot: chuông co lại đẩy nước ra, nước đẩy chuông đi (định luật III, động lượng). Mô hình một chiều dọc trục chuông.
// Đơn vị: mét, giây, kilôgam, newton.
//
// Nguồn:
//  · Cyro (Virginia Tech, 2013, nhóm S. Priya; Live Science 29/3/2013): dài 1,7 m, nặng 77 kg, chuông silicone, cánh tay
//    co hướng tâm; trong giếng lặn sâu 4,3 m (14 ft) nó lên từ độ sâu 2,4 m (8 ft) tới mặt nước sau 5 nhịp.
//  · Lực phụt (Daniel 1983, dùng trong Dabiri, Colin, Costello 2007, J. Exp. Biol. 210:1868): F = (ρ/A)(dV/dt)²,
//    A = πD²/4 là miệng chuông, V ≈ (π/6)·H·D² là khoang chuông hình bán elipxôit.
//  · Robojelly (Colin và cộng sự 2012, PLoS ONE 7:e48909): chuông 164 mm, 8 bộ chấp hành cách nhau 45°, nhịp 0,7 Hz.
// GIẢ ĐỊNH của bài (ghi trên trang): đường kính chuông lấy bằng 1,7 m, cao chuông 0,55 m; khối nước kéo theo bằng nửa
// khối nước trong khoang; hệ số cản 0,6; biên độ co 31 % đường kính chọn để (với nổi dư −3 N) 5 nhịp đi được 2,4 m như Cyro.
export const JF = {
  rho: 1025, g: 9.81, D0: 1.7, H0: 0.55, m: 77, Cd: 0.6, ka: 0.5, a0: 0.31, tank: 4.3, lift: 0.6, tentL: 1.2,
  z0: 1.35, // mép chuông lúc thả: đỉnh chuông sâu 2,4 m như Cyro
};
JF.V0 = (Math.PI / 6) * JF.H0 * JF.D0 * JF.D0;
JF.ma = JF.ka * JF.rho * JF.V0;
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** độ co của chuông theo pha nhịp p ∈ [0, 1): co nhanh trong phần δ đầu, giãn chậm phần còn lại */
export const contraction = (p, duty) => (p < duty ? sm(p / duty) : 1 - sm((p - duty) / (1 - duty)));
/** hình chuông khi co c ∈ [0, 1] với biên độ a: đường kính, chiều cao, thể tích khoang, diện tích miệng */
export function bell(c, a) {
  const D = JF.D0 * (1 - a * c), H = JF.H0 * (1 + JF.lift * a * c);
  return {D, H, V: (Math.PI / 6) * H * D * D, A: (Math.PI * D * D) / 4};
}
/** lực phụt dọc trục chuông (dương: về phía đỉnh chuông). Nước ra khi V giảm, hút vào khi V tăng (lực ngược) */
export const jet = (dVdt, A) => (-Math.sign(dVdt) * JF.rho * dVdt * dVdt) / A;
/** tốc độ dòng nước qua miệng chuông */
export const jetSpeed = (dVdt, A) => Math.abs(dVdt) / A;
