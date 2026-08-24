# Step 6: Implement

Status: produced during this step.

## Objective
Implement the approved FND-03 plan: full envelope, AppError, pagination, shared DTO types.

## Inputs Reviewed
- Approved Steps 0-5.
- `docs/BACKEND_NODE_RULES.md` §4, §6.
- Existing `backend/src/api/` files.

## Actions and Evidence
- Created `backend/src/api/app-error.ts`: `AppError` extends `Error` with `status`, `code`, `field`, `details`; convenience factories: `badRequest`, `validation`, `unauthenticated`, `forbidden`, `notFound`, `conflict`, `versionMismatch`, `locked`, `unprocessable`.
- Rewrote `backend/src/api/http-response.ts`: added `PageMeta`, `ErrorMeta` types; `sendCollection`, `sendCreated`, `sendAccepted`, `sendDeleted`; extended `sendFailure` with optional `field` + `details[]`.
- Updated `backend/src/api/error-handler.ts`: detects `AppError`, forwards its status/code/field/details; unknown errors log server-side only and return 500.
- Created `backend/src/api/pagination.ts`: `parsePaginationQuery` parses `page` and `page_size`, clamps to [1, 100], returns `offset`, `limit`, and `buildPageMeta(totalItems)`.
- Created `backend/src/api/dto-types.ts`: `BaseResourceResponse`, `VersionedResponse`, `VersionedRequest`, `DateRangeFilter`, `UuidV4`.
- Updated `backend/src/app.ts`: added four sample endpoints (`/sample/resource`, `/sample/collection`, `/sample/error`, `/sample/validation-error`).
- Updated `backend/eslint.config.mjs`: added `argsIgnorePattern: '^_'` and `varsIgnorePattern: '^_'` to allow Express middleware placeholders.

## Changes Made
- `backend/src/api/app-error.ts` [NEW]
- `backend/src/api/http-response.ts` [MODIFY]
- `backend/src/api/error-handler.ts` [MODIFY]
- `backend/src/api/pagination.ts` [NEW]
- `backend/src/api/dto-types.ts` [NEW]
- `backend/src/app.ts` [MODIFY]
- `backend/src/app.test.ts` [MODIFY]
- `backend/eslint.config.mjs` [MODIFY]

## Decisions Applied
- `satisfies` assertion retained on every JSON payload for strict type checking at compile time.
- `sendFailure` optional params default to `null`/`[]` so existing call sites (`notFoundHandler`) don't need updating.
- Sample endpoints live in `app.ts` only (no module) since FND-03 has no domain data; they can be removed or moved when domain modules are introduced.
- ESLint `argsIgnorePattern: '^_'` is the typescript-eslint-recommended pattern; it was missing from the initial config.

## Deferred / Not Changed
- No database, auth, or domain module logic (out of FND-03 scope).
- Frontend API client types (FND-05).

## Risks / Blockers
- None.

## Next Step
Run tests, typecheck, and lint.
