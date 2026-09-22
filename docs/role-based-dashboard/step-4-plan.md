# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

1. Backend Application Layer — Dashboard Service (`ReportsQueryService`):
   - Extend `ReportsQueryService` with `getRoleBasedDashboard(actor, cycleId)`.
   - Implement role-specific aggregations: Employee (scores, trend, breakdown, strengths/weaknesses, review cadence), Manager (team aggregates, workflow distribution, anonymous score histogram, team review due, attention items), HR/Admin (organization overview, workflow bottlenecks, department/team list, review due matrix), System Admin (operational counts, audit event aggregates).
   - Attach metadata (`role`, `scope`, `cycle`, `last_updated_at`).

2. Backend Controller, DTO & Router Integration:
   - Define `getDashboardQuerySchema` in `reports.dto.ts`.
   - Add `getDashboard` in `reports.controller.ts`.
   - Register route in `reports.router.ts` and alias in `routes.ts`.

3. Backend Automated Tests:
   - Create `backend/test/reports-dashboard.test.ts` covering authorization, role scoping, aggregations, review due, and strict anti-ranking checks.

4. Frontend Types & Data Fetching Hook:
   - Define TypeScript interfaces in `features/dashboard/types/dashboard.types.ts`.
   - Implement `fetchDashboard` in `features/dashboard/api/dashboard.api.ts`.
   - Implement `useDashboard` TanStack Query hook in `features/dashboard/hooks/useDashboard.ts`.

5. Frontend Shared Dashboard Components (`features/dashboard/components/`):
   - `DashboardHeader.tsx`, `SummaryCard.tsx`, `SummaryGrid.tsx`, `ScoreDistributionChart.tsx`, `WorkflowStatusChart.tsx`, `ScoreTrendChart.tsx`, `ReviewDueWidget.tsx`, `AttentionRequiredList.tsx`, `ScoreBreakdownWidget.tsx`, `DashboardSkeleton.tsx`, `DashboardErrorState.tsx`, `DashboardEmptyState.tsx`.

6. Frontend Role-Specific Views & Main Page:
   - `EmployeeDashboardView.tsx`, `ManagerDashboardView.tsx`, `HrDashboardView.tsx`, `SystemAdminDashboardView.tsx`, and `DashboardPage.tsx`.

7. Frontend Routing & Navigation Wiring:
   - Register `/admin/dashboard` in `App.tsx` and update `SmartHomeRedirect` and `ADMIN_PAGE_TITLES`.

8. Frontend Automated Tests:
   - Create `features/dashboard/pages/DashboardPage.test.tsx` testing rendering per role, loading skeletons, empty states, 403 handling, and anti-ranking compliance.

9. Build, Lint & Final Verification:
   - Run vitest on backend and frontend; run typecheck; verify zero regression.

Dependencies:
- Existing read model tables: `employee_evaluation_score_read_model`, `team_evaluation_aggregate_read_model`, `organization_aggregate_read_model`.
- Existing review cadence module: `backend/src/modules/employee/domain/employee-review-status.ts`.
- Existing UI theme & tokens: `frontend/src/lib/theme.ts`, `frontend/src/shared/theme/`.

Verification Strategy:
- Backend unit and integration tests with supertest and vitest.
- Frontend component tests with vitest and testing-library.
- Explicit programmatic assertions for zero ranking keys in responses and UI.

## Inputs Reviewed
- Step 1 Understand, Step 2 Investigate, Step 3 Impact Analysis

## Actions and Evidence
- Structured implementation into 9 ordered increments across backend and frontend.

## Changes Made
- None.

## Decisions and Rationale
- Designed modular frontend role views within `features/dashboard/` for clean separation of concerns and maintainability.

## Risks / Blockers
- None.

## Next Step
- Step 5: Test Cases
