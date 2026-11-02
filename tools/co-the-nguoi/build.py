#!/usr/bin/env python3
"""Dựng bài "Cơ thể người 3D" từ mã nguồn BodyVista (FreedomIntelligence, MIT) cho Sáng Ăn Khoai.

  python3 tools/co-the-nguoi/build.py

Nguồn gốc giữ nguyên trong tools/co-the-nguoi/upstream/ (commit ghi ở UPSTREAM_COMMIT). Mỗi lần dựng:
  1. chép upstream vào thư mục tạm, áp các thay đổi của Sáng Ăn Khoai (hàm patch_* bên dưới, ghi rõ từng chỗ);
  2. đóng gói bằng esbuild của dự án (không chạy cấu hình Vite của upstream);
  3. ghi co-the-nguoi/index.html, co-the-nguoi/app/, co-the-nguoi/dental/index.html, co-the-nguoi/dental/app/;
  4. nhúng vỏ Sáng Ăn Khoai (tools/inject_shell.py).
Mô hình đã nén sẵn nằm trong co-the-nguoi/assets/ (tools/co-the-nguoi/models.mjs), không dựng lại ở đây.

Thay đổi so với upstream:
  - tiếng Việt là ngôn ngữ mặc định (từ điển vi.json, 4.332 mục, khoá là câu gốc tiếng Trung), vẫn đổi được sang 中文/English/日本語;
  - nạp mô hình nén EXT_meshopt_compression + KHR_mesh_quantization (nhỏ hơn khoảng 3,4 lần), trả toạ độ về float sau khi nạp;
  - lớp giao diện nhà Sáng Ăn Khoai (house.css), thanh đầu bài chung, bài học từng bước cho giáo viên (lesson.js).
"""
import json, pathlib, re, shutil, subprocess, sys, tempfile
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
UP = HERE / 'upstream'
OUT = ROOT / 'co-the-nguoi'
ESBUILD = ROOT / 'tools/robotics/node_modules/esbuild/bin/esbuild'
sys.path.insert(0, str(ROOT / 'tools'))
import inject_shell  # noqa: E402


def sub1(s, old, new, name):
    if s.count(old) != 1:
        raise SystemExit(f'patch {name}: không thấy đúng một chỗ khớp: {old[:70]!r}')
    return s.replace(old, new)


def patch_i18n(s):
    s = sub1(s, "import anatomy from './locales/anatomy.json' with { type: 'json' };",
             "import anatomy from './locales/anatomy.json' with { type: 'json' };\nimport VI from './locales/vi.json' with { type: 'json' }; // Sáng Ăn Khoai: tiếng Việt", 'i18n import')
    s = sub1(s, "export const languages = ['zh-CN', 'en', 'ja'];", "export const languages = ['vi', 'zh-CN', 'en', 'ja'];", 'i18n languages')
    s = sub1(s, "let language = 'zh-CN';", "let language = 'vi';", 'i18n default')
    s = sub1(s, "  return locale === 'zh-CN' ? part.name : anatomy[part.name]?.[locale === 'en' ? 0 : 1] || t('名称未设置');",
             "  if (locale === 'vi') return VI[part.name] || anatomy[part.name]?.[0] || t('名称未设置');\n"
             "  return locale === 'zh-CN' ? part.name : anatomy[part.name]?.[locale === 'en' ? 0 : 1] || t('名称未设置');", 'i18n partName')
    s = sub1(s, "  const key = text.trim(), slot = language === 'en' ? 0 : 1;", "  const key = text.trim(), slot = language === 'en' ? 0 : language === 'vi' ? 2 : 1;", 'i18n slot')
    s = sub1(s, "  let result = translateAuthoredText(key, slot) || names.get(key)?.[slot];", "  let result = translateAuthoredText(key, slot) || (slot === 2 ? VI[key] : names.get(key)?.[slot]);", 'i18n lookup')
    s = sub1(s, "  const format = (en, ja) => language === 'en' ? en : ja;", "  const format = (en, ja, vi) => language === 'en' ? en : language === 'vi' ? vi : ja;", 'i18n format')
    s = s.replace("(language === 'en' ? ' ' : '')", "(language === 'en' || language === 'vi' ? ' ' : '')")
    # các mẫu câu ghép: thêm bản tiếng Việt làm đối số thứ ba
    vi = [
        ("`${t(match[1])} を読み込み中…`)", "`${t(match[1])} を読み込み中…`,`Đang tải ${t(match[1])}…`)"),
        ("`${t(match[1])} の読み込みがタイムアウトしました`)", "`${t(match[1])} の読み込みがタイムアウトしました`,`Tải ${t(match[1])} quá thời gian`)"),
        ("`${match[1]} / ${match[2]} 構造`)", "`${match[1]} / ${match[2]} 構造`,`${match[1]} / ${match[2]} cấu trúc`)"),
        ("`${match[1]} 件の構造`)", "`${match[1]} 件の構造`,`${match[1]} cấu trúc`)"),
        ("`${match[1]} 件選択`)", "`${match[1]} 件選択`,`Đã chọn ${match[1]}`)"),
        ("`第 ${match[1]} / ${match[2]} 問・${match[3]} 問正解`)", "`第 ${match[1]} / ${match[2]} 問・${match[3]} 問正解`,`Câu ${match[1]} / ${match[2]} · đúng ${match[3]} câu`)"),
        ("`${match[1]} / ${match[2]} 問正解`)", "`${match[1]} / ${match[2]} 問正解`,`Đúng ${match[1]} / ${match[2]} câu`)"),
        ("`${t(match[2])}${{减少:'を減らす',增加:'を増やす',筛选:'で絞り込む'}[match[1]]}`)", "`${t(match[2])}${{减少:'を減らす',增加:'を増やす',筛选:'で絞り込む'}[match[1]]}`,`${{减少:'Giảm',增加:'Tăng',筛选:'Lọc'}[match[1]]} ${t(match[2])}`)"),
        ("`${{'找到：':'探す：','✓ ':'✓ ','已添加 ':'追加：','找到了：':'発見：'}[match[1]]}${t(match[2])}`)", "`${{'找到：':'探す：','✓ ':'✓ ','已添加 ':'追加：','找到了：':'発見：'}[match[1]]}${t(match[2])}`,`${{'找到：':'Tìm: ','✓ ':'✓ ','已添加 ':'Đã thêm: ','找到了：':'Đã tìm thấy: '}[match[1]]}${t(match[2])}`)"),
        ("`全身高の ${match[1]}%`)", "`全身高の ${match[1]}%`,`${match[1]}% chiều cao cơ thể`)"),
        ("`これは ${t(match[1])} です。${t(match[2])} を探してください。`)", "`これは ${t(match[1])} です。${t(match[2])} を探してください。`,`Đây là ${t(match[1])}. Tiếp tục tìm ${t(match[2])}.`)"),
        ("`${t(match[1])} 正解：${t(match[2])}。系統：${t(match[3])}。`)", "`${t(match[1])} 正解：${t(match[2])}。系統：${t(match[3])}。`,`${t(match[1])} Đáp án: ${t(match[2])}. Thuộc hệ: ${t(match[3])}.`)"),
        ("format(' · ', '・')", "format(' · ', '・', ' · ')"),
    ]
    for a, b in vi:
        s = sub1(s, a, b, 'i18n format vi')
    return s


def patch_dictionary(s):
    s = sub1(s, "import extra from './extra.json' with { type: 'json' };",
             "import extra from './extra.json' with { type: 'json' };\nimport VI from './vi.json' with { type: 'json' }; // Sáng Ăn Khoai: ô thứ ba là tiếng Việt", 'dict import')
    s = sub1(s, "  const key = text.trim();\n  if (dictionary[key]) return dictionary[key][slot];",
             "  const key = text.trim();\n  if (slot === 2) {\n    if (VI[key]) return VI[key];\n    const parts = key.match(/[^。！？]+[。！？]?/g);\n"
             "    if (parts?.length > 1 && parts.every(p => VI[p.trim()])) return parts.map(p => VI[p.trim()]).join(' ');\n    return;\n  }\n"
             "  if (dictionary[key]) return dictionary[key][slot];", 'dict vi')
    return s


BAKE = r"""
// Sáng Ăn Khoai: mô hình nén meshopt + lượng tử hoá. Sau khi nạp, đưa toạ độ về float và gộp phép biến đổi của nút vào hình học,
// để hộp bao, mặt cắt và mô hình chi tiết dùng đúng hệ toạ độ gốc của BodyVista.
function bakeQuantized(root){
 root.updateMatrixWorld(true);
 root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,a=g.attributes.position,f=new Float32Array(a.count*3);
  for(let i=0;i<a.count;i++){f[i*3]=a.getX(i);f[i*3+1]=a.getY(i);f[i*3+2]=a.getZ(i);}
  g.setAttribute('position',new THREE.BufferAttribute(f,3));g.deleteAttribute('normal');g.applyMatrix4(m.matrixWorld);});
 root.traverse(o=>{o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix();});
 root.updateMatrixWorld(true);
}
"""


def patch_main(s):
    s = sub1(s, "import {GLTFLoader} from './vendor/GLTFLoader.js';",
             "import {GLTFLoader} from './vendor/GLTFLoader.js';\nimport {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';", 'main import')
    s = sub1(s, "loader=new GLTFLoader();", "loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);", 'main loader')
    s = s.replace("const parse=(buffer)=>loader.parse(buffer,'',gltf=>{", "const parse=(buffer)=>loader.parse(buffer,'',gltf=>{bakeQuantized(gltf.scene);")
    if s.count('bakeQuantized(gltf.scene)') != 2:
        raise SystemExit('patch main: cần đúng hai chỗ nạp mô hình')
    s = sub1(s, "const assetResolvers=new Map();", BAKE + "const assetResolvers=new Map();", 'main bake')
    s = sub1(s, "const modelCacheName='bodyvista-models-v2';", "const modelCacheName='sak-co-the-nguoi-meshopt-v1';", 'main cache')
    # API cho bài học: mở trang thử thách và bắt đầu một lượt
    s = sub1(s, " whenIdle:()=>queue,", " whenIdle:()=>queue,openNav:name=>openNav(name),startQuiz:kind=>action(()=>startQuiz(kind)),", 'main api')
    return s


def patch_chatgpt(s):
    return sub1(s, "    ja: `", "    vi: `Hãy giới thiệu cho tôi cấu trúc giải phẫu người “${name}” bằng tiếng Việt. Mở đầu bằng một đoạn tóm tắt ngắn, dễ hiểu, sau đó trình bày: 1. Vị trí và các cấu trúc lân cận; 2. Thành phần chính và đặc điểm hình thái; 3. Chức năng chính; 4. Một điểm dễ nhầm hoặc cần lưu ý khi học. Dùng ngôn ngữ phù hợp với học sinh phổ thông.`,\n    ja: `", 'chatgpt vi')


def patch_index(s):
    s = sub1(s, '<html lang="zh-CN">', '<html lang="vi">', 'index lang')
    s = re.sub(r'<link rel="icon"[^>]*>|<link rel="apple-touch-icon"[^>]*>', '', s)
    s = re.sub(r'<title>[^<]*</title>', '<title>Cơ thể người 3D · Sáng Ăn Khoai</title><meta name="description" content="Bài học 3D về cơ thể người bằng tiếng Việt: 2.900 cấu trúc giải phẫu, 140 chuyển động sinh lí, 6 chủ đề hiển vi và thử thách giải phẫu, theo chương trình Khoa học tự nhiên 8."><link rel="stylesheet" href="./app/main.css"><link rel="stylesheet" href="./app/house.css">', s, count=1)
    s = sub1(s, '<select id="language" aria-label="语言">', '<select id="language" aria-label="语言"><option value="vi">Tiếng Việt</option>', 'index language')
    # bỏ ảnh đếm lượt truy cập của bên thứ ba (trường học: không gửi lượt xem ra máy chủ ngoài); giữ dòng bản quyền, thêm nguồn mô hình
    # trợ năng (axe): nút chế độ dùng aria-selected nên cần vai trò tab; khung cảnh 3D có nhãn nên cần vai trò
    s = sub1(s, '<nav class="workspace-tabs" aria-label="学习模式">', '<nav class="workspace-tabs" aria-label="学习模式" role="tablist">', 'index tablist')
    for bid in ('anatomy-workspace', 'motion-workspace', 'micro-workspace', 'quiz-workspace'):
        s = re.sub(r'(<button[^>]*id="' + bid + '")', r'\1 role="tab"', s, count=1)
    s = sub1(s, '<div id="stage" aria-label="三维人体场景">', '<div id="stage" role="region" aria-label="三维人体场景">', 'index stage role')
    s = re.sub(r'<img class="visitor-badge"[^>]*>', '', s)
    s = s.replace('./src/brand/bodyvista.png', '../design/logo/mark-128.webp')
    s = sub1(s, '<span>© 2026 FreedomAI</span>', '<span>BodyVista © 2026 FreedomAI · mô hình Z-Anatomy, BodyParts3D</span>', 'index credit')
    s = sub1(s, '<script type="module" src="./src/main.js"></script>', '<script type="module" src="./app/main.js"></script><script type="module" src="./app/lesson.js"></script>', 'index script')
    return s


def patch_dental_main(s):
    s = s.replace("['zh-CN','en','ja']", "['vi','zh-CN','en','ja']")
    s = sub1(s, "lang==='en'?' years':lang==='ja'?' 歳':' 岁'", "lang==='en'?' years':lang==='vi'?' tuổi':lang==='ja'?' 歳':' 岁'", 'dental age')
    s = sub1(s, "import './style.css';", "import './style.css';\nimport '../src/house-dental.css';", 'dental house css')
    return s


def patch_dental_strings(s):
    s = sub1(s, "export const translate = (key,lang) => lang === 'en' ? strings[key]?.[0] ?? key : lang === 'ja' ? strings[key]?.[1] ?? key : key;",
             "import VI from '../src/locales/vi.json' with { type: 'json' };\n"
             "export const translate = (key,lang) => lang === 'vi' ? VI[key] ?? strings[key]?.[0] ?? key : lang === 'en' ? strings[key]?.[0] ?? key : lang === 'ja' ? strings[key]?.[1] ?? key : key;", 'dental translate')
    s = sub1(s, " if(lang==='en')return `${primary?'Primary ':''}${upper?'Upper':'Lower'} ${right?'right':'left'} ${row[1]}`;",
             " if(lang==='vi')return `${VI[row[0]]||row[1]}${primary?' sữa':''} hàm ${upper?'trên':'dưới'} bên ${right?'phải':'trái'}`;\n"
             " if(lang==='en')return `${primary?'Primary ':''}${upper?'Upper':'Lower'} ${right?'right':'left'} ${row[1]}`;", 'dental tooth')
    return s


DENTAL_TEETH = {'中切牙': 'Răng cửa giữa', '侧切牙': 'Răng cửa bên', '尖牙': 'Răng nanh', '第一前磨牙': 'Răng hàm nhỏ thứ nhất', '第二前磨牙': 'Răng hàm nhỏ thứ hai',
                '第一磨牙': 'Răng hàm lớn thứ nhất', '第二磨牙': 'Răng hàm lớn thứ hai', '第三磨牙': 'Răng hàm lớn thứ ba'}


def build():
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='ctn-'))
    shutil.copytree(UP, tmp / 'src-root', ignore=shutil.ignore_patterns('node_modules'))
    B = tmp / 'src-root'
    vi = json.loads((HERE / 'vi.json').read_text(encoding='utf-8'))
    for k, v in DENTAL_TEETH.items(): vi.setdefault(k, v)
    (B / 'src/locales/vi.json').write_text(json.dumps(vi, ensure_ascii=False), encoding='utf-8')
    for rel, fn in [('src/i18n.js', patch_i18n), ('src/locales/dictionary.js', patch_dictionary), ('src/main.js', patch_main),
                    ('src/chatgpt-link.js', patch_chatgpt), ('index.html', patch_index), ('dental/main.ts', patch_dental_main), ('dental/strings.js', patch_dental_strings)]:
        p = B / rel; p.write_text(fn(p.read_text(encoding='utf-8')), encoding='utf-8')
    shutil.copy(HERE / 'house-dental.css', B / 'src/house-dental.css')
    (B / 'node_modules').symlink_to(HERE / 'node_modules')
    # đóng gói: ứng dụng chính, bài học, khu răng miệng
    for d in (OUT / 'app', OUT / 'dental/app'):
        shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
    common = ['--bundle', '--format=esm', '--minify', '--target=es2022', '--charset=utf8', '--legal-comments=eof',
              '--define:import.meta.env.BASE_URL="./"', '--define:import.meta.env.DEV=false', '--define:import.meta.env.PROD=true',
              '--define:import.meta.env.VITE_DS_URL=""', '--define:import.meta.env.VITE_DS_REPO_URL=""', '--loader:.json=json']
    def run(args):
        r = subprocess.run([str(ESBUILD), *args], cwd=B, capture_output=True, text=True)
        if r.returncode: raise SystemExit("esbuild lỗi:\n" + r.stderr[-3000:])
    run(['src/main.js', f'--outfile={OUT}/app/main.js', *common])
    run([str(HERE / 'lesson.js'), f'--outfile={OUT}/app/lesson.js', *common])
    run(['dental/main.ts', f'--outfile={OUT}/dental/app/main.js', *common])
    shutil.copy(HERE / 'house.css', OUT / 'app/house.css')
    # chuẩn chữ của Sáng Ăn Khoai: không chữ nào dưới 13 px (điện thoại 14 px, qua --bg-fs-min)
    import minfont
    for css in (OUT / 'app/main.css', OUT / 'dental/app/main.css'):
        css.write_text(minfont.fix(css.read_text(encoding='utf-8'))[0], encoding='utf-8')
    # trang
    html = (B / 'index.html').read_text(encoding='utf-8')
    html = inject_shell.inject(html, None, 'co-the-nguoi/index.html')
    (OUT / 'index.html').write_text(html, encoding='utf-8')
    dh = (B / 'dental/index.html').read_text(encoding='utf-8')
    dh = dh.replace('<title>BodyVista</title>', '<title>Răng miệng · Cơ thể người 3D</title><link rel="stylesheet" href="../../design/house.css">')
    dh = dh.replace('<html lang="zh-CN">', '<html lang="vi">').replace('<script type="module" src="./main.ts"></script>',
                    '<link rel="stylesheet" href="./app/main.css"><script type="module" src="./app/main.js"></script>')
    (OUT / 'dental/index.html').write_text(dh, encoding='utf-8')
    # ghi công đi kèm: giấy phép, nguồn mô hình, ghi chép răng miệng (trang có liên kết tới CREDITS.md)
    for rel in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy(UP / rel, OUT / rel)
    vd = OUT / 'dental/vendor'; shutil.rmtree(vd, ignore_errors=True)
    shutil.copytree(UP / 'dental/vendor', vd, ignore=shutil.ignore_patterns('src'))
    shutil.rmtree(tmp)
    size = sum(f.stat().st_size for f in (OUT / 'app').iterdir())
    print(f'đã dựng co-the-nguoi/ (app {size / 1e6:.1f} MB, {len(vi)} mục tiếng Việt)')


if __name__ == '__main__':
    build()
