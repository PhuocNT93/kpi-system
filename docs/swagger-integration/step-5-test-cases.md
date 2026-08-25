# Step 5: Test Cases

Status: reconstructed during this step

## Deliverable

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC-SWAGGER-01 | GET `/api-docs.json` returns valid OpenAPI spec | App is running | `GET /api-docs.json` | Status 200 OK, JSON content-type, returns valid OpenAPI 3.0 spec object with `openapi: "3.0.0"` and `paths`. |
| TC-SWAGGER-02 | GET `/api-docs/` returns Swagger UI HTML page | App is running | `GET /api-docs/` | Status 200 OK, HTML content-type containing Swagger UI initializer. |
| TC-SWAGGER-03 | Health check endpoint is documented | App is running | Read spec JSON | `/health` route present under paths with summary and 200 response schema. |
| TC-SWAGGER-04 | Auth endpoints are documented | App is running | Read spec JSON | `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/refresh-token`, `/api/auth/change-password` documented with request bodies and responses. |
| TC-SWAGGER-05 | IAM endpoints are documented with bearerAuth | App is running | Read spec JSON | All IAM endpoints (`/api/iam/roles`, `/api/iam/permissions`, `/api/iam/users/{userId}/roles`, etc.) documented with `security: [{ bearerAuth: [] }]`. |
| TC-SWAGGER-06 | Existing test suite regression | Backend dependencies installed | `npm test` | All 49 existing tests continue to pass without error. |

## Inputs Reviewed
- Plan and OpenAPI specifications.

## Actions and Evidence
- Defined full test matrix for Swagger endpoint verification.

## Next Step
- Step 6: Implementation
