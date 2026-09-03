# Step 3: Impact Analysis

Status: produced during this step

## Deliverable

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | HIGH | Rule configuration UI already exists but uses stale shapes, hard-coded sample roles, `any`, and partial editors. Implementing the request requires changes to template domain types, rule editor components, validation helpers, API mappers, and tests. |
| Backend | MEDIUM | The requested work is frontend-focused, but investigation found backend configuration paths are not fully aligned with the new Rule Engine contract. `bulkUpdateTemplateCriteria` ignores `custom_scoring_rule`, and the older `ScoringRuleValidator` differs from the new `RuleConfigValidator`. |
| Database | LOW / MEDIUM | No new migration is planned from the frontend task. However, if persisted template criteria do not already store custom scoring rules, backend persistence may need schema/repository changes in a separate or expanded backend scope. This must be confirmed before implementation. |
| API | HIGH | The frontend save payload already sends `custom_scoring_rule`, but backend template criteria bulk update currently maps it away. The UI can serialize correct Rule Engine config, but end-to-end persistence/validation may fail unless API behavior is fixed or the scope is explicitly limited to frontend state/UI. |
| RBAC / Scope | LOW | Existing template/configuration endpoints enforce permissions. UI should continue using server-provided permissions/statuses and current route access patterns. Role lists must come from organization job-role data, not IAM security roles or hard-coded SI/SM values. |
| Workflow | LOW | No workflow state-machine changes. Publish/validate flows are affected only insofar as template validation must remain backend-authoritative and display validation errors. |
| Audit | LOW / MEDIUM | Frontend does not create audit records. If backend persistence for rule config is changed later, scoring-rule/template updates should continue through backend services so audit entries are created by backend. |
| Concurrency | LOW | Existing template save uses an expected version. UI changes must preserve `expectedVersion` usage and conflict handling; no new client-side concurrency model should be introduced. |
| Performance | LOW | Rule editor validation is small local form validation over ranges/thresholds/branches. No scoring/evaluation engine should run in React. ROLE_CONDITIONAL nested editors may add component complexity but not meaningful runtime cost. |
| Historical Data | LOW | Existing published/read-only behavior must be preserved. UI must not recompute stored evaluation snapshots or make published configurations editable. |

Potential Risks:
- Frontend-correct Rule Engine config may not persist through `saveTemplateCriteriaDraft` because backend `bulkUpdateTemplateCriteria` currently drops `custom_scoring_rule`.
- Backend standalone scoring-rule validation may reject or misinterpret new Rule Engine config shapes because `ScoringRuleValidator` differs from `RuleConfigValidator`.
- Removing mock role/team fallback data could change local/demo behavior; keeping those fallbacks for ROLE_CONDITIONAL would violate the requirement not to hard-code domain roles.
- Existing domain models use display-oriented fields (`levelName`, `roleName`) rather than backend contract fields (`level`, `role_code`), so a careless UI update could silently submit incompatible configs.
- `ROLE_CONDITIONAL` nested rules could accidentally permit another nested role-conditional branch or ambiguous recursion unless the UI defines a supported nesting policy.
- Client validation could drift from backend validation if implemented independently without mirroring only UX-level structural checks.
- Read-only published template behavior could regress if the rule editor introduces its own local add/remove controls without respecting `isReadOnly`.
- Current tests are mostly domain tests; missing component tests could leave serialization and nested editor behavior unverified.

Required ADR / Clarification:
- Clarification required before Step 4: Should this task include the minimal backend alignment needed for Template Builder rule configuration to persist and validate against the new Rule Engine contract?
  - Recommended answer: Yes, include minimal backend alignment if needed, because otherwise the frontend implementation may appear to work but fail end-to-end.
  - Minimal backend alignment would likely include preserving `custom_scoring_rule` in template criteria save/load paths and replacing or aligning configuration `ScoringRuleValidator` with the new `RuleConfigValidator` contract.
- Clarification required: For `ROLE_CONDITIONAL`, should nested branch rules allow all non-role-conditional rule types only, or allow recursive role-conditional configs?
  - Recommended answer: Allow only `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, and `ORDINAL_MANUAL` inside branches for UI simplicity and to avoid recursive configuration UX.
- Clarification required: Which source is authoritative for job role options in Template Builder: `/api/org/roles` organization job roles or `/api/iam/roles` security roles?
  - Recommended answer: `/api/org/roles`, because Rule Engine role branching is employee job-role/domain configuration, not IAM authorization role branching.

If the change conflicts with the LLD or architecture, stop here and request an approved decision. Do not implement a workaround.

## Inputs Reviewed

- Step 2 findings and artifact.
- `docs/FRONTEND_REACT_RULES.md` frontend responsibilities, validation, API, and testing requirements.
- `docs/LLD_Employee_Performance_Evaluation_System.md` configurable rule-driven evaluation framework and no hard-coded criteria/roles/levels.
- Backend Rule Engine canonical contract.
- Frontend Template Builder components, domain models, API hooks, and tests.
- Backend configuration router/controller/service validation and template criteria update paths.

## Actions and Evidence

- Confirmed `ScoringRuleEditors` is the main UI insertion point and currently supports all five rule type labels but not the backend-compatible data contract.
- Confirmed `saveTemplateCriteriaDraft` includes `custom_scoring_rule` in frontend payload.
- Confirmed backend `TemplateService.bulkUpdateTemplateCriteria` maps criteria to criterion version, weight, order, required/enabled, and applicability only; `custom_scoring_rule` is not preserved in the mapped item.
- Confirmed backend `ScoringRuleValidator` uses older config field names and does not match the newly merged `RuleConfigValidator`.
- Confirmed shared frontend API client and TanStack Query hooks already exist and should be reused.

## Changes Made

- Created `docs/fnd-01-rule-engine-ui/step-3-impact-analysis.md`.
- No production code or tests changed.

## Decisions and Rationale

- This should not be planned as a purely cosmetic UI rewrite because persistence and validation risks affect whether the user-visible feature actually works.
- Backend API alignment is considered an implementation dependency unless the user explicitly limits the task to frontend-only UI scaffolding.
- ROLE_CONDITIONAL should use organization job-role source and backend `role_code` in config, while UI may display role names from lookup data.
- Client-side validation should be UX validation only and must not infer scoring results or replace backend validation.

## Risks / Blockers

- Blocker for Step 4 planning: scope clarification is needed on whether minimal backend API/persistence alignment is allowed in this frontend feature branch.
- Blocker for Step 4 planning: confirm nested `ROLE_CONDITIONAL` policy.
- Blocker for Step 4 planning: confirm organization job roles are the authoritative role source.

## Next Step

After user review, proceed to Step 4: Plan with the approved scope decisions above.
