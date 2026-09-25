# Step 9: Performance Review

Status: produced during this step.

## Deliverable

## Performance Review

Findings:
- **N+1 — none.** Every schedule operation is set-based regardless of the number of affected employees: 1 locking `SELECT … FOR UPDATE OF e` + 1 effective-cadence `SELECT … WHERE employee_id = ANY($1)` + 1 `UPDATE … FROM unnest(...)` + 1 multi-row audit `INSERT` (TC22 asserts exactly this for 1,000 employees). Calibration finalize passes all newly published evaluations in one call. Employee list resolves effective cadences with one extra query per page (page size ≤ 100).
- **Indexes.** Lookups used by the new SQL are covered: `employee.employee_id` (PK) for `ANY($1::uuid[])`; `idx_employee_job_level_id` (job-level default change); `idx_employee_review_cadence_override_id` and `idx_job_level_default_review_cadence_id` (cadence change); `review_cadence` PK + partial unique index on `is_system_default`. `lockByCadence` uses an `OR` over three conditions (override / job-level default / fallback group), which Postgres will typically execute as a scan of `employee` with hash joins — at the target scale (~1,000 employees) this is a sub-millisecond-to-low-millisecond operation and runs only on an admin cadence edit. No new index justified without production evidence.
- **Transaction length.** Longest case: cadence / job-level default change touching ~1,000 employees → 4–5 statements while holding row locks on those employees (and on the job-level / cadence row). Publish locks one employee row per evaluation. No network calls or blocking work inside the transactions (notifications are only enqueued, as before).
- **Lock contention / deadlocks.** Employee rows always locked in `employee_id` order; job levels `FOR SHARE` in id order; evaluation rows locked before employee rows in both publish paths — consistent ordering, no cycle found in review.
- **Duplicate processing.** Unchanged due dates are neither written nor audited (TC18); a publish batch with the same employee twice writes once (latest completion); already-published evaluations in a calibration finalize are skipped.
- **Payload size.** Additive `effective_cadence` object (5 fields) per employee / review-due item; audit JSON ≈ 300 bytes per changed employee.
- **Bulk audit ceiling (accepted).** `insertMany` uses 9 parameters per row → max ≈ 7,281 rows per statement (Postgres 65,535-parameter limit). Beyond target scale; chunking can be added if the organization grows past that.
- **Frontend requests / renders.** The employee edit panel issues one `GET /api/employees/:id` when opened (to show refetched server values after mutations). Cadence-affecting mutations invalidate `employees.all` and `reviews/due` — broad by design because a single cadence change can affect many employees; only mounted queries refetch. Review Due Dashboard paginates (`page_size=50`); no polling added.
- **Reporting queries.** `GET /reviews/due` unchanged apart from a `CASE` expression and one extra column.

Actions Taken:
- None (no optimization without evidence). Measured: `npx vitest run test/review-schedule.service.test.ts -t "1,000"` → TC22 passes (1,000 employees: one lock, one resolve, one save, one audit batch).

## Inputs Reviewed
New repository SQL, ReviewScheduleService, calibration CTE, FE hooks/panel; migration index definitions (`grep "CREATE INDEX" migrations`).

## Actions and Evidence
- `grep -rhn "CREATE INDEX" migrations` → `idx_employee_job_level_id`, `idx_employee_review_cadence_override_id`, `idx_job_level_default_review_cadence_id` present.
- TC22 run as above (PASS).
- No `EXPLAIN` executed: no Postgres available in this environment.

## Risks / Blockers
- Query plans not verified on a real database (no Postgres here).

## Revisions per user feedback (during Step 9 review)
- **Employee table — no wrapping** (`frontend/src/features/organization/components/EmployeeTable.tsx`): every `<th>`/`<td>` gets `whiteSpace: 'nowrap'` (the table already scrolls horizontally); effective cadence badge and source label rendered on one line.
- **Duplicated cadence label** ("Quarterly (3 months) (3 months)"): new display helper `formatCadenceLabel` in `organization/domain/review-schedule-display.ts` appends `(N months)` only when the admin-defined name does not already mention N; used by `EmployeeTable`, `EmployeeReviewSchedulePanel`, `ReviewDueDashboard`. Test: `organization/domain/__tests__/review-schedule-display.test.ts`.
- **Dark theme — "Edit" text unreadable** (Job Roles / Job Levels, and every `variant="outlined"` button, 56 usages): `frontend/src/shared/ui/Button/Button.tsx` outlined variant is now theme-aware via `useTheme()` (dark: text `#e2e8f0`, border `#475569`). Test: `shared/ui/Button/__tests__/Button.theme.test.tsx`.
- Evidence: `npm --prefix frontend test` → 44 files / 161 tests passed; `npm --prefix frontend run typecheck` exit 0; `npm --prefix frontend run lint` → 0 errors, 5 pre-existing warnings.
- **"(undefined months)" in the override select / cadence lists** — pre-existing contract bug: `GET/POST/PATCH /review-cadences` returned the camelCase domain object (`intervalMonths`, `isSystemDefault`) while both FE clients read snake_case (`interval_months`). Fix: new `backend/src/modules/review-cadence/api/review-cadence.dto.ts` (`toReviewCadenceResponse`, snake_case) used by every controller response; test `backend/test/review-cadence-controller.test.ts`. Evidence: backend 73 files / 794 tests passed, typecheck + lint clean; frontend 44 files / 161 tests passed.
- **"Annual (12 months)" vs "Annually (12 months)"**: two distinct `review_cadence` rows (different `code`) with the same 12-month interval — configuration data, not code; behave identically in scheduling. Recommendation to the user: keep one, deactivate the other (reassign any override / job-level default first; delete is blocked while referenced).
- **Observed, pre-existing, not changed (needs decision):** flat UI i18n dictionary collision — `1791000000003` (REVIEW_DUE_UI) overrides `page_title` and `col_status` of `1791000000001` (ORGANIZATION_UI), so the Organization page shows "Review Due Dashboard" and status columns show "Due Status".

- **Employee table fits its container (no horizontal scroll)** after the nowrap change overflowed: compact cell padding (`0.625rem`), short headers `Cadence` / `Last Review` / `Next Review` with the full label as tooltip (new keys `emp_col_cadence`, `emp_col_last_review`, `emp_col_next_review`, seeded EN/VI in migration `1791000000008`), name/email ellipsis with `title`, cadence source moved to the badge tooltip. TC74 updated. Frontend: 44 files / 162 tests passed, typecheck + lint exit 0.

- **Layout tweaks (user feedback):** org tree sidebar 300px → 260px and sidebar/table gap 1.5rem → 1rem (`frontend/src/index.css`, `.org-structure-layout` / `.org-tree-sidebar`, ≥1024px); employee row "Edit" button replaced by a square neutral `IconButton` with the lucide `Pencil` icon (same `aria-label`, `title` = Edit), Actions column narrowed. Frontend 44 files / 162 tests passed; typecheck + lint exit 0.

- **500 on "Save Changes" in Edit Employee** (reported by user, reproduced from the running container log `wsl docker logs kpi-system-backend-1`): `error: invalid input syntax for type uuid: ""` — `unnamed portal parameter $7 = ''` in `PostgresEmployeeRepository.update` (`manager_id`). Pre-existing: the form sends `manager_id: ''` for "no manager" and the controller passed it through unchanged. Fix: `normalizeEmptyUuidFields` in `employee.controller.ts` (`''` → `null` for `manager_id`/`team_id`/`department_id`; `''` → not provided for `role_id`/`job_level_id`). Regression test added in `review-schedule-recalculation.integration.test.ts`. Backend: 73 files / 795 tests passed, lint exit 0. The running Docker backend must be rebuilt to pick it up.

## Sync with origin/develop (user request: "pull từ develop về và fix conflict", no commit)
- Base moved `e03e343` → `728504b` (13 upstream commits) by fast-forward; **no commit created**, task changes remain uncommitted in the working tree.
- Procedure (equivalent to stash/pull/pop, without stash): full backup in scratchpad (`premerge/tracked.patch`, `untracked.tar`, copies of the 7 overlapping files) → `git checkout HEAD -- <7 overlapping files>` → `git merge --ff-only origin/develop` → per-file 3-way `git merge-file` (base = `e03e343` blob, task copy, develop blob; LF-normalized).
- Auto-merged: `evaluation.service.ts`, `EvaluationDetailPage.tsx`, `Button.tsx` (develop added dark styles for `secondary`/`inverted`; task's dark `outlined` kept; single `useTheme()`).
- Conflicts resolved:
  - `review-due.types.ts` / `review-due.service.ts`: develop independently added `effective_cadence.source` with value `JOB_LEVEL` and compatibility fields. Kept the approved contract (`JOB_LEVEL_DEFAULT`, required `employee_code`) **plus** develop's additive fields (`full_name`, `team_id`, `team_name`, `job_level_id`, `job_level_name`, `days_until_due`).
  - `review-due-api.ts`: develop's inline adapter (old DTO shape, `JOB_LEVEL`, client-side counts) superseded by the task's mapper/domain model; leftover `RawReviewDue*` types and unused import removed.
  - `ReviewDueDashboard.tsx`: task's domain model kept, with develop's defensive fallbacks (`employeeName || employeeCode || '—'`).
- **Migration prefix collision**: develop added `1791000000007_seed_navigation_and_screens_ui_i18n_translations.ts`; task migration renamed to `1791000000008_seed_review_schedule_ui_i18n_translations.ts` (no shared i18n keys; docs updated).
- Evidence after merge: backend typecheck exit 0, lint exit 0, tests 73 files passed / 6 skipped (794 passed / 30 skipped); frontend typecheck exit 0, lint exit 0, tests 44 files / 162 passed; no conflict markers left; `git rev-list --left-right --count HEAD...origin/develop` → `0 0`; no stash entries.

## Next Step
Step 10 — Final Verification.
