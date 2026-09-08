# Step 5: Define Test Cases
Status: reconstructed

## Deliverable
| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Partial mode, all valid | 100 rows, 100 valid, mode=partial | Confirm Import | 100 imported, 0 errors, status COMPLETED |
| TC02 | Partial mode, mixed rows | 100 rows, 95 valid, 5 invalid, mode=partial | Confirm Import | 95 imported, 5 skipped, status COMPLETED |
| TC03 | Strict mode, mixed rows | 100 rows, 95 valid, 5 invalid, mode=strict | Confirm Import | 0 imported, 5 validation errors kept, status FAILED/rejected |
| TC04 | Strict mode processing failure | 100 valid rows, row 51 fails | Confirm Import (strict) | 0 rows imported, full transaction rollback, status FAILED |
| TC05 | Partial mode processing failure | 100 valid rows, row 51 fails | Confirm Import (partial) | 99 imported, row 51 SKIPPED, status PARTIALLY_COMPLETED |
| TC06 | Large file asynchronous batching | 5,000 valid rows | Confirm Import | HTTP 202 Accepted. Polling shows IMPORTING -> COMPLETED. |
| TC07 | KPI Score source-of-truth | CSV has `measurement_value = 80` | Process row | Rule Engine calculates criterion score. Scoring Engine recalculates KPI score. |
| TC08 | Unsupported column `kpi_score` | CSV contains `kpi_score = 100` | Process row | Ignored/validation error. KPI score recalculated normally. |
| TC09 | Multiple rows affect same KPI | Employee C1 and C2 map to KPI_A | Process batch | KPI_A is recalculated exactly once per employee per batch. |
| TC10 | Worker retry idempotency | Worker processes batch 1, crashes, job re-run | Re-run Worker | Rows marked `IMPORTED` skipped safely. |
| TC11 | RBAC enforcement | Actor is MANAGER or EMPLOYEE | POST /imports/:id/confirm | 403 Forbidden |
| TC12 | Frontend strict confirmation | Select strict mode | Click Confirm | Warning dialog appears. |
| TC13 | Frontend polling cleanup | Job is IMPORTING | Unmounts | Polling stops immediately. |
| TC14 | Frontend terminal status display | Job reaches PARTIALLY_COMPLETED | Status updates | UI stops polling, shows counts cleanly. |
