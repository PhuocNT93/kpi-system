# Step 6: Code Output

Status: produced during this step

## Work Completed

### Backend
1. **Domain Model**: Updated `audit.domain.ts` to include `AuditLogQuerySchema`, `AuditLogQuery`, `AuditLog`, and `PaginatedAuditLogs`.
2. **Repository**: Updated `AuditRepository` interface and implemented `findMany` in `PostgresAuditRepository` with sorting by `performed_at DESC`, dynamic WHERE clause filtering, pagination, and joining the `employee` table to fetch `performed_by_name`.
3. **Service Layer**: Added `AuditService.getLogs(filters)` to validate inputs and call the repository.
4. **API / Controller**: Created `AuditController` and `createAuditRouter`. The route `GET /api/audit-logs` is protected by a middleware checking for `SYSTEM_ADMIN` or `HR_ADMIN`.
5. **Wiring**: Added the router into `app.ts` under the global API router.

### Frontend
1. **API Client**: Created `audit-api.ts` and `audit-keys.ts` under `src/features/audit/api/` using `getApi` and TanStack Query keys.
2. **Types**: Created `audit-types.ts` mimicking the domain models.
3. **Hooks**: Created `useAuditLogs` hook for data fetching.
4. **Pages**: Created `AuditLogPage.tsx` with a responsive table, inline pagination, and filters for `Entity ID`, `Entity Type`, and `Action`. Reused `LoadingSpinner`, `EmptyState`, and `ErrorAlert` from shared UI.
5. **Routing & Sidebar**: Registered `/admin/audit-logs` in `App.tsx` wrapped in `ProtectedRoute` and validated that the existing `Sidebar.tsx` navigation correctly points to it.

## Testing Performed
- **Backend**: `npm run typecheck` passed after fixing minor import references in `audit.router.ts` and adding `findMany` to unit test mocks.
- **Frontend**: The page uses React Query correctly and handles query param construction correctly.
