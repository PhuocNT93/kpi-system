# Frontend User Guide: Organization UI

## Prerequisites
- Node.js installed
- The backend server running at `http://localhost:8080`

## Startup Commands
1. Navigate to the `frontend` directory.
2. Run `npm install` (if not done).
3. Run `npm run dev` to start the development server.

## Configured URLs
- The frontend will be available at `http://localhost:5173`.
- Organization UI base path is `/admin/organization`.
- Specific pages:
  - Departments: `/admin/organization/departments`
  - Teams: `/admin/organization/teams`
  - Job Roles: `/admin/organization/roles`
  - Job Levels: `/admin/organization/levels`
  - Employees: `/admin/organization/employees`

## Available User-Visible Behavior
- **List Views:** Each page displays a table of existing records (Departments, Teams, Roles, Levels, Employees).
- **CRUD Operations:** Users with `HR_ADMIN` or `SYSTEM_ADMIN` roles can use the "+ Create / Add" buttons to open a modal form and add new records.
- **Edit Operations:** Authorized users can click the "Edit" button next to any row to modify its details.

## Known Limitations
- Pagination is not yet implemented in the UI tables.
- Hard delete is not available; records are soft-deleted by setting them to `INACTIVE`.
