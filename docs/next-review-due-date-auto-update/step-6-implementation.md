# Step 6: Implement

Status: produced during this step.

## Deliverable

## Implementation

Changes Made:

**Backend — schedule owner (employee module)**
- `backend/src/modules/employee/domain/review-schedule.ts` (new): the only due-date formula — `toBusinessDate` (BUSINESS_TIMEZONE via `Intl`), `addCalendarMonths` (month-end clamp, `RangeError` for ≤ 0), `calculateNextReviewDueDate`, `computeDueDate`, `toDateOnlyString`, `toTimestamp`, `EffectiveCadence`, `ReviewScheduleTrigger`.
- `backend/src/modules/employee/domain/review-schedule.port.ts` (new): `EvaluationPublishedHandler` port.
- `backend/src/modules/employee/domain/employee-schedule.repository.ts` (new): `EmployeeScheduleRepository` (lock by ids / job level without override / cadence; resolve effective cadences / tiers; `saveSchedules`).
- `backend/src/modules/employee/infrastructure/postgres-employee-schedule.repository.ts` (new): set-based SQL — `SELECT … ORDER BY e.employee_id FOR UPDATE OF e` with the three cadence tiers (inactive skipped), `UPDATE employee … FROM unnest($1::uuid[], $2::timestamptz[], $3::date[])` writing only the two schedule columns; due date stored as the business date at 00:00 UTC.
- `backend/src/modules/employee/application/review-schedule.service.ts` (new): `ReviewScheduleService` implements `EvaluationPublishedHandler`, `ReviewCadenceChangeHandler`, `JobLevelCadenceChangeHandler`; `onEvaluationsPublished`, `captureEmployees/JobLevel/Cadence` (lock BEFORE the write), `applyRecalculation` (AFTER the write, from the existing base, writes/audits only changed due dates), batched audit `SCHEDULE_UPDATED` / `SCHEDULE_RECALC` with JSON payload (employee_id, trigger, evaluation_id, base, due date, effective cadence id/code/interval/source).
- `backend/src/modules/employee/application/employee-cadence.service.ts`: override change runs lock + write + recalculation + audit in one `withAuditedTransaction`; response adds `effective_cadence.source`; new `updateEmployeeWithSchedule` (HR/Admin for job level change, `VersionMismatch` 409 mapping, audit `job_level_id`, recalculation); `getEmployeeCadenceInfo` / `resolveEffectiveCadences` via the owner.
- `backend/src/modules/employee/api/employee.controller.ts`: removed hard-coded `calculateNextReviewDate` / `cadenceToMonths`; create/update ignore `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`; update persists via `updateEmployeeWithSchedule` (401 without actor); create accepts a validated `review_cadence_override_id` (active cadence, FE already sent it but it was silently dropped); list/detail add `effective_cadence{…, source}` (one resolve query per page).
- `backend/src/modules/employee/infrastructure/postgres-employee.repository.ts`: generic INSERT/UPDATE no longer write legacy cadence or schedule columns; mapper normalizes `next_review_due_date` to `YYYY-MM-DD` and the completion timestamp to ISO; dead `cadenceToMonths` removed.
- `backend/src/modules/employee/employee.module.ts`: `createReviewScheduleService` factory; module accepts the shared instance.

**Backend — publish paths**
- `backend/src/modules/evaluation/application/services/evaluation.service.ts`, `evaluation.module.ts`: `publishEvaluation` calls `EvaluationPublishedHandler.onEvaluationsPublished` in the same transaction; refuses to publish (500 `REVIEW_SCHEDULE_NOT_CONFIGURED`) if not wired.
- `backend/src/modules/calibration/{application/calibration.service.ts, domain/calibration.repository.ts, infrastructure/postgres-calibration.repository.ts, calibration.module.ts}`: `transitionEvaluationsAndAutoPublish` returns `RETURNING evaluation_id, employee_id, published_at`; finalize calls the handler in the same transaction.

**Backend — cadence sources**
- `backend/src/modules/organization/{domain/job-level-cadence-change-handler.ts (new), domain/repositories.ts, infrastructure/postgres-repositories.ts, application/organization.service.ts, api/organization.controller.ts, organization.module.ts}`: default cadence change → HR/Admin check, `withAuditedTransaction` (lock job level, capture employees without override, update, audit `JOB_LEVEL/UPDATE default_review_cadence_id`, apply recalculation); other job-level updates unchanged.
- `backend/src/modules/review-cadence/{domain/review-cadence-change-handler.ts (new), domain/cadence-precedence-resolver.ts, domain/review-cadence.types.ts, domain/review-cadence.repository.ts, infrastructure/postgres-review-cadence.repository.ts, application/review-cadence.service.ts, review-cadence.module.ts, index.ts}`: `resolveEffectiveCadenceWithSource` + `ReviewCadenceSource`; repository writes take the transaction client (fixes pre-existing writes outside the audited transaction); create (new active system default) / update (`interval_months`/`active`/`is_system_default`) / delete (system default) prepare + apply recalculation via the port; BR-7 unchanged.
- `backend/src/modules/review-cadence/application/review-schedule.service.ts`: **deleted** (old second owner).
- `backend/src/modules/review-cadence/domain/review-due-calculator.ts`: removed the old UTC `calculateNextReviewDueDate`.
- `backend/src/modules/review-cadence/{application/review-due.service.ts, domain/review-due.types.ts}`: adds `employee_code` and `effective_cadence.source` (SQL `CASE`).
- `backend/src/modules/jira-crawler/jira-crawler.controller.ts`: `markReviewed` no longer writes the schedule; `PATCH /collector/jira/members/:code/cadence` → `422 REVIEW_SCHEDULE_READ_ONLY` for `nextReviewDueDate`/`reviewCadenceMonths`.

**Backend — cross-cutting**
- `backend/src/modules/audit/{domain/audit.domain.ts, domain/audit.repository.ts, application/audit.service.ts, infrastructure/postgres-audit.repository.ts}`: actions `SCHEDULE_UPDATED`, `SCHEDULE_RECALC`; `recordMany` + optional `insertMany` (multi-row INSERT, per-row zod validation).
- `backend/src/shared/database/query-executor.ts`: `toQueryExecutor` adapter so `QueryExecutor`-typed repositories join a transaction client.
- `backend/src/app.ts`: one shared `ReviewScheduleService` injected into evaluation, employee, organization, calibration, review-cadence.
- `backend/src/config/swagger.ts`: `EffectiveCadence` schema, schedule fields on `Employee`, PATCH employee / job level behavior, 403/409.
- `backend/migrations/1791000000008_seed_review_schedule_ui_i18n_translations.ts` (new): EN/VI labels (ORGANIZATION_UI, REVIEW_DUE_UI); `down` deletes only its own keys.
- `docs/LLD_Employee_Performance_Evaluation_System.md`: line 357 (PUBLISHED only), column note for `next_review_due_date`, §14.1 implementation notes.

**Backend tests**
- New: `src/modules/employee/domain/review-schedule.test.ts` (TC01–TC10), `test/review-schedule.service.test.ts` (TC16–TC23), `test/review-schedule-publish.integration.test.ts` (TC24–TC31), `test/review-schedule-recalculation.integration.test.ts` (TC32–TC50, TC38/TC39 repo SQL), `test/review-schedule-drift.regression.test.ts` (TC51 `should_recalculate_from_last_completed_date_without_schedule_drift`, TC52), `test/review-schedule-boundaries.test.ts` (TC53–TC58), `test/mocks/review-schedule-fixture.ts` (transaction-aware in-memory world: snapshot on BEGIN, restore on ROLLBACK, fault injection).
- Extended: `cadence-precedence-resolver.test.ts` (TC11–TC15).
- Adjusted to the new contracts: `calibration-workflow`, `calibration`, `concurrency-hardening`, `e2e-full-lifecycle`, `evaluation-publish-lock` (inject handler, assert it is called with the publish client), `review-cadence-service` (delete receives the tx client), `historical-evaluation-regression` (scenarios C–E on the new owner, `eslint-disable any` removed), `review-due-calculator.test.ts` (removed tests of the deleted function).

**Frontend** (implemented by a delegated agent from the approved spec, reviewed and adjusted)
- Types/models/mappers: `organization/api/organization-types.ts`, `organization/domain/organization-models.ts`, `organization/domain/organization-mappers.ts` (`effectiveCadence` with `source`; schedule/legacy fields removed from create/update requests); review-due `types/review-due.types.ts` rewritten to the real contract, new `evaluation-cycles/domain/review-due-models.ts`, `review-due-mappers.ts`, `api/review-due-keys.ts`, `api/review-due-api.ts` (page/page_size).
- Keys/invalidation: `organization-keys.ts` (`employees.cadence(id)`), `hooks/useEmployees.ts` (`useEmployee(id)`, invalidations), `hooks/useJobLevels.ts`, `hooks/useReviewCadences.ts`, `evaluation-cycles/hooks/useReviewDue.ts`, `evaluation/hooks/evaluation-publish-invalidation.ts` + `EvaluationDetailPage.tsx` (publish invalidates review-due + employees).
- UI: `EmployeeFormModal.tsx` (all client date math, Last/Next inputs, legacy cadence select removed; error code, 409 reload hint), new `EmployeeReviewSchedulePanel.tsx` (read-only schedule + HR/Admin override select), `EmployeeTable.tsx` (effective cadence column), `domain/review-schedule-display.ts`, `hooks/useCanManageReviewCadence.ts`, `ReviewDueDashboard.tsx` (domain model, `JOB_LEVEL_DEFAULT`, `NO_SCHEDULE`, pagination, page-level counts), `IndividualEvaluationModal.tsx` (domain fields).
- Reviewer adjustment: new `shared/utils/timestamp-display.ts` — completion timestamps are shown as the viewer's local date instead of `slice(0,10)` (UTC date differs near midnight); used by the panel, table and dashboard; FE fixtures moved to midday timestamps so tests are timezone-independent.
- Tests: `organization/components/__tests__/EmployeeReviewSchedule.test.tsx` (TC61–TC69), `EmployeeTable.test.tsx` (TC74), `organization/hooks/__tests__/cadence-invalidation.test.tsx` (TC70, TC71), `evaluation-cycles/domain/__tests__/review-due-mappers.test.ts` (TC72), `evaluation-cycles/pages/__tests__/ReviewDueDashboard.test.tsx` (TC73), `evaluation/hooks/__tests__/evaluation-publish-invalidation.test.ts` (TC75).
- `docs/next-review-due-date-auto-update/frontend-user-guide.md` (new).

Decisions Applied:
- Single owner in the employee module; review-cadence / organization / evaluation / calibration depend only on ports (no cross-module table access, no import cycle).
- Two-phase recalculation (capture + lock BEFORE the write, apply AFTER) so the audit carries the real old effective cadence; locks in `employee_id` order.
- `next_review_due_date` physical column is `timestamptz` (migrations `1788926000003/4`), not `date` as in the LLD: no schema change (per approved plan); the business date is stored at 00:00 UTC and read with UTC components — consistent with existing readers that use `toISOString().slice(0,10)`.
- Publishing without a wired schedule handler is refused (500 `REVIEW_SCHEDULE_NOT_CONFIGURED`) rather than silently skipping the schedule.
- Schedule audit only when the due date actually changes; entity audits (`EMPLOYEE`, `JOB_LEVEL`, `REVIEW_CADENCE`) record the cadence change itself.
- New active system-default cadence: fallback group captured with a placeholder cadence id before the row exists.
- Review-due status tiles count the current page (backend has no counts); "Total" uses the server total.

Deferred / Not Changed:
- TC60 (real-Postgres publish atomicity) and `npm --prefix backend run test:migrations`: **not executed / not written** — no `TEST_DATABASE_URL`, Docker or local Postgres available on this machine; atomicity is covered by the transaction-aware fixture (TC24–TC28, TC41, TC50).
- `approveEvaluation` still does not auto-publish; `APPROVED → LOCKED` does not update the schedule; review-due / notification `CURRENT_DATE` timezone; no backfill; legacy columns not dropped (all out of scope per Steps 2–4).
- Employee edit + override change remain two requests from the form (pre-existing flow).
- `EmployeeFormModal` keeps its pre-existing `react-hooks/exhaustive-deps` disable; the override reason label is still hard-coded Vietnamese (pre-existing).

## Inputs Reviewed
Approved Steps 0–5; source files listed above; frontend agent report.

## Actions and Evidence
- `npm --prefix backend run typecheck` → exit 0.
- `npm --prefix backend run lint` → exit 0 (0 problems).
- `npx vitest run` (backend) → 72 passed | 6 skipped files, 789 passed | 30 skipped tests (4 consecutive clean runs; one earlier run with FE tests executing concurrently showed 1 failing test, not reproduced — to be checked in Step 7).
- `npm --prefix frontend run typecheck` → exit 0; `npm --prefix frontend run lint` → 0 errors, 5 pre-existing warnings; `npm --prefix frontend test` → 40 files / 154 tests passed (after fixing 2 tests broken by the timestamp display change).
- `echo $TEST_DATABASE_URL` → unset; `docker` / `pg_isready` → not found.

## Risks / Blockers
- Job-level default change and employee job-level change running concurrently: the job-level row is locked, but an employee moving INTO the level concurrently reads the default without that lock (read committed); impact: at most one stale due date until the next trigger.
- Near-midnight display of historical values computed by the old UTC logic may differ by one day until recalculated.

## Next Step
Step 7 — Test.
