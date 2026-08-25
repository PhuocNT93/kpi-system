# Step 1: Understand

Status: produced during step 1

## Deliverable
## Task Understanding

Goal: Redesign and establish the Employee Module as an independent bounded context providing employee master data, organizational assignment history (`employee_assignment`), manager reporting relationships, and historical assignment context (`getAssignmentAt`) for evaluation cycles.

Expected Behavior:
- Domain model includes Department, Team, Organization Role, Job Level, Employee, Employee Assignment, and Manager Relationships.
- Current assignment maintained on `employee`, historical context in `employee_assignment`.
- Single active assignment rule and non-overlapping date range invariants enforced.
- Circular manager reporting relationship and self-management prevented.
- Employee lifecycle status transitions (`ACTIVE`, `ON_LEAVE`, `INACTIVE`, `TERMINATED`) without hard deletes.

Acceptance Criteria:
1. Employee Module scope clearly defined.
2. Domain entities and DB design created with `employee_assignment`.
3. Invariants (1 active assignment, non-overlapping dates, no self/circular manager) enforced.
4. `EmployeeContextService` query contracts defined.
5. Optimistic locking on `employee` via `version` column.

Out of Scope:
- Evaluation score calculations/rules in Employee module.
- Hard delete of employee records.
- Realtime org chart UI/visualizations.

Business Rules Involved:
- Exactly 1 active assignment per employee (`effective_from < effective_to`).
- Managers must be active employees.
- Status termination closes active assignment.

## Actions and Evidence
- Reviewed user prompt proposal and LLD specifications.
