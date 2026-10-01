# Step 6: Implementation

Status: produced during this step

## Deliverable
Triển khai thành công tính năng quản lý vòng đời Crawl Script (Disable / Enable / Delete) sau khi publish và nâng cấp hệ thống logging hiển thị chi tiết từng bước mà script đang chạy trong Crawl Job:
1. Migration 008 mở rộng check constraint của `crawl_script_version` hỗ trợ `DISABLED` và cập nhật khóa ngoại của `crawl_job_execution.crawl_script_version_id` thành nullable với `ON DELETE SET NULL`.
2. Backend Repository & Service hỗ trợ `disableScriptVersion`, `enableScriptVersion`, và kiểm tra ràng buộc toàn vẹn khi `deleteScriptVersion` (chặn nếu script đang được gán cho Crawl Job Definition).
3. Backend Controller & Router đăng ký các endpoints `POST /api/crawl-scripts/:id/disable` và `POST /api/crawl-scripts/:id/enable`.
4. Môi trường Isolated-VM V8 Sandbox hỗ trợ callback `onLog` và inject `console.log`, `console.info`, `console.warn`, `console.error`, `log(...)`.
5. Worker tự động ghi nhận chi tiết từng bước gọi API nguồn, nhận dữ liệu, lọc nhân viên, tính toán deliverables, và forward log từ script.
6. Frontend hỗ trợ nút hành động Disable/Enable/Delete với màu sắc trực quan và nâng cấp Log Viewer với huy hiệu Step Badge và nút lọc nhanh các bước script.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `backend/migrations/1792000000003_add_crawl_job_execution.ts`
- `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`
- `backend/src/modules/crawl-job/application/crawl-job.service.ts`
- `backend/src/modules/crawl-job/application/crawl-sandbox.service.ts`
- `backend/src/modules/crawl-job/application/crawl-execution-worker.service.ts`
- `frontend/src/features/crawl-jobs/components/CrawlConfigurationTab.tsx`
- `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`
- `frontend/src/index.css`

## Actions and Evidence
- Tạo và áp dụng migration `1792000000008_allow_script_disable_and_cascade_audit.ts` vào cơ sở dữ liệu PostgreSQL.
- Thêm `setScriptStatus` và cập nhật `deleteScriptVersion` trong `postgres-crawl-job.repository.ts`.
- Thêm `disableScriptVersion`, `enableScriptVersion`, và thu thập logs trong `crawl-job.service.ts`.
- Bổ sung `onLog` callback và injection `console.log` trong `crawl-sandbox.service.ts`.
- Bổ sung step logging trong `crawl-execution-worker.service.ts`.
- Bổ sung `disableScript` và `enableScript` trong `crawl-job-api.ts`.
- Cập nhật giao diện `CrawlConfigurationTab.tsx` và `CrawlJobsPage.tsx`.
- Biên dịch thành công backend (`tsc -p tsconfig.json`, exit code 0) và frontend (`npm run build`, exit code 0).
- Copy dist build vào các container Docker `kpi-system-backend-1` và `kpi-system-frontend-1`.

## Changes Made
- `backend/migrations/1792000000008_allow_script_disable_and_cascade_audit.ts`: Tạo migration.
- `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`: Bổ sung `setScriptStatus`, hoàn thiện `listPublishedScripts` và `deleteScriptVersion`.
- `backend/src/modules/crawl-job/application/crawl-job.service.ts`: Thêm `disableScriptVersion`, `enableScriptVersion`, và trả về `logs` trong `testRunScript`.
- `backend/src/modules/crawl-job/application/crawl-sandbox.service.ts`: Hỗ trợ `onLog` và `console.log` inside sandbox.
- `backend/src/modules/crawl-job/application/crawl-execution-worker.service.ts`: Ghi nhận log từng bước API và script.
- `backend/src/modules/crawl-job/api/crawl-job.controller.ts` & `router.ts`: Đăng ký endpoints disable/enable.
- `frontend/src/features/crawl-jobs/api/crawl-job-api.ts` & `crawl-job.types.ts`: Bổ sung API và type `DISABLED`.
- `frontend/src/features/crawl-jobs/components/CrawlConfigurationTab.tsx`: Nút Disable/Enable/Delete và badge.
- `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`: Step badges và nút lọc trong Log Viewer.
- `frontend/src/index.css`: Styles cho `.crawl-status--disabled`, `.crawl-step-badge`, `.crawl-log-row--step`, và tinh chỉnh thu nhỏ kích thước action buttons / icon buttons (`.crawl-button`, `.crawl-icon-button`, `.crawl-row-actions .crawl-button`) vừa vặn, gọn gàng theo yêu cầu người dùng.
- `docs/crawl-script-lifecycle-and-logs/frontend-user-guide.md`: Tài liệu hướng dẫn sử dụng frontend.

## Decisions and Rationale
- Khóa ngoại `crawl_script_version_id` trên `crawl_job_execution` sử dụng `ON DELETE SET NULL` để khi xóa script, toàn bộ lịch sử snapshot checksum/version của execution vẫn được bảo toàn nguyên vẹn phục vụ audit.
- Sử dụng format `[Script Step: <Tiêu đề>] <Chi tiết>` để hệ thống log tự động nhận diện và render huy hiệu mà không làm thay đổi cấu trúc lưu trữ log dạng text/JSON.

## Risks / Blockers
- None.

## Next Step
- Chuyển sang Step 7: Test (thực thi kiểm thử tự động API và xác nhận hoạt động của các tính năng).
