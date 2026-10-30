#!/usr/bin/env python3
"""Quy trình xử lý trước: ATP synthase ty thể lợn -> atp.bin (gzip).

Nguồn:
  PDB 6J5I  monomer ATP synthase lợn, cryo-EM 3,34 Å (Gu và cs., Science 2019): toạ độ từng nguyên tử.
  PDB 6J5K  tetramer cùng loài, cùng bài báo: chỉ dùng để lấy cách hai monomer ghép thành một dimer
            và độ cong của màng ở gờ mào (vị trí và trục của hai monomer 0 và 1).
Bỏ IF1 (protein ức chế có trong mẫu) và nước, để mô phỏng lúc enzyme đang tổng hợp ATP.

Hệ trục đầu ra (đơn vị Å), gọi là khung gờ mào:
  gốc O : trục của gờ mào, nơi hai trục rôto của dimer gặp nhau gần nhất
  +Y   : phân giác hai trục rôto, hướng từ màng ra chất nền (phía đầu F1)
  +Z   : dọc gờ mào (vuông góc mặt phẳng dimer)
  +X   : Y × Z, vuông góc mặt tấm mào
Bố cục file (trước khi nén): giống ribosome.bin
  uint32 độ dài JSON | JSON meta | đệm tới bội 4 |
  nguyên tử monomer chính: n x (int16 x,y,z | uint8 nhóm | uint8 chuỗi | uint8 nguyên tố | uint8 cờ)
  hạt gốc (mỗi amino acid hoặc nucleotide một hạt), cả hai monomer: m x (... | uint8 nhóm | uint8 chuỗi | uint8 loại | uint8 cờ)
  hạt thô (gộp theo ô 10 Å), cả hai monomer: k x (... | uint8 nhóm | uint8 0 | uint8 0 | uint8 cờ)
  cờ: bit0 = thuộc phần quay (rôto), bit1 = thuộc monomer thứ hai
"""
import gemmi, json, struct, gzip, sys, hashlib
import numpy as np

D = sys.argv[1] if len(sys.argv) > 1 else 'data'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'atp.bin'

CATS = [
    ('alpha', 'Tiểu đơn vị α'), ('beta', 'Tiểu đơn vị β'), ('gamma', 'Tiểu đơn vị γ'), ('de', 'Tiểu đơn vị δ và ε'),
    ('cring', 'Vòng c (8 tiểu đơn vị c)'), ('oscp', 'Tiểu đơn vị OSCP'), ('stalk', 'Cuống ngoại vi (b, d, F6)'),
    ('a', 'Tiểu đơn vị a'), ('memb', 'Tiểu đơn vị màng phụ (e, f, g, A6L, DAPIT, 6.8PL, k)'), ('nuc', 'ATP và ADP gắn trong F1'),
]
CI = {c[0]: i for i, c in enumerate(CATS)}
ROTOR = {'gamma', 'de', 'cring'}
ELEM = {'C': 0, 'N': 1, 'O': 2, 'P': 3, 'S': 4, 'Mg': 5, 'Zn': 6}
CHAIN_CAT = {**{x: 'alpha' for x in 'ABC'}, **{x: 'beta' for x in 'DEF'}, 'G': 'gamma', 'H': 'de', 'I': 'de',
             **{x: 'cring' for x in 'KLMNOPQR'}, 'S': 'oscp', 'b': 'stalk', 'c': 'stalk', 'd': 'stalk', 'a': 'a',
             **{x: 'memb' for x in 'efgi8ku'}}
STATOR_FIT = list('ABCDEF') + ['S', 'b', 'd', 'a']
KD = {'ILE': 4.5, 'VAL': 4.2, 'LEU': 3.8, 'PHE': 2.8, 'CYS': 2.5, 'MET': 1.9, 'ALA': 1.8, 'GLY': -0.4, 'THR': -0.7, 'SER': -0.8, 'TRP': -0.9, 'TYR': -1.3, 'PRO': -1.6, 'HIS': -3.2, 'GLU': -3.5, 'GLN': -3.5, 'ASP': -3.5, 'ASN': -3.5, 'LYS': -3.9, 'ARG': -4.5}
FO = list('KLMNOPQR') + ['a', 'e', 'f', 'g', '8', 'i', 'k', 'u']


def load(path):
    doc = gemmi.cif.read(path); bl = doc.sole_block()
    desc = {r[0]: gemmi.cif.as_string(r[1]) for r in bl.find('_entity.', ['id', 'pdbx_description'])}
    ae = {r[0]: r[1] for r in bl.find('_struct_asym.', ['id', 'entity_id'])}
    st = gemmi.make_structure_from_block(bl); st.remove_hydrogens(); st.remove_waters()
    return st[0], desc, ae, open(path, 'rb').read()


def pos(a): return np.array([a.pos.x, a.pos.y, a.pos.z])


def axis_of(chs):
    """Trục rôto: pháp tuyến mặt phẳng qua tâm 8 tiểu đơn vị c, hướng về phía F1. Trả về (tâm vòng c, trục, tâm F1)."""
    cs = np.array([np.mean([pos(a) for r in chs[x] for a in r], axis=0) for x in 'KLMNOPQR']); c0 = cs.mean(0)
    n = np.linalg.svd(cs - c0)[2][2]
    f1 = np.mean([pos(a) for x in 'ABCDEF' for r in chs[x] for a in r], axis=0)
    if np.dot(f1 - c0, n) < 0: n = -n
    return c0, n / np.linalg.norm(n), f1


def membrane_mid(chs, c0, n):
    """Mặt giữa màng: tâm lớp dày 30 Å có độ kỵ nước trung bình cao nhất của phần Fo (thang Kyte–Doolittle, theo CA)."""
    ca = []
    for x in FO:
        for r in chs[x]:
            a = r.find_atom('CA', '*')
            if a and r.name in KD: ca.append((np.dot(pos(a) - c0, n), KD[r.name]))
    ca = np.array(ca); best = None
    for h in np.arange(-30, 30, 0.5):
        w = ca[np.abs(ca[:, 0] - h) <= 15]; sc = w[:, 1].mean()
        if best is None or sc > best[0]: best = (sc, h)
    return best


def kabsch(P, Q):
    """R, t sao cho R @ P + t ≈ Q (theo hàng)."""
    pc, qc = P.mean(0), Q.mean(0); H = (P - pc).T @ (Q - qc); U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T)); M = np.diag([1, 1, d]); R = Vt.T @ M @ U.T
    return R, qc - R @ pc


# ---------- 1. Khung dimer từ tetramer 6J5K ----------
mK, descK, aeK, rawK = load(f'{D}/6J5K.cif.gz')
mono = {0: {}, 1: {}}
for ch in mK:
    if not len(ch) or ch[0].het_flag == 'H': continue
    k = 0 if len(ch.name) == 1 else 'ABC'.index(ch.name[0]) + 1
    if k in mono: mono[k][ch.name if len(ch.name) == 1 else ch.name[1:]] = ch
G = []
for k in (0, 1):
    c0, n, f1 = axis_of(mono[k]); kd, h = membrane_mid(mono[k], c0, n)
    G.append({'c0': c0, 'n': n, 'mid': c0 + n * h, 'kd': kd})
Y = G[0]['n'] + G[1]['n']; Y /= np.linalg.norm(Y)
Z = np.cross(G[0]['n'], G[1]['n']); Z /= np.linalg.norm(Z); X = np.cross(Y, Z)
p1, d1, p2, d2 = G[0]['mid'], -G[0]['n'], G[1]['mid'], -G[1]['n']
A = np.array([[d1 @ d1, -d1 @ d2], [d1 @ d2, -d2 @ d2]]); t, s = np.linalg.solve(A, np.array([(p2 - p1) @ d1, (p2 - p1) @ d2]))
O = (p1 + t * d1 + p2 + s * d2) / 2
FR = np.stack([X, Y, Z])  # hàng = trục khung
toF = lambda P: (np.asarray(P) - O) @ FR.T
mids = [toF(g['mid']) for g in G]
Rc = float(np.mean([np.hypot(m[0], m[1]) for m in mids]))
dimer_angle = float(np.degrees(np.arccos(np.clip(G[0]['n'] @ G[1]['n'], -1, 1))))

# ---------- 2. Monomer chi tiết 6J5I, ghép vào hai vị trí ----------
mI, descI, aeI, rawI = load(f'{D}/6J5I.cif.gz')
chI = {}
lig = []  # (chuỗi, tên, residue)
for ch in mI:
    if not len(ch): continue
    for r in ch:
        if r.het_flag == 'H':
            if r.name in ('ATP', 'ADP', 'MG'): lig.append((ch.name, r.name, r))
        else: chI.setdefault(ch.name, []).append(r)


def ca_map(get):
    out = {}
    for x in STATOR_FIT:
        for r in get(x):
            a = r.find_atom('CA', '*')
            if a: out[(x, r.seqid.num)] = pos(a)
    return out


src = ca_map(lambda x: chI[x])
PERM = [dict(), {'A': 'B', 'B': 'C', 'C': 'A', 'D': 'E', 'E': 'F', 'F': 'D'}, {'A': 'C', 'B': 'A', 'C': 'B', 'D': 'F', 'E': 'D', 'F': 'E'}]
fits = []
for k in (0, 1):
    best = None
    for pm in PERM:  # nhãn α/β có thể lệch vòng giữa hai mục PDB: thử ba cách xoay nhãn, chọn cách khớp nhất
        dst = ca_map(lambda x: [r for r in mono[k][pm.get(x, x)] if r.het_flag != 'H'])
        keys = sorted(set(src) & set(dst)); P = np.array([src[q] for q in keys]); Q = np.array([dst[q] for q in keys])
        R, tt = kabsch(P, Q); rmsd = float(np.sqrt(((P @ R.T + tt - Q) ** 2).sum(1).mean()))
        if best is None or rmsd < best[2]: best = (R, tt, rmsd, len(keys), pm)
    fits.append(best)
place = lambda k, P: toF(np.asarray(P) @ fits[k][0].T + fits[k][1])

chains, atoms, beads = [], [], []  # atoms (monomer chính): xyz, nhóm, chuỗi, nguyên tố, cờ
names_vi = {'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'de': 'δ/ε', 'cring': 'c', 'oscp': 'OSCP', 'stalk': 'cuống', 'a': 'a', 'memb': 'màng phụ'}
for x, res in chI.items():
    if x == 'J': continue  # IF1
    c = CHAIN_CAT[x]; ci = len(chains)
    d = descI.get(aeI.get(res[0].subchain, ''), '?')
    chains.append({'id': x, 'ten': d, 'nhom': c, 'so_goc': len(res), 'so_nguyen_tu': sum(len(r) for r in res)})
    flag = 1 if c in ROTOR else 0
    for k in (0, 1):
        for r in res:
            P = np.array([pos(a) for a in r]); L = place(k, P)
            if k == 0:
                for a, p in zip(r, L): atoms.append((*p, CI[c], ci, ELEM.get(a.element.name, 0), flag))
            beads.append((*L.mean(0), CI[c], ci, 0, flag | (2 * k)))
for x, nm, r in lig:
    ci = len(chains); chains.append({'id': x + ':' + nm, 'ten': nm, 'nhom': 'nuc', 'so_goc': 1, 'so_nguyen_tu': len(r)})
    for k in (0, 1):
        P = np.array([pos(a) for a in r]); L = place(k, P)
        if k == 0:
            for a, p in zip(r, L): atoms.append((*p, CI['nuc'], ci, ELEM.get(a.element.name, 0), 0))
        beads.append((*L.mean(0), CI['nuc'], ci, 1, 2 * k))

A = np.array([a[:3] for a in atoms]); B = np.array([b[:3] for b in beads])
# Hạt thô: gộp hạt gốc theo ô 10 Å, giữ nhóm chiếm đa số
coarse = []
for k in (0, 1):
    sel = [i for i, b in enumerate(beads) if (b[6] >> 1) == k]; P = B[sel]
    key = np.floor(P / 10.0).astype(int); groups = {}
    for i, kk in zip(sel, map(tuple, key)): groups.setdefault(kk, []).append(i)
    for g in groups.values():
        cats = [beads[i][3] for i in g]; c = max(set(cats), key=cats.count)
        coarse.append((*B[g].mean(0), c, 0, 0, (1 if CATS[c][0] in ROTOR else 0) | (2 * k)))
C = np.array([c[:3] for c in coarse])

# ---------- 3. Các điểm dùng cho hoạt cảnh (monomer chính, khung gờ mào) ----------
h_atoms = lambda x: np.array([pos(a) for r in chI[x] for a in r])
hc0, hn, hf1 = axis_of({x: chI[x] for x in chI})
ring_c = place(0, hc0); f1_c = place(0, hf1); ax = place(0, hc0 + hn) - ring_c; ax /= np.linalg.norm(ax)
ring_c2 = place(1, hc0); ax2 = place(1, hc0 + hn) - ring_c2; ax2 /= np.linalg.norm(ax2)
ref = np.cross(ax, [0, 0, 1.0]); ref /= np.linalg.norm(ref); ref2 = np.cross(ax, ref)
ang = lambda P: float(np.degrees(np.arctan2((P - ring_c) @ ref2, (P - ring_c) @ ref)))
beta = []
for x in 'DEF':
    cen = place(0, h_atoms(x)).mean(0)
    site = [place(0, np.array([pos(a) for a in r])).mean(0) for (cx, nm, r) in lig if cx == x and nm in ('ADP', 'ATP')]
    beta.append({'chuoi': x, 'goc': round(ang(cen), 1), 'tam': cen, 'vi_tri_xuc_tac': site[0] if site else None, 'trong_mau': ', '.join(nm for (cx, nm, r) in lig if cx == x) or 'trống'})
def rot(P, deg):
    th = np.radians(deg); v = P - ring_c
    return ring_c + v * np.cos(th) + np.cross(ax, v) * np.sin(th) + ax * (ax @ v) * (1 - np.cos(th))
for b in beta:  # vị trí xúc tác của β trống: xoay vị trí của một β có ADP quanh trục rôto
    if b['vi_tri_xuc_tac'] is None:
        donor = [o for o in beta if o['vi_tri_xuc_tac'] is not None][0]
        cand = [rot(donor['vi_tri_xuc_tac'], s) for s in (120, -120)]
        b['vi_tri_xuc_tac'] = min(cand, key=lambda P: np.linalg.norm(P - b['tam'])); b['uoc_luong'] = True
glu = []
for x in 'KLMNOPQR':
    r = [r for r in chI[x] if r.name == 'GLU' and r.seqid.num == 58][0]
    glu.append(place(0, np.array([pos(a) for a in r if a.name in ('OE1', 'OE2')])).mean(0))
r159 = [r for r in chI['a'] if r.seqid.num == 159][0]; arg = place(0, np.array([pos(a) for a in r159])).mean(0)
mid_h = mids[0]; ext = float(np.abs(np.concatenate([A, B, C])).max()); scale = 32767.0 / (ext * 1.001)
monoZ = B[[i for i, b in enumerate(beads) if (b[6] >> 1) == 0]][:, 2]
dimZ = B[:, 2]

fx = lambda v: [round(float(q), 2) for q in v]
meta = {
    'nguon': {'pdb': '6J5I', 'pdb_dimer': '6J5K', 'tieu_de': 'Cryo-EM structure of the mammalian DP-state ATP synthase',
              'bai_bao': 'Gu J, Zhang L, Zong S, Guo R, Liu T, Yi J, Wang P, Zhuo W, Yang M. Science 2019', 'doi': '10.1126/science.aaw4852',
              'url': 'https://www.rcsb.org/structure/6J5I', 'url_dimer': 'https://www.rcsb.org/structure/6J5K',
              'loai': 'Sus scrofa (lợn)', 'phuong_phap': 'cryo-EM', 'do_phan_giai_A': 3.34,
              'sha256_6J5I': hashlib.sha256(rawI).hexdigest(), 'sha256_6J5K': hashlib.sha256(rawK).hexdigest(),
              'bo': 'IF1 (protein ức chế có trong mẫu) và nước'},
    'nhom': [{'id': k, 'ten': t, 'quay': k in ROTOR} for k, t in CATS],
    'nguyen_to': list(ELEM.keys()), 'chuoi': chains,
    'so_nguyen_tu': len(atoms), 'so_hat_goc': len(beads), 'so_hat_tho': len(coarse), 'scale': scale,
    'khop_rmsd_A': [round(f[2], 2) for f in fits], 'khop_so_CA': [f[3] for f in fits],
    'go_mao': {'Rc': round(Rc, 1), 'goc_dimer': round(dimer_angle, 1), 'mat_giua_mang': [fx(m) for m in mids],
               'cach_dat': 'mặt giữa màng của mỗi monomer: lớp 30 Å kỵ nước nhất của Fo (Kyte–Doolittle); tâm gờ: điểm gần nhất giữa hai trục rôto',
               'kd_tb': round(float(G[0]['kd']), 2), 'khoang_cach_hai_truc_A': round(float(np.linalg.norm((p1 + t * d1) - (p2 + s * d2))), 1)},
    'roto2': {'tam_vong_c': fx(ring_c2), 'truc': fx(ax2)},
    'roto': {'tam_vong_c': fx(ring_c), 'truc': fx(ax), 'tam_F1': fx(f1_c), 'chieu_tong_hop': 'dương quanh trục (từ màng về F1): ngược chiều kim đồng hồ khi nhìn từ phía F1'},
    'beta': [{'chuoi': b['chuoi'], 'goc': b['goc'], 'tam': fx(b['tam']), 'xuc_tac': fx(b['vi_tri_xuc_tac']), 'trong_mau': b['trong_mau'], 'uoc_luong': b.get('uoc_luong', False)} for b in beta],
    'glu58': [fx(g) for g in glu], 'arg159': fx(arg),
    'monomer_z': [round(float(monoZ.min()), 1), round(float(monoZ.max()), 1)], 'dimer_z': [round(float(dimZ.min()), 1), round(float(dimZ.max()), 1)],
    'bao': {k: {'min': fx(B[[i for i, b in enumerate(beads) if (b[6] >> 1) == 0 and CATS[b[3]][0] == k]].min(0)),
                'max': fx(B[[i for i, b in enumerate(beads) if (b[6] >> 1) == 0 and CATS[b[3]][0] == k]].max(0)),
                'tam': fx(B[[i for i, b in enumerate(beads) if (b[6] >> 1) == 0 and CATS[b[3]][0] == k]].mean(0))} for k, _ in CATS},
}
js = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
buf = bytearray(struct.pack('<I', len(js))) + js
while len(buf) % 4: buf += b' '
dt = [('x', '<i2'), ('y', '<i2'), ('z', '<i2'), ('c', 'u1'), ('h', 'u1'), ('e', 'u1'), ('f', 'u1')]
def pack(rows, P):
    q = np.round(P * scale).astype('<i2'); rec = np.zeros(len(rows), dtype=dt)
    rec['x'], rec['y'], rec['z'] = q[:, 0], q[:, 1], q[:, 2]
    rec['c'] = [r[3] for r in rows]; rec['h'] = [r[4] for r in rows]; rec['e'] = [r[5] for r in rows]; rec['f'] = [r[6] for r in rows]
    return rec
ra, rb, rc = pack(atoms, A), pack(beads, B), pack(coarse, C)
buf += ra.tobytes() + rb.tobytes() + rc.tobytes()
gz = gzip.compress(bytes(buf), 9); open(OUT, 'wb').write(gz)

# Cổng kiểm
chk = gzip.decompress(gz); n = struct.unpack('<I', chk[:4])[0]; mm = json.loads(chk[4:4 + n]); off = 4 + n + (-(4 + n) % 4)
back = np.frombuffer(chk[off:off + len(atoms) * 10], dtype=dt)
err = np.abs(np.stack([back['x'], back['y'], back['z']], 1) / mm['scale'] - A).max()
assert err < 0.01, f'sai số lượng tử quá lớn: {err}'
assert max(f[2] for f in fits) < 6.0, f'ghép 6J5I vào 6J5K lệch quá: {[f[2] for f in fits]}'
assert len(glu) == 8 and len(beta) == 3
print('lệch tâm vòng c so với tetramer', round(float(np.linalg.norm(ring_c - toF(G[0]['c0']))),1), 'Å; lệch trục', round(float(np.degrees(np.arccos(np.clip(ax @ (G[0]['n'] @ FR.T), -1, 1)))),1), 'độ')
print(f'nguyên tử {len(atoms)}, hạt gốc {len(beads)}, hạt thô {len(coarse)}, chuỗi {len(chains)}, scale {scale:.2f}/Å, sai số {err:.4f} Å')
print(f'ghép 6J5I: rmsd {[round(f[2],2) for f in fits]} Å trên {[f[3] for f in fits]} CA; góc dimer {dimer_angle:.1f}°, Rc {Rc:.1f} Å, mặt giữa màng {[fx(m) for m in mids]}')
print('rôto: tâm vòng c', fx(ring_c), 'trục', fx(ax), 'F1', fx(f1_c))
for b in beta: print('β', b['chuoi'], b['goc'], b['trong_mau'], b.get('uoc_luong', False))
print('monomer z', meta['monomer_z'], 'dimer z', meta['dimer_z'])
print(f'raw {len(buf)/1e6:.2f} MB -> gzip {len(gz)/1e6:.2f} MB -> {OUT}')
