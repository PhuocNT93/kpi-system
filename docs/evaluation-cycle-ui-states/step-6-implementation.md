# Step 6: Implementation

Status: produced during this step

## Deliverable
## Implementation

Changes Made:
- `backend/src/modules/evaluation-cycle/api/evaluation-cycle.dto.ts`: Added `TransitionEvaluationCycleSchema` & `TransitionEvaluationCycleInput`.
- `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`: Added `transitionCycle()` method validating transitions, updating state with row locking and logging audit event.
- `backend/src/modules/evaluation-cycle/api/evaluation-cycle.controller.ts`: Added `transitionCycle` handler.
- `backend/src/modules/evaluation-cycle/api/evaluation-cycle.router.ts`: Registered `POST /evaluation-cycles/:id/transition` route protected with `requireHrAdmin`.
- `backend/test/evaluation-cycle-transition.test.ts`: Added unit tests for sequential state machine transitions.
- `frontend/src/features/evaluation-cycles/api/cycle-api.ts`: Added `transitionCycle()` API client method.
- `frontend/src/features/evaluation-cycles/hooks/use-evaluation-cycles.ts`: Added `useTransitionCycleMutation()` hook.
- `frontend/src/features/evaluation-cycles/components/CycleTimeline.tsx`: Expanded timeline to display all 9 stages explicitly with visual active/completion markers.
- `frontend/src/features/evaluation-cycles/components/EvaluationCycleTable.tsx`: Added all 9 statuses to table filter options.
- `frontend/src/features/evaluation-cycles/pages/EvaluationCycleDetailPage.tsx`: Added dynamic transition action buttons (`Start In Progress`, `Submit All Evaluations`, `Start Reviewing`, `Move to Calibration`, `Approve Cycle`, `Publish Results`, `Lock Cycle`) with confirmation dialogs and feedback banners.

Decisions Applied:
- Reuse existing `EvaluationCycleTransitionService` and `withTransaction` row locking.
- Map allowed transitions dynamically on the detail page according to current status.

Deferred / Not Changed:
- No changes to underlying database schema as columns already support full state set.

## Inputs Reviewed
- Implementation plan and test cases

## Actions and Evidence
- Edited backend files, frontend API, hooks, and UI components

## Changes Made
- Backend transition API, frontend state machine components and hooks

## Decisions and Rationale
- Minimal surgical change following existing patterns

## Risks / Blockers
- None

## Next Step
- Step 7: Test
