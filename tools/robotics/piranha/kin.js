// Cá piranha robot theo cá piranha đen (Serrasalmus rhombeus): số đo, hàm là một đòn bẩy, lực cắn.
// Đơn vị hình học: milimét; vật lí: SI.
//
// Số có nguồn (ghi trên trang):
//  · Grubich và cộng sự, Scientific Reports 2 (2012) 1009, "Mega-Bites": 15 cá piranha đen dài 205–368 mm (TL);
//    lực cắn lớn nhất 320 N ở con 368 mm, 1,12 kg, lớn nhất từng đo ở cá xương và cá sụn; lực cắn thay đổi gần năm lần
//    từ 67 N (0,17 kg) tới hơn 320 N (1,1 kg); log₁₀ F = 2,30·log₁₀ TL − 3,469 (TL tính bằng mm); cắn mạnh hơn 30 lần
//    trọng lượng cơ thể; lợi thế cơ học khi đóng hàm ở răng đầu mút 0,46–0,51 (≈ 0,5), răng thứ tư 1,0, răng sau cùng
//    ≈ 1,5; nhiều loài cá xương trung bình 0,27; cơ khép hàm 24,7–26,5 g, tiết diện tới 23,5 cm² ở cá 365–368 mm, hơn
//    2 % khối lượng cơ thể; hàm có một hàng 6–7 răng tam giác sắc, có răng cưa; cắn mạnh gần gấp ba cá sấu Mỹ cùng cỡ.
//  · FishBase, Serrasalmus rhombeus: dài tới 41,5 cm (SL), nặng tới 3,8 kg; thân ngắn, cao, dẹt hai bên; lưu vực
//    Amazon và Orinoco; quan hệ dài–nặng W = 0,01288·TL^3,19 (TL tính bằng cm, W tính bằng g).
// GIẢ ĐỊNH (ghi trên trang): hình dáng thân (cao 0,5 lần chiều dài chuẩn), vị trí khớp hàm, độ dài hàm dưới 46 mm, vị
// trí từng răng trên hàm, cấu tạo robot (cơ khép hàm thay bằng bộ dẫn động thẳng, bánh răng, pin).
export const PR = {
  TL: 368, SLk: 0.83, // chiều dài chuẩn ≈ 0,83 chiều dài toàn thân (giả định)
  Fmax: 320, MAtip: 0.48, MAmid: 1.0, MAback: 1.5, CSA: 23.5, AM: 26.5, mass: 1.12,
  jaw: 46, // khớp hàm tới răng đầu mút (mm)
};
PR.Lin = PR.MAtip * PR.jaw; // tay đòn của cơ khép hàm: lợi thế cơ học ở đầu mút = Lin / Lout
/** lực cắn ở răng đầu mút theo chiều dài toàn thân: cùng độ dốc 2,30 của hồi quy log–log (Grubich và cộng sự), neo
 * đi qua con đo được 320 N ở 368 mm (đường hồi quy gốc cho 270 N ở cỡ đó, vì con này cắn mạnh hơn trung bình) */
export const biteFit = (TL) => 10 ** (2.30 * Math.log10(TL) - 3.469);
export const biteOf = (TL) => PR.Fmax * (TL / PR.TL) ** 2.30;
/** khối lượng theo quan hệ dài–nặng của FishBase (kg) */
export const massOf = (TL) => (0.01288 * (TL / 10) ** 3.19) / 1000;
/** tiết diện cơ khép hàm (cm²) coi như tỉ lệ bình phương chiều dài từ con 368 mm (giả định đồng dạng) */
export const csaOf = (TL) => PR.CSA * (TL / PR.TL) ** 2;
// bảy răng trên mỗi nửa hàm dưới: khoảng cách tới khớp (mm), từ đầu mút vào trong. Răng thứ tư cách khớp đúng Lin
// (lợi thế 1,0), răng trong cùng cách Lin/1,5 (lợi thế 1,5) như nguồn.
export const TEETH = (() => { const d0 = PR.jaw, d3 = PR.Lin, d6 = PR.Lin / PR.MAback, out = [];
  for (let i = 0; i < 7; i++) out.push(i <= 3 ? d0 + (d3 - d0) * (i / 3) : d3 + (d6 - d3) * ((i - 3) / 3));
  return out; })();
/** lực cơ khép hàm suy từ lực cắn đầu mút: F_cơ = F_đầu / lợi thế cơ học */
export const muscleOf = (Ftip) => Ftip / PR.MAtip;
/** lực cắn ở răng cách khớp d (mm): cân bằng mô men quanh khớp, F·d = F_cơ·Lin */
export const biteAt = (Fm, d) => (Fm * PR.Lin) / d;
