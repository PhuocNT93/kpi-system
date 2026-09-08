# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Requires splitting the current `ImportCenterPage` into a dedicated upload flow (`/imports/upload`), building the new History page (`/imports`), and building the Detail page (`/imports/:importJobId`). Includes adding TanStack query hooks for pagination and routing updates. |
| Backend | MEDIUM | Requires adding two new `GET` routes (`/imports` and `/imports/:id/rows`), extending the `ImportController`, `CsvImportService`, and `PostgresImportRepository` to support paginated reads. |
| Database | LOW | No schema changes. Only adding new SELECT queries with `LIMIT` and `OFFSET` to `postgres-import.repository.ts`. |
| API | MEDIUM | New endpoints: `GET /imports` and `GET /imports/:id/rows` following the existing `{ success, data, meta }` envelope. |
| RBAC / Scope | LOW | Reusing existing `requireHrAdmin` middleware. The endpoints will properly restrict access. |
| Workflow | LOW | Follows existing backend/frontend separation of concerns. |
| Audit | LOW | Read-only additions, no changes to how writes are audited. |
| Concurrency | LOW | Read operations do not impact concurrency. The existing async processing handles concurrency properly. |
| Performance | LOW | Adding pagination for both history and row details ensures large datasets do not block the browser or backend. |
| Historical Data | NONE | No changes to existing records. |

Potential Risks:
- Splitting the existing `ImportCenterPage.tsx` logic into distinct pages must be done carefully to preserve the currently functioning idempotency and validation preview flow.
- A single import job may have thousands of rows. The new `GET /imports/:id/rows` endpoint must be strictly paginated to prevent memory and payload size issues.

Required ADR / Clarification:
- None.
