# Step 4: Plan

Status: reconstructed from the earlier approved response (approved by the user in chat)

## Deliverable

## Implementation Plan

1. **What:** Row hover highlight + pointer cursor + row click opens detail; Entity Type as an indigo badge; Entity ID truncated with `title` for the full UUID.
   **Where:** `frontend/src/features/audit/components/AuditTable.tsx`
   **Why:** Interactivity feedback and readability (AC1–AC3).
   **Tests:** Existing TC24/TC25 must keep passing.

2. **What:** Active-filter count badge next to "Audit Filters"; Reset disabled when no filter is active.
   **Where:** `frontend/src/features/audit/components/AuditFilterBar.tsx`
   **Why:** Filter state visibility (AC4–AC5).
   **Tests:** New tests for Reset disabled / enabled.

3. **What:** Replace shared `EmptyState` with a local, theme-aware empty state (SearchX icon + existing `emptyDesc` text).
   **Where:** `frontend/src/features/audit/pages/AuditLogPage.tsx`
   **Why:** Clear, theme-aware empty state (AC6) without affecting other pages.
   **Tests:** Covered by existing rendering tests.

Constraints: no prop-interface changes, no new dependencies, no new i18n keys, dark and light branches for every new style (AC7).

## Inputs Reviewed

- Steps 1–3.

## Actions and Evidence

- Plan derived from Step 2 findings; no commands run.

## Changes Made

- None.

## Decisions and Rationale

- Smallest change per file; reuse theme tokens and Lucide icons.

## Risks / Blockers

- Constraints "no prop changes" and "no new i18n keys" were later relaxed by user-requested revisions (see Step 6).

## Next Step

Step 5 — Test Cases.
