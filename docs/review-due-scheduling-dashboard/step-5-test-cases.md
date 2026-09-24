# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| **TC01** | Due Status Date Boundaries | Reference date `2026-09-24`, lead time = 30 days | Evaluate employees with due dates: `2026-09-20`, `2026-09-24`, `2026-10-10`, `2026-11-01` | Returns `OVERDUE` (`days_overdue = 4`), `DUE` (`days_overdue = 0`), `UPCOMING` (`days_overdue = 0`), and `NOT_DUE`. |
| **TC02** | Zero Lead Time Boundary | Configured `lead_time_days = 0`, reference date `2026-09-24` | Resolve status for employee with due date `2026-09-25` | Returns `NOT_DUE` (no future upcoming window when lead time is 0). |
| **TC03** | Inactive/Terminated Exclusion | Database contains `ACTIVE`, `INACTIVE`, and `TERMINATED` employees with past due dates | Execute `ReviewDueService.getReviewsDue()` or scheduled job refresh | Only `ACTIVE` employees are returned; `INACTIVE` and `TERMINATED` are completely excluded. |
| **TC04** | Null Due Date Handling | Employee has `last_evaluation_completed_at = null` and `next_review_due_date = null` | Query `GET /reviews/due` | Employee is not flagged as overdue/due/upcoming and excluded from due dashboard list. |
| **TC05** | Scheduled Job Execution | Active employees with upcoming/due reviews in DB | Scheduled daily job executes `ReviewDueScheduler.triggerNow()` | Review due states/flags refreshed; zero new evaluations or evaluation cycles are created. |
| **TC06** | `GET /reviews/due` — HR Admin Org Scope | Authenticated as `HR_ADMIN` | Call `GET /api/reviews/due` without filters | Returns paginated list of all active due/overdue/upcoming employees across all departments and teams. |
| **TC07** | `GET /reviews/due` — Manager Team Scope | Authenticated as `MANAGER` managing `team-1` only | Call `GET /api/reviews/due` | Returns only employees belonging to `team-1`. Total count and pagination metadata reflect strictly `team-1`. |
| **TC08** | `GET /reviews/due` — Manager Cross-Team Restriction | Authenticated as `MANAGER` managing `team-1` only | Call `GET /api/reviews/due?team_id=team-2` | Returns `403 FORBIDDEN` or empty filtered list; absolutely no data from `team-2` is leaked. |
| **TC09** | `GET /reviews/due` — Unauthorized Access | Unauthenticated user or user with `EMPLOYEE` role | Call `GET /api/reviews/due` | Unauthenticated returns `401 UNAUTHORIZED`; `EMPLOYEE` returns `403 FORBIDDEN`. |
| **TC10** | `GET /reviews/due` — Status & Cadence Filter | Active employees with varied statuses and cadences | Call `GET /api/reviews/due?status=OVERDUE&cadence_id=cad-quarterly` | Returns only overdue employees assigned to the quarterly review cadence. |
| **TC11** | `GET /reviews/due` — Contract Integrity | Active employee with resolved cadence | Inspect JSON response | Exposes `employee_id`, `employee_name`, `team`, `job_level`, `effective_cadence`, `last_evaluation_completed_at`, `next_review_due_date`, `status`, and `days_overdue`. |
| **TC12** | Individual Evaluation Trigger — Single Success | Employee in manager's team has no open evaluation or upcoming batch | Manager calls `POST /api/evaluation-cycles/individual` with `[employeeId]` | HTTP 200, returns `{ created: [{ employee_id, evaluation_cycle_id, evaluation_id }] }`, template and criteria snapshotted. |
| **TC13** | Individual Evaluation — Scope Violation | Manager calls individual cycle creation with employee outside managed team | Send `POST /api/evaluation-cycles/individual` with unauthorized `employee_id` | HTTP 403 `FORBIDDEN` or employee flagged in batch response as unauthorized; no cycle created. |
| **TC14** | Individual Evaluation — Dedup Conflict (`EVALUATION_ALREADY_OPEN`) | Employee already has an `OPEN` or `IN_PROGRESS` evaluation | Call `POST /api/evaluation-cycles/individual` with this `employee_id` | Returns conflict entry `{ employee_id, code: 'EVALUATION_ALREADY_OPEN' }`; no duplicate evaluation created. |
| **TC15** | Individual Evaluation — Upcoming Batch Warning (`BATCH_CYCLE_UPCOMING`) | Employee is scheduled in a batch cycle opening in 2 weeks ($< N$ weeks) | Call `POST /api/evaluation-cycles/individual` | Returns warning entry `{ employee_id, code: 'BATCH_CYCLE_UPCOMING', cycle_code, scheduled_date }`; request does not hard-block. |
| **TC16** | Individual Evaluation — Partial Batch Execution | Batch request with 1 eligible employee, 1 already open, and 1 in upcoming batch | Call `POST /api/evaluation-cycles/individual` | Response partitions results cleanly: 1 in `created`, 1 in `conflicts`, 1 in `warnings`. Eligible employee is successfully created. |
| **TC17** | Employee Override Update & Recalculation | Employee with `last_evaluation_completed_at = 2026-06-15`, previous cadence 12 months | HR Admin calls `PATCH /api/employees/:id/review-cadence-override` with quarterly cadence (3 months) and reason | `next_review_due_date` recalculated to `2026-09-15` (from completion baseline, not `today + 3m`); audit log created with reason. |
| **TC18** | Employee Override Clear & Fallback | Employee has override (3m), Job Level has default (6m), System default is 12m | HR Admin clears override (`review_cadence_override_id = null`) | Effective cadence resolves to Job Level default (6m); `next_review_due_date` recalculated to `last_completed + 6m`. |
| **TC19** | Employee Override Permission Guard | Authenticated as `MANAGER` or `EMPLOYEE` | Call `PATCH /api/employees/:id/review-cadence-override` | HTTP 403 `FORBIDDEN`; no database modification. |
| **TC20** | Evaluation PUBLISHED Integration | Evaluation reaches `APPROVED` status | HR Admin calls `POST /api/evaluations/:id/publish` | Evaluation transitions to `PUBLISHED`, `employee.last_evaluation_completed_at` is set to publish timestamp, and `employee.next_review_due_date` is recalculated using effective cadence. |
| **TC21** | Historical Regression: Scenario A (Employee Cadence) | Evaluation A is `PUBLISHED` with score 85 under Annual cadence | Employee cadence is updated to Quarterly | Historical Evaluation A score remains 85, status remains `PUBLISHED`, criterion snapshots unchanged; only future `next_review_due_date` shifts. |
| **TC22** | Historical Regression: Scenario B (Job Level Cadence) | Employee has no override; Job Level cadence updated from Annual to Quarterly | Historical evaluations exist in `PUBLISHED` status | Historical evaluations remain unchanged; `next_review_due_date` recalculated from existing `last_evaluation_completed_at`. |
| **TC23** | Historical Regression: Scenario C (Override Added) | Historical evaluation completed under Job Level default | HR Admin assigns an individual override | Historical evaluation scores/snapshots unchanged; future due date updated. |
| **TC24** | Historical Regression: Scenario D (Override Removed) | Historical evaluation completed under individual override | HR Admin removes override | Historical evaluations unchanged; effective cadence reverts to job level default; future due date updated. |
| **TC25** | Historical Regression: Scenario E (System Default Changed) | Employee relies on system fallback; system default changed from Annual to Semi-Annual | Query employee and historical evaluations | Historical evaluations unchanged; future due date updated to match new system default. |
| **TC26** | Concurrency: Override vs Publish | Concurrent request 1: `PATCH employee override`; concurrent request 2: `publishEvaluation` | Execute both concurrently on same employee | Row-level locking prevents lost updates; final `last_evaluation_completed_at` and `next_review_due_date` are mathematically consistent. |
| **TC27** | Concurrency: Bulk Evaluation Trigger | Two concurrent requests attempting to create individual evaluation for same employee | Trigger both requests simultaneously | Exactly one evaluation cycle is created; second request detects conflict `EVALUATION_ALREADY_OPEN` without duplicate inserts. |
| **TC28** | Frontend: Review Due Dashboard View & Filters | User visits `/admin/cycles/review-due` | Toggle filters (Status: Overdue, Team: Team A, Cadence: Quarterly) | Table updates to display matching employees; Manager cannot select teams outside managed scope. |
| **TC29** | Frontend: Multi-Select & Selection Counter | Review Due Dashboard loaded | Select multiple rows, click "Select all visible" | Counter displays exact number selected; "Tạo Evaluation" button activates. Empty selection disables action. |
| **TC30** | Frontend: Bulk Trigger Modal & Warning Display | Selected employee has `BATCH_CYCLE_UPCOMING` warning | User clicks "Tạo Evaluation" | Confirmation modal displays inline warning with cycle name and scheduled date, allowing user to confirm individual review creation. |
| **TC31** | Frontend: No Ranking Verification | Review Due Dashboard renders | Inspect columns, sorting options, and cards | No score sorting, no rank column, no top/bottom badges, no percentile displays. |
| **TC32** | Frontend: Cadence Management CRUD | User navigates to `/admin/review-cadences` | Create, edit, and delete cadences | Form validates required fields and positive integer interval; deleting cadence in use renders friendly 409 conflict dialog. |

## Inputs Reviewed

- Test matrices from prompt, LLD §14.1, RBAC matrix, and historical regression scenarios.

## Actions and Evidence

- Defined 32 test cases spanning unit, integration, RBAC, regression, concurrency, and UI flows.

## Changes Made

- Documented test cases.

## Decisions and Rationale

- Structured test cases to cover every requirement from Definition of Done.

## Risks / Blockers

- None.

## Next Step

- Step 6: Implement
