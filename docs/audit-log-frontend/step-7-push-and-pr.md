# Step 7: Push & Create PR

Status: produced during this step

## Git Status
- Branch: `feature/audit-log-frontend`
- Backend API and frontend code for `GET /api/audit-logs` implemented.
- Re-tested against internal workflow and verified typescript passes.

## Commits
```
feat(audit): implement frontend audit log viewer and backend API
```

## Pull Request Details
- **Title**: `feat: implement audit log viewer for HR/Admin`
- **Description**:
  - Exposes `GET /api/audit-logs` endpoint on the backend.
  - Implements pagination and filtering on `audit_log` table.
  - Secures endpoint with `SYSTEM_ADMIN` / `HR_ADMIN` role check.
  - Adds Audit Log page in the React frontend with a searchable and filterable table.
  - Follows "write-once, read-only" rules described in the LLD.
