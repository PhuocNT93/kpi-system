# Step 3: Impact Analysis

Status: produced during this step

## Deliverable
| Area | Impact | Notes |
|---|---|---|
| Frontend | NONE | Backend API module implementation only. Frontend contract preserved. |
| Backend | HIGH | New modular monolith component `src/modules/evaluation-cycle/`. |
| Database | LOW | Schema already exists in migration `1724500000001_init_database_schema.ts`. |
| API | HIGH | Implements `/v1/evaluation-cycles` endpoints (Create, List, Get, Patch Draft, Open, Lock). |
| RBAC / Scope | MEDIUM | `HR_ADMIN` permissions enforced for write actions; `SYSTEM_ADMIN` read-only. |
| Workflow | MEDIUM | Enforces strict status transitions. |
| Audit | MEDIUM | Transactional audit log integration. |
| Concurrency | HIGH | `FOR UPDATE` row lock & DB unique constraints. |
| Performance | MEDIUM | Batch querying & insertion. |
| Historical Data | HIGH | Snapshots historical employee assignments & template criterion configuration. |

Potential Risks:
- Heavy synchronous cycle opening for large employee sets (~1,000 employees). Addressed by batch queries and bulk `INSERT` statements within a single transaction block.

Required ADR / Clarification:
- None.

## Inputs Reviewed
- Project specifications and architecture.

## Actions and Evidence
- Assessed impact across database, API, audit, concurrency, and RBAC areas.

## Decisions and Rationale
- Ensure atomic transactions for cycle opening with row locks.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
