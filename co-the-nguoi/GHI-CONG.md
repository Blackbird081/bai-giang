# Cơ thể người 3D · ghi công và giấy phép

Bài "Cơ thể người 3D" của Sáng Ăn Khoai phát triển từ **BodyVista** của FreedomIntelligence (FreedomAI): https://github.com/FreedomIntelligence/BodyVista, bản dùng là commit `82b2ea12f71fd123eb728f465eb413bb8d6a150e` (30/10/2026). Mã nguồn gốc giữ nguyên trong [`tools/co-the-nguoi/upstream/`](../tools/co-the-nguoi/upstream/).

Thư mục này gồm nhiều phần, mỗi phần một giấy phép. Đọc kèm [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) của BodyVista.

| Phần | Nguồn | Giấy phép |
|---|---|---|
| Mã ứng dụng BodyVista | FreedomAI, 2026 | MIT ([`LICENSE`](LICENSE)) |
| Mô hình giải phẫu chính (`assets/`, 2.899 cấu trúc), ảnh thu nhỏ (`thumbs/`) | Z-Anatomy, Lluís Vinent và cộng sự; dựng trên BodyParts3D | CC BY-SA 4.0. Siêu dữ liệu gốc ghi "with per-source attribution and NC exceptions; research only": một số nguồn chỉ cho dùng phi thương mại, nghiên cứu. Nguồn từng cấu trúc nằm trong trường `source_attribution` của mỗi tệp `.glb` và của `catalog.json` |
| 1 cấu trúc | BodyParts3D | CC BY 4.0 |
| Mô hình răng miệng (`dental/models/`) | BodyParts3D (© DBCLS) và phần dẫn xuất từ Z-Anatomy, qua Dental Scope | CC BY-SA 2.1 Nhật Bản và CC BY-SA 4.0, theo từng tệp: [`dental/vendor/CREDITS.md`](dental/vendor/CREDITS.md), [`dental/vendor/docs/assets.md`](dental/vendor/docs/assets.md) |
| Mã khu răng miệng | Dental Scope, Yoseph và cộng sự | MIT ([`dental/vendor/LICENSE`](dental/vendor/LICENSE)) |
| Nội dung giáo dục răng miệng phỏng theo Dental Scope, kể cả bản dịch | Dental Scope | CC BY-SA 4.0 |
| three.js, three-mesh-bvh, Zustand, React | các tác giả tương ứng | MIT |

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.

**Chỉ dùng phi thương mại.** Vì một phần mô hình mang điều kiện phi thương mại, toàn bộ bài này chỉ dùng cho giáo dục, không thương mại, giống thư viện thí nghiệm của Sáng Ăn Khoai.

## Những gì Sáng Ăn Khoai đã thay đổi
- **Tiếng Việt** là ngôn ngữ mặc định: 4.332 mục giao diện, tên cấu trúc và nội dung kiến thức (`tools/co-the-nguoi/vi.json`, khoá là câu gốc tiếng Trung). Vẫn đổi được sang 中文, English, 日本語. Bản dịch do AI thực hiện, thuật ngữ theo giáo trình giải phẫu học tiếng Việt và sách Khoa học tự nhiên; **chưa qua giáo viên bộ môn duyệt**. Báo lỗi tại https://github.com/nclamvn/bai-giang/issues.
- **Nén mô hình**: các mô hình trong `assets/` được tách khỏi tệp `.js` gốc và nén bằng EXT_meshopt_compression kèm lượng tử hoá đỉnh (KHR_mesh_quantization), từ 292,7 MB xuống 86,6 MB (`tools/co-the-nguoi/models.mjs`). Hình học được giữ nguyên, không giản lược; siêu dữ liệu nguồn của từng cấu trúc được giữ trong tệp. Mô hình nén là bản phỏng theo, phát hành theo cùng giấy phép CC BY-SA 4.0 với điều kiện phi thương mại như trên. Mô hình răng miệng giữ nguyên.
- **Giao diện**: thanh đầu bài chung của Sáng Ăn Khoai, phông Be Vietnam Pro, màu nhấn môn Sinh, cỡ chữ tối thiểu 13 px (điện thoại 14 px). Bỏ ảnh đếm lượt truy cập của bên thứ ba.
- **Bài học từng bước** cho giáo viên (14 bước, theo mạch "Sinh học cơ thể người" của Khoa học tự nhiên 8): `tools/co-the-nguoi/lesson.js`. Nội dung tự viết; số liệu dẫn OpenStax, Anatomy and Physiology 2e (CC BY 4.0).
- Đóng gói bằng esbuild thay cho Vite (`tools/co-the-nguoi/build.py`); mọi chỗ sửa mã gốc nằm trong các hàm `patch_*` của tệp đó.

Mô hình, hình động và cảnh hiển vi là minh hoạ dạy học, không dùng để chẩn đoán hay điều trị.
