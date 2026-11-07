// Máy ảnh cắt lớp: ống kính Canon EF 50mm f/1.8 STM trên thân máy phản xạ ống kính đơn khổ 36 × 24 mm.
// Quang học thấu kính mỏng; đơn vị milimét.
//
// Số có nguồn (ghi trên trang):
//  · Canon, thông số EF 50mm f/1.8 STM: tiêu cự 50 mm; 6 thấu kính, 5 nhóm; 7 lá khẩu; khẩu độ f/1.8 tới f/22;
//    lấy nét gần nhất 0,35 m; phóng đại lớn nhất 0,21×; kính lọc 49 mm; 69,2 × 39,3 mm (khi thu gọn); 160 g;
//    góc nhìn 40° ngang, 27° dọc, 46° chéo.
//  · Wikipedia, Canon EF lens mount: khoảng cách mặt ngàm tới cảm biến 44,0 mm; đường kính trong 54 mm; ra đời 1987.
//  · Cảm biến khổ đầy đủ 36 × 24 mm. Kiểm lại bằng chính số của Canon: góc nhìn tính được 2·arctan(36/100) = 39,6°
//    ngang và 2·arctan(24/100) = 27,0° dọc, khớp 40° và 27°.
// GIẢ ĐỊNH (ghi trên trang): coi ống kính là một thấu kính mỏng tiêu cự 50 mm; vị trí và hình dạng sáu thấu kính chỉ là
// sơ đồ minh hoạ đủ 6 thấu kính 5 nhóm, không phải bản thiết kế của hãng; kích thước thân máy, gương lật, màn trập.
export const CAM = {f: 50, Nmin: 1.8, Nmax: 22, blades: 7, close: 350, magMax: 0.21, flange: 44.0, mountD: 54, sw: 36, sh: 24, lensD: 69.2, lensL: 39.3, filter: 49, aov: [40, 27, 46]};
/** khoảng cách ảnh d' từ khoảng cách vật d (tính từ thấu kính): 1/f = 1/d + 1/d' */
export const imageDist = (d, f = CAM.f) => (d <= f ? Infinity : (d * f) / (d - f));
/** đặt nét ở khoảng cách s tính từ mặt cảm biến (như vạch khoảng cách trên ống kính): giải d + d' = s */
export function focusAt(s, f = CAM.f) {
  const disc = s * s - 4 * s * f;
  if (disc < 0) return null;
  const dp = (s - Math.sqrt(disc)) / 2; // nghiệm d' nhỏ (thấu kính gần cảm biến)
  return {d: s - dp, dp, m: dp / (s - dp)};
}
/** góc nhìn (độ) của cạnh cảm biến a khi thấu kính cách cảm biến d' (lấy nét ở vô cực thì d' = f) */
export const aovOf = (a, dp = CAM.f) => (2 * Math.atan(a / (2 * dp)) * 180) / Math.PI;
/** đường kính lỗ khẩu D = f / N */
export const pupil = (N) => CAM.f / N;
/** vòng nhoè trên cảm biến (mm) của một điểm cách thấu kính s khi thấu kính cách cảm biến dp, khẩu N */
export function blur(s, dp, N) { const sp = imageDist(s); if (!Number.isFinite(sp)) return Infinity; return (pupil(N) * Math.abs(sp - dp)) / sp; }
/** lượng sáng tương đối so với f/1.8 và 1/125 s: tỉ lệ t / N² */
export const exposure = (N, t) => (t / (N * N)) / ((1 / 125) / (CAM.Nmin * CAM.Nmin));
