# Frontend User Guide: Audit Logs

Status: produced during this step

## Prerequisites
- Node.js 18+
- PostgreSQL database populated with the `audit_log` migration and `kpi_maintenance` role setup.
- You must be authenticated and assigned either the `SYSTEM_ADMIN` or `HR_ADMIN` role.

## Startup Commands
1. **Backend**: 
   ```bash
   cd backend
   npm run dev
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## Configured URLs
- **Backend API**: `GET /api/audit-logs`
- **Frontend Route**: `http://localhost:5173/admin/audit-logs` (assuming Vite defaults)

## User-Visible Behavior
- Once logged in as `SYSTEM_ADMIN` or `HR_ADMIN`, you will see an **"Identity & Access" > "Audit Log"** icon in the sidebar (represented by a shield-check).
- Navigating to it renders the Audit Log view.
- The view consists of a table displaying `Timestamp`, `Action`, `Entity Type`, `Entity ID`, `Performed By` and detailed JSON representations of changes (e.g. `fieldName: oldValue -> newValue` and optional reasons).
- There is a filter bar at the top allowing filtering by `Entity ID` (input field), `Entity Type` (dropdown), and `Action` (dropdown).
- Pagination allows you to traverse all historical audit logs. 
- Actions are color-coded (CREATE = green, DELETE = red, UPDATE/others = indigo).

## Known Limitations
- The current implementation paginates using `LIMIT` and `OFFSET`. Very deep pages (e.g. >1,000,000 records) might experience slightly increased query latency.
- Sorting is strictly by `performed_at DESC`. Custom sorting on other columns is not supported to ensure fast query indexing.
