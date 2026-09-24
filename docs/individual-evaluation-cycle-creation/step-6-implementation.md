# Step 6: Implement

Status: produced during this step

## Deliverable

### Implementation

Changes Made:
- `backend/migrations/1791000000003_add-cycle-type-and-trigger-to-evaluation-cycle.ts`: `cycle_type` (NOT NULL DEFAULT 'BATCH', CHECK), `triggered_by_employee_id` (FK employee), consistency CHECK, 2 indexes, reversible down.
- `evaluation-cycle/domain/evaluation-cycle.types.ts`: `EvaluationCycleType`, `cycleType`/`triggeredByEmployeeId`, `NON_ACTIVE_EVALUATION_STATUSES`, error codes `EVALUATION_ALREADY_OPEN`/`EMPLOYEE_NOT_ELIGIBLE`, `EvaluationEmployeeRecord`, `ActiveEvaluationRef`.
- `evaluation-cycle/domain/evaluation-cycle.repository.ts`: `NewEvaluationCycle`; `findUpcomingBatchCycles`, `lockEmployeesForEvaluation`, `findActiveEvaluationsByEmployees`.
- `evaluation-cycle/domain/applicable-employee-filter.ts` (new): single applicable-employee rule (SQL form for batch, in-memory form for warnings).
- `evaluation-cycle/infrastructure/postgres-evaluation-cycle.repository.ts`: new columns everywhere; `FOR UPDATE OF e` ordered lock; active-evaluation query; upcoming DRAFT batch query.
- `evaluation-cycle/application/evaluation-generation.service.ts` (new): EVAL-02 logic extracted verbatim from `openCycle` — `prepareTemplateSnapshot`, `generateEvaluations`, `enqueueCycleOpenedNotifications`.
- `evaluation-cycle/application/actor-resolution.ts` (new): `resolveValidEmployeeId`/`resolveValidUserId` moved verbatim from the opening service.
- `evaluation-cycle/application/evaluation-cycle-opening.service.ts`: `openCycle` now delegates to the shared service; behavior unchanged.
- `evaluation-cycle/application/individual-cycle-creation.service.ts` (new): individual flow (dedup, lock, 404/403/422, skip + all-skipped 409, warnings, per-employee cycle + generation + audit + notification, single transaction).
- `evaluation-cycle/api/evaluation-cycle.dto.ts`, `evaluation-cycle.controller.ts`, `evaluation-cycle.router.ts`, `evaluation-cycle.module.ts`, `index.ts`: DTO, controller, route `POST /evaluation-cycles/individual` (HR_ADMIN/SYSTEM_ADMIN/MANAGER), wiring, `cycle_type`/`triggered_by_employee_id` in cycle responses.
- `backend/src/modules/audit/domain/audit.domain.ts`: `INDIVIDUAL_CYCLE_CREATED`.
- `backend/src/config/evaluation-cycle.config.ts` (new), `backend/.env.example`, `.env.example`: `UPCOMING_BATCH_CYCLE_WINDOW_WEEKS` (default 4), business-today window.
- `backend/src/config/swagger.ts`: new path.
- `docs/LLD_Employee_Performance_Evaluation_System.md`: §10.3 / §14.1 implementation notes.
- Backend tests (new): `test/mocks/evaluation-generation-fixture.ts`, `test/evaluation-cycle-opening-regression.test.ts`, `test/individual-evaluation-cycle.test.ts`, `test/individual-evaluation-cycle-repository.test.ts`, `test/individual-evaluation-cycle-api.test.ts`.
- FE `features/evaluation-cycles/types/cycle-types.ts`: `CycleType`, optional `cycleType`/`triggeredByEmployeeId`, individual domain types, code constants.
- FE `api/cycle-api.ts`: wire types, `mapIndividualCycleCreateRequest`, `mapIndividualCycleCreationResult` (warning dedup), `createIndividualCycles`.
- FE `hooks/use-evaluation-cycles.ts`: `useCreateIndividualCyclesMutation` (invalidates `['evaluation-cycles']`, `['organization','employees']`).
- FE `domain/employee-review-status.ts` (new): review-status helpers moved verbatim out of `EvaluationCycleForm.tsx` (form now imports them).
- FE `components/IndividualEmployeePicker.tsx`, `components/IndividualCycleResultPanel.tsx`, `pages/IndividualCycleCreatePage.tsx` (new).
- FE `App.tsx` (route `/admin/individual-cycles`, title), `shared/layout/Sidebar.tsx` (menu item), `pages/EvaluationCycleListPage.tsx` (button), `index.ts` (exports).
- FE test: `api/__tests__/individual-cycle-api.test.ts`.

Decisions Applied:
- Q1–Q10, C1–C8 as approved.
- EVAL-02 extraction verified by a one-off equivalence run (original `openCycle` from git HEAD vs refactored, same fixture): identical evaluations, items, audit, notifications, write statements and query set. Temporary files deleted.
- Upcoming-batch matching done in memory with the shared applicable rule instead of SQL `DISTINCT` (keeps one rule for batch and warnings; dedup by `(employee, cycle)` key).
- Route is `/admin/individual-cycles` (not `/cycles/individual/new`) to fit the sidebar `/admin/<id>` convention and page-title mapping.
- New `EvaluationCycleDTO` fields are optional (same as existing `applicableEmployeeIds?`) so static mock fixtures stay valid; the mapper always sets them.
- Warnings are returned in `data.warnings` (no `meta.warnings` convention exists).

Deferred / Not Changed:
- DB integration tests (`runIf(DATABASE_URL)`) not written: no local DB to run them; concurrency/rollback covered by mock-based unit tests only.
- FE page component test (`IndividualCycleCreatePage.test.tsx`) not saved (tool write interrupted); user asked to test manually.
- Per user instruction, CLI test/typecheck/lint runs stop here; the user tests. Evidence already observed before that instruction: backend `typecheck` PASS, backend `lint` PASS (after removing one unused import), backend new test files 4/4 PASS (6 + 19 + 9 + 6 tests). Frontend typecheck/lint/test after the final FE edits: NOT RUN.
- `ReviewDueDashboard` stub, `EvaluationCycleService` actor helpers, `RbacAuthorizer`: untouched.

## Inputs Reviewed
- Approved Steps 0–5; files listed above.

## Actions and Evidence
- `npm --prefix backend run typecheck` → no errors.
- `npm --prefix backend run lint` → 1 error (unused `Conflict`), fixed; rerun not performed after the fix.
- `npm --prefix backend test -- <file>` for the 4 new backend test files → all passed.
- `npm --prefix frontend ci` → completed (exit 0) to restore missing `node_modules`; `package-lock.json` unchanged.
- Earlier FE `lint` run → 1 error (unused `COLORS`) and 2 new react-refresh warnings; both fixed by removing the import and moving helpers to `domain/`; rerun not performed.

## Changes Made
- See Deliverable.

## Decisions and Rationale
- See Decisions Applied.

## Risks / Blockers
- Frontend code not type-checked/linted after final edits (user will verify).
- No execution against real Postgres.

## Next Step
Step 7 — Test (user performs manual/CLI testing).

## Revision (user feedback during Step 7): UI aligned with existing screens
- `IndividualCycleCreatePage.tsx`: same shell as `EvaluationCycleUpsertPage` / `EvaluationCycleForm` — back link, gradient form card, titled section cards (Employees, Evaluation Template, Cycle Details), right-aligned footer with Cancel + primary action, result shown in a section card with Done / Create another.
- `IndividualEmployeePicker.tsx`: same employee cards as the batch form (name, code badge, email, next review, review-status badge), Selected/Overdue/Upcoming/Not due tiles, selected chips, Clear; **no inner vertical scroll** — client-side paging (8 per page, Previous/Next like Employee Search), 2-column responsive grid.
- Evidence: `npm --prefix frontend run typecheck` → no errors; `npm --prefix frontend run lint` → no findings in changed files.

## Revision (user feedback after Step 10): i18n like AUDIT_UI, dark/light theme, responsive
- `backend/migrations/1791000000004_seed_individual_cycle_ui_i18n_translations.ts` (new): seeds `INDIVIDUAL_CYCLE_UI` en/vi strings (keys prefixed `ic_`, snake + camel variants, fixed entity_id `c1000000-0000-0000-0000-000000000001`), same pattern as `1788926000020_seed_audit_ui_i18n_translations`; served by the existing `GET /api/i18n/ui-translations` (`entity_type LIKE '%_UI'`) and cached in localStorage `kpi_ui_translations`.
- `backend/src/modules/i18n/domain/i18n.types.ts`, `frontend/src/features/i18n/components/entity-translation-constants.ts`: register `INDIVIDUAL_CYCLE_UI` (editable in I18n Translation screen).
- `frontend/src/features/evaluation-cycles/hooks/use-individual-cycle-ui.ts` (new): `useIndividualCycleTranslation` (wraps `useUiTranslation`, `{var}` interpolation, English fallbacks) and `useIsMobile` (768px, same as AppLayout).
- `IndividualCycleCreatePage`, `IndividualEmployeePicker`, `IndividualCycleResultPanel`: all strings via `t(key, fallback)`; `useTheme().isDark` palettes for error/success/warning boxes, avatar, links and selected rows (surfaces use `--bg-*`/`--text-*` CSS variables); responsive: mobile hides Team/Next review columns (team shown under the name), single-column settings, stacked full-width footer buttons, stacked pager.
- Evidence: `npm --prefix frontend run typecheck` 0 errors; `npm --prefix frontend run lint` no findings in changed files; `npm --prefix backend run typecheck` / `lint` clean.
