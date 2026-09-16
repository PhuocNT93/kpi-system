# Step 1: Understand

Status: reconstructed

## Deliverable

## Task Understanding

### Goal
Implement an end-to-end **KPI Summary Dashboard** within the Employee Performance Evaluation Management System, allowing authorized users (EMPLOYEE, MANAGER, HR_ADMIN, SYSTEM_ADMIN) to search/select an employee within their permitted scope and view a comprehensive, immutable evaluation summary. This includes employee metadata, authoritative score summary cards, an ordered KPI table, a snapshot-based KPI drill-down panel, a relationship diagram, and robust loading/error/permission states, built on top of the **Reporting module read-model architecture** on the backend and modern React/TanStack Query on the frontend.

### Expected Behavior
1. **Employee Search & Scope Filtering (`GET /employees/search`)**:
   - Free-text `q` with Vietnamese diacritics and fuzzy matching via `pg_trgm`.
   - Structured filters: department, team, role, job_level, manager, evaluation_cycle, evaluation_status.
   - Strict RBAC scoping (EMPLOYEE self only; MANAGER team only; HR_ADMIN/SYSTEM_ADMIN organization).
2. **KPI Summary Reporting API (`GET /reports/employees/:employee_id/kpi-summary`)**:
   - Built inside the **Reporting module** reading from read-model projections.
   - Structured payload: employee, evaluation, score_summary (official_score, official_score_label, overall_score, overall_weighted_score, kpi_count, completed_count), kpis, relationships.
3. **KPI Detail Drill-Down API (`GET /reports/employees/:employee_id/kpi-summary/:evaluation_item_id`)**:
   - Criteria metadata, measurement, scoring breakdown, snapshot level definitions, evidence items.
4. **Frontend Dashboard (`features/reports/employee-kpi-summary/`)**:
   - Unified dashboard with search/filters, employee card, score cards (prominent Official Score), KPI table ordered by snapshot `display_order ASC`, drill-down drawer, relationship diagram with accessible alternative, and comprehensive state handling (Skeleton, Empty, Error, 403 Forbidden, Read-only).

### Acceptance Criteria
1. Scope-Enforced Employee Search.
2. Reporting Module KPI Summary Endpoint with read-models.
3. Authoritative Score Semantics (official_score distinct from average, zero client calculation).
4. Snapshot Immutability & Detail Drill-Down with snapshot level definitions.
5. Relationship Graph Contract & Visualization with accessible alternative.
6. Complete Frontend Dashboard UX with TanStack Query.
7. Automated Verification & Regression (0 regressions, passes typecheck and lint).

### Out of Scope
- Client-side calculation or recalculation of scores, weights, or averages.
- Mutating KPI items or evaluations directly from this reporting dashboard.
- Modifying historical snapshot definitions.
- Ad-hoc un-audited exports.

### Business Rules Involved
- BR-REP-01 (Source of Truth): Backend is sole source of truth for scores.
- BR-REP-02 (Read-Model Decoupling): Reporting queries read from reporting projections/materialized views.
- BR-REP-03 (Snapshot Integrity): Evaluated criteria, weights, and levels are captured at snapshot time and immutable.
- BR-REP-04 (Server-Side Authorization): RBAC is strictly enforced in application services; cross-scope requests return 403 without metadata leakage.
- BR-REP-05 (Read-Only State): Published or locked evaluations are immutable.

### Open Questions / Conflicts
- None.

## Inputs Reviewed
- USER_REQUEST
- docs/LLD_Employee_Performance_Evaluation_System.md
- docs/BACKEND_NODE_RULES.md
- docs/FRONTEND_REACT_RULES.md
- docs/AI_AGENT_WORKFLOW.md

## Actions and Evidence
- Analyzed all functional and non-functional requirements from the prompt and architecture guidelines.
- Outlined 7 core acceptance criteria and 5 domain business rules.

## Changes Made
- None (documentation only).

## Decisions and Rationale
- Confirmed placement of KPI summary and detail APIs within the Reporting module using read-models.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
