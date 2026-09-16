# Step 2: Investigate

Status: reconstructed

## Deliverable

## Investigation

### Relevant Documents
- LLD_Employee_Performance_Evaluation_System.md: Section 4 (Reporting and Read Models), Section 3 (Evaluation Scoring and Lifecycle), Section 7 (RBAC Scoping Rules).
- BACKEND_NODE_RULES.md: Modular Monolith rules, Application Service authorization, Controller DTO validation & standard envelope mapping.
- FRONTEND_REACT_RULES.md: React 18, TanStack Query for server state, local UI state, Lumina design system tokens, accessible visualizations, read-only state handling.

### Relevant Modules and Files
- Backend Reporting: `reports.router.ts`, `reports.controller.ts`, `reports.dto.ts`, `reports-query.service.ts`, `reports.types.ts`, `postgres-reports.repository.ts`, `reporting-projection.service.ts`.
- Backend Employee: `employee.controller.ts`, `postgres-employee.repository.ts`, `employee-search.dto.ts`.
- Migrations: `1788926000011_create_reporting_read_models.ts`, `1788926000013_add_kpi_import_comment_evidence.ts`, `1788926000014_add_employee_search_trgm_and_indexes.ts`.
- Frontend: `features/reports/employee-kpi-summary/` (api, hooks, components, pages), `App.tsx`, `Sidebar.tsx`.

### Existing Implementation
- `employee_evaluation_score_read_model` and `employee_kpi_score_read_model` already exist and are maintained by `reporting-projection.service.ts`.
- Need migration to add `evaluation_item_id`, `display_order`, and `measurement` to `employee_kpi_score_read_model` so the read-model completely covers the dashboard contract without OLTP queries.
- `GET /employees/search` is implemented in `employee` module with `pg_trgm` and Vietnamese diacritics fuzzy search.

### Existing Tests
- Backend test suite passes: 381 passed, 30 skipped.
- Frontend test suite passes: 80 passed.
- Backend and frontend `tsc --noEmit` pass with 0 errors.

### Patterns to Reuse
- Controller-Service Envelope Pattern (`sendSuccess`, `sendFailure`).
- Actor scoping via `getActorFromContext(req)`.
- Read-model SQL queries in `PostgresReportsRepository`.
- TanStack Query cache keys and Lumina design tokens.

## Inputs Reviewed
- Backend codebase: `backend/src/modules/reports/`, `backend/src/modules/employee/`, migrations.
- Frontend codebase: `frontend/src/features/reports/`, `frontend/src/features/organization/`, `frontend/src/features/evaluation/`.
- Automated test suites.

## Actions and Evidence
- Ran `npm test -- --run` in backend (381 passed).
- Ran `npm test -- --run` in frontend (80 passed).
- Ran `npx tsc --noEmit` on backend and frontend (0 errors).

## Changes Made
- None (investigation only).

## Decisions and Rationale
- Extend `employee_kpi_score_read_model` with `evaluation_item_id`, `display_order`, and `measurement` via migration so dashboard queries stay entirely on read models.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
