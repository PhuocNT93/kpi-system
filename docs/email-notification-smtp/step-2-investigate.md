# Step 2: Investigate

Status: reconstructed from approved response

## Deliverable

## Investigation

### Relevant Documents
- `docs/LLD_Employee_Performance_Evaluation_System.md` (mục 21.2, 7-8, 10.8, 10.10, 18, 21, 21.1, 27, 28)
- `docs/BACKEND_FASTAPI_RULES.md` & `docs/FRONTEND_REACT_RULES.md`

### Relevant Modules and Files
- Backend:
  - New module: `backend/src/modules/notification/` (`domain/`, `infrastructure/`, `application/`, `api/`, `notification.module.ts`)
  - Integration touchpoints:
    - `evaluation-cycle-opening.service.ts` (`CYCLE_OPENED`)
    - `evaluation.service.ts` (`SELF_SUBMITTED`, `MANAGER_SUBMITTED`, `CORRECTION_REQUESTED`, `RESULT_PUBLISHED`)
    - `calibration.service.ts` (`SCORE_ADJUSTED`)
    - `evaluation-cycle.service.ts` (`CYCLE_LOCKED`)
    - `csv-import.service.ts` (`IMPORT_COMPLETED`)
    - Review due reminder runner (`REVIEW_DUE_REMINDER`)
  - Existing reusable services:
    - `i18n.service.ts` & `i18n_translation` table
    - `audit.service.ts` & `audit_log` table
    - `audit-retention.service.ts` (batched purge pattern)
    - `transaction.ts` (`withTransaction`)
  - Migrations: `backend/migrations/`
- Frontend:
  - New feature: `frontend/src/features/notifications/` (`pages/`, `api/`, `components/`)
  - `frontend/src/App.tsx` (Route and sidebar registration)
  - Reused UI: `EntityTranslationEditor.tsx`, Table and Filter patterns from `ImportHistoryPage.tsx` and `AuditLogPage.tsx`

### Existing Implementation
- PostgreSQL access via `pg.Pool` and `withTransaction` with `TransactionClient`.
- User account `app_user` with `id`, `email`, `name`, `locale`.
- i18n resolution via table `i18n_translation` with generic fallback (`targetLocale -> en -> default`).
- Log retention via batch deletions in `AuditRetentionService`.
- 515 passing backend tests.

### Existing Tests
- 515 passing unit and integration tests across 45 test suites running via `vitest run --run`.

### Patterns to Reuse
- Transactional Outbox write within business `TransactionClient`.
- `I18nService` resolution for templates.
- Audit logging for template config changes.
- Batched retention deletion.
- Standard RBAC actor and route middleware guards.

## Inputs Reviewed
- Backend module structure, existing migrations, services, types, controllers, and tests.
- Frontend directory structure, components, navigation, and API patterns.

## Actions and Evidence
- Ran `vitest run --run`: 515 passed, 30 skipped.
- Inspected `app_user`, `i18n_translation`, `audit_log`, `employee`, and `evaluation` tables.
- Inspected event triggers in `evaluation.service.ts`, `evaluation-cycle.service.ts`, `calibration.service.ts`, and `csv-import.service.ts`.

## Changes Made
- Documented findings, integration points, and reusable patterns.

## Decisions and Rationale
- Chose modular monolith placement at `backend/src/modules/notification/` to match all other modules.
- Reused `withTransaction` passing `client: TransactionClient` for atomic outbox write.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis.
