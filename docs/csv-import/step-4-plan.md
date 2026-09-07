# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Add backend dependencies for multipart parsing and CSV parsing.
   **Where:** `backend/package.json`
   **Why:** Need to handle `multipart/form-data` uploads and parse CSV content efficiently without blocking the event loop.
   **Implications:** `multer` and `csv-parse` will be added.
   **Tests:** Dependency installation verification.

2. **What:** Add `idempotency_key` to `import_job` table.
   **Where:** `backend/migrations/<timestamp>_add_idempotency_to_import_job.ts`
   **Why:** To distinguish between a network retry (same idempotency key) and a duplicate file upload (same file hash).
   **Implications:** Database schema change. Adds `idempotency_key varchar(100)` and a unique constraint `(imported_by, idempotency_key)`.
   **Tests:** `test:migrations` checks.

3. **What:** Define Import domain types, DTOs, and Repositories.
   **Where:** `backend/src/modules/import/domain/import.types.ts`, `backend/src/modules/import/api/import.dto.ts`, `backend/src/modules/import/infrastructure/postgres-import.repository.ts`
   **Why:** Provide strongly typed boundaries and database persistence for `import_job` and `import_row`.
   **Implications:** New interfaces and repository methods (e.g., `createImportJob`, `bulkInsertImportRows`, `findImportJobByIdempotencyKey`). Maps 409 unique constraint errors reliably.
   **Tests:** Database integration tests for idempotency and file hash constraints.

4. **What:** Implement CSV Validation & Import Service logic.
   **Where:** `backend/src/modules/import/application/csv-import.service.ts`
   **Why:** Orchestrates file hashing, duplicates check, template resolution, CSV parsing, and strict row-by-row validation.
   **Implications:** Validates Employee existence/scope, matching `evaluation_cycle`, and specifically the `KPI ↔ Criterion ↔ Template` mappings (handling `AMBIGUOUS_KPI_FOR_CRITERION`, `KPI_CRITERION_MISMATCH`, etc.).
   **Tests:** Comprehensive unit tests for the 6-case KPI mapping matrix and duplicate row checks.

5. **What:** Implement `POST /imports/csv` endpoint.
   **Where:** `backend/src/modules/import/api/import.routes.ts`, `import.controller.ts`
   **Why:** Expose the multipart upload capability to the frontend securely.
   **Implications:** Enforces `HR_ADMIN` RBAC, extracts `Idempotency-Key` and `cycle_id`, returns the preview envelope.
   **Tests:** E2E API tests with supertest for valid/invalid files, 401/403/409/422 HTTP status codes, and idempotency replays.

6. **What:** Implement Frontend API Client and TanStack Query Hook.
   **Where:** `frontend/src/features/imports/api/import-api.ts`
   **Why:** Connect the frontend to the new endpoint securely using existing `FormData` and `postApi` conventions.
   **Implications:** Exposes `useCsvImportUploadMutation()` and generates `Idempotency-Key` once per intentional user click.
   **Tests:** API client tests verifying `FormData` construction and header injection.

7. **What:** Build Frontend Upload UI & Preview Table.
   **Where:** `frontend/src/features/imports/pages/ImportCenterPage.tsx`
   **Why:** Allow users to select cycles, pick files, trigger uploads, and view actionable row-level errors (`AMBIGUOUS_KPI_FOR_CRITERION`, etc.).
   **Implications:** State management for upload progress, duplicate import handling, and 403 fallbacks.
   **Tests:** Component rendering tests, interaction tests (upload button), and error table rendering tests.
