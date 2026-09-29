# Step 1: Understand

Status: reconstructed from the earlier approved response (approved by the user in chat). AC2 was revised in Step 4 by user decision.

## Deliverable

## Task Understanding

Goal: Improve the UI of the Performance Reports page — the hub (banner + tabs) and the content of its four tabs (My Report, Team Report, Organization Report, KPI Summary Dashboard) — without changing scoring, APIs or permissions.

Expected Behavior:
- One page-title level inside the hub; tabs without numbering; readable role label.
- The four tabs share one layout pattern: a filter card, a fixed "Data as of" position, consistent score cards and empty states.
- Tab content width is consistent and aligned with the hub banner.
- Correct in light/dark themes, English/Vietnamese, and narrow widths.

Acceptance Criteria:
1. No repeated page title between the hub and each tab.
2. (Revised in Step 4) The Reports hub uses the shared `.unified-hub-*` banner/tab design like the other hubs; tab names have no numbering; the role is shown as a readable name.
3. The four tabs share a consistent filter bar, "Data as of" position, score cards and empty states.
4. Tab content has the same width across tabs and aligns with the banner.
5. The Team tab description no longer mentions ranking (LLD no-ranking rule).
6. Tab visibility by role is unchanged: SYSTEM_ADMIN/HR_ADMIN 4 tabs, MANAGER My/Team/Summary, EMPLOYEE My/Summary.
7. Light/dark and en/vi are correct; existing tests still pass.

Out of Scope:
- Backend, API, score calculation, aggregates, permissions.
- New charts or metrics, PDF/Excel export, any ranking.
- The systemic i18n key-collision fix.

Business Rules Involved:
- No individual ranking in any form; aggregates/distributions only (LLD §2, §19, §30-Q10).
- Backend is the authority for permissions; the UI only shows/hides tabs; managers see only their teams.
- Reports render stored snapshot values; no recalculation or extra rounding in the UI.
- Display strings come from the i18n table.

Open Questions / Conflicts:
1. Test data: all local evaluations are OPEN — no seeding was chosen (default taken when approved without an answer).
2. Depth of change: layout/component polish only, keep existing charts/tables (default taken).

## Inputs Reviewed

- User screenshot of the My Report tab; headless Chrome screenshots of all tabs as HR_ADMIN and MANAGER (light); `UnifiedPerformanceReportsPage.tsx`; LLD ranking rules.

## Actions and Evidence

- `reports-tabs.mjs` (session scratchpad) captured `/admin/reports?scope=my|team|org|summary`.
- LLD grep for "rank": lines 36, 1329-1335, 1829, 1861, 1938 confirm no individual ranking.

## Changes Made

- None.

## Decisions and Rationale

- Treat the "Rankings" wording as a defect against the LLD.

## Risks / Blockers

- Content with real data cannot be seen locally.

## Next Step

Step 2 — Investigate.

## Revision (scope expanded, approved by the user in chat)

Reason: during Step 7 the user asked to also align the content of the System & Security Hub tabs ("Content 3 tab không đồng bộ") and chose to merge it into this task, covering: content scroll frame, same width aligned with the banner, no duplicated titles, unified sub-tab bars.

Added acceptance criteria:
8. In the System & Security Hub the page does not scroll; only the tab content scrolls and the banner stays. The Audit tab keeps its internal table scroll with a visible pager.
9. The content of all four tabs (Organization, IAM & Roles, Audit Logs, Translations) is left/right aligned with the banner.
10. No tab inside the hub shows its own page title; "Review Due Dashboard" no longer appears on the Organization tab.
11. Organization and IAM sub-tab bars share one style, correct in light/dark.
12. Tab behaviour, data and permissions unchanged; existing tests pass.

Added out of scope: inner content of the tabs (tables, org tree, translation editor), dark mode of organization/iam/i18n inner components, other hubs.

Open question default taken: the System hub role chip also shows a readable role name.

## Revision 2 (only tables scroll; multi-table tabs get sub-tabs — approved by the user in chat)

Status: reconstructed at Step 10 from the approved chat response; it had not been written to this file when approved.

User direction: "Sửa lại chỉ scroll ở các table thôi còn tab và bên ngoài thì không cần"; "Nếu nhiều table trong tab hãy define tab nhỏ nhỏ header switch qua lại". Answers: both hubs; the main table scrolls, everything else stays fixed.

Added acceptance criteria:
13. In both hubs the page and the tab panel do not scroll; only the main table (or list) of each tab scrolls, with its header kept visible; when the window is too short the whole page scrolls instead. Supersedes AC8.
14. Tabs with several tables switch between them with small sub-tab headers (Org Structure, Job Architecture, Team Report, KPI Summary); the chosen sub-tab is kept when the tree selection changes and falls back to the level's first sub-tab when it does not exist.

Scope extensions requested by the user during Step 8 (recorded in `step-8-code-review.md`): per-level tab styles, create buttons beside the sub-tabs, icon-only IAM actions and IAM filter layout, the hub-tab ⓘ tooltip and stable tab widths plus the header breadcrumb in all six hubs, and the new brand logo.
