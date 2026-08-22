# Backend Node.js Express Development Rules

## 1. Purpose and priority

This document is mandatory for backend engineers and AI agents working on the Employee Performance Evaluation Management System.

Priority when requirements conflict:

1. Security, data integrity, and immutability.
2. The approved LLD in `docs/LLD_Employee_Performance_Evaluation_System.md`.
3. This document.
4. Feature-specific acceptance criteria.

Do not change an LLD decision silently. Propose an ADR/LLD update before implementing a conflicting design.

## 2. Architecture and module boundaries

- Implement a modular monolith. Each module owns its API routes, application services, domain rules, persistence models/repositories, and tests.
- Modules: IAM/RBAC, Organization, Template & Criteria, Evaluation, Rule Engine, Import, Workflow, Calibration, Audit, Reporting.
- Express route handlers/controllers only perform request parsing, dependency injection, and response mapping. They must not contain business decisions or direct repository/ORM queries.
- Application services own use cases and transaction boundaries.
- Repositories own persistence queries. Do not query another module's tables directly; depend on its public service/query interface.
- Rule Engine is stateless and pure: input is measurement plus rule configuration; output is a resolved level or a manual-review result. It must not access HTTP, database, current user, or criterion names.
- Reporting reads from dedicated read models/materialized views. Do not use OLTP evaluation-item queries for organization dashboards.

## 3. Domain invariants: never violate

- Criteria, roles, job levels, measurement units, evidence-source labels, weights, levels, and applicability are configuration data. Never hard-code a criterion name, role code, level, tool integration, or per-criterion `if/else` in application code.
- Only these fixed rule strategies are implemented in code: `RANGE_THRESHOLD`, `INVERSE_THRESHOLD`, `COUNT_THRESHOLD`, `ORDINAL_MANUAL`, `ROLE_CONDITIONAL`. Their behavior is driven by validated JSON configuration.
- Resolve overrides only when publishing a template version, in this order: Global -> Role -> Team -> Template. Persist the resolved `effective_weight`; do not resolve it again while scoring.
- A published template version and a criterion version are immutable. Create a new version for any changed level, weight, rule, or applicable configuration.
- When creating an evaluation, snapshot the applicable template criterion, criterion code/name, weight, scoring rule, and level definitions into its evaluation items.
- Never recalculate, mutate, or delete historical snapshots because a current criterion/template changed. Recalculation is an explicit pre-lock action with audit.
- A locked cycle/evaluation is read-only. Every write path must check lock status in the same transaction that performs its write.
- Persist measurement and calculated results (`resolved_level`, raw score, weighted score, overall/final score). Use `ROUND_HALF_UP` with two decimal places in the scoring engine only, never separately in API/UI/SQL.
- Score overrides and calibration adjustments require a non-empty business reason and create a separate adjustment record; do not overwrite the original calculation.
- Audit logs are append-only. The application database role receives only `INSERT` and `SELECT` access to audit records; no public update/delete endpoint exists.

## 4. API and validation rules

- Use REST endpoints and method semantics from LLD section 16. Preserve action endpoints for state-changing domain commands such as `submit`, `approve`, `lock`, `recalculate`, and `adjust-score`.
- Authenticate with JWT Bearer tokens. Extract actor identity, role, employee id, and managed-team scope through dependencies; never trust request-supplied actor, team, or employee identifiers for authorization.
- Enforce RBAC and resource scope in application services, including every list/report query. UI visibility is not authorization.
- API URLs, path/query parameters, JSON request/response fields, and database columns use `snake_case`. Do not expose JavaScript/TypeScript private implementation fields in API contracts.
- Resource names are plural nouns (`evaluation_cycles`), command endpoints use a verb (`/submit`, `/lock`), booleans begin with `is_`, `has_`, or `can_`, and timestamps end with `_at`. Use precise domain names; do not use vague names such as `data`, `info`, `result`, `temp`, or `item` when a domain name is available.
- Every API response uses exactly this top-level JSON envelope: `{ "success": true|false, "message": "string", "data": [], "meta": {} }`. Generate a `request_id` at the API boundary, return it in the `X-Request-ID` header and `meta.request_id`, and include it in structured logs.

Non-collection success response (`200` or `201`):

```json
{
  "success": true,
  "message": "Evaluation created successfully.",
  "data": {
    "id": "7ea65e36-7d4d-42b3-95c1-4669578f8a9b",
    "status": "DRAFT"
  },
  "meta": {
    "request_id": "01JQX7J3NKJ3Q3BRZ6ETBXWVXG",
    "timestamp": "2026-08-22T10:30:00Z"
  }
}
```

Collection success response (`200`):

```json
{
  "success": true,
  "message": "Evaluations retrieved successfully.",
  "data": [],
  "meta": {
    "request_id": "01JQX7J3NKJ3Q3BRZ6ETBXWVXG",
    "timestamp": "2026-08-22T10:30:00Z",
    "page": {
      "number": 1,
      "size": 20,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

- `data` contains an object for a single resource/command result, an array for a collection, and `null` when no data can be returned. `meta` is always an object; use it for request metadata, pagination, asynchronous-job metadata, and structured error details, never for business payloads.
- Use `201 Created` plus `Location` for resource creation, `202 Accepted` for asynchronous jobs (with the import-job resource in `data`), and `200 OK` with the common envelope for successful deletes.
- Return failures using the same envelope:

```json
{
  "success": false,
  "message": "Evaluation is locked and cannot be changed.",
  "data": null,
  "meta": {
    "request_id": "01JQX7J3NKJ3Q3BRZ6ETBXWVXG",
    "timestamp": "2026-08-22T10:30:00Z",
    "error": {
      "code": "EVALUATION_LOCKED",
      "field": null,
      "details": []
    }
  }
}
```

- `success` is the only success indicator. `message` is always safe display text. For failures, `meta.error.code` is a stable uppercase `SCREAMING_SNAKE_CASE` identifier, `meta.error.field` is the affected `snake_case` request field or `null`, and `meta.error.details` is an optional array of `{ "field", "code", "message" }` objects.
- CSV validation stores the LLD-required row-level errors in `meta.row_errors`. Each entry is `{ "row_no", "field", "code", "message" }`; do not return raw parser or database errors.
- Use status codes consistently: `400` request validation, `401` unauthenticated, `403` unauthorized/scope violation, `404` absent resource, `409` conflict/lock/version mismatch/duplicate import, `422` business-rule violation, `500` unexpected errors.
- Local validation belongs in typed request DTO schemas using the approved runtime validation library; validation that depends on persisted state belongs in application/domain services. Return stable machine-readable error codes.
- Require `Idempotency-Key` for important create/submit operations defined by the LLD, including CSV upload and evaluation creation/submission. Persist/replay a successful response for the same actor and key.
- Paginate all collection endpoints; allow only explicit, validated filters and sort fields.
- Do not expose internal exceptions, raw SQL, stack traces, tokens, or unmasked PII in API errors or normal logs.

## 5. Workflow, concurrency, and transactions

- Model evaluation state changes through the fixed state machine. Admins may toggle optional steps only; they cannot create arbitrary states.
- Validate source state, permitted transition, actor role/scope, and required data inside one transaction. Use row locking for concurrent transitions and cycle locking.
- Use optimistic locking (`version`) when updating an evaluation item. On mismatch, return `409` and require the client to refresh.
- Manager submit must fail when a required active item has missing score. Missing evidence warns/reports but does not block submit unless a later approved rule changes this behavior.
- All business writes that affect score, level, weight, rule, approval, rejection, adjustment, or export must append the matching audit record in the same transaction.
- Imports above 500 rows run asynchronously. Create the import job, validate rows, store preview/error rows, then process confirmed rows in batches of 100-200.
- Enforce `(evaluation_cycle_id, file_hash)` uniqueness for CSV imports. Default to partial import; honor `strict_mode` as all-or-nothing.

## 6. Node.js Express implementation conventions

- Use Node.js with Express and TypeScript. Enable strict TypeScript compiler options and avoid `any`; use `unknown` for untrusted input until it passes validation.
- Apply cross-cutting concerns through Express middleware: request ID, authentication, rate limiting, JSON parsing, centralized error mapping, and structured logging. Keep business rules in services, not middleware.
- Define TypeScript interfaces/types for all request and response contracts and validate every untrusted request at runtime with the approved schema-validation library. Do not treat TypeScript types alone as runtime validation and do not return ORM entities directly.
- Name TypeScript source files `kebab-case`; classes, interfaces, types, and enums `PascalCase`; functions, methods, local variables, and object fields `camelCase`; constants and environment variables `SCREAMING_SNAKE_CASE`; private class members use `#` or `private`.
- Name DTOs with an action/resource suffix (`CreateEmployeeRequest`, `UpdateEvaluationItemRequest`) and API response types with `Response`/`PageResponse` (`EmployeeResponse`, `EvaluationPageResponse`). Keep wire DTO mappers at the API boundary; do not reuse persistence models as API models.
- Define enums only for system-controlled concepts such as workflow states, employment status, and rule types. Configurable reference data remains database data.
- Keep database schema naming `snake_case`, UUID primary keys named `<table_name>_id`, separate business keys such as `code`, and timezone-aware timestamps.
- Apply schema changes through versioned migrations. Migrations must preserve audit/history and must not seed the sample 18 criteria into production.
- Store `rule_config` and snapshots as validated JSONB-compatible structures. Validate the schema for each rule type before publish and before use.
- Mask email/full name outside approved audit data and record audit action `EXPORT` for personal-data exports.
- Add rate limits to CSV imports and reports.

## 7. Required tests and definition of done

Every change must include focused automated tests proportional to risk:

- Rule Engine: table-driven tests for every rule type, boundaries, null/out-of-range input, and role-conditional branch.
- Scoring/precedence: resolved override order, strict 100% template validation, per-employee disabled-criterion normalization, and rounding.
- Workflow/API: forbidden transition, missing score, missing adjustment reason, locked data, idempotent submit, optimistic-lock conflict, and RBAC negative cases.
- Snapshot regression: modifying a later criterion/template version cannot change any existing evaluation item or locked result.
- Import integration: file validation, partial/strict mode, duplicate hash, and blocked overwrite of submitted evaluations.

Before merge, run formatter/linter, type check, relevant unit/integration tests, and migration checks. A feature is incomplete until its authorization, audit, concurrency, and historical-data behavior are covered.

## 8. AI agent checklist

Before editing backend code, identify the owning module and state whether the change can affect scope, snapshots, locks, score calculation, workflow, or audit. If it can, add or update a focused test first or alongside the implementation.

Never bypass a service, invent a per-criterion branch, modify audit history, or add a write endpoint to a locked/published resource. Keep patches within the owning module unless an explicit cross-module contract is required.