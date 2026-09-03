# Step 2: Investigate

Status: produced during this step

## Deliverable

## Investigation

Relevant Documents:
- `usage.md`: mandates AI workflow gates and stopping after each step.
- `docs/AI_AGENT_WORKFLOW.md`: Step 2 requires targeted investigation of relevant docs, implementation, API contracts, modules, and tests.
- `docs/FRONTEND_REACT_RULES.md`: frontend is interaction layer only; use React + TypeScript + TanStack Query; use typed API client; form validation should be schema-based and backend remains authoritative for scoring/validation.
- `docs/LLD_Employee_Performance_Evaluation_System.md`: evaluation framework is configurable and rule-driven; criteria/weights/levels/roles are not hard-coded; Rule Engine supports range, inverse, ordinal/manual, count, and role-conditional rule types.
- Backend Rule Engine contract in `backend/src/modules/rule-engine/domain/rule.types.ts` and validator in `backend/src/modules/rule-engine/application/rule-config.validator.ts`.

Relevant Modules and Files:
- `frontend/src/features/templates/domain/template-models.ts`
  - Existing `RuleType` union has the correct five values.
  - Existing config interfaces are incompatible with backend Rule Engine shape:
    - Frontend uses `minScore`, `maxScore`, `levelId`, `levelName`; backend expects `min`, `max`, `level`.
    - Frontend `COUNT_THRESHOLD` uses `counts`; backend expects `thresholds: number[]`.
    - Frontend `ORDINAL_MANUAL` uses `levels`; backend expects optional `level_labels?: Record<string, string>`.
    - Frontend `ROLE_CONDITIONAL` uses `roleId`, `roleName`, `ruleType`, `config`; backend expects `role_code` and nested `rule` with rule config including `type`.
- `frontend/src/features/templates/components/ScoringRuleEditors.tsx`
  - Existing UI entry point for all five rule types.
  - Currently uses `any`, incompatible config shapes, placeholder defaults, and hard-coded role branches (`role-si`, `role-sm`).
  - `COUNT_THRESHOLD` and `ROLE_CONDITIONAL` are display-only or effectively incomplete.
- `frontend/src/features/templates/components/CriterionConfigDrawer.tsx`
  - Owns scoring tab and passes `customRule` into `ScoringRuleEditors`.
  - Current default rule config starts as `{}` for `RANGE_THRESHOLD`.
  - Read-only state is already derived from published template/version status and passed down.
- `frontend/src/features/templates/api/template-api.ts`
  - Uses shared API helpers, not direct fetch from components.
  - `saveTemplateCriteriaDraft` serializes `custom_scoring_rule` with `rule_type` and `config`.
  - Has fallback `MOCK_ROLES` and `MOCK_TEAMS`; this conflicts with the new requirement to avoid hard-coded domain data for role-conditional configuration.
  - `fetchJobRoles` currently calls `/api/iam/roles`, while organization job role APIs also exist at `/api/org/roles`.
- `frontend/src/features/templates/api/use-templates.ts`
  - Uses TanStack Query and query keys for templates, roles, teams, and criteria library.
  - Existing `useJobRolesQuery` and `useTeamsQuery` can be reused, but role source likely needs alignment with organization job roles rather than IAM security roles.
- `frontend/src/features/templates/domain/template-mappers.ts`
  - Existing client-side validation checks weights, simple `RANGE_THRESHOLD` overlap, and empty `ROLE_CONDITIONAL` branches.
  - Validation currently only understands the old frontend shapes.
  - Existing wire/domain mappers are the right boundary for snake_case/camelCase conversion.
- `frontend/src/shared/api/api-client.ts`
  - Shared API abstraction unwraps `{ success, message, data, meta }` and throws `ApiClientError` with `code`, `requestId`, and `statusCode`.
  - Components should continue to use API/domain hooks rather than direct HTTP.
- `frontend/src/features/templates/domain/template-mappers.test.ts`
  - Existing Vitest unit tests cover weight totals, basic validation, version comparison, and wire mapping.
  - No current component tests for `ScoringRuleEditors`.
- `backend/src/modules/configuration/application/services/template.service.ts`
  - `bulkUpdateTemplateCriteria` maps only criterion version, weight, display order, required/enabled/applicability.
  - It currently ignores frontend `custom_scoring_rule` data in the template criteria payload.
- `backend/src/modules/configuration/application/validation/scoring-rule.validator.ts`
  - Existing scoring-rule validator appears older than the new Rule Engine contract and does not match `RuleConfigValidator`.

Existing Implementation:
- Template Builder already exists with:
  - `TemplateBuilderWorkspace` for selected criteria, validation, draft save, publish flow, read-only published state, and conflict modal.
  - `CriterionConfigDrawer` with tabs for general, applicability, scoring, and levels.
  - `ScoringRuleEditors` as the rule editor insertion point.
  - `ApplicabilityEditor` already loads roles and teams via query hooks, but falls back to mock role/team data.
- API mappers already convert wire snake_case to frontend camelCase for templates and template criteria, and save maps back to wire DTO.
- Existing backend configuration module exposes scoring-rule and template-validation routes, but its scoring-rule and template-criteria persistence paths are not fully aligned with the new backend Rule Engine contract.

Existing Tests:
- `frontend/src/features/templates/domain/template-mappers.test.ts`
  - Unit tests for template weight validation, version diffing, and wire mapping.
- No existing tests found for:
  - `ScoringRuleEditors`
  - `CriterionConfigDrawer`
  - Role-conditional editing
  - Rule config serialization/deserialization against backend Rule Engine shapes
- Frontend test stack exists: Vitest, Testing Library, user-event, jest-dom, jsdom, MSW.

Patterns to Reuse:
- Feature placement: keep work under `frontend/src/features/templates` unless Step 3/4 determines a shared rule-engine module is necessary.
- API access: use `frontend/src/shared/api/api-client.ts`, `template-api.ts`, and TanStack Query hooks; do not call fetch from React components.
- Validation: use existing Zod dependency and/or current domain validation pattern; do not add another validation library.
- Read-only handling: preserve `isReadOnly` propagation from `TemplateBuilderWorkspace` to drawer/editor.
- Error model: surface `ApiClientError` information through existing error/validation components where applicable.
- Tests: extend domain tests and add focused component tests using Vitest + Testing Library.

## Inputs Reviewed

- `usage.md`
- `docs/AI_AGENT_WORKFLOW.md`
- `docs/FRONTEND_REACT_RULES.md`
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `backend/src/modules/rule-engine/domain/rule.types.ts`
- `backend/src/modules/rule-engine/application/rule-config.validator.ts`
- `backend/src/modules/configuration/application/validation/scoring-rule.validator.ts`
- `backend/src/modules/configuration/application/services/scoring-rule.service.ts`
- `backend/src/modules/configuration/application/services/template.service.ts`
- `backend/src/modules/configuration/api/configuration.router.ts`
- `backend/src/modules/configuration/api/configuration.controller.ts`
- `frontend/package.json`
- `frontend/src/features/templates/domain/template-models.ts`
- `frontend/src/features/templates/domain/template-mappers.ts`
- `frontend/src/features/templates/api/template-api.ts`
- `frontend/src/features/templates/api/use-templates.ts`
- `frontend/src/features/templates/components/ScoringRuleEditors.tsx`
- `frontend/src/features/templates/components/CriterionConfigDrawer.tsx`
- `frontend/src/features/templates/components/TemplateBuilderWorkspace.tsx`
- `frontend/src/features/templates/components/ApplicabilityEditor.tsx`
- `frontend/src/features/templates/components/LevelEditor.tsx`
- `frontend/src/features/templates/domain/template-mappers.test.ts`
- Grep searches for template/rule/role/test patterns in frontend and backend.

## Actions and Evidence

- Listed `frontend/src`: found `app`, `features`, `lib`, `shared`, `App.tsx`, and existing feature modules.
- Read `frontend/package.json`: confirmed React 18, TypeScript 5.7, TanStack Query, React Hook Form, Zod, Vitest, Testing Library, MSW.
- Searched `frontend/src` for template/rule terms: found existing template and criteria feature implementation.
- Read backend Rule Engine types: confirmed canonical frontend target shapes:
  - `RangeThresholdConfig`: `{ ranges: { min: number; max: number | null; level: number }[] }`
  - `InverseThresholdConfig`: same shape as range
  - `CountThresholdConfig`: `{ thresholds: number[] }`
  - `OrdinalManualConfig`: `{ level_labels?: Record<string, string> }`
  - `RoleConditionalConfig`: `{ branches: { role_code: string; rule: RuleConfigUnion }[] }`
- Read frontend `ScoringRuleEditors.tsx`: found current editor supports UI labels for all five rule types but uses incompatible config shapes, `any`, and hard-coded roles.
- Read template API/hook files: confirmed shared API/TanStack Query pattern and draft-save serialization path.
- Read backend configuration scoring-rule validator and template service: found likely stale contract and missing persistence of `custom_scoring_rule` in bulk template criteria updates.

## Changes Made

- Created this Step 2 artifact only: `docs/fnd-01-rule-engine-ui/step-2-investigate.md`.
- No production code or tests changed.

## Decisions and Rationale

- The likely owning frontend abstraction is `ScoringRuleEditors` under the template feature, not a new top-level page.
- Step 4 should likely refactor rule configuration types and validation into focused domain helpers so component UI remains thin and testable.
- Role-conditional editing should consume organization job roles, not IAM security roles or mock SI/SM values.
- The backend configuration validator and template persistence mismatch should be treated as an integration risk, not silently worked around in UI.

## Risks / Blockers

- Backend configuration module scoring-rule validator appears incompatible with the newly merged Rule Engine contract. If scoring rule save/publish validation still uses the older validator, frontend-correct Rule Engine configs may be rejected by existing configuration endpoints.
- Template criteria bulk update currently ignores `custom_scoring_rule`, so frontend rule config edits may not persist through the Template Builder save flow.
- The exact pasted frontend prompt body was not available in transcript lines 950-1250; Step 2 is based on the conversation summary and repository evidence.
- Existing template UI uses hard-coded local evaluation levels and fallback mock roles/teams; Step 3 must assess whether removing or limiting these fallbacks affects dev/demo behavior.
- No existing component tests for the rule editor; new tests are needed.

## Next Step

Proceed to Step 3: Impact Analysis, explicitly assessing frontend, backend/API contract mismatch, database, RBAC/scope, workflow, audit, locking, scoring, snapshots/history, concurrency, performance, and security.
