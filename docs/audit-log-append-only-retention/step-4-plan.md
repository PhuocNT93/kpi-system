# Step 4: Plan

Status: produced during this step

## Implementation Plan

1. **What:** Create a database migration to enforce append-only `audit_log` via PostgreSQL triggers, roles, and index changes.
   **Where:** `backend/migrations/[timestamp]_audit_log_append_only.ts`
   **Why:** The LLD mandates `audit_log` is immutable and blocked at the DB level, not just the application level. We also need an index on `(performed_at)` for retention cleanup. The migration will create a `kpi_maintenance` role that the retention service can use to bypass the `DELETE` trigger.
   **Tests:** Database test to verify `UPDATE`/`DELETE` attempts directly on `audit_log` fail for the default application role.

2. **What:** Create the `AuditModule` core domain and interfaces.
   **Where:** `backend/src/modules/audit/domain/audit.domain.ts` and `audit.repository.ts`
   **Why:** To strongly type audit payload, add the new KPI-related `entity_type` values, and decouple persistence from the service.
   **Tests:** Type checks and validation schemas (Zod).

3. **What:** Implement the transactional `AuditService` and `PostgresAuditRepository`.
   **Where:** `backend/src/modules/audit/application/audit.service.ts` and `backend/src/modules/audit/infrastructure/postgres-audit.repository.ts`
   **Why:** To ensure audit inserts run within the exact same transaction context (`TransactionClient`) as the business operation, preventing partial failures.
   **Tests:** `audit.service.test.ts` to verify business rollbacks also rollback audit logs, and audit failures rollback business changes.

4. **What:** Refactor existing audit inserts to use the new `AuditService`.
   **Where:** `backend/src/modules/employee/application/team.service.ts`
   **Why:** To eliminate raw SQL audit inserts and centralize audit logging.
   **Tests:** Ensure `team-crud-rbac.test.ts` still passes and correctly captures audits via the new service.

5. **What:** Implement the `AuditRetentionService`.
   **Where:** `backend/src/modules/audit/application/audit-retention.service.ts`
   **Why:** To fulfill the requirement of deleting logs older than 2 years in batches, without giving general DELETE permissions to the application role. It will connect using the `kpi_maintenance` context/role.
   **Tests:** `audit-retention.service.test.ts` to verify batch deletion keeps records < 2 years, deletes > 2 years, and handles idempotency safely.

6. **What:** Configure DB connections for maintenance.
   **Where:** `backend/src/shared/database/database.ts`
   **Why:** To provide the retention service a way to connect as the `kpi_maintenance` role (e.g. executing `SET ROLE kpi_maintenance` before cleanup, or using a separate config pool) securely.
   **Tests:** N/A (tested implicitly via retention service tests).
