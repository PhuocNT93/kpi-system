# Step 1: Understand

Status: reconstructed from earlier approved response

## Deliverable

## Task Understanding

Goal: Implement frontend React support for configuring Rule Engine rule configurations in the existing Template Builder / criteria configuration experience, aligned with the backend Rule Engine contract merged into `develop`.

Expected Behavior: The frontend lets authorized configuration users select and configure the five supported rule types through typed forms, serializes/deserializes rule configuration to the backend contract, provides client-side validation for UX, displays backend validation errors as authoritative, and never calculates scores or resolved levels in React.

Acceptance Criteria:
1. Provide UI support for all five backend rule types: `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`, and `ROLE_CONDITIONAL`.
2. Use discriminated TypeScript unions for known rule configuration shapes.
3. Preserve backend field names, value types, and semantic structure at the API boundary.
4. Reuse the existing frontend validation library and form patterns; do not introduce a second validation framework.
5. Reuse the existing typed API/service abstraction; do not call `fetch` directly from React components.
6. Keep server state in the project’s existing query/data-loading pattern.
7. Implement rule configuration through forms, not raw JSON editing.
8. Support nested configuration for `ROLE_CONDITIONAL`, including role-driven branch selection and fallback/default behavior if required by backend contract.
9. Load role options and configurable domain data from existing backend/domain APIs or project configuration; do not hard-code `SI`, `SM`, KPI names, criterion names, levels, or sample criteria.
10. Add UX validation for malformed ranges, thresholds, missing branches, duplicate role branches, invalid ordinal levels, and empty required values.
11. Display backend validation errors without replacing them with false success states.
12. Ensure published/locked/read-only template or criterion states render rule configuration as view-only.
13. Add focused frontend tests for configuration editing, serialization/deserialization, validation errors, rule type switching, and `ROLE_CONDITIONAL` edge cases.
14. Do not implement scoring/evaluation algorithms, precedence resolution, or backend Rule Engine strategies in React.
15. Add or update frontend user documentation for the changed workflow before final verification.

Out of Scope:
- Backend Rule Engine scoring changes.
- New database schema or migrations unless investigation proves an existing frontend API contract is missing.
- Reimplementing Rule Engine strategies in the browser.
- KPI-specific business rules or hard-coded sample configuration.
- Ranking, calibration, workflow transition, audit, locking, or RBAC enforcement logic beyond existing UI behavior and server-provided permissions/states.
- Direct employee evaluation scoring/result inference from rule configuration.

Business Rules Involved:
- Evaluation framework is configurable; criteria, weights, levels, roles, measurement units, and evidence labels are not fixed in application code.
- Frontend is an interaction layer only; backend remains authoritative for scoring, validation, authorization, audit, workflow, locking, and immutable history.
- Template Builder must represent configuration through forms and serialize validated rule configuration for the supported rule types.
- Historical evaluation snapshots must be displayed from server-returned snapshots, not recomputed from current template/criterion config.
- Published or locked configuration/evaluation state must be treated as read-only in UI.
- Backend response envelope and error handling rules apply: preserve safe API messages, error codes, and request identifiers where available.

Open Questions / Conflicts:
- The full pasted “Frontend Implementation Prompt” body was not accessible from the transcript range available to me; this Step 1 understanding is based on the conversation summary plus `usage.md`, `AI_AGENT_WORKFLOW.md`, `FRONTEND_REACT_RULES.md`, and `LLD_Employee_Performance_Evaluation_System.md`. The user approved this understanding by confirming Step 1.
- Step 2 must verify whether the existing frontend already has Template Builder, typed API client, validation schemas, role lookup APIs, and rule validation endpoints.

## Inputs Reviewed

- Conversation summary for the new frontend Rule Engine task.
- `usage.md`.
- `docs/AI_AGENT_WORKFLOW.md`.
- `docs/FRONTEND_REACT_RULES.md`.
- `docs/LLD_Employee_Performance_Evaluation_System.md`.

## Actions and Evidence

- Reconstructed the approved Step 1 deliverable exactly from the earlier user-facing Step 1 response.
- The user replied `confirm`, approving Step 1 and allowing Step 2 investigation.

## Changes Made

- Created `docs/fnd-01-rule-engine-ui/step-1-understand.md` as a retrospective approved workflow artifact.

## Decisions and Rationale

- The task is scoped to frontend Rule Engine configuration UI with minimal backend alignment only when required for persistence/validation.
- React must not implement score calculation or backend rule strategies.

## Risks / Blockers

- None for the approved Step 1 artifact.

## Next Step

Step 2 was approved and completed; proceed through the approved workflow artifacts into implementation.
