# Step 3: Impact Analysis

Status: reconstructed

## Deliverable

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Requires building the `reports` feature layer. Dashboard pages must switch to new APIs. New UI states for data freshness, loading, and error handling are required. |
| Backend | HIGH | Creating the `reports` module. Injecting reporting refresh triggers into the existing evaluation lifecycle (without circular dependencies). Integrating Redis caching. |
| Database | HIGH | Adding versioned migrations for new read-model tables / Materialized Views. Creating read-optimized indexes to support dashboard queries. |
| API | MEDIUM | Adding `/reports/employees/{id}`, `/reports/teams/{teamId}`, and `/reports/organization`. Preserving common API envelope format. |
| RBAC / Scope | HIGH | Crucial security boundary. Must enforce scopes server-side based on JWT and organizational hierarchy (Employee -> self, Manager -> managed teams, HR/Admin -> org). |
| Workflow | LOW | The core evaluation workflow remains the same, but state transitions (like becoming LOCKED) will now orchestrate batch read-model refreshes. |
| Audit | LOW | Read models are projections and don't produce domain audit events, but operational metrics and refresh failures must be logged. |
| Concurrency | MEDIUM | Incremental refreshes must handle concurrent evaluation item updates idempotently. Batch refreshes must use a transaction-safe strategy (e.g., build and atomic switch) to prevent partial data exposure. |
| Performance | HIGH | Positively impacts dashboard read latency by pre-aggregating data. Requires care to ensure incremental projection updates do not negatively impact `evaluation_item` write latency. |
| Historical Data | HIGH | Must guarantee that locked historical snapshots and scores are retained exactly as calculated, regardless of subsequent changes to criteria configurations. |

Potential Risks:
- **Write Latency Impact**: Blindly running `REFRESH MATERIALIZED VIEW` on every edit will cause severe database load. The implementation must use targeted projection updates (incremental) for editable states.
- **Circular Dependencies**: The Evaluation module cannot directly depend on the Reporting module. We must implement a minimal event observer or inversion of control pattern.
- **Partial Data Exposure**: A failed batch refresh on a locked cycle could wipe out the read model. We must ensure atomic swapping of data for locked states.

Required ADR / Clarification:
- None. The LLD already mandates these patterns.
