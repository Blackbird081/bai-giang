// Các cụm lắp ráp TurtleBot3 Burger cho chế độ lắp ráp (kit/lap.js).
// Thứ tự theo tầng, từ dưới lên, như hướng dẫn lắp Burger trong ROBOTIS e-Manual: tầng 1 mang hai servo, bánh, bi đỡ, pin;
// tầng 2 mang OpenCR; tầng 3 mang Raspberry Pi; tầng 4 mang LiDAR. Đây là quy trình RÚT GỌN để học: bỏ qua dây cáp, vít,
// giá đỡ từng chi tiết. Lối vào của tuốc nơ vít (mạch, servo bắt vít từ phía trên nên tầng trên úp xuống thì không với tới) là
// giả định của bài, ghi ngay trong lí do.
// from: hướng và quãng đưa cụm vào ở chặng cuối, trong khung thân robot (mét; x tiến, y trái, z lên).

export const UNITS = [
  {id: 'tang1', name: 'Tầng 1 (tấm đế)', from: [0, 0, 0.08], note: 'Chi tiết nền: mọi tầng và cụm khác tựa vào nó.'},
  {id: 'servo', name: 'Hai servo XL430-W250', needs: ['tang1'], from: [0, 0, 0.08], tool: 'tuốc nơ vít',
    blocks: [['tang2', 'trong bài, vít bắt giá servo vặn từ phía trên; tầng 2 úp xuống thì tuốc nơ vít không còn lối vào.']],
    note: 'Hai servo đặt quay lưng vào nhau, trục ra hai bên hông.'},
  {id: 'banhP', name: 'Bánh phải', needs: ['servo'], from: [0, -0.08, 0], note: 'Bánh bắt vào đĩa trục servo từ phía ngoài, nên lắp lúc nào sau servo cũng được.'},
  {id: 'banhT', name: 'Bánh trái', needs: ['servo'], from: [0, 0.08, 0], note: 'Bánh bắt vào đĩa trục servo từ phía ngoài, nên lắp lúc nào sau servo cũng được.'},
  {id: 'bido', name: 'Bi đỡ', needs: ['tang1'], from: [-0.07, 0, 0], note: 'Điểm tựa thứ ba phía sau, cùng hai bánh giữ robot đứng vững.'},
  {id: 'pin', name: 'Pin LiPo 11,1 V', needs: ['tang1'], from: [0, 0.1, 0], note: 'Pin trượt vào khoang giữa tầng 1 và tầng 2 từ bên hông, nên tháo ra sạc được mà không phải tháo tầng trên.'},
  {id: 'cot1', name: 'Bốn trụ tầng 1', needs: ['tang1'], from: [0, 0, 0.06], note: 'Trụ giữ khoảng cách giữa hai tầng.'},
  {id: 'tang2', name: 'Tầng 2', needs: ['cot1', 'servo'], from: [0, 0, 0.08], note: 'Úp lên bốn trụ tầng 1.'},
  {id: 'opencr', name: 'Mạch OpenCR', needs: ['tang2'], from: [0, 0, 0.06], tool: 'tuốc nơ vít',
    blocks: [['tang3', 'trong bài, OpenCR bắt vít lên tầng 2 từ phía trên; tầng 3 úp xuống thì tuốc nơ vít không còn lối vào.']],
    note: 'Mạch điều khiển tầng thấp: servo, encoder, cảm biến quán tính.'},
  {id: 'cot2', name: 'Bốn trụ tầng 2', needs: ['tang2'], from: [0, 0, 0.06]},
  {id: 'tang3', name: 'Tầng 3', needs: ['cot2', 'opencr'], from: [0, 0, 0.08]},
  {id: 'rpi', name: 'Raspberry Pi 4', proper: true, needs: ['tang3'], from: [0, 0, 0.06], tool: 'tuốc nơ vít',
    blocks: [['tang4', 'trong bài, Raspberry Pi bắt vít lên tầng 3 từ phía trên; tầng 4 úp xuống thì tuốc nơ vít không còn lối vào.']],
    note: 'Máy tính nhúng chạy ROS 2.'},
  {id: 'cot3', name: 'Bốn trụ tầng 3', needs: ['tang3'], from: [0, 0, 0.06]},
  {id: 'tang4', name: 'Tầng 4', needs: ['cot3', 'rpi'], from: [0, 0, 0.08]},
  {id: 'lidar', name: 'LiDAR LDS-02', needs: ['tang4'], from: [0, 0, 0.06], note: 'Đặt trên cùng để 360 tia quét không bị thân robot che.'},
];

export const ORDER = ['tang1', 'servo', 'banhP', 'banhT', 'bido', 'pin', 'cot1', 'tang2', 'opencr', 'cot2', 'tang3', 'rpi', 'cot3', 'tang4', 'lidar'];
