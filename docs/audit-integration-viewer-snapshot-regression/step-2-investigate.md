# Step 2: Investigate

Status: reconstructed

## Deliverable

## Investigation

### Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/Sequence_Diagrams_System.md`

### Relevant Modules and Files:
- Backend Audit Module: `backend/src/modules/audit/` (`audit.domain.ts`, `audit.repository.ts`, `postgres-audit.repository.ts`, `audit.service.ts`, `audit-transaction.ts`, `audit.controller.ts`, `audit.router.ts`, `audit_log_append_only` migration)
- Backend Evaluation / Scoring / Snapshot: `backend/src/modules/evaluation/` (`evaluation.service.ts`, `scoring-engine.ts`, `evaluation-cycle-opening.service.ts`, `add_scoring_pipeline_snapshots` migration)
- Frontend Audit Module: `frontend/src/features/audit/` (`audit-api.ts`, `audit-types.ts`, `audit-keys.ts`, `useAuditLogs.ts`, `AuditLogPage.tsx`)
- Frontend Evaluation Detail: `frontend/src/features/evaluation/pages/EvaluationDetailPage.tsx`

### Existing Implementation:
- Audit service `AuditService.record(tx, params)` and `withAuditedTransaction` exist and are already used across core evaluation and cycle services.
- `audit_log` table is protected by PostgreSQL trigger against UPDATE and DELETE.
- `GET /api/audit-logs` endpoint exists and enforces role checking.
- Frontend has existing `AuditLogPage.tsx`. User specifically noted preserving the existing screen.
- Evaluation item snapshot columns exist in Postgres and are populated during cycle opening; scoring engine consumes these snapshot columns.

### Existing Tests:
- `backend/src/modules/audit/application/audit.service.test.ts`
- `backend/test/security-cross-module.test.ts`
- `backend/test/calibration.test.ts`
- `backend/test/evaluation-publish-lock.test.ts`

### Patterns to Reuse:
- `withAuditedTransaction` in `audit-transaction.ts`
- Response envelope in `http-response.ts`
- TanStack Query key factory `auditKeys.list(filters)`
- Existing UI theme tokens

## Inputs Reviewed
- Codebase files in `backend/src/modules/audit`, `backend/src/modules/evaluation`, `frontend/src/features/audit`
- Existing migration files

## Actions and Evidence
- Grepped audit usage in backend and frontend.
- Inspected `AuditLogPage.tsx` and noted existing UI structure.
- Inspected evaluation snapshot creation and scoring resolution.

## Changes Made
- None.

## Decisions and Rationale
- Build on top of existing `AuditLogPage.tsx` rather than recreating it from scratch.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
