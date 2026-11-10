/* Vỏ Sáng Ăn Khoai (bg-shell) v2 · một tệp, không phụ thuộc, nhúng vào mọi bài 3D.
 * Cho mọi bài cùng một khung:
 *   - Thanh đầu bài: về trang chính · chủ đề / tên bài · tiến độ bước · bảng của bài · Lên lớp · Bài sau · menu.
 *   - Ngăn kéo: bảng của bài trượt ra/vào từ thanh đầu bài (cảnh 3D là màn hình, bảng là chú thích).
 *   - Điện thoại: thanh dưới (bước trước · bước · bước sau), vuốt ngang trên thanh để chuyển bước.
 *   - Lên lớp: phím mũi tên, PageUp/PageDown (bút trình chiếu), B màn đen, F toàn màn hình; màn hình giáo viên
 *     (cửa sổ thứ hai) và điều khiển bằng điện thoại (WebRTC qua PeerJS, chỉ tải khi bấm, cần mạng).
 *   - Chế độ Máy chiếu: tương phản cao, chữ lớn hơn; nhớ trên máy. Bài thứ tự, "Bài tiếp theo" cuối bài.
 *   - Trợ năng: nhãn cho mọi nút, vùng báo bước cho trình đọc màn hình, giảm chuyển động theo cài đặt máy.
 * Gắn bài: BGShell.mount({ id, title, subject, crumb, next, steps:[{t, note, ask, sr}], go(i), end(), panels, credit, … })
 * Bài tự chuyển bước thì báo: BGShell.update(i). Xem docs/he-thiet-ke.md. Mã MIT, repo nclamvn/bai-giang.
 */
(function () {
  'use strict';
  if (window.BGShell && window.BGShell.version) return;
  const VERSION = '2.2.0';
  const SITE = 'https://nclamvn.github.io/bai-giang/';
  const REMOTE_URL = SITE + 'dieu-khien/';
  const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const QRLIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  // mã băm toàn vẹn (tools/sri.py): CDN có bị tráo tệp thì trình duyệt từ chối chạy
  const SRI = { [PEERJS]: 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR', [QRLIB]: 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k' };

  /*TOKENS:start*/
  // sinh bằng tools/design.py từ design/tokens.json; không sửa tay
  const TOKENS_CSS = ":root{--bg-page:#F3EFE6;--bg-surface:#FBF9F4;--bg-glass:rgba(251,249,244,.88);--bg-glass-strong:rgba(251,249,244,.96);--bg-ink:#1D1B16;--bg-ink2:#4B473D;--bg-ink3:#5A5548;--bg-hair:rgba(29,27,22,.13);--bg-hair2:rgba(29,27,22,.26);--bg-brand:#1D1B16;--bg-brand-ink:#F3EFE6;--bg-nhan:#A8481C;--bg-focus:#2F6FEB;--bg-ok:#1F7A4D;--bg-warn:#8A5200;--bg-bad:#B3261E;--bg-scrim:rgba(29,27,22,.36);--bg-s-sinh:#C2184A;--bg-s-su:#B26A1A;--bg-s-robo:#D9481C;--bg-s-ly:#2459C9;--bg-s-hoa:#0E7C66;--bg-s-toan:#6B4BC8;--bg-s-dia:#2E7D32;--bg-s-cong:#5B6472;--bg-fs-xs:calc(13px * var(--bg-k));--bg-fs-sm:calc(15px * var(--bg-k));--bg-fs-md:calc(17px * var(--bg-k));--bg-fs-lg:calc(20px * var(--bg-k));--bg-fs-xl:calc(26px * var(--bg-k));--bg-fs-2xl:calc(34px * var(--bg-k));--bg-fs-3xl:calc(48px * var(--bg-k));--bg-k:1;--bg-font:\"Be Vietnam Pro\", system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;--bg-serif:\"Noto Serif\", Georgia, \"Times New Roman\", serif;--bg-mono:\"JetBrains Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace;--bg-r-lg:20px;--bg-r-md:14px;--bg-r-sm:10px;--bg-r-pill:999px;--bg-sh-1:0 0 0 .5px rgba(29,27,22,.08), 0 6px 18px -10px rgba(29,27,22,.26);--bg-sh-2:0 0 0 .5px rgba(29,27,22,.08), 0 18px 44px -18px rgba(29,27,22,.32);--bg-blur:blur(20px) saturate(170%);--bg-t-fast:120ms;--bg-t-mid:240ms;--bg-t-slow:600ms;--bg-ease:cubic-bezier(.2,.8,.2,1);--bg-ease-io:cubic-bezier(.65,0,.35,1);--bg-bar:56px;--bg-tap:44px;--bg-accent:var(--bg-brand)}\n@media (max-width:640px),(max-height:520px){:root{--bg-bar:48px;--bg-fs-xs:calc(14px * var(--bg-k))}}\nhtml[data-chieu]{--bg-ink:#000000;--bg-ink2:#141414;--bg-ink3:#262626;--bg-glass:#FFFFFF;--bg-glass-strong:#FFFFFF;--bg-hair:rgba(0,0,0,.30);--bg-hair2:rgba(0,0,0,.45);--bg-blur:none;--bg-k:1.25}\n@media (prefers-reduced-motion:reduce){:root{--bg-t-fast:1ms;--bg-t-mid:1ms;--bg-t-slow:1ms}}\n";
  const FONTFACE = (root) => { const U = {"latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD", "vietnamese": "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"}; return [["Be Vietnam Pro", 400, "be-vietnam-pro"], ["Be Vietnam Pro", 500, "be-vietnam-pro"], ["Be Vietnam Pro", 600, "be-vietnam-pro"], ["Be Vietnam Pro", 700, "be-vietnam-pro"], ["Noto Serif", 400, "noto-serif"], ["Noto Serif", 600, "noto-serif"], ["JetBrains Mono", 500, "jetbrains-mono"], ["JetBrains Mono", 600, "jetbrains-mono"]].map(([f, w, s]) => ['latin', 'vietnamese'].map((u) => `@font-face{font-family:'${f}';font-style:normal;font-weight:${w};font-display:swap;src:url(${root}design/fonts/${s}-${u}-${w}-normal.woff2) format('woff2');unicode-range:${U[u]}}`).join('\n')).join('\n'); };
  const ICON_PATHS = {"home": "<path d=\"M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z\"/>", "chev-l": "<path d=\"m14.5 6-6 6 6 6\"/>", "chev-r": "<path d=\"m9.5 6 6 6-6 6\"/>", "arrow-r": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>", "arrow-l": "<path d=\"M19 12H5M11 6l-6 6 6 6\"/>", "play": "<path d=\"M8 5.5v13l10.5-6.5z\" fill=\"currentColor\"/>", "stop": "<rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2\" fill=\"currentColor\"/>", "phone": "<rect x=\"7\" y=\"2.75\" width=\"10\" height=\"18.5\" rx=\"2.5\"/><path d=\"M11 18h2\"/>", "screen": "<rect x=\"3\" y=\"4.5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8.5 20h7M12 16.5V20\"/>", "full": "<path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"/>", "more": "<circle cx=\"5.5\" cy=\"12\" r=\"1.4\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\"/><circle cx=\"18.5\" cy=\"12\" r=\"1.4\" fill=\"currentColor\"/>", "close": "<path d=\"M6 6l12 12M18 6 6 18\"/>", "list": "<path d=\"M9 6.5h11M9 12h11M9 17.5h11\"/><circle cx=\"4.75\" cy=\"6.5\" r=\"1.1\" fill=\"currentColor\"/><circle cx=\"4.75\" cy=\"12\" r=\"1.1\" fill=\"currentColor\"/><circle cx=\"4.75\" cy=\"17.5\" r=\"1.1\" fill=\"currentColor\"/>", "chart": "<path d=\"M4 20V4M4 20h16\"/><path d=\"m7.5 15 3.5-4 3 2.5 5-6.5\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5.5M12 7.6v.1\"/>", "sliders": "<path d=\"M4 7h10M18 7h2M4 17h4M12 17h8\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/><circle cx=\"10\" cy=\"17\" r=\"2\"/>", "book": "<path d=\"M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z\"/>", "keys": "<rect x=\"2.75\" y=\"6\" width=\"18.5\" height=\"12\" rx=\"2\"/><path d=\"M6.5 10h1M10 10h1M13.5 10h1M17 10h.5M7.5 14h9\"/>", "projector": "<rect x=\"2.75\" y=\"8\" width=\"18.5\" height=\"9\" rx=\"2\"/><circle cx=\"15.5\" cy=\"12.5\" r=\"2.25\"/><path d=\"M6 12.5h4M6 17v2M18 17v2\"/>", "check": "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>", "filter": "<path d=\"M4 6h16M7 12h10M10 18h4\"/>", "external": "<path d=\"M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5\"/>", "download": "<path d=\"M12 4v11M7 10.5l5 5 5-5M5 20h14\"/>", "hand": "<path d=\"M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.6 15.4a1.5 1.5 0 0 1 2.3-1.9L8 15\"/>", "rotate": "<path d=\"M20 12a8 8 0 1 1-2.35-5.65M20 4v4.5h-4.5\"/>", "pinch": "<path d=\"M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3\"/><path d=\"M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4\"/>", "tap": "<circle cx=\"12\" cy=\"9\" r=\"3\"/><path d=\"M12 15v5M8.5 5.5a5 5 0 0 1 7 0\"/>", "black": "<rect x=\"3\" y=\"4.5\" width=\"18\" height=\"12\" rx=\"2\" fill=\"currentColor\"/><path d=\"M8.5 20h7M12 16.5V20\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>", "help": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.6M12 17v.1\"/>", "layers": "<path d=\"m12 4 8.5 4.5L12 13 3.5 8.5z\"/><path d=\"m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5\"/>", "grad": "<path d=\"m2.5 9 9.5-4.5L21.5 9 12 13.5z\"/><path d=\"M6.5 11v4.5c1.5 1.5 3.4 2.25 5.5 2.25s4-.75 5.5-2.25V11M21.5 9v5\"/>", "spark": "<path d=\"M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6\"/>"};
  const SUBJECT = {"sinh": "#C2184A", "su": "#B26A1A", "robo": "#D9481C", "ly": "#2459C9", "hoa": "#0E7C66", "toan": "#6B4BC8", "dia": "#2E7D32", "cong": "#5B6472"};
  const LOGO_SRC = "data:image/webp;base64,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";
  /*TOKENS:end*/

  const ico = (n) => `<svg class="bgs-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[n] || ''}</svg>`;
  const LOGO = `<img class="bgs-logo" src="${LOGO_SRC}" alt="" width="30" height="30">`;

  const CSS = `
  .bgs,.bgs *{box-sizing:border-box}
  .bgs{position:fixed;z-index:2147483000;font:500 var(--bg-fs-sm)/1.4 var(--bg-font);color:var(--bg-ink);-webkit-font-smoothing:antialiased;letter-spacing:0}
  :where(.bgs) button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;margin:0;padding:0}
  .bgs a{color:inherit;text-decoration:none}
  .bgs-i{width:20px;height:20px;flex:none;display:block}
  .bgs-glass{background:var(--bg-glass);-webkit-backdrop-filter:var(--bg-blur);backdrop-filter:var(--bg-blur);box-shadow:var(--bg-sh-1)}
  .bgs :focus-visible{outline:2px solid var(--bg-focus);outline-offset:2px}
  /* thanh đầu bài */
  .bgs-bar{left:0;right:0;top:0;height:calc(var(--bg-bar) + env(safe-area-inset-top));padding:env(safe-area-inset-top) max(12px,env(safe-area-inset-right)) 0 max(12px,env(safe-area-inset-left));display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bg-hair)}
  .bgs-home{display:flex;align-items:center;gap:9px;height:40px;padding:0 10px 0 4px;border-radius:var(--bg-r-sm);flex:none}
  .bgs-home:hover{background:var(--bg-hair)}
  .bgs-logo{width:30px;height:30px;flex:none;display:block;object-fit:contain}
  .bgs-home b{font-weight:700;font-size:var(--bg-fs-sm);letter-spacing:-.01em}
  .bgs-sep{width:1px;height:24px;background:var(--bg-hair2);flex:none;margin:0 4px}
  .bgs-crumb{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;line-height:1.2}
  .bgs-crumb .s{font-size:var(--bg-fs-xs);color:var(--bg-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bgs-crumb .s a:hover{color:var(--bg-ink);text-decoration:underline;text-underline-offset:2px}
  .bgs-crumb h1{margin:1px 0 0;font:700 var(--bg-fs-md)/1.2 var(--bg-font);letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bgs-tools{display:flex;align-items:center;gap:6px;flex:none}
  .bgs-b{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;min-width:40px;padding:0 12px;border-radius:var(--bg-r-sm);font-weight:600;white-space:nowrap;transition:background var(--bg-t-fast) var(--bg-ease),color var(--bg-t-fast)}
  .bgs-b:hover{background:var(--bg-hair)}
  .bgs-b[aria-pressed="true"]{background:var(--bg-ink);color:var(--bg-page)}
  .bgs-b.pri{background:var(--bg-brand);color:var(--bg-brand-ink);padding:0 16px 0 14px;margin-left:4px}
  .bgs-b.pri:hover{filter:brightness(1.12)}
  .bgs-b.on{background:var(--bg-bad);color:#fff}
  .bgs-b.ic{padding:0;width:40px}
  .bgs-b .k{font:600 var(--bg-fs-xs) var(--bg-mono);font-variant-numeric:tabular-nums;opacity:.85}
  .bgs-prog{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:var(--bg-r-sm);flex:none}
  .bgs-prog:hover{background:var(--bg-hair)}
  .bgs-prog .t{font-weight:600;font-size:var(--bg-fs-xs);font-variant-numeric:tabular-nums;color:var(--bg-ink2);white-space:nowrap}
  .bgs-prog .r{display:flex;gap:3px}
  .bgs-prog .r i{display:block;width:6px;height:6px;border-radius:3px;background:var(--bg-hair2);transition:width var(--bg-t-mid) var(--bg-ease),background var(--bg-t-mid)}
  .bgs-prog .r i.d{background:var(--bg-accent)}
  .bgs-prog .r i.c{background:var(--bg-accent);width:18px}
  /* bảng nổi chung: menu, danh sách bước */
  .bgs-pop{display:none;min-width:260px;max-width:min(380px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;padding:6px;border-radius:var(--bg-r-md);background:var(--bg-glass-strong);box-shadow:var(--bg-sh-2);border:1px solid var(--bg-hair)}
  .bgs-pop.show{display:block;animation:bgs-in var(--bg-t-mid) var(--bg-ease)}
  @keyframes bgs-in{from{opacity:0;transform:translateY(-6px)}}
  .bgs-mi{display:flex!important;align-items:center;gap:12px;width:100%;min-height:44px;padding:8px 12px;border-radius:var(--bg-r-sm);text-align:left;font-weight:500}
  .bgs-mi:hover,.bgs-mi:focus-visible{background:var(--bg-hair)}
  .bgs-mi .i2{margin-left:auto;color:var(--bg-ink3);font:500 var(--bg-fs-xs) var(--bg-mono)}
  .bgs-mi[aria-checked="true"] .i2{color:var(--bg-ok)}
  .bgs-mi .n{min-width:28px;font:600 var(--bg-fs-xs) var(--bg-mono);color:var(--bg-ink3);font-variant-numeric:tabular-nums}
  .bgs-mi.cur{background:var(--bg-ink);color:var(--bg-page)}
  .bgs-mi.cur .n{color:inherit;opacity:.7}
  .bgs-mh{padding:10px 12px 4px;font-size:var(--bg-fs-xs);color:var(--bg-ink3);font-weight:600}
  .bgs-hr{height:1px;background:var(--bg-hair);margin:6px 4px}
  /* ngăn kéo: bảng của bài trượt vào/ra */
  .bgs-pnl{transition:transform var(--bg-t-mid) var(--bg-ease),opacity var(--bg-t-mid) var(--bg-ease)!important}
  .bgs-pnl.bgs-off[data-bgs-side="left"]{transform:translateX(calc(-100% - 32px))!important;opacity:0!important;pointer-events:none!important}
  .bgs-pnl.bgs-off[data-bgs-side="right"]{transform:translateX(calc(100% + 32px))!important;opacity:0!important;pointer-events:none!important}
  .bgs-pnl.bgs-off[data-bgs-side="bottom"]{transform:translateY(calc(100% + 32px))!important;opacity:0!important;pointer-events:none!important}
  .bgs-pnl.bgs-off.bgs-collapse{display:none!important}
  /* thanh dưới trên điện thoại */
  .bgs-nav{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));height:56px;display:none;align-items:center;gap:4px;padding:6px;border-radius:var(--bg-r-md);border:1px solid var(--bg-hair);touch-action:pan-y}
  .bgs-nav.show{display:flex}
  .bgs-nav .bgs-b{width:44px;height:44px;padding:0}
  .bgs-nav .mid{flex:1;min-width:0;height:44px;display:flex;flex-direction:column;justify-content:center;padding:0 6px;border-radius:var(--bg-r-sm);text-align:left}
  .bgs-nav .mid .k{font:600 var(--bg-fs-xs) var(--bg-mono);color:var(--bg-ink3);font-variant-numeric:tabular-nums}
  .bgs-nav .mid .t{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bgs-nav .nx{background:var(--bg-brand);color:var(--bg-brand-ink)}
  /* thẻ bài tiếp theo */
  .bgs-next{right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));display:none;gap:4px;padding:14px 16px;border-radius:var(--bg-r-md);border:1px solid var(--bg-hair)}
  .bgs-next.show{display:grid;animation:bgs-up var(--bg-t-slow) var(--bg-ease)}
  @keyframes bgs-up{from{opacity:0;transform:translateY(12px)}}
  .bgs-next .k{font-size:var(--bg-fs-xs);color:var(--bg-ink3);font-weight:600}
  .bgs-next a.go{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;min-height:44px;padding:0 14px;border-radius:var(--bg-r-sm);background:var(--bg-brand);color:var(--bg-brand-ink);font-weight:600}
  .bgs-next .x{position:absolute;right:6px;top:6px;width:36px;height:36px;display:grid;place-items:center;border-radius:var(--bg-r-sm);color:var(--bg-ink3)}
  /* màn đen, hộp thoại, thông báo, gợi ý */
  .bgs-black{inset:0;background:#000;display:none;cursor:none}
  .bgs-black.show{display:block}
  .bgs-black span{position:absolute;right:18px;bottom:14px;color:#3a3a3a;font-size:var(--bg-fs-xs)}
  .bgs-modal{inset:0;display:none;place-items:center;background:var(--bg-scrim);padding:16px}
  .bgs-modal.show{display:grid}
  .bgs-card{position:relative;width:min(560px,100%);max-height:calc(100svh - 32px);overflow:auto;border-radius:var(--bg-r-lg);padding:24px;background:var(--bg-glass-strong);box-shadow:var(--bg-sh-2);border:1px solid var(--bg-hair);animation:bgs-up var(--bg-t-mid) var(--bg-ease)}
  .bgs-card h3{margin:0 44px 6px 0;font:700 var(--bg-fs-lg)/1.25 var(--bg-font);letter-spacing:-.015em}
  .bgs-card p{margin:8px 0;color:var(--bg-ink2);line-height:1.6}
  .bgs-card a{color:var(--bg-focus);text-decoration:underline;text-underline-offset:2px}
  .bgs-card .x{position:absolute;right:12px;top:12px}
  .bgs-qr{display:grid;justify-items:center;gap:8px;margin-top:14px}
  .bgs-qr img{width:220px;height:220px;image-rendering:pixelated}
  .bgs-code{font:600 26px var(--bg-mono);letter-spacing:4px}
  .bgs-small{font-size:var(--bg-fs-xs);color:var(--bg-ink3)}
  .bgs-keys{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;margin:14px 0 0;align-items:center}
  .bgs-keys kbd{font:600 var(--bg-fs-xs) var(--bg-mono);background:var(--bg-hair);border-radius:6px;padding:3px 8px;justify-self:start;white-space:nowrap}
  .bgs-mi[disabled]{opacity:.72;cursor:default}
  .bgs-toast{left:50%;top:calc(var(--bg-bar) + 12px);transform:translateX(-50%);padding:10px 16px;border-radius:999px;font-weight:600;opacity:0;transition:opacity var(--bg-t-mid);pointer-events:none;max-width:calc(100vw - 32px);text-align:center}
  .bgs-toast.show{opacity:1}
  .bgs-hint{left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:18px;padding:12px 18px;border-radius:999px;pointer-events:none;opacity:0;transition:opacity var(--bg-t-slow) var(--bg-ease)}
  .bgs-hint.show{opacity:1}
  .bgs-hint span{display:flex;align-items:center;gap:8px;white-space:nowrap}
  @media (max-width:520px){.bgs-hint{gap:6px 14px;padding:10px 14px;width:max-content;max-width:calc(100vw - 24px);flex-wrap:wrap;justify-content:center;border-radius:18px;font-size:var(--bg-fs-xs)}.bgs-hint span{gap:6px}}
  .bgs-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  /* màn tải (khung do inject_shell.py đặt sẵn trong HTML) */
  #bgs-load{transition:opacity var(--bg-t-slow) var(--bg-ease)}
  #bgs-load.out{opacity:0;pointer-events:none}
  /* chế độ nhẹ: máy yếu (khung hình chậm kéo dài) thì bỏ làm mờ nền sau bảng, bảng đục hơn; cảnh 3D giữ nguyên */
  html:root[data-bg-lite]{--bg-glass:rgba(255,255,255,.97)!important;--bg-glass-strong:#fff!important;--bg-blur:none!important;--lg-blur:none!important;--glass-blur:none!important;--lg-fill:linear-gradient(180deg,rgba(255,255,255,.97),rgba(255,255,255,.94))!important;--lg-fill-strong:linear-gradient(180deg,#fff,rgba(255,255,255,.97))!important;--glass:rgba(255,255,255,.97)!important;--glass-2:rgba(255,255,255,.96)!important;--glass-bar:rgba(255,255,255,.97)!important}
  html[data-bg-lite] *,html[data-bg-lite] *::before,html[data-bg-lite] *::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
  /* cỡ màn */
  @media (max-width:1100px){.bgs-home b{display:none}.bgs-b .l{display:none}.bgs-b.lb{padding:0;width:40px}.bgs-prog .r{display:none}}
  @media (max-width:640px),(max-height:520px){.bgs-desk{display:none!important}.bgs-bar{gap:2px;padding-left:max(6px,env(safe-area-inset-left));padding-right:max(6px,env(safe-area-inset-right))}.bgs-sep,.bgs-prog,.bgs-cls,.bgs-nextb{display:none!important}.bgs-crumb .s{display:none}.bgs-crumb h1{font-size:var(--bg-fs-sm)}.bgs-home{padding:0 6px}.bgs-pop{position:fixed!important;left:8px!important;right:8px!important;top:auto!important;bottom:max(8px,env(safe-area-inset-bottom))!important;max-width:none;max-height:75svh}.bgs-next{bottom:calc(76px + env(safe-area-inset-bottom));right:8px;width:calc(100vw - 16px)}}
  @media (pointer:coarse){.bgs-b,.bgs-prog,.bgs-home{min-height:44px;height:44px}.bgs-home{min-width:44px;justify-content:center}.bgs-cls{min-width:44px}.bgs-b.ic,.bgs-b.lb{width:44px}}
  @media print{.bgs{display:none!important}}`;

  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement('script'); if (SRI[src]) { s.integrity = SRI[src]; s.crossOrigin = 'anonymous'; } s.src = src; s.onload = ok; s.onerror = () => no(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* trình duyệt chặn bộ nhớ */ } } };
  const root = () => { const m = document.querySelector('meta[name="bg-root"]'); return m ? m.content : SITE; };
  const isPhone = () => Math.min(innerWidth, innerHeight) < 560 || innerWidth < 640;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- trạng thái ---------- */
  const S = { L: null, i: -1, on: false, black: false, t0: 0, links: new Set(), peer: null, variant: 'pho-thong', panels: [] };
  let bar, nav, black, modal, toast, styleTag, menu, stepsPop, nextCard, live, hint;

  function injectStyle() {
    if (styleTag) return;
    styleTag = document.createElement('style'); styleTag.id = 'bg-shell-css';
    // token và phông đã có trong <head> (inject_shell.py; bản offline nhúng phông dạng data) thì không khai báo lại
    styleTag.textContent = (document.getElementById('bg-tokens') ? '' : FONTFACE(root()) + TOKENS_CSS) + CSS;
    document.head.appendChild(styleTag);
  }
  function snapshot() {
    const L = S.L;
    return { t: 'state', v: VERSION, lesson: L ? { id: L.id, title: L.title, subject: L.subject || '', variant: S.variant, accent: L.accent || '', objectives: L.objectives || [], next: L.next || null, pack: L.pack || '', steps: (L.steps || []).map((s, k) => ({ t: s.t, note: s.note || '', ask: s.ask || null, plan: L.plan && L.plan[k] && L.plan[k].t === s.t ? L.plan[k] : null })) } : null,
      i: S.i, on: S.on, black: S.black, elapsed: S.on ? Date.now() - S.t0 : 0 };
  }
  function broadcast() { if (S.relayout) S.relayout(); const m = snapshot(); for (const l of S.links) { try { l.send(m); } catch (e) { S.links.delete(l); } } render(); }
  function say(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 2400); }
  function announce(msg) { if (live) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); } }

  /* ---------- điều khiển bước ---------- */
  function go(i, free) {
    const L = S.L; if (!L || !L.steps || !L.steps.length) return;
    i = Math.max(0, Math.min(L.steps.length - 1, i));
    if (!S.on && !free) start(true);
    S.i = i; try { L.go(i); } catch (e) { console.error('[bg-shell] go', e); }
    stepChanged();
  }
  const next = (free) => go(S.i + 1, free), prev = (free) => go(Math.max(0, S.i - 1), free);
  function stepChanged() {
    const L = S.L, st = L.steps[S.i];
    if (st) announce(`Bước ${S.i + 1} trên ${L.steps.length}: ${st.t}. ${st.sr || ''}`);
    if (L.next && S.i === L.steps.length - 1) showNext(); else hideNext();
    broadcast();
  }
  function start(quiet) {
    if (S.on) return; S.on = true; S.t0 = Date.now(); if (S.i < 0) S.i = 0;
    if (!quiet) { try { S.L.go(S.i); } catch (e) { console.error(e); } say('Đang lên lớp · → bước sau, ← bước trước, B màn đen'); }
    stepChanged();
  }
  function stop() {
    if (!S.on) return; S.on = false; setBlack(false);
    try { S.L.end && S.L.end(); } catch (e) { console.error(e); }
    broadcast();
  }
  function setBlack(v) { S.black = v; black.classList.toggle('show', v); broadcast(); }
  function fullscreen() { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement); }
  function projector(v) {
    const on = v == null ? !document.documentElement.hasAttribute('data-chieu') : !!v;
    document.documentElement.toggleAttribute('data-chieu', on); store.set('bg-chieu', on ? '1' : '0');
    if (S.L && S.L.onProjector) { try { S.L.onProjector(on); } catch (e) { console.error(e); } }
    dispatchEvent(new Event('resize')); render(); return on;
  }

  function handle(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') broadcast();
    else if (m.t === 'go') go(+m.i);
    else if (m.t === 'next') next();
    else if (m.t === 'prev') prev();
    else if (m.t === 'black') setBlack(!S.black);
    else if (m.t === 'start') start();
    else if (m.t === 'stop') stop();
  }

  /* ---------- thanh đầu bài ---------- */
  function buildBar(L) {
    const crumb = (L.crumb || (L.subject ? [{ t: L.subject }] : [])).map((c) => (c.href ? `<a href="${esc(c.href)}">${esc(c.t)}</a>` : esc(c.t))).join(' <span aria-hidden="true">/</span> ');
    const pbtn = S.panels.map((p, k) => `<button class="bgs-b lb bgs-pb${p.desktop ? ' bgs-desk' : ''}" data-k="pnl" data-n="${k}" aria-pressed="false" aria-label="${esc(p.label)}" title="${esc(p.label)}">${ico(p.icon || 'list')}<span class="l">${esc(p.label)}</span></button>`).join('');
    const hasSteps = L.steps && L.steps.length;
    bar = mk('bgs-bar bgs-glass', `
      <a class="bgs-home" href="${esc(L.home || root())}" aria-label="Về trang chính Sáng Ăn Khoai" title="Trang chính Sáng Ăn Khoai">${LOGO}<b>Sáng Ăn Khoai</b></a>
      <span class="bgs-sep" aria-hidden="true"></span>
      <div class="bgs-crumb">${crumb ? `<span class="s">${crumb}</span>` : ''}<h1>${esc(L.title)}</h1></div>
      <div class="bgs-tools">
        ${hasSteps ? '<button class="bgs-prog" data-k="steps" aria-haspopup="true" aria-label="Danh sách bước"><span class="t"></span><span class="r" aria-hidden="true"></span></button>' : ''}
        ${pbtn}
        ${hasSteps ? `<button class="bgs-b pri bgs-cls" data-k="class" title="Chế độ lên lớp (Shift P)"></button>` : ''}
        ${L.next ? `<a class="bgs-b lb bgs-nextb" data-next href="${esc(L.next.href)}" title="Bài tiếp theo: ${esc(L.next.title)}" aria-label="Bài tiếp theo: ${esc(L.next.title)}"><span class="l">Bài sau</span>${ico('arrow-r')}</a>` : ''}
        <button class="bgs-b ic" data-k="menu" aria-haspopup="true" aria-expanded="false" aria-label="Thêm" title="Thêm">${ico('more')}</button>
      </div>`);
    bar.setAttribute('role', 'banner');
    menu = mk('bgs-pop', ''); menu.setAttribute('role', 'menu');
    stepsPop = mk('bgs-pop', ''); stepsPop.setAttribute('role', 'menu');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'class') S.on ? stop() : start();
      if (k === 'menu') togglePop(menu, b, renderMenu);
      if (k === 'steps') { if (S.i < 0) go(0, true); else togglePop(stepsPop, b, renderSteps); }
      if (k === 'pnl') togglePanel(+b.dataset.n);
    });
    for (const p of [menu, stepsPop]) p.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a; closePops();
      if (a === 'go') go(+b.dataset.i, !S.on);
      if (a === 'class') S.on ? stop() : start();
      if (a === 'window') openWindow();
      if (a === 'phone') openPhone();
      if (a === 'full') fullscreen();
      if (a === 'chieu') say(projector() ? 'Đã bật chế độ Máy chiếu' : 'Đã tắt chế độ Máy chiếu');
      if (a === 'keys') keysModal();
      if (a === 'about') aboutModal();
      if (a === 'luu') saveLesson();
      if (a === 'pnl') togglePanel(+b.dataset.n);
    });
    addEventListener('click', (e) => { if (!e.target.closest('.bgs-pop,[data-k="menu"],[data-k="steps"]')) closePops(); }, true);
  }
  function togglePop(p, anchor, fill) {
    const open = !p.classList.contains('show'); closePops(); if (!open) return;
    fill(); p.classList.add('show');
    if (!isPhone()) { const r = anchor.getBoundingClientRect(); p.style.top = (r.bottom + 6) + 'px'; p.style.right = Math.max(8, innerWidth - r.right) + 'px'; p.style.left = 'auto'; }
    anchor.setAttribute('aria-expanded', 'true');
    const f = p.querySelector('.cur,[data-a]'); if (f) f.focus({ preventScroll: true });
  }
  function closePops() { for (const p of [menu, stepsPop]) if (p) p.classList.remove('show'); if (bar) bar.querySelectorAll('[aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'false')); }
  function renderMenu() {
    const L = S.L, chieu = document.documentElement.hasAttribute('data-chieu'), phone = isPhone();
    const hasSteps = L.steps && L.steps.length;
    const pn = phone ? S.panels.map((p, k) => (p.desktop ? '' : `<button class="bgs-mi" role="menuitem" data-a="pnl" data-n="${k}">${ico(p.icon || 'list')}${esc(p.label)}</button>`)).join('') : '';
    menu.innerHTML = `
      ${L.next ? `<a class="bgs-mi" role="menuitem" data-next href="${esc(L.next.href)}">${ico('arrow-r')}<span>Bài tiếp theo<br><span class="bgs-small">${esc(L.next.title)}</span></span></a><div class="bgs-hr"></div>` : ''}
      ${pn}${pn ? '<div class="bgs-hr"></div>' : ''}
      ${L.pack ? `<a class="bgs-mi" role="menuitem" href="${esc(L.pack)}" target="_blank" rel="noopener">${ico('list')}<span>Kịch bản và phiếu in<br><span class="bgs-small">Gói dạy thử 45 phút</span></span></a><div class="bgs-hr"></div>` : ''}
      ${hasSteps && !phone ? `<div class="bgs-mh">Lên lớp</div>
      <button class="bgs-mi" role="menuitem" data-a="window">${ico('screen')}Màn hình giáo viên<span class="i2">không cần mạng</span></button>
      <button class="bgs-mi" role="menuitem" data-a="phone">${ico('phone')}Điều khiển bằng điện thoại</button>` : ''}
      <button class="bgs-mi" role="menuitemcheckbox" aria-checked="${chieu}" data-a="chieu">${ico('projector')}Chế độ Máy chiếu<span class="i2">${chieu ? 'đang bật' : 'tắt'}</span></button>
      <button class="bgs-mi" role="menuitem" data-a="full">${ico('full')}Toàn màn hình<span class="i2">F</span></button>
      ${S.goi && S.goi.n ? `<button class="bgs-mi" role="menuitem" data-a="luu"${S.goi.con ? '' : ' disabled'}>${ico(S.goi.con ? 'download' : 'check')}<span>${S.goi.con ? 'Lưu bài để dùng khi mất mạng' : 'Bài đã lưu trên máy này'}<br><span class="bgs-small">${S.goi.con ? `${S.goi.n} tệp, ${mb(S.goi.bytes)}` : 'mở được khi mất mạng'}</span></span></button>` : ''}
      <div class="bgs-hr"></div>
      ${hasSteps && !phone ? `<button class="bgs-mi" role="menuitem" data-a="keys">${ico('keys')}Phím tắt<span class="i2">?</span></button>` : ''}
      <button class="bgs-mi" role="menuitem" data-a="about">${ico('info')}Về bài này</button>`;
  }
  function renderSteps() {
    const L = S.L;
    stepsPop.innerHTML = `<div class="bgs-mh">${esc(L.title)} · ${L.steps.length} bước</div>` + L.steps.map((s, k) => `<button class="bgs-mi${k === S.i ? ' cur' : ''}" role="menuitem" data-a="go" data-i="${k}"><span class="n">${k + 1}</span>${esc(s.t)}</button>`).join('');
  }
  function render() {
    const L = S.L; if (!L || !bar) return;
    const n = (L.steps || []).length;
    const pg = bar.querySelector('.bgs-prog');
    if (pg) {
      pg.querySelector('.t').textContent = S.i >= 0 ? `Bước ${S.i + 1}/${n}` : `Học theo bước · ${n}`;
      pg.querySelector('.r').innerHTML = n <= 14 ? L.steps.map((s, k) => `<i class="${k < S.i ? 'd' : k === S.i ? 'c' : ''}"></i>`).join('') : `<i class="${S.i >= 0 ? 'c' : ''}" style="width:${Math.max(10, Math.round(80 * (S.i + 1) / n))}px"></i>`;
      pg.title = S.i >= 0 ? `Bước ${S.i + 1}: ${L.steps[S.i].t} · bấm để xem danh sách bước` : 'Bắt đầu học theo bước';
      pg.setAttribute('aria-label', pg.title);
    }
    const cb = bar.querySelector('[data-k="class"]');
    if (cb) { cb.classList.toggle('on', S.on); cb.classList.toggle('pri', !S.on); cb.innerHTML = S.on ? `${ico('stop')}<span class="l">Kết thúc</span><span class="k" data-clock>${fmt(Date.now() - S.t0)}</span>${S.links.size ? `<span class="k" title="Thiết bị điều khiển đang nối">· ${S.links.size}</span>` : ''}` : `${ico('play')}<span class="l">Lên lớp</span>`;
      cb.setAttribute('aria-label', S.on ? 'Kết thúc tiết học' : 'Bắt đầu lên lớp'); }
    S.panels.forEach((p, k) => { const b = bar.querySelector(`[data-n="${k}"]`); if (b) b.setAttribute('aria-pressed', String(p.open)); });
    if (nav) {
      const show = n > 0 && L.nav !== false && isPhone();
      nav.classList.toggle('show', show);
      document.body.classList.toggle('bgs-nav-on', show);
      if (show) {
        const st = L.steps[S.i];
        nav.querySelector('.k').textContent = S.i >= 0 ? `Bước ${S.i + 1}/${n}` : `${n} bước`;
        nav.querySelector('.t').textContent = st ? st.t : 'Bắt đầu học theo bước';
        nav.querySelector('[data-k="prev"]').disabled = S.i <= 0;
        const atEnd = S.i >= n - 1;
        nav.querySelector('[data-k="next"]').setAttribute('aria-label', atEnd ? 'Hết bài' : 'Bước sau');
      }
    }
  }
  setInterval(() => { const c = bar && bar.querySelector('[data-clock]'); if (c && S.on) c.textContent = fmt(Date.now() - S.t0); }, 1000);

  /* ---------- ngăn kéo ---------- */
  function setupPanels(L) {
    S.panels = (L.panels || []).map((p, k) => {
      const key = `bgs:${L.id}:p${k}`;
      const saved = store.get(key, null);
      const def = typeof p.open === 'function' ? !!p.open() : !!p.open;
      return Object.assign({}, p, { key, open: saved == null ? def : saved === '1' });
    });
  }
  // desktop: true = bảng chỉ là ngăn kéo trên màn rộng; trên điện thoại bảng nằm trong trang (cuộn tới), luôn hiện
  const effOpen = (p) => (p.desktop && isPhone() ? true : p.open);
  function applyPanels(initial) {
    for (const p of S.panels) {
      const o = effOpen(p);
      if (p.sel) document.querySelectorAll(p.sel).forEach((e) => { if (initial) { e.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transition = ''; })); } e.classList.add('bgs-pnl'); e.dataset.bgsSide = p.side || 'right'; e.classList.toggle('bgs-collapse', p.mode === 'collapse'); e.classList.toggle('bgs-off', !o); e.toggleAttribute('inert', !o); });
      if (p.apply && p._last !== o) { p._last = o; try { p.apply(o, !!initial); } catch (e) { console.error(e); } }
    }
    document.body.dataset.bgsPanels = S.panels.map((p) => (effOpen(p) ? '1' : '0')).join('');
  }
  function togglePanel(k, v) {
    const p = S.panels[k]; if (!p) return;
    p.open = v == null ? !p.open : !!v; store.set(p.key, p.open ? '1' : '0');
    if (p.open && p.exclusive !== false && isPhone()) S.panels.forEach((q, j) => { if (j !== k && q.open) { q.open = false; store.set(q.key, '0'); } });
    applyPanels(false); render();
    const kick = () => dispatchEvent(new Event('resize'));
    kick(); setTimeout(kick, 280);
  }

  /* ---------- thanh dưới điện thoại ---------- */
  function buildNav() {
    nav = mk('bgs-nav bgs-glass', `<button class="bgs-b" data-k="prev" aria-label="Bước trước">${ico('chev-l')}</button>
      <button class="mid" data-k="steps2" aria-label="Danh sách bước"><span class="k"></span><span class="t"></span></button>
      <button class="bgs-b nx" data-k="next" aria-label="Bước sau">${ico('chev-r')}</button>`);
    nav.setAttribute('role', 'navigation'); nav.setAttribute('aria-label', 'Chuyển bước');
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === 'prev') prev(!S.on);
      if (b.dataset.k === 'next') { if (S.i >= S.L.steps.length - 1 && S.L.next) showNext(); else next(!S.on); }
      if (b.dataset.k === 'steps2') togglePop(stepsPop, b, renderSteps);
    });
    let x0 = null, y0 = 0;
    nav.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    nav.addEventListener('touchend', (e) => {
      if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); dx < 0 ? next(!S.on) : prev(!S.on); }
    });
  }

  /* ---------- bài tiếp theo ---------- */
  function showNext() {
    const N = S.L.next; if (!N || !nextCard) return;
    nextCard.innerHTML = `<button class="x" aria-label="Đóng">${ico('close')}</button><span class="k">Hết bài · Bài tiếp theo</span><b>${esc(N.title)}</b>${N.sub ? `<span class="bgs-small">${esc(N.sub)}</span>` : ''}<a class="go" data-next href="${esc(N.href)}">Mở bài ${ico('arrow-r')}</a>`;
    nextCard.classList.add('show');
  }
  function hideNext() { if (nextCard) nextCard.classList.remove('show'); }

  /* ---------- phím (bắt trước bài học) ---------- */
  function onKey(e) {
    if (!S.L) return;
    const tg = e.target; if (tg && tg.closest && tg.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey || e.altKey;
    if (mod) return;
    if (k === 'Escape') { if (S.black) { setBlack(false); e.preventDefault(); return; } if (document.querySelector('.bgs-pop.show')) { closePops(); e.preventDefault(); return; } if (modal.classList.contains('show')) { closeModal(); e.preventDefault(); return; } }
    if ((k === 'p' || k === 'P') && e.shiftKey && S.L.steps && S.L.steps.length) { e.preventDefault(); S.on ? stop() : start(); return; }
    if (k === '?' && !S.on) { e.preventDefault(); keysModal(); return; }
    if (!S.on) return;
    let used = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown') next(); // không dùng phím cách: nhiều bài dùng nó để tạm dừng
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') prev();
    else if (k === 'Home') go(0);
    else if (k === 'End') go(S.L.steps.length - 1);
    else if (k === 'b' || k === 'B' || k === '.') setBlack(!S.black);
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === '?') keysModal();
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  /* ---------- hộp thoại ---------- */
  function openModal(html) { modal.querySelector('.bgs-card').innerHTML = `<button class="bgs-b ic x" data-x aria-label="Đóng">${ico('close')}</button>` + html; modal.classList.add('show'); const x = modal.querySelector('[data-x]'); if (x) x.focus({ preventScroll: true }); }
  function closeModal() { modal.classList.remove('show'); }
  function keysModal() {
    openModal(`<h3>Phím tắt</h3><p>Dùng được với bàn phím và bút trình chiếu cắm USB.</p><div class="bgs-keys">
      <kbd>Shift P</kbd><span>bật, tắt chế độ lên lớp</span><kbd>→ ↓ PgDn</kbd><span>bước sau</span><kbd>← ↑ PgUp</kbd><span>bước trước</span>
      <kbd>Home End</kbd><span>bước đầu, bước cuối</span><kbd>B</kbd><span>màn đen để lớp tập trung nghe</span><kbd>F</kbd><span>toàn màn hình</span><kbd>Esc</kbd><span>đóng bảng, thoát màn đen</span><kbd>?</kbd><span>bảng này</span></div>
      ${S.L.keys ? `<p style="margin-top:16px">Phím riêng của bài:</p><div class="bgs-keys">${S.L.keys.map(([k, t]) => `<kbd>${esc(k)}</kbd><span>${esc(t)}</span>`).join('')}</div>` : ''}`);
  }
  function aboutModal() {
    const L = S.L;
    openModal(`<h3>${esc(L.title)}</h3>${L.subject ? `<p class="bgs-small">${esc(L.subject)}</p>` : ''}
      ${L.objectives && L.objectives.length ? `<p><b>Yêu cầu cần đạt</b></p><ul style="margin:4px 0 0;padding-left:20px;color:var(--bg-ink2);line-height:1.6">${L.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      ${L.credit ? `<p>${L.credit}</p>` : ''}
      <p class="bgs-small">Sáng Ăn Khoai: bài học 3D tiếng Việt, dùng tự do cho trường học, phi thương mại. <a href="${esc(root())}">Trang chính</a></p>`);
  }
  function openWindow() {
    const w = window.open('', 'bgs-teacher-' + (S.L.id || 'bai'), 'width=760,height=820');
    if (!w) { say('Trình duyệt chặn cửa sổ mới: cho phép cửa sổ bật lên rồi thử lại'); return; }
    w.document.open(); w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Giáo viên · ${esc(S.L.title)}</title></head><body></body></html>`); w.document.close();
    let peer = null;
    const link = { send: (m) => peer && peer(m) };
    S.links.add(link);
    runRemote(w.document, { send: handle, onMessage: (fn) => { peer = fn; }, close: () => S.links.delete(link) }, S.variant, 'window', root());
    w.addEventListener('beforeunload', () => { S.links.delete(link); render(); });
    closeModal(); if (!S.on) start(); broadcast();
  }
  async function openPhone() {
    openModal(`<h3>Điện thoại của giáo viên</h3><p>Đang chuẩn bị mã kết nối…</p>`);
    try {
      if (!window.Peer) await loadScript(PEERJS);
      if (!window.qrcode) await loadScript(QRLIB);
    } catch (e) { openModal(`<h3>Không tải được bộ kết nối</h3><p>Máy cần mạng Internet để dùng điện thoại làm điều khiển. Khi không có mạng, dùng màn hình giáo viên trên máy này hoặc bút trình chiếu.</p>`); return; }
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    const id = 'baigiang-' + code.toLowerCase();
    if (S.peer) { try { S.peer.destroy(); } catch (e) { /* bỏ qua */ } }
    const peer = new window.Peer(id); S.peer = peer;
    peer.on('error', (e) => openModal(`<h3>Không kết nối được</h3><p>${esc(e && e.type || e)}. Thử lại, hoặc dùng màn hình giáo viên trên máy này.</p>`));
    peer.on('open', () => {
      const url = `${REMOTE_URL}#${code}`;
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      openModal(`<h3>Quét để điều khiển</h3><p>Mở camera điện thoại và quét mã, hoặc vào <b>${esc(REMOTE_URL.replace('https://', ''))}</b> rồi nhập mã.</p>
        <div class="bgs-qr">${qr.createImgTag(6, 8)}<div class="bgs-code">${code}</div><div class="bgs-small">Hai máy nối trực tiếp (WebRTC), không lưu gì trên máy chủ.</div></div>`);
    });
    // điện thoại đầu tiên nối thẳng; từ máy thứ hai, giáo viên phải bấm Cho phép trên màn chiếu
    let phones = 0;
    peer.on('connection', (conn) => {
      let ok = false;
      const link = { send: (m) => conn.open && conn.send(m) };
      const accept = () => { if (ok) return; ok = true; phones++; S.links.add(link); closeModal(); say(phones > 1 ? `Đã nối thêm thiết bị · ${phones}` : 'Đã nối điện thoại'); if (!S.on) start(); broadcast(); };
      conn.on('open', () => {
        if (!phones) return accept();
        openModal(`<h3>Thêm một thiết bị muốn điều khiển</h3><p>Đang có ${phones} điện thoại nối. Chỉ cho phép nếu đó là máy của bạn hoặc đồng nghiệp.</p><p style="display:flex;gap:8px;margin-top:16px"><button class="bgs-b pri" data-ok>Cho phép</button><button class="bgs-b" data-no>Từ chối</button></p>`);
        modal.querySelector('[data-ok]').onclick = accept;
        modal.querySelector('[data-no]').onclick = () => { try { conn.close(); } catch (e) { /* đã đóng */ } closeModal(); };
      });
      conn.on('data', (m) => { if (ok) handle(m); });
      conn.on('close', () => { if (!ok) return; ok = false; phones--; S.links.delete(link); render(); say('Điện thoại đã ngắt'); });
    });
  }

  /* ---------- màn hình giáo viên (cửa sổ thứ hai) và trang điện thoại: cùng một giao diện, hai bố cục ---------- */
  function runRemote(doc, port, variant, kind, rootUrl) {
    const st = doc.createElement('style');
    st.textContent = FONTFACE(rootUrl || root()) + TOKENS_CSS + `
      *{box-sizing:border-box}html,body{margin:0;height:100%}
      body{font:500 var(--bg-fs-sm)/1.5 var(--bg-font);color:var(--bg-ink);background:var(--bg-page);-webkit-font-smoothing:antialiased}
      button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
      .bgs-i{width:22px;height:22px}
      header{display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;border-bottom:1px solid var(--bg-hair);background:var(--bg-glass-strong)}
      header .lg{width:30px;height:30px;flex:none}
      header .tt{min-width:0;flex:1}
      header .s{font-size:var(--bg-fs-xs);color:var(--bg-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      header h1{margin:0;font-size:var(--bg-fs-md);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .clock{font:600 var(--bg-fs-lg) var(--bg-mono);font-variant-numeric:tabular-nums}
      .conn{display:none;align-items:center;gap:8px;padding:10px 16px;background:var(--bg-bad);color:#fff;font-weight:600}
      .conn.show{display:flex}
      .conn.ok{background:var(--bg-ok)}
      .k{font:600 var(--bg-fs-xs) var(--bg-mono);color:var(--bg-ink3);font-variant-numeric:tabular-nums}
      .now h2{margin:4px 0 8px;font-size:var(--bg-fs-xl);line-height:1.2;letter-spacing:-.015em}
      .note{color:var(--bg-ink2);white-space:pre-wrap;font-size:var(--bg-fs-md);line-height:1.55}
      .plan{margin:0 0 14px;padding:12px 14px;border-radius:var(--bg-r-md);background:color-mix(in srgb,var(--bg-accent,#1D1B16) 7%,var(--bg-surface));border:1px solid color-mix(in srgb,var(--bg-accent,#1D1B16) 22%,transparent)}
      .plan b{display:block;font-size:var(--bg-fs-sm);color:var(--bg-accent,#1D1B16)}
      .plan p{margin:4px 0 0;font-size:var(--bg-fs-md);line-height:1.5}
      .plan p.h{color:var(--bg-ink2)}
      .clock.late{color:var(--bg-warn,#B26A1A)}
      .pk{display:inline-flex;align-items:center;min-height:44px;margin-top:10px;font-weight:600;color:var(--bg-accent,#1D1B16)}
      .ask{margin-top:14px;border-radius:var(--bg-r-md);padding:14px 16px;background:color-mix(in srgb,var(--bg-warn) 10%,var(--bg-surface));border:1px solid color-mix(in srgb,var(--bg-warn) 30%,transparent)}
      .ask b{display:block;margin-bottom:4px}
      .ask ol{margin:8px 0 0;padding-left:22px}.ask li{margin:2px 0}
      .ask.rev li.a{font-weight:700;color:var(--bg-ok)}
      .ask .e{display:none;margin-top:8px;color:var(--bg-ink2)}.ask.rev .e{display:block}
      .ask .rb{margin-top:10px;height:40px;padding:0 14px;border-radius:var(--bg-r-sm);background:var(--bg-surface);border:1px solid var(--bg-hair2);font-weight:600}
      .ask.rev .rb{display:none}
      .nx{margin-top:16px;padding:12px 14px;border-radius:var(--bg-r-md);border:1px dashed var(--bg-hair2);color:var(--bg-ink2)}
      .nx b{color:var(--bg-ink)}
      ol.steps{list-style:none;margin:0;padding:0}
      ol.steps li{display:flex;gap:12px;align-items:center;min-height:44px;padding:8px 12px;border-radius:var(--bg-r-sm);cursor:pointer}
      ol.steps li:hover{background:var(--bg-hair)}
      ol.steps li.cur{background:var(--bg-ink);color:var(--bg-page)}
      ol.steps li b{min-width:26px;font:600 var(--bg-fs-xs) var(--bg-mono)}
      ol.steps li .q{margin-left:auto;font-size:var(--bg-fs-xs);opacity:.7}
      .obj{margin:8px 0 0;padding-left:20px;color:var(--bg-ink2)}
      details{margin-top:16px}summary{cursor:pointer;font-weight:600;min-height:44px;display:flex;align-items:center}
      .empty{padding:48px 16px;text-align:center;color:var(--bg-ink3)}
      .ctl button{display:flex;align-items:center;justify-content:center;gap:10px;border-radius:var(--bg-r-md);font-weight:700;font-size:var(--bg-fs-md);background:var(--bg-surface);border:1px solid var(--bg-hair);box-shadow:var(--bg-sh-1);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      .ctl button:active{transform:scale(.98)}
      .ctl .pri{background:var(--bg-brand);color:var(--bg-brand-ink);border-color:transparent}
      .ctl .on{background:#000;color:#fff}
      /* điện thoại: nửa trên bước và ghi chú, nửa dưới hai vùng bấm lớn */
      body.phone{display:flex;flex-direction:column;height:100svh}
      body.phone main{flex:1 1 50%;overflow:auto;padding:16px}
      body.phone .ctl{flex:0 0 46%;display:grid;grid-template-columns:1fr 1.6fr;grid-template-rows:1fr auto;gap:10px;padding:10px 12px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--bg-hair);background:var(--bg-glass-strong)}
      body.phone .ctl .bp{grid-row:1}body.phone .ctl .bn{grid-row:1}
      body.phone .ctl .bb{grid-column:1/-1;height:48px;font-size:var(--bg-fs-sm)}
      body.phone .list{display:none}
      /* cửa sổ giáo viên: trình chiếu kiểu người nói */
      body.window{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);grid-template-rows:auto 1fr auto;height:100vh}
      body.window header{grid-column:1/-1}
      body.window main{padding:24px 28px;overflow:auto}
      body.window .list{border-left:1px solid var(--bg-hair);overflow:auto;padding:12px}
      body.window .now h2{font-size:var(--bg-fs-2xl)}
      body.window .note{font-size:var(--bg-fs-lg)}
      body.window .clock{font-size:var(--bg-fs-xl)}
      body.window .ctl{grid-column:1/-1;display:flex;gap:10px;padding:12px 16px;border-top:1px solid var(--bg-hair);background:var(--bg-glass-strong)}
      body.window .ctl button{height:56px;padding:0 22px}
      body.window .ctl .bn{flex:1}
      @media (max-width:700px){body.window{display:flex;flex-direction:column}body.window .list{display:none}}`;
    doc.head.appendChild(st);
    const b = doc.body; b.className = kind || 'phone'; doc.documentElement.dataset.bgVariant = variant || 'pho-thong';
    const I = (n) => `<svg class="bgs-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[n]}</svg>`;
    b.innerHTML = `<header>${LOGO.replace('bgs-logo', 'lg')}<div class="tt"><div class="s" id="sub">${kind === 'window' ? 'Màn hình giáo viên' : 'Điều khiển · Sáng Ăn Khoai'}</div><h1 id="ttl">Đang nối…</h1></div><span class="clock" id="clk" aria-label="Thời gian tiết học">00:00</span></header>
      <div class="conn" id="conn" role="status"></div>
      <main id="main"><div class="empty">Đang chờ bài giảng…</div></main>
      <aside class="list" id="list" aria-label="Danh sách bước"></aside>
      <div class="ctl"><button class="bp" id="bP" aria-label="Bước trước">${I('chev-l')}Trước</button><button class="pri bn" id="bN" aria-label="Bước sau">Tiếp${I('chev-r')}</button><button class="bb" id="bB">${I('black')}Màn đen</button></div>`;
    const $ = (id) => doc.getElementById(id);
    let last = null, t0 = 0, prevI = -1;
    const send = (m) => { try { port.send(m); } catch (e) { /* bỏ qua */ } };
    $('bN').onclick = () => send({ t: 'next' });
    $('bP').onclick = () => send({ t: 'prev' });
    $('bB').onclick = () => send({ t: 'black' });
    doc.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'PageDown', 'ArrowDown', ' '].includes(e.key)) { e.preventDefault(); send({ t: 'next' }); }
      if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); send({ t: 'prev' }); }
      if (e.key === 'b' || e.key === 'B' || e.key === '.') send({ t: 'black' });
    });
    setInterval(() => { if (!last || !last.on) return; const ms = Date.now() - t0, p = last.lesson && last.lesson.steps[last.i] && last.lesson.steps[last.i].plan; $('clk').textContent = fmt(ms); $('clk').classList.toggle('late', !!p && ms / 60000 > p.m[1]); }, 1000);
    const conn = (txt, ok) => { const c = $('conn'); c.textContent = txt || ''; c.className = 'conn' + (txt ? ' show' : '') + (ok ? ' ok' : ''); };
    port.onMessage((m) => {
      if (!m || m.t !== 'state') return;
      const fresh = !last || !last.lesson || !m.lesson || last.lesson.id !== m.lesson.id;
      last = m; t0 = Date.now() - (m.elapsed || 0);
      const L = m.lesson; if (!L) return;
      if (L.accent) doc.documentElement.style.setProperty('--bg-accent', L.accent);
      $('sub').textContent = (L.subject ? L.subject + ' · ' : '') + (kind === 'window' ? 'Màn hình giáo viên' : 'Điều khiển');
      $('ttl').textContent = L.title;
      $('bB').classList.toggle('on', !!m.black); $('bB').innerHTML = `${I('black')}${m.black ? 'Bật lại màn chiếu' : 'Màn đen'}`;
      const s = L.steps[m.i] || L.steps[0] || {}, nx = L.steps[m.i + 1];
      const ask = s.ask && s.ask.q ? `<div class="ask" id="ask"><b>Câu hỏi cho lớp</b>${esc(s.ask.q)}${s.ask.o && s.ask.o.length ? `<ol type="A">${s.ask.o.map((o, k) => `<li class="${k === s.ask.a ? 'a' : ''}">${esc(o)}${k === s.ask.a ? ' ✓' : ''}</li>`).join('')}</ol><button class="rb" id="rb">Hiện đáp án</button>` : ''}${s.ask.e ? `<div class="e">${esc(s.ask.e)}</div>` : ''}</div>` : '';
      const P = s.plan, plan = P ? `<div class="plan"><b>Kịch bản · phút ${P.m[0]}–${P.m[1]}</b><p>${esc(P.gv)}</p>${P.hs ? `<p class="h">Học sinh: ${esc(P.hs)}</p>` : ''}</div>` : '';
      $('main').innerHTML = `<section class="now"><div class="k">Bước ${m.i + 1}/${L.steps.length}${P ? ` · phút ${P.m[0]}–${P.m[1]}` : ''}${m.on ? '' : ' · chưa bắt đầu'}</div><h2>${esc(s.t)}</h2>${plan}<div class="note">${esc(s.note) || '<span style="color:var(--bg-ink3)">Bước này chưa có ghi chú.</span>'}</div>${ask}
        ${nx ? `<div class="nx"><span class="k">Tiếp theo</span><br><b>${esc(nx.t)}</b></div>` : L.next ? `<div class="nx"><span class="k">Hết bài · Bài tiếp theo</span><br><b>${esc(L.next.title)}</b></div>` : ''}</section>
        ${L.objectives && L.objectives.length ? `<details><summary>Yêu cầu cần đạt</summary><ul class="obj">${L.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></details>` : ''}
        ${L.pack ? `<a class="pk" href="${esc(L.pack)}" target="_blank" rel="noopener">Kịch bản và phiếu in ›</a>` : ''}`;
      const rb = $('rb'); if (rb) rb.onclick = () => $('ask').classList.add('rev');
      $('list').innerHTML = `<div class="k" style="padding:8px 12px">${L.steps.length} bước</div><ol class="steps">${L.steps.map((x, k) => `<li class="${k === m.i ? 'cur' : ''}" data-i="${k}"><b>${k + 1}</b><span>${esc(x.t)}${x.plan ? ` <span class="q">${x.plan.m[0]}′</span>` : ''}</span>${x.ask ? '<span class="q">câu hỏi</span>' : ''}</li>`).join('')}</ol>`;
      $('list').querySelectorAll('li[data-i]').forEach((li) => { li.onclick = () => send({ t: 'go', i: +li.dataset.i }); });
      const cur = $('list').querySelector('.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
      if (!fresh && m.i !== prevI) { $('main').scrollTop = 0; try { if (kind !== 'window' && navigator.vibrate) navigator.vibrate(10); } catch (e) { /* bỏ qua */ } }
      prevI = m.i;
    });
    send({ t: 'hello' });
    return { status: (txt, ok) => { conn(txt, ok); if (ok) setTimeout(() => conn(''), 1500); } };
  }

  /* ---------- màn tải, gợi ý lần đầu ---------- */
  function dropLoader() {
    const ld = document.getElementById('bgs-load'); if (!ld) return void setTimeout(perfWatch, 3000);
    const done = () => { const bi = ld.querySelector('i'); if (bi) bi.style.width = '100%'; ld.classList.add('out'); setTimeout(() => ld.remove(), 700); setTimeout(perfWatch, 1500); setTimeout(prefetchNext, 8000); setTimeout(checkPack, 2500); };
    // bài có lớp #loading riêng (Tế Bào, Cổ Loa, Cơ thể người): giữ màn tải có bìa tới khi lớp đó ẩn, để người xem không rơi vào
    // một khung trắng chỉ có dòng chữ; nếu dòng đó đổi thành báo lỗi (không bắt đầu bằng "Đang") thì gỡ ngay cho đọc được.
    const busy = () => { const l = document.getElementById('loading'); return !!l && !l.hidden && l.offsetParent !== null && /^Đang/.test(l.textContent.trim()); };
    let n = 0; const wait = () => { const c = document.querySelector('canvas'); if (((c && c.width > 0) && !busy()) || ++n > 240) requestAnimationFrame(() => requestAnimationFrame(done)); else setTimeout(wait, 100); };
    wait();
  }
  setTimeout(() => { const ld = document.getElementById('bgs-load'); if (ld) { ld.classList.add('out'); setTimeout(() => ld.remove(), 700); } perfWatch(); }, 25000);
  /* "Lưu bài để dùng khi mất mạng": bài có tệp kèm chỉ tải khi cần (mô hình, ảnh) thì nhờ sw.js tải đủ cả thư mục bài, để giáo viên
     chuẩn bị trước giờ học. Chỉ hiện khi trang là index.html của thư mục bài, do sw.js phục vụ, và bài có tệp kèm. */
  const mb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  function lessonDir() {
    try { const sw = navigator.serviceWorker; if (!sw || !sw.controller) return null;
      const scope = new URL('./', sw.controller.scriptURL).pathname, p = location.pathname.replace(/index\.html$/, '');
      return p.endsWith('/') && p.startsWith(scope) && p.length > scope.length ? decodeURIComponent(p.slice(scope.length)) : null;
    } catch (e) { return null; }
  }
  function askSw(msg, on) { const ch = new MessageChannel(); ch.port1.onmessage = (e) => on(e.data || {}); navigator.serviceWorker.controller.postMessage(msg, [ch.port2]); }
  function checkPack() { const dir = lessonDir(); if (!dir) return; askSw({ t: 'goi', dir }, (r) => { S.goi = r; if (menu) renderMenu(); }); }
  function saveLesson() {
    const dir = lessonDir(), g = S.goi; if (!dir || !g || !g.con) return;
    if (g.bytes > 30 * 1048576 && !window.confirm(`Bài này nặng ${mb(g.bytes)} (${g.n} tệp). Lưu về máy để dùng khi mất mạng?`)) return;
    say('Đang lưu bài về máy…');
    askSw({ t: 'luu', dir }, (r) => {
      if (!r.xong) { toast.textContent = `Đang lưu bài: ${r.done}/${r.n} tệp`; toast.classList.add('show'); clearTimeout(say.t); return; }
      say(r.loi ? `Còn ${r.loi} tệp chưa lưu được, thử lại khi mạng ổn` : 'Đã lưu bài: mở được khi mất mạng');
      checkPack();
    });
  }
  /* tải trước "Bài sau" vào bộ nhớ đệm của site (sw.js, tools/sw.py) khi máy rảnh: bấm sang là mở ngay. Không làm khi người dùng
     bật tiết kiệm dữ liệu, mạng 2G/3G, hoặc trang chưa do sw.js phục vụ (lần đầu vào site). */
  function prefetchNext() {
    const L = S.L, sw = navigator.serviceWorker;
    if (!L || !L.next || !L.next.href || !sw || !sw.controller) return;
    const c = navigator.connection; if (c && (c.saveData || /2g|3g/.test(c.effectiveType || ''))) return;
    const go = () => { try { sw.controller.postMessage({ t: 'prefetch', urls: [new URL(L.next.href, location.href).href] }); } catch (e) { /* bỏ qua */ } };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 15000 }); else setTimeout(go, 1000);
  }
  /* đo nhịp khung hình: 3 lượt liền (mỗi lượt 90 khung hoặc 2,5 giây) có p90 trên 25 ms thì bật chế độ nhẹ một lần, phát sự kiện 'bg:lite'
     để bài tự hạ độ phân giải. Máy đủ mạnh giữ nguyên kính mờ. ?lite=1 ép bật, ?lite=0 tắt hẳn. Tab ẩn: trình duyệt tự dừng. */
  function lite(why) {
    const H = document.documentElement; if (H.dataset.bgLite) return;
    H.dataset.bgLite = '1'; dispatchEvent(new CustomEvent('bg:lite', { detail: { why } }));
  }
  function perfWatch() {
    if (perfWatch.on) return; perfWatch.on = true;
    const q = location.search;
    if (/[?&]lite=1/.test(q)) return lite('ép');
    if (/[?&]lite=0/.test(q)) return;
    let last = 0, buf = [], slow = 0, t0 = 0;
    const tick = (t) => {
      if (document.documentElement.dataset.bgLite) return;
      if (last && !document.hidden) { const dt = t - last; if (dt < 5000) buf.push(dt); }
      last = t; if (!t0) t0 = t;
      if (buf.length >= 90 || (buf.length >= 8 && t - t0 > 2500)) {
        t0 = t;
        buf.sort((a, b) => a - b); const p90 = buf[Math.floor(buf.length * 0.9)]; buf = [];
        slow = p90 > 25 ? slow + 1 : 0;
        if (slow >= 3) return lite(Math.round(p90) + ' ms');
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function firstHint(L) {
    if (L.hints === false || store.get('bg-hint', '') === '2') return;
    const touch = matchMedia('(pointer: coarse)').matches;
    hint = mk('bgs-hint bgs-glass', touch ? `<span>${ico('hand')}Kéo để xoay</span><span>${ico('pinch')}Hai ngón để phóng</span><span>${ico('tap')}Chạm vào vật</span>` : `<span>${ico('hand')}Kéo để xoay</span><span>${ico('pinch')}Cuộn để phóng</span><span>${ico('tap')}Bấm vào vật để xem</span>`);
    hint.setAttribute('aria-hidden', 'true');
    setTimeout(() => hint.classList.add('show'), 900);
    const off = () => { hint.classList.remove('show'); removeEventListener('pointerdown', off, true); };
    setTimeout(off, 900 + (reduced() ? 4000 : 3200)); addEventListener('pointerdown', off, true);
    store.set('bg-hint', String(+store.get('bg-hint', '0') + 1));
  }

  /* ---------- gắn vào bài ---------- */
  const mk = (cls, html) => { const n = el('div', 'bgs ' + cls, html); document.body.appendChild(n); return n; };
  function mount(L) {
    if (!L || typeof L.go !== 'function') throw new Error('BGShell.mount cần { steps, go(i) }');
    S.L = L; S.variant = L.variant || 'pho-thong'; S.i = -1;
    // vị trí của bài trong site (tools/chuoi_bai.py, nhúng bởi inject_shell.py): chủ đề, bài tiếp theo, màu môn
    const Q = window.BG_SEQ;
    if (Q) {
      const R = root(), fix = (h) => (/^(https?:|\/)/.test(h) ? h : R + h);
      if (Q.title && (!L.title || L.title === document.title)) L.title = Q.title;
      if (!L.crumb && Q.crumb) L.crumb = Q.crumb.map((c) => ({ t: c.t, href: c.href ? fix(c.href) : '' }));
      if (L.next === undefined && Q.next) L.next = Object.assign({}, Q.next, { href: fix(Q.next.href) });
      if (!L.accent && Q.s && SUBJECT[Q.s]) L.accent = SUBJECT[Q.s];
      // gói dạy thử (tools/build_goi_day.py): trang kịch bản, phiếu in; phút dự kiến và việc của giáo viên từng bước
      if (L.pack === undefined && Q.pack) { try { L.pack = new URL(fix(Q.pack), location.href).href; } catch (e) { L.pack = fix(Q.pack); } }
      if (!L.plan && Q.plan) L.plan = Q.plan;
    }
    const H = document.documentElement;
    H.dataset.bgVariant = S.variant;
    if (L.accent) H.style.setProperty('--bg-accent', L.accent);
    if (!H.lang) H.lang = 'vi';
    injectStyle();
    if (store.get('bg-chieu', '0') === '1' || new URLSearchParams(location.search).has('chieu')) H.setAttribute('data-chieu', '');
    setupPanels(L);
    document.body.classList.add('bgs-on');
    buildBar(L);
    buildNav();
    nextCard = mk('bgs-next bgs-glass', ''); nextCard.setAttribute('role', 'complementary'); nextCard.setAttribute('aria-label', 'Bài tiếp theo');
    nextCard.addEventListener('click', (e) => { if (e.target.closest('.x')) hideNext(); });
    black = mk('bgs-black', '<span>Màn đen · bấm B để bật lại</span>');
    modal = mk('bgs-modal', '<div class="bgs-card" role="dialog" aria-modal="true"></div>');
    toast = mk('bgs-toast bgs-glass', ''); toast.setAttribute('role', 'status');
    live = el('div', 'bgs-sr'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
    const relayout = () => {
      document.body.classList.toggle('bgs-phone', isPhone());
      if (L.layout && typeof L.layout.apply === 'function') { try { L.layout.apply({ phone: isPhone(), on: S.on }); } catch (e) { console.error(e); } }
    };
    S.relayout = relayout; addEventListener('resize', () => { relayout(); applyPanels(false); render(); closePops(); });
    applyPanels(true); relayout();
    black.addEventListener('click', () => setBlack(false));
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-x]')) closeModal();
    });
    addEventListener('keydown', onKey, true);
    const q = new URLSearchParams(location.search);
    if (q.has('lenlop') && L.steps && L.steps.length) start();
    render(); dropLoader(); firstHint(L);
    return api;
  }
  // bài tự chuyển bước (nút, phím của bài): vỏ đi theo; không tự bật chế độ lên lớp
  function update(i) {
    if (!S.L) return;
    if (i == null || i < 0) { S.i = -1; if (S.on) stop(); else { hideNext(); broadcast(); } return; }
    if (i === S.i) { broadcast(); return; }
    S.i = i; stepChanged();
  }

  /* ---------- trang điều khiển trên điện thoại ---------- */
  async function phonePage(rootUrl) {
    document.title = 'Điều khiển · Sáng Ăn Khoai';
    const R = rootUrl || '../';
    const st = document.createElement('style');
    st.textContent = FONTFACE(R) + TOKENS_CSS + `*,*::before,*::after{box-sizing:border-box}body{margin:0;font:500 var(--bg-fs-sm)/1.5 var(--bg-font);color:var(--bg-ink);background:var(--bg-page);-webkit-font-smoothing:antialiased}
      .w{max-width:420px;margin:0 auto;padding:calc(28px + env(safe-area-inset-top)) 20px 32px}
      @media (min-width:640px){body{min-height:100vh;display:grid;place-items:center}.w{width:440px;margin:48px auto;padding:36px 36px 28px;background:var(--bg-surface);border-radius:var(--bg-r-lg);box-shadow:var(--bg-sh-2)}}
      .h{display:flex;align-items:center;gap:12px;margin-bottom:28px;min-height:44px}.h svg,.h img{width:32px;height:32px}.h b{font-size:var(--bg-fs-sm)}
      h2{margin:0 0 8px;font:400 34px/1.12 var(--bg-serif);letter-spacing:-.02em}p{margin:0 0 24px;color:var(--bg-ink2)}
      ol{margin:0 0 24px;padding-left:20px;color:var(--bg-ink2);display:grid;gap:6px}ol b{color:var(--bg-ink)}
      form{display:grid;gap:12px}
      input{width:100%;height:64px;padding:0 16px;border-radius:var(--bg-r-md);border:1.5px solid var(--bg-hair2);background:var(--bg-surface);font:600 30px var(--bg-mono);letter-spacing:10px;text-align:center;text-transform:uppercase;color:var(--bg-ink)}
      input:focus{outline:none;border-color:var(--bg-brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--bg-brand) 20%,transparent)}
      button{width:100%;height:48px;border:0;border-radius:var(--bg-r-pill);background:var(--bg-brand);color:var(--bg-brand-ink);font:600 var(--bg-fs-sm) var(--bg-font);cursor:pointer}
      button:disabled{background:var(--bg-hair);color:var(--bg-ink3);cursor:default}.f{margin-top:20px;font-size:var(--bg-fs-xs);color:var(--bg-ink3)}`;
    document.head.appendChild(st);
    const code0 = decodeURIComponent(location.hash.slice(1)).trim().toUpperCase();
    const askCode = () => new Promise((ok) => {
      document.body.innerHTML = `<div class="w"><a class="h" href="${R}" style="text-decoration:none;color:inherit">${LOGO}<b>Sáng Ăn Khoai</b></a><h2>Điều khiển bài giảng</h2><ol><li>Trên máy chiếu, mở bài, bấm nút <b>⋯</b> rồi chọn <b>Điều khiển bằng điện thoại</b>.</li><li>Nhập mã 6 ký tự hiện trên màn chiếu.</li></ol>
        <form id="f"><input id="c" maxlength="6" inputmode="text" autocapitalize="characters" autocomplete="off" aria-label="Mã kết nối" placeholder="······"><button id="g" disabled>Kết nối</button></form>
        <div class="f">Hai máy nối trực tiếp, không lưu gì trên máy chủ. Cần mạng Internet.</div></div>`;
      const c = document.getElementById('c'), g = document.getElementById('g');
      c.addEventListener('input', () => { c.value = c.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); g.disabled = c.value.length !== 6; });
      document.getElementById('f').onsubmit = (e) => { e.preventDefault(); if (c.value.length === 6) ok(c.value); };
      c.focus();
    });
    const code = /^[A-Z0-9]{6}$/.test(code0) ? code0 : await askCode();
    let handler = null, conn = null;
    const ui = runRemote(document, { send: (m) => conn && conn.open && conn.send(m), onMessage: (fn) => { handler = fn; } }, 'pho-thong', 'phone', R);
    ui.status('Đang tải bộ kết nối…');
    try { if (!window.Peer) await loadScript(PEERJS); } catch (e) { ui.status('Cần mạng Internet để kết nối'); return; }
    const peer = new window.Peer();
    peer.on('error', (e) => ui.status('Lỗi kết nối: ' + (e && e.type || e)));
    peer.on('disconnected', () => ui.status('Mất kết nối mạng · đang thử lại…'));
    peer.on('open', () => {
      ui.status('Đang nối mã ' + code + '…');
      conn = peer.connect('baigiang-' + code.toLowerCase(), { reliable: true });
      conn.on('open', () => { ui.status('Đã nối', true); conn.send({ t: 'hello' }); });
      conn.on('data', (m) => handler && handler(m));
      conn.on('close', () => ui.status('Mất kết nối · quét lại mã trên màn chiếu'));
    });
    addEventListener('offline', () => ui.status('Điện thoại mất mạng'));
  }

  const api = { version: VERSION, mount, update, refresh: () => broadcast(), go, next, prev, start, stop, phonePage, runRemote, projector, panel: togglePanel, say, lite,
    get state() { return snapshot(); }, _handle: handle, icon: ico };
  window.BGShell = api;
})();
