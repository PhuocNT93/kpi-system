# Step 6: Implementation

Status: produced during this step

## Deliverable

## Implementation

Changes Made:
- `backend/src/modules/import/application/csv-import.service.ts`: Implemented `confirmImport` and background worker `processJobAsync`, integrated `EvaluationService` for score recalculation.
- `backend/src/modules/import/api/import.controller.ts`: Added `confirmImport` and `getImportStatus` endpoints.
- `backend/src/modules/import/api/import.routes.ts`: Registered the new endpoints.
- `backend/src/app.ts`: Injected `evaluationService` into `importModule`.
- `frontend/src/features/imports/api/import-api.ts`: Added API client functions for confirmation and polling.
- `frontend/src/features/imports/pages/ImportCenterPage.tsx`: Added UI for Partial/Strict mode, confirmation handling, and background job polling.

Decisions Applied:
- Use asynchronous background processing (`setImmediate`) for confirmed imports exceeding 500 rows to prevent blocking HTTP threads.
- Strict Mode checks for any validation errors and immediately rejects the job without starting processing if errors exist.
- Use `EvaluationService.recalculateEvaluation` to ensure all KPI-level updates are exclusively processed through the centralized Scoring Engine.

Deferred / Not Changed:
- Did not change the underlying database schema as the existing `import_job` and `import_row` tables sufficiently handle the background tracking requirements.
