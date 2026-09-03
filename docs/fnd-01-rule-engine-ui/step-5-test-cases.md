# Step 5: Define Test Cases

Status: produced during this step

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | RANGE_THRESHOLD default config | Rule type changes to `RANGE_THRESHOLD` | Generate default config | Config uses backend shape `{ type: 'RANGE_THRESHOLD', ranges: [{ min, max, level }] }`; no display-only `minScore`/`levelId` fields. |
| TC02 | RANGE_THRESHOLD valid validation | Config has non-overlapping ranges with positive integer levels | Run client rule config validation | Validation returns no rule config errors. |
| TC03 | RANGE_THRESHOLD overlap validation | Config has overlapping ranges | Run client rule config validation | Returns `INVALID_RANGE`/scoring-rule error without calculating any score. |
| TC04 | RANGE_THRESHOLD min/max validation | Config has `min > max` for a closed range | Run client rule config validation | Returns field-level range error. |
| TC05 | RANGE_THRESHOLD open-ended max | Config has `max: null` on final bucket | Run validation and serialize | `null` remains `null`; UI does not clamp or convert it. |
| TC06 | INVERSE_THRESHOLD default config | Rule type changes to `INVERSE_THRESHOLD` | Generate default config | Config uses same backend range shape as range threshold with `type: 'INVERSE_THRESHOLD'`. |
| TC07 | INVERSE_THRESHOLD editing | Editor rendered with inverse config | Update a range min/max/level | `onChange` emits backend-compatible `ranges` with numeric `min`, `max`, and `level`. |
| TC08 | COUNT_THRESHOLD default config | Rule type changes to `COUNT_THRESHOLD` | Generate default config | Config uses `{ type: 'COUNT_THRESHOLD', thresholds: [...] }`; no `counts` array. |
| TC09 | COUNT_THRESHOLD duplicate validation | Config has duplicate threshold values | Run client rule config validation | Returns duplicate threshold validation error. |
| TC10 | COUNT_THRESHOLD invalid value | Config has NaN/blank/negative threshold where unsupported | Run validation | Returns threshold field error and does not silently coerce invalid input into a valid score. |
| TC11 | ORDINAL_MANUAL default config | Rule type changes to `ORDINAL_MANUAL` | Generate default config | Config uses `{ type: 'ORDINAL_MANUAL', level_labels: { ... } }` or valid empty optional shape per backend contract. |
| TC12 | ORDINAL_MANUAL label editing | Editor rendered with ordinal labels | Edit a level label | `onChange` emits `level_labels` keyed by level number/string; no scoring result is inferred. |
| TC13 | ORDINAL_MANUAL invalid labels | Config has empty label values when labels are present | Run client validation | Returns UX validation warning/error for empty displayed label. |
| TC14 | ROLE_CONDITIONAL no roles loaded | Role query has no data or errors | Render role-conditional editor | UI shows role loading/error/empty state and does not create hard-coded SI/SM branches. |
| TC15 | ROLE_CONDITIONAL add branch | Organization role list includes two job roles with `code` | Add a branch for one role | Config emits `{ branches: [{ role_code, rule }] }` with nested non-role rule config. |
| TC16 | ROLE_CONDITIONAL duplicate branch | Config already has branch for a role | Try to add/select same role again | Client validation returns duplicate role error or UI prevents duplicate selection. |
| TC17 | ROLE_CONDITIONAL missing nested rule | Branch lacks nested `rule` | Run validation | Returns missing nested rule error. |
| TC18 | ROLE_CONDITIONAL nested type restriction | Branch editor is open | Inspect nested type options | Nested editor allows `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`; does not allow nested `ROLE_CONDITIONAL`. |
| TC19 | ROLE_CONDITIONAL nested rule switch | Branch has range nested rule | Change branch nested type to count | Emits branch `rule` with `type: 'COUNT_THRESHOLD'` and `thresholds`, replacing stale range fields. |
| TC20 | Rule type switching clears stale config | Existing rule is range threshold | Change top-level type to count threshold | `onChange` emits count config only; stale `ranges` are removed. |
| TC21 | Read-only editor blocks edits | `isReadOnly` is true | Try to change rule type and fields | Inputs/buttons are disabled and `onChange` is not called. |
| TC22 | Template validation includes rule errors | Active criterion has invalid custom scoring rule | Run `validateTemplateClientSide` | Result includes scoring-rule error with criterion code/name. |
| TC23 | Template validation still validates weights | Criteria total weight is not 100 | Run `validateTemplateClientSide` | Existing `WEIGHT_TOTAL_NOT_100` behavior remains unchanged. |
| TC24 | Template validation handles optional warning | Criterion is optional | Run `validateTemplateClientSide` | Existing warning behavior remains unchanged. |
| TC25 | Wire mapper preserves scoring rule config | Backend wire template criterion has `custom_scoring_rule` using Rule Engine shape | Map wire to domain | Domain `customScoringRule.config` preserves backend-compatible config. |
| TC26 | Save mapper sends backend-compatible config | Template criterion has custom scoring rule | Save draft payload is built | Payload contains `custom_scoring_rule: { rule_type, config }` and config uses backend-compatible fields. |
| TC27 | No direct fetch in components | Rule editor needs roles | Inspect implementation/static test where practical | Components use hooks/API abstraction, not `fetch`. |
| TC28 | Backend template save preserves custom scoring rule | Backend supports template criteria custom rules | Send bulk criteria update containing `custom_scoring_rule` | Service/repository response preserves saved custom scoring rule or test identifies schema blocker. |
| TC29 | Backend scoring validator accepts Rule Engine config | Backend scoring-rule validation uses Rule Engine-compatible config | Validate a range/count/role-conditional config | Validator accepts new canonical shapes and rejects malformed canonical shapes. |
| TC30 | Published template immutability preserved | Template version is `PUBLISHED` | Attempt frontend edits or backend bulk update | UI is read-only; backend still returns `PUBLISHED_CONFIGURATION_IMMUTABLE` for updates. |
| TC31 | Backend validation error surfaced | Save/validate mutation returns API error | Trigger save/validate | UI preserves error state/message; does not show false success. |
| TC32 | Accessibility for rule editor controls | Rule editor rendered | Query by labels/roles | Main inputs/selects/buttons have accessible labels and are keyboard operable. |
| TC33 | TypeScript strict compatibility | Implementation complete | Run frontend typecheck | No TypeScript errors. |
| TC34 | Frontend lint compatibility | Implementation complete | Run frontend lint | No new lint errors in touched frontend files. |
| TC35 | Frontend test regression | Implementation complete | Run focused/new frontend tests | Rule config helper/component tests pass. |
| TC36 | Backend test regression for touched backend files | Backend alignment implemented | Run affected backend tests | Configuration/rule-engine tests pass; no regression in touched slice. |
| TC37 | Performance non-regression | Rule editor renders representative role-conditional config | Run tests/manual check | Validation is linear over config size and no scoring algorithm is executed in frontend. |
| TC38 | User guide accuracy | Implementation complete | Review `frontend-user-guide.md` | Guide covers prerequisites, startup/shutdown, URLs, validation behavior, configurable values, visible behavior, and known limitations accurately. |

## Inputs Reviewed

- Approved Step 4 plan.
- Step 3 impact analysis and accepted clarifications.
- `docs/AI_AGENT_WORKFLOW.md` Step 5 required output.
- Existing frontend/backend test stacks identified in Step 2.

## Actions and Evidence

- Defined frontend domain, component, API, validation, read-only, accessibility, backend alignment, and documentation test scenarios before implementation.
- Included tests for anti-pattern prevention: no hard-coded roles, no scoring calculation in React, no stale config fields, no direct fetch from components.
- Included backend tests only for the minimal alignment approved in Step 4.

## Changes Made

- Created `docs/fnd-01-rule-engine-ui/step-5-test-cases.md`.
- No production code or test implementation changed.

## Decisions and Rationale

- Test IDs intentionally separate domain helper tests from UI component tests so failures can point to either config shaping or rendering behavior.
- Backend persistence/validation tests are included because Step 3 found the feature may otherwise fail end-to-end.
- Read-only, backend error, and accessibility checks are included because they are mandatory frontend rules for changed workflows.

## Risks / Blockers

- Some backend persistence tests may reveal missing schema/repository support for `custom_scoring_rule`; if so, implementation should stop and report the blocker rather than silently dropping config.
- Full browser/manual responsive validation may be limited by local environment, but automated frontend tests/typecheck/lint should still run in Step 7.

## Next Step

Proceed to Step 6: Implement after user review.
