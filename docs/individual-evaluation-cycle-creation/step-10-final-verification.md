# Step 10: Final Verification

Status: produced during this step

## Deliverable

# Task Completed

## Summary
`POST /evaluation-cycles/individual` creates one `INDIVIDUAL_SCHEDULED` evaluation cycle (status OPEN) per selected employee, with evaluations, items and snapshots produced by the **same** EVAL-02 code as batch Open Cycle (extracted into `EvaluationGenerationService`, equivalence verified). Employees with an active evaluation are skipped (all skipped → 409 `EVALUATION_ALREADY_OPEN`), concurrency is serialised by ordered employee row locks, non-blocking deduplicated `UPCOMING_BATCH_CYCLE` warnings are returned, and each cycle writes an in-transaction `INDIVIDUAL_CYCLE_CREATED` audit. Frontend page `/admin/individual-cycles` (HR/Admin/Manager) follows the existing design (Employee Search–style table, paging, cards).

## Changes
- DB: migration `1791000000003` (`cycle_type`, `triggered_by_employee_id`, CHECKs, indexes).
- Backend: shared generation service; refactored `openCycle`; individual creation service; repository methods; DTO/controller/route/module; audit action; window config; swagger; LLD §10.3/§14.1.
- Frontend: types/mapper/API, mutation hook, page + picker + result panel, route, sidebar item, list-page button, review-status helpers moved to `domain/`.
- Tests: 4 backend test files + fixture; 1 frontend API/mapper test file.

## Test Results
- Unit: PASS — backend new files 40/40 (observed Step 6); frontend `individual-cycle-api.test.ts` NOT RUN by agent
- Integration: NOT APPLICABLE (no Postgres integration tests written); manual UI test on local Docker stack by the user: 409 all-blocked path PASS
- Regression: PASS — EVAL-02 equivalence run + regression tests (backend); full backend/frontend suites NOT RUN by agent (user instruction: user runs tests)
- Type Check: PASS — backend and frontend `typecheck` 0 errors (Step 8, after final edits)
- Lint: PASS — backend `lint` clean; frontend `lint` no findings in changed files

## Acceptance Criteria
- AC1 Migration (cycle_type/triggered_by, legacy = BATCH, CHECKs, unique prefix): PASS (applied on local DB; TC-BE-20)
- AC2 Endpoint contract (zod, envelope, AppError, snake_case): PASS
- AC3 Shared EVAL-02 generation: PASS
- AC4 Snapshot parity with batch: PASS (TC-BE-07, equivalence run)
- AC5 Active rule + skip + all-skipped 409: PASS (unit tests; 409 verified in UI by user)
- AC6 Concurrency: PASS by unit test (lock order); not exercised with real concurrent requests
- AC7 Duplicate ids deduplicated: PASS
- AC8 Upcoming batch warning, non-blocking, deduplicated: PASS (unit tests); UI scenario not confirmed by user
- AC9 Audit per cycle in transaction: PASS (unit tests)
- AC10 RBAC (HR/Admin org-wide, Manager own teams, Employee 403): PASS (unit + HTTP tests)
- AC11 FE architecture/states/invalidation/no any: PASS (typecheck/lint; UI reviewed by user)
- AC12 All tests executed and passing: PARTIAL — full suites not run by the agent per user instruction

## Review
- Architecture: PASS
- Security: PASS
- Performance: PASS (index on `evaluation(employee_id)` recommended as follow-up)
- LLD Compliance: PASS (LLD updated for C1 and implementation decisions)

## Files Changed
- `backend/migrations/1791000000003_add-cycle-type-and-trigger-to-evaluation-cycle.ts` (new)
- `backend/src/modules/evaluation-cycle/`: `domain/evaluation-cycle.types.ts`, `domain/evaluation-cycle.repository.ts`, `domain/applicable-employee-filter.ts` (new), `infrastructure/postgres-evaluation-cycle.repository.ts`, `application/evaluation-generation.service.ts` (new), `application/actor-resolution.ts` (new), `application/evaluation-cycle-opening.service.ts`, `application/individual-cycle-creation.service.ts` (new), `api/evaluation-cycle.dto.ts`, `api/evaluation-cycle.controller.ts`, `api/evaluation-cycle.router.ts`, `evaluation-cycle.module.ts`, `index.ts`
- `backend/src/modules/audit/domain/audit.domain.ts`, `backend/src/config/evaluation-cycle.config.ts` (new), `backend/src/config/swagger.ts`, `backend/.env.example`, `.env.example`
- `backend/test/evaluation-cycle-opening-regression.test.ts`, `individual-evaluation-cycle.test.ts`, `individual-evaluation-cycle-repository.test.ts`, `individual-evaluation-cycle-api.test.ts`, `mocks/evaluation-generation-fixture.ts` (new)
- `frontend/src/features/evaluation-cycles/`: `types/cycle-types.ts`, `api/cycle-api.ts`, `api/__tests__/individual-cycle-api.test.ts` (new), `hooks/use-evaluation-cycles.ts`, `domain/employee-review-status.ts` (new), `components/EvaluationCycleForm.tsx`, `components/IndividualEmployeePicker.tsx` (new), `components/IndividualCycleResultPanel.tsx` (new), `pages/IndividualCycleCreatePage.tsx` (new), `pages/EvaluationCycleListPage.tsx`, `index.ts`
- `frontend/src/App.tsx`, `frontend/src/shared/layout/Sidebar.tsx`
- `docs/LLD_Employee_Performance_Evaluation_System.md`, `docs/individual-evaluation-cycle-creation/*`
- Note: `audit.domain.ts`, `swagger.ts`, `.env.example`, `backend/.env.example` and the LLD also contain uncommitted changes of task `next-review-due-date-auto-update` (shared working tree, nothing committed).

## Remaining Risks / Notes
- Employee picker loads only the first 50 employees (deferred, decision b).
- Picker does not show who already has an open evaluation (use Employee Search STATUS).
- Pre-existing backend crash on template creation (`configuration.controller.ts` `createTemplate`), out of scope.
- Recommended index `evaluation(employee_id)` (follow-up).
- Batch open concurrent with individual creation can still produce two active evaluations (accepted C2).
- No Postgres integration/concurrency tests; `IndividualCycleCreatePage` component test not written.
- Local test data added: template `TPL_INDIVIDUAL_TEST` (SQL insert, local DB only).
- Full backend/frontend test suites and `test:migrations` not run by the agent (user instruction); success/warning UI scenarios not yet confirmed by the user.
- Correction: Steps 2/3 stated no local DB/Docker; Docker runs inside WSL (see Step 7 update).

## Final Status
DONE — with the user-approved exception that full test suites are run by the user.

## Inputs Reviewed
- Steps 0–9 artifacts; `git status --short`.

## Actions and Evidence
- `ls docs/individual-evaluation-cycle-creation` → step-0 … step-9 + `frontend-user-guide.md` present; this file adds step-10.
- `frontend-user-guide.md` updated to the final UI.

## Changes Made
- Documentation only.

## Decisions and Rationale
- Final status recorded as DONE with explicit exception, per user instruction not to run CLI tests.

## Risks / Blockers
- As listed above.

## Next Step
None — task complete pending user acceptance (commit/PR only on request).

## Update — revision after first Step 10 review
- Added per user request: i18n like AUDIT_UI (migration `1791000000004`, entity type `INDIVIDUAL_CYCLE_UI`, `useUiTranslation` + localStorage), dark/light theme palettes, responsive layout (< 768px). Details in Step 6 "Revision" sections.
- Evidence: frontend/backend `typecheck` 0 errors, `lint` clean; migration applied on local DB (`pgmigrations` has `1791000000004…`, `i18n_translation` has 126 en + 126 vi rows for `INDIVIDUAL_CYCLE_UI`).
- Environment note: the compose `migrate` service runs `migrate:up && seed`; the seed truncates evaluation data. A stack restart at 09:04 UTC re-seeded the local DB, removing the test template `TPL_INDIVIDUAL_TEST` and any test cycles. Use `docker compose run --rm migrate npm run migrate:up` to migrate without seeding and `docker compose up -d --build --no-deps backend frontend` to rebuild apps only.
- Commits: `9810fd4` (review-due-date), `2a2ae60` (individual cycle). The i18n/theme/responsive revision is **not committed yet**.
- User approved Step 10 ("Next step").

## Final Status (updated)
DONE — with the user-approved exception that full test suites are run by the user; revision pending commit.
