// Hình khối có bo cạnh dùng chung: ánh sáng bắt vào cạnh bo mới cho cảm giác vật đúc, vật ép (cách teardown dựng V8).
// Mọi hàm trả về BufferGeometry, trục z là trục chính (khung robot z lên). Đơn vị mét.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);

/** Hộp bo cạnh bán kính r, tâm tại gốc */
export const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-5));

/** Tiện xoay quanh trục z: prof là [[r, z], …] đi từ dưới lên (pháp tuyến hướng ra ngoài) */
export function lathe(prof, seg = 48) {
  const g = new THREE.LatheGeometry(prof.map(([r, z]) => V2(Math.max(r, 0), z)), seg);
  g.rotateX(Math.PI / 2); // trục y của Lathe → trục z
  return g;
}
/** Cung bo: thêm điểm trên cung tâm (cx, cz) bán kính f từ góc a0 tới a1 */
const arc = (out, cx, cz, f, a0, a1, n = 5) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + f * Math.cos(a), cz + f * Math.sin(a)]); } };
/** Trụ đặc từ z0 tới z1, bán kính r, bo hai mép bán kính f0 (dưới), f1 (trên) */
export function capsuleProfile(r, z0, z1, f0, f1 = f0) {
  const p = [[0, z0]];
  if (f0 > 0) arc(p, r - f0, z0 + f0, f0, -Math.PI / 2, 0); else p.push([r, z0]);
  if (f1 > 0) arc(p, r - f1, z1 - f1, f1, 0, Math.PI / 2); else p.push([r, z1]);
  p.push([0, z1]);
  return p;
}
export const roundCyl = (r, z0, z1, f0, f1 = f0, seg = 48) => lathe(capsuleProfile(r, z0, z1, f0, f1), seg);
/** Ống có hai đầu loe (cổ nối vào vỏ khớp): bán kính r, loe tới rf trên đoạn l ở mỗi đầu */
export function flaredTube(r, rf, z0, z1, l, seg = 48) {
  const p = [[0, z0], [rf, z0]];
  for (let i = 1; i <= 6; i++) { const t = i / 6, s = t * t * (3 - 2 * t); p.push([rf + (r - rf) * s, z0 + l * t]); }
  for (let i = 0; i <= 6; i++) { const t = i / 6, s = t * t * (3 - 2 * t); p.push([r + (rf - r) * s, z1 - l + l * t]); }
  p.push([0, z1]);
  return lathe(p, seg);
}
/** Đặt hình theo trục x thay vì z */
export const alongX = (g) => g.rotateY(Math.PI / 2);
export const alongY = (g) => g.rotateX(-Math.PI / 2);

/** Hình chữ nhật bo góc (Shape), tâm tại gốc */
export function rrect(w, h, r, x = 0, y = 0) {
  const s = new THREE.Shape(), a = w / 2, b = h / 2; r = Math.min(r, a, b);
  s.moveTo(x - a + r, y - b); s.lineTo(x + a - r, y - b); s.quadraticCurveTo(x + a, y - b, x + a, y - b + r);
  s.lineTo(x + a, y + b - r); s.quadraticCurveTo(x + a, y + b, x + a - r, y + b); s.lineTo(x - a + r, y + b);
  s.quadraticCurveTo(x - a, y + b, x - a, y + b - r); s.lineTo(x - a, y - b + r); s.quadraticCurveTo(x - a, y - b, x - a + r, y - b);
  return s;
}
export const hole = (x, y, r, n = 20) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };
export const slotHole = (x, y, w, h) => { const p = new THREE.Path(), r = Math.min(w, h) / 2; p.absarc(x - w / 2 + r, y, r, Math.PI / 2, (3 * Math.PI) / 2, false); p.absarc(x + w / 2 - r, y, r, -Math.PI / 2, Math.PI / 2, false); return p; };
/** Tấm đùn có vát mép: shape trong mặt xy, dày t, tâm theo z */
export function slab(shape, t, bevel = Math.min(0.0012, t * 0.3), curve = 10) {
  const b = Math.min(bevel, t * 0.45);
  const g = new THREE.ExtrudeGeometry(shape, {depth: Math.max(1e-5, t - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: curve});
  g.translate(0, 0, -(t - 2 * b) / 2);
  return g;
}
/** Thanh dẹt bo hai đầu tròn (kiểu thanh nối cơ khí) dài L theo trục y, rộng w, dày t, có lỗ ở hai đầu */
export function linkBar(L, w, t, holeR = 0) {
  const s = new THREE.Shape(), r = w / 2;
  s.absarc(0, 0, r, Math.PI, 2 * Math.PI, false); s.lineTo(r, L); s.absarc(0, L, r, 0, Math.PI, false); s.lineTo(-r, 0);
  if (holeR) { s.holes.push(hole(0, 0, holeR), hole(0, L, holeR)); }
  return slab(s, t, Math.min(0.001, t * 0.3), 16);
}
/** Vòng răng/khía quanh trục z (gai lốp, cánh tản nhiệt): n khối nhỏ */
export function ringOf(n, make) { const list = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const g = make(); g.rotateZ(a); list.push(g); } return merge(list); }
