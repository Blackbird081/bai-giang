# Refinery cho bài Cá thở bằng mang

Dữ liệu tra cứu loài (`tools/robotics/mang/fish/loai.json`) đi qua Refinery (skill `refinery`, engine `refinery.py`):
cào → trích có dẫn chứng → phân hạng → hợp nhất → kiểm độc lập. Mỗi giá trị dẫn về một dòng nguyên văn của bản chụp.

| Domain | Thực thể | Nguồn | Mẫu số |
|---|---|---|---|
| `domains/ca_ho_hap` | 4 023 bản ghi đo: 323 đo diện tích mang, 3 700 đo tiêu hao ô xi lúc nghỉ (standard/routine, không gây stress) | FishBase v25.04, bảng gillarea, oxygen, refrens | 7 662 bản ghi gốc |
| `domains/ca_ho_hap` (tier A) | 22 bản ghi của cá cam Nhật, cá chép, cá ayu đối chiếu với 6 bài báo gốc | J-STAGE (Nippon Suisan Gakkaishi, truy cập mở), `doi_chieu_goc.py` | 22 bản ghi dẫn 6 bài này |
| `domains/ca_loai` | 354 loài (có bản ghi đo, cộng các loài của Fish Kit) | FishBase v25.04, bảng species, families, comnames (tiếng Việt), swimming | 36 132 loài FishBase |

## Chạy lại

```bash
# 1. lấy bảng FishBase v25.04 (rfishbase đăng trên Hugging Face; FishBase CC BY-NC 3.0)
B=https://huggingface.co/datasets/cboettig/fishbase/resolve/main/data/fb/v25.04/parquet
for t in gillarea oxygen species families comnames swimming refrens; do curl -sLo /tmp/fb/$t.parquet $B/$t.parquet; done
# 2. thu thập + trích (tất định, không gọi mô hình ngôn ngữ): bản chụp + claims.jsonl
python3 tools/refinery/fishbase_claims.py /tmp/fb
# 2b. đối chiếu bài gốc (gộp claim tier A vào ca_ho_hap; chạy SAU bước 2 vì bước 2 ghi đè claims.jsonl)
python3 tools/refinery/doi_chieu_goc.py                  # dùng bản trích đã có
# python3 tools/refinery/doi_chieu_goc.py --chup <thư mục PDF>   # trích lại từ PDF J-STAGE, kiểm SHA-256
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

## Đối chiếu bài gốc (`doi_chieu_goc.py`)

FishBase chép số từ bài báo. Đặt số của chính bài báo đó cạnh số FishBase cho biết FishBase chép đúng hay
không: khớp thì ô thành corroborated (✓✓), lệch thì disputed, giữ cả hai. Đây là kiểm chép, hai bên cùng một
thí nghiệm, không phải phép đo thứ hai.

| Bài (J-STAGE) | Bản ghi | Kết quả |
|---|---|---|
| Kobayashi, Murata và Harada 1988 · cá cam Nhật, mang | Mang #98–#104 | 7 khối lượng ✓✓, 5 hàng rào ✓✓; giai đoạn III và VII bài để trống, FishBase điền 1,74 (trung bình 5 giá trị kia); bài ghi mm²/g, thêm vào field `mang_mm2_g` |
| Yamamoto, Itazawa và Kobayashi 1981 · cá cam Nhật, ô xi | Ô xi #2811 | khối lượng, nhiệt độ, ô xi ✓✓ (1,73 ml/phút/kg → 148 mg/kg/h) |
| Itazawa và Takeda 1982 · cá chép | Ô xi #3712 | khối lượng ✓✓; ô xi lệch: FishBase 76,3, bài 58,4 ml/h/kg = 83,5 mg/kg/h theo 1,429 mg/ml |
| Takeda và Itazawa 1979 · cá chép | Ô xi #3686–#3701 (8) | khối lượng, nhiệt độ ✓✓; ô xi chỉ có đồ thị |
| Oya và Kimata 1938 · cá chép, cá ayu | Ô xi #3577, #3598, #3601, #1828 | khối lượng, nhiệt độ ✓✓ (cá chép); ô xi chỉ có đồ thị; cá ayu 10,7 g không thấy trong bài |
| Itazawa và Takeda 1979 · cá chép | Ô xi #3682 | ô xi chỉ có đồ thị, không đối chiếu được |

Luật riêng: bản trích chỉ giữ các dòng chứa số liệu được dẫn (không lưu toàn văn). Bài ảnh quét đọc bằng
tesseract; evidence_span là chuỗi OCR nguyên trạng, mỗi số đã soát bằng mắt với ảnh trang (ghi ở `soat`).
Chuẩn hoá chỉ là đổi đơn vị, định dạng, ml → mg O₂ theo 1,429 mg/ml và làm tròn về số chữ số có nghĩa của
số gốc; không lấy trung điểm khoảng, không nhân hai số. Không tới được J Exp Biol (trang chặn robot) nên chưa
đối chiếu các bài cá ngừ của Muir và Hughes 1969.
