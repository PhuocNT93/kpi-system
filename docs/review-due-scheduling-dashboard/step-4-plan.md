# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

1. **What:** Create database migration for composite and scoped indexes on `employee`.
   **Where:** `backend/migrations/1791000000002_add_employee_review_due_indexes.ts`
   **Why:** Optimize queries for active employees (`employment_status NOT IN ('INACTIVE', 'TERMINATED')`), `next_review_due_date <= today + lead_time_days`, and team scoping without full-table scans.
   **Tests:** Migration up and down execution verification.

2. **What:** Implement Review Due domain calculator and status resolver.
   **Where:** `backend/src/modules/review-cadence/domain/review-due-calculator.ts` and `review-due.types.ts`
   **Why:** Encapsulate pure domain rules: `next_review_due_date < today` $\rightarrow$ `OVERDUE` (positive `days_overdue`), `= today` $\rightarrow$ `DUE`, `<= today + lead_time` $\rightarrow$ `UPCOMING`, and date math from baseline completion date.
   **Tests:** Unit tests covering status boundaries, lead time variations, zero lead time, and leap years in `backend/test/review-due-calculator.test.ts`.

3. **What:** Implement `ReviewDueService` and configuration handling.
   **Where:** `backend/src/modules/review-cadence/application/review-due.service.ts`
   **Why:** Handle `GET /reviews/due` business logic with DB-level filtering (inactive/terminated excluded), single SQL join (no N+1), configurable `lead_time_days` and `batch_cycle_lead_time_weeks`, pagination, and scope enforcement (Manager sees own teams only, HR sees organization).
   **Tests:** Service tests for manager vs HR scope, pagination, status filtering, and inactive exclusions in `backend/test/review-due-service.test.ts`.

4. **What:** Implement `ReviewDueScheduler` background task.
   **Where:** `backend/src/modules/review-cadence/application/review-due-scheduler.ts`
   **Why:** Run daily scheduled job via `node-cron` to refresh review due state/read-model flags without auto-creating evaluations.
   **Tests:** Scheduler tests verifying cron execution and absence of evaluation creation.

5. **What:** Implement Employee Cadence Override API with immediate due-date recalculation and transactional audit.
   **Where:** `backend/src/modules/employee/application/employee-cadence.service.ts`, `backend/src/modules/employee/api/employee.controller.ts`, and `backend/src/modules/employee/employee.routes.ts` (`PATCH /api/employees/:id/review-cadence-override`)
   **Why:** Allow HR to update cadence override with optional reason, recalculating `next_review_due_date = last_evaluation_completed_at + effective_cadence.interval_months` (never `today + interval`), logging transactional audit.
   **Tests:** Integration tests verifying override set, override cleared, baseline preservation, audit log entry, and 403 on non-HR actors.

6. **What:** Centralize Evaluation PUBLISHED review schedule update (`onEvaluationPublished`).
   **Where:** `backend/src/modules/review-cadence/application/review-schedule.service.ts` and invoked from `backend/src/modules/evaluation/application/services/evaluation.service.ts` (`publishEvaluation`)
   **Why:** Ensure every published evaluation updates `last_evaluation_completed_at` to the actual published date and recalculates `next_review_due_date` using the effective cadence within the same transaction.
   **Tests:** Integration test verifying publish updates both fields on employee and emits audit events.

7. **What:** Implement Individual Evaluation bulk trigger endpoint (`POST /evaluation-cycles/individual`).
   **Where:** `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`, `evaluation-cycle.controller.ts`, and `evaluation-cycle.router.ts`
   **Why:** Support bulk creation from Review Due Dashboard reusing existing cycle opening/snapshot logic, validating scope per employee, returning hard conflicts (`EVALUATION_ALREADY_OPEN`), and soft warnings (`BATCH_CYCLE_UPCOMING` within $N$ weeks).
   **Tests:** Bulk trigger tests covering success, single and multi-employee, manager scope validation, already open evaluation conflict, upcoming batch warning, and partial results.

8. **What:** Register `GET /api/reviews/due` route and wire dependencies into app.
   **Where:** `backend/src/modules/review-cadence/api/review-due.controller.ts`, `review-cadence.router.ts`, `review-cadence.module.ts`, and `backend/src/app.ts`
   **Why:** Expose protected review due endpoint returning fully resolved data contracts.
   **Tests:** API route tests verifying 200 with data envelope, 401 unauthenticated, 403 for unauthorized roles/cross-team attempts.

9. **What:** Implement Review Due Dashboard UI.
   **Where:** `frontend/src/features/evaluation-cycles/pages/ReviewDueDashboard.tsx`, `frontend/src/features/evaluation-cycles/components/ReviewDueFilters.tsx`, `IndividualEvaluationModal.tsx`, and `frontend/src/features/evaluation-cycles/api/review-due-api.ts`
   **Why:** Provide HR/Admin and Managers an actionable dashboard with status tabs, scope-aware filters, multi-select, bulk create action, inline dedup warnings, and NO employee ranking.
   **Tests:** Frontend unit/integration tests with mock responses covering filters, selection, bulk trigger modal, warning banner, and error handling.

10. **What:** Add Review Cadence Management route and enhance Employee Cadence Override UI in frontend.
    **Where:** `frontend/src/App.tsx`, `frontend/src/shared/layout/Sidebar.tsx`, `frontend/src/features/organization/pages/ReviewCadencesPage.tsx`, and `frontend/src/features/organization/components/EmployeeFormModal.tsx`
    **Why:** Provide dedicated `/admin/review-cadences` navigation for HR/Admin, and replace frontend-side date math in Employee modal with backend effective cadence rendering and override selection.
    **Tests:** Frontend tests verifying route protection, cadence list CRUD, and employee override modal interactions.

11. **What:** Build Historical Evaluation Regression & Concurrency test suite.
    **Where:** `backend/test/historical-evaluation-regression.test.ts` and `backend/test/cadence-concurrency.test.ts`
    **Why:** Formally prove Scenarios A–E (cadence, job level, override, or system default changes never mutate published evaluation scores or snapshots) and verify concurrent publish/override requests handle locking cleanly.
    **Tests:** Automated regression and concurrency test execution.

## Inputs Reviewed

- Step 1 (Understand), Step 2 (Investigate), Step 3 (Impact Analysis).

## Actions and Evidence

- Created step-by-step implementation plan with file locations, rationale, and planned tests.

## Changes Made

- Documented implementation plan.

## Decisions and Rationale

- Planned modular implementation respecting architecture boundaries.

## Risks / Blockers

- None.

## Next Step

- Step 5: Define Test Cases
