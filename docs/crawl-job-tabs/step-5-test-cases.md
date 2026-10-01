# Step 5: Define Test Cases

Status: produced during this step

## Deliverable

## Test Cases

| ID | Type | Description | Inputs | Expected Outcome |
|---|---|---|---|---|
| TC-01 | Unit (Backend) | Lấy danh sách script có lọc theo trạng thái | `GET /api/crawl-scripts?status=ALL`, Actor: `HR_ADMIN` | Trả về HTTP 200 kèm danh sách cả script `DRAFT` và `PUBLISHED`. Mặc định không truyền `status` chỉ trả về `PUBLISHED`. |
| TC-02 | Unit (Backend) | Tạo mới draft script hợp lệ | `POST /api/crawl-scripts` với `code: "JIRA_CUSTOM_CRAWLER"`, `source_system: "JIRA"`, `source_code: "async function(input, fetchSource) { return []; }"` | Trả về HTTP 201, script có `version_no: 1`, `status: "DRAFT"`, và `checksum` hợp lệ. |
| TC-03 | Unit (Backend) | Tự động tăng version cho script cùng code | `POST /api/crawl-scripts` với `code: "JIRA_CUSTOM_CRAWLER"` đã tồn tại version 1 | Trả về HTTP 201 với `version_no: 2`, `status: "DRAFT"`, không bị trùng lặp khóa chính. |
| TC-04 | Unit (Backend) | Publish script draft thành công | `POST /api/crawl-scripts/:scriptVersionId/publish` với script đang ở trạng thái `DRAFT` | Trả về HTTP 200, chuyển trạng thái `status: "PUBLISHED"`, cập nhật `published_at` và `published_by`. |
| TC-05 | Unit (Backend) | Báo lỗi khi publish script không tồn tại hoặc đã publish rồi | `POST /api/crawl-scripts/:invalidId/publish` hoặc script đã là `PUBLISHED` | Trả về HTTP 404 Not Found hoặc HTTP 422 Unprocessable Entity, không làm sai lệch dữ liệu. |
| TC-06 | Security (RBAC) | Kiểm tra phân quyền truy cập quản lý Script | `POST /api/crawl-scripts` hoặc `GET /api/crawl-scripts?status=ALL` với Actor có role `MANAGER` hoặc `EMPLOYEE` | Trả về HTTP 403 Forbidden ("Published script access is restricted" / "Access denied"). |
| TC-07 | Integration | Chạy seed data mẫu Jira & Blueprint | Thực thi `seed-crawl-job-samples.ts` | Tạo thành công 2 credentials (`CRED_JIRA_PROD`, `CRED_BLUEPRINT_PROD`), 4 criteria và 2 published scripts (`JIRA_TASK_METRICS_CRAWLER`, `BLUEPRINT_TASK_METRICS_CRAWLER`). |
| TC-08 | Idempotency | Tính lặp lại an toàn của seed data | Chạy `seed-crawl-job-samples.ts` lần thứ hai | Chạy thành công không lỗi, không sinh duplicate records nhờ mệnh đề `ON CONFLICT DO NOTHING`. |
| TC-09 | Unit (Sandbox) | Thực thi script mẫu trong isolated-vm sandbox | Chạy `CrawlSandboxService.run()` với mã script mẫu của Jira/Blueprint và mock fetcher | Script thực thi thành công trong timeout 30s, trả về mảng kết quả tuân thủ `NormalizedCrawlOutputSchema`. |
| TC-10 | Frontend UI | Hiển thị đầy đủ 4 Tabs cho HR/System Admin | Mở trang `/admin/crawl-jobs` với tài khoản `HR_ADMIN` | Giao diện hiển thị đủ 4 tabs: `Crawl Jobs`, `Executions`, `Data Review`, và `Crawl Scripts`. |
| TC-11 | Frontend UI | Hiển thị danh sách script và nút đăng ký | Nhấp chọn Tab `Crawl Scripts` | Hiển thị bảng danh sách các phiên bản script (Mã, Version, System, Status Badge `DRAFT`/`PUBLISHED`), và nút `+ Register Script`. |
| TC-12 | Frontend UI | Đăng ký script mới từ modal form | Điền form (mã script, source system, mã JavaScript, chọn criteria liên quan) và Submit | Form validate thành công, gọi API `createCrawlScript`, đóng modal và refresh lại danh sách script với trạng thái `DRAFT`. |
| TC-13 | Frontend UI | Publish script trực tiếp từ giao diện | Nhấp nút `Publish` trên dòng script có trạng thái `DRAFT` và xác nhận dialog | Gọi API publish, badge cập nhật tức thì thành `PUBLISHED`, script sẵn sàng xuất hiện trong dropdown tạo Job. |
| TC-14 | Frontend UI | Tự động gợi ý KPI criteria khi chọn Script trong Form tạo Job | Trong form tạo Job mới (Tab `Crawl Jobs`), chọn script đã publish | Dropdown Script hiển thị các script đã publish; khi chọn một script, danh sách KPI criteria tương ứng được tự động check/gợi ý sẵn. |
| TC-15 | Regression | Kiểm tra hồi quy toàn diện | Chạy lại bộ test suite: `api-client`, `crawl-job.claim`, auth flow, typecheck frontend/backend | Toàn bộ các bài kiểm tra đều đạt `PASS`, không ảnh hưởng tới luồng CSV import hoặc Authentication. |

## Inputs Reviewed
- Implementation plan from Step 4.

## Actions and Evidence
- Documented 15 comprehensive test cases covering unit, integration, RBAC, sandbox, and UI.

## Changes Made
- Created Step 5 artifact.

## Decisions and Rationale
- Ensure full coverage of new script endpoints and UI interaction.

## Risks / Blockers
- None.

## Next Step
- Step 6 implementation.