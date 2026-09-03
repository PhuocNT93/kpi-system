# Step 4: Plan

Status: produced during this step

## Deliverable

## Implementation Plan

1. **What:** Replace stale frontend rule config domain types with backend-compatible discriminated unions.
   **Where:** `frontend/src/features/templates/domain/template-models.ts`, with related exports through `frontend/src/features/templates/index.ts` and criteria re-exports if needed.
   **Why:** Current UI/domain types use display-oriented shapes (`minScore`, `counts`, `roleId`) that do not match the merged backend Rule Engine contract (`min`, `max`, `level`, `thresholds`, `role_code`, nested `rule`). Type-safe discriminated unions prevent accidental submission of stale config shapes.
   **API/database/frontend implications:** Frontend components will consume camelCase domain wrappers only where appropriate, but rule config payload itself should preserve backend-compatible names because it is stored as Rule Engine JSON. No database change is planned from this item.
   **Tests:** Add/update domain tests asserting all five rule config shapes serialize to backend-compatible objects.

2. **What:** Add focused rule config helpers for default configs, rule type changes, lightweight validation, and serialization/deserialization.
   **Where:** New or updated files under `frontend/src/features/templates/domain/`, likely `rule-config.ts` or equivalent, plus `template-mappers.ts` validation integration.
   **Why:** Keeps business-sensitive config shaping out of React components and provides one place to test UX validation without implementing scoring logic.
   **API/database/frontend implications:** Client validation remains UX-only; backend validation remains authoritative. Helpers must not compute `resolved_level`, `raw_score`, weighted scores, or evaluation outcomes.
   **Tests:** Unit tests for default configs, round-trip mapping, invalid ranges, duplicate thresholds, empty ordinal labels, empty/missing branches, duplicate role codes, and nested rule constraints.

3. **What:** Rewrite `ScoringRuleEditors` to edit backend-compatible config for all five rule types.
   **Where:** `frontend/src/features/templates/components/ScoringRuleEditors.tsx`, with small subcomponents if useful.
   **Why:** Existing editor is the correct insertion point but uses `any`, incompatible shapes, hard-coded branches, and incomplete editors. The new editor should provide form controls for every rule type.
   **API/database/frontend implications:** Inputs update `ScoringRule.config` with backend-compatible JSON. The component must respect `isReadOnly`, avoid direct API calls, and accept role options from parent/query data instead of hard-coded roles.
   **Tests:** Component tests for selecting rule types, editing ranges, count thresholds, ordinal labels, read-only mode, and ensuring changes emit expected config objects.

4. **What:** Implement `ROLE_CONDITIONAL` branch editing with organization job roles and nested non-role rule editors.
   **Where:** `ScoringRuleEditors.tsx` and/or child components; role data supplied from `CriterionConfigDrawer` using existing query hooks or organization hooks.
   **Why:** Role-conditional rules are the highest-risk config type and must not hard-code SI/SM or IAM security roles. Nested rules should be limited to `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, and `ORDINAL_MANUAL` to avoid recursive UI complexity.
   **API/database/frontend implications:** Store branch values as `{ role_code, rule }`, where nested `rule` includes its `type` and config fields. Display role names only from fetched role metadata. If roles cannot be loaded, show an error/empty state instead of mock role branches.
   **Tests:** Component/domain tests for adding/removing branches, preventing duplicate role codes, changing nested rule type, serializing nested rules, and read-only behavior.

5. **What:** Align role/team data loading used by template configuration to domain organization roles and remove role fallback from rule-conditional editing.
   **Where:** `frontend/src/features/templates/api/template-api.ts`, `frontend/src/features/templates/api/use-templates.ts`, and `ApplicabilityEditor` only if needed for consistency.
   **Why:** LLD treats job roles as employee/domain configuration, not IAM authorization roles. Rule Engine role branching must use job-role `code` values from organization data.
   **API/database/frontend implications:** Prefer `/api/org/roles` via existing organization API/hook pattern. Existing template query keys may be reused or adjusted. No direct fetch from components.
   **Tests:** Unit/component tests should use injected/mocked role lists; no tests should rely on SI/SM hard-coded defaults.

6. **What:** Update client-side template validation to understand backend-compatible rule configs.
   **Where:** `frontend/src/features/templates/domain/template-mappers.ts` or extracted rule validation helper used by `validateTemplateClientSide`.
   **Why:** Existing validation only checks old range and role-conditional shapes. The UI needs immediate feedback for malformed config while preserving backend as final authority.
   **API/database/frontend implications:** Validation returns existing `TemplateValidationResult`/`ValidationErrorItem` structures so current validation modal can continue rendering. It must not silently clamp numbers, convert nulls, infer scores, or treat backend failures as success.
   **Tests:** Extend `template-mappers.test.ts` and/or new helper tests for all rule config validation acceptance cases and error categories.

7. **What:** Preserve and display backend validation/save errors in the Template Builder flow.
   **Where:** `EvaluationTemplatesPage.tsx`, `TemplateBuilderWorkspace.tsx`, `ValidationResultsModal.tsx`, or existing error alert paths as needed after investigation during implementation.
   **Why:** Frontend rules require backend validation to be authoritative and errors to retain safe messages/codes/request IDs. Save/publish failures should not look successful.
   **API/database/frontend implications:** Continue using shared API client errors and TanStack Query mutation errors. Avoid new global state.
   **Tests:** Add focused tests where practical for client validation modal behavior; backend error rendering may be covered by existing error component tests or added if easy in scope.

8. **What:** Apply minimal backend alignment so template rule config persists and validation accepts the new Rule Engine contract.
   **Where:** Backend configuration module, likely `backend/src/modules/configuration/application/services/template.service.ts`, configuration domain/repository DTOs if they support custom rules, and `backend/src/modules/configuration/application/validation/scoring-rule.validator.ts`.
   **Why:** Step 3 found that frontend-only edits may be lost or rejected. The feature is not usable unless Template Builder save/load and validation preserve Rule Engine config.
   **API/database/frontend implications:** No endpoint shape change is intended; preserve existing `/api/v1/configuration/templates/:templateId/versions/:versionId/criteria` and scoring-rule endpoints. If the repository/database lacks a field for template custom scoring rules, stop during implementation and report the blocker rather than inventing schema outside the approved plan.
   **Tests:** Backend unit/API tests for saving template criteria with `custom_scoring_rule`, validating new Rule Engine-compatible config, and preserving published immutability/conflict behavior.

9. **What:** Add frontend user guide documentation for Rule Engine configuration behavior.
   **Where:** `docs/fnd-01-rule-engine-ui/frontend-user-guide.md` during Step 6 implementation.
   **Why:** Workflow requires a frontend user guide when frontend changes are included. The guide should explain startup/shutdown, URLs, validation behavior, configurable values, visible behavior, and known limitations.
   **API/database/frontend implications:** Documentation only.
   **Tests:** Not applicable, but verify file exists and matches implemented behavior before final verification.

10. **What:** Run focused validation after implementation.
    **Where:** Frontend and backend commands from existing package scripts.
    **Why:** Rule config changes affect types, UI behavior, frontend validation, and possibly backend persistence/validation.
    **API/database/frontend implications:** None, but failures must be fixed within the approved slice.
    **Tests:** Planned commands for Step 7 include focused frontend tests, frontend typecheck/lint, backend rule/configuration tests affected by backend alignment, and broader relevant regression checks if changed files warrant them.

## Inputs Reviewed

- Step 1 understanding and Step 3 approved recommendations.
- Step 2 investigation artifact.
- `docs/AI_AGENT_WORKFLOW.md` Step 4 required output.
- Frontend Template Builder and backend configuration findings from Steps 2-3.

## Actions and Evidence

- Confirmed Step 4 format from `docs/AI_AGENT_WORKFLOW.md`.
- Planned around the concrete owning path found in Step 2: Template Builder -> `CriterionConfigDrawer` -> `ScoringRuleEditors` -> `saveTemplateCriteriaDraft` -> backend configuration service.
- Included minimal backend alignment because Step 3 identified a high API risk: frontend payload includes `custom_scoring_rule`, but backend bulk update currently drops it.

## Changes Made

- Created `docs/fnd-01-rule-engine-ui/step-4-plan.md`.
- No production code or tests changed.

## Decisions and Rationale

- Keep the primary frontend implementation inside the existing templates feature instead of adding a separate rule-engine page.
- Use backend-compatible rule config JSON shapes directly for `ScoringRule.config` to avoid lossy translation.
- Use organization job roles for `ROLE_CONDITIONAL`; do not use IAM roles or static SI/SM defaults.
- Restrict nested `ROLE_CONDITIONAL` branch editors to non-role rule types.
- Include minimal backend alignment only where required for persistence/validation; do not expand into scoring changes, database redesign, workflow, audit, or reporting work.

## Risks / Blockers

- If backend repository/database schema cannot persist custom scoring rules on template criteria, implementation must stop and report the exact blocker.
- If organization job-role API shape lacks stable `code`, the role-conditional contract needs clarification before implementation.
- If the missing pasted frontend prompt contains additional DoD beyond the conversation summary, Step 4 may need revision.

## Next Step

Proceed to Step 5: Define Test Cases after user review.
