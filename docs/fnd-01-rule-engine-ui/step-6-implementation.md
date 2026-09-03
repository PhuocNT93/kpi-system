# Step 6: Implementation

Status: produced during this step

## Deliverable

## Implementation

Changes Made:
- `frontend/src/features/templates/domain/rule-config.ts`: Added backend-compatible Rule Engine config discriminated unions, nested rule type restrictions, default config generation, config normalization, and client-side structural validation helpers.
- `frontend/src/features/templates/domain/rule-config.test.ts`: Added focused helper tests for backend-compatible defaults, open-ended range preservation, range overlap validation, duplicate count thresholds, ordinal label validation, and role-conditional duplicate role validation.
- `frontend/src/features/templates/domain/template-models.ts`: Replaced stale display-oriented rule config interfaces with backend-compatible aliases from `rule-config.ts`; `ScoringRule.config` now uses the typed Rule Engine config union.
- `frontend/src/features/templates/domain/template-mappers.ts`: Updated template validation to use the new rule config validator; updated scoring-rule wire mapping to normalize config by `rule_type`.
- `frontend/src/features/templates/domain/template-mappers.test.ts`: Added tests for backend-compatible range validation and empty role-conditional branches while preserving existing weight validation tests.
- `frontend/src/features/templates/components/ScoringRuleEditors.tsx`: Reworked the scoring rule editor to edit backend-compatible config shapes for all five rule types, including range/inverse ranges, count thresholds, ordinal labels, role-conditional branches, nested non-role rule editors, read-only behavior, validation alerts, and role options from supplied data.
- `frontend/src/features/templates/components/ScoringRuleEditors.tsx`: Fixed post-review numeric parsing so blank required numeric inputs remain invalid (`NaN`) for validation instead of silently becoming `0`.
- `frontend/src/features/templates/components/ScoringRuleEditors.test.tsx`: Added focused component tests for rule type switching, range field editing, role-conditional branch creation, nested rule type restriction, and read-only behavior.
- `frontend/src/features/templates/components/CriterionConfigDrawer.tsx`: Initialized default scoring rule config with backend-compatible defaults, passed organization role query data into the scoring rule editor, reset local drawer state when the selected criterion changes, and surfaced the inline custom-rule persistence limitation in the scoring tab.
- `frontend/src/features/templates/components/ApplicabilityEditor.tsx`: Removed hard-coded role fallback use and added loading/error/empty states for job roles.
- `frontend/src/features/templates/api/template-api.ts`: Changed template job-role lookup to `/api/org/roles` and removed mock job-role fallback from the role API path.
- `frontend/src/features/templates/api/template-api.ts`: Removed `custom_scoring_rule` from the template draft save payload until backend schema/API support is approved, avoiding a false impression that inline rule overrides persist through that endpoint.
- `backend/src/modules/configuration/domain/configuration.types.ts`: Aligned scoring-rule config types with the canonical Rule Engine config shapes.
- `backend/src/modules/configuration/application/validation/scoring-rule.validator.ts`: Replaced the stale duplicate scoring-rule validation implementation with delegation to `RuleConfigValidator` from the Rule Engine module.
- `backend/test/configuration-scoring-rule-validator.test.ts`: Added backend tests proving canonical count and role-conditional configs validate and stale count config is rejected.
- `docs/fnd-01-rule-engine-ui/frontend-user-guide.md`: Added required frontend user guide with prerequisites, startup/shutdown, URLs, validation behavior, configurable values, visible behavior, and known limitations.
- `docs/fnd-01-rule-engine-ui/step-1-understand.md`: Reconstructed the approved Step 1 artifact before implementation, per workflow artifact requirements.

Decisions Applied:
- Rule config JSON uses backend-compatible names directly (`min`, `max`, `level`, `thresholds`, `level_labels`, `role_code`, `rule`) instead of translating through stale UI-only names.
- Wire config normalization injects the discriminant `type` when backend config omits it, keeping the React editor stable while preserving backend-compatible shapes.
- `ROLE_CONDITIONAL` nested editors allow only `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, and `ORDINAL_MANUAL`.
- Role-conditional branches use organization job-role data supplied to the editor; no hard-coded SI/SM or placeholder branches are generated.
- Client-side validation remains structural/UX-only and does not calculate `resolved_level`, `raw_score`, weighted score, rankings, or evaluation outcomes.
- Backend scoring-rule validation now delegates to the canonical Rule Engine validator instead of maintaining a separate, stale contract.
- Published/read-only behavior continues through the existing `isReadOnly` prop and disables editor controls.

Deferred / Not Changed:
- Inline per-template-criterion `custom_scoring_rule` persistence was not implemented because the current backend `template_criteria` schema has no inline scoring-rule/config column. The frontend still emits `custom_scoring_rule` in the existing save payload, but the current backend template service maps that field away. Persisting inline custom rules requires an approved schema/API decision or using the existing scoring-rule reference/override model.
- Inline per-template-criterion `custom_scoring_rule` persistence was not implemented because the current backend `template_criteria` schema has no inline scoring-rule/config column. The draft save payload no longer sends `custom_scoring_rule`; the UI displays a clear limitation. Persisting inline custom rules requires an approved schema/API decision or using the existing scoring-rule reference/override model.
- No scoring/evaluation algorithm was added to React.
- No database migration was added.
- No workflow, audit, ranking, calibration, historical snapshot, or RBAC enforcement logic was changed.
- Existing team fallback mock data remains for team applicability only; hard-coded job-role fallback was removed from role loading paths used by rule configuration.

`STATUS: WAITING FOR USER REVIEW - STEP 6`

## Inputs Reviewed

- Approved Step 4 plan and Step 5 test cases.
- Backend configuration domain/repository/schema files for persistence feasibility.
- Existing frontend Template Builder components and tests.

## Actions and Evidence

- Ran focused frontend helper test after first edit:
  - Command: `cd frontend; npm test -- src/features/templates/domain/rule-config.test.ts`
  - Result: PASS, 6 tests.
- Ran frontend typecheck after wiring models/components:
  - Command: `cd frontend; npm run typecheck`
  - Result: initially failed with two local type errors, then passed after same-slice fixes.
- Ran focused frontend tests after adding component/mapper tests:
  - Command: `cd frontend; npm test -- src/features/templates/domain/rule-config.test.ts src/features/templates/domain/template-mappers.test.ts src/features/templates/components/ScoringRuleEditors.test.tsx`
  - Result: initially failed from test cleanup/isolation, then passed after adding cleanup. Final result: PASS, 3 files, 18 tests.
- Ran backend typecheck after validator/type alignment:
  - Command: `cd backend; npm run typecheck`
  - Result: PASS.
- Ran focused backend validator tests:
  - Command: `cd backend; npm test -- configuration-scoring-rule-validator.test.ts`
  - Result: PASS, 3 tests.
- Ran implementation sweep:
  - Search for stale frontend fields (`minScore`, `maxScore`, `role-si`, `role-sm`, `maxDays`, `minCount`, `maxCount`, `allowed_levels`, `conditions`, `scoring_rule_id`) in template feature found only legitimate `scoring_rule_id` mapping for criterion-version references.
  - Search for direct `fetch(` in template components found none.
- Ran diagnostics on core touched files with `get_errors`; no errors found.
- Returned from Step 8 to Step 6 and fixed review findings:
  - Injected missing `type` discriminants during config normalization.
  - Reset drawer local state when a different criterion is selected.
  - Preserved blank required numeric inputs as invalid values instead of converting them to zero.
  - Removed non-persisted `custom_scoring_rule` from template draft save payload and added a visible limitation message.
  - Added regression tests for discriminant injection and blank numeric validation.
- Post-review focused validation:
  - Command: `cd frontend; npm test -- src/features/templates/domain/rule-config.test.ts src/features/templates/domain/template-mappers.test.ts src/features/templates/components/ScoringRuleEditors.test.tsx`
  - Result: PASS, 3 files, 21 tests.
  - Command: `cd frontend; npm run typecheck`
  - Result: PASS.
  - Command: `cd frontend; npx eslint src/features/templates/domain/rule-config.ts src/features/templates/domain/rule-config.test.ts src/features/templates/components/ScoringRuleEditors.tsx src/features/templates/components/ScoringRuleEditors.test.tsx src/features/templates/components/CriterionConfigDrawer.tsx`
  - Result: PASS, no output.

## Changes Made

See deliverable section above.

## Decisions and Rationale

- The first edit targeted a small domain helper because it exposed the contract mismatch cheaply and made later UI edits testable.
- The component editor remains in the existing Template Builder path rather than introducing a separate rule-engine feature screen.
- Backend validation alignment was included because it was approved in Step 4 and prevents stale scoring-rule config contracts from rejecting frontend-correct configs.
- Inline template custom-rule persistence was documented as a limitation rather than patched with an unapproved schema change.

## Risks / Blockers

- End-to-end persistence of inline `custom_scoring_rule` through Template Builder remains blocked by backend schema/API design. A follow-up ADR or approved migration is needed if inline custom rules are required instead of published scoring-rule references/overrides.
- Full frontend lint, full frontend test suite, and broader backend regression tests are reserved for Step 7.

## Next Step

Proceed to Step 7: Test after user review.
