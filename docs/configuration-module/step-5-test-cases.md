# Step 5: Define Test Cases

Status: reconstructed from approved step 5

## Deliverable

## Test Cases

| ID | Category | Scenario | Inputs | Expected Outcome |
| --- | --- | --- | --- | --- |
| `TC-CFG-01` | Criterion & Version | Create Criterion & Version | Code: `ON_TIME_COMPLETION`, Weight: 25, Unit: `%` | Criterion & draft version created with status `DRAFT`, `version_no: 1`. |
| `TC-CFG-02` | Criterion Immutability | Mutate Published Version | Attempt `PUT` on published criterion version | Returns `409 Conflict` or `422 Unprocessable Entity` (`PUBLISHED_CONFIGURATION_IMMUTABLE`). |
| `TC-CFG-03` | Scoring Rule | Range Threshold Validation | Valid: `[0, 70)`, `[70, 90)`, `[90, 100]`. Invalid: `[0, 75)`, `[70, 90)` | Valid passes validation; overlapping boundaries fail with `INVALID_SCORING_RULE`. |
| `TC-CFG-04` | Scoring Rule Types | Support all 5 Rule Types | `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`, `ROLE_CONDITIONAL` | All 5 schemas validate correctly against domain rules. |
| `TC-CFG-05` | Template Validation | Weight Policy Enforcement | Enabled criteria weights: 20%, 30%, 40% (Total: 90%) with policy `EXACT_100` | Validation fails with error `INVALID_WEIGHT_TOTAL` (expected 100, actual 90). |
| `TC-CFG-06` | Precedence Resolution | Resolve Layered Overrides | Base: 10%, Role SI: 15%, Team Platform: 20%, Template: 25% | Effective weight resolved is `25%` with `weight_source: "TEMPLATE_OVERRIDE"`. |
| `TC-CFG-07` | Partial Override Precedence | Resolve Base + Role + Team | Base: 10%, Role SI: 15%, Team Platform: 20% (No template override) | Effective weight resolved is `20%` with `weight_source: "TEAM_OVERRIDE"`. |
| `TC-CFG-08` | Preview Effective Config | Non-persisting Effective Preview | Post context to `/effective-configurations/preview` | Returns resolved effective configuration JSON without altering DB. |
| `TC-CFG-09` | Version Clone | Clone Template Version | Published v1 -> Clone | New draft version created with `version_no: 2`, status `DRAFT`. v1 remains immutable. |
| `TC-CFG-10` | Version Diff | Diff two Template Versions | Compare v1 (weight: 25%) vs v2 (weight: 30%) | Diff output lists `changed` criterion with `weight: { from: 25, to: 30 }`. |
| `TC-CFG-11` | Snapshot Generation | Generate Complete Snapshot | Published Template v1 -> `/snapshot` | Returns complete JSON snapshot containing criteria, versions, rules, levels, weights, workflow config. |
| `TC-CFG-12` | Workflow Validation | Workflow Graph Validation | Valid graph vs unreachable state graph | Unreachable state fails validation with `INVALID_WORKFLOW`. |
| `TC-CFG-13` | Audit Logging | Audit trail verification | Perform publish action | Append-only audit record created in `configuration_audit_logs` with action `PUBLISH`. |
| `TC-CFG-14` | Optimistic Concurrency | Concurrent Draft Edit | Edit draft with outdated `version` | Returns `409 Conflict` (`VERSION_MISMATCH`). |

## Inputs Reviewed
- Requirements and edge cases.

## Actions and Evidence
- Defined test cases matrix.

## Changes Made
- None.

## Decisions and Rationale
- Write Vitest tests verifying all listed scenarios.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
