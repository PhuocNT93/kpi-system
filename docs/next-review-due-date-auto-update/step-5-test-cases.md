# Step 5: Define Test Cases

Status: reconstructed from the approved Step 5 response (approved by user: "Approve").

## Deliverable

## Test Cases

Legend: **U** unit (pure domain or service with fake client); **I** integration (real services + recording fake client asserting BEGIN/…/COMMIT/ROLLBACK and audit, pattern of `audit-transactional.test.ts`); **IDB** real Postgres guarded by `TEST_DATABASE_URL` (auto-skip); **FE** vitest + Testing Library. Base = `last_evaluation_completed_at`; TZ = `Asia/Ho_Chi_Minh`.

### Backend — date domain (`employee/domain/review-schedule.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Normal month | base `2026-01-15T03:00Z` | +6 | `2026-07-15` |
| TC02 | Month-end, non-leap | base business `2026-01-31` | +1 | `2026-02-28` |
| TC03 | Month-end, leap | base `2028-01-31` | +1 | `2028-02-29` |
| TC04 | Feb 29 + 12 | base `2028-02-29` | +12 | `2029-02-28` |
| TC05 | Year boundary | base `2026-11-30` | +3 | `2027-02-28` |
| TC06 | Near midnight (UTC previous day) | publish `2026-01-31T17:30:00Z` (= 00:30 Feb 1 +07) | +6 | base `2026-02-01` → `2026-08-01` (not `2026-07-31`) |
| TC07 | Near midnight, same business day | publish `2026-01-31T16:59:59Z` (= 23:59:59 +07) | +6 | base `2026-01-31` → `2026-07-31` |
| TC08 | Invalid interval | — | +0 / −1 | `RangeError` |
| TC09 | Not 30-day math | base `2026-01-31` | +1 | ≠ `2026-03-02` |
| TC10 | pg `date` read | local-midnight `Date` `2026-07-15` (+07) | `toDateOnlyString` | `"2026-07-15"` |

### Backend — precedence (`cadence-precedence-resolver.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC11 | Override wins | override + job level + system | resolve | override, `EMPLOYEE_OVERRIDE` |
| TC12 | Job-level default | no override | resolve | `JOB_LEVEL_DEFAULT` |
| TC13 | System default | no override, no job-level default | resolve | `SYSTEM_DEFAULT` |
| TC14 | Inactive override falls through | override inactive (null), job-level default present | resolve | `JOB_LEVEL_DEFAULT` |
| TC15 | No cadence | all null | resolve | `null` |

### Backend — `ReviewScheduleService` (`test/review-schedule.service.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC16 | Recalc from old base | base `2026-01-15`, due `2026-07-15`, 6m→12m, fake today `2026-05-01` | `recalculate` | due `2027-01-15`; base unchanged |
| TC17 | Base NULL | base NULL | `recalculate` | due stays NULL, no fake completion, no audit |
| TC18 | Unchanged due not written | same interval | `recalculate` | no save/audit for that employee |
| TC19 | Recalc audit payload | TC16 | `recalculate(EMPLOYEE_OVERRIDE_CHANGED)` | `REVIEW_SCHEDULE_RECALCULATED`, payload employee_id, trigger, base, old/new due, old/new cadence (id, code, interval, source), performedBy; no name/email |
| TC20 | Publish audit payload | cadence 6m | `onEvaluationsPublished` | `REVIEW_SCHEDULE_UPDATED`, `evaluation_id`, base = `publishedAt` |
| TC21 | Lock order | 3 unordered ids | `recalculate` | one `SELECT … FOR UPDATE … ORDER BY employee_id` |
| TC22 | Set-based batch | 1,000 employees | `recalculate` | 1 locking SELECT, 1 unnest UPDATE, 1 multi-row audit INSERT; no per-employee query |
| TC23 | No legacy columns | — | `saveSchedules` | SQL has no `review_cadence` / `review_cadence_months` |

### Backend — publish atomicity (`test/review-schedule-publish.integration.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC24 | Publish success | `APPROVED`, old base `2025-07-01`, cadence 6m, HR | `publishEvaluation` | `PUBLISHED`; base = `published_at`; due = business(`published_at`) + 6m; audits `PUBLISH` + `REVIEW_SCHEDULE_UPDATED`; BEGIN → UPDATE evaluation → lock employee → UPDATE employee → INSERT audit → COMMIT |
| TC25 | Schedule write fails | fake throws on `UPDATE employee` | `publishEvaluation` | ROLLBACK, no COMMIT, error propagated, no audit after failure |
| TC26 | Mandatory audit fails | `insertMany` throws | `publishEvaluation` | ROLLBACK incl. PUBLISHED |
| TC27 | Calibration finalize | 3 `CALIBRATION` evaluations, 3 employees | `finalizeSession` | all 3 bases = `published_at` from `RETURNING`, due recalculated, 3 `REVIEW_SCHEDULE_UPDATED`, one transaction |
| TC28 | Calibration hook fails | hook throws | `finalizeSession` | ROLLBACK, session not FINALIZED |
| TC29 | LOCK does not trigger | `PUBLISHED` | `lockEvaluation` | no `employee` query; schedule unchanged |
| TC30 | Idempotent publish | already `PUBLISHED` | `publishEvaluation` | returns evaluation, no hook, base not reset |
| TC31 | Publish RBAC | MANAGER | `publishEvaluation` | 403, no transaction |

### Backend — cadence changes (`test/review-schedule-recalculation.integration.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC32 | Override 6m→12m | base `2026-01-15`, due `2026-07-15`, fake today `2026-05-01` | `PATCH /employees/:id/review-cadence-override` (HR) | due `2027-01-15` (NOT `2027-05-01`); `source = EMPLOYEE_OVERRIDE`; audits override + recalculated; one transaction |
| TC33 | Clear override | override 12m, job-level 6m | set null | due = base + 6m, `JOB_LEVEL_DEFAULT` |
| TC34 | Unknown/inactive override cadence | — | PATCH | 404, no writes |
| TC35 | Override by MANAGER | — | PATCH | 403 |
| TC36 | Job level change, no override | A (6m) → B (3m), base `2026-01-15` | `PATCH /employees/:id {job_level_id}` (HR) | due `2026-04-15`, base unchanged, audits job_level_id + recalculated |
| TC37 | Job level change with override | override 12m | change job level | cadence stays override, due unchanged, no recalculated audit, job_level_id audit present |
| TC38 | Client schedule fields | — | PATCH with `next_review_due_date`, `last_evaluation_completed_at`, `review_cadence`, `review_cadence_months` | ignored; 200 |
| TC39 | Create with schedule field | — | `POST /employees {next_review_due_date}` | base/due NULL |
| TC40 | Job level by MANAGER | — | PATCH `job_level_id` | 403 |
| TC41 | Version mismatch | stale `version` | PATCH | 409 `VERSION_MISMATCH`, rollback, no audit |
| TC42 | Job-level default change | 3 no-override + 1 override employee; 6m→3m | `PATCH /org/job-levels/:id {default_review_cadence_id}` (HR) | 3 recalculated from own base; override employee unchanged; audits `JOB_LEVEL/UPDATE` + 3 recalculated |
| TC43 | Job level rename only | — | PATCH `name` | no recalc, unchanged behavior |
| TC44 | Job-level cadence by MANAGER | — | PATCH | 403 |
| TC45 | Cadence interval 6→9 | employee on C, base `2026-01-15` | `PATCH /review-cadences/:id {interval_months: 9}` | due `2026-10-15`; base not the edit date; audits `REVIEW_CADENCE/UPDATE` + recalculated; repo on transaction client |
| TC46 | Deactivate override cadence | override C, job-level D 12m | `active=false` | effective D, due = base + 12m |
| TC47 | System default change | S 6m → T 12m | move default to T | only no-override employees whose job level has no default recalculated |
| TC48 | Delete referenced cadence | referenced | DELETE | 409 `CADENCE_IN_USE` |
| TC49 | Cadence rename only | — | PATCH `name` | no recalc |
| TC50 | Recalc failure | hook throws | PATCH interval | ROLLBACK, old interval kept |

### Backend — drift regression (`test/review-schedule-drift.regression.test.ts`)

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC51 | `should_recalculate_from_last_completed_date_without_schedule_drift` | publish #1 completed `2026-01-31` (business), cadence 6m | (1) publish #1; (2) HR changes cadence 6→12 on fake `2026-05-10`; (3) publish #2 on `2026-09-15` | (1) due `2026-07-31`. (2) due `2027-01-31` ≠ old due + 12 (`2027-07-31`) ≠ change date + 12 (`2027-05-10`) ≠ today + 12; base still `2026-01-31`. (3) base = #2 completion, due `2027-09-15` |
| TC52 | Repeated changes no drift | base `2026-01-31` | 6→3→12→6 | each due = base + current interval; final `2026-07-31` |

### Backend — Jira, review-due, regression

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC53 | Jira markReviewed | — | apply `markReviewed: true` | no schedule UPDATE; `reviewMarked` kept |
| TC54 | Jira PATCH schedule | — | `PATCH …/cadence {nextReviewDueDate}` | 422 `REVIEW_SCHEDULE_READ_ONLY` |
| TC55 | Jira PATCH blueprint | — | PATCH | 200, only `blueprint_username` |
| TC56 | Review-due source | 3 employees, 3 sources | `GET /reviews/due` | correct `source`; `YYYY-MM-DD`; existing fields unchanged |
| TC57 | Employee detail/list effective cadence | — | `GET /employees/:id`, `GET /employees` | `effective_cadence{id, code, name, interval_months, source}`; list resolves in one query |
| TC58 | Historical snapshot | evaluation with snapshot items | change cadence/job level | no UPDATE on evaluation/evaluation_item; `published_at` unchanged |
| TC59 | Existing suite | — | `npm --prefix backend test` | existing tests still pass (adjusted to the new owner where needed) |
| TC60 | IDB publish atomicity | `TEST_DATABASE_URL` | publish success + injected failure | DB state matches TC24/TC25; skipped without env |

### Frontend

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC61 | Render backend data | detail with cadence (`12m`, `EMPLOYEE_OVERRIDE`), last completed, due `"2027-01-15"` | open modal (edit) | panel shows name, interval, source label, `2027-01-15` verbatim |
| TC62 | Override mutation | HR | pick cadence, Save | `updateEmployeeCadenceOverride(id, {review_cadence_override_id, reason})` once |
| TC63 | Invalidate after override | — | success | `employees.all`, `employees.cadence(id)`, `reviewDueKeys.all`; panel shows refetched due |
| TC64 | Job level refetch | — | PATCH `job_level_id` success | invalidations; new due from API, no reload |
| TC65 | No client date math | — | change cadence/job level | no Last/Next inputs; payload has no schedule fields; date unchanged until server responds |
| TC66 | Pending blocks duplicates | pending | double Save | disabled; called once |
| TC67 | 409 | `ApiClientError(409, VERSION_MISMATCH)` | Save | message + code + reload hint; values kept; modal open |
| TC68 | 422 | `ApiClientError(422, …)` | Save | server message; safe state |
| TC69 | Read-only | MANAGER/EMPLOYEE | render | no override select |
| TC70 | Job-level default hook | — | `useUpdateJobLevel` success | invalidate `jobLevels.all`, `employees.all`, `reviewDueKeys.all`; pending disabled |
| TC71 | Review cadence hooks | — | update/delete success | invalidate `reviewCadences.all`, `employees.all`, `reviewDueKeys.all` |
| TC72 | Review-due mapper | real backend shape | map | correct camelCase; no crash without `full_name` |
| TC73 | Dashboard render | real-shape mock | render | name, date string, source badge; no crash |
| TC74 | EmployeeTable | list with `effective_cadence` | render | cadence column = effective cadence; dates not shifted |
| TC75 | Publish invalidation | — | publish success | invalidate `reviewDueKeys.all` + `employees.all` |

### Required checks in Step 7
`npm --prefix backend test`, `run typecheck`, `run lint`; `npm --prefix frontend test`, `run typecheck`, `run lint`; `npm --prefix backend run test:migrations` and TC60 only with a dedicated `TEST_DATABASE_URL` (otherwise reported as NOT EXECUTED). Pre-existing lint errors in untouched files are reported separately.

## Inputs Reviewed
Approved Step 4 plan; existing test patterns.

## Next Step
Step 6 — Implement.
