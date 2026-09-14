# Step 2: Investigation

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Reporting constraints and architecture rules)
- `docs/BACKEND_NODE_RULES.md` (Node.js API standards)
- `docs/FRONTEND_REACT_RULES.md` (React/TanStack Query patterns)

Relevant Modules and Files:
- `backend/migrations/`: Where new read-model and materialized view definitions must be added.
- `backend/src/modules/evaluation/domain/evaluation.types.ts`: Source of truth for `Evaluation` and `EvaluationItem` schemas.
- `backend/src/modules/evaluation/`: Existing scoring and lifecycle logic, which needs to trigger read-model refreshes without causing circular dependencies.
- `backend/src/modules/reports/`: (To be created) Will contain the `ReportingProjectionService`, controllers, and API routes.
- `frontend/src/features/reports/`: (To be created) Will contain React pages, TanStack Query hooks, and the API client for dashboards.
- `backend/src/shared/`: Shared infrastructure like auth and database clients.

Existing Implementation:
- `evaluation` and `evaluation_item` serve as the OLTP source of truth. They contain historical snapshots and scoring data (`kpi_score`, `kpi_weighted_score`, `final_score`).
- There is currently no event bus in `shared/`, meaning we will need a minimal application-level event mechanism (or direct injection of a refresh handler interface) from the Evaluation module to the Reporting module to trigger incremental updates.
- No `reports` module exists yet, meaning the dashboard API is a net-new addition.

Existing Tests:
- There are unit and integration test patterns in existing modules (e.g., `csv-import.service.test.ts`) that we must mimic for the `reports` application services and controllers.

Patterns to Reuse:
- Modular monolith structure: `api/` (controllers/routes), `application/` (services), `infrastructure/` (repositories/Redis caching), and `domain/` (interfaces/DTOs).
- API envelope: `{ success, message, data, meta }`.
- Redis caching layer: Standard TTL of 15 minutes, utilizing deterministic cache keys based on RBAC scopes (`report:employee:{id}:{cycle}`, `report:team:{id}:{cycle}`).
- Frontend data fetching: TanStack Query with loading/error states.
