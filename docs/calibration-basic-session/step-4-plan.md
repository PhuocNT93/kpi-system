# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

### Implementation Plan

1. **What:** Update Calibration domain models, schemas, and repository interfaces.
   **Where:** `backend/src/modules/calibration/domain/calibration.domain.ts`, `backend/src/modules/calibration/domain/calibration.repository.ts`, `backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts`.
   **Why:** Add `median` and 0–100 score distribution buckets; require `scope_id` for `TEAM`/`DEPARTMENT` scopes; enforce score boundaries [0, 100] and trimmed non-empty reasons; add pessimistic lock query (`FOR UPDATE`), cycle/evaluation lock checking, and evaluation status transition queries.
   **Tests:** `backend/test/calibration.test.ts`.

2. **What:** Implement complete business logic in `CalibrationService` (RBAC, scope, distribution, adjustment, atomic finalize, lock enforcement, and audited transactions).
   **Where:** `backend/src/modules/calibration/application/calibration.service.ts`.
   **Why:** 
   - Enforce HR/Admin only access (`403 Forbidden` for Employee, Manager, and System Admin).
   - Derive distribution (count, avg, median, min, max) strictly from `overall_weighted_score`.
   - In `adjustScore`: Validate session is `OPEN`, evaluation belongs to session scope and is not locked (`409 EVALUATION_LOCKED`), score is valid, and reason is non-empty (`422 CALIBRATION_REASON_REQUIRED`). Update `evaluation.final_score` and append to `calibration_adjustment` without mutating `overall_weighted_score`. Record audit log `CALIBRATION_ADJUST`.
   - In `finalizeSession`: Pessimistically lock session (`FOR UPDATE`); prevent duplicate finalize (`409 CALIBRATION_SESSION_ALREADY_FINALIZED`); verify cycle/evaluation lock; transition evaluations `CALIBRATION` -> `APPROVED` -> `PUBLISHED` atomically; record `CALIBRATION_FINALIZE` audit log.
   **Tests:** `backend/test/calibration.test.ts`.

3. **What:** Update Calibration controller, router, and route mounts.
   **Where:** `backend/src/modules/calibration/api/calibration.controller.ts`, `backend/src/modules/calibration/api/calibration.router.ts`, `backend/src/api/routes.ts`.
   **Why:** Expose endpoints adhering to LLD contracts (`POST /calibration-sessions`, `GET /calibration-sessions`, `GET /calibration-sessions/:id`, `GET /calibration-sessions/:id/distribution`, `POST /calibration-sessions/:id/adjustments`, `GET /calibration-sessions/:id/adjustments`, `POST /calibration-sessions/:id/finalize`) and maintain backward-compatible `/calibration/*` aliases.
   **Tests:** `backend/test/calibration.test.ts`.

4. **What:** Refactor frontend typed API client and TanStack Query hooks.
   **Where:** `frontend/src/features/calibration/api/calibration-api.ts`, `frontend/src/features/calibration/hooks/use-calibration.ts`, `frontend/src/features/calibration/types/calibration-types.ts`.
   **Why:** Support dedicated distribution and adjustment endpoints, type-safe requests/responses, and precise query invalidation upon score adjustment and finalization.
   **Tests:** `frontend/src/features/calibration/__tests__/use-calibration.test.ts`.

5. **What:** Enhance calibration modal components (`CreateSessionModal`, `CalibrationAdjustmentModal`, `CalibrationDistributionChart`).
   **Where:** `frontend/src/features/calibration/components/CreateSessionModal.tsx`, `frontend/src/features/calibration/components/CalibrationAdjustmentModal.tsx`, `frontend/src/features/calibration/components/CalibrationDistributionChart.tsx`.
   **Why:** 
   - `CreateSessionModal`: dynamically fetch and allow selecting teams/departments for scoped sessions.
   - `CalibrationDistributionChart`: display median metric alongside avg/min/max, and render 0–100 scale buckets with proper ARIA accessibility.
   - `CalibrationAdjustmentModal`: enforce non-empty reason, display original calculated score as read-only, validate score in [0, 100], and handle backend 409/422 error codes.
   **Tests:** `frontend/src/features/calibration/__tests__/calibration-components.test.tsx`.

6. **What:** Enhance `CalibrationPage.tsx` with dense evaluations table, adjustment history, irreversible finalize dialog, read-only finalized/locked states, and RBAC guards.
   **Where:** `frontend/src/features/calibration/pages/CalibrationPage.tsx`, `frontend/src/shared/layout/Sidebar.tsx`.
   **Why:** Provide HR/Admin with an intuitive operational interface with clear visual separation between `Overall Weighted Score` and `Final Score`, disabled controls when finalized or locked, explicit confirmation before finalizing, and restricted access for unauthorized roles.
   **Tests:** `frontend/src/features/calibration/__tests__/CalibrationPage.test.tsx`.

7. **What:** Implement comprehensive backend integration tests and frontend component tests.
   **Where:** `backend/test/calibration.test.ts`, `frontend/src/features/calibration/__tests__/*`.
   **Why:** Verify all 10 business invariants, RBAC rules, scope filters, distribution calculations, reason requirements, immutable history, lock invariants, atomic finalization, and concurrent finalize conflict handling.
   **Tests:** Run Vitest test suites across backend and frontend.

## Inputs Reviewed
- Steps 1-3 findings and deliverables.

## Actions and Evidence
- Structured a 7-step implementation plan.

## Changes Made
- None.

## Decisions and Rationale
- Sequenced backend foundation before frontend components to ensure API contracts are verified first.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases.
