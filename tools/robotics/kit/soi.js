// Soi chi tiết dùng chung cho bộ robotics: gắn nhãn bộ phận vào vật thể (tag), rồi picker(card) trả về hàm sim.pick cho kit/live.js.
// Bấm trúng một mesh: đi ngược lên cây tới vật gần nhất có userData.part, gọi card(part, vật đó, mesh trúng).
// card trả về thẻ {k, t, b, rows, src, d, actions} hoặc null; thiếu pos thì camera bám theo tâm khối bao của vật mang nhãn.
import * as THREE from 'three';

/** gắn nhãn bộ phận cho một hay nhiều vật; trả lại vật đầu tiên */
export const tag = (part, ...objs) => { for (const o of objs) if (o) o.userData.part = part; return objs[0]; };

/** hàm vị trí bám theo tâm khối bao hiện tại của vật (vật chuyển động thì tâm đi theo) */
export function follow(o) {
  const b = new THREE.Box3(), c = new THREE.Vector3();
  return () => { o.updateWorldMatrix(true, true); b.setFromObject(o); b.getCenter(c); return [c.x, c.y, c.z]; };
}

export function picker(card, {minOpacity = 0.3} = {}) {
  return (hits) => {
    for (const h of hits) {
      let holder = null;
      for (let x = h.object; x; x = x.parent) if (x.userData && x.userData.part) { holder = x; break; }
      if (!holder) continue;
      const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
      if (m && m.transparent && m.opacity < minOpacity) continue; // xuyên qua vỏ đang làm mờ (X-quang)
      const c = card(holder.userData.part, holder, h.object);
      if (!c) continue;
      if (!c.pos) c.pos = follow(holder);
      return c;
    }
    return null;
  };
}

/** số kiểu Việt: dấu phẩy thập phân, dấu trừ thật */
export const vn = (x, d = 1) => { if (!Number.isFinite(x)) return '—'; const t = x.toFixed(d); return (/^-0[.,]?0*$/.test(t) ? t.slice(1) : t).replace('-', '−').replace('.', ','); };
