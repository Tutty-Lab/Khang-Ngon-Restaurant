# Khang Restaurant & Ngon Soulfood

App chung 2 quán, tạo từ ../demo, Git repo độc lập.

## Chạy

```sh
npm ci
npm run dev
npm run build
npm test -- src/lib/__tests__/restaurant.test.ts
```

Mật khẩu ban đầu: `1991`. Dữ liệu lưu cục bộ theo từng quán. Không sao chép .env của demo. Muốn đồng bộ cần cấu hình Supabase riêng theo supabase/schema.sql.

## Dữ liệu

Tháng tham khảo 09/2026, 15 người / 16 hồ sơ quán. Không tạo chấm công thực tế từ ảnh.
Lương tháng bỏ trống: nhập giờ trực tiếp. Có lương tháng: targetMinutes = round(lương tháng / lương giờ * 60), mặc định 13,90 €/h.
Bốn người có lương trong ảnh được nhập đúng số tiền; Vân chia 1.500 €/quán (tổng 3.000 €). Trung ở Ngon sau K→N, tổng 166 giờ, chưa biết ngày chuyển. Các nhân viên khác giữ số giờ ảnh, không suy đoán lương tháng. Hình thức hợp đồng suy từ giờ chỉ là tạm, cần kiểm tra lại. Tên viết tắt giữ theo ảnh.

Khang nghỉ trưa thứ 7/CN/lễ. Ngon nghỉ thứ 7 cả ngày, trưa lễ. Giờ mở 12:00–15:00 / 17:30–22:00. Pause cung cấp 15:00–17:00, khoảng 17:00–17:30 vẫn ngoài giờ mở, không tính công. Ngày lễ München gồm 15/8.

Chưa có số người yêu cầu mỗi ca: tối thiểu một người, không tự đặt định mức cao điểm. Hệ số tương đối: Khang T3/T4/T5 1,5; Ngon T5 1,5, T6/CN 1,8. Có thể xuất hiện thiếu giờ do giờ mục tiêu vượt sức chứa lịch; app hiển thị cảnh báo.

Bộ test kế thừa dùng legacyStoreFixtures.ts riêng cho dữ liệu Shin/Coco/Nieu; cấu hình thực tế được kiểm tra trong restaurant.test.ts.
