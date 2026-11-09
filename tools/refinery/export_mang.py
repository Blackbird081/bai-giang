#!/usr/bin/env python3
"""export_mang.py · registry (Refinery) → dữ liệu tra cứu của bài Cá thở bằng mang.

  python3 tools/refinery/export_mang.py [đường dẫn skill refinery]

Một chiều: dựng hai registry bằng refinery.run_pipeline (đủ mọi cổng, auditor, idempotent) rồi xuất
tools/robotics/mang/fish/loai.json. Chỉ lấy ô ở trạng thái sourced/corroborated; ô disputed (vd nhiều
tên Việt, hay số FishBase lệch bài gốc) xuất trọn danh sách giá trị kèm nguồn. Bản ghi đã đối chiếu bài gốc
(doi_chieu_goc.py) mang thêm kc (ô ✓✓), tc (ô tranh chấp), goc (bài), gc (ghi chú), sx (ghi chú soát OCR). Các số suy ra (mm²/g, lít nước) KHÔNG nằm trong registry:
bài tính lúc chạy và ghi rõ là phép tính.
"""
import json, os, sys
from pathlib import Path

SKILL = Path(sys.argv[1] if len(sys.argv) > 1 else os.environ.get('REFINERY_SKILL', '/root/.claude/skills/synced/f8785b3b-0b53-4c36-9280-97e257107f9e_f0663711-9037-4820-93b1-5da55fe8b96a/refinery'))
sys.path.insert(0, str(SKILL))
import refinery  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'robotics' / 'mang' / 'fish' / 'loai.json'


def val(cell):
    return cell['value'] if cell['state'] in ('sourced', 'corroborated') else None


FK = {'khoi_luong_g': 'w', 'dien_tich_mang_cm2': 'a', 'mang_mm2_g': 'ga', 'hang_rao_um': 'bw', 'nhiet_do_c': 't', 'do_man': 's', 'oxy_mg_kg_h': 'm'}


def cross(f, dc, rec):
    """Trạng thái đối chiếu của một bản ghi: kc = ô corroborated, tc = ô disputed (giữ mọi giá trị), cùng ghi chú."""
    out = {}
    kc = [k for fld, k in FK.items() if f.get(fld, {}).get('state') == 'corroborated']
    if kc:
        out['kc'] = kc
    tc = {k: [[c['value'], 'FishBase' if c['source'].startswith('fishbase') else 'goc'] for c in f[fld]['claims']]
          for fld, k in FK.items() if f.get(fld, {}).get('state') == 'disputed'}
    if tc:
        out['tc'] = tc
    if rec:
        out['goc'] = rec['bai']
        if rec['ghi_chu']:
            out['gc'] = rec['ghi_chu']
        if rec['soat']:
            out['sx'] = {FK[k]: v for k, v in rec['soat'].items()}
    return out


def vals(cell):
    if cell['state'] == 'disputed':
        return sorted({str(c['value']) for c in cell['claims']})
    v = val(cell)
    return [v] if v is not None else []


def main():
    _, _, rl, al, bl = refinery.run_pipeline(HERE / 'domains' / 'ca_loai')
    _, _, rh, ah, bh = refinery.run_pipeline(HERE / 'domains' / 'ca_ho_hap')
    dc = json.loads((HERE / 'domains' / 'ca_ho_hap' / 'doi_chieu.json').read_text(encoding='utf-8'))
    sp = {}
    for name, rec in rl.items():
        f = rec['fields']
        sp[name] = {'sci': name, 'au': val(f['tac_gia']), 'en': val(f['ten_anh']), 'vi': vals(f['ten_viet']), 'fam': val(f['ho']), 'ord': val(f['bo']),
                    'env': val(f['moi_truong']), 'water': val(f['vung_nuoc']), 'air': val(f['tho_khi_troi']), 'maxL': val(f['dai_toi_da']),
                    'swim': val(f['kieu_boi']), 'g': [], 'o': []}
    for ent, rec in rh.items():
        f = rec['fields']; s = val(f['loai'])
        if s not in sp:
            continue
        rid = int(ent.split('#')[1].split(' ')[0])
        if val(f['loai_ban_ghi']) == 'đo diện tích mang':
            r = {'id': rid, 'w': val(f['khoi_luong_g']), 'a': val(f['dien_tich_mang_cm2']), 'ga': val(f['mang_mm2_g']), 'bw': val(f['hang_rao_um']), 'ref': val(f['nguon'])}
            sp[s]['g'].append({**{k: v for k, v in r.items() if v is not None or k != 'ga'}, **cross(f, dc, dc['ban_ghi'].get(ent))})
        else:
            sp[s]['o'].append({'id': rid, 'w': val(f['khoi_luong_g']), 't': val(f['nhiet_do_c']), 's': val(f['do_man']), 'lv': val(f['muc_trao_doi']), 'm': val(f['oxy_mg_kg_h']), 'ref': val(f['nguon']),
                               **cross(f, dc, dc['ban_ghi'].get(ent))})
    for s in sp.values():
        s['g'].sort(key=lambda r: r['id']); s['o'].sort(key=lambda r: r['id'])
        for k in [k for k, v in s.items() if v in (None, [], '')]:
            if k not in ('g', 'o', 'vi'):
                del s[k]
    out = {'nguon': 'FishBase v25.04 (Froese và Pauly, www.fishbase.org; CC BY-NC 3.0), bảng species, families, comnames, swimming, gillarea, oxygen, refrens; qua Refinery: mỗi giá trị dẫn về một dòng của bản chụp.',
           'digest': {'ca_loai': refinery.digest(bl), 'ca_ho_hap': refinery.digest(bh)},
           'bai_goc': dc['bai'],
           'mau_so': {'loai_fishbase': al['universe_estimate'], 'ban_ghi_goc': ah['universe_estimate'], 'ban_ghi_lay': ah['n_entities']},
           'loai': sorted(sp.values(), key=lambda s: s['sci'])}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    ng = sum(len(s['g']) for s in sp.values()); no = sum(len(s['o']) for s in sp.values())
    nk = sum(len(r.get('kc', [])) for s in sp.values() for r in s['g'] + s['o']); nt = sum(len(r.get('tc', {})) for s in sp.values() for r in s['g'] + s['o'])
    print(f'{OUT} · {len(sp)} loài · {ng} đo mang · {no} đo ô xi · {nk} ô ✓✓ · {nt} ô tranh chấp · {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
