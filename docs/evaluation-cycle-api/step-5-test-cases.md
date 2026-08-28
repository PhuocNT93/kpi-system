# Step 5: Test Cases

Status: produced during this step

## Deliverable
| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC-EC-01 | Create cycle successfully | Authenticated as `HR_ADMIN`, unique `code`, valid dates (`start_date` <= `end_date`), valid published template ID | `POST /v1/evaluation-cycles` | 201 Created with `status = 'DRAFT'`. Audit log `CREATE` recorded. |
| TC-EC-02 | Reject duplicate cycle code | A cycle with code `2026-Q3` already exists | `POST /v1/evaluation-cycles` with `code = '2026-Q3'` | 409 Conflict (`EVALUATION_CYCLE_CODE_ALREADY_EXISTS`). |
| TC-EC-03 | Update draft cycle | Cycle exists in `DRAFT` status | `PATCH /v1/evaluation-cycles/:id` with new `name` and `end_date` | 200 OK. Fields updated. Audit log recorded. |
| TC-EC-04 | Reject update when cycle is OPEN or LOCKED | Cycle status is `OPEN` or `LOCKED` | `PATCH /v1/evaluation-cycles/:id` | 409 Conflict (`EVALUATION_CYCLE_NOT_EDITABLE`). |
| TC-EC-05 | Open cycle & snapshot evaluations | Cycle status `DRAFT`, valid template version (`PUBLISHED`, sum weights $= 100\%$), eligible employees exist | `POST /v1/evaluation-cycles/:id/open` | 200 OK, `status = 'OPEN'`, `evaluation_count` returned. Evaluations created with snapshots of `employee_assignment` (`team_id_snapshot`, etc.) and deep snapshots of template criteria (`criterion_code_snapshot`, `scoring_rule_snapshot`, etc.). Audit log `CYCLE_OPENED` recorded. |
| TC-EC-06 | Reject opening cycle with unpublished template or invalid weight sum | Referenced template version status is `DRAFT` OR sum of criterion effective weights != 100% | `POST /v1/evaluation-cycles/:id/open` | 422 Unprocessable Entity (`TEMPLATE_NOT_PUBLISHED` or `INVALID_TEMPLATE_CONFIGURATION`). Rollback complete. |
| TC-EC-07 | Concurrent cycle open safety | Cycle status `DRAFT` | Two simultaneous `POST /v1/evaluation-cycles/:id/open` requests | Exactly one succeeds (200 OK). The second request fails cleanly (409 Conflict) without duplicate evaluations or orphaned records. |
| TC-EC-08 | Lock cycle immutability | Cycle status `OPEN` | `POST /v1/evaluation-cycles/:id/lock` | 200 OK, `status = 'LOCKED'`, `locked_at` populated. All associated evaluations marked `is_locked = true`. Audit log `LOCK` recorded. |
| TC-EC-09 | Reject invalid state transition | Cycle status `DRAFT` | Attempt direct lock or invalid transition (`DRAFT` $\rightarrow$ `LOCKED`) | 409 Conflict (`INVALID_CYCLE_STATE_TRANSITION`). |
| TC-EC-10 | RBAC enforcement for non-HR Admin | User has role `EMPLOYEE`, `MANAGER`, or `SYSTEM_ADMIN` (write attempt) | `POST /v1/evaluation-cycles` OR `POST /v1/evaluation-cycles/:id/open` | 403 Forbidden. Operation rejected. |

## Inputs Reviewed
- Plan & acceptance criteria.

## Actions and Evidence
- Defined test scenarios covering creation, updates, state transitions, snapshots, concurrency, and authorization.

## Decisions and Rationale
- Write automated unit, transition, and API tests to validate all scenarios.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
