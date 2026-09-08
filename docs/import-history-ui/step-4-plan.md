# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Add paginated query methods for history and rows to the data layer.
   **Where:** `backend/src/modules/import/domain/import.types.ts` and `backend/src/modules/import/infrastructure/postgres-import.repository.ts`.
   **Why:** We need to fetch multiple import jobs and specific row details without loading all data into memory at once.
   **Tests:** Not applicable for unit testing, verified during E2E.

2. **What:** Add service and controller methods for History and Rows.
   **Where:** `backend/src/modules/import/application/csv-import.service.ts`, `backend/src/modules/import/api/import.controller.ts`, and `backend/src/modules/import/api/import.routes.ts`.
   **Why:** Exposes the repository paginated queries to the frontend using the standard API envelope and the existing `requireHrAdmin` middleware.
   **Tests:** `backend/src/modules/import/api/import.controller.test.ts` (if it exists) to test 200 OK and 401/403 scenarios.

3. **What:** Update frontend typed API client.
   **Where:** `frontend/src/features/imports/api/import-api.ts`.
   **Why:** Provides typed functions `getImportHistory` and `getImportRows` for React Query.
   **Tests:** Verified during component integration.

4. **What:** Implement routing and refactor Upload flow.
   **Where:** `frontend/src/features/imports/pages/` and frontend routing configuration (e.g., `App.tsx` or router config).
   **Why:** Separates the current `ImportCenterPage` into a dedicated upload/preview flow (`/imports/upload`), making room for the History and Detail pages.
   **Tests:** Verify the router correctly maps `/imports`, `/imports/upload`, and `/imports/:id`.

5. **What:** Implement Import History Page.
   **Where:** `frontend/src/features/imports/pages/ImportHistoryPage.tsx`.
   **Why:** Satisfies the requirement to display a paginated list of all imports, including their status, counters, and dates.
   **Tests:** Component renders loading skeleton, empty state, and data table correctly.

6. **What:** Implement Import Detail Page.
   **Where:** `frontend/src/features/imports/pages/ImportDetailPage.tsx`.
   **Why:** Satisfies the requirement to display specific import job summary and its paginated row validation/processing results.
   **Tests:** Component renders summary, handles empty row sets, and accurately displays specific row errors.
