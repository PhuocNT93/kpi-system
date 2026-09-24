# Frontend User Guide — Individual Evaluation Cycle Creation

## Prerequisites
- Backend running with migration `1791000000004_add-cycle-type-and-trigger-to-evaluation-cycle` applied (`npm --prefix backend run migrate:up`).
- Optional env: `BATCH_CYCLE_LEAD_TIME_WEEKS` (default `4`), `BUSINESS_TIMEZONE` (default `Asia/Ho_Chi_Minh`).
- Frontend `VITE_API_BASE_URL` pointing at the running backend.
- At least one evaluation template with a PUBLISHED version and ACTIVE employees that have a team and role.

## Start / stop
```powershell
npm --prefix backend run dev      # backend (PORT or 3000)
npm --prefix frontend run dev     # frontend (Vite)
```
Stop with `Ctrl+C` in each terminal.

## Where to find it
- URL: `/admin/individual-cycles`.
- Sidebar: **Configuration → Individual Evaluation** (HR_ADMIN, SYSTEM_ADMIN, MANAGER).
- Evaluation Cycles page (`/admin/cycles`, HR/Admin): **Create Individual Evaluation** button.
- EMPLOYEE users do not see the entry; the route and the backend both reject them.

## Using the page
The page has two cards and the actions at the bottom right.

1. **Select employees**: a table like Employee Search (Employee, Team, Next review, Review status).
   - Search by name, code or email. Paging shows 10 rows per page (Previous / Next); there is no inner scroll.
   - Tick rows (or the header checkbox to select the whole page). "N selected · Clear selection" is shown top right.
   - HR/Admin see all ACTIVE employees; a MANAGER sees only ACTIVE employees of the teams they manage.
   - Who already has an open evaluation is **not** shown here; check **Employee Search → STATUS** (OPEN/SELF_ASSESSMENT/... = has one; No evaluation / APPROVED / PUBLISHED / LOCKED / REJECTED = free).
2. **Cycle settings**: published template version, optional cycle name (default "Individual Review"; saved as "<name> - <employee code>"), start / end date (defaults today → +30 days).
3. **Review and create** → confirm dialog → **Create**. **Cancel** returns to Evaluation Cycles (Team Reviews for managers).

## Results
- **Success (green):** one cycle per employee, status OPEN, with a link to each cycle (HR/Admin; managers see the cycle code only). Buttons: Done / Create another.
- **Blocked employees (red):** employees that already have an active evaluation were skipped (`EVALUATION_ALREADY_OPEN`); the others were created.
- **Warning (yellow):** created successfully, but the employee is also in a DRAFT batch cycle starting within the configured window. Informational only.
- **All blocked (409):** red alert "No evaluation was created"; nothing was created.
- **403:** permission / team-scope alert.
- **400/422 and other errors:** backend message, error code and request ID; form inputs are preserved.

## Validation (client side, UX only — backend is authoritative)
- At least one employee, a template, both dates, end ≥ start.
- Backend additionally limits 1–100 employees and rejects unknown (404) or ineligible (422 `EMPLOYEE_NOT_ELIGIBLE`) employees.

## Known limitations
- The employee list loads the first 50 employees only (same limitation as the batch cycle form; deferred).
- The table does not indicate which employees already have an open evaluation (use Employee Search).
- Creating a template from Template Builder can crash the backend (pre-existing bug in `createTemplate`, out of scope).
- The Review Due Dashboard page is still a stub and is not linked to this flow (`GET /reviews/due` does not exist).
- A batch cycle opened at the same moment as an individual creation for the same employee may still produce two active evaluations (accepted risk, LLD Risk #11).
