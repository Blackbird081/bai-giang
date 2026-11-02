// Nén mô hình BodyVista: tách glb khỏi tệp .js (base64), nén EXT_meshopt_compression + lượng tử hoá, ghi .glb.
// Dùng: node compress.mjs <thư mục assets nguồn> <thư mục ra>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const files = [];
for (const d of ['', 'detail']) for (const f of fs.readdirSync(path.join(src, d))) if (f.endsWith('.js')) files.push(path.join(d, f));
let n = 0, inB = 0, outB = 0;
for (const rel of files) {
  const dst = path.join(out, rel.replace(/\.js$/, '.glb'));
  if (fs.existsSync(dst)) { n++; continue; }
  const m = fs.readFileSync(path.join(src, rel), 'utf8').match(/\bglb"\s*:\s*"([A-Za-z0-9+/=]+)"/);
  if (!m) { console.log('bỏ qua', rel); continue; }
  const buf = Buffer.from(m[1], 'base64'); inB += buf.length;
  const doc = await io.readBinary(new Uint8Array(buf));
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const o = await io.writeBinary(doc); outB += o.length;
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, o);
  if (++n % 200 === 0) console.log(n, '/', files.length, (inB / 1e6).toFixed(0), '→', (outB / 1e6).toFixed(0), 'MB');
}
console.log('xong', n, 'tệp', (inB / 1e6).toFixed(1), '→', (outB / 1e6).toFixed(1), 'MB');
