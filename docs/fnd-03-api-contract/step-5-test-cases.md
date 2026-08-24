# Step 5: Define Test Cases

Status: reconstructed from approved review output.

## Objective
Define expected tests before implementation.

## Inputs Reviewed
- Steps 1-4 findings.
- FND-03 DoD: "All sample endpoints return correct envelope; validation and error responses are standardized."
- BACKEND_NODE_RULES §4.

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Health endpoint — success envelope | App running | GET /health | 200, `success:true`, `data.status:"healthy"`, `meta.request_id` present |
| TC02 | X-Request-ID on success | App running | GET /health | Response header `x-request-id` equals `meta.request_id` |
| TC03 | Single-resource response shape | App running | GET /sample/resource | 200, `success:true`, `data` is object, no `meta.page`, no `meta.error` |
| TC04 | Paginated collection with explicit page | App running | GET /sample/collection?page=1&page_size=10 | 200, `data` is array, `meta.page.{number:1, size:10, total_items:2, total_pages:1}` |
| TC05 | Pagination default fallback | App running | GET /sample/collection (no params) | 200, `meta.page.number:1`, `meta.page.size:20` |
| TC06 | Out-of-range page_size falls back | App running | GET /sample/collection?page_size=999 | 200, `meta.page.size:20` (999 > 100 max) |
| TC07 | AppError → correct HTTP status | App running | GET /sample/error | 404, `success:false`, `data:null`, `meta.error.code:"RESOURCE_NOT_FOUND"`, `meta.error.field:null`, `meta.error.details:[]` |
| TC08 | Validation error with details[] | App running | GET /sample/validation-error | 400, `meta.error.code:"VALIDATION_ERROR"`, `meta.error.details` array with field/code/message per entry |
| TC09 | 404 on unknown route | App running | GET /does-not-exist | 404, `success:false`, `meta.error.code:"RESOURCE_NOT_FOUND"` |
| TC10 | X-Request-ID on error response | App running | GET /sample/error | Header `x-request-id` equals `meta.request_id` |

## Changes Made
- None (test-definition phase only).
