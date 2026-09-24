# Step 5: Test Cases

Status: produced during this step

## Deliverable

| ID | Description | Type | Expected Result |
|---|---|---|---|
| TC-01 | Run `seed-employee-review-cadence.mjs` | Integration / DB | All 20 employee records updated with exit code 0 |
| TC-02 | Verify review_cadence non-null | DB Query | 20 / 20 employees have non-null `review_cadence` |
| TC-03 | Verify date intervals match cadence | DB Query | `next_review_due_date` equals `last_evaluation_completed_at + review_cadence_months` |
| TC-04 | Verify review_cadence_override_id FK | DB Query | All 20 employees reference valid `review_cadence_id` |
| TC-05 | Backend typecheck | Static Analysis | `npm run typecheck` exits with 0 |
| TC-06 | Backend lint | Linting | `npm run lint` exits with 0 |
| TC-07 | Frontend typecheck | Static Analysis | `npm run typecheck` exits with 0 |

## Inputs Reviewed
- Database schema and requirements
- Expected date calculations and constraints

## Actions and Evidence
- Defined test cases covering script execution, data validity, and build checks

## Changes Made
- None in this step

## Decisions and Rationale
- Comprehensive test cases ensure regression prevention across frontend, backend, and database

## Risks / Blockers
- None

## Next Step
- Step 6: Implementation
