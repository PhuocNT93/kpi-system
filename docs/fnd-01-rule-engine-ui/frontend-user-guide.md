# Frontend User Guide: Rule Engine Configuration UI

Status: produced during Step 6 implementation

## Prerequisites

- Backend API is running and reachable from the frontend `VITE_API_BASE_URL` setting.
- Frontend dependencies are installed under `frontend/`.
- The signed-in user has configuration permissions for template and scoring-rule management.
- Organization job roles are configured through the Organization module. Role-conditional rules use job-role `code` values, not IAM security role names.

## Startup

From `frontend/`:

```powershell
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

Backend default used by the frontend API client when `VITE_API_BASE_URL` is not set:

```text
http://localhost:3000
```

## Shutdown

Stop the Vite dev server from the terminal where it is running with `Ctrl+C`.

## User-Visible Behavior

- Open the Evaluation Template Builder and choose a criterion to configure.
- Use the scoring tab to select one of the supported rule types:
  - `RANGE_THRESHOLD`
  - `INVERSE_THRESHOLD`
  - `COUNT_THRESHOLD`
  - `ORDINAL_MANUAL`
  - `ROLE_CONDITIONAL`
- Rule configuration is edited through form controls, not raw JSON.
- Published template versions remain read-only. Editing controls are disabled when the workspace is read-only.
- Role-conditional configuration loads organization job roles from the backend and does not create hard-coded SI/SM branches.
- Nested role-conditional branch rules support non-role rule types only: range, inverse, count, and ordinal/manual.

## Validation Behavior

Client-side validation provides immediate feedback for configuration mistakes such as:

- Missing ranges.
- Overlapping ranges.
- Invalid level numbers.
- Duplicate count thresholds.
- Empty ordinal labels.
- Missing role branches.
- Duplicate role branches.
- Missing nested branch rules.

Backend validation remains authoritative. Save, validate, and publish errors returned by the backend must be treated as final and should not be replaced by a success state.

## Configurable Values

The UI treats these values as backend/domain configuration:

- Criteria and criterion versions.
- Evaluation levels and labels.
- Measurement units and evidence/source labels.
- Organization job roles.
- Teams and applicability settings.
- Scoring rule configuration JSON.

The UI must not hard-code KPI names, role names, or scoring outcomes.

## Known Limitations

- The frontend emits backend-compatible Rule Engine configuration objects.
- Standalone backend scoring-rule validation has been aligned to the canonical Rule Engine validator.
- Template criteria inline `custom_scoring_rule` persistence is limited by the current backend schema: `template_criteria` does not currently contain an inline custom scoring-rule/config column. Persisting per-template-criterion custom rule overrides requires an approved schema/API decision or use of the existing published scoring-rule reference/override model.
- The frontend does not calculate `resolved_level`, `raw_score`, weighted scores, ranking, workflow transitions, audit entries, or historical snapshots.
