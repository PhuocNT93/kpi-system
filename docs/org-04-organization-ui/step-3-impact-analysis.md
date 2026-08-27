# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Creating new `OrganizationPage` layout, `DepartmentsPage`, `EmployeesPage`, and integrating `TeamsPage`. Adding extensive form and table components, hooks, and typed API clients. |
| Backend | LOW | Fixing a bug where `Team` routes were not registered in the Express router (`employee.router.ts`), causing 404s. |
| Database | NONE | No changes to the database schema or migrations. |
| API | LOW | Exposing the existing `TeamController` methods to the actual HTTP router to match the Swagger contract. |
| RBAC / Scope | MEDIUM | Ensuring the new frontend routes are protected by `ProtectedRoute` restricted to `HR_ADMIN` and `SYSTEM_ADMIN` (blocking `MANAGER` and `EMPLOYEE`). |
| Workflow | NONE | No workflow logic changes. |
| Audit | NONE | Backend audit logging for these entities is already handled at the infrastructure level. |
| Concurrency | NONE | Standard HTTP request concurrency applies; optimistic locking handled by backend. |
| Performance | LOW | Standard pagination will be used in frontend tables to avoid loading massive lists. |
| Historical Data | NONE | No changes to history mechanisms. |

Potential Risks:
- **API URL Misalignment:** The frontend was attempting to call `/api/departments`, but the backend serves this at `/api/org/departments`. This must be corrected in the frontend API client. Similarly, the backend team routes must be properly mounted to match the frontend expectations.

Required ADR / Clarification:
- None. The architecture and technical direction are clear and conform to the `LLD`.
