# Cơ thể người 3D (BodyVista Việt hoá)

- `upstream/`: mã nguồn BodyVista nguyên bản (FreedomIntelligence, MIT), commit trong `upstream/UPSTREAM_COMMIT`. Không sửa tay.
- `build.py`: chép upstream ra thư mục tạm, áp các thay đổi (hàm `patch_*`), đóng gói bằng esbuild, ghi `co-the-nguoi/`, nhúng vỏ Sáng Ăn Khoai. Cần `npm ci --ignore-scripts` trong thư mục này một lần (three, three-mesh-bvh, zustand cho khu răng miệng).
- `vi.json`: từ điển tiếng Việt, khoá là câu gốc tiếng Trung của BodyVista (4.332 mục).
- `lesson.js`: bài học 14 bước cho giáo viên, gọi `window.BodyVista` và `window.BGShell`.
- `house.css`, `house-dental.css`: lớp giao diện nhà.
- `models.mjs`: nén mô hình từ một bản clone BodyVista sang `co-the-nguoi/assets/` (EXT_meshopt_compression). Chỉ chạy lại khi upstream đổi mô hình:
  `npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer && node models.mjs <clone>/assets ../../co-the-nguoi/assets`
  Ảnh thu nhỏ (`thumbs/`) và mô hình răng miệng (`dental/models/`) chép nguyên từ clone.

Cập nhật upstream: thay `upstream/` bằng bản mới, chạy `build.py`; hàm `patch_*` nào không còn khớp sẽ báo lỗi rõ chỗ. Chuỗi mới cần thêm vào `vi.json`.
Ghi công và giấy phép: [`co-the-nguoi/GHI-CONG.md`](../../co-the-nguoi/GHI-CONG.md).
