# Step 4: Plan

Status: reconstructed from an earlier approved response

## Deliverable

### Implementation Plan

1. **What:** `.no-scrollbar` utility (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`); scrolling still allowed.
   **Where:** `frontend/src/index.css`
   **Why:** AC5; shared by Sidebar and the evaluation list.
   **Tests:** Visual; component test asserts the class.
2. **What:** Add `className="no-scrollbar"` to the Sidebar `<nav>` and drop `scrollbarWidth: 'thin'`; keep `overflowY: 'auto'`.
   **Where:** `frontend/src/shared/layout/Sidebar.tsx`
   **Why:** Q1 — navigation sidebar scrollbar.
   **Tests:** Existing Sidebar tests (regression).
3. **What:** New `EvaluationPickerList` (props `items{id,title,subtitle,status}`, `activeId`, `searchValue`, `onSearchChange`, `onSelect`, `emptyLabel`): search input, card list with status badge, purple selected state, `aria-pressed`, `no-scrollbar` scroll area with bottom fade.
   **Where:** `frontend/src/features/evaluation/components/EvaluationPickerList.tsx`
   **Why:** Remove duplicated picker code; AC2, AC3, AC5.
   **Tests:** New `__tests__/EvaluationPickerList.test.tsx`.
4. **What:** Two-column `MyEvaluationPage` (`.my-eval-layout`: `260px | minmax(0,1fr)`, one column below 1024px). Sticky left picker (HR: filtered team evaluations; non-HR: searchable self evaluations, always shown). Right column: profile card (name/code from `enrichedEmployee`, no "Alex Nguyen", `N/A` fallback, status badge next to the name replacing the Submission Status block, compact 3×2 facts) → Overall ("Overall Evaluation", `Status: <current level label>`) + `EvaluationScoreSummaryPanel` → level cards relabelled Needs Attention / Good Standing / Exceeds Expectations → PDP → Criteria accordion. Remove wrapper `minHeight: 100vh` and outer padding.
   **Where:** `frontend/src/features/evaluation/pages/MyEvaluationPage.tsx`, `frontend/src/index.css`
   **Why:** AC1, AC2, AC4, AC6; hooks/queries/mutations unchanged.
   **Tests:** `UnifiedEvaluationsHubPage.test.tsx` regression, typecheck, lint.
5. **What:** Fluid `EvaluationOverviewPanel` rings (`min(240px,100%)` / `min(180px,100%)` with `aspect-ratio: 1`, smaller clamps, `auto-fit` grid).
   **Where:** `frontend/src/features/evaluation/components/EvaluationOverviewPanel.tsx`
   **Why:** No horizontal overflow in the narrower right column (AC6).
   **Tests:** Visual, typecheck.
6. **What:** Step artifacts 0–5 and `frontend-user-guide.md`.
   **Where:** `docs/ui-evaluations-hub-layout/`
   **Why:** Mandatory workflow.
   **Tests:** N/A.

Unchanged: backend, API, query keys, hub banner/tabs, `EvaluationScoreSummaryPanel`, `PersonalDevelopmentPlanPanel`, `currentRank` logic, "+6% vs previous review" badge.

## Next Step

Step 5 - Define Test Cases.
