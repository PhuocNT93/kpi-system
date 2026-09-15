# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC-SRCH-01 | Search by basic fields (code, name, email) | Test employees exist in database | `GET /employees/search?q=EMP-001`, `q=Nguyen`, `email=john@example.com` with HR_ADMIN actor | Returns matching employees in standard envelope `{ success: true, data: [...], meta: { page: { ... } } }`. |
| TC-SRCH-02 | Multi-filter search with AND semantics | Employees in different depts, teams, roles, levels | `GET /employees/search?department=<deptId>&team=<teamId>&role=<roleId>&job_level=<levelId>` | Returns only employees matching all specified filters simultaneously. |
| TC-SRCH-03 | Search by evaluation cycle and status | Employee A has evaluation in cycle C with status `APPROVED`; Employee B has status `DRAFT` in cycle C | `GET /employees/search?evaluation_cycle=<cycleId>&evaluation_status=APPROVED` | Returns only Employee A; Employee B is filtered out. |
| TC-SRCH-04 | Evaluation filter deduplication | Employee has multiple evaluations or evaluation items in cycle C | `GET /employees/search?evaluation_cycle=<cycleId>` | Returns employee exactly once with no duplicate records. |
| TC-SRCH-05 | Vietnamese diacritics matching (accented & unaccented) | Employee with full_name `Nguyễn Văn An` | 1. `GET /employees/search?q=Nguyen`<br>2. `GET /employees/search?q=Nguyễn`<br>3. `GET /employees/search?q=Nguyen Van An`<br>4. `GET /employees/search?q=nguyễn văn an` | All 4 queries successfully return `Nguyễn Văn An` via `pg_trgm` and `immutable_unaccent`. |
| TC-SRCH-06 | Fuzzy typo tolerance in name search | Employee with full_name `Nguyễn Văn An` | `GET /employees/search?q=Nguyem` (typo) | Returns `Nguyễn Văn An` matching above trigram similarity threshold. |
| TC-SRCH-07 | Pagination validation & page meta | 25 matching employee records | `GET /employees/search?page=2&size=10` | Returns items 11-20, with `meta.page = { current_page: 2, page_size: 10, total_items: 25, total_pages: 3 }`. |
| TC-SRCH-08 | Pagination size boundary limit | Authenticated actor | `GET /employees/search?size=200` (exceeds max 100) | Returns 400 Bad Request with validation error message. |
| TC-SRCH-09 | RBAC: Employee role scope | Authenticated as Employee E1 | `GET /employees/search?q=EMP-` | Returns only Employee E1's record; other employees are excluded. |
| TC-SRCH-10 | RBAC: Manager role scope | Authenticated as Manager M1 (manages Team T1 only) | `GET /employees/search` | Returns only employees belonging to Team T1. |
| TC-SRCH-11 | RBAC: Manager cannot bypass scope via filter | Authenticated as Manager M1 (manages Team T1) | `GET /employees/search?team=<teamId2>` (Team T2) | Returns empty list or 403; does not leak Team T2 employees. |
| TC-SRCH-12 | RBAC: Unauthenticated request | No JWT header provided | `GET /employees/search` | Returns 401 Unauthorized. |
| TC-KPI-01 | KPI Summary: Successful retrieval | Employee E1 has submitted evaluation in cycle C1 | `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}` with HR_ADMIN actor | Returns 200 with full evaluation summary, `overall_score`, `overall_weighted_score`, `official_score_field = "overall_weighted_score"`, and `kpi_items`. |
| TC-KPI-02 | KPI Summary: Persisted scores verification | Evaluation has persisted `self_score=4.0`, `final_score=4.5`, `weighted_score` per item | `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}` | Response returns persisted numbers exactly; scoring engine is NOT invoked on read. |
| TC-KPI-03 | KPI Summary: Explicit official_score_field | Valid evaluation retrieved | Inspect response payload | `official_score_field` equals `"overall_weighted_score"` and corresponds to `overall_weighted_score` property. |
| TC-KPI-04 | KPI Summary: Historical snapshot regression | Evaluation submitted in cycle C1. Later, admin updates criterion name and weight in live template | `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}` | Returns original snapshot `criterion_name_snapshot` and `weight_snapshot`; changes to live template do not alter response. |
| TC-KPI-05 | KPI Summary: Breakdown, measurement, evidence & rationale | Evaluation item has measurement, rationale, comment, and linked evidence | `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}` | Item includes `measurement_value`, `measurement_unit`, `rationale`, `comment`, `reviewer`, `relationship_snapshot`, and `evidences` array. |
| TC-KPI-06 | KPI Summary: RBAC - Employee self-access only | Authenticated as Employee E1 | 1. `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}`<br>2. `GET /employees/{E2}/kpi-summary?evaluation_cycle_id={C1}` | Request 1 returns 200; Request 2 returns 403 Forbidden. |
| TC-KPI-07 | KPI Summary: RBAC - Manager team-scope only | Authenticated as Manager M1 (manages E1, not E2) | 1. `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C1}`<br>2. `GET /employees/{E2}/kpi-summary?evaluation_cycle_id={C1}` | Request 1 returns 200; Request 2 returns 403 Forbidden. |
| TC-KPI-08 | KPI Summary: Employee or evaluation not found | Employee has no evaluation in cycle C2 | `GET /employees/{E1}/kpi-summary?evaluation_cycle_id={C2}` | Returns 404 Not Found. |
| TC-KPI-09 | KPI Summary: Invalid UUID parameter | Path or query parameter is not valid UUID | `GET /employees/invalid-uuid/kpi-summary?evaluation_cycle_id=abc` | Returns 400 Bad Request with validation details. |
| TC-UI-01 | Employee Search Page: Filters & Debounce | Search page mounted | Enter `q`, select Department, Team | Free-text `q` is debounced (300ms); query key reflects all filters; table displays matching employees. |
| TC-UI-02 | Employee Search Page: Reset Filters | Active filters entered | Click "Reset" button | All filters cleared, query refetched with default pagination. |
| TC-UI-03 | Employee Search Page: Empty & Error States | Search query returns 0 results or API fails | 1. Search non-matching term<br>2. Simulate API 500 error | 1. Shows "No employees found" with Reset action.<br>2. Shows error alert with API error message and Retry button. |
| TC-UI-04 | Employee Search Page: Navigation to KPI Summary | Search results displayed | Click "View KPI Summary" on an employee row | Navigates to `/admin/employees/{id}/kpi-summary?cycleId={cycleId}`. |
| TC-UI-05 | KPI Summary Page: Official score distinction | KPI summary loaded | Inspect rendered score cards | `overall_weighted_score` is prominently marked with "Official" badge driven by `official_score_field`; `overall_score` is marked "Reference only". |
| TC-UI-06 | KPI Summary Page: Detail drawer & Evidence links | KPI table loaded | Click "View details" / expand KPI row | Drawer opens displaying measurement value/unit, comment, rationale, reviewer, relationship snapshot, and clickable evidence links. |
| TC-UI-07 | Dark Mode verification | Toggle theme between light and dark mode | Inspect Search table, filter inputs, score cards, KPI table, and drawer | All elements apply dark theme tokens without unstyled light backgrounds or low-contrast text. |

## Inputs Reviewed
- Plan items and business requirements
- Test suite structure in backend/test and frontend components

## Actions and Evidence
- Defined 28 comprehensive test cases across Search, KPI Summary, and UI workflows.

## Changes Made
- Documented test cases.

## Decisions and Rationale
- Included specific Vietnamese diacritics examples (`Nguyễn`, `Nguyen`, `Nguyễn Văn An`, `Nguyen Van An`, and typos) as required by specifications.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement
