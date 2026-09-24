# Step 10 — Final Review & Handoff / Pull Request Preparation

## 1. Pull Request Overview

- **Title**: `feat(review-cadence): add review due scheduling, management UI, and scoped monitoring dashboard`
- **Branch**: `feature/review-due-scheduling-dashboard`
- **Target Branch**: `develop`
- **Issue Reference**: Review Cadence & Review Due Scheduling Epic

---

## 2. Summary of Changes

### A. Database Migrations & Indexes
- [`1791000000002_add_employee_review_due_indexes.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/migrations/1791000000002_add_employee_review_due_indexes.ts): Adds composite indexes on `employee`:
  - `idx_employee_review_due` on `(employment_status, next_review_due_date)`
  - `idx_employee_team_review_due` on `(employment_status, team_id, next_review_due_date)`
- [`1791000000003_seed_review_due_ui_i18n_translations.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/migrations/1791000000003_seed_review_due_ui_i18n_translations.ts): Registers entity type `REVIEW_DUE_UI` and seeds bilingual translations (`en`, `vi`) into `ui_translation`.

### B. Backend Domain & Application Services
- **3-Tier Precedence Resolver** ([`cadence-precedence-resolver.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/review-cadence/domain/cadence-precedence-resolver.ts)): Authoritatively computes effective cadence based on `Employee Override` &rarr; `Job Level Default` &rarr; `System Default`.
- **Drift-Free Review Due Calculator** ([`review-due-calculator.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/review-cadence/domain/review-due-calculator.ts)): Computes `next_review_due_date` strictly from completed baseline `last_evaluation_completed_at + interval_months`.
- **Review Schedule Service** ([`review-schedule.service.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/review-cadence/application/review-schedule.service.ts)): Centralized coordinator with row-level locking (`SELECT ... FOR UPDATE`) and transactional audit logging on evaluation published and cadence override changes.
- **Review Due Scoped Query Service** ([`review-due.service.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/review-cadence/application/review-due.service.ts)): Handles active-only filtering, lead-time querying, and strict RBAC scoping (`HR_ADMIN` / `SYSTEM_ADMIN` global, `MANAGER` team-scoped, `EMPLOYEE` forbidden).
- **Daily Scheduled Job** ([`review-due-scheduler.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/review-cadence/application/review-due-scheduler.ts)): Cron job running daily (`0 0 * * *`) that updates due date states without auto-creating evaluations.
- **Employee Cadence Override** ([`employee-cadence.service.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/employee/application/employee-cadence.service.ts)): Endpoint `PATCH /api/employees/:id/review-cadence-override` with permission enforcement (`HR_ADMIN`, `SYSTEM_ADMIN`) and audit tracking.
- **Individual Evaluation Cycles** ([`evaluation-cycle.service.ts`](file:///c:/Users/phuoc.nt/AI/kpi-system/backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts)): Creates individual cycles for review-due employees with team conflict validation and batch cycle warnings.

### C. Frontend User Interface & Internationalization
- **Pure Dynamic i18n**: Aligned with the `AUDIT_UI` pattern — translations are seeded via database migration, synchronized to `localStorage` (`kpi_ui_translations`), and consumed via `useUiTranslation('REVIEW_DUE_UI')`. Deleted legacy static translation files.
- **Review Due Dashboard** ([`ReviewDueDashboard.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/evaluation-cycles/pages/ReviewDueDashboard.tsx)):
  - KPI summary cards (`Quá hạn`, `Đến hạn hôm nay`, `Sắp đến hạn`, `Tổng cần theo dõi`).
  - Strict anti-ranking compliance (`next_review_due_date ASC NULLS LAST`).
  - Status tabs, search, team filter, cadence filter.
  - Multi-select checkboxes and sticky action bar with evaluation creation tooltip.
  - Responsive layout: desktop data table (`.review-due-desktop-table`) and mobile cards view (`.review-due-mobile-cards`).
- **Individual Evaluation Modal** ([`IndividualEvaluationModal.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/evaluation-cycles/components/IndividualEvaluationModal.tsx)): Modal dialog for initiating individual evaluations with template selector and validation.
- **Employee Form Modal Integration** ([`EmployeeFormModal.tsx`](file:///c:/Users/phuoc.nt/AI/kpi-system/frontend/src/features/organization/components/EmployeeFormModal.tsx)): Added review cadence override dropdown with effective cadence indicator.
- **Theme & Branding Enhancements**:
  - Dark mode contrast fixes for brand logo (`#F8FAFC` / `#94A3B8`) and sidebar collapse toggle.
  - Brand favicon added to `frontend/public/favicon.svg` and linked in `index.html`.

---

## 3. Automated Test & Quality Verification Results

| Quality Check | Execution Command | Result |
|---|---|---|
| **Backend Feature Tests** | `npx vitest run test/historical-evaluation-regression.test.ts test/review-due-scheduling.test.ts src/modules/review-cadence/domain/review-due-calculator.test.ts` | **24/24 PASS** |
| **Backend ESLint** | `npm run lint` in `backend` | **0 errors, 0 warnings** |
| **Backend TypeScript** | `npx tsc -p tsconfig.json` in `backend` | **0 errors** |
| **Frontend Test Suite** | `npm test` in `frontend` | **32/32 suites, 128/128 tests PASS** |
| **Frontend ESLint** | `npm run lint` in `frontend` | **0 errors** |
| **Frontend TypeScript** | `npm run typecheck` in `frontend` | **0 errors** |
| **Frontend Production Build** | `npm run build` in `frontend` | **0 errors (18.36s)** |

---

## 4. Key Guarantees & Constraints Verified

1. **Historical Evaluation Immutability**: Regression test suite guarantees that modifying cadence settings, overriding employee cadences, or deleting cadences never modifies published evaluation scores, evaluation statuses, or frozen criteria snapshots.
2. **Schedule Drift Elimination**: Due date math uses completion baseline `last_evaluation_completed_at + interval_months`, avoiding sliding dates across fiscal years.
3. **Strict Anti-Ranking**: No rank numbers, scores, or competitive comparative sorting exists on the Review Due Dashboard. Sorting is exclusively `next_review_due_date ASC NULLS LAST`.
4. **RBAC Isolation**: Team data is strictly scoped for managers (`managedTeamIds`). Unauthorized cross-team access returns `403 Forbidden`.
5. **No Orphan Audit Logs**: Audit records are committed atomically inside business transactions (`withAuditedTransaction`).

---

## 5. Deployment Instructions

1. **Deploy Backend**:
   - Pull latest code on release branch.
   - Run database migrations:
     ```bash
     npm run migrate up
     ```
   - Verify environment variables:
     - `REVIEW_DUE_CRON_SCHEDULE="0 0 * * *"` (Daily at midnight)
     - `BATCH_CYCLE_LEAD_TIME_WEEKS="4"`
   - Restart backend service. The daily review due scheduler starts automatically.
2. **Deploy Frontend**:
   - Run production build:
     ```bash
     npm run build
     ```
   - Deploy `dist/` directory to static hosting / CDN.

---

## 6. Rollback Plan

If rollback is required:
1. Revert Git commits from deployment branch:
   ```bash
   git revert HEAD~<n>..HEAD
   ```
2. Revert database migrations:
   ```bash
   npm run migrate down
   ```
3. Rebuild and redeploy frontend and backend.
4. Historical evaluation data remains 100% untouched and intact.
