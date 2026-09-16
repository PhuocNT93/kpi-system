# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

## Test Cases

| ID | Type | Description | Expected Result |
|---|---|---|---|
| **TC-01** | Integration (Backend) | `GET /employees/search` with free-text `q` containing Vietnamese diacritics (e.g., "Nguyễn Văn A" and unaccented "nguyen van a"). | Returns matching employee records using `pg_trgm` and `immutable_unaccent()` matching. |
| **TC-02** | Integration (Backend) | `GET /employees/search` with structured filters: `department`, `team`, `role`, `job_level`, `manager`, `evaluation_cycle`, and `evaluation_status`. | Filters are combined with AND logic and return only records satisfying all criteria. |
| **TC-03** | Integration (Backend) | `GET /employees/search` pagination and validation (`page`, `size` / `page_size`, sort). | Returns paginated response with `meta.pagination` (`total`, `page`, `pageSize`, `totalPages`); invalid sort or negative page returns 400. |
| **TC-04** | Security / RBAC (Backend) | `GET /employees/search` by EMPLOYEE actor. | Scoped server-side to return self only; cannot see other employees regardless of query filters. |
| **TC-05** | Security / RBAC (Backend) | `GET /employees/search` by MANAGER actor. | Scoped server-side to return only employees belonging to the manager's assigned/managed team. |
| **TC-06** | Security / RBAC (Backend) | `GET /employees/search` by HR_ADMIN and SYSTEM_ADMIN actors. | Returns employees across the permitted organization scope. |
| **TC-07** | Integration (Backend) | `GET /reports/employees/:employeeId/kpi-summary` for published/locked evaluation via Reporting read-models. | Returns 200 with standard envelope containing `employee`, `evaluation`, `score_summary`, `kpis`, and `relationships`. |
| **TC-08** | Contract / Score (Backend) | `score_summary` score semantics validation. | Clearly exposes `official_score`, `official_score_label`, `overall_score`, `overall_weighted_score`, `kpi_count`, and `completed_count`; preserves calibrated final score when present. |
| **TC-09** | Contract / KPI Table (Backend) | KPI table ordering and snapshot data. | Returns `kpis` ordered strictly by template/evaluation snapshot `display_order ASC`, including weights, measurements, raw/weighted scores, and evidence count. |
| **TC-10** | Security / RBAC (Backend) | `GET /reports/employees/:employeeId/kpi-summary` with cross-scope unauthorized actor (EMPLOYEE requesting peer, MANAGER requesting employee outside managed team). | Returns 403 Forbidden without leaking whether the target employee exists. |
| **TC-11** | Integration (Backend) | `GET /reports/employees/:employeeId/kpi-summary/:evaluationItemId` detail drill-down endpoint. | Returns 200 with criteria metadata, measurement (value, unit, source), scoring breakdown, snapshot level definitions, and evidence items. |
| **TC-12** | Immutability / Regression (Backend) | Historical snapshot preservation when master criteria/template configuration changes in Configuration module. | Reporting dashboard and detail endpoints continue to return original evaluation snapshot data (weights, definitions, display order). |
| **TC-13** | Integration (Backend) | `relationships` graph generation in KPI summary payload. | Returns stable entity tuples `{ source_id, target_id, relationship_type }` representing Employee, Team, Department, Manager, Cycle, Evaluation, and KPIs. |
| **TC-14** | Database (Backend) | Database migration `add_kpi_summary_dashboard_read_model_fields` up and down. | Adds `evaluation_item_id`, `display_order`, and `measurement` to `employee_kpi_score_read_model`; rollback cleanly drops columns. |
| **TC-15** | Unit (Frontend) | API client and TanStack Query hooks for KPI summary and detail drill-down. | Maps wire `snake_case` models to camelCase, handles query caching, and provides structured keys. |
| **TC-16** | Component (Frontend) | `EmployeeSearchBar` input debouncing, filter dropdowns, and pagination controls. | Debounces text input (300ms), triggers TanStack Query with updated filters, and clears filters cleanly. |
| **TC-17** | Component (Frontend) | `ScoreSummaryCard` visual hierarchy and score distinction. | Renders `Official Score` with primary visual prominence and explicit label; visually distinguishes `Overall Score`, `Overall Weighted Score`, and counts; zero client-side score computation or averaging. |
| **TC-18** | Component (Frontend) | `KpiSummaryTable` rendering and row interaction. | Renders table ordered by snapshot `display_order ASC`; displays disabled KPI state; clicking row triggers drill-down drawer. |
| **TC-19** | Component (Frontend) | `KpiDetailPanel` snapshot display and read-only behavior. | Displays snapshot level definitions, measurements, scoring, and evidence files/links; strictly read-only for locked/published evaluations. |
| **TC-20** | Component (Frontend) | `KpiRelationshipDiagram` visualization and accessible fallback. | Renders relationship DAG from backend relationship data; provides accessible tabular/list toggle for screen-reader and keyboard accessibility. |
| **TC-21** | Component (Frontend) | Dashboard UI states: Loading Skeleton, Empty, Error, and 403 Permission. | Renders skeleton loaders during fetch; renders friendly empty states when no employee or evaluation exists; displays safe error message with `meta.request_id`; renders permission banner on 403. |
| **TC-22** | Integration (Frontend) | Role-based dashboard navigation and employee selection restrictions. | EMPLOYEE role locks selection to self; MANAGER role allows searching/selecting managed team members only; HR/ADMIN can search all organization members. |
| **TC-23** | Regression (Full Stack) | Full existing test suites execution across backend and frontend. | All 381 backend tests and 80 frontend tests pass with zero regressions; `tsc --noEmit` and `eslint` pass cleanly. |

## Inputs Reviewed
- Steps 1–4 deliverables.
- Acceptance criteria and edge cases.

## Actions and Evidence
- Defined 23 comprehensive test cases covering unit, integration, RBAC, immutability, UX components, and regression.

## Changes Made
- None (test case definitions only).

## Decisions and Rationale
- Ensured both automated assertions and UX states are thoroughly represented before coding.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement
