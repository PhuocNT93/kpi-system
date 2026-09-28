# Step 9: Performance Review

Status: produced during this step

## Deliverable

## Performance Review

Findings:
- Request volume (improved by this task): Entity ID is now applied only on Search/Enter. Measured in headless Chrome (HR_ADMIN, hub Audit tab): typing a 36-character UUID issued 0 `GET /api/audit-logs` requests; pressing Enter issued exactly 1 (`?page=1&limit=20&entityId=…`). Before this task every keystroke changed the query key (`auditKeys.list(filters)` included the typed value), i.e. up to one request per character, most of them rejected with 400 by `z.string().uuid()`.
- Query keys: `auditKeys.list({ page, limit, entityType, action, entityId })` contains every applied filter; the draft `entityIdInput` is intentionally not part of the key or the request. `placeholderData: keepPreviousData` is unchanged. No mutations exist in this feature, so no invalidation concerns.
- Pagination: unchanged, server-side (`limit` 20 from the UI, max 100 enforced by `AuditLogQuerySchema`).
- Filtering / indexes: `audit_log` has indexes on `(entity_type, entity_id)` and `performed_at` (`1724500000001_init_database_schema.ts:462-463`). The `action` filter has no dedicated index; pre-existing and unchanged by this task — no action without production evidence.
- Renders: row hover state lives in `AuditTable`, so entering/leaving a row re-renders the table body (≤ 20 rows per page by default, ≤ 100 max). Negligible at this size; no optimization introduced.
- Layout measurement: the ResizeObserver only calls `setScrollbarWidth` with the measured width; React skips re-rendering when the value is unchanged. Observer is disconnected on unmount.
- Payload size / N+1 / transaction length / blocking work: no backend or API change. The new migration performs 20 idempotent upserts into `i18n_translation` (round-trip verified in Step 7).
- Duplicate processing: Search with unchanged filters calls `refetch()` once instead of changing state, so it does not double-fetch.

Actions Taken:
- None. No optimization introduced beyond the Search-on-submit behaviour already approved in Step 6.

## Inputs Reviewed

- `frontend/src/features/audit/api/audit-keys.ts`, `hooks/useAuditLogs.ts`
- `frontend/src/features/audit/pages/AuditLogPage.tsx`, `components/AuditTable.tsx`
- `backend/src/modules/audit/domain/audit.domain.ts` (`AuditLogQuerySchema`)
- `backend/migrations/1724500000001_init_database_schema.ts` (audit_log indexes)

## Actions and Evidence

- Headless Chrome via CDP with `Network.enable`, script `count-requests.mjs` (session scratchpad): result `{"typedChars":36,"requestsWhileTyping":0,"requestsOnEnter":1,"lastUrl":"http://localhost:8080/api/audit-logs?page=1&limit=20&entityId=6a7281ce-8611-4300-9d7c-000000000000"}`.
- Grep of migrations for `audit_log` indexes: two indexes found as listed above.

## Changes Made

- None.

## Decisions and Rationale

- No index or memoization added: no evidence of a bottleneck, per the workflow rule against optimization without evidence.

## Risks / Blockers

- None.

## Next Step

Step 10 — Final Verification (includes rewriting step artifacts 0–6 to the mandated structure, as noted in Step 8).
