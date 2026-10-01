# ADR: Separate Crawl Execution History

Status: Accepted by user for implementation

## Context

The Automated KPI Data Crawling feature brief requires persistent execution history, immutable configuration snapshots, idempotency, retry attempts, and traceable lifecycle. LLD section 15.1 currently describes creating and updating `evaluation_data_import` as queued crawl work, but does not define a separate execution entity. Import staging also serves manual CSV ingestion and must not replace runtime history.

## Decision

- Introduce `crawl_job_execution` as the authoritative runtime record.
- Persist the script identity/version/checksum, source configuration, credential reference, criterion mappings and cycle assignment as an immutable execution snapshot.
- PostgreSQL is the authoritative queue and history. Workers load snapshots by execution ID from the database.
- Each retry creates a new execution record linked to its prior attempt; execution records are never overwritten.
- `evaluation_data_import` and its existing record rows remain staging/review data and reference the originating execution.
- Scheduler/manual trigger create an idempotent `QUEUED` execution. Workers claim due rows transactionally using `FOR UPDATE SKIP LOCKED`, recheck OPEN-cycle/job eligibility, then set `RUNNING` and a lease. External work starts only after commit.
- Retry attempts persist `attempt_no`, `max_attempts` and `next_retry_at`; workers claim retries only when `next_retry_at <= NOW()`. Lease expiry supports recovery after a worker crash.
- Do not introduce Redis/BullMQ for Crawl Job execution. The separate Node worker polls PostgreSQL.

## Consequences

- Adds database/API and worker responsibilities beyond the existing import and collector modules.
- CSV upload behavior remains supported and must have regression coverage.
- PostgreSQL claim/lease/retry processing, sandbox, network allowlist, credential isolation and separate worker deployment must be added.
- LLD section 15.1 should be amended to align the data flow and API terminology with this decision.

## Approval

The user approved the separate execution entity and backend/API scope in this task before implementation.