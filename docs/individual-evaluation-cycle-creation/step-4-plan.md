# Step 4: Plan

Status: reconstructed from approved review output.

## Deliverable

### Implementation Plan

1. **What:** Migration adding `cycle_type varchar(20) NOT NULL DEFAULT 'BATCH'` + CHECK `evaluation_cycle_type_check`; `triggered_by_employee_id uuid NULL REFERENCES employee(employee_id)`; CHECK `evaluation_cycle_trigger_consistency_check` `(cycle_type = 'INDIVIDUAL_SCHEDULED') = (triggered_by_employee_id IS NOT NULL)`; indexes `(triggered_by_employee_id)`, `(cycle_type, status, start_date)`; reversible `down`.
   **Where:** `backend/migrations/1791000000003_add-cycle-type-and-trigger-to-evaluation-cycle.ts`
   **Why:** LLD §10.3; legacy rows default to `BATCH`.
   **Tests:** `backend/src/shared/database/migrations.test.ts` — file exists, unique prefix.

2. **What:** `EvaluationCycleType` enum; `cycleType`, `triggeredByEmployeeId` on `EvaluationCycle`; error codes `EVALUATION_ALREADY_OPEN`, `EMPLOYEE_NOT_ELIGIBLE`; `NON_ACTIVE_EVALUATION_STATUSES`; repo interface methods `lockEmployeesForEvaluation`, `findActiveEvaluationsByEmployees`, `findUpcomingBatchCyclesForEmployees`.
   **Where:** `evaluation-cycle/domain/evaluation-cycle.types.ts`, `domain/evaluation-cycle.repository.ts`
   **Tests:** covered by items 4–7.

3. **What:** Postgres repo: new columns in create/update/select/returning; `mapRowToCycle` defaults; ordered `FOR UPDATE OF e` employee lock; active evaluation query (C5); upcoming batch query with `DISTINCT` (C8).
   **Where:** `infrastructure/postgres-evaluation-cycle.repository.ts`
   **Tests:** mock `PoolClient` SQL assertions.

4. **What:** `EvaluationGenerationService` extracted verbatim from `openCycle`: `prepareTemplateSnapshot`, `generateEvaluations`, `enqueueCycleOpenedNotifications`; `buildApplicableEmployeeFilter` shared predicate.
   **Where:** `application/evaluation-generation.service.ts`, `application/applicable-employee-filter.ts`
   **Why:** single source of generation/snapshot logic for batch and individual.
   **Tests:** snapshot fields, applicability, template errors.

5. **What:** `openCycle` refactored to call the shared service with identical ordering, errors, response.
   **Where:** `application/evaluation-cycle-opening.service.ts`
   **Tests:** EVAL-02 regression on `batchCreate` payloads, audit `CYCLE_OPENED`, error paths.

6. **What:** `getUpcomingBatchCycleWindowWeeks(env)` (default 4, invalid → warn + default) and business-today helper.
   **Where:** `backend/src/config/evaluation-cycle.config.ts`, `backend/.env.example`, `.env.example`
   **Tests:** default/valid/invalid.

7. **What:** `IndividualCycleCreationService.createIndividualCycles(input, actor)` — dedup → resolve actor → lock employees → 404/422 eligibility → Manager scope 403 → prepare template once → active check / skipped / all-skipped 409 → dedup warnings → per employee create cycle (OPEN, INDIVIDUAL_SCHEDULED, triggered_by, applicable_employee_ids=[id], generated code/name) + generate + audit → notifications → `{created, skipped, warnings}`.
   **Where:** `application/individual-cycle-creation.service.ts`
   **Tests:** TC-BE-*.

8. **What:** Add `INDIVIDUAL_CYCLE_CREATED` to `AuditActionSchema`.
   **Where:** `backend/src/modules/audit/domain/audit.domain.ts`

9. **What:** `CreateIndividualCyclesSchema` DTO + response types; `cycle_type`/`triggered_by_employee_id` in `EvaluationCycleResponse`; controller `createIndividualCycles`; route `POST /evaluation-cycles/individual` (HR_ADMIN, SYSTEM_ADMIN, MANAGER) registered before `/:id` routes; module wiring; `index.ts` exports; swagger path.
   **Where:** `api/evaluation-cycle.dto.ts`, `api/evaluation-cycle.controller.ts`, `api/evaluation-cycle.router.ts`, `evaluation-cycle.module.ts`, `index.ts`, `backend/src/config/swagger.ts`
   **Tests:** 400 validation, 403 EMPLOYEE, 201 contract.

10. **What:** LLD §10.3 / §14.1 updates (C1, contract, active definition, env window, skip semantics).
    **Where:** `docs/LLD_Employee_Performance_Evaluation_System.md`

11. **What:** FE wire/domain types, mapper (+ defensive warning dedup), `evaluationCycleApi.createIndividualCycles`, `cycleType`/`triggeredByEmployeeId` on `EvaluationCycleDTO`.
    **Where:** `types/cycle-types.ts`, `api/cycle-api.ts`
    **Tests:** mapper/API unit tests.

12. **What:** `useCreateIndividualCyclesMutation` invalidating `CYCLE_QUERY_KEYS.all` and `organizationKeys.employees.all`.
    **Where:** `hooks/use-evaluation-cycles.ts`

13. **What:** `IndividualCycleCreatePage`, `IndividualEmployeePicker`, `IndividualCycleResultPanel`; review + confirmation; success / partial / warning / 409 / 403 / validation / unexpected states.
    **Where:** `features/evaluation-cycles/pages|components`

14. **What:** Route `/cycles/individual/new` (SYSTEM_ADMIN, HR_ADMIN, MANAGER); list-page button; sidebar entry; exports.
    **Where:** `frontend/src/App.tsx`, `pages/EvaluationCycleListPage.tsx`, `shared/layout/Sidebar.tsx`, `features/evaluation-cycles/index.ts`

15. **What:** Step artifacts and `frontend-user-guide.md`.
    **Where:** `docs/individual-evaluation-cycle-creation/`

Test strategy: backend mock-pool unit tests; DB integration tests `runIf(DATABASE_URL)` (skipped locally); FE vitest + Testing Library; run backend/frontend test, typecheck, lint.

## Inputs Reviewed
- Steps 1–3; cycle repository create/update/map; `actor-context.ts`; FE `useEmployees`, `OrgEmployee`, `useTemplatesQuery`, Upsert page template mapping; Sidebar.

## Actions and Evidence
- `sed`/`grep` on the files above.

## Changes Made
- None.

## Decisions and Rationale
- Separate `IndividualEmployeePicker` instead of editing the 727-line batch form to avoid regression.

## Risks / Blockers
- None beyond Step 3.

## Next Step
Step 5 — Test Cases.
