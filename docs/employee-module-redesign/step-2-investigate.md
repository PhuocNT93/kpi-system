# Step 2: Investigate

Status: produced during step 2

## Deliverable
Investigated existing database migrations and module structure:
- `1724500000001_init_database_schema.ts` currently contains `employee_team_history` which lacks department, job_level, and manager snapshot capabilities.
- Identified need for migration creating `employee_assignment` and adding `version` to `employee`.
- Identified module layout under `backend/src/modules/employee/`.
