# Step 4: Plan

Status: reconstructed from the approved Step 4 response (approved by user: "Approve").

## Deliverable

## Implementation Plan

### Backend

1. **What:** Pure business-date domain: `toBusinessDate(instant, timeZone)` → `YYYY-MM-DD` via `Intl.DateTimeFormat('en-CA', {timeZone})`; `addCalendarMonths(dateOnly, months)` with month-end clamp (Jan 31 + 1 → Feb 28/29), `RangeError` for `months ≤ 0`; `calculateNextReviewDueDate(lastCompletedAt, intervalMonths, timeZone)`; `toDateOnlyString(value)` for pg `date` columns (local components, not `toISOString`).
   **Where:** new `backend/src/modules/employee/domain/review-schedule.ts`; delete the old `calculateNextReviewDueDate` from `review-cadence/domain/review-due-calculator.ts` (formula lives in one place); keep `calculateReviewDueStatus`.
   **Why:** AC2, §2.3 — no 30-day math, no UTC.
   **Tests:** `employee/domain/review-schedule.test.ts` — normal month, 31/01+1, 31/08+6, 29/02/2028+12, 30/11+3, 00:30 (+07) Feb 1 publish (= 17:30Z Jan 31) → Aug 1, interval ≤ 0; update `review-due-calculator.test.ts`.

2. **What:** Ports/DTOs: `ReviewCadenceChangeHandler { onCadenceChanged(client, change, actor) }` in `review-cadence/domain/review-cadence-change-handler.ts` (exported from `review-cadence/index.ts`); `EvaluationPublishedHandler { onEvaluationsPublished(client, events[], actorUserId) }` in `employee/domain/review-schedule.port.ts`; `EffectiveCadence = {id, code, name, intervalMonths, source}`; resolver returns `source`, still skipping inactive cadences.
   **Where:** those files + `review-cadence/domain/cadence-precedence-resolver.ts`.
   **Why:** single owner, no cycles (§2.1); `source` for the API (§4).
   **Tests:** extend `cadence-precedence-resolver.test.ts` with `source` for 7 combinations.

3. **What:** `EmployeeScheduleRepository` + `PostgresEmployeeScheduleRepository` (all methods take the transaction `client`): `lockForSchedule(ids)` (`FOR UPDATE ORDER BY employee_id` + 3 cadence sources, inactive skipped), `findIdsByJobLevel(jobLevelId, withoutOverride)`, `findIdsAffectedByCadence(cadenceId, isSystemDefaultChange)`, `saveSchedules(rows[])` (one `UPDATE employee … FROM unnest(...)`, only `last_evaluation_completed_at` / `next_review_due_date`), `resolveEffectiveCadences(ids)`.
   **Where:** `employee/domain/employee-schedule.repository.ts`, `employee/infrastructure/postgres-employee-schedule.repository.ts`.
   **Why:** only the employee module reads/writes these columns; set-based, no N+1 (§2.5).
   **Tests:** SQL/params via fake client (lock order, unnest, no legacy columns).

4. **What:** `ReviewScheduleService` (single owner, employee module), implements both ports: `onEvaluationsPublished` (lock, base = `publishedAt`, resolve, calculate, `saveSchedules`, audit `REVIEW_SCHEDULE_UPDATED` with `evaluation_id`); `recalculate(client, ids, trigger, actor, beforeCadences?)` (base unchanged; `NULL` stays `NULL`; only writes/audits `REVIEW_SCHEDULE_RECALCULATED` when the due date changes); `onCadenceChanged`; `resolveEffectiveCadence(s)`. Batched audit via new `AuditService.recordMany` + `AuditRepository.insertMany` (multi-row INSERT, per-row zod). Payload: employee_id, trigger, evaluation_id?, base, old/new due, old/new cadence {id, code, interval_months, source}, performedBy — no name/email.
   **Where:** `employee/application/review-schedule.service.ts`; audit service/repository/domain (2 new actions). Delete `review-cadence/application/review-schedule.service.ts` and its export.
   **Why:** §2.1, §2.2, §2.4, §3, anti-drift, Rule 9.
   **Tests:** service unit tests (fake client) + drift regression.

5. **What:** Publish hooks: `EvaluationService.publishEvaluation` calls `evaluationPublishedHandler.onEvaluationsPublished([...])` in the same transaction; `CalibrationService.finalizeSession` calls it for every published evaluation using `published_at` from `RETURNING` of `transitionEvaluationsAndAutoPublish` (returns `{evaluationId, employeeId, publishedAt}[]`). Hook failure rolls back. Handler mandatory when a pool exists.
   **Where:** `evaluation/application/services/evaluation.service.ts`, `evaluation/evaluation.module.ts`, `calibration/application/calibration.service.ts`, `calibration/infrastructure/postgres-calibration.repository.ts`, `calibration/calibration.module.ts`.
   **Why:** AC1, Risk #12, decision 1(a).
   **Tests:** publish success; hook throws → ROLLBACK and no audit; calibration finalize updates N employees; lock does not call the hook.

6. **What:** Employee override/job level: `updateCadenceOverride` moves checks inside the transaction (lock), resolves before/after, `recalculate` (trigger `EMPLOYEE_OVERRIDE_CHANGED`), response adds `effective_cadence.source`. New `EmployeeCadenceService.updateEmployeeWithSchedule(actor, existing, next)` in `withAuditedTransaction`: HR/Admin check if `job_level_id` changes (403), `employeeRepo.update(next, client)`, audit `EMPLOYEE/UPDATE job_level_id`, recalc if the effective cadence changed (`EMPLOYEE_JOB_LEVEL_CHANGED`). Controller `updateEmployee`/`createEmployee`: remove `calculateNextReviewDate`/`cadenceToMonths`, ignore client-sent schedule/legacy fields, persist via the service. `PostgresEmployeeRepository.update` no longer writes legacy/schedule columns; `create` leaves base/due `NULL`; `mapRowToEmployee` uses `toDateOnlyString`. `GET /employees` and `/employees/:id` add `effective_cadence{…, source}` (one query per page).
   **Where:** `employee/application/employee-cadence.service.ts`, `employee/api/employee.controller.ts`, `employee/api/employee.dto.ts`, `employee/infrastructure/postgres-employee.repository.ts`, `employee/employee.module.ts`.
   **Why:** §2.4, Rule 10, decisions Step 2 #4 and Step 3 #3.
   **Tests:** override 6m→12m mid-cycle, job level 6m→3m, job level with override, base `NULL`, RBAC 403, client schedule fields ignored, 409 version.

7. **What:** Job-level default change: `OrganizationService.updateJobLevel` gets `AuditService` + handler (`onJobLevelDefaultChanged`); when `default_review_cadence_id` changes: HR/Admin check, `withAuditedTransaction` → `jobLevelRepository.update(level, client)` + audit `JOB_LEVEL/UPDATE default_review_cadence_id` + recalc employees without override in that level (`JOB_LEVEL_DEFAULT_CHANGED`). Otherwise unchanged. Controller passes `actor`.
   **Where:** `organization/application/organization.service.ts`, `organization/api/organization.controller.ts`, `organization/infrastructure/postgres-repositories.ts` (`update(…, client?)`), `organization/domain/repositories.ts`, `organization/organization.module.ts`.
   **Why:** §2.5.
   **Tests:** affected employees recalculated; override employees unchanged; audit; 403 for MANAGER; 1,000 employees → one UPDATE.

8. **What:** Review cadence edit/delete: repository write methods accept `client` (fix pre-existing atomicity bug); `updateCadence`/`deleteCadence` call `changeHandler.onCadenceChanged(client, …)` in the same transaction when `interval_months`/`active`/`is_system_default` change or the system default is deleted; BR-7 unchanged.
   **Where:** `review-cadence/application/review-cadence.service.ts`, `review-cadence/infrastructure/postgres-review-cadence.repository.ts`, `review-cadence/domain/review-cadence.repository.ts`, `review-cadence/review-cadence.module.ts`.
   **Why:** §2.6, question 5.
   **Tests:** interval 6→9 → base + 9; deactivate override → job-level default; system default change → fallback group only; rename only → no recalc; audit.

9. **What:** Review-due API adds `effective_cadence.source`; `next_review_due_date` via `toDateOnlyString`; existing fields unchanged.
   **Where:** `review-cadence/application/review-due.service.ts`, `review-cadence/domain/review-due.types.ts`.
   **Why:** §4, decision 5.
   **Tests:** extend `review-due-scheduling.test.ts` (source, date format).

10. **What:** Block schedule writes outside the owner: Jira `applyMemberKpis` drops the schedule UPDATE on `markReviewed` (response keeps `reviewMarked`); `updateMemberCadence` → `422 REVIEW_SCHEDULE_READ_ONLY` for `nextReviewDueDate`/`reviewCadenceMonths`; `blueprintUsername` still allowed.
    **Where:** `jira-crawler/jira-crawler.controller.ts`.
    **Why:** single owner; no completion without a publish.
    **Tests:** `jira-review-schedule.test.ts` — no employee schedule UPDATE; PATCH schedule fields → 422.

11. **What:** Wiring: `app.ts` creates one `ReviewScheduleService` (employee module) before evaluation/calibration/organization/review-cadence and injects it; modules stop creating their own. Swagger: `effective_cadence.source`, PATCH employee ignores schedule fields, collector 422.
    **Where:** `backend/src/app.ts`, module factories, `config/swagger.ts`.
    **Tests:** existing `createApp` tests pass.

12. **What:** LLD + i18n: fix line 357 (PUBLISHED only); §14.1 owner, ports, business date/`BUSINESS_TIMEZONE`, inactive fall-through, `source`, Jira/controller cannot write the schedule. Migration `1791000000007_seed_review_schedule_ui_i18n_translations.ts` (pattern of `1791000000003`).
    **Where:** `docs/LLD_Employee_Performance_Evaluation_System.md`, `backend/migrations/`.
    **Tests:** `migrations.test.ts` (only with `TEST_DATABASE_URL`).

### Frontend

13. **What:** Types/model/mapper: `WireEmployee`/`OrgEmployee` add `effective_cadence{…, source}` → `effectiveCadence`; drop schedule/legacy fields from create/update requests; review-due DTOs to the real response + new camelCase mapper.
    **Where:** `features/organization/api/organization-types.ts`, `domain/organization-models.ts`, `domain/organization-mappers.ts`; `features/evaluation-cycles/types/review-due.types.ts`, `api/review-due-api.ts`, new `features/evaluation-cycles/domain/review-due-mappers.ts`.
    **Why:** §4, §5.3, map once.
    **Tests:** mapper unit tests.

14. **What:** Keys/invalidation: `organizationKeys.employees.cadence(id)`; `reviewDueKeys` factory; after employee update, override, job level update/bulk, review cadence create/update/delete → invalidate `employees.all`, `reviewDueKeys.all` (+ employee cadence); after publish (`EvaluationDetailPage`) add `reviewDueKeys.all` + `employees.all`.
    **Where:** `organization/api/organization-keys.ts`, `hooks/useEmployees.ts`, `hooks/useJobLevels.ts`, `hooks/useReviewCadences.ts`; `evaluation-cycles/hooks/useReviewDue.ts`; `evaluation/pages/EvaluationDetailPage.tsx` (invalidation only).
    **Why:** §5, FE rule L22.
    **Tests:** hook tests asserting `invalidateQueries` keys.

15. **What:** `EmployeeFormModal`/`EmployeeTable`: remove month map, date helpers, auto-fill effect, Last/Next inputs, legacy cadence select; new read-only "Review schedule" panel (Effective Review Cadence, Cadence Source, Last Evaluation Completed, Next Review Due Date as server strings); HR/Admin override select from `useReviewCadences({active:true})` incl. "No override"; refetch on success; pending disabled; errors show message + code, 409 reload hint, 422 server message, values kept; read-only for non HR/Admin; table cadence column shows `effectiveCadence`, dates as `YYYY-MM-DD` strings.
    **Where:** `organization/components/EmployeeFormModal.tsx`, `EmployeeTable.tsx`, new `EmployeeReviewSchedulePanel.tsx`.
    **Why:** §5.1, no client date math.
    **Tests:** see Step 5.

16. **What:** `ReviewDueDashboard` uses the mapped model (source `JOB_LEVEL_DEFAULT`, date strings); status tiles computed from the current page or hidden (minimal change, decided during implementation); no polling.
    **Where:** `evaluation-cycles/pages/ReviewDueDashboard.tsx`, `evaluation-cycles/hooks/useReviewDue.ts`.
    **Why:** §5.3, contract fix.
    **Tests:** dashboard render test with a real-shape mock.

17. **What:** `docs/next-review-due-date-auto-update/frontend-user-guide.md` + step artifacts.
    **Where:** `docs/next-review-due-date-auto-update/`.
    **Why:** workflow.
    **Tests:** N/A.

**Out of scope:** approve auto-publish; blocking `APPROVED → LOCKED`; backfill; dropping legacy columns; review-due/notification `CURRENT_DATE` timezone; refactoring the rest of the employee controller.

## Inputs Reviewed
Step 2/3 deliverables; `audit.repository.ts`, `postgres-audit.repository.ts`, `calibration.module.ts`, `calibration.service.ts` constructor, `organization.module.ts`, employee controller import paths.

## Actions and Evidence
- `grep -n` confirmed `AuditRepository.insert(params, client)` only (no batch insert), `createOrganizationModule(pool)` has no audit, `createCalibrationModule(pool, auditService?, notificationService?)`, employee import path does not touch schedule fields.

## Next Step
Step 5 — Define Test Cases.
