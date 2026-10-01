# Step 2: Investigate

Status: reconstructed from the approved Step 2 response

## Deliverable

## Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`: Crawl Job domain, cycle rules, review/apply, security and audit.
- `docs/FRONTEND_REACT_RULES.md`: React structure, API/query conventions, authorization UX and tests.
- `docs/BACKEND_NODE_RULES.md`: Express modules, Zod validation, transactions, audit, migrations and tests.

Relevant Modules and Files:
- `frontend/src/App.tsx`, `frontend/src/shared/layout/Sidebar.tsx`: protected routes/navigation.
- `frontend/src/features/imports/pages/DataIngestionHubPage.tsx`: URL-backed tabs and ingestion patterns.
- `frontend/src/features/evaluation-cycles/api/cycle-api.ts`, `frontend/src/features/templates/api/template-api.ts`: cycle and criterion selectors.
- `backend/src/app.ts`, `backend/src/api/routes.ts`: module and route registration.
- `backend/src/modules/collector`: legacy direct-run collector and scheduler.
- `backend/src/modules/evaluation-data-import`: current staging/review/apply API.
- `backend/src/modules/audit/application/audit-transaction.ts`: atomic business-write/audit pattern.
- `backend/src/modules/evaluation-cycle`, `backend/src/modules/configuration`: existing cycle/criterion services.
- `backend/migrations/1788926000011_create_collector_tables.ts`, `backend/migrations/1788926000013_add_kpi_import_comment_evidence.ts`: current schema.

Existing Implementation:
- No Crawl Job domain, execution entity, cycle-job mapping or crawl API/migration exists.
- Legacy `collector_job` supports one criterion and optional cycle. `node-cron` invokes work directly; logs lack snapshots and retry history.
- Import APIs support staging, preview, conflict resolution and Apply, but have no crawl execution link or required crawl review lifecycle.
- Live import schema uses `evaluation_data_import_record`, while LLD describes `evaluation_data_import_row`; migration compatibility must be considered.
- Backend uses modular factories/routers, Zod, node-pg-migrate, Vitest and Supertest.
- `withAuditedTransaction` supports atomic audit records.
- No BullMQ, broker, worker, `isolated-vm`, sandbox, SSRF allowlist, or connector credential-reference subsystem was found.
- Current collector/import permissions differ from the required configuration and manager-scope rules.

Existing Tests:
- `frontend/src/features/imports/pages/EvaluationDataImportPage.test.tsx`: stage, preview and apply UI.
- `frontend/src/features/imports/pages/ImportUploadPage.test.tsx`: CSV upload UI.
- `backend/src/modules/evaluation-data-import/application/evaluation-data-import.service.test.ts`: import service.
- `backend/src/modules/collector/application/collector-caching.test.ts`: collector cache.
- No Crawl Job, execution lifecycle, snapshot, retry, sandbox or crawl-review tests found.

Patterns to Reuse:
- Protected routes/navigation and URL-backed tabs.
- Typed API client, cycle/criterion APIs and TanStack Query.
- Backend module factory/router/service, Zod, node-pg-migrate and Vitest/Supertest.
- `withAuditedTransaction` for atomic mutation/audit.
- Import staging/apply only where contracts match; legacy collector is not a safe replacement.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/BACKEND_NODE_RULES.md`
- Relevant frontend/backend modules, migrations, package manifests and compose/deployment files.

## Actions and Evidence
- Searched frontend/backend source and migrations for crawl tables, routes, queue workers and sandbox support.
- Read ingestion hub, import APIs/types/tests, collector APIs/service/scheduler/types and schema migrations.
- Read app route/module wiring, cycle/criterion APIs, backend rules, audit transaction and compose/deploy configuration.
- Confirmed Docker Compose and Render do not provision Redis; backend dependencies include `node-cron`, not BullMQ.

## Changes Made
- No source changes. This artifact reconstructs the approved Step 2 deliverable.

## Decisions and Rationale
- Add a Crawl Job module and worker rather than adapt legacy direct-sync collector endpoints.
- Extend/reuse import staging only for normalized records and review/apply where the schema contract can be reconciled.

## Risks / Blockers
- Queue, Redis, sandbox and credential isolation require new infrastructure/runtime decisions.
- Import schema differs from LLD naming and lifecycle and needs compatibility tests.

## Next Step
- Assess cross-module impact and document the approved design boundary.