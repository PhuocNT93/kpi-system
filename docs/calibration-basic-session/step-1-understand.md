# Step 1: Understand

Status: reconstructed from approved response

## Deliverable

### Task Understanding

**Goal**: Implement the basic Calibration feature across backend and frontend for the Employee Performance Evaluation Management System, enabling HR/Admin users to create calibration sessions, inspect score distribution (average, median, min, max), apply auditable manual score adjustments with mandatory reasons to `final_score` (without mutating `overall_weighted_score`), and finalize sessions transitioning evaluations atomically from `CALIBRATION` through `APPROVED` to `PUBLISHED` with strict lock, audit, and concurrency safeguards.

**Expected Behavior**:
- **Backend**:
  - Provide REST endpoints for calibration session creation (`POST /calibration-sessions`), listing (`GET /calibration-sessions`), retrieval (`GET /calibration-sessions/:id`), distribution metrics (`GET /calibration-sessions/:id/distribution`), adjustments (`POST /calibration-sessions/:id/adjustments`), adjustment history (`GET /calibration-sessions/:id/adjustments`), and finalization (`POST /calibration-sessions/:id/finalize`).
  - Enforce RBAC: HR/Admin only. All other roles (Employee, Manager, System Admin) receive `403 Forbidden`.
  - Validate scope (`TEAM`, `DEPARTMENT`, `ORG`) and include only eligible evaluations belonging to the cycle and scope.
  - Maintain score provenance: `overall_weighted_score` is strictly preserved; calibrated scores update `evaluation.final_score` while creating append-only `calibration_adjustment` records.
  - Enforce mandatory non-empty business justification (`reason`) for adjustments (`CALIBRATION_REASON_REQUIRED`).
  - Finalize session atomically: locks session and evaluations, verifies lock state, updates session to `FINALIZED`, transitions evaluations `CALIBRATION` -> `APPROVED` -> `PUBLISHED` without a separate manual publish step, and records audit logs.
  - Reject mutations on locked cycles/evaluations (`409 EVALUATION_LOCKED`) or already finalized sessions (`409 CALIBRATION_SESSION_ALREADY_FINALIZED`).
- **Frontend**:
  - HR/Admin UI featuring Calibration Session List, Session Creation modal/drawer, Session Detail view with Distribution Metrics card, Dense Evaluation Table, Manual Adjustment dialog, Adjustment History drawer, and Finalize confirmation modal.
  - Strict read-only visual state when session is finalized or evaluations are locked.
  - Centralized typed API client handling wire `snake_case` to frontend `camelCase` transformation.
  - TanStack Query cache management and query invalidation on mutation.
  - Proper handling of 401, 403, 404, 409 (locked/concurrency), and 422 error states.

**Acceptance Criteria**:
1. HR/Admin can create calibration sessions with `TEAM`, `DEPARTMENT`, or `ORG` scope; unauthorized roles receive `403 Forbidden`.
2. Session distribution calculates count, average, median, min, and max derived exclusively from `overall_weighted_score`.
3. Evaluations table cleanly displays and distinguishes `overall_weighted_score` and `final_score`.
4. Manual adjustment requires a non-empty `reason`; blank or whitespace-only values are rejected with `CALIBRATION_REASON_REQUIRED`.
5. Score adjustment updates `evaluation.final_score`, creates an append-only `calibration_adjustment` record, and never overwrites `overall_weighted_score`.
6. Finalize session validates lock status, marks session `FINALIZED`, transitions evaluations `CALIBRATION -> APPROVED -> PUBLISHED` atomically, and prevents any subsequent modifications.
7. Concurrent finalization or updates are handled idempotently or rejected with appropriate 409 conflict errors without state corruption or duplicate audits.
8. Every session creation, adjustment, and finalization writes an audit log in the same database transaction.
9. No ranking, bell curve, normalization, auto-adjustment, or percentile ranking is calculated or displayed.
10. Backend unit/integration tests and frontend component/hook tests validate all scenarios and pass.

**Out of Scope**:
- Auto-suggested, recommended, or AI-generated calibration scores.
- Bell curve, forced distribution, normalization, z-score, or outlier correction.
- Employee rankings, leaderboards, or relative position metrics (prohibited by LLD).
- Independent manual publish endpoints (auto-published upon finalization).
- Overwriting original calculated scores (`overall_weighted_score`).

**Business Rules Involved**:
- **RBAC**: HR/Admin only (LLD Section 3.1 & 7.2).
- **Score Integrity**: `overall_weighted_score` is immutable by calibration; calibration produces `final_score`.
- **Reason Mandate**: Every adjustment must have a trimmed, non-empty business rationale.
- **Workflow State Engine**: Calibration candidate state is `REVIEWING` / `CALIBRATION`. Finalization moves evaluations to `APPROVED` and auto-publishes to `PUBLISHED`.
- **Audit Logging**: Mandatory transactional logging for `CALIBRATION_SESSION_CREATE`, `CALIBRATION_ADJUST`, and `CALIBRATION_FINALIZE`.
- **Lock Invariant**: Any write against locked evaluations or cycles results in `409 EVALUATION_LOCKED`.
- **Session Lifecycle**: `OPEN` -> `FINALIZED`. Mutations on `FINALIZED` sessions are rejected.

**Open Questions / Conflicts**:
- None.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/Sequence_Diagrams_System.md`
- Implementation prompt

## Actions and Evidence
- Analyzed LLD sections 3.1, 8, 10.5, 13, 14, 16, 17.
- Defined goal, expected behavior, acceptance criteria, out of scope, and business rules.

## Changes Made
- None.

## Decisions and Rationale
- Strictly prohibit any statistical normalization or bell curves as requested.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate.
