# Step 1: Understand

Status: produced during this step

## Deliverable
## Task Understanding

Goal: Implement UI and API for "Team Reviews" (Manager evaluation flow) across Frontend and Backend.

Expected Behavior:
1. Backend:
   - Provide endpoint `GET /api/evaluations/team` for Managers (and Admins) to fetch team members' evaluations across cycles.
   - Support viewing detail, scoring/feedback, saving manager draft, and submitting/approving manager reviews.
   - Enforce RBAC & manager scope (managers only evaluate their direct/team reports; HR_ADMIN/SYSTEM_ADMIN can view/manage according to policy).
2. Frontend:
   - Route `/admin/team-evaluations` linked from Sidebar "Team Reviews" menu.
   - List evaluations of team members with status filters, cycle filters, and summary progress indicators.
   - Review detail / scoring interface for managers to review self-evaluations, enter manager ratings/feedback, and approve/submit reviews.

Acceptance Criteria:
1. Manager can access "Team Reviews" page and view list of evaluations for their subordinates.
2. Manager can filter by cycle, status (`SUBMITTED`, `MANAGER_REVIEW`, `APPROVED`, etc.).
3. Manager can view employee's self-evaluation, score criteria, enter comments, save draft, and submit manager evaluation.
4. Backend verifies manager authority over the target evaluation.
5. Unauthorized users cannot access or edit other teams' reviews.

Out of Scope:
- Multi-tier peer review / calibration committee approval workflow.
- Exporting team review PDF/Excel reports.

Business Rules Involved:
- Access role `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN` permitted. `EMPLOYEE` forbidden from accessing team evaluations endpoint.
- Manager can only review evaluations of employees under their management hierarchy.
- Manager review transitions status from `SUBMITTED` / `MANAGER_REVIEW` to `APPROVED` (or final state per LLD).

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- Existing evaluation module files

## Actions and Evidence
- Analyzed LLD and existing code base structure.

## Changes Made
- None.

## Decisions and Rationale
- Standardize Team Reviews under `/admin/team-evaluations` route.

## Risks / Blockers
- None.

## Next Step
- Step 2
