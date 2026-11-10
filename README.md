<img src="design/logo/sang-an-khoai.png" alt="" width="96" align="right">

# Sáng Ăn Khoai

Bài giảng 3D tương tác bằng tiếng Việt. Trang chính gom mọi bài: hai hành trình 3D phóng tới nguyên tử của phân tử thật, Thành Cổ Loa dựng theo số đo khảo cổ, sáu mô phỏng robotics cho đại học và kỹ sư, lộ trình theo chương trình GDPT 2018 và thư viện 54 bài thí nghiệm. three.js r180, WebGPU với dự phòng WebGL 2, mỗi trang là một tệp HTML tự chứa.

| Trang | Địa chỉ |
|---|---|
| Trang chính Sáng Ăn Khoai | https://nclamvn.github.io/bai-giang/ |
| Cơ thể người 3D (Khoa học tự nhiên 8, BodyVista Việt hoá) | https://nclamvn.github.io/bai-giang/co-the-nguoi/ |
| Cá thở bằng mang (Sinh học 11, hô hấp và trao đổi khí ở động vật) | https://nclamvn.github.io/bai-giang/sinh-hoc-11/ca-tho-bang-mang/ |
| Neuron và xung thần kinh (Sinh học 11, phong cách điện ảnh) | https://nclamvn.github.io/bai-giang/than-kinh/ |
| Động cơ xăng 4 kì (Công nghệ 11, cơ khí động lực) | https://nclamvn.github.io/bai-giang/cong-nghe/dong-co-4-ki/ |
| Robot cá mập mako (Vật lí 10, lực cản và lực nâng) | https://nclamvn.github.io/bai-giang/vat-li-10/ca-map-robot/ |
| Tháp năm tầng Hōryū-ji (Vật lí 11, dao động riêng và cộng hưởng) | https://nclamvn.github.io/bai-giang/vat-li-11/thap-nam-tang/ |
| Hải đăng khung sắt Sanibel (Vật lí 10, mô men lật, tầm nhìn đèn) | https://nclamvn.github.io/bai-giang/vat-li-10/hai-dang/ |
| Đồng hồ cơ ETA 6497-1 (Vật lí 11, dao động điều hoà, tỉ số truyền) | https://nclamvn.github.io/bai-giang/vat-li-11/dong-ho-co/ |
| Nhện chân thuỷ lực (Vật lí 10, áp suất chất lỏng, định luật Pascal) | https://nclamvn.github.io/bai-giang/vat-li-10/nhen-thuy-luc/ |
| Cá piranha (Vật lí 10, mô men lực, đòn bẩy) | https://nclamvn.github.io/bai-giang/vat-li-10/ca-piranha/ |
| Máy ảnh cắt lớp (Khoa học tự nhiên 9, thấu kính hội tụ) | https://nclamvn.github.io/bai-giang/khtn-9/may-anh/ |
| Hành Trình Vào Tế Bào (ribosome PDB 3J7R) | https://nclamvn.github.io/bai-giang/te-bao/ |
| Ribosome trên bàn (AR, mở trên điện thoại) | https://nclamvn.github.io/bai-giang/te-bao/ar.html |
| Vào Ty Thể (ATP synthase PDB 6J5I) | https://nclamvn.github.io/bai-giang/ty-the/ |
| Lộ trình Sinh học tế bào lớp 10 | https://nclamvn.github.io/bai-giang/chu-de/sinh-hoc-te-bao/ |
| Thành Cổ Loa (Lịch sử 10) | https://nclamvn.github.io/bai-giang/lich-su-10/co-loa/ |
| Lộ trình Lịch sử 10 | https://nclamvn.github.io/bai-giang/lich-su-10/ |
| Robotics: mục lục 6 mô phỏng | https://nclamvn.github.io/bai-giang/robotics/ |
| Cánh tay robot 6 trục (UR5e) | https://nclamvn.github.io/bai-giang/robotics/ur5e/ |
| Robot 6 chân (PhantomX AX) | https://nclamvn.github.io/bai-giang/robotics/hexapod/ |
| Chó robot 4 chân (số đo MIT Mini Cheetah) | https://nclamvn.github.io/bai-giang/robotics/quadruped/ |
| Sứa robot (theo Cyro, Virginia Tech) | https://nclamvn.github.io/bai-giang/robotics/jellyfish/ |
| Drone 4 cánh (Crazyflie 2.x) | https://nclamvn.github.io/bai-giang/robotics/crazyflie/ |
| Xe tự hành vi sai (TurtleBot3 Burger) | https://nclamvn.github.io/bai-giang/robotics/turtlebot3/ |
| 54 bài thí nghiệm | https://nclamvn.github.io/bai-giang/thu-vien/ |

Cả 16 mô phỏng dựng bằng bộ robotics (6 robot, Động cơ 4 kì, Robot cá mập, Tháp năm tầng, Hải đăng khung sắt, Đồng hồ cơ, Nhện chân thuỷ lực, Cá piranha, Máy ảnh cắt lớp, Cá thở bằng mang) có thanh tốc độ tạm dừng đến 10× và **soi chi tiết**: bấm vào một khớp, động cơ, bánh, cảm biến hay thân để mở thẻ (vai trò, số đo có nguồn, số chạy theo mô phỏng), camera bám theo bộ phận đó. Thẻ khai báo trong `pick` của từng bài, bộ máy chung ở [`tools/robotics/kit/soi.js`](tools/robotics/kit/soi.js).

Bài TurtleBot3 có thêm bước 9 **Lắp ráp theo tầng**: 15 cụm từ tấm đế tới LiDAR, máy kiểm thứ tự và lối vào của tuốc nơ vít (tầng trên úp xuống thì không còn với tới mạch bên dưới); thứ tự theo hướng dẫn lắp Burger của ROBOTIS, rút gọn để học ([`tools/robotics/turtlebot3/cum.js`](tools/robotics/turtlebot3/cum.js)).

Bài chó robot bốn chân lấy bố cục thông tin từ các video teardown robot của 0xWast3 trên X (dải nhịp bài giảng, sáu hệ thống bấm để cô lập, chữ lớn chế độ vận hành, lực đỡ từng chân, 12 mặt đồng hồ mô men khớp, nhật ký), dựng lại bằng giao diện của bộ robotics; mọi số đo lấy từ mã nguồn Mini Cheetah của MIT và bài báo gốc, không lấy số trong bài đăng. Có tách rời 10 cụm và lắp ráp có kiểm thứ tự, lối vào ([`tools/robotics/quadruped/cum.js`](tools/robotics/quadruped/cum.js)). Bài sứa robot làm như vậy với video sứa robot: số đo lấy từ Cyro (Virginia Tech), mô hình lực phụt Daniel 1983 và sinh học sứa bờm sư tử; tách rời, lắp ráp 8 cụm ([`tools/robotics/jellyfish/cum.js`](tools/robotics/jellyfish/cum.js)).

Bài **Tháp năm tầng Hōryū-ji** (Vật lí 11) lấy bố cục bản vẽ lắp dựng từ video tháp của cùng tác giả: khung tên bản vẽ, trình tự dựng dạng Gantt, cấu kiện đang lắp (số lượng, vật liệu, khối lượng ước), kết cấu từng tầng, nhật ký LẮP/KIỂM, dải tám giai đoạn bấm được. 52 thao tác lắp, mặt cắt qua trục, sơn; rung nền với mô hình năm khối có chu kỳ riêng T₁ = 1,1 s (số đo vi chấn dẫn trong Hanazato và cộng sự, 2004), cộng hưởng, cột tâm chặn. Số có nguồn: cao ≈ 32,5 m, tầng 5 hai gian, mái tầng 5 ≈ ½ mái tầng 1, cột tâm bách Nhật năm 594, xá lợi sâu ≈ 3 m, tượng đất năm 711; các kích thước khác ghi rõ là phỏng dựng ([`tools/robotics/pagoda/kin.js`](tools/robotics/pagoda/kin.js)).

Bài **Hải đăng khung sắt** (Vật lí 10) theo video bản vẽ lắp dựng hải đăng: dựng Sanibel Island Light (Florida, 1884) theo tám giai đoạn (cọc sắt, bốn đoạn chân, giằng ngang, giằng chéo chữ X, ống cầu thang, phòng trực và đèn, sơn, mặt cắt), thẻ cấu kiện có tải móc cẩu và kiểu liên kết. Chớp đèn Fl(2) W 10s từ thấu kính quay, tầm nhìn d ≈ 2,08(√H + √h) hải lí so với tầm sáng 13 hải lí, gió ngang cho lực gió, mô men lật và lực kéo nén trong bốn chân. Số có nguồn: Wikipedia (Sanibel Island Light, Fresnel lens); khung, khối lượng là phỏng dựng ([`tools/robotics/lighthouse/kin.js`](tools/robotics/lighthouse/kin.js)).

Bài **Đồng hồ cơ** (Vật lí 11) là bài đầu tiên dựng theo phương pháp **tự tháo rời** học từ cutaway của Nyxera0x (MIT; github.com/Nyxera0x/cutaway): bản mô tả công việc [`tools/robotics/BRIEF.md`](tools/robotics/BRIEF.md), checklist có số cho từng vật, mỗi bộ phận một nút tách ra dưới góc máy riêng rồi tách cả bộ trên bàn xoay 330° ([`tools/robotics/kit/tach.js`](tools/robotics/kit/tach.js)), và đo thay vì nhìn bằng mắt: `python3 tools/robotics/do_mat_do.py <bài>` đếm tỉ lệ điểm tối trong khung bao vật so với ảnh đã duyệt (ít nhất 0,8 lần), so tỉ lệ kích thước với số có nguồn, kiểm các nhịp tháo rời không đặt máy cùng chỗ. Sáu bài robot cũ (UR5e, sáu chân, chó robot, sứa, Crazyflie, TurtleBot3) cũng có hàng nút **Tháo** trong cảnh: hàm `mover` bọc chi tiết vào nhóm dời riêng nên không phải sửa cách bài đặt vị trí. Máy ETA 6497-1 theo tài liệu kĩ thuật của hãng: Ø 36,60 mm, cao 4,50 mm, 17 chân kính, 18.000 dao động/giờ, góc nâng 44°, trữ cót 46 giờ; bánh lắc tích phân con lắc xoắn có cản và cú đẩy của bộ thoát, nên biên độ giảm khi cót yếu mà chu kì vẫn 0,400 s ([`tools/robotics/dong-ho/kin.js`](tools/robotics/dong-ho/kin.js)).

Bài **Nhện chân thuỷ lực** (Vật lí 10): khớp đùi–gối và chày–bàn của nhện không có cơ duỗi, chân duỗi bằng áp suất dịch. Một bơm trong đầu ngực, tám chân, cùng một áp suất (định luật Pascal); túi duỗi đổi áp suất thành mô men τ = P·A·r; áp suất cần khi đứng xấp xỉ áp suất nghỉ đo trên nhện (≈ 5 cmHg), khi chạy vọt lên vài chục kPa, nằm trong dải 0,1–0,64 bar đã đo; rò rỉ một chân thì tụt ở cả tám; xả áp thì chân co quắp như nhện chết. Dáng chạy hai nhóm bốn chân với sải bước 5,97 cm và tần số bước 3,83 → 9,40 Hz theo nhiệt độ (Booster và cộng sự, 2015, nhện Aphonopelma hentzi). Số có nguồn và giả định ghi trong [`tools/robotics/nhen/kin.js`](tools/robotics/nhen/kin.js).

Bài **Cá piranha** (Vật lí 10): piranha đen 368 mm, 1,12 kg cắn 320 N, mạnh nhất từng đo ở cá, hơn 30 lần trọng lượng (Grubich và cộng sự, 2012). Hàm dưới là đòn bẩy quay quanh khớp hàm: F_cắn·d = F_cơ·L_in; lợi thế cơ học 0,48 ở răng đầu mút, 1,0 ở răng thứ tư, 1,5 ở răng trong cùng như số đo; suy ngược lực cơ khép hàm ≈ 670 N, ứng suất ≈ 28 N/cm² trên tiết diện 23,5 cm². Lực cắn theo cỡ cá dùng độ dốc 2,30 của hồi quy, neo qua con đo được 320 N (đường hồi quy gốc cũng vẽ ra để so). Khối lượng theo quan hệ dài–nặng của FishBase ([`tools/robotics/piranha/kin.js`](tools/robotics/piranha/kin.js)).

Bài **Máy ảnh cắt lớp** (Khoa học tự nhiên 9): ống kính Canon EF 50mm f/1.8 STM coi như một thấu kính mỏng 50 mm trên cảm biến 36 × 24 mm, cách mặt ngàm EF 44,0 mm. Ba tia đặc biệt từ đỉnh ngọn nến gặp nhau trên cảm biến thành ảnh thật, ngược, nhỏ hơn; lấy nét là dời thấu kính (1/f = 1/d + 1/d′); khẩu bảy lá với D = f/N, lượng sáng ∝ t/N², vòng nhoè của hậu cảnh; gương lật, màn trập hai lá; ảnh vừa chụp hiện ở bảng. Mô hình kiểm lại bằng chính số của hãng: góc nhìn 39,6° × 27,0° × 46,8° (Canon 40° × 27° × 46°), lấy nét 0,35 m cho phóng đại 0,209× (Canon 0,21×) ([`tools/robotics/may-anh/kin.js`](tools/robotics/may-anh/kin.js)).

Bài **Cá thở bằng mang** (Sinh học 11): cá thật dựng từ ảnh của [Fish Kit](https://cda-social.github.io/fish/gallery.html) (なちゃっと, CC0; ảnh gốc do máy sinh nên mô hình chỉ để nhìn, không đo). Đủ 20 loài của kit: bốn loài có số đo mang (cá saba, cá ngừ vây vàng, cá vược Nhật, cá chai) nằm trong bài giảng; 16 loài còn lại chọn ở danh sách loài, góc "20 loài" hoặc nút "Loài khác" (tải khi cần, đủ bản gần và bản xa như kit), mỗi loài có thẻ kích thước và môi trường sống theo FishBase, kiểu thở ghi rõ là suy ra khi chưa có phép đo. Thêm số đo tiêu hao ô xi lúc nghỉ cho cá tráp đỏ (Oikawa và Itazawa 2003, cá 270 g, 20 °C), cá tráp đen (Prakoso và Chang 2017, 538 g, 25 °C) và cá cam vằn (Clark và Seymour 2006, đo ở S. lalandi 2,1 kg, 25 °C); tên Việt ghi nguồn: theo FishBase (cá sòng Nhật, cá sạo xám), theo nhóm cá, hoặc chưa có tên Việt nên đọc theo tên Nhật (mebaru, kasago, onagagure, mejina). Nút "Tra cứu loài" mở dữ liệu hô hấp của 354 loài trên FishBase v25.04 (323 bản ghi đo diện tích mang, 3 700 bản ghi tiêu hao ô xi lúc nghỉ, tên Việt, họ, môi trường, kiểu bơi, thở khí trời), dựng qua Refinery: mỗi giá trị dẫn về một dòng của bản chụp, số đo cấm suy diễn, nhiều tên Việt giữ trọn, có biểu đồ toàn bộ số đo và lượng nước qua mang tính theo từng bản ghi ([`tools/refinery`](tools/refinery/README.md)). Màn hẹp có tên loài trên cảnh, nút "Dáng khác" và "Tải đủ 20 loài" (khoảng 9 MB, không tự tải). Hàng "Dáng" có đủ mười dáng của kit (bơi, lao, rẽ, đứng, mở hết cỡ, cắn, mắc câu, kiệt sức, trên không, giãy trên sàn) và nút lưới nhẹ. Bài điều khiển nhịp thở của kit: khi bơi chậm cá bơm nước bằng miệng và nắp mang lệch pha, hạt cam đi vào miệng, ra khe nắp mang; bơi nhanh thì chuyển dần sang ép dòng trên khoảng 35–82 cm/s (Roberts 1975). Cá ngừ vây vàng bắt buộc ép dòng, cá chai sống đáy luôn bơm. Lượng nước phải qua mang = trao đổi chất chuẩn ÷ (ô xi hoà tan × 75 %), với SMR 286 và 132 mg O₂/kg/h ở 25 °C, diện tích mang 1327 và 1110 mm²/g (Wegner và cộng sự 2010), ô xi hoà tan theo Benson và Krause (1984), Q10 = 2; cá cóc Mỹ chỉ khoảng 130 mm²/g (Hughes và Gray 1972). Mô hình trao đổi ngược dòng NTU = 3 cho 75 % như số của AMNH, cùng chiều chỉ 50 % ([`tools/robotics/mang/kin.js`](tools/robotics/mang/kin.js)). Tệp kèm (`meta.assets`, 20 loài × mô hình, ảnh, `loai.json`) chỉ có một bản, ở `sinh-hoc-11/ca-tho-bang-mang/fish/` cạnh trang; bản một tệp nhúng thành data URL.

- Bản offline một file cho lớp học, tải ở [Releases](https://github.com/nclamvn/bai-giang/releases/latest): [Hành Trình Vào Tế Bào](https://github.com/nclamvn/bai-giang/releases/latest/download/hanh-trinh-te-bao-offline.html) (9 MB) và [Vào Ty Thể](https://github.com/nclamvn/bai-giang/releases/latest/download/vao-ty-the-offline.html) (8 MB). Mở bằng Chrome hoặc Edge, không cần mạng.
- Địa chỉ cũ (`ty-the.html`, `ar.html`, `chu-de-sinh-hoc-te-bao.html`, `/#thu-vien`) tự chuyển sang địa chỉ mới. Thư viện nay là trang riêng `thu-vien/`.
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

## Cơ thể người 3D (Khoa học tự nhiên 8)
Bài [`co-the-nguoi/`](co-the-nguoi/) phát triển từ [BodyVista](https://github.com/FreedomIntelligence/BodyVista) (FreedomIntelligence, mã MIT): 2.900 cấu trúc giải phẫu, 12 hệ cơ quan, 140 chuyển động sinh lí, 6 chủ đề hiển vi (phế nang, nephron, sarcomere, synapse, lông ruột, thành mạch), khu răng miệng và thử thách giải phẫu.
- Tiếng Việt là ngôn ngữ mặc định (4.332 mục, chưa qua giáo viên bộ môn duyệt); vẫn đổi được sang 中文, English, 日本語.
- Bài học 14 bước cho giáo viên theo mạch "Sinh học cơ thể người" của Khoa học tự nhiên 8: hệ vận động, tiêu hoá và hấp thụ, tim và hai vòng tuần hoàn, hô hấp và trao đổi khí, bài tiết, phản xạ, giác quan, nội tiết, thử thách cuối bài. Mỗi bước có câu hỏi cho cả lớp và nguồn (OpenStax, Anatomy and Physiology 2e).
- Mô hình nén EXT_meshopt_compression: 292,7 MB còn 86,6 MB, hình học không giản lược.
- Dựng: `cd tools/co-the-nguoi && npm ci --ignore-scripts` (một lần), rồi `python3 tools/co-the-nguoi/build.py`. Chi tiết: [`tools/co-the-nguoi/README.md`](tools/co-the-nguoi/README.md).
- Mô hình Z-Anatomy (CC BY-SA 4.0, có phần chỉ dùng phi thương mại) và BodyParts3D (CC BY-SA 2.1 Nhật Bản). Bài này chỉ dùng phi thương mại. Xem [`co-the-nguoi/GHI-CONG.md`](co-the-nguoi/GHI-CONG.md).

## Neuron và xung thần kinh (Sinh học 11)
Bài [`than-kinh/`](than-kinh/) kể bốn cảnh trong 20 giây, phong cách điện ảnh: neuron giữa mạng lưới, điện thế màng vượt ngưỡng ở gò sợi trục, xung nhảy cóc qua eo Ranvier, synapse giải phóng chất dẫn truyền. Mỗi cảnh là một bước có câu hỏi và nguồn.
- Dựng hoàn toàn bằng mã: three.js WebGPU (tự lùi về WebGL 2), vật liệu TSL phát sáng theo góc nhìn, bloom. Hình minh hoạ, không theo tỉ lệ.
- Dòng thời gian tất định: `?film` ẩn giao diện để quay video, `?clean` ẩn chữ, `window.NEURON.renderAt(t)` dựng đúng một khung hình.
- Nguồn tại [`tools/than-kinh.template.html`](tools/than-kinh.template.html), dựng bằng `python3 tools/build_than_kinh.py`.
- Số liệu: OpenStax Anatomy and Physiology 2e mục 12.4, 12.5 (điện thế nghỉ khoảng −70 mV, ngưỡng khoảng −55 mV); Azevedo và cs. 2009 (khoảng 86 tỉ neuron trong não người).

## Động cơ xăng 4 kì (Công nghệ 11)
Bài [`cong-nghe/dong-co-4-ki/`](cong-nghe/dong-co-4-ki/) dựng theo đủ 9 bước của quy trình teardown (Elvar, MIT): bắt đầu từ tham chiếu thật, mô hình trước hình sau, bảng số chạy theo máy, một nút cho mỗi hệ thống, soi lỗi bằng bảng ảnh, trang tự chạy có con trỏ, thử phá.
- Tham chiếu: thông số Honda Việt Nam cho Wave Alpha 110 (4 kì, 1 xi lanh, làm mát bằng không khí; 50,0 × 55,6 mm; 109,2 cm³; tỉ số nén 9,0 : 1; 6,12 kW / 7.500 vòng/phút; 8,44 N·m / 5.500). Kiểm tay: π × (5,0 cm)² × 5,56 cm / 4 = 109,17 cm³.
- Một đầu vào: góc trục khuỷu ψ trong chu trình 0–720°. Pít-tông theo cơ cấu tay quay – con trượt chính xác; xupap, trục cam (½ tốc độ), xích cam, tia lửa, dòng khí, bảng số, đồ thị áp suất và p–V đều đọc từ [`tools/robotics/dong-co/kin.js`](tools/robotics/dong-co/kin.js).
- Giả định ghi rõ trên trang: thanh truyền 100 mm (l/r ≈ 3,6, trong khoảng 3–4 của động cơ cỡ nhỏ và vừa theo Heywood 1988); độ nâng xupap và góc phối khí thực tế là giá trị minh hoạ; áp suất là mô hình nén, dãn đa biến hiệu chỉnh để áp suất chỉ thị trung bình ≈ 10,5 bar. Xi lanh đặt đứng cho dễ nhìn.
- Thử phá: tăng tỉ số nén (hiệu suất Otto tăng, quá 11,5 báo nguy cơ kích nổ), tắt bugi (mất kì sinh công, máy chạy theo đà rồi dừng), tay ga, tua chậm 20–400 lần.
- Lắp ráp (bước 12): 15 cụm chi tiết nằm trên khay cạnh máy, học sinh tự chọn cụm lắp tiếp. Mỗi lần chọn, máy kiểm thứ tự (cụm đỡ nó đã có chưa) và lối vào (cụm đã lắp có chắn đường đưa nó hay dụng cụ vào không); sai thì cụm gây vướng nhấp nháy đỏ kèm lí do. Có Gợi ý, Lắp mẫu, Tháo hết; tháo cũng kiểm như lắp. Dữ liệu cụm ở [`tools/robotics/dong-co/cum.js`](tools/robotics/dong-co/cum.js) (quy trình rút gọn để học, ghi rõ trong tệp), bộ máy dùng chung ở [`tools/robotics/kit/lap.js`](tools/robotics/kit/lap.js). Ý tưởng ORDER · REACH · CLASH từ bài đăng của 0xWast3 trên X.
- Soi chi tiết: bấm vào một cụm trong cảnh để mở thẻ (vai trò, số đo có nguồn, số chạy theo máy, cụm nó tựa vào), camera bám theo cụm đó kể cả khi nó chuyển động.
- Yêu cầu cần đạt trích nguyên văn Chương trình GDPT môn Công nghệ 2018, lớp 11, Công nghệ cơ khí, mục Động cơ đốt trong.
- Dựng: `cd tools/robotics && node build.mjs dong-co` (meta.json khai báo nơi đặt trang).
- Phim 18 giây kèm nhạc nền dựng bằng mã (bước 8): `python3 tools/robotics/dong-co/film/quay.py phim.mp4` đặt góc trục khuỷu theo từng khung rồi chụp, nên không rơi khung; `python3 <teardown>/run_sfx.py tools/robotics/dong-co/film/diem.py` dựng nhạc trên cùng `timeline.json`: một tiếng thịch đúng mỗi kì cháy, mastering −14 LUFS.

## Robot cá mập mako (Vật lí 10)
Bài [`vat-li-10/ca-map-robot/`](vat-li-10/ca-map-robot/) nối tiếp bài động cơ theo cùng quy trình, ý tưởng từ bài chia sẻ của シャック (@SHACK_SAME_SAME) về robot cá mập dựng bằng teardown; mô hình, mã và số liệu là của bài này.
- Tham chiếu thật: Waller và cộng sự (2023), Journal of Fish Biology 103(5): 864–883, doi:10.1111/jfb.15475. Hai con mako dài khoảng 2 m gắn thẻ ở Azores; con cái 197 cm: tuần tra 0,90 m/s, tần số vẫy đuôi 0,51 ± 0,16 Hz; bứt tốc 5,02 m/s (3,65 Hz theo tóm tắt bài báo), kéo dài 14 s; hồi quy U = 1,24·f + 0,20 (R² = 0,55).
- Một đầu vào: tốc độ bơi U. Tần số vẫy đuôi từ hồi quy trên; sóng thân y = (A/2)·g(s)·sin(2π·s/λ − φ), 8 khớp servo, số Strouhal St = f·A/U (khoảng 0,2–0,4 theo Taylor, Nudds, Thomas 2003, Nature 425: 707–711), lực cản và công suất so với lúc tuần tra (mô hình F ∝ v², P ∝ v³), vết đuôi trên nước đều đọc từ [`tools/robotics/mako/kin.js`](tools/robotics/mako/kin.js). Kiểu bơi cá ngừ và tiến hoá hội tụ: Donley và cộng sự (2004), Nature 429: 61–65.
- Giả định ghi rõ trên trang: bước sóng λ = 1 thân, biên độ đuôi 0,2 thân (trong khoảng 0,1–0,3 thân đo ở nhiều loài cá), đường bao biên độ bậc hai kiểu robot cá RoboTuna, hình dạng thân, robot 9 đốt 8 servo là minh hoạ. Kiểm tay: (0,90 − 0,20) / 1,24 = 0,56 Hz; St = 0,56 × 0,39 / 0,90 = 0,25; (5,02 / 0,90)² ≈ 31, (5,02 / 0,90)³ ≈ 174.
- Thử phá: biên độ đuôi 0,05–0,35 thân (St rời khoảng 0,2–0,4 thì báo), bước sóng 0,5–1,5 thân (U/c ≥ 1 thì sóng thân không còn đẩy nước ra sau), tua chậm tới 10 lần.
- Dựng: `cd tools/robotics && node build.mjs mako`.

## Thẻ chia sẻ và trang nhẹ
Mọi trang có khối thẻ og và twitter ngay sau `<meta charset>` cùng ảnh xem trước 1200×630 trong [`design/the/`](design/the/) (bước 9 của quy trình teardown: trình đọc liên kết chỉ đọc phần đầu trang). `python3 tools/the_chia_se.py` chèn khối thẻ, chạy cuối `build_all`; `--render` vẽ lại ảnh có tiêu đề hoặc ảnh bìa đã đổi. Robotics không còn nhúng phông dạng data (HTML giảm khoảng 320 KB, dưới 1 MB). 20 bài thư viện vẫn nặng 1,0–1,3 MB do mã mô phỏng gốc đóng gói kèm; thẻ chia sẻ nằm ở đầu trang nên vẫn đọc được.

## Lịch sử 10 và Thành Cổ Loa
[`lich-su-10/`](lich-su-10/) là lộ trình Lịch sử lớp 10 theo **chương trình** môn Lịch sử (TT 32/2018, ban hành lại bởi TT 13/2022, sửa đổi bởi TT 17/2025), nên dùng chung cho ba bộ sách Kết nối tri thức, Chân trời sáng tạo, Cánh diều. Mỗi mục có yêu cầu cần đạt trích nguyên văn (dữ liệu [`lich-su-10/chuong-trinh.json`](lich-su-10/chuong-trinh.json)), cảnh 3D đã có hoặc dự kiến, và tên bài tương ứng của ba bộ sách để đối chiếu. Nội dung bài được viết mới từ nguồn khảo cổ và sử liệu công khai; không chép sách giáo khoa.

[`lich-su-10/co-loa/`](lich-su-10/co-loa/) là bài mẫu: ba vòng thành Cổ Loa trên đồng bằng ven sông Hoàng Giang.
- Số đo có nguồn: chu vi ba vòng (1.650 m, 6.500 m, 8.000 m), mặt cắt lũy (hố Xóm Thượng: rộng 21,5 m, cao 4,5 m; hào cách chân 6 m, rộng 12 m, sâu 4,8 m; hố Đống Dân 2012), số cửa, 18 ụ hoả hồi, niên đại C14 của nhóm Nam C. Kim. Toạ độ đền, đình, am, giếng theo OpenStreetMap (ODbL).
- Phỏng dựng, ghi rõ trên trang: đường đi cụ thể của từng vòng (chưa có bản đồ mở có toạ độ tuyến thành), vị trí cửa, vị trí kho mũi tên và trống đồng, đường sông, chiều cao ở các giai đoạn chưa có số đo.
- Dòng thời gian 6 mốc (trước thế kỷ IV TCN → ngày nay) làm lũy cao lên, rộng ra theo mặt cắt từng giai đoạn; thành Nội để mờ ở thời Âu Lạc vì niên đại còn tranh luận. Chiều cao xem được ở tỉ lệ thật, ×3, ×6.
- Đồ hoạ thực: bầu trời vật lý và nắng chiều có bóng đổ, ruộng lúa đồng bằng (thửa dài, bờ ruộng, mương, ruộng ngâm nước phản chiếu trời), lũy đất bo tròn theo mặt cắt, hào và sông có mặt nước động, 48 làng có lũy tre, vườn, ao. Nhà theo thời kỳ: nhà sàn mái cong phỏng theo hình nhà trên trống đồng Ngọc Lũ (thời cổ), nhà ngói (thế kỷ XV–XVI), nhà hiện nay; cây phủ lũy ở hiện trạng. Mặc định tỉ lệ thật, có ×2, ×4. Máy tính có thêm che khuất môi trường (GTAO); điện thoại tắt hậu kỳ, giảm bóng và mật độ cây.
- Chế độ học theo bước: 10 bước, 3 câu hỏi; bảng "Truyền thuyết và bằng chứng"; 27 nguồn có đánh số.
- Dựng bằng `python3 tools/build_co_loa.py` (hình học, dữ liệu) từ `tools/co-loa.template.html`; lộ trình bằng `python3 tools/build_ls10.py`.

## Robotics: sáu mô phỏng chạy trực tiếp
[`robotics/`](robotics/) dành cho đại học và kỹ sư. Mỗi trang là một bảng điều khiển 1600 × 900 kiểu phòng thí nghiệm: robot 3D ở giữa, các bảng số đo hai bên, khung lời giảng ở dưới. Mở ra là bài giảng tự chạy (con trỏ bấm từng nút, lời giảng theo từng bước); chạm vào là tự cầm lái, 25 giây không thao tác thì bài giảng chạy lại. Mọi thanh đo và biểu đồ là trạng thái thật của mô phỏng.

| Robot | Nội dung | Số liệu |
|---|---|---|
| UR5e, cánh tay 6 trục | FK theo DH, IK giải tích 8 nghiệm (Hawkins 2013), Jacobian, chỉ số Yoshikawa, kỳ dị vai, MoveJ/MoveL bậc năm, mô men trọng lực, gắp và đặt | Bảng DH, khối lượng và trọng tâm khâu của Universal Robots; giới hạn khớp từ Universal_Robots_ROS2_Description |
| PhantomX AX, 6 chân | IK chân 3 bậc, dáng đi tripod/tetrapod/wave theo β, đa giác chống đỡ, biên ổn định tĩnh và dọc, mô men servo | Cấu hình Phoenix (KurtE), AX-12A (ROBOTIS); femur/tibia tác giả ghi "đoán", khối lượng 2 kg là giả định |
| Chó robot 4 chân (Mini Cheetah) | IK chân 3 bậc gối gập ra sau, đứng / đi bước β 0,85 có dồn trọng tâm / đi kiệu β 0,5 / bật nhảy, lực đỡ từng chân từ cân bằng lực và mô men, mô men lật dư khi đi kiệu, τ = Jᵀf, dòng và nhiệt cuộn dây i²R, tách rời, lắp ráp | Cheetah-Software của MIT (MiniCheetah.h: kích thước, khối lượng, tỉ số truyền, kT, R, 24 V), Katz và cộng sự ICRA 2019 (9 kg, 2,45 m/s); vỏ, đầu cảm biến, chu kỳ bước, quãng đẩy là giả định |
| Sứa robot (Cyro) | Lực phụt F = (ρ/A)(dV/dt)² khi co, lực ngược khi giãn, lực cản, khối nước kéo theo, vòng xoáy, rhopalia dựng chuông lại, lơ lửng bằng điều khiển phản hồi, tua mô phỏng Verlet, tế bào gai, tách rời, lắp ráp | Cyro (Live Science 2013: 1,7 m, 77 kg, 5 nhịp lên 2,4 m), Daniel 1983 qua Dabiri và cộng sự 2007, Robojelly (Colin và cộng sự 2012), Nüchter và cộng sự 2006; hình chuông, hệ số cản, nổi dư là giả định, biên độ co hiệu chỉnh theo số của Cyro |
| Crazyflie 2.x, drone | Thân cứng 6 bậc, lực và mô men từng rô-to, PID xếp tầng vị trí → vận tốc → góc → tốc độ góc, bộ trộn legacy, nhiễu con quay, trễ động cơ | Förster 2015 (ETH Zürich), hệ số và cấu trúc từ crazyflie-firmware |
| TurtleBot3 Burger, xe vi sai | Động học vi sai, encoder 4096 xung, odometry trôi, LiDAR LDS-02, bản đồ lưới log-odds, pure pursuit, dừng an toàn, phục hồi | ROBOTIS e-Manual, turtlebot3 (burger.yaml, URDF), firmware OpenCR; phòng, vật cản, độ lệch bánh là giả định để dạy; "định vị liên tục" mô phỏng kết quả AMCL |

- Kiểm bằng máy: UR5e FK(IK) sai 1,5·10⁻¹² m trên 2000 tư thế; hexapod IK/FK khớp 3·10⁻¹⁶; chó robot IK/FK khớp 2·10⁻¹⁶ trên 8000 điểm, biên ổn định tĩnh khi đi bước ≥ 29 mm, mọi tư thế đi kiệu và bật nhảy (H tới 35 cm) trong tầm với và dưới mô men tối đa; drone giữ độ cao quanh 36–37k PWM, cú đẩy 2,5 mN·m hồi phục ở hệ số gốc; TurtleBot3 chạy 100 s kịch bản bài giảng không va chạm.
- Phương pháp, phong cách bàn điều khiển và cách tổ chức trang theo [teardown](https://github.com/elvarofficial/teardown) (elvarofficial) dựa trên [claude-motion](https://github.com/whaleyxbt/claude-motion) (whaleyxbt), MIT; giấy phép gốc ở [`tools/robotics/LICENSE-teardown`](tools/robotics/LICENSE-teardown).
- Mã: [`tools/robotics/`](tools/robotics/). `kit/` (sân khấu three.js r186 WebGL với GTAO, bảng điều khiển, vỏ trang tự chạy có 3 bậc chất lượng), mỗi robot một thư mục: phần tính (`kin.js`, `gait.js`, `quad.js`, `diff.js`; `quadruped/kin.js`, `jellyfish/kin.js`) không phụ thuộc three.js, `main.js` là phần vẽ và kịch bản bài giảng. Dựng: `cd tools/robotics && npm ci && node build.mjs` (mỗi trang một tệp ~0,95 MB, nhúng sẵn three.js và phông có tiếng Việt); mục lục bằng `python3 tools/build_pages.py`.
- Hình khối dựng bằng mã theo cách teardown dựng V8 (`kit/shapes.js`): vỏ khớp tiện có bo mép và nắp vòm, ống loe, servo có đĩa trục và tai bắt vít, tấm waffle có lưới lỗ, bánh có gai, cánh quạt có biên dạng và xoắn; vật liệu nhựa phủ bóng, nhôm anod, mạch in, kính khói, cao su.
- Lên lớp: Shift P hoặc nút Lên lớp; bút trình chiếu chuyển từng lời giảng; màn hình giáo viên, điện thoại điều khiển (xem [Dụng cụ lên lớp](#dụng-cụ-lên-lớp)). Trên điện thoại và máy tính bảng dựng đứng, cảnh 3D phủ màn hình, lời giảng thành thẻ đọc được, nút Bảng số mở lại bàn điều khiển.
- Thêm `?q=0`, `?q=1` hoặc `?q=2` vào địa chỉ để ép bậc đồ hoạ (0 đẹp nhất, 2 cho máy yếu); khi ép bậc, trang không tự hạ.

## Dụng cụ lên lớp
Mọi bài 3D (Tế Bào, Ty Thể, Cổ Loa, Cơ thể người, Neuron, 6 mô phỏng chạy trực tiếp, 54 bài thư viện) dùng chung một vỏ [`shell/bg-shell.js`](shell/bg-shell.js):
- Shift P hoặc nút Lên lớp; bút trình chiếu, phím mũi tên, PageUp/PageDown chuyển bước; B màn đen; F toàn màn hình; thêm `?lenlop` vào địa chỉ để mở sẵn chế độ lên lớp.
- Màn hình giáo viên: cửa sổ thứ hai trên cùng máy, có ghi chú, câu hỏi kèm đáp án, yêu cầu cần đạt; bài có gói dạy thử thì hiện thêm phút dự kiến và việc của giáo viên từng bước; không cần mạng.
- Điện thoại: [`dieu-khien/`](dieu-khien/), quét mã QR hoặc nhập mã 6 ký tự (WebRTC qua PeerJS, cần mạng); từ thiết bị thứ hai, giáo viên phải bấm Cho phép trên màn chiếu.
- [`kiem-may/`](kiem-may/): đo khung hình mỗi giây, thời gian tải, card đồ hoạ của từng bài trên máy của trường; cảnh báo khi trình duyệt vẽ bằng phần mềm; xuất JSON, CSV.
- Đặc tả: [`docs/he-thiet-ke.md`](docs/he-thiet-ke.md). Nhúng vỏ: `python3 tools/inject_shell.py` (54 bài thư viện thêm `--adapter=thu-vien`).

## Gói dạy thử 45 phút
[`giao-vien/`](giao-vien/) có ba gói dạy cho Tế Bào (Sinh học 10), Neuron (Sinh học 11) và Thành Cổ Loa (Lịch sử 10). Mỗi gói gồm: hướng dẫn bắt đầu trong 10 phút, kịch bản theo phút chia bốn hoạt động (mở đầu, hình thành kiến thức, luyện tập, vận dụng), phiếu học tập một trang A4, đáp án và gợi ý chấm, cách xử lý sự cố, yêu cầu cần đạt trích nguyên văn và nguồn.
- Một nguồn: [`tools/goi-day/<bài>.json`](tools/goi-day/). `python3 tools/build_goi_day.py` dựng trang in được; `tools/chuoi_bai.py` nhúng phút dự kiến và việc của giáo viên từng bước vào bài, nên màn hình giáo viên hiện kịch bản ngay cạnh ghi chú, đồng hồ chuyển cam khi bước đang chậm.
- Bộ dựng dừng khi phút không liền mạch 0 → 45 hoặc phiếu có câu chưa có đáp án; `tests/smoke.py` báo lỗi khi tên bước trong gói lệch với bài.
- Phiếu in đen trắng được, mỗi phiếu đúng một trang A4 (nút In phiếu); nút In kịch bản in hướng dẫn, kịch bản và đáp án.
- Bản thử: nội dung chưa qua giáo viên bộ môn duyệt.

## AR: ribosome trên bàn học
[`te-bao/ar.html`](te-bao/ar.html) dùng model-viewer để đặt bề mặt phân tử của ribosome 3J7R lên mặt bàn thật bằng điện thoại (ARCore/ARKit). Tỉ lệ 1 Å = 1 mm, tức phóng to 10 triệu lần, ribosome cao khoảng 30 cm. Có nút làm mờ 40S hoặc 60S để lộ tRNA và mRNA. Trên máy tính, trang hiện mã QR để học sinh quét. Mô hình [`te-bao/assets/ribosome-3j7r.glb`](te-bao/assets/ribosome-3j7r.glb) (4,2 MB, 231 nghìn tam giác) dựng bằng `tools/build_glb.py`: marching cubes trên mật độ nguyên tử theo từng nhóm, rút gọn lưới, màu theo thang tuyến tính của glTF.

## Thư viện 54 bài 3D tiếng Việt
[`thu-vien/`](thu-vien/) là bản tiếng Việt của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab) (铜匠实验室): 10 lý, 25 hoá, 5 sinh, 14 địa. Bản này được tác giả đồng ý cho dùng phi thương mại. Đã dịch 14.536 đoạn, khoảng 245 nghìn chữ Hán; kiểm tự động giữ nguyên biến, thẻ và ký tự thoát; cả 54 bài đúng cú pháp; không còn chữ Hán hiển thị. **Thư mục này theo giấy phép CC BY-NC 4.0 của bản gốc, không phải MIT.** Xem [`thu-vien/GHI-CONG.md`](thu-vien/GHI-CONG.md).

## Giao diện
Mọi trang dùng chung một chuẩn trong [`tools/liquid_glass.py`](tools/liquid_glass.py): nền trắng, vật liệu kính lỏng phỏng theo iOS 27 và macOS 27 (nền mờ, bão hoà màu, viền sáng bên trong, bóng mềm, góc bo lớn, nút dạng viên thuốc), một bộ phông tự lưu cho cả site ở `design/fonts/` (Be Vietnam Pro cho chữ, Noto Serif cho tiêu đề trang mục, JetBrains Mono cho số đo; khai ở `design/tokens.json`, kể cả các mô phỏng robotics). Giao diện luôn sáng, kể cả khi máy đặt chế độ tối. 54 bài thư viện nhận cùng chuẩn qua khối CSS `lg-theme` mà `vi_tool.py apply` chèn vào.

## Tốc độ và dùng khi mạng yếu
- **Bộ nhớ đệm theo mã băm** (`sw.js`, sinh bằng [`tools/sw.py`](tools/sw.py) ở bước cuối của `build_all.py`): `sw-manifest.json` ghi SHA-256 của mọi tệp site phục vụ. Tệp đã lưu đúng mã băm thì mở ngay từ máy, không hỏi mạng; chỉ tệp đổi nội dung mới tải lại sau mỗi lần đăng (GitHub Pages tự đổi ETag của mọi tệp mỗi lần đăng và chỉ cho lưu 10 phút). Tệp tải về được tính lại SHA-256, khớp mới lưu, nên bản trên máy luôn trùng từng byte với bản trên site. Bài đã mở vẫn mở được khi mất mạng. Khi máy rảnh và mạng tốt, bài đang học nhờ tải trước "Bài sau". Gỡ ở một máy: thêm `?sw=0`; gỡ toàn site: thêm `"tat": true` vào `sw-manifest.json`.
- **three.js tự lưu** ở `vendor/three@0.180.0/` (bản `.min` chính thức của gói npm, `tools/sri.py --check` đối chiếu từng byte với jsDelivr): Tế Bào, Ty Thể, Cổ Loa, Neuron không còn tải mã từ CDN bên thứ ba, nhẹ hơn khoảng một nửa khi nén.
- Bài Cá thở bằng mang chỉ chờ con cá hiện đầu tiên; ba loài còn lại tải ngầm.
- **Lưu bài để dùng khi mất mạng**: bài có tệp kèm chỉ tải khi cần (Cá thở bằng mang, Tế Bào, Cơ thể người) có mục này trong menu ⋯; sw.js tải đủ cả thư mục bài, báo tiến độ, để giáo viên chuẩn bị trước giờ học.
- **Mô phỏng robotics dùng chung một gói mã** (`robotics/_chung/chung-<mã băm>.js`, three.js và bộ kit, 180 KB khi nén): 15 trang bài chỉ còn phần riêng 30 đến 200 KB, chuyển bài không tải lại three.js. Bản một tệp (`build.mjs --out`) vẫn tự chứa.
- Danh sách mã băm chia theo thư mục lớn: danh sách chính 6 KB khi nén, phần của Cơ thể người (2.800 tệp) ở `sw-manifest/co-the-nguoi.json`, chỉ tải khi vào bài đó.
- **Chuyển cảnh liền mạch** ([`tools/chuyen_canh.py`](tools/chuyen_canh.py)): trên trình duyệt hỗ trợ (Chrome/Edge 126+, Safari 18.2+), trang cũ hoà sang trang mới và ảnh bìa trên thẻ vừa bấm phóng lớn thành màn tải của bài; trình duyệt khác chuyển trang như cũ; tôn trọng "giảm chuyển động".
- Đo: [`tests/perf.py`](tests/perf.py) (mạng giả lập 8 Mbps, trễ 80 ms), [`tests/sw_check.py`](tests/sw_check.py) (bộ nhớ đệm, mất mạng, tải trước).

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chính Sáng Ăn Khoai (dựng bằng `tools/build_pages.py` từ `tools/bai-giang.template.html`) |
| `te-bao/index.html`, `te-bao/ribosome.b64.txt` | Hành Trình Vào Tế Bào (ghép từ `src/`) và dữ liệu ribosome nén (2,1 MB) |
| `te-bao/ar.html`, `te-bao/assets/` | Trang AR và mô hình GLB của ribosome |
| `cong-nghe/dong-co-4-ki/`, `tools/robotics/dong-co/` | Động cơ xăng 4 kì: trang đã dựng; mô hình, hình khối, bảng số |
| `vat-li-10/ca-map-robot/`, `tools/robotics/mako/` | Robot cá mập mako: trang đã dựng; mô hình bơi, hình khối, bảng số |
| `design/the/`, `tools/the_chia_se.py` | Ảnh thẻ chia sẻ 1200×630 và công cụ chèn thẻ og |
| `tests/beat_sheet.py` | Bảng ảnh từng bước của một bài để soi lỗi bằng mắt |
| `than-kinh/`, `tools/than-kinh.template.html` | Neuron và xung thần kinh: trang đã dựng và nguồn |
| `co-the-nguoi/`, `tools/co-the-nguoi/` | Cơ thể người 3D (BodyVista Việt hoá): trang đã dựng và mô hình nén; mã gốc `upstream/`, bản vá và bài học trong `tools/` |
| `ty-the/index.html` | Vào Ty Thể, dữ liệu ATP synthase nhúng sẵn |
| `chu-de/sinh-hoc-te-bao/` | Lộ trình Sinh học tế bào lớp 10 |
| `lich-su-10/`, `lich-su-10/co-loa/` | Lộ trình Lịch sử 10 (`tools/build_ls10.py`), bài Thành Cổ Loa (`tools/build_co_loa.py`, `tools/co-loa.template.html`, nguồn `tools/co_loa_nguon.json`) |
| `robotics/`, `robotics/<robot>/` | Mục lục Robotics (`tools/robotics/build_hub.py`) và 6 mô phỏng robot; cùng bộ dựng `tools/robotics/` (`node build.mjs`) dựng cả bài Động cơ 4 kì và Robot cá mập |
| `giao-vien/`, `tools/goi-day/`, `tools/build_goi_day.py` | Gói dạy thử 45 phút: trang in được và nguồn JSON |
| `shell/`, `dieu-khien/`, `kiem-may/` | Vỏ lên lớp chung và bộ gắn cho bài thư viện; trang điều khiển bằng điện thoại; trang kiểm máy. `shell/dist/` là mã vỏ đã rút gọn do `tools/inject_shell.py` sinh: mọi bài tải chung một tệp (có mã băm nội dung), trình duyệt giữ trong bộ nhớ đệm khi chuyển bài; bản offline nhúng lại nguyên mã |
| `thu-vien/` | 54 bài tiếng Việt (CC BY-NC 4.0), ảnh bìa, `catalog.vi.json`, đối chiếu chương trình `gdpt2018.json`, công cụ Việt hoá `_viet-hoa/`; `thu-vien/anh/` là ảnh nhúng base64 lớn được `tools/house_thu_vien.py` tách ra (ảnh Trái Đất dùng chung cho 4 bài) |
| `src/head.part`, `src/body.part`, `src/script.part` | CSS, HTML, JS của trang Tế Bào |
| `tools/liquid_glass.py` | Chuẩn giao diện chung: nền trắng, kính lỏng |
| `tools/build_pages.py` | Dựng trang chính (`bai-giang.template.html`), trang Thư viện (`thu-vien.template.html`), trang chủ đề và các trang chuyển hướng; CSS chung của hai trang ở `trang-chinh.css`, kiểu riêng của trang chính (nền giấy, mục lục bài giảng) ở `trang-chu.css`; khung trang mục ở `design/house.css` |
| `tools/khung_bia.py` | Đóng khung lại bìa bài 3D nền sáng: cùng tỉ lệ 3:2, cùng cỡ vật, chạy lại không đổi (mã băm ở `thu-vien/covers/khung.json`) |
| `tools/build_ribosome.py`, `tools/build_atp.py`, `tools/build_glb.py` | Xử lý trước dữ liệu PDB, có cổng kiểm sai số |
| `tools/sw.py` | Bộ nhớ đệm theo mã băm: `sw-manifest.json`, `sw.js`, khối đăng ký ở mọi trang |
| `vendor/three@0.180.0/` | three.js tự lưu (bản min của gói npm), import map sinh bằng `tools/sri.py` |
| `tools/build_offline.py` | Đóng gói bản offline một file |
| `offline/` | Nơi `tools/build_offline.py` ghi hai bản offline (không đưa vào git; bản phát hành ở Releases) |
| `tests/` | Kiểm bằng Playwright; danh sách và cách chạy ở [`tests/README.md`](tests/README.md) |
| `docs/` | Ghi chép Bước A: nguồn dữ liệu, kỹ thuật vẽ, phần minh hoạ |

## Chạy
```bash
python3 tools/build_all.py      # dựng lại toàn bộ site theo đúng thứ tự (robotics cần: cd tools/robotics && npm ci)
python3 -m http.server 8777     # mở http://localhost:8777 (cần phục vụ qua HTTP để tải dữ liệu)
python3 tests/smoke.py 8777     # mở thử 23 trang, báo lỗi JS
```
Thêm `#webgl` vào cuối địa chỉ để ép chạy WebGL 2. Thêm `?lite=1` để xem chế độ nhẹ (vỏ tự bật khi máy chậm kéo dài: bỏ làm mờ nền sau bảng, giảm điểm ảnh; cảnh và hiệu ứng 3D giữ nguyên), `?lite=0` để tắt hẳn.

Mỗi lần đẩy lên `main`, GitHub Actions (`.github/workflows/ci.yml`) kiểm cú pháp, kiểm tệp đã dựng khớp với nguồn (`build_all.py --check`), kiểm three.js tự lưu trùng bản gốc và mã băm toàn vẹn của tệp CDN (`tools/sri.py --check`) và mở thử các trang.

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
- `co-the-nguoi/`: mã BodyVista MIT; mô hình CC BY-SA 4.0 và CC BY-SA 2.1 JP, một phần chỉ dùng phi thương mại; xem `co-the-nguoi/GHI-CONG.md`.
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
- Honda Việt Nam, Wave Alpha 110, thông số kĩ thuật (honda.com.vn): động cơ, đường kính × hành trình, dung tích, tỉ số nén, công suất, mô men.
- Heywood JB. Internal Combustion Engine Fundamentals. McGraw-Hill 1988, chương 2: tỉ số thanh truyền/bán kính khuỷu 3–4 ở động cơ cỡ nhỏ và vừa, tỉ số nén động cơ xăng 8–12, chu trình Otto.
- Chương trình giáo dục phổ thông môn Công nghệ (Thông tư 32/2018/TT-BGDĐT), lớp 11, Công nghệ cơ khí: yêu cầu cần đạt mục Động cơ đốt trong.
- Betts JG và cs. Anatomy and Physiology 2e, OpenStax 2022, mục 12.4 The Action Potential và 12.5 Communication Between Neurons. CC BY 4.0.
- Azevedo FAC và cs. Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain. J Comp Neurol 2009;513:532–541. doi:10.1002/cne.21974.
- Chương trình giáo dục phổ thông 2018 (Thông tư 32/2018/TT-BGDĐT): nguồn từng môn ghi trong `thu-vien/gdpt2018.json`.
