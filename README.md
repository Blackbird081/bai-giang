# Hành Trình Vào Tế Bào

Tế bào nhân thực 3D đang hoạt động, phóng liền mạch từ toàn cảnh xuống 222.336 nguyên tử của một ribosome thật (PDB 3J7R) trên lưới nội chất. three.js r180, WebGPU với dự phòng WebGL 2, một trang HTML tự chứa.

- Bản đang chạy: https://claude.ai/artifact/68y1264YdVFXQnzmHg5mrW (bản 8)
- Bản offline một file cho lớp học: [`offline/hanh-trinh-te-bao-offline.html`](offline/hanh-trinh-te-bao-offline.html) (9 MB, bấm "Download raw file", mở bằng Chrome hoặc Edge, không cần mạng)
- Kế hoạch đồ hoạ: https://claude.ai/artifact/EdyMQyM2rYKcfFYwgFisvM
- Hồ sơ nguồn: https://claude.ai/artifact/FmWrnRkoZDdedueUbAcUqh

## Lên lớp
Nút **Lên lớp** mở bài "Hành trình của một phân tử protein tiết": 10 bước giáo viên bấm (phím → hoặc bút trình chiếu), mỗi bước có câu hỏi cho cả lớp, cuối bài là phần kiểm tra học sinh bấm đúng bào quan trên mô hình 3D và một câu trắc nghiệm, có tính điểm. Khung bài giảng (câu hỏi dẫn dắt, các bước, kiểm tra) học theo cách làm của [Tongjiang Lab](https://github.com/smithjohn78390/tongjiang-lab); nội dung và mã viết mới hoàn toàn, không dùng tài nguyên của dự án đó.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang hoàn chỉnh (ghép từ `src/`) |
| `ribosome.b64.txt` | Dữ liệu ribosome đã xử lý: nhị phân gzip mã hoá base64 (2,1 MB) |
| `src/head.part`, `src/body.part`, `src/script.part` | CSS, HTML, JS của trang |
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

## Dựng lại dữ liệu ribosome
```bash
pip install gemmi numpy
mkdir -p data && curl -o data/3J7R.cif.gz https://files.rcsb.org/download/3J7R.cif.gz
python3 tools/build_ribosome.py data/3J7R.cif.gz ribosome.bin
base64 -w 0 ribosome.bin > ribosome.b64.txt
```

## Nguồn
Voorhees RM, Fernández IS, Scheres SHW, Hegde RS. Structure of the mammalian ribosome-Sec61 complex to 3.4 Å resolution. Cell 2014. doi:10.1016/j.cell.2014.05.024. Toạ độ từ RCSB PDB 3J7R.
