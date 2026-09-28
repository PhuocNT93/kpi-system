# Step 5: Test Cases

Status: reconstructed from the earlier approved response (approved by the user in chat); TC06–TC09 were added during Step 6/8 revisions and are marked as such.

## Deliverable

## Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | Reset disabled with no active filter | Page loaded, all filters empty | Render | Reset button is disabled |
| TC02 | Reset enabled with an active filter | Page loaded | Select Action = UPDATE, then click Reset | Reset enabled after selecting; query filters reset (`action: ''`) and Reset disabled after click |
| TC03 | Empty state | Query succeeds with 0 logs | Render | Icon + `emptyDesc` message shown, no table (covered by existing rendering tests) |
| TC04 | Entity Type badge | Log with `entityType` | Render | Entity type shown as a badge (visual only, no unit test) |
| TC05 | Existing behaviour regression | Existing fixtures | Run TC24, TC25, TC26, TC28 | All pass |
| TC06 (added, rev. 1) | Entity ID applies only on Search | Page loaded | Type a padded UUID, then click Search | No `entityId` in query while typing; trimmed `entityId` and `page: 1` after Search |
| TC07 (added, rev. 2) | Colliding translation keys do not leak into the header | Translations contain another screen's `pageTitle` | Render | Audit title shown, other screen's title absent |
| TC08 (added, Step 8) | Text selection does not open the modal | Row rendered | Click row with a non-empty selection, then without | Modal closed, then open |
| TC09 (added, Step 8) | Embedded mode hides the page header | Rendered with `isEmbedded` | Render | No title / role badge; filter bar and rows present |

## Inputs Reviewed

- Step 4 plan; existing `AuditLogPage.test.tsx`.

## Actions and Evidence

- Test cases defined before implementation (TC01–TC05); later ones added with their revisions.

## Changes Made

- None in this step.

## Decisions and Rationale

- Pure visual details (badge colours, truncation) are verified in the browser (Step 7), not in unit tests.

## Risks / Blockers

- None.

## Next Step

Step 6 — Implement.
