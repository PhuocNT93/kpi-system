# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/reports-module.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`

Relevant Modules and Files:
- **Backend:**
  - `backend/src/modules/reports/api/reports.controller.ts`
  - `backend/src/modules/reports/api/reports.router.ts`
  - `backend/src/modules/reports/application/reports-query.service.ts`
  - `backend/src/modules/reports/infrastructure/postgres-reports.repository.ts`
  - `backend/src/modules/reports/domain/reports.types.ts`
  - `backend/src/modules/iam/presentation/authorize.middleware.ts`
- **Frontend:**
  - `frontend/src/features/reports/api/reports.api.ts`
  - `frontend/src/features/reports/types/reports.types.ts`
  - `frontend/src/features/reports/hooks/use-reports.ts` (to be created/updated)

Existing Implementation:
- Read-model tables (`employee_evaluation_score_read_model`, `employee_kpi_score_read_model`, `team_evaluation_aggregate_read_model`, `team_kpi_aggregate_read_model`, `organization_aggregate_read_model`) and the projection service to populate them are already implemented.
- `ReportsController`, `ReportsQueryService`, and `PostgresReportsRepository` have basic implementations for Employee, Team, and Organization reports but lack RBAC enforcement, query DTO validation, filters, and pagination.
- Missing endpoints for `GET /reports/kpi/team/:teamId` and `GET /reports/kpi/trend` (along with the cross-cycle KPI matching logic).
- Frontend has the `reports.types.ts` and `reports.api.ts` initialized, but the UI components (ScoreCard, KpiBreakdown, KpiTrendTable, Dashboards) are completely missing.

Existing Tests:
- `backend/src/modules/reports/api/reports.controller.test.ts`
- `backend/src/modules/reports/application/reporting-projection.service.test.ts`
- Need to expand these to include RBAC, filtering, the new KPI endpoints, and cross-cycle matching rules.
- Frontend tests for reports are missing and must be added.

Patterns to Reuse:
- **API Envelope:** `sendSuccess` and `sendCollection` from `backend/src/api/http-response.ts`.
- **RBAC:** `authorize` middleware from `backend/src/modules/iam/presentation/authorize.middleware.ts` using `AuthorizationScope`.
- **Error Handling:** `AppError` and standard Express `NextFunction`.
- **Frontend API Client:** Existing `getApi` pattern with `camelize` transformer.
- **Frontend State:** TanStack Query (`useQuery`) for fetching data with query keys containing all relevant filters.
- **Frontend UI:** Existing design system components (if any) for tables, cards, loading states, and error states.
