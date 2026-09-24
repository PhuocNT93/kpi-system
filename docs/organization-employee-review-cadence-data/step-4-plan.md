# Step 4: Plan

Status: produced during this step

## Deliverable

1. Create dedicated seed script `backend/src/modules/configuration/infrastructure/seed/seed-employee-review-cadence.mjs`.
2. Insert standard cadence codes into `review_cadence` (`MONTHLY`, `QUARTERLY`, `ANNUALLY`) if not present.
3. Update all 20 employees with the approved `review_cadence`, `review_cadence_months`, `last_evaluation_completed_at`, `next_review_due_date`, and `review_cadence_override_id`.
4. Update `calculateNextReviewDate` in `employee.controller.ts` to accept `BIANNUALLY` and `ANNUALLY`.
5. Add `seed:cadence` npm script to `backend/package.json` and chain it into the main `seed` command.
6. Verify database records via query and ensure frontend/backend typechecks pass cleanly.

## Inputs Reviewed
- Database schema and requirements
- User-approved 20-employee dataset

## Actions and Evidence
- Structured implementation steps into discrete, verifiable actions

## Changes Made
- None in this step

## Decisions and Rationale
- Idempotent script allows re-running at any time without side effects

## Risks / Blockers
- None

## Next Step
- Step 5: Test Cases
