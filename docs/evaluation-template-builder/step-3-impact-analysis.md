# Step 3: Impact Analysis

Status: reconstructed during Step 6

## Deliverable
## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Complete implementation of Evaluation Template Builder workspace & components. |
| Backend | MEDIUM | Interfacing with template configuration APIs and error handling. |
| Database | NONE | Uses existing configuration tables. |
| API | MEDIUM | Consumes envelope APIs with camelCase mapping. |
| RBAC / Scope | MEDIUM | Restricted to HR / HR_ADMIN. |
| Workflow | HIGH | Enforces DRAFT -> VALIDATED -> PUBLISHED state transition. |
| Audit | MEDIUM | Audit logs for configuration edits. |
| Concurrency | HIGH | Handled via version-based optimistic locking (HTTP 409). |
| Performance | LOW | Optimized reactive UI canvas. |
| Historical Data | HIGH | Immutable published versions freeze effective weight snapshots. |

Potential Risks:
- Weight total confusion (Template 100% vs Employee active weight).
- Optimistic locking conflict during multi-user editing.
- Scoring rule configuration errors.

Required ADR / Clarification:
- None.

## Inputs Reviewed
- LLD, frontend rules, prompt requirements.

## Actions and Evidence
- Assessed full impact matrix across all software dimensions.

## Changes Made
- Documented impact analysis artifact.

## Decisions and Rationale
- Emphasize clear visual feedback and explainable tooltips to resolve potential user confusion.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
