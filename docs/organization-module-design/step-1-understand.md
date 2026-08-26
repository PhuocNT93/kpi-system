# Step 1: Understand

Status: reconstructed during Step 6

## Deliverable

### Task Understanding

Goal:
Formulate and document the comprehensive architectural design of the Organization Module based on Attachment #1 design specification. The Organization Module will serve as the single source of truth for organizational context resolution (point-in-time snapshotting of Employee, Team, Department, Job Role, Job Level, and Manager hierarchy) for Evaluation, Template Applicability, Workflow Authorization, and RBAC Scope.

Expected Behavior:
1. Model the 7 core domain concepts: Employee, Department, Team, Job Role (business), Job Level, Manager Relationship, and Employee Assignment.
2. Treat EmployeeAssignment with temporal semantics (effective_from, effective_to) as the central aggregate for resolving an employee's organizational context at any given evaluation timestamp (resolveContext(employeeId, effectiveAt)).
3. Explicitly decouple business roles (JobRole) from security/authorization roles (AccessRole in IAM/RBAC).
4. Define the Organization Context Resolver service and bounded context contract (EvaluationOrganizationContext) to pass immutably snapshot context into Evaluation instances upon creation.
5. Specify temporal non-overlapping constraints and manager hierarchy validation rules.
6. Define domain services, validation rules, database schema, and REST API boundaries (GET /employees/{id}/context?at={date}).

Acceptance Criteria:
1. Complete design specification covering Organization's 4 core responsibilities: Master Data, Assignment Management, Historical Context Resolution, and Organizational Scope.
2. Unambiguous boundaries established: Organization provides organizational context; it does not compute scores, resolve scoring rules, execute evaluation workflows, or alter historic evaluation snapshots.
3. Invariant rules documented (non-overlapping temporal assignments, self-manager prohibition, acyclic manager relationships, business code uniqueness).
4. Alignment with existing docs/LLD_Employee_Performance_Evaluation_System.md baseline structure.

Out of Scope:
- Code implementation or database migrations (deferred to Step 6 after plan approval).
- Score calculations, scoring rules, or evaluation workflow state transitions inside Organization Module.
- Multi-tenant / multi-organization capabilities.

Business Rules Involved:
- Job Role vs Access Role: Business Job Role (SOFTWARE_ENGINEER) is isolated from IAM Access Role (EMPLOYEE / MANAGER).
- Temporal Consistency: For any given employee, assignment date ranges (effective_from to effective_to) must never overlap.
- Evaluation Snapshot Immutability: When an evaluation is initialized, EvaluationOrganizationContext is snapshotted into the evaluation record. Future organizational transfers do not affect historical evaluations.
- Hierarchy Validity: manager_id != employee_id, and manager dependency graphs must be acyclic.

Open Questions / Conflicts:
- None.

## Inputs Reviewed
- Attachment #1 Design Specification for Organization Module
- `docs/LLD_Employee_Performance_Evaluation_System.md`

## Actions and Evidence
- Analyzed design requirements for Organization Module bounded context.

## Decisions and Rationale
- Adopted 4-pillar architectural structure: Master Data, Assignment Management, Historical Context Resolution, and Organizational Scope.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
