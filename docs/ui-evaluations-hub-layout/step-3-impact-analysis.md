# Step 3: Impact Analysis

Status: reconstructed from an earlier approved response

## Deliverable

### Impact Analysis

| Area | Impact | Notes |
|---|---|---|
| Frontend | MEDIUM | Re-layout `MyEvaluationPage`; extract `EvaluationPickerList`; make `EvaluationOverviewPanel` fluid; add scrollbar-hiding CSS class for Sidebar and list. |
| Backend | NONE | No change. |
| Database | NONE | No migration. |
| API | NONE | Same endpoints; query keys unchanged. |
| RBAC / Scope | LOW | `isHrAdmin` branching unchanged; list content is still backend-scoped. |
| Workflow | LOW | Save PDP / Submit keep `canSubmit` / `submitDisabledReason`; status badge moves into cards and profile card. |
| Audit | NONE | No new writes. |
| Concurrency | NONE | No mutation or optimistic-locking change. |
| Performance | LOW | No new requests; CSS-only scrollbar hiding. |
| Historical Data | NONE | Still renders the `evaluationDetail` snapshot; no re-rounding. |

Potential Risks:
- Hidden scrollbar lowers scroll affordance → keep wheel/keyboard/touch scrolling and add a bottom fade on the list.
- Sidebar on short screens still scrolls without a visible bar.
- Sticky left column inside `.app-layout-main` needs a viewport-bounded `max-height`.
- Fixed 320px donut can overflow the right column at 1024–1280px → use `min()`.
- "+6% vs previous review" has no real data; kept as-is. "Status:" switches to the current level label.
- No automated layout test; add a component test for `EvaluationPickerList`, visual checks are manual.

Required ADR / Clarification:
- None.

## Next Step

Step 4 - Plan.
