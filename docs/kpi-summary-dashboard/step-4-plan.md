# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

1. **What:** Create a database migration to add `evaluation_item_id`, `display_order`, and `measurement` (JSONB) columns to `employee_kpi_score_read_model`, along with index updates and a reversible `down` function.  
   **Where:** `backend/migrations/1788926000015_add_kpi_summary_dashboard_read_model_fields.ts`  
   **Why:** Allows the Reporting read-model to directly provide complete KPI table data without querying OLTP evaluation tables during dashboard retrieval.  
   **Tests:** Migration execution, rollback validation, and schema verification.

2. **What:** Update `ReportingProjectionService` and `PostgresReportsRepository` to project and query the extended KPI read-model fields, and implement `getEmployeeKpiSummary` and `getEmployeeKpiDetail` query methods.  
   **Where:**
   - `backend/src/modules/reports/domain/reports.types.ts`
   - `backend/src/modules/reports/application/reporting-projection.service.ts`
   - `backend/src/modules/reports/infrastructure/postgres-reports.repository.ts`  
   **Why:** Connects the projection pipeline and repository queries to the read-models according to Modular Monolith and LLD Section 4 rules.  
   **Tests:** `reporting-projection.service.test.ts` and repository query unit tests.

3. **What:** Implement application service logic in `ReportsQueryService` for KPI Summary and KPI Detail Drill-Down with server-side RBAC scoping.  
   **Where:** `backend/src/modules/reports/application/reports-query.service.ts`  
   **Why:** Business logic, RBAC, and score semantics belong strictly in application services, never in Express controllers.  
   **Tests:** Application service unit tests covering scoping, score distinctions, and snapshot immutability.

4. **What:** Add routes, controller methods, Zod query DTOs, and Swagger documentation for `GET /reports/employees/:employeeId/kpi-summary` and `GET /reports/employees/:employeeId/kpi-summary/:evaluationItemId`.  
   **Where:**
   - `backend/src/modules/reports/api/reports.router.ts`
   - `backend/src/modules/reports/api/reports.controller.ts`
   - `backend/src/modules/reports/api/reports.dto.ts`
   - `backend/src/config/swagger.ts`  
   **Why:** Exposes the reporting REST API endpoints using standard API envelopes (`sendSuccess`, `sendFailure`) and validates request parameters.  
   **Tests:** `reports.controller.test.ts` and `test/reports-kpi-summary.test.ts`.

5. **What:** Create frontend types, API clients, and TanStack Query hooks under `features/reports/employee-kpi-summary/`.  
   **Where:**
   - `frontend/src/features/reports/employee-kpi-summary/api/kpi-summary.api.ts`
   - `frontend/src/features/reports/employee-kpi-summary/types/kpi-summary.types.ts`
   - `frontend/src/features/reports/employee-kpi-summary/hooks/useKpiSummary.ts`  
   **Why:** Encapsulates server state cleanly, avoids global store pollution, and ensures strict TypeScript type safety.  
   **Tests:** API client mock tests and query hook tests.

6. **What:** Implement modular frontend dashboard components: `EmployeeSearchBar.tsx`, `EmployeeInfoCard.tsx`, `ScoreSummaryCard.tsx`, `KpiSummaryTable.tsx`, `KpiDetailPanel.tsx`, `KpiRelationshipDiagram.tsx`, with full state handling (Skeleton Loading, Empty, Error, 403 Permission, Read-only).  
   **Where:** `frontend/src/features/reports/employee-kpi-summary/components/`  
   **Why:** Fulfills all UX/UI requirements in Part B of the specification with rich Lumina aesthetics and responsive accessibility.  
   **Tests:** Component unit tests with Vitest and React Testing Library.

7. **What:** Assemble the main dashboard page (`KpiSummaryDashboardPage.tsx`), wire routes in `App.tsx`, and add navigation link in `Sidebar.tsx`.  
   **Where:**
   - `frontend/src/features/reports/employee-kpi-summary/pages/KpiSummaryDashboardPage.tsx`
   - `frontend/src/App.tsx`
   - `frontend/src/shared/layout/Sidebar.tsx`  
   **Why:** Provides seamless end-to-end user navigation with role-appropriate visibility.  
   **Tests:** Page integration tests and navigation smoke tests.

8. **What:** Execute complete automated test suites and verify quality gates across backend and frontend.  
   **Where:**
   - `backend/test/reports-kpi-summary.test.ts`
   - `frontend/src/features/reports/employee-kpi-summary/__tests__/KpiSummaryDashboardPage.test.tsx`  
   **Why:** Guarantees regression-free delivery meeting all 23 acceptance criteria and the repository Definition of Done.  
   **Tests:** Full test execution passing with zero errors.

## Inputs Reviewed
- Steps 1–3 deliverables.
- Project architectural constraints.

## Actions and Evidence
- Structured a step-by-step 8-part implementation plan with clear ownership and locations.

## Changes Made
- None (planning only).

## Decisions and Rationale
- Sequenced database and backend services before frontend components to maintain test-driven progress.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
