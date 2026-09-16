# Step 5: Define Test Cases

Status: reconstructed from approved response

## Deliverable

### Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Create calibration session as HR/Admin | Active evaluation cycle exists; user has `HR_ADMIN` role | `POST /calibration-sessions` with valid `evaluation_cycle_id` and `scope_type: 'ORG'` | Returns `201 Created` with session status `OPEN`; audit log `CALIBRATION_SESSION_CREATE` recorded atomically. |
| TC02 | Reject session creation by non-HR role | Active evaluation cycle exists; user has `EMPLOYEE` or `MANAGER` or `SYSTEM_ADMIN` role | `POST /calibration-sessions` with valid payload | Returns `403 Forbidden` (`FORBIDDEN`); no database mutation or audit record created. |
| TC03 | Reject session creation with missing scope_id for TEAM/DEPARTMENT | Active cycle exists; user is `HR_ADMIN` | `POST /calibration-sessions` with `scope_type: 'TEAM'` and null/empty `scope_id` | Returns `400 Bad Request` or `422 Unprocessable` requiring `scope_id`. |
| TC04 | Verify distribution aggregate calculation | Calibration session exists with 3 evaluations having calculated scores `[70.00, 80.00, 90.00]` | `GET /calibration-sessions/:id/distribution` | Returns `200 OK` with `count: 3`, `average: 80.00`, `median: 80.00`, `min: 70.00`, `max: 90.00` derived strictly from `overall_weighted_score`. |
| TC05 | Verify distribution with even number of evaluations (median calculation) | Session exists with 4 evaluations having scores `[70.00, 80.00, 85.00, 95.00]` | `GET /calibration-sessions/:id/distribution` | Returns `200 OK` with `median: 82.50` (`(80.00 + 85.00) / 2`). |
| TC06 | Successful score adjustment by HR/Admin | Session is `OPEN`, evaluation score is `80.00`, user is `HR_ADMIN` | `POST /calibration-sessions/:id/adjustments` with `new_final_score: 85.00`, `reason: "Performance adjustment based on project impact"` | Returns `200 OK`; `evaluation.final_score` updated to `85.00`; `overall_weighted_score` / `manager_score` preserved at `80.00`; `calibration_adjustment` record created; audit log `CALIBRATION_ADJUST` recorded atomically. |
| TC07 | Reject adjustment with empty or whitespace reason | Session is `OPEN`, user is `HR_ADMIN` | `POST /calibration-sessions/:id/adjustments` with `new_final_score: 85.00`, `reason: "   "` | Returns `422 Unprocessable` with code `CALIBRATION_REASON_REQUIRED`; no score updated; no audit written. |
| TC08 | Reject adjustment with score out of bounds | Session is `OPEN`, user is `HR_ADMIN` | `POST /calibration-sessions/:id/adjustments` with `new_final_score: 105.00` or `-5.00` | Returns `400 Bad Request` or `422 Unprocessable` rejecting invalid score range. |
| TC09 | Multiple adjustments preserve history (append-only) | Session is `OPEN`, evaluation adjusted from `80.00` -> `85.00` | Adjust evaluation again from `85.00` -> `88.00` with distinct reason | Returns `200 OK`; `GET /calibration-sessions/:id/adjustments` contains two distinct adjustment entries preserving audit trail. |
| TC10 | Reject adjustment on finalized session | Session status is `FINALIZED` | `POST /calibration-sessions/:id/adjustments` | Returns `409 Conflict` (`CONFLICT`); no modification permitted. |
| TC11 | Reject adjustment on locked evaluation | Evaluation has `is_locked: true` | `POST /calibration-sessions/:id/adjustments` | Returns `409 Conflict` with code `EVALUATION_LOCKED`; no database mutation. |
| TC12 | Finalize session transitions evaluations and auto-publishes | Session is `OPEN` with evaluations in `CALIBRATION` (or `MANAGER_REVIEW`); user is `HR_ADMIN` | `POST /calibration-sessions/:id/finalize` | Returns `200 OK`; session status becomes `FINALIZED`; evaluations atomically transition to `APPROVED` and auto-publish to `PUBLISHED` (`published_at` set); audit logs written. |
| TC13 | Concurrent finalize returns conflict (idempotency/concurrency guard) | Two concurrent finalize requests on the same session | Request A commits finalization; Request B attempts finalize concurrently | Request A succeeds (`200 OK`); Request B receives `409 Conflict` (`CALIBRATION_SESSION_ALREADY_FINALIZED`); no duplicate publish or duplicate audit records. |
| TC14 | Reject finalize on locked evaluation cycle | Evaluation cycle has `status: 'LOCKED'` or `locked_at` set | `POST /calibration-sessions/:id/finalize` | Returns `409 Conflict` with code `EVALUATION_LOCKED`; entire transaction rolls back. |
| TC15 | Frontend CreateSessionModal dynamic scope behavior | User opens Create Session modal and switches scope from ORG to TEAM | Selects `TEAM` scope | Dynamic team dropdown appears; submit disabled or validated until a team is selected. |
| TC16 | Frontend read-only state for finalized session | Session detail loaded with `status: 'FINALIZED'` | Inspect UI | Adjustment buttons disabled; Finalize button disabled; banner indicates session is finalized and read-only. |
| TC17 | Frontend score differentiation in evaluations table | Evaluation table rendered with adjusted score | Compare columns | `Overall Weighted Score` (80.00) and `Final Score` (85.00) are displayed in distinct columns with clear semantic labels. |
| TC18 | Frontend 403 Forbidden handling | User without HR role visits `/calibration` | Render Calibration page | Access denied notice rendered; sensitive session details not displayed. |

## Inputs Reviewed
- Plan items 1 to 7 from Step 4.

## Actions and Evidence
- Defined 18 test cases covering happy paths, errors, boundaries, concurrency, locking, audit, and UI states.

## Changes Made
- None.

## Decisions and Rationale
- Encompass all critical invariants defined in prompt Section 47.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement.
