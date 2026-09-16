# Step 3: Impact Analysis

Status: reconstructed from approved response

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Need to enhance `CalibrationPage.tsx`, `CalibrationDistributionChart.tsx`, `CalibrationAdjustmentModal.tsx`, and `CreateSessionModal.tsx` to include dynamic team/department selectors, 0–100 score distribution with median, read-only/locked states, explicit finalize confirmation modal, and RBAC guards. |
| Backend | HIGH | Refactor `CalibrationService`, `PostgresCalibrationRepository`, `CalibrationController`, and `CalibrationRouter` to enforce HR/Admin only RBAC, calculate correct distribution (count, avg, median, min, max on `overall_weighted_score`), validate mandatory non-empty reasons, prevent locked evaluation/cycle modifications (`409 EVALUATION_LOCKED`), finalize atomically (`CALIBRATION` -> `APPROVED` -> `PUBLISHED`), and prevent duplicate finalize (`409 CALIBRATION_SESSION_ALREADY_FINALIZED`). |
| Database | LOW | Tables `calibration_session` and `calibration_adjustment` are already defined in the initial migration. Foreign keys, constraints, and audit tables are intact. Verify indices for cycle/session/evaluation lookup. |
| API | HIGH | Standardize endpoints according to LLD contracts: `POST /calibration-sessions`, `GET /calibration-sessions`, `GET /calibration-sessions/:id`, `GET /calibration-sessions/:id/distribution`, `POST /calibration-sessions/:id/adjustments`, `GET /calibration-sessions/:id/adjustments`, `POST /calibration-sessions/:id/finalize`. Maintain backward-compatible aliases under `/calibration/*`. |
| RBAC / Scope | HIGH | Enforce LLD Section 3.1 & 17.1: Only `HR_ADMIN` has calibration creation, adjustment, and finalization rights. `EMPLOYEE`, `MANAGER`, and `SYSTEM_ADMIN` receive `403 Forbidden`. Enforce scope isolation for `TEAM`, `DEPARTMENT`, and `ORG` using evaluation cycle snapshots. |
| Workflow | HIGH | Integrate with evaluation workflow: finalizing calibration transitions evaluations from `CALIBRATION` (or eligible review state) to `APPROVED` and auto-publishes to `PUBLISHED` atomically within the same transaction. Ineligible states (`DRAFT`, `OPEN`, `PUBLISHED`, `LOCKED`) cannot be adjusted. |
| Audit | HIGH | Every mutation (`CALIBRATION_SESSION_CREATE`, `CALIBRATION_ADJUST`, `CALIBRATION_FINALIZE`) produces immutable audit records atomically within the same database transaction via `withAuditedTransaction`. Zero orphan audit records on rollback. |
| Concurrency | HIGH | Finalize and adjustment operations acquire row-level locks (`SELECT ... FOR UPDATE`) on the calibration session and target evaluations. Concurrent finalization requests are rejected with `409 CALIBRATION_SESSION_ALREADY_FINALIZED`. |
| Performance | MEDIUM | Score distribution aggregates (avg, median, min, max) and evaluations list queries are optimized with appropriate indices and efficient SQL aggregations. |
| Historical Data | HIGH | Original manager/calculated score (`overall_weighted_score` / `manager_score`) is strictly immutable and preserved. Only `final_score` is updated. Multiple adjustments are append-only in `calibration_adjustment` with actor ID, timestamp, old score, new score, and mandatory reason. |

**Potential Risks**:
- **Workflow State Compatibility**: In cycles with calibration enabled, evaluations may be in `REVIEWING` / `MANAGER_REVIEW` or `CALIBRATION`. The transition service and finalization flow must accept eligible review states and transition them forward to `APPROVED` -> `PUBLISHED` cleanly.
- **Race Conditions on Finalize**: Simultaneous finalize requests by multiple HR admins could cause duplicate transitions or publish events; resolved through transactional pessimistic locking (`FOR UPDATE`) on the session record.
- **Scope Selector Validation**: Creating sessions with `TEAM` or `DEPARTMENT` scope without selecting a valid entity would cause validation failures; resolved by adding reactive dynamic team/department selectors in `CreateSessionModal.tsx`.

**Required ADR / Clarification**:
- None. Contracts and invariants are fully specified in LLD Sections 3.1, 8, 10.5, 13, 14, 16, 17 and Sequence Diagram Section 6.

## Inputs Reviewed
- Identified files and modules from Step 2.

## Actions and Evidence
- Evaluated risk across 10 architectural facets.

## Changes Made
- None.

## Decisions and Rationale
- Ensure atomic transitions and lock invariants are strictly maintained.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan.
