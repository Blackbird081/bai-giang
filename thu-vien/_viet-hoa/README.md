# Công cụ Việt hoá

- `vi_tool.py extract <repo gốc>`: tách các đoạn chữ tiếng Trung cần dịch ra `units.json`. Bỏ qua chú thích trong mã.
- `vi_tool.py checktsv <lô.tsv> <bản dịch.tsv...>`: kiểm bản dịch. Biến `${...}`, thẻ và ký tự thoát phải giữ nguyên; không được còn chữ Hán; không được có ký tự làm gãy chuỗi JS.
- `vi_tool.py apply <repo gốc> tr <thư mục ra>`: ghép bản dịch vào 54 bài và chèn CSS tiếng Việt.
- `tr/*.tsv`: bản dịch, mỗi dòng có dạng `id<TAB>tiếng Việt`. `tr/zz_fix.tsv` nạp sau cùng để ghi đè. `catalog_tr.tsv` là bản dịch danh mục.
- Sửa một bản dịch: tìm id của đoạn trong `units.json`, sửa dòng tương ứng trong `tr/`, rồi chạy lại `apply`.
