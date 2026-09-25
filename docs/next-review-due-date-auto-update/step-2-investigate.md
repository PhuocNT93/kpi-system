# Step 2: Investigate

Status: reconstructed from the approved Step 2 response (approved by user: "approve"; recommendations for questions 1–5 accepted).

## Deliverable

## Investigation

**Relevant Documents:**
- LLD §10.1 (schema), §10.4 line 452, §14 (auto-publish), §14.1 (precedence, formula, Rule 9/10/11), Risk #12.
- `BACKEND_NODE_RULES.md` L18-22 (application service owns transactions; no cross-module table queries), L117/L120 (transition + audit in one transaction), L106-108 (error codes), L132 (timezone-aware), L157-159 (no `any`, no `eslint-disable`), L148 (authz/audit/concurrency/history coverage).
- `FRONTEND_REACT_RULES.md` L22/L96 (exact invalidation), L62 (disable while pending), L56-61 (error code, 409/422), L83-90 (tests).
- `Sequence_Diagrams_System.md` §6 (approve → auto-publish, `APPROVE_AND_PUBLISH`), §10 (transactional audit). Nothing on cadence.

**Relevant Modules and Files:**
- Owner (wrong module today): `backend/src/modules/review-cadence/application/review-schedule.service.ts`
- Pure domain: `review-cadence/domain/cadence-precedence-resolver.ts`, `review-cadence/domain/review-due-calculator.ts`
- Cadence CRUD: `review-cadence/application/review-cadence.service.ts`, `infrastructure/postgres-review-cadence.repository.ts`
- Review-due read model: `review-cadence/application/review-due.service.ts`, `api/review-due.controller.ts`
- Employee: `employee/application/employee-cadence.service.ts`, `employee/api/employee.controller.ts`, `employee/infrastructure/postgres-employee.repository.ts`, `employee/employee.module.ts`
- Job level: `organization/application/organization.service.ts`, `organization/infrastructure/postgres-repositories.ts`, `organization/organization.module.ts`
- Publish: `evaluation/application/services/evaluation.service.ts`, `evaluation/evaluation.module.ts`
- Calibration auto-publish: `calibration/application/calibration.service.ts:297`, `calibration/infrastructure/postgres-calibration.repository.ts:369`
- Jira: `jira-crawler/jira-crawler.controller.ts:573-581, 835-883`
- Wiring: `backend/src/app.ts:105-138`
- Timezone: `backend/src/config/evaluation-cycle.config.ts` (`getBusinessTimeZone`, `getBusinessToday`)
- Audit: `audit/application/audit.service.ts`, `audit-transaction.ts`, `audit/domain/audit.domain.ts`
- FE: `features/organization/{api/employee-api.ts, api/organization-types.ts, api/organization-keys.ts, domain/organization-mappers.ts, hooks/useEmployees.ts, hooks/useJobLevels.ts, hooks/useReviewCadences.ts, components/EmployeeFormModal.tsx, EmployeeTable.tsx, JobLevelFormModal.tsx, ReviewCadenceFormModal.tsx}`; `features/evaluation-cycles/{api/review-due-api.ts, types/review-due.types.ts, hooks/useReviewDue.ts, pages/ReviewDueDashboard.tsx}`

**Existing Implementation (gaps vs. requirements):**
1. `ReviewScheduleService` has `resolveEmployeeEffectiveCadence`, `onEvaluationPublished`, `recalculateEmployeeDueDate` (with `FOR UPDATE`) but lives in review-cadence and queries `employee`; evaluation and employee modules each `new` their own instance.
2. `calculateNextReviewDueDate` does UTC month math, keeps the time of day, ignores `BUSINESS_TIMEZONE` (00:30 Feb 1 VN = 17:30Z Jan 31 → Jul 31 instead of Aug 1). `new Date(v).toISOString().slice(0,10)` on `date` columns can shift one day at +7. No leap/timezone tests.
3. Publish has two paths; only one updates the schedule: `publishEvaluation` calls `onEvaluationPublished` in-transaction (audit lacks cadence/base/evaluation_id fields); calibration finalize (`transitionEvaluationsAndAutoPublish`) sets `PUBLISHED` in bulk without updating schedules (Risk #12). `approveEvaluation` only sets `APPROVED` (deviates from LLD §14 / Sequence §6). `APPROVED → LOCKED` is allowed.
4. Override change: `EmployeeCadenceService.updateCadenceOverride` recalculates in a transaction with audit, but pre-checks run outside the transaction; response lacks `source`.
5. Employee job level change: `updateEmployee` lives entirely in the controller — no transaction, no audit, no recalculation; hard-coded `calculateNextReviewDate`/`cadenceToMonths`; client may send `last_evaluation_completed_at`/`next_review_due_date`; legacy columns written; generic `repo.update` rewrites all schedule columns.
6. Job-level default change: `OrganizationService.updateJobLevel` — no recalculation, audit, or transaction; organization module has no `AuditService`. LLD `PATCH /job-levels/{id}/default-review-cadence` not implemented (uses `PATCH /org/job-levels/:id`).
7. Review cadence update: no recalculation; repository bound to `pool`, so `cadenceRepo.update` runs outside `withAuditedTransaction` (pre-existing atomicity bug). Referenced delete blocked (`CADENCE_IN_USE`, BR-7); deleting the system default is not FK-referenced but changes effective cadence.
8. Inactive cadence: resolver and review-due query skip inactive cadences (join `active = true`) and fall through; deactivation is not blocked.
9. Jira: `applyMemberKpis` with `markReviewed=true` (FE always sends true) sets `last_evaluation_completed_at = now` without a published evaluation, using legacy `review_cadence_months`; `PATCH /collector/jira/members/:code/cadence` edits `next_review_due_date`/`review_cadence_months` manually, no audit/role check (no FE caller).
10. Review-due API/FE contract drift: backend returns `employee_name`, `team{}`, `job_level{}`, `{items,total,page,pageSize,totalPages}`, no `source`/`days_until_due`/`meta.counts`; FE expects `full_name`, `team_name`, `source:'JOB_LEVEL'`, `meta.counts` → dashboard likely broken.
11. FE: `EmployeeFormModal` computes the due date (hard-coded month map, `setUTCMonth`, auto-fill `useEffect`), zod requires `next_review_due_date`; edit issues PATCH employee then PATCH override (non-atomic); cadence chip lacks source; `EmployeeTable` shows the legacy cadence; update employee/job level/review cadence do not invalidate `['reviews','due']` or employee cadence (`staleTime` 5 min); submit already disabled while pending; `ErrorAlert` shows message only.
12. i18n: new labels fall back to English; Vietnamese needs a new `*_UI` seed migration (latest `1791000000006_*`).

**Existing Tests:** pure `review-due-calculator.test.ts`, `cadence-precedence-resolver.test.ts`; mocked `historical-evaluation-regression.test.ts`, `review-cadence-service.test.ts`, `review-due-scheduling.test.ts`, `evaluation-publish-lock.test.ts`, `evaluation-review-approval.test.ts`, `concurrency-hardening.test.ts`, `audit-transactional.test.ts` (recording fake client for BEGIN/INSERT/ROLLBACK order), `organization.service.test.ts`, `employee-api.test.ts`. Only real-Postgres test: `migrations.test.ts` (guarded by `TEST_DATABASE_URL`). FE: none for these components; pattern in `EmployeeSearchPage.test.tsx`.

**Patterns to Reuse:** `withAuditedTransaction` + `AuditCollector` (uuid `entityId`/`performedBy`; action typed `AuditAction | string`); `SELECT … FOR UPDATE`; `getBusinessTimeZone()` / `Intl.DateTimeFormat('en-CA', {timeZone})`; `resolveEffectiveCadence`, `calculateReviewDueStatus`; recording fake client / `createFakeDb()`; `TEST_DATABASE_URL` guard; FE `organizationKeys`, `ErrorAlert`, `ApiClientError.code/statusCode`, `useUiTranslation` + i18n seed migration.

**Proposal for open question 5 (accepted):** keep current behavior — inactive cadences are skipped and fall through; deactivation not blocked; `interval_months` / `active` / `is_system_default` changes and deleting the system default trigger `ReviewCadenceChangeHandler`; BR-7 unchanged.

**Decisions requested and accepted:**
1. (a) Keep the workflow; hook every transition to `PUBLISHED` (`publishEvaluation`, calibration finalize) through one owner function; approve-without-auto-publish noted as pre-existing debt.
2. `APPROVED → LOCKED` unchanged (no schedule update), recorded as a risk.
3. Jira `markReviewed` no longer writes the schedule (response keeps `reviewMarked`); collector PATCH rejects `nextReviewDueDate`/`reviewCadenceMonths` with `422 REVIEW_SCHEDULE_READ_ONLY`, `blueprintUsername` still allowed.
4. Employee create/update ignore client-sent `last_evaluation_completed_at`, `next_review_due_date`, `review_cadence`, `review_cadence_months`; job level change goes through an application service (transaction + recalc + audit).
5. Fix the review-due contract on the FE; backend only adds `effective_cadence.source`.

## Inputs Reviewed
Files listed above; two read-only Explore sub-investigations (frontend; backend rules/tests), whose key claims were re-verified directly (review-due contract drift, FE date math).

## Actions and Evidence
- `sed -n`/`grep -n` over the files listed; `git`-free read-only inspection.
- Verified `review-due.controller.ts:38-45` / `review-due.service.ts:206-238` vs `frontend/.../review-due.types.ts:1-30`.
- Verified `EmployeeFormModal.tsx:23,49,56,238` date math.

## Next Step
Step 3 — Impact Analysis.
