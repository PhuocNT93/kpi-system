# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

1. **What:** Add PostgreSQL migration for `pg_trgm`, immutable Vietnamese diacritics unaccent function, GIN trigram indexes, and filter B-tree indexes.
   **Where:** `backend/migrations/1788926000014_add_employee_search_trgm_and_indexes.ts`
   **Why:** Required for performant database-side fuzzy matching on Vietnamese names with and without diacritics (e.g., `Nguyễn` vs. `Nguyen`), typo tolerance, and fast filtering across department, role, and job level columns. Includes a reversible `down` migration.
   **Tests:** Migration execution check and rollback verification in migration test suite.

2. **What:** Implement Employee Search query service and repository methods with multi-filter AND semantics, evaluation cycle/status join deduplication (`EXISTS` clause), and service-layer RBAC scoping.
   **Where:**
   - `backend/src/modules/employee/domain/employee.repository.ts`
   - `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`
   **Why:** Powers `GET /employees/search` using database-side filtering and pagination without loading records into memory, while strictly bounding results to actor scope (`EMPLOYEE` -> self, `MANAGER` -> managed team(s), `HR_ADMIN`/`SYSTEM_ADMIN` -> organization).
   **Tests:** Unit and integration tests for multi-filter search, Vietnamese diacritics fuzzy matching, evaluation join deduplication, pagination, and RBAC negative cases.

3. **What:** Implement Employee KPI Summary read service and repository queries returning persisted historical evaluation data, breakdown, evidence, comments, rationales, reviewer, and explicit `official_score_field`.
   **Where:**
   - `backend/src/modules/evaluation/application/services/evaluation.service.ts`
   - `backend/src/modules/evaluation/domain/repositories.interface.ts`
   - `backend/src/modules/evaluation/infrastructure/postgres-evaluation.repository.ts`
   **Why:** Implements `GET /employees/:id/kpi-summary`. Strictly reads persisted evaluation and snapshot records without recalculating scores or overwriting historical snapshots with live criteria/templates. Explicitly identifies the official score field (`"overall_weighted_score"`).
   **Tests:** Integration tests verifying exact JSON contract, persisted scores, `official_score_field`, snapshot immutability regression test, and RBAC 403/404 handling.

4. **What:** Create request/response DTOs with Zod runtime validation, controllers, and router integration for both endpoints.
   **Where:**
   - `backend/src/modules/employee/api/employee-search.dto.ts`
   - `backend/src/modules/employee/api/employee-kpi-summary.dto.ts`
   - `backend/src/modules/employee/api/employee.controller.ts`
   - `backend/src/modules/employee/api/employee.router.ts`
   **Why:** Exposes `GET /employees/search` and `GET /employees/:employeeId/kpi-summary` with runtime query/path parameter validation, standard response envelope (`{ success, message, data, meta }`), and error mapping (400, 401, 403, 404). Route order ensures `/employees/search` precedes `/employees/:employeeId`.
   **Tests:** Controller unit tests and supertest API integration tests.

5. **What:** Document both endpoints in OpenAPI / Swagger specification.
   **Where:** `backend/src/config/swagger.ts`
   **Why:** Mandatory deliverable ensuring complete documentation of request parameters, pagination, response envelope, `official_score_field`, and error responses.
   **Tests:** Swagger generation and schema validation check.

6. **What:** Implement frontend typed API clients, domain models, and TanStack Query hooks.
   **Where:**
   - `frontend/src/features/organization/api/employee-search.api.ts`
   - `frontend/src/features/organization/hooks/useEmployeeSearch.ts`
   - `frontend/src/features/evaluation/api/employee-kpi-summary.api.ts`
   - `frontend/src/features/evaluation/hooks/useEmployeeKpiSummary.ts`
   **Why:** Provides type-safe data fetching with proper caching and parameter-inclusive query keys (`employeeKeys.search(filters)` and `employeeKeys.kpiSummary(employeeId, cycleId)`), converting wire `snake_case` to frontend `camelCase` once at the boundary.
   **Tests:** Hook and mapper unit tests.

7. **What:** Create the Employee Search Page UI with multi-filter inputs, debounced free-text search, pagination, loading/empty/error states, and dark mode support.
   **Where:**
   - `frontend/src/features/organization/pages/EmployeeSearchPage.tsx`
   - `frontend/src/features/organization/components/EmployeeSearchFilterBar.tsx`
   - `frontend/src/features/organization/components/EmployeeSearchTable.tsx`
   **Why:** Provides the requested search UX: combines free-text `q` (debounced 300ms) with dynamic dropdown filters (Department, Team, Role, Job Level, Manager, Cycle, Status), empty state with reset, and action to navigate to KPI summary.
   **Tests:** Component tests for filter combination, debounced input, reset filters, loading, empty, and 403 states.

8. **What:** Create the Employee KPI Summary Page UI with header, official vs. reference score distinction, KPI table, and detail drawer.
   **Where:**
   - `frontend/src/features/evaluation/pages/EmployeeKpiSummaryPage.tsx`
   - `frontend/src/features/evaluation/components/KpiSummaryScoreCard.tsx`
   - `frontend/src/features/evaluation/components/KpiSummaryTable.tsx`
   - `frontend/src/features/evaluation/components/KpiSummaryDetailDrawer.tsx`
   **Why:** Displays the persisted evaluation snapshot, unmistakably highlighting the official score based on `official_score_field` without calculating scores on the client, and renders measurement, evidence, comment, rationale, reviewer, and relationship snapshots in both light and dark mode.
   **Tests:** Component tests verifying official score badge display, KPI detail expansion, evidence links, empty KPI handling, and read-only behavior.

9. **What:** Update routing and navigation sidebar to include Employee Search and KPI Summary routes.
   **Where:**
   - `frontend/src/App.tsx`
   - `frontend/src/shared/layout/Sidebar.tsx`
   **Why:** Integrates the new screens into the application layout with role-based navigation and deep linking support (`/admin/employees/search` and `/admin/employees/:id/kpi-summary`).
   **Tests:** Route rendering and navigation unit tests.

## Inputs Reviewed
- Steps 0 to 3 outputs and architectural constraints

## Actions and Evidence
- Decomposed implementation into 9 traceable work items.

## Changes Made
- Documented implementation plan.

## Decisions and Rationale
- Sequenced database and backend foundations before frontend to ensure end-to-end integration readiness.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
