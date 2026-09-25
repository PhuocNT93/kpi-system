# Step 3: Impact Analysis

Status: reconstructed from the approved Step 3 response (approved by user: "Approve"; clarifications 1–4 accepted as recommended).

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | `EmployeeFormModal`, `EmployeeTable`, employee/job-level/review-cadence hooks, review-due types/mapper/`ReviewDueDashboard`: remove client due-date math and manual Last/Next inputs; render Effective Cadence, Source, Last Completed, Next Due from API; add `['reviews','due']` + employee-cadence invalidation; fix review-due types to the real contract. No new routes. |
| Backend | HIGH | Move owner `ReviewScheduleService` to employee; business-date calculation with `BUSINESS_TIMEZONE`; hook calibration finalize; move job-level change out of the employee controller into a transactional application service; recalc on job-level default change and cadence edit/delete via `ReviewCadenceChangeHandler`; fix pre-existing `ReviewCadenceService` atomicity (repo on transaction client); block schedule writes from Jira/employee controller; single owner wiring in `app.ts`. |
| Database | LOW | No schema change. Indexes exist (`idx_employee_job_level_id`, `idx_employee_review_cadence_override_id`, `idx_employee_review_due_lookup`). Optional i18n seed migration `1791000000007_seed_review_schedule_ui_i18n_translations.ts` (prefix unused). No writes to legacy columns. |
| API | MEDIUM | Additive: `effective_cadence.source` on `GET /employees/:id`, `PATCH /employees/:id/review-cadence-override`, `GET /employees/:id/review-cadence`, `GET /reviews/due`. Behavior changes: `POST/PATCH /employees` ignore schedule + legacy cadence fields; `PATCH /collector/jira/members/:code/cadence` → `422 REVIEW_SCHEDULE_READ_ONLY` for `nextReviewDueDate`/`reviewCadenceMonths`; Jira `markReviewed` no longer changes the schedule. No new endpoints. |
| RBAC / Scope | LOW | Override/cadence config HR/Admin; publish HR/Admin; calibration finalize unchanged. Add HR/Admin service checks only for changing `default_review_cadence_id` and employee `job_level_id` (RBAC §17). |
| Workflow | MEDIUM | State machine unchanged. Hook every transition to `PUBLISHED`; not on `PUBLISHED → LOCKED`. Approve still stops at `APPROVED` (pre-existing LLD deviation, out of scope). |
| Audit | MEDIUM | New append-only, same-transaction entries: `REVIEW_SCHEDULE_UPDATED` (publish, with `evaluation_id`) and `REVIEW_SCHEDULE_RECALCULATED` (payload: employee_id, trigger, old/new cadence id/code/interval/source, old/new due, base, actor); `EMPLOYEE/UPDATE` for override and job level; `JOB_LEVEL/UPDATE` for default cadence; `REVIEW_CADENCE/UPDATE` as today. Added to `AuditActionSchema`. |
| Concurrency | MEDIUM | `SELECT … FOR UPDATE` before computing; bulk locks `ORDER BY employee_id`; employee update keeps `version` (409); generic `repo.update` stops writing schedule columns (removes lost-update risk vs. publish). |
| Performance | MEDIUM | Job-level default / system default change may touch ~1,000 employees in one transaction: 1 set-based locking SELECT, TS computation, 1 `UPDATE … FROM unnest(...)`, batched audit (`insertMany`, only changed rows). Calibration finalize handled the same way. |
| Historical Data | LOW | Snapshots, `published_at`, old audit untouched; `last_evaluation_completed_at` only changes on publish. Previously computed legacy `next_review_due_date` values stay until the next trigger. |

**Potential Risks:**
- Module boundaries: owner in employee → review-cadence/calibration/evaluation depend on interfaces (`ReviewCadenceChangeHandler`, `EvaluationPublishedHandler`); employee already imports `EvaluationService`, so module creation order in `app.ts` must be employee-schedule first.
- Timezone: business-date semantics may shift ±1 day vs. old values on the next recalculation (correct, but may look like a bug).
- Behavior change for old clients sending `next_review_due_date` on employee create (ignored). Collector PATCH has no caller.
- Review-due dashboard likely broken on develop; the FE fix changes the current display (status counts not provided by backend).
- Bulk audit (~1,000 rows) lengthens the transaction; only changed rows are audited.
- No real-Postgres integration precedent: atomicity proven with the recording fake client; DB-backed test only with `TEST_DATABASE_URL` (skipped in CI).
- Pre-existing bug fixed as required for atomicity: `ReviewCadenceService` repository outside the transaction.
- Out of scope (noted): approve without auto-publish; `APPROVED → LOCKED` skipping schedule; `CURRENT_DATE` in review-due/notification uses DB timezone.

**Required ADR / Clarification (all accepted):**
1. Update LLD (line 357 PUBLISHED only; owner/ports/business date/inactive fall-through documented).
2. No backfill (out of scope).
3. Add HR/Admin service checks for employee `job_level_id` and job-level `default_review_cadence_id` changes.
4. Add i18n seed migration `1791000000007`.

## Inputs Reviewed
Step 2 findings; `backend/migrations/` listing and existing employee indexes.

## Actions and Evidence
- `ls backend/migrations | sort | tail` → latest `1791000000006_*`; duplicate prefixes listed (`1724500000006`, `1724500000008`, `1788926000011/15/16/20`); `1791000000007` unused.
- `grep "CREATE INDEX.*employee"` → `idx_employee_job_level_id`, `idx_employee_review_cadence_override_id`, `idx_employee_review_due_lookup` exist.

## Next Step
Step 4 — Plan.
