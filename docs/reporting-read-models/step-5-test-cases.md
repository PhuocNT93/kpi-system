# Step 5: Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Incremental Sync (Editable) | An OPEN evaluation exists. | An evaluation score is updated and saved. | The `employee_evaluation_score_read_model` is incrementally updated; the `/reports/employees/:id` API immediately reflects the new score. |
| TC02 | Batch Refresh (Locked) | A cycle is transitioned to LOCKED. | The batch refresh is triggered. | All reporting projections for the cycle are atomically fully rebuilt. Team/Org APIs return accurate final completion rates and averages. |
| TC03 | RBAC: Employee Scope | User logged in as Employee A. | Employee A requests `/reports/employees/{Employee_B}`. | HTTP 403 Forbidden. |
| TC04 | RBAC: Manager Scope | User logged in as Manager A. | Manager A requests `/reports/teams/{Unmanaged_Team_Id}`. | HTTP 403 Forbidden. |
| TC05 | RBAC: HR Scope | User logged in as HR Admin. | HR Admin requests `/reports/organization`. | HTTP 200 OK with correct organization aggregates. |
| TC06 | Historical Snapshot Regression | A LOCKED cycle exists with populated read models. | The weights in the active KPI template are modified. | The historical read models remain unchanged (retaining their snapshot scores). |
| TC07 | Refresh Idempotency | An evaluation is in MANAGER_REVIEW. | `refreshEvaluation(id)` is called twice concurrently. | The read model does not contain duplicate records and reflects the exact source of truth. |
| TC08 | Redis Caching & Invalidation | Read models are up to date. | Call Team Report API twice. Update an evaluation in the team. Call API again. | Second call hits Redis. Update invalidates the cache key. Third call hits the DB and sets a new cache entry. |
| TC09 | Query Plan Isolation | Read models are fully populated. | Execute Team and Org Report API queries. | `EXPLAIN ANALYZE` shows NO access to `evaluation_item` or `measurement` tables. Queries only scan the read models. |
| TC10 | Frontend States | Network is artificially delayed. | User navigates to Employee Dashboard. | The UI displays the loading skeleton, then renders the data along with the "Data as of: <timestamp>" freshness indicator. |
