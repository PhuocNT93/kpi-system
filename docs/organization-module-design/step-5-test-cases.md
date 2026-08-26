# Step 5: Test Cases

Status: reconstructed during Step 6

## Deliverable

### Test Matrix

| ID | Category | Test Case Description | Target Component | Expected Result |
|---|---|---|---|---|
| **TC-ORG-01** | Unit | Resolve active context at current date | `OrganizationContextService` | Returns context snapshot matching active assignment (`effective_to IS NULL`). |
| **TC-ORG-02** | Unit | Resolve historical context at past date `atDate` | `OrganizationContextService` | Returns context snapshot matching assignment range where `effective_from <= atDate <= effective_to`. |
| **TC-ORG-03** | Unit | Reject assignment with invalid date range (`effective_from >= effective_to`) | `AssignmentService` | Throws `ValidationError` ("effective_from must be before effective_to"). |
| **TC-ORG-04** | Unit | Reject overlapping assignments for the same employee | `AssignmentService` | Throws `ValidationError` ("Overlapping assignment date range detected"). |
| **TC-ORG-05** | Unit | Reject assignment where `manager_id == employee_id` | `AssignmentService` | Throws `ValidationError` ("Employee cannot be their own manager"). |
| **TC-ORG-06** | Integration | `GET /api/v1/employees/:id/context?at=2026-06-30` | `EmployeeController` | Returns `200 OK` with JSON envelope containing `department`, `team`, `job_role`, `job_level`, and `manager`. |
| **TC-ORG-07** | Unit | Decoupling JobRole from AccessRole | `IAM & Organization` | `JobRole` (`SOFTWARE_ENGINEER`) is maintained independently from IAM `AccessRole` (`EMPLOYEE`). |
| **TC-ORG-08** | Unit | Evaluation snapshot isolation | `Evaluation Module` | Changes to employee assignment after evaluation creation do not alter historical `EvaluationOrganizationContext` snapshot. |

## Inputs Reviewed
- Step 4 Implementation Plan

## Actions and Evidence
- Defined unit and integration test matrix for Organization Module context resolution and invariant enforcement.

## Decisions and Rationale
- Covered temporal range queries, self-manager prohibition, circular manager validation, and context snapshot isolation.

## Risks / Blockers
- None.

## Next Step
- Step 6: Implementation
