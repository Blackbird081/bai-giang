// Bảng điều khiển 1600 × 900 dùng chung: tiêu đề, khung số, thanh đo, biểu đồ chạy theo thời gian, nút, thanh trượt,
// nhãn có đường dẫn vào chi tiết, con trỏ của chuyến tham quan và khung lời giảng. Phong cách theo teardown (MIT).
export const C = {ink: '#2a2521', mute: '#9b8f80', faint: '#d9cdbb', line: '#eadfcd', panel: 'rgba(252,249,244,.95)', or: '#e3562a', green: '#2fa36b', blue: '#3c79a8', violet: '#7a5ab8', gold: '#c99a2e',
  chart: '#fbf6ee', track: '#efe6d8', track2: '#e8dcc8', sub: '#6d6357'};
// giao diện nhà Sáng Ăn Khoai (nền trắng, kính, Be Vietnam Pro) cho bài phổ thông: createUI(app, {theme: 'house'})
const HOUSE = {dot: '#15171C', ink: '#15171C', mute: '#626773', faint: '#d5d8de', line: '#e7e9ed', panel: '#ffffff', chart: '#f7f8fa', track: '#e9ebef', track2: '#e3e6ea', sub: '#626773'};
const HOUSE_CSS = `
#app,#app .ph,#app .sm,#app .bt,#app .call b,#app .cap,#app .cap .k{font-family:'Be Vietnam Pro',system-ui,sans-serif!important}
#app .cp{background:#fff;border:0;border-radius:14px;box-shadow:0 0 0 .5px rgba(16,24,40,.07),0 8px 24px -14px rgba(16,24,40,.22)}
#app .ph{font-weight:600;font-size:13px;color:#15171C}
#app .ph i{width:6px;height:6px;border-radius:50%;background:#15171C}
#app .pn{color:#9aa0aa}
#app .sm{color:#626773}
#app .bt{box-sizing:border-box;height:24px;padding:0 10px;border:1px solid #e3e6ea;border-radius:999px;background:#fff;color:#15171C;font-weight:600}
#app .bt.on{background:#15171C;border-color:#15171C;color:#fff}
#app .call{background:rgba(255,255,255,.94);border-radius:8px;padding:3px 8px 4px;box-shadow:0 1px 3px rgba(16,24,40,.08),0 0 0 .5px rgba(16,24,40,.08)}
#app .call b{background:none;padding:0;box-shadow:none}
#app .call span{color:#626773;padding-left:11px}
#app .call b i{width:5px;height:5px;border-radius:50%;background:#15171C}
#app .cap .b{font-size:12px;line-height:1.45}
#app .cap .t{margin:2px 0 4px}
#app .cap .k{color:#5B6472;font-weight:600}
#app .cap .b{color:#454A55}
#app .cap .e{background:#f3f4f6;border-radius:6px;position:absolute;top:-3px;right:62px;margin:0;font-size:11px}
#app .cap .k{font-size:12.5px}
#app .cap .k:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#15171C;margin:0 8px 1px 0;vertical-align:middle}
#app .tourchip{border:0;border-radius:999px;background:rgba(255,255,255,.95);box-shadow:0 0 0 .5px rgba(16,24,40,.1),0 6px 16px -8px rgba(16,24,40,.3);color:#15171C;font-family:'Be Vietnam Pro',system-ui,sans-serif}
#app .alert{border-radius:999px;padding:4px 10px}
`;
const CSS = () => `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:6px;box-shadow:0 2px 10px rgba(120,90,50,.08)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 12.5px Inter,system-ui,sans-serif;letter-spacing:0;white-space:nowrap}
.ph i{display:block;width:3px;height:13px;background:${C.or}}
.pn{position:absolute;font:500 11px 'JetBrains Mono',monospace;color:#7d7165;letter-spacing:0}
.sm{font:500 11px Inter,system-ui,sans-serif;letter-spacing:0;color:#6e6257;white-space:nowrap}
.v{font:600 12px 'JetBrains Mono',monospace;white-space:nowrap}
.bt{position:absolute;height:22px;padding:0 9px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:4px;background:#fffdf9;font:600 11px Inter,system-ui,sans-serif;letter-spacing:0;color:${C.ink};white-space:nowrap;transition:background .15s,color .15s}
.bt.on{background:${C.ink};color:#fff;border-color:${C.ink}}
.bt.acc{background:${C.or};color:#fff;border-color:${C.or}}
.call{position:absolute;white-space:nowrap;transition:opacity .25s}
.call b{display:flex;align-items:center;gap:6px;font:600 11px Inter,system-ui,sans-serif;letter-spacing:0;color:${C.ink};background:rgba(252,249,244,.86);padding:1px 4px;border-radius:2px}
.call b i{display:block;width:6px;height:6px;background:${C.or}}
.call span{display:block;font:500 10px 'JetBrains Mono',monospace;letter-spacing:0;color:#7d7165;margin-top:1px;padding-left:16px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.or};opacity:0;z-index:49}
.cap{position:absolute;transition:opacity .35s}
.cap .k{font:600 11.5px Inter,system-ui,sans-serif;letter-spacing:0;color:#B8401A}
.cap .t{font-size:15px;font-weight:700;margin:3px 0 5px;letter-spacing:-.1px}
.cap .b{font-size:12.5px;line-height:1.45;color:#3d352e}
.cap .e{font:600 11.5px 'JetBrains Mono',monospace;color:${C.ink};background:#f4ebdc;border-radius:3px;padding:4px 7px;margin-top:6px;display:inline-block}
.back{position:absolute;pointer-events:auto;text-decoration:none;font:700 9px 'JetBrains Mono',monospace;letter-spacing:1.6px;color:#fff;opacity:.9}
.back:hover{opacity:1;text-decoration:underline}
.alert{position:absolute;font:700 9.5px 'JetBrains Mono',monospace;letter-spacing:1.4px;color:#fff;background:${C.or};padding:3px 8px;border-radius:3px;white-space:nowrap;transition:opacity .2s}
`;
// nhãn trong dữ liệu viết hoa: đổi sang chữ thường kiểu câu, giữ từ viết tắt ASCII ngắn (TCP, DH, PID, MOVEJ) và số
const ACR = new Set('ĐCT ĐCD TCP DH IK FK PID PD PI ISO ROS LDS IMU ESC PWM AMCL SLAM LIDAR MOVEJ MOVEL DOF RX RY RZ CPU GPU API EKF UR CW CCW BLDC AX OK DC USB SE TB GPS RPM'.split(' '));
export const sc = (t) => {
  const s = String(t ?? ''); if (/</.test(s)) return s; // HTML: giữ nguyên
  const up = (x) => x === x.toLocaleUpperCase('vi') && x !== x.toLocaleLowerCase('vi');
  const w = s.split(/(\s+)/).map((x) => { if (!up(x)) return x; const core = x.replace(/[^A-Za-z0-9À-ỹđĐ]/g, ''); if (/\d/.test(core) || ACR.has(core) || /^[A-Z]$/.test(core)) return x; return x.toLocaleLowerCase('vi'); }).join('');
  const i = w.search(/[A-Za-zÀ-ỹđĐ]/), j = s.search(/[A-Za-zÀ-ỹđĐ]/);
  return i < 0 || !up(s.charAt(j)) ? w : w.slice(0, i) + w.charAt(i).toLocaleUpperCase('vi') + w.slice(i + 1);
};
const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
const fx = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '—');
export {fx};

export function createUI(app, {theme = 'house'} = {}) {
  if (theme === 'house') Object.assign(C, HOUSE);
  const st = document.createElement('style'); st.textContent = CSS() + (theme === 'house' ? HOUSE_CSS : ''); document.head.appendChild(st);
  const root = el(`<div class="ui"></div>`); app.appendChild(root);
  const add = (h) => { const n = el(h); root.appendChild(n); return n; };
  const btn = {};
  const ui = {root, add, btn, spots: {}};

  ui.header = (o) => (theme === 'house' ? houseHeader(o) : warmHeader(o));
  // đầu bảng kiểu nhà: dải mỏng 64 px, huy hiệu tròn góc thay khối cam, số liệu chính một dòng bên phải
  const houseHeader = ({code, kicker, title, sub, right = []}) => {
    const bw = Math.max(44, Math.round(sc(code).length * 9 + 20)), tx = 28 + bw + 14;
    add(`<div style="position:absolute;left:28px;top:14px;width:${bw}px;height:44px;border-radius:13px;background:#f1f2f5;box-shadow:inset 0 0 0 .5px rgba(16,24,40,.08);display:flex;align-items:center;justify-content:center;font:700 14px 'Be Vietnam Pro',system-ui,sans-serif;color:#15171C;letter-spacing:-.2px">${sc(code)}</div>`);
    add(`<div class="sm" style="position:absolute;left:${tx}px;top:13px;font-size:12px">${sc(kicker)}</div>`);
    add(`<div style="position:absolute;left:${tx - 1}px;top:30px;display:flex;align-items:baseline;gap:14px;white-space:nowrap"><span style="font:600 24px/1.15 'Be Vietnam Pro',system-ui,sans-serif;letter-spacing:-.4px;color:#15171C">${title}</span><span class="sm" style="position:static;font-size:13px">${sc(sub)}</span></div>`);
    let x = 1572;
    [...right].reverse().forEach(([v, n], i) => {
      const w = Math.max(84, v.length * 12 + 18, Math.round(sc(n).length * 6.5 + 8));
      x -= w;
      if (i) add(`<div style="position:absolute;left:${x + w + 9}px;top:20px;width:1px;height:32px;background:#e7e9ed"></div>`);
      add(`<div style="position:absolute;left:${x}px;top:14px;width:${w}px;text-align:right;font:600 20px/1.2 'Be Vietnam Pro',system-ui,sans-serif;color:#15171C;letter-spacing:-.3px;font-variant-numeric:tabular-nums">${v}</div>`);
      add(`<div class="sm" style="position:absolute;left:${x}px;top:42px;width:${w}px;text-align:right">${sc(n)}</div>`);
      x -= 20;
    });
    add(`<div style="position:absolute;left:28px;top:72px;width:1544px;height:1px;background:#e7e9ed"></div>`);
  };
  const warmHeader = ({code, kicker, title, sub, right = [], hub, hubLabel = '← BÀI GIẢNG'}) => {
    add(`<div style="position:absolute;left:0;top:0;width:160px;height:89px;background:${C.or}"></div>`);
    add(`<div class="mo" style="position:absolute;left:24px;top:30px;color:#fff;font-size:22px;font-weight:700;letter-spacing:1px">${code}</div>`);
    if (hub) add(`<a class="back" href="${hub}" style="left:24px;top:63px">${hubLabel}</a>`);
    add(`<div class="sm" style="position:absolute;left:182px;top:20px">${sc(kicker)}</div>`);
    add(`<div style="position:absolute;left:181px;top:37px;font-size:31px;font-weight:700;letter-spacing:-.6px;line-height:1">${title} <span style="color:${C.or};font-weight:400">/</span></div>`);
    add(`<div class="sm" style="position:absolute;left:182px;top:76px;font-size:12px;color:${C.sub}">${sc(sub)}</div>`);
    right.forEach(([v, n], i) => {
      const x = 1110 + i * 120;
      if (i) add(`<div style="position:absolute;left:${x - 12}px;top:34px;width:1px;height:42px;background:${C.faint}"></div>`);
      add(`<div style="position:absolute;left:${x}px;top:32px;font-size:24px;font-weight:700;color:${i === 0 ? C.or : C.ink};letter-spacing:-.5px">${v}</div>`);
      add(`<div class="sm" style="position:absolute;left:${x}px;top:64px">${sc(n)}</div>`);
    });
  };
  ui.panel = (x, y, w, h, title, n) => {
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    if (title) add(`<div class="ph" style="left:${x + 14}px;top:${y + 12}px"><i></i>${sc(title)}</div>`);
    if (n) add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  ui.text = (x, y, html, cls = 'sm', style = '') => add(`<div class="${cls}" style="position:absolute;left:${x}px;top:${y}px;${style}">${cls === 'sm' ? sc(html) : html}</div>`);
  ui.rule = (x, y, w) => add(`<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:1px;background:${C.line}"></div>`);
  // thanh đo: nhãn trái, rãnh, số phải; set(k ∈ [0,1] hoặc [-1,1] nếu center, chữ, màu)
  ui.bar = (x, y, w, label, {lw = 52, vw = 64, center = false, mark = null} = {}) => {
    ui.text(x, y, label);
    const tx = x + lw, tw = w - lw - vw;
    add(`<div style="position:absolute;left:${tx}px;top:${y + 4}px;width:${tw}px;height:4px;background:${C.track};border-radius:2px"></div>`);
    if (center) add(`<div style="position:absolute;left:${tx + tw / 2}px;top:${y + 1}px;width:1px;height:10px;background:${C.faint}"></div>`);
    if (mark !== null) add(`<div style="position:absolute;left:${tx + tw * mark}px;top:${y + 1}px;width:1.5px;height:10px;background:${C.ink}"></div>`);
    const f = add(`<div style="position:absolute;left:${tx}px;top:${y + 4}px;height:4px;background:${C.or};border-radius:2px"></div>`);
    const v = add(`<div class="v" style="position:absolute;left:${x + w - vw + 4}px;top:${y - 2}px;width:${vw - 4}px;text-align:right"></div>`);
    return {set(k, txt, col) {
      k = Math.max(center ? -1 : 0, Math.min(1, k));
      if (center) { const a = tw / 2, l = k < 0 ? a + a * k : a; f.style.left = `${tx + l}px`; f.style.width = `${Math.abs(k) * a}px`; }
      else f.style.width = `${k * tw}px`;
      f.style.background = col || C.or; v.textContent = txt;
    }};
  };
  // biểu đồ: các chuỗi số trong khoảng [min,max]; set(arrays, {cursor, band})
  ui.chart = (x, y, w, h, {min = -1, max = 1, colors = [C.or, C.ink], dash = [], zero = true, labels = []} = {}) => {
    const s = add(`<svg style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${w}" height="${h}"></svg>`);
    const lim = {min, max};
    const Y = (v) => h - ((v - lim.min) / (lim.max - lim.min)) * h;
    return {lim, set(series, o = {}) {
      let g = `<rect x="0" y="0" width="${w}" height="${h}" fill="${C.chart}" stroke="${C.line}"/>`;
      for (let i = 1; i < 4; i++) g += `<line x1="0" x2="${w}" y1="${(h * i) / 4}" y2="${(h * i) / 4}" stroke="${C.line}" stroke-width=".6"/>`;
      if (zero && lim.min < 0 && lim.max > 0) g += `<line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.faint}"/>`;
      if (o.band) g += `<rect x="0" y="${Y(o.band[1])}" width="${w}" height="${Y(o.band[0]) - Y(o.band[1])}" fill="${C.or}" opacity=".08"/>`;
      series.forEach((arr, k) => {
        if (!arr || arr.length < 2) return;
        const n = arr.length; let d = '';
        for (let i = 0; i < n; i++) { const v = Math.max(lim.min, Math.min(lim.max, arr[i])); d += `${i ? 'L' : 'M'}${((i / (n - 1)) * w).toFixed(1)} ${Y(v).toFixed(1)}`; }
        g += `<path d="${d}" fill="none" stroke="${colors[k % colors.length]}" stroke-width="${k ? 1.2 : 1.6}" ${dash[k] ? `stroke-dasharray="${dash[k]}"` : ''}/>`;
      });
      if (o.cursor !== undefined) g += `<line x1="${o.cursor * w}" x2="${o.cursor * w}" y1="0" y2="${h}" stroke="${C.ink}" stroke-width=".8"/>`;
      if (o.extra) g += o.extra(Y, w, h);
      s.innerHTML = g;
    }};
  };
  ui.svg = (x, y, w, h) => add(`<svg style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${w}" height="${h}"></svg>`);
  ui.button = (key, x, y, w, label, cls = '') => {
    btn[key] = add(`<div class="bt ${cls}" style="left:${x}px;top:${y}px;width:${w}px">${sc(label)}</div>`);
    ui.spots[key] = [x + w / 2, y + 11];
    return btn[key];
  };
  // dãy nút tự xuống dòng; trả về y sau dòng cuối
  ui.buttons = (items, x0, y, wmax) => {
    let x = x0;
    for (const [key, label] of items) {
      const w = Math.round(theme === 'house' ? sc(label).length * 5.9 + 24 : label.length * 6.9 + 20);
      if (x + w > x0 + wmax) { x = x0; y += 29; }
      ui.button(key, x, y, w, label); x += w + 6;
    }
    return y + 29;
  };
  ui.setOn = (key, on) => btn[key]?.classList.toggle('on', !!on);
  // thanh trượt: live.js gắn vùng bấm theo ui.sliders
  ui.sliders = {};
  ui.slider = (key, x, y, w, label, {lw = 70, vw = 62} = {}) => {
    ui.text(x, y - 1, label);
    const tx = x + lw, tw = w - lw - vw;
    add(`<div style="position:absolute;left:${tx}px;top:${y + 4}px;width:${tw}px;height:3px;background:${C.track2};border-radius:2px"></div>`);
    const f = add(`<div style="position:absolute;left:${tx}px;top:${y + 4}px;height:3px;background:${C.ink};border-radius:2px"></div>`);
    const k = add(`<div style="position:absolute;left:${tx}px;top:${y - 1}px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;border:1.5px solid ${C.ink}"></div>`);
    const v = add(`<div class="v" style="position:absolute;left:${x + w - vw + 4}px;top:${y - 2}px;width:${vw - 4}px;text-align:right"></div>`);
    const s = {x: tx, w: tw, y: y + 5, set(t, txt) { t = Math.max(0, Math.min(1, t)); f.style.width = `${t * tw}px`; k.style.left = `${tx + t * tw}px`; v.textContent = txt; s.t = t; }, t: 0};
    ui.sliders[key] = s;
    return s;
  };
  // lời giảng của từng bước
  ui.caption = (x, y, w, h, title = 'BÀI GIẢNG') => {
    // house: dòng chủ đề của từng bước thay cho tiêu đề chung "Bài giảng", nên lời giảng có thêm một dòng
    ui.panel(x, y, w, h, theme === 'house' ? '' : title, '');
    const box = add(`<div class="cap" style="left:${x + 14}px;top:${y + (theme === 'house' ? 13 : 36)}px;width:${w - 28}px"></div>`);
    const prog = add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px"></div>`);
    let last = '';
    return {set(c, i, n) {
      const key = c ? c.t + i : '';
      if (key === last) return; last = key;
      prog.textContent = c ? `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}` : '';
      box.style.opacity = 0;
      setTimeout(() => { box.innerHTML = c ? `<div class="k">${c.k || ''}</div><div class="t">${c.t}</div><div class="b">${c.b}</div>${c.e ? `<div class="e">${c.e}</div>` : ''}` : ''; box.style.opacity = 1; }, 160);
    }};
  };
  // nhãn có đường dẫn: items [{key,title,sub}] ; update([{key, p:[x,y]|null, dx, dy}], k)
  const leaderSvg = add(`<svg style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const calls = {};
  ui.callouts = (items) => { for (const it of items) calls[it.key] = add(`<div class="call" style="opacity:0"><b><i></i>${sc(it.title)}</b>${it.sub ? `<span>${sc(it.sub)}</span>` : ''}</div>`); };
  ui.drawCallouts = (list, k = 1) => {
    let g = '';
    const seen = new Set();
    for (const c of list) {
      const n = calls[c.key]; if (!n) continue; seen.add(c.key);
      if (!c.p || k < 0.02) { n.style.opacity = 0; continue; }
      const [px, py] = c.p, lx = px + (c.dx ?? 60), ly = py + (c.dy ?? -40);
      n.style.opacity = k; n.style.left = `${lx + (c.dx < 0 ? -n.offsetWidth : 0)}px`; n.style.top = `${ly - 8}px`;
      g += `<path d="M${px} ${py}L${lx} ${ly}" stroke="${C.ink}" stroke-width=".8" fill="none" opacity="${k}"/><circle cx="${px}" cy="${py}" r="2.4" fill="${C.dot || C.or}" opacity="${k}"/>`;
    }
    for (const [key, n] of Object.entries(calls)) if (!seen.has(key)) n.style.opacity = 0;
    leaderSvg.innerHTML = g;
  };
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  ui.pointer = (c) => {
    cur.style.display = c.x < 0 ? 'none' : 'block';
    cur.style.transform = `translate(${(c.x - 3).toFixed(1)}px, ${(c.y - 2).toFixed(1)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`; ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String(c.ring * 0.85); ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
  };
  ui.alert = (x, y) => { const n = add(`<div class="alert" style="left:${x}px;top:${y}px;opacity:0"></div>`); return {set(t) { n.style.opacity = t ? 1 : 0; if (t) n.textContent = t; }}; };
  return ui;
}
