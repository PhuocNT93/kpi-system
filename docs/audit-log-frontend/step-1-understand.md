# Step 1: Understand

Status: produced during this step

## Task Understanding

**Goal:** Implement the frontend interface (and required backend endpoint) for the Audit Log module, allowing authorized roles to view and filter audit history.

**Expected Behavior:**
1. **Backend API:** Create a new `GET /api/audit-logs` endpoint.
   - Requires `SYSTEM_ADMIN` or `HR_ADMIN` role.
   - Supports pagination and filtering by: `entity_type`, `entity_id`, `action`, `performed_by`, and date ranges (`from_date`, `to_date`).
   - Retrieves data from the `audit_log` table.
2. **Frontend Route & Navigation:** Add an "Audit Logs" menu item and corresponding route (e.g., `/audit-logs`), visible only to authorized users.
3. **Frontend Data Table:** Display a modern, paginated table listing the audit logs.
   - Use the project's existing UI components (e.g., `lumina-design-system-theme` components like `Table`, `Input`, `Select`, `Pagination`).
   - Show columns: Timestamp, Action, Entity Type, Entity ID, Changes (Old Value -> New Value), Performed By, Reason.
4. **Filtering UI:** Provide filter inputs for Entity Type, Action, Date Range, etc.

**Acceptance Criteria:**
- Backend provides a paginated `GET /api/audit-logs` endpoint protected by RBAC.
- Frontend includes a dedicated Audit Logs page with a data table and filters.
- UI styling follows the project's aesthetic standards (Tailwind CSS, existing components).
- Only authorized roles (`SYSTEM_ADMIN`, `HR_ADMIN`) can access the route and API.

**Out of Scope:**
- No creating, updating, or deleting audit logs from the UI.
- No complex visualization (e.g., charts of actions over time) unless specifically requested.

**Business Rules Involved:**
- Adhere to the `LLD_Employee_Performance_Evaluation_System.md` section 10.7 (Audit API is GET-only).

**Open Questions / Conflicts:**
- Should the "Performed By" column display the employee's name or just the UUID? Displaying the name requires joining the `audit_log` table with the `employee` table on the backend, which is highly recommended for UX. I will plan to include this join in the backend endpoint.
