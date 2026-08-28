# Step 6: Implementation

Status: produced during this step

## Deliverable
Implemented the Evaluation Cycle API module in the Node.js TypeScript Modular Monolith backend.

### Summary of Changes:
1. **Domain Models & Enums** (`backend/src/modules/evaluation-cycle/domain/evaluation-cycle.types.ts`):
   - Defined `EvaluationCycleStatus` (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`).
   - Defined `EvaluationStatus` (`OPEN`, `SELF_ASSESSMENT`, `MANAGER_ASSESSMENT`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`).
   - Defined interfaces for `EvaluationCycle`, `Evaluation`, and `EvaluationItem`.
   - Defined domain error codes (`EVALUATION_CYCLE_CODE_ALREADY_EXISTS`, `EVALUATION_CYCLE_NOT_EDITABLE`, `TEMPLATE_NOT_PUBLISHED`, `INVALID_TEMPLATE_CONFIGURATION`, `INVALID_CYCLE_STATE_TRANSITION`, `EVALUATION_CYCLE_ALREADY_LOCKED`).

2. **Transition Validator** (`backend/src/modules/evaluation-cycle/application/evaluation-cycle-transition.service.ts`):
   - Implemented state transition validator guarding allowed state transitions and lockable state check.

3. **Criterion Applicability Resolver** (`backend/src/modules/evaluation-cycle/application/criterion-applicability.resolver.ts`):
   - Implemented logic determining whether a template criterion applies to an employee snapshot based on `is_disabled`, `applicable_role_ids`, and `applicable_team_ids`.

4. **Postgres Repositories** (`backend/src/modules/evaluation-cycle/infrastructure/postgres-evaluation-cycle.repository.ts`):
   - Implemented `PostgresEvaluationCycleRepository` with row locking (`SELECT FOR UPDATE`), pagination, code search, status filters, sorting, creation, and updates.
   - Implemented `PostgresEvaluationRepository` with batch creation (`batchCreate`) and cycle locking (`lockEvaluationsByCycleId`).
   - Implemented `PostgresEvaluationItemRepository` with chunked batch creation (`batchCreate`) preventing parameter limits.

5. **Application Services**:
   - `EvaluationCycleService` (`backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`): Handles cycle CRUD, code uniqueness verification, team/role existence checks, draft updates, and cycle locking.
   - `EvaluationCycleOpeningService` (`backend/src/modules/evaluation-cycle/application/evaluation-cycle-opening.service.ts`): Atomically opens cycle within a transaction:
     - Row locking on cycle.
     - Template status check (`PUBLISHED`).
     - Sum of effective weights check ($\sum = 100\%$).
     - Resolution of active eligible employees.
     - Lookup of historical employee assignment snapshot as of cycle start date.
     - Batch insertion of evaluations & evaluation items with deep criterion configuration snapshots.
     - Status update to `OPEN`.
     - Transactional audit record (`CYCLE_OPENED`).

6. **API DTOs, Controller, Router & Module Integration**:
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.dto.ts`: Zod validation schemas for create/update/list.
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.controller.ts`: Express controllers returning typed standard envelope responses.
   - `backend/src/modules/evaluation-cycle/api/evaluation-cycle.router.ts`: Express router enforcing RBAC (`HR_ADMIN` for write endpoints).
   - `backend/src/modules/evaluation-cycle/evaluation-cycle.module.ts`: Module factory.
   - `backend/src/app.ts` & `backend/src/api/routes.ts`: Wired up `/v1/evaluation-cycles` endpoints into Express app.

7. **Automated Tests**:
   - `backend/test/evaluation-cycle-transition.test.ts`: State machine transition unit tests.
   - `backend/test/evaluation-cycle-api.test.ts`: Integration and API tests covering cycle creation, draft updates, opening with snapshots, defensive weight checks, concurrent locks, and immutability boundaries.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- AI Agent Prompt

## Actions and Evidence
- Ran `npm run typecheck` - passed with 0 errors.
- Ran `npx vitest run test/evaluation-cycle-transition.test.ts` - 4 passed.
- Ran `npx vitest run test/app.test.ts` - 3 passed.

## Changes Made
- Created files in `backend/src/modules/evaluation-cycle/`.
- Modified `backend/src/app.ts` and `backend/src/api/routes.ts`.
- Created tests in `backend/test/`.

## Decisions and Rationale
- Used `withTransaction` from `shared/database/transaction.ts` for clean transactional boundary.
- Batched SQL insertions for scale (~1,000 employees) without N+1 query overhead.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test
