<img src="design/logo/sang-an-khoai.png" alt="" width="96" align="right">

# Sáng Ăn Khoai

Bài giảng 3D tương tác bằng tiếng Việt. Trang chính gom mọi bài: hai hành trình 3D phóng tới nguyên tử của phân tử thật, Thành Cổ Loa dựng theo số đo khảo cổ, bốn mô phỏng robotics cho đại học và kỹ sư, lộ trình theo chương trình GDPT 2018 và thư viện 54 bài thí nghiệm. three.js r180, WebGPU với dự phòng WebGL 2, mỗi trang là một tệp HTML tự chứa.

| Trang | Địa chỉ |
|---|---|
| Trang chính Sáng Ăn Khoai | https://nclamvn.github.io/bai-giang/ |
| Hành Trình Vào Tế Bào (ribosome PDB 3J7R) | https://nclamvn.github.io/bai-giang/te-bao/ |
| Ribosome trên bàn (AR, mở trên điện thoại) | https://nclamvn.github.io/bai-giang/te-bao/ar.html |
| Vào Ty Thể (ATP synthase PDB 6J5I) | https://nclamvn.github.io/bai-giang/ty-the/ |
| Lộ trình Sinh học tế bào lớp 10 | https://nclamvn.github.io/bai-giang/chu-de/sinh-hoc-te-bao/ |
| Thành Cổ Loa (Lịch sử 10) | https://nclamvn.github.io/bai-giang/lich-su-10/co-loa/ |
| Lộ trình Lịch sử 10 | https://nclamvn.github.io/bai-giang/lich-su-10/ |
| Robotics: mục lục 4 mô phỏng | https://nclamvn.github.io/bai-giang/robotics/ |
| Cánh tay robot 6 trục (UR5e) | https://nclamvn.github.io/bai-giang/robotics/ur5e/ |
| Robot 6 chân (PhantomX AX) | https://nclamvn.github.io/bai-giang/robotics/hexapod/ |
| Drone 4 cánh (Crazyflie 2.x) | https://nclamvn.github.io/bai-giang/robotics/crazyflie/ |
| Xe tự hành vi sai (TurtleBot3 Burger) | https://nclamvn.github.io/bai-giang/robotics/turtlebot3/ |
| 54 bài thí nghiệm | https://nclamvn.github.io/bai-giang/#thu-vien |

- Bản offline một file cho lớp học, tải ở [Releases](https://github.com/nclamvn/bai-giang/releases/latest): [Hành Trình Vào Tế Bào](https://github.com/nclamvn/bai-giang/releases/latest/download/hanh-trinh-te-bao-offline.html) (9 MB) và [Vào Ty Thể](https://github.com/nclamvn/bai-giang/releases/latest/download/vao-ty-the-offline.html) (8 MB). Mở bằng Chrome hoặc Edge, không cần mạng.
- Địa chỉ cũ (`ty-the.html`, `ar.html`, `chu-de-sinh-hoc-te-bao.html`, `thu-vien/`) tự chuyển sang địa chỉ mới.
- Ghi chép kỹ thuật Bước A (nguồn dữ liệu, cách vẽ, phần minh hoạ): [`docs/buoc-a-phong-toi-nguyen-tu.md`](docs/buoc-a-phong-toi-nguyen-tu.md)

## Lên lớp
Nút **Lên lớp** mở bài "Hành trình của một phân tử protein tiết": 10 bước giáo viên bấm (phím → hoặc bút trình chiếu), mỗi bước có câu hỏi cho cả lớp, cuối bài là phần kiểm tra học sinh bấm đúng bào quan trên mô hình 3D và một câu trắc nghiệm, có tính điểm. Khung bài giảng (câu hỏi dẫn dắt, các bước, kiểm tra) học theo cách làm của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab); nội dung và mã viết mới hoàn toàn, không dùng tài nguyên của dự án đó.

## Vào Ty Thể: ATP synthase thật
[`ty-the/`](ty-the/) phóng liền mạch từ một ty thể cắt đôi xuống mép một tấm mào, nơi các dimer ATP synthase xếp hàng, rồi xuống 37.733 nguyên tử của một ATP synthase ty thể lợn (PDB 6J5I, cryo-EM 3,34 Å). Cách hai monomer ghép thành dimer và độ cong của màng ở gờ mào lấy từ tetramer cùng loài (PDB 6J5K): góc giữa hai trục rôto 123°, bán kính cong mặt giữa màng khoảng 5 nm. Đã bỏ protein ức chế IF1 có trong mẫu.
- Hoạt cảnh: mỗi H⁺ đi vào tiểu đơn vị a làm vòng c (8 tiểu đơn vị) quay 45°, theo vòng gần trọn một vòng rồi ra chất nền; trục γ quay theo, ba β lần lượt qua dạng lỏng, chặt, mở và nhả ATP mỗi 120°. Chiều quay theo chiều tổng hợp (ngược chiều kim đồng hồ khi nhìn từ phía F1). Tốc độ đã làm chậm; vị trí hai nửa kênh của tiểu đơn vị a là ước lượng.
- Phần quay tô màu lạnh (γ, δ, ε, vòng c), phần đứng yên màu ấm. Nút **Lên lớp**: 9 bước và 3 câu đố, trong đó một câu học sinh bấm thẳng vào phần đang quay.
- Dữ liệu dựng bằng `tools/build_atp.py` (ghép 6J5I vào hai vị trí của 6J5K theo CA phần đứng yên, có cổng kiểm sai số), nhúng sẵn trong trang (0,34 MB).
- Ty thể, mào, lipid và khoảng cách giữa các dimer trong hàng là minh hoạ.

## Lộ trình Sinh học tế bào lớp 10 và đối chiếu GDPT 2018
[`chu-de/sinh-hoc-te-bao/`](chu-de/sinh-hoc-te-bao/) xếp 6 bài theo mạch nội dung của chương trình môn Sinh học (Thông tư 32/2018/TT-BGDĐT): Tế Bào, vận chuyển qua màng, co và phản co nguyên sinh, Vào Ty Thể, enzyme, nguyên phân. Mỗi bài ghi yêu cầu cần đạt dạy trực tiếp; bảng cuối trang liệt kê đủ 68 yêu cầu của mạch Sinh học tế bào lớp 10 (kể cả hai chuyên đề) và chỉ rõ yêu cầu nào chưa có bài.

[`thu-vien/gdpt2018.json`](thu-vien/gdpt2018.json) đối chiếu cả 54 bài thư viện cùng hai trang Tế Bào và Ty Thể với chương trình Vật lí, Hoá học, Sinh học, Địa lí, Khoa học tự nhiên, Lịch sử và Địa lí: 349 yêu cầu cần đạt trích nguyên văn, mỗi trích dẫn đã so khớp bằng máy với văn bản nguồn (nguồn ghi trong tệp). Đã soát các lần sửa đổi chương trình (Thông tư 13/2022, 17/2025). Trang thư viện lọc được theo lớp và hiện yêu cầu cần đạt trên từng thẻ bài. Đối chiếu chưa qua giáo viên bộ môn duyệt.

## Lịch sử 10 và Thành Cổ Loa
[`lich-su-10/`](lich-su-10/) là lộ trình Lịch sử lớp 10 theo **chương trình** môn Lịch sử (TT 32/2018, ban hành lại bởi TT 13/2022, sửa đổi bởi TT 17/2025), nên dùng chung cho ba bộ sách Kết nối tri thức, Chân trời sáng tạo, Cánh diều. Mỗi mục có yêu cầu cần đạt trích nguyên văn (dữ liệu [`lich-su-10/chuong-trinh.json`](lich-su-10/chuong-trinh.json)), cảnh 3D đã có hoặc dự kiến, và tên bài tương ứng của ba bộ sách để đối chiếu. Nội dung bài được viết mới từ nguồn khảo cổ và sử liệu công khai; không chép sách giáo khoa.

[`lich-su-10/co-loa/`](lich-su-10/co-loa/) là bài mẫu: ba vòng thành Cổ Loa trên đồng bằng ven sông Hoàng Giang.
- Số đo có nguồn: chu vi ba vòng (1.650 m, 6.500 m, 8.000 m), mặt cắt lũy (hố Xóm Thượng: rộng 21,5 m, cao 4,5 m; hào cách chân 6 m, rộng 12 m, sâu 4,8 m; hố Đống Dân 2012), số cửa, 18 ụ hoả hồi, niên đại C14 của nhóm Nam C. Kim. Toạ độ đền, đình, am, giếng theo OpenStreetMap (ODbL).
- Phỏng dựng, ghi rõ trên trang: đường đi cụ thể của từng vòng (chưa có bản đồ mở có toạ độ tuyến thành), vị trí cửa, vị trí kho mũi tên và trống đồng, đường sông, chiều cao ở các giai đoạn chưa có số đo.
- Dòng thời gian 6 mốc (trước thế kỷ IV TCN → ngày nay) làm lũy cao lên, rộng ra theo mặt cắt từng giai đoạn; thành Nội để mờ ở thời Âu Lạc vì niên đại còn tranh luận. Chiều cao xem được ở tỉ lệ thật, ×3, ×6.
- Đồ hoạ thực: bầu trời vật lý và nắng chiều có bóng đổ, ruộng lúa đồng bằng (thửa dài, bờ ruộng, mương, ruộng ngâm nước phản chiếu trời), lũy đất bo tròn theo mặt cắt, hào và sông có mặt nước động, 48 làng có lũy tre, vườn, ao. Nhà theo thời kỳ: nhà sàn mái cong phỏng theo hình nhà trên trống đồng Ngọc Lũ (thời cổ), nhà ngói (thế kỷ XV–XVI), nhà hiện nay; cây phủ lũy ở hiện trạng. Mặc định tỉ lệ thật, có ×2, ×4. Máy tính có thêm che khuất môi trường (GTAO); điện thoại tắt hậu kỳ, giảm bóng và mật độ cây.
- Chế độ học theo bước: 10 bước, 3 câu hỏi; bảng "Truyền thuyết và bằng chứng"; 27 nguồn có đánh số.
- Dựng bằng `python3 tools/build_co_loa.py` (hình học, dữ liệu) từ `tools/co-loa.template.html`; lộ trình bằng `python3 tools/build_ls10.py`.

## Robotics: bốn mô phỏng chạy trực tiếp
[`robotics/`](robotics/) dành cho đại học và kỹ sư. Mỗi trang là một bảng điều khiển 1600 × 900 kiểu phòng thí nghiệm: robot 3D ở giữa, các bảng số đo hai bên, khung lời giảng ở dưới. Mở ra là bài giảng tự chạy (con trỏ bấm từng nút, lời giảng theo từng bước); chạm vào là tự cầm lái, 25 giây không thao tác thì bài giảng chạy lại. Mọi thanh đo và biểu đồ là trạng thái thật của mô phỏng.

| Robot | Nội dung | Số liệu |
|---|---|---|
| UR5e, cánh tay 6 trục | FK theo DH, IK giải tích 8 nghiệm (Hawkins 2013), Jacobian, chỉ số Yoshikawa, kỳ dị vai, MoveJ/MoveL bậc năm, mô men trọng lực, gắp và đặt | Bảng DH, khối lượng và trọng tâm khâu của Universal Robots; giới hạn khớp từ Universal_Robots_ROS2_Description |
| PhantomX AX, 6 chân | IK chân 3 bậc, dáng đi tripod/tetrapod/wave theo β, đa giác chống đỡ, biên ổn định tĩnh và dọc, mô men servo | Cấu hình Phoenix (KurtE), AX-12A (ROBOTIS); femur/tibia tác giả ghi "đoán", khối lượng 2 kg là giả định |
| Crazyflie 2.x, drone | Thân cứng 6 bậc, lực và mô men từng rô-to, PID xếp tầng vị trí → vận tốc → góc → tốc độ góc, bộ trộn legacy, nhiễu con quay, trễ động cơ | Förster 2015 (ETH Zürich), hệ số và cấu trúc từ crazyflie-firmware |
| TurtleBot3 Burger, xe vi sai | Động học vi sai, encoder 4096 xung, odometry trôi, LiDAR LDS-02, bản đồ lưới log-odds, pure pursuit, dừng an toàn, phục hồi | ROBOTIS e-Manual, turtlebot3 (burger.yaml, URDF), firmware OpenCR; phòng, vật cản, độ lệch bánh là giả định để dạy; "định vị liên tục" mô phỏng kết quả AMCL |

- Kiểm bằng máy: UR5e FK(IK) sai 1,5·10⁻¹² m trên 2000 tư thế; hexapod IK/FK khớp 3·10⁻¹⁶; drone giữ độ cao quanh 36–37k PWM, cú đẩy 2,5 mN·m hồi phục ở hệ số gốc; TurtleBot3 chạy 100 s kịch bản bài giảng không va chạm.
- Phương pháp, phong cách bàn điều khiển và cách tổ chức trang theo [teardown](https://github.com/elvarofficial/teardown) (elvarofficial) dựa trên [claude-motion](https://github.com/whaleyxbt/claude-motion) (whaleyxbt), MIT; giấy phép gốc ở [`tools/robotics/LICENSE-teardown`](tools/robotics/LICENSE-teardown).
- Mã: [`tools/robotics/`](tools/robotics/). `kit/` (sân khấu three.js r186 WebGL với GTAO, bảng điều khiển, vỏ trang tự chạy có 3 bậc chất lượng), mỗi robot một thư mục: phần tính (`kin.js`, `gait.js`, `quad.js`, `diff.js`) không phụ thuộc three.js, `main.js` là phần vẽ và kịch bản bài giảng. Dựng: `cd tools/robotics && npm ci && node build.mjs` (mỗi trang một tệp ~0,95 MB, nhúng sẵn three.js và phông có tiếng Việt); mục lục bằng `python3 tools/build_pages.py`.
- Hình khối dựng bằng mã theo cách teardown dựng V8 (`kit/shapes.js`): vỏ khớp tiện có bo mép và nắp vòm, ống loe, servo có đĩa trục và tai bắt vít, tấm waffle có lưới lỗ, bánh có gai, cánh quạt có biên dạng và xoắn; vật liệu nhựa phủ bóng, nhôm anod, mạch in, kính khói, cao su.
- Lên lớp: Shift P hoặc nút Lên lớp; bút trình chiếu chuyển từng lời giảng; màn hình giáo viên, điện thoại điều khiển (xem [Dụng cụ lên lớp](#dụng-cụ-lên-lớp)). Trên điện thoại và máy tính bảng dựng đứng, cảnh 3D phủ màn hình, lời giảng thành thẻ đọc được, nút Bảng số mở lại bàn điều khiển.
- Thêm `?q=0`, `?q=1` hoặc `?q=2` vào địa chỉ để ép bậc đồ hoạ (0 đẹp nhất, 2 cho máy yếu); khi ép bậc, trang không tự hạ.

## Dụng cụ lên lớp
Mọi bài 3D (Tế Bào, Ty Thể, Cổ Loa, 4 mô phỏng robotics, 54 bài thư viện) dùng chung một vỏ [`shell/bg-shell.js`](shell/bg-shell.js):
- Shift P hoặc nút Lên lớp; bút trình chiếu, phím mũi tên, PageUp/PageDown chuyển bước; B màn đen; F toàn màn hình; thêm `?lenlop` vào địa chỉ để mở sẵn chế độ lên lớp.
- Màn hình giáo viên: cửa sổ thứ hai trên cùng máy, có ghi chú, câu hỏi kèm đáp án, yêu cầu cần đạt; không cần mạng.
- Điện thoại: [`dieu-khien/`](dieu-khien/), quét mã QR hoặc nhập mã 6 ký tự (WebRTC qua PeerJS, cần mạng); từ thiết bị thứ hai, giáo viên phải bấm Cho phép trên màn chiếu.
- [`kiem-may/`](kiem-may/): đo khung hình mỗi giây, thời gian tải, card đồ hoạ của từng bài trên máy của trường; cảnh báo khi trình duyệt vẽ bằng phần mềm; xuất JSON, CSV.
- Đặc tả: [`docs/he-thiet-ke.md`](docs/he-thiet-ke.md). Nhúng vỏ: `python3 tools/inject_shell.py` (54 bài thư viện thêm `--adapter=thu-vien`).

## AR: ribosome trên bàn học
[`te-bao/ar.html`](te-bao/ar.html) dùng model-viewer để đặt bề mặt phân tử của ribosome 3J7R lên mặt bàn thật bằng điện thoại (ARCore/ARKit). Tỉ lệ 1 Å = 1 mm, tức phóng to 10 triệu lần, ribosome cao khoảng 30 cm. Có nút làm mờ 40S hoặc 60S để lộ tRNA và mRNA. Trên máy tính, trang hiện mã QR để học sinh quét. Mô hình [`te-bao/assets/ribosome-3j7r.glb`](te-bao/assets/ribosome-3j7r.glb) (4,2 MB, 231 nghìn tam giác) dựng bằng `tools/build_glb.py`: marching cubes trên mật độ nguyên tử theo từng nhóm, rút gọn lưới, màu theo thang tuyến tính của glTF.

## Thư viện 54 bài 3D tiếng Việt
[`thu-vien/`](thu-vien/) là bản tiếng Việt của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab) (铜匠实验室): 10 lý, 25 hoá, 5 sinh, 14 địa. Bản này được tác giả đồng ý cho dùng phi thương mại. Đã dịch 14.536 đoạn, khoảng 245 nghìn chữ Hán; kiểm tự động giữ nguyên biến, thẻ và ký tự thoát; cả 54 bài đúng cú pháp; không còn chữ Hán hiển thị. **Thư mục này theo giấy phép CC BY-NC 4.0 của bản gốc, không phải MIT.** Xem [`thu-vien/GHI-CONG.md`](thu-vien/GHI-CONG.md).

## Giao diện
Mọi trang dùng chung một chuẩn trong [`tools/liquid_glass.py`](tools/liquid_glass.py): nền trắng, vật liệu kính lỏng phỏng theo iOS 27 và macOS 27 (nền mờ, bão hoà màu, viền sáng bên trong, bóng mềm, góc bo lớn, nút dạng viên thuốc), phông hệ thống (SF Pro trên máy Apple, Inter ở nơi khác). Giao diện luôn sáng, kể cả khi máy đặt chế độ tối. 54 bài thư viện nhận cùng chuẩn qua khối CSS `lg-theme` mà `vi_tool.py apply` chèn vào.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chính Sáng Ăn Khoai (dựng bằng `tools/build_pages.py` từ `tools/bai-giang.template.html`) |
| `te-bao/index.html`, `te-bao/ribosome.b64.txt` | Hành Trình Vào Tế Bào (ghép từ `src/`) và dữ liệu ribosome nén (2,1 MB) |
| `te-bao/ar.html`, `te-bao/assets/` | Trang AR và mô hình GLB của ribosome |
| `ty-the/index.html` | Vào Ty Thể, dữ liệu ATP synthase nhúng sẵn |
| `chu-de/sinh-hoc-te-bao/` | Lộ trình Sinh học tế bào lớp 10 |
| `lich-su-10/`, `lich-su-10/co-loa/` | Lộ trình Lịch sử 10 (`tools/build_ls10.py`), bài Thành Cổ Loa (`tools/build_co_loa.py`, `tools/co-loa.template.html`, nguồn `tools/co_loa_nguon.json`) |
| `robotics/`, `robotics/<robot>/` | Mục lục Robotics (`tools/robotics/build_hub.py`) và 4 mô phỏng (dựng từ `tools/robotics/` bằng `node build.mjs`) |
| `shell/`, `dieu-khien/`, `kiem-may/` | Vỏ lên lớp chung và bộ gắn cho bài thư viện; trang điều khiển bằng điện thoại; trang kiểm máy |
| `thu-vien/` | 54 bài tiếng Việt (CC BY-NC 4.0), ảnh bìa, `catalog.vi.json`, đối chiếu chương trình `gdpt2018.json`, công cụ Việt hoá `_viet-hoa/` |
| `src/head.part`, `src/body.part`, `src/script.part` | CSS, HTML, JS của trang Tế Bào |
| `tools/liquid_glass.py` | Chuẩn giao diện chung: nền trắng, kính lỏng |
| `tools/build_pages.py` | Dựng trang chính, trang chủ đề và các trang chuyển hướng |
| `tools/build_ribosome.py`, `tools/build_atp.py`, `tools/build_glb.py` | Xử lý trước dữ liệu PDB, có cổng kiểm sai số |
| `tools/build_offline.py` | Đóng gói bản offline một file |
| `offline/` | Nơi `tools/build_offline.py` ghi hai bản offline (không đưa vào git; bản phát hành ở Releases) |
| `tests/` | Kiểm bằng Playwright |
| `docs/` | Ghi chép Bước A: nguồn dữ liệu, kỹ thuật vẽ, phần minh hoạ |

## Chạy
```bash
python3 tools/build_all.py      # dựng lại toàn bộ site theo đúng thứ tự (robotics cần: cd tools/robotics && npm ci)
python3 -m http.server 8765     # mở http://localhost:8765 (cần phục vụ qua HTTP để tải dữ liệu)
python3 tests/smoke.py 8765     # mở thử các trang, báo lỗi JS
```
Thêm `#webgl` vào cuối địa chỉ để ép chạy WebGL 2. Thêm `?lite=1` để xem chế độ nhẹ (vỏ tự bật khi máy chậm kéo dài: bỏ làm mờ nền sau bảng, giảm điểm ảnh; cảnh và hiệu ứng 3D giữ nguyên), `?lite=0` để tắt hẳn.

Mỗi lần đẩy lên `main`, GitHub Actions (`.github/workflows/ci.yml`) kiểm cú pháp, kiểm tệp đã dựng khớp với nguồn (`build_all.py --check`), kiểm mã băm toàn vẹn của tệp CDN (`tools/sri.py --check`) và mở thử các trang.

Bản offline: đẩy một thẻ `offline-*` (ví dụ `git tag offline-2026.11.01 && git push origin offline-2026.11.01`), Actions (`.github/workflows/offline-release.yml`) đóng gói hai bản và đăng lên Releases. Đóng gói tay:
```bash
python3 tools/build_offline.py te-bao/index.html te-bao/ribosome.b64.txt node_modules/three offline/hanh-trinh-te-bao-offline.html
python3 tools/build_offline.py ty-the/index.html - node_modules/three offline/vao-ty-the-offline.html
```

## Dựng lại dữ liệu ATP synthase
```bash
mkdir -p data && for id in 6J5I 6J5K; do curl -o data/$id.cif.gz https://files.rcsb.org/download/$id.cif.gz; done
python3 tools/build_atp.py data atp.bin      # rồi nhúng base64 của atp.bin vào ty-the/index.html (thẻ id="atp-b64")
```

## Dựng lại dữ liệu ribosome
```bash
pip install gemmi numpy
mkdir -p data && curl -o data/3J7R.cif.gz https://files.rcsb.org/download/3J7R.cif.gz
python3 tools/build_ribosome.py data/3J7R.cif.gz ribosome.bin
base64 -w 0 ribosome.bin > te-bao/ribosome.b64.txt
```

## Giấy phép
- Mã và nội dung của Hành Trình Vào Tế Bào, trang AR, công cụ: MIT (tệp `LICENSE`).
- `thu-vien/`: CC BY-NC 4.0, theo bản gốc Tongjiang Lab; chỉ dùng phi thương mại.
- Dữ liệu cấu trúc: RCSB PDB 3J7R, 6J5I, 6J5K.
- `tools/robotics/`: MIT; phần phỏng theo teardown và claude-motion giữ giấy phép MIT gốc (`tools/robotics/LICENSE-teardown`). three.js MIT.
- Phông Be Vietnam Pro, Noto Serif, JetBrains Mono: SIL Open Font License 1.1, tự lưu trữ trong `design/fonts/` kèm giấy phép.

## Nguồn
- Voorhees RM, Fernández IS, Scheres SHW, Hegde RS. Structure of the mammalian ribosome-Sec61 complex to 3.4 Å resolution. Cell 2014. doi:10.1016/j.cell.2014.05.024. Toạ độ từ RCSB PDB 3J7R.
- Gu J, Zhang L, Zong S, và cs. Cryo-EM structure of the mammalian ATP synthase tetramer bound with inhibitory protein IF1. Science 2019;364:1068–1075. doi:10.1126/science.aaw4852. Toạ độ từ RCSB PDB 6J5I, 6J5K.
- Watt IN, Montgomery MG, Runswick MJ, Leslie AGW, Walker JE. Bioenergetic cost of making an adenosine triphosphate molecule in animal mitochondria. PNAS 2010;107:16823–7. doi:10.1073/pnas.1011099107.
- Noji H, Yasuda R, Yoshida M, Kinosita K. Direct observation of the rotation of F1-ATPase. Nature 1997. doi:10.1038/386299a0.
- Abrahams JP, Leslie AGW, Lutter R, Walker JE. Structure at 2.8 Å resolution of F1-ATPase from bovine heart mitochondria. Nature 1994. doi:10.1038/370621a0.
- Strauss M, Hofhaus G, Schröder RR, Kühlbrandt W. Dimer ribbons of ATP synthase shape the inner mitochondrial membrane. EMBO J 2008. doi:10.1038/emboj.2008.35.
- Chương trình giáo dục phổ thông 2018 (Thông tư 32/2018/TT-BGDĐT): nguồn từng môn ghi trong `thu-vien/gdpt2018.json`.
