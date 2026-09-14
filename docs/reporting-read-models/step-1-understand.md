# Step 1: Task Understanding

Status: reconstructed

## Deliverable

Goal: Implement a dedicated Reporting read-model layer (Materialized Views and Projections) for the Employee Performance Evaluation System to isolate dashboard read performance from transactional OLTP tables.

Expected Behavior:
- Frontend dashboards for Employee, Team, and Organization levels will query dedicated Reporting APIs instead of transactional tables.
- Reporting APIs will fetch from optimized read-models or materialized views that store pre-aggregated data (including overall scores, KPI-level scores, and completion rates).
- A hybrid refresh strategy will update the read models: incremental/synchronous updates for editable evaluations, and atomic batch refreshes for locked cycles.
- Reporting APIs will return data freshness metadata ("Data as of <timestamp>") which the frontend will display.
- Redis caching will be used for report queries with a 15-minute TTL.

Acceptance Criteria:
1. Dedicated employee score, team aggregate, KPI-level employee, and KPI-level team aggregate read models are created.
2. Read models return `completion_rate`, `kpi_score`, and `kpi_weighted_score` without runtime OLTP aggregation.
3. Historical snapshot values are preserved; the read model acts only as a projection and does not recalculate scores.
4. Refresh strategy correctly implements incremental (for editable) and batch (for locked) updates, is idempotent, and safe from partial-data exposure.
5. Reporting APIs are strictly isolated to query only the dedicated read models.
6. Strict RBAC and data scoping (Employee -> Self, Manager -> Managed Teams, HR -> Org) are enforced server-side.
7. Redis caching with scoped cache keys is implemented.
8. Frontend dashboards are updated to use the Reporting APIs, display data freshness, and handle loading/empty/error states gracefully.
9. No ranking or relative employee comparison features are exposed.
10. Unit, integration, performance, and RBAC tests pass, and PostgreSQL query plans are verified.

Out of Scope:
- Replacing the existing OLTP model or the primary scoring engine.
- Re-implementing score calculation or rule engine logic within the Reporting module.
- Complex data streaming infrastructure (Kafka, CDC) or separate reporting microservices.
- Employee ranking, relative positioning, or percentile reporting.

Business Rules Involved:
- **Scoring Source of Truth**: `evaluation` and `evaluation_item` tables hold the definitive scoring snapshots and must not be recalculated by the reporting layer.
- **Evaluation Lifecycle**: Refresh strategies depend on the evaluation status (Editable = Sync/Incremental; Locked = Batch/Immutable).
- **Atomic Refresh**: Locked-cycle batch refreshes must never expose partially built projection data.
- **Authorization**: Strict scope restrictions must be applied at the backend (never trusting client-supplied scopes).

Open Questions / Conflicts:
- None at this stage.
