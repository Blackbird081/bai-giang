// Tra cứu loài: dữ liệu hô hấp của mọi loài cá có bản ghi trên FishBase v25.04, đã qua Refinery
// (tools/refinery: mỗi giá trị dẫn về một dòng của bản chụp, cổng chặn số bịa, auditor dựng lại).
// Tệp fish/loai.json chỉ tải khi mở bảng. Số suy ra ở đây (mm²/g, lít nước mỗi phút) là phép tính của bài.
import {o2Sat, UTIL} from './kin.js';

const ENV = {demersal: 'sống đáy', benthopelagic: 'tầng đáy–nổi', 'reef-associated': 'quanh rạn', 'pelagic-neritic': 'nổi ven bờ', 'pelagic-oceanic': 'nổi đại dương', pelagic: 'tầng nổi', bathydemersal: 'đáy biển sâu', bathypelagic: 'tầng nổi biển sâu'};
const LV = {standard: 'chuẩn (SMR)', routine: 'thường ngày'};
const AIR = {WaterAssumed: 'không ghi nhận (mặc định thở nước)', Facultative: 'có, khi cần', Obligate: 'bắt buộc', FacultativeObligate: 'có, khi cần hoặc bắt buộc', FacultativeGenus: 'có ở cùng chi, khi cần'};
const tick = (v) => (v < 1 ? String(v).replace('.', ',') : v >= 10000 ? '10' + ['⁴', '⁵', '⁶'][Math.round(Math.log10(v)) - 4] : fmt(v));
const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const fmt = (v, d = 0) => (v == null ? '—' : Number(v).toLocaleString('vi-VN', {maximumFractionDigits: d, minimumFractionDigits: 0}));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// lít nước phải qua mang mỗi phút cho 1 kg cá ở đúng điều kiện của bản ghi (ô xi bão hoà theo nhiệt độ, độ mặn ghi trong bản ghi)
export const waterOf = (r) => (r.m != null && r.t != null ? r.m / (o2Sat(r.t, r.s ?? 0) * UTIL) / 60 : null);
const median = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
const ODD = {g: 2000, o: 2000}; // giá trị lạ so với phần lớn số đo: vẫn hiện, gắn cờ, mời đọc tài liệu gốc

export function createLookup({url, models, onModel}) {
  let data = null, sel = null, q = '', only = '';
  const el = document.createElement('div');
  el.className = 'tc';
  el.innerHTML = `<style>
.tc{position:fixed;inset:5vh 4vw;z-index:2147483000;display:none;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(8,20,36,.35);font:13px/1.45 'Be Vietnam Pro',system-ui,sans-serif;color:#15171C;overflow:hidden}
.tc.on{display:grid;grid-template-columns:minmax(240px,320px) 1fr;grid-template-rows:auto 1fr}
.tc header{grid-column:1/3;display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e8eaee}
.tc header b{font-size:16px}.tc header small{color:#6b7280}.tc header button{margin-left:auto}
.tc button{font:600 12px 'Be Vietnam Pro',system-ui,sans-serif;border:1px solid #e3e6ea;background:#fff;border-radius:999px;padding:5px 12px;cursor:pointer;color:#15171C}
.tc button.on{background:#15171C;color:#fff;border-color:#15171C}.tc button.acc{background:#E8590C;color:#fff;border-color:#E8590C}
.tc .ls{border-right:1px solid #e8eaee;display:flex;flex-direction:column;min-height:0}
.tc .ls input{margin:12px 12px 6px;padding:8px 10px;border:1px solid #e3e6ea;border-radius:8px;font:13px 'Be Vietnam Pro',system-ui,sans-serif}
.tc .chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 8px}
.tc .list{overflow:auto;flex:1;min-height:0}
.tc .it{padding:7px 14px;border-top:1px solid #f1f2f4;cursor:pointer}.tc .it:hover{background:#f6f7f9}.tc .it.on{background:#fff4ec}
.tc .it i{font-style:italic}.tc .it span{display:block;color:#6b7280;font-size:11.5px}
.tc .dt{overflow:auto;padding:16px 20px;min-height:0}
.tc .dt h3{margin:0;font-size:20px;font-style:italic}.tc .dt .au{color:#6b7280;font-size:12px}
.tc .facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 18px;margin:12px 0}
.tc .facts div{font-size:12px;color:#6b7280}.tc .facts div b{display:block;color:#15171C;font-size:13px;font-weight:600}
.tc .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin:8px 0}
.tc .card{border:1px solid #eceef1;border-radius:12px;padding:10px 12px;overflow-x:auto}.tc .card h4{margin:0 0 4px;font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:#4b5563}
.tc table{border-collapse:collapse;width:100%;font-size:12px}.tc td,.tc th{padding:4px 6px;border-bottom:1px solid #f1f2f4;text-align:left;vertical-align:top}.tc th{color:#6b7280;font-weight:600}
.tc .num{font-variant-numeric:tabular-nums;text-align:right}.tc .odd{color:#b45309}
.tc .note{color:#6b7280;font-size:11.5px;margin-top:10px}
.tc .cc{color:#15803d;font-weight:700;font-size:10px;margin-left:3px}.tc .tcv{color:#b45309;white-space:nowrap}.tc .tcv small{color:#6b7280;font-weight:400}.tc tr.goc td:first-child{box-shadow:inset 3px 0 #15803d}.tc .gnote{font-size:12px;margin:6px 0 0;padding-left:16px}.tc .gnote li{margin:3px 0}.tc .gx{color:#6b7280;font-size:11px}
@media (max-width:760px){.tc{inset:50px 0 82px;border-radius:0} /* chừa thanh đầu và thanh bước của khung bài */.tc.on{grid-template-columns:1fr;grid-template-rows:auto 38vh 1fr}.tc header{grid-column:1;flex-wrap:wrap;gap:4px 12px;padding:10px 14px}.tc header small{order:3;flex:1 1 100%;font-size:11px}.tc .ls{border-right:0;border-bottom:1px solid #e8eaee}.tc .tcv{white-space:normal}.tc .dt{padding:12px 12px}}
</style>
<header><b>Tra cứu loài</b><small data-k="count">đang tải dữ liệu FishBase…</small><button data-k="close" aria-label="Đóng">Đóng</button></header>
<div class="ls"><input data-k="q" placeholder="Tên khoa học, tên Việt, tên Anh, họ…" aria-label="Tìm loài"><div class="chips"><button data-f="">Tất cả</button><button data-f="g">Có đo mang</button><button data-f="o">Có đo ô xi</button><button data-f="m">Có mô hình 3D</button><button data-f="a">Thở khí trời</button><button data-f="c">Đã đối chiếu bài gốc</button></div><div class="list" data-k="list"></div></div>
<div class="dt" data-k="dt"></div>`;
  document.body.appendChild(el);
  const $ = (k) => el.querySelector(`[data-k="${k}"]`);
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('wheel', (e) => e.stopPropagation(), {passive: true});
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') api.close(); });
  $('close').onclick = () => api.close();
  $('q').oninput = (e) => { q = strip(e.target.value); renderList(); };
  el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { only = b.dataset.f; renderList(); }));
  $('list').onclick = (e) => { const it = e.target.closest('[data-s]'); if (it) { sel = it.dataset.s; renderList(); renderDetail(); } };
  $('dt').onclick = (e) => { const b = e.target.closest('[data-model]'); if (b) { api.close(); onModel(b.dataset.model); } };

  const viName = (s) => s.vi.find((n) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(n)) || s.vi[0] || '';
  const checked = (s) => s.g.some((r) => r.goc) || s.o.some((r) => r.goc);
  const hit = (s) => (!only || (only === 'g' ? s.g.length : only === 'o' ? s.o.length : only === 'a' ? s.air && s.air !== 'WaterAssumed' : only === 'c' ? checked(s) : models[s.sci])) && (!q || s._k.includes(q));
  // một ô số: ✓✓ khi FishBase khớp bài gốc; hai giá trị khi lệch (giữ cả hai, không tự chọn)
  const cell = (r, k, d) => (r.tc && r.tc[k] ? `<span class="tcv" title="FishBase và bài gốc lệch nhau">${r.tc[k].map(([v, src]) => `${fmt(v, d)} <small>${src === 'goc' ? 'bài gốc' : 'FishBase'}</small>`).join(' · ')}</span>` : fmt(r[k], d) + (r.kc && r.kc.includes(k) ? '<span class="cc" title="Khớp bài báo gốc">✓✓</span>' : ''));
  const byGoc = (a) => [...a].sort((x, y) => (y.goc ? 1 : 0) - (x.goc ? 1 : 0));

  function renderList() {
    el.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === only));
    if (!data) return;
    const list = data.loai.filter(hit);
    $('list').innerHTML = list.map((s) => `<div class="it${s.sci === sel ? ' on' : ''}" data-s="${esc(s.sci)}"><i>${esc(s.sci)}</i>${models[s.sci] ? ' · 3D' : ''}${[...s.g, ...s.o].some((r) => r.kc) ? ' · <span class="cc" style="display:inline;font-size:11px" title="Có số khớp bài báo gốc">✓✓</span>' : ''}<span>${esc([viName(s), s.en, s.fam].filter(Boolean).join(' · '))}${s.g.length ? ` · ${s.g.length} đo mang` : ''}${s.o.length ? ` · ${s.o.length} đo ô xi` : ''}</span></div>`).join('') || '<div class="it">Không có loài khớp.</div>';
    $('count').textContent = `${list.length}/${data.loai.length} loài · ${data.mau_so.ban_ghi_lay.toLocaleString('vi-VN')} bản ghi đo, lấy từ ${data.mau_so.ban_ghi_goc.toLocaleString('vi-VN')} bản ghi gốc · FishBase có ${data.mau_so.loai_fishbase.toLocaleString('vi-VN')} loài · ${data.loai.filter(checked).length} loài có bản ghi đã đối chiếu bài gốc`;
  }

  // biểu đồ phân tán, trục log; điểm của mọi loài màu xám, loài đang chọn màu cam
  function scatter(pts, on, {xlog, x0, x1, y0, y1, xl, yl}) {
    const W = 300, H = 170, L = 36, B = 22, X = (v) => L + ((xlog ? Math.log10(v) - Math.log10(x0) : v - x0) / (xlog ? Math.log10(x1) - Math.log10(x0) : x1 - x0)) * (W - L - 6), Y = (v) => H - B - ((Math.log10(v) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0))) * (H - B - 6);
    const ok = (p) => p[0] != null && p[1] > 0 && (!xlog || p[0] > 0);
    let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img"><rect x="${L}" y="6" width="${W - L - 6}" height="${H - B - 6}" fill="#f8f9fb"/>`;
    for (let e = Math.ceil(Math.log10(y0)); e <= Math.log10(y1); e++) g += `<line x1="${L}" x2="${W - 6}" y1="${Y(10 ** e)}" y2="${Y(10 ** e)}" stroke="#e6e8ec"/><text x="${L - 4}" y="${Y(10 ** e) + 3}" text-anchor="end" font-size="8.5" fill="#6b7280">${tick(10 ** e)}</text>`;
    const xt = xlog ? [...Array(Math.round(Math.log10(x1 / x0)) + 1)].map((_, i) => x0 * 10 ** i) : [0, 10, 20, 30, 40].filter((v) => v >= x0 && v <= x1);
    for (const v of xt) g += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" font-size="8.5" fill="#6b7280">${xlog ? tick(v) : fmt(v)}</text>`;
    g += pts.filter(ok).map((p) => `<circle cx="${X(Math.min(x1, Math.max(x0, p[0]))).toFixed(1)}" cy="${Y(Math.min(y1, Math.max(y0, p[1]))).toFixed(1)}" r="1.6" fill="#9aa3af" opacity=".45"/>`).join('');
    g += on.filter(ok).map((p) => `<circle cx="${X(Math.min(x1, Math.max(x0, p[0]))).toFixed(1)}" cy="${Y(Math.min(y1, Math.max(y0, p[1]))).toFixed(1)}" r="3.6" fill="#E8590C" stroke="#fff" stroke-width="1"/>`).join('');
    return g + `<text x="${W - 6}" y="${H - 1}" text-anchor="end" font-size="8.5" fill="#4b5563">${xl}</text><text x="2" y="12" font-size="8.5" fill="#4b5563">${yl}</text></svg>`;
  }

  function renderDetail() {
    const s = data && data.loai.find((x) => x.sci === sel);
    if (!s) { $('dt').innerHTML = '<p class="note">Chọn một loài ở danh sách bên trái.</p>'; return; }
    const allG = data.loai.flatMap((x) => x.g.map((r) => [r.w, (r.a * 100) / r.w])), allO = data.loai.flatMap((x) => x.o.map((r) => [r.t, r.m]));
    const myG = s.g.map((r) => [r.w, (r.a * 100) / r.w]), myO = s.o.map((r) => [r.t, r.m]);
    const water = median(s.o.map(waterOf));
    const facts = [['Tên Việt trên FishBase', s.vi.length ? s.vi.map(esc).join('; ') : '—'], ['Tên Anh', esc(s.en || '—')], ['Họ · bộ', esc([s.fam, s.ord].filter(Boolean).join(' · ') || '—')],
      ['Môi trường', esc(ENV[s.env] || s.env || '—')], ['Vùng nước', esc(s.water || '—')], ['Dài tối đa', esc(s.maxL || '—')], ['Kiểu bơi', esc(s.swim || '—')], ['Thở khí trời', esc(AIR[s.air] || s.air || '—')], ['Kiểu thở (bơm/ép dòng)', 'chưa có trong FishBase']];
    $('dt').innerHTML = `<h3>${esc(s.sci)}</h3><div class="au">${esc(s.au || '')}${models[s.sci] ? ` · có mô hình 3D: <button class="acc" data-model="${esc(models[s.sci])}">Xem trong bể</button>` : ''}</div>
<div class="facts">${facts.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('')}</div>
<div class="charts"><div class="card"><h4>Diện tích mang mỗi gam theo khối lượng</h4>${scatter(allG, myG, {xlog: true, x0: 0.1, x1: 100000, y0: 1, y1: 5000, xl: 'khối lượng cá (g)', yl: 'mm² mang / g'})}</div>
<div class="card"><h4>Tiêu hao ô xi lúc nghỉ theo nhiệt độ</h4>${scatter(allO, myO, {xlog: false, x0: -2, x1: 40, y0: 1, y1: 30000, xl: 'nhiệt độ nước (°C)', yl: 'mg O₂/kg/h'})}</div></div>
${water != null ? `<p><b>Nước qua mang (tính):</b> trung vị ${fmt(water, 2)} L/phút cho 1 kg cá, từ ${s.o.length} bản ghi; mỗi bản ghi lấy ô xi bão hoà ở đúng nhiệt độ và độ mặn của nó, mang lấy 75 % (giả định).</p>` : ''}
${s.g.length ? `<div class="card"><h4>Đo diện tích mang (${s.g.length})</h4><table><tr><th>#</th><th class="num">Khối lượng (g)</th><th class="num">Diện tích (cm²)</th><th class="num">mm²/g (tính)</th><th class="num">Hàng rào (µm)</th><th>Tài liệu gốc</th></tr>${byGoc(s.g).map((r) => { const pg = (r.a * 100) / r.w; return `<tr${r.goc ? ' class="goc"' : ''}><td>${r.id}</td><td class="num">${cell(r, 'w', 2)}</td><td class="num">${cell(r, 'a', 2)}</td><td class="num${pg > ODD.g ? ' odd' : ''}">${fmt(pg)}${pg > ODD.g ? ' ⚑' : ''}${r.ga != null ? `<br><span class="gx">bài gốc ghi ${fmt(r.ga)}</span>` : ''}</td><td class="num">${cell(r, 'bw', 2)}</td><td>${esc(r.ref || '—')}</td></tr>`; }).join('')}</table></div>` : ''}
${s.o.length ? `<div class="card" style="margin-top:12px"><h4>Đo tiêu hao ô xi lúc nghỉ (${s.o.length})</h4><table><tr><th>#</th><th class="num">Khối lượng (g)</th><th class="num">°C</th><th class="num">‰</th><th>Mức</th><th class="num">mg O₂/kg/h</th><th class="num">L/phút/kg (tính)</th><th>Tài liệu gốc</th></tr>${byGoc(s.o).slice(0, 60).map((r) => `<tr${r.goc ? ' class="goc"' : ''}><td>${r.id}</td><td class="num">${cell(r, 'w', 2)}</td><td class="num">${cell(r, 't', 1)}</td><td class="num">${cell(r, 's', 1)}</td><td>${LV[r.lv] || esc(r.lv)}</td><td class="num${r.m > ODD.o ? ' odd' : ''}">${cell(r, 'm', 1)}${r.m > ODD.o ? ' ⚑' : ''}</td><td class="num">${fmt(waterOf(r), 2)}</td><td>${esc(r.ref || '—')}</td></tr>`).join('')}</table>${s.o.length > 60 ? `<p class="note">Hiện 60/${s.o.length} bản ghi đầu.</p>` : ''}</div>` : ''}
${goc(s)}
<p class="note">Số liệu như FishBase v25.04 ghi (CC BY-NC 3.0), mỗi giá trị dẫn về một dòng của bản chụp trong tools/refinery. ✓✓: số FishBase khớp dòng tương ứng trong bài báo gốc; đó là kiểm chép (hai bên cùng một thí nghiệm), không phải phép đo thứ hai. Ô có hai giá trị: FishBase và bài gốc lệch nhau, bài giữ cả hai. ⚑: lạ so với phần lớn số đo (trên 2000), nên đọc tài liệu gốc trước khi dùng. "Tính" là phép tính của bài, không phải số FishBase. Tên Việt giữ nguyên chính tả như FishBase.</p>`;
    $('dt').scrollTop = 0;
  }

  // khung đối chiếu: bài gốc, ghi chú lệch, ghi chú soát OCR
  function goc(s) {
    const rs = [...s.g, ...s.o].filter((r) => r.goc);
    if (!rs.length) return '';
    const NAME = {w: 'khối lượng', t: 'nhiệt độ', m: 'ô xi', bw: 'hàng rào', s: 'độ mặn'};
    const papers = [...new Set(rs.map((r) => r.goc))];
    return `<div class="card" style="margin-top:12px"><h4>Đối chiếu với bài báo gốc</h4>${papers.map((k) => { const b = data.bai_goc[k], mine = rs.filter((r) => r.goc === k);
      const lines = mine.flatMap((r) => [...(r.gc || []).map((t) => `#${r.id}: ${esc(t)}`), ...Object.entries(r.sx || {}).map(([f, t]) => `#${r.id} · soát ${NAME[f] || f}: ${esc(t)}`)]);
      const uniq = [...new Set(lines.map((l) => l.replace(/^#\d+/, '')))].map((t) => { const ids = lines.filter((l) => l.replace(/^#\d+/, '') === t).map((l) => l.match(/^#(\d+)/)[1]); return `#${ids.join(', #')}${t}`; });
      return `<p style="margin:8px 0 0"><b>${esc(b.cite)}</b> · <a href="https://doi.org/${esc(b.doi)}" target="_blank" rel="noopener">doi:${esc(b.doi)}</a><br><span class="gx">${mine.length} bản ghi · ${((n) => (n ? `${n} ô khớp ✓✓` : 'chưa ô nào đối chiếu được'))(mine.reduce((n, r) => n + (r.kc || []).length, 0))}${mine.some((r) => r.tc) ? ` · ${mine.filter((r) => r.tc).length} ô lệch` : ''}</span></p>${uniq.length ? `<ul class="gnote">${uniq.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}`; }).join('')}
<p class="note">Bài lấy từ J-STAGE (truy cập mở). Bài chỉ có ảnh quét được đọc bằng OCR rồi soát từng số với ảnh trang. Số chỉ có trên đồ thị không đối chiếu được.</p></div>`;
  }

  const api = {
    isOpen: () => el.classList.contains('on'),
    async open(sci) {
      el.classList.add('on');
      if (!data) {
        try { data = await (await fetch(url)).json(); } catch { $('count').textContent = 'Không tải được dữ liệu tra cứu.'; return; }
        for (const s of data.loai) s._k = strip([s.sci, s.en, s.fam, s.ord, ...s.vi].join(' '));
      }
      if (sci && data.loai.some((s) => s.sci === sci)) sel = sci;
      else if (!sel) sel = data.loai[0].sci;
      renderList(); renderDetail();
      el.querySelector(`.it.on`)?.scrollIntoView({block: 'nearest'});
    },
    close() { el.classList.remove('on'); },
    toggle(sci) { if (api.isOpen()) api.close(); else api.open(sci); },
  };
  return api;
}
