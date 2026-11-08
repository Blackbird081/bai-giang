#!/usr/bin/env python3
"""export_mang.py · registry (Refinery) → dữ liệu tra cứu của bài Cá thở bằng mang.

  python3 tools/refinery/export_mang.py [đường dẫn skill refinery]

Một chiều: dựng hai registry bằng refinery.run_pipeline (đủ mọi cổng, auditor, idempotent) rồi xuất
tools/robotics/mang/fish/loai.json. Chỉ lấy ô ở trạng thái sourced/corroborated; ô disputed (vd nhiều
tên Việt) xuất trọn danh sách giá trị kèm cờ. Các số suy ra (mm²/g, lít nước) KHÔNG nằm trong registry:
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


def vals(cell):
    if cell['state'] == 'disputed':
        return sorted({str(c['value']) for c in cell['claims']})
    v = val(cell)
    return [v] if v is not None else []


def main():
    _, _, rl, al, bl = refinery.run_pipeline(HERE / 'domains' / 'ca_loai')
    _, _, rh, ah, bh = refinery.run_pipeline(HERE / 'domains' / 'ca_ho_hap')
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
            sp[s]['g'].append({'id': rid, 'w': val(f['khoi_luong_g']), 'a': val(f['dien_tich_mang_cm2']), 'bw': val(f['hang_rao_um']), 'ref': val(f['nguon'])})
        else:
            sp[s]['o'].append({'id': rid, 'w': val(f['khoi_luong_g']), 't': val(f['nhiet_do_c']), 's': val(f['do_man']), 'lv': val(f['muc_trao_doi']), 'm': val(f['oxy_mg_kg_h']), 'ref': val(f['nguon'])})
    for s in sp.values():
        s['g'].sort(key=lambda r: r['id']); s['o'].sort(key=lambda r: r['id'])
        for k in [k for k, v in s.items() if v in (None, [], '')]:
            if k not in ('g', 'o', 'vi'):
                del s[k]
    out = {'nguon': 'FishBase v25.04 (Froese và Pauly, www.fishbase.org; CC BY-NC 3.0), bảng species, families, comnames, swimming, gillarea, oxygen, refrens; qua Refinery: mỗi giá trị dẫn về một dòng của bản chụp.',
           'digest': {'ca_loai': refinery.digest(bl), 'ca_ho_hap': refinery.digest(bh)},
           'mau_so': {'loai_fishbase': al['universe_estimate'], 'ban_ghi_goc': ah['universe_estimate'], 'ban_ghi_lay': ah['n_entities']},
           'loai': sorted(sp.values(), key=lambda s: s['sci'])}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    ng = sum(len(s['g']) for s in sp.values()); no = sum(len(s['o']) for s in sp.values())
    print(f'{OUT} · {len(sp)} loài · {ng} đo mang · {no} đo ô xi · {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
