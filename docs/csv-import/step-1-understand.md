# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Implement a full-stack multipart CSV upload feature with idempotency, file hash uniqueness, row-level validation (including complex KPI/criterion mapping), and import job creation.

Expected Behavior:
- **Frontend**: A user in the `HR_ADMIN` role navigates to the Import Center, selects an evaluation cycle, and uploads a `.csv` file. The frontend handles idempotency key generation per intentional action and renders a preview of total/valid/invalid rows alongside detailed row-level errors.
- **Backend**: The API (`POST /imports/csv`) accepts multipart/form-data. It enforces RBAC, file restrictions, and idempotency. It calculates the SHA-256 hash of the file to prevent duplicate uploads for the same cycle (`409 DUPLICATE_IMPORT`). The CSV is parsed, and each row is validated independently, strictly checking the `KPI ↔ Criterion ↔ Template` relationships (including the `AMBIGUOUS_KPI_FOR_CRITERION` rule). The results are persisted as an `import_job` and multiple `import_row` records, then returned in an API preview response.

Acceptance Criteria:
1. Multipart CSV upload works and validates `cycle_id` and file constraints.
2. SHA-256 file hash is calculated; `(evaluation_cycle_id, file_hash)` uniqueness is enforced by the database (`409 DUPLICATE_IMPORT`).
3. `Idempotency-Key` is required and prevents duplicate jobs on network retries.
4. CSV template version is correctly resolved; `import_job.csv_template_id` is populated.
5. Every row is validated independently. Valid/invalid `import_row` records are persisted safely.
6. Validation correctly implements mapping rules: `KPI_CRITERION_MISMATCH`, single-mapping auto-resolution, `AMBIGUOUS_KPI_FOR_CRITERION`, and `CRITERION_NOT_IN_TEMPLATE`.
7. Existing evaluations that are locked/submitted are protected from updates.
8. Duplicate rows within the same CSV are rejected.
9. Frontend reuses the existing Import Center, handles file upload via `FormData`, displays row-level error tables, and handles API errors according to project rules.
10. All API contracts, transaction boundaries, and audit logging conventions are respected.

Out of Scope:
- The actual confirmed import execution or scoring logic (handled by a separate worker/step).
- Modifying locked or submitted evaluations.
- Altering the existing long/tidy CSV format.
- Adding new roles, calculating final KPI scores, or implementing unrelated UI features.

Business Rules Involved:
- **RBAC**: Restricted to `HR_ADMIN`.
- **Idempotency**: Protects against duplicate requests from the same user action.
- **Uniqueness**: Protects against duplicate files for the same evaluation cycle.
- **Mapping Logic**: Missing `kpi_code` with multiple KPI mappings for a criterion is explicitly invalid (`AMBIGUOUS_KPI_FOR_CRITERION`), requiring explicit user specification.
- **Transactional Consistency**: Persisting the import job and its rows must be cohesive.

Open Questions / Conflicts:
- None.
