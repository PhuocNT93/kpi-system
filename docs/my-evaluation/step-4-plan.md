# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

## Implementation Plan

1. **What:** Chuẩn hóa và mở rộng backend evaluation API endpoints & service.
   **Where:** `backend/src/modules/evaluation/api/evaluation.router.ts`, `backend/src/modules/evaluation/api/evaluation.controller.ts`, `backend/src/modules/evaluation/application/services/evaluation.service.ts`, `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.ts`.
   **Why:** Bổ sung endpoint `POST /api/v1/evaluations/:id/self-submit` và `PUT /api/v1/evaluations/:id/items/:itemId` (đồng thời giữ route batch `PUT /:id/items` và `POST /:id/submit`), hỗ trợ lưu measurement/comment/resolved_level từ snapshot, kiểm tra ownership/scope và ràng buộc trạng thái `OPEN`/`SELF_ASSESSMENT`.
   **Tests:** Thêm unit/integration tests cho evaluation self-assessment flow (`backend/test/evaluation-self-assessment.test.ts`).

2. **What:** Cập nhật Frontend API Client và Domain Types cho My Evaluation.
   **Where:** `frontend/src/features/evaluation/domain/evaluation-models.ts`, `frontend/src/features/evaluation/api/evaluation-api.ts`.
   **Why:** Mở rộng domain models để thể hiện đầy đủ trạng thái (`OPEN`, `SELF_ASSESSMENT`, `SUBMITTED`, `MANAGER_REVIEW`, `APPROVED`, `PUBLISHED`, `LOCKED`), cấu trúc snapshot của criteria (category, weights, level definition, rule, measurement keys, evidence), và các phương thức gọi API (`selfSubmit`, `saveItemDraft`, `batchSaveDraft`, `getMyEvaluations`, `getEvaluationDetail`).
   **Tests:** Typecheck (`npm run typecheck` trong frontend).

3. **What:** Xây dựng lại giao diện danh sách My Evaluation (`MyEvaluationPage`).
   **Where:** `frontend/src/features/evaluation/pages/MyEvaluationPage.tsx` và các sub-components (`ActiveEvaluationCard.tsx`, `EvaluationHistoryTable.tsx`, `StatusBadge.tsx`).
   **Why:** Đáp ứng Mục 5.1 của UI Spec: Page header & cycle selector, Active evaluation card với progress indicator (`completed_items / active_items`), deadline countdown/warning, dynamic CTA (`Continue`, `View Details`, `View Result`), bảng lịch sử các kỳ trước với trạng thái rõ ràng, và các trạng thái Loading skeleton, Empty, Error.
   **Tests:** Render & interaction tests / Typecheck.

4. **What:** Xây dựng lại toàn diện giao diện chi tiết My Evaluation (`EvaluationDetailPage`).
   **Where:** `frontend/src/features/evaluation/pages/EvaluationDetailPage.tsx`, `frontend/src/features/evaluation/components/` (`EvaluationHeader.tsx`, `EvaluationSummaryPanel.tsx`, `CriterionCard.tsx`, `LevelSelector.tsx`, `MeasurementInput.tsx`, `EvidenceForm.tsx`, `SubmitConfirmModal.tsx`, `UnsavedChangesWarning.tsx`).
   **Why:** Đáp ứng Mục 5.2, 6, 8, 9, 10 của UI Spec.
   **Tests:** Frontend component test suite / Vitest & Typecheck.

5. **What:** Tạo tài liệu hướng dẫn người dùng `docs/my-evaluation/frontend-user-guide.md`.
   **Where:** `docs/my-evaluation/frontend-user-guide.md`.
   **Why:** Cung cấp hướng dẫn sử dụng giao diện My Evaluation cho Employee.
   **Tests:** Document review.

## Next Step
- Step 5: Define Test Cases
