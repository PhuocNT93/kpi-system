# Step 1: Understand

Status: reconstructed

## Deliverable

## Task Understanding

### Goal

Implement the complete end-to-end capabilities for Review Cadence & Review Due scheduling across backend and frontend in strict adherence to LLD v1.8:
1. **Review Due Scheduled Job & Read-Model / Dashboard API (`GET /reviews/due`)**: Daily background refresh of review due/overdue/upcoming statuses for active employees using configurable `lead_time_days`, RBAC scope filtering (Manager sees own team, HR/Admin sees organization), pagination, and no automatic evaluation creation.
2. **Review Cadence Management UI**: Admin settings screen for CRUD review cadences, plus assigning default cadence per Job Level.
3. **Review Due Dashboard UI**: Interactive dashboard with overdue/due/upcoming tabs and cards, multi-select, bulk trigger calling `POST /evaluation-cycles/individual`, and inline dedup warnings for upcoming Batch Cycles.
4. **Employee Cadence Override UI**: Allow HR/Admin to set/clear employee cadence override with reason, showing backend-resolved effective cadence and recalculating `next_review_due_date` without schedule drift.
5. **Cadence Audit & Historical Evaluation Regression Guarantee**: Full transactional audit for all cadence modifications, integration on evaluation `PUBLISHED` transition, and regression tests ensuring historical evaluation snapshots and scores remain completely immutable upon cadence changes.

---

### Expected Behavior

#### 1. Scheduled Job & Review Due Refresh
- Runs daily using the existing scheduler/worker infrastructure.
- Excludes employees with `employment_status IN ('INACTIVE', 'TERMINATED')`.
- Queries employees whose `next_review_due_date IS NOT NULL AND next_review_due_date <= today + lead_time_days` using indexed DB queries (no full-table scans).
- Resolves statuses explicitly:
  - `next_review_due_date < today` $\rightarrow$ `OVERDUE` (with `days_overdue = today - next_review_due_date`)
  - `next_review_due_date = today` $\rightarrow$ `DUE` (`days_overdue = 0`)
  - `today < next_review_due_date <= today + lead_time_days` $\rightarrow$ `UPCOMING`
- Does **not** auto-create any evaluations.
- Updates/materializes review due state or read-model with `last_updated_at`.

#### 2. `GET /reviews/due` API
- Protected endpoint supporting query parameters: `status` (`OVERDUE`, `DUE`, `UPCOMING`), `team_id`, `cadence_id`, `page`, `page_size`.
- **Scope enforcement**:
  - `MANAGER`: strictly constrained to employees within managed teams (querying another `team_id` returns 403 or empty filtered set within managed scope; no cross-team leakage in counts or pagination).
  - `HR_ADMIN` / `SYSTEM_ADMIN`: organization-wide scope with optional team/cadence/status filters.
  - Inactive/Terminated employees are completely filtered out.
- Each item returns fully resolved metadata: `employee_id`, `employee_name`, `team`, `job_level`, `effective_cadence`, `last_evaluation_completed_at`, `next_review_due_date`, `status`, and `days_overdue`. Backend is the single source of truth (no frontend recalculation).

#### 3. Individual Evaluation Bulk Creation (`POST /evaluation-cycles/individual`)
- Reuses 100% of existing Evaluation Cycle open/snapshot logic.
- Validates permissions per employee (Manager can only trigger for own team members).
- **Dedup Conflict (Hard Block)**: If an employee already has an `OPEN` or `IN_PROGRESS` evaluation, returns conflict (e.g. `EVALUATION_ALREADY_OPEN`) for that employee.
- **Batch Cycle Dedup Warning (Soft Warning)**: If an employee is scheduled in an upcoming Batch Cycle within $N$ weeks ahead (`batch_cycle_lead_time_weeks` configurable), returns a soft warning code (`BATCH_CYCLE_UPCOMING`) with cycle metadata without blocking creation unless confirmed.
- Returns per-employee batch results: `{ created: [...], warnings: [...], conflicts: [...] }`.

#### 4. Review Cadence Management UI (`/admin/review-cadences` & Job Level Form)
- Settings screen for HR/Admin to list, create, edit, and delete review cadences.
- Form validation: non-empty name, unique code, integer `interval_months > 0`, system default toggle (at most 1 active system default).
- Delete blocked with descriptive message when cadence is referenced by Job Level or Employee override.
- Job Level detail/edit form updated with a nullable dropdown to select `default_review_cadence_id`.

#### 5. Employee Cadence Override UI & Precedence Resolution
- Employee detail view displays:
  - Effective cadence (resolved by backend: `override` $\rightarrow$ `job_level.default` $\rightarrow$ `system_default`).
  - Override dropdown (HR/Admin only) with optional audit `reason`.
  - Last evaluation completion date & next review due date.
- Updating override triggers immediate recalculation:
  $$\text{next\_review\_due\_date} = \text{last\_evaluation\_completed\_at} + \text{new\_effective\_cadence.interval\_months}$$
  (preserves original completion baseline, never `today + interval`).

#### 6. Audit & Historical Regression
- All cadence mutations (`CREATE_REVIEW_CADENCE`, `UPDATE_REVIEW_CADENCE`, `DELETE_REVIEW_CADENCE`, `JOB_LEVEL_REVIEW_CADENCE_CHANGED`, `EMPLOYEE_REVIEW_CADENCE_OVERRIDE_CHANGED`, `REVIEW_DUE_DATE_RECALCULATED`) log transactional audit events via `withAuditedTransaction`.
- When an evaluation reaches `PUBLISHED`:
  - `last_evaluation_completed_at` is set to the actual published timestamp.
  - `next_review_due_date` is recalculated using the employee's effective cadence.
- **Immutability of Historical Evaluations**: Changing cadences, job level defaults, or employee overrides must never alter scores, weights, items, or status of existing `PUBLISHED` evaluations.

---

### Acceptance Criteria

#### Backend
1. **Scheduled Job**: Runs on schedule (or manual trigger in testing); recalculates active employee review due states; respects `review_due_lead_time_days` (default 30, configurable $\ge 0$); excludes inactive/terminated; never auto-creates evaluations.
2. **`GET /reviews/due`**:
   - RBAC enforced: Manager scoped to own team(s); HR/Admin gets org scope; unauthorized roles get 403; unauthenticated get 401.
   - Filters by `status` (overdue/due/upcoming), `team_id`, `cadence_id`; supports pagination (`page`, `page_size`, total counts).
   - Returns complete payload per employee with resolved `effective_cadence`, `status`, and `days_overdue`.
3. **`POST /evaluation-cycles/individual`**:
   - Reuses existing cycle open logic.
   - Enforces scope authorization per employee.
   - Returns per-employee results (`created`, `conflicts` for `EVALUATION_ALREADY_OPEN`, `warnings` for `BATCH_CYCLE_UPCOMING` within $N$ weeks).
4. **Due Date Recalculation**:
   - Recalculates `next_review_due_date` from `last_evaluation_completed_at + effective_cadence.interval_months` upon cadence override or job level cadence change.
   - Centralized handler `onEvaluationPublished(evaluationId, employeeId, publishedAt, tx)` executed on all valid publish pathways.
5. **Transactional Audit**: Cadence CRUD, Job Level cadence assignment, and Employee override changes record audit entries within the same database transaction.
6. **Regression Tests**: Scenarios A through E verified by automated tests confirming published evaluations are untouched when cadences change.
7. **Concurrency Tests**: Concurrent publish and override updates handle locking/consistency cleanly without lost updates or invalid due dates.

#### Frontend
8. **Review Due Dashboard**:
   - Dedicated page accessible by HR/Admin and Managers.
   - Tab/filter controls for Status (All, Overdue, Due Today, Upcoming), Team, Cadence, and search.
   - Multi-select capability (individual, visible all) with selection counter.
   - "Tạo Evaluation" action with confirmation, handling batch results (created, warnings, conflicts).
   - Inline warning for `BATCH_CYCLE_UPCOMING` with option to proceed with individual review.
   - Loading skeleton, empty state ("Không có nhân viên nào đến hạn review"), and error states.
   - Strictly NO ranking, NO score sorting, and NO top/bottom comparison.
9. **Cadence Management UI**:
   - List view in Settings with Code, Name, Interval (Months), System Default, Actions.
   - Create/Edit modal with validation (code, name, positive integer interval).
   - Delete confirmation handling 409 in-use conflict gracefully.
10. **Job Level & Employee Form UI**:
    - Job Level modal/screen provides nullable Default Cadence dropdown.
    - Employee profile provides Cadence Override selector (HR only) with reason input, displaying backend-resolved effective cadence and due dates.

---

### Out of Scope

- Automatic background creation of evaluations by the scheduler (explicitly prohibited by LLD).
- Employee ranking, percentile calculations, or comparative stack-ranking (prohibited by LLD).
- Creating new batch evaluation cycles (existing batch cycle flow is untouched).
- Modifying email templates or SMTP infrastructure beyond existing notification triggers.

---

### Business Rules Involved

- **BR-1 (LLD §14.1 Precedence)**: `employee.review_cadence_override_id` $\rightarrow$ `job_level.default_review_cadence_id` $\rightarrow$ `review_cadence.is_system_default = true`.
- **BR-2 (LLD §14.1 Due Date Calculation)**: `next_review_due_date = last_evaluation_completed_at + effective_cadence.interval_months`. If `last_evaluation_completed_at` is null, `next_review_due_date` is null (unless seeded/initialized).
- **BR-3 (LLD §14.1 Status Semantics)**:
  - `next_review_due_date < today` $\rightarrow$ `OVERDUE`
  - `next_review_due_date = today` $\rightarrow$ `DUE`
  - `today < next_review_due_date <= today + lead_time_days` $\rightarrow$ `UPCOMING`
- **BR-4 (Eligibility)**: Exclude employees with `employment_status IN ('INACTIVE', 'TERMINATED')`.
- **BR-5 (Evaluation Dedup)**:
  - Hard conflict: An employee cannot have more than one `OPEN` or `IN_PROGRESS` evaluation simultaneously.
  - Soft warning: Upcoming batch cycle within `batch_cycle_lead_time_weeks` generates `BATCH_CYCLE_UPCOMING` warning.
- **BR-6 (Snapshot Immutability)**: Historical `PUBLISHED` evaluations are immutable snapshots; changing cadences must never mutate evaluation scores, weights, or items.
- **BR-7 (Scope Authorization)**:
  - Manager: can only view and create individual evaluations for direct/indirect team members.
  - HR/System Admin: organization-wide scope.
- **BR-8 (Audit Integration)**: All cadence mutations and override assignments must record audit events transactionally via `withAuditedTransaction`.

---

### Open Questions / Conflicts

- None.

## Inputs Reviewed

- `docs/LLD_Employee_Performance_Evaluation_System.md` (§10, §14.1, §16, §17)
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`

## Actions and Evidence

- Reviewed user requirements and mapped acceptance criteria to domain models and backend/frontend capabilities.

## Changes Made

- Documented task understanding deliverable.

## Decisions and Rationale

- Kept scheduled job purely as read-model/status maintenance, avoiding automated evaluation creation per LLD.
- Maintained precedence resolver purely on backend.

## Risks / Blockers

- None.

## Next Step

- Step 2: Investigate
