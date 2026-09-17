# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

### Task Understanding

**Goal**:
Implement, harden, and verify the Calibration Workflow Integration, Cross-Module Security Hardening, and Concurrency & Locking Hardening across Backend and Frontend for the Employee Performance Evaluation Management System in strict compliance with the LLD, Sequence Diagrams, Backend Node Rules, and Frontend React Rules.

**Expected Behavior**:
- **Part A — Calibration Workflow Integration**:
  - Incorporate `CALIBRATION` into the fixed evaluation state machine as the single optional state:
    `DRAFT -> OPEN -> SELF_ASSESSMENT -> MANAGER_ASSESSMENT -> REVIEWING -> [CALIBRATION] -> APPROVED -> PUBLISHED -> LOCKED`.
  - When `evaluation_cycle.calibration_enabled = true`: `REVIEWING -> CALIBRATION` is valid.
  - When `evaluation_cycle.calibration_enabled = false`: `REVIEWING -> CALIBRATION` is rejected with `422 Unprocessable Entity` (code: `CALIBRATION_NOT_ENABLED` or `INVALID_WORKFLOW_TRANSITION`).
  - Score adjustments require a non-empty `reason`, preserve `overall_weighted_score` intact, update `final_score`, store immutable adjustment records, and write audit logs in the same database transaction.
  - Finalize endpoint (`POST /calibration-sessions/:id/finalize`) locks the session and cycle, validates lock state, transitions evaluations atomically `CALIBRATION -> APPROVED -> PUBLISHED` without a separate manual publish step, creates audit logs, and commits in a single transaction.
  - Concurrent / double finalize requests are handled safely (idempotent or `409 Conflict`), never producing duplicate transitions or duplicate audit entries.
- **Part B — Cross-Module Security Hardening**:
  - End-to-end authentication and JWT verification across all modules (IAM, Organization, Template/Criteria, Evaluation, Import, Reporting, Calibration, Audit). Actor identity and employee scope are extracted solely from the authenticated JWT context, never trusted from request body or query parameters.
  - Strict RBAC and resource scoping enforced in the application/service layer.
  - Enforce explicit `KPI_MANUAL_OVERRIDE` permission plus team/employee resource scoping and lock validation for manual override actions.
  - Comprehensive PII protection: mask email and full names outside official audit records; prevent leakage of tokens, authorization headers, passwords, and raw payloads in logs, errors, console, URLs, and storage.
  - Prevent error leakage: safe user-facing message and stable error codes adhering to the standard API envelope (`success`, `message`, `data`, `meta`); eliminate exposure of stack traces, ORM/PostgreSQL errors, file paths, and SQL statements.
  - SQL injection prevention: parameterized queries, repository allowlists for dynamic sort and filter columns.
  - Audit integrity: business mutation and audit log insertion executed within the exact same database transaction. Audit log table remains strictly append-only with no update/delete APIs.
- **Part C — Concurrency & Locking Hardening**:
  - Evaluation item updates use optimistic locking with an atomic version check (`UPDATE ... WHERE version = x`), returning `409 Conflict` on version mismatch.
  - Concurrent submit and concurrent approve actions are protected by row locks (`SELECT ... FOR UPDATE`) and state validation within the transaction.
  - Concurrent calibration adjustments use row locks/versioning to prevent lost updates, preserving original scores and adjustment history.
  - Concurrent calibration finalization prevents race conditions with session-level row locking.
  - Cycle lock race: every evaluation write checks `cycle.status != LOCKED` with a row lock in the same transaction. Committing `cycle.status = LOCKED` blocks all subsequent business writes.
  - KPI relationship creation race: database unique constraint + transaction handling to return `409 Conflict` on duplicates.
  - KPI manual override race: optimistic locking/row locking + permission and resource scope validation in the same transaction.
  - Concurrent CSV import: unique constraint on `(evaluation_cycle_id, file_hash)` returning `409 Conflict`; import processing rejects locked evaluations.
  - DAG validation race: configuration/relationship mutations and DAG cycle detection executed inside the same transaction with row locks to guarantee that the committed database state is always a valid DAG.
- **Part D — Frontend Implementation**:
  - Calibration UI integrated into the evaluation workflow, displaying current status, calibration enabled/disabled indicator, original calculated score, final score, adjustment history, and mandatory reason dialog.
  - Workflow action buttons dynamically derived from server response permissions and evaluation state.
  - KPI manual override UI displayed only when authorized; graceful handling of `403`, `409`, and `422`.
  - Concurrency conflict (`409 Conflict`) UX: preserves unsaved user input and provides a "Reload latest data" option.
  - Locked cycle/evaluation displays read-only state with explanation.
  - No PII logged to browser console, query parameters, or local storage.

**Acceptance Criteria**:
1. Fixed state machine validates and enforces workflow transitions; `REVIEWING -> CALIBRATION` succeeds only when `calibration_enabled = true` on the cycle, and fails with `422` when disabled.
2. Calibration adjustment requires a non-empty `reason`, preserves `overall_weighted_score`, populates `final_score`, creates an append-only adjustment record, and writes an audit log in the same transaction.
3. Finalize calibration session atomically validates cycle/session locks, marks session `FINALIZED`, transitions evaluations `CALIBRATION -> APPROVED -> PUBLISHED`, writes audit records, and rejects concurrent/double finalize with `409 Conflict` or idempotent response.
4. JWT authentication and RBAC resource scoping are enforced at the service layer across all modules; unauthorized requests return `401` or `403`.
5. `KPI_MANUAL_OVERRIDE` permission and resource scope are enforced server-side for manual overrides; missing permission or wrong scope returns `403`.
6. API responses use the standard envelope (`success`, `message`, `data`, `meta.request_id`, `meta.error`); no stack traces, ORM errors, or raw SQL queries leak. PII is masked outside official audit.
7. Audit records are created in the same database transaction as business writes (score, weight, workflow transition, override, import, lock, calibration).
8. Optimistic locking on evaluation items checks `version` atomically and returns `409 Conflict` on concurrent updates.
9. Row locking (`SELECT ... FOR UPDATE`) protects concurrent submit, approve, calibration finalize, and cycle lock operations.
10. Database unique constraints prevent duplicate KPI relationships and duplicate CSV imports `(evaluation_cycle_id, file_hash)` under concurrent load.
11. Mutations affecting workflow/relationship dependencies validate DAG consistency within the same transaction to prevent race conditions.
12. Frontend displays server-driven workflow actions, requires a reason for adjustments, handles `409 Conflict` without discarding form inputs, and renders read-only views for locked resources.
13. Automated test suite (unit, integration, RBAC negative tests, and concurrency tests) passes with 100% execution success.

**Out of Scope**:
- Auto-suggested, recommended, or AI-generated calibration scores.
- Bell curve, forced distribution, normalization, or percentile ranking calculations.
- Separate manual HR publish endpoint (auto-published from `APPROVED -> PUBLISHED` per LLD).
- Arbitrary new workflow states beyond the defined state machine.

**Business Rules Involved**:
- Fixed workflow state machine: `DRAFT -> OPEN -> SELF_ASSESSMENT -> MANAGER_ASSESSMENT -> REVIEWING -> [CALIBRATION] -> APPROVED -> PUBLISHED -> LOCKED`.
- Cycle calibration flag: `evaluation_cycle.calibration_enabled`.
- Provenance of scores: `overall_weighted_score` is immutable by calibration; calibration produces `final_score`.
- Mandatory justification: non-empty `reason` required for all calibration adjustments and manual overrides.
- Concurrency & locking: optimistic locking (`version`) for item writes, row locks for workflow transitions and cycle locking, transactional audit logging.
- Append-only audit integrity: no update or delete operations on audit tables.

**Open Questions / Conflicts**:
- None.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/Sequence_Diagrams_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`
- User task specification

## Actions and Evidence
- Analyzed LLD sections 3.1, 7.2, 8, 10.5, 14, 16, 17, 19, 29 Q3.
- Validated business rules, acceptance criteria, boundaries, and security/concurrency invariants.

## Changes Made
- None.

## Decisions and Rationale
- Strictly adhere to LLD auto-publish and single optional calibration state specifications.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate.
