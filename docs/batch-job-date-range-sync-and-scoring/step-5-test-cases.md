# Step 5: Test Cases

Status: reconstructed from conversation

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| **TC01** | **Batch collect date window** | Nhân viên có `last_evaluation_completed_at = '2026-03-01'` và `next_review_due_date = '2026-09-01'` | Batch job scheduler kích hoạt (`executeBatchRun`) | Jira crawler gọi API Jira với `fromDate = '2026-03-01'` và `toDate = '2026-09-01'`; kết quả lưu đúng `dateFrom` & `dateTo` vào `batch_eval_run.results` |
| **TC02** | **Fallback dateFrom khi null** | Nhân viên mới chưa có `last_evaluation_completed_at` (null) | Batch job scheduler kích hoạt | `fromDate` fallback về `defaultFromDate` (180 ngày trước); không xảy ra lỗi runtime |
| **TC03** | **Fallback dateTo khi null** | Nhân viên chưa có `next_review_due_date` (null) | Batch job scheduler kích hoạt | `toDate` fallback về ngày hiện tại (`today`); thu thập bình thường |
| **TC04** | **Sync API GET managed members** | Database có nhân viên với `last_evaluation_completed_at` & `next_review_due_date` | Gọi `GET /api/collector/jira/members` | Trả về `recommendedDateFrom = lastReviewDate` và `recommendedDateTo = nextReviewDate` (thay vì cố định `today`) |
| **TC05** | **Sync khi đổi cadence/date bên Organization** | HR mở modal Employee, sửa `last_evaluation_completed_at = '2026-04-01'` và `review_cadence = 'QUARTERLY'` | Frontend submit `PATCH /api/employees/:id` | Backend cập nhật `last_evaluation_completed_at = '2026-04-01'`, tự động tính `next_review_due_date = '2026-07-01'`, và cập nhật `review_cadence_months = 3` trong database |
| **TC06** | **Tự động sync qua Auto Collect** | Đã thực hiện TC05 thành công | Gọi `GET /api/collector/jira/members` hoặc chạy batch job tiếp theo | Auto Collect nhận ngay mốc ngày mới `2026-04-01` đến `2026-07-01` mà không cần cấu hình lại |
| **TC07** | **Scoring: Baseline 100 hoàn hảo** | Nhân viên không có bug critical, tỷ lệ đúng giờ 100%, hoàn thành task tốt | Chạy chấm điểm qua `AiScoringEngine` | Điểm tổng đạt 100 điểm (Level 5), không có khoản trừ vi phạm |
| **TC08** | **Scoring: Penalty vi phạm Code Quality** | Nhân viên phát sinh critical bug trong kỳ | Chạy chấm điểm qua `AiScoringEngine` | Điểm cơ sở bị trừ tương ứng theo mức độ vi phạm bug (trừ từ mốc 100) và ghi rõ lý do trừ trong `rationale` |
| **TC09** | **Scoring: Penalty vi phạm Chuyên cần** | Nhân viên có ngày đi trễ > 15 phút từ dữ liệu Blueprint UI_TAT_028 | Chạy batch run blend Blueprint | Điểm chuyên cần bị trừ tương ứng tỷ lệ vi phạm; thể hiện rõ trong breakdown |
| **TC10** | **Scoring: Giới hạn biên [0, 100]** | Nhân viên có nhiều vi phạm cộng dồn | Chạy chấm điểm | Điểm tổng được clamp an toàn trong khoảng `[0, 100]`, không bị âm |

## Inputs Reviewed
- Step 4 Plan and Acceptance Criteria.

## Actions and Evidence
- Test cases approved by user ("implement ngay").

## Changes Made
- None

## Decisions and Rationale
- Defined 10 targeted test cases covering sync, date resolution, and penalty scoring.

## Risks / Blockers
- None

## Next Step
- Step 6: Implement
