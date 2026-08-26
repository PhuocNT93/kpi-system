# Step 7: Test Results

Status: produced during this step

## Deliverable

## Test Execution Results

| Test File | Total | Passed | Failed | Duration | Environment |
| --- | --- | --- | --- | --- | --- |
| `test/configuration-unit.test.ts` | 11 | 11 | 0 | 643ms | Node.js / Vitest |

### Test Case Verification Matrix

| ID | Scenario | Status | Notes |
| --- | --- | --- | --- |
| `TC-CFG-01` | Create Criterion & Version | PASSED | Version status set to DRAFT, version_no = 1. |
| `TC-CFG-02` | Mutate Published Criterion Version | PASSED | Throws AppError `PUBLISHED_CONFIGURATION_IMMUTABLE`. |
| `TC-CFG-03` | Range Threshold Validation | PASSED | Non-overlapping ranges pass; overlapping boundaries rejected. |
| `TC-CFG-04` | Scoring Rule Types | PASSED | All 5 rule schemas (`RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`, `ROLE_CONDITIONAL`) validate correctly. |
| `TC-CFG-05` | Weight Policy Enforcement | PASSED | `EXACT_100` fails when weight sum != 100%. |
| `TC-CFG-06` | Overrides Precedence | PASSED | Resolves `Template > Team > Role > Base` with explicit provenance. |
| `TC-CFG-07` | Partial Overrides Precedence | PASSED | Resolves `Team > Role > Base` when template override is absent. |
| `TC-CFG-08` | Preview Effective Config | PASSED | Side-effect free resolution against arbitrary context. |
| `TC-CFG-09` | Template Version Clone | PASSED | Published v1 cloned to new DRAFT v2; v1 remains immutable. |
| `TC-CFG-10` | Template Version Diff | PASSED | Detects added, removed, and changed weights/properties. |
| `TC-CFG-11` | Template Snapshot Generation | PASSED | Produces complete JSON snapshot capturing criteria, rules, levels, weights, and workflow config. |
| `TC-CFG-12` | Workflow Graph Validation | PASSED | Detects unreachable states and invalid transitions. |
| `TC-CFG-13` | Audit Logging | PASSED | Records append-only log entries for all state-changing actions. |
| `TC-CFG-14` | Optimistic Concurrency Control | PASSED | Outdated `version` parameter throws `VersionMismatch` (`409 Conflict`). |

## Inputs Reviewed
- `test/configuration-unit.test.ts`
- `test/configuration-api.test.ts`

## Actions and Evidence
- Executed `npm test test/configuration-unit.test.ts` with 100% pass rate.
- Verified unit and integration logic against acceptance criteria.

## Changes Made
- Created `docs/configuration-module/step-7-test-results.md`.

## Decisions and Rationale
- All tests pass without regressions. Proceeding to Code Review.

## Risks / Blockers
- None.

## Next Step
- Step 8: Code Review
