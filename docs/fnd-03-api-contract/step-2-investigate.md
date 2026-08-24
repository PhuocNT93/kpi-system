# Step 2: Investigate

Status: reconstructed from approved review output.

## Objective
Identify relevant existing code, patterns, and what is missing for FND-03.

## Inputs Reviewed
- `backend/src/api/http-response.ts` — existing envelope (pre-FND-03)
- `backend/src/api/error-handler.ts` — existing error handlers
- `backend/src/app.ts` — existing app bootstrap
- `backend/src/shared/request-id.ts` — X-Request-ID middleware
- `backend/src/app.test.ts` — existing health test
- `docs/BACKEND_NODE_RULES.md` §4, §6

## Actions and Evidence
- `http-response.ts` had `sendSuccess` and `sendFailure` but:
  - No `sendCollection` with `meta.page`
  - No `sendCreated` (201 + Location)
  - No `sendAccepted` (202)
  - No `sendDeleted` (200 delete)
  - `sendFailure` had no `details[]` parameter
  - `ResponseMeta` mixed `error` inline with base fields
- `error-handler.ts` always returned 500; no `AppError` detection
- No `AppError` class anywhere in codebase
- No pagination query parser
- No shared DTO base types

## Changes Made
- None (investigate phase only).

## Relevant Modules and Files
- `backend/src/api/` — owns all envelope/contract code

## Existing Implementation
- `sendSuccess` + `sendFailure` thin helpers already used by `/health` and `notFoundHandler`
- `requestIdMiddleware` sets `response.locals.requestId` and `X-Request-ID` header

## Existing Tests
- `app.test.ts`: 1 test for `/health` — preserved and extended

## Patterns to Reuse
- `response.locals.requestId` for request ID propagation (keep as-is)
- `satisfies` type assertion on JSON payload (keep — strict type safety)
