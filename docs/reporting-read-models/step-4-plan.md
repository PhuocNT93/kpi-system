# Step 4: Implementation Plan

Status: reconstructed

## Deliverable

1. **What:** Create Database Migrations for Read Models
   **Where:** `backend/migrations/<timestamp>_create_reporting_read_models.ts`
   **Why:** Define standard tables (`employee_evaluation_score_read_model`, `team_evaluation_aggregate_read_model`, `employee_kpi_score_read_model`, `team_kpi_aggregate_read_model`) to serve as projections. We will use standard tables rather than strict PostgreSQL Materialized Views because we need targeted incremental updates (sync) for editable evaluations without the heavy write-lock of full materialized view refreshes.
   **Tests:** Migration up/down checks.

2. **What:** Setup Reporting Module and Shared Event Emitter
   **Where:** `backend/src/modules/reports/`, `backend/src/shared/events/`
   **Why:** Create a new module boundary for reporting. Introduce a simple Node.js `EventEmitter` in `shared` so the Evaluation module can emit lifecycle events without introducing a circular dependency on the Reporting module.
   **Tests:** Unit tests for event emitter instantiation and listener registration.

3. **What:** Implement Reporting Projection Service
   **Where:** `backend/src/modules/reports/application/reporting-projection.service.ts`
   **Why:** Implements the core projection logic. Listens for events (`EVALUATION_SCORE_CALCULATED`, `EVALUATION_LOCKED`) and executes targeted upserts into the read model tables (incremental sync) or full batch refreshes (for locked cycles).
   **Tests:** Integration tests verifying idempotency, incremental vs. batch behavior, and handling of missing scores/disabled criteria.

4. **What:** Implement Reporting Repositories and Query Service
   **Where:** `backend/src/modules/reports/infrastructure/postgres-reports.repository.ts`, `reports-query.service.ts`
   **Why:** To query the pre-aggregated read models efficiently and apply server-side RBAC scopes.
   **Tests:** Query plan verification (EXPLAIN ANALYZE) and integration tests for accurate aggregation.

5. **What:** Implement Reporting APIs with Redis Caching
   **Where:** `backend/src/modules/reports/api/reports.router.ts`, `reports.controller.ts`
   **Why:** Expose `/reports/employees/:id`, `/reports/teams/:teamId`, and `/reports/organization` using standard API envelopes. Integrate Redis caching with 15-minute TTL and scoped cache keys.
   **Tests:** RBAC negative tests (403 for unauthorized scopes), API contract tests.

6. **What:** Add Frontend Reporting Feature Module
   **Where:** `frontend/src/features/reports/api/`, `frontend/src/features/reports/types/`, `frontend/src/features/reports/hooks/`
   **Why:** Implement typed API clients and TanStack Query hooks to fetch data from the new backend endpoints. Map snake_case to camelCase at the boundary.
   **Tests:** Type checking and linting for API contracts.

7. **What:** Update Dashboards UI
   **Where:** Employee, Team, and Organization Dashboard pages/components (within `frontend/src/features/reports/components/`)
   **Why:** Replace any existing OLTP data fetching with the new hooks. Implement Loading, Error, Empty, and Unauthorized UI states. Display the "Data as of: <timestamp>" freshness indicator. Ensure no relative ranking is shown.
   **Tests:** React component tests for loading states and data mapping.
