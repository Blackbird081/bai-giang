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
const inline = (cssFile) => {
  const dir = path.dirname(cssFile);
  return fs.readFileSync(cssFile, 'utf8').split('/* ').slice(1)
    .filter((b) => /-(latin|latin-ext|vietnamese)-/.test(b.split('*/')[0]))
    .map((b) => b.slice(b.indexOf('*/') + 2)
      .replace(/url\(\.\/files\/([^)]+?\.woff2)\) format\('([^']+)'\)(,\s*url\([^)]+\) format\('woff'\))?/g, (m, f, fmt) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'files', f)).toString('base64')}) format('${fmt}')`)
      .replace("'Inter Variable'", "'Inter'"))
    .join('\n');
};
const FONTS = [400, 600, 700].map((w) => inline(path.join(NM, `@fontsource/jetbrains-mono/${w}.css`))).join('\n') + '\n' + inline(path.join(NM, '@fontsource-variable/inter/wght.css'));

// vỏ Sáng Ăn Khoai v2 nhúng sau khi đóng gói bằng tools/inject_shell.py (token, phông, màn tải, thứ tự bài)
const names = args.length ? args : fs.readdirSync(HERE).filter((d) => fs.existsSync(path.join(HERE, d, 'main.js')));
for (const name of names) {
  const dir = path.join(HERE, name), t0 = Date.now();
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const res = await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')], bundle: true, nodePaths: [NM], format: 'esm', minify: !process.env.DEBUG, write: false,
    target: 'es2022', legalComments: 'none', logLevel: 'warning', define: {HUB_URL: JSON.stringify(hub || '../../')},
  });
  const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f2e6d2">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<style>
${FONTS}
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
  const out = outDir ? path.join(outDir, `${name}.html`) : path.join(REPO, 'robotics', name, 'index.html');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, html);
  execFileSync('python3', [path.join(REPO, 'tools/inject_shell.py'), ...(hub ? [`--root=${hub}`] : []), `--as=robotics/${name}/index.html`, out], {stdio: 'inherit'});
  console.log(`${path.relative(process.cwd(), out)}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
