// Các cụm chi tiết của động cơ: một nguồn cho chế độ lắp ráp (kit/lap.js) và thẻ soi chi tiết (bấm vào chi tiết trong cảnh).
// Quy trình lắp ở đây là quy trình RÚT GỌN để học thứ tự và lối vào của từng cụm, không thay sách hướng dẫn sửa chữa của hãng:
// trong xưởng, xupap lắp vào nắp máy trên bàn rồi cả cụm mới úp lên xi lanh; trục khuỷu, thanh truyền xe số nhỏ thường là một cụm ép sẵn.
// Số đo lấy từ thông số Honda Việt Nam công bố cho Wave Alpha 110 (như kin.js); chỗ nào là giả định thì ghi "giả định", "minh hoạ".
//
// from: hướng và quãng đưa cụm vào ở chặng cuối (mét, hệ toạ độ của cảnh: y lên, z về phía người xem, x sang phải).
// sys: hệ thống tương ứng ở bảng 06 (để thẻ soi có nút "Chỉ hiện hệ này").

const PLUG = 0.6; // bugi nghiêng 0,6 rad quanh trục x (engine.js): trục bugi hướng (0, cos, −sin)

export const UNITS = [
  {id: 'cacte', name: 'Hộp trục khuỷu (cácte)', k: 'Thân máy', from: [0, 0.08, 0],
    b: 'Vỏ đỡ trục khuỷu và giữ dầu bôi trơn ở đáy. Cùng xi lanh và nắp máy tạo thành thân máy; mọi cụm khác tựa vào nó.',
    note: 'Chi tiết nền: đặt lên giá trước tiên.'},
  {id: 'khuyu', name: 'Trục khuỷu, bánh đà', k: 'Cơ cấu trục khuỷu – thanh truyền', sys: 'crank', needs: ['cacte'], from: [0, 0, 0.14],
    b: 'Biến chuyển động tịnh tiến của pít-tông thành chuyển động quay. Bánh đà ở đầu trục giữ đà quay qua ba kì không sinh công; đĩa xích nhỏ kéo xích cam.',
    note: 'Trục khuỷu nằm trong ổ đỡ của cácte, đưa vào theo chiều trục.'},
  {id: 'truyen', name: 'Thanh truyền', k: 'Cơ cấu trục khuỷu – thanh truyền', sys: 'crank', needs: ['khuyu'], from: [0, 0.12, 0],
    blocks: [['xilanh', 'xi lanh trùm kín khoang phía trên, không còn chỗ đưa thanh truyền xuống chốt khuỷu.']],
    b: 'Nối pít-tông với trục khuỷu: đầu nhỏ lắp chốt pít-tông, đầu to ôm chốt khuỷu.',
    note: 'Đầu to ôm chốt khuỷu, đầu nhỏ chờ chốt pít-tông.'},
  {id: 'pitong', name: 'Pít-tông, xéc măng, chốt', k: 'Cơ cấu trục khuỷu – thanh truyền', sys: 'crank', needs: ['truyen'], from: [0, 0.1, 0], tool: 'kìm tháo lắp phanh hãm chốt pít-tông',
    blocks: [['xilanh', 'chốt pít-tông và phanh hãm phải lắp khi pít-tông còn lộ ra ngoài; xi lanh trùm xuống rồi thì kìm không với tới.']],
    b: 'Nhận áp lực khí cháy và truyền xuống thanh truyền. Ba xéc măng làm kín khe giữa pít-tông và xi lanh.',
    note: 'Chốt pít-tông nối pít-tông với đầu nhỏ thanh truyền.'},
  {id: 'xilanh', name: 'Xi lanh, cánh tản nhiệt', k: 'Thân máy · làm mát bằng không khí', sys: 'cool', needs: ['pitong'], from: [0, 0.12, 0], tool: 'vòng bó xéc măng',
    b: 'Ống dẫn hướng cho pít-tông. Cánh tản nhiệt bên ngoài toả nhiệt ra không khí khi xe chạy.',
    note: 'Xi lanh trùm qua pít-tông từ trên xuống; xéc măng phải bó lại mới lọt vào lòng xi lanh.'},
  {id: 'xupap', name: 'Xupap, lò xo xupap', k: 'Cơ cấu phân phối khí', sys: 'valve', needs: ['xilanh'], from: [0, 0.1, 0], tool: 'cảo nén lò xo xupap',
    blocks: [['nap', 'xupap luồn vào ống dẫn hướng từ phía buồng cháy; nắp máy úp xuống rồi thì phía đó bị che kín.']],
    b: 'Đóng, mở cửa nạp và cửa thải đúng thời điểm; lò xo kéo xupap về đóng kín.',
    note: 'Trong xưởng, xupap lắp vào nắp máy trên bàn trước, rồi cả cụm mới úp lên xi lanh.'},
  {id: 'nap', name: 'Nắp máy', k: 'Thân máy', sys: 'frame', needs: ['xilanh', 'xupap'], from: [0, 0.12, 0], tool: 'cần siết lực, siết chéo nhiều lượt',
    b: 'Khép kín phía trên xi lanh thành buồng cháy, mang xupap, trục cam và bugi.',
    note: 'Nắp máy khép buồng cháy; tỉ số nén tính theo thể tích buồng cháy này.'},
  {id: 'cam', name: 'Trục cam, xích cam', k: 'Cơ cấu phân phối khí', sys: 'valve', needs: ['nap', 'khuyu'], from: [0, 0.1, 0],
    blocks: [['napday', 'nắp đậy che kín ổ đỡ trục cam và đĩa xích.']],
    b: 'Vấu cam đẩy cò mổ để mở xupap. Trục cam quay bằng nửa trục khuỷu vì đĩa xích ở trục cam to gấp đôi đĩa ở trục khuỷu.',
    note: 'Đặt dấu đĩa xích cam trùng dấu trên nắp máy khi pít-tông ở ĐCT cuối kì nén; lệch dấu thì xupap mở sai thời điểm.'},
  {id: 'como', name: 'Cò mổ', k: 'Cơ cấu phân phối khí', sys: 'valve', needs: ['cam', 'xupap'], from: [0, 0.08, 0], tool: 'thước lá chỉnh khe hở nhiệt xupap',
    blocks: [['napday', 'nắp đậy che kín giàn cò mổ, không chỉnh được khe hở xupap.']],
    b: 'Cần bập bênh truyền chuyển động từ vấu cam xuống đuôi xupap.',
    note: 'Lắp cò mổ xong thì chỉnh khe hở nhiệt giữa cò mổ và đuôi xupap.'},
  {id: 'napday', name: 'Nắp đậy giàn cò', k: 'Thân máy', sys: 'frame', needs: ['como'], from: [0, 0.1, 0],
    b: 'Che giàn cò mổ và trục cam, giữ dầu bôi trơn không văng ra ngoài.',
    note: 'Đậy sau cùng, khi đã chỉnh xong khe hở xupap.'},
  {id: 'bugi', name: 'Bugi, cuộn đánh lửa', k: 'Hệ thống đánh lửa', sys: 'ign', needs: ['nap'], from: [0, 0.1 * Math.cos(PLUG), -0.1 * Math.sin(PLUG)], tool: 'tuýp bugi',
    b: 'Cuộn đánh lửa tạo điện áp cao; bugi phóng tia lửa điện vào hoà khí đã nén ở cuối kì nén.',
    note: 'Bugi vặn vào nắp máy theo trục nghiêng của nó, đầu điện cực thò vào buồng cháy.'},
  {id: 'nap_nl', name: 'Đường nạp, bộ chế hoà khí, lọc gió', k: 'Hệ thống nhiên liệu và không khí', sys: 'fuel', needs: ['nap'], from: [-0.12, 0, 0],
    b: 'Không khí qua lọc gió, trộn với xăng ở bộ chế hoà khí thành hoà khí, rồi vào cửa nạp.',
    note: 'Gắn vào cửa nạp bên trái nắp máy.'},
  {id: 'xa', name: 'Ống xả', k: 'Hệ thống nhiên liệu và không khí', sys: 'fuel', needs: ['nap'], from: [0.1, -0.06, 0],
    b: 'Dẫn khí đã cháy từ cửa thải ra ngoài.',
    note: 'Gắn vào cửa thải bên phải nắp máy.'},
  {id: 'khoidong', name: 'Mô tơ khởi động', k: 'Hệ thống khởi động', sys: 'start', needs: ['cacte'], from: [0.12, 0, 0],
    b: 'Mô tơ điện quay trục khuỷu lúc khởi động, cho tới khi máy tự nổ.',
    note: 'Bắt vào cácte, ăn khớp với bộ truyền tới trục khuỷu.'},
  {id: 'dau', name: 'Dầu bôi trơn', k: 'Hệ thống bôi trơn', sys: 'lube', needs: ['napday'], from: [0, 0.1, 0], tool: 'phễu, que thăm dầu',
    b: 'Dầu đọng ở đáy cácte, được đưa lên bôi trơn và làm mát các mặt ma sát.',
    note: 'Đổ dầu sau cùng, khi máy đã kín.'},
];

// một thứ tự lắp đúng (kit/lap.js kiểm lại lúc chạy); Lắp mẫu và Gợi ý đi theo thứ tự này
export const ORDER = ['cacte', 'khuyu', 'truyen', 'pitong', 'xilanh', 'xupap', 'nap', 'cam', 'como', 'napday', 'bugi', 'nap_nl', 'xa', 'khoidong', 'dau'];
