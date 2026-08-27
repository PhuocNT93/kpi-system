# Step 1: Understand

Status: produced during this step

## Task Understanding

Goal: Implement the Audit module infrastructure with append-only protection, 2-year retention policy, database indexes, and a transactional application service for the Employee Performance Evaluation Management System.

Expected Behavior:
- `audit_log` records are append-only.
- Application code can `INSERT` and `SELECT` audit records.
- `UPDATE` and `DELETE` on `audit_log` are blocked for the normal application DB role via permissions and a PostgreSQL trigger.
- Audit INSERT occurs in the same transaction as the business operation. Business rollbacks also rollback the audit. Audit insertion failures rollback the business transaction.
- Extended `entity_type` values are accepted (`KPI`, `KPI_VERSION`, `KPI_RELATIONSHIP`, `TEMPLATE_KPI`, `EVALUATION_KPI`).
- Audit retention policy is enforced (maximum 2 years) via a controlled mechanism (`AuditRetentionService`).
- Expired audit logs are deleted in batches.
- Normal application DB role is not granted general `DELETE` permission for retention.

Acceptance Criteria:
1. `audit_log` table exists per LLD and accepts the new KPI `entity_type` values while keeping existing ones.
2. Application DB role has only `INSERT`/`SELECT` on `audit_log`.
3. PostgreSQL trigger explicitly rejects `UPDATE` and `DELETE` on `audit_log` with a clear message.
4. `AuditService.record()` method is implemented and participates in the caller's transaction context.
5. Indexes on `(entity_type, entity_id)` and `(performed_at)` exist.
6. `AuditRetentionService` is implemented to safely batch-delete logs older than 2 years using a privileged mechanism.
7. Unit and integration tests confirm the audit transactional integrity (rollback scenarios).
8. Database tests confirm that direct SQL `UPDATE` and `DELETE` attempts fail for the application role.
9. Migrations safely apply the DB changes without data loss.

Out of Scope:
- KPI business logic or CRUD features.
- Any changes to evaluation scoring behavior or historical audit data.
- Introducing external message queues (like Kafka) or microservices.
- Adding a complex scheduling framework if one doesn't exist (use a service/command instead).

Business Rules Involved:
- Audit records must be write-once to guarantee immutable history.
- Audit writes must be strongly consistent (same transaction) with the business change.
- Logs older than 2 years must be removed.

Open Questions / Conflicts:
- The database architecture does not currently define explicit separated roles (e.g., `app_role` vs `maintenance_role`) in its migrations. I will need to clarify the chosen approach for allowing retention deletes (e.g., creating a `kpi_maintenance` DB role in the migration, or using a secure local transaction setting).
