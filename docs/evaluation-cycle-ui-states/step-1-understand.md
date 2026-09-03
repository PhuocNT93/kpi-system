# Step 1: Understand

Status: reconstructed from approved response

## Deliverable
## Task Understanding

Goal: Triển khai đầy đủ các trạng thái (states) còn lại của Evaluation Cycle trong trang `/admin/cycles` (và các trang con liên quan: detail, list, actions) tại `@frontend/src/App.tsx`. Bổ sung API backend nếu thiếu endpoint chuyển trạng thái.

Expected Behavior:
- UI `/admin/cycles` hiển thị, lọc, tìm kiếm và quản lý toàn bộ các trạng thái vòng đánh giá: `DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`.
- Trang chi tiết `/admin/cycles/:id` hiển thị đúng timeline tiến trình, badge, và các action chuyển trạng thái hợp lệ theo ma trận chuyển đổi (State Machine).
- Backend cung cấp API chuyển đổi trạng thái hợp lệ (`POST /evaluation-cycles/:id/transition` hoặc các endpoint tương ứng) có validate transition, audit log và kiểm tra quyền HR_ADMIN / SYSTEM_ADMIN.

Acceptance Criteria:
1. Frontend `/admin/cycles` hỗ trợ xem và lọc đầy đủ 9 trạng thái chu kỳ đánh giá (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`).
2. Trang chi tiết `/admin/cycles/:id` hiển thị đầy đủ timeline, trạng thái hiện tại, và các nút thao tác chuyển trạng thái hợp lệ tương ứng với từng state (`Open`, `Start Progress`, `Submit for Review`, `Review`, `Calibrate`, `Approve`, `Publish`, `Lock`).
3. Backend có endpoint thực hiện chuyển trạng thái chu kỳ đánh giá (`POST /api/evaluation-cycles/:id/transition`), kiểm tra logic hợp lệ qua `EvaluationCycleTransitionService` và ghi nhận `audit_log`.
4. Các action không hợp lệ với trạng thái hiện tại bị vô hiệu hóa hoặc ẩn theo đúng RBAC và ma trận transition.
5. Khi chu kỳ ở trạng thái `LOCKED`, toàn bộ chu kỳ và các đánh giá trực thuộc là read-only.

Out of Scope:
- Thay đổi cấu trúc cơ sở dữ liệu cốt lõi ngoài các transition/action đã quy định trong LLD.
- Thay đổi các module không liên quan (IAM, Audit UI, Organization).

Business Rules Involved:
- Ma trận chuyển đổi trạng thái:
  - `DRAFT` -> `OPEN`
  - `OPEN` -> `IN_PROGRESS`, `LOCKED`
  - `IN_PROGRESS` -> `SUBMITTED`, `LOCKED`
  - `SUBMITTED` -> `REVIEWING`, `LOCKED`
  - `REVIEWING` -> `CALIBRATION`, `APPROVED`, `LOCKED`
  - `CALIBRATION` -> `APPROVED`, `LOCKED`
  - `APPROVED` -> `PUBLISHED`, `LOCKED`
  - `PUBLISHED` -> `LOCKED`
  - `LOCKED` -> Terminal (không chuyển đổi tiếp).
- Chỉ `HR_ADMIN` hoặc `SYSTEM_ADMIN` được phép thực hiện chuyển trạng thái chu kỳ đánh giá.
- Mọi thao tác chuyển trạng thái đều phải ghi log vào `audit_log`.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- `frontend/src/App.tsx`, `frontend/src/features/evaluation-cycles`, `backend/src/modules/evaluation-cycle`

## Actions and Evidence
- Reviewed cycle types, routers, and pages

## Changes Made
- None in Step 1

## Decisions and Rationale
- Scope covers full 9 states of EvaluationCycle

## Risks / Blockers
- None

## Next Step
- Step 2: Investigate
