# Step 5: Define Test Cases

Status: produced during this step

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | **Valid Audit Insert** | Active transaction client | Call `AuditService.record(tx, payload)` | Audit record is inserted successfully into the database. |
| TC02 | **KPI Entity Types** | Valid payload with new KPI entity types (`KPI`, `KPI_VERSION`, etc.) | Call `AuditService.record()` for each new type | Each record is accepted and inserted successfully. |
| TC03 | **Invalid Entity Type** | Payload with unsupported `entity_type` | Call `AuditService.record()` | `ZodError` or `BadRequest` thrown; record not inserted. |
| TC04 | **Transaction Success** | Business action succeeds | Call `AuditService.record(tx)` within a `withTransaction` block | Business data and audit record are both persisted. |
| TC05 | **Business Failure Rollback** | Business action fails | Call `AuditService.record(tx)`, then throw error | Transaction rolls back; neither business data nor audit record persists. |
| TC06 | **Audit Failure Rollback** | Business action succeeds, but audit payload is invalid | Call `AuditService.record(tx)` with invalid data | Transaction rolls back; business data does NOT persist. |
| TC07 | **Append-Only UPDATE Protection** | `audit_log` has an existing record | Execute direct SQL: `UPDATE audit_log SET new_value = '...'` using the application role | PostgreSQL rejects the update with error: `audit_log is append-only; UPDATE and DELETE are prohibited`. |
| TC08 | **Append-Only DELETE Protection** | `audit_log` has an existing record | Execute direct SQL: `DELETE FROM audit_log` using the application role | PostgreSQL rejects the delete with the same append-only error. |
| TC09 | **Retention Cleanup (Expired Logs)** | `audit_log` contains records older than 2 years | Call `AuditRetentionService.deleteExpiredLogs()` | Expired records are deleted from the database. |
| TC10 | **Retention Cleanup (Recent Logs)** | `audit_log` contains records newer than 2 years | Call `AuditRetentionService.deleteExpiredLogs()` | Recent records are preserved in the database. |
| TC11 | **Retention Idempotency** | Cleanup ran successfully previously | Call `AuditRetentionService.deleteExpiredLogs()` again | Succeeds safely with 0 rows deleted. |
| TC12 | **Retention Batching** | `audit_log` contains > batch size expired records | Call `AuditRetentionService.deleteExpiredLogs(..., batchSize)` | Deletes records in chunks up to the batch size, looping until done. |
| TC13 | **Database Indexes** | Database is migrated | Query pg_indexes for `audit_log` | Indexes for `(entity_type, entity_id)` and `(performed_at)` exist. |
