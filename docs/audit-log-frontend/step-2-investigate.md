# Step 2: Investigate

Status: produced during this step

## Investigation

**Relevant Documents:**
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Sections 10.7 Audit Log rules)

**Backend Investigation:**
- The audit log data exists in the `audit_log` PostgreSQL table.
- The `AuditRepository` currently implements `insert()` and `deleteOlderThan()`. It is missing a `findMany(filters)` method to retrieve paginated records.
- There is no `AuditController` or `/api/audit-logs` endpoint. We will need to create one and wire it up in `src/app.ts`.
- The `AuditService` needs a `getLogs(filters)` method. We must join the `employee` table to return the user's readable name alongside `performed_by`.

**Frontend Investigation:**
- The frontend uses React Router in `frontend/src/App.tsx`.
- The `AppLayout` component in `@/shared/layout` requires a new menu item for "Audit Logs".
- Frontend route structure protects `/admin/*` routes with `ProtectedRoute`. We can add `/admin/audit-logs` restricted to `['SYSTEM_ADMIN', 'HR_ADMIN']`.
- UI components (Table, Pagination, Select, Input) are located in `frontend/src/shared/components`.
- Feature modules are grouped under `frontend/src/features/`. We should create a new `frontend/src/features/audit/` feature folder to contain the API client, models, and pages for the Audit Log.

**Patterns to Reuse:**
- Reuse `sendSuccess` and `errorHandler` standard express responses on the backend.
- Reuse Zod for validation of incoming API query parameters for filtering/pagination.
- On the frontend, create an API file (`audit-api.ts`) similar to existing features (using `fetch` or Axios and React Query if applicable).
- Use `lucide-react` for icons (e.g., `ShieldAlert` or `FileText` for the menu icon).
