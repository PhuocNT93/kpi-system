# Step 4: Plan

Status: reconstructed from earlier approved steps

## Deliverable
### Implementation Plan
1. **Collector Service Caching Methods**:
   - `getMonthsBetween(fromDate?: string, toDate?: string): string[]`
   - `getMonthlySnapshots(sourceType: string, targetMember: string, yearMonths: string[])`
   - `saveMonthlySnapshot(...)`
2. **Collector Service Preview & Sync Incremental Logic**:
   - `previewBlueprintTeamAttendance`: Check DB for past months; if cached, fetch only current active month from Blueprint; merge and recalculate metrics.
   - `previewBlueprintTasks`: Check DB for past months; merge cached tasks with active month tasks; recalculate on-time metrics.
   - `previewBlueprint` (Individual Attendance): Check DB for given month; if past month, return cached snapshot.
   - `previewBlueprintVacation`: Check DB for given year; return cached summary if available.
   - Pass `forceRefresh` through `syncBlueprintTeamAttendance`, `syncBlueprintTasks`, `syncBlueprintAttendance`, `syncBlueprintVacation`, `syncAllBlueprint`.
3. **Controller & Router Integration**:
   - Extract `forceRefresh` in `collector.controller.ts`.
4. **Frontend Integration**:
   - Update `collector-api.ts` with `forceRefresh`.
   - Update `CollectorPage.tsx` with cache feedback banner and force-refresh option.

## Inputs Reviewed
- Implementation plan approved by user ("oke làm đi, nhưng ko commit", "làm đi").

## Actions and Evidence
- Verified API contracts and controller request/response formats.

## Decisions and Rationale
- Comply strictly with user's instruction not to commit to git.

## Risks / Blockers
- None.

## Next Step
- Step 5: Test Cases
