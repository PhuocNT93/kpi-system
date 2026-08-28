# Step 1: Understand

Status: reconstructed from approved response

## Deliverable
### Task Understanding

Goal:
Design and document a production-ready, rule-driven, state-driven, permission-aware, and snapshot-aware UI/UX specification and frontend architecture for the Evaluation Cycle Module of the Employee Performance Evaluation System. The deliverables will cover screen mapping, user flows, screen specifications, reusable component architecture, API/UI contracts, state machine mapping, UX copy guidelines, and React implementation guidance.

Expected Behavior:
- Rule-Driven & Configurable: Zero hardcoded business domain assumptions (e.g., specific roles like SI/SM/BA, fixed team structures, hardcoded criterion weights/categories, or hardcoded state transitions).
- State-Driven & Permission-Aware: All UI components, buttons, workflow CTAs, and editability triggers strictly follow backend metadata (status, allowedActions).
- Snapshot-Aware UI: The UI clearly communicates that opening an evaluation cycle takes immutable snapshots of team_id, role_id, manager_id, and template rules.
- Safety & Clarity in Cycle Opening: High-impact state transitions require prominent confirmation modals displaying scope summaries and explicit snapshot disclaimers.
- Robust Error & Edge State Handling: Structural handling for partial evaluation creation failures, concurrent edits, locked cycle state, empty states, processing progress feedback, and semantic error code mapping.

Acceptance Criteria:
1. Cycle Creation & Configuration: HR/Admin can create an Evaluation Cycle with code, name, published templateVersionId, date range (startDate, endDate), multi-selected applicable teams, multi-selected applicable roles, optional calibration toggle, and configurable grace period days.
2. Mandatory vs. Optional Configurations: Self-assessment is visually indicated as mandatory (system-wide rule), while Calibration remains configurable/togglable per cycle.
3. Scope Preview & Validation: Pre-open UI displays estimated scope count broken down by team and role via GET /evaluation-cycles/{id}/scope-preview before opening.
4. Deliberate Cycle Opening: Transitioning from DRAFT to OPEN requires explicit confirmation with clear list of side effects.
5. Processing State & Progress: Displays loading progress and handled state transitions cleanly during synchronous or polling-based bulk instance creation.
6. Snapshot Transparency: Displays clear snapshot information on cycle details and evaluation instances.
7. Global Locked State: When cycle status is LOCKED, all controls, buttons, forms, and bulk actions globally transition to read-only state.
8. Semantic Error Contract: Field-level and global error displays bind directly to backend structured error codes.
9. Zero Assumptions / Data-Driven UI: UI scales dynamically for any seed/production dataset.
10. Complete Deliverable Artifacts: Delivers Artifacts 1 to 8 in strict sequence.

Out of Scope:
- Implementation of unrelated modules except where referencing their DTO/contract.
- Direct database schema alterations or backend code generation during specification steps.

Business Rules Involved:
1. Source of Truth for Workflow: Workflow state and permitted user operations are dictated by allowedActions returned in EvaluationCycleDTO.
2. Snapshot Immutability: Employee team, role, and manager at the exact moment the cycle is opened are frozen.
3. Template Immutability: Template criteria, weights, level definitions, and scoring rules are frozen at cycle opening.
4. Mandatory Self-Assessment: Every evaluation cycle enforces mandatory self-assessment.
5. Cycle Lock Integrity: Locking a cycle is idempotent and permanently halts all write transactions.

Open Questions / Conflicts:
- Synchronous vs. Asynchronous Job Handling for Open Cycle: UI state machine will support both immediate response and progress polling patterns cleanly.

## Inputs Reviewed
- Attachment: Evaluation Cycle UI/UX Specification Prompt
- docs/LLD_Employee_Performance_Evaluation_System.md
- docs/AI_AGENT_WORKFLOW.md

## Actions and Evidence
- Analyzed LLD requirements (§10.3, §10.5, §14, §16, §20) and prompt specification rules.

## Decisions and Rationale
- Standardized UI interaction model on backend-driven state machine and allowedActions payload.

## Risks / Blockers
- None.

## Next Step
- Step 2: Investigate
