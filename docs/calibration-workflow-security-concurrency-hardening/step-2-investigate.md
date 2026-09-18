# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

### Investigation

#### Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Sections 3.1, 7.2, 8, 10.5, 14, 16, 17, 19, 29 Q3).
- `docs/Sequence_Diagrams_System.md`.
- `docs/BACKEND_NODE_RULES.md` & `docs/FRONTEND_REACT_RULES.md`.
- `docs/calibration-basic-session/step-1-understand.md` through `step-10-final-verification.md`.

#### Relevant Modules and Files:
- **Backend**:
  - `backend/src/modules/calibration/application/calibration.service.ts`: Calibration session creation, listing, detail, distribution computation, manual score adjustments, and finalization.
  - `backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts`: Repository implementation with parameterized SQL, row locking (`FOR UPDATE`), and auto-publish execution.
  - `backend/src/modules/calibration/api/calibration.controller.ts` & `calibration.router.ts`: REST endpoints (`POST /calibration-sessions`, `POST /calibration-sessions/:id/adjustments`, `POST /calibration-sessions/:id/finalize`).
  - `backend/src/modules/evaluation/domain/evaluation.types.ts`: `EvaluationStatus` enum and evaluation/item domain interfaces.
  - `backend/src/modules/evaluation/application/services/evaluation.service.ts`: Core evaluation orchestration (draft save, submit, approve, manual override).
  - `backend/src/modules/evaluation/application/services/evaluation-transition.service.ts`: State machine transition validation rules.
  - `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation.repository.ts` & `postgres-evaluation-item.repository.ts`: Evaluation data access, row locking (`findByIdForUpdate`), and item updates.
  - `backend/src/modules/evaluation-cycle/domain/evaluation-cycle.types.ts` & `application/evaluation-cycle.service.ts`: Cycle domain model, cycle lock logic (`lockCycle`), and status transitions.
  - `backend/src/modules/kpi/services/kpi-relationship.service.ts`: KPI relationship creation, DFS cycle detection, and DAG validation.
  - `backend/src/modules/import/application/csv-import.service.ts`: CSV upload, preview, confirmation, and batch execution.
  - `backend/src/shared/auth/jwt.middleware.ts`: Bearer token authentication, signature/algorithm verification, claims extraction (`sub`, `role`, `employeeId`, `managedTeamIds`, `permissions`).
  - `backend/src/api/error-handler.ts` & `backend/src/api/http-response.ts`: Global error handler and standardized JSON response envelope.
  - `backend/src/modules/audit/application/audit.service.ts` & `audit-transaction.ts`: Transactional append-only audit logging.
  - `backend/migrations/`: Database schema migrations (node-pg-migrate).
- **Frontend**:
  - `frontend/src/features/calibration/pages/CalibrationPage.tsx`: Full calibration workflow management view.
  - `frontend/src/features/calibration/components/`: `CalibrationDistributionChart`, `CalibrationEvaluationTable`, `CalibrationAdjustmentModal`, `CalibrationFinalizeModal`.
  - `frontend/src/features/calibration/api/calibration.api.ts`: Typed API client for calibration endpoints.
  - `frontend/src/features/evaluation/`: Evaluation detail page, review actions, and score display.
  - `frontend/src/shared/api/api-client.ts`: HTTP request wrapper with 409 conflict and error handling.

#### Existing Implementation:
- **Baseline Test Suite Status**:
  - Backend: 46 test suites passed (535 tests passed, 30 skipped).
  - Frontend: 29 test suites passed (115 tests passed).
- **Calibration & Workflow**:
  - Basic calibration session and adjustment APIs exist in `backend/src/modules/calibration/`.
  - `evaluation_cycle` table currently lacks a `calibration_enabled` boolean column.
  - `EvaluationTransitionService` in the evaluation module currently maps an earlier transition set (`OPEN -> SUBMITTED -> MANAGER_REVIEW -> APPROVED -> PUBLISHED -> LOCKED`), lacking `CALIBRATION` state and the conditional `REVIEWING -> CALIBRATION` check based on `cycle.calibration_enabled`.
  - Calibration finalization marks evaluations directly to `PUBLISHED` without explicitly passing through `APPROVED` within the state machine.
- **Security & RBAC**:
  - JWT middleware verifies token signature and algorithm (`HS256`), attaching actor context to request locals and async storage.
  - `manualOverrideKpiScore` checks `actor.permissions` conditionally (only if non-empty), rather than strictly requiring `KPI_MANUAL_OVERRIDE` for any override action. Resource scope (team/employee) and workflow state validation are currently missing on this endpoint.
  - API error handler masks unknown errors to 500, but explicit negative security tests across all 8 modules (IAM, Org, Criteria, Evaluation, Import, Reporting, Calibration, Audit) need consolidation.
- **Concurrency & Locking**:
  - `PostgresEvaluationItemRepository.update` and `batchUpdate` do not check `version`, creating a race condition where concurrent draft updates result in silent last-write-wins overwrites instead of `409 Conflict`.
  - Evaluation writes (`submitEvaluation`, `saveDraft`, `manualOverrideKpiScore`) check `evaluation.is_locked`, but do not verify `cycle.status != 'LOCKED'` with a row lock inside the same transaction, leaving a window for writes after cycle locking.
  - KPI relationship creation performs DFS cycle detection in memory without locking the relationship table or handling unique constraint violation (`23505`) as `409 Conflict`. Concurrent conflicting edges can produce database cycles.
  - CSV import creation relies on database unique constraint `(evaluation_cycle_id, file_hash)`, but unhandled unique violations bubble up as database errors instead of `409 Conflict`. Import batch processing does not verify if the cycle has been locked.

#### Existing Tests:
- `backend/test/calibration.test.ts` (18 tests covering session creation, distribution, adjustments, finalize).
- `backend/test/evaluation-workflow-state-machine.test.ts` (17 tests covering state transitions).
- `backend/test/evaluation-kpi-manual-override.test.ts` (12 tests covering override validation).
- `backend/test/kpi-relationship.test.ts` (7 tests covering relationship creation and cycle detection).
- `backend/test/auth.module.test.ts` (17 tests covering JWT auth, signup, login, refresh).
- `frontend/src/features/calibration/__tests__/CalibrationPage.test.tsx` & `CalibrationComponents.test.tsx` (14 component/page tests).

#### Patterns to Reuse:
- `withAuditedTransaction(pool, auditService, async (client, audit) => ...)`: Transaction management ensuring business mutation and audit record are committed atomically in the exact same database transaction.
- `sendSuccess(res, 200, message, data)` and `sendFailure(res, status, message, code, field, details)`: Standardized API response envelope conforming to `BACKEND_NODE_RULES §4`.
- `AppError(status, code, message)` / `Conflict(message, code)` / `Unprocessable(message, code)` / `Forbidden(message, code)`: Domain error classes handled by global error middleware.
- `SELECT ... FOR UPDATE`: Row-level locking for concurrent workflow transitions, cycle locks, and session finalization.
- Supertest with in-memory or PostgreSQL test harness for end-to-end integration and concurrency testing.

## Inputs Reviewed
- All backend modules, migrations, schemas, controllers, and test suites.
- Frontend calibration and evaluation components.

## Actions and Evidence
- Executed `npm test` in backend (46 passed, 535 passed).
- Executed `npm test` in frontend (29 passed, 115 passed).
- Inspected repository methods, locking gaps, and authorization points.

## Changes Made
- None.

## Decisions and Rationale
- Reuse existing `withAuditedTransaction` and `withTransaction` helpers rather than inventing new transaction wrappers.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis.
