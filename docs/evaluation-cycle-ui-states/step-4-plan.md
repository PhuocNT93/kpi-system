# Step 4: Plan

Status: reconstructed from approved response

## Deliverable
## Implementation Plan

1. **What:** Bổ sung DTO schema, method service, controller và router cho API chuyển trạng thái chu kỳ đánh giá (`POST /api/evaluation-cycles/:id/transition`).
   **Where:**
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.dto.ts`
   - `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.controller.ts`
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.router.ts`
   **Why:** Cung cấp API chuẩn cho phép HR_ADMIN / SYSTEM_ADMIN thực hiện chuyển đổi trạng thái chu kỳ theo ma trận hợp lệ (`OPEN -> IN_PROGRESS -> SUBMITTED -> REVIEWING -> CALIBRATION -> APPROVED -> PUBLISHED -> LOCKED`), kiểm tra concurrency locking và ghi audit log.
   **Tests:** `backend/test/evaluation-cycle-api.test.ts`

2. **What:** Mở rộng API client và React Query hooks cho thao tác transition cycle.
   **Where:**
   - `frontend/src/features/evaluation-cycles/api/cycle-api.ts`
   - `frontend/src/features/evaluation-cycles/hooks/use-evaluation-cycles.ts`
   - `frontend/src/features/evaluation-cycles/types/cycle-types.ts`
   **Why:** Cung cấp hàm gọi `transitionCycle(id, targetStatus)` và hook `useTransitionCycleMutation()` để UI gọi mutation và invalidate query cache.
   **Tests:** `frontend/src/features/evaluation-cycles/`

3. **What:** Cập nhật UI components: `CycleTimeline`, `EvaluationCycleTable`, `EvaluationCycleDetailPage` để hiển thị và thao tác đầy đủ 9 trạng thái.
   **Where:**
   - `frontend/src/features/evaluation-cycles/components/CycleTimeline.tsx`: Hiển thị rõ toàn bộ các mốc trạng thái (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`) với trạng thái hoàn thành và active tương ứng.
   - `frontend/src/features/evaluation-cycles/components/EvaluationCycleTable.tsx`: Bổ sung toàn bộ 9 options vào dropdown lọc trạng thái (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`).
   - `frontend/src/features/evaluation-cycles/pages/EvaluationCycleDetailPage.tsx`: Hiển thị nút hành động chuyển đổi trạng thái tương ứng với các trạng thái kế tiếp được phép (Next Allowed Transitions: Start Progress, Submit All, Start Review, Calibrate, Approve, Publish, Lock Cycle) kèm modal/alert xác nhận.
   **Why:** Đảm bảo trải nghiệm quản trị chu kỳ đánh giá trên trang `/admin/cycles` và `/admin/cycles/:id` đầy đủ, chính xác theo workflow và LLD.
   **Tests:** Type check & tests.

## Inputs Reviewed
- Project requirements and architecture

## Actions and Evidence
- Verified implementation structure

## Changes Made
- None in Step 4

## Decisions and Rationale
- Follow existing router, controller, service, repository, UI component hierarchy

## Risks / Blockers
- None

## Next Step
- Step 5: Define Test Cases
