# Frontend User Guide: Audit Viewer & Evaluation Snapshot

## 1. Prerequisites
- Node.js 20+
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Authenticated user account with role `HR_ADMIN` or `SYSTEM_ADMIN` to browse audit logs. (Users with `EMPLOYEE` or non-admin roles will see a secure 403 Forbidden state).

## 2. Startup and Shutdown Commands
- Start frontend dev server:
  ```bash
  cd frontend
  npm run dev
  ```
- Shutdown:
  Press `Ctrl+C` in the terminal.
- Run typecheck and tests:
  ```bash
  npm run typecheck
  npm test
  ```

## 3. Configured URLs
- Audit Log Viewer: `/audit-logs`
- My Evaluations: `/my-evaluations`
- Team Evaluations: `/team-evaluations`
- Evaluation Detail: `/evaluations/:id`

## 4. Available User-Visible Behavior

### Audit Viewer (`/audit-logs`)
- **Scope Indication**:
  - `SYSTEM_ADMIN`: Displays violet banner indicating system-wide audit access.
  - `HR_ADMIN`: Displays blue banner indicating organization/business-scoped audit access.
  - Unauthorized roles (`EMPLOYEE`, `MANAGER`): Displays 403 Forbidden alert explaining required permissions.
- **Filter Bar**:
  - Filter by Entity Type (`EVALUATION`, `EVALUATION_ITEM`, `EVALUATION_CYCLE`, `EVALUATION_TEMPLATE`, `CRITERION`, `KPI`, `CALIBRATION_SESSION`, etc.).
  - Filter by Action (`CREATE`, `UPDATE`, `DELETE`, `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CORRECTION`, `PUBLISH`, `LOCK`, `ADJUST`, `CALIBRATION_ADJUST`, `CALIBRATION_FINALIZE`).
  - Search by Entity UUID.
  - Reset filters button.
- **Audit Table**:
  - Displays Timestamp, Action badge, Entity Type, Entity ID (monospace), Performed By (Name and UUID), and summary of change.
  - Server-side pagination toolbar with Previous/Next buttons and page counter.
- **Read-Only Detail Modal**:
  - Clicking "Chi tiết" / "Details" opens the detail modal.
  - Shows metadata, business reason (if present), and before/after values formatted as readable JSON/diffs.
  - Strictly read-only: no edit, delete, or replay controls exist.
- **Language Switcher & Dark Mode**:
  - Global language selector (`EN` / `VI`) in Header dynamically re-renders UI translations loaded from `i18n_translation` table.
  - Full Dark Mode support across audit viewer table, modal, and filter controls.

### Evaluation Detail (`/evaluations/:id`)
- Displays KPI and criterion groups, weights, and scoring rules strictly from the evaluation item snapshots.
- Changes to published master templates or criteria will never alter the rendered snapshots or scores of past evaluations.

## 5. Expected Validation & Security Behavior
- No audit payloads or PII are written to `localStorage`, browser console, or URL parameters.
- Server-side role validation: unauthorized requests receive HTTP 403 and render an unauthorized notice.
- Authenticated hydration: UI translations are loaded from database only after authentication (`getAccessToken()`).

## 6. Known Limitations
- System configuration audit logs (e.g. IAM role permission changes) are restricted to `SYSTEM_ADMIN` and hidden from `HR_ADMIN`.
