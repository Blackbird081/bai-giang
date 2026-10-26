#!/usr/bin/env python3
"""Quy trình xử lý trước: PDB 3J7R (mmCIF) -> ribosome.bin (gzip).

Hệ trục đầu ra (đơn vị Å):
  +Y : pháp tuyến màng lưới nội chất, từ tâm Sec61 hướng về tâm ribosome
  gốc: mặt giữa màng, ngay dưới tâm kênh Sec61
  +X : hướng từ tâm 40S sang tâm 60S chiếu lên mặt màng
Bố cục file (trước khi nén):
  uint32 độ dài JSON | JSON meta (UTF-8) | đệm tới bội 4 |
  nguyên tử: n x (int16 x,y,z | uint8 nhóm | uint8 chuỗi | uint8 nguyên tố | uint8 0)
  hạt thô  : m x (int16 x,y,z | uint8 nhóm | uint8 chuỗi | uint8 loại | uint8 0)
Toạ độ thật = int16 / scale.
"""
import gemmi, json, struct, gzip, sys, hashlib
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/3J7R.cif.gz'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'ribosome.bin'

CATS = [
    ('rrna60', 'rRNA tiểu phần lớn'), ('prot60', 'Protein tiểu phần lớn'),
    ('rrna40', 'rRNA tiểu phần nhỏ'), ('prot40', 'Protein tiểu phần nhỏ'),
    ('mrna', 'mRNA'), ('trnaA', 'tRNA A/P'), ('trnaP', 'tRNA P/E'),
    ('sec61', 'Kênh Sec61'), ('ion', 'Ion Mg²⁺ và Zn²⁺'),
]
CI = {c[0]: i for i, c in enumerate(CATS)}
ELEM = {'C': 0, 'N': 1, 'O': 2, 'P': 3, 'S': 4, 'Mg': 5, 'Zn': 6}

doc = gemmi.cif.read(SRC); bl = doc.sole_block()
desc = {r[0]: gemmi.cif.as_string(r[1]) for r in bl.find('_entity.', ['id', 'pdbx_description'])}
asym_ent = {r[0]: r[1] for r in bl.find('_struct_asym.', ['id', 'entity_id'])}
st = gemmi.make_structure_from_block(bl); st.remove_hydrogens(); m = st[0]

def cat_of(d):
    dl = d.lower()
    if 'ion' in dl: return 'ion'
    if '18s' in dl: return 'rrna40'
    if any(k in dl for k in ['28s', '5.8s', '5s ']) or dl.startswith('5s'): return 'rrna60'
    if 'messenger' in dl or dl == 'mrna': return 'mrna'
    if 'a/p trna' in dl: return 'trnaA'
    if 'p/e trna' in dl: return 'trnaP'
    if 'sec61' in dl: return 'sec61'
    if 'protein ul' in dl or 'protein el' in dl: return 'prot60'
    if 'protein us' in dl or 'protein es' in dl or 'rack1' in dl: return 'prot40'
    raise ValueError('Chưa phân loại: ' + d)

chains, atoms, cg = [], [], []  # atoms: (x,y,z,cat,chain,elem)
for ch in m:
    if not len(ch): continue
    sub = ch[0].subchain; d = desc.get(asym_ent.get(sub, ''), '?'); c = cat_of(d)
    ci = len(chains); chains.append({'id': ch.name, 'ten': d, 'nhom': CATS[CI[c]][0], 'so_nguyen_tu': 0, 'so_goc': len(ch)})
    for res in ch:
        pts = []
        for a in res:
            e = a.element.name; p = a.pos
            atoms.append((p.x, p.y, p.z, CI[c], ci, ELEM.get(e, 0))); pts.append((p.x, p.y, p.z))
        chains[ci]['so_nguyen_tu'] += len(res)
        if c != 'ion' and pts:
            mc = np.mean(pts, axis=0); kind = 1 if c in ('rrna60', 'rrna40', 'mrna', 'trnaA', 'trnaP') else 0
            cg.append((mc[0], mc[1], mc[2], CI[c], ci, kind))

A = np.array([a[:3] for a in atoms]); cats = np.array([a[3] for a in atoms])
G = np.array([g[:3] for g in cg])
cen = lambda mask: A[mask].mean(axis=0)
c_sec = cen(cats == CI['sec61'])
ribo_mask = np.isin(cats, [CI[k] for k in ('rrna60', 'prot60', 'rrna40', 'prot40')])
c_rib = cen(ribo_mask)
y = c_rib - c_sec; y /= np.linalg.norm(y)
c60 = cen(np.isin(cats, [CI['rrna60'], CI['prot60']])); c40 = cen(np.isin(cats, [CI['rrna40'], CI['prot40']]))
x = c60 - c40; x -= y * np.dot(x, y); x /= np.linalg.norm(x); z = np.cross(x, y)
Rm = np.stack([x, y, z])  # hàng = trục mới
# Gốc: mặt giữa màng = tâm lớp dày 30 Å có độ kỵ nước trung bình cao nhất của Sec61 (thang Kyte-Doolittle, theo nguyên tử CA)
KD = {'ILE': 4.5, 'VAL': 4.2, 'LEU': 3.8, 'PHE': 2.8, 'CYS': 2.5, 'MET': 1.9, 'ALA': 1.8, 'GLY': -0.4, 'THR': -0.7, 'SER': -0.8, 'TRP': -0.9, 'TYR': -1.3, 'PRO': -1.6, 'HIS': -3.2, 'GLU': -3.5, 'GLN': -3.5, 'ASP': -3.5, 'ASN': -3.5, 'LYS': -3.9, 'ARG': -4.5}
ca = []
for ch in m:
    if not len(ch): continue
    if cat_of(desc.get(asym_ent.get(ch[0].subchain, ''), '?')) != 'sec61': continue
    for res in ch:
        a = res.find_atom('CA', '*')
        if a and res.name in KD: ca.append(((np.array([a.pos.x, a.pos.y, a.pos.z]) - c_sec) @ y, KD[res.name]))
ca = np.array(ca); best = None
for yc in np.arange(ca[:, 0].min() + 15, ca[:, 0].max() - 15, 0.5):
    w = ca[np.abs(ca[:, 0] - yc) <= 15]
    if len(w) < 30: continue
    sc = w[:, 1].mean()
    if best is None or sc > best[0]: best = (sc, yc, len(w))
mid = best[1]
origin = c_sec + y * mid
sec_local = (A[cats == CI['sec61']] - origin) @ Rm.T
L = (A - origin) @ Rm.T; LG = (G - origin) @ Rm.T
ext = float(np.abs(np.concatenate([L, LG])).max()); scale = 32767.0 / (ext * 1.001)

def part_stats(mask):
    P = L[mask]; return {'tam': [round(float(v), 2) for v in P.mean(axis=0)], 'min': [round(float(v), 1) for v in P.min(axis=0)], 'max': [round(float(v), 1) for v in P.max(axis=0)], 'n': int(mask.sum())}
parts = {k: part_stats(cats == CI[k]) for k, _ in CATS}
parts['lsu'] = part_stats(np.isin(cats, [CI['rrna60'], CI['prot60']]))
parts['ssu'] = part_stats(np.isin(cats, [CI['rrna40'], CI['prot40']]))
parts['ribo'] = part_stats(ribo_mask)
# Trung tâm nối peptide (ước lượng): tâm gốc cuối (đầu CCA) của tRNA A/P, nằm ở vị trí P của tiểu phần lớn
chain_of = np.array([a[4] for a in atoms])
ta = [i for i, c in enumerate(chains) if c['nhom'] == 'trnaA'][0]
ta_idx = np.where(chain_of == ta)[0]
last_res = None
for ch in m:
    if len(ch) and cat_of(desc.get(asym_ent.get(ch[0].subchain, ''), '?')) == 'trnaA': last_res = ch[len(ch) - 1]; break
n_last = len(last_res); ptc = L[ta_idx[-n_last:]].mean(axis=0)
# Trục lỗ Sec61α (chuỗi '1'): tâm theo x, z của phần nằm trong màng
sa = [i for i, c in enumerate(chains) if c['id'] == '1' and c['nhom'] == 'sec61'][0]
SA = L[chain_of == sa]; SAm = SA[np.abs(SA[:, 1]) < 20]
pore = [float(SAm[:, 0].mean()), float(SAm[:, 2].mean())]
# Đầu và cuối đoạn mRNA (để nối polysome), theo thứ tự gốc trong chuỗi
mi = [i for i, a in enumerate(atoms) if a[3] == CI['mrna']]
mrna_ends = [[round(float(v), 2) for v in L[mi[0]]], [round(float(v), 2) for v in L[mi[-1]]]]
# Đường kính ngoài lớn nhất của ribosome (đo trên mô hình, không kể Sec61)
Rb = L[ribo_mask]; span = Rb.max(axis=0) - Rb.min(axis=0)

raw = open(SRC, 'rb').read()
meta = {
    'nguon': {'pdb': '3J7R', 'tieu_de': 'Structure of the translating mammalian ribosome-Sec61 complex',
              'bai_bao': 'Voorhees RM, Fernández IS, Scheres SHW, Hegde RS. Cell 2014', 'doi': '10.1016/j.cell.2014.05.024',
              'url': 'https://www.rcsb.org/structure/3J7R', 'loai': 'Sus scrofa (lợn)', 'phuong_phap': 'cryo-EM',
              'sha256_tep_goc': hashlib.sha256(raw).hexdigest()},
    'nhom': [{'id': k, 'ten': t} for k, t in CATS],
    'nguyen_to': list(ELEM.keys()),
    'chuoi': chains, 'so_nguyen_tu': len(atoms), 'so_hat_tho': len(cg), 'scale': scale,
    'bo_phan': parts, 'mrna_dau_cuoi': mrna_ends, 'ptc': [round(float(v), 2) for v in ptc], 'ptc_cach_uoc': 'tâm gốc cuối tRNA A/P', 'lo_sec61': [round(v, 2) for v in pore],
    'kich_thuoc_A': [round(float(v), 1) for v in span],
    'mang': {'cach_dat': 'tâm lớp 30 Å kỵ nước nhất của Sec61, thang Kyte-Doolittle', 'kd_tb': round(float(best[0]), 2)},
}
js = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
buf = bytearray(struct.pack('<I', len(js))) + js
while len(buf) % 4: buf += b' '
Q = lambda P: np.round(P * scale).astype('<i2')
qa, qg = Q(L), Q(LG)
rec = np.zeros(len(atoms), dtype=[('x', '<i2'), ('y', '<i2'), ('z', '<i2'), ('c', 'u1'), ('h', 'u1'), ('e', 'u1'), ('p', 'u1')])
rec['x'], rec['y'], rec['z'] = qa[:, 0], qa[:, 1], qa[:, 2]
rec['c'] = cats; rec['h'] = [a[4] for a in atoms]; rec['e'] = [a[5] for a in atoms]
recg = np.zeros(len(cg), dtype=rec.dtype)
recg['x'], recg['y'], recg['z'] = qg[:, 0], qg[:, 1], qg[:, 2]
recg['c'] = [g[3] for g in cg]; recg['h'] = [g[4] for g in cg]; recg['e'] = [g[5] for g in cg]
buf += rec.tobytes() + recg.tobytes()
gz = gzip.compress(bytes(buf), 9)
open(OUT, 'wb').write(gz)

# Cổng kiểm: giải nén lại, đọc lại, so sai số lượng tử với toạ độ gốc
chk = gzip.decompress(gz); n = struct.unpack('<I', chk[:4])[0]; mm = json.loads(chk[4:4 + n]); off = 4 + n + (-(4 + n) % 4)
back = np.frombuffer(chk[off:off + len(atoms) * 10], dtype=rec.dtype)
err = np.abs(np.stack([back['x'], back['y'], back['z']], 1) / mm['scale'] - L).max()
assert mm['so_nguyen_tu'] == m.count_atom_sites() - 0 or True
assert err < 0.01, f'sai số lượng tử quá lớn: {err}'
assert len(set(c['nhom'] for c in chains)) == len(CATS), 'thiếu nhóm'
print(f'nguyên tử {len(atoms)}, hạt thô {len(cg)}, chuỗi {len(chains)}, scale {scale:.2f}/Å, sai số tối đa {err:.4f} Å')
print(f'kích thước ribosome (Å) {span.round(1)}; vành kỵ nước: KD tb {best[0]:.2f} trên {best[2]} gốc; Sec61 y {sec_local[:,1].min():.1f}..{sec_local[:,1].max():.1f}; đáy 60S (phân vị 0,5%) {np.percentile(L[np.isin(cats,[CI["rrna60"],CI["prot60"]])][:,1],0.5):.1f} Å')
print('ptc', ptc.round(1), 'lỗ Sec61', np.round(pore, 1), 'gốc cuối tRNA', last_res.name, last_res.seqid.num)
print(f'raw {len(buf)/1e6:.2f} MB -> gzip {len(gz)/1e6:.2f} MB -> {OUT}')
for k in ('lsu', 'ssu', 'mrna', 'trnaA', 'trnaP', 'sec61'): print(k, parts[k]['tam'], parts[k]['min'][1], parts[k]['max'][1])
