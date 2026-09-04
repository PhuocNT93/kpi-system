# Scoring Pipeline Frontend Guide

## Prerequisites
- Node.js and npm installed.
- Backend API available with the database migration applied.
- Authenticated manager or HR account for recalculation.

## Startup and Shutdown
- Backend: `cd backend` then `npm run dev`; stop with `Ctrl+C`.
- Frontend: `cd frontend` then `npm run dev`; stop with `Ctrl+C`.

## Configured URLs
- Frontend: use the URL printed by Vite, normally `http://localhost:5173`.
- Backend API: use the configured API origin and `/api/v1/evaluations` routes.

## Expected Validation Behavior
- Evaluation detail renders server-provided criterion, KPI, overall, and official scores.
- N/A and disabled criteria are shown as statuses, not as zero scores.
- Recalculation is available only when the server-backed workflow state and permissions allow it.
- Locked evaluations reject recalculation with the standard locked response.

## Configurable Values
- Criterion levels, score values, criterion weights, KPI grouping, and KPI weights come from published evaluation configuration snapshots.
- The frontend does not contain scoring formulas or configuration precedence rules.

## User-Visible Behavior
- Managers can trigger recalculation from editable evaluation detail screens.
- The pending state disables repeated recalculation clicks.
- After success, evaluation detail is refreshed and displays the scoring breakdown.
- Criterion rows show level, raw/max score, normalized score, effective weight, contribution, and status.
- KPI sections show KPI score, KPI weight, contribution, and applicable criterion weight.
- Overall and official scores are displayed from the backend result.

## Known Limitations
- End-to-end migration and API verification require a configured test database.
- Existing repository lint warnings/errors are outside this feature.
- Existing UI API models retain the surrounding feature's established wire-field style; no broad mapping refactor was introduced.
