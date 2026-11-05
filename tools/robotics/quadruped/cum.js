// Các cụm lắp ráp của chó robot cho chế độ lắp ráp (kit/lap.js) và chế độ tách rời.
// Bố cục theo MIT Mini Cheetah: thân là khung đỡ, bốn động cơ khép/mở hông gắn ở bốn góc thân, mỗi chân là một mô-đun
// (động cơ hông và động cơ gối đặt đồng trục, đùi, ống chân, bàn chân) bắt vào mặt bích ra của động cơ khép/mở.
// Đây là quy trình RÚT GỌN để học, không phải hướng dẫn của MIT: bỏ dây cáp, vít, giá đỡ. Hướng bắt vít của mạch và động cơ
// khép/mở (từ trong thân, nên vỏ đóng lại thì hết lối vào), cửa thay pin ở đuôi và đầu cảm biến là giả định của bài.
// from: hướng và quãng đưa cụm vào ở chặng cuối, trong khung thân (mét; x tiến, y trái, z lên); chế độ tách rời cũng đẩy cụm theo hướng này.

const chan = (id, name, x, y) => ({id, name, needs: ['abad'], from: [x * 0.06, y * 0.16, -0.02],
  note: 'Mô-đun chân bắt vào mặt bích ra của động cơ khép/mở từ phía ngoài thân, nên lắp được cả khi vỏ đã đóng.'});

export const UNITS = [
  {id: 'khung', name: 'Khung thân', from: [0, 0, -0.1], note: 'Chi tiết nền: mọi cụm khác tựa vào khung. Trong lúc lắp, thân đặt trên giá đỡ.'},
  {id: 'maytinh', name: 'Máy tính và mạch điều khiển', needs: ['khung'], from: [0, 0, 0.12], tool: 'tuốc nơ vít',
    blocks: [['vo', 'trong bài, mạch bắt vít từ phía trên; vỏ đóng lại thì tuốc nơ vít không còn lối vào.']],
    note: 'Chạy bộ điều khiển dáng đi, đọc cảm biến quán tính và gửi lệnh mô men cho 12 động cơ.'},
  {id: 'abad', name: 'Bốn động cơ khép/mở hông', needs: ['khung'], from: [0, 0, 0.1], tool: 'tuốc nơ vít',
    blocks: [['vo', 'trong bài, bu lông giữ động cơ vặn từ bên trong thân; vỏ đóng lại thì hết lối vào.']],
    note: 'Bốn động cơ ở bốn góc thân, trục quay dọc thân: nghiêng cả chân ra ngoài hay vào trong.'},
  {id: 'pin', name: 'Pin 24 V', needs: ['khung'], from: [-0.32, 0, 0],
    note: 'Pin trượt vào khoang thân qua cửa ở đuôi, nên thay được mà không phải mở vỏ (giả định của bài).'},
  {id: 'vo', name: 'Vỏ trên', needs: ['maytinh', 'abad'], from: [0, 0, 0.14], note: 'Vỏ che mạch và bốn động cơ khép/mở.'},
  {id: 'dau', name: 'Đầu cảm biến', needs: ['vo'], from: [0.16, 0, 0.02], note: 'Kính che và hai cặp camera ở mũi thân. Mini Cheetah gốc không có đầu này; bài thêm vào để học.'},
  chan('chanFR', 'Chân phải trước', 1, -1), chan('chanFL', 'Chân trái trước', 1, 1), chan('chanRR', 'Chân phải sau', -1, -1), chan('chanRL', 'Chân trái sau', -1, 1),
];

export const ORDER = ['khung', 'maytinh', 'abad', 'pin', 'vo', 'dau', 'chanFR', 'chanFL', 'chanRR', 'chanRL'];
