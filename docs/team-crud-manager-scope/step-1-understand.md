# Step 1: Understand

Status: produced during this step

## Deliverable

### Goal
Implement the complete Team Management feature for the Employee Performance Evaluation System. This includes:
1. Full Team CRUD with domain validation (department FK, code uniqueness, active-member guard, immutable code)
2. `TeamScopeService` enforcing Manager ↔ Team scope (Managers can only access their own team)
3. Manager → Employee relationship validation when assigning `manager_id` (same-team check, inactive guard, self-assignment guard, circular-hierarchy guard)
4. Scoped API list/get for teams and employees by role
5. Proper audit logging for all mutations (TEAM_CREATED, TEAM_UPDATED, TEAM_DEACTIVATED, EMPLOYEE_MANAGER_CHANGED)
6. Frontend React feature (organization/teams) with TanStack Query, typed API client, and role-appropriate UI states

### Expected Behavior
- `POST /api/teams` — HR/Admin creates a team; validates department exists and is active; code is unique; returns `201` with `Location`
- `GET /api/teams` — scoped: HR/Admin sees all; Manager sees only their team(s); Employee sees org reference only
- `GET /api/teams/:team_id` — same scope rules; returns enriched object with `department`, `managers`, `member_count`
- `PATCH /api/teams/:team_id` — HR/Admin; validates new department if provided; rejects department-move if active employees have mismatched manager assignments
- `POST /api/teams/:team_id/deactivate` — HR/Admin; rejects if team has active employees (`TEAM_HAS_ACTIVE_MEMBERS`)
- When updating `employee.manager_id`: validates same team, active status, non-self, has manager role, no circular chain
- Manager can only access teams/employees within their assigned team scope (JWT `managedTeamIds`)
- Cross-team access returns `403 TEAM_SCOPE_FORBIDDEN`
- All mutations append audit records in the same transaction

### Acceptance Criteria
1. Team CRUD endpoints pass all positive and RBAC-negative test cases (Cases 1–12 in the requirement)
2. `POST /api/teams` rejects missing `department_id`, non-existent department, inactive department, duplicate code
3. `PATCH /api/teams/:team_id` rejects department move if it would invalidate manager assignments
4. `POST /api/teams/:team_id/deactivate` rejects when team has active employees
5. Assigning `manager_id` validates: same team, ACTIVE status, not self, MANAGER role, no circular chain
6. Manager `GET /api/teams` returns only own team(s) — DB-level scope filter, not client-side
7. `GET /api/teams/:team_id` by Manager for foreign team returns `403 TEAM_SCOPE_FORBIDDEN`
8. Audit records are written within the same DB transaction for every mutation
9. Frontend renders loading, empty, error, forbidden, and read-only states
10. TypeScript check and lint pass; existing tests remain green

### Out of Scope
- A dedicated `team_manager` junction table (not needed; manager relationship is `employee.team_id` + `user_account.access_role = MANAGER`)
- Cross-team manager support (MVP: one manager manages employees within their assigned team)
- Phase 2 features (peer review, calibration, BI integration)
- Real-time notifications for manager reassignment
- Multi-organization support

### Business Rules Involved
- Organization hierarchy: Organization → Department → Team → Employee
- `TEAM.department_id → DEPARTMENT.department_id` (FK, active department required)
- `EMPLOYEE.team_id → TEAM.team_id`
- `EMPLOYEE.manager_id → EMPLOYEE.employee_id` (self-referencing)
- Manager scope = `employee.team_id` of the actor who has `access_role = MANAGER`
- Manager-Employee invariant: `manager.team_id == employee.team_id` (MVP)
- `employee.manager_id` change must be validated for: existence, ACTIVE status, MANAGER role, same team, non-self, no circular hierarchy
- If Manager loses their team assignment while they have managed employees → reject with `MANAGER_HAS_MANAGED_EMPLOYEES`
- Soft-delete (deactivate) preferred over hard-delete; physical delete never done
- Audit log is write-once (INSERT-only) in the same transaction as the business mutation
- Actor identity comes from JWT; never from request body
- `code` field on team is immutable after creation (per BACKEND_NODE_RULES §3)

### Open Questions / Conflicts
1. **MANAGER role auto-derivation (LLD §10.8)**: LLD says MANAGER role is auto-inferred if `employee_id` appears as `manager_id` in another employee's record — it does NOT require `user_account.access_role = MANAGER` to be set manually. The JWT `managedTeamIds` must therefore be dynamically derived at login based on DB state. The existing `authorizer.service.ts` already checks `actor.managedTeamIds`. This implementation will populate `managedTeamIds` in the JWT from the actor's `team_id` (the team they belong to), which serves as the scope for their managed employees. **No conflict with LLD; clarification only.**
2. **`DELETE /teams/:team_id` vs `POST /teams/:team_id/deactivate`**: The existing codebase uses `POST /teams/:teamId/deactivate` pattern (consistent with department, role, job-level). This implementation follows the same pattern. **No conflict.**
3. **`patchApi` missing in frontend**: The shared API client has `getApi`, `postApi`, `putApi`, `deleteApi` but no `patchApi`. `PATCH /teams/:team_id` requires it. A `patchApi` utility must be added to the shared client. **This is an additive non-breaking change.**

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md` (full)
- `docs/BACKEND_NODE_RULES.md` (full)
- `docs/FRONTEND_REACT_RULES.md` (full)
- `backend/src/modules/employee/` (all files)
- `backend/src/shared/auth/` (all files)
- `backend/src/api/` (all files)
- `backend/migrations/` (all files)
- `frontend/src/shared/api/` (all files)
- `frontend/src/features/iam/` (all files)
- `backend/test/employee-api.test.ts`

## Actions and Evidence
Read all relevant files using view_file tool. No commands executed at this step.

## Changes Made
None (Step 1 is analysis only)

## Decisions and Rationale
- Will create a dedicated `TeamScopeService` in the employee module's application layer (reusing existing module boundary)
- Will NOT create a new `team_manager` table (LLD says one manager per team, existing schema supports it)
- Will add audit records to the existing `audit_log` table using direct pool queries in transactions (same pattern as rest of codebase)
- Will enhance existing `EmployeeController` team methods (currently raw SQL without RBAC or domain validation) to use proper application services
- Frontend will use `organization/teams` feature directory following the `iam` feature structure exactly

## Risks / Blockers
- The existing `createTeam`, `getTeams`, `getTeamById`, `updateTeam`, `deactivateTeam` methods in `EmployeeController` are bare-minimum stubs without RBAC, scope validation, or audit. This feature significantly upgrades them.
- The `patchApi` utility is missing from the frontend shared client; needs to be added.
- The `managedTeamIds` JWT claim must be populated by the auth module; currently it may be empty for MANAGERs. The scope service must handle the case where `managedTeamIds` is derived from the actor's own `team_id`.

## Next Step
Step 2 – Investigate
