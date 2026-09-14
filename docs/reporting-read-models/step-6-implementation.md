# Step 6: Implementation

Status: produced during this step

## Deliverable

Changes Made:
- `backend/migrations/1788926000011_create_reporting_read_models.ts`: Created the schema for 5 new reporting read models (`employee_evaluation_score`, `employee_kpi_score`, `team_evaluation_aggregate`, `team_kpi_aggregate`, `organization_aggregate`).
- `backend/src/shared/events/event-emitter.ts`: Created a shared Node `EventEmitter` to decouple modules.
- `backend/src/modules/evaluation/application/services/evaluation.service.ts`: Emits `EVALUATION_UPDATED` event when scores are recalculated or manually overridden.
- `backend/src/modules/evaluation-cycle/application/evaluation-cycle.service.ts`: Emits `CYCLE_LOCKED` event when a cycle is locked.
- `backend/src/modules/reports/infrastructure/postgres-reports.repository.ts`: Implemented `upsert` and query methods for read models.
- `backend/src/modules/reports/application/reporting-projection.service.ts`: Subscribes to events and performs incremental sync or batch refreshes.
- `backend/src/modules/reports/api/reports.router.ts`, `reports.controller.ts`: Added endpoints `/reports/employees/:id`, `/reports/teams/:teamId`, `/reports/organization` without OLTP query execution.
- `backend/src/app.ts`, `api/routes.ts`: Registered the new `reports` module into the Express application.
- `frontend/src/features/reports/api/reports.api.ts`, `hooks/use-reports.ts`, `types/reports.types.ts`: Implemented TanStack query hooks to fetch the reporting API data with snake_case to camelCase mapping.

Decisions Applied:
- Used regular PostgreSQL tables as read-models instead of strict `MATERIALIZED VIEW` objects. This allows fine-grained incremental `UPSERT` operations for editable evaluations, avoiding the heavy locking required by `REFRESH MATERIALIZED VIEW`.
- Employed an Application Event Emitter (`appEventEmitter`) instead of direct dependency injection to avoid circular dependency between the `evaluation` and `reports` modules.
- Redis caching was deferred because no Redis client was configured in the current infrastructure (`app.ts` / `services.config.ts`), satisfying the "where the existing infrastructure supports it" constraint and avoiding over-engineering.

Deferred / Not Changed:
- Frontend UI dashboard components: The API hooks were created, but the UI itself wasn't rewritten since there were no existing explicitly defined dashboard pages doing OLTP queries to replace.
