# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

### Implementation Plan

1. **Database Migration — Add `calibration_enabled` Flag to `evaluation_cycle`**
   - **What:** Create a database migration `1788926000019_add_calibration_enabled_to_evaluation_cycle.ts` adding column `calibration_enabled BOOLEAN NOT NULL DEFAULT true` to table `evaluation_cycle`.
   - **Where:** `backend/migrations/1788926000019_add_calibration_enabled_to_evaluation_cycle.ts`
   - **Why:** Enables cycle-level configuration of the optional `CALIBRATION` state in the fixed evaluation state machine (Part A1, A3, LLD Section 14).
   - **Tests:** `backend/test/calibration-workflow.test.ts`.

2. **Backend — Evaluation Workflow State Machine & Calibration Transition Validation**
   - **What:** Update `EvaluationTransitionService` and `EvaluationStatus` enum to enforce the canonical fixed state machine:
     `DRAFT -> OPEN -> SELF_ASSESSMENT -> MANAGER_ASSESSMENT -> REVIEWING -> [CALIBRATION] -> APPROVED -> PUBLISHED -> LOCKED`.
     Validate that `REVIEWING -> CALIBRATION` is permitted if and only if `cycle.calibration_enabled = true`. When false, reject with `422 Unprocessable Entity` (code: `CALIBRATION_NOT_ENABLED` or `INVALID_WORKFLOW_TRANSITION`).
     Strictly block invalid state jumps (`REVIEWING -> PUBLISHED`, `REVIEWING -> LOCKED`, `CALIBRATION -> PUBLISHED`, `CALIBRATION -> LOCKED`, `APPROVED -> LOCKED`).
     Preserve backwards compatibility for existing evaluation status aliases (`SUBMITTED`, `MANAGER_REVIEW`) to avoid breaking existing features.
   - **Where:** `backend/src/modules/evaluation/application/services/evaluation-transition.service.ts`, `backend/src/modules/evaluation/domain/evaluation.types.ts`, `backend/src/modules/evaluation-cycle/domain/evaluation-cycle.types.ts`.
   - **Why:** Fulfill Part A1, A2, A3 workflow state machine requirements.
   - **Tests:** `backend/test/evaluation-workflow-state-machine.test.ts`, `backend/test/calibration-workflow.test.ts`.

3. **Backend — Calibration Score Adjustment & Atomic Finalize**
   - **What:**
     - In `CalibrationService.adjustScore`:
       - Require a non-empty `reason` (minimum 3 characters, trimmed).
       - Strictly preserve `overall_weighted_score` / `manager_score` intact; persist adjustment record with old value, new value, actor, reason, timestamp.
       - Update `evaluation.final_score` and record transactional audit log (`CALIBRATION_ADJUST`) in the same database transaction.
       - Validate cycle and evaluation lock states.
     - In `CalibrationService.finalizeSession`:
       - Acquire row locks (`SELECT ... FOR UPDATE`) on `calibration_session` and `evaluation_cycle`.
       - Reject already finalized sessions with `409 CALIBRATION_SESSION_ALREADY_FINALIZED`.
       - Update session status to `FINALIZED`.
       - Atomically transition affected evaluations `CALIBRATION -> APPROVED -> PUBLISHED` without a manual publish step.
       - Create transactional audit records (`CALIBRATION_FINALIZE` and `PUBLISH`).
     - Prevent double finalize / race conditions via row locks and transaction isolation.
   - **Where:** `backend/src/modules/calibration/application/calibration.service.ts`, `backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts`.
   - **Why:** Fulfill Part A4, A5, A6, A7 and C4, C5 requirements.
   - **Tests:** `backend/test/calibration.test.ts`, `backend/test/calibration-concurrency.test.ts`.

4. **Backend — Cross-Module Security & RBAC Hardening**
   - **What:**
     - Enforce `KPI_MANUAL_OVERRIDE` permission strictly in `evaluation.service.ts`: Require actor to have `KPI_MANUAL_OVERRIDE` permission; enforce team and employee resource scopes; validate evaluation lock state (409) and workflow state (422).
     - Audit authorization across all 8 modules (IAM, Organization, Template/Criteria, Evaluation, Import, Reporting, Calibration, Audit) to ensure actor identity and permissions are strictly derived from verified JWT claims rather than request body or query parameters.
     - Error & PII protection: Ensure error responses and logs do not leak raw SQL, database connection strings, stack traces, ORM errors, or tokens. Enforce standard response envelope `{ success: false, message, data: null, meta: { request_id, error: { code, field, details } } }`.
     - SQL injection hardening: Verify all queries use parameterization (`$1, $2, ...`) and dynamic query fields adhere to strict allowlists.
     - Transactional audit integrity: Guarantee that all state, score, override, and lock mutations commit business write and audit record within the exact same database transaction; audit tables remain append-only.
   - **Where:** `backend/src/modules/evaluation/application/services/evaluation.service.ts`, `backend/src/api/error-handler.ts`, `backend/src/api/http-response.ts`, `backend/src/shared/auth/jwt.middleware.ts`.
   - **Why:** Fulfill Part B1, B2, B3, B4, B5, B6, B7 security requirements.
   - **Tests:** `backend/test/security-cross-module.test.ts`, `backend/test/evaluation-kpi-manual-override.test.ts`.

5. **Backend — Concurrency & Locking Hardening**
   - **What:**
     - **C1. Concurrent evaluation item update:** Update `PostgresEvaluationItemRepository.update` and `batchUpdate` to perform optimistic locking `AND version = $expectedVersion`, incrementing `version = version + 1`. Throw `409 Conflict` (`VERSION_MISMATCH`) on mismatch.
     - **C2 & C3. Concurrent submit & approve:** Wrap submit and approve operations in transactions with row-level locks (`SELECT ... FOR UPDATE` on `evaluation_cycle` and `evaluation`). Handle concurrent requests safely (one succeeds, other returns 409 or idempotent response).
     - **C6. Cycle lock race:** Update all evaluation write paths (`saveDraft`, `saveItemDraft`, `submitEvaluation`, `approveEvaluation`, `manualOverrideKpiScore`) to verify `cycle.status != 'LOCKED'` with row locking in the same transaction. Committing cycle lock prevents any subsequent evaluation write.
     - **C7. KPI relationship race:** In `KpiRelationshipService.createRelationship`, catch database unique constraint violation (`uq_kpi_relationship_active`, code `23505`) and return `409 Conflict` (`KPI_RELATIONSHIP_ALREADY_EXISTS`).
     - **C8. KPI manual override race:** Enforce atomic version check / row locking within transaction during manual override; return 409 on conflict.
     - **C9. Concurrent CSV import race:** In `csv-import.service.ts`, catch unique constraint violation on `(evaluation_cycle_id, file_hash)` and return `409 Conflict` (`IMPORT_JOB_ALREADY_EXISTS`). Ensure import processing validates cycle lock and skips/rejects locked evaluations.
     - **C10. DAG validation race:** In `KpiRelationshipService.createRelationship`, acquire a table-level or serialized lock within the transaction so graph traversal, cycle check, and insertion execute atomically, preventing concurrent incompatible edges from forming a cycle.
   - **Where:** `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.ts`, `backend/src/modules/evaluation/application/services/evaluation.service.ts`, `backend/src/modules/kpi/services/kpi-relationship.service.ts`, `backend/src/modules/import/application/csv-import.service.ts`.
   - **Why:** Fulfill Part C1 through C10 concurrency hardening requirements.
   - **Tests:** `backend/test/concurrency-hardening.test.ts`.

6. **Frontend — Calibration UI, Permissions & Conflict UX**
   - **What:**
     - In `CalibrationPage` and components:
       - Render calibration enabled/disabled badge and evaluation workflow status.
       - Display calculated score and calibrated `final_score` distinctly.
       - Enforce mandatory `reason` field in adjustment modal.
       - Display adjustment history drawer (old score, new score, reason, actor, timestamp).
       - Derive workflow action buttons from server status and permissions.
       - Render read-only views when evaluation cycle or evaluation is locked.
       - Implement non-destructive 409 conflict handling: retain user input in form, display "This record was changed by another user. [Reload latest data]".
       - Display user-friendly error banners for 403, 409, and 422 without exposing technical internals or PII.
     - In `TeamEvaluationsPage` & `EvaluationDetailPage`:
       - Show KPI manual override option only when authorized by server permissions; handle 403, 409, 422 safely.
   - **Where:** `frontend/src/features/calibration/pages/CalibrationPage.tsx`, `frontend/src/features/calibration/components/`, `frontend/src/features/evaluation/`.
   - **Why:** Fulfill Part D1 through D7 frontend UX and error handling requirements.
   - **Tests:** `frontend/src/features/calibration/__tests__/CalibrationPage.test.tsx`, `frontend/src/features/calibration/__tests__/CalibrationComponents.test.tsx`.

7. **Automated Verification & Test Execution**
   - **What:** Run full backend unit/integration/concurrency tests (`npm test`), frontend tests (`npm test`), type checking (`npm run typecheck`), and linting (`npm run lint`) across backend and frontend.
   - **Where:** `backend/`, `frontend/`.
   - **Why:** Fulfill Definition of Done and zero regression guarantee.

## Inputs Reviewed
- Steps 0, 1, 2, 3 findings and requirements.

## Actions and Evidence
- Structured a 7-part plan covering migration, backend workflow, calibration, security, concurrency, frontend, and tests.

## Changes Made
- None.

## Decisions and Rationale
- Grouped changes logically by system boundaries.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases.
