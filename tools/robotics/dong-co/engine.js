// Hình khối động cơ xăng 4 kì một xi lanh, dựng hoàn toàn bằng mã theo số đo thật (kin.js). update(state) đặt mọi chi tiết
// từ góc trục khuỷu ψ. Xi lanh đặt đứng cho dễ nhìn (trên xe Wave xi lanh nằm gần ngang). Đơn vị mét, trục khuỷu theo z.
// Nhóm theo cơ cấu và hệ thống để cô lập từng phần (một nút cho mỗi hệ thống, cách làm của teardown, MIT).
import * as THREE from 'three';
import {MAT} from '../kit/stage.js';
import {rbox, slab, rrect, hole, merge} from '../kit/shapes.js';
import {E, R, pinDist, gapH, liftIn, liftEx, chargeOf, TIMING} from './kin.js';

const V3 = THREE.Vector3;
export const YC = 0.085;                                  // tâm trục khuỷu
export const DECK = YC + R + E.l + E.ch + gapH(E.eps);    // mặt nắp máy (ĐCT + khe buồng cháy), hình giữ ε = 9
export const CROWN_TDC = YC + R + E.l + E.ch, CROWN_BDC = YC - R + E.l + E.ch;
export const CAMY = DECK + 0.072;
export const VX = 0.0135;                                 // tâm xupap nạp (−x) và thải (+x)
export const CUT_Z = 0.012;                               // mặt cắt dọc: bỏ phần z > 12 mm
const BORE = E.D / 2;

const lat = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), seg);
const tube = (pts, r, seg = 64) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), seg, r, 16, false);

export function buildEngine() {
  const root = new THREE.Group();
  const SYS = {frame: [], crank: [], valve: [], fuel: [], ign: [], cool: [], lube: [], start: [], gas: []};
  const clipPlane = new THREE.Plane(new V3(0, 0, -1), CUT_Z);
  const ALL = [];
  // mỗi chi tiết một bản vật liệu riêng: cô lập một hệ thống, cắt dọc hay nhìn xuyên đều đặt lại từ trạng thái gốc
  const mesh = (geo, mat0, sys, {clip = false, parent = root, cast = true, shell = false} = {}) => {
    const mat = mat0.userData.shared ? mat0 : mat0.clone();
    if (clip) mat.side = THREE.DoubleSide;
    mat.userData.o = {op: mat.opacity, tr: mat.transparent, dw: mat.depthWrite};
    const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true;
    Object.assign(m.userData, {sys, clip, shell, cast});
    parent.add(m); SYS[sys].push(m); ALL.push(m);
    return m;
  };
  const alu = MAT.satin('#c4c7ca'), aluDark = MAT.satin('#9ea3a8'), finMat = MAT.satin('#b9bdc1'), steel = MAT.steel(), dark = MAT.satin('#2c2f33');
  const piston = MAT.anod('#d3d6d9'), rodMat = MAT.steel(), ceramic = MAT.shell('#f1eee8'), black = MAT.rubber();
  const pipeMat = MAT.satin('#5d6166'), carbMat = MAT.anod('#a9adb1'), oilMat = new THREE.MeshPhysicalMaterial({color: '#c98a1a', roughness: 0.25, transparent: true, opacity: 0.55, clearcoat: 0.6});
  const accent = MAT.accent();

  // ---- thân máy: hộp trục khuỷu, xi lanh có cánh tản nhiệt, nắp máy (cắt dọc được)
  const mCase = mesh(rbox(0.2, 0.15, 0.13, 0.03), alu, 'frame', {clip: true, shell: true}); mCase.position.set(0, YC - 0.005, -0.004);
  const barrelY0 = YC + 0.07;
  const mBarrel = mesh(lat([[BORE + 0.0002, barrelY0], [0.034, barrelY0], [0.034, DECK], [BORE + 0.0002, DECK]], 64), aluDark, 'frame', {clip: true, shell: true});
  const finShape = (w, d, r) => { const s = rrect(w, d, 0.008); if (r > 0) s.holes.push(hole(0, 0, r)); return s; };
  const fins = [];
  for (let y = barrelY0 + 0.008; y < DECK - 0.004; y += 0.0105) {
    const w = 0.1 - (DECK - y) * 0.12;
    const g = slab(finShape(w, w * 0.92, 0.0335), 0.0028, 0.0008, 24); g.rotateX(Math.PI / 2); g.translate(0, y, 0); fins.push(g);
  }
  const mFins = mesh(merge(fins), finMat, 'cool', {clip: true, shell: true});
  // nắp máy: khối có buồng xupap, cánh tản nhiệt phía trên
  const head = rbox(0.11, 0.05, 0.1, 0.012); head.translate(0, DECK + 0.025, 0);
  const mHead = mesh(head, alu, 'frame', {clip: true, shell: true});
  const hf = [];
  for (let k = 0; k < 3; k++) { const g = slab(finShape(0.13 - k * 0.012, 0.12 - k * 0.012, 0.0), 0.0028, 0.0008, 16); g.rotateX(Math.PI / 2); g.translate(0, DECK + 0.006 + k * 0.013, 0); hf.push(g); }
  const mHf = mesh(merge(hf), finMat, 'cool', {clip: true, shell: true});
  const cover = rbox(0.085, 0.04, 0.085, 0.014); cover.translate(0, CAMY + 0.008, 0);
  const mCover = mesh(cover, alu, 'frame', {clip: true, shell: true});

  // ---- cơ cấu trục khuỷu – thanh truyền
  const crank = new THREE.Group(); crank.position.set(0, YC, 0); root.add(crank);
  const shaft = new THREE.CylinderGeometry(0.0115, 0.0115, 0.17, 32); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, -0.02);
  mesh(shaft, steel, 'crank', {parent: crank});
  const web = () => { const s = new THREE.Shape(); s.absarc(0, 0, 0.044, 0, Math.PI * 2, false); const g = slab(s, 0.009, 0.0012, 48); return g; };
  for (const z of [-0.0185, 0.0185]) mesh(web().translate(0, 0, z), MAT.satin('#7d8287'), 'crank', {parent: crank});
  const cw = new THREE.Shape(); cw.absarc(0, 0, 0.0435, Math.PI * 0.18, Math.PI * 0.82, false); cw.lineTo(0, -0.004);
  for (const z of [-0.0185, 0.0185]) { const g = slab(cw, 0.0115, 0.001, 32); g.rotateZ(Math.PI); g.translate(0, 0, z); mesh(g, MAT.satin('#6f7479'), 'crank', {parent: crank}); }
  const pin = new THREE.CylinderGeometry(0.0085, 0.0085, 0.028, 24); pin.rotateX(Math.PI / 2); pin.translate(0, R, 0);
  mesh(pin, steel, 'crank', {parent: crank});
  // bánh đà (rô-to vô lăng điện) ở đầu trái, đĩa xích cam bên trong
  const fw = new THREE.CylinderGeometry(0.056, 0.056, 0.014, 64); fw.rotateX(Math.PI / 2); fw.translate(0, 0, -0.088);
  mesh(fw, MAT.satin('#4a4e53'), 'crank', {parent: crank});
  for (let k = 0; k < 6; k++) { const b = new THREE.BoxGeometry(0.014, 0.008, 0.003); b.translate(0, 0.042, -0.0805); b.rotateZ((k * Math.PI) / 3); mesh(b, MAT.satin('#c9a227'), 'crank', {parent: crank}); }
  const spr = (r, n, z, parent, sys) => {
    const s = new THREE.Shape(); for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : r - 0.0022; i ? s.lineTo(rr * Math.sin(a), rr * Math.cos(a)) : s.moveTo(0, rr); }
    const g = slab(s, 0.004, 0.0004, 4); g.translate(0, 0, z); return mesh(g, steel, sys, {parent});
  };
  spr(0.0115, 16, -0.05, crank, 'valve');
  // thanh truyền và pít-tông (đặt trong update)
  const rodG = (() => {
    const s = new THREE.Shape(), rb = 0.0165, rs = 0.0095, L = E.l;
    s.absarc(0, 0, rb, Math.PI * 1.05, Math.PI * 1.95, false); s.lineTo(0.007, L - 0.006); s.absarc(0, L, rs, -Math.PI * 0.25, Math.PI * 1.25, false); s.lineTo(-0.007, L - 0.006); s.closePath();
    s.holes.push(hole(0, 0, 0.0087), hole(0, L, 0.0058));
    return slab(s, 0.012, 0.0012, 32);
  })();
  const rod = mesh(rodG, rodMat, 'crank');
  const pistonG = lat([[0, -0.018], [BORE - 0.0006, -0.018], [BORE - 0.0003, 0.012], [BORE - 0.0002, E.ch - 0.0015], [BORE - 0.0016, E.ch], [0, E.ch]], 64);
  const pist = new THREE.Group(); root.add(pist);
  const crownMat = mesh(pistonG, MAT.anod('#d3d6d9'), 'crank', {parent: pist}).material;
  for (const y of [0.0105, 0.0145, 0.0185]) mesh(lat([[BORE + 0.0001, y - 0.0007], [BORE + 0.0001, y + 0.0007]], 64), dark, 'crank', {parent: pist, cast: false});
  const ppin = new THREE.CylinderGeometry(0.0058, 0.0058, 0.044, 20); ppin.rotateX(Math.PI / 2);
  mesh(ppin, steel, 'crank', {parent: pist});

  // ---- khí trong xi lanh: một trụ đổi cao theo pít-tông, màu theo kì (hoà khí, nén, cháy, khí thải)
  const gasMat = new THREE.MeshBasicMaterial({color: '#7fb0d8', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide}); gasMat.userData.shared = true;
  const gasG = new THREE.CylinderGeometry(BORE - 0.0004, BORE - 0.0004, 1, 64, 1, false); gasG.translate(0, 0.5, 0);
  const gas = mesh(gasG, gasMat, 'gas', {clip: true, cast: false}); gas.renderOrder = 2;

  // ---- cơ cấu phân phối khí: hai xupap, lò xo, cò mổ, trục cam, xích cam (tỉ số 2 : 1)
  const valve = (x) => {
    const g = new THREE.Group(); g.position.set(x, DECK, 0); root.add(g);
    mesh(lat([[0, -0.0018], [0.0092, -0.0018], [0.0092, -0.0006], [0.0035, 0.003], [0.0024, 0.006], [0.0024, 0.066], [0, 0.066]], 40), steel, 'valve', {parent: g});
    const ret = lat([[0.0026, 0.054], [0.0085, 0.054], [0.0085, 0.057], [0.0026, 0.057]], 32);
    mesh(ret, steel, 'valve', {parent: g});
    return g;
  };
  const vIn = valve(-VX), vEx = valve(VX);
  const springG = (() => { const pts = []; for (let i = 0; i <= 240; i++) { const t = i / 240, a = t * Math.PI * 2 * 6; pts.push(new V3(0.0072 * Math.cos(a), t, 0.0072 * Math.sin(a))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.0011, 6, false); })();
  const springMat = MAT.satin('#3a6e9c');
  const spIn = mesh(springG, springMat, 'valve'), spEx = mesh(springG, springMat, 'valve');
  const camShaft = new THREE.CylinderGeometry(0.006, 0.006, 0.09, 24); camShaft.rotateX(Math.PI / 2); camShaft.translate(0, 0, -0.02);
  const cam = new THREE.Group(); cam.position.set(0, CAMY, 0); root.add(cam);
  mesh(camShaft, steel, 'valve', {parent: cam});
  const camWheel = new THREE.Group(); camWheel.position.set(0, CAMY, 0); root.add(camWheel);
  spr(0.023, 32, -0.05, camWheel, 'valve');
  const lobes = new THREE.Group(); cam.add(lobes);
  const lobeMat = MAT.satin('#7d8287'); lobeMat.userData.o = {op: 1, tr: false, dw: true}; lobeMat.userData.shared = true;
  const buildLobes = (real) => {
    lobes.clear();
    const T = real ? TIMING.real : TIMING.ideal;
    for (const [k, z] of [['in', -0.009], ['ex', 0.009]]) {
      const [a, b] = T[k], dur = (b - a) / 2, mid = (a + b) / 4; // độ trục cam
      const s = new THREE.Shape(), rb = 0.0085, h = E.lift;
      for (let i = 0; i <= 120; i++) {
        const phi = (i / 120) * 360 - 180, x = phi / dur + 0.5, lift = x >= 0 && x <= 1 ? Math.sin(Math.PI * x) ** 2 : 0, rr = rb + h * lift;
        const ang = (phi * Math.PI) / 180; const px = rr * Math.sin(ang), py = rr * Math.cos(ang);
        i ? s.lineTo(px, py) : s.moveTo(px, py);
      }
      const g = slab(s, 0.007, 0.0006, 4); g.translate(0, 0, z);
      const m = new THREE.Mesh(g, lobeMat); m.castShadow = true; m.userData.sys = 'valve'; m.userData.part = 'cam'; m.userData.mid = mid; m.userData.k = k;
      lobes.add(m); look();
    }
  };
  
  // cò mổ: cần bập bênh quanh trục cố định; đầu trên tì vào cam, đầu dưới đè xupap
  const rocker = (sign) => {
    const g = new THREE.Group(); g.position.set(sign * 0.0075, CAMY - 0.0045, 0); root.add(g);
    const s = new THREE.Shape(); s.moveTo(-0.0035, -0.0025); s.lineTo(sign * 0.0085 - 0.002, -0.0045); s.lineTo(sign * 0.0085 + 0.002, -0.0058); s.lineTo(sign * 0.0085 + 0.0015, -0.002); s.lineTo(0.0035, 0.0025); s.lineTo(-sign * 0.006, 0.0035); s.closePath();
    mesh(slab(s, 0.0055, 0.0006, 4), MAT.satin('#5f6469'), 'valve', {parent: g});
    return g;
  };
  const rkIn = rocker(-1), rkEx = rocker(1);
  // xích cam: các mắt xích chạy quanh hai đĩa, phía sau xi lanh (z = −50 mm)
  const chainPath = (() => {
    // tiếp tuyến ngoài của hai đĩa thẳng hàng theo y: tiếp điểm ở góc φ = −asin((r2 − r1)/d) trên cả hai đĩa
    const r1 = 0.0115, r2 = 0.023, d = CAMY - YC, phi = -Math.asin((r2 - r1) / d), pts = [];
    const arc = (cy, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(new V3(r * Math.cos(a), cy + r * Math.sin(a), -0.05)); } };
    const line = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push(new V3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, -0.05)); } };
    arc(CAMY, r2, phi, Math.PI - phi, 28);
    line(r2 * Math.cos(Math.PI - phi), CAMY + r2 * Math.sin(Math.PI - phi), r1 * Math.cos(Math.PI - phi), YC + r1 * Math.sin(Math.PI - phi), 14);
    arc(YC, r1, Math.PI - phi, 2 * Math.PI + phi, 16);
    line(r1 * Math.cos(phi), YC + r1 * Math.sin(phi), r2 * Math.cos(phi), CAMY + r2 * Math.sin(phi), 14);
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  })();
  const NL = 64, links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0045, 0.0026, 0.005), MAT.satin('#3d4247'), NL);
  links.castShadow = true; links.userData.sys = 'valve'; links.material.userData.o = {op: 1, tr: false, dw: true}; root.add(links); SYS.valve.push(links); ALL.push(links);

  // ---- hệ thống đánh lửa: bugi nghiêng vào buồng cháy, cuộn đánh lửa, dây cao áp
  const plug = new THREE.Group(); plug.position.set(0, DECK + 0.001, -0.013); plug.rotation.x = -0.6; root.add(plug);
  mesh(lat([[0.0007, -0.0015], [0.0026, -0.0015], [0.0026, 0.012], [0.0045, 0.012], [0.0045, 0.02]], 24), steel, 'ign', {parent: plug});
  mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6).translate(0, 0.024, 0), steel, 'ign', {parent: plug});
  mesh(lat([[0.004, 0.028], [0.0048, 0.03], [0.004, 0.045], [0.0024, 0.05], [0, 0.05]], 24), ceramic, 'ign', {parent: plug});
  const sparkMat = new THREE.MeshBasicMaterial({color: '#ffe9a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending}); sparkMat.userData.shared = true;
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 16, 12), sparkMat); spark.position.set(0, -0.003, 0); plug.add(spark);
  const mCoil = mesh(rbox(0.028, 0.042, 0.022, 0.004).translate(-0.035, CAMY + 0.02, -0.07), black, 'ign');
  const mLead = mesh(tube([[-0.035, CAMY + 0.04, -0.07], [-0.02, CAMY + 0.06, -0.06], [0, DECK + 0.05, -0.04], [0, DECK + 0.045, -0.032]], 0.0022, 48), black, 'ign');

  // ---- hệ thống cung cấp nhiên liệu và không khí: đường nạp, bộ chế hoà khí, lọc gió; đường thải, ống xả
  const intakePts = [[-VX, DECK + 0.006, 0], [-0.03, DECK + 0.02, 0], [-0.06, DECK + 0.03, 0], [-0.09, DECK + 0.034, 0]];
  const mIn = mesh(tube(intakePts, 0.0095), pipeMat, 'fuel', {clip: true});
  const mCarb = mesh(rbox(0.04, 0.045, 0.045, 0.008).translate(-0.11, DECK + 0.034, 0), carbMat, 'fuel', {clip: true});
  const mAir = mesh(rbox(0.06, 0.07, 0.07, 0.014).translate(-0.165, DECK + 0.04, 0), MAT.satin('#3b3f44'), 'fuel', {clip: true});
  const exPts = [[VX, DECK + 0.006, 0], [0.04, DECK + 0.014, 0], [0.085, DECK + 0.0, 0], [0.122, DECK - 0.055, 0], [0.132, YC + 0.02, 0], [0.19, YC - 0.035, 0]];
  const exMat = MAT.satin('#4a4f55');
  const mEx = mesh(tube(exPts, 0.0105, 96), exMat, 'fuel', {clip: true});
  // dòng khí: hạt xanh vào theo đường nạp, hạt xám ra theo đường thải
  const curveIn = new THREE.CatmullRomCurve3([...intakePts].reverse().map((p) => new V3(...p)).concat([new V3(-VX, DECK - 0.004, 0)]));
  const curveEx = new THREE.CatmullRomCurve3([new V3(VX, DECK - 0.004, 0), ...exPts.map((p) => new V3(...p))]);
  const NP = 36, pdot = (col) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 8, 6), new THREE.MeshBasicMaterial({color: col, transparent: true, opacity: 0.9}), NP); m.frustumCulled = false; root.add(m); return m; };
  const dIn = pdot('#3c79a8'), dEx = pdot('#6f675f');

  // ---- hệ thống bôi trơn: dầu trong cácte; khởi động: mô tơ điện bên dưới
  const mOil = mesh(rbox(0.17, 0.022, 0.1, 0.006).translate(0, YC - 0.064, -0.004), oilMat, 'lube', {cast: false, clip: true});
  const starter = new THREE.CylinderGeometry(0.016, 0.016, 0.06, 32); starter.rotateX(Math.PI / 2); starter.translate(0.075, YC - 0.045, -0.035);
  const mStart = mesh(starter, MAT.satin('#30353a'), 'start', {clip: true});

  // ---- cập nhật mọi chi tiết từ trạng thái
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), Sc = new V3(1, 1, 1), up = new V3(0, 1, 0);
  const GAS = ['#7fb0d8', '#9d86d6', '#ff8a3d', '#a39b92'];
  let lastReal = false;
  const update = (s) => {
    const th = s.psi % 360, rad = (th * Math.PI) / 180;
    crank.rotation.z = -rad;
    const px = R * Math.sin(rad), py = YC + R * Math.cos(rad), pinY = YC + pinDist(th);
    pist.position.set(0, pinY, 0);
    rod.position.set(px, py, 0); rod.rotation.z = Math.atan2(px, pinY - py);
    // khí trong xi lanh
    const crown = pinY + E.ch, ch = chargeOf(s.psi, s.spark), k = s.psi % 720;
    gas.position.y = crown; gas.scale.y = Math.max(0.0005, DECK - crown);
    gasMat.color.set(GAS[ch]);
    let op = [0.42, 0.55, 0.8, 0.38][ch];
    if (ch === 2) { const f = Math.max(0, 1 - (k - 360) / 60); gasMat.color.lerp(new THREE.Color('#ffd27a'), f); op = 0.55 + 0.35 * f; }
    if (s.knock && k >= 350 && k < 380) { op = 0.95; gasMat.color.set(Math.floor(k * 3) % 2 ? '#ff3b2f' : '#ffd27a'); }
    gasMat.opacity = op * (s.gasK ?? 1) * (look.sys && look.sys !== 'gas' && look.sys !== 'crank' ? 0.15 : 1);
    // xupap, lò xo, cò mổ, trục cam (quay bằng nửa trục khuỷu)
    if (s.real !== lastReal) { buildLobes(s.real); lastReal = s.real; }
    const li = liftIn(s.psi, s.real) * E.lift, le = liftEx(s.psi, s.real) * E.lift;
    vIn.position.y = DECK - li; vEx.position.y = DECK - le;
    const base = DECK + 0.018;
    spIn.position.set(-VX, base, 0); spIn.scale.y = DECK + 0.054 - li - base;
    spEx.position.set(VX, base, 0); spEx.scale.y = DECK + 0.054 - le - base;
    rkIn.rotation.z = -li / 0.0085; rkEx.rotation.z = le / 0.0085;
    const camAng = (s.psi / 2) % 360;
    for (const m of lobes.children) m.rotation.z = -((camAng - m.userData.mid) * Math.PI) / 180;
    camWheel.rotation.z = -(camAng * Math.PI) / 180;
    for (let i = 0; i < NL; i++) {
      const u = (i / NL + (s.psi / 360) * (0.0115 * 2 * Math.PI) / chainPath.getLength()) % 1;
      chainPath.getPointAt(u, P); const t = chainPath.getTangentAt(u);
      Q.setFromUnitVectors(new V3(1, 0, 0), t); M.compose(P, Q, Sc); links.setMatrixAt(i, M);
    }
    links.instanceMatrix.needsUpdate = true;
    // tia lửa ở bugi cuối kì nén
    sparkMat.opacity = s.spark && k >= 350 && k < 364 ? 0.95 * Math.sin(((k - 350) / 14) * Math.PI) : 0;
    spark.scale.setScalar(1 + 0.6 * Math.sin(k * 5));
    // hạt khí ở đường nạp, đường thải
    const flow = (inst, curve, open, dir) => {
      for (let i = 0; i < NP; i++) {
        const u = (i / NP + (dir * s.psi) / 180) % 1, uu = u < 0 ? u + 1 : u;
        curve.getPointAt(uu, P); M.compose(P, Q.identity(), Sc.setScalar(open > 0.04 ? 1 : 0.0001)); inst.setMatrixAt(i, M);
      }
      Sc.setScalar(1); inst.instanceMatrix.needsUpdate = true;
    };
    flow(dIn, curveIn, li / E.lift, 1); flow(dEx, curveEx, le / E.lift, 1);
    // một màu nhấn: chi tiết đang làm việc
    crownMat.emissive.set(k >= 360 && k < 540 && s.spark ? '#e3562a' : '#000000');
    crownMat.emissiveIntensity = k >= 360 && k < 540 ? 0.35 * Math.max(0, 1 - (k - 360) / 180) : 0;
  };

  // chế độ nhìn: cắt dọc, kính, nguyên khối; cô lập một hệ thống. Mọi lần đặt đều tính lại từ vật liệu gốc.
  function look(mode = look.mode, sys = look.sys) {
    look.mode = mode; look.sys = sys;
    const each = (o, fn) => { for (const m of Array.isArray(o.material) ? o.material : [o.material]) fn(m); };
    const items = [...ALL, ...lobes.children];
    for (const o of items) {
      const u = o.userData, own = u.sys === 'gas' ? 'crank' : u.sys, on = !sys || own === sys;
      each(o, (m) => {
        if (m === gasMat) { m.clippingPlanes = mode === 'cut' ? [clipPlane] : []; return; }
        const b = m.userData.o || {op: 1, tr: false, dw: true};
        let op = b.op, tr = b.tr, dw = b.dw;
        if (u.shell && mode === 'glass') { op = 0.2; tr = true; dw = false; }
        if (!on) { op = Math.min(op, 0.07); tr = true; dw = false; }
        const out = look.ghost.has(u.part); // cụm đang nằm ngoài máy (chế độ lắp ráp): nguyên khối, không cắt dọc, không làm mờ
        if (out) { op = b.op; tr = b.tr; dw = b.dw; }
        if (m.transparent !== tr) m.needsUpdate = true; m.opacity = op; m.transparent = tr; m.depthWrite = dw;
        m.clippingPlanes = u.clip && mode === 'cut' && !out ? [clipPlane] : [];
        m.needsUpdate = true;
      });
      o.castShadow = (on || look.ghost.has(u.part)) && u.cast !== false;
    }
  }
  look.mode = 'cut'; look.sys = null; look.ghost = new Set();
  buildLobes(false);
  look('cut', null);
  // ---- cụm lắp ráp: mỗi cụm một nhóm riêng dưới root, để chế độ lắp ráp dời cả cụm theo hướng đưa vào (kit/lap.js)
  // và thẻ soi chi tiết biết bấm trúng cụm nào (userData.part)
  const UNIT = {};
  const put = (id, ...objs) => {
    const g = UNIT[id] || (UNIT[id] = new THREE.Group()); g.name = id; root.add(g);
    for (const o of objs) { g.add(o); o.traverse((x) => { x.userData.part = id; }); }
  };
  put('cacte', mCase); put('khuyu', crank); put('truyen', rod); put('pitong', pist); put('xilanh', mBarrel, mFins);
  put('xupap', vIn, vEx, spIn, spEx); put('nap', mHead, mHf); put('cam', cam, camWheel, links); put('como', rkIn, rkEx); put('napday', mCover);
  put('bugi', plug, mCoil, mLead); put('nap_nl', mIn, mCarb, mAir, dIn); put('xa', mEx, dEx); put('khoidong', mStart); put('dau', mOil);
  gas.userData.part = null; spark.userData.part = null;
  // tâm và cỡ hiện tại của một cụm (chi tiết chuyển động thì tâm đi theo), để camera bám theo và đặt khoảng nhìn
  const bx = new THREE.Box3();
  const box = (id) => { const g = UNIT[id]; g.updateMatrixWorld(true); bx.setFromObject(g); return {c: bx.getCenter(new V3()), s: bx.getSize(new V3())}; };
  // nhấp nháy đỏ chi tiết gây vướng: đặt phát sáng trên vật liệu riêng của cụm (vật liệu dùng chung thì bỏ qua)
  const lit = new Set();
  const flash = (id, col) => {
    const g = UNIT[id]; if (!g) return;
    if (!col && !lit.has(id)) return;
    g.traverse((o) => { if (!o.isMesh || !o.material || o.material.userData.shared || !o.material.emissive) return; o.material.emissive.set(col || '#000000'); o.material.emissiveIntensity = col ? 0.55 : 0; });
    if (col) lit.add(id); else lit.delete(id);
  };
  const hideFx = (on) => { gas.visible = !on; spark.visible = !on; dIn.visible = !on; dEx.visible = !on; };
  return {root, update, look, SYS, UNIT, box, flash, hideFx, parts: {vIn, vEx, plug, cam, pist, crank, rod}, accent};
}
