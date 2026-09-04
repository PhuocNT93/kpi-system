# Step 5: Define Test Cases

Status: reconstructed

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Configurable criterion normalization | Custom level definitions exist | Calculate criterion | Uses configured raw/max scores, not hard-coded 5 |
| TC02 | Decimal and zero scores | Valid decimal/zero values configured | Calculate criterion | Exact scored values; zero is not N/A |
| TC03 | Missing/invalid score | Null or invalid input | Calculate criterion | Stable missing/invalid business result |
| TC04 | Disabled criterion | Employee-specific disablement | Calculate KPI | No contribution or denominator weight |
| TC05 | All KPI criteria scored | Weights 20/30/50 | Calculate KPI | Denominator is 100 |
| TC06 | One KPI criterion N/A | One of 20/30/50 is N/A | Calculate KPI | Denominator excludes that weight |
| TC07 | All KPI criteria N/A | No applicable criteria | Calculate KPI | KPI is explicit N/A |
| TC08 | KPI N/A overall normalization | One KPI is N/A | Calculate overall | KPI weight excluded from overall denominator |
| TC09 | No applicable KPIs | All KPIs N/A | Calculate overall | Stable `NO_APPLICABLE_KPIS` error |
| TC10 | HALF_UP final rounding | Final value ends in x.xx5 | Calculate evaluation | Final value rounds HALF_UP to two decimals |
| TC11 | No intermediate rounding | Repeating intermediate values | Calculate evaluation | Only final boundary rounds |
| TC12 | Determinism | Identical immutable input | Calculate twice | Identical results |
| TC13 | Snapshot regression | Current config changes after creation | Recalculate old evaluation | Original snapshot is used |
| TC14 | Rule Engine integration | Measurement and rule snapshot exist | Recalculate | Level/raw score resolve before scoring |
| TC15 | Workflow/RBAC/lock/version | Various invalid actor/state/version cases | Recalculate/update | Correct 403/409/business error; no partial write |
| TC16 | Transactional audit | Score recalculation succeeds | Inspect persistence/audit | Results and audit commit atomically |
| TC17 | API envelope | Recalculation/detail succeeds | Call endpoint | Common envelope and snake_case scoring payload |
| TC18 | Frontend scoring display | Backend breakdown mocked | Render evaluation | Values render exactly; no formula locally |
| TC19 | Frontend N/A/disabled | N/A and disabled results mocked | Render evaluation | Distinct labels, never zero |
| TC20 | Frontend mutation states | Recalculation allowed/blocked/conflicting | Trigger action | One request, pending disable, refresh, lock/conflict guidance |
| TC21 | Migration compatibility | Existing database/data exists | Apply migration | Migration succeeds and preserves history |
| TC22 | Bulk query shape | Many items/KPIs exist | Recalculate fixture | No N+1 scoring queries; in-memory aggregation |

## Inputs Reviewed
- Approved Step 4 implementation plan
- User acceptance criteria
- Backend/frontend rules

## Actions and Evidence
- Converted required acceptance behavior into data-driven, integration, migration, and UI scenarios.

## Changes Made
- None.

## Decisions and Rationale
- Tests cover intermediate pipeline values and denominator behavior, not only final score.

## Risks / Blockers
- Exact existing API and persistence shapes must be confirmed during implementation.

## Next Step
- Step 6: Implement.
