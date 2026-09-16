# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

### Investigation

**Relevant Documents**:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Sections 3.1 Role Hierarchy, 8 Calibration Module, 10.5 Calibration DB schema, 13 Calibration vs Scoring, 14 Auto-publish, 16 API endpoints, 17 RBAC matrix)
- `docs/Sequence_Diagrams_System.md` (Section 6: Review -> Calibration -> Approve -> Auto-Publish)
- `docs/BACKEND_NODE_RULES.md` (Modular monolith, layered architecture, AppError conventions, audit transaction atomicity, lock invariant)
- `docs/FRONTEND_REACT_RULES.md` (TanStack Query, typed API client, UI theme tokens, state handling, read-only lock behavior)

**Relevant Modules and Files**:
- **Backend Modules**:
  - `backend/src/modules/calibration/domain/calibration.domain.ts` (Types, Zod schemas for session and adjustment)
  - `backend/src/modules/calibration/domain/calibration.repository.ts` (Repository interface)
  - `backend/src/modules/calibration/application/calibration.service.ts` (Calibration business service, transaction boundary, distribution, adjustment, finalization)
  - `backend/src/modules/calibration/infrastructure/postgres-calibration.repository.ts` (PostgreSQL implementation for sessions, adjustments, evaluations query, score update)
  - `backend/src/modules/calibration/api/calibration.controller.ts` & `calibration.router.ts` (HTTP handlers, request parsing, response formatting)
  - `backend/src/api/routes.ts` (Route mounting for `/calibration` and `/calibration-sessions`)
  - `backend/src/api/app-error.ts` (`AppError`, `Conflict`, `Forbidden`, `Locked`, `Unprocessable`)
  - `backend/src/modules/audit/application/audit-transaction.ts` & `audit.domain.ts` (Audited transactions, entity types, actions)
  - `backend/src/modules/evaluation/application/services/evaluation.service.ts` & `evaluation-transition.service.ts` (Evaluation workflow state transitions)
  - `backend/src/modules/evaluation-cycle/domain/evaluation-cycle.types.ts` (`EvaluationCycleStatus` including `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`)
  - `backend/migrations/1724500000001_init_database_schema.ts` (Existing DDL for `calibration_session` and `calibration_adjustment`)
- **Frontend Modules**:
  - `frontend/src/features/calibration/types/calibration-types.ts` (Domain and DTO types)
  - `frontend/src/features/calibration/api/calibration-api.ts` (Centralized typed API client)
  - `frontend/src/features/calibration/hooks/use-calibration.ts` (TanStack Query hooks)
  - `frontend/src/features/calibration/pages/CalibrationPage.tsx` (Main HR/Admin calibration view)
  - `frontend/src/features/calibration/components/CalibrationDistributionChart.tsx` (Distribution visualization and stat cards)
  - `frontend/src/features/calibration/components/CalibrationAdjustmentModal.tsx` (Score adjustment dialog with mandatory reason)
  - `frontend/src/features/calibration/components/CreateSessionModal.tsx` (Session creation dialog)
  - `frontend/src/shared/layout/Sidebar.tsx` & `frontend/src/App.tsx` (Navigation and routing)

**Existing Implementation**:
- Database tables `calibration_session` and `calibration_adjustment` are already created via `1724500000001_init_database_schema.ts`.
- Partial backend calibration module exists on `develop` (`calibration.service.ts`, `postgres-calibration.repository.ts`, `calibration.controller.ts`), but has critical gaps:
  - RBAC: Allows `SYSTEM_ADMIN` to mutate, whereas LLD explicitly restricts calibration mutation to `HR_ADMIN` only (`SYSTEM_ADMIN` is strictly read-only for business evaluation data).
  - Distribution: Computes distribution incorrectly by mixing `finalScore` and `calculatedScore`, lacks `median` calculation, and hardcodes 1-5 rating buckets rather than the 0-100 system scale.
  - Finalize: Only updates session status to `FINALIZED`; does not transition evaluations (`CALIBRATION` -> `APPROVED` -> `PUBLISHED`), does not check cycle lock, and does not return 409 on duplicate finalization.
  - Locking: Inconsistent checks for evaluation lock and cycle lock across adjustment and finalization.
  - Routing: Routes mounted at `/api/calibration/*`, but LLD defines `/api/calibration-sessions/*`.
- Partial frontend components exist, but:
  - `CreateSessionModal` lacks team/department dynamic selectors when selecting `TEAM` or `DEPARTMENT` scope.
  - Finalize dialog lacks clear irreversible confirmation modal and concurrency/lock conflict error presentation.
  - Navigation/routes need strict RBAC protection so non-HR/Admin users cannot access or view calibration controls.

**Existing Tests**:
- `backend/test/evaluation-workflow-state-machine.test.ts` (Status transitions)
- `backend/test/evaluation-review-approval.test.ts` (Approval flow)
- `backend/test/evaluation-publish-lock.test.ts` (Publishing and locking invariants)
- `backend/test/evaluation-cycle-transition.test.ts` (Evaluation cycle lifecycle: `REVIEWING -> CALIBRATION -> APPROVED -> PUBLISHED -> LOCKED`)
- `backend/test/iam.test.ts` (IAM roles and permission checks)

**Patterns to Reuse**:
- Transaction and audit pattern: `withAuditedTransaction(pool, auditService, async (client, audit) => ...)` ensuring zero orphaned audit logs.
- Standard error envelope and domain error classes: `AppError`, `Conflict` (409), `Forbidden` (403), `NotFound` (404), `Unprocessable` (422) with stable error codes (`CALIBRATION_REASON_REQUIRED`, `EVALUATION_LOCKED`, `CALIBRATION_SESSION_ALREADY_FINALIZED`).
- Frontend theme tokens (`COLORS`, `RADII`, `TYPOGRAPHY`) and shared UI primitives (`Button`, `LoadingSpinner`, `EmptyState`).
- TanStack Query cache invalidation keys (`calibrationKeys`).

## Inputs Reviewed
- Database migrations, backend modules, frontend components.

## Actions and Evidence
- Checked `1724500000001_init_database_schema.ts` for calibration tables.
- Inspected existing `calibration.service.ts` and `CalibrationPage.tsx`.

## Changes Made
- None.

## Decisions and Rationale
- Fix identified gaps in existing code rather than creating duplicate files.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis.
