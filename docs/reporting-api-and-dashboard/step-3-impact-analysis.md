# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Implementing role-specific dashboards (Employee, Team, Organization), KPI Breakdown, KPI Trend tables, typed API clients, and TanStack Query hooks. |
| Backend | HIGH | Implementing KPI Team and KPI Trend APIs. Adding DTO validation, pagination, filtering, swagger documentation, and cross-cycle KPI matching logic based on `kpi.code`. |
| Database | LOW | We are querying the existing read models (`employee_evaluation_score_read_model`, etc.). No schema changes are required. |
| API | HIGH | Exposing multiple `GET` endpoints with query parameters for filtering and pagination. Standardizing the response envelope and swagger definitions. |
| RBAC / Scope | HIGH | Crucial to enforce that Employees only see their own data, Managers only see managed teams, and HR/Admin see organization-wide data. |
| Workflow | LOW | Reporting is read-only and does not affect the evaluation lifecycle or state machine. |
| Audit | LOW | Read-only operations; no new audit logs are generated. |
| Concurrency | LOW | Querying materialized views/read models has minimal concurrency impact. |
| Performance | MEDIUM | Need to ensure that endpoints exclusively query read models with pagination. Must avoid falling back to expensive aggregations on `evaluation_item` OLTP tables. |
| Historical Data | LOW | Dashboards will display historical data (cross-cycle trends) without modifying any immutable records. |

Potential Risks:
- **Data Leakage:** Incorrect RBAC could allow managers to view unmanaged teams or employees to view others' scores.
- **OLTP Regression:** Accidentally joining or querying raw transactional tables (e.g., `evaluation_item`, `measurement`) for aggregations instead of using the dedicated read models.
- **Employee Ranking Exposure:** Inadvertently displaying data in a way that allows users to deduce employee rankings or relative positions.
- **Cross-cycle Matching:** Failure to match KPIs correctly if `kpi.code` conventions are not strictly followed or handle NEW/REMOVED/MATCHED states incorrectly.

Required ADR / Clarification:
- None.
