# Step 4: Plan

Status: produced during this step

## Deliverable

## Implementation Plan

1. File: `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`
   Changes:
   - Cập nhật hàm `listPublishedScripts(sourceSystem?: string, status?: string)` để hỗ trợ nhận tham số `status` (mặc định `'PUBLISHED'`, nếu `'ALL'` thì lấy cả `DRAFT` và `PUBLISHED`, nếu `'DRAFT'` thì chỉ lấy bản nháp).

2. File: `backend/src/modules/crawl-job/application/crawl-job.service.ts`
   Changes:
   - Cập nhật phương thức `listPublishedScripts(actor, sourceSystem?, status?)` truyền tham số `status` xuống repository, xác thực quyền `HR_ADMIN` hoặc `SYSTEM_ADMIN`.

3. File: `backend/src/modules/crawl-job/api/crawl-job.controller.ts`
   Changes:
   - Cập nhật controller `listPublishedScripts` đọc query parameter `status` từ `req.query.status` và truyền xuống service.

4. File: `backend/src/modules/crawl-job/infrastructure/seed-crawl-job-samples.ts` (Tạo mới) & `backend/package.json`
   Changes:
   - Xây dựng seed script độc lập và idempotent (`ON CONFLICT DO NOTHING`):
     - Connector Credential references: `CRED_JIRA_PROD` (tham chiếu biến `JIRA_PASSWORD`), `CRED_BLUEPRINT_PROD` (tham chiếu biến `BLUEPRINT_PASSWORD`).
     - KPI Criteria mẫu liên quan:
       - `CRIT_JIRA_TASK_COMPLETION`: "Tỷ lệ hoàn thành Task Jira" (unit: `%`).
       - `CRIT_JIRA_BUG_COUNT`: "Số lượng Bug phát sinh trên Jira" (unit: `count`).
       - `CRIT_BP_TASK_ONTIME_RATE`: "Tỷ lệ hoàn thành đúng hạn Blueprint" (unit: `%`).
       - `CRIT_BP_DELAYED_HOURS`: "Số giờ trễ hạn Blueprint" (unit: `hours`).
     - 2 Published Crawl Scripts mẫu hoàn chỉnh:
       - `JIRA_TASK_METRICS_CRAWLER`: Thu thập dữ liệu task & bug từ Jira API, chuẩn hóa ra schema `NormalizedCrawlOutputSchema`.
       - `BLUEPRINT_TASK_METRICS_CRAWLER`: Thu thập task list từ Blueprint API, tính toán tỷ lệ on-time và chuẩn hóa ra `NormalizedCrawlOutputSchema`.
   - Bổ sung lệnh `seed:crawl-samples` vào `backend/package.json` và tích hợp vào lệnh `npm run seed`.

5. File: `frontend/src/features/crawl-jobs/api/crawl-job.types.ts`
   Changes:
   - Bổ sung kiểu dữ liệu: `CrawlScriptItem`, `CreateCrawlScriptPayload`, `PublishCrawlScriptResponse`.

6. File: `frontend/src/features/crawl-jobs/api/crawl-job-api.ts`
   Changes:
   - Thêm các API client methods:
     - `listScripts(params?: { source_system?: string; status?: string })`: gọi `GET /api/crawl-scripts`.
     - `createScript(payload: CreateCrawlScriptPayload)`: gọi `POST /api/crawl-scripts`.
     - `publishScript(scriptVersionId: string)`: gọi `POST /api/crawl-scripts/:scriptVersionId/publish`.

7. File: `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`
   Changes:
   - Thêm tab thứ 4 vào mảng `TABS`: `{ id: 'scripts', label: 'Crawl Scripts', icon: FileCode }`.
   - Xây dựng giao diện Tab Crawl Scripts:
     - Bảng hiển thị danh sách script (mã, phiên bản `v{version_no}`, source system, trạng thái `DRAFT` / `PUBLISHED`, ngày tạo, checksum, người tạo).
     - Action Publish: nút bấm publish trực tiếp cho các bản ghi đang ở trạng thái `DRAFT`.
     - Nút `+ Register Script`: mở form modal đăng ký script gồm mã script, source system, textarea soạn thảo mã JavaScript (kèm code template mẫu sẵn cấu trúc hàm `async function (input, fetchSource)`), và bộ chọn KPI criteria tương ứng.
   - Nâng cấp Form tạo Job (Tab Crawl Jobs):
     - Khi người dùng chọn một script đã publish trong dropdown, hệ thống tự động gợi ý/chọn trước danh sách KPI criteria tương ứng của script đó vào Job.

8. File: `docs/crawl-job-tabs/frontend-user-guide.md`
   Changes:
   - Cập nhật tài liệu hướng dẫn sử dụng Tab Scripts: cách đăng ký script, gắn KPI criteria, publish script và sử dụng script mẫu Jira & Blueprint.

## Inputs Reviewed
- Approved Steps 1–3.

## Actions and Evidence
- Documented implementation plan for Script tab, criteria mapping and Jira/Blueprint seeds.

## Changes Made
- Created Step 4 artifact.

## Decisions and Rationale
- Provide reusable sample scripts and credentials to make Crawl Jobs testable out of the box.

## Risks / Blockers
- None.

## Next Step
- Step 5 test cases definition.