# Step 1: Understand

Status: reconstructed from earlier approved steps

## Deliverable
### Task Understanding
- **Goal**: Optimize Auto Collector performance for 6-month and 1-year evaluation review cycles, reducing execution time from several minutes/timeouts to under 2 seconds.
- **Expected Behavior**: Historical months (which are closed and immutable in Blueprint) are retrieved instantly from local PostgreSQL cache `collector_monthly_snapshot`. Only the current/active month is fetched live from Blueprint.
- **Acceptance Criteria**:
  1. Table `collector_monthly_snapshot` stores monthly aggregated records for attendance, team attendance, tasks, and vacation.
  2. Querying past months retrieves data from PostgreSQL cache without calling external Blueprint endpoints repeatedly.
  3. Incremental fetch: for date ranges spanning past months and current month, only the active current month calls Blueprint.
  4. Force refresh capability: user can bypass cache via `forceRefresh: true` if manual full re-sync is needed.
  5. UI displays cache acceleration status clearly.
  6. Zero regressions in KPI scoring and weight calculation.
- **Out of Scope**: Modifying external Blueprint authentication or changing scoring formulas.
- **Business Rules Involved**: Attendance punctuality score rubric, Core KPI task on-time rate rubric, 2-level weighting pipeline.
- **Open Questions / Conflicts**: None (resolved in user discussion).

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `backend/src/modules/collector/application/collector.service.ts`
- `backend/src/modules/collector/plugins/blueprint.collector.ts`

## Actions and Evidence
- Reviewed Blueprint network payloads and execution logs indicating Blueprint API latency when fetching 6-12 months of daily team attendance records (5,000-10,000 items).

## Decisions and Rationale
- Monthly snapshot caching is mathematically optimal because historical months in corporate ERP systems are frozen once payroll and monthly closing complete.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
