# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Implement backend CRUD APIs for Department, JobRole, and JobLevel within the Organization module, including database migrations, DTO validation, service, repository, and tests.

Expected Behavior: 
- Endpoints for Departments (`/api/v1/departments`), Job Roles (`/api/v1/roles`), and Job Levels (`/api/v1/job-levels`) are functional.
- API responses strictly follow the standardized envelope (`{ success, message, data, meta }`).
- Validation is enforced at the DTO level.
- Data persistence is handled via a repository layer matching the LLD ERD.

Acceptance Criteria:
1. Migrations for Department, JobRole, and JobLevel successfully run without errors.
2. CRUD APIs return the correct data and follow the standard API envelope.
3. Validation and RBAC tests pass.
4. Services and repositories correctly manage entities.

Out of Scope:
- `Employee` and `EmployeeAssignment` entities (these will be implemented in a subsequent task).
- Frontend integration/UI for these entities.

Business Rules Involved:
- `code` must be unique for Departments, JobRoles, and JobLevels.
- RBAC must be enforced (only authorized roles can modify organization master data).
- System must use snake_case for database columns and API fields.

Open Questions / Conflicts:
- None.
