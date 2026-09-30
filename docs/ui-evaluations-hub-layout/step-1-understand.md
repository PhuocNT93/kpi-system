# Step 1: Understand

Status: reconstructed from an earlier approved response

## Deliverable

### Task Understanding

Goal: Restructure the Evaluations Hub "My evaluations" tab (`MyEvaluationPage`) to match the provided screenshot layout, and remove the visible vertical scrollbar from the navigation sidebar and the evaluation list column.

Expected Behavior:
- Two-column layout: narrow left column (search + evaluation cards with name, code • role • cycle, status badge; selected card highlighted) and a right detail column.
- Right column order: profile card (avatar initials, name, Employee ID, 3×2 facts Joined / Previous Review / Next Review / Current level / Team / Manager) → Overall Evaluation (score donut + timeline donut) beside Điểm tổng (formula + group scores) → three level cards (Needs Attention / Good Standing / Exceeds Expectations) with the current level emphasised → Personal Development Plan (4 blocks + Save PDP) → Evaluation Criteria accordion.
- The "Admin / HR Workspace" and "Submission Status" blocks are merged into the left column and the profile card.
- Existing data, hooks and PDP save/submit logic are unchanged.

Acceptance Criteria:
1. Tab "my" renders the two-column layout on desktop (≥1024px).
2. Selecting a card switches the right column to that evaluation.
3. Left-column search filters the list.
4. Profile card shows the six facts; missing data shows `N/A`, never fabricated or hard-coded values.
5. No vertical scrollbar is visible on the navigation sidebar or the evaluation list (content remains scrollable).
6. Narrow screens collapse to one column without horizontal overflow.
7. i18n and existing behaviour are not broken; frontend typecheck, lint and tests pass.

Out of Scope:
- Backend, API, DB, scoring/level logic.
- Team and Search tabs.
- New real data for "vs previous review" or Previous Review.
- Dark-mode support for this page (not present today).

Business Rules Involved:
- UI renders the evaluation snapshot, not the current template.
- No re-rounding of scores in the UI.
- Route RBAC is UX only; list content follows backend scope.
- Locked evaluations stay read-only.

Open Questions / Conflicts (resolved with defaults accepted by the user):
- Q1 scrollbar location → both navigation sidebar and evaluation list column.
- Q2 hub banner and tabs → keep.
- Q3 EMPLOYEE left column → list of the user's own evaluations.

## Next Step

Step 2 - Investigate.
