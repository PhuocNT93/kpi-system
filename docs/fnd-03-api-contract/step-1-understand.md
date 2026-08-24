# Step 1: Understand

Status: reconstructed from approved review output.

## Objective
Identify what FND-03 changes, why, affected modules, expected behavior, and acceptance criteria.

## Inputs Reviewed
- `C:\KPI System\task\KPI_Management_Requirements_EN.txt` — FND-03 definition.
- `docs/BACKEND_NODE_RULES.md` §4 — API and validation rules.
- `docs/LLD_Employee_Performance_Evaluation_System.md` — envelope contract.

## Actions and Evidence
- Read FND-03: "Implement { success, message, data, meta }, pagination metadata, standardized error codes/status mapping and shared DTO conventions."
- Read DoD: "All sample endpoints return correct envelope; validation and error responses are standardized."
- Read BACKEND_NODE_RULES §4 envelope specification, status code table, and error detail shape.

## Changes Made
- None (understand phase only).

## Decisions and Rationale
N/A — understand only.

## Task Understanding

**Goal:** Extend the existing thin envelope in `http-response.ts` to the full FND-03 contract:
- `sendCollection` with `meta.page` (pagination metadata)
- `AppError` class with stable SCREAMING_SNAKE_CASE codes mapped to HTTP status
- `sendFailure` with `meta.error.details[]` for per-field validation errors
- Shared DTO base types and pagination query helpers
- Sample endpoints that prove every envelope variant

**Expected Behavior:**
- Every success response: `{ success:true, message, data, meta: { request_id, timestamp } }`
- Every collection: adds `meta.page: { number, size, total_items, total_pages }`
- Every error: `{ success:false, ..., data:null, meta: { ..., error: { code, field, details[] } } }`
- `X-Request-ID` header always present and equals `meta.request_id`

**Acceptance Criteria:**
1. All sample endpoints return correct envelope shape.
2. Validation errors include `meta.error.details[]` with `field`, `code`, `message`.
3. Paginated endpoints include `meta.page` with all four fields.
4. `AppError` maps to the correct HTTP status (400/401/403/404/409/422/500).
5. Unknown errors return 500 without leaking stack traces.
6. `X-Request-ID` header present on every response.

**Out of Scope:**
- No domain module logic (IAM, Org, Eval, etc.)
- No authentication/JWT (FND-04)
- No database migration (FND-02)
- No frontend changes

**Business Rules Involved:**
- `BACKEND_NODE_RULES §4`: envelope contract, status code convention, error detail shape.
- `BACKEND_NODE_RULES §4`: pagination on all collection endpoints.
- Do not expose stack traces, raw SQL, or PII.

**Open Questions / Conflicts:**
- None.
