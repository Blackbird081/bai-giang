// Hình khối UR5e dựng bằng mã trong từng khung DH: vỏ khớp trụ (cỡ 3 Ø ~128 mm, cỡ 1 Ø ~90 mm), ống nhôm cánh tay
// trên và cẳng tay đặt lệch bên đúng các khoảng d của bảng DH, bích dụng cụ, kẹp hai ngón. update(F, s) đặt khung.
import * as THREE from 'three';
import {MAT} from '../kit/stage.js';
import {DH} from './kin.js';

export const TOOL = 0.14; // TCP cách bích 140 mm (đầu ngón kẹp)
const S1 = 0.138, S2 = 0.007; // lệch bên của cánh tay trên và cẳng tay (tổng với cổ tay ra d4 = 0,1333)

export function buildArm() {
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; // khung robot z lên → three y lên
  const L = [];
  for (let i = 0; i <= 6; i++) { const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g); L.push(g); }
  const cover = MAT.glossy('#e4e6e8'), alu = MAT.alu(), dark = MAT.dark(), steel = MAT.steel();
  const rings = [];
  const mesh = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // trụ dọc theo trục z của khung, từ z0 đến z1
  const zcyl = (parent, r, z0, z1, mat, seg = 48) => { const m = mesh(new THREE.CylinderGeometry(r, r, z1 - z0, seg), mat, parent); m.rotation.x = Math.PI / 2; m.position.z = (z0 + z1) / 2; return m; };
  const xcyl = (parent, r, x0, x1, z, mat) => { const m = mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 40), mat, parent); m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, 0, z); return m; };
  const ycyl = (parent, r, y0, y1, mat) => { const m = mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 48), mat, parent); m.position.y = (y0 + y1) / 2; return m; };
  // vỏ khớp: thân bọc nhựa, hai nắp xám, vòng nhấn đổi màu khi khớp đang quay
  const housing = (parent, r, z0, z1, j) => {
    zcyl(parent, r, z0 + 0.006, z1 - 0.006, cover);
    zcyl(parent, r * 0.93, z0, z0 + 0.006, steel); zcyl(parent, r * 0.93, z1 - 0.006, z1, steel);
    const rm = new THREE.MeshStandardMaterial({color: '#cfc6b8', roughness: 0.5});
    const ring = zcyl(parent, r * 1.004, z1 - 0.022, z1 - 0.012, rm); rings[j] = rm; ring.castShadow = false;
  };
  // 0 đế: bích Ø151, thân trụ, vỏ khớp 1
  zcyl(L[0], 0.0755, 0, 0.012, dark); housing(L[0], 0.064, 0.012, 0.105, 0);
  // 1 vai: cột nối từ đế lên (trục y1 = z0), vỏ khớp 2 nằm ngang
  ycyl(L[1], 0.064, -DH[0].d + 0.105, -0.05, cover); housing(L[1], 0.064, -0.066, S1 + 0.066, 1);
  // 2 cánh tay trên: ống từ khuỷu (gốc khung 2) tới vai (x = −a2), lệch bên S1; vỏ khớp 3
  xcyl(L[2], 0.044, 0.03, -DH[1].a - 0.03, S1, alu); housing(L[2], 0.056, S2 - 0.05, S1 + 0.056, 2);
  // 3 cẳng tay: ống từ cổ tay 1 tới khuỷu (x = −a3), lệch S2; vỏ khớp 4
  xcyl(L[3], 0.037, 0.03, -DH[2].a - 0.03, S2, alu); housing(L[3], 0.046, S2 - 0.046, DH[3].d + 0.046, 3);
  // 4 cổ tay 2, 5 cổ tay 3
  housing(L[4], 0.046, -0.046, DH[4].d - 0.046, 4);
  housing(L[5], 0.046, -0.046, DH[5].d - 0.012, 5);
  // 6 bích ISO 9409-1-50-4-M6 và kẹp
  zcyl(L[6], 0.032, -0.012, 0, steel);
  const grip = new THREE.Group(); L[6].add(grip);
  const body = mesh(new THREE.BoxGeometry(0.05, 0.13, 0.06), dark, grip); body.position.z = 0.03;
  const fingers = [-1, 1].map((s) => { const f = mesh(new THREE.BoxGeometry(0.012, 0.024, 0.08), MAT.plastic('#3a3d41'), grip); f.position.set(0, s * 0.03, 0.1); f.userData.s = s; return f; });
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
