# Step 7: Test

Status: produced during this step

## Deliverable

### Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit | `npm --prefix frontend test` | PASS | 60 files, 240 tests passed; exit 0. Includes new `EvaluationPickerList.test.tsx` (TC01–TC06). |
| Integration | — | NOT APPLICABLE | Frontend-only UI change; no backend, API or DB change (`git status --short -- backend` is empty). |
| Regression | `npm --prefix frontend test` (same run) | PASS | `UnifiedEvaluationsHubPage.test.tsx` (TC07), `shared/layout` Sidebar/Header tests (TC08), `SubTabs.test.tsx`, all other suites green. |
| Type Check | `npm --prefix frontend run typecheck` | PASS | exit 0, 0 `error TS` lines (app + node tsconfigs). |
| Lint | `npm --prefix frontend run lint` | PASS | exit 0, 0 errors, 0 warnings. |
| Build | `npm --prefix frontend run build` | PASS | exit 0, built in ~57s. Pre-existing Vite warning: chunks > 500 kB (`index`, `UserGuidePage`) — not introduced by this task. |

Manual test cases TC10–TC15 (browser layout, switching, EMPLOYEE view, scrollbars, responsive, missing data) were not executed by the agent; they were reviewed by the user from screenshots during the Step 6 iterations.

Failures / Blockers:
- None in this run.
- Note: in the first Step 7 run (before Step 6 revisions 22–24), `frontend/src/features/organization/components/__tests__/EmployeeReviewSchedule.test.tsx` failed once on a `findByRole('option', { name: 'Senior' })` wait while the whole suite ran (239/240); rerun alone it passed 11/11, and it passed in this full run. The organization module is untouched by this task — treated as a load-dependent flaky test.

## Inputs Reviewed

- `docs/ui-evaluations-hub-layout/step-5-test-cases.md`
- Changed files: `index.css`, `Sidebar.tsx`, `SubTabs.tsx`, `UnifiedEvaluationsHubPage.tsx`, `MyEvaluationPage.tsx`, `TeamEvaluationsPage.tsx`, `EvaluationPickerList.tsx`, `EvaluationOverviewPanel.tsx`, `EvaluationScoreSummaryPanel.tsx`, `PersonalDevelopmentPlanPanel.tsx`, `EvaluationDetailPage.tsx` (default PDP title only), new `EvaluationPickerList.test.tsx`.

## Actions and Evidence

- `git status --short -- backend` → no output (backend unchanged).
- `npm --prefix frontend test > /tmp/fulltest.txt; echo $?` → `TEST_EXIT=0`, `Test Files 60 passed (60)`, `Tests 240 passed (240)`.
- `npm --prefix frontend run typecheck` → `TYPECHECK_EXIT=0`, `grep -c "error TS"` → 0.
- `npm --prefix frontend run lint` → `LINT_EXIT=0`, no problems reported.
- `npm --prefix frontend run build` → `BUILD_EXIT=0`, `✓ built in 56.87s`.
- Earlier run: `EmployeeReviewSchedule.test.tsx` 1 failure in full suite; `npx vitest run <that file>` → 11 passed.
- Lint warnings found in the first run (3× `react-hooks/exhaustive-deps` on `selfEvaluations` in `MyEvaluationPage.tsx`) were fixed in Step 6 Revision 22 by wrapping it in `useMemo`.

## Changes Made

- None during this step (fixes were applied in Step 6 revisions 22–24 after the first run).

## Risks / Blockers

- Visual behaviour (fit-to-viewport, sticky headers, hidden scrollbars) has no automated coverage; relies on the user's browser checks.
- Open decision: backend `employee_id` filter bug in `postgres-employee.repository.ts#search` (fix here vs. separate task) — still unanswered.

## Next Step

Step 8 - Code Review.
