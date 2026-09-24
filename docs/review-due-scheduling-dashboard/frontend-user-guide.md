# Hướng Dẫn Sử Dụng Giao Diện: Review Cadence & Review Due Dashboard

Tài liệu hướng dẫn dành cho Quản trị viên Nhân sự (HR Admin), Quản trị viên Hệ thống (System Admin), và Quản lý Đội nhóm (Manager) về các tính năng liên quan đến Chu kỳ Đánh giá (Review Cadence), Giám sát Hạn Đánh giá (Review Due Dashboard), và Gán Riêng Chu kỳ cho Nhân viên (Employee Cadence Override).

---

## 1. Tổng quan Kiến trúc Chu kỳ & Hạn Đánh giá

Hệ thống KPI áp dụng cơ chế xác định chu kỳ đánh giá (Effective Cadence) tự động theo thứ tự ưu tiên 3 tầng:

```
[1. Employee Override (Gán riêng)]
         ↓ (nếu không có)
[2. Job Level Default (Theo cấp bậc)]
         ↓ (nếu không có)
[3. System Default (Mặc định hệ thống)]
```

* **Ngày đến hạn kế tiếp (`next_review_due_date`)**: Luôn được tính toán dựa trên mốc thời gian hoàn thành đánh giá gần nhất (`last_evaluation_completed_at + interval_months`), triệt tiêu hoàn toàn độ trôi lịch (schedule drift).
* **Phân loại trạng thái hạn**:
  * **OVERDUE (Quá hạn)**: Ngày đến hạn nhỏ hơn ngày hiện tại (`next_review_due_date < CURRENT_DATE`).
  * **DUE (Đến hạn hôm nay)**: Ngày đến hạn trùng với ngày hiện tại (`next_review_due_date = CURRENT_DATE`).
  * **UPCOMING (Sắp đến hạn)**: Ngày đến hạn nằm trong khoảng thời gian dự báo (`CURRENT_DATE < next_review_due_date <= CURRENT_DATE + lead_time_days`). Mặc định `lead_time = 30 ngày`.
  * **NOT_DUE (Chưa đến hạn)**: Ngày đến hạn vượt quá khoảng thời gian dự báo.
* **Loại trừ tự động**: Nhân viên có trạng thái `INACTIVE` hoặc `TERMINATED` được tự động loại khỏi danh sách đến hạn.

---

## 2. Quản lý Chu kỳ Đánh giá (Review Cadence Management)

### 2.1. Truy cập
* **Menu**: `Configuration` &rarr; `Review Cadences` (Đường dẫn: `/admin/review-cadences`).
* **Hoặc**: `Configuration` &rarr; `Organization` &rarr; Tab `Job Architecture` &rarr; Mục `Review Cadences`.
* **Phân quyền**: Chỉ **HR_ADMIN** và **SYSTEM_ADMIN** mới có quyền thêm/sửa/xóa chu kỳ.

### 2.2. Thao tác Quản trị Chu kỳ
1. **Tạo mới Chu kỳ (`+ Create Cadence`)**:
   * **Mã chu kỳ (Code)**: Duy nhất, ví dụ: `CAD-QUARTERLY`, `CAD-PROBATION-2M`.
   * **Tên chu kỳ (Name)**: Tên hiển thị, ví dụ: "Định kỳ Quý (3 tháng)", "Thử việc (2 tháng)".
   * **Khoảng thời gian (Interval in Months)**: Số nguyên dương từ 1 đến 24 tháng.
   * **System Default**: Đánh dấu nếu muốn làm chu kỳ mặc định toàn tổ chức khi Job Level và nhân viên không có cấu hình riêng.
2. **Chỉnh sửa / Vô hiệu hóa**:
   * Click **Edit** trên từng dòng.
   * Có thể tắt trạng thái hoạt động (**Active: false**) để ngừng áp dụng cho nhân viên mới mà không làm ảnh hưởng đến dữ liệu lịch sử.

### 2.3. Gán Chu kỳ Mặc định theo Cấp bậc (Job Level)
* Truy cập `Configuration` &rarr; `Organization` &rarr; Tab `Job Architecture` &rarr; Bảng `Job Levels`.
* Chọn **Edit** một cấp bậc công việc (ví dụ: `LVL-SENIOR`, `LVL-LEAD`).
* Tại trường **Default Review Cadence**, chọn chu kỳ áp dụng chung cho toàn bộ nhân viên thuộc cấp bậc này.
* Nhấn **Save Changes**.

---

## 3. Bảng Giám sát Hạn Đánh giá (Review Due Dashboard)

### 3.1. Truy cập & Phạm vi Dữ liệu (RBAC)
* **Menu**:
  * Đối với HR / Admin: `Configuration` &rarr; `Review Due` (`/admin/review-due`).
  * Đối với Manager: `Performance` &rarr; `Team Review Due` (`/admin/review-due`).
* **Phạm vi hiển thị (Scope)**:
  * **HR Admin / System Admin**: Xem toàn bộ nhân viên trong công ty.
  * **Manager**: Chỉ xem được các nhân viên thuộc quyền quản lý trực tiếp (`managedTeamIds`). Tuyệt đối không rò rỉ dữ liệu của các team khác.

### 3.2. Tiêu chí Thiết kế & Cam kết Không Xếp Hạng (Strict Anti-Ranking)
> **CAM KẾT THIẾT KẾ QUAN TRỌNG:**
> Giao diện Review Due Dashboard **tuyệt đối KHÔNG** hiển thị xếp hạng nhân viên (rank), không sắp xếp theo điểm số đánh giá, không so sánh top/bottom nhân viên. Thứ tự hiển thị thuần túy dựa trên **mức độ khẩn cấp về thời hạn** (`next_review_due_date ASC NULLS LAST`).

### 3.3. Các thành phần trên Dashboard
1. **Thẻ thống kê tổng quan (KPI Cards)**:
   * **Quá hạn Đánh giá**: Tổng số nhân viên quá hạn cần mở review ngay.
   * **Đến hạn Hôm nay**: Nhân viên đến hạn đúng ngày hôm nay.
   * **Sắp đến hạn (&le; 30 ngày)**: Nhân viên cần chuẩn bị đánh giá trong lead time.
   * **Tổng cần Theo dõi**: Tổng hợp số nhân viên cần hành động.
2. **Bộ lọc & Thẻ trạng thái**:
   * Tab: `Tất cả Cần Review` | `Quá hạn` | `Đến hạn` | `Sắp đến hạn`.
   * Ô tìm kiếm: Tìm kiếm tức thời theo tên hoặc mã nhân viên.
   * Bộ lọc Đội nhóm (Team Filter).
   * Bộ lọc Chu kỳ (Cadence Filter).
3. **Bảng Danh sách Nhân viên**:
   * **Checkbox**: Hỗ trợ chọn từng nhân viên hoặc chọn tất cả trang.
   * **Nhân viên**: Tên, mã nhân viên, ảnh đại diện/chữ cái đầu.
   * **Đội nhóm & Cấp bậc**: Team và Job Level hiện tại.
   * **Chu kỳ Hiệu lực (Effective Cadence)**: Hiển thị tên chu kỳ kèm badge phân loại nguồn gốc (`Gán Riêng (Override)`, `Theo Cấp Bậc (Job Level)`, `Mặc định Hệ thống`).
   * **Hoàn thành Gần nhất**: Ngày xuất bản đợt đánh giá trước đó.
   * **Hạn Đánh giá Kế tiếp**: Ngày đến hạn cụ thể.
   * **Trạng thái**: Badge màu đỏ (Quá hạn X ngày), màu cam (Đến hạn hôm nay), màu xanh dương (Sắp đến X ngày).
   * **Hành động**: Nút "Tạo Evaluation" trực tiếp cho từng nhân viên.

---

## 4. Khởi tạo Đợt Đánh giá Cá nhân (Individual Evaluation)

Scheduled job của hệ thống **chỉ tính toán và cập nhật trạng thái hạn**, tuyệt đối **không tự ý tạo chu kỳ đánh giá** nếu không có sự phê duyệt của người dùng.

### 4.1. Quy trình Thực hiện (Bulk hoặc Đơn lẻ)
1. Tích chọn một hoặc nhiều nhân viên trên bảng Review Due Dashboard.
2. Thanh tác vụ nổi (Action Bar) xuất hiện hiển thị số lượng nhân viên đã chọn.
3. Nhấp nút **Tạo Evaluation (X)**.
4. Hộp thoại **Khởi tạo Đánh giá Cá nhân (Review Due)** hiển thị:
   * Danh sách nhân viên được chọn (dạng tag pill).
   * **Template Đánh giá**: Mặc định sử dụng template mới nhất đang ở trạng thái `PUBLISHED` (hoặc có thể chọn template tùy ý).
   * **Ngày bắt đầu / Ngày kết thúc**: Mặc định từ ngày hiện tại đến +30 ngày.
5. Nhấn **Tạo Evaluation**.

### 4.2. Xử lý Cảnh báo Đợt Đánh giá Sắp tới (Upcoming Batch Cycle Warning)
* Nếu nhân viên được chọn nằm trong phạm vi của một đợt đánh giá chung (batch evaluation cycle) sắp diễn ra trong vòng 4 tuần, hệ thống sẽ hiển thị cảnh báo mềm (`BATCH_CYCLE_UPCOMING`):
  * Tên chu kỳ sắp tới, mã chu kỳ, và ngày bắt đầu.
  * Giúp người quản lý/HR cân nhắc có nên tạo đánh giá riêng lẻ hay chờ đợt đánh giá chung toàn công ty.

### 4.3. Xử lý Xung đột Ngăn chặn (Conflict Prevention)
Hệ thống từ chối tạo đánh giá cho nhân viên trong các trường hợp:
* **`EVALUATION_ALREADY_OPEN`**: Nhân viên đang có một bản đánh giá mở chưa hoàn thành.
* **`EMPLOYEE_INACTIVE`**: Nhân viên đã nghỉ việc (`INACTIVE` hoặc `TERMINATED`).
* **`UNAUTHORIZED_TEAM`**: Manager cố gắng tạo đánh giá cho nhân viên ngoài team quản lý.

---

## 5. Gán Riêng Chu kỳ cho Nhân viên (Employee Cadence Override)

### 5.1. Khi nào cần sử dụng?
Sử dụng khi một nhân viên cụ thể có nhu cầu đánh giá khác với chu kỳ chuẩn của Job Level (ví dụ: nhân viên thử việc cần đánh giá mỗi 2 tháng thay vì 6 tháng, hoặc nhân viên theo diện theo dõi đặc biệt).

### 5.2. Cách thực hiện
1. Truy cập `Configuration` &rarr; `Organization` &rarr; Tab `Org Structure`.
2. Tìm nhân viên cần cấu hình và nhấn biểu tượng **Edit (Chỉnh sửa)**.
3. Trong modal **Edit Employee**:
   * Tại mục **Review Cadence Override**:
     * Chọn `-- Kế thừa từ Job Level / Mặc định hệ thống --` nếu muốn nhân viên theo chu kỳ chuẩn.
     * Hoặc chọn một chu kỳ cụ thể (ví dụ: "Thử việc 2 tháng").
   * Hệ thống hiển thị badge chu kỳ hiệu lực tức thời.
   * Nếu có sự thay đổi chu kỳ, trường **Lý do điều chỉnh Chu kỳ Đánh giá (Audit Reason)** sẽ xuất hiện:
     * Nhập lý do thay đổi (ví dụ: *"Áp dụng chu kỳ đánh giá thử việc 2 tháng theo HĐLĐ"*).
     * Bắt buộc phục vụ mục đích kiểm toán (Transactional Audit Trail).
4. Nhấn **Save Changes**.

### 5.3. Kết quả Tức thì
* Backend đóng vai trò nguồn chân lý duy nhất (Single Source of Truth).
* Ngay sau khi lưu, `next_review_due_date` của nhân viên được tính toán lại ngay lập tức dựa trên mốc `last_evaluation_completed_at` trước đó (không bị độ trôi lịch).
* Bản ghi kiểm toán được lưu đồng thời vào bảng `audit_log`.
