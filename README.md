# Hành Trình Vào Tế Bào

Tế bào nhân thực 3D đang hoạt động, phóng liền mạch từ toàn cảnh xuống 222.336 nguyên tử của một ribosome thật (PDB 3J7R) trên lưới nội chất. three.js r180, WebGPU với dự phòng WebGL 2, một trang HTML tự chứa.

- Trang công khai (GitHub Pages): https://nclamvn.github.io/hanh-trinh-te-bao/ · Vào Ty Thể: [`ty-the.html`](ty-the.html) · AR: [`ar.html`](ar.html) · Thư viện 54 bài: [`thu-vien/`](thu-vien/) · Lộ trình Sinh học tế bào lớp 10: [`chu-de-sinh-hoc-te-bao.html`](chu-de-sinh-hoc-te-bao.html)
- Bản đang chạy trên Claude: https://claude.ai/artifact/68y1264YdVFXQnzmHg5mrW (bản 11)
- Vào Ty Thể trên Claude: https://claude.ai/artifact/PLNECoseboZiMU7MXKREzy · Thư viện và lộ trình lớp 10 trên Claude: https://claude.ai/artifact/GKx2jb4nALqKE6FUDnLGXu
- Bản offline một file cho lớp học: [`offline/hanh-trinh-te-bao-offline.html`](offline/hanh-trinh-te-bao-offline.html) (9 MB, bấm "Download raw file", mở bằng Chrome hoặc Edge, không cần mạng); Vào Ty Thể: [`offline/vao-ty-the-offline.html`](offline/vao-ty-the-offline.html) (7,6 MB)
- Kế hoạch đồ hoạ: https://claude.ai/artifact/EdyMQyM2rYKcfFYwgFisvM
- Hồ sơ nguồn: https://claude.ai/artifact/FmWrnRkoZDdedueUbAcUqh

## Lên lớp
Nút **Lên lớp** mở bài "Hành trình của một phân tử protein tiết": 10 bước giáo viên bấm (phím → hoặc bút trình chiếu), mỗi bước có câu hỏi cho cả lớp, cuối bài là phần kiểm tra học sinh bấm đúng bào quan trên mô hình 3D và một câu trắc nghiệm, có tính điểm. Khung bài giảng (câu hỏi dẫn dắt, các bước, kiểm tra) học theo cách làm của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab); nội dung và mã viết mới hoàn toàn, không dùng tài nguyên của dự án đó.

## Vào Ty Thể: ATP synthase thật
[`ty-the.html`](ty-the.html) phóng liền mạch từ một ty thể cắt đôi xuống mép một tấm mào, nơi các dimer ATP synthase xếp hàng, rồi xuống 37.733 nguyên tử của một ATP synthase ty thể lợn (PDB 6J5I, cryo-EM 3,34 Å). Cách hai monomer ghép thành dimer và độ cong của màng ở gờ mào lấy từ tetramer cùng loài (PDB 6J5K): góc giữa hai trục rôto 123°, bán kính cong mặt giữa màng khoảng 5 nm. Đã bỏ protein ức chế IF1 có trong mẫu.
- Hoạt cảnh: mỗi H⁺ đi vào tiểu đơn vị a làm vòng c (8 tiểu đơn vị) quay 45°, theo vòng gần trọn một vòng rồi ra chất nền; trục γ quay theo, ba β lần lượt qua dạng lỏng, chặt, mở và nhả ATP mỗi 120°. Chiều quay theo chiều tổng hợp (ngược chiều kim đồng hồ khi nhìn từ phía F1). Tốc độ đã làm chậm; vị trí hai nửa kênh của tiểu đơn vị a là ước lượng.
- Phần quay tô màu lạnh (γ, δ, ε, vòng c), phần đứng yên màu ấm. Nút **Lên lớp**: 9 bước và 3 câu đố, trong đó một câu học sinh bấm thẳng vào phần đang quay.
- Dữ liệu dựng bằng `tools/build_atp.py` (ghép 6J5I vào hai vị trí của 6J5K theo CA phần đứng yên, có cổng kiểm sai số), nhúng sẵn trong trang (0,34 MB).
- Ty thể, mào, lipid và khoảng cách giữa các dimer trong hàng là minh hoạ.

## Lộ trình Sinh học tế bào lớp 10 và đối chiếu GDPT 2018
[`chu-de-sinh-hoc-te-bao.html`](chu-de-sinh-hoc-te-bao.html) xếp 6 bài theo mạch nội dung của chương trình môn Sinh học (Thông tư 32/2018/TT-BGDĐT): Tế Bào, vận chuyển qua màng, co và phản co nguyên sinh, Vào Ty Thể, enzyme, nguyên phân. Mỗi bài ghi yêu cầu cần đạt dạy trực tiếp; bảng cuối trang liệt kê đủ 68 yêu cầu của mạch Sinh học tế bào lớp 10 (kể cả hai chuyên đề) và chỉ rõ yêu cầu nào chưa có bài.

[`thu-vien/gdpt2018.json`](thu-vien/gdpt2018.json) đối chiếu cả 54 bài thư viện cùng hai trang Tế Bào và Ty Thể với chương trình Vật lí, Hoá học, Sinh học, Địa lí, Khoa học tự nhiên, Lịch sử và Địa lí: 349 yêu cầu cần đạt trích nguyên văn, mỗi trích dẫn đã so khớp bằng máy với văn bản nguồn (nguồn ghi trong tệp). Đã soát các lần sửa đổi chương trình (Thông tư 13/2022, 17/2025). Trang thư viện lọc được theo lớp và hiện yêu cầu cần đạt trên từng thẻ bài. Đối chiếu chưa qua giáo viên bộ môn duyệt.

## AR: ribosome trên bàn học
[`ar.html`](ar.html) dùng model-viewer để đặt bề mặt phân tử của ribosome 3J7R lên mặt bàn thật bằng điện thoại (ARCore/ARKit). Tỉ lệ 1 Å = 1 mm, tức phóng to 10 triệu lần, ribosome cao khoảng 30 cm. Có nút làm mờ 40S hoặc 60S để lộ tRNA và mRNA. Trên máy tính, trang hiện mã QR để học sinh quét. Mô hình [`assets/ribosome-3j7r.glb`](assets/ribosome-3j7r.glb) (4,2 MB, 231 nghìn tam giác) dựng bằng `tools/build_glb.py`: marching cubes trên mật độ nguyên tử theo từng nhóm, rút gọn lưới, màu theo thang tuyến tính của glTF.

## Thư viện 54 bài 3D tiếng Việt
[`thu-vien/`](thu-vien/) là bản tiếng Việt của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab) (铜匠实验室): 10 lý, 25 hoá, 5 sinh, 14 địa. Bản này được tác giả đồng ý cho dùng phi thương mại. Đã dịch 14.536 đoạn, khoảng 245 nghìn chữ Hán; kiểm tự động giữ nguyên biến, thẻ và ký tự thoát; cả 54 bài đúng cú pháp; không còn chữ Hán hiển thị. **Thư mục này theo giấy phép CC BY-NC 4.0 của bản gốc, không phải MIT.** Xem [`thu-vien/GHI-CONG.md`](thu-vien/GHI-CONG.md).

## Giao diện
Mọi trang dùng chung một chuẩn trong [`tools/liquid_glass.py`](tools/liquid_glass.py): nền trắng, vật liệu kính lỏng phỏng theo iOS 27 và macOS 27 (nền mờ, bão hoà màu, viền sáng bên trong, bóng mềm, góc bo lớn, nút dạng viên thuốc), phông hệ thống (SF Pro trên máy Apple, Inter ở nơi khác). Giao diện luôn sáng, kể cả khi máy đặt chế độ tối. 54 bài thư viện nhận cùng chuẩn qua khối CSS `lg-theme` mà `vi_tool.py apply` chèn vào.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang hoàn chỉnh (ghép từ `src/`) |
| `ribosome.b64.txt` | Dữ liệu ribosome đã xử lý: nhị phân gzip mã hoá base64 (2,1 MB) |
| `src/head.part`, `src/body.part`, `src/script.part` | CSS, HTML, JS của trang |
| `ty-the.html` | Trang Vào Ty Thể, dữ liệu ATP synthase nhúng sẵn |
| `chu-de-sinh-hoc-te-bao.html` | Lộ trình Sinh học tế bào lớp 10 (dựng bằng `tools/build_pages.py`) |
| `ar.html`, `assets/` | Trang AR và mô hình GLB của ribosome |
| `thu-vien/` | 54 bài tiếng Việt (CC BY-NC 4.0), trang thư viện, công cụ Việt hoá trong `_viet-hoa/`, đối chiếu chương trình `gdpt2018.json` |
| `tools/build_atp.py` | Quy trình xử lý trước: mmCIF 6J5I và 6J5K → dữ liệu ATP synthase nén |
| `tools/liquid_glass.py` | Chuẩn giao diện chung: nền trắng, kính lỏng |
| `tools/build_pages.py`, `tools/thu-vien.template.html` | Dựng trang thư viện và trang chủ đề từ `catalog.vi.json` và `gdpt2018.json` |
| `tools/build_glb.py` | Dựng GLB bề mặt phân tử từ dữ liệu ribosome |
| `offline/` | Bản offline một file: three.js và dữ liệu nhúng sẵn |
| `tools/build_offline.py` | Đóng gói bản offline, có cổng kiểm import tương đối và module thiếu |
| `tools/build_ribosome.py` | Quy trình xử lý trước: mmCIF 3J7R → dữ liệu nén, có cổng kiểm sai số |
| `tests/` | Kiểm bằng Playwright: tải dữ liệu, bố cục, các cảnh nguyên tử |
| `docs/` | Ghi chép Bước A: nguồn dữ liệu, kỹ thuật vẽ, phần minh hoạ |

## Chạy
```bash
./build.sh                      # ghép index.html và kiểm cú pháp
python3 -m http.server 8765     # mở http://localhost:8765 (cần phục vụ qua HTTP để tải ribosome.b64.txt)
```
Thêm `#webgl` vào cuối địa chỉ để ép chạy WebGL 2.

Đóng gói lại bản offline (cần `npm i three@0.180.0`):
```bash
python3 tools/build_offline.py index.html ribosome.b64.txt node_modules/three offline/hanh-trinh-te-bao-offline.html
```

Dựng lại thư viện và trang chủ đề sau khi sửa `catalog.vi.json` hoặc `gdpt2018.json`:
```bash
python3 tools/build_pages.py
```

## Dựng lại dữ liệu ATP synthase
```bash
mkdir -p data && for id in 6J5I 6J5K; do curl -o data/$id.cif.gz https://files.rcsb.org/download/$id.cif.gz; done
python3 tools/build_atp.py data atp.bin      # rồi nhúng base64 của atp.bin vào ty-the.html (thẻ id="atp-b64")
```

## Dựng lại dữ liệu ribosome
```bash
pip install gemmi numpy
mkdir -p data && curl -o data/3J7R.cif.gz https://files.rcsb.org/download/3J7R.cif.gz
python3 tools/build_ribosome.py data/3J7R.cif.gz ribosome.bin
base64 -w 0 ribosome.bin > ribosome.b64.txt
```

## Giấy phép
- Mã và nội dung của Hành Trình Vào Tế Bào, trang AR, công cụ: MIT (tệp `LICENSE`).
- `thu-vien/`: CC BY-NC 4.0, theo bản gốc Tongjiang Lab; chỉ dùng phi thương mại.
- Dữ liệu cấu trúc: RCSB PDB 3J7R, 6J5I, 6J5K.

## Nguồn
- Voorhees RM, Fernández IS, Scheres SHW, Hegde RS. Structure of the mammalian ribosome-Sec61 complex to 3.4 Å resolution. Cell 2014. doi:10.1016/j.cell.2014.05.024. Toạ độ từ RCSB PDB 3J7R.
- Gu J, Zhang L, Zong S, và cs. Cryo-EM structure of the mammalian ATP synthase tetramer bound with inhibitory protein IF1. Science 2019;364:1068–1075. doi:10.1126/science.aaw4852. Toạ độ từ RCSB PDB 6J5I, 6J5K.
- Watt IN, Montgomery MG, Runswick MJ, Leslie AGW, Walker JE. Bioenergetic cost of making an adenosine triphosphate molecule in animal mitochondria. PNAS 2010;107:16823–7. doi:10.1073/pnas.1011099107.
- Noji H, Yasuda R, Yoshida M, Kinosita K. Direct observation of the rotation of F1-ATPase. Nature 1997. doi:10.1038/386299a0.
- Abrahams JP, Leslie AGW, Lutter R, Walker JE. Structure at 2.8 Å resolution of F1-ATPase from bovine heart mitochondria. Nature 1994. doi:10.1038/370621a0.
- Strauss M, Hofhaus G, Schröder RR, Kühlbrandt W. Dimer ribbons of ATP synthase shape the inner mitochondrial membrane. EMBO J 2008. doi:10.1038/emboj.2008.35.
- Chương trình giáo dục phổ thông 2018 (Thông tư 32/2018/TT-BGDĐT): nguồn từng môn ghi trong `thu-vien/gdpt2018.json`.
