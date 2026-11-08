// Cá thở bằng mang: số có nguồn và các phép tính của bài. Đơn vị ghi cạnh từng số.
//
// Số có nguồn (ghi trên trang):
//  · Wegner, Sepulveda, Bull và Graham (2010), Journal of Morphology 271: 36–49, bảng 3, quy về cá nặng 1 kg:
//    diện tích mang cá ngừ vằn 1846 mm²/g, cá ngừ vây vàng 1327 mm²/g, cá saba (Scomber japonicus) 1110 mm²/g;
//    trao đổi chất chuẩn SMR cá ngừ vây vàng 286 mg O₂/kg/h ở 25 °C (theo Brill 1987), cá saba 132 mg O₂/kg/h
//    (quy về 25 °C bằng Q10 = 2); hàng rào nước–máu ở họ cá thu ngừ chỉ 0,5–1,2 µm, các cá khác 2–11 µm;
//    phiến mang thứ cấp 30–36 mỗi mm ở cá ngừ vằn và cá thu, 24–33 ở cá ngừ vây vàng;
//    "cá ngừ là loài bắt buộc thở ép dòng (obligate ram ventilators), không dùng xoang nắp mang để đẩy nước".
//  · Hughes và Gray (1972), Biological Bulletin 143: 150–161: cá cóc Mỹ Opsanus tau, tổng diện tích mang
//    = 560,7·W^0,79 mm² (W tính bằng gam); 10–13 phiến mang thứ cấp mỗi mm.
//  · Roberts (1975), Biological Bulletin 148: 85–105: phần lớn cá thở ép dòng chuyển hẳn sang ép dòng ở 35–82 cm/s,
//    thường khi bơi tới khoảng 65 cm/s; cá đáy có hệ tia nắp mang lớn nói chung không thở ép dòng; cá thu Đại Tây
//    Dương trưởng thành sống nhờ bơi liên tục (dẫn Hall 1930); thở ép dòng của cá ngừ vằn tốn 1–3 % trao đổi chất
//    (dẫn Brown và Muir 1970); ước lượng công bơm nước khi cá nghỉ dao động 0,5–43 %.
//  · AMNH, Hall of Ocean Life: mang lấy khoảng 75 % lượng ô xi trong dòng nước đi qua.
//  · Benson và Krause (1984), Limnology and Oceanography 29: 620–632: nồng độ ô xi hoà tan bão hoà ở 1 atm.
//  · Không khí: 20,95 % thể tích là ô xi; ở 20 °C, 1 atm tính ra 279 mg/L (phương trình khí lí tưởng).
// GIẢ ĐỊNH (ghi trên trang): cùng hiệu suất 75 % cho mọi loài; mô hình trao đổi ngược dòng đơn giản với hai dòng cùng
// "sức chứa" và NTU = 3, chọn để khớp con số 75 %; cỡ cá vẽ 40 cm; nhịp vẽ miệng và nắp mang chỉ minh hoạ.
export const SRC = {
  wegner: 'Wegner và cộng sự 2010, J. Morphology 271: 36–49',
  hughes: 'Hughes và Gray 1972, Biol. Bull. 143: 150–161',
  roberts: 'Roberts 1975, Biol. Bull. 148: 85–105',
  amnh: 'AMNH, Hall of Ocean Life',
  benson: 'Benson và Krause 1984, Limnol. Oceanogr. 29: 620–632',
};
// loài trong bài; area và smr ở cá 1 kg; ram: 'bat-buoc' (cá ngừ), 'chuyen' (đổi khi bơi nhanh), 'khong' (cá đáy)
export const FISHES = [
  {id: 'saba', vi: 'Cá saba', sci: 'Scomber japonicus', area: 1110, smr: 132, lam: '30–36', barrier: '0,5–1,2', ram: 'chuyen', life: 'bầy cá nổi, bơi liên tục'},
  {id: 'kihada', vi: 'Cá ngừ vây vàng', sci: 'Thunnus albacares', area: 1327, smr: 286, lam: '24–33', barrier: '0,5–1,2', ram: 'bat-buoc', life: 'đại dương, không bao giờ dừng'},
  {id: 'seabass', vi: 'Cá vược Nhật', sci: 'Lateolabrax japonicus', area: null, smr: null, lam: null, barrier: '2–11', ram: 'chuyen', life: 'ven bờ, cửa sông'},
  {id: 'magochi', vi: 'Cá chai', sci: 'họ Platycephalidae', area: null, smr: null, lam: null, barrier: '2–11', ram: 'khong', life: 'nằm phục dưới đáy cát'},
];
export const SKIPJACK = 1846; // mm²/g, cá ngừ vằn (chỉ có trong biểu đồ)
export const toadArea = (W = 1000) => (560.7 * W ** 0.79) / W; // mm²/g, cá cóc Mỹ
export const UTIL = 0.75; // phần ô xi mang lấy được
export const RAM = {lo: 0.35, mid: 0.65, hi: 0.82}; // m/s
export const Q10 = 2, T_REF = 25;
export const AIR_O2 = (0.2095 * 101325) / (8.314462 * 293.15) * 32; // mg/L ở 20 °C

/** ô xi hoà tan bão hoà (mg/L) ở t °C, độ mặn S (‰), 1 atm: Benson và Krause 1984 */
export function o2Sat(t, S = 35) {
  const T = t + 273.15;
  return Math.exp(-139.34411 + 157570.1 / T - 66423080 / T ** 2 + 1.2438e10 / T ** 3 - 862194900000 / T ** 4 - S * (0.017674 - 10.754 / T + 2140.7 / T ** 2));
}
/** trao đổi chất chuẩn ở t °C, quy từ 25 °C bằng Q10 */
export const smrAt = (smr25, t) => smr25 * Q10 ** ((t - T_REF) / 10);
/** lít nước phải qua mang mỗi phút cho 1 kg cá */
export const waterPerMin = (smr25, t, S = 35) => smrAt(smr25, t) / (o2Sat(t, S) * UTIL) / 60;

// trao đổi ngược dòng và cùng chiều: hai dòng cùng sức chứa, NTU = 3
export const NTU = 3;
export const effCounter = (n = NTU) => n / (1 + n);
export const effCo = (n = NTU) => (1 - Math.exp(-2 * n)) / 2;
/** ô xi tương đối (0–1) của nước và máu tại vị trí x (0: nước vào, 1: nước ra) */
export function profile(x, counter, n = NTU) {
  // ngược dòng: máu vào ở x = 1 (chưa có ô xi), ra ở x = 0; hiệu hai dòng không đổi bằng 1 − hiệu suất
  if (counter) { const e = effCounter(n); return {w: 1 - e * x, b: e * (1 - x)}; }
  const k = Math.exp(-2 * n * x); return {w: 0.5 + 0.5 * k, b: 0.5 - 0.5 * k};
}
