# Hệ thiết kế và vỏ bài học chung (bản 14)

Mọi trang của Sáng Ăn Khoai dùng một bộ token, một bộ phông, một bộ biểu tượng và một vỏ bài học (`shell/bg-shell.js` v2). Giáo viên học cách dùng một bài là dùng được mọi bài; học sinh đi từ bài này sang bài khác mà không thấy như rời khỏi trang.

## Nguồn duy nhất

| Tệp | Vai trò | Sửa bằng |
|---|---|---|
| `design/tokens.json` | Màu, cỡ chữ, góc bo, khoảng cách, bóng, thời lượng chuyển động, hai biến thể, chế độ Máy chiếu | sửa tay rồi chạy `python3 tools/design.py` |
| `design/house.css` | Token dạng biến CSS `--bg-*` và `@font-face` cho các trang dựng bằng Python (trang chính, chủ đề, lộ trình, Robotics, Kiểm máy) | sinh tự động |
| `design/icons.svg` | Bộ biểu tượng nét 1,75 px, lưới 24 px | sinh tự động từ `tools/design.py` |
| `design/fonts/` | Be Vietnam Pro (giao diện), Noto Serif (tiêu đề lớn), JetBrains Mono (chỉ cho con số); tập con Latin + tiếng Việt, woff2, tổng 228 KB, giấy phép SIL OFL | không sửa |
| `tools/chuoi_bai.py` | Thứ tự bài, chủ đề của từng bài, "Bài tiếp theo", ảnh bìa màn tải | sửa tay |
| `shell/bg-shell.js` | Vỏ bài học v2 | sửa tay; khối giữa `/*TOKENS:start*/` và `/*TOKENS:end*/` do `tools/design.py` ghi |

Không viết cứng mã màu, cỡ chữ, góc bo trong phần vỏ. Màu môn (`--bg-s-sinh`, `--bg-s-su`, `--bg-s-robo`, `--bg-s-ly`, `--bg-s-hoa`, `--bg-s-dia`) chỉ dùng cho nhãn môn, đường nhấn, nút chính trong bài; nút chính và liên kết của khung chung dùng màu mực `--bg-brand`.

## Thang chữ và quy tắc chữ tiếng Việt

Thang 7 cỡ: 13 · 15 · 17 · 20 · 26 · 34 · 48 px (`--bg-fs-xs` … `--bg-fs-3xl`). Không chữ nào dưới 13 px trên màn chiếu 1440 × 900, dưới 14 px trên điện thoại. `tools/minfont.py` nâng mọi cỡ chữ CSS dưới ngưỡng lên ngưỡng.

- Không viết hoa giãn chữ cho nhãn tiếng Việt dài hơn hai từ (dấu chồng hai tầng sẽ dính dòng trên).
- Chiều cao dòng 1,6 cho đoạn văn, 1,4 cho giao diện.
- Phông đơn cách chỉ cho con số đo; nhãn dùng phông giao diện.
- Tiêu đề lớn dùng Noto Serif 600; không dùng chữ tô gradient.

## Hai biến thể, một gia đình

| Biến thể | Dùng cho | Khác nhau ở |
|---|---|---|
| `pho-thong` (mặc định) | Lớp 6–12 | nền kính lỏng trắng, góc bo 20/14/10 px |
| `dai-hoc` | Robotics | nền giấy studio, góc bo 8/6/4 px |

Hai biến thể dùng chung thanh đầu bài, phông, biểu tượng, cách lên lớp.

## Vỏ bài học v2

- **Thanh đầu bài** (56 px; điện thoại 48 px): logo về trang chính · chủ đề / tên bài · tiến độ bước (bấm để bắt đầu học theo bước hoặc mở danh sách bước) · nút ngăn kéo của bài · Lên lớp · Bài sau · menu Thêm (màn hình giáo viên, điện thoại, chế độ Máy chiếu, toàn màn hình, phím tắt, Về bài này).
- **Ngăn kéo**: bảng của bài trượt vào, ra từ nút trên thanh. `desktop: true` nghĩa là chỉ là ngăn kéo trên màn rộng; trên điện thoại bảng nằm trong trang.
- **Thanh dưới trên điện thoại**: bước trước · tên bước · bước sau; vuốt ngang trên thanh để chuyển bước.
- **Bài tiếp theo**: nút trên thanh và thẻ hiện ở bước cuối, đọc từ `tools/chuoi_bai.py`.
- **Màn tải**: `tools/inject_shell.py` đặt ảnh bìa của bài ngay đầu `<body>`; thanh tiến độ chạy theo sự kiện thật (mỗi tệp tải xong, trang đọc xong, canvas có khung đầu), vỏ đặt 100 % rồi gỡ khi cảnh đã vẽ khung hình đầu.
- **Chế độ nhẹ**: vỏ đo nhịp khung hình sau khi gỡ màn tải; 3 lượt liền có p90 trên 25 ms thì đặt `html[data-bg-lite]` (bỏ làm mờ nền sau mọi bảng, bảng đục hơn) và phát sự kiện `bg:lite` để bài tự giảm điểm ảnh (Ty Thể, Cổ Loa). Cảnh và hiệu ứng 3D giữ nguyên; máy đủ mạnh không bao giờ vào chế độ này. `?lite=1` ép bật, `?lite=0` tắt hẳn. Tế Bào và robotics có bậc chất lượng tự hạ riêng.
- **Màn hình giáo viên**: cửa sổ thứ hai kiểu người trình bày: bước hiện tại, bước sau, ghi chú lớn, đồng hồ, câu hỏi có nút hiện đáp án.
- **Điện thoại làm điều khiển**: `dieu-khien/`, nửa trên là bước và ghi chú, nửa dưới hai vùng bấm lớn, rung nhẹ khi chuyển bước, dải báo khi mất kết nối. Mã nối 6 ký tự (khoảng 1 tỉ tổ hợp, sinh bằng `crypto.getRandomValues`); điện thoại đầu tiên nối thẳng, từ thiết bị thứ hai màn chiếu hỏi giáo viên Cho phép hay Từ chối. Màn chiếu chỉ nhận 7 lệnh cố định; chữ hiện trên điện thoại đều được thoát ký tự HTML.
- **Tệp từ CDN**: three.js, PeerJS, qrcode, model-viewer đều có mã băm toàn vẹn (SRI; import map có khoá `integrity`), giữ trong `tools/sri.py`; CI kiểm lại với CDN mỗi lần đẩy mã.
- **Chế độ Máy chiếu**: menu Thêm hoặc `?chieu`; chữ lớn hơn 1,25 lần, chữ đen, bảng nền đặc; nhớ trên máy.
- **Trợ năng**: nhãn cho mọi nút biểu tượng, vùng báo bước cho trình đọc màn hình, vòng tiêu điểm 2 px, `lang="vi"`, giảm chuyển động theo cài đặt máy (thời lượng 1 ms, ảnh màn đầu không tự đổi).
- **Gợi ý lần đầu**: kéo để xoay, cuộn hoặc hai ngón để phóng, bấm vào vật; hiện 3 giây, tối đa hai lần mỗi máy.
- Số đo kỹ thuật (fps, p95, lệnh vẽ) chỉ hiện khi thêm `?debug` vào địa chỉ, hoặc ở trang Kiểm máy.

## Gắn một bài vào vỏ

```js
BGShell.mount({
  id: 'co-loa', title: 'Thành Cổ Loa', subject: 'Lịch sử 10', variant: 'pho-thong',
  objectives: ['…yêu cầu cần đạt, trích nguyên văn…'],
  steps: [{ t: 'Tên bước', note: 'Ghi chú cho giáo viên', ask: { q: 'Câu hỏi', o: ['A', 'B'], a: 1, e: 'Giải thích' }, sr: 'mô tả cảnh cho trình đọc màn hình' }],
  go: (i) => { /* bài chuyển tới bước i */ },
  end: () => { /* bài thoát chế độ học theo bước */ },
  panels: [{ label: 'Thông tin', icon: 'info', sel: '#info', side: 'right', open: false, desktop: true }],
  keys: [['M', 'ẩn, hiện màng']],
  credit: 'Nguồn, ghi công, phần nào là minh hoạ.',
});
BGShell.update(i);   // bài tự chuyển bước; i < 0 là bài đã thoát
```

`crumb` (chủ đề) và `next` (bài tiếp theo) không cần truyền: vỏ đọc từ `window.BG_SEQ` mà `tools/inject_shell.py` nhúng theo đường dẫn tệp. Bài đặt chỗ cho thanh đầu bài bằng `body.bgs-on` và biến `--bg-bar`; thanh dưới điện thoại bằng `body.bgs-nav-on`.

Nhúng: `python3 tools/inject_shell.py <tệp>`. Tế Bào chạy trong `build.sh`, Cổ Loa trong `tools/build_co_loa.py`, Robotics trong `tools/robotics/build.mjs`, 54 bài thư viện bằng `python3 tools/house_thu_vien.py` (lớp CSS nhà + bộ gắn thư viện). Vỏ rút gọn khoảng 52 KB (nén gzip khoảng 15 KB), nằm trong chính tệp nên bài chạy offline.

## Bố cục từng nhóm bài

| Nhóm | Mặc định | Ngăn kéo |
|---|---|---|
| Tế Bào, Ty Thể | cảnh 3D chiếm khung chính, thanh điều khiển mỏng dưới cảnh | Tế Bào: Thông tin (phải) |
| Cổ Loa | cảnh 3D + dòng thời gian | Điều khiển (trái), Thông tin (phải); học theo bước tự mở Thông tin |
| Robotics | chế độ xem cảnh: cảnh phủ màn hình, thẻ lời giảng dưới trái | Bảng số: bàn điều khiển 1600 × 900 đầy đủ |
| 54 bài thư viện | cảnh 3D, bảng Bước này mở trên màn rộng từ 1100 px, viên thuốc chuyển bước ở giữa | Bước này (trái), Điều khiển (phải, mở sẵn từ 1600 px) |

## Kiểm tự động

Một lệnh dựng lại cả site: `python3 tools/build_all.py` (`--check` báo lỗi nếu tệp đã dựng lệch nguồn; CI chạy lệnh này). Kiểm nhanh: `python3 tests/smoke.py`.

`python3 tests/ui_audit.py --group all` (cần `python3 -m http.server 8777` ở gốc repo) đo ở 5 cỡ màn: chuỗi số đo kỹ thuật lộ ra, cỡ chữ nhỏ nhất, vùng bấm dưới 44 px, chữ bị cắt hoặc tràn ra ngoài màn hình, chữ sát mép khung có nền hay viền (dưới 6 px hai bên, dưới 1 px trên dưới), đường về trang chính, bài tiếp theo, tỉ lệ cảnh 3D không bị che, ghi công Tongjiang, lỗi JavaScript. Không đo độ mượt (trình duyệt trong máy chủ vẽ bằng phần mềm); độ mượt đo bằng `kiem-may/` trên máy thật.

## Chuẩn chất lượng

- Chữ không chạm mép khung: nút, thẻ, viên thuốc có nền hay viền chừa ít nhất 6 px hai bên. Chữ dài (tiếng Việt thường dài hơn bản gốc tiếng Trung, tiếng Anh) thì xuống dòng hoặc rút gọn có dấu …, không bị cắt.

- Từ 30 khung hình mỗi giây trên máy chuẩn của trường. Đo bằng `kiem-may/`.
- Số liệu nào cũng có nguồn; chỗ phỏng dựng ghi rõ ngay cạnh.
- Tương phản chữ từ 4,5:1; chế độ Máy chiếu từ 7:1.
- Vùng bấm từ 44 × 44 px trên màn cảm ứng.
