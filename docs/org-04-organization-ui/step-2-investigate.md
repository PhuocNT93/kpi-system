# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/AI_AGENT_WORKFLOW.md`

Relevant Modules and Files:
- Frontend Organization Module: `frontend/src/features/organization/` (specifically `api/`, `pages/`, `components/`)
- Frontend App Routing: `frontend/src/App.tsx`
- Backend Organization Module: `backend/src/modules/organization/`
- Backend Employee Module (contains Teams API code): `backend/src/modules/employee/`
- Backend Main Router: `backend/src/api/routes.ts`

Existing Implementation:
- **Backend**:
  - The Organization module exposes `/api/org/departments`, `/api/org/roles`, `/api/org/job-levels`.
  - The Employee module has controller methods for Teams (e.g., `getTeams`, `createTeam`) but they are **not registered** in `employee.router.ts`.
- **Frontend**:
  - `TeamsPage.tsx` and some components exist in `features/organization`.
  - `organization-api.ts` makes calls to `/api/teams` and `/api/departments`. 
    *(Note: This is misaligned with the backend which uses `/api/org/departments` and doesn't expose `/api/teams` yet).*
  - `App.tsx` routes `/admin/organization/teams` to `TeamsPage` but lacks a unified `OrganizationPage` layout with tabs for Departments and Employees.

Existing Tests:
- Some tests exist for IAM (`frontend/src/features/iam`). We will need to write component tests for the new Departments and Employees components following the same TanStack query testing patterns.

Patterns to Reuse:
- `IamPage.tsx` layout pattern (Tab navigation for sub-sections).
- TanStack Query hooks pattern in `frontend/src/features/organization/hooks/`.
- Reusable UI components from `frontend/src/shared/components/`.
