# Step 5: Test Cases

Status: reconstructed from approved response

## Deliverable
## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC-CYC-01 | List evaluation cycles | User is HR/Admin | Navigate to `/admin/cycles` | Evaluation cycle table renders with search, filters (Status, Template, Team), and contextual actions based on `allowedActions`. |
| TC-CYC-02 | Form field validation | Navigate to `/admin/cycles/new` | Leave `code`, `name`, `templateVersionId`, or dates empty and click `Save Draft` | Immediate inline validation error messages highlight required fields; API call is prevented. |
| TC-CYC-03 | Date range validation | Creating or editing cycle | Set `endDate` earlier than `startDate` | Form displays error: `"End date must be after start date"`; submission blocked. |
| TC-CYC-04 | Successful draft creation | Valid form data provided | Click `Save Draft` | `POST /evaluation-cycles` executed; success banner displayed; user navigated to detail screen showing status `DRAFT`. |
| TC-CYC-05 | Employee scope preview | On Cycle Detail screen (DRAFT) | View Scope Preview card | Displays employee count breakdown by team and role fetched via `GET /evaluation-cycles/{id}/scope-preview`. |
| TC-CYC-06 | Open Cycle Confirmation | On Cycle Detail screen with `OPEN` in `allowedActions` | Click `Open Cycle` CTA | Modal opens detailing cycle scope, total target evaluations, and snapshot disclaimers (team/role/manager & template rules frozen). |
| TC-CYC-07 | Execute Open Cycle & Progress | Confirmation modal open | Click `Confirm Open` | `POST /evaluation-cycles/{id}/open` executes; loading progress banner displays; status updates to `OPEN` on success with audit log entry. |
| TC-CYC-08 | Read-only state when LOCKED | Cycle status is `LOCKED` | View Cycle Detail screen | All edit, open, and configuration controls are globally disabled/read-only; global ReadOnlyBanner is displayed explaining snapshot lock. |
| TC-CYC-09 | Permission-aware UI action rendering | User lacks `EDIT` or `OPEN` in `allowedActions` | View Cycle List or Detail | Buttons matching unauthorized actions are hidden or disabled with contextual tooltip. |
| TC-CYC-10 | Partial failure error mapping | Backend returns structured `EVALUATION_GENERATION_PARTIAL_FAILURE` | Trigger Open Cycle | Error alert renders error breakdown showing total created vs. failed instances with retry options. |

## Inputs Reviewed
- Implementation Plan (Step 4)
- User attachment specification & LLD requirements

## Actions and Evidence
- Defined 10 comprehensive test scenarios covering happy paths, validations, state constraints, permissions, error mapping, and locked read-only behavior.

## Decisions and Rationale
- Ensure test coverage maps directly to user acceptance criteria.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
