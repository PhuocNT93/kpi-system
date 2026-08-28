# Step 4: Plan

Status: reconstructed from approved response

## Deliverable
## Implementation Plan

1. **What:** Create Evaluation Cycle Types, DTOs, and API client hooks.
   **Where:** `frontend/src/features/evaluation-cycles/types/cycle-types.ts`, `frontend/src/features/evaluation-cycles/api/cycle-api.ts`, and `frontend/src/features/evaluation-cycles/hooks/use-evaluation-cycles.ts`.
   **Why:** Provides contract-driven, permission-aware TypeScript interfaces and React Query data hooks.
   **Tests:** Frontend component unit tests / integration verification.

2. **What:** Implement reusable Cycle UI components (`CycleStatusBadge`, `CycleTimeline`, `CycleConfigurationSummary`, `ScopePreviewCard`, `OpenCycleConfirmationModal`, `OpeningProgressBanner`, `ReadOnlyBanner`).
   **Where:** `frontend/src/features/evaluation-cycles/components/`.
   **Why:** Encapsulates metadata visualization, lifecycle progression, snapshot explanations, confirmation prompts, batch execution progress, and global locked states.
   **Tests:** UI component rendering tests and snapshot checks.

3. **What:** Build Evaluation Cycle pages (`EvaluationCycleListPage`, `EvaluationCycleCreatePage`, `EvaluationCycleDetailPage`).
   **Where:** `frontend/src/features/evaluation-cycles/pages/`.
   **Why:** Delivers end-to-end management screens for HR/Admin to list/filter cycles, construct rule-driven cycle forms, inspect cycle details, preview scope, and execute state transitions.
   **Tests:** User navigation, form validation, and CTA flow checks.

4. **What:** Wire routing and navigation tree entries.
   **Where:** `frontend/src/App.tsx` and `frontend/src/shared/layout/Sidebar.tsx`.
   **Why:** Connects `/admin/cycles/*` routes to the Protected Layout under HR/Admin access control.
   **Tests:** Route accessibility and layout navigation tests.

## Inputs Reviewed
- Step 1 & 2 deliverables

## Actions and Evidence
- Formulated 4-step execution roadmap covering types, reusable components, page screens, and router integration.

## Decisions and Rationale
- Split domain concerns cleanly between components, custom hooks, and pages.

## Risks / Blockers
- None.

## Next Step
- Step 5: Test Cases
