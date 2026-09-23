# Step 1: Understand

Status: produced during this step

## Deliverable

### Goal

Implement two capabilities in full alignment with the existing LLD v1.8 and established module patterns:

1. **Review Cadence Data Model & CRUD** — create the `review_cadence` table, CRUD API/service, add `default_review_cadence_id` to `job_level`, add `review_cadence_override_id` / `last_evaluation_completed_at` / `next_review_due_date` to `employee`, with migration, validation, RBAC (HR_ADMIN / SYSTEM_ADMIN only), FK integrity, and transactional audit via the existing `withAuditedTransaction` mechanism.

2. **Cadence Precedence Resolver** — implement a pure/stateless function `resolveEffectiveCadence` with table-driven tests covering all 7 precedence combinations; integrate into the existing `employee-review-status.ts` review-due logic (not a parallel implementation).

---

### Expected Behavior

#### Review Cadence CRUD
- `GET /api/review-cadences` — paginated list (HR_ADMIN + SYSTEM_ADMIN)
- `GET /api/review-cadences/:id` — detail
- `POST /api/review-cadences` — create; enforces: code unique, name non-empty, interval_months > 0; enforces at most 1 `is_system_default=true` via service logic
- `PATCH /api/review-cadences/:id` — update; same validation
- `DELETE /api/review-cadences/:id` — rejects with 409 if cadence is referenced by any `job_level.default_review_cadence_id` or `employee.review_cadence_override_id`

#### Job Level integration
- `PATCH /api/org/job-levels/:id` extended to accept `default_review_cadence_id` (nullable UUID)
- FK enforced at DB level; audit logged on change

#### Employee integration
- `employee.review_cadence_override_id` — nullable FK → review_cadence; updated by HR_ADMIN only
- `employee.last_evaluation_completed_at` — updated only on evaluation PUBLISHED transition (existing workflow)
- `employee.next_review_due_date` — computed by backend when last_evaluation_completed_at is set or cadence changes; null when last_evaluation_completed_at is null

#### Precedence Resolver
- Pure function: `resolveEffectiveCadence({ employeeOverride, jobLevelDefault, systemDefault }) → ReviewCadence | null`
- No DB access, no ORM, no request context
- Integrated into review-due calculation (reuse `employee-review-status.ts` pattern, not a duplicate)

---

### Acceptance Criteria

**Backend**
1. `review_cadence` table with `review_cadence_id UUID PK`, `code VARCHAR(30) UNIQUE NOT NULL`, `name VARCHAR NOT NULL`, `interval_months INT NOT NULL CHECK > 0`, `is_system_default BOOLEAN NOT NULL`, `active BOOLEAN NOT NULL`, `created_at`, `updated_at`
2. Migration runs from clean DB and existing DB without data loss; rollback supported
3. `job_level.default_review_cadence_id` column added (nullable FK → review_cadence)
4. `employee.review_cadence_override_id` (nullable FK), `employee.last_evaluation_completed_at` (timestamptz nullable), `employee.next_review_due_date` (date nullable) added
5. All FK constraints and CHECK constraints implemented at DB level
6. CRUD API follows existing envelope `{ success, message, data, meta }` and routes convention
7. RBAC: HR_ADMIN and SYSTEM_ADMIN only for all cadence mutations; unauthorized users get 403
8. Audit: CREATE/UPDATE/DELETE cadence and UPDATE job_level/employee cadence fields go through `withAuditedTransaction`
9. Delete blocked with 409 `CADENCE_IN_USE` when referenced
10. `resolveEffectiveCadence` is a pure function with no DB access
11. Table-driven tests cover all 7 resolver precedence cases
12. Integration test: effective cadence flows through to `next_review_due_date` calculation

**Frontend**
13. `/admin/review-cadences` page with list, create, edit, delete UX (HR_ADMIN + SYSTEM_ADMIN only)
14. Validation and API errors displayed inline
15. 409 Conflict on delete shows user-friendly message
16. Job Level form extended with default cadence selector (nullable)
17. Employee profile shows `review_cadence_override_id` selector for HR_ADMIN; effective cadence info from backend response
18. Loading, empty, error states on all screens
19. No business logic duplicated in React (effective cadence comes from backend)

---

### Out of Scope

- Review Due Dashboard (`GET /reviews/due`) — not part of this task
- `POST /evaluation-cycles/individual` — not part of this task
- Email notification on due-date changes — handled by existing notification module (no change)
- Batch recalculation of `next_review_due_date` for all employees on cadence change — only per-employee update on direct change
- i18n translation entries for cadence name — existing `i18n_translation` table supports this but seeding translations is out of scope
- Auto-creation of evaluations — Phase 2
- Multi-system-default conflict resolution beyond "reject second system-default at create/update time"

---

### Business Rules Involved

- **BR-1 (LLD §14.1):** Precedence order: `employee.review_cadence_override_id` > `job_level.default_review_cadence_id` > `review_cadence.is_system_default=true`
- **BR-2 (LLD §14.1):** `next_review_due_date = last_evaluation_completed_at + effective_cadence.interval_months`; null if `last_evaluation_completed_at` is null
- **BR-3 (LLD §14.1):** `last_evaluation_completed_at` updated only when evaluation reaches `PUBLISHED` status — not on draft, submit, or any other intermediate state
- **BR-4:** At most one `review_cadence` record may have `is_system_default = true` at any time (enforced at application service layer)
- **BR-5 (LLD §10):** `review_cadence.interval_months > 0` enforced at DB (CHECK constraint) and application layer
- **BR-6 (RBAC §17):** HR_ADMIN and SYSTEM_ADMIN can CRUD cadence, assign cadence to job_level, override employee cadence; MANAGER and EMPLOYEE cannot
- **BR-7:** Deleting a cadence that is FK-referenced (job_level or employee) must be rejected with 409
- **BR-8 (LLD §14.1, Rule 10):** Changing employee's `review_cadence_override_id` or `job_level.default_review_cadence_id` must produce audit_log entry
- **BR-9:** `employee.employment_status ∈ {INACTIVE, TERMINATED}` — Review Due Dashboard excludes them (out of scope here, but `next_review_due_date` field still exists on employee)
- **BR-10:** Resolver is resolve-runtime (not denormalized like criterion weight) — LLD §14.1 explicitly states this

---

### Open Questions / Conflicts

1. **`is_system_default` uniqueness enforcement**: LLD says "exactly 1 row marked true". The task prompt says "if architecture allows many, resolver must have deterministic rule or reject ambiguous config." Current LLD is unambiguous — enforce single system default at service layer (reject POST/PATCH that would create a second `is_system_default=true`).

2. **Existing `review_cadence` varchar column on `employee`**: Migration `1788926000003` already added `employee.review_cadence varchar(50)`. Migration `1790000000000` added `employee.review_cadence_months integer`. These are ad-hoc columns added in earlier iterations, **not** the proper FK-based approach defined in LLD. The new migration must:
   - Add `employee.review_cadence_override_id UUID FK → review_cadence` (new)
   - The existing `review_cadence varchar` column was added but never used in the domain model (LLD specifies FK). **Flag**: We should add the new FK column and NOT drop the old varchar column (to avoid breakage of any existing data), but the old column will be superseded. This will be flagged in the implementation report.

3. **`employee.next_review_due_date` type**: LLD says `date`, but migration `1788926000003` used `timestamp with time zone`. The domain type in `employee.domain.ts` uses `nextReviewDueDate?: string | null`. We will follow the LLD (`date`) for the new FK-based column since the old column was timestamptz. **Decision**: use `DATE` type for the new column (if we add one alongside the existing), or confirm the existing `next_review_due_date timestamptz` column already exists and just needs the FK to be populated properly. Per investigation: `next_review_due_date` already exists as `timestamptz`. We will keep that column and use it.

4. **`last_evaluation_completed_at`**: Already exists in the `employee` table (via `1788926000003`). No new column needed.

5. **Job Level `default_review_cadence_id`**: Does NOT yet exist — must be added via migration.

6. **`review_cadence_override_id`**: Does NOT yet exist as FK — must be added via migration. The existing `review_cadence varchar(50)` is a separate unrelated column.

---

### Inputs Reviewed

- `docs/LLD_Employee_Performance_Evaluation_System.md` (v1.8) — sections 10.1, 14.1, 16, 17
- `docs/BACKEND_NODE_RULES.md` — all sections
- `docs/FRONTEND_REACT_RULES.md` — all sections
- Existing migration files (1788926000003, 1788926000004, 1790000000000) — confirmed employee columns already partially exist
- `backend/src/modules/organization/` — confirmed module structure (api/application/domain/infrastructure)
- `backend/src/modules/audit/` — confirmed `withAuditedTransaction` + `AuditService.record(tx, params)`
- `backend/src/api/app-error.ts` — confirmed error classes (Conflict, NotFound, Unprocessable, ValidationError, Forbidden)
- `backend/src/app.ts` + `backend/src/api/routes.ts` — confirmed module registration pattern
- `backend/src/modules/employee/domain/employee-review-status.ts` — existing pure review-status function (pattern for resolver)
- `frontend/src/features/organization/api/organization-api.ts` — confirmed API client pattern
- `frontend/src/App.tsx` — confirmed routing pattern and role-based route protection

## Next Step

Step 2 — Investigate (pending user approval)
