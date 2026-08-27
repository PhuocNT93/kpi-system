# Step 2: Investigate

Status: produced during this step

## Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Sections 10.7 Audit)
- `docs/BACKEND_NODE_RULES.md`

Relevant Modules and Files:
- `backend/migrations/1724500000001_init_database_schema.ts`
- `backend/src/modules/employee/application/team.service.ts`
- `backend/src/shared/database/transaction.ts`
- `backend/src/shared/database/database.ts`

Existing Implementation:
- The database schema defines the `audit_log` table with `entity_type`, `entity_id`, `action`, `field_name`, `old_value`, `new_value`, `reason`, `performed_by`, `performed_at`, and `source` columns. It lacks an `UPDATE`/`DELETE` protection trigger.
- The existing codebase performs audit logging by executing raw SQL `INSERT` statements directly (e.g., in `team.service.ts`). There is no centralized `AuditService` or `AuditRepository` yet for the `audit_log` table.
- A robust transaction boundary mechanism exists (`TransactionClient` via `withTransaction`), which can be reused to satisfy the same-transaction requirement.
- The `entity_type` column is defined as `varchar(50)` without DB-level `ENUM` or `CHECK` constraints, meaning the application logic dictates the allowed values.

Existing Tests:
- `backend/src/shared/database/transaction.test.ts` (Validates the transaction abstraction)
- `backend/src/modules/employee/application/team-crud-rbac.test.ts` (Validates team service, which currently writes to the audit log)

Patterns to Reuse:
- `withTransaction` from `src/shared/database/transaction.ts` will be used for testing and executing operations in a single transaction.
- Create a dedicated module (`backend/src/modules/audit`) mirroring the structure of other modules (e.g., `application`, `domain`, `infrastructure`).
- Use the runtime validation library (`zod`) for audit payload validation as seen in other DTOs.
- Custom DB Error mapping in application layer.
