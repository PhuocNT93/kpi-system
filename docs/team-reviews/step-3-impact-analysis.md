# Step 3: Impact Analysis

Status: produced during this step

## Deliverable
## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Add `TeamEvaluationsPage`, update `EvaluationDetailPage` for manager review role/mode, add route in `App.tsx`. |
| Backend | MEDIUM | Add `GET /v1/evaluations/team`, `POST /v1/evaluations/:id/approve`, update `getEvaluationDetail` authorization to allow managers. |
| Database | NONE | Existing `evaluation`, `evaluation_item`, `employee` schema contains all needed fields. |
| API | LOW | Extend `evaluation.router.ts` with `/team` and `/approve` routes. |
| RBAC / Scope | MEDIUM | Enforce `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN` permissions and hierarchy checking. |
| Workflow | LOW | Status transitions: `SUBMITTED` -> `APPROVED` (or `MANAGER_REVIEW`). |
| Audit | LOW | Log evaluation review/approval events. |
| Concurrency | LOW | Standard record locking / status checks. |
| Performance | LOW | Paginated/indexed queries by `manager_id_snapshot` or direct manager relationship. |
| Historical Data | NONE | No schema migration required. |

Potential Risks:
- Direct report resolution: handle case where manager is set via `manager_id_snapshot` or live `employee.manager_id`.

Required ADR / Clarification:
- None.

## Inputs Reviewed
- Database schema and IAM/role models.

## Actions and Evidence
- Evaluated impact across stack.

## Changes Made
- None.

## Decisions and Rationale
- Minimal risk, no DB schema changes needed.

## Risks / Blockers
- None.

## Next Step
- Step 4
