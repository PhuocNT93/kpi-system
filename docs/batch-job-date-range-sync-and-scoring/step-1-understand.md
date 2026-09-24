# Step 1: Understand

Status: reconstructed from conversation

## Deliverable

## Task Understanding

Goal: Đảm bảo batch job tự động thu thập (crawler) dữ liệu Jira/Blueprint theo khoảng thời gian review cá nhân của mỗi nhân sự ([last_evaluation_completed_at, next_review_due_date]), đồng bộ tức thì khi HR chỉnh sửa ngày đánh giá và review cadence trên module Organization, và áp dụng cơ chế tính điểm penalty-based từ mốc chuẩn 100 điểm.

Expected Behavior:
1. Batch job crawler query `[lastReviewDate, nextReviewDate]` cho từng nhân viên thay vì mốc cố định `today`.
2. Fallback linh hoạt: Nếu `lastReviewDate` null thì dùng `defaultFromDate` (180 ngày); nếu `nextReviewDate` null thì dùng `today`.
3. Khi Organization cập nhật nhân viên (đổi `review_cadence`, `last_evaluation_completed_at`, hoặc `next_review_due_date`), backend tự động tính toán lại và đồng bộ `review_cadence_months` cùng `next_review_due_date` vào database.
4. Auto Collect (cả list API và batch job) tự động phản ánh khoảng ngày mới mà không cần can thiệp thủ công.
5. Cơ chế tính điểm: Nhân viên bắt đầu với chuẩn 100 điểm, bị trừ điểm (penalty) khi có vi phạm Code Quality (critical bug) hoặc Chuyên cần (đi trễ), cộng thưởng theo mức độ đóng góp task.

Acceptance Criteria:
1. Batch job chạy thu thập Jira với khoảng ngày `[member.lastEvaluationCompletedAt, member.nextReviewDueDate || today]`.
2. GET `/api/collector/jira/members` trả về `recommendedDateFrom` và `recommendedDateTo` theo chu kỳ review thực tế.
3. Khi update nhân viên qua API Organization, `review_cadence_months` và `next_review_due_date` được tính toán và lưu đúng.
4. Logic tính điểm phạt (penalty) từ baseline 100 hoạt động chuẩn xác, clamp trong khoảng [0, 100].

Out of Scope:
- Thay đổi cấu trúc cơ sở dữ liệu (các column `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date` đã sẵn sàng).
- Tự động publish điểm chính thức (vẫn tuân thủ LLD: dữ liệu crawl là candidate data).

Business Rules Involved:
- LLD mục 14.1 (Review Cadence & Scheduling)
- LLD mục 15.1 (Automated Data Crawling)

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- docs/LLD_Employee_Performance_Evaluation_System.md
- backend/src/modules/jira-crawler/batch-job.scheduler.ts
- backend/src/modules/employee/api/employee.controller.ts

## Actions and Evidence
- Analyzed existing crawler date range and scoring pipeline.

## Changes Made
- None

## Decisions and Rationale
- Use dynamic review window per employee.

## Risks / Blockers
- None

## Next Step
- Step 2: Investigate
