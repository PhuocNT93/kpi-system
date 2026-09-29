# Step 9: Performance Review

Status: produced during this step

## Deliverable

## Performance Review

Findings:
- [None — improvement] Sub-tabs mount one table at a time. Org Structure's root view used to mount `DepartmentTable` and `EmployeeTable` together (and a department view `TeamTable` + `EmployeeTable`); the employee, org-role and job-level requests now start only when the Employees sub-tab is first opened. Measured (headless Chrome, `perf-checks.mjs`, HR_ADMIN): first open of Employees → `GET /api/employees`, `/api/org/roles`, `/api/org/job-levels` (+ CORS preflights); switching back to Departments, to Employees again, to Job Architecture, Job Roles and back to Org Structure → 0 API requests (TanStack Query `staleTime` 5 min in `app/query-client.ts`); first open of Job Levels → `GET /api/review-cadences` once.
- [None] Query keys and invalidation unchanged; no new queries. The only new client state is local UI state (sub-tab choice, create-dialog target, tooltip anchor, header trail).
- [None] Rendering: `useTableHeaderOffset` writes the header height straight to a CSS variable (no React re-render) and observes only the frame and its `thead`; the header trail uses separate value/setter contexts so hubs never re-render when the header changes; the hub tooltip state changes only while the pointer is on the ⓘ icon. Measured: 20 hover cycles on the ⓘ → 0 requests, no long tasks; scrolling the 23-row employee frame top to bottom frame by frame → 0 long tasks; one 53 ms long task observed across the whole tab-switching sequence (first mount of a table).
- [None] Layout cost: `contain: size` on scroll frames limits intrinsic-size work to the frame's 240px minimum; no layout thrash observed (no long tasks while scrolling).
- [Low — optional, not changed] The logo emblem PNG is 33 kB (`dist/assets/performant-emblem-*.png`) for a 40px display; a 2× (80px) export would be ~10 kB. Not changed without a measured need.
- [Info — pre-existing] Main JS chunk 1,556.69 kB (gzip 370.74 kB) triggers Vite's chunk-size warning, as before this task; no new dependencies were added.

Backend / database: no API, query, index, transaction or reporting change. The migration only inserts UI translation rows (idempotent upsert, reversible `down`).

## Inputs Reviewed

- `app/query-client.ts` (defaults: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 5 min`); organization and IAM hooks; the Step 6 and Step 8 changes.

## Actions and Evidence

- `perf-checks.mjs` (session scratchpad; Network domain request log + `PerformanceObserver('longtask')`), results as listed above.
- `npm --prefix frontend run build` → exit 0; asset sizes as listed.

## Changes Made

- None.

## Decisions and Rationale

- No optimisation applied: no measured issue; the emblem export size is noted as optional.

## Risks / Blockers

- None.

## Next Step

Step 10 — Final Verification.
