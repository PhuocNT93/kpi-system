# Step 2: Investigate

Status: reconstructed

## Deliverable

Relevant Documents:
- `docs/organization-module-design/LLD_Organization_Module.md`
- `docs/BACKEND_NODE_RULES.md`

Relevant Modules and Files:
- `backend/src/modules/organization/` (to be created)
- `backend/src/modules/organization/api/` (Routers, DTOs, Controllers)
- `backend/src/modules/organization/application/` (Services)
- `backend/src/modules/organization/domain/` (Models, Repository Interfaces)
- `backend/src/modules/organization/infrastructure/` (Postgres Repositories)
- `backend/migrations/`

Existing Implementation:
- The Organization module currently does not exist in the codebase. 
- The IAM module (`backend/src/modules/iam/`) has established patterns for CRUD and standard API responses which can be reused.

Existing Tests:
- No existing tests for the Organization module. Will need to create `backend/test/organization-api.test.ts` and `organization-module.test.ts`.

Patterns to Reuse:
- Modular monolith architecture (Router -> DTO Schema -> Application Service -> Repository).
- Standardized API envelope (`{ success, message, data, meta }`).
- Express middleware for authentication, RBAC, and error handling.
- UUID for primary keys (`department_id`, `role_id`, `job_level_id`), unique codes.
