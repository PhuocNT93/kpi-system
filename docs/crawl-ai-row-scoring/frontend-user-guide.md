# Hướng dẫn sử dụng Giao diện Crawl Jobs & Row-Level AI Scoring

## 1. Giới thiệu
Trang **Crawl Jobs** (`/crawl-jobs`) cung cấp giải pháp toàn diện cho việc tự động hóa thu thập dữ liệu KPI từ các nguồn bên ngoài (Jira, Blueprint, Google Sheet), chuyển hóa thành bản ghi thô chuẩn hóa, tự động chấm điểm từng dòng qua AI (Google Gemini), và xét duyệt bởi con người trước khi áp dụng vào chu kỳ đánh giá KPI.

---

## 2. Các Tab Chức năng Chính

### Tab 1: Crawl Jobs (`Quản lý Công việc Cào`)
- **Danh sách Job**: Hiển thị tất cả các Job crawl dữ liệu cùng trạng thái chạy, lịch chạy tự động (cron), nguồn dữ liệu và chu kỳ áp dụng.
- **Tạo / Chỉnh sửa Job**: 
  - Chọn chu kỳ đánh giá (chỉ cho phép chọn chu kỳ `OPEN`).
  - Chọn các tiêu chí (KPIs) được phân công cho Job.
  - Chọn Script crawl và thông tin xác thực (Credentials).
  - Cấu hình nguồn dữ liệu (`source_config` dạng JSON).
  - Tích hợp tính năng test kết nối và chạy thử script trực tiếp trên modal.
- **Lịch sử thực thi (Executions)**: Theo dõi tiến trình crawl, thống kê số lượng records (Fetched, Parsed, Valid, Invalid, Applied) và xem log chi tiết từng bước.

### Tab 2: Crawl Data & AI Scores (`Dữ liệu Thu thập & Điểm AI`)
- **Xem dữ liệu thô & Điểm AI**: Mỗi dòng dữ liệu thu thập được hiển thị trực quan kèm theo điểm do Gemini chấm (1.00 - 5.00), độ tin cậy (confidence) và nhận xét (rationale).
- **Cổng xét duyệt (Human Review Gate)**:
  - **Approve**: Phê duyệt điểm AI và áp dụng trực tiếp vào KPI nhân viên.
  - **Adjust**: Điều chỉnh điểm số theo đánh giá thực tế (bắt buộc nhập lý do tối thiểu 20 ký tự).
  - **Reject**: Từ chối bản ghi điểm (bắt buộc nhập lý do tối thiểu 20 ký tự).
  - **Rescore**: Kích hoạt AI chấm điểm lại bản ghi mà không cần phải cào lại dữ liệu từ nguồn ngoài.
- **Drawer chi tiết**: Xem đầy đủ 6 bước dòng chảy dữ liệu: Nguồn thô -> Payload chuẩn hóa -> Prompt hoàn chỉnh đưa vào AI -> Kết quả AI trả về -> Phê duyệt -> Áp dụng KPI.

### Tab 3: Crawl Configuration (`Cấu hình Hệ thống Cào`)
- **Crawl Scripts**: Quản lý các ETL script sandbox (`isolated-vm`), hỗ trợ versioning, test run và publish với SHA-256 checksum.
- **Source Systems**: Đăng ký và quản lý các nguồn hệ thống (Jira, Blueprint, Sheet), kiểm tra kết nối ping và bảo vệ an toàn mạng SSRF qua danh sách allowed domains.
- **AI Scoring Prompts**: Quản lý các mẫu system prompt & user prompt template tích hợp, hỗ trợ tính năng Dry-run với dữ liệu mẫu.
