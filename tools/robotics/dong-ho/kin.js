// Đồng hồ cơ lên dây tay ETA 6497-1 (gốc Unitas 6497): số đo, bố trí trục, chuỗi bánh răng và dao động của bánh lắc.
// Đơn vị hình học: milimét; vật lí: SI.
//
// Số có nguồn (ghi trên trang):
//  · ETA, tài liệu kĩ thuật CT 6497-1 (28/11/2016): cỡ 16½''', Ø 36,60 mm, cao 4,50 mm, 17 chân kính, 18.000 dao động/giờ
//    (A/h), góc nâng của bánh lắc 44°, trữ cót 46 giờ, chống sốc Incabloc, bộ chỉnh Etachron; danh mục chi tiết
//    (bánh thoát, bánh thứ ba, bánh giây, bánh trung tâm, hộp cót, cầu bánh răng, cầu hộp cót, bánh vương miện, bánh cóc,
//    cần thoát, cầu cần thoát, bánh lắc, cầu bánh lắc).
//  · Monochrome Watches, bài về Unitas 6497/6498: 6497 kiểu Lépine, kim giây nhỏ ở 9 giờ đối diện núm; ra đời thập niên
//    1950, đổi tên ETA 6497-1 năm 1967.
//  · Wikipedia, Lever escapement: bánh thoát gần như luôn có 15 răng; Thomas Mudge phát minh khoảng năm 1754.
//  · Wikipedia, Balance wheel: 18.000 nhịp/giờ là 5 nhịp/giây; bánh lắc quay khoảng 270° mỗi phía; chu kì do mô men quán
//    tính và độ cứng dây tóc quyết định; bộ chỉnh đổi độ dài hiệu dụng của dây tóc.
// GIẢ ĐỊNH (ghi trên trang): số răng từng bánh (chọn cho đúng tỉ số mà 18.000 dao động/giờ buộc phải có), vị trí các trục,
// bánh lắc Ø 12 mm và mô men quán tính 9·10⁻⁹ kg·m², dây cót giảm mô men tuyến tính còn 60 % khi gần hết, hệ số phẩm chất
// của bánh lắc Q = 180, biên độ 280° khi lên dây đủ.
export const W = {
  D: 36.6, H: 4.5, jewels: 17, vph: 18000, lift: 44, reserve: 46,
  f: 18000 / 7200, // một dao động = hai nhịp: 2,5 Hz
  I: 9e-9, Q: 180, A0: 280, tq0: 0.6,
  balR: 6.0, escTeeth: 15,
};
W.w0 = 2 * Math.PI * W.f;
W.kappa = W.I * W.w0 * W.w0; // độ cứng xoắn của dây tóc, N·m/rad

// chuỗi bánh răng: [tên, số răng bánh, số lá của bánh nhỏ (pinion) mà nó ăn khớp]
export const TRAIN = [
  {id: 'barrel', vn: 'Hộp cót', z: 72, mesh: 12, rph: 1 / 6},
  {id: 'center', vn: 'Bánh trung tâm', z: 80, pin: 12, mesh: 10, rph: 1},
  {id: 'third', vn: 'Bánh thứ ba', z: 75, pin: 10, mesh: 10, rph: 8},
  {id: 'fourth', vn: 'Bánh giây', z: 80, pin: 10, mesh: 8, rph: 60},
  {id: 'escape', vn: 'Bánh thoát', z: 15, pin: 8, rph: 600},
];
// kiểm tỉ số: bánh thoát 600 vòng/giờ × 15 răng × 2 nhịp mỗi răng = 18.000 nhịp/giờ
export const vphOfTrain = () => TRAIN.at(-1).rph * W.escTeeth * 2;

// bố trí trục (mm, nhìn từ mặt đáy: x sang phải, z về phía 6 giờ; núm ở −x, kim giây nhỏ ở +x)
const M = 0.12; // mô-đun bánh răng giả định cho bánh trung tâm, thứ ba, giây
const meet = (A, rA, B, rB, side) => { // điểm cách A một đoạn rA và cách B một đoạn rB
  const dx = B[0] - A[0], dz = B[1] - A[1], d = Math.hypot(dx, dz), a = (rA * rA - rB * rB + d * d) / (2 * d), h = Math.sqrt(Math.max(0, rA * rA - a * a));
  const mx = A[0] + (a * dx) / d, mz = A[1] + (a * dz) / d;
  return [mx - (side * h * dz) / d, mz + (side * h * dx) / d];
};
export const R = { // bán kính vòng lăn
  center: (80 * M) / 2, third: (75 * M) / 2, fourth: (80 * M) / 2, pinT: (10 * M) / 2, pinF: (10 * M) / 2, pinE: (8 * M) / 2, pinC: (12 * 0.16) / 2,
  barrel: (72 * 0.16) / 2, esc: 2.6, ratchet: 4.6, crownW: 2.4,
};
const L = {center: [0, 0], fourth: [10.2, 1.2]};
L.third = meet(L.center, R.center + R.pinT, L.fourth, R.third + R.pinF, -1);
L.escape = (() => { const a = (112 * Math.PI) / 180, d = R.fourth + R.pinE; return [L.fourth[0] + d * Math.cos(a), L.fourth[1] + d * Math.sin(a)]; })();
L.balance = [3.4, 10.8];
L.pallet = [L.escape[0] + (L.balance[0] - L.escape[0]) * 0.42, L.escape[1] + (L.balance[1] - L.escape[1]) * 0.42];
L.barrel = (() => { const a = (229 * Math.PI) / 180, d = R.barrel + R.pinC; return [d * Math.cos(a), d * Math.sin(a)]; })();
L.crownW = (() => { const a = (196 * Math.PI) / 180, d = R.ratchet + R.crownW; return [L.barrel[0] + d * Math.cos(a), L.barrel[1] + d * Math.sin(a)]; })();
export {L};

// bánh lắc: con lắc xoắn có cản, được bộ thoát đẩy mỗi khi đi qua vùng góc nâng
const LIFT = (W.lift * Math.PI) / 180, ZETA = 1 / (2 * W.Q);
const A0 = (W.A0 * Math.PI) / 180;
// năng lượng đẩy mỗi nửa chu kì = năng lượng cản mất: τ'·nâng = ζ·ω²·π·A² (tính trên đơn vị mô men quán tính)
export const TQ1 = (ZETA * W.w0 * W.w0 * Math.PI * A0 * A0) / LIFT;
export const torqueOf = (hours) => (hours > 0 ? W.tq0 + (1 - W.tq0) * Math.min(1, hours / W.reserve) : 0);
/** biên độ ổn định (độ) theo số giờ cót còn lại; tỉ lệ với căn bậc hai của mô men */
export const ampOf = (hours) => (hours > 0 ? W.A0 * Math.sqrt(torqueOf(hours)) : 0);

export function createBalance() {
  const s = {th: A0, om: 0, kI: 1, kK: 1, imp: true, hours: 40, beats: 0, lastSign: 1, peak: A0, amp: A0, tLast: 0, t: 0, periods: [], beatT: [], drive: 0};
  s.w = () => Math.sqrt((W.kappa * s.kK) / (W.I * s.kI)); // ω riêng hiện tại
  s.freq = () => s.w() / (2 * Math.PI);
  /** tích phân h giây (bước nhỏ, bán ẩn Euler); trả về số nhịp vừa xảy ra */
  s.step = (dt) => {
    let beats = 0;
    const n = Math.max(1, Math.ceil(dt / 0.0004)), h = dt / n, w = s.w(), c = 2 * ZETA * w;
    for (let i = 0; i < n; i++) {
      const drive = s.imp && s.hours > 0 && Math.abs(s.th) < LIFT / 2 ? TQ1 * (w * w) / (W.w0 * W.w0) * torqueOf(s.hours) * Math.sign(s.om || 1) : 0;
      s.drive = drive;
      s.om += (-w * w * s.th - c * s.om + drive) * h;
      const th0 = s.th; s.th += s.om * h; s.t += h;
      s.peak = Math.max(s.peak, Math.abs(s.th));
      if ((th0 < 0) !== (s.th < 0)) { // đi qua vị trí cân bằng: một nhịp (nội suy thời điểm cắt 0)
        const tc = s.t - h + (h * th0) / (th0 - s.th);
        s.beatT.push(tc); if (s.beatT.length > 9) s.beatT.shift();
        if (s.imp && s.hours > 0) { beats++; s.beats++; }
        if (s.th > 0) { s.amp = s.peak; s.peak = 0; if (s.tLast) s.periods.push(tc - s.tLast); s.tLast = tc; if (s.periods.length > 6) s.periods.shift(); }
      }
    }
    if (s.imp) s.hours = Math.max(0, s.hours - dt / 3600);
    return beats;
  };
  /** chu kì đo được từ các lần đi qua cân bằng (s) */
  s.period = () => (s.periods.length ? s.periods.reduce((a, b) => a + b, 0) / s.periods.length : 1 / s.freq());
  /** sai số ngày (giây/ngày) so với 2,5 Hz danh định */
  s.rate = () => 86400 * (1 / (s.period() * W.f) - 1);
  return s;
}
