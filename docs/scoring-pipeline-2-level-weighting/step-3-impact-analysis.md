# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Extend evaluation API/domain/UI and states. |
| Backend | HIGH | Add pure scoring, workflow integration, persistence, and audit. |
| Database | HIGH | Preserve KPI snapshot context and scoring results. |
| API | HIGH | Add typed detail/recalculation scoring breakdowns. |
| RBAC / Scope | MEDIUM | Recalculation must enforce existing permissions and scope. |
| Workflow | HIGH | Enforce editable states, missing-score rules, locks, and versions. |
| Audit | HIGH | Recalculation and score writes must be audited transactionally. |
| Concurrency | HIGH | Protect score writes with locks and optimistic versions. |
| Performance | MEDIUM | Avoid N+1 queries and calculate in memory. |
| Historical Data | HIGH | Later configuration changes must not affect old evaluations. |

Potential Risks:
- LLD calibration `final_score` versus feature `official_score` contract.
- Missing KPI snapshot fields.
- Existing seed scoring may remain a parallel formula.
- Atomic item/aggregate/audit writes are required.
- Existing locking may be cycle-level only.

Required ADR / Clarification:
- Confirm score-field mapping and persisted KPI snapshot representation before implementation.

## Inputs Reviewed
- Step 2 investigation and governing documents

## Actions and Evidence
- Assessed all workflow-required impact areas against identified repository gaps.

## Changes Made
- None.

## Decisions and Rationale
- No implementation workaround is permitted for unresolved LLD conflicts.

## Risks / Blockers
- Score-field compatibility requires preserving existing calibration semantics where possible.

## Next Step
- Step 4: Plan.
