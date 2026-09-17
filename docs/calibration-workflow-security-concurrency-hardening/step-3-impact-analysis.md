# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Frontend** | MEDIUM | CalibrationPage and related components updated to display calibration enabled/disabled state, calculated vs final scores, immutable adjustment history, mandatory reason in adjustment dialogs, server-driven workflow action buttons, read-only UI for locked cycles, and a non-destructive 409 conflict recovery flow (preserving unsaved edits and offering data reload). |
| **Backend** | HIGH | State machine transitions updated to strictly follow the fixed workflow with optional `CALIBRATION` state; `calibration_enabled` cycle flag validation; atomic finalize (`CALIBRATION -> APPROVED -> PUBLISHED`); strict `KPI_MANUAL_OVERRIDE` permission + resource scope validation; optimistic locking version checks on item updates; transactional cycle lock validation on all evaluation write paths; and DAG validation synchronization. |
| **Database** | MEDIUM | Migration adding `calibration_enabled BOOLEAN NOT NULL DEFAULT true` to `evaluation_cycle`. Existing constraints (`uq_kpi_relationship_active`, `import_job_unique_constraint`) and item `version` column verified and utilized for concurrency guarantees. Zero destructive schema alterations. |
| **API** | MEDIUM | Strict adherence to standard response envelope (`success`, `message`, `data`, `meta.request_id`, `meta.error.code`, `meta.error.details`). Error statuses standard across modules: 401 (Unauthenticated), 403 (Forbidden / Scope), 409 (Conflict / Locked / Version mismatch / Duplicate), 422 (Unprocessable / Invalid workflow transition / Disabled calibration). No raw database or stack trace leakage. |
| **RBAC / Scope** | HIGH | Service-layer authorization across IAM, Organization, Criteria, Evaluation, Import, Reporting, Calibration, and Audit. Actor identity strictly extracted from JWT claims; request body/query actor spoofing ignored. `KPI_MANUAL_OVERRIDE` permission strictly required and team/employee scope enforced. |
| **Workflow** | HIGH | Fixed state machine enforced: `DRAFT -> OPEN -> SELF_ASSESSMENT -> MANAGER_ASSESSMENT -> REVIEWING -> [CALIBRATION] -> APPROVED -> PUBLISHED -> LOCKED`. `REVIEWING -> CALIBRATION` allowed only when `cycle.calibration_enabled = true`; rejected with 422 when false. Direct illegal transitions (`REVIEWING -> PUBLISHED`, `REVIEWING -> LOCKED`, `CALIBRATION -> PUBLISHED`, `CALIBRATION -> LOCKED`) blocked. Auto-publish occurs atomically upon entering `APPROVED`. |
| **Audit** | MEDIUM | Business mutation and audit log insertion executed within the exact same database transaction via `withAuditedTransaction`. Audits cover workflow transitions, score adjustments, manual overrides, imports, and cycle locks. Audit table remains strictly append-only. |
| **Concurrency** | HIGH | Optimistic locking on evaluation items (`UPDATE ... WHERE version = expectedVersion`), returning 409 on conflict. Row-level locks (`SELECT ... FOR UPDATE`) protect concurrent submit, approve, calibration finalize, and cycle lock. Simultaneous conflicting DAG edge additions are serialized inside transactions to prevent graph cycles. |
| **Performance** | LOW | Row locks are fine-grained (scoped to specific evaluation or session rows) and held only for brief transaction durations. Existing indexes support rapid lookup. |
| **Historical Data** | LOW | Complete preservation of original calculated scores (`overall_weighted_score` / `manager_score`). Calibration adjustments and manual overrides are recorded in immutable, append-only history tables. |

#### Potential Risks:
1. **Existing Test Suite Status Compatibility**: Some existing evaluation tests test the transitional statuses `OPEN -> SUBMITTED -> MANAGER_REVIEW -> APPROVED`. The transition engine must support the canonical LLD state machine (`DRAFT -> OPEN -> SELF_ASSESSMENT -> MANAGER_ASSESSMENT -> REVIEWING -> [CALIBRATION] -> APPROVED -> PUBLISHED -> LOCKED`) while preserving alias support where needed to maintain zero regression in existing test suites.
2. **Strict KPI_MANUAL_OVERRIDE Enforcement**: Ensuring existing tests provide the `KPI_MANUAL_OVERRIDE` permission in their simulated JWT claims so existing valid test cases remain green while negative cases properly fail with 403.
3. **Deadlock Prevention in Concurrency**: Row locks across evaluation and cycle must be acquired in a consistent order (`evaluation_cycle` row lock first, then `evaluation` / `calibration_session` row lock) to prevent database deadlocks under heavy concurrent load.

#### Required ADR / Clarification:
- None. The implementation strictly adheres to LLD Section 14, 16, 17, Sequence Diagrams, and project node/react rules.

## Inputs Reviewed
- LLD, Sequence Diagrams, Backend Node Rules, Frontend React Rules.

## Actions and Evidence
- Evaluated frontend, backend, database, API, RBAC, workflow, audit, concurrency, performance, and historical data dimensions.

## Changes Made
- None.

## Decisions and Rationale
- Decided on fine-grained row locks (`SELECT ... FOR UPDATE`) and transaction-scoped DAG checks to ensure safety without hurting overall throughput.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan.
