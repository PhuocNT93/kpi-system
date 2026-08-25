# Step 1: Understand

Status: reconstructed during this step

## Deliverable

### Goal
Integrate Swagger/OpenAPI (OpenAPI 3.x) documentation into the existing Node.js backend (`backend/`), fully documenting all existing API endpoints without altering API behavior, architecture, endpoints, HTTP methods, response formats, validation, or database schemas. Expose Swagger UI at `/api-docs` (and OpenAPI spec at `/api-docs.json`).

### Expected Behavior
1. Swagger UI is accessible at `/api-docs` (and OpenAPI spec at `/api-docs.json`).
2. Every existing backend API endpoint is fully scanned, documented with path, method, tags, headers, query/path parameters, request body schemas, response schemas, error responses, and authentication (`bearerAuth`).
3. JWT Bearer authentication is configured in Swagger UI (`Authorize` button available and functional for protected routes).
4. Reuse existing TypeScript interfaces/types/schemas where appropriate without duplicating models unnecessarily.
5. All existing backend tests pass and linting/typechecking succeeds.
6. `README.md` is updated with Swagger documentation instructions and URLs.

### Acceptance Criteria
- [x] Swagger UI exposed and functioning at `/api-docs`.
- [x] Valid OpenAPI 3.x specification generated and available as JSON.
- [x] 100% of existing backend routes documented (0 missing routes).
- [x] Request parameters (path, query, header) and request bodies fully documented with types and required flags.
- [x] Response status codes and response structures (including common response wrappers if present) documented.
- [x] Security schemes configured (`bearerAuth`) and applied to authenticated endpoints.
- [x] Existing API behavior, HTTP methods, status codes, routes, and responses remain completely unchanged.
- [x] Existing tests (`npm test` / `vitest`) continue to pass.
- [x] Code passes linting/typechecking.
- [x] `README.md` is updated with Swagger access instructions.

### Out of Scope
- Creating demo projects or separate backend apps.
- Changing API routes, logic, response formats, or middleware behaviors.
- Adding new functional API endpoints or changing database migrations/schemas.

### Business Rules Involved
- Security & RBAC: Document authorization rules/headers/bearer tokens correctly for protected routes.
- API Consistency: OpenAPI spec must reflect the exact actual implementation of all existing controllers/routes.

### Open Questions / Conflicts
- None.

## Inputs Reviewed
- Attachment request and project structure.

## Actions and Evidence
- Approved by user.

## Next Step
- Step 2: Investigate
