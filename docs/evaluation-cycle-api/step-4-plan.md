# Step 4: Plan

Status: produced during this step

## Deliverable
1. **What:** Create domain types, status enum (`DRAFT`, `OPEN`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWING`, `CALIBRATION`, `APPROVED`, `PUBLISHED`, `LOCKED`), transition validator service, and DTO types for Evaluation Cycle.
   **Where:** `backend/src/modules/evaluation-cycle/domain/` & `backend/src/modules/evaluation-cycle/api/evaluation-cycle.dto.ts`
   **Why:** Provides strong typing, validation schemas, and domain state machine guards.
   **Tests:** `backend/test/evaluation-cycle-transition.test.ts`

2. **What:** Create Postgres repository implementation for evaluation cycles, evaluations, and evaluation items with transaction/client support and row locking (`FOR UPDATE`).
   **Where:** `backend/src/modules/evaluation-cycle/infrastructure/postgres-evaluation-cycle.repository.ts`
   **Why:** Enables transactional CRUD, atomic cycle opening, row locking, and batch insertion of evaluations and evaluation items.
   **Tests:** `backend/test/evaluation-cycle-unit.test.ts`

3. **What:** Implement evaluation cycle CRUD service, state transition service, cycle lock service, and cycle opening service (`EvaluationCycleOpeningService`).
   **Where:** `backend/src/modules/evaluation-cycle/application/`
   **Why:** Implements core business logic: template validation ($\sum \text{weight} = 100\%$), employee assignment snapshotting, criterion deep snapshotting into `evaluation_item`, transactional audit logging, and concurrency safety.
   **Tests:** `backend/test/evaluation-cycle-unit.test.ts` & `backend/test/evaluation-cycle-api.test.ts`

4. **What:** Implement HTTP controller and Express router for `/v1/evaluation-cycles` endpoints with RBAC guards.
   **Where:** `backend/src/modules/evaluation-cycle/api/evaluation-cycle.controller.ts` & `backend/src/modules/evaluation-cycle/api/evaluation-cycle.router.ts`
   **Why:** Exposes RESTful API endpoints for HR Admin cycle operations.
   **Tests:** `backend/test/evaluation-cycle-api.test.ts`

5. **What:** Wire up `EvaluationCycleModule` in `backend/src/app.ts` and `backend/src/api/routes.ts`.
   **Where:** `backend/src/app.ts` & `backend/src/api/routes.ts`
   **Why:** Integrates the module into the application backend setup.
   **Tests:** `backend/test/app.test.ts`

## Inputs Reviewed
- Architecture requirements & investigation results.

## Actions and Evidence
- Outlined plan steps matching existing codebase patterns.

## Decisions and Rationale
- Split domain, repository, application services, controller, router, and module cleanly.

## Risks / Blockers
- None.

## Next Step
- Step 5: Define Test Cases
