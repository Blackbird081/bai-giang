# Refinery cho bài Cá thở bằng mang

Dữ liệu tra cứu loài (`tools/robotics/mang/fish/loai.json`) đi qua Refinery (skill `refinery`, engine `refinery.py`):
cào → trích có dẫn chứng → phân hạng → hợp nhất → kiểm độc lập. Mỗi giá trị dẫn về một dòng nguyên văn của bản chụp.

| Domain | Thực thể | Nguồn | Mẫu số |
|---|---|---|---|
| `domains/ca_ho_hap` | 4 023 bản ghi đo: 323 đo diện tích mang, 3 700 đo tiêu hao ô xi lúc nghỉ (standard/routine, không gây stress) | FishBase v25.04, bảng gillarea, oxygen, refrens | 7 662 bản ghi gốc |
| `domains/ca_loai` | 354 loài (có bản ghi đo, cộng các loài của Fish Kit) | FishBase v25.04, bảng species, families, comnames (tiếng Việt), swimming | 36 132 loài FishBase |

## Chạy lại

```bash
# 1. lấy bảng FishBase v25.04 (rfishbase đăng trên Hugging Face; FishBase CC BY-NC 3.0)
B=https://huggingface.co/datasets/cboettig/fishbase/resolve/main/data/fb/v25.04/parquet
for t in gillarea oxygen species families comnames swimming refrens; do curl -sLo /tmp/fb/$t.parquet $B/$t.parquet; done
# 2. thu thập + trích (tất định, không gọi mô hình ngôn ngữ): bản chụp + claims.jsonl
python3 tools/refinery/fishbase_claims.py /tmp/fb
# 3. dựng + chứng minh cổng cắn (engine của skill refinery)
python3 $REFINERY/refinery.py tools/refinery/domains/ca_ho_hap
(cd $REFINERY && python3 bites.py $PWD_REPO/tools/refinery/domains/ca_ho_hap)
# 4. xuất cho bài giảng
python3 tools/refinery/export_mang.py $REFINERY
```

## Luật đã giữ

- Bản chụp ghi URL, ngày lấy, SHA-256 của tệp parquet; mỗi dòng là `cột=giá trị` đúng như bảng.
- Số đo (khối lượng, diện tích, nhiệt độ, độ mặn, ô xi) cấm `inferred` (`domain_gates.no_inferred_fields`).
- Nhiều tên Việt cho một loài: giữ trọn (disputed), không chọn hộ; chính tả giữ như FishBase.
- Kiểu thở (bơm/ép dòng) FishBase không có: để trống thật, không suy ra.
- Seriola lalandi và S. aureovittata là cụm cấm tự gộp.
- Số suy ra (mm²/g, lít nước mỗi phút) không nằm trong registry: bài tính lúc chạy và ghi "tính".
- Giá trị lạ (trên 2000 mm²/g hoặc 2000 mg O₂/kg/h) vẫn hiện, gắn cờ ⚑, mời đọc tài liệu gốc.
