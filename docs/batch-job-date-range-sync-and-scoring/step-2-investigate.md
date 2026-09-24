# Step 2: Investigate

Status: reconstructed from conversation

## Deliverable

## Investigation

Relevant Documents:
- docs/LLD_Employee_Performance_Evaluation_System.md (Sections 14.1, 15.1)

Relevant Modules and Files:
- `backend/src/modules/jira-crawler/batch-job.scheduler.ts`: Chứa logic `executeBatchRun` và `getManagedMembersFromDb`.
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`: Chứa endpoint `GET /api/collector/jira/members` tính toán `recommendedDateFrom` và `recommendedDateTo`.
- `backend/src/modules/jira-crawler/ai-evaluator.ts`: Chứa `AiScoringEngine`, `resolveLevel`, và `evaluateMemberFull`.
- `backend/src/modules/employee/api/employee.controller.ts`: Chứa `updateEmployee` và `calculateNextReviewDate`.
- `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`: Chứa câu lệnh `UPDATE employee`.

Existing Implementation:
- `batch-job.scheduler.ts`: Đang hardcode `dateTo = today`.
- `jira-crawler.controller.ts`: Đang hardcode `recommendedDateTo = today`.
- `postgres-employee.repository.ts`: Câu lệnh SQL UPDATE chưa cập nhật cột `review_cadence_months`.
- `employee.controller.ts`: Đã có hàm tính `calculateNextReviewDate` nhưng cần map chuẩn số tháng sang `review_cadence_months`.

Existing Tests:
- `backend/test/e2e-full-lifecycle.test.ts`
- `backend/src/modules/employee/domain/employee-review-status.test.ts`

Patterns to Reuse:
- `calculateNextReviewDate` logic với alias `BIANNUALLY`, `SEMI_ANNUAL`, `ANNUALLY`.
- Standard SQL update với parameter binding an toàn.

## Inputs Reviewed
- Investigation of controller, repository, and crawler scheduler.

## Actions and Evidence
- Verified columns in `employee` table: `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`.

## Changes Made
- None

## Decisions and Rationale
- Đồng bộ hóa cả `review_cadence_months` khi update `review_cadence` để batch scheduler và controller cùng chia sẻ dữ liệu đồng nhất.

## Risks / Blockers
- None

## Next Step
- Step 3: Impact Analysis
