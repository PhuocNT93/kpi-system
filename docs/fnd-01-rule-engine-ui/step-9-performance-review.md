# Step 9: Performance Review

Status: produced during this step

## Deliverable

## Performance Review

Findings:
- [Medium] `frontend/src/features/templates/components/CriterionConfigDrawer.tsx`: `useJobRolesQuery()` runs whenever `CriterionConfigDrawer` is mounted, even when `isOpen` is false and `criterionItem` is null. `TemplateBuilderWorkspace` always mounts the drawer component, so opening the template builder can trigger an unnecessary `/api/org/roles` request before the scoring tab is used. Corrective action: defer role loading until the drawer/scoring editor is open, for example by adding an `enabled` option to `useJobRolesQuery` and passing `enabled: isOpen && Boolean(criterionItem)`, or by moving the role query into a child component rendered only for the open scoring tab.

Actions Taken:
- None during this Step 9 review. The issue is recorded for user review before returning to implementation.

`STATUS: WAITING FOR USER REVIEW - STEP 9`

## Inputs Reviewed

- Step 9 workflow requirements from `docs/AI_AGENT_WORKFLOW.md`.
- `frontend/src/features/templates/domain/rule-config.ts` validation and normalization helpers.
- `frontend/src/features/templates/components/ScoringRuleEditors.tsx` render and validation behavior.
- `frontend/src/features/templates/components/CriterionConfigDrawer.tsx` hook/query placement.
- `frontend/src/features/templates/components/TemplateBuilderWorkspace.tsx` drawer mount path.
- `backend/src/modules/configuration/application/validation/scoring-rule.validator.ts` backend validation delegation.
- Step 7 validation results.

## Actions and Evidence

- Reviewed local validation complexity:
  - Range validation sorts ranges: O(n log n) per edited config, where n is number of ranges. Expected n is small for rule configuration forms.
  - Count validation uses a Set for duplicate detection: O(n).
  - Role-conditional validation iterates branches and validates each nested non-role rule: O(b + nested rule sizes), plus range sort where applicable.
- Reviewed backend validator delegation:
  - `ScoringRuleValidator.validate` delegates to `RuleConfigValidator.validate` once per validation call. No database access, no network calls, no transaction length impact.
- Reviewed UI request behavior:
  - `CriterionConfigDrawer` calls `useJobRolesQuery()` before returning null for closed state.
  - `TemplateBuilderWorkspace` always mounts `CriterionConfigDrawer`, so the query can fire even when the drawer is closed.
- Reviewed payload behavior:
  - Template draft save no longer sends non-persisted inline `custom_scoring_rule`, avoiding unnecessary payload bytes and misleading persistence behavior.
- Reviewed query invalidation/concurrency:
  - No new mutation or invalidation pattern was introduced for the rule editor.
  - Existing draft save/publish flows and version handling remain unchanged.

## Changes Made

- Created `docs/fnd-01-rule-engine-ui/step-9-performance-review.md`.
- No production code or tests changed during Step 9.

## Decisions and Rationale

- Did not optimize validation sorting because no evidence suggests range counts will be large enough to matter, and correctness/readability is more important here.
- Did not introduce memoization because the editor configuration sizes are small and React Compiler-style guidance discourages adding memoization by default.
- Marked the eager job-role query as a real performance issue because it can trigger an unnecessary API request on template builder load.

## Risks / Blockers

- Step 9 finding should be fixed or explicitly accepted before final verification.

## Next Step

After user review, either return to Step 6 to defer role query loading or explicitly approve accepting the eager role-query behavior before Step 10.
