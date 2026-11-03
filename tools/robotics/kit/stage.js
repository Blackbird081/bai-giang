// Studio dùng chung cho mọi mô phỏng: nền trắng của nhà Sáng Ăn Khoai, sàn kẻ lưới đo (mm/cm/m), bóng mềm, GTAO, môi trường phòng sáng.
// Phỏng theo stage của teardown (MIT, elvarofficial + whaleyxbt). frame(cam) đặt camera và vẽ một khung hình.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';

const V3 = THREE.Vector3;

const GV = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GF = `uniform vec3 uG; uniform vec3 uMi; uniform vec3 uMa; uniform vec3 uBg; uniform vec3 uC; uniform float uStep; uniform float uFade; varying vec3 vW;
  float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
  void main(){
    float mi = grid(vW.xz, uStep) * 0.7, ma = grid(vW.xz, uStep * 10.0);
    vec3 col = mix(uG, uMi, mi); col = mix(col, uMa, ma);
    float n = fract(sin(dot(floor(vW.xz * 400.0 / uStep), vec2(12.9898, 78.233))) * 43758.5453);
    col *= 0.99 + 0.02 * n;
    float d = length(vW.xz - uC.xz);
    gl_FragColor = vec4(mix(col, uBg, smoothstep(uFade * 0.35, uFade, d)), 1.0);
  }`;

// nền nhà Sáng Ăn Khoai: trắng, lưới xám rất nhạt
export const PAL_HOUSE = {exact: true, bg: '#ffffff', ground: '#f6f6f6', minor: '#ebebeb', major: '#dddddd', shadow: '#2f3744', env: '#eef0f3', envGround: '#d9dce1', sky: '#ffffff', hemiGround: '#d6d9de'};
export function createStage({canvas, extent = 1.6, grid = 0.1, fade = 6, fov = 28, near = 0.02, far = 80, ao = {}, sunDir = [-0.35, 0.82, 0.45], pal = PAL_HOUSE}) {
  const P = pal;
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  // OutputPass ánh xạ tông màu (Khronos PBR Neutral) cả nền lẫn sàn, nên trắng ra xám ~240. Với nền nhà (exact) tính ngược
  // màu tuyến tính cần đưa vào để màn hình ra đúng màu đặt (xám trung tính: lệch 0,04, nén đỉnh từ 0,76).
  const col = (hex) => {
    const c = new THREE.Color(hex);
    const inv = (t) => { t = Math.min(t, 0.997); return (t < 0.76 ? t : 0.52 + 0.0576 / (1 - t)) + 0.04; };
    return new THREE.Color(inv(c.r), inv(c.g), inv(c.b));
  };
  scene.background = col(P.bg);
  scene.fog = new THREE.Fog(col(P.bg), fade * 1.3, fade * 3.2);
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, near, far);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.8;
  gtao.updateGtaoMaterial({radius: extent * 0.04, distanceExponent: 1.4, thickness: extent * 0.35, scale: 1.0, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false, ...ao});
  gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16});
  class Toggle extends Pass {
    constructor(fn) { super(); this.needsSwap = false; this.fn = fn; }
    render() { this.fn(); }
  }
  const floorVis = (v) => () => { ground.visible = v; shade.visible = v; for (const o of noAO) o.visible = v && o.userData.on !== false; };
  const noAO = [];
  composer.addPass(new Toggle(floorVis(false)));
  composer.addPass(gtao);
  composer.addPass(new Toggle(floorVis(true)));
  composer.addPass(new OutputPass());
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color(P.env);
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.98, 0.95).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos); m.lookAt(0, 0, 0); env.add(m);
    };
    box(12, 12, new V3(0, 14, 2), 2.4); box(3, 14, new V3(-12, 4, 6), 3.0); box(3, 14, new V3(12, 4, -4), 2.0); box(18, 2, new V3(0, 2, 14), 1.5);
    const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: P.envGround, side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2; g.position.y = -2; env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture; scene.environmentIntensity = 0.95; pm.dispose();
  }
  const SUN = new V3(...sunDir).normalize();
  const sun = new THREE.DirectionalLight('#ffffff', 2.3);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -extent, right: extent, top: extent, bottom: -extent, near: 0.05 * extent, far: 14 * extent});
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 10; sun.shadow.blurSamples = 20; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.002 * extent;
  scene.add(sun, sun.target, new THREE.HemisphereLight(P.sky, P.hemiGround, 0.65));
  const groundMat = new THREE.ShaderMaterial({vertexShader: GV, fragmentShader: GF, toneMapped: false,
    uniforms: {uG: {value: col(P.ground)}, uMi: {value: col(P.minor)}, uMa: {value: col(P.major)}, uBg: {value: col(P.bg)}, uC: {value: new V3()}, uStep: {value: grid}, uFade: {value: fade}}});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({color: P.shadow, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}));
  shade.rotation.x = -Math.PI / 2; shade.receiveShadow = true; scene.add(shade);

  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w; size.h = h;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const right = new V3().crossVectors(new V3(0, 1, 0), SUN).normalize(), upL = new V3().crossVectors(SUN, right), tmp = new V3();
  let texel = (2 * extent) / sun.shadow.mapSize.x;
  // cam: {tx, ty, tz, az, el (rad), d (m), sx, sy (px offset on the 1600x900 canvas)}
  const frame = (cam, shadowAt) => {
    camera.position.set(cam.tx + cam.d * Math.cos(cam.el) * Math.sin(cam.az), cam.ty + cam.d * Math.sin(cam.el), cam.tz + cam.d * Math.cos(cam.el) * Math.cos(cam.az));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    groundMat.uniforms.uC.value.set(cam.tx, 0, cam.tz);
    tmp.copy(shadowAt || new V3(cam.tx, cam.ty * 0.5, cam.tz));
    const rr = Math.round(tmp.dot(right) / texel) * texel, uu = Math.round(tmp.dot(upL) / texel) * texel;
    sun.target.position.copy(right).multiplyScalar(rr).addScaledVector(upL, uu).addScaledVector(SUN, tmp.dot(SUN));
    sun.position.copy(sun.target.position).addScaledVector(SUN, 6 * extent);
    sun.target.updateMatrixWorld();
    composer.render();
  };
  const pv = new V3();
  const project = (x, y, z) => {
    pv.set(x, y, z).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setQuality = ({samples, ao: aoOn, shadow}) => {
    if (samples !== undefined) for (const t of [composer.renderTarget1, composer.renderTarget2]) { t.samples = samples; t.dispose(); }
    if (aoOn !== undefined) gtao.enabled = aoOn;
    if (shadow !== undefined) { sun.shadow.mapSize.set(shadow, shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; texel = (2 * extent) / shadow; }
  };
  return {renderer, scene, camera, composer, gtao, sun, ground, resize, frame, project, size, setQuality, noAO};
}

// Vật liệu dùng chung, độ nhám ≥ 0.45 để kim loại không loé trắng (quy tắc teardown)
export const MAT = {
  alu: () => new THREE.MeshStandardMaterial({color: '#c9cbcd', metalness: 0.75, roughness: 0.45, envMapIntensity: 0.6}),
  steel: () => new THREE.MeshStandardMaterial({color: '#8e9296', metalness: 0.8, roughness: 0.48, envMapIntensity: 0.5}),
  dark: () => new THREE.MeshStandardMaterial({color: '#2b2d30', metalness: 0.2, roughness: 0.5}),
  plastic: (c) => new THREE.MeshStandardMaterial({color: c, metalness: 0.0, roughness: 0.55}),
  glossy: (c) => new THREE.MeshPhysicalMaterial({color: c, metalness: 0.0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.35}),
  accent: () => new THREE.MeshStandardMaterial({color: '#e3562a', metalness: 0.1, roughness: 0.45}),
  rubber: () => new THREE.MeshStandardMaterial({color: '#232323', metalness: 0, roughness: 0.85}),
  // vật liệu bề mặt thật: lớp phủ bóng mỏng cho nhựa ép, sơn tĩnh điện, gốm; kim loại anod hoá; mạch in; kính khói
  shell: (c = '#eef0f1') => new THREE.MeshPhysicalMaterial({color: c, metalness: 0, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.28, envMapIntensity: 0.8}),
  satin: (c) => new THREE.MeshPhysicalMaterial({color: c, metalness: 0, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45}),
  anod: (c = '#b9bec4') => new THREE.MeshPhysicalMaterial({color: c, metalness: 0.65, roughness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.6}),
  pcb: (c = '#1c1e21') => new THREE.MeshPhysicalMaterial({color: c, metalness: 0.05, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.2}),
  gold: () => new THREE.MeshStandardMaterial({color: '#d4a94e', metalness: 0.9, roughness: 0.45, envMapIntensity: 0.6}),
  chip: () => new THREE.MeshStandardMaterial({color: '#141517', metalness: 0.1, roughness: 0.6}),
  glass: (c = '#1d2226') => new THREE.MeshPhysicalMaterial({color: c, metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1}),
  tire: () => new THREE.MeshStandardMaterial({color: '#1e1f21', metalness: 0, roughness: 0.78}),
};
// X-quang: làm mờ mọi vật liệu trong nhóm (giữ bản gốc trong userData để trả lại)
export function xray(root, k, keep = () => false) {
  root.traverse((o) => {
    if (!o.isMesh || keep(o)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.op === undefined) m.userData.op = m.opacity;
      const op = m.userData.op * (1 - 0.82 * k);
      m.transparent = op < 0.999; m.opacity = op; m.depthWrite = op > 0.6;
    }
    o.castShadow = k < 0.5 && o.userData.cast !== false;
  });
}
