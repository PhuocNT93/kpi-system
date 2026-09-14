# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Define API DTOs, Validation (Zod), and Swagger Documentation
   **Where:** `backend/src/modules/reports/api/reports.dto.ts` and `backend/src/config/swagger.ts`
   **Why:** To ensure incoming requests (filters, pagination, `cycleId`) are strictly validated and to fulfill the requirement of adding APIs to Swagger.
   **Tests:** DTO validation unit tests.

2. **What:** Enforce RBAC in Reports Router & Controller
   **Where:** `backend/src/modules/reports/api/reports.router.ts` and `reports.controller.ts`
   **Why:** Apply `authorize` middleware to restrict access: `/employees/:employeeId` (SELF), `/teams/:teamId` (TEAM), and `/organization` (ORGANIZATION).
   **Tests:** Integration tests verifying 403 Forbidden for out-of-scope access.

3. **What:** Implement KPI Team and KPI Trend APIs (Cross-cycle matching)
   **Where:** `backend/src/modules/reports/application/reports-query.service.ts` and `infrastructure/postgres-reports.repository.ts`
   **Why:** To provide KPI aggregates for a team and compare KPIs across cycles. Matching will be strictly based on `kpi.code`, classifying as MATCHED, NEW, or REMOVED. The queries will target the existing read models exclusively.
   **Tests:** Deterministic cross-cycle matching test ensuring renamed KPIs with the same code remain MATCHED.

4. **What:** Standardize Controller Responses and `data_as_of`
   **Where:** `backend/src/modules/reports/api/reports.controller.ts`
   **Why:** Ensure all endpoints use `sendSuccess` or `sendCollection` correctly, and expose the `last_refreshed_at` from the read models as `data_as_of`.
   **Tests:** E2E/Integration tests checking the API envelope.

5. **What:** Typed API Client and TanStack Query Hooks
   **Where:** `frontend/src/features/reports/api/reports.api.ts`, `hooks/use-reports.ts`, `types/reports.types.ts`
   **Why:** Add missing API calls (`fetchTeamKpiReport`, `fetchKpiTrend`) and create custom React hooks (`useEmployeeReport`, etc.) with proper query keys.
   **Tests:** Unit tests mocking the API client.

6. **What:** Reusable Reporting UI Components
   **Where:** `frontend/src/features/reports/components/` (ScoreCard, CompletionRateCard, KpiBreakdown, KpiTrendTable, DataAsOf)
   **Why:** To build the dashboard UI in a modular way with built-in loading (skeletons), error, empty, and permission states. Employee ranking will explicitly be omitted.
   **Tests:** Component tests for rendering different states (loading, error, empty).

7. **What:** Implement Dashboard Pages
   **Where:** `frontend/src/features/reports/pages/` (EmployeeReportPage, TeamReportPage, OrganizationReportPage)
   **Why:** Assemble the components into the final role-specific dashboards.
   **Tests:** Page-level rendering tests.
