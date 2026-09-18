# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

### 1. Audit Integration Framework (Backend)
- Pass `auditModule.auditService` to `createConfigurationModule` in `backend/src/app.ts`.
- Wire `AuditService` into `TemplateService` and `CriterionService` to log central audits on publish/create/update in active transaction.
- Confirm transactional atomicity across all business writers (`withAuditedTransaction`).
- Create `backend/test/audit-transactional.test.ts` covering test cases 1 to 4.

### 2. Audit Viewer (Backend & Frontend)
- Ensure server-side filters and strict RBAC enforcement in `AuditService.getLogs()` and `PostgresAuditRepository.findMany()`.
- Create `backend/test/audit-rbac.test.ts` verifying negative and positive RBAC rules.
- Enrich `frontend/src/features/audit/` by adding modular components:
  - `AuditDetailModal.tsx` (read-only diff modal)
  - `AuditFilterBar.tsx`
  - `AuditTable.tsx`
- Update `AuditLogPage.tsx` with detail modal and 403 unauthorized state.

### 3. Scoring Regression & Snapshot Contract (Backend & Frontend)
- Implement `backend/test/regression/scoring-snapshot-regression.test.ts` testing the complete 9-point matrix.
- Implement `frontend/src/features/evaluation/pages/__tests__/EvaluationDetailSnapshotRegression.test.tsx` verifying UI renders snapshot data.

### Files to Modify / Create:
- Backend: `backend/src/app.ts`, `backend/src/modules/configuration/configuration.module.ts`, `backend/src/modules/configuration/application/services/template.service.ts`, `backend/src/modules/configuration/application/services/criterion.service.ts`, `backend/test/audit-transactional.test.ts`, `backend/test/audit-rbac.test.ts`, `backend/test/regression/scoring-snapshot-regression.test.ts`.
- Frontend: `frontend/src/features/audit/components/AuditDetailModal.tsx`, `frontend/src/features/audit/components/AuditFilterBar.tsx`, `frontend/src/features/audit/components/AuditTable.tsx`, `frontend/src/features/audit/pages/AuditLogPage.tsx`, `frontend/src/features/evaluation/pages/__tests__/EvaluationDetailSnapshotRegression.test.tsx`.

## Inputs Reviewed
- Implementation strategy, architectural constraints, and test requirements.

## Actions and Evidence
- Structured step-by-step implementation order adhering to backend and frontend rules.

## Changes Made
- None.

## Decisions and Rationale
- Minimal changes touching only required integration points without disrupting established patterns.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
