# Step 4: Plan

Status: reconstructed from approved review output.

## Objective
Concrete, minimal implementation plan for FND-03.

## Inputs Reviewed
- Steps 1-3 findings.
- `BACKEND_NODE_RULES.md` §4, §6.

## Implementation Plan

1. **What:** Create `AppError` class with stable HTTP status + error code mapping and convenience factories.
   **Where:** `backend/src/api/app-error.ts` [NEW]
   **Why:** Centralizes error semantics; `errorHandler` can detect `AppError` and forward its code/status without leaking internals.
   **Tests:** Covered indirectly via `/sample/error` and `/sample/validation-error` sample endpoints.

2. **What:** Extend `http-response.ts` with `sendCollection` (pagination `meta.page`), `sendCreated` (201 + Location), `sendAccepted` (202), `sendDeleted` (200), and add optional `field`/`details[]` to `sendFailure`.
   **Where:** `backend/src/api/http-response.ts` [MODIFY]
   **Why:** FND-03 DoD requires all envelope variants; pagination meta is required for every collection endpoint.
   **Tests:** `sendCollection` tested via `/sample/collection`; `sendFailure` with details tested via `/sample/validation-error`.

3. **What:** Update `error-handler.ts` to detect `AppError` and map it; unknown errors still map to 500.
   **Where:** `backend/src/api/error-handler.ts` [MODIFY]
   **Why:** Without this, thrown `AppError` falls through to the 500 handler.
   **Tests:** Tested via `/sample/error` returning 404 RESOURCE_NOT_FOUND.

4. **What:** Create `pagination.ts` — reusable query parser that converts Express query params into `offset`, `limit`, and `buildPageMeta`.
   **Where:** `backend/src/api/pagination.ts` [NEW]
   **Why:** Every collection endpoint needs consistent page/page_size parsing; centralizing prevents drift.
   **Tests:** Tested via `/sample/collection` with various `?page=` and `?page_size=` params.

5. **What:** Create `dto-types.ts` — shared base interfaces (`BaseResourceResponse`, `VersionedResponse`, `VersionedRequest`, `DateRangeFilter`, `UuidV4`).
   **Where:** `backend/src/api/dto-types.ts` [NEW]
   **Why:** Establishes shared naming conventions for all future module DTOs.
   **Tests:** Compile-time only (TypeScript types); no runtime tests needed.

6. **What:** Add sample endpoints to `app.ts` and update ESLint config to allow `_`-prefixed unused args.
   **Where:** `backend/src/app.ts` [MODIFY], `backend/eslint.config.mjs` [MODIFY]
   **Why:** DoD requires sample endpoints proving all envelope variants; ESLint fix prevents false positives on Express middleware signatures.
   **Tests:** All 10 test cases in `app.test.ts`.

## Changes Made
- None (plan phase only).
