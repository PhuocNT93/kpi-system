# Step 4: Plan

Status: produced during this step

## Implementation Plan

### Backend Changes

1. **`src/modules/audit/domain/audit.domain.ts`**:
   - Add `AuditLogQuerySchema` (Zod) for validating `GET /api/audit-logs` query params (page, limit, from_date, to_date, entity_type, action, performed_by).
2. **`src/modules/audit/domain/audit.repository.ts`**:
   - Add `findMany(filters: AuditLogQuery)` returning `{ logs: AuditLog[], total: number }`.
3. **`src/modules/audit/infrastructure/postgres-audit.repository.ts`**:
   - Implement `findMany` using `pg` `Pool`.
   - Add a join on the `employee` table to select `employee.name` as `performed_by_name`.
   - Ensure dynamic `WHERE` clauses are safely parameterized to prevent SQL injection.
4. **`src/modules/audit/application/audit.service.ts`**:
   - Add `getLogs(filters)` which validates input using Zod and calls the repository.
5. **`src/modules/audit/api/audit.controller.ts` (NEW)**:
   - Create controller with `GET /audit-logs`.
   - Inject `AuditService`.
6. **`src/modules/audit/audit.module.ts`**:
   - Export `AuditController`.
7. **`src/app.ts`**:
   - Wire up `AuditController` to `/api` router, protected by `requireAnyRole(['SYSTEM_ADMIN', 'HR_ADMIN'])`.

### Frontend Changes

1. **`src/features/audit/api/audit-api.ts`**:
   - Create API client using Axios / Fetch to call `GET /api/audit-logs`.
   - Export React Query hook `useAuditLogs(filters)`.
2. **`src/features/audit/pages/AuditLogPage.tsx`**:
   - Create main page layout for Audit Logs.
   - Use `Card`, `Table`, `Pagination` from the UI library (`lumina-design-system-theme`).
   - Create a filter bar using `Input` (for searching UUIDs), `Select` (for Entity Type, Action), and date inputs.
3. **`src/App.tsx`**:
   - Add route `<Route path="/admin/audit-logs" element={<AuditLogPage />} />` wrapped in `ProtectedRoute` for `['SYSTEM_ADMIN', 'HR_ADMIN']`.
   - Add a navigation link to `AppLayout` sidebar or top navigation menu for Audit Logs.

### Verification Plan
- **Unit Tests:** Write backend test cases for `AuditService.getLogs()` and `PostgresAuditRepository.findMany()` ensuring proper pagination and SQL parameterization.
- **Manual Verification:** Start backend and frontend, log in as HR_ADMIN, navigate to Audit Logs, check if the UI renders existing logs (from Team creation previously), test filtering, and verify normal employees cannot see the menu/route.
