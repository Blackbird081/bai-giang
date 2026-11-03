// Hình khối robot cá mập mako: da thân dựng từ các vòng mặt cắt dọc thân, uốn theo sóng thân mỗi khung hình;
// vây, mắt, khe mang bám theo khung cục bộ của trạm gắn; bên trong là khung robot minh hoạ (thân trước cứng, 9 đốt, 8 servo).
// Trục: x dọc thân (mũi ở +x), y lên, z sang ngang. Đơn vị mét. Thân dài L = 1,97 m như con cá được gắn thẻ.
import * as THREE from 'three';
import {MAT} from '../kit/stage.js';
import * as SH from '../kit/shapes.js';
import {L, lat, latDs, JOINTS, LINK0, chordAng} from './kin.js';

export const Y0 = 0.62; // độ cao bơi
const HT = 0.205, WD = 0.17; // nửa chiều cao, nửa bề ngang lớn nhất: tỉ lệ thuôn L/D ≈ 4,8
// độ dày tương đối theo s: mũi nhọn hình nón, dày nhất ở s ≈ 0,36, thon về cuống đuôi hẹp
const tProf = (s) => {
  if (s < 0.36) return Math.max(0, 1 - Math.pow(1 - s / 0.36, 1.7));
  if (s < 0.9) return 0.13 + 0.87 * (0.5 + 0.5 * Math.cos((Math.PI * (s - 0.36)) / 0.54));
  return 0.13 - (0.03 * (s - 0.9)) / 0.1;
};
const keel = (s) => (s > 0.84 ? 0.034 * Math.sin(Math.PI * Math.min(1, (s - 0.84) / 0.16)) : 0); // gờ bên cuống đuôi của họ cá mập Lamnidae
export const prof = (s) => { const t = tProf(s); return {ht: HT * t * 1.04, hb: HT * t * 0.9, w: WD * t + keel(s)}; };

const NS = 150, NR = 64;
const ST = Array.from({length: NS}, (_, i) => 0.5 - 0.5 * Math.cos((Math.PI * i) / (NS - 1))); // dày ở mũi và đuôi
const SUP = 0.8; // siêu elip: mặt cắt đầy đặn hơn elip
const sgnPow = (x) => Math.sign(x) * Math.pow(Math.abs(x), SUP);
const RING = Array.from({length: NR}, (_, j) => { const a = (2 * Math.PI * j) / NR; return [sgnPow(Math.sin(a)), sgnPow(Math.cos(a)), Math.cos(a)]; });

export function buildShark() {
  const root = new THREE.Group();
  // ---------- da thân
  const pos = new Float32Array(NS * NR * 3), colr = new Float32Array(NS * NR * 3), idx = [];
  const blue = new THREE.Color('#3b6496'), navy = new THREE.Color('#1f3556'), belly = new THREE.Color('#f2f3f5'), c = new THREE.Color();
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
    const cv = RING[j][2];
    c.copy(blue).lerp(navy, sm(0.35, 1, cv)); c.lerp(belly, 1 - sm(-0.32, 0.02, cv));
    colr.set([c.r, c.g, c.b], (i * NR + j) * 3);
  }
  for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NR; j++) {
    const a = i * NR + j, b = i * NR + ((j + 1) % NR), d = (i + 1) * NR + j, e = (i + 1) * NR + ((j + 1) % NR);
    idx.push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(idx);
  const skinMat = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: 0.4, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.3, side: THREE.DoubleSide});
  const skin = new THREE.Mesh(geo, skinMat); skin.castShadow = true; skin.receiveShadow = true; skin.frustumCulled = false; root.add(skin);

  // ---------- phần bám theo thân: mỗi phần một nhóm đặt ở trạm s, lệch (dx dọc, v đứng, u ngang) trong khung cục bộ
  const att = [];
  const attach = (obj, s, dx = 0, v = 0, u = 0, skinPart = true) => { const g = new THREE.Group(); g.add(obj); root.add(g); att.push({g, s, dx, v, u, skinPart}); return g; };
  const finMat = MAT.satin('#2c4b75'); finMat.side = THREE.DoubleSide;
  const finWhite = MAT.satin('#e9ebee'); finWhite.side = THREE.DoubleSide;
  const fin = (shape, t, mat) => { const m = new THREE.Mesh(SH.slab(shape, t, t * 0.4, 18), mat); m.castShadow = true; return m; };
  const shp = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) pts[i].length === 4 ? s.quadraticCurveTo(...pts[i]) : s.lineTo(...pts[i]); s.closePath(); return s; };
  // vây lưng thứ nhất
  const fDorsal = fin(shp([[0.12, -0.03], [0.07, 0.17, -0.045, 0.235], [-0.04, 0.1, -0.13, -0.02], [-0.13, -0.03]]), 0.016, finMat);
  attach(fDorsal, 0.42, 0, prof(0.42).ht - 0.012);
  // vây đuôi lưỡi liềm (gần đối xứng trên dưới), mép sau lõm
  const fCaudal = fin(shp([[0.03, 0.035], [-0.03, 0.24, -0.19, 0.31], [-0.1, 0.16, -0.1, 0], [-0.1, -0.15, -0.18, -0.27], [-0.04, -0.22, 0.03, -0.035]]), 0.014, finMat);
  attach(fCaudal, 0.985, 0, 0.0);
  // vây ngực hai bên, chúc xuống
  const pect = shp([[0.07, 0], [0.02, 0.16, -0.1, 0.27], [-0.075, 0.13, -0.065, 0]]);
  for (const side of [1, -1]) {
    const m = fin(pect, 0.014, finMat); m.geometry = m.geometry.clone(); m.geometry.rotateX(Math.PI / 2); m.geometry.rotateX(0.38); if (side < 0) m.geometry.scale(1, 1, -1);
    attach(m, 0.27, 0, -0.45 * prof(0.27).hb, side * prof(0.27).w * 0.78);
  }
  // vây lưng thứ hai, vây hậu môn, vây bụng: nhỏ
  attach(fin(shp([[0.03, -0.01], [0.0, 0.05], [-0.04, -0.01]]), 0.008, finMat), 0.83, 0, prof(0.83).ht - 0.004);
  attach(fin(shp([[0.03, 0.01], [0.0, -0.05], [-0.04, 0.01]]), 0.008, finWhite), 0.85, 0, -prof(0.85).hb + 0.004);
  for (const side of [1, -1]) {
    const m = fin(shp([[0.04, 0], [-0.03, 0.09], [-0.05, 0]]), 0.008, finWhite); m.geometry = m.geometry.clone(); m.geometry.rotateX(Math.PI / 2); m.geometry.rotateX(0.7); if (side < 0) m.geometry.scale(1, 1, -1);
    attach(m, 0.62, 0, -0.6 * prof(0.62).hb, side * prof(0.62).w * 0.55);
  }
  // mắt, năm khe mang mỗi bên
  const eyeMat = new THREE.MeshPhysicalMaterial({color: '#0d0f12', roughness: 0.15, clearcoat: 1});
  for (const side of [1, -1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 20, 14), eyeMat); attach(e, 0.085, 0, 0.22 * prof(0.085).ht, side * prof(0.085).w * 0.86);
    for (let i = 0; i < 5; i++) {
      const s = 0.185 + i * 0.017, p = prof(s);
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.7 * p.ht, 0.0025), MAT.satin('#3a4250')); g.rotation.z = -0.12;
      attach(g, s, 0, -0.08 * p.ht, side * (p.w + 0.0005));
    }
  }

  // ---------- khung robot bên trong (minh hoạ)
  const robot = new THREE.Group(); root.add(robot);
  const ratt = [];
  const onChord = (obj, s0, s1, v = 0) => { const g = new THREE.Group(); g.add(obj); robot.add(g); ratt.push({g, s0, s1, v}); return g; };
  const alu = MAT.anod('#c3c8ce'), dark = MAT.satin('#26292d'), acc = MAT.accent();
  const pts = [LINK0, ...JOINTS, 1];
  for (let i = 0; i + 1 < pts.length; i++) {
    const len = (pts[i + 1] - pts[i]) * L - 0.035;
    const g = new THREE.Group();
    const bar = new THREE.Mesh(SH.rbox(len, 0.05 * (i ? 1 - i * 0.07 : 1.1), 0.014, 0.005), alu); g.add(bar);
    if (i === 0) {
      const batt = new THREE.Mesh(SH.rbox(0.26, 0.085, 0.12, 0.012), dark); batt.position.set(-0.02, -0.07, 0); g.add(batt);
      const band = new THREE.Mesh(SH.rbox(0.03, 0.088, 0.123, 0.006), acc); band.position.set(0.07, -0.07, 0); g.add(band);
      const pcb = new THREE.Mesh(SH.rbox(0.13, 0.006, 0.09, 0.002), MAT.pcb('#1f3b2c')); pcb.position.set(0.15, 0.045, 0); g.add(pcb);
      const chip = new THREE.Mesh(SH.rbox(0.025, 0.006, 0.025, 0.002), MAT.chip()); chip.position.set(0.17, 0.051, 0.01); g.add(chip);
    }
    g.children.forEach((m) => { m.castShadow = true; });
    onChord(g, pts[i], pts[i + 1], i === 0 ? 0.0 : -0.005);
  }
  // servo ở mỗi khớp: thân hộp tối, đĩa quay màu cam trên trục đứng
  const servo = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(SH.rbox(0.048, 0.07, 0.036, 0.006), dark); g.add(b);
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 20), acc); horn.position.y = 0.041; g.add(horn);
    g.children.forEach((m) => { m.castShadow = true; });
    return g;
  };
  const servos = JOINTS.map((s) => onChord(servo(), s - 0.004, s + 0.004, -0.004));
  // vành đỡ da ở mỗi khớp
  const ringGeo = (s) => {
    const p = prof(s), k = 0.93;
    const pts2 = []; for (let j = 0; j <= 48; j++) { const a = (2 * Math.PI * j) / 48, cv = Math.cos(a); pts2.push(new THREE.Vector3(0, (cv >= 0 ? p.ht : p.hb) * sgnPow(cv) * k, p.w * sgnPow(Math.sin(a)) * k)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2, true), 64, 0.0045, 6, true);
  };
  JOINTS.forEach((s) => onChord(new THREE.Mesh(ringGeo(s), alu), s - 0.004, s + 0.004));
  // cảm biến mũi
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 20, 14), acc); onChord(nose, 0.02, 0.04);

  // ---------- cập nhật mỗi khung: uốn da, đặt vây và khung robot
  const P = (s, phi, A, lam) => [L / 2 - s * L, lat(s, phi, A, lam)];
  const place = (g, s, dx, v, u, phi, A, lam) => {
    const [x, z] = P(s, phi, A, lam), a = Math.atan2(latDs(s, phi, A, lam), L), ca = Math.cos(a), sa = Math.sin(a);
    g.position.set(x + dx * ca + u * sa, Y0 + v, z - dx * sa + u * ca); g.rotation.y = a;
  };
  const update = (phi, A, lam) => {
    for (let i = 0; i < NS; i++) {
      const s = ST[i], p = prof(s), [x, z] = P(s, phi, A, lam), d = latDs(s, phi, A, lam), n = Math.hypot(d, L), nx = d / n, nz = L / n;
      for (let j = 0; j < NR; j++) {
        const [su, sv, cv] = RING[j], u = p.w * su, v = (cv >= 0 ? p.ht : p.hb) * sv, k = (i * NR + j) * 3;
        pos[k] = x + u * nx; pos[k + 1] = Y0 + v; pos[k + 2] = z + u * nz;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    for (const o of att) place(o.g, o.s, o.dx, o.v, o.u, phi, A, lam);
    for (const o of ratt) {
      const [x0, z0] = P(o.s0, phi, A, lam), [x1, z1] = P(o.s1, phi, A, lam);
      o.g.position.set((x0 + x1) / 2, Y0 + o.v, (z0 + z1) / 2); o.g.rotation.y = chordAng(o.s0, o.s1, phi, A, lam);
    }
  };
  // chế độ nhìn: da (nguyên khối), nhìn xuyên, chỉ khung robot
  const skinParts = [skin, ...att.map((o) => o.g)];
  const look = (mode) => {
    const op = mode === 'skin' ? 1 : mode === 'glass' ? 0.3 : 0;
    for (const g of skinParts) g.traverse((m) => {
      if (!m.isMesh) return;
      for (const mt of [m.material]) { mt.transparent = op < 1; mt.opacity = op; mt.depthWrite = op >= 1; }
      m.visible = op > 0; m.castShadow = op >= 1;
    });
    robot.visible = mode !== 'skin';
    robot.traverse((m) => { if (m.isMesh) m.castShadow = mode === 'frame'; });
  };
  // điểm neo nhãn (toạ độ thế giới) theo pha hiện tại
  const anchor = (s, v = 0, u = 0, phi, A, lam) => { const g = new THREE.Object3D(); place(g, s, 0, v, u, phi, A, lam); return g.position; };
  return {root, update, look, anchor, servos};
}
