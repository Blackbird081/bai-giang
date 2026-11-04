# Kiểm tra

Chạy máy chủ tĩnh ở gốc repo trước: `python3 -m http.server 8777`.

## Chạy tự động trên GitHub (`.github/workflows/ci.yml`)

| Bước | Lệnh | Kiểm gì |
|---|---|---|
| Cú pháp | `python -m py_compile …`, `node --check …` | mọi tệp Python, vỏ chung |
| Lỗi tĩnh | `ruff check --select F,E9 tools tests` | tên chưa định nghĩa, nhập thừa, biến bỏ không |
| Tệp dựng khớp nguồn | `python tools/build_all.py --check` | mọi trang đã dựng lại từ nguồn và trùng với bản trong repo |
| Mã băm CDN | `python tools/sri.py --check` | tệp tải từ CDN chưa bị đổi |
| Mở thử | `python tests/smoke.py 8777` | 23 trang mở được, không lỗi console, vỏ chung gắn đủ |

## Chạy tay khi cần

| Tệp | Kiểm gì |
|---|---|
| `ui_audit.py` | bố cục mọi trang ở nhiều cỡ màn hình: tràn ngang, chữ dưới 13 px, nút nhỏ hơn 44 px trên điện thoại, sân khấu 3D quá nhỏ |
| `a11y_audit.py <axe.min.js>` | trợ năng bằng axe-core trên 8 trang tiêu biểu |
| `beat_sheet.py` | ảnh tĩnh từng nhịp của chuyến tham quan một bài robotics, để soi va chạm nhãn và góc máy |
| `ty_the.py` | bài Vào Ty Thể: nạp dữ liệu, vòng c quay 45° mỗi H⁺, 8 H⁺ ra 3 ATP, chế độ Lên lớp |
| `lesson_flow.py`, `layout.py`, `atom_views.py`, `load_check.py` | bài Hành Trình Vào Tế Bào: lên lớp, bố cục 1920 và 1366, góc nhìn nguyên tử, nạp phân tử |
| `ar_page.py` | trang xem trên bàn (AR) của Tế Bào |
| `offline_check.py` | bản offline một tệp mở được khi không có mạng |

Các tệp chạy tay ghi ảnh ra thư mục hiện tại; chạy trong một thư mục tạm, không chạy ở gốc repo. `ui_audit.json`, `a11y_audit.json` là kết quả, không đưa vào repo.
