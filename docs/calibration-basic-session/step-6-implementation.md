# Step 6: Implementation Deliverable — Calibration Basic Session & Finalize

## 1. Overview & Objective
This document summarizes the full-stack implementation of the **Basic Calibration** feature for the Employee Performance Evaluation Management System according to `docs/AI_AGENT_WORKFLOW.md` (Step 6).

The feature enables HR Administrators to:
1. Create and manage calibration sessions across Organization, Department, and Team scopes.
2. Inspect score distribution analytics (count, average, median, min, max, and bucket counts) computed from original calculated scores (`overall_weighted_score`).
3. Manually adjust individual final scores (`final_score`) with a mandatory audit reason, keeping original manager calculated scores strictly untouched and immutable.
4. Finalize calibration sessions atomically (`CALIBRATION` -> `APPROVED` -> auto `PUBLISHED`), locking future edits and preventing concurrent or duplicate finalization.
5. Strictly enforce Role-Based Access Control (`HR_ADMIN` only) across all backend API endpoints and frontend views.

---

## 2. Changes Summary

### 2.1 Backend Implementation

| File | Change Description |
| :--- | :--- |
| [`backend/src/modules/audit/domain/audit.domain.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/audit/domain/audit.domain.ts) | Added `CALIBRATION_SESSION` and `CALIBRATION_ADJUSTMENT` to `AuditEntityTypeSchema`; added `CALIBRATION_SESSION_CREATE`, `CALIBRATION_ADJUST`, `CALIBRATION_FINALIZE`, and `FINALIZE` to `AuditActionSchema`. |
| [`backend/src/modules/calibration/domain/calibration.domain.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/domain/calibration.domain.ts) | Added `medianScore` to `CalibrationDistribution`; validated scores [0, 100] and trimmed reason (min 3 chars). Modernized schemas for Zod v4 compatibility. |
| [`backend/src/modules/calibration/domain/calibration.repository.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/domain/calibration.repository.ts) | Declared transactional methods: `getSessionByIdForUpdate`, `isCycleLocked`, `getExistingSession`, `getEvaluationsForScope`, and `transitionEvaluationsAndAutoPublish`. |
| [`backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts) | Implemented pessimistic lock (`SELECT ... FOR UPDATE`), cycle locked status check, existing session check, and batch status transition (`CALIBRATION` -> `APPROVED` -> `PUBLISHED`). |
| [`backend/src/modules/calibration/application/calibration.service.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/application/calibration.service.ts) | Enforced `HR_ADMIN` role guard, exact median calculation (handling even and odd counts), atomic score adjustment with audit log, atomic finalize transition with lock checks (`409 EVALUATION_LOCKED`), and duplicate finalization protection (`409 CALIBRATION_SESSION_ALREADY_FINALIZED`). |
| [`backend/src/modules/calibration/api/calibration.controller.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/api/calibration.controller.ts) | Added REST handlers: `createSession`, `getSession`, `listSessions`, `getDistribution`, `getAdjustments`, `adjustScore`, and `finalizeSession`. |
| [`backend/src/modules/calibration/api/calibration.router.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/calibration/api/calibration.router.ts) | Mounted routes supporting both flat (`/:id`) and nested (`/sessions/:id`) endpoints with `requireRole(['HR_ADMIN'])` on mutations. |
| [`backend/src/api/routes.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/api/routes.ts) | Registered calibration router under both `/calibration` and `/calibration-sessions`. |
| [`backend/src/app.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/app.ts) | Enabled injecting custom `calibrationController` for testing and custom module wiring. |
| [`backend/test/calibration.test.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/test/calibration.test.ts) | Comprehensive 18-test vitest suite covering RBAC, scope validation, median calculation, adjustment invariants, append-only history, evaluation locking, and atomic finalization. |

---

### 2.2 Frontend Implementation

| File | Change Description |
| :--- | :--- |
| [`frontend/src/features/calibration/types/calibration-types.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/types/calibration-types.ts) | Added `medianScore` to `CalibrationDistribution`; defined `CalibrationSession`, `CalibrationEvaluationRow`, `CalibrationAdjustment`, and `CreateSessionDTO`. |
| [`frontend/src/features/calibration/api/calibration-api.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/api/calibration-api.ts) | Implemented typed API client functions for session CRUD, score distribution, adjustment history, and finalization hitting `/api/calibration-sessions`. |
| [`frontend/src/features/calibration/hooks/use-calibration.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/hooks/use-calibration.ts) | React Query hooks (`useCalibrationSessions`, `useCalibrationSessionDetail`, `useCreateCalibrationSessionMutation`, `useAdjustScoreMutation`, `useFinalizeSessionMutation`) with automatic cache invalidation. |
| [`frontend/src/features/calibration/components/CreateSessionModal.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/components/CreateSessionModal.tsx) | Modal with cycle selector, scope type (`ORG`, `DEPARTMENT`, `TEAM`), and dynamic dropdowns powered by `useDepartments` and `useTeams`. |
| [`frontend/src/features/calibration/components/CalibrationDistributionChart.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/components/CalibrationDistributionChart.tsx) | Analytics bar and stat cards showing Total, Average, Median, and Min/Max scores; distribution breakdown by score buckets. |
| [`frontend/src/features/calibration/components/CalibrationAdjustmentModal.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/components/CalibrationAdjustmentModal.tsx) | Adjustment dialog displaying original calculated score vs current final score, input validation [0, 100], min-length reason requirement, and legal audit warning notice. |
| [`frontend/src/features/calibration/pages/CalibrationPage.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/pages/CalibrationPage.tsx) | Main calibration workspace: strict 403 screen for non-`HR_ADMIN`, cycle lock warning banner, session summary banner with status badge, interactive evaluations table, and irreversible finalize confirmation modal. |
| [`frontend/src/shared/layout/Sidebar.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/shared/layout/Sidebar.tsx) | Restricted Calibration navigation item strictly to `user?.role === 'HR_ADMIN'`. |
| [`frontend/src/features/calibration/__tests__/CalibrationComponents.test.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/__tests__/CalibrationComponents.test.tsx) | 10 unit tests for `CalibrationDistributionChart`, `CalibrationAdjustmentModal`, and `CreateSessionModal`. |
| [`frontend/src/features/calibration/__tests__/CalibrationPage.test.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/calibration/__tests__/CalibrationPage.test.tsx) | 4 integration tests for `CalibrationPage` testing RBAC enforcement, rendering session controls, finalized read-only states, and finalization confirmation dialog. |
| [`docs/calibration-basic-session/frontend-user-guide.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/frontend-user-guide.md) | End-user documentation and step-by-step operating guide for HR Administrators. |

---

## 3. Invariants & Business Rule Verification

1. **Original Calculated Score Immutability**:
   - `overall_weighted_score` is never modified or overwritten by calibration adjustments.
   - Adjustments update only `final_score` and record an immutable entry in `calibration_adjustment`.
2. **Audit Reason Requirement**:
   - Scores must be within [0, 100].
   - Reason must be non-empty and have at least 3 non-whitespace characters (`422 CALIBRATION_REASON_REQUIRED`).
3. **No Auto-Suggestions or Bell Curve**:
   - Distribution is purely descriptive (Average, Median, Min, Max, Range buckets). No z-scores, normalization, or employee ranking algorithms exist.
4. **Concurrency & Lock Guarding**:
   - Finalization acquires pessimistic row locks (`FOR UPDATE`) on the session record.
   - Attempting to adjust or re-finalize a finalized session returns `409 CALIBRATION_SESSION_ALREADY_FINALIZED`.
   - Operations on a cycle with `LOCKED` status return `409 EVALUATION_LOCKED`.
5. **Atomic Finalization & Auto-Publishing**:
   - Transitions session status to `FINALIZED`.
   - Transitions evaluations from `CALIBRATION` -> `APPROVED` -> `PUBLISHED` in the same database transaction.
6. **Strict RBAC**:
   - Only users with `HR_ADMIN` role can access calibration views or trigger mutations.
   - Backend returns `403 FORBIDDEN` for `EMPLOYEE`, `MANAGER`, and `SYSTEM_ADMIN`.
   - Frontend displays Access Denied screen for non-`HR_ADMIN` and hides the sidebar menu item.

---

## 4. Verification & Quality Gates Status

| Quality Gate | Target | Result | Status |
| :--- | :--- | :--- | :---: |
| Backend TypeScript Compilation | `backend: npm run typecheck` | 0 errors | **PASSED** |
| Backend ESLint Rules | `backend: npm run lint` | 0 errors, 0 warnings | **PASSED** |
| Backend Calibration Tests | `backend: vitest test/calibration.test.ts` | 18 / 18 tests passed | **PASSED** |
| Frontend TypeScript Compilation | `frontend: npm run typecheck` | 0 errors | **PASSED** |
| Frontend ESLint Rules | `frontend: npm run lint` | 0 errors, 0 warnings | **PASSED** |
| Frontend Calibration Tests | `frontend: vitest src/features/calibration` | 14 / 14 tests passed | **PASSED** |

---

## 5. Artifact Reference
- [`docs/calibration-basic-session/step-0-sync-and-branch.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-0-sync-and-branch.md)
- [`docs/calibration-basic-session/step-1-understand.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-1-understand.md)
- [`docs/calibration-basic-session/step-2-investigate.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-2-investigate.md)
- [`docs/calibration-basic-session/step-3-impact-analysis.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-3-impact-analysis.md)
- [`docs/calibration-basic-session/step-4-plan.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-4-plan.md)
- [`docs/calibration-basic-session/step-5-test-cases.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-5-test-cases.md)
- [`docs/calibration-basic-session/step-6-implementation.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/step-6-implementation.md)
- [`docs/calibration-basic-session/frontend-user-guide.md`](file:///c:/Users/phuoc.nt/AI/kpi-system/docs/calibration-basic-session/frontend-user-guide.md)
