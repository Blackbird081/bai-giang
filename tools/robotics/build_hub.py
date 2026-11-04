#!/usr/bin/env python3
"""Trang mục lục Robotics: bốn bài mô phỏng chạy trực tiếp cho đại học và kỹ sư.

  python3 tools/robotics/build_hub.py            → robotics/index.html (GitHub Pages, liên kết tương đối)
  build(links) trả về HTML, dùng cho bản đăng trên Claude (liên kết do build_pages.py truyền vào).
"""
import html, sys as _sys, pathlib as _pl
_sys.path.insert(0, str(_pl.Path(__file__).resolve().parent.parent))
import liquid_glass as LG, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
E = lambda s: html.escape(str(s), quote=True)

ROBOTS = [
    dict(key='ur5e', code='UR5e', title='Cánh tay robot 6 trục', robot='Universal Robots UR5e',
         lead='Cánh tay cộng tác phổ biến nhất trong phòng thí nghiệm và nhà máy, dựng đúng bảng DH của hãng. Kéo từng khớp, chọn một trong tám nghiệm động học nghịch, so MoveJ với MoveL, lái đầu công cụ qua điểm kỳ dị và nhìn tốc độ khớp vọt lên.',
         learn=['Động học thuận theo bảng Denavit–Hartenberg của UR', 'Động học nghịch giải tích, đủ 8 nghiệm (vai, khuỷu, cổ tay)', 'Jacobian hình học, chỉ số thao tác Yoshikawa w = |det J|', 'Kỳ dị vai: hình trụ bán kính d4 quanh trục đế', 'MoveJ và MoveL, đa thức bậc năm theo thời gian', 'Mô men giữ do trọng lực ở từng khớp, có tải'],
         nums='d1 162,5 · a2 −425 · a3 −392,2 · d4 133,3 · d5 99,7 · d6 99,6 mm · tầm với 850 mm · tải 5 kg · khớp ±180°/s',
         src=[('Universal Robots: thông số DH, khối lượng và trọng tâm khâu UR5e', 'https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics/'),
              ('UR5e e-Series datasheet', 'https://universal-robots.com/media/1807465/ur5e_e-series_datasheets_web.pdf'),
              ('Universal_Robots_ROS2_Description: kinematics, joint_limits', 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/tree/rolling/config/ur5e'),
              ('K. P. Hawkins (2013), Analytic Inverse Kinematics for the Universal Robots UR-5/UR-10, Georgia Tech', 'http://hdl.handle.net/1853/50782'),
              ('ros-industrial ur_kinematics (đối chiếu nghiệm)', 'https://github.com/ros-industrial/universal_robot/blob/noetic-devel/ur_kinematics/src/ur_kin.cpp')],
         note='Kiểm bằng máy: FK(IK) sai lệch 1,5·10⁻¹² m trên 2000 tư thế ngẫu nhiên. Vỏ ngoài là hình dựng gần đúng, không phải CAD của hãng.'),
    dict(key='hexapod', code='HEX', title='Robot 6 chân', robot='PhantomX AX (18 servo AX-12A)',
         lead='Sáu chân, mười tám servo, ba dáng đi kinh điển. Đổi từ tripod sang wave và xem đa giác chống đỡ co giãn, biên ổn định tĩnh tăng giảm, mô men servo leo gần giới hạn khi thân hạ thấp.',
         learn=['Động học nghịch chân 3 bậc (định lý cos)', 'Dáng đi theo hệ số chống β: tripod 1/2, tetrapod 2/3, wave 5/6', 'Đa giác chống đỡ, biên ổn định tĩnh và biên dọc', 'Bước, chu kỳ và vận tốc v = S/(β·T)', 'Mô men servo ước lượng so với mô men kẹt 1,5 N·m'],
         nums='coxa 52 · femur 66 · tibia 133 mm · gắn chân 120/60/100 mm · AX-12A 1,5 N·m @12 V',
         src=[('KurtE Phantom_Phoenix, Hex_Cfg.h (kích thước chân, vị trí gắn)', 'https://github.com/KurtE/Phantom_Phoenix/blob/master/Hex_Cfg.h'),
              ('ROBOTIS e-Manual: Dynamixel AX-12A', 'https://emanual.robotis.com/docs/en/dxl/ax/ax-12a/'),
              ('McGhee & Frank (1968), On the stability properties of quadruped creeping gaits', 'https://doi.org/10.1016/0025-5564(68)90090-4'),
              ('Song & Waldron (1989), Machines That Walk / phân tích dáng đi sóng', 'https://doi.org/10.1017/s0263574700006937'),
              ('Ting, Blickhan & Full (1994), biên ổn định dọc', 'https://scholarblogs.emory.edu/neuromechanicslab/files/2024/06/Ting-Blickhan-Full-1994.pdf')],
         note='Chiều dài femur và tibia trong cấu hình Phoenix được tác giả ghi là ước đoán; khối lượng 2,0 kg là giả định để ước lượng mô men.'),
    dict(key='crazyflie', code='CF2', title='Drone 4 cánh', robot='Bitcraze Crazyflie 2.x (27 g)',
         lead='Một chiếc drone 27 g, mô hình vật lý theo số đo của ETH Zürich và bộ điều khiển chép đúng cấu trúc, hệ số của firmware gốc. Cất cánh, lăn, tiến, xoay, đẩy một cú gió và nhìn bốn vòng PID xếp tầng cứu nó, hoặc tăng hệ số cho tới khi nó lật.',
         learn=['Động lực học thân cứng 6 bậc tự do, lực và mô men từng rô-to', 'PID xếp tầng: vị trí 100 Hz → vận tốc → góc 500 Hz → tốc độ góc', 'Bộ trộn bốn động cơ cấu hình X', 'Trễ động cơ, nhiễu con quay, giới hạn bão hoà', 'Vì sao hệ số quá cao làm hệ mất ổn định'],
         nums='m 28 g · tay đòn 46 mm · J = diag(16,6; 16,7; 29,3)·10⁻⁶ kg·m² · τ động cơ 64,6 ms · vòng góc kp 6 ki 3 · vòng tốc độ góc kp 250 ki 500 kd 2,5',
         src=[('J. Förster (2015), System Identification of the Crazyflie 2.0 Nano Quadrocopter, ETH Zürich', 'https://doi.org/10.3929/ethz-b-000214143'),
              ('bitcraze/crazyflie-firmware: controller_pid, attitude_pid_controller', 'https://github.com/bitcraze/crazyflie-firmware/blob/master/src/modules/src/controller/controller_pid.c'),
              ('bitcraze/crazyflie-firmware: platform_defaults (hệ số, tần số lọc)', 'https://github.com/bitcraze/crazyflie-firmware/blob/master/src/platform/interface/platform_defaults.h'),
              ('bitcraze/crazyflie-firmware: power_distribution_quadrotor (bộ trộn legacy)', 'https://github.com/bitcraze/crazyflie-firmware/blob/master/src/modules/src/power_distribution_quadrotor.c'),
              ('Bitcraze: hệ toạ độ Crazyflie 2.x', 'https://www.bitcraze.io/documentation/system/platform/cf2-coordinate-system')],
         note='Chiều quay từng động cơ suy từ dấu trong bộ trộn của firmware. Hệ số PID đọc từ nhánh master ngày 31/10/2026.'),
    dict(key='turtlebot3', code='TB3', title='Xe tự hành vi sai', robot='ROBOTIS TurtleBot3 Burger',
         lead='Robot di động chuẩn của ROS chạy trong một căn phòng có hộp và trụ. Robot thật và robot "trong đầu" chạy song song: tắt định vị và nhìn odometry trôi, nhìn bản đồ LiDAR dựng theo vị trí sai bị nhân đôi tường, rồi bật lại và thấy mọi thứ khớp.',
         learn=['Động học vi sai, ràng buộc không khả tích', 'Encoder 4096 xung/vòng và odometry, vì sao sai số chỉ tăng', 'LiDAR LDS-02: 360 tia, 5 Hz, điểm mù 0,16 m', 'Bản đồ lưới chiếm chỗ cập nhật log-odds', 'Bám đường pure pursuit, ảnh hưởng của khoảng nhìn trước', 'Dừng an toàn và hành vi phục hồi'],
         nums='r 33 mm · L 160 mm · 0,22 m/s · 2,84 rad/s · XL430-W250 61 vòng/ph @12 V · LDS-02 0,16–8 m',
         src=[('ROBOTIS e-Manual: TurtleBot3 thông số', 'https://emanual.robotis.com/docs/en/platform/turtlebot3/features/'),
              ('turtlebot3 burger.yaml, URDF, teleop (bán kính bánh, tốc độ)', 'https://github.com/ROBOTIS-GIT/turtlebot3/blob/main/turtlebot3_bringup/param/burger.yaml'),
              ('OpenCR turtlebot3_ros2 firmware (bán kính robot, hằng số)', 'https://github.com/ROBOTIS-GIT/OpenCR/blob/master/arduino/opencr_arduino/opencr/libraries/turtlebot3_ros2/src/turtlebot3/turtlebot3.cpp'),
              ('ROBOTIS e-Manual: LDS-02', 'https://emanual.robotis.com/docs/en/platform/turtlebot3/appendix_lds_02/'),
              ('ROBOTIS e-Manual: Dynamixel XL430-W250', 'https://emanual.robotis.com/docs/en/dxl/x/xl430-w250/')],
         note='Phòng, vật cản, độ lệch bán kính bánh và trượt là giả định để dạy. Nút "định vị liên tục" mô phỏng kết quả của AMCL, không chạy bộ lọc hạt.'),
]

CSS = '''
:root{--bg:#f6f7f9;--paper:#ffffff;--ink:#15171C;--mute:#626773;--line:#e7e9ed;--or:#e3562a}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;
}
a{color:inherit}
.mono{font-family:var(--bg-font);font-weight:600;font-size:13px}
.top{display:flex;align-items:stretch;gap:0;background:var(--paper);border-bottom:1px solid var(--line)}
.top .code{background:var(--or);color:#fff;display:grid;place-content:center;padding:0 26px;font:700 20px "JetBrains Mono",monospace;letter-spacing:1px;text-decoration:none}
.top .code small{display:block;font-size:13px;letter-spacing:2px;margin-top:2px;opacity:.9}
.top .t{padding:18px 24px}
.top h1{margin:2px 0 0;font-size:32px;letter-spacing:-.02em;line-height:1.1}
.top h1 span{color:var(--or);font-weight:400}
.wrap{max-width:1180px;margin:0 auto;padding:28px 24px 64px}
.intro{display:grid;grid-template-columns:1.4fr 1fr;gap:28px;align-items:start;margin-bottom:30px}
.intro p{margin:0 0 10px;font-size:16px}
.how{background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);padding:16px 18px}
.how ol{margin:8px 0 0;padding-left:20px}.how li{margin:4px 0}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.12);overflow:hidden;display:flex;flex-direction:column}
.card .img{display:block;position:relative;aspect-ratio:16/9;background:#f1f2f5;overflow:hidden}
.card .img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s ease}
.card .img:hover img{transform:scale(1.03)}
.card .img b{position:absolute;left:12px;top:12px;background:rgba(255,255,255,.94);color:#15171C;font:600 13px var(--bg-mono,"JetBrains Mono",monospace);letter-spacing:.5px;padding:5px 10px;border-radius:8px;box-shadow:0 1px 3px rgba(16,24,40,.12)}
.card .body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px;flex:1}
.card h2{margin:0;font-size:22px;letter-spacing:-.02em;line-height:1.2}
.card h2 small{display:block;font:600 13px var(--bg-font);color:#626773;margin-bottom:4px}
.card p{margin:0}
.card ul{margin:0;padding-left:18px}.card li{margin:2px 0}
.nums{font:13px/1.6 "JetBrains Mono",monospace;color:#454A55;background:#f3f4f6;border-radius:8px;padding:8px 12px}
details{border-top:1px solid var(--line);padding-top:8px}
summary{cursor:pointer;font-weight:600;font-size:14px}
details ol{margin:8px 0 0;padding-left:20px;font-size:13.5px}details li{margin:3px 0}
.note{font-size:13px;color:#626773}
.go{margin-top:auto;display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:var(--ink);color:#fff;text-decoration:none;font:700 13px "JetBrains Mono",monospace;letter-spacing:1.5px;padding:10px 16px;border-radius:4px}
.go:hover{background:var(--or)}
h3.sec{font:700 20px var(--bg-font);letter-spacing:-.01em;margin:40px 0 12px;display:flex;align-items:center;gap:10px}
h3.sec:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ink)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.more{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.more a{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:center;background:var(--paper);border:1px solid var(--line);border-radius:14px;overflow:hidden;text-decoration:none;color:var(--ink);box-shadow:0 1px 2px rgba(16,24,40,.04);transition:box-shadow .3s}
.more a:hover{box-shadow:0 8px 24px -12px rgba(16,24,40,.18)}
.more img{width:100%;height:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:#f1f2f5}
.more span{display:grid;gap:4px;padding:14px 16px 14px 0;font-size:14.5px;color:var(--mute)}.more b{font-size:18px;color:var(--ink)}.more small{font-size:13px;font-weight:600;color:var(--mute)}
.box{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px;font-size:14.5px}
.box p{margin:0 0 8px}.box p:last-child{margin:0}
table.keys{border-collapse:collapse;width:100%;font-size:13.5px}
table.keys td{padding:4px 6px;border-bottom:1px solid var(--line);vertical-align:top}
table.keys td:first-child{font:600 13px "JetBrains Mono",monospace;white-space:nowrap;color:#454A55}
@media (max-width:860px){.intro,.grid,.cols,.more{grid-template-columns:1fr}.more a{grid-template-columns:120px 1fr}.top h1{font-size:25px}.top .code{padding:0 16px}.wrap{padding:20px 16px 48px}}
'''


def build(links):
    """links: hub, sims{key: url}, covers{key: url}"""
    cards = []
    for r in ROBOTS:
        k = r['key']
        learn = ''.join(f'<li>{E(x)}</li>' for x in r['learn'])
        src = ''.join(f'<li><a href="{E(u)}" target="_blank" rel="noopener">{E(t)}</a></li>' for t, u in r['src'])
        cards.append(f'''<article class="card">
  <a class="img" href="{E(links['sims'][k])}"><img src="{E(links['covers'][k])}" alt="{E(r['title'])}: ảnh chụp mô phỏng" loading="lazy"><b>{r['code']}</b></a>
  <div class="body">
    <h2><small>{E(r['robot'])}</small>{E(r['title'])}</h2>
    <p>{E(r['lead'])}</p>
    <ul>{learn}</ul>
    <div class="nums">{E(r['nums'])}</div>
    <details><summary>Nguồn số liệu</summary><ol>{src}</ol><p class="note">{E(r['note'])}</p></details>
    <a class="go" href="{E(links['sims'][k])}">Vào mô phỏng <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
  </div>
</article>''')
    return f'''<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Robotics</title>
<meta name="description" content="Bốn bài giảng robotics mô phỏng 3D chạy trực tiếp cho đại học và kỹ sư: cánh tay UR5e, robot sáu chân, drone Crazyflie, xe tự hành TurtleBot3.">
{LG.font_link(links['hub'])}
<style>{CSS}{LG.SITE_BAR_CSS}
html[data-x]{{}}body{{font-family:var(--bg-font)}}
.top{{display:block;padding:32px 24px 8px;max-width:1180px;margin:0 auto;border:0;background:none}}
.top .t{{padding:0}}
.go{{font:600 15px var(--bg-font);letter-spacing:0;min-height:44px;padding:0 20px;border-radius:999px}}
</style>
</head>
<body>
{LG.site_bar(links['hub'], [('Lộ trình', links['hub'] + '#lo-trinh'), ('Robotics', None)])}
<header class="top">
  <div class="t"><div class="mono" style="color:var(--mute)">Đại học · kỹ sư · mô phỏng chạy trực tiếp</div><h1>Robotics</h1>
  <div class="mono" style="margin-top:6px;color:var(--mute)">Động học · động lực học · điều khiển · cảm biến · định vị</div></div>
</header>
<div class="wrap">
  <section class="intro">
    <div>
      <p>Bốn robot thật, mỗi robot một bài: số liệu lấy từ tài liệu hãng, mã nguồn mở và bài báo gốc, phép tính chạy ngay trong trình duyệt. Không phải video: mọi thanh đo, biểu đồ và con số trên màn hình là trạng thái thật của mô phỏng ở khung hình đó.</p>
      <p>Mỗi trang mở ra là một bài giảng tự chạy: con trỏ bấm từng nút, khung lời giảng giải thích điều đang xảy ra. Chạm vào bất cứ đâu để tự cầm lái; để yên 25 giây, bài giảng chạy lại.</p>
    </div>
    <div class="how"><b>Dùng trên lớp</b><ol>
      <li>Chiếu toàn màn hình, để bài giảng tự chạy một vòng (khoảng 1,5–2 phút).</li>
      <li>Cầm lái, đặt câu hỏi "nếu tăng … thì sao?" rồi kéo thanh trượt cho cả lớp xem.</li>
      <li>Giao bài: tái hiện một con số trên màn hình bằng tính tay từ công thức trong khung lời giảng.</li>
    </ol></div>
  </section>
  <div class="grid">
{chr(10).join(cards)}
  </div>
  <h3 class="sec">Cùng bộ dựng, cho phổ thông</h3>
  <div class="more">
    <a href="{links['hub']}cong-nghe/dong-co-4-ki/"><img src="{links['hub']}thu-vien/covers/dong-co.webp" alt="" loading="lazy"><span><small>Công nghệ 11</small><b>Động cơ xăng 4 kì</b>Cắt dọc động cơ Honda Wave Alpha 110, một đầu vào là góc trục khuỷu.</span></a>
    <a href="{links['hub']}vat-li-10/ca-map-robot/"><img src="{links['hub']}thu-vien/covers/mako.webp" alt="" loading="lazy"><span><small>Vật lí 10</small><b>Robot cá mập mako</b>Bơi theo số đo cá mập thật, một đầu vào là tốc độ bơi.</span></a>
  </div>
  <h3 class="sec">Điều khiển chung</h3>
  <div class="cols">
    <div class="box"><table class="keys">
      <tr><td>Kéo chuột / vuốt</td><td>xoay camera; lăn chuột hoặc chụm hai ngón để thu phóng</td></tr>
      <tr><td>1 2 3 4</td><td>chuyển góc nhìn</td></tr>
      <tr><td>N · X</td><td>bật tắt nhãn, X-quang (TurtleBot3: Z)</td></tr>
      <tr><td>W A D X S</td><td>TurtleBot3: lái tay như turtlebot3_teleop_key</td></tr>
      <tr><td>?q=0 / 1 / 2</td><td>thêm vào địa chỉ để ép bậc chất lượng đồ hoạ (2 cho máy yếu)</td></tr>
    </table></div>
    <div class="box">
      <p><b>Ghi công.</b> Phương pháp dựng, phong cách bàn điều khiển và cách tổ chức trang theo <a href="https://github.com/elvarofficial/teardown" target="_blank" rel="noopener">teardown</a> của elvarofficial, dựa trên <a href="https://github.com/whaleyxbt/claude-motion" target="_blank" rel="noopener">claude-motion</a> của whaleyxbt, giấy phép MIT. Đồ hoạ dùng three.js (MIT), phông Inter và JetBrains Mono (OFL).</p>
      <p><b>Mã nguồn.</b> <a href="https://github.com/nclamvn/bai-giang/tree/main/tools/robotics" target="_blank" rel="noopener">tools/robotics</a>: mỗi robot một thư mục, phần tính toán tách khỏi phần vẽ để kiểm bằng máy. Góp ý tại <a href="https://github.com/nclamvn/bai-giang/issues" target="_blank" rel="noopener">GitHub Issues</a>.</p>
      <p><b>Giới hạn.</b> Đây là mô phỏng để dạy, không thay cho mô phỏng kỹ thuật (Gazebo, MuJoCo) hay phần cứng thật. Chỗ nào là giả định, trang ghi rõ ngay cạnh con số.</p>
    </div>
  </div>
</div>
</body>
</html>
'''


if __name__ == '__main__':
    keys = [r['key'] for r in ROBOTS]
    out = build({'hub': '../', 'sims': {k: f'{k}/' for k in keys}, 'covers': {k: f'../thu-vien/covers/robo-{k}.webp' for k in keys}})
    (ROOT / 'robotics/index.html').write_text(out, encoding='utf-8')
    print('đã dựng robotics/index.html')
