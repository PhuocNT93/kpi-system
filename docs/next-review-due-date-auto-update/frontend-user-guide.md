# Hướng dẫn sử dụng giao diện: Lịch đánh giá tự động (Next Review Due Date)

Dành cho HR Admin, System Admin và Manager. Tài liệu mô tả cách giao diện hiển thị **lịch đánh giá do server tính** sau task `next-review-due-date-auto-update`.

---

## 1. Nguyên tắc

- `Next Review Due Date` **luôn do backend tính**:
  `business date (Asia/Ho_Chi_Minh) của lần đánh giá hoàn thành gần nhất + số tháng của chu kỳ hiệu lực` (tháng dương lịch; ví dụ 31/01 + 1 tháng = 28/02 hoặc 29/02).
- Giao diện **không tự tính** ngày đến hạn và **không còn ô nhập** "Last Review Date" / "Next Review Date".
- `Last Evaluation Completed` chỉ thay đổi khi một evaluation được **PUBLISHED** (publish thủ công hoặc chốt calibration). Khóa (LOCK) evaluation không làm thay đổi lịch.
- Đổi chu kỳ (override, cấp bậc, chu kỳ mặc định của cấp bậc, số tháng của chu kỳ) → ngày đến hạn được tính lại **ngay**, luôn từ mốc hoàn thành gần nhất (không tính từ hôm nay).
- Nhân viên chưa từng hoàn thành đánh giá: `Next Review Due Date` để trống và hiện ghi chú *"Chưa có đánh giá hoàn thành — cần đánh giá ngay."*

Chu kỳ hiệu lực được chọn theo thứ tự ưu tiên:

```
1. Thiết lập riêng cho nhân viên (Employee override)
2. Mặc định theo cấp bậc (Job level default)
3. Mặc định hệ thống (System default)
```

Chu kỳ đang bị tắt (inactive) được bỏ qua và dùng tầng kế tiếp.

---

## 2. Điều kiện tiên quyết và khởi động

| Mục | Giá trị |
|---|---|
| Backend | `npm --prefix backend run dev` (mặc định cổng `3000`) hoặc `docker compose up --build` (backend ở `BACKEND_PORT`, mặc định `8080`) |
| Frontend | `npm --prefix frontend run dev` hoặc qua Docker Compose (`FRONTEND_PORT`) |
| API base URL | `VITE_API_BASE_URL` phải trỏ đúng backend đang chạy (mặc định `http://localhost:3000`) |
| Migration | `npm --prefix backend run migrate:up` (hoặc `docker compose run --rm migrate`) để có nhãn tiếng Việt từ migration `1791000000008_seed_review_schedule_ui_i18n_translations` |
| Múi giờ nghiệp vụ | Backend: `BUSINESS_TIMEZONE`; Frontend (hiển thị ngày hoàn thành): `VITE_BUSINESS_TIMEZONE` — cả hai mặc định `Asia/Ho_Chi_Minh` và nên đặt giống nhau |
| Dừng | `Ctrl+C` ở terminal dev, hoặc `docker compose down` |

Tài khoản mẫu: xem `README.md`.

---

## 3. Màn hình Quản lý nhân viên (Organization → Org Structure → Employees)

- **Đường dẫn:** `/admin/organization` (HR_ADMIN, SYSTEM_ADMIN).
- **Bảng nhân viên:** các cột *Cadence* (chu kỳ hiệu lực — tên và số tháng; rê chuột lên badge để xem **nguồn chu kỳ**), *Last Review* và *Next Review* hiển thị đúng giá trị server trả về (`YYYY-MM-DD`). Rê chuột lên tiêu đề cột để xem tên đầy đủ; email/tên quá dài được rút gọn bằng "…" (rê chuột để xem đủ). Bảng hiển thị trên một dòng mỗi nhân viên, vừa khung trên màn hình ≥ 1024px.
- **Sửa nhân viên:** bấm biểu tượng **cây viết** ở cột Actions (chỉ HR/Admin).
- **Form sửa nhân viên → khung "Lịch đánh giá" (chỉ đọc):**
  - *Chu kỳ đánh giá hiệu lực*
  - *Nguồn chu kỳ* (Thiết lập riêng / Mặc định theo cấp bậc / Mặc định hệ thống)
  - *Lần đánh giá hoàn thành gần nhất*
  - *Hạn đánh giá tiếp theo*
- **Đổi chu kỳ riêng (HR/Admin):** chọn trong *Chu kỳ đánh giá riêng* (danh sách lấy từ API, chỉ chu kỳ đang active; chọn *"Không thiết lập riêng"* để quay về mặc định), nhập lý do (khuyến nghị) rồi **Lưu**. Sau khi lưu, khung lịch hiển thị ngày mới do server trả về, không cần tải lại trang.
- **Đổi cấp bậc (Job Level):** chỉ HR/Admin; nếu chu kỳ hiệu lực thay đổi, ngày đến hạn được tính lại tự động.
- **Tạo nhân viên:** có thể chọn chu kỳ riêng ngay khi tạo (HR/Admin). Nhân viên mới chưa có lịch (cần đánh giá ngay).
- Nút **Lưu** bị vô hiệu hóa trong lúc đang gửi để tránh gửi trùng.

### Hành vi khi có lỗi

| Tình huống | Hiển thị |
|---|---|
| `409 VERSION_MISMATCH` (người khác vừa sửa nhân viên) | Thông báo lỗi + mã lỗi + gợi ý và nút **Tải lại dữ liệu mới nhất**; dữ liệu đã nhập được giữ nguyên, form không đóng |
| `422` (vi phạm nghiệp vụ, ví dụ chu kỳ/cấp bậc không active) | Thông báo lỗi từ server + mã lỗi; form giữ nguyên |
| `403` (không đủ quyền) | Thông báo lỗi từ server |
| `404` (chu kỳ không tồn tại hoặc đã tắt) | Thông báo lỗi từ server |

---

## 4. Chu kỳ đánh giá & Cấp bậc

- **Review Cadences** (`/admin/review-cadences`, HR/Admin): sửa *số tháng*, *active* hoặc *mặc định hệ thống* → mọi nhân viên đang dùng chu kỳ đó được tính lại ngay (từ mốc hoàn thành gần nhất). Chỉ đổi tên không làm thay đổi lịch. Không thể xóa chu kỳ đang được cấp bậc hoặc nhân viên tham chiếu (`CADENCE_IN_USE`).
- **Job Levels** (Organization → Job Architecture): đổi *chu kỳ mặc định* → nhân viên thuộc cấp bậc đó **không có chu kỳ riêng** được tính lại; nhân viên có chu kỳ riêng giữ nguyên.
- Sau khi lưu, danh sách nhân viên và Review Due Dashboard được làm mới tự động (không cần tải lại trang).

---

## 5. Review Due Dashboard (`/admin/review-due`)

- Quyền: HR_ADMIN, SYSTEM_ADMIN, MANAGER (Manager chỉ thấy team mình quản lý).
- Hiển thị `Next Review Due Date` đúng như server trả về, chu kỳ hiệu lực và nguồn chu kỳ (badge), trạng thái `OVERDUE / DUE / UPCOMING / NOT_DUE / NO_SCHEDULE`.
- Phân trang theo trang (50 dòng/trang). Các ô đếm *Quá hạn / Đến hạn / Sắp đến hạn* tính trên **trang hiện tại** (ghi chú "Trên trang hiện tại"); ô *Tổng* là tổng số nhân viên khớp bộ lọc do server trả về.
- Dữ liệu được làm mới sau các thay đổi chu kỳ, sau Publish và sau khi chốt calibration; không có polling tự động.

---

## 6. Giới hạn đã biết

- Duyệt (approve) evaluation hiện chưa tự publish; lịch được cập nhật khi HR **Publish** hoặc khi **chốt calibration**.
- Evaluation chuyển thẳng `APPROVED → LOCKED` (không qua PUBLISHED) sẽ không cập nhật lịch.
- Sửa nhân viên và đổi chu kỳ riêng trong cùng một lần Lưu là hai request riêng; nếu request thứ hai lỗi, thay đổi hồ sơ đã được lưu và lỗi chu kỳ được hiển thị để thử lại.
- Trạng thái OVERDUE/DUE của dashboard dùng ngày hiện tại của cơ sở dữ liệu (`CURRENT_DATE`), chưa theo `BUSINESS_TIMEZONE`.
- Giá trị `Next Review Due Date` cũ được tính bằng logic trước đây sẽ được chuẩn hóa ở lần publish hoặc thay đổi chu kỳ tiếp theo (không có backfill hàng loạt).
