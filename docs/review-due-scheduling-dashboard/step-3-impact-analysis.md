# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Frontend** | **HIGH** | Upgrade `ReviewDueDashboard.tsx` from stub to full interactive dashboard with tabs/filters (status, team, cadence), multi-select, bulk creation trigger, inline `BATCH_CYCLE_UPCOMING` warning display, loading/error states, and strict omission of any employee ranking. Add route `/admin/review-cadences`. Update Employee detail/modal with cadence override and reason input, rendering backend-resolved effective cadence. |
| **Backend** | **HIGH** | Implement `ReviewDueService` with daily scheduled background job (`node-cron`), configurable `lead_time_days` and `batch_cycle_lead_time_weeks`, `GET /reviews/due` API with scope enforcement, `POST /evaluation-cycles/individual` reusing open cycle logic with dedup conflict/warning checks, `PATCH /employees/:id/review-cadence-override`, and central `onEvaluationPublished` hook in `evaluation.service.ts`. |
| **Database** | **MEDIUM** | Add migration for composite index on `employee (employment_status, next_review_due_date)` and `employee (team_id, employment_status)` to eliminate full-table scans. Schema tables (`review_cadence`, FKs on `job_level` and `employee`) were already provisioned in migration `1791000000000`. |
| **API** | **HIGH** | Add new endpoints: `GET /api/reviews/due`, `POST /api/evaluation-cycles/individual`, and `PATCH /api/employees/:id/review-cadence-override`. All endpoints strictly follow `{ success, message, data, meta }` envelope and app error hierarchy. |
| **RBAC / Scope** | **HIGH** | Strict scoping: Managers see only their managed teams (`actor.managedTeamIds`). Direct queries or bulk creation targeting unmanaged teams/employees are rejected with `403 FORBIDDEN` or restricted to scope with zero cross-team data leakage. HR/Admin retain organization-wide scope. |
| **Workflow** | **MEDIUM** | Hook into `EvaluationService.publishEvaluation()` to trigger review schedule recalculation on publish. Scheduler never auto-creates evaluations (manual trigger from dashboard only). |
| **Audit** | **HIGH** | Full transactional audit integration for cadence CRUD, job level cadence changes, and employee cadence overrides using `withAuditedTransaction`. Captures old/new cadence, due dates, and reason without sensitive PII. |
| **Concurrency** | **MEDIUM** | Row-level locking on employee records during cadence override and evaluation publishing. Transaction-scoped conflict checks ensure simultaneous bulk requests cannot produce duplicate open evaluations for the same employee. |
| **Performance** | **MEDIUM** | Single paginated SQL join query combining employee, job level, team, and cadence data with index optimization to avoid N+1 queries. |
| **Historical Data** | **LOW (IMMUTABLE)** | Zero risk to historical data: cadence configuration changes strictly update future `next_review_due_date`. Historical `PUBLISHED` evaluations, scores, criteria snapshots, and weights remain 100% immutable. |

---

### Potential Risks

1. **Schedule Drift on Due Date Recalculation**:
   - *Risk*: Recalculating from `today + interval_months` when an employee changes job level or override would drift the review schedule.
   - *Mitigation*: Strictly calculate from existing `last_evaluation_completed_at + effective_cadence.interval_months`. If `last_evaluation_completed_at` is null, `next_review_due_date` remains null (or initial schedule baseline).
2. **Cross-Team Data Leakage for Managers**:
   - *Risk*: A manager might craft a request with `?team_id=<other_team>` or submit employee IDs outside their managed team.
   - *Mitigation*: Backend validates each employee's `team_id` against `actor.managedTeamIds` for `MANAGER` role, returning 403 or omitting unauthorized records in both list and bulk trigger.
3. **Double Open Evaluation (Race Condition)**:
   - *Risk*: Concurrent requests calling `POST /evaluation-cycles/individual` could create two open evaluations for the same employee.
   - *Mitigation*: Run validation and insertion within a database transaction checking existing `OPEN` or `IN_PROGRESS` evaluations.
4. **Scheduled Job vs API Freshness**:
   - *Risk*: Depending solely on a daily job could serve stale data if an override was just updated or an evaluation was just published.
   - *Mitigation*: The scheduled job acts as the background maintenance worker; `GET /reviews/due` queries the database with dynamic status resolution based on the authoritative `next_review_due_date` column, guaranteeing real-time accuracy.

---

### Required ADR / Clarification

- **None**: All behaviors align directly with LLD v1.8 §14.1, §16, §17, and existing project conventions.

## Inputs Reviewed

- Security policies, concurrency rules, database schemas, and performance requirements.

## Actions and Evidence

- Evaluated system impact across all 10 architectural categories.

## Changes Made

- Documented impact analysis.

## Decisions and Rationale

- Addressed potential risks proactively with transactional atomicity, explicit scoping, and index optimization.

## Risks / Blockers

- None.

## Next Step

- Step 4: Plan
