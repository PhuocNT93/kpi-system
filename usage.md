# AI Agent Usage Entry Point

This file is the mandatory entry point for every development chat in this repository.

It applies to Claude, Codex, Antigravity, GitHub Copilot, and any other AI agent that reads or modifies project files, runs commands, reviews code, creates plans, or answers implementation questions.

## Mandatory startup instruction

At the beginning of every new chat, provide the agent this instruction:

```text
Read and follow usage.md before doing any work. Start the mandatory workflow at Step 0 and stop after each step for my explicit review. Do not continue until I approve the current step.
```

The agent must then read, in this order:

1. `usage.md` (this file)
2. `docs/AI_AGENT_WORKFLOW.md`
3. `docs/LLD_Employee_Performance_Evaluation_System.md`
4. `docs/BACKEND_FASTAPI_RULES.md` when backend is affected
5. `docs/FRONTEND_REACT_RULES.md` when frontend is affected

## Non-negotiable chat gate

For every user request, including a request for explanation, review, planning, debugging, coding, testing, or documentation:

1. The agent must start or resume `docs/AI_AGENT_WORKFLOW.md`.
2. A new task always begins at **Step 0 - Sync and Branch**.
3. The agent must complete only the current step's required work and output.
4. The agent must end with `STATUS: WAITING FOR USER REVIEW - STEP <n>`.
5. The agent must not continue until the user explicitly approves the current step.

This gate applies even when the user asks to “just make a quick change”, “skip planning”, or “do it immediately”.

## How to approve and continue

Use one of these messages after reviewing the current step:

```text
Approve step 0
Approve step 1
Continue
```

`Continue` is valid only when the current step is clear. If feedback changes scope or requirements, the agent must revise the current step and wait for approval again. If the change invalidates an earlier approved step, the agent must return to that earliest affected step and explain why.

## Required behavior

- Do not write code before Steps 0-5 are approved.
- Do not run commands, edit files, or perform additional investigation after submitting a step for review.
- Do not bypass LLD, backend, frontend, security, RBAC, workflow, audit, locking, scoring, concurrency, or immutable-history rules.
- Do not discard, stash, reset, overwrite, rebase shared history, or force-push user work without explicit approval.
- When requirements are ambiguous, source documents conflict, repository access is unavailable, or a required check fails after the allowed repair attempts, stop and report a blocker.
- For the full step requirements and final verification format, follow `docs/AI_AGENT_WORKFLOW.md` exactly.

## Start now

For a new task, execute **Step 0 - Sync and Branch** from `docs/AI_AGENT_WORKFLOW.md` and then wait for user approval.