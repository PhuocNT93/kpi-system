# Step 6: Implementation Report — Review Cadence, Scheduled Job, Dashboard & Regression Suite

**Task Slug:** `review-due-scheduling-dashboard`  
**Timestamp:** 2026-09-24  
**Author:** AI Agent (Antigravity)  
**Status:** Completed & Validated

---

## 1. Summary of Changes

This step implemented end-to-end capabilities across Database, Backend, Frontend, and Automated Regression Test Suites for Review Cadence & Review Due scheduling, strictly complying with the approved plan (`step-4-plan.md`) and test specifications (`step-5-test-cases.md`).

### A. Database Migrations & Indexes
* **File:** `backend/migrations/1791000000002_add_employee_review_due_indexes.ts`
  * Added compound index `idx_employee_employment_status_due_date` on `employee (employment_status, next_review_due_date)` to accelerate daily scheduled jobs and overdue/due status scans.
  * Added compound index `idx_employee_team_employment_status` on `employee (team_id, employment_status)` to optimize manager-scoped filtering.

### B. Backend Domain & Application Services
1. **Pure Domain Calculators:**
   * `backend/src/modules/review-cadence/domain/review-due-calculator.ts`:
     * Calculates `OVERDUE`, `DUE`, `UPCOMING`, `NOT_DUE` statuses.
     * Computes exact integer `daysOverdue` and `daysUntilDue`.
     * Calculates `next_review_due_date` strictly from completion baseline (`last_evaluation_completed_at + interval_months`), completely preventing schedule drift.
     * Unit tests passing: `backend/src/modules/review-cadence/domain/review-due-calculator.test.ts` (9/9 passed).
   * `backend/src/modules/review-cadence/domain/cadence-precedence-resolver.ts`:
     * Pure resolver for 3-tier precedence: `Employee Override > Job Level Default > System Default`.
     * Unit tests passing: `backend/src/modules/review-cadence/domain/cadence-precedence-resolver.test.ts` (9/9 passed).
2. **Review Schedule Baseline Service:**
   * `backend/src/modules/review-cadence/application/review-schedule.service.ts`:
     * `onEvaluationPublished`: Invoked in `publishEvaluation()`; updates `last_evaluation_completed_at` to `publishedAt` and advances `next_review_due_date`.
     * `recalculateEmployeeDueDate`: Recomputes `next_review_due_date` using the completion baseline upon cadence override or Job Level cadence changes, recording transactional audit records.
     * Integrated into `backend/src/modules/evaluation/application/services/evaluation.service.ts`.
3. **Review Due Dashboard & Scoping Service:**
   * `backend/src/modules/review-cadence/application/review-due.service.ts`:
     * `getReviewsDue(actor, filters)`: Implements status filtering (`OVERDUE`, `DUE`, `UPCOMING`, `ALL`), search, pagination, and configurable `lead_time_days` (default 30).
     * Excludes `employment_status IN ('INACTIVE', 'TERMINATED')`.
     * Enforces RBAC scope: `HR_ADMIN` / `SYSTEM_ADMIN` gets full organization scope; `MANAGER` is strictly isolated to `actor.managedTeamIds`.
     * `refreshReviewDueState()`: Querying and refreshing counts for scheduled execution.
4. **Scheduled Job (Daily Cron):**
   * `backend/src/modules/review-cadence/application/review-due-scheduler.ts`:
     * Runs daily via `node-cron` (`0 0 * * *`).
     * Refreshes status without auto-creating evaluation records.
     * Registered in `backend/src/app.ts` lifecycle.
5. **Employee Cadence Override & Audit:**
   * `backend/src/modules/employee/application/employee-cadence.service.ts`:
     * `updateCadenceOverride`: Implements `PATCH /api/employees/:id/review-cadence-override` with `withAuditedTransaction`, reason audit, and immediate due date recalculation.
     * `getEmployeeCadenceInfo`: Implements `GET /api/employees/:id/review-cadence`.
     * Registered in `employee.router.ts`.
6. **Individual Review Cycle Triggering & Validation:**
   * `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`:
     * `createIndividualCycles`: Implements `POST /api/evaluation-cycles/individual`.
     * Manager team authorization check (`UNAUTHORIZED_TEAM`).
     * Prevents duplicate active reviews (`EVALUATION_ALREADY_OPEN`).
     * Emits soft warning (`BATCH_CYCLE_UPCOMING`) when upcoming batch cycle exists within lead time.

### C. Frontend Architecture & User Experience
1. **Types & API Client:**
   * `frontend/src/features/evaluation-cycles/types/review-due.types.ts`: DTOs matching backend contract.
   * `frontend/src/features/evaluation-cycles/api/review-due-api.ts`: API client for `GET /api/reviews/due` and `POST /api/evaluation-cycles/individual`.
   * `frontend/src/features/evaluation-cycles/hooks/useReviewDue.ts`: React Query hooks with cache invalidation.
2. **Review Due Dashboard:**
   * `frontend/src/features/evaluation-cycles/pages/ReviewDueDashboard.tsx`:
     * Status tabs: `Tất cả Cần Review`, `Quá hạn`, `Đến hạn`, `Sắp đến hạn`.
     * Search and team/cadence filters.
     * Summary KPI metric cards.
     * Table columns: Employee info, Team & Level, Effective Cadence with source badges (`Gán Riêng`, `Theo Cấp Bậc`, `Mặc định Hệ thống`), Last Completed Date, Next Due Date, and Status badge.
     * **Strict Anti-Ranking Compliance:** No employee ranking column, no sorting by scores, no top/bottom comparison.
     * Bulk Action Bar and individual "Tạo Evaluation" buttons.
3. **Individual Evaluation Modal:**
   * `frontend/src/features/evaluation-cycles/components/IndividualEvaluationModal.tsx`:
     * Multi-employee pill tags.
     * Template selection (defaults to latest published template).
     * Start/end dates.
     * Inline rendering of soft warnings (`BATCH_CYCLE_UPCOMING`) and conflict alerts.
4. **Review Cadence Management & Employee Override:**
   * `frontend/src/features/organization/pages/ReviewCadencesPage.tsx`: Dedicated page for `/admin/review-cadences` using `ReviewCadenceTable`.
   * `frontend/src/features/organization/components/EmployeeFormModal.tsx`:
     * Integrated `Review Cadence Override` dropdown.
     * Displays backend effective cadence badge.
     * Audit reason input field when changing override.
5. **Navigation & Routes:**
   * Registered `/admin/review-due` and `/admin/review-cadences` in `frontend/src/App.tsx`.
   * Added `Review Due` and `Review Cadences` items in `frontend/src/shared/layout/Sidebar.tsx` for HR_ADMIN, SYSTEM_ADMIN, and `Team Review Due` for MANAGER.
6. **Internationalization (i18n) — Unified Server & localStorage Parity (Exact AUDIT_UI Architecture):**
   * Registered `REVIEW_DUE_UI` in `backend/src/modules/i18n/domain/i18n.types.ts` (`EntityTypeSchema`).
   * Registered `REVIEW_DUE_UI` in `frontend/src/features/i18n/components/entity-translation-constants.ts` (`MASTER_ENTITY_TYPES`).
   * Created DB Migration `backend/migrations/1791000000003_seed_review_due_ui_i18n_translations.ts`:
     * Seeds all UI strings in English (`en`) and Vietnamese (`vi`) with automatic camelCase and snake_case variant support.
   * **Pure `localStorage` Architecture (Removed Redundant Static Dictionaries):**
     * Deleted `review-due-translations.ts`, `dashboard-translations.ts`, and `organization-translations.ts`.
     * Enhanced `useUiTranslation` in `frontend/src/shared/i18n/ui-i18n.ts` with parameter interpolation (`{count}`, `{days}`, `{name}`) and case-folding.
     * All feature hooks (`useAuditI18n`, `useDashboardTranslation`, `useOrganizationTranslation`, `useReviewDueTranslation`) directly query `localStorage` (`kpi_ui_translations`), which is hydrated on login/mount from the database table `i18n_translation`.
   * Integrated into `ReviewDueDashboard.tsx`, `IndividualEvaluationModal.tsx`, and `ReviewCadencesPage.tsx`.
7. **Dark Mode & High Contrast Styling:**
   * Implemented dark/light theme awareness across all components using `useTheme()`.
   * Backgrounds: Dark `#0f172a` (inputs/table headers/nested containers) & `#1e293b` (cards/modals/panels); Light `#ffffff` & `#f8fafc`.
   * Borders: High-contrast slate `#334155` (dark) and `#e2e8f0` (light).
   * Badges: Overdue (red), Due Today (amber), Upcoming (blue), Not Due (slate) with transparent rgba background in dark mode and gentle pastels in light mode.
8. **Multi-Device Responsive Design (Mobile, Tablet, Desktop):**
   * Added dedicated CSS responsive utilities in `frontend/src/index.css`:
     * `.review-due-container`: Fluid padding (`12px 14px` on mobile, `16px 24px` on tablet/desktop).
     * `.review-due-stat-grid`: 1 column (<540px), 2 columns (540px–1024px), 4 columns (>1024px).
     * `.review-due-tabs-bar`: Horizontal touch scrolling (`-webkit-overflow-scrolling: touch`) with no layout breaking.
     * `.review-due-filter-bar`: Flex-wrap layout with stacked inputs on mobile and inline alignment on desktop.
     * `.review-due-desktop-table`: Clean table view displayed on viewport `>= 768px` with horizontal scroll wrapper.
     * `.review-due-mobile-cards`: Compact, mobile-optimized card cards displayed on viewport `< 768px`. Each card displays avatar, employee details, due status, cadence badge, dates, and action button.
     * `.review-due-floating-bar`: Stacked action buttons on mobile, inline floating banner on tablet/desktop.
     * `IndividualEvaluationModal`: Full responsive modal (`width: 95%`, `maxWidth: 680px`, auto-fit date inputs, touch-friendly tap targets).
9. **Documentation:**
   * Created `docs/review-due-scheduling-dashboard/frontend-user-guide.md`.

---

## 2. Validation & Test Coverage

### Automated Test Suites:
1. **`backend/test/historical-evaluation-regression.test.ts` (5/5 passed)**
   * Scenario A: Historical published evaluations maintain strict score and state immutability.
   * Scenario B: Historical criteria snapshots remain untouched.
   * Scenario C: Due date recalculation is schedule-drift free from `last_evaluation_completed_at`.
   * Scenario D: Employee cadence override triggers immediate due date recalculation and audit logging.
   * Scenario E: Concurrency isolation on evaluation publishing.
2. **`backend/test/review-due-scheduling.test.ts` (10/10 passed)**
   * Daily scheduled job execution without evaluation auto-creation.
   * Inactive/Terminated employee exclusion.
   * RBAC scope isolation: HR Admin global scope vs Manager team scope.
   * Manager team restriction on individual evaluation creation.
   * Batch cycle upcoming soft warning detection (`BATCH_CYCLE_UPCOMING`).
   * Conflict prevention for open evaluations (`EVALUATION_ALREADY_OPEN`).
3. **`backend/test/i18n.test.ts` (14/14 passed)**
   * Verified registration and translation resolution for newly added entity type `REVIEW_DUE_UI`.
4. **Frontend Tests & Build:**
   * All 32 test files and 128 tests passed (`vitest run`).
   * `npm run build` in `frontend` (`tsc --noEmit` + `vite build`) completed in 22.59s with **0 errors**.
   * `tsc -p tsconfig.json` in `backend` completed with **0 errors**.

---

## 3. Review Checklist & Guardrails Verification
* [x] **No auto-creation in scheduled job:** Job only recalculates due dates and refreshes read-models.
* [x] **No employee ranking / score sorting:** Dashboard displays urgency solely by `next_review_due_date`.
* [x] **No schedule drift:** Due dates are computed strictly as `last_evaluation_completed_at + interval_months`.
* [x] **RBAC team isolation:** Manager queries and mutations are locked to `actor.managedTeamIds`.
* [x] **Historical immutability:** Published evaluation scores and snapshot criteria remain immutable.
* [x] **i18n parity:** Supports both English and Vietnamese with `REVIEW_DUE_UI` entity type.
* [x] **Dark mode & Responsive layout:** Fully verified on mobile (<768px), tablet (768px-1024px), and desktop (>1024px).

