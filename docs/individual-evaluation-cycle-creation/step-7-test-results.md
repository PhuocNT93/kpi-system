# Step 7: Test

Status: produced during this step

## Deliverable

### Test Results

Per user instruction ("không cần test cli đâu để user tự test"), the agent did not run CLI checks in this step. Only results actually observed during Step 6 are reported.

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit (backend, new) | `npm --prefix backend test -- test/evaluation-cycle-opening-regression.test.ts` | PASS | 6/6, observed in Step 6 |
| Unit (backend, new) | `npm --prefix backend test -- test/individual-evaluation-cycle.test.ts` | PASS | 19/19, observed in Step 6 |
| Unit (backend, new) | `npm --prefix backend test -- test/individual-evaluation-cycle-repository.test.ts test/individual-evaluation-cycle-api.test.ts` | PASS | 9/9 + 6/6, observed in Step 6 |
| Regression (EVAL-02) | one-off equivalence test (original `openCycle` vs refactored, temp files deleted) | PASS | identical payloads, audit, notifications, queries |
| Full backend suite | `npm --prefix backend test` | NOT RUN | user to run |
| Integration (Postgres) | — | NOT APPLICABLE | no local DB; not written |
| Migration | `npm --prefix backend run test:migrations` | NOT RUN | requires `TEST_DATABASE_URL` |
| Type Check (backend) | `npm --prefix backend run typecheck` | PASS | observed in Step 6 before the last lint fix |
| Lint (backend) | `npm --prefix backend run lint` | NOT RUN after fix | 1 unused import fixed, not re-run |
| Frontend test | `npm --prefix frontend test` | NOT RUN | user to run |
| Type Check (frontend) | `npm --prefix frontend run typecheck` | NOT RUN after final edits | earlier run failed only because `node_modules` were incomplete (fixed by `npm ci`) |
| Lint (frontend) | `npm --prefix frontend run lint` | NOT RUN after fix | earlier issues (unused import, 2 react-refresh warnings) fixed |

Failures / Blockers:
- None observed. Checks marked NOT RUN are pending the user's own testing.

## Inputs Reviewed
- Step 6 command outputs.

## Actions and Evidence
- No commands executed in this step (user instruction).

## Changes Made
- None.

## Decisions and Rationale
- Follow user instruction to let the user run the tests.

## Risks / Blockers
- Frontend typecheck/lint/tests unverified by the agent.

## Next Step
Step 8 — Code Review (after the user reports test results or approves).

## Update — user testing on the local Docker stack (WSL)
- Environment correction: Docker **is** available inside WSL Ubuntu (`kpi-system-postgres-1`, backend, frontend); the Step 2/3 statement "no local DB/docker" was wrong (only the Windows shell lacked `docker`).
- Migrations `1791000000000`–`1791000000003` confirmed applied (`pgmigrations`), `evaluation_cycle.cycle_type` / `triggered_by_employee_id` present.
- Test data (user-approved option b): template `TPL_INDIVIDUAL_TEST` (version `39dc6458-…`, 2 criteria, effective weight 100) inserted via SQL.
- Backend crash observed while the user created a template in the UI: pre-existing bug in `configuration.controller.ts` `createTemplate` (no try/catch → unhandled rejection; audit `performed_by` null). Not part of this task; not changed.
- User-verified in UI: selecting Lê Trọng Ân (has OPEN evaluation from seed cycle "2026 H2 KPI") → red alert "No evaluation was created", `EVALUATION_ALREADY_OPEN`, Request ID shown (TC-FE-04 / TC-BE-03b behaviour). Employee Search `STATUS` column confirmed as the existing place to see who has an open evaluation.
- UI revised twice per user feedback (existing design language; table like Employee Search; paging instead of inner scroll; content centered like Employee Search). FE typecheck: 0 errors; FE lint: no findings in changed files.
- User continued with "oke tiếp" (treated as Continue/approval of Step 7).
