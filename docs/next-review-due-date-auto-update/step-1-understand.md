# Step 1: Understand

Status: reconstructed from the approved Step 1 response (approved by user: "approve"; recommendations 1–4 accepted, question 5 answered in Step 2).

## Deliverable

## Task Understanding

**Goal:** When an evaluation transitions `APPROVED → PUBLISHED`, automatically update `employee.last_evaluation_completed_at` and `employee.next_review_due_date` in the same DB transaction as the publish; recalculate `next_review_due_date` immediately whenever the effective cadence changes, always from the existing `last_evaluation_completed_at` (no schedule drift). A single owner (`ReviewScheduleService`) handles all schedule writes, with full audit. The frontend only renders/refetches backend data.

**Expected Behavior:**
1. Publish (every path that reaches `PUBLISHED`), in one transaction: `last_evaluation_completed_at = published_at`; resolve effective cadence; `next_review_due_date = business_date(last_completed, BUSINESS_TIMEZONE) + interval_months` (calendar months); audit. Any failure rolls back everything including `PUBLISHED`. `PUBLISHED → LOCKED` does not update again.
2. Effective cadence resolved at runtime: `employee.review_cadence_override_id` → `job_level.default_review_cadence_id` → `review_cadence.is_system_default`.
3. Immediate recalculation (same transaction as the causing mutation, audited) when the effective cadence changes because of: employee `job_level_id` change; override set/change/clear; job-level `default_review_cadence_id` change (only employees without override, batched, no N+1, ~1,000 employees); review cadence `interval_months`/`active`/`is_system_default` change or delete (if allowed). `last_evaluation_completed_at` is never changed by recalculation; if it is `NULL`, `next_review_due_date` stays `NULL` (due now, per LLD).
4. API: employee/review-due responses expose `last_evaluation_completed_at`, `next_review_due_date`, `effective_cadence { id, code/name, interval_months, source: EMPLOYEE_OVERRIDE | JOB_LEVEL_DEFAULT | SYSTEM_DEFAULT }`; envelope unchanged; no "recalculate" endpoint.
5. FE: employee edit shows Effective Cadence / Source / Last Completed / Next Due; HR/Admin can change the override with API-driven options; after mutations (job level, override, job-level default, review cadence) invalidate exact keys and show the new date from the server without reload; no client date math; submit disabled while pending; 409/422 shown safely; Review Due Dashboard renders `next_review_due_date` from the API.

**Acceptance Criteria:**
1. Publish atomically updates evaluation status, `last_evaluation_completed_at`, `next_review_due_date`, audit; any failure rolls back including the publish.
2. Formula: `next_review_due_date = last_evaluation_completed_at (business date) + effective_cadence.interval_months`, calendar months, `BUSINESS_TIMEZONE`.
3. Precedence: override > job level default > system default.
4. Job level / override / job-level default / cadence interval or status changes recalculate immediately when the effective cadence changes.
5. Recalculation uses the existing `last_evaluation_completed_at`, never the current date.
6. Anti-drift regression test (`should_recalculate_from_last_completed_date_without_schedule_drift`): Jan 31 → cadence 6→12 → publish #2 resets the base.
7. Every cadence change with business impact writes `audit_log` (employee_id, source/reason, old/new cadence, old/new due, base date, actor, evaluation_id for publish; no unnecessary PII).
8. FE only renders/refetches backend results.
9. No regression in evaluation workflow or historical snapshots.
10. Unit + integration + regression + FE tests + typecheck + lint actually pass.

**Out of Scope:** auto-creating evaluations (Phase 2), daily job, polling; new-hire grace period (LLD Open Question #12); dropping legacy `review_cadence`/`review_cadence_months`, data backfill; new manual Publish endpoint or "recalculate" endpoint; changing delete semantics of referenced cadences; unrelated refactors.

**Business Rules Involved:** LLD §10.1 (schema), §10.4 note line 452 (same transaction + audit on publish), §14 (auto-publish, approve = approve + publish), §14.1 (precedence, `NULL` → due now, recalc from old base), Rule 9 (anti-drift), Rule 10 (audit override/job level), Rule 11 (exclude INACTIVE/TERMINATED from dashboard), §18 (append-only transactional audit), Risk #12 (single due-date function for every publish path), Decision #13 (recalculate immediately), RBAC §17 (HR/Admin), CLAUDE.md conventions (envelope, zod, no `any`, snake→camel mapping, query keys).

**Open Questions / Conflicts:**
1. Owner location — brief wants `ReviewScheduleService` in employee/organization with a `ReviewCadenceChangeHandler` port; develop has it in the review-cadence module (querying `employee` directly) plus `EmployeeCadenceService` doing its own recalculation. Recommendation (accepted): single owner in the employee module; review-cadence keeps pure domain + CRUD and calls a port implemented by employee.
2. Other writers of schedule columns (`jira-crawler.controller.ts:577`, generic `postgres-employee.repository.ts` update). Recommendation (accepted): route through the owner / stop overwriting.
3. Publish paths — `publishEvaluation()` exists with a hook; LLD says approve auto-publishes. Recommendation (accepted): keep endpoints, ensure every path to `PUBLISHED` calls the same owner function.
4. LLD inconsistency (line 357 "PUBLISHED/LOCKED" vs 452/806/1942 "PUBLISHED"). Recommendation (accepted): PUBLISHED only; fix line 357.
5. Inactive cadence behavior — decided in Step 2 (fall through to the next tier).

## Inputs Reviewed
- Task brief (user), `docs/LLD_Employee_Performance_Evaluation_System.md` §10.1, §10.4, §14, §14.1, §16–18, §28–30.
- Quick grep of current writers of schedule columns on develop.

## Actions and Evidence
- `grep -n` for cadence/schedule terms in the LLD; `sed -n` of lines 331–360, 445–455, 784–870.
- `grep -rn "last_evaluation_completed_at|next_review_due_date"` in `backend/src` → writers in `employee-cadence.service.ts`, `postgres-employee.repository.ts`, `jira-crawler.controller.ts:577`, `review-cadence/application/review-schedule.service.ts:183`.

## Decisions and Rationale
See Open Questions (accepted recommendations).

## Next Step
Step 2 — Investigate.
