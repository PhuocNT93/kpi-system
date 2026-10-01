# Step 3: Impact Analysis

Status: reconstructed from the approved Step 3 response

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Three tabs, route/navigation, forms, execution detail, review, polling and UI states. |
| Backend | HIGH | New Crawl Job module, API, services and worker; legacy collector may directly write KPI. |
| Database | HIGH | Job/criterion/cycle mappings and `crawl_job_execution`; staging linkage and immutable snapshot/history. |
| API | HIGH | Job, assignment, execution, retry/cancel and review/apply APIs with stable errors/envelopes. |
| RBAC / Scope | HIGH | HR/Admin configuration; scoped Manager review; System Admin script/credential administration. |
| Workflow | HIGH | OPEN-cycle gate, state machine, retry attempts and mandatory human review before Apply. |
| Audit | HIGH | Append-only audit for job, execution and review/apply mutations in the same transaction. |
| Concurrency | HIGH | DB idempotency, transition/retry races and queue execution ordering. |
| Performance | MEDIUM | Pagination, polling termination and external-source concurrency limits. |
| Historical Data | HIGH | Immutable snapshots and execution history; retries create new records. |

Potential Risks:
- No queue worker or sandbox currently exists; secure script execution requires isolation, limits and SSRF protection.
- Existing import schema differs from LLD and must remain compatible with CSV imports.
- Legacy collector handles credentials directly and can sync KPI values, risking secret exposure or bypass of review.
- Manager-scoped review is not supported by the current import API.
- Idempotency, retry, cancellation and cycle transitions can create races.

Required ADR / Clarification:
- User approved backend/API and separate execution entity per feature brief. Record this as an ADR/LLD update because current LLD does not define `crawl_job_execution`.

## Inputs Reviewed
- Approved Step 1 scope and Step 2 investigation.
- Backend/frontend rules and LLD crawl design.

## Actions and Evidence
- Assessed frontend, backend, database, API, RBAC, workflow, audit, concurrency, performance and history impacts against observed implementation.
- Confirmed missing queue/sandbox/Redis and differences in collector/import RBAC and schema.

## Changes Made
- No source changes. This artifact reconstructs the approved Step 3 deliverable.

## Decisions and Rationale
- Treat feature-brief execution history as an approved LLD extension and record it before implementation.

## Risks / Blockers
- Sandbox/deployment and import compatibility are high-risk areas requiring focused tests.

## Next Step
- Implement the reviewed minimal plan after test cases are approved.