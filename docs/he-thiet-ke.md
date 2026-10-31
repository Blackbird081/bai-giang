# Hệ thiết kế và vỏ bài học chung (M1)

Mọi bài 3D của Bài Giảng dùng chung một vỏ (`shell/bg-shell.js`) và một bộ token. Giáo viên học cách lên lớp một lần là dùng được mọi bài.

## Hai biến thể, một bộ thành phần

| Biến thể | Dùng cho | Nền | Góc bo | Chữ nhãn |
|---|---|---|---|---|
| `pho-thong` (mặc định) | Lớp 6–12: Tế Bào, Ty Thể, Cổ Loa, 54 bài thư viện | Trắng, kính lỏng (blur 22 px, saturate 180%) | 18 px, nút tròn | Inter, chữ thường |
| `dai-hoc` | Robotics và các học phần đại học | Giấy studio `#fbf7f0`, viền `#e3d6c1` | 6 px | JetBrains Mono, chữ hoa, giãn chữ |

Màu nhấn theo môn (mỗi bài một màu nhấn, không thêm màu thứ hai cho nút chính):

| Môn | Màu nhấn |
|---|---|
| Sinh học | `#C2184A` |
| Lịch sử | `#B26A1A` |
| Robotics | `#e3562a` |

Token (đặt trên phần tử `.bgs`, đổi theo `data-variant`): `--bgs-ink`, `--bgs-ink2`, `--bgs-hair`, `--bgs-accent`, `--bgs-fill`, `--bgs-stroke`, `--bgs-blur`, `--bgs-shadow`, `--bgs-r`, `--bgs-r-sm`, `--bgs-font`, `--bgs-mono`.

## Thành phần của vỏ

- **Thanh lên lớp** (góc dưới phải, hoặc vị trí riêng của bài): Lên lớp / Kết thúc, Điều khiển, Toàn màn hình.
- **Dải bước** khi đang lên lớp: số bước, tên bước, đồng hồ tiết học, số thiết bị điều khiển đang nối.
- **Màn đen**: phím B hoặc nút trên điều khiển; bấm vào màn để bật lại.
- **Màn hình giáo viên**: cửa sổ thứ hai trên cùng máy. Có ghi chú từng bước, câu hỏi cho lớp kèm đáp án, danh sách bước, yêu cầu cần đạt. Không cần mạng.
- **Điện thoại**: trang `dieu-khien/`, nối bằng mã QR 4 ký tự qua WebRTC (PeerJS). Cần mạng; không lưu gì trên máy chủ.

## Phím

| Phím | Việc |
|---|---|
| Shift P | Bật, tắt chế độ lên lớp |
| → PageDown ↓ | Bước sau (bút trình chiếu gửi PageDown) |
| ← PageUp ↑ | Bước trước |
| Home, End | Bước đầu, bước cuối |
| B hoặc . | Màn đen |
| F | Toàn màn hình |

Phím cách không dùng để chuyển bước vì nhiều bài dùng nó để tạm dừng mô phỏng. Thêm `?lenlop` vào địa chỉ để mở bài ở chế độ lên lớp.

## Gắn một bài vào vỏ

```js
BGShell.mount({
  id: 'co-loa', title: 'Thành Cổ Loa', subject: 'Lịch sử 10', accent: '#B26A1A', variant: 'pho-thong',
  objectives: ['…yêu cầu cần đạt, trích nguyên văn…'],
  steps: [{ t: 'Tên bước', note: 'Ghi chú cho giáo viên', ask: { q: 'Câu hỏi', o: ['A', 'B'], a: 1, e: 'Giải thích' } }],
  go: (i) => { /* bài chuyển tới bước i, tự vào chế độ học theo bước nếu chưa */ },
  end: () => { /* bài thoát chế độ học theo bước */ },
  layout: { minWidth: 900, dock: 'top:124px;right:30px;bottom:auto', hud: () => '…css tính theo khung 3D…' },
});
// khi chính bài tự chuyển bước (người dùng bấm nút của bài):
BGShell.update(i);   // i < 0 nghĩa là bài đã thoát
```

Nhúng vỏ vào tệp HTML: `python3 tools/inject_shell.py <tệp>` (Tế Bào chạy trong `build.sh`; Cổ Loa nhúng trong `tools/build_co_loa.py`). Vỏ nằm trong chính tệp nên bài vẫn chạy offline; chỉ phần điện thoại tải PeerJS và thư viện QR từ jsDelivr khi giáo viên bấm.

## Chuẩn chất lượng

- Từ 30 khung hình mỗi giây trên máy chuẩn của trường (laptop chip đồ hoạ tích hợp, Android tầm trung). Đo bằng `kiem-may/`.
- Số liệu nào cũng có nguồn; chỗ phỏng dựng ghi rõ ngay cạnh.
- Chữ trên màn chiếu không dưới 13 px ở khung 1440 × 900.
