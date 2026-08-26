# Step 2: Investigate

Status: Complete

## Key Findings

### 1. Existing Team CRUD — stub quality
`EmployeeController` has `createTeam`, `getTeams`, `getTeamById`, `updateTeam`, `deactivateTeam` implemented as **bare direct SQL** with no:
- RBAC enforcement (any authenticated user can create/update)
- Scope filter for Manager role (returns all teams)
- Department validation (FK accepts any UUID)
- Active-members guard on deactivate
- Duplicate-code uniqueness check
- Audit log writes
- Request DTOs or input validation

### 2. Audit Log Schema
Table `audit_log` with columns:
- `entity_type VARCHAR(50)` – e.g. `"team"`, `"employee"`
- `entity_id UUID`
- `action VARCHAR(20)` – e.g. `"TEAM_CREATED"`, `"TEAM_DEACTIVATED"`
- `field_name VARCHAR(100)` – optional field name for field-level changes
- `old_value TEXT`, `new_value TEXT`
- `reason TEXT`
- `performed_by UUID REFERENCES employee`  **← requires actor.employeeId**
- `performed_at TIMESTAMPTZ DEFAULT NOW()`
- `source VARCHAR(20)` – e.g. `"API"`

**Implication**: audit writes require `actor.employeeId`. When `actor.employeeId` is null (e.g. SYSTEM_ADMIN with no linked employee), audit should skip or use a system sentinel.

### 3. JWT & Actor
- `Actor.managedTeamIds` is populated at login time from `userRepository.findManagedTeamIds(employeeId)` inside `actorResolver` in `services.config.ts`
- `UserRepository.findManagedTeamIds` already exists (stub returns `[]` in in-memory repo)
- The middleware extracts `managedTeamIds` from JWT and places it on `req.actor`
- **Implication**: The `findManagedTeamIds` query must return the team(s) the actor's employee belongs to — this is the employee's `team_id` if their role is `MANAGER`. We need to implement this query in the Postgres user repository.

### 4. Version / Optimistic Lock
Employee update uses `WHERE version = $12` and returns 0 rows on mismatch → throws `RESOURCE_VERSION_CONFLICT`. The `team` table does **not** have a `version` column — it uses `updated_at` trigger. Team updates will use a straight `UPDATE ... WHERE team_id = $1` with no optimistic lock (team updates are HR-only admin actions, less concurrent risk).

### 5. Employee Repository has `client?` parameter
Both `EmployeeRepository.update(employee, client?)` and `EmployeeAssignmentRepository.create(assignment, client?)` accept an optional `client` (transaction client). We will follow the same pattern in the `TeamService`.

### 6. Frontend `patchApi` missing
Confirmed: `api-client.ts` has `getApi`, `postApi`, `putApi`, `deleteApi` but no `patchApi`. Team update uses `PATCH`. Must add `patchApi`.

### 7. IAM AuditEvent vs audit_log table
The IAM module has its own `AuditEvent` type (`ROLE_CREATED` etc.) written to the same `audit_log` table. The team feature will write `entity_type = 'team'` and `action = 'TEAM_CREATED'` etc. directly in-transaction using `pool.query` inside the service (same pattern as department raw SQL in controller).

### 8. `userRepository.findManagedTeamIds` — Postgres impl needed
The in-memory test repo returns `[]`. The Postgres auth repository (yet to be confirmed) must implement:
```sql
SELECT team_id FROM employee WHERE employee_id = $1 AND employment_status = 'ACTIVE'
```
This returns the single team the employee belongs to. For a MANAGER actor, `managedTeamIds` = their team.

### 9. Pool Transaction Pattern
No existing helper for transactions. The codebase uses `pool.query()` directly. For transactional writes, we use:
```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // writes...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Summary of Codebase Patterns to Follow
| Concern | Pattern |
|---|---|
| Service layer | Application service class (like `EmployeeContextService`) |
| Repository | Interface in domain, Postgres impl in infrastructure |
| Controller | Method per operation, delegates to service, maps to response DTO |
| Router | `createXxxRouter(controller, jwtMiddleware)` factory function |
| Error codes | `BadRequest`, `NotFound`, `Forbidden`, `Conflict`, `Unprocessable` from `app-error.ts` |
| Response | `sendSuccess`, `sendCollection`, `sendCreated` from `http-response.ts` |
| Audit | Direct `pool.query INSERT INTO audit_log` in the same DB transaction |
| Frontend API | `{resource}-api.ts` → `{resource}-keys.ts` → `{resource}-types.ts` → `domain/{resource}-models.ts` |
| Frontend hooks | `use{Resource}(filters)`, `useCreate{Resource}`, `useUpdate{Resource}`, `useDeactivate{Resource}` |

## Next Step
Step 3 – Design (Implementation Plan)
