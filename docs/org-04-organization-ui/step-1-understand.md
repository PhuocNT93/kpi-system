# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Build the remaining Organization Admin UI pages, components, hooks, and typed clients for Department, Team, and Employee management.

Expected Behavior: 
- HR/Admin users can navigate to the Organization management section.
- They can view, create, edit, and deactivate Departments.
- They can view, create, edit, and deactivate Employees, and assign them to respective departments, teams, roles, and job levels.
- (Teams management UI already partially exists from a previous PR, but needs to be integrated/verified alongside Departments and Employees).
- Managers must be blocked from accessing these admin functions.
- All screens must handle loading, error, empty, and permission boundaries gracefully.

Acceptance Criteria:
1. HR/Admin can manage organization data (Department, Employee) via the UI.
2. Manager cannot access admin functions.
3. Frontend tests pass.
4. Pages include loading/error/empty/permission states.

Out of Scope:
- Backend API modifications (unless bugs are found).
- Advanced Employee Assignment History UI (only basic CRUD/current assignment needed for MVP).

Business Rules Involved:
- RBAC: Only actors with HR/Admin permissions can access the organization configuration screens.

Open Questions / Conflicts:
- None. (We are proceeding with building Department, Team, Employee, plus Role and Level CRUD since they are required organization references).
