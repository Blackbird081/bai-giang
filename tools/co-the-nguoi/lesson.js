// Bài học từng bước "Cơ thể người 3D" của Sáng Ăn Khoai, chạy trên BodyVista (window.BodyVista) và vỏ bài (window.BGShell).
// Nội dung bám các mạch kiến thức "Sinh học cơ thể người" của môn Khoa học tự nhiên 8 (Chương trình GDPT 2018), tự viết,
// không chép sách giáo khoa. Số liệu có nguồn: OpenStax, Anatomy and Physiology 2e (CC BY 4.0), ghi ở từng bước.
const OS = 'OpenStax, Anatomy and Physiology 2e';
const STEPS = [
  { t: 'Cơ thể là một hệ thống nhiều cơ quan', sys: 'Toàn cơ thể', go: (B) => B.showRegion('all'),
    b: 'Mô hình là cơ thể một người nam trưởng thành, dựng từ 2.900 cấu trúc giải phẫu thật. Các cơ quan xếp thành hệ cơ quan; mỗi hệ một nhiệm vụ, nhưng không hệ nào làm việc một mình. Kéo để xoay, cuộn để phóng, bấm vào một cấu trúc để xem tên và vai trò.',
    ask: { q: 'Vì sao nói cơ thể là một khối thống nhất?', o: ['Mỗi hệ cơ quan hoạt động độc lập', 'Các hệ cơ quan phối hợp, chịu sự điều hoà của hệ thần kinh và nội tiết', 'Chỉ có hệ tuần hoàn nối các cơ quan'], a: 1, e: 'Hệ thần kinh và hệ nội tiết điều hoà, các hệ khác phối hợp để duy trì môi trường trong ổn định.' } },
  { t: 'Bộ xương: nâng đỡ và bảo vệ', sys: 'Hệ vận động', go: (B) => B.showSystem('skeletal'),
    b: 'Bộ xương người trưởng thành có khoảng 206 xương. Xương sọ bảo vệ não, lồng ngực bảo vệ tim và phổi, cột sống nâng đỡ thân và bảo vệ tuỷ sống. Thử bấm vào xương đùi, xương dài nhất cơ thể.',
    src: OS + ', mục 7.1', ask: { q: 'Bộ phận nào của bộ xương bảo vệ tim và phổi?', o: ['Xương sọ', 'Lồng ngực', 'Xương chậu'], a: 1, e: 'Lồng ngực gồm xương sườn, xương ức và đốt sống ngực, bao quanh tim và phổi.' } },
  { t: 'Cơ và khớp: cặp cơ đối kháng', sys: 'Hệ vận động', go: (B) => B.playActivity('muscular:elbow-antagonists'),
    b: 'Cơ chỉ kéo, không đẩy. Khi gập khuỷu tay, cơ nhị đầu cánh tay co, cơ tam đầu cánh tay giãn; khi duỗi thì ngược lại. Hai cơ làm việc thành cặp đối kháng quanh khớp khuỷu.',
    src: OS + ', mục 11.1', ask: { q: 'Khi duỗi thẳng cánh tay, cơ nào co?', o: ['Cơ nhị đầu cánh tay', 'Cơ tam đầu cánh tay', 'Cả hai cùng giãn'], a: 1, e: 'Cơ tam đầu ở mặt sau cánh tay co để duỗi khuỷu; cơ nhị đầu giãn ra.' } },
  { t: 'Đường đi của thức ăn', sys: 'Hệ tiêu hoá', go: (B) => B.playActivity('digestive:digestive-route'),
    b: 'Ống tiêu hoá đi từ miệng, hầu, thực quản, dạ dày, ruột non, ruột già tới hậu môn. Tuyến nước bọt, gan và tuỵ đổ dịch tiêu hoá vào ống. Quan sát thứ tự các đoạn sáng lên theo chiều thức ăn đi.',
    src: OS + ', mục 23.1', ask: { q: 'Tuyến nào sau đây KHÔNG nằm trên ống tiêu hoá nhưng đổ dịch vào ruột non?', o: ['Dạ dày', 'Tuỵ', 'Thực quản'], a: 1, e: 'Tuỵ nằm ngoài ống tiêu hoá, tiết dịch tuỵ đổ vào tá tràng.' } },
  { t: 'Ruột non hấp thụ chất dinh dưỡng', sys: 'Hiển vi · Lông ruột', go: (B) => B.showMicro('villi'),
    b: 'Thành ruột non có vô số lông ruột, làm diện tích hấp thụ tăng lên rất nhiều. Trong mỗi lông ruột có mạng mao mạch máu và một mạch bạch huyết ở giữa: phần lớn chất dinh dưỡng vào máu, chất béo chủ yếu đi theo bạch huyết.',
    src: OS + ', mục 23.5', ask: { q: 'Vai trò chính của lông ruột là gì?', o: ['Nghiền nhỏ thức ăn', 'Tăng diện tích hấp thụ', 'Tiết acid'], a: 1, e: 'Nếp gấp, lông ruột và vi nhung mao cùng làm tăng diện tích bề mặt hấp thụ.' } },
  { t: 'Tim co bóp, van giữ máu đi một chiều', sys: 'Hệ tuần hoàn', go: (B) => B.playActivity('cardiovascular:valve-cycle'),
    b: 'Tim có bốn ngăn: hai tâm nhĩ ở trên, hai tâm thất ở dưới. Van nhĩ thất và van động mạch đóng mở theo nhịp, nên máu chỉ chảy một chiều: tâm nhĩ xuống tâm thất, tâm thất ra động mạch.',
    src: OS + ', mục 19.1', ask: { q: 'Nhờ đâu máu trong tim chỉ chảy một chiều?', o: ['Nhờ các van tim', 'Nhờ tim rất dày', 'Nhờ máu đặc'], a: 0, e: 'Van đóng lại khi áp lực phía sau lớn hơn, chặn máu chảy ngược.' } },
  { t: 'Vòng tuần hoàn nhỏ và vòng tuần hoàn lớn', sys: 'Toàn cơ thể', go: (B) => B.playActivity('whole-body:whole-body-circulation'),
    b: 'Vòng tuần hoàn nhỏ: tâm thất phải đẩy máu lên phổi lấy O₂, thải CO₂, rồi máu về tâm nhĩ trái. Vòng tuần hoàn lớn: tâm thất trái đẩy máu giàu O₂ theo động mạch chủ tới các cơ quan, máu nghèo O₂ theo tĩnh mạch chủ về tâm nhĩ phải.',
    src: OS + ', mục 20.5', ask: { q: 'Máu từ phổi trở về tim đổ vào ngăn nào?', o: ['Tâm nhĩ phải', 'Tâm nhĩ trái', 'Tâm thất trái'], a: 1, e: 'Tĩnh mạch phổi đưa máu giàu O₂ về tâm nhĩ trái.' } },
  { t: 'Thở: cơ hoành và lồng ngực', sys: 'Hệ hô hấp', go: (B) => B.playActivity('respiratory:breathing'),
    b: 'Khi hít vào, cơ hoành co và hạ xuống, các cơ liên sườn nâng lồng ngực; thể tích lồng ngực tăng, áp suất trong phổi giảm nên không khí đi vào. Khi thở ra bình thường, các cơ giãn và lồng ngực thu nhỏ lại.',
    src: OS + ', mục 22.3', ask: { q: 'Khi hít vào, cơ hoành thay đổi thế nào?', o: ['Co và hạ xuống', 'Giãn và nâng lên', 'Không thay đổi'], a: 0, e: 'Cơ hoành co làm phẳng vòm hoành, tăng chiều cao lồng ngực.' } },
  { t: 'Trao đổi khí ở phế nang', sys: 'Hiển vi · Phế nang', go: (B) => B.showMicro('alveoli'),
    b: 'Phế nang có thành rất mỏng, bao quanh bởi mao mạch. O₂ khuếch tán từ phế nang vào máu, CO₂ khuếch tán từ máu ra phế nang, mỗi khí đi từ nơi có phân áp cao tới nơi có phân áp thấp. Phế nang không tự bơm khí.',
    src: OS + ', mục 22.4', ask: { q: 'Điều gì trực tiếp khiến O₂ đi từ phế nang vào máu?', o: ['Phế nang co bóp', 'Chênh lệch phân áp O₂', 'Tim hút khí'], a: 1, e: 'Trao đổi khí là khuếch tán theo chênh lệch phân áp.' } },
  { t: 'Thận lọc máu, tạo nước tiểu', sys: 'Hiển vi · Nephron', go: (B) => B.showMicro('nephron'),
    b: 'Mỗi thận có hơn một triệu nephron. Ở cầu thận, máu được lọc thành nước tiểu đầu; dọc ống thận, nước và các chất cần thiết được hấp thụ lại, chất thải được tiết thêm, tạo thành nước tiểu chính thức đổ về bể thận.',
    src: OS + ', mục 25.4–25.6', ask: { q: 'Nước tiểu đầu được tạo ra ở đâu?', o: ['Bàng quang', 'Cầu thận', 'Niệu quản'], a: 1, e: 'Cầu thận lọc huyết tương thành dịch lọc, gọi là nước tiểu đầu.' } },
  { t: 'Phản xạ tuỷ sống', sys: 'Hệ thần kinh', go: (B) => B.playActivity('nervous:spinal-reflex'),
    b: 'Phản xạ là phản ứng của cơ thể với kích thích, có sự tham gia của hệ thần kinh. Đường đi của xung thần kinh gọi là cung phản xạ: thụ thể, neuron cảm giác, trung ương thần kinh (tuỷ sống), neuron vận động, cơ quan đáp ứng.',
    src: OS + ', chương 14', ask: { q: 'Trong cung phản xạ tuỷ, neuron nào đưa lệnh từ tuỷ sống tới cơ?', o: ['Neuron cảm giác', 'Neuron vận động', 'Thụ thể'], a: 1, e: 'Neuron vận động dẫn xung từ trung ương ra cơ quan đáp ứng.' } },
  { t: 'Đồng tử điều chỉnh ánh sáng', sys: 'Giác quan', go: (B) => B.playActivity('sensory:pupil-reflex'),
    b: 'Gặp ánh sáng mạnh, cơ vòng mống mắt co làm đồng tử thu nhỏ, giảm lượng ánh sáng vào mắt; ở chỗ tối, đồng tử giãn ra. Đây là một phản xạ không điều kiện.',
    src: OS + ', mục 15.2', ask: { q: 'Đưa đèn pin sáng vào mắt, đồng tử sẽ thế nào?', o: ['Giãn ra', 'Co nhỏ lại', 'Không đổi'], a: 1, e: 'Phản xạ đồng tử với ánh sáng làm đồng tử co.' } },
  { t: 'Nội tiết: điều hoà bằng hormone', sys: 'Hệ nội tiết', go: (B) => B.playActivity('endocrine:thyroid-feedback-pulse'),
    b: 'Tuyến nội tiết tiết hormone thẳng vào máu. Tuyến yên chịu điều khiển của vùng dưới đồi, rồi điều khiển tuyến giáp. Khi hormone tuyến giáp trong máu tăng, nó ức chế ngược vùng dưới đồi và tuyến yên: đó là cơ chế điều hoà ngược.',
    src: OS + ', mục 17.4–17.5', ask: { q: 'Hormone tuyến giáp tăng cao trong máu sẽ tác động thế nào tới tuyến yên?', o: ['Kích thích tuyến yên tiết nhiều hơn', 'Ức chế tuyến yên', 'Không ảnh hưởng'], a: 1, e: 'Điều hoà ngược âm giữ nồng độ hormone ổn định.' } },
  { t: 'Thử thách giải phẫu', sys: 'Ôn tập', go: (B) => { B.openNav('quiz'); },
    b: 'Năm câu mỗi lượt: nhận biết cấu trúc trên mô hình, tìm cấu trúc trong không gian 3D, câu hỏi hiển vi. Giáo viên chiếu cho cả lớp cùng trả lời, hoặc học sinh tự làm trên máy.',
    ask: null },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let card, cur = -1;
function showCard(i) {
  const s = STEPS[i]; if (!s) return;
  if (!card) {
    card = document.createElement('aside'); card.id = 'sak-lesson'; card.setAttribute('aria-live', 'polite');
    document.getElementById('canvas-area')?.append(card) || document.body.append(card);
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) card.hidden = true;
      const o = e.target.closest('[data-o]'); if (o) { card.querySelectorAll('[data-o]').forEach((b) => b.disabled = true); card.classList.add('rev'); o.classList.add('pick'); }
    });
  }
  const a = s.ask;
  card.innerHTML = `<button class="x" data-x aria-label="Ẩn thẻ bài học">×</button><div class="k">Bước ${i + 1}/${STEPS.length} · ${esc(s.sys)}</div><h2>${esc(s.t)}</h2><p>${esc(s.b)}</p>`
    + (a ? `<div class="q"><b>${esc(a.q)}</b>${a.o.map((o, k) => `<button data-o="${k}" class="${k === a.a ? 'ok' : ''}">${esc(o)}</button>`).join('')}<div class="e">${esc(a.e)}</div></div>` : '')
    + (s.src ? `<div class="src">Nguồn: ${esc(s.src)}</div>` : '');
  card.classList.remove('rev'); card.hidden = false;
}

function start() {
  const B = window.BodyVista, S = window.BGShell;
  S.mount({
    id: 'co-the-nguoi', title: 'Cơ thể người 3D', subject: 'Khoa học tự nhiên 8', variant: 'pho-thong', nav: false,
    objectives: ['Nêu được tên và chức năng chính của các hệ cơ quan trong cơ thể người', 'Trình bày được sự phối hợp giữa các hệ cơ quan', 'Quan sát được một số quá trình sinh lí: co cơ, tuần hoàn, hô hấp, lọc máu, phản xạ'],
    steps: STEPS.map((s) => ({ t: s.t, note: s.b + (s.src ? `\nNguồn: ${s.src}` : ''), ask: s.ask ? { q: s.ask.q, o: s.ask.o, a: s.ask.a, e: s.ask.e } : null })),
    go: (i) => { cur = i; showCard(i); Promise.resolve(STEPS[i].go(B)).catch((e) => console.error('[co-the-nguoi] bước', i + 1, e)); },
    end: () => { if (card) card.hidden = true; },
    keys: [['Kéo', 'xoay mô hình'], ['Cuộn', 'phóng to, thu nhỏ'], ['Bấm', 'chọn cấu trúc, xem kiến thức'], ['Ctrl Z', 'hoàn tác']],
    credit: 'Phát triển từ BodyVista của FreedomIntelligence (mã MIT). Mô hình giải phẫu từ Z-Anatomy (CC BY-SA 4.0, có phần chỉ dùng phi thương mại) và BodyParts3D (DBCLS, CC BY-SA 2.1 Nhật Bản). Sáng Ăn Khoai Việt hoá, nén mô hình, soạn bài học theo Khoa học tự nhiên 8. Bản dịch chưa qua giáo viên bộ môn duyệt.',
  });
}
(function wait(n) {
  if (window.BodyVista && window.BGShell) return start();
  if (n > 600) return console.error('[co-the-nguoi] không thấy BodyVista hoặc vỏ bài');
  setTimeout(() => wait(n + 1), 100);
})(0);
