# Step 6: Implementation

Status: produced during this step

## Deliverable

### Summary of Changes

1. **`backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`**:
   - Query `DEPT-ENG` department specifically by `code = 'DEPT-ENG'` rather than using `SELECT ... LIMIT 1`.
   - Purged obsolete departments (such as `Solutions` / `DEPT-6610`), remapping all foreign key references in `employee` and `employee_assignment` first.
   - Standardized team codes and names to `'ALLEGRO-NX'` (`'ALLEGRO NX'`) and `'MARITIME-SOL'` (`'Maritime Solutions'`), and linked them directly to `DEPT-ENG`.
   - Updated employee seeding (manager + 19 members) to explicitly populate and update `department_id` pointing to `DEPT-ENG`.
   - Added Step 8 to seed the custom evaluation formula for `ALLEGRO-NX` team with `is_custom_override: true`, 4 components (Performance 60%, Capability 5%, Contribution 15%, Behavior 20%), and 5.0 scale.

2. **`backend/src/modules/organization/infrastructure/seed/organization.seed.ts`**:
   - Replaced mock teams under `DEPT-ENG` (`TEAM-BACKEND`, `TEAM-FRONTEND`, etc.) with `ALLEGRO-NX` and `MARITIME-SOL`, preventing mock teams from being restored when `seed:iam` runs.

3. **`frontend/src/features/organization/components/OrgStructureTab.tsx`**:
   - Removed hardcoded local UUID `d1000000-0000-4000-8000-000000000001` from initial state.
   - Added `useEffect` hook to dynamically find `DEPT-ENG` and add it to `expandedDepts` on data load.

4. **`docs/fix-server-seed-data-sync/frontend-user-guide.md`**:
   - Documented frontend user behavior, URLs, verification steps, and prerequisites.

## Inputs Reviewed
- Implementation plan from Step 4.
- Acceptance criteria from Step 1.

## Actions and Evidence
- Ran `node src/modules/configuration/infrastructure/seed/seed-real-members.mjs`.
- Verified local DB output: exactly 8 standard departments, 2 teams under `DEPT-ENG`, 20 employees under `DEPT-ENG`, and 1 custom formula for `ALLEGRO-NX`.

## Changes Made
- `backend/src/modules/configuration/infrastructure/seed/seed-real-members.mjs`
- `backend/src/modules/organization/infrastructure/seed/organization.seed.ts`
- `frontend/src/features/organization/components/OrgStructureTab.tsx`
- `docs/fix-server-seed-data-sync/frontend-user-guide.md`

## Decisions and Rationale
- Remapping all foreign keys before deleting `DEPT-6610` ensures transactional safety and zero constraint violations.

## Risks / Blockers
- None.

## Next Step
- Step 7: Test
