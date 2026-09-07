# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Extends the Import Center with `FormData` multipart upload, `Idempotency-Key` generation, and rendering of row-level errors (including `AMBIGUOUS_KPI_FOR_CRITERION` UX). |
| Backend | HIGH | Introduces multipart parsing (e.g., using `multer` or `busboy`). Implements complex row validation logic, idempotency, and file-hash checking. Safely handles transaction boundaries for batch inserts. |
| Database | MEDIUM | Will perform frequent reads for validation (employees, cycles, templates) and batch inserts into `import_job` and `import_row`. Enforces the `(evaluation_cycle_id, file_hash)` unique constraint. |
| API | MEDIUM | Adds `POST /api/imports/csv` endpoint accepting `multipart/form-data`. Introduces a complex response envelope containing `meta.row_errors`. |
| RBAC / Scope | HIGH | Must strictly verify `HR_ADMIN` permissions. Must also validate employee scope inside the CSV rows. |
| Workflow | LOW | The feature stops at `PREVIEW` status. It does not advance evaluation state machines or modify existing submitted data. |
| Audit | LOW | Does not perform the actual data mutation/scoring, thus does not bypass or require new audit logs in this phase. |
| Concurrency | HIGH | Must safely handle concurrent identical requests using both API `Idempotency-Key` and database constraints to prevent duplicate imports. |
| Performance | MEDIUM | Needs to validate up to 500 rows efficiently. Must avoid N+1 queries during validation by pre-fetching/caching template rules and employee data within the service. |
| Historical Data | LOW | Evaluates against locked/submitted states to reject modifications, thereby protecting historical integrity. |

Potential Risks:
- **Memory exhaustion**: Parsing very large CSV files completely in memory before validation could crash the Node.js process if not limited. *Mitigation: Enforce maximum file size at the middleware level (e.g., 5MB) and use streaming parsers if necessary.*
- **N+1 validation queries**: Querying the database for each employee and criterion per row. *Mitigation: Fetch relevant `template_criterion`, `evaluation_cycle`, and a batch of `employee` records upfront.*
- **Transaction locking**: Long-running transactions during row insert could block other operations. *Mitigation: Insert rows efficiently using bulk inserts or `COPY`/`unnest` arrays.*

Required ADR / Clarification:
- None.
