#!/usr/bin/env node
// Đóng gói mỗi robot (thư mục có main.js) thành một trang HTML. Theo build.mjs của teardown (MIT).
//   node build.mjs                      → ../../robotics/<tên>/index.html, liên kết về trang chính là ../../
//   node build.mjs ur5e --hub URL --out DIR   → DIR/<tên>.html với liên kết tuyệt đối (bản đăng)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import esbuild from 'esbuild';
import {execFileSync} from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const NM = path.join(HERE, 'node_modules');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const hub = opt('--hub'); const outDir = opt('--out');

// Phông: dùng phông nhà (Be Vietnam Pro, JetBrains Mono 500/600) do vỏ chung nạp từ design/fonts/ (tools/inject_shell.py),
// như mọi trang khác của site; không đóng gói phông riêng.
// vỏ Sáng Ăn Khoai v2 nhúng sau khi đóng gói bằng tools/inject_shell.py (token, phông, màn tải, thứ tự bài)
const ALL = fs.readdirSync(HERE).filter((d) => fs.existsSync(path.join(HERE, d, 'main.js'))).sort();
// Bản trên site: đóng gói mọi bài một lượt với esbuild splitting, phần mã dùng chung (three.js, bộ kit) ra tệp riêng ở
// robotics/_chung/chung-<mã băm>.js. Chuyển từ bài này sang bài khác chỉ tải phần riêng của bài; phần chung nằm sẵn trong bộ
// nhớ đệm. Phần chung phụ thuộc tập bài, nên bản site luôn dựng đủ mọi bài dù gọi tên một bài. Mọi trang bài nằm sâu hai cấp
// (robotics/<tên>/, cong-nghe/<tên>/…) nên đường dẫn tới phần chung là ../../robotics/_chung/. Bản một tệp (--out) giữ nguyên.
const CHUNG = 'robotics/_chung';
let shared = null;
if (!outDir) {
  const res = await esbuild.build({
    entryPoints: Object.fromEntries(ALL.map((n) => [n, path.join(HERE, n, 'main.js')])), bundle: true, splitting: true, outdir: path.join(HERE, '.out'),
    chunkNames: 'chung-[hash]', nodePaths: [NM], format: 'esm', minify: !process.env.DEBUG, write: false, target: 'es2022', legalComments: 'none',
    logLevel: 'warning', define: {HUB_URL: JSON.stringify(hub || '../../'), ASSET_MAP: 'null'},
  });
  shared = {};
  const dir = path.join(REPO, CHUNG); fs.mkdirSync(dir, {recursive: true});
  const keep = new Set();
  const fix = (t) => t.replace(/(from\s*|import\s*\(?\s*)(["'])\.\/(chung-[A-Z0-9]+\.js)\2/g, (m, a, q, f) => `${a}${q}../../${CHUNG}/${f}${q}`);
  for (const f of res.outputFiles) {
    const base = path.basename(f.path);
    if (base.startsWith('chung-')) { keep.add(base); fs.writeFileSync(path.join(dir, base), f.text); }   // tệp chung gọi nhau bằng ./ (cùng thư mục)
    else shared[base.replace(/\.js$/, '')] = fix(f.text);
  }
  for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.rmSync(path.join(dir, f));
  console.log(`phần chung: ${[...keep].map((f) => `${f} ${(fs.statSync(path.join(dir, f)).size / 1024).toFixed(0)} KB`).join(', ')}`);
}
const names = outDir ? (args.length ? args : ALL) : ALL;
for (const name of names) {
  const dir = path.join(HERE, name), t0 = Date.now();
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  // tệp kèm (vd. mô hình .glb của bài Cá thở bằng mang): meta.assets là tên thư mục cạnh trang đăng, trang đọc qua đường dẫn
  // tương đối. Thư mục cạnh trang là bản duy nhất trong git (Pages phục vụ thẳng từ gốc kho); nếu thư mục bài có thư mục cùng
  // tên thì đó là nguồn và được chép sang. Bản đăng một tệp (--out) nhúng thành data: URL qua ASSET_MAP.
  let assetMap = null;
  if (meta.assets) {
    const pub = path.join(path.dirname(path.join(REPO, meta.out || path.join('robotics', name, 'index.html'))), meta.assets);
    const local = path.join(dir, meta.assets), src = fs.existsSync(local) ? local : pub;
    const files = fs.readdirSync(src).filter((f) => /\.(glb|webp|png|jpg|json)$/.test(f));
    const mime = (f) => (f.endsWith('.json') ? 'application/json' : f.endsWith('.glb') ? 'model/gltf-binary' : f.endsWith('.webp') ? 'image/webp' : f.endsWith('.png') ? 'image/png' : 'image/jpeg');
    if (outDir) assetMap = Object.fromEntries(files.map((f) => [f, `data:${mime(f)};base64,${fs.readFileSync(path.join(src, f)).toString('base64')}`]));
    else if (src !== pub) {
      fs.mkdirSync(pub, {recursive: true});
      for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(pub, f));
    }
  }
  const one = shared ? null : await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')], bundle: true, nodePaths: [NM], format: 'esm', minify: !process.env.DEBUG, write: false,
    target: 'es2022', legalComments: 'none', logLevel: 'warning', define: {HUB_URL: JSON.stringify(hub || '../../'), ASSET_MAP: JSON.stringify(assetMap)},
  });
  const js = (shared ? shared[name] : one.outputFiles[0].text).replace(/<\/script/g, '<\\/script');
  // tải song song phần chung mà bài này gọi thẳng
  const pre = shared ? [...new Set([...js.matchAll(/\.\.\/\.\.\/robotics\/_chung\/chung-[A-Z0-9]+\.js/g)].map((m) => m[0]))].map((u) => `<link rel="modulepreload" href="${u}">\n`).join('') : '';
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3EFE6">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
${pre}</head>
<body>
<div id="app"></div>
<!-- Dựng trên teardown của elvarofficial và claude-motion của whaleyxbt (MIT). Mã nguồn: github.com/nclamvn/bai-giang/tree/main/tools/robotics -->
<script type="module">
${js}
</script>
</body>
</html>
`;
  // bài ngoài mạch robotics (vd. Công nghệ 11) khai báo nơi đặt trong meta.json: {"out": "cong-nghe/dong-co-4-ki/index.html"}
  const out = outDir ? path.join(outDir, `${name}.html`) : path.join(REPO, meta.out || path.join('robotics', name, 'index.html'));
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, html);
  execFileSync('python3', [path.join(REPO, 'tools/inject_shell.py'), ...(hub ? [`--root=${hub}`] : []), `--as=${meta.out || `robotics/${name}/index.html`}`, out], {stdio: 'inherit'});
  console.log(`${path.relative(process.cwd(), out)}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
