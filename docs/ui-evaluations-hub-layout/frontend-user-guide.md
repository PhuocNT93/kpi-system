# Frontend User Guide — Evaluations Hub layout

## Prerequisites

- Node.js and npm installed; dependencies installed with `npm --prefix frontend install`.
- A running backend (local `npm --prefix backend run dev` on port 3000, or Docker Compose on `BACKEND_PORT`).
- Seed accounts from `README.md` (at least one HR_ADMIN / SYSTEM_ADMIN and one EMPLOYEE account to see both views of My Evaluations; a MANAGER or admin account for Team Reviews).

## Start / stop

```powershell
npm --prefix frontend run dev      # start (Vite dev server)
# Ctrl+C to stop
```

Full stack: `docker compose up --build` (frontend on `FRONTEND_PORT`, default 4001); stop with `Ctrl+C` or `docker compose down`.

## Configured URLs

- Frontend: Vite dev URL printed on start, or `http://localhost:4001` with Docker.
- Backend: `VITE_API_BASE_URL` (defaults to `http://localhost:3000`); must match the running backend.
- Page: sidebar **Performance → Evaluations Hub**; tabs `?tab=my` (My Evaluations), `?tab=team` (Team Reviews), `?tab=search` (Employee Directory).

## Evaluations Hub (all tabs)

- The hub banner and its three tabs stay fixed at the top; only the active tab's content scrolls.
- The navigation sidebar no longer shows a vertical scrollbar; long menus still scroll with wheel, keyboard or touch.

## My Evaluations tab

- **Left column** — a search box and one card per evaluation.
  - HR_ADMIN / SYSTEM_ADMIN: one card per team evaluation (employee name, `code • role • cycle`, status).
  - EMPLOYEE / MANAGER: one card per own evaluation (cycle name, `code • name`, status).
  - Search filters by name, code, email (HR) or cycle. The selected card is highlighted in purple.
  - The list always matches the height of the detail column; extra cards scroll inside it without a visible scrollbar. A soft fade at the bottom hints at more cards.
- **Right column** (for the selected evaluation):
  1. Profile card — a `Team: … / Leader: …` line above the full name, initials, status badge (hover for the Vietnamese description), Employee ID, and Joined / Previous Review / Next Review / Current Level. Missing values show `N/A`.
  2. A segmented control with three tabs (default **Overall**). Every tab fills the remaining height of the screen.
     - **Overall** — Overall Evaluation (title, "+6% vs previous review", Status, score and timeline donuts) next to Điểm tổng (heading with formula and formula source, total score, Performance / Capability / Contribution cards, and a "Nhận xét" note box that takes the spare height); level cards Needs Attention (B) / Good Standing (A) / Exceeds Expectations (S) with the current level emphasised (full description on hover). Sized to fit one desktop screen.
     - **Criteria** — Evaluation Criteria accordion.
     - **Personal Development** — Personal Development Plan: four blocks (Objective(s), Achievements, Need Improvement, Suggestion). Each block shows `[icon] title … Autosaved`, a description of at most two lines (full text on hover), and a response box that stretches with the panel. Save PDP, and (non-HR) submit self-evaluation. Unsaved PDP text is kept when switching tabs or sections.
- Below 1024px width the page becomes a single column and the list is capped at 360px.

## Team Reviews tab

- The "Team Reviews" title and the search / status filter bar stay fixed; only the card list scrolls. The current group title with its count (e.g. "Currently in Review (19)") stays pinned at the top of the list while its cards scroll.
- Each card shows the employee name on one line with a short, colour-coded status badge on the right, then `employee code - role`, then the team on its own line. Only very long values are cut with an ellipsis (hover shows the full text); missing values show `N/A`.

| Badge | Statuses | Colour |
|---|---|---|
| Self-Review | `OPEN`, `SELF_ASSESSMENT` | blue |
| Manager Review | `SUBMITTED`, `MANAGER_ASSESSMENT`, `MANAGER_REVIEW`, `REVIEWING` | amber |
| Calibration | `CALIBRATION` | violet |
| Approved | `APPROVED`, `PUBLISHED`, `LOCKED` | green |
| Rejected | `REJECTED` | red |
| raw code | anything else (e.g. `DRAFT`) | grey |

Hover a badge for its full label (e.g. "Ready for Manager Review").

## Employee Directory tab

- Unchanged content; it now scrolls inside the hub content area and no longer adds blank space below short result lists.

## Validation behaviour

- PDP fields are capped at 2000 characters.
- Submit stays disabled until all four PDP blocks are filled, and after the evaluation is SUBMITTED.

## Configurable values

- Level thresholds and labels are constants in `MyEvaluationPage.tsx` (`LEVELS`; unchanged logic: `> 4.5` S, `≥ 3` A, otherwise B).
- Default PDP block titles/descriptions are constants in `MyEvaluationPage.tsx` / `EvaluationDetailPage.tsx`; saved `development_blocks` from the backend override them.
- Layout breakpoint and picker column width: `.my-eval-layout` / `.my-eval-picker-slot` / `.my-eval-picker` in `frontend/src/index.css`.
- Status labels and colours: `getStatusBadge` in `TeamEvaluationsPage.tsx`.

## Known limitations

- "+6% vs previous review" is static text; there is no backend data for it yet.
- The backend employee search ignores `employee_id`, so Joined / Current Level / Leader often show `N/A` on My Evaluations (the UI never shows another employee's data). Tracked as a separate backend task.
- Evaluations saved before this change keep their stored PDP title "Suggestions / Requests" until re-saved.
- My Evaluations and Team Reviews do not support dark mode (the pinned Team Reviews group title is light in dark mode).
- On very short screens the fixed hub banner leaves less room for the scrolling content.
- Hidden scrollbars (sidebar, evaluation list) don't show the scroll position; rely on the bottom fade.
