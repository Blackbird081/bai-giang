#!/usr/bin/env python3
"""fishbase_claims.py · Thu thập + trích có dẫn chứng cho hai domain Refinery của bài Cá thở bằng mang.

  python3 tools/refinery/fishbase_claims.py <thư mục chứa các tệp .parquet của FishBase v25.04>

Nguồn: bảng FishBase phiên bản 25.04 (rfishbase đăng ở huggingface.co/datasets/cboettig/fishbase, giấy phép
CC BY-NC 3.0 của FishBase). Script tất định, không gọi mô hình ngôn ngữ:

  1. Thu thập: chép các dòng liên quan của mỗi bảng thành một bản chụp văn bản (snapshots/*.html), mỗi dòng
     ghi "cột=giá trị" theo đúng thứ tự cột đã chọn, đầu tệp ghi URL, ngày lấy, SHA-256 của tệp parquet gốc.
  2. Trích: mỗi claim trỏ về một dòng của bản chụp; evidence_span là đoạn nguyên văn của dòng đó.

Hai domain (chạy bằng refinery.py của skill refinery):
  domains/ca_ho_hap · mỗi bản ghi đo là một thực thể: đo diện tích mang (bảng gillarea, đủ mọi dòng) và đo tiêu
                      hao ô xi lúc nghỉ (bảng oxygen, MetabolicLevel standard/routine, không gây stress).
  domains/ca_loai   · mỗi loài có bản ghi đo, cộng các loài của Fish Kit, là một thực thể: tên khoa học, tác giả,
                      tên Anh, tên Việt (bảng comnames, ngôn ngữ Vietnamese), họ, bộ, môi trường, vùng nước,
                      dài tối đa, kiểu bơi (bảng swimming).
"""
import hashlib, html, json, math, sys
from pathlib import Path

import pandas as pd

VERSION = 'v25.04'
BASE = f'https://huggingface.co/datasets/cboettig/fishbase/resolve/main/data/fb/{VERSION}/parquet/'
FETCHED = '2026-11-09T05:20:00Z'
HERE = Path(__file__).resolve().parent
KIT = ['Scomber japonicus', 'Thunnus albacares', 'Lateolabrax japonicus', 'Trachurus japonicus', 'Sebastes inermis',
       'Sebastiscus marmoratus', 'Trichiurus japonicus', 'Scomberomorus niphonius', 'Sphyraena pinguis', 'Seriola quinqueradiata',
       'Seriola lalandi', 'Acanthopagrus schlegelii', 'Pagrus major', 'Engraulis japonicus', 'Parapristipoma trilineatum',
       'Girella leonina', 'Girella punctata', 'Lutjanus stellatus', 'Opsanus tau', 'Katsuwonus pelamis']
REST_LEVEL = {'standard', 'routine'}
REST_STRESS = {'none specified'}


def fmt(v):
    """giá trị một ô như ghi trong bản chụp; rỗng (NaN/None) thì bỏ cột"""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else repr(round(v, 6))
    s = str(v).replace('|', '/').replace('\n', ' ').strip()
    return s or None


def line(prefix, row, cols):
    parts = [f'{c}={x}' for c in cols if (x := fmt(getattr(row, c))) is not None]
    return f'[{prefix}] ' + ' | '.join(parts)


def span_of(full, keys):
    """đoạn nguyên văn ngắn nhất của dòng chứa các khoá cần dẫn (giữ thứ tự cột)"""
    parts = full.split(' | ')
    idx = [i for i, p in enumerate(parts) if any(p.startswith(k + '=') or p.startswith('[') and k + '=' in p for k in keys)]
    if not idx:
        raise KeyError(keys)
    return ' | '.join(parts[min(idx):max(idx) + 1])


def write_snapshot(ddir, name, table, sha, note, lines):
    body = '\n'.join(lines)
    head = (f'FishBase {VERSION} · bảng {table}\nURL: {BASE}{table}.parquet\nNgày lấy: {FETCHED}\nSHA-256 tệp parquet: {sha}\n'
            f'Giấy phép: CC BY-NC 3.0 (FishBase, www.fishbase.org)\nTrích: {note}\n\n')
    (ddir / 'snapshots').mkdir(parents=True, exist_ok=True)
    (ddir / 'snapshots' / name).write_text(f'<!doctype html><meta charset="utf-8"><pre>{html.escape(head + body, quote=False)}</pre>\n', encoding='utf-8')


def claim(entity, field, value, span, extraction, snapshot, table, url=None):
    return {'entity': entity, 'field': field, 'value': value, 'evidence_span': span, 'extraction': extraction, 'tier': 'B',
            'capture': {'url': url or BASE + table + '.parquet', 'fetched_at': FETCHED, 'snapshot': snapshot, 'source': f'fishbase.org/{table}'}}


def num(v, nd=3):
    v = float(v)
    return int(v) if v.is_integer() else round(v, nd)


def main(pq):
    pq = Path(pq)
    sha = {t: hashlib.sha256((pq / f'{t}.parquet').read_bytes()).hexdigest() for t in ['gillarea', 'oxygen', 'species', 'families', 'comnames', 'swimming', 'refrens']}
    sp = pd.read_parquet(pq / 'species.parquet'); sp['name'] = sp.Genus + ' ' + sp.Species
    fam = pd.read_parquet(pq / 'families.parquet')
    g = pd.read_parquet(pq / 'gillarea.parquet'); g = g[g.Doubtful != 1].sort_values('autoctr')
    o = pd.read_parquet(pq / 'oxygen.parquet')
    o = o[o.MetabolicLevel.isin(REST_LEVEL) & o.AppliedStress.isin(REST_STRESS) & o.OxygenCons.notna()].sort_values('autoctr')
    codes = sorted(set(g.SpecCode) | set(o.SpecCode) | set(sp[sp.name.isin(KIT)].SpecCode))
    sp = sp[sp.SpecCode.isin(codes)].sort_values('SpecCode')
    name = dict(zip(sp.SpecCode, sp.name))
    g = g[g.SpecCode.isin(name)]; o = o[o.SpecCode.isin(name)]
    refs = pd.read_parquet(pq / 'refrens.parquet')
    used = set(g.DataRef.dropna().astype(int)) | set(o.DataRef.dropna().astype(int))
    refs = refs[refs.RefNo.isin(used)].sort_values('RefNo')
    cn = pd.read_parquet(pq / 'comnames.parquet'); cn = cn[(cn.Language == 'Vietnamese') & cn.SpecCode.isin(codes)].sort_values('autoctr')
    sw = pd.read_parquet(pq / 'swimming.parquet'); sw = sw[sw.SpecCode.isin(codes)].sort_values('SpecCode')
    fam = fam[fam.FamCode.isin(set(sp.FamCode))].sort_values('FamCode')

    # ---------- domain ca_ho_hap: bản ghi đo ----------
    d1 = HERE / 'domains' / 'ca_ho_hap'; claims = []
    GC = ['autoctr', 'SpecCode', 'BodyWeight', 'GillArea', 'BloodWater', 'DataRef', 'Comment']
    gl = {r.autoctr: line('gillarea', r, GC) for r in g.itertuples()}
    write_snapshot(d1, 'fb_gillarea.html', 'gillarea', sha['gillarea'], 'mọi dòng Doubtful ≠ 1; cột ' + ', '.join(GC), list(gl.values()))
    OC = ['autoctr', 'SpecCode', 'Weight', 'Number', 'Temp', 'Salinity', 'OxygenCons', 'MetabolicLevel', 'AppliedStress', 'SwimmingSpeed', 'DataRef']
    ol = {r.autoctr: line('oxygen', r, OC) for r in o.itertuples()}
    write_snapshot(d1, 'fb_oxygen.html', 'oxygen', sha['oxygen'], 'MetabolicLevel standard hoặc routine, AppliedStress "none specified"; cột ' + ', '.join(OC), list(ol.values()))
    RC = ['RefNo', 'Author', 'Year', 'Title', 'Source']
    rl = {r.RefNo: line('refrens', r, RC) for r in refs.itertuples()}
    write_snapshot(d1, 'fb_refrens.html', 'refrens', sha['refrens'], 'các tài liệu được hai bảng trên dẫn (DataRef); cột ' + ', '.join(RC), list(rl.values()))
    SC = ['SpecCode', 'Genus', 'Species']
    sl1 = {r.SpecCode: line('species', r, SC) for r in sp.itertuples()}
    write_snapshot(d1, 'fb_species_ten.html', 'species', sha['species'], 'tên của các loài có bản ghi; cột ' + ', '.join(SC), list(sl1.values()))

    def ref_claims(ent, ref):
        if ref is None or (isinstance(ref, float) and math.isnan(ref)) or int(ref) not in rl:
            return
        r = refs[refs.RefNo == int(ref)].iloc[0]; full = rl[int(ref)]
        cite = f"{fmt(r.Author) or '?'} ({fmt(r.Year) or 'không rõ năm'})"
        claims.append(claim(ent, 'nguon', cite, span_of(full, ['RefNo', 'Author', 'Year']), 'normalized', 'fb_refrens.html', 'refrens'))

    for r in g.itertuples():
        ent = f'Mang #{r.autoctr} · {name[r.SpecCode]}'; full = gl[r.autoctr]
        claims.append(claim(ent, 'loai_ban_ghi', 'đo diện tích mang', span_of(full, ['autoctr', 'GillArea']), 'normalized', 'fb_gillarea.html', 'gillarea'))
        claims.append(claim(ent, 'loai', name[r.SpecCode], sl1[r.SpecCode].replace('[species] ', ''), 'normalized', 'fb_species_ten.html', 'species'))
        claims.append(claim(ent, 'khoi_luong_g', num(r.BodyWeight), span_of(full, ['autoctr', 'BodyWeight']), 'verbatim', 'fb_gillarea.html', 'gillarea'))
        claims.append(claim(ent, 'dien_tich_mang_cm2', num(r.GillArea), span_of(full, ['autoctr', 'GillArea']), 'verbatim', 'fb_gillarea.html', 'gillarea'))
        if fmt(r.BloodWater):
            claims.append(claim(ent, 'hang_rao_um', num(r.BloodWater), span_of(full, ['autoctr', 'BloodWater']), 'verbatim', 'fb_gillarea.html', 'gillarea'))
        ref_claims(ent, r.DataRef)
    for r in o.itertuples():
        ent = f'Ô xi #{r.autoctr} · {name[r.SpecCode]}'; full = ol[r.autoctr]
        claims.append(claim(ent, 'loai_ban_ghi', 'đo tiêu hao ô xi lúc nghỉ', span_of(full, ['autoctr', 'MetabolicLevel']), 'normalized', 'fb_oxygen.html', 'oxygen'))
        claims.append(claim(ent, 'loai', name[r.SpecCode], sl1[r.SpecCode].replace('[species] ', ''), 'normalized', 'fb_species_ten.html', 'species'))
        if fmt(r.Weight):
            claims.append(claim(ent, 'khoi_luong_g', num(r.Weight), span_of(full, ['autoctr', 'Weight']), 'verbatim', 'fb_oxygen.html', 'oxygen'))
        if fmt(r.Temp):
            claims.append(claim(ent, 'nhiet_do_c', num(r.Temp), span_of(full, ['autoctr', 'Temp']), 'verbatim', 'fb_oxygen.html', 'oxygen'))
        if fmt(r.Salinity):
            claims.append(claim(ent, 'do_man', num(r.Salinity), span_of(full, ['autoctr', 'Salinity']), 'verbatim', 'fb_oxygen.html', 'oxygen'))
        claims.append(claim(ent, 'muc_trao_doi', r.MetabolicLevel, span_of(full, ['autoctr', 'MetabolicLevel']), 'verbatim', 'fb_oxygen.html', 'oxygen'))
        claims.append(claim(ent, 'oxy_mg_kg_h', num(r.OxygenCons), span_of(full, ['autoctr', 'OxygenCons']), 'verbatim', 'fb_oxygen.html', 'oxygen'))
        ref_claims(ent, r.DataRef)
    (d1 / 'claims.jsonl').write_text(''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in claims), encoding='utf-8')
    n_rec = len(pd.read_parquet(pq / 'gillarea.parquet')) + len(pd.read_parquet(pq / 'oxygen.parquet'))
    print('ca_ho_hap', len(claims), 'claim ·', len(g), 'mang ·', len(o), 'ô xi · tổng bản ghi gốc', n_rec)

    # ---------- domain ca_loai: loài ----------
    d2 = HERE / 'domains' / 'ca_loai'; claims = []
    SC2 = ['SpecCode', 'Genus', 'Species', 'Author', 'FBname', 'FamCode', 'Fresh', 'Brack', 'Saltwater', 'DemersPelag', 'AirBreathing', 'Length', 'LTypeMaxM']
    sl = {r.SpecCode: line('species', r, SC2) for r in sp.itertuples()}
    write_snapshot(d2, 'fb_species.html', 'species', sha['species'], 'loài có bản ghi đo mang hoặc ô xi lúc nghỉ, cộng các loài của Fish Kit; cột ' + ', '.join(SC2), list(sl.values()))
    FC = ['FamCode', 'Family', 'Order', 'Class']
    fl = {r.FamCode: line('families', r, FC) for r in fam.itertuples()}
    write_snapshot(d2, 'fb_families.html', 'families', sha['families'], 'họ của các loài trên; cột ' + ', '.join(FC), list(fl.values()))
    CC = ['autoctr', 'SpecCode', 'ComName', 'Language', 'C_Code']
    cl = {r.autoctr: line('comnames', r, CC) for r in cn.itertuples()}
    write_snapshot(d2, 'fb_comnames_vi.html', 'comnames', sha['comnames'], 'tên thường gọi tiếng Việt của các loài trên; cột ' + ', '.join(CC), list(cl.values()))
    WC = ['SpecCode', 'AdultType', 'AdultMode']
    wl = {r.SpecCode: line('swimming', r, WC) for r in sw.itertuples()}
    write_snapshot(d2, 'fb_swimming.html', 'swimming', sha['swimming'], 'kiểu bơi của cá trưởng thành; cột ' + ', '.join(WC), list(wl.values()))
    for r in sp.itertuples():
        ent = name[r.SpecCode]; full = sl[r.SpecCode]
        claims.append(claim(ent, 'ten_khoa_hoc', ent, span_of(full, ['SpecCode', 'Genus', 'Species']), 'normalized', 'fb_species.html', 'species'))
        if fmt(r.Author):
            claims.append(claim(ent, 'tac_gia', fmt(r.Author), span_of(full, ['Author']), 'verbatim', 'fb_species.html', 'species'))
        if fmt(r.FBname):
            claims.append(claim(ent, 'ten_anh', fmt(r.FBname), span_of(full, ['FBname']), 'verbatim', 'fb_species.html', 'species'))
        if fmt(r.DemersPelag):
            claims.append(claim(ent, 'moi_truong', fmt(r.DemersPelag), span_of(full, ['DemersPelag']), 'verbatim', 'fb_species.html', 'species'))
        w = [n for n, k in (('ngọt', r.Fresh), ('lợ', r.Brack), ('mặn', r.Saltwater)) if k == 1]
        if w:
            claims.append(claim(ent, 'vung_nuoc', ', '.join(w), span_of(full, ['Fresh', 'Brack', 'Saltwater']), 'normalized', 'fb_species.html', 'species'))
        if fmt(r.AirBreathing):
            claims.append(claim(ent, 'tho_khi_troi', fmt(r.AirBreathing), span_of(full, ['AirBreathing']), 'verbatim', 'fb_species.html', 'species'))
        if fmt(r.Length):
            claims.append(claim(ent, 'dai_toi_da', f"{num(r.Length, 1)} cm {fmt(r.LTypeMaxM) or ''}".strip(), span_of(full, ['Length', 'LTypeMaxM']), 'normalized', 'fb_species.html', 'species'))
        if r.FamCode in fl:
            f = fam[fam.FamCode == r.FamCode].iloc[0]; ff = fl[r.FamCode]
            claims.append(claim(ent, 'ho', fmt(f.Family), span_of(ff, ['FamCode', 'Family']), 'normalized', 'fb_families.html', 'families'))
            if fmt(f.Order):
                claims.append(claim(ent, 'bo', fmt(f.Order), span_of(ff, ['FamCode', 'Order']), 'normalized', 'fb_families.html', 'families'))
        if r.SpecCode in wl:
            x = sw[sw.SpecCode == r.SpecCode].iloc[0]
            if fmt(x.AdultMode):
                claims.append(claim(ent, 'kieu_boi', fmt(x.AdultMode), span_of(wl[r.SpecCode], ['SpecCode', 'AdultMode']), 'normalized', 'fb_swimming.html', 'swimming'))
    for r in cn.itertuples():
        claims.append(claim(name[r.SpecCode], 'ten_viet', fmt(r.ComName), span_of(cl[r.autoctr], ['autoctr', 'ComName', 'Language']), 'normalized', 'fb_comnames_vi.html', 'comnames'))
    (d2 / 'claims.jsonl').write_text(''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in claims), encoding='utf-8')
    print('ca_loai', len(claims), 'claim ·', len(sp), 'loài ·', len(cn), 'tên Việt ·', len(sw), 'kiểu bơi · tổng loài FishBase', len(pd.read_parquet(pq / 'species.parquet')))


if __name__ == '__main__':
    main(sys.argv[1])
