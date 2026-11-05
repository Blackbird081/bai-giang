// Tháp năm tầng chùa Hōryū-ji: số đo, kích thước phỏng dựng, và mô hình dao động khi động đất.
// Đơn vị: mét, giây.
//
// Số có nguồn:
//  · Cao khoảng 32,5 m tính từ nền (Bộ Đất đai, Hạ tầng, Giao thông và Du lịch Nhật Bản, cơ sở dữ liệu thuyết minh đa ngữ;
//    Wikipedia tiếng Nhật ghi 32,55 m, có nguồn khác ghi 31,5 m).
//  · Tầng 1 đến tầng 4 rộng ba gian, riêng tầng 5 hai gian; mái tầng 5 rộng khoảng một nửa mái tầng 1; tầng 1 có mái hiên phụ
//    (mokoshi) (Wikipedia tiếng Nhật, mục Ngũ trọng tháp).
//  · Cột tâm gỗ bách Nhật (hinoki), vòng năm ngoài cùng đo được là năm 594; xá lợi đặt ở đá nền dưới cột tâm sâu khoảng 3 m
//    (MLIT; phương pháp niên đại vòng năm, 2001).
//  · Cột tâm cao 31,5 m, đường kính chân 77,8 cm, giữa 65,1 cm, chia ba đoạn (JAANUS, mục shinbashira).
//  · Chu kỳ dao động riêng thứ nhất khoảng 1,1 s (Hanazato và cộng sự, 13WCEE 2004, bài 1223, dẫn số đo vi chấn ở Hōryū-ji).
//  · Tượng đất bốn mặt trong tầng 1 hoàn thành năm 711 (Wadō 4).
// GIẢ ĐỊNH (ghi trên trang): bề rộng thân tầng 1 là 5,6 m, chiều cao từng tầng, độ vươn mái, chóp; khối lượng các tầng bằng nhau,
// độ cứng chọn cho chu kỳ riêng thứ nhất 1,1 s, cản 3 %; cột tâm coi là thanh cứng dựng trên đá nền, chạm sàn khi lệch quá 3 cm.
export const PG = {
  H: 32.5, plinth: 1.2, pit: 3.0,
  s: [5.6, 4.9, 4.2, 3.5, 2.8], // bề rộng thân tầng: tầng 5 bằng nửa tầng 1
  bays: [3, 3, 3, 3, 2],
  hp: [3.3, 2.7, 2.6, 2.5, 2.4], // cao cột
  hb: 1.0, // vùng đấu củng
  rise: 1.4, // mái lên tới chân tầng trên
  over: 0.8, // độ vươn mái = 0,8 × bề rộng thân: mái tầng 5 ≈ ½ mái tầng 1
  T1: 1.1, zeta: 0.03, gap: 0.03,
};
// cao độ chân mỗi tầng và đỉnh mái tầng 5
PG.z = []; { let z = PG.plinth; for (let i = 0; i < 5; i++) { PG.z.push(z); z += PG.hp[i] + PG.hb + PG.rise; } }
PG.eave = PG.s.map((s) => s / 2 + PG.over * s); // nửa bề rộng mái tại mép
PG.top = PG.z[4] + PG.hp[4] + PG.hb + 1.7; // đỉnh mái tầng 5 (mái chóp)
PG.spire = PG.H - PG.top;

// chuỗi lò xo năm khối, ngàm ở nền: ωr = 2√(k/m)·sin((2r − 1)π / (2(2n + 1)))
const wr = (n, r, km) => 2 * Math.sqrt(km) * Math.sin(((2 * r - 1) * Math.PI) / (2 * (2 * n + 1)));
export const KM = ((2 * Math.PI) / PG.T1 / (2 * Math.sin(Math.PI / 22))) ** 2; // k/m cho T1 = 1,1 s khi đủ 5 tầng
export const periods = (n) => [1, 2, 3].map((r) => (r <= n ? (2 * Math.PI) / wr(n, r, KM) : null));

/** một bước tích phân (khối lượng mỗi tầng chuẩn hoá bằng 1): x, v độ dời tương đối so với nền của n tầng; cột tâm góc th,
 * tốc độ om; ag gia tốc nền (m/s²). stopper = false: cột tâm chỉ đi theo các tầng, không chạm. */
const MP = 0.15, LP = 34; // khối lượng cột tâm so với một tầng, dài từ đá nền tới chóp (giả định)
export function quake(st, n, ag, dt, stopper) {
  const {x, v} = st, c = ((2 * PG.zeta) / ((2 * Math.PI) / PG.T1)) * KM; // cản tỉ lệ độ cứng: ζ = 3 % ở mode 1
  const a = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const xd = i ? x[i - 1] : 0, vd = i ? v[i - 1] : 0;
    a[i] += -KM * (x[i] - xd) - c * (v[i] - vd) - ag;
    if (i + 1 < n) a[i] += KM * (x[i + 1] - x[i]) + c * (v[i + 1] - v[i]);
  }
  st.f = st.f || [];
  if (stopper) { // cột tâm là thanh cứng quay quanh đá nền; chạm dầm sàn tầng i khi lệch quá khe hở
    let M = -MP * ag * (LP / 2) - 0.5 * KM * st.th * MP - 2 * Math.sqrt(KM) * MP * st.om * LP; // quán tính nền, giữ nhẹ, cản nhẹ
    for (let i = 0; i < n; i++) {
      const h = st.h[i], d = st.th * h - x[i], ex = Math.abs(d) > PG.gap ? d - Math.sign(d) * PG.gap : 0, f = 30 * KM * ex;
      st.f[i] = f; a[i] += f; M -= f * h;
    }
    st.om += (M / ((MP * LP * LP) / 3)) * dt; st.th += st.om * dt;
  } else { for (let i = 0; i < n; i++) st.f[i] = 0; st.th = n ? x[n - 1] / st.h[n - 1] : 0; st.om = 0; }
  for (let i = 0; i < n; i++) { v[i] += a[i] * dt; x[i] += v[i] * dt; }
}
