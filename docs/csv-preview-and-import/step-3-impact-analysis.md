# Step 3: Impact Analysis
Status: reconstructed

## Deliverable
| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Extends `ImportCenterPage` with confirm dialog, strict/partial mode selection, and TanStack Query polling. |
| Backend | HIGH | Implements a background worker, handles batch processing (100-200 rows), integrates with `EvaluationService`. |
| Database | LOW | No schema changes required. |
| API | MEDIUM | Adds `POST /imports/:id/confirm` and `GET /imports/:id`. |
| RBAC / Scope | MEDIUM | Enforcement of HR_ADMIN or SYSTEM_ADMIN roles for confirmation. |
| Workflow | HIGH | Respects evaluation status locks. |
| Audit | MEDIUM | Ensures `CSV_IMPORT` is recorded transactionally via `AuditService`. |
| Concurrency | HIGH | Worker idempotency and transaction locking are critical. |
| Performance | MEDIUM | Async batches prevent blocking HTTP requests. Group score recalculations to avoid N+1. |
| Historical Data | HIGH | Must correctly update evaluation items while preserving existing snapshots. |

Potential Risks: Strict Mode Atomicity, Worker Crash / Idempotency, KPI Recalculation N+1.

Required ADR / Clarification: None.
