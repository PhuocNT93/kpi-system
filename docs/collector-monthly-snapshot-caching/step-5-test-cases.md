# Step 5: Test Cases

Status: reconstructed from earlier approved steps

## Deliverable
### Test Cases Matrix
| Test Case ID | Description | Input | Expected Result |
|---|---|---|---|
| TC-CACHE-01 | Month calculation helper | `fromDate='2026-03-14'`, `toDate='2026-09-14'` | Returns `['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']` |
| TC-CACHE-02 | Snapshot storage & retrieval | Save monthly snapshot for `TEAM_ATTENDANCE`, `2026-03`, `ALL` | DB contains snapshot with `is_locked = true`; retrieval returns matching data |
| TC-CACHE-03 | Preview team attendance with cached past months | 6-month date range with months 03-08 cached | Only month 09 is queried from Blueprint; combined records returned in < 2 seconds |
| TC-CACHE-04 | Force refresh bypasses cache | `forceRefresh: true` on 6-month date range | Queries all months from Blueprint and updates snapshots in DB |
| TC-CACHE-05 | Tasks caching & score integrity | Preview tasks for `kyluong` across 6 months | Tasks aggregated from cache + active month; `onTimeRate`, `score10`, `grade` calculated accurately |
| TC-CACHE-06 | TypeScript typecheck & linter | `npm run typecheck` & `npm run lint` | 0 errors across backend and frontend |
| TC-CACHE-07 | Unit & Integration tests | `npm run test` | All tests pass |

## Inputs Reviewed
- `implementation_plan.md`
- Core KPI calculation rubrics

## Decisions and Rationale
- Ensure testing covers both cold-cache (first run) and warm-cache (subsequent runs) scenarios.

## Next Step
- Step 6: Implementation
