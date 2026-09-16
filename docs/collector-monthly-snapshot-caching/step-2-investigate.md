# Step 2: Investigate

Status: reconstructed from earlier approved steps

## Deliverable
- Architecture investigation into `backend/src/modules/collector/application/collector.service.ts`, `backend/src/modules/collector/plugins/blueprint.collector.ts`, and `frontend/src/features/collector/pages/CollectorPage.tsx`.
- Identified that `fetchTeamAttendance` queries `searchAttendanceTime` with `fmDt` and `toDt`. For 6 months (`03/14/2026` to `09/14/2026`), Blueprint returns up to 10,000 records, which takes 30-60 seconds.
- Identified that `fetchTasks` performs multi-role queries (`requester` and `assignee`) on `searchRequirement`.
- Verified PostgreSQL schema has table `collector_monthly_snapshot` with unique constraint `(source_type, year_month, target_member)`.

## Inputs Reviewed
- `backend/src/modules/collector/application/collector.service.ts`
- `backend/src/modules/collector/plugins/blueprint.collector.ts`
- `backend/migrations/1788926000016_create_collector_monthly_snapshot.ts`

## Actions and Evidence
- Ran PostgreSQL query confirming `collector_monthly_snapshot` schema columns: `id`, `source_type`, `year_month`, `target_member`, `team_id`, `data_json`, `score10`, `total_records`, `is_locked`, `created_at`, `updated_at`.

## Decisions and Rationale
- Partitioning data by `year_month` (`YYYY-MM`) aligns with corporate review and monthly attendance cycles.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
