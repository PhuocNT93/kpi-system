# Step 6: Implement

Status: produced during this step

## Deliverable

### Implementation

Changes Made:
- `frontend/src/index.css`: added `.no-scrollbar` (hides the scrollbar, keeps scrolling), `.my-eval-layout` (`260px | minmax(0,1fr)` grid, one column ≤1024px) and `.my-eval-picker` (sticky, viewport-bounded `max-height`; static with 360px cap on narrow screens).
- `frontend/src/shared/layout/Sidebar.tsx`: navigation `<nav>` gets `className="no-scrollbar"`; removed `scrollbarWidth: 'thin'`. `overflowY: 'auto'` kept, so long menus still scroll.
- `frontend/src/features/evaluation/components/EvaluationPickerList.tsx` (new): search input + card list (title, subtitle, status badge), purple selected state with `aria-pressed`, `no-scrollbar` scroll region with a bottom fade, empty state.
- `frontend/src/features/evaluation/pages/MyEvaluationPage.tsx`:
  - Two-column layout: `EvaluationPickerList` on the left for both HR (filtered team evaluations) and non-HR users (searchable self evaluations, always shown).
  - Right column: profile card → Overall Evaluation + `EvaluationScoreSummaryPanel` → level cards → PDP → Evaluation Criteria accordion.
  - Profile name / Employee ID / initials now come from `enrichedEmployee`; the hard-coded "Alex Nguyen" is removed, fallback `N/A` / `—`.
  - Status badge next to the name replaces the separate "Submission Status" and "Admin / HR Workspace" blocks.
  - Level cards moved to a module-level `LEVELS` constant, relabelled Needs Attention / Good Standing / Exceeds Expectations (S badge "VƯỢT MONG ĐỢI"); "Status:" and the Overall subtitle use the current level.
  - Removed wrapper `minHeight: 100vh`, outer padding and page background so only `.app-layout-main` scrolls.
  - Removed unused `Search` import; all hooks, queries, query keys and mutations unchanged.
- `frontend/src/features/evaluation/components/EvaluationOverviewPanel.tsx`: rings use `min(240px, 100%)` / `min(180px, 100%)` with `aspect-ratio: 1 / 1`, smaller font clamps, `auto-fit` grid.
- `frontend/src/features/evaluation/__tests__/EvaluationPickerList.test.tsx` (new): TC01–TC06.

Decisions Applied:
- Q1: scrollbar hidden on both the navigation sidebar and the evaluation list.
- Q2: hub banner and tabs untouched.
- Q3: EMPLOYEE/MANAGER see their own evaluations in the left column.
- Criteria accordion kept, placed below PDP.
- "+6% vs previous review" badge kept as-is (no real data source).

Deferred / Not Changed:
- Backend, API, query keys, `UnifiedEvaluationsHubPage`, `EvaluationScoreSummaryPanel`, `PersonalDevelopmentPlanPanel`, `currentRank` logic.
- Dark mode for this page (not supported before this change).
- `CLAUDE.md`, `.agents/`, `.vscode/` are pre-existing user changes, not part of this task.

### Revision 1 — every card showed the same person (user-reported)

Root cause: `MyEvaluationPage` loads the profile via `GET /api/employees/search?employee_id=<id>&size=1` and took `employees[0]`. The backend `PostgresEmployeeRepository.search()` never applies `params.employeeId` (the DTO accepts `employee_id`, but no SQL condition is added), so the endpoint returns the first employee in the actor's scope regardless of the id. The first implementation preferred `selectedEmployeeProfile.fullName` for the profile name, which exposed the defect as "every card shows the same name". Joined / Team / Current Level / Manager were already affected before this task.

Fix (frontend, in scope):
- `selectedEmployeeProfile` / `selectedManagerProfile` use `.find()` on `employeeId === selectedEmployeeId / selectedManagerId` instead of `[0]`; a non-matching row is ignored (facts fall back to evaluation data or `N/A`).
- `full_name`, `employee_code`, `email` prefer the evaluation list row (the selected evaluation) over the search profile.

Not fixed (needs scope change): backend `employee_id` filter in `postgres-employee.repository.ts#search`.

### Revision 2 — Team and Leader above the name (user request)

- Team and Manager removed from the facts grid; the profile card now shows a line `Team: <team> / Leader: <manager>` above the employee name (wraps instead of truncating, `N/A` fallback).
- Facts grid keeps Joined / Previous Review / Next Review / Current Level (one row on desktop).

### Revision 3 — duplicated Overall title, empty space in score panel (user request)

- `MyEvaluationPage.tsx`: removed the "OVERALL EVALUATION" eyebrow above the identical `Overall Evaluation` heading; the "+6%" badge and `Status:` now stack right-aligned without wrapping.
- `EvaluationScoreSummaryPanel.tsx`: new optional `compact` prop (default `false`, so `EvaluationDetailPage` is unchanged). When set: smaller outer/inner padding, total score `clamp(2.5rem, 4vw, 3.5rem)`, group cards `minmax(120px, 1fr)` so Performance / Capability / Contribution fit on one row, and the panel stretches to the grid-row height with content distributed top-to-bottom. `MyEvaluationPage` passes `compact`.

### Revision 4 — tighter spacing, formula next to the total score (user request)

- Spacing: `.my-eval-layout` gap 20px → 12px; right-column section gap 20px → 12px; Overall/score row gap 20px → 12px; level cards gap 14px → 12px; page top margin 16px → 12px; `panelStyle` padding 22px → 18px; `EvaluationOverviewPanel` top margin 18px → 12px.
- `EvaluationScoreSummaryPanel` `compact` branch rewritten: the gradient card is the panel itself (no extra white wrapper), the formula and formula-source chip sit beside the total score on the same row, and the three group cards grow to fill the remaining height (value and weight spread inside each card) so there is no empty band between the formula and the groups. The non-compact rendering used by `EvaluationDetailPage` is visually unchanged (shared styles extracted to `scoreCardStyle`, `groupCardStyle`, `formulaTextStyle`, `formulaSourceStyle`).

### Revision 5 — formula beside the heading, natural group-card height (user request)

- `EvaluationScoreSummaryPanel` `compact`: header row is now `ĐIỂM TỔNG` + formula (xs monospace) + formula-source chip, wrapping as needed.
- The total score sits in a `flex: 1` row that absorbs spare height; the three group cards return to natural height (`alignItems: 'start'`) and stay at the bottom.
- Compact group card is condensed: name + criteria count on the first line, average (xl) + `Trọng số` on the second; the redundant "Trung bình <group>" line is dropped in compact mode only.

### Revision 6 — empty area around the total score (user request)

- `EvaluationScoreSummaryPanel`: new optional `levelScale` prop (`{ max, currentLabel, bands: { label, upTo, rangeLabel, color }[] }`), rendered only in `compact` mode. The spare-height area now shows `score / max`, the current level chip, and a `LevelScaleBar`: three proportional bands with a marker at `score / max` (clamped 0–100%) and `label · range` captions.
- `MyEvaluationPage`: `LEVELS` gains `upTo` (B 3, A 4.5, S `LEVEL_SCALE_MAX` = 5) matching the existing `currentRank` thresholds; passes `levelScale` built from `LEVELS`. No new score calculation or rounding — the marker position is a display ratio of the engine's score.

### Revision 7 — revert level scale, move note and header items (user request)

- Reverted Revision 6: removed `levelScale`, `ScoreLevelBand`, `ScoreLevelScale`, `LevelScaleBar`, `LEVEL_SCALE_MAX` and `LEVELS[].upTo`.
- `EvaluationScoreSummaryPanel` `compact`: new optional `note` prop, rendered under the total score in a fixed 64px box (`no-scrollbar`, scrolls if the text is longer).
- `MyEvaluationPage`: the level description moved out of the Overall card into the score panel via `note={currentLevel.description}`. Overall header is one row: `Overall Evaluation` + "+6% vs previous review" badge on the left, `Status: <level>` on the right.

### Revision 8 — group cards above the note (user request)

- `EvaluationScoreSummaryPanel` `compact` order is now: heading + formula → total score (absorbs spare height) → group cards → fixed-height note at the bottom.

### Revision 9 — Overall / Personal segment tabs (user request)

- `MyEvaluationPage`: below the profile card, the shared level-2 `SubTabs` segmented control (`@/shared/ui/SubTabs/SubTabs`) switches between two sections held in local state `activeSection` (default `overall`):
  - **Overall** (`BarChart3` icon): Overall Evaluation + Điểm tổng row, level cards, Evaluation Criteria accordion.
  - **Personal Development** (`PenLine` icon): Personal Development Plan panel and the "fill all 4 PDP blocks" hint.
- The selected section is kept when another evaluation is picked in the left column. PDP edits are held in page state, so switching tabs does not lose unsaved text.

### Revision 10 — no page vertical scrollbar (user request)

- `index.css`: `.app-layout-main:has(.my-eval-layout)` hides the main content scrollbar (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`). Scoped with `:has()` so other pages keep their scrollbar; wheel / keyboard / touch scrolling still works. Browsers without `:has()` support (Firefox < 121) simply keep the scrollbar.

### Revision 11 — fit the page in one screen instead of hiding the scrollbar (user clarification)

The user wanted the content to fit without scrolling, not a hidden scrollbar.

- Reverted Revision 10 (`.app-layout-main:has(.my-eval-layout)` rule removed).
- Picker no longer drives page height: it is wrapped in `.my-eval-picker-slot` (`position: relative`), the picker is `position: absolute; inset: 0`, and `.my-eval-layout` uses `align-items: stretch`, so the picker matches the detail column's height and scrolls its cards internally (hidden scrollbar). ≤1024px falls back to a static picker capped at 360px.
- Evaluation Criteria accordion moved to its own segment tab: **Overall · Criteria · Personal Development**.
- Profile card compacted: padding 12px 16px, avatar 96px → 56px, name 2xl → xl, Employee ID xs, fact cards padding 8px 12px.
- Overall card: padding 14px 18px, heading xl → lg. `EvaluationOverviewPanel`: score ring 240px → 180px, timeline ring 180px → 140px, smaller numbers, removed the "From start date to end date…" caption inside the timeline ring.
- Score panel (`compact`): padding 14px 16px, gap 10px, total score `clamp(2.2rem, 3.4vw, 3rem)`, note box 64px → 56px.
- Level cards: padding 10px 14px, 32px rank tile, label base size, description on one line with ellipsis (full text in the `title` tooltip).

### Revision 12 — fill the viewport height, tab-to-content spacing (user request)

- `UnifiedEvaluationsHubPage.tsx`: root becomes a `flex: 1 0 auto` column (bottom padding 40px → 16px) and the tab content area grows (`flex: 1 0 auto`), so the active tab can reach the bottom of `.app-layout-main`. Taller content still scrolls normally.
- `MyEvaluationPage.tsx`: root and `.my-eval-layout` grow to fill; on the Overall tab the Overall + Điểm tổng row is `flex: 1 0 auto`, so it absorbs the spare height (level cards keep their size). The Overall card is a flex column so the donuts centre vertically.
- `EvaluationOverviewPanel.tsx`: donut area is `flex: 1` and vertically centred.
- `shared/ui/SubTabs/SubTabs.tsx`: new optional `flush` prop (default `false`, other usages unchanged) that removes the built-in bottom margin; `MyEvaluationPage` passes `flush`, so tab → content spacing is the column gap (12px) instead of 12px + 20px.

### Revision 13 — Criteria and Personal Development tabs fill the height too (user request)

- `MyEvaluationPage.tsx`: the Criteria panel is `flex: 1 0 auto`; the PDP panel gets the new `fill` prop.
- `PersonalDevelopmentPlanPanel.tsx`: optional `fill` prop (default `false`, so `EvaluationDetailPage` is unchanged). When set, the panel grows to the parent height, the block grid takes the spare space, each block is a flex column and its response textarea stretches (`resize: none`, 92px minimum kept).

### Revision 14 — even PDP block headers (user request)

- `PersonalDevelopmentPlanPanel.tsx`: block description uses `blockDescStyle` — fixed two-line height (`2.9em` at `lineHeight: 1.45`), clamped with ellipsis and the full text in `title`; block title is single-line with ellipsis (`title` tooltip); header wrappers get `minWidth: 0`, icon and "Autosaved" label don't shrink. Every response box now starts at the same height. Applies to all usages (also `EvaluationDetailPage`), as a pure alignment fix.

### Revision 15 — larger note box in Điểm tổng (user request)

- `EvaluationScoreSummaryPanel` `compact`: the total score no longer absorbs spare height; it sits right under the heading at its natural size. The note box now takes the spare height (`flex: 1`, `minHeight: 96px`, no fixed height), has a small "Nhận xét" label, and its text scrolls inside without a visible scrollbar if it is longer than the box. Uniform 12px gap between heading, score, group cards and note.

### Revision 16 — PDP block header layout (user request)

- `PersonalDevelopmentPlanPanel.tsx`: each block header is now one row `[icon] [title (ellipsis)] … Autosaved`, followed by the description on its own full-width row (still fixed two lines), then the response box (10px spacing between rows).

### Revision 17 — single-line PDP description (user request)

- `blockDescStyle` changed from a fixed two-line clamp to a single line with ellipsis (`whiteSpace: nowrap`); the full text stays in the `title` tooltip. The longest description ("Suggestions / Requests") no longer wraps and all response boxes still start at the same height.

### Revision 18 — "Suggestion" title, description up to two lines (user request)

- Default PDP block title `Suggestions / Requests` → `Suggestion` in `MyEvaluationPage.tsx` (initial state and reset) and, for consistency, in `EvaluationDetailPage.tsx` (same two defaults). No other references in frontend, backend or migrations. Evaluations whose saved `development_blocks` already carry the old title keep showing it until re-saved.
- `blockDescStyle`: description clamped to at most two lines with a reserved two-line height (`2.9em`), full text in the tooltip, so response boxes stay aligned.

### Revision 19 — Team Reviews card header (user request; extends the Step 1 scope)

Step 1 listed the Team tab as out of scope; the user asked for this change during Step 6 review. UI-only, no data/logic change.

- `TeamEvaluationsPage.tsx` (all three card lists — in review, completed, upcoming): header is now
  - left: name, then `<employee_code> - <role_name>`, then `<team_name>` on its own line (single-line ellipsis via `cardMetaLineStyle`, `N/A` fallback);
  - right: status badge (and score / rank badges where present) kept on one line (`whiteSpace: nowrap`, `flexShrink: 0`).

### Revision 20 — Team Reviews: short status labels, single-line names (user chose option A)

- `TeamEvaluationsPage.tsx` `getStatusBadge` returns a `shortLabel` next to `label`: Self-Review / Manager Review / Approved (unmapped statuses show the raw code). Card badges render `shortLabel` with the full `label` in `title`.
- Employee name `h3` is single-line (`nowrap` + ellipsis only as a last resort for very long names, full name in `title`). Space for the name grows from ~120px to ~200px on a 360px card.

### Revision 21 — distinct status colours on Team Reviews (user request)

- `TeamEvaluationsPage.tsx` `getStatusBadge`: each status group gets its own hue plus a 1px border (`badge.border`), applied to all three card lists:
  - Self-Review (`OPEN`, `SELF_ASSESSMENT`) — blue `#EFF6FF` / `#1D4ED8`, clock icon;
  - Manager Review (`SUBMITTED`, `MANAGER_ASSESSMENT`, `MANAGER_REVIEW`, `REVIEWING`) — amber `#FFF7ED` / `#C2410C`, user-check icon;
  - Calibration (`CALIBRATION`, newly mapped) — violet `#F5F3FF` / `#6D28D9`, sliders icon;
  - Approved (`APPROVED`, `PUBLISHED`, `LOCKED`) — green `#ECFDF5` / `#047857`, check icon;
  - Rejected (`REJECTED`, newly mapped) — red `#FEF2F2` / `#B91C1C`, x icon;
  - anything else (e.g. `DRAFT`) — neutral grey, raw code.
- Colours follow the hex palette already used for status chips in `MyEvaluationPage`.

### Revision 22 — only the tab content scrolls (user request, raised during Step 7)

Step 6 had been approved; the user asked for this during the first Step 7 run, so the task returned to Step 6.

- `UnifiedEvaluationsHubPage.tsx`: the hub root is bounded to the layout height (`flex: 1 1 0`, `minHeight: 0`, bottom padding 16px → 8px); the banner + hub tabs don't shrink (`flexShrink: 0`); the tab content area (`data-testid="evaluation-hub-content"`) is `flex: 1 1 0; minHeight: 0; overflowY: auto` with 4px side/bottom padding so card shadows aren't clipped. The banner and tabs stay fixed and only the active tab (My Evaluations, Team Reviews, Employee Directory) scrolls. My Evaluations still fills that area and grows when its content is taller.
- `MyEvaluationPage.tsx`: `selfEvaluations` wrapped in `useMemo` — fixes the three `react-hooks/exhaustive-deps` warnings reported by lint in Step 7.

### Revision 23 — Team Reviews: only the card list scrolls (user request)

- `TeamEvaluationsPage.tsx`: the page root is bounded to the hub content area (`flex: 1 1 0`, `minHeight: 0`, gap 24px → 20px, no bottom padding); the "Team Reviews" header and the search / status filter bar don't shrink; the grouped card lists (and the empty state) sit in a new `data-testid="team-reviews-list"` wrapper with `flex: 1; minHeight: 0; overflowY: auto`, so only the cards scroll. The loading branch is unchanged.

### Revision 24 — Team Reviews: group title + count stay visible (user request)

- `TeamEvaluationsPage.tsx`: the three group titles ("Currently in Review (n)", "Completed Reviews (n)", "Upcoming Reviews (n)") use a shared `groupHeaderStyle` — `position: sticky; top: 0; zIndex: 1` with the layout background (`COLORS.neutral.surfaceSubtle`) — so the current group's title and count stay pinned at the top of the list while only its cards scroll underneath; the next group's title takes over when reached.

## Actions and Evidence

- `npm --prefix frontend run typecheck` → exit without errors (both tsconfigs).
- After Revision 12: `npm --prefix frontend run typecheck` → exit 0; `npm --prefix frontend test -- src/features/evaluation/__tests__ src/shared/ui/SubTabs` → 3 files, 12 tests passed (full suite runs in Step 7).
- After Revision 20: `npm --prefix frontend run typecheck` → no errors; `npm test -- src/features/evaluation` (in `frontend/`) → 9 files, 23 tests passed. No test references the old long status labels.
- After Revision 21: typecheck → 0 `error TS` lines; `npm test -- src/features/evaluation` → 23 tests passed.
- After Revision 22: `npm --prefix frontend run typecheck` → exit 0; `npm --prefix frontend run lint` → exit 0, no warnings; `npm --prefix frontend test -- src/features/evaluation` → exit 0, 9 files / 23 tests passed.
- After Revision 24: typecheck exit 0; lint exit 0, no warnings.
- After Revision 23: typecheck exit 0; lint exit 0 with no warnings; `npm --prefix frontend test -- src/features/evaluation` exit 0, 23 tests passed.
- First Step 7 full-suite run (before Revision 22): 239/240 passed; `EmployeeReviewSchedule.test.tsx` (organization, untouched) failed once on a `findByRole` wait and passed 11/11 when rerun alone — recorded as a load-dependent flaky test, to be rechecked in Step 7.
- `npx eslint <files>` from repo root failed to locate config (flat config lives in `frontend/`); lint is run via the project script in Step 7.

## Next Step

Step 7 - Test.
