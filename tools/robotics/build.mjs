#!/usr/bin/env node
// Đóng gói mỗi robot (thư mục có main.js) thành một tệp HTML chạy offline: three.js, phông Inter và JetBrains Mono
// (gồm bộ chữ tiếng Việt) nhúng sẵn. Theo build.mjs của teardown (MIT).
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

// @font-face của fontsource, đổi url() thành data: cho ba bộ chữ latin, latin-ext, vietnamese
// Trên site: tệp phông nằm cạnh trang (robotics/fonts/), HTML nhẹ hơn ~320 KB và dưới 1 MB để trình đọc liên kết đọc được thẻ chia sẻ
// (bước 9 của quy trình teardown). Bản đăng một tệp (--out) vẫn nhúng phông dạng data.
const FONT_DIR = path.join(REPO, 'robotics', 'fonts');
const inline = (cssFile) => {
  const dir = path.dirname(cssFile);
  return fs.readFileSync(cssFile, 'utf8').split('/* ').slice(1)
    .filter((b) => /-(latin|latin-ext|vietnamese)-/.test(b.split('*/')[0]))
    .map((b) => b.slice(b.indexOf('*/') + 2)
      .replace(/url\(\.\/files\/([^)]+?\.woff2)\) format\('([^']+)'\)(,\s*url\([^)]+\) format\('woff'\))?/g, (m, f, fmt) => {
        if (outDir) return `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'files', f)).toString('base64')}) format('${fmt}')`;
        fs.mkdirSync(FONT_DIR, {recursive: true}); fs.copyFileSync(path.join(dir, 'files', f), path.join(FONT_DIR, f));
        return `url(__FONTS__/${f}) format('${fmt}')`;
      })
      .replace("'Inter Variable'", "'Inter'"))
    .join('\n');
};
const FONTS = [400, 600, 700].map((w) => inline(path.join(NM, `@fontsource/jetbrains-mono/${w}.css`))).join('\n') + '\n' + inline(path.join(NM, '@fontsource-variable/inter/wght.css'));

// vỏ Sáng Ăn Khoai v2 nhúng sau khi đóng gói bằng tools/inject_shell.py (token, phông, màn tải, thứ tự bài)
const names = args.length ? args : fs.readdirSync(HERE).filter((d) => fs.existsSync(path.join(HERE, d, 'main.js')));
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
  const res = await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')], bundle: true, nodePaths: [NM], format: 'esm', minify: !process.env.DEBUG, write: false,
    target: 'es2022', legalComments: 'none', logLevel: 'warning', define: {HUB_URL: JSON.stringify(hub || '../../'), ASSET_MAP: JSON.stringify(assetMap)},
  });
  const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<style>
${outDir ? FONTS : FONTS.replaceAll('__FONTS__', path.relative(path.dirname(path.join(REPO, meta.out || path.join('robotics', name, 'index.html'))), FONT_DIR).split(path.sep).join('/'))}
</style>
</head>
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
