# Thư viện bài học 3D tiếng Việt · ghi công và giấy phép

Thư mục này chứa bản tiếng Việt của **Tongjiang Lab (铜匠实验室)**, © 2026 铜匠十点睡觉 (https://lab.tongjiang.app). Mã nguồn gốc ở https://github.com/smithjohn78390/tongjiang-lab, bản dùng để Việt hoá là commit 4d63ce0, ngày 28/10/2026.

## Giấy phép
Toàn bộ nội dung trong thư mục này (bài học, ảnh bìa, danh mục, bản dịch) phát hành theo **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**, giống bản gốc: https://creativecommons.org/licenses/by-nc/4.0/legalcode. **Không dùng cho mục đích thương mại.** Tác giả bản gốc đã đồng ý cho Việt hoá phi thương mại.

three.js đóng gói trong mỗi bài theo giấy phép MIT (xem THIRD_PARTY_NOTICES.md). Giấy phép MIT ở thư mục gốc của repo chỉ áp dụng cho bài Hành Trình Vào Tế Bào và các công cụ của dự án, không áp dụng cho thư mục này.

## Những gì đã thay đổi so với bản gốc
- Dịch toàn bộ chuỗi giao diện và nội dung từ tiếng Trung sang tiếng Việt: 14.536 đoạn, khoảng 245 nghìn chữ Hán. Bảng thuật ngữ bám chương trình GDPT 2018 (xem _viet-hoa/glossary.md).
- Đổi `lang="zh-CN"` thành `lang="vi"`. Thêm khối CSS `#vi-fit`: phông chữ hỗ trợ tiếng Việt, chỉnh cỡ chữ vài ô số liệu cho vừa chữ Việt.
- Không thay đổi mô hình 3D, mô phỏng hay số liệu. Trích dẫn sách giáo khoa vẫn là bộ sách Nhân Giáo 2019 (Trung Quốc); trong bài, chữ “SGK” trơn được ghi thành “SGK gốc” để không nhầm với SGK Việt Nam.
- Giao diện (bản 14, 11/2026), chỉ thêm lớp ngoài, không sửa mã mô phỏng gốc:
  - khối CSS `lg-theme` và `bg-house` (sinh bởi `tools/house_thu_vien.py`): nền trắng, phông Be Vietnam Pro tự lưu trữ, màu nhấn theo môn, cỡ chữ tối thiểu 13 px (`tools/minfont.py` nâng các cỡ nhỏ hơn), vùng bấm từ 44 px trên màn cảm ứng;
  - ẩn ba hàng thanh trên của bản gốc, thay bằng thanh đầu bài chung của Bài Giảng (`shell/bg-shell.js`, bộ gắn `shell/adapter-thu-vien.js`): về trang chính, thứ tự bài trong môn, tiến độ bước, bảng Bước này và Điều khiển dạng ngăn kéo, chế độ Lên lớp, điều khiển bằng điện thoại, chế độ máy chiếu;
  - chân bài thành viên thuốc chuyển bước; dòng ghi công Tongjiang Lab hiện trong bảng Bước này của mọi bài.
- Bổ sung (ngoài bài gốc): đối chiếu từng bài với chương trình GDPT 2018 trong `gdpt2018.json`, hiện trên trang thư viện.
- Bản dịch do AI thực hiện, có kiểm tự động (giữ nguyên biến, thẻ, ký tự thoát; đúng cú pháp cả 54 bài; không còn chữ Hán hiển thị). **Chưa qua giáo viên bộ môn duyệt.** Báo lỗi tại https://github.com/nclamvn/bai-giang/issues.

## Làm lại bản dịch
Xem _viet-hoa/README.md.
