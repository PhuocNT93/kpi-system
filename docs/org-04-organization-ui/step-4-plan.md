# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Fix Backend Team Routes Registration
   **Where:** `backend/src/modules/employee/api/employee.router.ts`
   **Why:** The previous developer implemented `TeamController` methods but forgot to expose them via the Express router. The frontend will get 404s trying to fetch Teams if not fixed.
   **Tests:** Backend tests for `/api/teams` will be restored or verified.

2. **What:** Correct API URLs in Frontend Organization Client
   **Where:** `frontend/src/features/organization/api/organization-api.ts`
   **Why:** Current URLs are `/api/departments` but the backend is mounted at `/api/org/departments`. This misalignment needs fixing to ensure successful data fetching.
   **Tests:** Check frontend integration behavior.

3. **What:** Build Unified `OrganizationPage` Layout and Router Setup
   **Where:** `frontend/src/features/organization/pages/OrganizationPage.tsx`, `frontend/src/App.tsx`
   **Why:** To provide a tabbed navigation interface (Departments, Teams, Roles, Job Levels, Employees) similar to `IamPage`, allowing HR/Admin to easily manage organization entities.
   **Tests:** Verify router navigation and active tab highlighting.

4. **What:** Implement Department UI (CRUD)
   **Where:** `frontend/src/features/organization/components/DepartmentTable.tsx`, `DepartmentFormModal.tsx`, `pages/DepartmentsPage.tsx`
   **Why:** Enables HR/Admin to view, create, edit, and deactivate Departments.
   **Tests:** Component tests for form validation, table rendering, and TanStack Query interactions.

5. **What:** Implement Organization Roles and Job Levels UI (CRUD)
   **Where:** `frontend/src/features/organization/pages/OrgRolesPage.tsx`, `JobLevelsPage.tsx` (and respective tables/forms)
   **Why:** Organization roles (like SI, SM, BA) and Job Levels (like Junior, Middle, Senior) are foundational for the evaluation engine. 
   **Tests:** Component tests for form validation and table rendering.

6. **What:** Implement Employee UI (CRUD)
   **Where:** `frontend/src/features/organization/api/employee-api.ts`, `components/EmployeeTable.tsx`, `EmployeeFormModal.tsx`, `pages/EmployeesPage.tsx`
   **Why:** Enables HR/Admin to manage the employee lifecycle and their assignments (team, department, role, level). 
   **Tests:** Component tests for rendering, assignment selects, and state boundaries.

7. **What:** Enforce RBAC in Frontend
   **Where:** `frontend/src/App.tsx`
   **Why:** Ensure `/admin/organization` is only accessible to users with `HR_ADMIN` or `SYSTEM_ADMIN` roles. Managers attempting to hit these URLs should be blocked.
   **Tests:** Verify routing blocks access for non-admin tokens.
