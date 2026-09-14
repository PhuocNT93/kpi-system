# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| **Backend** | | | | |
| TC01 | Employee accesses own report | User is Employee A | `GET /reports/employees/A` | `200 OK`, returns score, kpi summary, and `data_as_of` |
| TC02 | Employee accesses other's report | User is Employee A | `GET /reports/employees/B` | `403 Forbidden` (scope violation) |
| TC03 | Manager accesses managed team | User is Manager of Team T | `GET /reports/teams/T` | `200 OK`, returns team average, completion rate, kpi aggregates |
| TC04 | Manager accesses unmanaged team | User is Manager of Team T | `GET /reports/teams/X` | `403 Forbidden` (scope violation) |
| TC05 | HR/Admin accesses org report | User is HR_ADMIN | `GET /reports/organization` | `200 OK`, returns organization aggregates |
| TC06 | Cross-cycle KPI: Same Code | `kpi.code=KPI01` in Cycle 1 & 2 (names differ) | `GET /reports/kpi/trend` | KPI01 status is `MATCHED`, delta calculated |
| TC07 | Cross-cycle KPI: New | `kpi.code=KPI02` in Cycle 2 only | `GET /reports/kpi/trend` | KPI02 status is `NEW`, previous is null |
| TC08 | Cross-cycle KPI: Removed | `kpi.code=KPI03` in Cycle 1 only | `GET /reports/kpi/trend` | KPI03 status is `REMOVED`, current is null |
| TC09 | Missing/Invalid filters | No `cycleId` provided | `GET /reports/teams/T` | `400 Bad Request` |
| TC10 | Performance & Query Plan | Large db with ~1000 employees | `EXPLAIN ANALYZE` on reporting queries | Queries hit materialized views/indexes, no sequential scan on `evaluation_item` |
| **Frontend** | | | | |
| TC11 | Dashboard Loading State | API request is pending | Render Dashboard Page | Skeleton loaders are displayed |
| TC12 | Dashboard Error State | API returns 500/network error | Render Dashboard Page | Error message displayed with "Try again" button |
| TC13 | Dashboard Empty State | API returns 200 with no data | Render Dashboard Page | "No evaluation found / No reporting data" displayed |
| TC14 | Dashboard Permission State | API returns 403 Forbidden | Render Dashboard Page | "You don't have permission to view this report" displayed |
| TC15 | KPI Breakdown Rendering | Valid KPI data received | Render `KpiBreakdown` component | Displays KPI name, score, weighted score |
| TC16 | KPI Trend Table Rendering | Valid trend data received | Render `KpiTrendTable` component | Correctly highlights MATCHED, NEW, REMOVED statuses and deltas |
| TC17 | No Employee Ranking | Render Team/Org Dashboard | Inspect DOM for tables | No leaderboard, ranking, or relative position metrics are rendered |
| TC18 | Data Freshness | API returns `data_as_of` | Render Dashboard Header | "Data as of [timestamp]" is displayed |
