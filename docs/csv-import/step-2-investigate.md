# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (specifically Section 10.6 CSV Import models, Section 12 Rule Engine, Section 21 CSV Import rules)
- `docs/BACKEND_NODE_RULES.md` and `docs/FRONTEND_REACT_RULES.md`
- `backend/src/templates/4_Employee_Evaluation_Score_Import_Template.csv` (the sample template)

Relevant Modules and Files:
- Backend: `Import Module` (`backend/src/modules/import/api`, `application`, `domain`, `infrastructure`)
- Database Migrations: `backend/migrations/1724500000001_init_database_schema.ts` (contains `import_job` and `import_row` schema including the `evaluation_cycle_id, file_hash` unique constraint).
- Frontend: `Import Center` feature (`frontend/src/features/imports/*`), API client (`frontend/src/shared/api/api-client.ts`), UUID utility (`frontend/src/shared/utils/uuid.ts`).

Existing Implementation:
- The database schema for `import_job` and `import_row` is already defined in the initial migration, but the application code (entities, repositories, logic) for these models is not yet implemented.
- `csv_template` management is already partially implemented (download template).
- `Idempotency-Key` mechanism is already partially implemented in the frontend's `api-client.ts` and used in other features like IAM and Organization, but needs to be respected on the backend.
- The CSV template uses columns: `employee_id,evaluation_cycle_code,kpi_code,criterion_code,measurement_value,measurement_unit,score_override,comment,evidence_url`.
- RBAC is handled via `requireHrAdmin` middleware.

Existing Tests:
- Testing framework is available (`jest` for backend, `vitest` for frontend). We will need to write new tests for `import.controller.ts`, `import.service.ts` and the frontend upload component.

Patterns to Reuse:
- Frontend: `FormData` with `postApi` function from `api-client.ts` for file uploads, passing the `idempotencyKey` parameter.
- Backend: Use existing `AuthorizationService` for employee scope checks and permissions. Re-use existing `pg` transaction patterns. Apply typed input validation.
