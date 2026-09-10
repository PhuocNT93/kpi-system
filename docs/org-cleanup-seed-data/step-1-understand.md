# Step 1: Understand

Status: produced during this step

## Deliverable

## Task Understanding

### Goal
Standardize and eliminate duplicates in Organization master data across database migrations and seed scripts:
1. Consolidate duplicate Engineering departments (`DEPT-ENG` vs `ENG`) into a single canonical active department `DEPT-ENG`.
2. Eliminate duplicate and lowercase roles (`role-ba`, `role-qa`, `role-se`, `DEV-NX`) by safely re-linking references to canonical uppercase roles (`ROLE-BA`, `ROLE-QA`, `ROLE-SWE`) and removing redundant records.
3. Standardize Job Levels strictly to the 5 requested levels: `Fresher` (Rank 1), `Junior` (Rank 2), `Middle` (Rank 3), `Senior` (Rank 4), `Principal` (Rank 5), safely remapping all existing employee assignments before purging legacy levels.

### Expected Behavior
- When navigating to **Organization Management > Org Structure**:
  - There is only one Engineering department: Code `DEPT-ENG`, Name `Engineering`, Status `Active`.
  - All Engineering teams (Platform Team, Frontend Team, Backend Team, etc.) appear under this single department.
- When navigating to **Organization Management > Job Architecture**:
  - **Job Roles**: Only unique, standard uppercase roles are displayed (`ROLE-SWE`, `ROLE-SWM`, `ROLE-BA`, `ROLE-QA`, `ROLE-PM`, `ROLE-DESIGNER`, `ROLE-HR`, `ROLE-ACCOUNTANT`). No duplicate lowercase or test roles (`role-ba`, `role-qa`, `role-se`, `DEV-NX`).
  - **Job Levels**: Exactly 5 levels displayed, ordered by rank:
    1. Fresher (Rank 1)
    2. Junior (Rank 2)
    3. Middle (Rank 3)
    4. Senior (Rank 4)
    5. Principal (Rank 5)
- When running `npm run seed` or running migrations on fresh or existing databases (including Neon develop), the database is populated with and migrated to this clean structure without foreign key violations.

### Acceptance Criteria
1. **AC1 (Department Deduplication)**: Any team or employee pointing to `ENG` is re-linked to `DEPT-ENG`. Department `ENG` is deleted. Department `DEPT-ENG` has `active = true`.
2. **AC2 (Role Deduplication)**: Any employee, assignment, user_role, or role_permission referencing `role-ba`, `role-qa`, `role-se`, or `DEV-NX` is re-linked to `ROLE-BA`, `ROLE-QA`, `ROLE-SWE` respectively. Lowercase and test roles are deleted.
3. **AC3 (Job Level Standardization)**: The `job_level` table contains exactly 5 active levels: `Fresher` (Rank 1), `Junior` (Rank 2), `Middle` (Rank 3), `Senior` (Rank 4), `Principal` (Rank 5). Existing employee assignments are migrated to their closest corresponding tier before legacy levels are deleted.
4. **AC4 (Seed & Migration Integrity)**: Database migration runs cleanly via `npm run migrate:up`. `organization.seed.ts` and `evaluation-cycle.seed.ts` insert and maintain only the standardized master data. All backend tests pass (`npm test`) without breaking existing functionality.

### Out of Scope
- Adding new UI screens or altering the layout of Organization Management tabs.
- Modifying employee evaluation workflows or scoring formulas beyond maintaining valid foreign keys.
- Changing authorization/system roles (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN`).

### Business Rules Involved
- **Code Uniqueness**: Organization codes (`department.code`, `role.code`, `job_level.code`) must be unique.
- **Referential Integrity**: Foreign keys in `team`, `employee`, `employee_assignment`, `user_role`, and `role_permission` must never dangle or cause foreign key constraint failures during data cleanup.
- **Job Level Hierarchy**: `rank` defines the seniority order (1 = lowest, 5 = highest).

### Open Questions / Conflicts
- None. Requirements are clear and validated against the database schema and user-provided screenshots.

## Inputs Reviewed
- User screenshots of Org Structure and Job Architecture tabs.
- Existing migrations: `1724500000007_fix_employee_columns_and_seed.ts`.
- Seed files: `organization.seed.ts`, `evaluation-cycle.seed.ts`, `iam.seed.ts`.
- Database foreign key constraints.

## Actions and Evidence
- Queried local database tables `department`, `role`, `job_level` and foreign key dependencies.
- Verified that `role` table stores both system roles and job roles, and that duplicates stem from case-sensitive `code` entries.

## Decisions and Rationale
- Standardize department code to `DEPT-ENG` to maintain consistency with `DEPT-BOD`, `DEPT-EXEC`, `DEPT-PROD`, `DEPT-FIN`, `DEPT-HR`, `DEPT-OPS`.
- Standardize job level codes to `LVL-FRE`, `LVL-JR`, `LVL-MID`, `LVL-SR`, `LVL-PRN` with ranks 1..5 to align with standard naming conventions.
- Implement cleanup as both an idempotent migration (to update existing databases) and an update to seed files (for fresh seeds).

## Risks / Blockers
- Foreign key constraints could fail if deletion order is wrong. Mitigated by re-mapping foreign keys prior to executing DELETE statements within a single transaction.

## Next Step
- Proceed to Step 2 - Architecture Review upon user approval.
