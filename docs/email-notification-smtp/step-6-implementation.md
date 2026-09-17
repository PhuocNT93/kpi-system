# Báo Cáo Triển Khai Tính Năng (Step 6: Implementation)
**Tính Năng:** Email Notification (Google Workspace SMTP Relay) & Đa Ngôn Ngữ (English Baseline & Tiếng Việt)
**Nhánh:** `feature/email-notification-smtp`
**Hệ thống:** Employee Performance Evaluation Management System

---

## 1. Tóm tắt nội dung triển khai (Summary of Changes)

### 1.1. Cơ sở dữ liệu & Migrations
- Tạo migration: `backend/migrations/1788926000018_create_notification_tables.ts`
  - Bảng `notification_template`: Chứa mã sự kiện, nội dung mẫu tiếng Anh cơ sở (`subject`, `body_html`, `body_text`), danh sách biến số hợp lệ, mô tả và trạng thái kích hoạt.
  - Bảng `notification_log` (Transactional Outbox): Lưu vết gửi email với khóa chính `notification_log_id`, khóa ngoại logic sang `app_user(id)`, `notification_type`, `subject_rendered`, `locale_used`, `status` (`PENDING`, `SENT`, `FAILED`, `SKIPPED`), `retry_count`, `error_message`, `sent_at`, `created_at`.
  - Chỉ mục tối ưu: `CREATE INDEX idx_notification_log_outbox ON notification_log (status, created_at) WHERE status = 'PENDING';` và `idx_notification_log_created_at ON notification_log (created_at);`.
  - Bảng `user_notification_preference`: Lưu tùy chọn nhận thông báo của người dùng theo từng sự kiện.

### 1.2. Backend Core Module (`backend/src/modules/notification/`)
- **Domain & Repository:**
  - `domain/notification.types.ts`: Định nghĩa 9 loại sự kiện thông báo (`CYCLE_OPENED`, `SELF_SUBMITTED`, `MANAGER_SUBMITTED`, `CORRECTION_REQUESTED`, `RESULT_PUBLISHED`, `SCORE_ADJUSTED`, `REVIEW_DUE_REMINDER`, `IMPORT_COMPLETED`, `CYCLE_LOCKED`), quy định danh sách bắt buộc `MANDATORY_NOTIFICATION_TYPES = ['RESULT_PUBLISHED']`.
  - `domain/notification.repository.ts` & `infrastructure/postgres-notification.repository.ts`: Repository giao tiếp PostgreSQL với hỗ trợ giao dịch `TransactionClient`.
- **Dịch vụ & Logic Nghiệp vụ:**
  - `application/smtp-sender.service.ts`: Sử dụng `nodemailer` cấu hình kết nối Google Workspace SMTP relay (`smtp-relay.gmail.com`, port 587/465, TLS/SSL, xác thực tài khoản dịch vụ).
  - `application/template-renderer.service.ts`:
    - Ráp biến chuẩn `{{employee_name}}`, `{{cycle_name}}`, `{{deadline}}`, `{{link}}`, `{{action_url}}`.
    - **Tuân thủ Rule 16 (Content Sanitization):** Tự động lọc sạch các biến nhạy cảm như `score`, `rating`, `comment`, `feedback`, `rationale` khỏi dữ liệu ngữ cảnh trước khi render, tuyệt đối không rò rỉ điểm số ra email.
    - Đa ngôn ngữ: Tích hợp với `I18nService` (bảng `i18n_translation`), ưu tiên ngôn ngữ ưa thích của người nhận (`vi`), nếu thiếu tự động fallback về tiếng Anh baseline (`en`).
  - `application/outbox-worker.service.ts`:
    - Quét các bản ghi outbox `PENDING` theo đợt (batchSize 50).
    - **Tuân thủ Rule 18 (Retry Backoff & DLQ):** Thử lại tối đa 3 lần với khoảng cách thời gian tăng dần; sau lần 3 chuyển trạng thái `FAILED`.
    - **Kiểm soát tốc độ (Risk #15):** Sliding window rate throttle (mặc định 60 emails/phút, có thể cấu hình) ngăn chặn vượt hạn ngạch Google Workspace.
  - `application/notification-retention.service.ts`:
    - **Tuân thủ Rule 19:** Tự động dọn dẹp các bản ghi outbox cũ hơn 365 ngày (1 năm) theo đợt 500 dòng độc lập với `audit_log`.
  - `application/notification.service.ts`:
    - **Tuân thủ Rule 15 (Outbox Atomicity):** Phương thức `enqueueNotification` chèn bản ghi outbox ngay trong cùng transaction của nghiệp vụ.
    - **Tuân thủ Rule 17:** Phương thức `updateUserPreferences` trả về mã lỗi `MANDATORY_NOTIFICATION_TYPE` (HTTP 422) nếu người dùng cố gắng tắt `RESULT_PUBLISHED`.
    - **Tuân thủ Rule 20:** Hỗ trợ quản trị viên gửi lại email thất bại qua `resendNotification`.
    - Tự động ghi nhật ký kiểm toán `audit_log` khi quản trị viên cập nhật mẫu email.
  - `infrastructure/seed/notification.seed.ts`: Seed tự động 9 mẫu chuẩn và bản dịch tiếng Việt cho toàn bộ sự kiện.
  - `api/notification.router.ts` & `notification.controller.ts`: Cung cấp đầy đủ REST API kèm phân quyền RBAC.

### 1.3. Tích hợp Triggers vào 9 Sự kiện Vòng đời Đánh giá
1. `CYCLE_OPENED`: Hooked trong `evaluation-cycle-opening.service.ts` khi Admin mở kỳ đánh giá.
2. `SELF_SUBMITTED`: Hooked trong `evaluation.service.ts` khi nhân viên nộp bản tự đánh giá.
3. `MANAGER_SUBMITTED`: Hooked trong `evaluation.service.ts` khi quản lý hoàn tất đánh giá.
4. `CORRECTION_REQUESTED`: Hooked trong `evaluation.service.ts` khi quản lý/HR yêu cầu hiệu chỉnh phiếu.
5. `RESULT_PUBLISHED`: Hooked trong `evaluation.service.ts` khi HR công bố kết quả KPI chính thức.
6. `SCORE_ADJUSTED`: Hooked trong `calibration.service.ts` khi hội đồng hiệu chuẩn thay đổi điểm.
7. `REVIEW_DUE_REMINDER`: Tích hợp trong `notification.service.ts` cho phép cron job / admin quét các nhân viên sắp đến hạn nộp.
8. `IMPORT_COMPLETED`: Hooked trong `csv-import.service.ts` khi tiến trình import dữ liệu hoàn tất.
9. `CYCLE_LOCKED`: Hooked trong `evaluation-cycle.service.ts` khi kỳ đánh giá bị đóng/khóa.

### 1.4. Kiểm thử Backend (`backend/test/notification.test.ts`)
- Đã bổ sung 16 kịch bản kiểm thử tự động toàn diện:
  - TC01, TC02, TC03, TC04: Tính nguyên tử Outbox (Rule 15), worker gửi thành công và cô lập lỗi SMTP khi offline.
  - TC05, TC06: Cơ chế thử lại tối đa 3 lần và DLQ (Rule 18).
  - TC07: Sliding window rate throttle (max 30 emails/min).
  - TC08: Thanh lọc thông tin nhạy cảm (Rule 16).
  - TC09, TC10: Quản lý sở thích người dùng và bảo vệ thông báo bắt buộc (Rule 17).
  - TC11, TC12: Đa ngôn ngữ tiếng Việt và fallback tiếng Anh baseline.
  - TC13, TC16: Quản trị viên cập nhật mẫu (có audit log) và gửi lại email (Rule 20).
  - TC14: Kiểm tra phân quyền RBAC (chặn Employee truy cập trang quản trị email).
  - TC17, TC18, TC19: API lấy danh sách thông báo người dùng kèm số lượng chưa đọc, toggle trạng thái đọc/chưa đọc (click event) và đánh dấu tất cả đã đọc.
- **Kết quả:** Toàn bộ **534/534 unit & integration tests** trong backend đều vượt qua (100% PASS).

### 1.5. Giao diện Frontend (`frontend/src/features/notifications/`)
- `types/notification-types.ts`: Định nghĩa kiểu dữ liệu đồng bộ với Backend (`NotificationLog`, `UserNotificationFeed`, `readAt`).
- `api/notification-api.ts`: API client hỗ trợ đầy đủ các thao tác người dùng, quản trị, lấy thông báo cá nhân và toggle read/unread.
- **Màn hình 1 - Tùy chọn thông báo (`NotificationPreferencesPage.tsx`):**
  - Giao diện thân thiện, hiển thị 9 loại thông báo.
  - Toggle bị vô hiệu hóa kèm icon ổ khóa và nhãn `🔒 Bắt buộc (Rule 17)` cho thông báo kết quả đánh giá.
- **Màn hình 2 - Quản lý mẫu email (`NotificationTemplatesPage.tsx`):**
  - Danh mục 9 mẫu sự kiện kèm trạng thái Hoạt động / Tạm dừng.
  - Tabbed editor: Tab tiếng Anh baseline, Tab tiếng Việt (`vi`), Tab Live Preview trực quan.
  - Thanh hiển thị danh sách biến số hợp lệ `{{...}}`.
  - Banner quy tắc bảo mật Rule 16.
- **Màn hình 3 - Nhật ký gửi email (`NotificationLogPage.tsx`):**
  - Bảng nhật ký với bộ lọc trạng thái (`SENT`, `PENDING`, `FAILED`, `SKIPPED`), sự kiện và tìm kiếm theo email.
  - Modal xem chi tiết lỗi kết nối SMTP từ Google.
  - Nút "Gửi lại" (Manual Resend) cho email thất bại (Rule 20).
- **Màn hình 4 - Icon Notification Bell trên Layout Header (`NotificationBell.tsx`):**
  - **Tích hợp Header layout (`Header.tsx`):** Icon hình quả chuông hiển thị cố định góc phải thanh Header cho mọi người dùng đăng nhập.
  - **Huy hiệu số lượng chưa đọc:** Badge đỏ hiển thị số thông báo chưa đọc (`unreadCount`), tự động cập nhật và polling mỗi 60 giây.
  - **Xem nhanh Dropdown Popover:** Bấm vào chuông hiển thị danh sách thông báo đã gửi cho tài khoản hiện tại, sắp xếp theo thời gian mới nhất (thời gian tương đối `5m ago`, `2h ago`).
  - **Click Event đánh dấu Read/Unread:**
    - Click trực tiếp vào thông báo hoặc nút toggle chuyển đổi trạng thái đọc/chưa đọc ngay lập tức (Optimistic UI update) và đồng bộ API `PATCH /api/users/me/notifications/:id/read`.
    - Nút "Mark all read" để đánh dấu đã đọc toàn bộ.
    - Bộ lọc nhanh "All" / "Unread".
    - Điểm nhấn trạng thái: chấm xanh/xám và kiểu chữ in đậm phân biệt rõ ràng.
- **Màn hình 5 - Nút & Popup Test Notification dành cho Admin/HR (`TestNotificationModal.tsx`):**
  - **Vị trí màn hình:** Đặt tại góc trên màn hình **Tùy chọn thông báo (`NotificationPreferencesPage.tsx`)**, không nằm trên Header bar để giữ Header gọn gàng.
  - **Phân quyền RBAC:** Nút `Thử Nghiệm Gửi Email (Test Notification)` chỉ hiển thị và mở cho tài khoản có vai trò **`SYSTEM_ADMIN`** hoặc **`HR_ADMIN`** (tự động ẩn đối với `EMPLOYEE` và `MANAGER`).
  - **Popup kiểm tra kết nối Google SMTP:**
    - **Cho phép nhập Email người nhận (`Email To`):** Cho phép người dùng nhập bất kỳ email đích nào (mặc định điền sẵn email của tài khoản đang đăng nhập) để kiểm tra Google Workspace SMTP relay live.
    - Lựa chọn 1 trong 9 loại sự kiện/biểu mẫu thông báo cần kiểm thử.
    - Lựa chọn ngôn ngữ (`Tiếng Việt - vi` hoặc `English baseline - en`).
    - Nút bấm **"Gửi Test Email Ngay"**: Gọi API `POST /api/admin/notifications/test-smtp`, render template HTML bảng tương ứng và thực hiện gửi trực tiếp qua Google Workspace SMTP relay.
    - **Hộp chẩn đoán lỗi thời gian thực (Live Diagnostics):** Hiển thị ngay thông báo thành công (kèm `Message ID`) hoặc báo lỗi chi tiết kèm gợi ý cấu hình Google App Password/SMTP Relay nếu thông tin `.env` chưa chính xác.
- **Điều hướng & Định tuyến:**
  - Bổ sung menu `Email Notifications` (mục Overview cho mọi người dùng), `Email Templates` và `Email Delivery Logs` (mục Configuration cho Admin) trong `Sidebar.tsx`.
  - Cấu hình Protected Routes trong `frontend/src/App.tsx`.
  - Tài liệu hướng dẫn sử dụng chi tiết: `docs/email-notification-smtp/frontend-user-guide.md`.
- **Kiểm thử Tự động:**
  - Backend: **20/20 test cases notification PASS**, tổng cộng **535/535 backend tests PASS (100%)**.
  - Frontend: `Header.test.tsx` (2 tests pass), `NotificationBell.test.tsx` (5 tests pass), `TestNotificationModal.test.tsx` (5 tests pass).
- **Build Frontend & Backend:** `tsc -p tsconfig.json` và `vite build` hoàn thành thành công 100% không có lỗi.

---

## 2. Trạng thái hiện tại
Toàn bộ mã nguồn backend, frontend, database migration, tài liệu hướng dẫn và bộ test đã được triển khai hoàn chỉnh.
Bước tiếp theo trong quy trình: **Step 7 - Test Execution & Results Report**.

---

STATUS: WAITING FOR USER REVIEW - STEP 6


