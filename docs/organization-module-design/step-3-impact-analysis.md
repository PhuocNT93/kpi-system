# Step 3: Impact Analysis

Status: reconstructed during Step 6

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| **Frontend** | Medium | UI components for Employee/Team/Department management will consume `/api/v1/employees/:id/context?at=YYYY-MM-DD` and assignment history views. |
| **Backend** | Medium | Organization domain logic, `OrganizationContextResolver` service, assignment validation rules (temporal overlap check, manager loop prevention). |
| **Database** | Low | Existing schema already has `department`, `team`, `role`, `job_level`, `employee`, and `employee_assignment` with index on `(employee_id, effective_from, effective_to)`. No new schema changes needed immediately. |
| **API** | Low/Medium | REST endpoints to query organizational context at specific timestamps (`GET /api/v1/employees/:id/context`), manage master data (Department, Team, JobRole, JobLevel), and manage assignments. |
| **RBAC / Scope** | High | Organization Module supplies organizational scope (e.g. manager's team members/subordinates) to IAM/RBAC, while decoupling business `JobRole` from IAM `AccessRole`. |
| **Workflow** | Medium | Evaluation workflow relies on `OrganizationContextService` to authorize manager submissions (`isManagerOf(actorId, employeeId)`). |
| **Audit** | Low | Historical assignment modifications and master data changes logged via existing audit/timestamp mechanisms. |
| **Locking / Concurrency** | Medium | `employee.version` column enforced for optimistic locking during concurrent assignment updates or employee record modifications. |
| **Scoring / Snapshots / History** | High | Evaluation module creates an immutable `EvaluationOrganizationContext` snapshot upon evaluation cycle creation, ensuring historic evaluation records remain unaffected by future transfers or organizational restructures. |
| **Performance** | Low | Indexed query on `(employee_id, effective_from, effective_to)` ensures O(log N) lookup performance for date-specific context resolution. |
| **Security** | Low | Organization APIs validate authenticated session and enforce RBAC scope restrictions before returning context or subordinate data. |

### Architectural Decisions & Risk Assessment

1. **Snapshot Immutability (ADR):**
   - *Decision:* `Evaluation` records will snapshot the `EvaluationOrganizationContext` (Department, Team, Job Role, Job Level, Manager) at the time of evaluation creation.
   - *Rationale:* Ensures complete historical auditability. If an employee transfers teams mid-year, prior cycle evaluation records remain anchored to their original organizational context.

2. **Decoupling Job Roles from Access Roles:**
   - *Decision:* Business titles (e.g. `Senior Software Engineer`) are stored in `job_role`, while authorization permissions (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`) are stored in IAM `user_role`.
   - *Rationale:* Prevents privilege escalation and maintains a clean boundary between HR identity data and security access policies.

3. **Temporal Assignment Non-Overlapping Invariant:**
   - *Decision:* Validation in `AssignmentService` prevents any overlapping date ranges for active assignments of the same employee.

## Inputs Reviewed
- `docs/LLD_Employee_Performance_Evaluation_System.md`
- Attachment #1

## Actions and Evidence
- Conducted impact analysis across backend, DB, API, security, and snapshot history areas.

## Decisions and Rationale
- Standardized snapshot DTO contract `EvaluationOrganizationContext`.

## Risks / Blockers
- None.

## Next Step
- Step 4: Plan
