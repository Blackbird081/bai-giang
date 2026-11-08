# Bản mô tả công việc: bài 3D tự tháo rời

Đọc tệp này trước khi dựng mỗi bài trong `tools/robotics/`. Mỗi lần sửa một lỗi, ghi thêm một dòng vào mục **Bài học**.
Phương pháp học theo cutaway của Nyxera0x (giấy phép MIT, github.com/Nyxera0x/cutaway), điều chỉnh cho bài giảng:
"bức ảnh tham chiếu" của bài giảng là **số đo có nguồn**, không phải ảnh do máy sinh.

## Vẻ ngoài

- Studio nền trắng của nhà, sàn lưới đo đúng tỉ lệ thật (mm, cm, m), bóng mềm.
- Vỏ sáng bóng có lớp phủ (`MAT.shell`), chia thành nhiều tấm cong ba cỡ, có khe hở nhìn vào cơ cấu. Không bao giờ một khối vỏ trơn liền.
- Cơ cấu tối hai tầng: chi tiết lớn (bánh răng, vành, động cơ) và rất nhiều chi tiết nhỏ (trục, vít, ống, dây). Cắt cửa sổ trên vỏ để khối tối lộ ra.
- Một màu nhấn duy nhất (cam `C.or`), chỉ đặt ở viền, mép, vòng khớp, và đánh dấu thứ đang chuyển động. Không rắc chấm màu lên vỏ.
- Mỗi chi, mỗi bánh răng có kích thước và tư thế riêng, không bao giờ một hàng chi tiết y hệt nhau.
- Lông, gai mảnh và ngắn: 0,15 đến 0,25 bề dày của chi mang nó.
- Sinh vật chỉ một bộ chi chính (chân, hoặc vây, hoặc xúc tu).

## Thứ tự làm việc

1. **Số đo trước.** Tìm nguồn cho mọi kích thước chính; viết thành tỉ lệ so với chiều dài chính. Chỗ không có nguồn ghi "giả định" ngay trong mã và trên trang.
2. **Checklist cho vật này** (10 đến 12 dòng, `tools/robotics/<bài>/CHECKLIST.md`) viết trước dòng mã đầu tiên: dáng và góc nhìn, đặc điểm nhận diện, vật liệu, màu nhấn, mật độ. Từ mơ hồ phải có số. Viết "không bao giờ" cạnh lựa chọn mặc định đang chống lại.
3. **Mỗi bộ phận tháo được là một nhóm riêng** có điểm neo đặt tên, để chế độ tháo rời (`kit/tach.js`) mở được nó.
4. **Ảnh tĩnh toàn cảnh**, chấm từng dòng checklist: đạt, một phần, chưa. Chấm theo số đo, không theo trí nhớ về cái mình vừa dựng.
5. **Đo, không nhìn bằng mắt** (`python3 tools/robotics/do_mat_do.py <bài>`):
   - tỉ lệ điểm ảnh tối (độ sáng dưới 80) trong khung bao vật, so với ảnh đã duyệt (chó robot): dưới 0,8 lần là chưa đạt;
   - tỉ lệ kích thước đo trên mô hình so với số có nguồn, lệch quá vài phần trăm là chưa đạt;
   - góc máy các nhịp tháo rời không được "đứng yên" (`cut.audit()`).
6. Dừng sau vòng 2 và cho người duyệt xem. Phim tháo rời chờ lời đồng ý.

## Góc máy

- Khung đầu tiên là toàn cảnh chéo trước 3/4, vật lớn và đang chạy.
- Mỗi nhịp tháo một bộ phận có phía, độ cao, khoảng cách riêng, nhắm vào chính bộ phận, đẩy lại gần trong lúc nó mở. Không hai nhịp nào đặt máy cùng chỗ.
- Bộ phận đang mở phải nằm trong khung; phần còn lại của vật được phép ra ngoài khung.
- Đường máy mượt; máy không bao giờ rung theo bước chân hay nhịp vẫy.

## Nhịp tháo rời

- Một bộ phận mở trong khoảng 1 s, giữ với chi tiết bên trong vẫn chạy, đóng trong 0,5 s; một nhịp mỗi 2 đến 3 s.
- Sau cùng: tách cả bộ trên bàn xoay 330°, lắp nhanh trong lúc vẫn xoay, về toàn cảnh.
- Mỗi bộ phận một nút; nhãn có đường dẫn bám theo bộ phận trong lúc nó mở; thẻ soi cho số liệu đang chạy.
- Kịch bản phim là một danh sách `{t, act}` (`cut.timeline()`); cảnh, nhãn, nút cùng đọc nó.

## Bài giảng

- Mọi con số có nguồn ghi trên trang; giả định ghi rõ là giả định.
- Không dùng câu chuyện trong các bài đăng mạng xã hội làm số liệu.
- Không đo đếm người học, không gọi dịch vụ ngoài.

## Bài học (mỗi lỗi một dòng)

- Thấu kính, kính: viết "kính trong, không bao giờ là vỏ trắng đặc"; thiếu chữ "không bao giờ" thì kính thành thêm một khối vỏ.
- Bật tắt `transparent` phải kèm `needsUpdate` (`setOpacity`), nếu không X-quang không có tác dụng.
- Cảnh lớn hơn 80 m phải đặt `far` cho camera, nếu không vật biến mất.
- Đồng hồ cơ bản đầu đo được mật độ 0,00: mâm sáng màu, kính đáy phản chiếu trắng. Mặt phẳng nằm ngang hứng sáng trời nên phải thật tối (#0d0e10) mới dưới ngưỡng 80.
- Nhện: khung bao chủ yếu là nền giữa các chân, so theo khung bao với chó robot là không công bằng; vật thưa thì so trên điểm ảnh của vật (do_mat_do.py tự chọn).
- Nhện: động học nghịch có hai nhánh nghiệm; luôn thử thêm điểm xuất phát và chọn nhánh gối thấp, nếu không chân dựng đứng như nhện chân dài.
- Piranha: nhóm milimét (thu 1/1000) nằm trong nhóm mét; vị trí đặt cho chính nhóm milimét là mét. Dao động 3 "mm" thành 3 m, cá ra khỏi khung.
- Piranha: khi hồi quy của nguồn lệch điểm đo cụ thể mà bài dựng theo, giữ độ dốc, neo qua điểm đo và vẽ cả đường gốc cho học sinh so.
- Máy ảnh: thân trắng trên nền trắng gần như vô hình; vật thật màu sẫm thì để sẫm, giữ một tấm trắng làm điểm nhấn.
- Lực tính từ đạo hàm của một biến nhảy bậc (đổi chế độ) phải giới hạn tốc độ thay đổi, nếu không đồ thị vọt đỉnh giả.
- Cá thở bằng mang: nền nước tối thì chữ ghi thẳng trên canvas (số lớn, đường dẫn nhãn) phải trắng; ngoài khung bể che nền trắng và giấu nhãn có điểm neo ra ngoài khung.
- Kiểm ảnh dưới swiftshader chỉ khoảng 1 khung mỗi giây, mỗi khung bị giới hạn bước thời gian: chờ 2,5 s thì cảnh mới chạy vài phần mười giây, nắp mang chưa kịp mở. Gọi `sim.step(1/30)` bằng tay cho đủ thời gian rồi mới chụp.
- Vật dựng từ ảnh do máy sinh (Fish Kit) chỉ để nhìn: số đo cơ thể lấy từ nguồn, không đo trên mô hình; luật mật độ cơ cấu tối bỏ qua bằng `sim.photo` (ghi lí do).
- Cá thở bằng mang: đo chiều dài bằng Box3.setFromObject tính cả hạt nước gắn vào cá (Points), ra 47 cm thay vì 40; khung đo chỉ gom Mesh.
- Cá thở bằng mang: góc xa (bộ sưu tập, máy cách 4–5 m) nằm ngoài khoảng sương 1,6–5,5 m nên cá chìm hẳn vào nền trên điện thoại; sương phải theo khoảng cách máy.
- Cá thở bằng mang (tra cứu): cờ nước ngọt/lợ/mặn của FishBase là 1/0, không phải −1/0 như mình nhớ; mọi loài ra "vùng nước —" cho tới khi mở bảng thật mà xem. Đọc giá trị của cột trước khi viết điều kiện.
- Bảng phủ (position:fixed) trên màn hẹp vẫn nằm dưới thanh đầu và thanh bước của khung bài: chừa hai thanh ấy thay vì tăng z-index.
