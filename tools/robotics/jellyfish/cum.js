// Các cụm lắp ráp của sứa robot cho chế độ lắp ráp (kit/lap.js) và tách rời.
// Bố cục theo Cyro (Virginia Tech): lõi điện tử ở đỉnh chuông, cánh tay co hướng tâm, chuông silicone phủ ngoài.
// Đây là quy trình RÚT GỌN để học, không phải quy trình của nhóm Virginia Tech: bỏ dây, vít, khuôn đúc. Việc chuông đúc phủ
// lên vòng co (nên vít cánh tay hết lối vào), tám cảm biến cắm vào khía giữa các thuỳ, giá tua bắt vào đầu cánh tay, đèn viền
// và tay miệng là giả định của bài.
// from: hướng và quãng đưa cụm vào ở chặng cuối, trong khung sứa (mét; z dọc trục chuông, đỉnh chuông ở trên);
// chế độ tách rời đẩy cụm theo đúng hướng này: phần trên nhấc lên, tua và tay miệng dạt sang hai bên.
export const UNITS = [
  {id: 'loi', name: 'Lõi điện tử và pin', from: [0, 0, 0.9], note: 'Chi tiết nền ở đỉnh chuông: mạch điều khiển, pin, cảm biến áp suất đo độ sâu.'},
  {id: 'vong', name: 'Vòng co tám cánh tay', needs: ['loi'], from: [0, 0, -0.25], tool: 'tuốc nơ vít',
    blocks: [['chuong', 'trong bài, vít bắt cánh tay vào lõi nằm dưới lớp silicone; chuông phủ lên rồi thì hết lối vào.']],
    note: 'Tám cánh tay kéo mép chuông vào trong, cách nhau 45° như tám bộ chấp hành của Robojelly.'},
  {id: 'chuong', name: 'Chuông silicone', needs: ['vong'], from: [0, 0, 0.5], note: 'Lớp silicone mềm phủ ngoài, đóng vai tầng keo (mesoglea) của sứa thật.'},
  {id: 'rhop', name: 'Tám cảm biến rhopalia', needs: ['chuong'], from: [0, 0, 0.25], note: 'Cắm vào tám khía giữa các thuỳ chuông, như tám cơ quan thăng bằng của sứa bờm sư tử.'},
  {id: 'den', name: 'Đèn viền', needs: ['chuong'], from: [0, 0, -0.15], note: 'Dải đèn ở mép chuông sáng theo nhịp co, để thấy nhịp từ xa.'},
  {id: 'gia', name: 'Tám giá tua', needs: ['vong'], from: [0, 0, -0.4], tool: 'tuốc nơ vít', note: 'Bắt vào đầu tám cánh tay ở mép chuông, từ phía dưới.'},
  {id: 'tua', name: 'Tám chùm tua', needs: ['gia'], from: [1.7, 0, -0.2], note: 'Mỗi giá một chùm; đầu tua mang hạt mô phỏng tế bào gai.'},
  {id: 'mieng', name: 'Bốn tay miệng', needs: ['loi'], from: [-1.5, 0, -0.1], note: 'Treo dưới lõi, giữa khoang chuông, như bốn tay miệng có diềm của sứa thật.'},
];
export const ORDER = ['loi', 'vong', 'chuong', 'rhop', 'den', 'gia', 'tua', 'mieng'];
