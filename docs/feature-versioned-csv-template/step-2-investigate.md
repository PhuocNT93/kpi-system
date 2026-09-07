# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Domain ERD defines `CSV_TEMPLATE` and `CSV_TEMPLATE_COLUMN`)
- `backend/src/templates/4_Employee_Evaluation_Score_Import_Template.csv` (The current physical file acting as a template for scoring).
- `backend/migrations/1724500000001_init_database_schema.ts` (Existing database migration defining `csv_template` and `csv_template_column` tables).

Relevant Modules and Files:
- Database Migrations (`1724500000001_init_database_schema.ts`)
- Config Seeder (`backend/src/modules/configuration/infrastructure/seed/configuration.seed.ts`)
- `backend/src/templates/` folder containing legacy template files.
- `import` module (Needs to be created at `backend/src/modules/import/` per modular monolith architecture since it currently doesn't exist).

Existing Implementation:
- The database schema for `csv_template` and `csv_template_column` already exists and accurately reflects the schema requested in the prompt (`code`, `version_no`, `status`, `validation_rule` (JSONB), etc.).
- There is currently no `import` application service or controller to handle downloading the CSV templates from the DB.
- Existing CSV files in `backend/src/templates/` do not match the exact column list and order required by the new requirements (e.g., currently `employee_code` instead of `employee_id`, `resolved_level` present, missing `kpi_code` in some).

Existing Tests:
- N/A for this exact module as `import` does not exist yet. However, we will follow the testing pattern of other modules (e.g., `employee-api.test.ts`, `evaluation-cycle-api.test.ts`).

Patterns to Reuse:
- Modular Monolith Architecture (creating an `import` folder inside `backend/src/modules/` containing `api`, `application`, `domain`, `infrastructure`).
- `BaseResourceResponse` for DTOs.
- DB repository pattern for querying `csv_template` and `csv_template_column`.
- RBAC enforcement at the API router/controller level.
- Fastify reply structures for sending binary/CSV data with `Content-Disposition`.
