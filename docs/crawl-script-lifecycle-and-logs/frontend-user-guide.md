# Frontend User Guide: Quản lý Vòng đời Crawl Script & Log Thực thi Chi tiết

## 1. Giới thiệu tổng quan
Tài liệu hướng dẫn sử dụng tính năng quản lý trạng thái Crawl Script (Vô hiệu hóa / Kích hoạt lại / Xóa) và xem chi tiết tiến trình từng bước thực thi (Step-by-step logs) của Crawl Job trên hệ thống KPI.

## 2. Đường dẫn và quyền truy cập
- **URL**: `http://localhost:4000/crawl-jobs?tab=config` (Quản lý Scripts) và `http://localhost:4000/crawl-jobs?tab=executions` (Xem Log Lịch sử Crawl).
- **Vai trò cho phép thực hiện cấu hình**: `HR_ADMIN`, `SYSTEM_ADMIN`.
- **Vai trò cho phép xem log**: `HR_ADMIN`, `SYSTEM_ADMIN`, `LINE_MANAGER`.

## 3. Các tính năng mới và Hướng dẫn thao tác

### 3.1. Quản lý Vòng đời Script (Disable / Enable / Delete)
1. Truy cập tab **Configuration (Cấu hình crawl)** -> Chọn sub-tab **Scripts**.
2. **Bộ lọc trạng thái (Status Filter)**:
   - Hỗ trợ lọc theo: `All Statuses`, `Published`, `Disabled`, `Draft`.
3. **Thao tác trên Script đã xuất bản (`PUBLISHED`)**:
   - Nhấn nút **Disable (Vô hiệu hóa)** có icon cấm màu cam. Hệ thống sẽ hiển thị hộp thoại xác nhận. Sau khi xác nhận, script chuyển sang trạng thái `DISABLED`.
   - Script ở trạng thái `DISABLED` sẽ không xuất hiện trong danh sách chọn của form tạo/sửa Crawl Job mới và không thể kích hoạt chạy.
4. **Thao tác trên Script đã bị vô hiệu hóa (`DISABLED`)**:
   - Nhấn nút **Enable (Kích hoạt lại)** có icon tích xanh để đưa script trở lại trạng thái `PUBLISHED`.
5. **Thao tác Xóa Script (`Delete`)**:
   - Cho phép xóa script ở bất kỳ trạng thái nào nếu script không còn liên kết với Crawl Job Definition nào.
   - **Ràng buộc an toàn**: Nếu script đang được liên kết với một Crawl Job, hệ thống sẽ từ chối xóa và hiển thị thông báo: *"Không thể xóa script vì đang được liên kết với Crawl Job '[Tên Job]' ([Mã Job]). Hãy gán Crawl Job sang script khác hoặc chọn Vô hiệu hóa (Disable)."*
   - Khi xóa thành công một script đã từng chạy trong quá khứ, lịch sử `crawl_job_execution` vẫn giữ nguyên 100% snapshot version, checksum và kết quả (cột tham chiếu chuyển thành `NULL` an toàn).

### 3.2. Theo dõi Từng Bước Thực thi Script trong Log Viewer
1. Truy cập tab **Crawl History (Lịch sử crawl)** hoặc mở Drawer chi tiết từ một Crawl Job bất kỳ.
2. Tại khu vực **Execution logs**:
   - **Huy hiệu bước trực quan (Step Badges)**: Mỗi giai đoạn và bước chạy của script được hiển thị với huy hiệu màu gradient (tím/cyan) kèm icon Activity, ví dụ:
     - `Khởi chạy Script`: Chuẩn bị môi trường Isolated V8 Sandbox.
     - `Gửi request API`: Log URL/path API mà script đang gửi request tới hệ thống nguồn (Jira, Blueprint).
     - `Nhận dữ liệu nguồn`: Số lượng bản ghi và dung lượng payload nhận về từ hệ thống nguồn.
     - `Lọc & Khớp dữ liệu`: Đối chiếu với nhân sự trong kỳ đánh giá mở.
     - `Trích xuất hoàn tất`: Số lượng deliverables hợp lệ được chuẩn bị đưa vào staging.
     - `Đối chiếu nhân sự & Chuẩn hóa`: Chuẩn hóa dữ liệu sang staging và phân bổ task chấm điểm AI.
   - **Nút lọc nhanh (Toggle Filter)**: Bấm nút **"Chỉ hiện các bước script"** trên toolbar để ẩn các log hệ thống không cần thiết, chỉ tập trung theo dõi hành trình dữ liệu của script.
   - Hỗ trợ tìm kiếm từ khóa và lọc theo mức độ log (`INFO`, `WARN`, `ERROR`).
