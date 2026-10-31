// Hình khối UR5e dựng bằng mã trong từng khung DH: vỏ khớp trụ (cỡ 3 Ø ~128 mm, cỡ 1 Ø ~90 mm), ống nhôm cánh tay
// trên và cẳng tay đặt lệch bên đúng các khoảng d của bảng DH, bích dụng cụ, kẹp hai ngón. update(F, s) đặt khung.
import * as THREE from 'three';
import {MAT} from '../kit/stage.js';
import {rbox, lathe, roundCyl, flaredTube, alongX, alongY} from '../kit/shapes.js';
import {DH} from './kin.js';

export const TOOL = 0.14; // TCP cách bích 140 mm (đầu ngón kẹp)
const S1 = 0.138, S2 = 0.007; // lệch bên của cánh tay trên và cẳng tay (tổng với cổ tay ra d4 = 0,1333)

export function buildArm() {
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; // khung robot z lên → three y lên
  const L = [];
  for (let i = 0; i <= 6; i++) { const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g); L.push(g); }
  const cover = MAT.shell('#eceef0'), cap = MAT.satin('#5b636c'), alu = MAT.anod('#c3c8cd'), dark = MAT.satin('#2c2f33'), steel = MAT.steel();
  const rings = [];
  const mesh = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // ống nối theo trục x (cánh tay), hai đầu loe vào vỏ khớp
  const xtube = (parent, r, x0, x1, z, mat) => { const m = mesh(alongX(flaredTube(r, r * 1.32, Math.min(x0, x1), Math.max(x0, x1), 0.045)), mat, parent); m.position.z = z; return m; };
  // vỏ khớp: thân trụ bo mép phủ bóng, hai nắp vòm xám, vòng nhấn đổi màu khi khớp đang quay
  const housing = (parent, r, z0, z1, j) => {
    const c = 0.011, f = r * 0.16;
    mesh(roundCyl(r, z0 + c * 0.7, z1 - c * 0.7, f, f, 64), cover, parent);
    mesh(lathe([[0, z0], [r * 0.7, z0], [r * 0.86, z0 + 0.002], [r * 0.93, z0 + 0.006], [r * 0.95, z0 + c]], 64), cap, parent);
    mesh(lathe([[r * 0.95, z1 - c], [r * 0.93, z1 - 0.006], [r * 0.86, z1 - 0.002], [r * 0.7, z1], [0, z1]], 64), cap, parent);
    const rm = new THREE.MeshStandardMaterial({color: '#cfc6b8', roughness: 0.45});
    const a = z1 - c - 0.004, b = a + 0.005;
    const ring = mesh(lathe([[r * 0.98, a], [r * 1.008, a + 0.001], [r * 1.008, b - 0.001], [r * 0.98, b]], 64), rm, parent); rings[j] = rm; ring.castShadow = false;
  };
  // 0 đế: bích Ø151 có 4 bu lông, thân trụ, vỏ khớp 1
  mesh(lathe([[0, 0], [0.0755, 0], [0.0755, 0.007], [0.072, 0.0105], [0.064, 0.012], [0, 0.012]], 64), dark, L[0]);
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2, b = mesh(roundCyl(0.0055, 0.0105, 0.0145, 0.0015, 0.0015, 16), steel, L[0]); b.position.set(0.066 * Math.cos(a), 0.066 * Math.sin(a), 0); }
  housing(L[0], 0.064, 0.012, 0.105, 0);
  // 1 vai: cổ nối từ đế lên (trục y1 = z0), vỏ khớp 2 nằm ngang
  mesh(alongY(lathe([[0, -DH[0].d + 0.1], [0.06, -DH[0].d + 0.1], [0.06, -0.075], [0.054, -0.06], [0, -0.06]], 64)), cover, L[1]);
  housing(L[1], 0.064, -0.066, S1 + 0.066, 1);
  // 2 cánh tay trên: ống từ khuỷu (gốc khung 2) tới vai (x = −a2), lệch bên S1; vỏ khớp 3
  xtube(L[2], 0.043, 0.02, -DH[1].a - 0.02, S1, alu); housing(L[2], 0.056, S2 - 0.05, S1 + 0.056, 2);
  // 3 cẳng tay: ống từ cổ tay 1 tới khuỷu (x = −a3), lệch S2; vỏ khớp 4
  xtube(L[3], 0.036, 0.02, -DH[2].a - 0.02, S2, alu); housing(L[3], 0.046, S2 - 0.046, DH[3].d + 0.046, 3);
  // 4 cổ tay 2, 5 cổ tay 3
  housing(L[4], 0.046, -0.046, DH[4].d - 0.046, 4);
  housing(L[5], 0.046, -0.046, DH[5].d - 0.012, 5);
  // 6 bích ISO 9409-1-50-4-M6 và kẹp hai ngón
  mesh(lathe([[0, -0.012], [0.032, -0.012], [0.032, -0.003], [0.03, 0], [0, 0]], 48), steel, L[6]);
  const grip = new THREE.Group(); L[6].add(grip);
  mesh(roundCyl(0.036, 0, 0.012, 0.002, 0.003, 48), dark, grip);
  const body = mesh(rbox(0.05, 0.13, 0.05, 0.008), dark, grip); body.position.z = 0.037;
  const rail = mesh(rbox(0.016, 0.12, 0.006, 0.002), steel, grip); rail.position.z = 0.064;
  const fingers = [-1, 1].map((s) => {
    const f = new THREE.Group(); grip.add(f); f.userData.s = s;
    mesh(rbox(0.014, 0.022, 0.074, 0.004), MAT.anod('#7c8288'), f).position.z = 0.103;
    const pad = mesh(rbox(0.012, 0.004, 0.034, 0.0015), MAT.rubber(), f); pad.position.set(0, -s * 0.012, 0.12);
    return f;
  });
  const tcp = new THREE.Object3D(); tcp.position.z = TOOL; L[6].add(tcp);
  // trục khung DH (x cam, y xanh lá, z xanh dương), bật bằng nút KHUNG DH
  const axes = [];
  const axMat = [new THREE.MeshBasicMaterial({color: '#e3562a'}), new THREE.MeshBasicMaterial({color: '#2fa36b'}), new THREE.MeshBasicMaterial({color: '#3c79a8'})];
  for (let i = 0; i <= 6; i++) {
    const g = new THREE.Group(); g.visible = false; L[i].add(g); axes.push(g);
    const len = 0.13;
    [[len / 2, 0, 0, 0, 0, -Math.PI / 2], [0, len / 2, 0, 0, 0, 0], [0, 0, len / 2, Math.PI / 2, 0, 0]].forEach(([x, y, z, rx, ry, rz], k) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, len, 8), axMat[k]); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.026, 12), axMat[k]); c.position.set(x * 2, y * 2, z * 2); c.rotation.set(rx, ry, rz); g.add(c);
    });
  }
  const M4 = new THREE.Matrix4();
  const update = (F, s) => {
    for (let i = 0; i <= 6; i++) { const T = F[i]; L[i].matrix.set(T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], T[9], T[10], T[11], 0, 0, 0, 1); }
    for (const f of fingers) f.position.y = f.userData.s * (0.056 - 0.019 * s.grip);
    for (let j = 0; j < 6; j++) rings[j].color.set(s.hot[j] > 0.04 ? '#e3562a' : '#cfc6b8').lerp(new THREE.Color('#cfc6b8'), Math.max(0, 1 - s.hot[j] * 4));
    for (const a of axes) a.visible = !!s.frames;
  };
  void M4;
  return {root, L, tcp, update, axes, fingers, rings};
}
