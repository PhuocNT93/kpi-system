# Step 2: Investigate

Status: reconstructed from an earlier approved response

## Deliverable

### Investigation

Relevant Documents:
- `usage.md`, `docs/AI_AGENT_WORKFLOW.md`, `docs/FRONTEND_REACT_RULES.md`, `CLAUDE.md` (snapshot rendering, no UI re-rounding).

Relevant Modules and Files:
- `frontend/src/features/evaluation/pages/UnifiedEvaluationsHubPage.tsx` — hub banner and tabs (unchanged).
- `frontend/src/features/evaluation/pages/MyEvaluationPage.tsx` — main file to restructure.
- `frontend/src/features/evaluation/components/EvaluationOverviewPanel.tsx` — fixed 320px / 220px donuts.
- `frontend/src/features/evaluation/components/EvaluationScoreSummaryPanel.tsx` — already matches the screenshot.
- `frontend/src/features/evaluation/components/PersonalDevelopmentPlanPanel.tsx` — already matches the screenshot.
- `frontend/src/shared/layout/Sidebar.tsx` (nav at ~L333) — `overflowY: 'auto'` + `scrollbarWidth: 'thin'` shows a vertical scrollbar.
- `frontend/src/index.css` — `.app-layout-main` is the page scroll container; `.unified-hub-tabs` is the scrollbar-customisation precedent.

Existing Implementation:
- All sections stacked in one column: HR workspace picker (HR/SYSTEM_ADMIN only, 280px scroll box) → profile card → self evaluation picker (only when more than one) → Submission Status → Overall + score → level cards → Criteria accordion → PDP.
- EMPLOYEE and MANAGER take the `!isHrAdmin` branch (`getMyEvaluations`); HR uses `getTeamEvaluations`.
- Bug: profile name/avatar read only `selectedTeamEvaluation`, so non-HR users always saw the hard-coded "Alex Nguyen" and an empty Employee ID; `enrichedEmployee` already holds the right data.
- Hard-coded copy: "+6% vs previous review", "Status: Strong Performance", "How am I performing overall?".
- Level labels differ from the screenshot (Need Improvement / Meet Expectation / Exceed Expectation).

Existing Tests:
- `features/evaluation/__tests__/UnifiedEvaluationsHubPage.test.tsx` (mocks `MyEvaluationPage`).
- `shared/layout/__tests__/Sidebar.test.tsx`, `Header.test.tsx`.

Patterns to Reuse:
- Keep all hooks/queries/mutations in `MyEvaluationPage`; change only layout JSX.
- Extract a shared `EvaluationPickerList` for the duplicated HR/self picker markup.
- Hide scrollbars with a CSS utility class in `index.css`.

User decisions: keep the Criteria accordion below PDP; rename labels as in the screenshot; remove the hard-coded name.

## Next Step

Step 3 - Impact Analysis.
