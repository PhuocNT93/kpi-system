# Step 6: Implementation

Status: produced during this step

## Objective
Implement IAM & RBAC foundation module with zero database dependency.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- `docs/BACKEND_NODE_RULES.md`
- Attachment specifications

## Actions and Evidence
1. **Domain & Interfaces**:
   - `backend/src/modules/iam/domain/types.ts`: Defined `AuthorizationScope`, `Role`, `Permission`, `UserRole`, `RolePermission`, `AuthorizationContext`, `AuditEvent`, `AuditWriter`.
   - `backend/src/modules/iam/domain/repositories.ts`: Created `RoleRepository`, `PermissionRepository`, `UserRoleRepository`, `RolePermissionRepository`.

2. **Infrastructure**:
   - `backend/src/modules/iam/infrastructure/in-memory-repositories.ts`: Implemented `InMemoryRoleRepository`, `InMemoryPermissionRepository`, `InMemoryUserRoleRepository`, `InMemoryRolePermissionRepository`, and `InMemoryAuditWriter`.
   - `backend/src/modules/iam/infrastructure/iam.seed.ts`: Implemented `seedIamData` for 4 initial roles (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN`), seed permissions (`evaluation:read`, `cycle:lock`, etc.), scopes, and default role assignments.

3. **Application Services**:
   - `backend/src/modules/iam/application/services.ts`: Implemented `AuthorizationService` (union permission calculation, scope resolution, `hasPermission`, `authorize`), `RoleService`, `PermissionService`, and `RoleAssignmentService`.

4. **Presentation**:
   - `backend/src/modules/iam/presentation/authorize.middleware.ts`: Implemented Express `authorize` middleware checking `req.actor` / context against `AuthorizationService`.
   - `backend/src/modules/iam/presentation/iam.router.ts`: Created protected endpoints for roles, permissions, user-role assignments, and role-permission assignments.

5. **Wired into App & Documentation**:
   - Updated `backend/src/app.ts` and `backend/src/api/routes.ts`.
   - Added documentation in `docs/iam-rbac.md`.

6. **Tests**:
   - Created `backend/test/iam.test.ts` (unit & matrix test suite) and `backend/test/iam.api.test.ts` (API security & dynamic RBAC test suite).
   - All 45 tests passed successfully (`npm test`).

## Deliverables Created / Modified
- `backend/src/modules/iam/domain/types.ts`
- `backend/src/modules/iam/domain/repositories.ts`
- `backend/src/modules/iam/infrastructure/in-memory-repositories.ts`
- `backend/src/modules/iam/infrastructure/iam.seed.ts`
- `backend/src/modules/iam/application/services.ts`
- `backend/src/modules/iam/presentation/authorize.middleware.ts`
- `backend/src/modules/iam/presentation/iam.router.ts`
- `backend/src/modules/iam/index.ts`
- `backend/src/app.ts`
- `backend/src/api/routes.ts`
- `docs/iam-rbac.md`
- `backend/test/iam.test.ts`
- `backend/test/iam.api.test.ts`

## Next Step
Step 7: Test Results.
