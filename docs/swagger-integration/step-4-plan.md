# Step 4: Plan

Status: reconstructed during this step

## Deliverable

1. **Install Swagger Dependencies**
   - **What:** Install `swagger-ui-express` and `swagger-jsdoc` (plus `@types/swagger-ui-express` and `@types/swagger-jsdoc`).
   - **Where:** `backend/package.json`
   - **Why:** Provide Swagger UI middleware and OpenAPI specification generation for Express.
   - **Tests:** `npm test`, `npm run typecheck`, `npm run lint`.

2. **Create OpenAPI Spec Config / Definition**
   - **What:** Create Swagger configuration module (`swagger.ts`) defining OpenAPI 3.0.0 info, servers, components/schemas (envelope responses `ApiResponse`, `ApiCollectionResponse`, `ApiErrorResponse`, user models, auth DTOs, IAM DTOs), security schemes (`bearerAuth`), and complete paths/doc specs for all 21 endpoints.
   - **Where:** `backend/src/config/swagger.ts`
   - **Why:** Centralize OpenAPI 3.x schema definition matching all existing backend endpoints and data structures.
   - **Tests:** `backend/test/app.test.ts` (test `/api-docs` and `/api-docs.json`).

3. **Mount Swagger UI and JSON Endpoints**
   - **What:** Mount `/api-docs` (Swagger UI) and `/api-docs.json` (raw OpenAPI spec) in Express app setup.
   - **Where:** `backend/src/app.ts`
   - **Why:** Make Swagger UI and specification JSON publicly accessible.
   - **Tests:** Vitest app tests verifying HTTP 200 on GET `/api-docs` and GET `/api-docs.json`.

4. **Update App Integration Test & README**
   - **What:** Update `backend/test/app.test.ts` to assert Swagger UI and OpenAPI JSON endpoints return 200 OK. Update `README.md` with instructions on accessing Swagger UI and using `bearerAuth`.
   - **Where:** `backend/test/app.test.ts`, `README.md`
   - **Why:** Ensure endpoints are covered by regression tests and documented for developers.
   - **Tests:** `npm test`.

## Inputs Reviewed
- Steps 1-3 deliverables.

## Actions and Evidence
- Formulated step-by-step implementation plan.

## Next Step
- Step 5: Test Cases
