# Step 2: Investigate

Status: reconstructed

## Deliverable

## Investigation

### Relevant Documents

- `docs/LLD_Employee_Performance_Evaluation_System.md` (§10, §14.1, §16, §17):
  - Review Cadence data model and pure precedence resolver: `employee.review_cadence_override_id` $\rightarrow$ `job_level.default_review_cadence_id` $\rightarrow$ `review_cadence.is_system_default = true`.
  - Next review due date formula: `next_review_due_date = last_evaluation_completed_at + effective_cadence.interval_months`.
  - Review Due Dashboard query criteria: active employees (`employment_status NOT IN ('INACTIVE', 'TERMINATED')`), indexed lookup on `next_review_due_date <= today + lead_time_days`.
  - Individual evaluation creation reusing Evaluation Cycle open/snapshot logic with open-evaluation dedup conflict and upcoming batch cycle warning.
- `docs/BACKEND_NODE_RULES.md`:
  - Layered architecture: Router $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ Database.
  - Standard API envelope: `{ success, message, data, meta }`.
  - Transactional audit logging via `withAuditedTransaction` / `AuditService.record`.
  - Scope and RBAC authorization derived exclusively from authenticated `Actor`.
- `docs/FRONTEND_REACT_RULES.md`:
  - Typed API clients, React Query mutations and invalidations.
  - No business calculations in React (backend provides resolved statuses, effective cadences, and overdue days).
  - Explicit loading, empty, error, and partial bulk execution states.

---

### Relevant Modules and Files

#### Backend
- **Review Cadence & Scheduling**:
  - `backend/src/modules/review-cadence/domain/cadence-precedence-resolver.ts`: existing pure resolver `resolveEffectiveCadence({ employeeOverride, jobLevelDefault, systemDefault })`.
  - `backend/src/modules/review-cadence/application/review-cadence.service.ts`: existing CRUD service with audit and deletion constraint checks.
  - `backend/src/modules/review-cadence/domain/review-cadence.types.ts` & `review-cadence.repository.ts`.
- **Review Due & Scheduler**:
  - `backend/src/modules/employee/domain/employee-review-status.ts`: existing date math for review statuses; needs extension for explicit `DUE` (`days_overdue === 0`) and positive `days_overdue` representation.
  - `backend/src/modules/collector/application/collector-scheduler.service.ts`: established `node-cron` pattern to schedule recurring jobs.
- **Evaluation & Cycle**:
  - `backend/src/modules/evaluation/application/services/evaluation.service.ts`: `publishEvaluation()` at lines 638–702 transitions status to `PUBLISHED` in a transaction. Must invoke centralized `onEvaluationPublished`.
  - `backend/src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.ts`: snapshots template versions and criteria into `evaluation` and `evaluation_item` records.
  - `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts` & `evaluation-cycle.controller.ts`: needs `createIndividualCycle` handling multi-employee creation, RBAC scope enforcement, conflict checking (`EVALUATION_ALREADY_OPEN`), and upcoming batch warning (`BATCH_CYCLE_UPCOMING`).
- **Employee & Organization**:
  - `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`: currently reads and writes `review_cadence_override_id`, `last_evaluation_completed_at`, and `next_review_due_date`.
  - `backend/src/modules/employee/application/employee.service.ts`: needs `updateCadenceOverride()` with immediate due-date recalculation and transactional audit.
  - `backend/src/modules/organization/infrastructure/postgres-repositories.ts`: `JobLevelRepository` already supports `default_review_cadence_id`.
- **Audit**:
  - `backend/src/modules/audit/application/audit.service.ts`: `record(tx, params)` inside transaction client.
  - `backend/src/modules/audit/domain/audit.domain.ts`: already registers `REVIEW_CADENCE`, `JOB_LEVEL`, `EMPLOYEE`, `EVALUATION`.
- **Database Migrations**:
  - `backend/migrations/1791000000000_create_review_cadence_table.ts`: already added `review_cadence` table and FKs to `job_level` and `employee`.
  - Needs a new migration for composite/filtered index: `idx_employee_review_due_lookup` on `employee (employment_status, next_review_due_date)` and `idx_employee_team_status` on `employee (team_id, employment_status)` to prevent full-table scans.

#### Frontend
- **Review Due Dashboard**:
  - `frontend/src/features/evaluation-cycles/pages/ReviewDueDashboard.tsx`: currently a simple stub; needs upgrade to full dashboard with status cards, filters (status, team, cadence), multi-select, bulk create button, conflict/warning alerts, and no employee ranking.
- **Review Cadence Management**:
  - `frontend/src/features/organization/components/ReviewCadenceTable.tsx` & `ReviewCadenceFormModal.tsx`: existing in `JobArchitectureTab.tsx`. We will ensure accessible via `/admin/review-cadences` and in Settings/Configuration.
- **Job Level & Employee Overrides**:
  - `frontend/src/features/organization/components/JobLevelFormModal.tsx`: already integrates `useReviewCadences` for `defaultReviewCadenceId`.
  - `frontend/src/features/organization/components/EmployeeFormModal.tsx`: contains legacy client-side month calculation; must be replaced by selecting cadence override, sending audit reason, and rendering backend-returned effective cadence.

---

### Existing Implementation

1. **Review Cadence Core**:
   - `review_cadence` table exists in PostgreSQL with unique partial index on `is_system_default`.
   - `resolveEffectiveCadence` is pure and unit-tested for all precedence branches.
   - `ReviewCadenceService` handles CRUD with transactional audit via `withAuditedTransaction`.
2. **Evaluation Publishing**:
   - `publishEvaluation` updates `status = 'PUBLISHED'` and `published_at = new Date()` inside `withTransaction(this.pool, ...)`. However, it does not yet update employee review due dates.
3. **Evaluation Cycle Opening**:
   - `EvaluationCycleOpeningService.openCycle` performs snapshotting of template criteria, KPIs, and weights into `evaluation` and `evaluation_item` rows.
4. **Scope & RBAC**:
   - Auth tokens populate `actor.managedTeamIds`. `Actor` has `role` (`HR_ADMIN`, `SYSTEM_ADMIN`, `MANAGER`, `EMPLOYEE`).
   - Repository helpers filter by `managerEmployeeId` or `managedTeamIds`.

---

### Existing Tests

- `backend/src/modules/review-cadence/domain/cadence-precedence-resolver.test.ts`: table-driven tests for precedence resolver.
- `backend/test/review-cadence-service.test.ts`: mocked service tests for cadence CRUD, code uniqueness, system default constraint, and audit writes.
- `backend/src/modules/employee/domain/employee-review-status.test.ts`: unit tests for `getEmployeeReviewStatus`.
- `backend/src/modules/evaluation/application/services/evaluation.service.explainability.test.ts`: test actor scopes and permissions.

---

### Patterns to Reuse

1. **Transactional Audited Operations**:
   - Reuse `withAuditedTransaction(this.pool, this.auditService, async (client, audit) => { ... })` for cadence override updates, ensuring audit record and business updates commit or roll back together.
2. **Scheduler Pattern**:
   - Follow `collector-scheduler.service.ts` pattern using `node-cron` with `cron.schedule('0 0 * * *', async () => { ... })` for daily execution, plus an exposed programmatic trigger `refresh()` for tests and on-demand synchronization.
3. **Repository Scoped Queries**:
   - Query DB directly with parameters:
     ```sql
     WHERE employment_status NOT IN ('INACTIVE', 'TERMINATED')
       AND next_review_due_date IS NOT NULL
       AND next_review_due_date <= $1
     ```
     joining `job_level`, `team`, and `review_cadence` in a single query to eliminate N+1 latency.
4. **Bulk Creation Envelope & Error Reporting**:
   - Return structured per-employee batch results `{ created: [...], warnings: [...], conflicts: [...] }` allowing partial batch visibility without aborting non-conflicting entries.

## Inputs Reviewed

- Database schemas, repositories, controllers, services, layout components, and test files.

## Actions and Evidence

- Inspected code paths across backend and frontend modules to map out reusable functions and missing capabilities.

## Changes Made

- Documented investigation findings.

## Decisions and Rationale

- Reused `node-cron` as the established background scheduler.
- Selected single paginated SQL queries with composite index support to prevent N+1 issues.

## Risks / Blockers

- None.

## Next Step

- Step 3: Impact Analysis
