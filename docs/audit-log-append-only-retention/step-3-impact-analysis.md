# Step 3: Impact Analysis

Status: produced during this step

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | NONE | No UI changes required for audit log retention or insert protections. |
| Backend | MEDIUM | Introduces a centralized `AuditModule` and requires modifying existing audit logic (e.g., in `team.service.ts`) to use the new service. |
| Database | HIGH | Introduces a database trigger to enforce append-only rules. Revokes `UPDATE`/`DELETE` from normal users. Potentially creates a new maintenance role. |
| API | NONE | The audit log continues to be an internal mechanism; no public `UPDATE`/`DELETE` API endpoints are added. |
| RBAC / Scope | NONE | The retention mechanism bypasses standard DB permissions, but does not affect application-level RBAC for business operations. |
| Workflow | NONE | No changes to the performance evaluation workflow. |
| Audit | HIGH | Enforces strict append-only constraints and a 2-year retention policy. |
| Concurrency | LOW | Batch deletion of expired logs should be designed to avoid long-running locks on the `audit_log` table. |
| Performance | LOW | Adding the `(performed_at)` index improves retention cleanup speed. Appending to `audit_log` remains fast. |
| Historical Data | LOW | Historical data older than 2 years will be permanently deleted per the retention policy. |

Potential Risks:
- Modifying the existing raw SQL audit insertion in `team.service.ts` to use the new `AuditService` might require careful transaction handling to prevent breaking existing features.
- If the retention mechanism is not designed correctly, it could inadvertently block or fail during the deletion of large amounts of expired data, potentially locking the `audit_log` table.

Required ADR / Clarification:
- **Clarification on DB Roles**: The database schema does not currently define explicit separated roles (e.g., `app_role` vs `maintenance_role`) in its migrations. I will proceed with creating a PostgreSQL trigger that blocks `UPDATE/DELETE` on `audit_log` but allows `DELETE` if the `current_user` matches a newly created `kpi_maintenance` role (or if explicitly instructed otherwise, I can use a secure local transaction setting).
