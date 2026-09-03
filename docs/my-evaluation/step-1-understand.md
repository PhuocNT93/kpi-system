# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

## Task Understanding

Goal: Xây dựng giao diện "My Evaluation" cho role `EMPLOYEE` theo đặc tả `docs/my-evaluation-ui-spec.md`, cho phép nhân viên xem danh sách các kỳ đánh giá, xem chi tiết evaluation của chính mình, thực hiện và nộp self-assessment (với measurement/self input, comment, evidence), lưu nháp từng tiêu chí và xem kết quả đã publish; đồng thời bổ sung/hoàn thiện các backend API còn thiếu phục vụ luồng này.

Expected Behavior:
1. Danh sách My Evaluation (`/evaluations`):
   - Hiển thị evaluation của nhân viên hiện tại theo từng kỳ đánh giá (cycle).
   - Hiển thị thẻ active evaluation với tiến độ (`completed_items / active_items`), trạng thái và CTA tương ứng.
   - Hiển thị bảng/danh sách lịch sử evaluation qua các cycle kèm trạng thái và điểm số (chỉ hiển thị final score khi backend cho phép / đã `PUBLISHED`).
   - Xử lý các trạng thái: Loading, Empty, Error, Unauthorized, No active cycle.
2. Chi tiết My Evaluation (`/evaluations/:evaluationId`):
   - Hiển thị header: Breadcrumb, cycle info, status badge, read-only banner (nếu không được sửa), progress indicator.
   - Summary panel: Self score, manager/final score (chỉ khi backend cho phép), category breakdown, evidence incomplete warning.
   - Criteria list: Phân nhóm theo category, render từng criterion từ snapshot.
   - Form actions: Lưu nháp (`Save Draft`) từng item với optimistic lock `version`, Nộp đánh giá (`Submit Self-Assessment`) kèm modal xác nhận và `Idempotency-Key`.
   - Result & feedback panel: Hiển thị khi evaluation ở trạng thái `PUBLISHED` hoặc có điểm/comment được phép xem.
   - Cảnh báo unsaved changes khi rời trang hoặc chuyển cycle.
3. Backend API (Bổ sung/Hoàn thiện nếu còn thiếu):
   - Cung cấp các endpoint scoped cho employee hiện tại: `GET /evaluations`, `GET /evaluations/:id`, `PUT /evaluations/:id/items/:itemId`, `POST /evaluations/:id/self-submit`.
   - Bảo đảm đầy đủ validation, RBAC, optimistic locking, workflow state transition rules và snapshot-based data representation.

Acceptance Criteria:
1. Employee chỉ thấy evaluation của chính mình; không có request hoặc UI control để mở evaluation của employee khác.
2. Màn hình hiển thị đầy đủ loading, empty, error, unauthorized và locked/read-only states.
3. Criterion, weight, rule, level và score được render từ evaluation snapshot.
4. Criterion disabled không yêu cầu nhập và không làm sai progress.
5. Self-assessment luôn là bước bắt buộc; không có skip action.
6. Employee có thể lưu nháp item được phép sửa mà không thay đổi workflow state.
7. Submit yêu cầu confirmation, chống double-submit và refetch state sau success.
8. Backend error 409 được xử lý mà không ghi đè unsaved input.
9. Evaluation locked không còn mutation control và vẫn xử lý được 409 EVALUATION_LOCKED.
10. Không xuất hiện ranking, percentile, peer comparison, team average hoặc dữ liệu PII ngoài scope.
11. Calculated score, manager score và final score không thể chỉnh trực tiếp từ UI.
12. Published/history result chỉ hiển thị các field mà backend/resource permission cho phép.

Out of Scope:
- Chức năng manager/admin review, calibration, score adjustment, template editing.
- Xếp hạng nhân viên, peer comparison.
- Lưu dữ liệu evaluation vào localStorage.

Business Rules Involved:
- RBAC scoping, Workflow state transitions, Snapshot integrity, Read-only score calculations, Locked state immutability.

Open Questions / Conflicts:
- None.

## Next Step
- Step 2: Investigate
