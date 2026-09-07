# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | **RBAC: Unauthorized roles** | Actor is EMPLOYEE, MANAGER, or SYSTEM_ADMIN | `POST /imports/csv` with valid file | Returns `403 Forbidden`. No job created. |
| TC02 | **RBAC: Authorized role** | Actor is HR_ADMIN | `POST /imports/csv` with valid file | Returns `200 OK`. `import_job` created with `status=PREVIEW`. |
| TC03 | **File Restrictions** | Missing file, empty file, oversized, or non-CSV extension | `POST /imports/csv` | Returns `400 Bad Request` with appropriate validation message. |
| TC04 | **Idempotency: Replay** | HR_ADMIN uploaded a file successfully | Send identical request with the **same** `Idempotency-Key` | Returns identical `200 OK` response without creating a duplicate job. |
| TC05 | **Idempotency: New Action** | HR_ADMIN uploaded a file successfully | Send identical request with a **new** `Idempotency-Key` | Proceeds to process, but hits file hash duplicate check. |
| TC06 | **File Hash: Duplicate** | HR_ADMIN uploaded a file. Job exists. | Send identical file with new `Idempotency-Key` for the **same** `cycle_id` | Returns `409 DUPLICATE_IMPORT`. No new job created. |
| TC07 | **File Hash: Different Cycle** | HR_ADMIN uploaded a file | Send identical file with new `Idempotency-Key` for a **different** `cycle_id` | Returns `200 OK`. Job created for the new cycle. |
| TC08 | **Mapping: Exact Match** | `kpi_code=KPI_A`, `criterion=CR001`. `KPI_A -> CR001` exists in template | Upload row | Row `status=VALID`. |
| TC09 | **Mapping: Mismatch** | `kpi_code=KPI_B`, `criterion=CR001`. `KPI_A -> CR001` exists | Upload row | Row `status=INVALID` with `code=KPI_CRITERION_MISMATCH`. |
| TC10 | **Mapping: Unknown KPI** | `kpi_code=KPI_UNKNOWN` | Upload row | Row `status=INVALID` with `code=KPI_NOT_IN_TEMPLATE`. |
| TC11 | **Mapping: Single Auto** | `kpi_code` missing. `KPI_A -> CR001` is the only mapping | Upload row | Row `status=VALID`. |
| TC12 | **Mapping: Ambiguous** | `kpi_code` missing. `KPI_A -> CR001`, `KPI_B -> CR001` both exist | Upload row | Row `status=INVALID` with `code=AMBIGUOUS_KPI_FOR_CRITERION`. |
| TC13 | **Mapping: Zero Mappings** | `kpi_code` missing. `CR999` has no mappings in template | Upload row | Row `status=INVALID` with `code=CRITERION_NOT_IN_TEMPLATE`. |
| TC14 | **Row: Evaluation Locked** | Target evaluation is SUBMITTED/LOCKED | Upload valid row | Row `status=INVALID` with `code=EVALUATION_ALREADY_SUBMITTED`. |
| TC15 | **Row: Duplicate inside file**| CSV contains two rows for the same `employee_id` and `criterion_code` | Upload file | First row is processed. Second row `status=INVALID` with `code=DUPLICATE_ROW`. |
| TC16 | **Persistence Check** | Valid upload with mixed rows (valid + invalid) | Check database | `import_job` created with `csv_template_id`. `import_row` created for every row. Invalid rows contain `error_messages` JSON array. |
| TC17 | **Concurrency Lock** | Two identical requests sent simultaneously with different idempotency keys | Send concurrent requests | One succeeds (`200`), the other fails (`409 DUPLICATE_IMPORT`) due to database unique constraint. |
| TC18 | **Frontend: Idempotency Key Generation** | User clicks Upload | Monitor API call | Key is generated once per click. Retry network failure sends the same key. Choosing a new file generates a new key. |
