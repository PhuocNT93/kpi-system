# Frontend React Development Rules

## 1. Purpose and priority

This document is mandatory for frontend engineers and AI agents working on the Employee Performance Evaluation Management System.

Priority when requirements conflict:

1. Security, privacy, data integrity, and accessibility.
2. The approved LLD in `docs/LLD_Employee_Performance_Evaluation_System.md`.
3. This document.
4. Feature-specific acceptance criteria.

The frontend is an interaction layer, not a source of business truth. Authorization, scoring, workflow validation, audit creation, and immutable-history enforcement remain backend responsibilities.

## 2. Technology and application structure

- Use React with TypeScript and TanStack Query. Use the existing component library/design tokens when they are introduced; the LLD recommends shadcn/ui.
- Organize by feature/module: `iam`, `organization`, `templates`, `evaluations`, `imports`, `calibration`, `reports`, and `audit`. Keep shared UI, API client, hooks, and types separate from feature screens.
- Use a typed API client and shared request/response/error models. Do not duplicate endpoint paths, payload shapes, enums, or error-code strings across components.
- Server state belongs in TanStack Query. UI-only state belongs locally in components or a narrowly scoped store. Do not mirror server state in a global client store without a clear offline requirement.
- Query keys must include all server filters and scope-defining parameters. Mutations must invalidate or update the exact affected queries after success.
- Do not implement scoring formulas, precedence resolution, workflow transition rules, or RBAC logic as an alternate client-side engine.

## 2.1 Shared naming conventions

- API URLs, query/path parameters, JSON payload fields, and error codes follow the backend contract: `snake_case`; error codes are uppercase `SCREAMING_SNAKE_CASE`. Do not create per-screen API field aliases.
- At the API-client boundary, map `snake_case` wire models to `camelCase` frontend domain models once. Components, hooks, forms, and query keys consume only frontend domain models; request mappers convert back to wire models.
- React component, TypeScript type, interface, enum, and context names use `PascalCase`; functions, hooks, variables, props, and object fields use `camelCase`; constants use `SCREAMING_SNAKE_CASE`; boolean values begin with `is`, `has`, `can`, or `should`.
- Name hooks with `use` and an explicit intent (`useEvaluation`, `useSubmitEvaluation`); event handlers with `handle` (`handleSubmit`); async mutations with an action verb (`submitEvaluation`); and query keys with the resource/scope (`evaluationKeys.byId`).
- Use `kebab-case` for file and directory names except React component files, which use `PascalCase` to match their exported component. Avoid vague names such as `data`, `info`, `result`, `temp`, `utils`, or `common` when a domain name is available.
- Keep display text separate from identifiers. UI labels may be localized; API fields, enum values, and error codes remain stable English identifiers.

## 3. Access control and privacy

- Render actions and navigation according to the current user's role and returned resource permissions, but treat this only as UX. Never assume hidden controls secure data.
- Never request or retain data outside the current user's permitted self/team/organization scope.
- Employee screens show only their evaluations/history; manager views operate only on assigned teams; HR/Admin views control configuration, imports, cycles, and calibration; System Admin business data is read-only.
- Do not display individual rankings to employees. Do not expose PII in browser logs, analytics, error reporting, local storage, or URLs.
- Personal-data exports require the backend export action so audit is recorded; never generate an untracked client-only export.

## 4. Domain interaction rules

- Treat criteria, role/job level, measurement unit, evidence-source label, levels, weights, and applicable scope as API-driven configuration. Do not create fixed UI lists for the sample 18 criteria, SI/SM, Jira/Git, or a fixed five-level assumption.
- The Template Builder must represent configuration through forms, not raw JSON. It serializes/deserializes validated rule configuration for the five supported rule types.
- Template Builder must show total active weight in real time and make a non-100% total obvious. `Validate` calls the API validation endpoint; `Publish` must use backend validation as the final authority.
- Show version status and history clearly. Published template/criterion versions are view-only; edits create a new draft version.
- Evaluation detail must render criterion name, rule, levels, weight, and calculated values from the evaluation-item snapshot returned by the API, never from the current template.
- Locked evaluations/cycles are read-only. Disable mutation controls and explain the server-provided lock state; still handle a `409 EVALUATION_LOCKED` returned after the UI was rendered.
- Score adjustment and calibration forms require a reason field and show the resulting audit/history information returned by the API. Do not offer a direct editable calculated-score field.
- Workflow action buttons are driven by current status plus permissions returned by the server. Confirm destructive/irreversible actions such as publish, lock, submit, approve, and import confirm.

## 5. Forms, validation, and errors

- Use a consistent form solution with schema validation. Validate required format/range client-side for fast feedback, while displaying backend validation as authoritative.
- Consume the backend envelope for every response: `{ success, message, data, meta }`. `data` holds a resource object, collection array, or `null`; pagination is in `meta.page`; failure details are in `meta.error`. Do not make components depend on an unwrapped response body.
- Capture `meta.request_id` for user-support diagnostics and associate it with frontend error telemetry without including PII. Render the API-provided safe message or its localized error-code equivalent.
- For CSV validation, render `meta.row_errors` as row/field errors; each entry uses `row_no`, `field`, `code`, and `message`.
- Map `success: false`, `message`, and `meta.error` to field errors, page alerts, and actionable messages. Preserve `meta.error.code` for handling and telemetry.
- On `401`, start the sign-in/refresh flow; on `403`, show no data details; on `404`, show a scoped not-found state; on `409`, preserve unsaved input where possible and offer refresh/retry; on `422`, highlight the violated business rule.
- Never replace a backend error with a false success state. Avoid generic “something went wrong” where a safe API message/code is available.
- Disable repeated submits while a mutation is pending. For idempotent operations, generate and send an `Idempotency-Key` once per user action and reuse it only for an intentional retry.
- For evaluation-item edits, send the server-provided version value. When a `409` version conflict occurs, show comparison/reload guidance rather than silently overwriting another update.

## 6. Required screens and workflows

- Admin: dashboard, employee management, criterion/version management, template builder, cycle management, CSV template management, import center, and read-only audit log.
- Manager: team list/status, employee evaluation editor, evidence review, permitted review/approval actions, and team calibration view.
- Employee: own evaluation, self-assessment when enabled, and history.
- Import Center flow: download template for the selected cycle; upload; show job preview with valid/invalid totals and row-level errors; confirm partial or strict mode; poll the job status until terminal; show final counts and downloadable/error details.
- Long-running imports and reports must show non-blocking loading/progress, cancellation/retry states when supported, and polling/backoff cleanup when a screen unmounts.

## 7. UX, accessibility, and visual consistency

- Follow the existing design system. Use semantic HTML, labeled inputs, keyboard-operable controls, visible focus, sufficient contrast, and accessible status/error announcements.
- Use responsive layouts for dense operational workflows. Keep tables filterable, sortable only on supported fields, paginated, and usable at narrow widths.
- Use clear status indicators for draft/open/self-assessment/manager-assessment/reviewing/calibration/approved/published/locked. Color alone must not convey state.
- Preserve user-entered form values across recoverable network/refetch errors. Warn before navigation with unsaved changes.
- Provide loading, empty, error, unauthorized, and read-only states for every data screen. Do not leave blank panels during pending/failed requests.

## 8. Testing and definition of done

Every feature change includes tests proportional to risk:

- Component tests for rule-config forms, weight-total feedback, field errors, status/read-only behavior, and accessible interactions.
- Integration tests for role/scope-specific views, evaluation-item conflict handling, submit/approve/lock flows, and backend-error rendering.
- Import flow tests for preview row errors, partial versus strict confirm, job polling, and terminal results.
- Regression tests verifying the UI shows stored evaluation snapshots, not later template/criterion configuration.

Before merge, run TypeScript checking, linting, relevant tests, and a responsive manual check for changed workflows. A feature is incomplete without loading, empty, error, permission, and locked/read-only states.

## 9. AI agent checklist

Before editing frontend code, identify the user role, API contract, evaluation/workflow state, and error states affected. Reuse the typed API client and existing feature patterns.

Never hard-code configurable business data, bypass backend actions with local state changes, expose data based only on hidden UI, or make historical snapshots look editable. Keep mutations narrow, invalidation deliberate, and visible behavior aligned with server responses.