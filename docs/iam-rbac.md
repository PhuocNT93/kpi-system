# IAM & RBAC Module Documentation

## 1. Architecture
The IAM & RBAC module is designed as a persistence-independent authorization foundation inside a Modular Monolith Node.js/Express backend.

```
                    ┌─────────────────────┐
                    │      HTTP API       │
                    └──────────┬──────────┘
                               │
                         JWT Authentication
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Authenticated    │
                    │      Principal      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authorization Guard │
                    │    / Middleware     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ AuthorizationService│
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
          RoleRepository  PermissionRepo  UserRoleRepo
                 │             │             │
                 └─────────────┼─────────────┘
                               ▼
                   RolePermissionRepository
                               │
                               ▼
                    In-Memory Implementation
                               │
                     ───── Future ─────
                               │
                               ▼
                    PostgreSQL Implementation
```

## 2. Authentication vs Authorization
- **Authentication** (`AuthService`, JWT middleware) verifies identity: "Who is this caller?" (`sub` / `userId`).
- **Authorization** (`AuthorizationService`) determines permission & scope: "What can `userId` perform on which resource under what scope?"
- Authorization context is resolved dynamically from stored RBAC repositories. Permissions are not frozen into JWT claims.

## 3. Role Model
Roles are data-driven entities containing:
- `id`, `code` (stable uppercase string e.g. `EMPLOYEE`, `MANAGER`, `HR_ADMIN`, `SYSTEM_ADMIN`), `name`, `description`, `active`, `systemRole`.
- Roles can be dynamically created or modified via `/api/iam/roles`.

## 4. Permission Model
Canonical format: `resource:action` (e.g. `evaluation:read`, `cycle:lock`, `user:assign_role`).
- `id`, `code`, `resource`, `action`, `description`, `active`.

## 5. Scope Model
Scopes determine resource boundary permissions:
- `SELF`: Own resources.
- `TEAM`: Managed team resources.
- `ORGANIZATION`: Entire organization resources.
- `SYSTEM`: System-level administration.

Higher ranks encompass lower ranks (`SYSTEM` > `ORGANIZATION` > `TEAM` > `SELF`).

## 6. Protecting an Endpoint
Use the `authorize` middleware:
```typescript
import { authorize } from '../modules/iam/index.js';

router.get(
  '/evaluations',
  jwtMiddleware,
  authorize(authorizationService, 'evaluation:read', 'TEAM'),
  controller.getEvaluations
);
```

## 7. Role & Permission Operations
- **Assign Role to User**: `POST /api/iam/users/:userId/roles` with `{ "roleCode": "MANAGER" }`.
- **Add New Permission**: Call `PermissionService.createPermission({ resource: 'calibration', action: 'review' })`.
- **Add New Role without code changes**: Send `POST /api/iam/roles` with `{ "code": "AUDITOR", "name": "Auditor" }`.

## 8. Strategy for Replacing In-Memory Repositories with PostgreSQL
When introducing PostgreSQL later:
1. Create SQL schema (`roles`, `permissions`, `user_roles`, `role_permissions`).
2. Implement relational repository adapters adhering to the exact TypeScript interfaces:
   - `PostgresRoleRepository implements RoleRepository`
   - `PostgresPermissionRepository implements PermissionRepository`
   - `PostgresUserRoleRepository implements UserRoleRepository`
   - `PostgresRolePermissionRepository implements RolePermissionRepository`
3. Wire the PostgreSQL repositories into `backend/src/app.ts` dependency injection container.
4. Authorization policies, domain entities, controllers, and services remain completely unchanged.
