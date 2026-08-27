# Step 3: Impact Analysis

Status: produced during this step

## Impact Analysis

### Backend
1. **`audit_log` Table:** No schema changes required. We are only adding read capabilities.
2. **`AuditRepository` & `PostgresAuditRepository`:** Adding a `findMany` method will not impact existing `insert` or retention operations.
3. **`AuditService`:** Adding `getLogs` is additive. No impact on existing business logic (e.g. `TeamService`).
4. **`AuditController` & `audit.module.ts`:** We are exposing a new endpoint `/api/audit-logs`. This will increase the API surface area but is protected by RBAC middleware, posing no security risk to other data. The module will need to be registered with the Express router in `src/app.ts` or via the `audit.module.ts`.

### Frontend
1. **Routing (`App.tsx`):** We are adding a new route `/admin/audit-logs`. The route will be wrapped in existing `ProtectedRoute` components, ensuring only `HR_ADMIN` and `SYSTEM_ADMIN` can access it. No impact on existing routes.
2. **Layout (`AppLayout`):** A new navigation item will be added to the sidebar. Existing layout structure supports this seamlessly.
3. **Audit Feature Module (`src/features/audit/`):** Completely new, isolated code. Will not affect IAM, Auth, or Organization modules.
4. **Bundle Size:** Minimal impact. We are reusing existing `lumina-design-system-theme` components and standard React Router / React Query hooks.

### Performance
- **Backend Query:** The `audit_log` table will grow very large over 2 years. The LLD notes that `(entity_type, entity_id)` and `(performed_at)` are indexed. The `findMany` query **must** ensure it utilizes these indexes (e.g., ordering by `performed_at DESC` and filtering on indexed columns first). Pagination is required using standard `LIMIT/OFFSET` or cursor-based approach. We will implement `LIMIT/OFFSET` for simplicity since it aligns with typical frontend table requirements, but with a maximum query limit.
- **Frontend Rendering:** A paginated table with typical page sizes (e.g., 20-50 rows) will render quickly without performance degradation.

### Security / Authorization
- Endpoint is strictly `GET`.
- Enforced by `requireAnyRole(['SYSTEM_ADMIN', 'HR_ADMIN'])` on the controller.
- No direct SQL injection risks as queries will use parameterized Postgres queries.

## Risk Mitigation
- To prevent heavy queries from `OFFSET` scanning on a massive audit log table, we can enforce a maximum `OFFSET` or require date-range filtering if the page goes too deep. For this MVP, standard `LIMIT/OFFSET` is acceptable per internal tools standards, but we will add `from_date` and `to_date` filters to narrow the result set.
