# Step 6: Implement

Status: produced during this step

## Deliverable

Changes Made:
- `backend/src/templates/4_Employee_Evaluation_Score_Import_Template.csv`: Overwritten to explicitly match the required new schema with correct column ordering and optional/required structures.
- `backend/src/modules/import/domain/csv-template.types.ts`: Created the types and interface `ICsvTemplateRepository` mirroring the `csv_template` and `csv_template_column` tables.
- `backend/src/modules/import/infrastructure/postgres-csv-template.repository.ts`: Implemented `PostgresCsvTemplateRepository` to fetch templates by code, status, and columns ordered by `display_order`.
- `backend/src/modules/import/application/csv-template.service.ts`: Implemented `CsvTemplateService` to query the database and assemble a correct CSV string (headers only) for download.
- `backend/src/modules/import/api/import.controller.ts`: Implemented Express route handlers for `/csv-templates/current/download` and `/csv-templates/:csv_template_id/download` with appropriate response headers (`text/csv` and `Content-Disposition`).
- `backend/src/modules/import/api/import.routes.ts`: Created `createImportRouter` with standard JWT auth and the custom `requireHrAdmin` middleware.
- `backend/src/modules/import/import.module.ts`: Wired up the module components.
- `backend/src/modules/import/infrastructure/seed/import.seed.ts`: Created script to seed the initial CSV template columns and JSONB validation metadata to `csv_template` and `csv_template_column`.
- `backend/src/modules/iam/infrastructure/seed.ts`: Added `seedImportModule(pool)` to the unified seeding process.
- `backend/src/api/routes.ts`: Registered the `importController` to `/`.
- `backend/src/app.ts`: Initialized `importModule` and provided it to the router options.

Decisions Applied:
- The backend framework is Express. Replaced Fastify-specific concepts with standard Express Request/Response objects and NextFunction.
- Retained modular monolith pattern by grouping `domain`, `infrastructure`, `application`, and `api` folders in `backend/src/modules/import`.
- Implemented RBAC directly using `getActorFromContext(req)` within a custom middleware inside the router, since `AuthorizationService` does not have an Express `requireRoles` middleware builder.

Deferred / Not Changed:
- UI components (Out of scope).
- Complete end-to-end processing of CSV upload data (Out of scope / separate task).
