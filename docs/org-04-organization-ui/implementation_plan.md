# Plan to Address Feedback

## 1 & 2. Sidebar Role-Based Update
- **Observation:** `Sidebar.tsx` currently has hardcoded nav items, and the "Organization" tab is missing (it has "Employees" by mistake). Furthermore, there is no role-based filtering on the sidebar items.
- **Plan:**
  - Update `Sidebar.tsx` to import `useAuth`.
  - Filter `navSections` based on `user?.roles`. For instance, `Configuration` (which includes IAM, Organization, etc.) should only be visible to `SYSTEM_ADMIN` or `HR_ADMIN`.
  - Replace the incorrect `employees` item with `organization` (label: 'Organization') pointing to the new Organization UI.

## 3. Employee Page 500 Error
- **Observation:** The `Employee` API is throwing a 500 Internal Server Error because the `postgres-employee.repository.ts` queries for `termination_date` and `version` columns, which were never created in the initial database schema migration for the `employee` table.
- **Plan:**
  - Create a new migration file `1724500000007_add_employee_missing_columns.ts` to add `termination_date` (date) and `version` (int, default 1) to the `employee` table.
  - Run `npm run migrate:up:tsx` to apply this fix.

## 4. Seeding Data for Tabs
- **Observation:** The other tabs (Departments, Teams, Roles, Levels) currently have no data.
- **Plan:**
  - Create a seed script (e.g., `seed-org-data.ts`) or run raw SQL to insert default/dummy data for Departments, Roles, and Job Levels so the UI has immediate data to display.

---
**Does this plan look good to proceed?**
