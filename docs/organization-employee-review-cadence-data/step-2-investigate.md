# Step 2: Investigate

Status: produced during this step

## Deliverable

## Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- `docs/FRONTEND_REACT_RULES.md`

Relevant Modules and Files:
- `employee` table in PostgreSQL
- `review_cadence` table in PostgreSQL
- `backend/src/modules/employee/api/employee.controller.ts`
- `backend/src/modules/employee/application/employee-cadence.service.ts`
- `frontend/src/features/organization/components/EmployeeTable.tsx`
- `frontend/src/features/organization/domain/organization-mappers.ts`

Existing Implementation:
- Columns in `employee`: `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`, `review_cadence_override_id`.
- Table `review_cadence` has system default `SEMI_ANNUAL` (6 months).
- All 20 employees had NULL for `review_cadence` (and null dates except 193613).
- Frontend `formatCadence` renders badge for `MONTHLY`, `QUARTERLY`, `BIANNUALLY`, `ANNUALLY`.
- Frontend `formatMonthYear` renders timestamps as `Mon YYYY`.

Existing Tests:
- `backend/test/review-due-scheduling.test.ts`
- `backend/src/modules/review-cadence/domain/review-due-calculator.test.ts`

Patterns to Reuse:
- Transactional Node.js seed script with `pg` Pool using parameterized SQL queries.
- Support for `BIANNUALLY` and `ANNUALLY` in `calculateNextReviewDate`.

## Inputs Reviewed
- Database schema via `psql \d employee` and `\d review_cadence`
- Frontend components `EmployeeTable.tsx` and `EmployeeFormModal.tsx`

## Actions and Evidence
- Executed database inspections confirming current state of all 20 employee records

## Changes Made
- None in this step

## Decisions and Rationale
- Ensure both database columns (`review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`) and FK `review_cadence_override_id` are populated for full forward-compatibility.

## Risks / Blockers
- None

## Next Step
- Step 3: Impact Analysis
