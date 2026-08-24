# AI Agent Development Workflow

## 1. Purpose and precedence

This workflow is mandatory for any AI development agent, including Claude, Codex, Antigravity, and GitHub Copilot.

Primary project sources of truth, in order:

1. `docs/LLD_Employee_Performance_Evaluation_System.md`
2. `docs/BACKEND_FASTAPI_RULES.md`
3. `docs/FRONTEND_REACT_RULES.md`
4. Approved feature requirements and acceptance criteria.

Do not invent, replace, or silently alter project requirements, architecture, business rules, API contracts, workflow, RBAC, scoring, audit, locking, concurrency, or history/snapshot behavior.

When a source conflicts with a task, or a task is ambiguous, stop and request clarification or an approved ADR/LLD update.

## 2. Mandatory operating mode

The agent follows this sequence:

```text
STEP 0: Sync and Branch
    -> STEP 1: Understand
    -> STEP 2: Investigate
    -> STEP 3: Impact Analysis
    -> STEP 4: Plan
    -> STEP 5: Define Test Cases
    -> STEP 6: Implement
    -> STEP 7: Test
    -> STEP 8: Code Review
    -> STEP 9: Performance Review
    -> STEP 10: Final Verification
    -> Done
```

### Approval gate

At the end of **every** step, the agent must:

1. Output only the required deliverable for that step and a concise list of blocking questions, if any.
2. End with exactly: `STATUS: WAITING FOR USER REVIEW - STEP <n>`.
3. Stop all work. Do not read more files, run more commands, modify files, execute tests, or advance to the next step.
4. Continue only after the user explicitly approves that step, for example: `Approve step <n>`, `Continue`, or an unambiguous equivalent.

User feedback changes the current step's deliverable. The agent must revise it and wait for approval again before proceeding. If the user changes scope, return to the earliest affected step and state why.

The only exception is a genuine blocker (for example: missing repository access, merge conflict, ambiguous requirement, failing required check after three repair attempts). Report the blocker and wait for instruction.

### Resuming an active task

A task is already active — and must resume at its current step rather than restart at Step 0 — when either is true:

- The conversation contains an earlier, unresolved `STATUS: ... - STEP <n>` for this task.
- `docs/<task-slug>/` already holds saved step artifacts for this task.

A message such as a follow-up question, a bug report against the current deliverable, or a request to tweak something already produced is feedback on the current step, not a new task. The agent revises that step's deliverable in place and ends with `STATUS: IN PROGRESS - STEP <n> (revising per feedback)`; once the revision is ready for review it ends with the normal `STATUS: WAITING FOR USER REVIEW - STEP <n>`. Step 0 is only re-entered when the user starts a genuinely new task (a different slug, or an explicit statement that this is separate work).

### Persistent step artifacts

For every task, derive a lowercase kebab-case task slug. After Step 5 is approved and before the first implementation edit, create `docs/<task-slug>/`. Save the approved Step 0-5 deliverables there retrospectively, then save every subsequent step's deliverable before responding to the user. Do not edit files merely to create artifacts before Step 6.

Each artifact uses a fixed per-step filename — not a free-form slug — matching `docs/int-backend-frontend/` as the reference example:

| Step | Filename |
|---|---|
| 0 | `step-0-sync-and-branch.md` |
| 1 | `step-1-understand.md` |
| 2 | `step-2-investigate.md` |
| 3 | `step-3-impact-analysis.md` |
| 4 | `step-4-plan.md` |
| 5 | `step-5-test-cases.md` |
| 6 | `step-6-implementation.md` |
| 7 | `step-7-test-results.md` |
| 8 | `step-8-code-review.md` |
| 9 | `step-9-performance-review.md` |
| 10 | `step-10-final-verification.md` |

Each file must state whether it is reconstructed from an earlier approved response or produced during the current step. It must use this evidence-based structure, omitting only sections that are genuinely not applicable:

```markdown
# Step <n>: <name>

Status: reconstructed / produced during this step

## Deliverable
## Inputs Reviewed
## Actions and Evidence
## Changes Made
## Decisions and Rationale
## Risks / Blockers
## Next Step
```

`Deliverable` must reproduce that step's own "Required output" in full, using the exact fields, tables, and lists defined under that step's heading elsewhere in this document — the Step 1 Task Understanding fields (Goal, Expected Behavior, Acceptance Criteria, Out of Scope, Business Rules Involved, Open Questions / Conflicts), the Step 3 impact table and risk/ADR lists, the Step 4 plan items, the Step 5 test case table, the Step 8 findings and checklist, and so on. It is a copy of the real deliverable, not a one-line paraphrase or summary — a reader must be able to act on Step 3's `Deliverable` without re-deriving the impact table from `Actions and Evidence`.

`Actions and Evidence` must identify the exact command, tool, file, or test used and its observed result. Never claim that a command was executed, a test passed, or an output was observed when it was not. Do not record secrets, tokens, passwords, or raw sensitive data.

Do not create artifacts for uncompleted steps. When a task includes frontend changes, create `docs/<task-slug>/frontend-user-guide.md` during implementation and update it before final verification. The guide must cover prerequisites, startup and shutdown commands, configured URLs, expected validation behavior, configurable values, available user-visible behavior, and known limitations without exposing secrets or claiming unimplemented capabilities.

## Step 0 - Sync and Branch

### Goal

Start from the latest approved base branch without overwriting user work, then create an isolated feature branch.

### Required actions

1. Identify the repository root, current branch, configured remotes, and working-tree status.
2. If the working tree has changes, list them. Never discard, stash, reset, or overwrite them without explicit user approval.
3. Ask the user for the base branch and feature branch name if they were not provided. Recommended format: `feature/<short-kebab-case-task-name>`.
4. Fetch remote references.
5. Check out the approved base branch and update it using the repository's accepted strategy. Use fast-forward-only pull when appropriate; do not force-push, rebase shared history, or resolve conflicts automatically.
6. Create and switch to the requested feature branch from the updated base branch.

### Required output

## Step 0 - Sync and Branch

- Repository: ...
- Remote: ...
- Base branch: ...
- Feature branch: ...
- Starting commit: ...
- Working-tree status: clean / dirty (list files)
- Commands executed: ...
- Result: success / blocked

If no Git repository or remote exists, report it as a blocker. Do not claim code was pulled or a branch was created.

`STATUS: WAITING FOR USER REVIEW - STEP 0`

## Step 1 - Understand

### Required analysis

Identify what changes, why, affected users/modules, expected behavior, acceptance criteria, out-of-scope work, and applicable business rules.

### Required output

## Task Understanding

Goal: ...

Expected Behavior: ...

Acceptance Criteria:
1. ...

Out of Scope:
- ...

Business Rules Involved:
- ...

Open Questions / Conflicts:
- None, or ...

`STATUS: WAITING FOR USER REVIEW - STEP 1`

## Step 2 - Investigate

### Required actions

Read only the relevant portions of the LLD, backend/frontend rules, implementation, tests, API contracts, database models/migrations, and nearby patterns. Prefer existing patterns over new abstractions.

Identify the owning module, related modules, current behavior, reusable services/components, data structures, error patterns, and relevant tests.

### Required output

## Investigation

Relevant Documents:
- ...

Relevant Modules and Files:
- ...

Existing Implementation:
- ...

Existing Tests:
- ...

Patterns to Reuse:
- ...

`STATUS: WAITING FOR USER REVIEW - STEP 2`

## Step 3 - Impact Analysis

### Required analysis

Evaluate impact and risk before editing. Explicitly assess frontend, backend, database, API, RBAC/scope, workflow, audit, locking, optimistic locking, scoring, snapshots/history, reporting, concurrency, performance, and security.

### Required output

## Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | NONE / LOW / MEDIUM / HIGH | ... |
| Backend | NONE / LOW / MEDIUM / HIGH | ... |
| Database | NONE / LOW / MEDIUM / HIGH | ... |
| API | NONE / LOW / MEDIUM / HIGH | ... |
| RBAC / Scope | NONE / LOW / MEDIUM / HIGH | ... |
| Workflow | NONE / LOW / MEDIUM / HIGH | ... |
| Audit | NONE / LOW / MEDIUM / HIGH | ... |
| Concurrency | NONE / LOW / MEDIUM / HIGH | ... |
| Performance | NONE / LOW / MEDIUM / HIGH | ... |
| Historical Data | NONE / LOW / MEDIUM / HIGH | ... |

Potential Risks:
- ...

Required ADR / Clarification:
- None, or ...

If the change conflicts with the LLD or architecture, stop here and request an approved decision. Do not implement a workaround.

`STATUS: WAITING FOR USER REVIEW - STEP 3`

## Step 4 - Plan

### Required analysis

Create a concrete, minimal plan. Each item states what changes, where it changes, why it is needed, API/database/frontend implications, and tests to update.

### Required output

## Implementation Plan

1. **What:** ...
   **Where:** ...
   **Why:** ...
   **Tests:** ...

`STATUS: WAITING FOR USER REVIEW - STEP 4`

## Step 5 - Define Test Cases

### Required analysis

Define expected tests before implementation. Cover applicable happy path, validation, business rules, permission/scope, error handling, boundaries, concurrency, idempotency, workflow, audit, history/snapshot regression, frontend states, and performance.

### Required output

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | ... | ... | ... | ... |

`STATUS: WAITING FOR USER REVIEW - STEP 5`

## Step 6 - Implement

### Required actions

Implement only the approved plan and test cases. Make the smallest correct change and follow existing patterns.

- Backend path: Router -> Request/Response Schema -> Application Service -> Domain Logic -> Repository -> Database.
- Frontend path: Page -> Feature Component -> Hook -> Query/Mutation -> Typed API Client -> Backend.
- Do not put business logic in routers or frontend components.
- Enforce the defined API envelope, transactions, authorization/scope, idempotency, workflow, audit, locking, optimistic locking, scoring, and immutable snapshots whenever applicable.
- Do not refactor unrelated code or introduce unapproved abstractions.

### Required output

## Implementation

Changes Made:
- `path/to/file`: ...

Decisions Applied:
- ...

Deferred / Not Changed:
- ...

`STATUS: WAITING FOR USER REVIEW - STEP 6`

## Step 7 - Test

### Required actions

Run the approved relevant tests plus related regression tests, type checking, linting, and migration checks when applicable. Do not state a test passed unless actually executed.

If a test fails: find the root cause, fix only the defect, rerun the same test, and make at most three automatic repair attempts. Then stop and report a blocker.

### Required output

## Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit | ... | PASS / FAIL / NOT APPLICABLE | ... |
| Integration | ... | PASS / FAIL / NOT APPLICABLE | ... |
| Regression | ... | PASS / FAIL / NOT APPLICABLE | ... |
| Type Check | ... | PASS / FAIL / NOT APPLICABLE | ... |
| Lint | ... | PASS / FAIL / NOT APPLICABLE | ... |

Failures / Blockers:
- None, or ...

`STATUS: WAITING FOR USER REVIEW - STEP 7`

## Step 8 - Code Review

### Required review

Review requirement correctness, LLD compliance, architecture, business rules, security, RBAC/scope, data integrity, errors, concurrency, audit/history, maintainability, and regression risk.

### Required output

## Code Review

Findings:
- None, or `[Severity] file: description and corrective action`.

Review Checklist:
- Requirement correctness: PASS / FAIL
- Architecture and module boundaries: PASS / FAIL
- Security and RBAC/scope: PASS / FAIL
- Data integrity, audit, and history: PASS / FAIL
- Error handling and concurrency: PASS / FAIL
- Regression risk: PASS / FAIL

`STATUS: WAITING FOR USER REVIEW - STEP 8`

## Step 9 - Performance Review

### Required review

Review performance only after correctness. Check N+1 queries, pagination, filtering/index needs, transaction length, duplicate processing, blocking work, payload size, excessive requests/renders, query invalidation, and inappropriate reporting queries.

Do not introduce optimization without evidence or a clear architectural risk.

### Required output

## Performance Review

Findings:
- None, or ...

Actions Taken:
- None, or ...

`STATUS: WAITING FOR USER REVIEW - STEP 9`

## Step 10 - Final Verification

### Required verification

Confirm all approved acceptance criteria and required checks. Do not mark done while a required check fails or is unexecuted without an approved exception.

Confirm that all completed step artifacts exist in `docs/<task-slug>/`. For frontend tasks, confirm that `frontend-user-guide.md` exists and matches the final implementation.

### Required output

# Task Completed

## Summary
...

## Changes
- ...

## Test Results
- Unit: PASS / FAIL / NOT APPLICABLE
- Integration: PASS / FAIL / NOT APPLICABLE
- Regression: PASS / FAIL / NOT APPLICABLE
- Type Check: PASS / FAIL / NOT APPLICABLE
- Lint: PASS / FAIL / NOT APPLICABLE

## Acceptance Criteria
- AC1: PASS / FAIL

## Review
- Architecture: PASS / FAIL
- Security: PASS / FAIL
- Performance: PASS / FAIL
- LLD Compliance: PASS / FAIL

## Files Changed
- ...

## Remaining Risks / Notes
- None, or ...

## Final Status
DONE / BLOCKED

`STATUS: WAITING FOR USER REVIEW - STEP 10`

## Non-negotiable rules

1. Do not code before Steps 0-5 have been approved.
2. Do not advance from any step without explicit user approval.
3. Do not invent business behavior or silently change LLD decisions.
4. Do not bypass module boundaries, authorization, audit, workflow, locking, scoring, or history rules.
5. Do not weaken/remove tests merely to pass them.
6. Do not claim any command, test, review, pull, or branch operation succeeded unless it actually ran successfully.
7. Never discard or overwrite user changes. Do not force-push, reset hard, or modify shared history without explicit approval.
8. Keep scope minimal and reuse existing project patterns.
9. Stop and ask whenever requirements, source-of-truth documents, or repository state are unclear.
10. Save the completed deliverable for every step under `docs/<task-slug>/` before requesting user review.