# Step 2: Investigate

Status: reconstructed

## Deliverable

## Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/Sequence_Diagrams_System.md`

Relevant Modules and Files:
- Backend:
  - `backend/src/modules/reports/api/reports.controller.ts`
  - `backend/src/modules/reports/api/reports.router.ts`
  - `backend/src/modules/reports/application/reports-query.service.ts`
  - `backend/src/modules/reports/domain/reports.types.ts`
  - `backend/src/modules/reports/infrastructure/postgres-reports.repository.ts`
  - `backend/src/modules/employee/domain/employee-review-status.ts`
  - `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`
  - `backend/src/modules/audit/infrastructure/postgres-audit.repository.ts`
  - `backend/src/api/routes.ts` & `backend/src/app.ts`
- Frontend:
  - `frontend/src/App.tsx`
  - `frontend/src/shared/layout/Sidebar.tsx`
  - `frontend/src/shared/layout/AppLayout.tsx`
  - `frontend/src/shared/auth/auth-context.tsx`
  - `frontend/src/features/reports/`
  - `frontend/src/lib/theme.ts` & `frontend/src/shared/theme/`

Existing Implementation:
- Reporting read models already migrated and established (`employee_evaluation_score_read_model`, `team_evaluation_aggregate_read_model`, `organization_aggregate_read_model`).
- Review cadence logic implemented in `getEmployeeReviewStatus()`.
- Scope checks and IAM authorization middlewares available.
- Sidebar menu already contains `dashboard` item pointing to `/admin/dashboard`.

Existing Tests:
- `backend/test/reports-kpi-summary.test.ts`
- `backend/src/modules/reports/api/reports.controller.test.ts`
- `backend/src/modules/reports/application/reporting-projection.service.test.ts`
- `backend/src/modules/employee/domain/employee-review-status.test.ts`
- `frontend/src/features/reports/pages/*.test.tsx`

Patterns to Reuse:
- Extract actor strictly from `getActorFromContext(req)` or `req.actor`.
- Unified endpoint `GET /api/reports/dashboard` (alias `GET /api/dashboard`).
- Query pre-aggregated read model tables for O(1) reads.
- Reuse `getEmployeeReviewStatus()` for cadence calculations.
- Feature module `features/dashboard/` with TanStack Query.

## Inputs Reviewed
- Database migrations (`1788926000011_create_reporting_read_models.ts`, `1788926000015_add_kpi_summary_dashboard_read_model_fields.ts`).
- Existing `ReportsQueryService` methods and controller.
- Existing frontend route definitions in `App.tsx` and `Sidebar.tsx`.

## Actions and Evidence
- Read controller, router, query service, and repository definitions.
- Confirmed `AppLayout` and `Sidebar` already support a `dashboard` item.

## Changes Made
- None.

## Decisions and Rationale
- Decided to reuse `ReportsQueryService` and `ReportsController` rather than create a separate service, ensuring consistent projection and read-model usage.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
