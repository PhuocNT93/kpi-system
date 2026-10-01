# Step 7: Test

Status: produced during this step

## Deliverable

## Test Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit (reports feature) | `npm --prefix frontend test -- --run src/features/reports` | PASS | 11 files / 46 tests: hub (TC02–TC05, TC22), palette (TC01), `toScoreDistributionBins` (TC11), `CycleSelector` (TC18), My/Team/Org pages (TC06–TC10, TC12–TC17), KPI Summary TC-FE-01…07 + 01b, ScoreCard, KpiTrendTable, KpiExplainabilityDrawer (TC19) |
| Regression (frontend) | `npm --prefix frontend test` | PASS | 49 files / 198 tests |
| Regression (backend) | `npm --prefix backend test` | PASS | 73 files passed, 6 skipped; 794 tests passed, 30 skipped |
| Integration (migration, TC20) | `DATABASE_URL=<local docker :5433> npm --prefix backend run migrate:down -- --no-check-order`, then `migrate:up` | PASS | `REPORTS_UI` rows 750 → 32 after down (006 text restored: "1. My Report", "Rankings…") → 758 after up (new text incl. `reports.my.no_profile_title`) |
| Integration (browser, TC21) | Headless Chrome via CDP (`reports-checks.mjs`), dark theme, en | PASS | HR_ADMIN 4 tabs, MANAGER 3 (My/Team/Summary), EMPLOYEE 2 (My/Summary); disallowed `?scope` falls back to My; 0 pure-white backgrounds inside the tab panel for every tab and role; HR_ADMIN team change → `/admin/reports?scope=team&team=<id>` with hub banner present; 0 JS exceptions. Light/vi screenshots checked in Step 6. |
| i18n coverage | `extract-keys.mjs` (session scratchpad) | PASS | 199 `reports.*` keys in code; all in the migration or seeded by 006; 0 English mismatches |
| Type Check | `npm --prefix frontend run typecheck`, `npm --prefix backend run typecheck` | PASS | exit 0 |
| Lint | `npm --prefix frontend run lint`, `npm --prefix backend run lint` | PASS | 0 errors; 1 pre-existing warning in `features/evaluation/pages/MyEvaluationPage.tsx` (from develop) |
| Build (CI gate) | `npm --prefix frontend run build`, `npm --prefix backend run build` | PASS | exit 0 (Vite chunk-size warning is pre-existing) |
| Migration integration suite | `npm --prefix backend run test:migrations` | NOT RUN | Requires `TEST_DATABASE_URL` distinct from `DATABASE_URL`; not configured locally |

Failures / Blockers:
- None.

Observation for Step 8 (not a failing test): the seeded `manager@kpi.com` has no employee link and manages no team; the teams API returns 0 teams, so the Team tab shows an empty team select with "Please select a team…", which is misleading.

### Revision 3 re-test (only tables scroll; sub-tabs)

| Check | Command | Result | Notes |
|---|---|---|---|
| Unit + regression (frontend) | `npm --prefix frontend test` | PASS | 56 files / 221 tests, incl. TC40–TC47 (`OrgStructureTab`, `JobArchitectureTab`, Team TC45, KPI Summary TC46, hub panel) |
| Regression (backend) | `npm --prefix backend test` | PASS | 73 files passed, 6 skipped; 794 tests passed, 30 skipped |
| Type Check | `npm --prefix frontend run typecheck`, `npm --prefix backend run typecheck` | PASS | exit 0 |
| Lint | `npm --prefix frontend run lint`, `npm --prefix backend run lint` | PASS | 0 errors; same pre-existing warning in `MyEvaluationPage.tsx` |
| Build (CI gate) | `npm --prefix frontend run build`, `npm --prefix backend run build` | PASS | exit 0 (pre-existing Vite chunk-size warning) |
| Migration round-trip (TC47) | `migrate:down -- --no-check-order`, then `migrate:up` (local Docker DB) | PASS | sub-tab rows: `ORGANIZATION_UI` 10 + `REPORTS_UI` 8 → 0 after down → 10 + 8 after up; `org.subtab.formula` vi "Công thức đánh giá"; no field name shared with another entity type |
| Browser, System hub (TC48–TC50, TC54) | `table-scroll-checks.mjs`, HR_ADMIN, 1600×900 light + dark | PASS | every Org Structure / Job Architecture / IAM sub-tab: `.app-layout-main` and `tabpanel` do not scroll, only `.table-scroll-frame` scrolls, sticky `thead` 0–1px from the frame top, 0px from banner edges; Audit unchanged; 0 JS exceptions |
| Browser, Reports hub (TC52) | same script, HR_ADMIN and `hieu.dao@…` (EMPLOYEE) | PASS with limit | My/Team/Org: page does not scroll; Team sub-tabs switch; KPI Summary: page scroll fallback (≈140px) |
| Browser, Translations (TC51) | same script, entity selected | PASS with limit | save bar stays below the table; page scroll fallback (≈329px) because of the fixed content above the table |
| Browser, short viewport (TC53) | 1366×768 light | PASS | frames at the 240px minimum; page scrolls 5–194px where fixed content is taller; nothing clipped; 0 JS exceptions |
| Browser, Vietnamese labels | `LOCALE=vi`, 1600×900 | PASS | Phòng ban · Nhân viên / Đội nhóm · Nhân viên · Công thức đánh giá; Người dùng · Vai trò · Quyền hạn; KPI trung bình · Xu hướng KPI |
| Standalone routes (TC55) | `TeamReportPage.test.tsx` standalone case, TC-FE-01…07 | PASS | both tables shown, no sub-tabs |
| Migration integration suite | `npm --prefix backend run test:migrations` | NOT RUN | `TEST_DATABASE_URL` not configured locally |

Failures / Blockers:
- None. Known limits accepted by the user at Step 6: Translations and KPI Summary keep a page scroll at 900px height; KPI Summary employee selection leaves the hub (pre-existing).

## Inputs Reviewed

- Step 5 test cases; Step 6 changes.

## Actions and Evidence

- Commands and results as listed. Manager team data checked via API: login `manager@kpi.com` → `managedTeamIds` undefined, `employeeId` null; `GET /api/teams?active=true` → 0 teams.

## Changes Made

- None in this step.

## Decisions and Rationale

- The manager empty-team UX is recorded for Step 8 instead of changing code during testing.

## Risks / Blockers

- Content with real (completed) evaluation data only covered by unit tests.

## Next Step

Step 8 — Code Review.
