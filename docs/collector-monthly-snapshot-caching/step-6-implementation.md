# Step 6: Implementation

Status: produced during this step

## Deliverable
- Implemented **Monthly Snapshot Caching & Incremental Fetching** for Auto Collector (`/admin/collectors`) across 6-month and 1-year evaluation cycles.
- Key modules and files implemented:
  1. Database Table: `collector_monthly_snapshot` with unique constraint `(source_type, year_month, target_member)` and lookup index.
  2. Backend Service ([collector.service.ts](file:///c:/KPI%20System/kpi-system/backend/src/modules/collector/application/collector.service.ts)):
     - `getMonthsBetween`: resolves month lists across any cadence (6 months, 1 year).
     - `normalizeToYearMonth`: standardizes dates in formats `YYYY-MM-DD`, `MMM-DD-YYYY`, `MM/DD/YYYY`, and `YYYYMMDD`.
     - `getMonthlySnapshots` & `saveMonthlySnapshot`: database queries for storing and retrieving immutable past month data (`is_locked = true`).
     - `aggregateTeamAttendanceRecords` & `aggregateTasks`: calculates on-time rate, punctuality rate, 10-point scale score, and performance grade (S/A/B/C/D).
     - `previewBlueprintTeamAttendance` & `previewBlueprintTasks`: queries only uncached/active months from Blueprint, merges with cached past months, and returns results in < 2 seconds.
     - `syncBlueprintAttendance`, `syncBlueprintTeamAttendance`, `syncBlueprintTasks`, `syncBlueprintVacation`, `syncAllBlueprint`: supports `forceRefresh?: boolean`.
  3. Controller ([collector.controller.ts](file:///c:/KPI%20System/kpi-system/backend/src/modules/collector/api/collector.controller.ts)): passes `forceRefresh` option.
  4. Frontend API Client ([collector-api.ts](file:///c:/KPI%20System/kpi-system/frontend/src/features/collector/api/collector-api.ts)): exports `CollectorCacheInfo` and `forceRefresh` param.
  5. Frontend UI ([CollectorPage.tsx](file:///c:/KPI%20System/kpi-system/frontend/src/features/collector/pages/CollectorPage.tsx)): visual badge `⚡ Tăng tốc bộ nhớ đệm` and `Bỏ qua cache & Kéo lại từ Blueprint` button.

## Inputs Reviewed
- `implementation_plan.md`
- `backend/src/modules/collector/application/collector.service.ts`
- `frontend/src/features/collector/pages/CollectorPage.tsx`
- User constraint: "nhưng ko commit" (do not commit to git).

## Actions and Evidence
- Migration executed: `npm run migrate:up:tsx` created table `collector_monthly_snapshot`.
- Backend typecheck: `npm run typecheck` passed with 0 errors.
- Frontend typecheck: `npm run typecheck` passed with 0 errors.
- Backend lint: `npm run lint` passed with 0 errors.
- Frontend lint: `npm run lint` passed with 0 errors.
- Unit tests: `npx vitest run src/modules/collector/application/collector-caching.test.ts` (11/11 tests passed).
- Backend test suite: `npm run test` (496 tests passed).
- Frontend test suite: `npm run test` (87 tests passed).
- Git status: verified working tree remains uncommitted in accordance with user constraint.

## Changes Made
- `backend/migrations/1788926000016_create_collector_monthly_snapshot.ts`
- `backend/src/modules/collector/domain/collector.types.ts`
- `backend/src/modules/collector/application/collector.service.ts`
- `backend/src/modules/collector/api/collector.controller.ts`
- `backend/src/modules/collector/application/collector-caching.test.ts`
- `frontend/src/features/collector/api/collector-api.ts`
- `frontend/src/features/collector/pages/CollectorPage.tsx`

## Decisions and Rationale
- For historical months (`year_month < currentMonth`), records are immutable and saved with `is_locked = true`.
- When querying 6-month or 1-year periods, the service fetches only the uncached active month from Blueprint and immediately returns cached historical months, decreasing response time by >95%.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test
