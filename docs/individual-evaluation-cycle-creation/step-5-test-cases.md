# Step 5: Test Cases

Status: reconstructed from approved review output.

## Deliverable

### Test Cases

Type: **U** = unit (mock Pool/PoolClient, runs locally); **I** = integration against real Postgres (`runIf(DATABASE_URL)`, skipped locally); **FE** = vitest + Testing Library.

#### Backend

| ID | Type | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|---|
| TC-BE-01 | U+I | Single employee | A ACTIVE with team/role; template PUBLISHED, weight 100; A no active evaluation | create `[A]` as HR | 1 cycle `INDIVIDUAL_SCHEDULED`, OPEN, `triggered_by_employee_id=A`, `applicable_employee_ids=[A]`, code `IND-…`; 1 OPEN evaluation; items per template; 1 audit `INDIVIDUAL_CYCLE_CREATED`; `created` 1, `skipped`/`warnings` empty |
| TC-BE-02 | U | Multiple employees | A, B, C valid | `[A,B,C]` | 3 cycles, 1 evaluation each; 3 audits; `prepareTemplateSnapshot` called once |
| TC-BE-03a | U | Partial skip | A has `SELF_ASSESSMENT`, B none | `[A,B]` | 201; only B created; `skipped=[{A, EVALUATION_ALREADY_OPEN, existing_evaluation_id}]`; nothing for A |
| TC-BE-03b | U+I | All skipped | A, B active | `[A,B]` | 409 `EVALUATION_ALREADY_OPEN`, details A, B; no inserts/audit |
| TC-BE-03c | U | Active definition | statuses per C5 | `findActiveEvaluationsByEmployees` SQL/params | excludes APPROVED/PUBLISHED/LOCKED/REJECTED, `is_locked = false`, cycle ≠ LOCKED |
| TC-BE-04 | U | Duplicate ids | A valid | `[A,A,B]` | 2 cycles/evaluations; lock/query receive `[A,B]` |
| TC-BE-05 | U | Upcoming batch | Batch X DRAFT start today+10d applies to A; window 4w | `[A]` | 201 created + warning `{UPCOMING_BATCH_CYCLE, A, X, code, start_date}` |
| TC-BE-05b | U | Out of window / not DRAFT | batch start +5w or OPEN | `[A]` | no warning; from/to params correct per env and timezone |
| TC-BE-06 | U | Warning dedup | repo returns (A,X) twice | `[A]` | one warning |
| TC-BE-07 | U | Snapshot parity | same fixture | batch `openCycle` vs individual | identical item payload except `evaluationId`; evaluation snapshot from assignment at `start_date` |
| TC-BE-08 | I | Snapshot immutability | individual evaluation exists | change criterion/template/employee team | stored snapshots unchanged |
| TC-BE-09 | U+I | Rollback | `evaluationItemRepo.batchCreate` throws on 2nd employee | `[A,B]` | error propagates; ROLLBACK; (I) no rows/audit for A or B |
| TC-BE-10 | U | EMPLOYEE role | actor EMPLOYEE | POST | 403 `FORBIDDEN`; service not called |
| TC-BE-10b | U | Unauthenticated | no actor | POST | 401 |
| TC-BE-11 | U | Manager out of scope | managedTeamIds [T1]; A∈T1, B∈T2 | `[A,B]` / `[A]` | 403 nothing created / 201 |
| TC-BE-11b | U | HR/Admin org-wide | HR_ADMIN, SYSTEM_ADMIN | `[B]` | 201 |
| TC-BE-12 | U+I | Concurrency | A no active evaluation | (U) lock SQL `FOR UPDATE OF e … ORDER BY e.employee_id` runs before active query and inserts; (I) two `[A]` requests via `Promise.all` | (I) exactly one active evaluation for A |
| TC-BE-13 | U | EVAL-02 regression | fixed mock fixture | refactored `openCycle` | payloads match baseline; OPEN; audit `CYCLE_OPENED` with `evaluation_count`; response unchanged; notification enqueued |
| TC-BE-13b | U | Batch error regression | non-DRAFT / template not PUBLISHED / weight ≠ 100 / no eligible employees | `openCycle` | 409 `EVALUATION_CYCLE_NOT_EDITABLE`, 422 `TEMPLATE_NOT_PUBLISHED`, 422 `INVALID_TEMPLATE_CONFIGURATION` |
| TC-BE-14 | U | DTO validation | empty / non-uuid / >100 ids; bad dates; start > end; missing template | parse | 400 `VALIDATION_ERROR` with field details |
| TC-BE-15 | U | Ineligible employee | unknown / INACTIVE / missing team/role | `[X]` | 404 / 422 `EMPLOYEE_NOT_ELIGIBLE`; nothing created |
| TC-BE-16 | U | Invalid template | DRAFT or weight ≠ 100 | `[A]` | 422 `TEMPLATE_NOT_PUBLISHED` / `INVALID_TEMPLATE_CONFIGURATION` |
| TC-BE-17 | U | Audit content | success | `[A]` | `EVALUATION_CYCLE` / `INDIVIDUAL_CYCLE_CREATED`; newValue has cycle_type, triggered_by_employee_id, evaluation_id, template_version_id, evaluation_item_count; `performedBy` actor user id; transaction client |
| TC-BE-18 | U | Window config | unset / "6" / "0" / "abc" | reader | 4 / 6 / 4 warn / 4 warn |
| TC-BE-19 | U | Repo mapping | row `cycle_type` null | `mapRowToCycle` | `BATCH`, `null`; GET response has `cycle_type` |
| TC-BE-20 | U | Migration | migrations dir | migrations test | `1791000000003_*` exists, unique prefix |

#### Frontend

| ID | Type | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|---|
| TC-FE-01 | FE | HR/Admin entry | HR_ADMIN | render list page | "Create Individual Evaluation" → `/cycles/individual/new` |
| TC-FE-02 | FE | Request mapping | 2 employees, template, dates | submit + confirm | `postApi('/api/evaluation-cycles/individual', { employee_ids, evaluation_template_version_id, start_date, end_date, name })` |
| TC-FE-03 | FE | Success | `created` 2 | submit | success panel with 2 cycles; invalidates `['evaluation-cycles']` and employees key |
| TC-FE-04 | FE | 409 all blocked | `ApiClientError(409, EVALUATION_ALREADY_OPEN)` | submit | blocking `role="alert"`; no success state |
| TC-FE-04b | FE | Partial skip | 201 `skipped=[A]` | submit | success + red blocked block for A |
| TC-FE-05 | FE | Warning | 201 + `UPCOMING_BATCH_CYCLE` | submit | success + yellow warning with batch code/date |
| TC-FE-06 | FE | Warning dedup | duplicate (A,X) | map/render | one warning |
| TC-FE-07 | FE | Validation / unexpected | 400/422 message; 500 | submit | backend message + requestId; inputs preserved |
| TC-FE-07b | FE | Client validation | no employee/template; start > end | Review | field errors; no API call |
| TC-FE-08 | FE | EMPLOYEE | EMPLOYEE role | sidebar + list | no individual entry; route roles exclude EMPLOYEE |
| TC-FE-08b | FE | 403 | API 403 | submit | permission/scope alert |
| TC-FE-09 | FE | Manager scope | managedTeamIds [T1]; employees T1+T2 | render picker | only T1 employees |
| TC-FE-10 | FE | Loading / submitting | employees pending; mutation pending | render | spinner; submit disabled with pending label |

Required checks in Step 7: backend `test`/`typecheck`/`lint`; frontend `test`/`typecheck`/`lint`; `test:migrations` requires `TEST_DATABASE_URL` (expected unavailable locally; will be reported).

## Inputs Reviewed
- Steps 1–4.

## Actions and Evidence
- None (definition only).

## Changes Made
- None.

## Decisions and Rationale
- Mock-based unit tests cover ordering/rollback because no local database is available.

## Risks / Blockers
- Integration cases (I) will be skipped locally.

## Next Step
Step 6 — Implement.
