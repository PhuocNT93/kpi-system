# Step 1: Task Understanding

Status: reconstructed

## Deliverable

Goal: Implement the complete Import Upload / Preview / Status / History UI feature for the KPI System, covering both Backend API support and Frontend UI.

Expected Behavior:
- HR/Admin users can access the `/imports` routes to manage CSV evaluation imports.
- Users can upload a CSV file and (if required) select an evaluation cycle.
- After upload, users see a preview of the import including row-level validation errors.
- Users choose between Partial or Strict import modes.
- Users confirm the import, triggering an asynchronous import process with polling to show progress.
- Users can view a paginated history of imports, and click into an import detail page to see row-level history and errors.
- All edge cases and states (loading, empty, 403 Forbidden, API network errors, 409 Conflict, 422 Unprocessable Entity) are handled gracefully.

Acceptance Criteria:
1. `/imports`, `/imports/upload`, and `/imports/:importJobId` routes exist and are protected by HR_ADMIN RBAC.
2. Frontend typed API client is extended to call existing backend import APIs.
3. Pagination, filtering, and status badges are implemented correctly in the History table.
4. Upload form supports file selection, evaluation cycle selection, and idempotency key generation.
5. Preview UI shows total, valid, and invalid row counts, along with structured row validation errors.
6. Confirm UI accurately reflects strict vs. partial semantics and passes idempotency keys.
7. Polling logic automatically queries the job status when running and stops in terminal states.
8. Detail page displays job summary, config, and paginated row results.
9. Loading skeletons and empty states are displayed instead of blank screens.

Out of Scope:
- Creating a parallel, secondary CSV import flow.
- Duplicating backend validation logic or scoring engine math in React.
- Allowing import of KPI-level scores (CSV only supports criterion-level).
- Polling indefinitely or leaking timers across unmounts.

Business Rules Involved:
- Backend remains the absolute authority on validation, status, counters, and RBAC scope.
- Strict mode allows importing ONLY if 0 invalid rows exist.
- Uploads and confirms must use Idempotency-Keys to prevent accidental double-processing.
- Historical records must reflect the template version and exact counters determined by the backend.

Open Questions / Conflicts:
- None.
