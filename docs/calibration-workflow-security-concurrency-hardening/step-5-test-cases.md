# Step 5: Define Test Cases

Status: reconstructed from approved response

## Deliverable

### Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| **TC01** | Calibration entry when enabled | Evaluation in `REVIEWING`, cycle has `calibration_enabled = true` | HR/Admin triggers transition to `CALIBRATION` | `200 OK`, evaluation status updated to `CALIBRATION` |
| **TC02** | Calibration entry when disabled | Evaluation in `REVIEWING`, cycle has `calibration_enabled = false` | Actor attempts transition to `CALIBRATION` | `422 Unprocessable Entity` (`CALIBRATION_NOT_ENABLED` / `INVALID_WORKFLOW_TRANSITION`) |
| **TC03** | Calibration to Approved transition | Evaluation in `CALIBRATION` | Committee approves evaluation | `200 OK`, transitions to `APPROVED` |
| **TC04** | Approved auto-publish | Evaluation transitions to `APPROVED` | Transition completes | System atomically sets status to `PUBLISHED` in the same transaction |
| **TC05** | Illegal state transition rejection | Evaluation in `REVIEWING` | Actor attempts direct jump to `PUBLISHED` or `LOCKED` | `422 Unprocessable Entity` (`INVALID_WORKFLOW_TRANSITION`) |
| **TC06** | Score provenance preservation | Evaluation has `overall_weighted_score` = 78.5 | HR applies calibration adjustment to 85.0 with reason | `overall_weighted_score` remains 78.5, `final_score` = 85.0, adjustment record created |
| **TC07** | Calibration reason validation | Evaluation in calibration session | HR attempts adjustment with empty or whitespace reason | `422 Unprocessable Entity` (`CALIBRATION_REASON_REQUIRED`) |
| **TC08** | Transactional adjustment audit | Evaluation in calibration session | HR adjusts score with valid reason | Adjustment record and `CALIBRATION_ADJUST` audit log committed atomically in same transaction |
| **TC09** | Session finalize atomicity | Open calibration session with eligible evaluations | HR calls `POST /calibration-sessions/:id/finalize` | Session becomes `FINALIZED`, evaluations transition `CALIBRATION -> APPROVED -> PUBLISHED`, audit logged |
| **TC10** | Finalize on locked cycle | Cycle `status = LOCKED` | HR calls `POST /calibration-sessions/:id/finalize` | `409 Conflict` (`EVALUATION_LOCKED`), no status change |
| **TC11** | Double / concurrent finalize | Open calibration session | Two simultaneous finalize requests executed | First request succeeds (`200 OK`), second returns `409 Conflict` (`CALIBRATION_SESSION_ALREADY_FINALIZED`) |
| **TC12** | Employee post-publish visibility | Session finalized, evaluations `PUBLISHED` | Employee fetches `GET /evaluations/:id` | `200 OK`, employee sees `final_score` and published results |
| **TC13** | Authentication enforcement | Protected endpoint | Request without token, with malformed token, or expired token | `401 Unauthorized` (`UNAUTHENTICATED`) |
| **TC14** | Admin endpoint RBAC | User has role `EMPLOYEE` | User calls Admin configuration / IAM endpoint | `403 Forbidden` (`FORBIDDEN`) |
| **TC15** | Employee resource scoping | User A is Employee A | User A fetches Evaluation of Employee B | `403 Forbidden` (`FORBIDDEN`) |
| **TC16** | Manager team resource scoping | Manager A manages Team A | Manager A accesses Evaluation of Employee in Team B | `403 Forbidden` (`FORBIDDEN`) |
| **TC17** | Manager admin action denial | User has role `MANAGER` | User calls Admin configuration API | `403 Forbidden` (`FORBIDDEN`) |
| **TC18** | Missing `KPI_MANUAL_OVERRIDE` | Actor lacks `KPI_MANUAL_OVERRIDE` | Actor calls manual override endpoint | `403 Forbidden` (`FORBIDDEN`) |
| **TC19** | Out-of-scope manual override | Actor has `KPI_MANUAL_OVERRIDE` but target is outside managed team | Actor attempts manual override on target | `403 Forbidden` (`FORBIDDEN`) |
| **TC20** | Authorized manual override | Actor has `KPI_MANUAL_OVERRIDE` and target is within scope | Actor posts override with score and reason | `200 OK`, item updated, override reason recorded, audit logged |
| **TC21** | Manual override on locked resource | Evaluation or cycle is `LOCKED` | Actor attempts manual override | `409 Conflict` (`EVALUATION_LOCKED`) |
| **TC22** | PII and technical error masking | Various API failures (DB error, 500, not found) | Client inspects API error response | Envelope `{ success: false, message, data: null, meta }`, no SQL, no stack traces, no unmasked email/passwords |
| **TC23** | Append-only audit integrity | State/score/override mutations | Inspect database audit logs | Every business write has a corresponding audit record in same transaction; no delete/update APIs exist |
| **TC24** | Concurrent evaluation item update | Item version = 5 in Tabs A and B | Tab A updates with version 5; Tab B updates with version 5 | Tab A returns `200 OK` (version -> 6); Tab B returns `409 Conflict` (`VERSION_MISMATCH`) |
| **TC25** | Concurrent submit | Evaluation in `OPEN` / `SELF_ASSESSMENT` | Two parallel submit requests | One succeeds (`200 OK`), other returns `409 Conflict` or idempotent response; no duplicate scores |
| **TC26** | Concurrent approve | Evaluation in `REVIEWING` | Reviewers A and B trigger approve simultaneously | One transition succeeds, second returns `409 Conflict`; no duplicate transitions |
| **TC27** | Concurrent calibration adjustments | Same evaluation in open session | Adjustments A and B submitted simultaneously | Handled atomically with row locking; no lost update; audit records consistent |
| **TC28** | Concurrent calibration finalize | Open session | Two parallel finalize requests | Row lock protects session; exactly one finalize succeeds, second returns `409 Conflict` |
| **TC29** | Cycle lock vs evaluation write race | Cycle in progress | Tx A writes evaluation update while Tx B locks cycle | If Tx B commits lock first, Tx A fails with `409 Conflict` (`EVALUATION_LOCKED`); no write commits post-lock |
| **TC30** | Concurrent KPI relationship creation | No relationship between KPI 1 and 2 | Two parallel requests create identical relationship | Database unique constraint catches conflict; one returns `201`, second returns `409 Conflict` |
| **TC31** | Concurrent KPI manual override | Same evaluation item | Managers A and B attempt override simultaneously | Row lock / version check ensures first succeeds, conflicting request returns `409 Conflict` |
| **TC32** | Concurrent CSV import upload | Cycle ID C1 | Two parallel uploads of same file (same hash) | Unique constraint on `(cycle_id, file_hash)` catches duplicate; one succeeds, second returns `409 Conflict` |
| **TC33** | Concurrent DAG validation race | Directed graph without cycles | Req A adds A -> B while Req B adds B -> A simultaneously | Transaction-scoped locking prevents concurrent cycle bypass; committed state is always a valid DAG |
| **TC34** | Frontend calibration view | Calibration page mounted | User navigates to session detail | Shows cycle calibration status, calculated score, final score, and adjustment history |
| **TC35** | Frontend reason requirement | Manual adjustment modal opened | User clears reason and clicks Save | Save button disabled or error banner displayed requiring reason |
| **TC36** | Frontend 409 conflict handling | User editing evaluation/adjustment | Server responds with `409 Conflict` | Form inputs are preserved, banner informs "Record was changed by another user" with reload option |
| **TC37** | Frontend locked cycle UX | Cycle status is `LOCKED` | User views evaluation or calibration | Controls disabled, read-only badges shown, explanation rendered |

## Inputs Reviewed
- Steps 1-4 deliverables and test matrices.

## Actions and Evidence
- Defined 37 targeted test cases across E1 (Calibration), E2 (Security), E3 (Concurrency), and E4 (Frontend).

## Changes Made
- None.

## Decisions and Rationale
- Each test scenario tests a specific domain invariant or race condition.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implement.
