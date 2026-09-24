# Step 3: Impact Analysis

Status: reconstructed from conversation

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | LOW | Không đổi API contract; Modal employee hiện tại đã gửi đúng `last_evaluation_completed_at` & `next_review_due_date` |
| Backend | MEDIUM | Sửa logic query ngày trong batch scheduler & crawler controller; cập nhật repository update |
| Database | LOW | Không thay đổi schema DDL; chỉ update dữ liệu bảng `employee` và `batch_eval_run` |
| API | LOW | Không break schema hiện tại; trả về mốc ngày chính xác hơn |
| RBAC / Scope | NONE | Giữ nguyên quyền hạn hiện hữu |
| Workflow | LOW | Phù hợp với LLD: candidate data cho review |
| Audit | NONE | Không ảnh hưởng đến audit log bảo toàn |
| Concurrency | NONE | Sử dụng version optimistic lock có sẵn trong employee repository |
| Performance | LOW | Query theo index ngày và employee_id |
| Historical Data | NONE | Dữ liệu cũ giữ nguyên |

Potential Risks:
- Nhân viên có `nextReviewDueDate` quá xa trong tương lai (ví dụ 1 năm): Jira client query range rộng có thể tốn thêm thời gian; đã có sẵn pagination và issue limit trong Jira client.

Required ADR / Clarification:
- None.

## Inputs Reviewed
- Database schema and API contracts.

## Actions and Evidence
- Analyzed cross-module impacts.

## Changes Made
- None

## Decisions and Rationale
- Ensure fallback to `today` if `nextReviewDueDate` is missing.

## Risks / Blockers
- None

## Next Step
- Step 4: Plan
