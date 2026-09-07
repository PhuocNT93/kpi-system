# Step 2: Investigate

Status: produced during this step

## Deliverable
### Investigation

Relevant Documents:
- `docs/LLD_Employee_Performance_Evaluation_System.md` (Sections 10.9 & 21.1)
- `docs/BACKEND_NODE_RULES.md`

Relevant Modules and Files:
- `backend/migrations/`
- `backend/src/modules/organization/`
- `backend/src/modules/configuration/`
- `backend/src/modules/employee/`
- `backend/src/modules/evaluation/`
- `backend/src/shared/auth/actor-context.ts`

Existing Implementation:
- Master data entities store single string name/description columns in SQL tables.
- Evaluation items snapshot criterion names as plain text strings.

Existing Tests:
- `backend/src/shared/database/migrations.test.ts`
- `backend/test/app.test.ts`
- `backend/test/configuration-api.test.ts`

Patterns to Reuse:
- PostgreSQL query runner and transaction helper in `backend/src/shared/database/`.
- Express controller / service / repository pattern across existing modules.

## Inputs Reviewed
- Database schema files, route handlers, evaluation services.

## Actions and Evidence
- Inspected existing database migrations and repository code for organization and configuration modules.

## Decisions and Rationale
- Decided to create a standalone `i18n` module for generic translation management to ensure separation of concerns.

## Risks / Blockers
- None.

## Next Step
- Step 3: Impact Analysis
