# Step 4: Plan

Status: reconstructed from conversation

## Deliverable

## Implementation Plan

1. **What:** Sửa `batch-job.scheduler.ts` — dùng `member.nextReviewDueDate` làm `dateTo` thay vì cố định `today`.
   **Where:** `backend/src/modules/jira-crawler/batch-job.scheduler.ts`
   **Why:** Batch job cần collect đúng trong khoảng review window của từng người.
   **Tests:** Verify dateFrom và dateTo trong batch run results.

2. **What:** Sửa `jira-crawler.controller.ts` — cập nhật `recommendedDateTo` dùng `nextReviewDate` (fallback `today`).
   **Where:** `backend/src/modules/jira-crawler/jira-crawler.controller.ts`
   **Why:** Đồng bộ API GET managed members với mốc review thực tế.
   **Tests:** Gọi GET `/api/collector/jira/members`.

3. **What:** Sửa `postgres-employee.repository.ts` — thêm `review_cadence_months` vào câu lệnh UPDATE và Employee model.
   **Where:** `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`, `backend/src/modules/employee/domain/employee.domain.ts`
   **Why:** Đảm bảo khi HR update nhân viên, `review_cadence_months` được đồng bộ vào database.
   **Tests:** Update employee và query verify DB row.

4. **What:** Sửa `employee.controller.ts` — tự động tính `review_cadence_months` tương ứng với `review_cadence` và cập nhật `next_review_due_date`.
   **Where:** `backend/src/modules/employee/api/employee.controller.ts`
   **Why:** Đảm bảo mọi thay đổi từ UI Organization phản ánh ngay vào data mà batch job đọc.
   **Tests:** Gửi request PATCH employee.

5. **What:** Bổ sung cơ chế Penalty-based scoring vào `ai-evaluator.ts`.
   **Where:** `backend/src/modules/jira-crawler/ai-evaluator.ts`
   **Why:** Nhân viên bắt đầu với chuẩn 100 điểm, bị trừ điểm khi có vi phạm Code Quality hoặc Chuyên cần, và cộng điểm hoàn thành nhiệm vụ.
   **Tests:** Test penalty calculation và clamp [0, 100].

## Inputs Reviewed
- Step 1 to Step 3 deliverables.

## Actions and Evidence
- Plan approved by user.

## Changes Made
- None

## Decisions and Rationale
- Execute minimal and precise changes across the 5 target files.

## Risks / Blockers
- None

## Next Step
- Step 5: Test Cases
