# Step 4: Plan

Status: reconstructed

## Deliverable

## Implementation Plan

1. **What:** Define pure scoring types and a decimal-safe Scoring Engine for criterion normalization, criterion weighting, KPI aggregation, overall aggregation, N/A handling, and final `ROUND_HALF_UP(2)`.
   **Where:** Rule Engine/Evaluation scoring domain following ownership conventions.
   **Why:** Centralize formulas and prevent duplicate calculations.
   **Tests:** Data-driven normalization, weighting, N/A, disabled, determinism, and rounding tests.

2. **What:** Extend evaluation snapshots and schema with KPI identity, name, effective weight, and scoring metadata.
   **Where:** Evaluation types, repositories, snapshot creation, and migration.
   **Why:** Preserve historical configuration.
   **Tests:** Snapshot and later-configuration regression tests.

3. **What:** Integrate recalculation with Rule Engine, Scoring Engine, workflow, permission, lock/version, transaction, persistence, and audit behavior.
   **Where:** Evaluation service/repositories/module wiring.
   **Why:** Put score writes in the application/domain boundary.
   **Tests:** Success, missing score, lock, scope, version conflict, transaction, and audit tests.

4. **What:** Add typed recalculation/detail API contracts using the common envelope.
   **Where:** Evaluation controller/router/DTO mapping.
   **Why:** Expose server-authoritative breakdowns.
   **Tests:** Envelope, validation, RBAC, conflict, and business-error tests.

5. **What:** Preserve existing score compatibility while mapping `official_score` to calculated overall score unless the contract requires a new column.
   **Where:** Evaluation domain/persistence/API mapping.
   **Why:** Avoid redundant storage while satisfying equality.
   **Tests:** Official-score equality and compatibility.

6. **What:** Extend React API/domain/query/UI for backend criterion/KPI/overall results and recalculation states.
   **Where:** `frontend/src/features/evaluation/`.
   **Why:** Make the pipeline inspectable without client scoring.
   **Tests:** Values, N/A/disabled, states, pending behavior, refresh, and conflicts.

7. **What:** Run required verification and complete workflow artifacts.
   **Where:** Package scripts, migration checks, task documentation.
   **Why:** Verify correctness and evidence.
   **Tests:** Type, lint, formatter, unit, integration, frontend, migration, and manual checks.

Proposed decisions:
- Reuse existing KPI/template structures.
- Snapshot KPI context into evaluation data.
- Preserve `final_score` calibration semantics and expose calculated `official_score` without redundant storage where possible.
- Keep all scoring formulas out of frontend.

## Inputs Reviewed
- Approved Step 3 impact analysis
- Existing repository investigation

## Actions and Evidence
- Defined the minimal cross-module implementation sequence and test scope.

## Changes Made
- None.

## Decisions and Rationale
- Backend scoring is implemented first because it controls API and UI contracts.

## Risks / Blockers
- Existing score schema may require an API-only mapping or a compatible migration.

## Next Step
- Step 5: Define Test Cases.
