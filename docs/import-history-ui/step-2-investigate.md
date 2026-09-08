# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `BACKEND_NODE_RULES.md`
- `FRONTEND_REACT_RULES.md`

Relevant Modules and Files:
- Backend `import` module: `import.routes.ts`, `import.controller.ts`, `csv-import.service.ts`, `postgres-import.repository.ts`, `import.types.ts`.
- Frontend `imports` feature: `ImportCenterPage.tsx` (to be split/reused), `import-api.ts`.

Existing Implementation:
- **Backend**: The core import pipeline is mostly implemented. `uploadCsv`, `confirmImport`, and `getImportStatus` endpoints exist. `processUpload` handles idempotency, hashing, validation, and transient error generation. `confirmImport` handles the async row-by-row item update.
- **Frontend**: `ImportCenterPage.tsx` currently acts as a single-page upload, preview, and confirmation flow. `import-api.ts` provides hooks for these actions.
- **Database**: `postgres-import.repository.ts` provides CRUD operations for jobs and rows, but lacks paginated multi-job history (`getImportJobsHistory`) and count functionality.

Missing Implementation:
- **Backend API**: Need to implement `GET /imports` (paginated history of jobs) and `GET /imports/:id/rows` (paginated row details for a specific job).
- **Backend Repository**: Add `getImportJobsHistory(limit, offset)` and `getImportJobCount()` to `postgres-import.repository.ts`.
- **Frontend Routing**: Needs to be structured as `/imports` (History), `/imports/upload` (Upload/Preview), and `/imports/:importJobId` (Detail).
- **Frontend UI**: Need to build `ImportHistoryPage.tsx` and `ImportDetailPage.tsx` using the existing design system. The `ImportCenterPage.tsx` upload flow will become the Upload page.

Patterns to Reuse:
- Frontend table components and pagination patterns from other modules.
- Backend API envelope (`{ success, data, meta }`).
- Existing `AuthorizationService` and HR_ADMIN role check middleware.
- React Query for data fetching, caching, and polling (`useQuery` with `refetchInterval`).
