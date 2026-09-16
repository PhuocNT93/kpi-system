# Step 3: Impact Analysis

Status: reconstructed from earlier approved steps

## Deliverable
### Impact Table
| Component | Subsystem | Impact Type | Details |
|---|---|---|---|
| Database | PostgreSQL | Schema Addition | Table `collector_monthly_snapshot` added via migration `1788926000016_create_collector_monthly_snapshot.ts`. |
| Domain | Collector Types | Type Extension | Added `CollectorMonthlySnapshot` interface. Added `forceRefresh?: boolean` to request payloads. |
| Application | Collector Service | Modification | Added `getMonthlySnapshots`, `saveMonthlySnapshot`, `getMonthsBetween`. Enhanced `preview` and `sync` methods to check cache and execute incremental Blueprint queries. |
| API | Collector Controller | Modification | Accepts `forceRefresh?: boolean` in preview and sync endpoints. |
| Frontend | Collector API | Modification | Extended request DTOs with `forceRefresh?: boolean`. |
| Frontend | Collector UI | Enhancement | Added cache visual indicator and bypass-cache control for users. |

## Inputs Reviewed
- `backend/src/modules/collector/domain/collector.types.ts`
- `backend/src/modules/collector/application/collector.service.ts`
- `backend/src/modules/collector/api/collector.controller.ts`
- `frontend/src/features/collector/pages/CollectorPage.tsx`

## Decisions and Rationale
- Non-breaking changes: existing API contracts remain backwards-compatible with default fallback to normal caching behavior.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
