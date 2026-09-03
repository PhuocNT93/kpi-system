# Step 2: Investigate

Status: produced during this step

## Deliverable
## Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_FASTAPI_RULES.md` (Node/Express conventions in repo)
- `docs/FRONTEND_REACT_RULES.md`

Relevant Modules and Files:
- Backend:
  - `backend/src/modules/evaluation/domain/evaluation.types.ts`
  - `backend/src/modules/evaluation/domain/repositories.interface.ts`
  - `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation.repository.ts`
  - `backend/src/modules/evaluation/infrastructure/persistence/postgres-evaluation-item.repository.ts`
  - `backend/src/modules/evaluation/application/services/evaluation.service.ts`
  - `backend/src/modules/evaluation/api/evaluation.controller.ts`
  - `backend/src/modules/evaluation/api/evaluation.router.ts`
- Frontend:
  - `frontend/src/features/evaluation/domain/evaluation-models.ts`
  - `frontend/src/features/evaluation/api/evaluation-api.ts`
  - `frontend/src/features/evaluation/pages/EvaluationDetailPage.tsx`
  - `frontend/src/features/evaluation/pages/TeamEvaluationsPage.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/shared/layout/Sidebar.tsx`

Existing Implementation:
- Self-evaluation flow (`/v1/evaluations/my`, `/v1/evaluations/:id`, `/v1/evaluations/:id/items`, `/v1/evaluations/:id/submit`) already in place.
- Manager review flow missing dedicated endpoint (`/v1/evaluations/team`), manager review endpoints, and Manager UI page.

Existing Tests:
- `backend/test/evaluation-cycle-api.test.ts`

Patterns to Reuse:
- Evaluation repository query patterns with PostgreSQL joins.
- TanStack Query hooks, Lumina Design System tokens/theme, ProtectedRoute role gating.

## Inputs Reviewed
- Evaluated codebase in `backend/src/modules/evaluation/` and `frontend/src/features/evaluation/`.

## Actions and Evidence
- Inspected repository methods, controller endpoints, and frontend pages.

## Changes Made
- None.

## Decisions and Rationale
- Align with existing code architecture.

## Risks / Blockers
- None.

## Next Step
- Step 3
