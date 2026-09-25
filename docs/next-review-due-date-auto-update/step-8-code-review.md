# Step 8: Code Review

Status: produced during this step.

## Deliverable

## Code Review

Findings (all fixed in this step unless marked otherwise):
- **[High] `backend/src/modules/employee/application/review-schedule.service.ts` / `audit/domain/audit.domain.ts`:** audit actions `REVIEW_SCHEDULE_UPDATED` (23 chars) / `REVIEW_SCHEDULE_RECALCULATED` (28) exceed `audit_log.action varchar(20)` (`migrations/1724500000001_init_database_schema.ts:453`, never widened) → every publish / cadence change would fail on Postgres with 22001 and roll back. Not caught by the in-memory tests. **Fix:** renamed to `SCHEDULE_UPDATED` (16) / `SCHEDULE_RECALC` (15) in code, tests, Swagger, LLD and docs; added a guard test (`review-schedule.service.test.ts`) asserting both are ≤ 20 chars. Other `audit_log` columns checked: `field_name varchar(100)`, `source varchar(20)` (`APPLICATION_SERVICE` = 19) — OK.
- **[Medium] `employee/infrastructure/postgres-employee-schedule.repository.ts` (`lockWhere`):** locking and cadence resolution were one statement; under READ COMMITTED the joined cadence rows come from the pre-lock-wait snapshot, so a publish waiting behind a committed cadence change could save a due date on the old interval. **Fix:** lock (`SELECT … ORDER BY e.employee_id FOR UPDATE OF e`, base + due only) then resolve effective cadences in a separate statement; TC21 updated.
- **[Medium] `calibration/application/calibration.service.ts` + `infrastructure/postgres-calibration.repository.ts`:** (a) finalize re-publishes every evaluation of the cycle/scope, including already-PUBLISHED ones → the schedule hook would move those employees' base to the finalize time (drift); (b) a first fix based on the unlocked `getEvaluationsForSession` read was racy. **Fix:** `transitionEvaluationsAndAutoPublish` now uses a CTE `WITH previous AS (SELECT … FOR UPDATE)` and returns `previous_status`; only rows whose previous status ≠ `PUBLISHED` reach `onEvaluationsPublished`. Tests: TC27b (already-published employee keeps its base) + SQL shape test.
- **[Low] `employee/application/employee-cadence.service.ts` (`updateEmployeeWithSchedule`):** employee job-level change read the level default without locking `job_level`, racing a concurrent default change. **Fix:** `lockJobLevelsForShare` (old + new level, `FOR SHARE`, ordered) before capturing; test asserts order.
- **[Low] `frontend/src/features/calibration/hooks/use-calibration.ts`:** finalize (auto-publish) did not refresh review-due / employee views. **Fix:** invalidate `reviewDueKeys.all` + `organizationKeys.employees.all`; test `calibration/hooks/__tests__/finalize-invalidation.test.tsx`.
- **[Low] `frontend/src/shared/utils/timestamp-display.ts`:** completion date shown in the viewer's timezone could differ from the business base day. **Fix:** formatted in `BUSINESS_TIME_ZONE` (`VITE_BUSINESS_TIMEZONE`, default `Asia/Ho_Chi_Minh`, added to `frontend/.env.example`); test `shared/utils/__tests__/timestamp-display.test.ts`.
- **[Low, not fixed — accepted] `audit/infrastructure/postgres-audit.repository.ts` `insertMany`:** 9 bind params/row → > 7,281 audited employees in one change would exceed Postgres' 65,535-parameter limit. Target scale is ~1,000; chunking can be added if needed.
- **[Info, pre-existing, out of scope]** `INDIVIDUAL_CYCLE_CREATED` (24 chars) has the same `varchar(20)` problem (individual cycle creation would fail on a real DB) — recommend a separate task/migration widening `audit_log.action`. Calibration finalize still overwrites `published_at` of already-published evaluations and force-publishes non-calibrated evaluations of the scope (pre-existing behavior; schedule is now protected from it).

Review Checklist:
- Requirement correctness: PASS
- Architecture and module boundaries: PASS (single owner in employee; other modules use ports; no cross-module table writes)
- Security and RBAC/scope: PASS (override / job level / job-level default HR/Admin; publish HR/Admin unchanged)
- Data integrity, audit, and history: PASS (same-transaction audit; column widths verified; snapshots untouched; drift paths closed)
- Error handling and concurrency: PASS (409 VersionMismatch, 403/404/422; lock ordering, post-lock cadence read, locked calibration status)
- Type error: PASS (`npm --prefix backend run typecheck`, `npm --prefix frontend run typecheck` exit 0)
- Do not use type any: PASS (no `any` / new `eslint-disable` in changed code; removed one `eslint-disable no-explicit-any` from `historical-evaluation-regression.test.ts`)
- Remove import not use: PASS (`eslint .` 0 problems backend; frontend 0 errors, 5 pre-existing warnings)
- Regression risk: PASS (backend 72 files / 793 tests passed, 6 skipped; frontend 42 files / 157 tests passed)

## Inputs Reviewed
Full working-tree diff; independent adversarial review by a read-only sub-agent (findings verified against code before fixing); `migrations/1724500000001_init_database_schema.ts` audit_log definition.

## Actions and Evidence
- `sed -n 449,461p migrations/1724500000001_init_database_schema.ts` → `action varchar(20)`; `grep` over migrations → no ALTER of `audit_log.action`.
- `sed -n 183,250p postgres-calibration.repository.ts` → `getEvaluationsForSession` has no status filter.
- After fixes: `npm --prefix backend run typecheck` exit 0; `npm --prefix backend run lint` exit 0; `npm --prefix backend test` → 72 passed / 6 skipped files, 793 passed / 30 skipped tests; `npm --prefix frontend test` → 42 files / 157 tests passed; `npm --prefix frontend run typecheck` exit 0; `npm --prefix frontend run lint` → 0 errors, 5 pre-existing warnings.

## Risks / Blockers
- Real-Postgres execution (TC60, migrations) still not run — the High finding shows why it matters; strongly recommended before merge.

## Next Step
Step 9 — Performance Review.
