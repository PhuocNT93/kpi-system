# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Implement a versioned CSV template and column model in the database, and provide a secure endpoint to download the active CSV template. Update the Import module to use database validation metadata instead of hard-coded configurations.

Expected Behavior: 
- The system supports versioning for CSV templates (`csv_template` and `csv_template_column` tables).
- A new endpoint `GET /csv-templates/current/download` allows HR/Admin users to download the current blank template as a `.csv` file.
- The CSV template structure is strictly long/tidy format and includes exactly the required columns (e.g., `employee_id`, `evaluation_cycle_code`, `criterion_code`, `measurement_value`, etc.) with `kpi_code` being optional.
- Breaking schema changes create a new template version without mutating existing versions, preserving the integrity of historical import jobs.
- The validation engine dynamically reads rules (including conditional ones like `comment` required if `score_override` is provided) from `csv_template_column.validation_rule`.

Acceptance Criteria:
1. `csv_template` and `csv_template_column` tables exist with correct schema (PK, FK, version constraints, auditing fields).
2. Existing templates in `backend/src/templates` are seeded into the database, preserving file contents.
3. API endpoint `GET /csv-templates/current/download` is implemented and returns a UTF-8 text/csv payload with `Content-Disposition: attachment`.
4. The downloaded CSV has columns ordered by `display_order`, including `kpi_code`.
5. Only HR/Admin roles can access the download endpoint (others receive 403 Forbidden).
6. Import jobs reference a specific `csv_template_id`.
7. Validation metadata is persisted in JSONB and interpreted by the Import validator.
8. Unit and integration tests (including RBAC, failure modes, and regression) are added and passing.

Out of Scope:
- Refactoring unrelated modules or the frontend interface.
- Logging audit writes merely for downloading the template file.
- Changing the CSV layout from long/tidy to wide format.

Business Rules Involved:
- Template downloading and importing is strictly an HR/Admin capability.
- Schema changes must follow monotonic version increases; existing data jobs cannot be silently migrated to breaking templates.
- A manual `score_override` requires a `comment`.
- `kpi_code` is optional, but `criterion_code`, `employee_id`, and `evaluation_cycle_code` are mandatory.

Open Questions / Conflicts:
- Are there existing `csv_template` tables already defined in the database migrations that we just need to extend, or do we create them from scratch? (Will determine in Step 2).
