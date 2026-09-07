# Step 6: Implement

Status: reconstructed

## Deliverable

The following changes were implemented:

1. **Backend Dependencies**: Added `multer` and `csv-parse` for multipart parsing and streaming CSV data safely.
2. **Database Schema**: Added `idempotency_key` column and unique constraint to `import_job` via migration `1788770393785_add-idempotency-key-to-import-job.ts`.
3. **Backend Domain & Repository**: Created `import.types.ts` with schemas. Implemented `PostgresImportRepository` with safe `bulkInsertImportRows` using Postgres `UNNEST` arrays for high performance on 500+ rows.
4. **Backend Service**: Implemented `CsvImportService` containing the core logic:
   - File hash duplicate checking `(cycle_id, file_hash)`.
   - Idempotency key replay protection.
   - Strictly validates `KPI ↔ Criterion` mappings and properly returns `AMBIGUOUS_KPI_FOR_CRITERION`.
5. **API Layer**: Wired up `ImportController` and `POST /api/imports/csv` utilizing `multer.memoryStorage()`.
6. **Frontend API**: Added `postFormDataApi` to the shared `api-client.ts` to properly handle `multipart/form-data` uploads (omitting `Content-Type` for browser boundary calculation). Added TanStack query mutations.
7. **Frontend UI**: Built the "Upload CSV Data" section in `ImportCenterPage.tsx`. It handles selecting files, passing `Idempotency-Key` correctly, and renders a visually rich preview of Total/Valid/Invalid rows along with a data table for row-level errors.

The implementation meets all acceptance criteria defined in Step 1.
