# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Update `4_Employee_Evaluation_Score_Import_Template.csv` to exactly match the new schema.
   **Where:** `backend/src/templates/4_Employee_Evaluation_Score_Import_Template.csv`
   **Why:** The prompt requires the CSV template to have a strict column order (`employee_id`, `evaluation_cycle_code`, `kpi_code`, `criterion_code`, `measurement_value`, `measurement_unit`, `score_override`, `comment`, `evidence_url`) and `kpi_code` to be optional. The existing file has slightly different columns (`employee_code`, `measurement_source`, etc.) which conflict with the exact required schema. We will make the smallest compatible change to reuse this file.
   **Tests:** File modification only; no specific code test.

2. **What:** Seed `csv_template` and `csv_template_column` from the updated CSV template.
   **Where:** `backend/src/modules/configuration/infrastructure/seed/configuration.seed.ts`
   **Why:** The requirement states the DB metadata must match the downloadable template. We will seed `CSV_TEMPLATE` (code: `EVALUATION_SCORE_IMPORT`, version: 1, status: `ACTIVE`) and its columns with appropriate JSONB validation metadata (e.g., conditionally requiring `comment` if `score_override` is present).
   **Tests:** Seed script execution during test bootstrap.

3. **What:** Create the Import Module structure (Application Service, Repository, DTO).
   **Where:** `backend/src/modules/import/`
   **Why:** To house the business logic for resolving the current CSV template, parsing the columns by `display_order`, and building the CSV download stream without hard-coding rules in the controller.
   **Tests:** `import-service.test.ts` (Unit tests for current template resolution and version ordering).

4. **What:** Create the Import API Controller and Routes.
   **Where:** `backend/src/modules/import/api/import.controller.ts`, `import.routes.ts`
   **Why:** Expose `GET /csv-templates/current/download` with RBAC applied (only HR/Admin). The controller uses Fastify's response methods to return a `text/csv` stream with `Content-Disposition`.
   **Tests:** `import-api.test.ts` (API integration tests verifying 200 OK, exact CSV header output, 403 for unauthorized roles).

5. **What:** Register the Import Module.
   **Where:** `backend/src/app.ts` (or equivalent module registry).
   **Why:** Ensure the new Import module and its routes are loaded when the application starts.
   **Tests:** Ensure existing tests and the new `import-api.test.ts` pass.
