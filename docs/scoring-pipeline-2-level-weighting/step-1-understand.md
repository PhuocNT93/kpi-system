# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Implement backend-owned, snapshot-driven scoring for evaluations with criterion-to-KPI and KPI-to-overall weighting, then expose the returned scoring breakdown in the existing React evaluation UI.

Expected Behavior: Measurements resolve through the pure Rule Engine. The pure Scoring Engine uses evaluation snapshots to calculate unrounded criterion normalization, criterion contributions, KPI weighted averages, overall KPI-weighted average, and `official_score = overall_weighted_score`. Disabled/N/A criteria and KPIs are excluded from their respective denominators. Only the final engine boundary applies `ROUND_HALF_UP` to two decimals. Recalculation remains authenticated, authorized, transactional, audited, lock-aware, and unavailable for immutable evaluations. The frontend renders backend results and never calculates scores.

Acceptance Criteria:
1. Rule Engine resolves configured levels and score values deterministically.
2. Scoring Engine supports configurable maximum score values and explicit N/A semantics.
3. Criterion effective snapshot weights determine criterion contributions.
4. KPI scores exclude disabled, N/A, and unscored criteria from denominators.
5. Overall scores exclude KPIs without applicable criteria.
6. `official_score` equals `overall_weighted_score`.
7. Snapshot configuration is used instead of current template/criterion configuration.
8. Intermediate calculations are not rounded; final scoring uses decimal-safe `ROUND_HALF_UP` at two decimals.
9. Score results, resolved levels, and required breakdown data are persisted/exposed through existing contracts.
10. Recalculation honors workflow state, RBAC, locks, optimistic locking, transactions, and audit logging.
11. Backend tests cover weighting, N/A, disabled criteria, configurable scores, rounding, snapshots, effective weights, and determinism.
12. Frontend displays criterion, KPI, and overall backend results with loading, empty, error, unauthorized, locked, and conflict states.
13. Frontend uses typed API/query patterns and contains no scoring or precedence-resolution logic.
14. Required backend, frontend, migration, lint, formatting, type-check, integration, and UI verification passes.

Out of Scope:
- Replacing the modular-monolith architecture.
- Adding new scoring rules beyond configured Rule Engine strategies.
- Resolving current configuration or precedence during scoring.
- Client-side score calculation or a parallel frontend scoring engine.
- Unrelated workflow, reporting, calibration, or configuration refactors.
- Changing LLD decisions without approved clarification or ADR.

Business Rules Involved:
- Published template versions resolve and freeze effective weights.
- Evaluation items snapshot criterion and KPI configuration.
- Locked historical evaluations are immutable.
- N/A is distinct from zero and excluded from denominators.
- Score writes require workflow, authorization, lock, concurrency, and audit enforcement.
- API responses use the common envelope and `snake_case`.
- Frontend maps wire models once and renders server-authoritative values.

Open Questions / Conflicts:
- The LLD describes calibration using `final_score`, while this feature requires `official_score = overall_weighted_score`; existing contracts must decide the mapping.
- Existing domain support for KPI grouping and KPI-level weights must be confirmed.
- `BACKEND_NODE_RULES.md` is used because this repository is Node.js despite the `usage.md` reference to FastAPI rules.

## Inputs Reviewed
- `usage.md`
- `docs/AI_AGENT_WORKFLOW.md`
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- User-provided feature requirements

## Actions and Evidence
- Read the required documents and searched LLD scoring, snapshot, API, and workflow sections.

## Changes Made
- None.

## Decisions and Rationale
- Backend remains the source of truth; frontend only renders returned values.

## Risks / Blockers
- Score-field compatibility and KPI snapshot shape require investigation.

## Next Step
- Step 2: Investigate.
