# Step 2: Investigate

Status: reconstructed from earlier approved response

## Deliverable

## Investigation Findings

### Files Examined
- `backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`:
  - Line 117: `SELECT department_id FROM department LIMIT 1` returns arbitrary first department. On Neon, returns `DEPT-BOD`, causing `ALLEGRO-NX` and `MARITIME-SOL` to attach to Board of Directors.
  - Lines 134, 149: Names set to `'ALLEGRO NX Part'` and `'Maritime Solutions Part'`, diverging from local.
  - Lines 169-183, 233-270: `department_id` omitted during INSERT and UPDATE on `employee`, leaving employees in obsolete `Solutions` department (`DEPT-6610`).
  - Obsolete department `Solutions` (`DEPT-6610`) not purged.
  - Custom formula for `ALLEGRO-NX` not seeded.
- `backend/src/modules/organization/infrastructure/seed/organization.seed.ts`:
  - Lines 28-35: 7 mock teams under `DEPT-ENG`. Should be updated to `ALLEGRO-NX` and `MARITIME-SOL`.
- `frontend/src/features/organization/components/OrgStructureTab.tsx`:
  - Line 27: `d1000000-0000-4000-8000-000000000001` hardcoded as default expanded department ID.

### Existing Behavior
- On Neon server: 2 teams under Board of Directors, 20 members under Solutions, ALLEGRO NX shows "Mặc định", and Engineering not expanded by default.

### Dependencies and Integration Points
- Tables: `department`, `team`, `employee`, `employee_assignment`, `team_evaluation_formula`.
- Foreign keys: `employee.team_id`, `employee.department_id`, `employee_assignment.team_id`, `team_evaluation_formula.team_id`.
- APIs: `/api/org/departments`, `/api/teams`, `/api/employees`, `/api/org/formula/summary`.

### Test Coverage
- Backend: 73 test files passed (794 tests).
- Backend & Frontend: typecheck and lint pass with 0 errors.

### Constraints and Risks
- Ensure foreign key references are redirected before deleting obsolete department `DEPT-6610`.
- Maintain idempotency so script can run repeatedly without errors.

## Inputs Reviewed
- `seed-real-members.mjs`
- `organization.seed.ts`
- `OrgStructureTab.tsx`
- PostgreSQL schema constraints on `team`, `department`, `employee`

## Actions and Evidence
- Verified queries against local database and remote server API endpoints.
- Ran backend test suite, lint, and typecheck to verify baseline health.

## Changes Made
- None.

## Decisions and Rationale
- Fix root cause in seed script and frontend auto-expansion logic.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
