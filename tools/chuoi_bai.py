#!/usr/bin/env python3
"""Thứ tự bài và vị trí của từng bài trong site: một nguồn cho "Bài tiếp theo", đường dẫn chủ đề và ảnh bìa màn tải.

Mỗi bài 3D có một khoá là đường dẫn tệp tính từ gốc repo (vd. 'te-bao/index.html', 'thu-vien/enzyme-step.html').
Đường dẫn trong dữ liệu đều tính từ gốc site; vỏ bài ghép với <meta name="bg-root"> lúc chạy.
Chạy riêng để xem:  python3 tools/chuoi_bai.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = json.load(open(ROOT / 'thu-vien/catalog.vi.json', encoding='utf-8'))
BY = {c['slug']: c for c in CAT}

SUBJ = {'bio': ('Sinh học', 'sinh', 'sinh-hoc'), 'chem': ('Hoá học', 'hoa', 'hoa-hoc'), 'phys': ('Vật lí', 'ly', 'vat-li'), 'geo': ('Địa lí', 'dia', 'dia-li')}

BESPOKE = {
    'te-bao': ('te-bao/index.html', 'Hành Trình Vào Tế Bào', 'covers/te-bao.webp'),
    'ty-the': ('ty-the/index.html', 'Vào Ty Thể: động cơ ATP synthase', 'covers/ty-the.webp'),
    'co-loa': ('lich-su-10/co-loa/index.html', 'Thành Cổ Loa', 'covers/co-loa.webp'),
    'co-the-nguoi': ('co-the-nguoi/index.html', 'Cơ thể người 3D', 'covers/co-the-nguoi.webp'),
    'than-kinh': ('than-kinh/index.html', 'Neuron và xung thần kinh', 'covers/than-kinh.webp'),
    'dong-co': ('cong-nghe/dong-co-4-ki/index.html', 'Động cơ xăng 4 kì', 'covers/dong-co.webp'),
    'mako': ('vat-li-10/ca-map-robot/index.html', 'Robot cá mập mako', 'covers/mako.webp'),
    'thap-5-tang': ('vat-li-11/thap-nam-tang/index.html', 'Tháp năm tầng Hōryū-ji', 'covers/thap-5-tang.webp'),
    'hai-dang': ('vat-li-10/hai-dang/index.html', 'Hải đăng khung sắt', 'covers/hai-dang.webp'),
    'dong-ho': ('vat-li-11/dong-ho-co/index.html', 'Đồng hồ cơ', 'covers/dong-ho.webp'),
    'nhen': ('vat-li-10/nhen-thuy-luc/index.html', 'Nhện chân thuỷ lực', 'covers/nhen.webp'),
    'piranha': ('vat-li-10/ca-piranha/index.html', 'Cá piranha', 'covers/piranha.webp'),
    'ur5e': ('robotics/ur5e/index.html', 'Cánh tay robot 6 trục UR5e', 'covers/robo-ur5e.webp'),
    'hexapod': ('robotics/hexapod/index.html', 'Robot sáu chân', 'covers/robo-hexapod.webp'),
    'quadruped': ('robotics/quadruped/index.html', 'Chó robot bốn chân', 'covers/robo-quadruped.webp'),
    'jellyfish': ('robotics/jellyfish/index.html', 'Sứa robot', 'covers/robo-jellyfish.webp'),
    'crazyflie': ('robotics/crazyflie/index.html', 'Drone bốn cánh Crazyflie', 'covers/robo-crazyflie.webp'),
    'turtlebot3': ('robotics/turtlebot3/index.html', 'Robot tự hành TurtleBot3', 'covers/robo-turtlebot3.webp'),
}
# mạch Sinh học tế bào 10, theo tools/build_pages.py (ROUTE)
CHAIN_CELL = ['te-bao', 'transport-step', 'plasmolysis-step', 'ty-the', 'enzyme-step', 'mitosis-step']
CHAIN_ROBO = ['ur5e', 'hexapod', 'quadruped', 'jellyfish', 'crazyflie', 'turtlebot3']


def path_of(slug):
    return BESPOKE[slug][0] if slug in BESPOKE else 'thu-vien/' + BY[slug]['file']


def href_of(slug):
    p = path_of(slug)
    return p[:-len('index.html')] if p.endswith('/index.html') else p


def title_of(slug):
    return BESPOKE[slug][1] if slug in BESPOKE else BY[slug]['title']


def cover_of(slug):
    return 'thu-vien/' + (BESPOKE[slug][2] if slug in BESPOKE else BY[slug]['cover'])


def build():
    out = {}

    def put(slug, crumb, nxt, subject, subj_key):
        out[path_of(slug)] = {'slug': slug, 'title': title_of(slug), 'crumb': crumb, 'next': nxt, 'cover': cover_of(slug), 'subject': subject, 's': subj_key}

    def nxt_lesson(slug, sub=''):
        return {'title': title_of(slug), 'href': href_of(slug), 'sub': sub}

    # Sinh học tế bào 10: chuỗi theo chương trình; bài cuối dẫn về trang lộ trình
    cell_crumb = [{'t': 'Sinh học 10', 'href': 'chu-de/sinh-hoc-te-bao/'}]
    for k, s in enumerate(CHAIN_CELL):
        n = CHAIN_CELL[k + 1] if k + 1 < len(CHAIN_CELL) else None
        put(s, cell_crumb, nxt_lesson(n, f'Sinh học tế bào 10 · bài {k + 2}/{len(CHAIN_CELL)}') if n else {'title': 'Lộ trình Sinh học tế bào 10', 'href': 'chu-de/sinh-hoc-te-bao/', 'sub': 'Xem lại cả chủ đề'}, 'Sinh học', 'sinh')
    # Khoa học tự nhiên 8: cơ thể người (BodyVista Việt hoá); bài sau đi tiếp xuống cấp tế bào
    put('co-the-nguoi', [{'t': 'Khoa học tự nhiên 8', 'href': '#bai-hoc'}], nxt_lesson('te-bao', 'Từ cơ quan xuống tế bào'), 'Sinh học', 'sinh')
    put('dong-co', [{'t': 'Công nghệ 11', 'href': '#bai-hoc'}], nxt_lesson('ur5e', 'Từ cơ khí động lực sang robot công nghiệp'), 'Công nghệ', 'cong')
    put('mako', [{'t': 'Vật lí 10', 'href': '?mon=phys#thu-vien'}], nxt_lesson('nhen', 'Từ lực của nước bên ngoài sang áp suất chất lỏng bên trong chân nhện'), 'Vật lí', 'ly')
    put('nhen', [{'t': 'Vật lí 10', 'href': '?mon=phys#thu-vien'}], nxt_lesson('piranha', 'Từ mô men ở khớp chân sang đòn bẩy của hàm cá'), 'Vật lí', 'ly')
    put('piranha', [{'t': 'Vật lí 10', 'href': '?mon=phys#thu-vien'}], nxt_lesson('hai-dang', 'Từ đòn bẩy của hàm sang mô men lật của tháp'), 'Vật lí', 'ly')
    put('hai-dang', [{'t': 'Vật lí 10', 'href': '?mon=phys#thu-vien'}], nxt_lesson('thap-5-tang', 'Từ tháp sắt đứng gió sang tháp gỗ đứng động đất'), 'Vật lí', 'ly')
    put('thap-5-tang', [{'t': 'Vật lí 11', 'href': '?mon=phys#thu-vien'}], nxt_lesson('dong-ho', 'Từ dao động của tháp gỗ sang dao động giữ nhịp đồng hồ'), 'Vật lí', 'ly')
    put('dong-ho', [{'t': 'Vật lí 11', 'href': '?mon=phys#thu-vien'}], nxt_lesson('dong-co', 'Từ bánh răng đồng hồ sang động cơ thật'), 'Vật lí', 'ly')
    put('than-kinh', [{'t': 'Sinh học 11', 'href': '#bai-hoc'}], nxt_lesson('co-the-nguoi', 'Cả cơ thể: hệ thần kinh và các hệ khác'), 'Sinh học', 'sinh')
    put('co-loa', [{'t': 'Lịch sử 10', 'href': 'lich-su-10/'}], {'title': 'Lộ trình Lịch sử 10', 'href': 'lich-su-10/', 'sub': 'Các bài theo chương trình'}, 'Lịch sử', 'su')
    robo_crumb = [{'t': 'Robotics · Đại học', 'href': 'robotics/'}]
    for k, s in enumerate(CHAIN_ROBO):
        n = CHAIN_ROBO[k + 1] if k + 1 < len(CHAIN_ROBO) else None
        put(s, robo_crumb, nxt_lesson(n, f'Robotics · bài {k + 2}/{len(CHAIN_ROBO)}') if n else {'title': 'Mục lục Robotics', 'href': 'robotics/', 'sub': 'Sáu mô phỏng'}, 'Robotics', 'robo')
    # thư viện: theo thứ tự danh mục trong từng môn; bài cuối của môn dẫn về thư viện
    for sub, (mon, key, anchor) in SUBJ.items():
        lst = [c['slug'] for c in CAT if c['subject'] == sub and c['slug'] not in CHAIN_CELL]
        crumb = [{'t': 'Thư viện', 'href': '#thu-vien'}, {'t': mon, 'href': f'?mon={sub}#thu-vien'}]
        for k, s in enumerate(lst):
            n = lst[k + 1] if k + 1 < len(lst) else None
            put(s, crumb, nxt_lesson(n, f'{mon} · bài {k + 2}/{len(lst)}') if n else {'title': f'Thư viện · {mon}', 'href': f'?mon={sub}#thu-vien', 'sub': 'Các bài khác cùng môn'}, mon, key)
    # bài thư viện trong mạch tế bào: giữ đường dẫn chủ đề Sinh học 10
    # gói dạy thử (tools/goi-day/*.json, tools/build_goi_day.py): link kịch bản, phút và việc của giáo viên từng bước
    for f in sorted((ROOT / 'tools/goi-day').glob('*.json')):
        g = json.loads(f.read_text(encoding='utf-8'))
        key = path_of(g['id'])
        if key in out:
            out[key]['pack'] = f"giao-vien/{g['id']}/"
            out[key]['plan'] = [{'t': x['t'], 'm': [x['tu'], x['den']], 'gv': x['gv'], 'hs': x['hs']} for x in g['buoc']]
    return out


SEQ = build()

if __name__ == '__main__':
    print(json.dumps(SEQ, ensure_ascii=False, indent=1)[:2500])
    print(len(SEQ), 'bài')
