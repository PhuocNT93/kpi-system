# Step 1: Understand

Status: reconstructed

## Deliverable

Goal: Implement the Reporting API layer and Reporting Dashboard UI for the Employee Performance Evaluation System. The reporting APIs must query dedicated read models (materialized views) and not directly perform aggregations on OLTP tables.

Expected Behavior:
- **Backend:** Expose REST endpoints for Employee, Team, Organization, KPI Team, and KPI Trend reports. The endpoints will include pagination, filtering, standard response envelopes, DTO validation, and expose a `data_as_of` field.
- **Frontend:** Build role-specific dashboards (Employee, Team, Organization) displaying overall scores, completion rates, KPI breakdowns, and KPI cross-cycle trends. The UI must handle loading, error, empty, and permission states gracefully, and display the data freshness.
- **Cross-cycle Comparison:** Match KPIs across different evaluation cycles strictly by `kpi.code` (identifying MATCHED, NEW, and REMOVED states). Renamed KPIs with the same code remain MATCHED.
- **RBAC:** Enforce data access scopes (Employee: own data, Manager: managed teams, HR/Admin: organization-wide, System Admin: read-only scope per LLD) strictly at the backend level.

Acceptance Criteria:
1. Employee, Team, Organization, KPI Team, and KPI Trend APIs are implemented and query the read models.
2. Cross-cycle matching correctly identifies MATCHED, NEW, and REMOVED KPIs based on `kpi.code`.
3. RBAC is strictly enforced for all APIs; users cannot access out-of-scope data.
4. Typed API clients and TanStack Query hooks are implemented in the frontend.
5. Dashboards for Employee, Team, and Organization render correctly with loading, error, empty, and permission states.
6. KPI breakdown and KPI trend tables display accurately based on API responses.
7. Data freshness (`data_as_of`) is clearly displayed in the UI.
8. **No employee ranking or leaderboard is exposed in the API or UI.**
9. Integration tests are written for all API endpoints, and performance/query plans are verified to avoid OLTP regression.
10. Frontend tests are written for the dashboard components.

Out of Scope:
- Querying OLTP tables (e.g., `evaluation_item`, `measurement`) directly from Reporting controllers.
- Recalculating KPI scores in the Reporting module.
- Creating a separate/new API envelope for Reporting.
- Hardcoding the sample 18 KPIs in the frontend or backend.
- Exposing employee ranking, leaderboards, or relative position.

Business Rules Involved:
- **Reporting Architecture:** User-facing Reporting APIs MUST query the dedicated reporting read models/materialized views.
- **Cross-cycle Matching:** KPI identity across cycles is determined exclusively by `kpi.code`.
- **Authorization Scope:** 
  - Employee → own reporting data
  - Manager → managed teams
  - HR/Admin → organization
  - System Admin → read-only scope defined by LLD
- **Data Freshness:** Because reporting data is refreshed asynchronously, the API must expose `data_as_of`.

Open Questions / Conflicts:
- None.
