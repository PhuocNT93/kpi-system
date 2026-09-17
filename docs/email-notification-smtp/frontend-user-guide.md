# Hướng Dẫn Sử Dụng Giao Diện Email Notification (SMTP)
**Hệ thống Quản lý Đánh giá Hiệu quả Nhân viên (Employee Performance Evaluation System)**

---

## 1. Tổng quan tính năng Email Notification

Hệ thống cung cấp cơ chế gửi email thông báo tự động (giao dịch bất đồng bộ qua mô hình Transactional Outbox) kết hợp cùng dịch vụ Google Workspace SMTP relay (`smtp-relay.gmail.com`).

Tính năng hỗ trợ đa ngôn ngữ (**English baseline** mặc định và bản dịch **Tiếng Việt `vi`**), đồng thời tuân thủ nghiêm ngặt các quy tắc nghiệp vụ và bảo mật:
- **Rule 15 (Outbox Atomicity):** Đảm bảo tính toàn vẹn dữ liệu, sự kiện chỉ gửi email khi nghiệp vụ thành công.
- **Rule 16 (Content Sanitization):** Tuyệt đối không để lộ điểm số, xếp loại hay nhận xét đánh giá trong nội dung email.
- **Rule 17 (Mandatory Notifications):** Thông báo kết quả chính thức (`RESULT_PUBLISHED`) là bắt buộc, người dùng không thể tắt.
- **Rule 18 (Retry Backoff & DLQ):** Tự động thử lại tối đa 3 lần khi lỗi mạng, sau đó chuyển trạng thái `FAILED`.
- **Rule 19 (1-Year Retention Purge):** Tự động dọn dẹp nhật ký email sau 1 năm độc lập với audit log.
- **Rule 20 (Manual Resend):** Quản trị viên có quyền bấm gửi lại email bị lỗi từ giao diện.

---

## 2. Màn hình 1: Tùy chọn Nhận Thông báo (Notification Preferences)

- **Đường dẫn truy cập:** `Menu bên trái -> Overview -> Email Notifications` (URL: `/admin/notification-preferences`).
- **Đối tượng sử dụng:** Tất cả nhân viên (EMPLOYEE, MANAGER, HR_ADMIN, SYSTEM_ADMIN).

### Chức năng chính:
1. **Danh sách các loại thông báo:**
   - Người dùng xem được toàn bộ 9 loại sự kiện thông báo kèm mô tả chi tiết bằng Tiếng Việt và thuật ngữ hệ thống.
2. **Cơ chế Bật / Tắt thông báo:**
   - Nhấp vào nút gạt (toggle) để bật hoặc tắt thông báo email cho từng loại sự kiện cụ thể.
3. **Quy tắc bắt buộc (Rule 17):**
   - Loại thông báo **`RESULT_PUBLISHED`** (Kết quả đánh giá chính thức) luôn ở trạng thái BẬT và bị khóa cứng (disabled toggle).
   - Biểu tượng ổ khóa và nhãn `🔒 Bắt buộc (Rule 17)` hiển thị rõ ràng nhằm thông báo chính sách bắt buộc nhận kết quả đánh giá KPI của doanh nghiệp.
4. **Lưu thay đổi:**
   - Bấm nút **"Lưu thay đổi"** ở góc dưới bảng. Hệ thống hiển thị thông báo toast màu xanh xác nhận cập nhật thành công.

---

## 3. Màn hình 2: Quản lý Mẫu Email (Notification Templates)

- **Đường dẫn truy cập:** `Menu bên trái -> Configuration -> Email Templates` (URL: `/admin/notification-templates`).
- **Đối tượng sử dụng:** Quản trị viên nhân sự (`HR_ADMIN`) và Quản trị viên hệ thống (`SYSTEM_ADMIN`).

### Chức năng chính:
1. **Danh mục mẫu sự kiện (Sidebar trái):**
   - Danh sách 9 mẫu email chuẩn tương ứng với 9 trạng thái vòng đời đánh giá.
   - Hiển thị nhãn trạng thái `Hoạt động` (Active) hoặc `Tạm dừng` (Inactive).
2. **Soạn thảo nội dung Đa ngôn ngữ (Tabbed Editor):**
   - **Tab 🇬🇧 English (Baseline):** Chỉnh sửa Tiêu đề (Subject) và Thân bài HTML (Body HTML) chuẩn quốc tế.
   - **Tab 🇻🇳 Tiếng Việt (vi):** Bản dịch bản địa hóa được lưu trữ trong bảng `i18n_translation`. Khi người dùng có `preferred_locale = 'vi'`, hệ thống sẽ tự động ưu tiên gửi bản dịch tiếng Việt này.
3. **Thanh biến số hợp lệ (Variables Pills):**
   - Hiển thị các biến hợp lệ: `{{employee_name}}`, `{{cycle_name}}`, `{{deadline}}`, `{{link}}`, `{{action_url}}`.
4. **Xem trước trực quan (👁️ Live Preview Tab):**
   - Cho phép quản trị viên xem trước giao diện email thực tế hiển thị trên hộp thư người nhận với dữ liệu mẫu trực quan trước khi lưu.
5. **Banner cảnh báo Quy tắc Rule 16:**
   - Nhắc nhở quản trị viên về việc hệ thống tự động lọc bỏ các biến điểm số, xếp loại và nhận xét đánh giá để bảo vệ quyền riêng tư nhân sự.
6. **Lưu cấu hình & Ghi nhận Audit Log:**
   - Bấm **"Lưu mẫu cấu hình"** để lưu thay đổi. Mọi thao tác sửa mẫu đều được ghi nhận vào nhật ký kiểm toán `audit_log`.

---

## 4. Màn hình 3: Nhật ký Gửi Email (Notification Delivery Logs)

- **Đường dẫn truy cập:** `Menu bên trái -> Configuration -> Email Delivery Logs` (URL: `/admin/notification-logs`).
- **Đối tượng sử dụng:** Quản trị viên (`HR_ADMIN` và `SYSTEM_ADMIN`).

### Chức năng chính:
1. **Bộ lọc tìm kiếm (Filter Bar):**
   - **Trạng thái:** Lọc theo `ĐÃ GỬI (SENT)`, `CHỜ GỬI (PENDING)`, `THẤT BẠI (FAILED)`, hoặc `ĐÃ BỎ QUA (SKIPPED)`.
   - **Loại sự kiện:** Lọc theo từng mã sự kiện trong 9 sự kiện quy trình.
   - **Tìm theo Email:** Tìm kiếm nhanh theo địa chỉ email người nhận.
2. **Bảng nhật ký chi tiết:**
   - Cột Thời gian gửi hoặc thời gian tạo.
   - Mã sự kiện quy trình.
   - Địa chỉ email người nhận và ngôn ngữ (`en` / `vi`).
   - Tiêu đề email đã render.
   - Huy hiệu trạng thái màu (Xanh lá: SENT, Vàng: PENDING, Đỏ: FAILED, Xám: SKIPPED).
   - Số lần đã thử lại (Retry Count `x/3`).
3. **Xem chi tiết lỗi (Error Details Modal):**
   - Đối với các email thất bại, nhấp vào liên kết `"Xem lỗi chi tiết"` để mở cửa sổ pop-up hiển thị mã lỗi SMTP từ máy chủ Gmail (ví dụ: `550 Mailbox Unavailable`, `Connection Timeout`).
4. **Thao tác Gửi lại thủ công (Rule 20 - Manual Resend):**
   - Nhấp vào nút **"Gửi lại"** đối với email bị thất bại hoặc bị bỏ qua.
   - Hệ thống hiển thị hộp thoại xác nhận: `Xác nhận gửi lại email "[Tiêu đề]" tới "[Email]"?`.
   - Khi đồng ý, bản ghi được tự động chuyển về trạng thái `PENDING`, reset số lần retry và kích hoạt Outbox Worker gửi lại ngay lập tức. Thao tác được ghi vết kiểm toán với mã `NOTIFICATION_RESEND`.
5. **Phân trang (Pagination):**
   - Hỗ trợ xem danh sách lớn với phân trang 20 bản ghi/trang, chuyển trang trước/sau mượt mà.

---

## 5. Thanh Điều Hướng: Icon Chuông Thông Báo (Notification Bell)

- **Vị trí hiển thị:** Cố định ở góc trên bên phải thanh Header của hệ thống cho mọi người dùng đã đăng nhập.
- **Huy hiệu số lượng chưa đọc:** Badge đỏ hiển thị số thông báo chưa đọc (`unreadCount`), tự động cập nhật và polling định kỳ 60 giây.
- **Thao tác Click Event:**
  1. **Xem nhanh danh sách:** Bấm vào icon chuông để mở popover dropdown xem 30 thông báo gần nhất kèm mốc thời gian gửi tương đối (`5m ago`, `2h ago`).
  2. **Đánh dấu Đã đọc / Chưa đọc (Read/Unread Toggle):** Click trực tiếp vào thông báo hoặc nút toggle chuyển đổi trạng thái đọc/chưa đọc ngay lập tức (phản hồi tức thì Optimistic UI và đồng bộ server).
  3. **Đánh dấu tất cả đã đọc:** Bấm nút **"Mark all read"** để chuyển tất cả thông báo về trạng thái đã đọc.
  4. **Bộ lọc nhanh:** Chuyển đổi giữa tab "All" và "Unread" để quản lý thông báo thuận tiện.

---

## 6. Màn hình Tùy Chọn: Nút & Popup Test Notification (Dành riêng cho HR & Admin)

- **Vị trí hiển thị:** Đặt tại góc trên bên phải màn hình **Notification Preferences** (`/notifications/preferences`), không chiếm diện tích trên thanh Header bar chung.
- **Phân quyền bảo mật (RBAC):** Chỉ hiển thị và cho phép sử dụng đối với vai trò **`HR_ADMIN`** và **`SYSTEM_ADMIN`** (tự động ẩn đối với nhân viên `EMPLOYEE` và quản lý `MANAGER`).
- **Chức năng thử nghiệm trực tiếp kết nối Google SMTP:**
  1. **Nhập Email người nhận (`Email To`):** Cho phép nhập bất kỳ địa chỉ email nào bạn muốn nhận email thử nghiệm (mặc định điền sẵn email tài khoản hiện tại).
  2. **Chọn loại thông báo / biểu mẫu thử nghiệm:** Lựa chọn 1 trong 9 loại sự kiện thông báo để xem email HTML thực tế đính kèm bảng thông tin tóm tắt.
  3. **Lựa chọn ngôn ngữ:** Hỗ trợ chọn **Tiếng Việt (`vi`)** hoặc **English (`en`)**.
  4. **Nút "Gửi Test Email Ngay":** Gọi API gửi trực tiếp qua máy chủ Google Workspace SMTP và hiển thị hộp chẩn đoán kết quả (kèm `Message ID`) hoặc chi tiết lỗi cấu hình (nếu tài khoản hoặc App Password chưa chính xác).

