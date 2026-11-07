// Nhện robot chân thuỷ lực theo nhện tarantula: số đo, động học chân, áp suất trong chân và dáng chạy.
// Đơn vị hình học: milimét; vật lí: SI.
//
// Số có nguồn (ghi trên trang):
//  · Booster và cộng sự, J. Exp. Biol. 218 (2015) 977, nhện Aphonopelma hentzi: khối lượng 15,53 g; tốc độ 21,0 cm/s
//    (3,97 thân/s) ở 16,8 °C, 53,2 cm/s (10,11 thân/s) ở 37,9 °C; tần số bước 3,83 Hz → 9,40 Hz; sải bước 5,97 cm
//    (1,13 thân), không đổi theo nhiệt độ; chân trước và chân sau chuyển động ngược pha nhưng cùng chống khi chạy;
//    khớp gần (đùi–gối) quét 70° ở chân trước, 53° ở chân sau; khớp xa (chày–bàn) 36° và 27°; thể tích dịch đổi
//    8–20 µl khi duỗi khớp. Chiều dài thân suy ra: 21,0 / 3,97 ≈ 5,3 cm.
//  · Wikipedia, Aphonopelma hentzi: sải chân trưởng thành hơn 10 cm.
//  · Wikipedia, Arachnid locomotion: khớp đùi–gối và khớp chày–bàn duỗi bằng áp suất dịch (thuỷ lực).
//  · Parry và Brown, J. Exp. Biol. 36 (1959) 423 (nhện nhà Tegenaria): áp suất nghỉ khoảng 5 cmHg (≈ 6,7 kPa), đỉnh
//    tức thời tới 40–45 cmHg (≈ 53–60 kPa); mô men duỗi tỉ lệ thuận với áp suất ở mỗi góc khớp.
//  · Landkammer và cộng sự, Robotics 5 (2016) 15, tổng hợp Kropf (2013), Blickhan và Barth (1985), Siebert và cộng sự
//    (2010): nghỉ 0,01–0,15 bar, khi cử động 0,1–0,64 bar, đỉnh 0,7 bar khi giãy; áp suất tăng 10 ms trước cử động;
//    phần đầu ngực co lại làm tăng áp suất ở mọi chân cùng lúc; chân có bảy đốt.
//  · Đại học Rice (Yap, Preston và cộng sự, Advanced Science 2022, "Necrobotics"): nhện chỉ có cơ gập, chân duỗi nhờ
//    áp suất; nhện chết mất áp suất nên chân co quắp; xác nhện sói bơm khí nâng được hơn 130 % khối lượng của nó,
//    chạy 1.000 lần đóng mở.
// GIẢ ĐỊNH (ghi trên trang): độ dài từng đốt chân (sải chân duỗi thẳng ≈ 12,7 cm, nguồn chỉ nói hơn 10 cm), tiết diện hiệu dụng × tay đòn của túi duỗi ở khớp
// A·r = 4,8·10⁻⁸ m³ (chọn để áp suất nghỉ vừa đủ đỡ thân trên tám chân), độ cao thân, góc khớp ban đầu.
export const SP = {
  m: 0.01553, g: 9.81, BL: 53, stride: 59.7, Ar: 4.8e-8,
  Prest: 6.7e3, Pmax: 70e3, // Pa
  T0: 16.8, T1: 37.9, f0: 3.83, f1: 9.40,
};
SP.W = SP.m * SP.g;
/** tần số bước theo nhiệt độ: nội suy theo hàm mũ giữa hai số đo của Booster và cộng sự (Q10 không đổi) */
export const strideHz = (T) => SP.f0 * Math.exp((Math.log(SP.f1 / SP.f0) * (T - SP.T0)) / (SP.T1 - SP.T0));
export const speedOf = (T) => strideHz(T) * SP.stride; // mm/s

// tám chân: thứ tự I–IV từ trước ra sau, mỗi chân độ dài riêng (mm): háng, chuyển, đùi, gối, chày, bàn, cổ chân
const SEG = {I: [5.0, 3.0, 14.5, 7.0, 10.5, 9.5, 6.0], II: [5.0, 3.0, 13.5, 6.5, 9.5, 9.0, 5.5], III: [4.8, 2.8, 12.0, 6.0, 8.0, 9.0, 5.0], IV: [5.2, 3.0, 14.0, 6.5, 10.5, 12.0, 6.0]};
export const SEG_VN = ['Háng', 'Chuyển', 'Đùi', 'Gối', 'Chày', 'Bàn', 'Cổ chân'];
// chân gắn quanh phần đầu ngực (dài 24 mm); góc toả ra nhìn từ trên (độ, 0 = hướng trước)
const ROOT = {I: [6.5, 4.8, 38], II: [3.0, 5.8, 72], III: [-1.0, 5.8, 108], IV: [-4.5, 4.8, 148]};
export const LEGS = [];
for (const s of [1, -1]) for (const id of ['I', 'II', 'III', 'IV']) {
  const L = SEG[id], [x, z, a] = ROOT[id];
  LEGS.push({id, side: s, name: `${s > 0 ? 'P' : 'T'}${id}`, vn: `${s > 0 ? 'phải' : 'trái'} ${id}`, seg: L, root: [x, z * s], yaw0: a * s,
    Lf: L[2], Lpt: L[3] + L[4], Lmt: L[5] + L[6], front: id === 'I' || id === 'II'});
}
// hai nhóm bốn chân xen kẽ (trái I, phải II, trái III, phải IV và nhóm kia): chân trước và chân sau cùng chống
export const GROUP = (L) => ((L.side > 0) === (L.id === 'II' || L.id === 'IV') ? 0 : 1);
const KAPPA = 0.55; // góc gập chày–bàn ≈ 0,55 × góc gập đùi–gối (giả định, theo tỉ lệ biên độ 36/70 và 27/53 của nguồn)

/** động học thuận trong mặt phẳng chân: α nâng đùi (rad, dương lên), β gập đùi–gối, γ = κβ gập chày–bàn.
 * trả về [điểm gối, điểm chày–bàn, đầu chân] theo (ρ ngang, h đứng) tính từ khớp chuyển–đùi */
export function legFK(L, a, b, curl = 0) {
  const g = KAPPA * b + curl * 0.9, p = [[0, 0]];
  let phi = a; p.push([p[0][0] + L.Lf * Math.cos(phi), p[0][1] + L.Lf * Math.sin(phi)]);
  phi -= b; p.push([p[1][0] + L.Lpt * Math.cos(phi), p[1][1] + L.Lpt * Math.sin(phi)]);
  phi -= g; p.push([p[2][0] + L.Lmt * Math.cos(phi), p[2][1] + L.Lmt * Math.sin(phi)]);
  return p;
}
/** động học nghịch: tìm (α, β) để đầu chân tới (ρ, h); Newton hai ẩn từ nghiệm trước */
export function legIK(L, rho, h, guess = [0.6, 1.6]) {
  let [a, b] = guess;
  for (let it = 0; it < 12; it++) {
    const p = legFK(L, a, b)[3], e = [rho - p[0], h - p[1]];
    if (Math.hypot(e[0], e[1]) < 1e-4) break;
    const d = 1e-4, pa = legFK(L, a + d, b)[3], pb = legFK(L, a, b + d)[3];
    const J = [[(pa[0] - p[0]) / d, (pb[0] - p[0]) / d], [(pa[1] - p[1]) / d, (pb[1] - p[1]) / d]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    if (Math.abs(det) < 1e-9) break;
    a += (J[1][1] * e[0] - J[0][1] * e[1]) / det; b += (-J[1][0] * e[0] + J[0][0] * e[1]) / det;
    b = Math.max(0.05, Math.min(2.6, b));
  }
  const p = legFK(L, a, b)[3];
  return {a, b, ok: Math.hypot(rho - p[0], h - p[1]) < 0.5};
}
/** mô men duỗi cần ở khớp đùi–gối khi chân đỡ lực N (newton): N × khoảng ngang từ khớp tới đầu chân (N·m) */
export const kneeTau = (L, a, b, N) => { const p = legFK(L, a, b); return N * Math.abs(p[3][0] - p[1][0]) * 1e-3; };
/** áp suất cần để túi duỗi sinh mô men đó: P = τ / (A·r) */
export const pNeed = (tau) => tau / SP.Ar;
