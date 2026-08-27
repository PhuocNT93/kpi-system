# Step 5: Define Test Cases

Status: produced during this step

## Test Cases

### 1. Backend: `AuditService` Unit Tests
- **TC-1.1**: `getLogs` should validate input payload against `AuditLogQuerySchema`. Throw 400 on invalid formats (e.g. invalid UUIDs or dates).
- **TC-1.2**: `getLogs` should successfully call the repository's `findMany` and return `{ logs, total }`.

### 2. Backend: `PostgresAuditRepository` Unit Tests
- **TC-2.1**: `findMany` without filters should return paginated logs joining `employee.name`.
- **TC-2.2**: `findMany` with `entity_type` filter should return only logs matching the type.
- **TC-2.3**: `findMany` with `from_date` and `to_date` should correctly construct the `>=` and `<=` SQL conditions.

### 3. Backend: `AuditController` Tests
- **TC-3.1**: `GET /api/audit-logs` should return 401/403 if called by an unauthenticated user or an `EMPLOYEE` / `MANAGER`.
- **TC-3.2**: `GET /api/audit-logs` should return 200 OK with data when called by a `SYSTEM_ADMIN` or `HR_ADMIN`.

### 4. Frontend: Components & Integration (Manual / Automated depending on existing coverage)
- **TC-4.1**: `AuditLogPage` renders the data table, pagination controls, and filter bar.
- **TC-4.2**: Changing a filter (e.g. Entity Type) triggers a re-fetch via React Query and updates the table.
- **TC-4.3**: Clicking pagination "Next Page" increments the `page` state and re-fetches.
- **TC-4.4**: Unauthorized users do not see "Audit Logs" in the sidebar and are redirected if they access `/admin/audit-logs` directly.
