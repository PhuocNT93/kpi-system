# Step 5: Test Cases

Status: reconstructed from approved response

## Deliverable

## Test Cases

| ID | Description | Type | Expected Result |
|---|---|---|---|
| **TC01** | **Desktop Viewport ($\ge 1024\text{px}$ / $1440\text{px}$)**: Kiểm tra layout Job Architecture & Org Structure trên màn hình rộng | Manual / UI | - Tab Job Architecture hiển thị dạng lưới đa cột (Job Roles và Job Levels song song, Review Cadences chiếm toàn bộ hàng dưới).<br>- Tab Org Structure hiển thị 2 cột song song (Sidebar cây sơ đồ 300px + Panel dữ liệu bên phải).<br>- Không có thanh cuộn ngang toàn trang. |
| **TC02** | **Tablet Viewport ($768\text{px} - 1023\text{px}$)**: Kiểm tra layout trên màn hình iPad / Tablet | Manual / UI | - Tab Job Architecture co giãn tỷ lệ lưới phù hợp.<br>- Tab Org Structure tự động chuyển sang xếp chồng theo chiều dọc (`flex-direction: column`), cây sơ đồ ở trên và bảng dữ liệu ở dưới.<br>- Các bảng hiển thị trọn vẹn, không đè lấn layout. |
| **TC03** | **Mobile Viewport ($360\text{px} - 414\text{px}$)**: Kiểm tra layout trên thiết bị di động (iPhone / Android) | Manual / UI | - Tab Job Architecture chuyển thành 1 cột đơn (`grid-template-columns: 1fr`), loại bỏ hoàn toàn tình trạng thẻ card bị gò bó 600px.<br>- Padding card co giãn hợp lý (16px).<br>- Toàn trang không bị thanh cuộn ngang viewport. |
| **TC04** | **Data Tables Horizontal Touch Scrolling**: Kiểm tra vuốt chạm cuộn ngang bảng trên di động | Manual / UI | - Khi chiều rộng màn hình nhỏ hơn chiều rộng tối thiểu của bảng, bảng cho phép vuốt ngang mượt mà (`overflow-x: auto; touch-action: pan-x`).<br>- Cột dữ liệu không bị co dúm hay vỡ dòng bất thường. |
| **TC05** | **Tab Navigation Responsive**: Kiểm tra thanh chuyển tab trên màn hình hẹp | Manual / UI | - Các nút tab ("Org Structure", "Job Architecture") không bị tràn hay đè chữ.<br>- Vùng bấm nút tab có chiều cao $\ge 40\text{px}$ thuận tiện thao tác ngón tay. |
| **TC06** | **Form Modals Responsive & Virtual Keyboard**: Kiểm tra mở form modal trên màn hình di động | Manual / UI | - Các Form Modals có `max-height: 90vh` và cuộn dọc mượt mà.<br>- Các nút "Hủy" và "Lưu thay đổi" luôn hiển thị rõ ràng.<br>- Ô input không gây hiện tượng auto-zoom trên iOS. |
| **TC07** | **Dark Mode & Light Mode Theme Consistency**: Kiểm tra tương phản màu sắc trên mọi kích thước thiết bị | Manual / UI | - Cả 2 chế độ Dark Mode và Light Mode đều giữ nguyên độ tương phản sắc nét, viền rõ ràng, badge dễ đọc. |
| **TC08** | **Frontend Typecheck & Production Build**: Kiểm tra tính toàn vẹn mã nguồn TypeScript | Automated | Lệnh `npm run build` (`tsc --noEmit` & `vite build`) chạy thành công 100% với 0 lỗi. |
| **TC09** | **Backend Regression Safety**: Đảm bảo không ảnh hưởng backend | Automated | Lệnh `npm test` trong backend đạt 100% passed (655/655 tests). |
