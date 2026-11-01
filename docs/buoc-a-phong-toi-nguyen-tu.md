# Bước A · Phóng từ tế bào xuống nguyên tử (bản 6)

Ngày: 26/10/2026 · Sản phẩm: https://nclamvn.github.io/bai-giang/te-bao/

## Dữ liệu và nguồn
- Cấu trúc: PDB 3J7R, "Structure of the translating mammalian ribosome-Sec61 complex". Voorhees RM, Fernández IS, Scheres SHW, Hegde RS. Cell 2014. doi:10.1016/j.cell.2014.05.024. Ribosome lợn (Sus scrofa), cryo-EM, độ phân giải 3,9 Å theo RCSB.
- Lý do chọn: ribosome động vật có vú đầy đủ hai tiểu phần, có mRNA, tRNA ở trạng thái lai A/P và P/E, và kênh Sec61. Đúng loại ribosome bám lưới nội chất hạt trong cảnh.
- Các ứng viên đã loại: 6W6L (người, nhưng thiếu rRNA 18S), 4V6X, 6QZP, 8GLP (không có Sec61).
- Số liệu kiểm được từ RCSB: 222.336 nguyên tử, 96 chuỗi, mRNA có toạ độ 10 nucleotide.

## Quy trình xử lý trước (tools/build_ribosome.py)
1. Đọc mmCIF bằng gemmi, bỏ hydro, phân 9 nhóm: rRNA 60S, protein 60S, rRNA 40S, protein 40S, mRNA, tRNA A/P, tRNA P/E, Sec61, ion.
2. Hệ trục: +Y là pháp tuyến màng, từ tâm Sec61 hướng về tâm ribosome. +X là hướng từ tâm 40S sang tâm 60S, chiếu lên mặt màng.
3. Mặt giữa màng: tâm của lớp dày 30 Å có độ kỵ nước trung bình cao nhất của Sec61 (thang Kyte–Doolittle, theo nguyên tử CA). Kiểm lại: đáy 60S ở phân vị 0,5% cao 29 Å trên mặt giữa màng.
4. Trung tâm nối peptide (ước lượng): tâm gốc A76 của tRNA A/P. Cách lối ra đường hầm khoảng 90 Å đo trên mô hình.
5. Mức thô: mỗi gốc một hạt, 17.884 hạt.
6. Lượng tử int16, sai số tối đa 0,0042 Å, nén gzip còn 1,57 MB. Có cổng kiểm: đọc lại sau khi nén và so với toạ độ gốc.

## Kỹ thuật vẽ
- Mỗi nguyên tử là một tấm phẳng tự xoay về camera, tô thành hình cầu bằng TSL trên three r180: pháp tuyến tính trong không gian nhìn, độ sâu ghi qua depthNode, nên GTAO và DOF nhận đúng hình cầu.
- Ba mức chi tiết theo khoảng cách tới ribosome:
  - hạt vẽ phóng to, thu dần về kích thước thật;
  - mỗi gốc một hạt, kèm polysome 5 ribosome và màng lipid;
  - 222.336 nguyên tử.
- Hơn 400 nghìn hình cầu cùng lúc khi ở thang phân tử. Ribosome lân cận vẽ phóng to cũng thu về kích thước thật khi camera tới gần.
- Mặt phẳng gần của camera, bán kính AO và độ sâu trường ảnh đều co theo thang, đi từ µm xuống Å.

## Phần minh hoạ (ghi trên trang)
Gồm: màu; từng phân tử lipid; độ phẳng của màng; cách xếp 4 ribosome lân cận (bản sao của cùng mô hình); sợi mRNA nối giữa các ribosome; chuyển động xoay ratchet; chuỗi protein mới. Riêng chuỗi protein mới không có toạ độ trong 3J7R, đường đi của nó được ước lượng.

## Còn mở
- Cổng 0: đo trên laptop lớp học thật, gồm cả thang nguyên tử. Máy thử chỉ có GPU giả lập, khoảng 10 giây mỗi khung khi vẽ đủ 400 nghìn hình cầu.
- Cần người duyệt khoa học cho: cách đặt màng, vị trí trung tâm nối peptide, và độ đậm khi nhuộm ở thang phân tử.
