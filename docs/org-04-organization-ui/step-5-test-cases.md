# Step 5: Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Backend team routes exposed correctly | User is authenticated with valid token | `GET /api/teams` | Returns `200 OK` and a list of teams, no `404 Not Found`. |
| TC02 | Frontend API path alignment | Frontend app running | Load `TeamsPage` and `DepartmentsPage` | Data fetches successfully without `404` (using `/api/org/departments` and `/api/teams`). |
| TC03 | RBAC: Admin Access | User has `HR_ADMIN` role | Navigate to `/admin/organization` | Organization layout and sub-tabs render successfully. |
| TC04 | RBAC: Manager Restriction | User has `MANAGER` role | Navigate to `/admin/organization` | User is redirected or shown a "Forbidden" UI, unable to access the page. |
| TC05 | Department CRUD - Read & Render | Departments exist in DB | Load `DepartmentsPage` | Table displays active departments, loading states handle transitions. |
| TC06 | Department CRUD - Create | - | Fill and submit `DepartmentFormModal` | Success toast shown, table invalidates query and reflects new data. |
| TC07 | Role & Job Level CRUD | Roles/Levels exist in DB | Load `OrgRolesPage` and `JobLevelsPage` | Tables render data accurately from `/api/org/roles` and `/api/org/job-levels`. |
| TC08 | Employee CRUD - Read & Render | Employees exist in DB | Load `EmployeesPage` | Table displays employees with their current role, team, and department assignments. |
| TC09 | Employee CRUD - Create | Form is fully populated | Submit `EmployeeFormModal` | API `/api/employees` returns success, query invalidated, table updates. |
