# Step 7: Test

Status: produced during this step.

## Deliverable

## Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit (BE) | `npx vitest run src/modules/employee/domain/review-schedule.test.ts src/modules/review-cadence/domain test/review-schedule.service.test.ts` (in `backend/`) | PASS | 4 files, 44 tests — TC01–TC23 |
| Integration (BE) | `npx vitest run test/review-schedule-publish.integration.test.ts test/review-schedule-recalculation.integration.test.ts test/review-schedule-boundaries.test.ts` | PASS | 3 files, 35 tests — TC24–TC50, TC53–TC58 (transaction-aware fake: rollback restores state) |
| Regression (BE) | `npx vitest run test/review-schedule-drift.regression.test.ts test/historical-evaluation-regression.test.ts test/evaluation-publish-lock.test.ts test/calibration-workflow.test.ts test/calibration.test.ts test/concurrency-hardening.test.ts test/e2e-full-lifecycle.test.ts test/review-cadence-service.test.ts test/review-due-scheduling.test.ts test/employee-api.test.ts test/organization.service.test.ts` | PASS | 11 files, 129 passed / 1 skipped (pre-existing skip) — TC51 `should_recalculate_from_last_completed_date_without_schedule_drift`, TC52, TC59 |
| Full suite (BE) | `npm --prefix backend test` | FAIL (1, pre-existing flaky, unrelated) | 71 passed / 1 failed / 6 skipped files; 788 passed / 1 failed / 30 skipped tests. Failure: `performance-benchmarks.test.ts` › Benchmark 1 "1,000 evaluations within <500ms" measured 958 ms under full-suite load. Benchmark 1 only calls `ScoringEngine.calculate` (not modified by this task). Same file run alone 3×: 9/9 passed each time. Also noted as flaky in the earlier attempt's artifacts. |
| Integration (real Postgres, TC60) | — | NOT EXECUTED | No `TEST_DATABASE_URL`, Docker or local Postgres on this machine; test not written (would be unverifiable). |
| Migration check | `npm --prefix backend run test:migrations` | NOT EXECUTED (skipped by guard) | Ran: 1 test skipped because `TEST_DATABASE_URL` is unset. Migration `1791000000008` therefore not applied against a DB. |
| Type Check (BE) | `npm --prefix backend run typecheck` | PASS | exit 0 |
| Lint (BE) | `npm --prefix backend run lint` | PASS | 0 problems |
| Build (BE) | `npm --prefix backend run build` | PASS | exit 0 |
| FE tests | `npm --prefix frontend test` | PASS | 40 files, 154 tests (targeted new tests: 6 files, 20 tests — TC61–TC75) |
| Type Check (FE) | `npm --prefix frontend run typecheck` | PASS | exit 0 (app + node configs) |
| Lint (FE) | `npm --prefix frontend run lint` | PASS | 0 errors, 5 warnings — all pre-existing, none on lines changed by this task (JiraCollectorPage ×2, EvaluationDetailPage:141, RoleTable, NotificationPreferencesPage) |
| Build (FE) | `npm --prefix frontend run build` | PASS | exit 0 (chunk-size warning pre-existing) |

Failures / Blockers:
- `performance-benchmarks.test.ts` Benchmark 1: timing-based, fails only under full-suite CPU load; exercises only the unchanged scoring engine; passes in isolation (3/3). Not caused by this task — requires an approved exception or a separate fix (out of scope).
- TC60 and migration check not executed: environment has no test database. Needs a run in an environment with a dedicated `TEST_DATABASE_URL` (≠ `DATABASE_URL`).

## Inputs Reviewed
Approved Step 5 test cases; Step 6 implementation.

## Actions and Evidence
- Commands exactly as listed in the table; outputs summarized from the vitest/tsc/eslint/vite summaries.
- `grep "^import" test/performance-benchmarks.test.ts` + `awk '/Benchmark 1/,/Benchmark 2/'` → Benchmark 1 uses `scoringEngine.calculate` only; `git diff --name-only` shows `scoring-engine.ts` unchanged.
- `npm --prefix frontend run lint` file list + `git diff -U0 EvaluationDetailPage.tsx` hunks (@@ 19, @@ 285) → warning line 141 not changed by this task.

## Risks / Blockers
See Failures / Blockers.

## Next Step
Step 8 — Code Review.
