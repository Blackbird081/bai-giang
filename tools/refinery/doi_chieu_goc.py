#!/usr/bin/env python3
"""doi_chieu_goc.py · đối chiếu bản ghi FishBase với bài báo gốc (J-STAGE), thêm claim tier A.

  python3 tools/refinery/doi_chieu_goc.py                 # dựng claim từ bản trích đã có, gộp vào ca_ho_hap
  python3 tools/refinery/doi_chieu_goc.py --chup <thư mục PDF>   # trích lại từ PDF (kiểm SHA-256 trước)

Vì sao: FishBase chép số từ các bài báo. Đặt số của bài báo cạnh số FishBase cho biết FishBase CHÉP ĐÚNG
hay không (khớp → ô thành corroborated ✓✓; lệch → disputed, giữ cả hai). Đây là kiểm chép, không phải
một phép đo thứ hai độc lập: hai bên cùng gốc một thí nghiệm.

Luật:
  1. Chỉ dùng bài mở trên J-STAGE; ghi URL, ngày lấy, SHA-256 của PDF. Không lưu toàn văn (bản quyền của
     Hội Khoa học Thủy sản Nhật Bản): bản trích chỉ giữ các dòng chứa số liệu được dẫn.
  2. Bài có lớp chữ → pdftotext -raw. Bài chỉ là ảnh quét → tesseract 5 (eng, --psm 6) trên ảnh 200 dpi.
     evidence_span là chuỗi máy xuất ra, kể cả lỗi (OCR đọc "19.2" thành "192", "±" thành "." hay "4").
     Mỗi số lấy từ OCR đã được soát bằng mắt với ảnh trang; điều đó ghi ở cột soat, không sửa evidence.
  3. Chuẩn hoá chỉ là đổi đơn vị hoặc định dạng: kg → g, "1,117" → 1117, ml O₂ → mg O₂ theo 1,429 mg/ml
     (điều kiện chuẩn STPD, quy ước của sinh lí hô hấp), làm tròn về số chữ số có nghĩa của số đọc gốc.
     Không lấy trung điểm khoảng, không nhân hai số với nhau (diện tích toàn con = khối lượng × mm²/g là
     phép tính, để bài tính lúc chạy).
  4. Số chỉ có trên đồ thị → không có dòng nguyên văn → không thêm claim, chỉ ghi chú.
"""
import hashlib, html, json, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOM = HERE / 'domains' / 'ca_ho_hap'
FETCHED = '2026-11-09T06:30:00Z'
O2_MG_PER_ML = 1.42897  # mg O₂ trong 1 ml ở 0 °C, 1 atm (STPD)

PAPERS = {
    'kobayashi1988': {'cite': 'Kobayashi, H., O. Murata và T. Harada (1988). Some aspects of gill measurement in relation to the growth of the yellowtail Seriola quinqueradiata. Nippon Suisan Gakkaishi 54(1):49-54',
                      'doi': '10.2331/suisan.54.49', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/54/1/54_1_49/_pdf',
                      'sha': '8830bbedfc3370228c13012926f236bc397567f54423cca95ddbeca9091ae6d7', 'pdf': 'kob1988.pdf', 'how': 'text'},
    'yamamoto1981': {'cite': 'Yamamoto, K., Y. Itazawa và H. Kobayashi (1981). Gas exchange in the gills of yellowtail, Seriola quinqueradiata under resting and normoxic condition. Bull. Jap. Soc. Sci. Fish. 47:447-451',
                     'doi': '10.2331/suisan.47.447', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/47/4/47_4_447/_pdf',
                     'sha': '7d9a93576b4cb3d6f9de989fe9008576960e0e70b9770a5c92f53b77f2e21e16', 'pdf': 'yam1981.pdf', 'how': 'ocr', 'pages': [3]},
    'itazawa1982': {'cite': 'Itazawa, Y. và T. Takeda (1982). Respiration of carp under anesthesia induced by mixed bubbling of carbon dioxide and oxygen. Bull. Jap. Soc. Sci. Fish. 48:489-493',
                    'doi': '10.2331/suisan.48.489', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/48/4/48_4_489/_pdf',
                    'sha': '9807afc4045fac4fadfa64e42bbe152b113cc7895ced0f25b3ef5726fb83ba63', 'pdf': 'ita1982.pdf', 'how': 'ocr', 'pages': [1, 3]},
    'takeda1979': {'cite': 'Takeda, T. và Y. Itazawa (1979). An estimation of the minimum level of dissolved oxygen in water required for normal life of fish. III. Bull. Jap. Soc. Sci. Fish. 45:329-333',
                   'doi': '10.2331/suisan.45.329', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/45/3/45_3_329/_pdf',
                   'sha': 'bc72fed831319e1a34fefbad440ef3f7dbe7be3385e6d8cd832775612bf4d78d', 'pdf': 'tak1979.pdf', 'how': 'ocr', 'pages': [1]},
    'oya1938': {'cite': 'Oya, T. và M. Kimata (1938). Oxygen consumption of freshwater fishes. Bull. Japan. Soc. Sci. Fish. 6:287-290',
                'doi': '10.2331/suisan.6.287', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/6/6/6_6_287/_pdf',
                'sha': '67b15645979085fad8f857c4d6947589ba2b4482141a33744e3d4faa59709957', 'pdf': 'oya1938.pdf', 'how': 'text'},
    'itazawa1979': {'cite': 'Itazawa, Y. và T. Takeda (1979). An estimation of the minimum level of dissolved oxygen in water required for normal life of fish. II. Bull. Jap. Soc. Sci. Fish. 45:323-327',
                    'doi': '10.2331/suisan.45.323', 'url': 'https://www.jstage.jst.go.jp/article/suisan1932/45/3/45_3_323/_pdf',
                    'sha': 'ef75060329923cd1d901765a3659ab25310b128a24f50f142607585f1720b0fb', 'pdf': 'ita1979.pdf', 'how': None},
}

YT, CC = 'Seriola quinqueradiata', 'Cyprinus carpio'
G = lambda n: f'Mang #{n} · {YT}'
O = lambda n, sp=CC: f'Ô xi #{n} · {sp}'


def sig(x, ref):
    """Làm tròn x về số chữ số có nghĩa của chuỗi số gốc ref (vd '1.73' → 3)."""
    d = len(ref.replace('.', '').lstrip('0'))
    from math import floor, log10
    nd = d - 1 - floor(log10(abs(x)))
    v = round(x, nd)
    return int(v) if nd <= 0 else v


# (thực thể, field, value, evidence_span, extraction, bài, soát)
EV = []
# Kobayashi 1988 · Bảng 2 (khối lượng TB, mm²/g) và Bảng 1 (khoảng cách nước–máu, µm). Lớp chữ của PDF.
for n, wspan, w, gspan, g in [(98, 'I (4.9) 1,440', 4.9, '36.8 1,610', 1610), (99, '(50.7) 2,290', 50.7, '31.9 603', 603),
                              (100, '(98.8) 2,836', 98.8, '30.6 576', 576), (101, 'IV (234) 3,274', 234, '31.1 384', 384),
                              (102, 'V (450) 3,448', 450, '30.3 258', 258), (103, 'VI (555) 3,732', 555, '29.7 282', 282),
                              (104, 'VII (1,117) 3,886', 1117, '28.7 366', 366)]:
    EV.append((G(n), 'khoi_luong_g', w, wspan, 'normalized' if ',' in wspan.split(')')[0] else 'verbatim', 'kobayashi1988', ''))
    EV.append((G(n), 'mang_mm2_g', g, gspan, 'normalized' if g >= 1000 else 'verbatim', 'kobayashi1988', ''))
for n, span, v in [(98, 'I (No. 1) 2.28 17.2-18.4 9.36-10.4 1.9', 1.9), (99, 'II (No. 7) 5.81 22.8-27.0 6.24-7.3 1.8', 1.8),
                   (101, 'IV (No. 14) 6.50 21.4-27.5 5.5-6.5 1.7', 1.7), (102, 'V (No. 33) 6.59 21.829.1 6.2-7.3 1.6', 1.6),
                   (103, 'VI (No. 38) 7.79 23.5-29.0 5.7-6.7 1.7', 1.7)]:
    EV.append((G(n), 'hang_rao_um', v, span, 'verbatim', 'kobayashi1988', ''))
# Yamamoto 1981 · Bảng 1 (ảnh quét, OCR trang 3)
EV += [(O(2811, YT), 'nhiet_do_c', 19.2, 'Temperature of water (°C) 192 + 1.0 (47)', 'normalized', 'yamamoto1981', 'Ảnh trang: "19.2 ± 1.0 (47)"; OCR mất dấu chấm.'),
       (O(2811, YT), 'khoi_luong_g', 989, 'We (kg) 0 989-4 0.115 (47)', 'normalized', 'yamamoto1981', 'Ảnh trang: "Wt (kg) 0.989 ± 0.115 (47)"; đổi kg → g.'),
       (O(2811, YT), 'oxy_mg_kg_h', sig(1.73 * 60 * O2_MG_PER_ML, '1.73'), 'Vo, (mi/min/kg) 1.73 + 0.33 (21)', 'normalized', 'yamamoto1981',
        'Ảnh trang: "V̇O₂ (ml/min/kg) 1.73 ± 0.33 (21)"; 1,73 × 60 × 1,429 = 148,3 mg/kg/h, làm tròn 3 chữ số có nghĩa.')]
# Itazawa & Takeda 1982 · OCR trang 1 (khối lượng) và trang 3 (Bảng 1, cột Before)
EV += [(O(3712), 'khoi_luong_g', 598, 'Cyprinus carpio of 500-653 (598.45) g in weight', 'normalized', 'itazawa1982', 'Ảnh trang: "500–653 (598±45) g"; OCR đọc ± thành dấu chấm.'),
       (O(3712), 'oxy_mg_kg_h', sig(58.4 * O2_MG_PER_ML, '58.4'), 'Voy (mi/h/kg) 9 58.4 + 5.6', 'normalized', 'itazawa1982',
        'Ảnh trang: "V̇O₂ (ml/h/kg) 9 58.4 ± 5.6" (trước gây mê); 58,4 × 1,429 = 83,5 mg/kg/h.')]
# Takeda & Itazawa 1979 · OCR trang 1: cỡ cá và nhiệt độ chung của cả loạt thí nghiệm
for n in (3686, 3688, 3691, 3692, 3693, 3695, 3700, 3701):
    EV += [(O(n), 'khoi_luong_g', 561, '(561 438 g)', 'normalized', 'takeda1979', 'Ảnh trang: "(561±38 g)"; OCR đọc ± thành 4.'),
           (O(n), 'nhiet_do_c', 24.5, '(24.5+0.5°C)', 'normalized', 'takeda1979', 'Ảnh trang: "(24.5±0.5°C)".')]
# Oya & Kimata 1938 · chú thích Hình 2 (lớp chữ; "•Ž" là lỗi mã của "°C" trong PDF)
for n, span, w in [(3601, '20.9g;', 20.9), (3598, '17.4g;', 17.4), (3577, '10.4g.', 10.4)]:
    EV += [(O(n), 'khoi_luong_g', w, span, 'verbatim', 'oya1938', ''),
           (O(n), 'nhiet_do_c', 19, 'earpio during 24 hours at 19•Ž.', 'normalized', 'oya1938', 'Ảnh trang: "Cyprinus carpio during 24 hours at 19°C."')]

# Ghi chú của người đối chiếu (không phải claim): điều thấy được nhưng không thành claim
NOTES = {
    G(100): ['Bài gốc để trống ("—") khoảng cách nước–máu ở giai đoạn III; FishBase ghi 1,74, đúng bằng trung bình 5 giá trị bài có đo (1,9; 1,8; 1,7; 1,6; 1,7).'],
    G(104): ['Bài gốc để trống ("—") khoảng cách nước–máu ở giai đoạn VII; FishBase ghi 1,74, đúng bằng trung bình 5 giá trị bài có đo.'],
    O(2811, YT): ['FishBase ghi độ mặn 35‰; bài chỉ nêu độ clo giả định 18,75‰ (tương đương khoảng 33,9‰), nên ô độ mặn không đối chiếu được.',
                  'FishBase ghi 47 con: đó là số cá của cả nghiên cứu; số đo ô xi có 21 con.'],
    O(3712): ['Bài ghi nhiệt độ "giữ trong khoảng 25–26 °C"; FishBase ghi 25,5 (trung điểm), nên ô nhiệt độ không đối chiếu được.',
              'FishBase ghi 76,3 mg/kg/h = 58,4 × 1,306, tức tính 1 ml ô xi theo thể tích khí ở khoảng 25 °C; theo quy ước điều kiện chuẩn (1,429 mg/ml) thì là 83,5. Bài không nói rõ thể tích đo ở điều kiện nào.'],
    O(3682): ['Bài gốc (Itazawa và Takeda 1979) trình bày lượng ô xi bằng đồ thị; số FishBase là số đọc từ hình, không có dòng nguyên văn để so.'],
    O(1828, 'Plecoglossus altivelis'): ['Bài gốc trình bày bằng đồ thị. Bốn con cá ayu trong Hình 3 nặng 12,8; 11,2; 8,0; 8,6 g; không con nào 10,7 g như FishBase ghi.'],
}
for n in (3686, 3688, 3691, 3692, 3693, 3695, 3700, 3701):
    NOTES[O(n)] = ['Lượng ô xi trong bài là đồ thị theo thời gian; số FishBase là số đọc từ hình, nên chỉ đối chiếu được cỡ cá và nhiệt độ.']
for n in (3577, 3598, 3601):
    NOTES[O(n)] = ['Lượng ô xi trong bài là đường cong 24 giờ trên đồ thị; chỉ đối chiếu được khối lượng và nhiệt độ.']
PAPER_OF = {G(n): 'kobayashi1988' for n in range(98, 105)}
PAPER_OF.update({O(2811, YT): 'yamamoto1981', O(3712): 'itazawa1982', O(3682): 'itazawa1979', O(1828, 'Plecoglossus altivelis'): 'oya1938'})
PAPER_OF.update({O(n): 'takeda1979' for n in (3686, 3688, 3691, 3692, 3693, 3695, 3700, 3701)})
PAPER_OF.update({O(n): 'oya1938' for n in (3577, 3598, 3601)})


def extract(pdfdir, key):
    p = PAPERS[key]; f = Path(pdfdir) / p['pdf']
    sha = hashlib.sha256(f.read_bytes()).hexdigest()
    if sha != p['sha']:
        sys.exit(f'{f}: SHA-256 {sha} khác bản đã đối chiếu {p["sha"]}')
    if p['how'] == 'text':
        return subprocess.run(['pdftotext', '-raw', str(f), '-'], capture_output=True, text=True).stdout.splitlines(), 'pdftotext -raw (poppler), lớp chữ của PDF'
    out = []
    for pg in p['pages']:
        png = Path(pdfdir) / f'_{key}-{pg}'
        subprocess.run(['pdftoppm', '-r', '200', '-png', '-singlefile', '-f', str(pg), '-l', str(pg), str(f), str(png)], check=True, capture_output=True)
        out += subprocess.run(['tesseract', str(png) + '.png', '-', '--psm', '6', '-l', 'eng'], capture_output=True, text=True).stdout.splitlines()
    ver = subprocess.run(['tesseract', '--version'], capture_output=True, text=True).stdout.split('\n')[0]
    return out, f'OCR {ver} (eng, --psm 6) trên ảnh 200 dpi của trang {", ".join(map(str, p["pages"]))}'


def chup(pdfdir):
    for key, p in PAPERS.items():
        spans = [e[3] for e in EV if e[5] == key]
        if not spans:
            continue
        lines, how = extract(pdfdir, key)
        keep = [ln for ln in lines if any(s in ln for s in spans)]
        miss = [s for s in spans if not any(s in ln for ln in keep)]
        if miss:
            sys.exit(f'{key}: không thấy {miss}')
        keep = list(dict.fromkeys(keep))
        head = (f'{p["cite"]}\nDOI: https://doi.org/{p["doi"]}\nURL: {p["url"]}\nNgày lấy: {FETCHED}\nSHA-256 tệp PDF: {p["sha"]}\n'
                f'Cách trích: {how}\nChỉ giữ các dòng chứa số liệu được dẫn; toàn văn ở URL trên (truy cập mở trên J-STAGE).\n\n')
        (DOM / 'snapshots' / f'goc_{key}.html').write_text(
            f'<!doctype html><meta charset="utf-8"><pre>{html.escape(head + chr(10).join(keep) + chr(10), quote=False)}</pre>\n', encoding='utf-8')
        print(f'snapshots/goc_{key}.html · {len(keep)} dòng')


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--chup':
        chup(sys.argv[2])
    snap = {k: html.unescape((DOM / 'snapshots' / f'goc_{k}.html').read_text(encoding='utf-8')) for k in {e[5] for e in EV}}
    claims = []
    for ent, field, val, span, ex, key, _ in EV:
        if span not in snap[key]:
            sys.exit(f'{key}: evidence_span {span!r} không có trong bản trích')
        p = PAPERS[key]
        claims.append({'entity': ent, 'field': field, 'value': val, 'evidence_span': span, 'extraction': ex, 'tier': 'A',
                       'capture': {'url': p['url'], 'fetched_at': FETCHED, 'snapshot': f'goc_{key}.html', 'source': f'doi:{p["doi"]}'}})
    cf = DOM / 'claims.jsonl'
    old = [ln for ln in cf.read_text(encoding='utf-8').splitlines() if ln and not json.loads(ln)['capture']['source'].startswith('doi:')]
    ents = {json.loads(ln)['entity'] for ln in old}
    lost = {c['entity'] for c in claims} - ents
    if lost:
        sys.exit(f'thực thể không có trong claim FishBase: {sorted(lost)}')
    cf.write_text('\n'.join(old + [json.dumps(c, ensure_ascii=False) for c in claims]) + '\n', encoding='utf-8')
    soat = {}
    for ent, field, val, span, ex, key, s in EV:
        if s:
            soat.setdefault(ent, {})[field] = s
    meta = {'bai': {k: {'cite': v['cite'], 'doi': v['doi'], 'url': v['url']} for k, v in PAPERS.items()},
            'ban_ghi': {e: {'bai': PAPER_OF[e], 'ghi_chu': NOTES.get(e, []), 'soat': soat.get(e, {})} for e in sorted(PAPER_OF)}}
    (DOM / 'doi_chieu.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(claims)} claim tier A từ {len({e[5] for e in EV})} bài · {len(PAPER_OF)} bản ghi có ghi chú đối chiếu')


if __name__ == '__main__':
    main()
