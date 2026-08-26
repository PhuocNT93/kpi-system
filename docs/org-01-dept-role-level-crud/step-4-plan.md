# Step 4: Plan

Status: reconstructed

## Deliverable

1. **What:** Create migration to add `department`, `job_role`, and `job_level` tables.
   **Where:** `backend/migrations/<timestamp>_create_organization_schema.ts`
   **Why:** Required to persist organizational master data.
   **Tests:** Run migration locally, test up/down logic.

2. **What:** Define repository interfaces and Postgres implementations for the three entities.
   **Where:** 
   - `backend/src/modules/organization/domain/department.repository.ts` (and for role/level)
   - `backend/src/modules/organization/infrastructure/postgres-department.repository.ts` (and for role/level)
   **Why:** Encapsulate database access logic.
   **Tests:** Integration tests verifying CRUD logic and unique constraint errors.

3. **What:** Create application services handling business rules (e.g., uniqueness of codes, listing, creation).
   **Where:** `backend/src/modules/organization/application/organization.service.ts` (or separated by entity)
   **Why:** Own the business logic and transaction boundaries.
   **Tests:** Unit tests mocking the repositories.

4. **What:** Implement request validation schemas using Zod and Express controllers to map inputs and return the standard API envelope.
   **Where:** 
   - `backend/src/modules/organization/api/organization.dto.ts`
   - `backend/src/modules/organization/api/organization.controller.ts`
   **Why:** Handle HTTP request parsing and response mapping safely.
   **Tests:** Unit tests for DTO schema validation and controller response formatting.

5. **What:** Setup Express router protected by RBAC middleware and export it from the module to integrate into the main app.
   **Where:** 
   - `backend/src/modules/organization/api/organization.router.ts`
   - `backend/src/modules/organization/organization.module.ts`
   - `backend/src/config/services.config.ts` (or wherever routers are registered)
   **Why:** Expose the endpoints to clients.
   **Tests:** E2E tests for the full flow including authentication and RBAC checks.
