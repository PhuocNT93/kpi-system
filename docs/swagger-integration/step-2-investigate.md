# Step 2: Investigate

Status: reconstructed during this step

## Deliverable

### Relevant Documents
- Prompt attachment (Swagger / OpenAPI requirements)
- `docs/BACKEND_FASTAPI_RULES.md` / Node.js Express rules
- `backend/package.json`

### Relevant Modules and Files
- `backend/package.json` — ESM (`"type": "module"`), Express 4.21, TypeScript 5.7, vitest test runner.
- `backend/src/app.ts` — Express application setup, global middlewares (`requestIdMiddleware`, `cors`, `express.json`), `/health` endpoint, mounted `/api` router, `notFoundHandler`, `errorHandler`.
- `backend/src/api/routes.ts` — Router mounted at `/api`. Contains sample endpoints (`/sample/resource`, `/sample/collection`, `/sample/error`, `/sample/validation-error`) and mounts sub-routers (`/auth`, `/iam`).
- `backend/src/modules/auth/auth.router.ts` — Auth routes mounted under `/api/auth`: `/signup`, `/login`, `/refresh`, `/refresh-token`, `/change-password`.
- `backend/src/modules/iam/presentation/iam.router.ts` — IAM routes mounted under `/api/iam`: `/roles`, `/roles/:id`, `/permissions`, `/permissions/:id`, `/users/:userId/roles`, `/roles/:roleId/permissions`, etc.
- `backend/src/api/http-response.ts` & `backend/src/api/app-error.ts` — Common response structures (`sendSuccess`, `sendCollection`, `AppError`, `ValidationError`).

### Existing Implementation Summary
- Framework: Express 4.x in TypeScript (ESM format).
- Router structure:
  - Global `/health`
  - Base route prefix: `/api`
  - `/api/auth/*` (5 endpoints)
  - `/api/iam/*` (11 endpoints)
  - `/api/sample/*` (4 endpoints)
  - Total API endpoints = 21 (1 health + 4 sample + 5 auth + 11 IAM).
- Authentication: JWT Bearer token passed in `Authorization: Bearer <token>` header.

### Existing Tests
- Vitest suite in `backend/test/` (49 passing, 8 skipped database tests). `npm test` runs clean.

### Patterns to Reuse
- Swagger library: `swagger-ui-express` + `swagger-jsdoc` (or explicit `swagger-jsdoc` config / OpenAPI spec object) compatible with Express ESM.
- Reusable schemas for standard API response envelopes (`ApiResponse`, `ApiCollectionResponse`, `ApiErrorResponse`, `ValidationErrorResponse`).

## Inputs Reviewed
- Workspace file inspection, package.json, routes.ts, auth.router.ts, iam.router.ts.

## Actions and Evidence
- Ran `npm test` to verify baseline test status.

## Next Step
- Step 3: Impact Analysis
