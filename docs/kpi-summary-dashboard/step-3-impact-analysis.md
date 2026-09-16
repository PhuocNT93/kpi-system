# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | New comprehensive KPI Summary Dashboard feature under `features/reports/employee-kpi-summary/` (Search + Filters, Employee Info Card, Score Summary Card, KPI Table, KPI Detail Drill-down Panel, Relationship Diagram with accessible fallback, Skeleton Loading, Empty, Error, 403 Permission, and Read-only states). Routed in `App.tsx` and linked in `Sidebar.tsx`. |
| Backend | MEDIUM | Implementing `GET /reports/employees/:employeeId/kpi-summary` and `GET /reports/employees/:employeeId/kpi-summary/:evaluationItemId` in the Reporting module (`reports.router.ts`, `reports.controller.ts`, `reports-query.service.ts`, `postgres-reports.repository.ts`) with strict server-side RBAC scoping. |
| Database | LOW / MEDIUM | Migration to add `evaluation_item_id`, `display_order`, and `measurement` columns to `employee_kpi_score_read_model` (with reversible `down`), allowing reporting read-models to satisfy the full dashboard contract without querying OLTP evaluation tables. |
| API | MEDIUM | New reporting endpoints following standard response envelopes (`sendSuccess`, `sendFailure`). Wire snake_case mapped to camelCase on frontend boundary. Existing `GET /employees/search` remains backwards compatible. |
| RBAC / Scope | HIGH | Strict server-side enforcement in `reports-query.service.ts`: EMPLOYEE (self only), MANAGER (managed team only), HR_ADMIN / SYSTEM_ADMIN (organization scope). Cross-scope requests return 403 without leaking employee existence. |
| Workflow | LOW | Read-only dashboard; does not alter evaluation state machines or trigger workflow transitions. Respects published/locked states. |
| Audit | LOW | Read-only operations. Unauthorized access attempts log safe errors without leaking PII. |
| Concurrency | NONE | Read-only queries against PostgreSQL read-models. |
| Performance | LOW | Reads hit indexed read-model tables (`employee_evaluation_score_read_model`, `employee_kpi_score_read_model`). Debounced search (300ms) on frontend avoids redundant network requests. |
| Historical Data | HIGH | Historical evaluation items must use their snapshot definitions, snapshot weights, and snapshot levels. Changes to live templates/criteria in the Configuration module do not mutate historical data. |

### Potential Risks
1. Read-Model Staleness or Missing Rows: Ensure projection service properly populates `display_order`, `evaluation_item_id`, and `measurement`.
2. Score Ambiguity & Recalculation Drift: Backend provides explicit `official_score`, `official_score_label`, `overall_score`, and `overall_weighted_score`. Frontend performs zero client-side calculation.
3. PII and Data Leakage via Relationship Graph: Relationship graph generation is strictly scoped to the employee's permitted organizational path.
4. Accessibility in Graph Visualization: Accessible tabular/list fallback toggle provided for relationship data.

### Required ADR / Clarification
- None.

## Inputs Reviewed
- Step 1 & Step 2 deliverables.
- LLD Section 4, RBAC policies, database migrations.

## Actions and Evidence
- Evaluated risk and impact across all 10 architectural domains.
- Validated that read-model extension complies with LLD decoupling rules.

## Changes Made
- None (analysis only).

## Decisions and Rationale
- Proceed with migration to enrich `employee_kpi_score_read_model` with `evaluation_item_id`, `display_order`, and `measurement`.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
