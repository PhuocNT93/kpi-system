# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable
## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Bổ sung đầy đủ 9 trạng thái trên table filter, timeline, chi tiết chu kỳ, badge và action transition động tương ứng với ma trận trạng thái. |
| Backend | LOW | Thêm endpoint `POST /evaluation-cycles/:id/transition` và DTO validation schema; tích hợp `EvaluationCycleTransitionService` và `AuditService`. |
| Database | NONE | Bảng `evaluation_cycle` đã có sẵn cột `status` kiểu enum/varchar hỗ trợ đầy đủ các giá trị trạng thái. Không cần migration mới. |
| API | LOW | Bổ sung endpoint `POST /api/evaluation-cycles/:id/transition` với payload `{ target_status: EvaluationCycleStatus }`. |
| RBAC / Scope | LOW | Giữ nguyên quy tắc bảo mật: Chỉ `HR_ADMIN` và `SYSTEM_ADMIN` được gọi transition/lock/edit chu kỳ. |
| Workflow | LOW | Tuân thủ chính xác ma trận chuyển trạng thái trong `EvaluationCycleTransitionService`. |
| Audit | LOW | Ghi nhận sự kiện `TRANSITION` vào `audit_log` cho mỗi lần chuyển đổi trạng thái thành công. |
| Concurrency | LOW | Sử dụng row-level locking `findByIdForUpdate` trong transaction khi chuyển trạng thái để tránh race condition. |
| Performance | NONE | Thao tác chuyển đổi trạng thái thực hiện theo single row update kèm log audit, độ trễ tối thiểu. |
| Historical Data | NONE | Không làm biến đổi dữ liệu cũ, chu kỳ đã `LOCKED` vẫn giữ nguyên tính bất biến read-only. |

Potential Risks:
- Người dùng chuyển đổi sai thứ tự trạng thái: Đã có `EvaluationCycleTransitionService` chặn và trả về lỗi `Conflict` (`INVALID_CYCLE_STATE_TRANSITION`).
- Thao tác trên chu kỳ đã bị lock: Bị từ chối ngay lập tức vì trạng thái `LOCKED` không cho phép transition tiếp.

Required ADR / Clarification:
- None.

## Inputs Reviewed
- Database schema, service layers, RBAC rules

## Actions and Evidence
- Reviewed concurrency handling and security scopes

## Changes Made
- None in Step 3

## Decisions and Rationale
- Use standard validation rules and transactions

## Risks / Blockers
- None

## Next Step
- Step 4: Plan
