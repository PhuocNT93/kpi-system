# Step 5: Define Test Cases

Status: produced during this step

## Deliverable
## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Manager views team evaluations | User has role `MANAGER` with direct reports | `GET /v1/evaluations/team` | Returns 200 with list of team members' evaluations |
| TC02 | Employee attempts to view team evaluations | User has role `EMPLOYEE` without reports | `GET /v1/evaluations/team` | Returns 200 with empty array (or 403 if restricted) |
| TC03 | Manager views report's evaluation detail | Evaluation belongs to direct report | `GET /v1/evaluations/:id` | Returns 200 with evaluation and criteria items |
| TC04 | Manager updates score / draft items | Evaluation is in `SUBMITTED` or `OPEN` status | `PUT /v1/evaluations/:id/items` | Returns 200 and updates criteria levels & comments |
| TC05 | Manager approves evaluation | Evaluation has scores filled | `POST /v1/evaluations/:id/approve` | Returns 200, status changes to `APPROVED` |
| TC06 | Non-manager attempts to approve evaluation | User is another employee | `POST /v1/evaluations/:id/approve` | Returns 403 Forbidden |
| TC07 | Frontend Team Reviews navigation | Logged in as Manager | Click "Team Reviews" in Sidebar | Navigates to `/admin/team-evaluations` and displays table/cards of team reviews |

## Inputs Reviewed
- Test cases and functional expectations.

## Actions and Evidence
- Documented TC01-TC07 covering backend endpoints and frontend views.

## Changes Made
- None.

## Decisions and Rationale
- Ensure full coverage of authorization, happy paths, and error scenarios.

## Risks / Blockers
- None.

## Next Step
- Step 6
