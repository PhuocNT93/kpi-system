# Organization Management Responsive UI - Frontend User Guide

## 1. Overview
Hệ thống **Organization Management** (`/admin/organization`) được thiết kế đáp ứng hoàn toàn (Responsive Design) trên mọi loại thiết bị (Desktop, Laptop, Tablet, Mobile) và đồng bộ với cả 2 chế độ hiển thị **Light Mode** & **Dark Mode** cùng hệ thống đa ngôn ngữ song ngữ Anh - Việt (`ORGANIZATION_UI`).

---

## 2. Prerequisites & Environment
- **Node.js**: $\ge 18.x$
- **Frontend Port**: Mặc định chạy tại `http://localhost:4000` (hoặc cổng cấu hình qua Vite).
- **Backend API URL**: `http://localhost:3000/api` (được cấu hình qua biến môi trường `VITE_API_URL`).

---

## 3. Startup and Shutdown Commands

### Khởi động môi trường phát triển (Dev server)
```bash
cd frontend
npm install
npm run dev
```

### Kiểm tra kiểu dữ liệu & Đóng gói sản phẩm (Build & Typecheck)
```bash
cd frontend
npm run build
```

### Dừng hệ thống
Nhấn `Ctrl + C` trên terminal đang chạy dev server.

---

## 4. Configured URLs & Navigation Routes
- **Đường dẫn chính**: `http://localhost:4000/admin/organization`
- **Tab 1 - Cơ cấu Tổ chức (Org Structure)**: `/admin/organization` (Tab active: `structure`)
- **Tab 2 - Cấu trúc Vị trí (Job Architecture)**: `/admin/organization` (Tab active: `architecture`)

---

## 5. Responsive Behavior Across Devices

### 5.1. Desktop Screen ($\ge 1024\text{px}$)
- **Job Architecture**:
  - Hàng trên: Bố cục Grid 2 cột cân đối hiển thị khối **Job Roles** và **Job Levels**.
  - Hàng dưới: Khối **Review Cadences** trải dài toàn bộ chiều rộng trang (`grid-column: 1 / -1`).
- **Org Structure**:
  - Cột trái: Cây sơ đồ tổ chức (Sidebar) cố định 300px, hiển thị phân cấp Phòng ban và Nhóm trực quan.
  - Cột phải: Panel nội dung chi tiết co giãn linh hoạt hiển thị bảng Departments, Teams hoặc Employees tương ứng với node được chọn.

### 5.2. Tablet Screen ($768\text{px} - 1023\text{px}$)
- **Job Architecture**: Các thẻ card tự động co giãn theo tỷ lệ màn hình.
- **Org Structure**: Tự động chuyển đổi sang bố cục xếp chồng theo chiều dọc (`flex-direction: column`). Cây sơ đồ tổ chức đặt phía trên với chiều cao tối đa 380px (có thanh cuộn riêng), panel dữ liệu chi tiết hiển thị toàn bộ chiều rộng bên dưới.

### 5.3. Mobile Screen ($< 768\text{px}$, $360\text{px} - 480\text{px}$)
- **Job Architecture**: Các khối chuyển thành 1 cột đơn (`grid-template-columns: 1fr`), padding card thu gọn còn 14px–16px, không gây thanh cuộn ngang toàn trang.
- **Data Tables**:
  - Tất cả các bảng dữ liệu (Job Roles, Job Levels, Review Cadences, Departments, Teams, Employees) được bọc trong container cảm ứng (`overflow-x: auto; WebkitOverflowScrolling: 'touch'`).
  - Chiều rộng cột dữ liệu được bảo vệ, người dùng có thể vuốt ngang mượt mà bằng ngón tay.
- **Form Modals**:
  - Hộp thoại dialog tự động giới hạn `max-height: 90vh` kèm cuộn dọc mượt mà.
  - Các nút hành động "Hủy", "Lưu thay đổi" luôn hiển thị rõ ràng và dễ bấm.
  - Ô nhập liệu có font chữ tối thiểu 16px để ngăn chặn trình duyệt Safari (iOS) tự động zoom khi chạm vào ô.

---

## 6. Available User-Visible Features & Actions
- **Chuyển đổi Tab**: Bấm chọn "Org Structure" hoặc "Job Architecture".
- **Thao tác Chức danh (Job Roles)**: Xem danh sách, tạo mới, chỉnh sửa trạng thái hoạt động.
- **Thao tác Cấp bậc (Job Levels)**: Xem danh sách, tạo mới, cấu hình cấp bậc và chu kỳ đánh giá mặc định (`default_review_cadence_id`).
- **Thao tác Chu kỳ Đánh giá (Review Cadences)**: Xem danh sách, tạo mới, chỉnh sửa khoảng thời gian (số tháng), thiết lập chu kỳ mặc định hệ thống.
- **Thao tác Phòng ban & Nhóm (Departments & Teams)**: Xem danh sách, duyệt cây sơ đồ, lọc nhân viên theo từng phòng/nhóm, tạo/sửa phòng ban và nhóm.
- **Thao tác Nhân viên (Employees)**: Thêm mới nhân viên, xem chu kỳ đánh giá áp dụng và lịch đánh giá tiếp theo.
- **Thao tác hàng loạt (Bulk Actions)**: Chọn nhiều hàng để kích hoạt hoặc hủy kích hoạt hàng loạt cho HR Admin.

---

## 7. Known Limitations
- Màn hình cực nhỏ dưới 320px (thiết bị đồng hồ thông minh hoặc điện thoại mini cổ điển) có thể cần thu nhỏ tỷ lệ zoom trình duyệt để có trải nghiệm xem bảng tốt nhất.
